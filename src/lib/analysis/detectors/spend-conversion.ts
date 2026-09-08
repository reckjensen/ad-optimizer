import { GATES, hasAdequateSample } from "@/lib/metrics/gates";
import { commercialImpactFromSpend } from "../evidence";
import { basePack, snapshotsForCampaign, type Detector } from "./types";

export const detectSpendConversionMismatch: Detector = (campaign, asOfDate) => {
  const packs = [];

  for (const snapshot of snapshotsForCampaign(campaign, asOfDate)) {
    if (snapshot.window.label === "dod") continue;

    const sample = hasAdequateSample({
      currentConversions: snapshot.current.totals.conversions,
      previousConversions: Math.max(
        snapshot.previous.totals.conversions,
        GATES.minConversionsPerWindow,
      ),
      // Allow previous conversions check via original values below.
      currentSpend: snapshot.current.totals.spend,
      previousSpend: snapshot.previous.totals.spend,
    });

    // Re-check previous conversions honestly (gate above padded for spend-only).
    if (
      snapshot.current.totals.conversions < GATES.minConversionsPerWindow &&
      snapshot.previous.totals.conversions < GATES.minConversionsPerWindow
    ) {
      continue;
    }
    if (
      snapshot.current.totals.spend < GATES.minSpendPerWindow ||
      snapshot.previous.totals.spend < GATES.minSpendPerWindow
    ) {
      continue;
    }
    if (
      snapshot.current.totals.conversions < GATES.tinySampleConversions ||
      snapshot.previous.totals.conversions < GATES.tinySampleConversions
    ) {
      continue;
    }
    // At least one window should meet conversion floor for mismatch claims.
    if (
      snapshot.previous.totals.conversions < GATES.minConversionsPerWindow &&
      snapshot.current.totals.conversions < GATES.minConversionsPerWindow
    ) {
      continue;
    }
    void sample;

    const spendPct = snapshot.change.spendPct;
    const convPct = snapshot.change.conversionsPct;
    if (spendPct == null || convPct == null) continue;

    const spendUpConvFlat =
      spendPct >= GATES.minSpendChangePct &&
      convPct <= GATES.conversionFlatBandPct;

    const spendDownConvUp =
      spendPct <= -GATES.minSpendChangePct &&
      convPct >= GATES.minVolumeChangePct;

    if (!spendUpConvFlat && !spendDownConvUp) continue;

    packs.push(
      basePack(campaign, snapshot, {
        detector: "spend_conversion_mismatch",
        severity: spendUpConvFlat && spendPct >= 40 ? "high" : "medium",
        finding: {
          metric: spendUpConvFlat ? "spend_vs_conversions" : "efficiency_gain",
          current: snapshot.current.totals.spend,
          previous: snapshot.previous.totals.spend,
          changePct: spendPct,
        },
        supportingMetrics: {
          spendChangePct: spendPct,
          conversionsChangePct: convPct,
        },
        evidenceStrength: "medium",
        commercialImpact: commercialImpactFromSpend(
          snapshot.current.totals.spend,
          spendPct,
        ),
        persistenceScore: snapshot.window.label === "28d" ? 0.6 : 0.4,
        actionability: 0.75,
        notes: [
          spendUpConvFlat
            ? "Spend rose while conversions stayed flat or declined."
            : "Spend fell while conversions rose.",
        ],
      }),
    );
  }

  return packs;
};
