import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { randomBytes } from 'crypto';
import https from 'https';
import { createPublicClient, http, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const runtime = 'nodejs';
export const maxDuration = 60;

/* ── OpenGradient constants ── */
const OG_DEVNET_RPC = 'https://ogevmdevnet.opengradient.ai';
const TEE_REGISTRY_ADDRESS = '0x4e72238852f3c918f4E4e57AeC9280dDB0c80248' as const;
const TEE_TYPE_LLM_PROXY = 0;
const MODEL = 'openai/gpt-4.1-2025-04-14';

const TEE_REGISTRY_ABI = [
  {
    inputs: [{ internalType: 'uint8', name: 'teeType', type: 'uint8' }],
    name: 'getActiveTEEs',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'address', name: 'paymentAddress', type: 'address' },
          { internalType: 'string', name: 'endpoint', type: 'string' },
          { internalType: 'bytes', name: 'publicKey', type: 'bytes' },
          { internalType: 'bytes', name: 'tlsCertificate', type: 'bytes' },
          { internalType: 'bytes32', name: 'pcrHash', type: 'bytes32' },
          { internalType: 'uint8', name: 'teeType', type: 'uint8' },
          { internalType: 'bool', name: 'enabled', type: 'bool' },
          { internalType: 'uint256', name: 'registeredAt', type: 'uint256' },
          { internalType: 'uint256', name: 'lastHeartbeatAt', type: 'uint256' },
        ],
        internalType: 'struct TEERegistry.TEEInfo[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/* ── Get live TEE endpoint from on-chain registry ── */
async function getTEEEndpoint(): Promise<string> {
  const registryClient = createPublicClient({ transport: http(OG_DEVNET_RPC) });
  const tees = await registryClient.readContract({
    address: TEE_REGISTRY_ADDRESS,
    abi: TEE_REGISTRY_ABI,
    functionName: 'getActiveTEEs',
    args: [TEE_TYPE_LLM_PROXY],
  });
  if (!tees || tees.length === 0) throw new Error('No active TEE servers found in registry');
  const tee = tees[Math.floor(Math.random() * tees.length)];
  return tee.endpoint;
}

/* ── HTTPS fetch that skips TLS verification for self-signed TEE certs ── */
function teeFetch(url: string, options: { method: string; headers: Record<string, string>; body: string }): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || '443',
      path: parsed.pathname + parsed.search,
      method: options.method,
      headers: { ...options.headers, 'Content-Length': Buffer.byteLength(options.body) },
      rejectUnauthorized: false,
    };
    const req = https.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const responseBody = Buffer.concat(chunks).toString();
        const headers = new Headers();
        Object.entries(res.headers).forEach(([k, v]) => {
          if (v) headers.set(k, Array.isArray(v) ? v[0] : v);
        });
        resolve(new Response(responseBody, { status: res.statusCode ?? 500, headers }));
      });
    });
    req.on('error', reject);
    req.write(options.body);
    req.end();
  });
}

/* ── x402 constants (matching Python SDK) ── */
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as `0x${string}`;
const X402_UPTO_PROXY = '0xBe08D629cc799E6C17200F454F68A61E017038C8' as `0x${string}`;

// Python SDK's Permit2 witness types (different from JS SDK!)
const PERMIT2_WITNESS_TYPES = {
  PermitWitnessTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'witness', type: 'Witness' },
  ],
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  Witness: [
    { name: 'to', type: 'address' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'extra', type: 'bytes' },
  ],
} as const;

