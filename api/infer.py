"""Vercel Python serverless function — OpenGradient LLM inference via x402."""

from http.server import BaseHTTPRequestHandler
import asyncio
import json
import os


def _build_prompt(destination, days, budget, currency, styles, travelers):
    return f"""Create a {days}-day travel itinerary for {destination}.

Budget: {budget} {currency} total for {travelers} traveler(s)
Travel Style: {", ".join(styles)}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{{
  "destination": "{destination}",
  "duration": "{days} days",
  "total_budget": "{budget} {currency}",
  "overview": "2-3 sentence overview of the trip",
  "budget_breakdown": "Brief breakdown across accommodation, food, activities, transport",
  "pro_tips": ["tip 1", "tip 2", "tip 3"],
  "days": [
    {{
      "day_number": 1,
      "theme": "Theme for this day",
      "morning": {{"activity": "...", "description": "...", "location": "...", "estimated_cost": "~{currency}X"}},
      "afternoon": {{"activity": "...", "description": "...", "location": "...", "estimated_cost": "~{currency}X"}},
      "evening": {{"activity": "...", "description": "...", "location": "...", "estimated_cost": "~{currency}X"}},
      "lunch_recommendation": "Restaurant - dish (~{currency}X)",
      "dinner_recommendation": "Restaurant - dish (~{currency}X)",
      "estimated_day_cost": "{currency}XX-XX"
    }}
  ]
}}
Use real place names and realistic prices. Include all {days} days."""


async def _run_inference(body: dict) -> dict:
    import opengradient as og

    private_key = os.environ.get("OG_PRIVATE_KEY")
    if not private_key:
        raise ValueError("OG_PRIVATE_KEY is not configured.")

    destination = body["destination"]
    days = int(body["days"])
    budget = body["budget"]
    currency = body.get("currency", "€")
    styles = body.get("styles", ["Culture"])
    if isinstance(styles, str):
        styles = [styles]
    travelers = int(body.get("travelers", 1))

    llm = og.LLM(private_key=private_key)
    try:
        llm.ensure_opg_approval(min_allowance=0.1)
    except Exception:
        pass

    result = await llm.chat(
        model="openai/gpt-4.1-2025-04-14",
        messages=[
            {"role": "system", "content": "You are an expert travel planner. Return valid JSON only — no markdown, no code blocks."},
            {"role": "user", "content": _build_prompt(destination, days, budget, currency, styles, travelers)},
        ],
        max_tokens=3500,
    )

    content = result.chat_output.get("content", "")
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()

    itinerary = json.loads(cleaned)
    tx_hash = (
        getattr(result, "transaction_hash", None)
        or getattr(result, "payment_hash", None)
        or "pending"
    )
    return {"itinerary": itinerary, "transaction_hash": tx_hash}


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("content-length", 0))
            body = json.loads(self.rfile.read(length))
            result = asyncio.run(_run_inference(body))
            self._respond(200, result)
        except Exception as exc:
            self._respond(500, {"error": str(exc)})

    def _respond(self, status: int, data: dict):
        payload = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(payload))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):  # silence access logs
        pass
