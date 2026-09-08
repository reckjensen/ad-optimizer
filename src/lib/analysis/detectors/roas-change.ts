import {
  GATES,
  hasAdequateSample,
  isMaterialRoasChange,
} from "@/lib/metrics/gates";
import { commercialImpactFromSpend } from "../evidence";
import { basePack, snapshotsForCampaign, type Detector } from "./types";

export const detectRoasChange: Detector = (campaign, asOfDate) => {
  const packs = [];

  for (const snapshot of snapshotsForCampaign(campaign, asOfDate)) {
    if (snapshot.window.label === "dod") continue;

    const sample = hasAdequateSample({
      currentConversions: snapshot.current.totals.conversions,
      previousConversions: snapshot.previous.totals.conversions,
      currentSpend: snapshot.current.totals.spend,
      previousSpend: snapshot.previous.totals.spend,
    });
    if (!sample.ok) continue;

    const { current, previous, change } = snapshot;
    if (current.roas == null || previous.roas == null || change.roasPct == null) {
      continue;
    }
    if (!isMaterialRoasChange(current.roas, previous.roas, change.roasPct)) {
      continue;
    }

    const improving = change.roasPct > 0;
    packs.push(
      basePack(campaign, snapshot, {
        detector: improving ? "roas_improvement" : "roas_deterioration",
        severity:
          Math.abs(change.roasPct) >= 50
            ? improving
              ? "medium"
              : "high"
            : "medium",
        finding: {
          metric: "ROAS",
          current: current.roas,
          previous: previous.roas,
          changePct: change.roasPct,
        },
        evidenceStrength:
          current.totals.conversionValue >= GATES.minSpendPerWindow * 2
            ? "high"
            : "medium",
        commercialImpact: commercialImpactFromSpend(
          current.totals.spend,
          change.roasPct,
        ),
        persistenceScore: snapshot.window.label === "28d" ? 0.7 : 0.45,
        actionability: improving ? 0.7 : 0.8,
      }),
    );
  }

  return packs;
};
