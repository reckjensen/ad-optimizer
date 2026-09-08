import { addDays, format, parseISO, subDays } from "date-fns";
import type { CanonicalDailyMetric } from "@/lib/metrics/calculate";

/** Fixed analysis "as of" date for reproducible fixtures and tests. */
export const FIXTURE_AS_OF = "2026-09-07";
export const FIXTURE_ACCOUNT_ID = "acc-demo-001";
export const FIXTURE_SOURCE = "fixtures";
export const FIXTURE_ORG_NAME = "Demo Marketing Org";
export const FIXTURE_DAYS = 90;

export type FixtureScenarioExpectation =
  | "insight"
  | "ignore"
  | "lower_priority";

export type FixtureCampaignDef = {
  externalId: string;
  name: string;
  scenario: string;
  expectation: FixtureScenarioExpectation;
  /** Build daily rows for [start, end] inclusive ending at asOf. */
  build: (asOf: string, days: number) => CanonicalDailyMetric[];
};

function dateList(asOf: string, days: number): string[] {
  const end = parseISO(asOf);
  const start = subDays(end, days - 1);
  const out: string[] = [];
  for (let i = 0; i < days; i += 1) {
    out.push(format(addDays(start, i), "yyyy-MM-dd"));
  }
  return out;
}

function baseRow(
  date: string,
  campaignExternalId: string,
  values: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    conversionValue: number;
  },
): CanonicalDailyMetric {
  return {
    date,
    source: FIXTURE_SOURCE,
    accountExternalId: FIXTURE_ACCOUNT_ID,
    campaignExternalId,
    spend: Math.round(values.spend * 100) / 100,
    impressions: Math.round(values.impressions),
    clicks: Math.round(values.clicks),
    conversions: Math.round(values.conversions * 100) / 100,
    conversionValue: Math.round(values.conversionValue * 100) / 100,
    sessions: Math.round(values.clicks * 0.9),
    users: Math.round(values.clicks * 0.8),
    revenue: Math.round(values.conversionValue * 100) / 100,
  };
}

/** Stable campaign: flat KPIs — should be ignored. */
function stableSeries(
  asOf: string,
  days: number,
  campaignExternalId: string,
  daily: { spend: number; conversions: number; valuePerConv: number },
): CanonicalDailyMetric[] {
  return dateList(asOf, days).map((date, i) => {
    const wobble = 1 + ((i % 5) - 2) * 0.02;
    const spend = daily.spend * wobble;
    const conversions = daily.conversions * wobble;
    const clicks = Math.max(20, conversions * 12);
    return baseRow(date, campaignExternalId, {
      spend,
      impressions: clicks * 25,
      clicks,
      conversions,
      conversionValue: conversions * daily.valuePerConv,
    });
  });
}

/**
 * Recent 7d CPA spike vs prior 7d — large enough sample.
 * Prior ~€27 CPA, recent ~€42.5 (matches plan example magnitudes).
 */
function cpaSpikeSeries(asOf: string, days: number): CanonicalDailyMetric[] {
  const dates = dateList(asOf, days);
  return dates.map((date, idx) => {
    const daysFromEnd = dates.length - 1 - idx;
    const inSpike = daysFromEnd < 7;
    if (inSpike) {
      // ~€2550 / 60 over 7d → CPA €42.5
      return baseRow(date, "camp-cpa-spike", {
        spend: 364.29,
        impressions: 18000,
        clicks: 420,
        conversions: 8.57,
        conversionValue: 8.57 * 80,
      });
    }
    // Historical stable ~€27 CPA
    return baseRow(date, "camp-cpa-spike", {
      spend: 344.29,
      impressions: 17000,
      clicks: 400,
      conversions: 12.71,
      conversionValue: 12.71 * 80,
    });
  });
}

/** Tiny spend/conversions — CPA can spike but must be ignored. */
function tinyCpaSpikeSeries(asOf: string, days: number): CanonicalDailyMetric[] {
  const dates = dateList(asOf, days);
  return dates.map((date, idx) => {
    const daysFromEnd = dates.length - 1 - idx;
    const inSpike = daysFromEnd < 7;
    if (inSpike) {
      return baseRow(date, "camp-tiny-cpa", {
        spend: 12,
        impressions: 800,
        clicks: 15,
        conversions: 0.3,
        conversionValue: 20,
      });
    }
    return baseRow(date, "camp-tiny-cpa", {
      spend: 8,
      impressions: 700,
      clicks: 12,
      conversions: 0.5,
      conversionValue: 30,
    });
  });
}

