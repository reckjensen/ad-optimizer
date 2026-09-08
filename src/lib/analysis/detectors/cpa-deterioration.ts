import {
  GATES,
  hasAdequateSample,
  isMaterialCpaChange,
} from "@/lib/metrics/gates";
import { commercialImpactFromSpend } from "../evidence";
import {
  basePack,
  snapshotsForCampaign,
  type Detector,
} from "./types";

export const detectCpaDeterioration: Detector = (campaign, asOfDate) => {
  const packs = [];

  for (const snapshot of snapshotsForCampaign(campaign, asOfDate)) {
    // Prefer multi-day windows; ignore one-day noise unless later ranked low.
    if (snapshot.window.label === "dod") continue;

    const sample = hasAdequateSample({
      currentConversions: snapshot.current.totals.conversions,
      previousConversions: snapshot.previous.totals.conversions,
      currentSpend: snapshot.current.totals.spend,
      previousSpend: snapshot.previous.totals.spend,
    });
    if (!sample.ok) continue;

    const { current, previous, change } = snapshot;
    if (current.cpa == null || previous.cpa == null || change.cpaPct == null) {
      continue;
    }
    if (change.cpaPct <= 0) continue;
    if (!isMaterialCpaChange(current.cpa, previous.cpa, change.cpaPct)) {
      continue;
    }

    const severity =
      change.cpaPct >= 50 && snapshot.window.label === "7d"
        ? "high"
        : change.cpaPct >= 35
          ? "medium"
          : "low";

    packs.push(
      basePack(campaign, snapshot, {
        detector: "cpa_deterioration",
        severity,
        finding: {
          metric: "CPA",
          current: current.cpa,
          previous: previous.cpa,
          changePct: change.cpaPct,
        },
        evidenceStrength:
          snapshot.window.label === "28d" ||
          (snapshot.current.totals.conversions >= GATES.minConversionsPerWindow * 2 &&
            snapshot.previous.totals.conversions >=
              GATES.minConversionsPerWindow * 2)
            ? "high"
            : "medium",
        commercialImpact: commercialImpactFromSpend(
          current.totals.spend,
          change.cpaPct,
        ),
        persistenceScore: snapshot.window.label === "28d" ? 0.8 : 0.5,
        actionability: 0.8,
      }),
    );
  }

  return packs;
};