/* ── Sign x402 upto payment (Python SDK compatible) ── */
async function signUptoPayment(
  account: ReturnType<typeof privateKeyToAccount>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any,
) {
  const now = Math.floor(Date.now() / 1000);
  const validAfter = now - 600;
  const deadline = now + (req.maxTimeoutSeconds || 3600);
  const nonce = BigInt('0x' + randomBytes(32).toString('hex'));

  const tokenAddress = getAddress(req.asset);
  const payTo = getAddress(req.payTo);

  const signature = await account.signTypedData({
    domain: {
      name: 'Permit2',
      chainId: 84532,
      verifyingContract: PERMIT2_ADDRESS,
    },
    types: PERMIT2_WITNESS_TYPES,
    primaryType: 'PermitWitnessTransferFrom',
    message: {
      permitted: { token: tokenAddress, amount: BigInt(req.amount) },
      spender: X402_UPTO_PROXY,
      nonce,
      deadline: BigInt(deadline),
      witness: { to: payTo, validAfter: BigInt(validAfter), extra: '0x' as `0x${string}` },
    },
  });

  // V2 PaymentPayload structure (camelCase, matching Python SDK's model_dump_json by_alias)
  return {
    x402Version: 2,
    payload: {
      signature,
      permit2Authorization: {
        permitted: { token: tokenAddress, amount: req.amount },
        spender: X402_UPTO_PROXY,
        nonce: nonce.toString(),
        deadline: deadline.toString(),
        witness: { to: payTo, validAfter: validAfter.toString(), extra: '0x' },
        from: account.address,
      },
    },
    accepted: {
      scheme: req.scheme,
      network: req.network,
      asset: req.asset,
      amount: req.amount,
      payTo: req.payTo,
      maxTimeoutSeconds: req.maxTimeoutSeconds,
      extra: req.extra || {},
    },
  };
}

/* ── TypeScript x402 inference (used on Vercel) ── */
async function runTSInference(params: {
  destination: string; days: number; budget: string;
  currency: string; styles: string[]; travelers: number;
  privateKey: string;
}): Promise<{ content: string; txHash: string | null }> {
  const { destination, days, budget, currency, styles, travelers, privateKey } = params;

  const teeEndpoint = await getTEEEndpoint();
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const apiUrl = `${teeEndpoint}/v1/chat/completions`;
  const bodyJson = JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are an expert travel planner. Return valid JSON only — no markdown, no code blocks.' },
      { role: 'user', content: buildPrompt(destination, days, budget, currency, styles, travelers) },
    ],
    max_tokens: 3500,
  });
  const baseHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    'X-SETTLEMENT-TYPE': 'x402',
  };

  // Step 1: Initial request — expect 402 with payment requirements
  const initialRes = await teeFetch(apiUrl, { method: 'POST', headers: baseHeaders, body: bodyJson });

  if (initialRes.status !== 402) {
    if (initialRes.ok) {
      const data = await initialRes.json();
      return { content: data.choices?.[0]?.message?.content ?? '', txHash: null };
    }
    throw new Error(`TEE API error ${initialRes.status}: ${await initialRes.text()}`);
  }

  // Step 2: Parse payment requirements
  // V2 protocol: requirements are in PAYMENT-REQUIRED header (base64 JSON)
  // V1 protocol: requirements are in body as paymentRequirements array
  const paymentText = await initialRes.text();
  const paymentRequiredHeader = initialRes.headers.get('payment-required');

  let requirements: Array<Record<string, unknown>> | undefined;

  if (paymentRequiredHeader) {
    // V2: PAYMENT-REQUIRED header is base64-encoded JSON of PaymentRequired
    // PaymentRequired.accepts is the list of requirements (camelCase via alias)
    try {
      const decoded = JSON.parse(Buffer.from(paymentRequiredHeader, 'base64').toString());
      requirements = decoded.accepts || decoded.paymentRequirements;
    } catch { /* ignore */ }
  }

  if (!requirements) {
    // V1 fallback: requirements in body
    let paymentBody: Record<string, unknown> = {};
    try { paymentBody = JSON.parse(paymentText); } catch { /* not JSON */ }
    requirements = (paymentBody.accepts || paymentBody.paymentRequirements) as Array<Record<string, unknown>> | undefined;
  }

  if (!requirements || requirements.length === 0) {
    throw new Error(`No payment requirements in 402 response: header=${paymentRequiredHeader?.slice(0, 100)} body=${paymentText.slice(0, 300)}`);
  }

  // Pick upto requirement first, then any
  const req = requirements.find((r) => r.scheme === 'upto') || requirements[0];

  // Step 3: Sign the payment
  const paymentPayload = await signUptoPayment(account, req);
  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

  // Step 4: Retry with payment — V2 uses PAYMENT-SIGNATURE header
  const res = await teeFetch(apiUrl, {
    method: 'POST',
    headers: { ...baseHeaders, 'PAYMENT-SIGNATURE': paymentHeader },
    body: bodyJson,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TEE API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';
  const txHash =
    res.headers.get('x-transaction-hash') ||
    res.headers.get('x-payment-hash') ||
    null;

  return { content, txHash };
}

/* ── Python subprocess inference (used locally) ── */
function runPythonInference(payload: object): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'og_infer.py');
    const child = spawn('python', [scriptPath]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr || `Python exited with code ${code}`));
    });
    child.on('error', (err) => reject(err));
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

