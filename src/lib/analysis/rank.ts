import type { EvidencePack, Severity } from "./evidence";

const SEVERITY_SCORE: Record<Severity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const STRENGTH_SCORE = {
  high: 3,
  medium: 2,
  low: 1,
} as const;

export function scoreEvidence(pack: EvidencePack): number {
  const magnitude = Math.min(Math.abs(pack.finding.changePct) / 100, 2);
  return (
    SEVERITY_SCORE[pack.severity] * 40 +
    STRENGTH_SCORE[pack.evidenceStrength] * 20 +
    Math.min(pack.commercialImpact / 50, 30) +
    pack.persistenceScore * 25 +
    pack.actionability * 20 +
    magnitude * 15
  );
}

/**
 * Rank evidence packs and keep at most `limit` unique campaign+detector pairs.
 * Drops weak one-day anomalies when stronger packs exist.
 */
export function rankEvidencePacks(
  packs: EvidencePack[],
  limit = 5,
): EvidencePack[] {
  const filtered = packs.filter((p) => {
    if (p.detector === "one_day_anomaly") return false;
    if (p.evidenceStrength === "low" && p.severity === "low") return false;
    return true;
  });

  const sorted = [...filtered].sort(
    (a, b) => scoreEvidence(b) - scoreEvidence(a),
  );

  const seen = new Set<string>();
  const result: EvidencePack[] = [];

  for (const pack of sorted) {
    const key = `${pack.campaignExternalId}:${pack.detector}`;
    if (seen.has(key)) continue;
    // Prefer one insight per campaign in the top feed.
    const campaignKey = pack.campaignExternalId;
    if ([...seen].some((k) => k.startsWith(`${campaignKey}:`))) {
      continue;
    }
    seen.add(key);
    result.push(pack);
    if (result.length >= limit) break;
  }

  return result;
}
