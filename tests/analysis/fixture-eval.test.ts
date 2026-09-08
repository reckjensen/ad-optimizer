import { describe, expect, it } from "vitest";
import { analyzeCampaigns } from "@/lib/analysis/run";
import {
  FIXTURE_AS_OF,
  FIXTURE_CAMPAIGNS,
  buildAllFixtureMetrics,
} from "@/lib/fixtures/scenarios";
import type { CampaignContext } from "@/lib/analysis/detectors/types";
import { calculateKpis, aggregateMetrics } from "@/lib/metrics/calculate";
import { validateInsightAgainstEvidence } from "@/lib/insights/validate";
import type { GeneratedInsight } from "@/lib/insights/schema";
import type { EvidencePack } from "@/lib/analysis/evidence";

function contextsFromFixtures(): CampaignContext[] {
  const { campaigns, metrics } = buildAllFixtureMetrics();
  return campaigns.map((c) => ({
    campaignId: c.externalId,
    campaignName: c.name,
    campaignExternalId: c.externalId,
    metrics: metrics.filter((m) => m.campaignExternalId === c.externalId),
  }));
}

describe("fixture evaluation suite", () => {
  const contexts = contextsFromFixtures();
  const { evidencePacks, ranked } = analyzeCampaigns(contexts, FIXTURE_AS_OF, 5);

  function packsFor(externalId: string) {
    return evidencePacks.filter((p) => p.campaignExternalId === externalId);
  }

  it("detects large CPA deterioration", () => {
    const packs = packsFor("camp-cpa-spike");
    expect(packs.some((p) => p.detector === "cpa_deterioration")).toBe(true);
  });

  it("ignores tiny campaign CPA spike", () => {
    const packs = packsFor("camp-tiny-cpa");
    expect(packs.length).toBe(0);
  });

  it("detects strong ROAS improvement", () => {
    const packs = packsFor("camp-roas-up");
    expect(packs.some((p) => p.detector === "roas_improvement")).toBe(true);
  });

  it("detects spend up / conversions flat", () => {
    const packs = packsFor("camp-spend-mismatch");
    expect(
      packs.some((p) => p.detector === "spend_conversion_mismatch"),
    ).toBe(true);
  });

  it("ignores conversion drop with tiny sample", () => {
    const packs = packsFor("camp-tiny-drop");
    expect(packs.length).toBe(0);
  });

  it("ignores stable campaign", () => {
    const packs = packsFor("camp-stable");
    expect(packs.length).toBe(0);
  });

  it("detects persistent deterioration", () => {
    const packs = packsFor("camp-persist-down");
    expect(
      packs.some((p) => p.detector === "persistent_deterioration"),
    ).toBe(true);
  });

  it("detects revenue anomaly", () => {
    const packs = packsFor("camp-revenue-shift");
    expect(
      packs.some((p) => p.detector === "conversion_revenue_shift"),
    ).toBe(true);
  });

  it("ignores proportional spend/conversion growth", () => {
    const packs = packsFor("camp-proportional");
    expect(
      packs.some((p) => p.detector === "spend_conversion_mismatch"),
    ).toBe(false);
  });

  it("does not surface one-day anomaly in ranked feed", () => {
    expect(ranked.some((p) => p.detector === "one_day_anomaly")).toBe(false);
    expect(ranked.some((p) => p.campaignExternalId === "camp-one-day")).toBe(
      false,
    );
  });

  it("ranks 3–5 insights and only from expected insight scenarios", () => {
    expect(ranked.length).toBeGreaterThanOrEqual(3);
    expect(ranked.length).toBeLessThanOrEqual(5);

    const insightIds = new Set(
      FIXTURE_CAMPAIGNS.filter((c) => c.expectation === "insight").map(
        (c) => c.externalId,
      ),
    );
    for (const pack of ranked) {
      expect(insightIds.has(pack.campaignExternalId)).toBe(true);
    }
  });
});

describe("deterministic KPIs", () => {
  it("computes CPA with underlying totals", () => {
    const kpis = calculateKpis(
      aggregateMetrics([
        {
          spend: 100,
          impressions: 1000,
          clicks: 50,
          conversions: 4,
          conversionValue: 200,
        },
      ]),
    );
    expect(kpis.cpa).toBe(25);
    expect(kpis.totals.spend).toBe(100);
    expect(kpis.totals.conversions).toBe(4);
    expect(kpis.roas).toBe(2);
  });
});

describe("insight validation", () => {
  const pack: EvidencePack = {
    detector: "cpa_deterioration",
    campaignId: "1",
    campaignName: "Brand Search",
    campaignExternalId: "camp-cpa-spike",
    severity: "high",
    finding: { metric: "CPA", current: 42.5, previous: 27.1, changePct: 56.83 },
    supportingMetrics: {
      currentSpend: 2550,
      previousSpend: 2410,
      currentConversions: 60,
      previousConversions: 89,
    },
    comparisonWindow: {
      current: "2026-08-31/2026-09-06",
      previous: "2026-08-24/2026-08-30",
      label: "7d",
    },
    sampleSize: { currentConversions: 60, previousConversions: 89 },
    evidenceStrength: "high",
    commercialImpact: 1000,
    persistenceScore: 0.5,
    actionability: 0.8,
  };

  it("accepts traceable insights with labelled hypotheses", () => {
    const insight: GeneratedInsight = {
      severity: "high",
      finding: "Brand Search CPA increased 56.83% from 27.1 to 42.5.",
      whyNow: "Last 7 days vs previous 7 days show a material CPA jump.",
      evidence: [
        { label: "Current CPA", value: 42.5 },
        { label: "Previous CPA", value: 27.1 },
        { label: "Spend", value: 2550 },
      ],
      hypothesis:
        "Traffic quality may have deteriorated. This is a hypothesis, not a confirmed cause.",
      recommendation: "Review search terms before increasing budget.",
      evidenceStrength: "high",
      hypothesisConfidence: "medium",
    };
    expect(validateInsightAgainstEvidence(insight, pack).ok).toBe(true);
  });

  it("rejects untraceable numbers", () => {
    const insight: GeneratedInsight = {
      severity: "high",
      finding: "CPA increased to 99.99 somehow.",
      whyNow: "Recent change.",
      evidence: [{ label: "CPA", value: 99.99 }],
      hypothesis: "Something may have changed. This is a hypothesis.",
      recommendation: "Investigate.",
      evidenceStrength: "high",
      hypothesisConfidence: "low",
    };
    const result = validateInsightAgainstEvidence(insight, pack);
    expect(result.ok).toBe(false);
  });
});