function buildPrompt(
  destination: string, days: number, budget: string,
  currency: string, styles: string[], travelers: number,
): string {
  return `Create a ${days}-day travel itinerary for ${destination}.

Budget: ${budget} ${currency} total for ${travelers} traveler(s)
Travel Style: ${styles.join(', ')}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "destination": "${destination}",
  "duration": "${days} days",
  "total_budget": "${budget} ${currency}",
  "overview": "2-3 sentence overview of the trip",
  "budget_breakdown": "Brief breakdown across accommodation, food, activities, transport",
  "pro_tips": ["tip 1", "tip 2", "tip 3"],
  "days": [
    {
      "day_number": 1,
      "theme": "Theme for this day",
      "morning": { "activity": "...", "description": "...", "location": "...", "estimated_cost": "~${currency}X" },
      "afternoon": { "activity": "...", "description": "...", "location": "...", "estimated_cost": "~${currency}X" },
      "evening": { "activity": "...", "description": "...", "location": "...", "estimated_cost": "~${currency}X" },
      "lunch_recommendation": "Restaurant - dish (~${currency}X)",
      "dinner_recommendation": "Restaurant - dish (~${currency}X)",
      "estimated_day_cost": "${currency}XX-XX"
    }
  ]
}
Use real place names and realistic prices. Include all ${days} days.`;
}

function buildDemoItinerary(
  destination: string, days: number, budget: string,
  currency: string, styles: string[], travelers: number,
) {
  const dest = destination || 'Marrakech, Morocco';
  const dayPlans = Array.from({ length: Math.min(days, 5) }, (_, i) => ({
    day_number: i + 1,
    theme: ['Arrival & Old Medina Exploration', 'Souks, Spices & Street Food', 'Palaces, Gardens & Hammam', 'Day Trip to Atlas Mountains', 'Art, Shopping & Farewell Dinner'][i],
    morning: {
      activity: ['Jemaa el-Fna Square', 'Souks of the Medina', 'Bahia Palace', 'Ourika Valley Hike', 'Ben Youssef Madrasa'][i],
      description: ['Explore the iconic main square, watch snake charmers and street performers.', 'Navigate the vibrant labyrinth of souks — spices, leather, ceramics and textiles.', 'Tour the stunning 19th-century palace with intricate tilework.', 'Fresh mountain air and Berber village visits in the Atlas Mountains.', 'Visit the beautifully restored 14th-century Islamic college.'][i],
      location: ['Jemaa el-Fna, Medina', 'Souk Semmarine, Medina', 'Bahia Palace, Medina', 'Ourika Valley, 30km from Marrakech', 'Ben Youssef Madrasa, Medina'][i],
      estimated_cost: [`~${currency}0`, `~${currency}5`, `~${currency}8`, `~${currency}25`, `~${currency}8`][i],
    },
    afternoon: {
      activity: ['Koutoubia Mosque Gardens', 'Tanneries of Chouara', 'Majorelle Garden & YSL Museum', 'Waterfall Picnic', 'Museum of Marrakech'][i],
      description: ['Stroll the peaceful gardens around the 12th-century minaret.', 'Watch leather craftsmen work in the medieval dyeing pits.', 'Wander the electric-blue botanical garden and visit the YSL museum.', 'Hike to the Ourika waterfall with mountain views.', 'Explore Moroccan art in a beautifully restored merchant palace.'][i],
      location: ['Koutoubia Gardens, Medina', 'Tanneries, Northern Medina', 'Majorelle Garden, Gueliz', 'Ourika Waterfall', 'Museum of Marrakech, Medina'][i],
      estimated_cost: [`~${currency}0`, `~${currency}0`, `~${currency}18`, `~${currency}5`, `~${currency}6`][i],
    },
    evening: {
      activity: ['Rooftop Sunset Drinks', 'Cooking Class', 'Hammam & Spa', 'Return & Night Stroll', 'Farewell Dinner Show'][i],
      description: ['Watch the sunset over the medina rooftops with mint tea.', 'Learn to make tagine, couscous and pastilla in a local riad kitchen.', 'Traditional Moroccan steam bath with black soap scrub.', 'Stroll the illuminated Jemaa el-Fna square.', 'Dine with live Gnawa music and belly dancing.'][i],
      location: ['Café des Épices rooftop, Medina', 'Riad cooking school, Medina', 'Les Bains de Marrakech, Medina', 'Jemaa el-Fna, Medina', 'Dar Zitoun restaurant, Medina'][i],
      estimated_cost: [`~${currency}8`, `~${currency}45`, `~${currency}35`, `~${currency}0`, `~${currency}40`][i],
    },
    lunch_recommendation: ['Café des Épices — Moroccan salads & tagine (~€12)', 'Nomad Restaurant — modern Moroccan (~€15)', 'Café Arabe — rooftop fusion (~€18)', 'Auberge Ramuntcho — Berber lunch (~€10)', 'Le Jardin — garden terrace (~€14)'][i],
    dinner_recommendation: ['Jemaa el-Fna food stalls (~€8)', 'Dar Moha — Moroccan tasting menu (~€35)', 'La Maison Arabe — palace dining (~€40)', 'Chez Driss — local restaurant (~€12)', 'Dar Zitoun — dinner show (~€40)'][i],
    estimated_day_cost: [`${currency}30–40`, `${currency}65–75`, `${currency}80–90`, `${currency}50–60`, `${currency}70–80`][i],
  }));
  return {
    destination: dest,
    duration: `${days} days`,
    total_budget: `${budget} ${currency} for ${travelers} traveler(s)`,
    overview: `${dest} is a sensory feast — a city where ancient medinas, vibrant souks, and dramatic mountain scenery converge. Your ${days}-day journey blends ${styles.join(' & ')} experiences.`,
    budget_breakdown: `Accommodation: ~${currency}${Math.round(Number(budget) * 0.4)} · Food: ~${currency}${Math.round(Number(budget) * 0.25)} · Activities: ~${currency}${Math.round(Number(budget) * 0.2)} · Transport: ~${currency}${Math.round(Number(budget) * 0.15)}`,
    pro_tips: [
      'Always negotiate prices in the souks — start at 30% of the asking price.',
      'Dress modestly when visiting mosques and religious sites. Carry a light scarf.',
      'Book your riad accommodation inside the Medina for the most authentic experience.',
    ],
    days: dayPlans,
  };
}

