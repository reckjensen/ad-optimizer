---
name: product-principles
description: >-
  Always-on product principles for the AI Marketing Analyst POC. Use when
  building or changing analysis, insights, UI, fixtures, detectors, metrics,
  or deciding whether to add infrastructure. Covers evidence-first analysis,
  facts vs hypotheses, noise avoidance, and YAGNI for MVP-0.
---

# Product principles

## Insight-first UX

Home is **What needs my attention?** — not a dashboard. Each insight must answer:

1. What happened?
2. Why does it matter?
3. What evidence supports it?
4. What might explain it? (hypothesis)
5. What should I do?

"Nothing needs your attention" is a valid result.

## Facts vs hypotheses

| Layer | Meaning |
|-------|---------|
| Finding | What the data demonstrates |
| Evidence | Numbers that support the finding |
| Hypothesis | Possible explanation — never proven by metrics alone |
| Recommendation | Concrete, cautious next action |

Never present a hypothesis as a fact. Label hypotheses explicitly.

## Deterministic metrics only

CTR, CPC, CPA, CVR, ROAS and all comparisons are computed in application code.

The LLM must not calculate, modify, or invent numbers, campaign names, causes, or historical comparisons.

## Evidence before intelligence

```text
Raw metrics → KPIs → Detectors → Evidence packs → Rank → LLM wording → Validate → User
```

Detectors output **facts only**. Prefer no insight over a false positive.

## Evidence traceability

Every number in a generated insight must exist in its evidence pack. Failed validation → discard. Do not silently repair hallucinations.

## Avoid noise

Gate on sample size, practical magnitude, commercial impact, comparison period, and data completeness. An 80% CPA spike with one conversion is not an insight.

## No premature infrastructure

MVP-0: fixtures, manual Run analysis, no Eve, no cron, no live Ads, no auth unless dogfooding requires it. Defer skills for connectors/Eve until those surfaces exist.
