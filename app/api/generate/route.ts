import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

function buildDemoItinerary(
  destination: string,
  days: number,
  budget: string,
  currency: string,
  styles: string[],
  travelers: number,
) {
  const dest = destination || 'Marrakech, Morocco';
  const dayPlans = Array.from({ length: Math.min(days, 5) }, (_, i) => ({
    day_number: i + 1,
    theme: ['Arrival & Old Medina Exploration', 'Souks, Spices & Street Food', 'Palaces, Gardens & Hammam', 'Day Trip to Atlas Mountains', 'Art, Shopping & Farewell Dinner'][i],
    morning: {
      activity: ['Jemaa el-Fna Square', 'Souks of the Medina', 'Bahia Palace', 'Ourika Valley Hike', 'Ben Youssef Madrasa'][i],
      description: ['Explore the iconic main square, watch snake charmers and street performers as the city wakes up.', 'Navigate the vibrant labyrinth of souks — spices, leather, ceramics and textiles.', 'Tour the stunning 19th-century palace with intricate tilework and carved cedar ceilings.', 'Fresh mountain air and Berber village visits in the Atlas Mountains foothills.', 'Visit the beautifully restored 14th-century Islamic college with geometric tile work.'][i],
      location: ['Jemaa el-Fna, Medina', 'Souk Semmarine, Medina', 'Bahia Palace, Medina', 'Ourika Valley, 30km from Marrakech', 'Ben Youssef Madrasa, Medina'][i],
      estimated_cost: [`~${currency}0`, `~${currency}5`, `~${currency}8`, `~${currency}25`, `~${currency}8`][i],
    },
    afternoon: {
      activity: ['Koutoubia Mosque Gardens', 'Tanneries of Chouara', 'Majorelle Garden & YSL Museum', 'Waterfall Picnic', 'Museum of Marrakech'][i],
      description: ['Stroll the peaceful gardens around the 12th-century minaret — the city\'s spiritual heart.', 'Watch leather craftsmen work in the medieval dyeing pits from a rooftop terrace.', 'Wander the electric-blue botanical garden, then visit the YSL museum next door.', 'Hike to the Ourika waterfall and enjoy a traditional lunch with mountain views.', 'Explore Moroccan art and artifacts in a beautifully restored merchant palace.'][i],
      location: ['Koutoubia Gardens, Medina', 'Tanneries, Northern Medina', 'Majorelle Garden, Gueliz', 'Ourika Waterfall', 'Museum of Marrakech, Medina'][i],
      estimated_cost: [`~${currency}0`, `~${currency}0`, `~${currency}18`, `~${currency}5`, `~${currency}6`][i],
    },
    evening: {
      activity: ['Rooftop Sunset Drinks', 'Cooking Class', 'Hammam & Spa', 'Return & Night Stroll', 'Farewell Dinner Show'][i],
      description: ['Watch the sunset over the medina rooftops with mint tea at Café des Épices.', 'Learn to make tagine, couscous and pastilla in a local riad kitchen.', 'Traditional Moroccan steam bath with black soap scrub and argan oil massage.', 'Stroll the illuminated Jemaa el-Fna square buzzing with evening performers.', 'Dine with live Gnawa music and belly dancing at a traditional restaurant.'][i],
      location: ['Café des Épices rooftop, Medina', 'Riad cooking school, Medina', 'Les Bains de Marrakech, Medina', 'Jemaa el-Fna, Medina', 'Dar Zitoun restaurant, Medina'][i],
      estimated_cost: [`~${currency}8`, `~${currency}45`, `~${currency}35`, `~${currency}0`, `~${currency}40`][i],
    },
    lunch_recommendation: ['Café des Épices — Moroccan salads & tagine (~€12)', 'Nomad Restaurant — modern Moroccan cuisine (~€15)', 'Café Arabe — rooftop Italian-Moroccan fusion (~€18)', 'Auberge Ramuntcho — Berber mountain lunch (~€10)', 'Le Jardin — garden terrace fresh salads (~€14)'][i],
    dinner_recommendation: ['Jemaa el-Fna food stalls — harira, merguez & brochettes (~€8)', 'Dar Moha — elegant Moroccan tasting menu (~€35)', 'La Maison Arabe — traditional Moroccan palace dining (~€40)', 'Chez Driss — local neighbourhood restaurant (~€12)', 'Dar Zitoun — dinner show with Gnawa music (~€40)'][i],
    estimated_day_cost: [`${currency}30–40`, `${currency}65–75`, `${currency}80–90`, `${currency}50–60`, `${currency}70–80`][i],
  }));

  return {
    destination: dest,
    duration: `${days} days`,
    total_budget: `${budget} ${currency} for ${travelers} traveler(s)`,
    overview: `${dest} is a sensory feast — a city where ancient medinas, vibrant souks, and dramatic mountain scenery converge. Your ${days}-day journey blends culture, gastronomy, and authentic Moroccan experiences tailored to your ${styles.join(' & ')} interests.`,
    budget_breakdown: `Accommodation: ~${currency}${Math.round(Number(budget) * 0.4)} · Food: ~${currency}${Math.round(Number(budget) * 0.25)} · Activities: ~${currency}${Math.round(Number(budget) * 0.2)} · Transport: ~${currency}${Math.round(Number(budget) * 0.15)}`,
    pro_tips: [
      'Always negotiate prices in the souks — start at 30% of the asking price.',
      'Dress modestly when visiting mosques and religious sites. Carry a light scarf.',
      'Book your riad accommodation inside the Medina for the most authentic experience.',
    ],
    days: dayPlans,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { destination, days, budget, currency, styles, travelers } = await req.json();

    if (process.env.DEMO_MODE === 'true') {
      await new Promise((r) => setTimeout(r, 1800));
      const itinerary = buildDemoItinerary(
        destination, Number(days), budget, currency,
        Array.isArray(styles) ? styles : [styles], Number(travelers),
      );
      return NextResponse.json({ itinerary, demo: true });
    }

    const privateKey = process.env.OG_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'OG_PRIVATE_KEY is not configured. Add your wallet private key to environment variables.' },
        { status: 500 },
      );
    }

    try {
      const output = await runPythonInference({
        destination,
        days,
        budget,
        currency,
        styles: Array.isArray(styles) ? styles : [styles],
        travelers,
        private_key: privateKey,
      });

      const parsed = JSON.parse(output);
      return NextResponse.json(parsed);
    } catch (pythonErr: unknown) {
      const msg = pythonErr instanceof Error ? pythonErr.message : String(pythonErr);
      // Python not available (e.g. Vercel) — fall back to demo
      if (msg.includes('ENOENT') || msg.includes('spawn') || msg.includes('not found')) {
        await new Promise((r) => setTimeout(r, 1800));
        const itinerary = buildDemoItinerary(
          destination, Number(days), budget, currency,
          Array.isArray(styles) ? styles : [styles], Number(travelers),
        );
        return NextResponse.json({ itinerary, demo: true });
      }
      throw pythonErr;
    }
  } catch (error: unknown) {
    console.error('[/api/generate]', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