function parseContent(content: string) {
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.split('```')[1];
    if (cleaned.startsWith('json')) cleaned = cleaned.slice(4);
    cleaned = cleaned.trim();
  }
  return JSON.parse(cleaned);
}

/* ── Route handler ── */
export async function POST(req: NextRequest) {
  try {
    const { destination, days, budget, currency, styles, travelers } = await req.json();
    const styleList = Array.isArray(styles) ? styles : [styles];

    if (process.env.DEMO_MODE === 'true') {
      await new Promise((r) => setTimeout(r, 1800));
      return NextResponse.json({
        itinerary: buildDemoItinerary(destination, Number(days), budget, currency, styleList, Number(travelers)),
        demo: true,
      });
    }

    const privateKey = process.env.OG_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'OG_PRIVATE_KEY is not configured.' },
        { status: 500 },
      );
    }

    /* Try Python first (local dev), fall back to TypeScript x402 (Vercel) */
    try {
      const output = await runPythonInference({
        destination, days, budget, currency,
        styles: styleList, travelers, private_key: privateKey,
      });
      return NextResponse.json(JSON.parse(output));
    } catch (pythonErr: unknown) {
      const msg = pythonErr instanceof Error ? pythonErr.message : String(pythonErr);
      const isPythonMissing = msg.includes('ENOENT') || msg.includes('spawn') || msg.includes('not found');
      if (!isPythonMissing) throw pythonErr; // real Python error → surface it
      // Python not available → use TypeScript x402
    }

    const { content, txHash } = await runTSInference({
      destination, days: Number(days), budget, currency,
      styles: styleList, travelers: Number(travelers), privateKey,
    });

    try {
      const itinerary = parseContent(content);
      return NextResponse.json({ itinerary, transaction_hash: txHash ?? 'pending' });
    } catch {
      return NextResponse.json({ raw: content });
    }
  } catch (error: unknown) {
    console.error('[/api/generate]', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