/** Strong ROAS improvement in last 7d with solid volume. */
function strongRoasSeries(asOf: string, days: number): CanonicalDailyMetric[] {
  const dates = dateList(asOf, days);
  return dates.map((date, idx) => {
    const daysFromEnd = dates.length - 1 - idx;
    const improved = daysFromEnd < 7;
    if (improved) {
      return baseRow(date, "camp-roas-up", {
        spend: 400,
        impressions: 20000,
        clicks: 500,
        conversions: 20,
        conversionValue: 1600, // ROAS 4.0
      });
    }
    return baseRow(date, "camp-roas-up", {
      spend: 400,
      impressions: 20000,
      clicks: 500,
      conversions: 18,
      conversionValue: 720, // ROAS 1.8
    });
  });
}

/** Spend up significantly, conversions flat. */
function spendUpConvFlatSeries(
  asOf: string,
  days: number,
): CanonicalDailyMetric[] {
  const dates = dateList(asOf, days);
  return dates.map((date, idx) => {
    const daysFromEnd = dates.length - 1 - idx;
    const recent = daysFromEnd < 7;
    if (recent) {
      return baseRow(date, "camp-spend-mismatch", {
        spend: 500,
        impressions: 25000,
        clicks: 600,
        conversions: 18,
        conversionValue: 18 * 90,
      });
    }
    return baseRow(date, "camp-spend-mismatch", {
      spend: 320,
      impressions: 18000,
      clicks: 450,
      conversions: 18,
      conversionValue: 18 * 90,
    });
  });
}

/** Conversion drop with tiny sample — ignore (stays under gates in every window). */
function tinyConversionDropSeries(
  asOf: string,
  days: number,
): CanonicalDailyMetric[] {
  const dates = dateList(asOf, days);
  return dates.map((date, idx) => {
    const daysFromEnd = dates.length - 1 - idx;
    const recent = daysFromEnd < 7;
    if (recent) {
      return baseRow(date, "camp-tiny-drop", {
        spend: 8,
        impressions: 400,
        clicks: 8,
        conversions: 0.2,
        conversionValue: 12,
      });
    }
    return baseRow(date, "camp-tiny-drop", {
      spend: 7,
      impressions: 350,
      clicks: 7,
      conversions: 0.45,
      conversionValue: 30,
    });
  });
}

/** Persistent week-over-week CPA deterioration over 4 weeks. */
function persistentDeteriorationSeries(
  asOf: string,
  days: number,
): CanonicalDailyMetric[] {
  const dates = dateList(asOf, days);
  return dates.map((date, idx) => {
    const daysFromEnd = dates.length - 1 - idx;
    let cpa = 25;
    if (daysFromEnd < 7) cpa = 45;
    else if (daysFromEnd < 14) cpa = 38;
    else if (daysFromEnd < 21) cpa = 32;
    else if (daysFromEnd < 28) cpa = 28;
    const conversions = 12;
    const spend = cpa * conversions;
    return baseRow(date, "camp-persist-down", {
      spend,
      impressions: 15000,
      clicks: 350,
      conversions,
      conversionValue: conversions * 70,
    });
  });
}

/** Revenue anomaly: revenue drops while spend stable. */
function revenueAnomalySeries(
  asOf: string,
  days: number,
): CanonicalDailyMetric[] {
  const dates = dateList(asOf, days);
  return dates.map((date, idx) => {
    const daysFromEnd = dates.length - 1 - idx;
    const recent = daysFromEnd < 7;
    if (recent) {
      return baseRow(date, "camp-revenue-shift", {
        spend: 450,
        impressions: 22000,
        clicks: 520,
        conversions: 22,
        conversionValue: 660, // value/conv collapsed
      });
    }
    return baseRow(date, "camp-revenue-shift", {
      spend: 450,
      impressions: 22000,
      clicks: 520,
      conversions: 22,
      conversionValue: 1760,
    });
  });
}

/** Spend and conversions rise proportionally — should ignore. */
function proportionalGrowthSeries(
  asOf: string,
  days: number,
): CanonicalDailyMetric[] {
  const dates = dateList(asOf, days);
  return dates.map((date, idx) => {
    const daysFromEnd = dates.length - 1 - idx;
    const recent = daysFromEnd < 7;
    const factor = recent ? 1.4 : 1;
    return baseRow(date, "camp-proportional", {
      spend: 300 * factor,
      impressions: 16000 * factor,
      clicks: 400 * factor,
      conversions: 20 * factor,
      conversionValue: 20 * factor * 85,
    });
  });
}

