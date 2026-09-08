# Ad Analyst (MVP-0)

Evidence-first marketing insights: fixtures → deterministic detectors → validated OpenAI wording → **What needs my attention?**

See [`docs/ai-marketing-analyst-poc.md`](./docs/ai-marketing-analyst-poc.md) and [`AGENTS.md`](./AGENTS.md).

## Quick start

```bash
# Postgres (local example)
export DATABASE_URL=postgresql://app:app@127.0.0.1:5432/ad_optimizer

npm install
npm run db:push
npm run seed
npm test
npm run analyze   # optional CLI; or use the UI button
npm run dev
```

Optional: set `OPENAI_API_KEY` for LLM wording. Without it, a template narrator is used (still validated against evidence).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run seed` | Reproducible 90d fixture scenarios |
| `npm test` | Deterministic detector eval suite |
| `npm run analyze` | Manual analysis run (CLI) |
| `npm run db:push` | Apply Drizzle schema |

## Out of scope (MVP-0)

Live Google Ads, Eve, cron, auth, Meta/GA4.
