# ByTheBooks

A free reference site for global accounting standards — browse, compare, and ask an AI assistant about IFRS, US GAAP, IND AS, UK GAAP, IPSAS, GASB, and AASB.

## Features

- **Browse** — 110+ standards across 7 frameworks and 24 topics, searchable and filterable.
- **Compare** — pick any two standards for a side-by-side breakdown (scope, recognition, measurement, presentation, disclosure). The database comparison always works; an AI-generated analysis of key differences is available if you add an API key.
- **Chat** — describe an accounting scenario in plain language and get the applicable standards identified, with links back into the library.

## Bring your own API key

Browse works for everyone with no setup. Chat and the AI analysis in Compare call Claude, so this project runs on a **bring-your-own-key** model: click **API Key** in the header and paste your own [Anthropic API key](https://console.anthropic.com/settings/keys). It's stored only in your browser (`localStorage`) and sent along with your own requests — never saved on the server.

## Running locally

```bash
pip install -r requirements.txt
python3 app.py
```

The app runs at `http://127.0.0.1:5001`. The database (`bythebooks.db`) is already seeded; run `python3 seed_data.py` to re-seed it from scratch.

For local Chat/Compare testing without opening the in-browser key modal each time, you can set a fallback key in `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Deploying

The included `render.yaml` lets [Render](https://render.com) auto-configure a free web service: **New → Blueprint → select this repo → Apply**. No API key needs to be set there — it's BYOK, so nothing secret to configure. Free-tier instances sleep after ~15 minutes idle and take ~30-50s to wake on the next request.

## Stack

Python 3.11 + Flask + gunicorn + SQLite + Jinja2 + vanilla JS + the Anthropic API (Claude).

## Disclaimer

Standards summaries are for educational reference only. Always consult the official standard text for professional use — official standards may be subject to copyright by their respective issuing bodies.