/** One-day CPA anomaly only on asOf — lower priority / ignore in ranking. */
function oneDayAnomalySeries(asOf: string, days: number): CanonicalDailyMetric[] {
  const dates = dateList(asOf, days);
  return dates.map((date) => {
    if (date === asOf) {
      return baseRow(date, "camp-one-day", {
        spend: 600,
        impressions: 20000,
        clicks: 500,
        conversions: 10,
        conversionValue: 700,
      });
    }
    return baseRow(date, "camp-one-day", {
      spend: 350,
      impressions: 18000,
      clicks: 450,
      conversions: 18,
      conversionValue: 18 * 80,
    });
  });
}

/** CPA improvement opportunity with solid sample. */
function cpaImprovementSeries(
  asOf: string,
  days: number,
): CanonicalDailyMetric[] {
  const dates = dateList(asOf, days);
  return dates.map((date, idx) => {
    const daysFromEnd = dates.length - 1 - idx;
    const recent = daysFromEnd < 7;
    if (recent) {
      return baseRow(date, "camp-cpa-improve", {
        spend: 300,
        impressions: 18000,
        clicks: 480,
        conversions: 24,
        conversionValue: 24 * 95,
      });
    }
    return baseRow(date, "camp-cpa-improve", {
      spend: 360,
      impressions: 18000,
      clicks: 480,
      conversions: 18,
      conversionValue: 18 * 95,
    });
  });
}

export const FIXTURE_CAMPAIGNS: FixtureCampaignDef[] = [
  {
    externalId: "camp-cpa-spike",
    name: "Brand Search",
    scenario: "large_cpa_deterioration",
    expectation: "insight",
    build: cpaSpikeSeries,
  },
  {
    externalId: "camp-tiny-cpa",
    name: "Tiny Test Campaign",
    scenario: "tiny_campaign_cpa_spike",
    expectation: "ignore",
    build: tinyCpaSpikeSeries,
  },
  {
    externalId: "camp-roas-up",
    name: "Shopping Bestsellers",
    scenario: "strong_roas_improvement",
    expectation: "insight",
    build: strongRoasSeries,
  },
  {
    externalId: "camp-spend-mismatch",
    name: "Prospecting Display",
    scenario: "spend_up_conversions_flat",
    expectation: "insight",
    build: spendUpConvFlatSeries,
  },
  {
    externalId: "camp-tiny-drop",
    name: "Micro Retargeting",
    scenario: "conversion_drop_tiny_sample",
    expectation: "ignore",
    build: tinyConversionDropSeries,
  },
  {
    externalId: "camp-stable",
    name: "Always-On Brand",
    scenario: "stable_campaign",
    expectation: "ignore",
    build: (asOf, days) =>
      stableSeries(asOf, days, "camp-stable", {
        spend: 280,
        conversions: 14,
        valuePerConv: 90,
      }),
  },
  {
    externalId: "camp-persist-down",
    name: "Non-Brand Search",
    scenario: "persistent_deterioration",
    expectation: "insight",
    build: persistentDeteriorationSeries,
  },
  {
    externalId: "camp-revenue-shift",
    name: "Catalog PMax",
    scenario: "revenue_anomaly",
    expectation: "insight",
    build: revenueAnomalySeries,
  },
  {
    externalId: "camp-proportional",
    name: "Scaling Search",
    scenario: "spend_up_proportional_conversions",
    expectation: "ignore",
    build: proportionalGrowthSeries,
  },
  {
    externalId: "camp-one-day",
    name: "Video Awareness",
    scenario: "one_day_anomaly",
    expectation: "lower_priority",
    build: oneDayAnomalySeries,
  },
  {
    externalId: "camp-cpa-improve",
    name: "Remarketing Lists",
    scenario: "cpa_improvement",
    expectation: "insight",
    build: cpaImprovementSeries,
  },
];

export function buildAllFixtureMetrics(
  asOf = FIXTURE_AS_OF,
  days = FIXTURE_DAYS,
): {
  campaigns: { externalId: string; name: string; scenario: string; expectation: FixtureScenarioExpectation }[];
  metrics: CanonicalDailyMetric[];
} {
  const campaigns = FIXTURE_CAMPAIGNS.map((c) => ({
    externalId: c.externalId,
    name: c.name,
    scenario: c.scenario,
    expectation: c.expectation,
  }));
  const metrics = FIXTURE_CAMPAIGNS.flatMap((c) => c.build(asOf, days));
  return { campaigns, metrics };
}
