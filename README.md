# AI Travel Planner

A mini dapp that generates personalized day-by-day travel itineraries powered by **OpenGradient** — decentralized AI inference running inside a TEE (Trusted Execution Environment), paid with `$OPG` via the x402 protocol on Base Sepolia.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![OpenGradient](https://img.shields.io/badge/OpenGradient-x402-teal) ![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-blue)

---

## How it works

1. User fills in destination, duration, budget, travelers, and travel style
2. The app calls the OpenGradient LLM API via the Python SDK
3. The SDK discovers the active TEE server from the on-chain registry, signs an x402 payment with `$OPG`, and runs the inference inside a TEE
4. The itinerary is returned with an on-chain transaction hash proving the AI ran verifiably

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React, Tailwind CSS |
| AI Inference | OpenGradient SDK (`opengradient`) |
| Payment | x402 protocol, `$OPG` token on Base Sepolia |
| Deployment | Vercel (demo mode) / local (live inference) |

---

## Getting started

### Prerequisites

- Node.js 20+
- Python 3.10+
- A wallet funded with `$OPG` testnet tokens → [faucet.opengradient.ai](https://faucet.opengradient.ai)

### Install

```bash
git clone https://github.com/zorba999/AI-Travel-Planner.git
cd AI-Travel-Planner
npm install
pip install opengradient
```

### Configure

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
OG_PRIVATE_KEY=0xyour_wallet_private_key
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add environment variable:
   - `OG_PRIVATE_KEY` → your wallet private key
   - Or set `DEMO_MODE=true` to run without a wallet

> **Note:** Vercel's serverless runtime doesn't support Python subprocesses. When `OG_PRIVATE_KEY` is set but Python is unavailable, the app automatically falls back to demo mode. For live inference on Vercel, set `DEMO_MODE=true` and pair with a separate Python backend.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OG_PRIVATE_KEY` | Yes (for live) | Ethereum wallet private key (`0x...`) funded with `$OPG` |
| `DEMO_MODE` | No | Set to `true` to use hardcoded demo itinerary (no wallet needed) |
