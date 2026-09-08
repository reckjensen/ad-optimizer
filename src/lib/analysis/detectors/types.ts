import {
  aggregateMetrics,
  calculateKpis,
  changePct,
  type CanonicalDailyMetric,
  type KpiBundle,
} from "@/lib/metrics/calculate";
import {
  formatRange,
  getComparisonWindows,
  inRange,
  type ComparisonWindows,
} from "@/lib/metrics/periods";
import type { EvidencePack } from "../evidence";

export type CampaignContext = {
  campaignId: string;
  campaignName: string;
  campaignExternalId: string;
  metrics: CanonicalDailyMetric[];
};

export type WindowSnapshot = {
  window: ComparisonWindows;
  currentRows: CanonicalDailyMetric[];
  previousRows: CanonicalDailyMetric[];
  current: KpiBundle;
  previous: KpiBundle;
  change: {
    spendPct: number | null;
    conversionsPct: number | null;
    conversionValuePct: number | null;
    revenuePct: number | null;
    cpaPct: number | null;
    roasPct: number | null;
  };
};

export function snapshotsForCampaign(
  campaign: CampaignContext,
  asOfDate: string,
): WindowSnapshot[] {
  return getComparisonWindows(asOfDate).map((window) => {
    const currentRows = campaign.metrics.filter((m) =>
      inRange(m.date, window.current),
    );
    const previousRows = campaign.metrics.filter((m) =>
      inRange(m.date, window.previous),
    );
    const current = calculateKpis(aggregateMetrics(currentRows));
    const previous = calculateKpis(aggregateMetrics(previousRows));
    return {
      window,
      currentRows,
      previousRows,
      current,
      previous,
      change: {
        spendPct: changePct(current.totals.spend, previous.totals.spend),
        conversionsPct: changePct(
          current.totals.conversions,
          previous.totals.conversions,
        ),
        conversionValuePct: changePct(
          current.totals.conversionValue,
          previous.totals.conversionValue,
        ),
        revenuePct: changePct(current.totals.revenue, previous.totals.revenue),
        cpaPct:
          current.cpa != null && previous.cpa != null
            ? changePct(current.cpa, previous.cpa)
            : null,
        roasPct:
          current.roas != null && previous.roas != null
            ? changePct(current.roas, previous.roas)
            : null,
      },
    };
  });
}

export function basePack(
  campaign: CampaignContext,
  snapshot: WindowSnapshot,
  partial: Omit<
    EvidencePack,
    | "campaignId"
    | "campaignName"
    | "campaignExternalId"
    | "comparisonWindow"
    | "sampleSize"
    | "supportingMetrics"
  > & {
    supportingMetrics?: Record<string, number>;
  },
): EvidencePack {
  return {
    campaignId: campaign.campaignId,
    campaignName: campaign.campaignName,
    campaignExternalId: campaign.campaignExternalId,
    comparisonWindow: {
      current: formatRange(snapshot.window.current),
      previous: formatRange(snapshot.window.previous),
      label: snapshot.window.label,
    },
    sampleSize: {
      currentConversions: snapshot.current.totals.conversions,
      previousConversions: snapshot.previous.totals.conversions,
    },
    supportingMetrics: {
      currentSpend: snapshot.current.totals.spend,
      previousSpend: snapshot.previous.totals.spend,
      currentConversions: snapshot.current.totals.conversions,
      previousConversions: snapshot.previous.totals.conversions,
      currentConversionValue: snapshot.current.totals.conversionValue,
      previousConversionValue: snapshot.previous.totals.conversionValue,
      currentRevenue: snapshot.current.totals.revenue,
      previousRevenue: snapshot.previous.totals.revenue,
      ...(snapshot.current.cpa != null
        ? { currentCpa: snapshot.current.cpa }
        : {}),
      ...(snapshot.previous.cpa != null
        ? { previousCpa: snapshot.previous.cpa }
        : {}),
      ...(snapshot.current.roas != null
        ? { currentRoas: snapshot.current.roas }
        : {}),
      ...(snapshot.previous.roas != null
        ? { previousRoas: snapshot.previous.roas }
        : {}),
      ...partial.supportingMetrics,
    },
    ...partial,
  };
}

export type Detector = (
  campaign: CampaignContext,
  asOfDate: string,
) => EvidencePack[];
