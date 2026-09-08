import { GATES } from "@/lib/metrics/gates";
import { commercialImpactFromSpend } from "../evidence";
import { basePack, snapshotsForCampaign, type Detector } from "./types";

export const detectConversionRevenueShift: Detector = (campaign, asOfDate) => {
  const packs = [];

  for (const snapshot of snapshotsForCampaign(campaign, asOfDate)) {
    if (snapshot.window.label === "dod") continue;

    const currentConv = snapshot.current.totals.conversions;
    const previousConv = snapshot.previous.totals.conversions;
    const currentRev = snapshot.current.totals.revenue;
    const previousRev = snapshot.previous.totals.revenue;

    if (
      currentConv < GATES.minVolumeConversions ||
      previousConv < GATES.minVolumeConversions
    ) {
      continue;
    }
    if (
      snapshot.current.totals.spend < GATES.minSpendPerWindow ||
      snapshot.previous.totals.spend < GATES.minSpendPerWindow
    ) {
      continue;
    }

    const convPct = snapshot.change.conversionsPct;
    const revPct = snapshot.change.revenuePct;
    if (convPct == null || revPct == null) continue;

    const meaningfulConv =
      Math.abs(convPct) >= GATES.minVolumeChangePct;
    const meaningfulRev = Math.abs(revPct) >= GATES.minVolumeChangePct;

    if (!meaningfulConv && !meaningfulRev) continue;

    // Skip if this is already a proportional spend move (handled as noise elsewhere).
    const spendPct = snapshot.change.spendPct ?? 0;
    if (
      meaningfulConv &&
      Math.abs(spendPct - convPct) < 10 &&
      Math.abs(spendPct) >= GATES.minSpendChangePct
    ) {
      continue;
    }

    const primaryMetric = meaningfulRev && Math.abs(revPct) >= Math.abs(convPct ?? 0)
      ? "revenue"
      : "conversions";
    const changePct = primaryMetric === "revenue" ? revPct : convPct;
    const current = primaryMetric === "revenue" ? currentRev : currentConv;
    const previous = primaryMetric === "revenue" ? previousRev : previousConv;

    packs.push(
      basePack(campaign, snapshot, {
        detector: "conversion_revenue_shift",
        severity: Math.abs(changePct) >= 40 ? "high" : "medium",
        finding: {
          metric: primaryMetric === "revenue" ? "revenue" : "conversions",
          current,
          previous,
          changePct,
        },
        evidenceStrength: "medium",
        commercialImpact: commercialImpactFromSpend(
          Math.max(currentRev, snapshot.current.totals.spend),
          changePct,
        ),
        persistenceScore: snapshot.window.label === "28d" ? 0.65 : 0.4,
        actionability: 0.7,
      }),
    );
  }

  return packs;
};
