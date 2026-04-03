import asyncio
import sys
import json
import os
import opengradient as og


async def main():
    data = json.loads(sys.stdin.read())
    destination = data["destination"]
    days = data["days"]
    budget = data["budget"]
    currency = data["currency"]
    styles = data["styles"]
    travelers = data["travelers"]
    private_key = data["private_key"]

    llm = og.LLM(private_key=private_key)
    try:
        llm.ensure_opg_approval(min_allowance=0.1)
    except ValueError:
        pass

    user_prompt = f"""Create a {days}-day travel itinerary for {destination}.

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
      "morning": {{
        "activity": "Activity name",
        "description": "What to do and see",
        "location": "Specific place name",
        "estimated_cost": "~{currency}X"
      }},
      "afternoon": {{
        "activity": "Activity name",
        "description": "What to do and see",
        "location": "Specific place name",
        "estimated_cost": "~{currency}X"
      }},
      "evening": {{
        "activity": "Activity name",
        "description": "What to do and see",
        "location": "Specific place name",
        "estimated_cost": "~{currency}X"
      }},
      "lunch_recommendation": "Restaurant name - dish (~{currency}X)",
      "dinner_recommendation": "Restaurant name - dish (~{currency}X)",
      "estimated_day_cost": "{currency}XX-XX"
    }}
  ]
}}

Use real place names and realistic prices. Include all {days} days."""

    result = await llm.chat(
        model='openai/gpt-4.1-2025-04-14',
        messages=[
            {
                "role": "system",
                "content": "You are an expert travel planner. Return valid JSON only — no markdown, no code blocks."
            },
            {"role": "user", "content": user_prompt}
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

    try:
        itinerary = json.loads(cleaned)
        tx_hash = (
            getattr(result, 'transaction_hash', None)
            or getattr(result, 'payment_hash', None)
            or "pending"
        )
        print(json.dumps({
            "itinerary": itinerary,
            "transaction_hash": tx_hash
        }))
    except json.JSONDecodeError:
        print(json.dumps({"raw": content}))


if __name__ == "__main__":
    asyncio.run(main())
