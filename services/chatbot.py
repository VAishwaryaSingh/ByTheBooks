import os
import re
import anthropic
from services.standards import search_standards

SYSTEM_PROMPT = """You are ByTheBooks AI, the world's most knowledgeable accounting standards assistant. You cover IFRS (IAS/IFRS standards), US GAAP (FASB ASC), IND AS (Indian Accounting Standards), UK GAAP (FRS 100-105), IPSAS (International Public Sector), GASB (US Government), and AASB (Australian Accounting Standards).

When a user describes their accounting situation:
1. Identify ALL relevant standards that apply across applicable frameworks
2. For each standard provide: the standard code and title, which framework it belongs to, and one sentence explaining why it applies
3. Format EVERY standard reference using this exact pattern: [FRAMEWORK: CODE] — for example [IFRS: IFRS 15] or [US GAAP: ASC 606] or [IND AS: IND AS 115]
4. Explain the key accounting treatment required in plain language
5. Note any important differences between frameworks if multiple apply
6. Always be practical and specific — accountants need actionable guidance

Keep responses clear and well-structured. Use numbered lists for multiple standards. Be concise but thorough."""


def resolve_key(api_key: str | None) -> str | None:
    key = (api_key or "").strip() or os.environ.get("ANTHROPIC_API_KEY", "")
    return key if key and key != "your-api-key-here" else None


def get_chat_response(message: str, history: list[dict], api_key: str | None = None) -> dict:
    client = anthropic.Anthropic(api_key=resolve_key(api_key))

    messages = []
    for h in history:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=messages,
    )

    reply = response.content[0].text
    mentioned_standards = _extract_mentioned_standards(reply)

    return {
        "reply": reply,
        "mentioned_standards": mentioned_standards,
    }


def get_compare_response(standard_a: dict, standard_b: dict, api_key: str | None = None) -> str | None:
    resolved = resolve_key(api_key)
    if not resolved:
        return None

    client = anthropic.Anthropic(api_key=resolved)

    prompt = f"""Compare these two accounting standards side by side:

Standard A: {standard_a['code']} — {standard_a['title']} ({standard_a['framework_code']})
Standard B: {standard_b['code']} — {standard_b['title']} ({standard_b['framework_code']})

Provide a structured comparison covering:
1. **Scope** — What transactions/situations does each standard cover?
2. **Recognition** — When is the item/transaction recognised?
3. **Measurement** — How is it measured (at what amount)?
4. **Presentation** — How is it shown in the financial statements?
5. **Disclosure** — What must be disclosed?
6. **Key Differences** — The most important practical differences between the two standards

For each section, describe Standard A then Standard B, then note the key differences. Be specific and practical."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    return response.content[0].text


def _extract_mentioned_standards(text: str) -> list[dict]:
    pattern = r"\[([A-Z][A-Z\s]+):\s*([A-Z]{1,6}(?:\s+(?:AS\s+)?\d+[A-Z]?(?:\.\d+)?)?)\]"
    matches = re.findall(pattern, text)

    found = []
    seen = set()
    for framework, code in matches:
        key = f"{framework.strip()}:{code.strip()}"
        if key in seen:
            continue
        seen.add(key)

        results = search_standards(q=code.strip(), limit=3)
        if results:
            found.append(results[0])
        else:
            found.append({
                "id": None,
                "code": code.strip(),
                "framework_code": framework.strip(),
                "title": f"{code.strip()} ({framework.strip()})",
                "summary": "",
            })

    return found
