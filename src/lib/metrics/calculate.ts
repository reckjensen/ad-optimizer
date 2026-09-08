/** Canonical daily marketing observation — shared by fixtures and future connectors. */
export type CanonicalDailyMetric = {
  date: string; // YYYY-MM-DD
  source: string;
  accountExternalId: string;
  campaignExternalId: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  sessions?: number | null;
  users?: number | null;
  revenue?: number | null;
};

export type AggregatedTotals = {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  revenue: number;
  sessions: number;
  users: number;
  days: number;
};

export type KpiBundle = {
  totals: AggregatedTotals;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  cvr: number | null;
  roas: number | null;
};

export function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function aggregateMetrics(
  rows: Pick<
    CanonicalDailyMetric,
    | "spend"
    | "impressions"
    | "clicks"
    | "conversions"
    | "conversionValue"
    | "sessions"
    | "users"
    | "revenue"
  >[],
): AggregatedTotals {
  return rows.reduce<AggregatedTotals>(
    (acc, row) => {
      acc.spend += row.spend;
      acc.impressions += row.impressions;
      acc.clicks += row.clicks;
      acc.conversions += row.conversions;
      acc.conversionValue += row.conversionValue;
      acc.revenue += row.revenue ?? row.conversionValue;
      acc.sessions += row.sessions ?? 0;
      acc.users += row.users ?? 0;
      acc.days += 1;
      return acc;
    },
    {
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      conversionValue: 0,
      revenue: 0,
      sessions: 0,
      users: 0,
      days: 0,
    },
  );
}

export function calculateKpis(totals: AggregatedTotals): KpiBundle {
  return {
    totals,
    ctr:
      totals.impressions > 0
        ? round((totals.clicks / totals.impressions) * 100, 4)
        : null,
    cpc: totals.clicks > 0 ? round(totals.spend / totals.clicks, 4) : null,
    cpa:
      totals.conversions > 0 ? round(totals.spend / totals.conversions, 4) : null,
    cvr:
      totals.clicks > 0
        ? round((totals.conversions / totals.clicks) * 100, 4)
        : null,
    roas:
      totals.spend > 0
        ? round(
            (totals.revenue > 0 ? totals.revenue : totals.conversionValue) /
              totals.spend,
            4,
          )
        : null,
  };
}

export function changePct(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return round(((current - previous) / Math.abs(previous)) * 100, 2);
}
