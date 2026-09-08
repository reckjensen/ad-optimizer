import { addDays, format, parseISO, subDays } from "date-fns";
import {
  aggregateMetrics,
  calculateKpis,
  changePct,
} from "@/lib/metrics/calculate";
import { inRange, type DateRange } from "@/lib/metrics/periods";
import { GATES } from "@/lib/metrics/gates";
import { commercialImpactFromSpend, type EvidencePack } from "../evidence";
import type { CampaignContext, Detector } from "./types";

function weekRange(asOfDate: string, weeksAgo: number): DateRange {
  const end = format(subDays(parseISO(asOfDate), weeksAgo * 7), "yyyy-MM-dd");
  const start = format(subDays(parseISO(end), 6), "yyyy-MM-dd");
  return { start, end };
}

/**
 * Prefer sustained week-over-week deterioration over a single noisy day.
 */
export const detectPersistentDeterioration: Detector = (campaign, asOfDate) => {
  const weeks: { cpa: number | null; spend: number; conversions: number }[] = [];

  for (let w = 3; w >= 0; w -= 1) {
    const range = weekRange(asOfDate, w);
    const rows = campaign.metrics.filter((m) => inRange(m.date, range));
    const kpis = calculateKpis(aggregateMetrics(rows));
    weeks.push({
      cpa: kpis.cpa,
      spend: kpis.totals.spend,
      conversions: kpis.totals.conversions,
    });
  }

  if (weeks.some((w) => w.cpa == null)) return [];
  if (weeks.some((w) => w.conversions < GATES.minConversionsPerWindow / 2)) {
    return [];
  }
  if (weeks.some((w) => w.spend < GATES.minSpendPerWindow / 2)) return [];

  const cpas = weeks.map((w) => w.cpa!) as number[];
  const steadilyWorse =
    cpas[1]! > cpas[0]! &&
    cpas[2]! > cpas[1]! &&
    cpas[3]! > cpas[2]!;

  const overallPct = changePct(cpas[3]!, cpas[0]!);
  if (!steadilyWorse || overallPct == null || overallPct < 25) return [];

  const currentWeek = weekRange(asOfDate, 0);
  const oldestWeek = weekRange(asOfDate, 3);

  const pack: EvidencePack = {
    detector: "persistent_deterioration",
    campaignId: campaign.campaignId,
    campaignName: campaign.campaignName,
    campaignExternalId: campaign.campaignExternalId,
    severity: overallPct >= 40 ? "high" : "medium",
    finding: {
      metric: "CPA",
      current: cpas[3]!,
      previous: cpas[0]!,
      changePct: overallPct,
    },
    supportingMetrics: {
      week1Cpa: cpas[0]!,
      week2Cpa: cpas[1]!,
      week3Cpa: cpas[2]!,
      week4Cpa: cpas[3]!,
      currentSpend: weeks[3]!.spend,
      previousSpend: weeks[0]!.spend,
      currentConversions: weeks[3]!.conversions,
      previousConversions: weeks[0]!.conversions,
    },
    comparisonWindow: {
      current: `${currentWeek.start}/${currentWeek.end}`,
      previous: `${oldestWeek.start}/${oldestWeek.end}`,
      label: "28d",
    },
    sampleSize: {
      currentConversions: weeks[3]!.conversions,
      previousConversions: weeks[0]!.conversions,
    },
    evidenceStrength: "high",
    commercialImpact: commercialImpactFromSpend(weeks[3]!.spend, overallPct),
    persistenceScore: 1,
    actionability: 0.85,
    notes: ["CPA worsened across four consecutive weeks."],
  };

  void addDays;
  return [pack];
};

export function detectOneDayAnomaly(
  campaign: CampaignContext,
  asOfDate: string,
): EvidencePack[] {
  // Explicitly low priority — evaluation expects ignore / lower priority.
  const dayRows = campaign.metrics.filter((m) => m.date === asOfDate);
  const prevDate = format(subDays(parseISO(asOfDate), 1), "yyyy-MM-dd");
  const prevRows = campaign.metrics.filter((m) => m.date === prevDate);
  if (!dayRows.length || !prevRows.length) return [];

  const current = calculateKpis(aggregateMetrics(dayRows));
  const previous = calculateKpis(aggregateMetrics(prevRows));
  if (current.cpa == null || previous.cpa == null) return [];
  const pct = changePct(current.cpa, previous.cpa);
  if (pct == null || Math.abs(pct) < 40) return [];
  if (
    current.totals.conversions < GATES.minConversionsPerWindow ||
    previous.totals.conversions < GATES.minConversionsPerWindow
  ) {
    return [];
  }

  return [
    {
      detector: "one_day_anomaly",
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      campaignExternalId: campaign.campaignExternalId,
      severity: "low",
      finding: {
        metric: "CPA",
        current: current.cpa,
        previous: previous.cpa,
        changePct: pct,
      },
      supportingMetrics: {
        currentSpend: current.totals.spend,
        previousSpend: previous.totals.spend,
        currentConversions: current.totals.conversions,
        previousConversions: previous.totals.conversions,
      },
      comparisonWindow: {
        current: `${asOfDate}/${asOfDate}`,
        previous: `${prevDate}/${prevDate}`,
        label: "dod",
      },
      sampleSize: {
        currentConversions: current.totals.conversions,
        previousConversions: previous.totals.conversions,
      },
      evidenceStrength: "low",
      commercialImpact: commercialImpactFromSpend(current.totals.spend, pct),
      persistenceScore: 0.1,
      actionability: 0.2,
      notes: ["Single-day movement; prefer sustained patterns."],
    },
  ];
}
