/**
 * Significance / practical-impact gates.
 * Prefer no insight over a misleading one. Thresholds can evolve via eval suite.
 */

export type SampleGateResult = {
  ok: boolean;
  reason?: string;
};

export const GATES = {
  /** Minimum conversions in each comparison window for CPA/ROAS claims. */
  minConversionsPerWindow: 15,
  /** Tiny campaigns: absolute spend too low to matter commercially. */
  minSpendPerWindow: 200,
  /** Minimum absolute CPA delta (€) to be practically meaningful. */
  minCpaAbsoluteDelta: 3,
  /** Minimum relative CPA change (%). */
  minCpaChangePct: 20,
  /** Minimum relative spend change for mismatch detector (%). */
  minSpendChangePct: 25,
  /** Conversion must be flat/down within this band for "spend up / conv flat". */
  conversionFlatBandPct: 10,
  /** Minimum ROAS absolute delta. */
  minRoasAbsoluteDelta: 0.4,
  /** Minimum ROAS relative change (%). */
  minRoasChangePct: 25,
  /** Minimum conversion/revenue relative change (%). */
  minVolumeChangePct: 25,
  /** Minimum current conversions for volume-shift claims. */
  minVolumeConversions: 20,
  /** Tiny sample absolute conversion count — always ignore. */
  tinySampleConversions: 5,
} as const;

export function hasAdequateSample(input: {
  currentConversions: number;
  previousConversions: number;
  currentSpend: number;
  previousSpend: number;
}): SampleGateResult {
  if (
    input.currentConversions < GATES.tinySampleConversions ||
    input.previousConversions < GATES.tinySampleConversions
  ) {
    return { ok: false, reason: "tiny_sample" };
  }
  if (
    input.currentConversions < GATES.minConversionsPerWindow ||
    input.previousConversions < GATES.minConversionsPerWindow
  ) {
    return { ok: false, reason: "insufficient_conversions" };
  }
  if (
    input.currentSpend < GATES.minSpendPerWindow ||
    input.previousSpend < GATES.minSpendPerWindow
  ) {
    return { ok: false, reason: "insufficient_spend" };
  }
  return { ok: true };
}

export function isMaterialCpaChange(
  currentCpa: number,
  previousCpa: number,
  changePct: number,
): boolean {
  const absDelta = Math.abs(currentCpa - previousCpa);
  return (
    absDelta >= GATES.minCpaAbsoluteDelta &&
    Math.abs(changePct) >= GATES.minCpaChangePct
  );
}

export function isMaterialRoasChange(
  currentRoas: number,
  previousRoas: number,
  changePct: number,
): boolean {
  const absDelta = Math.abs(currentRoas - previousRoas);
  return (
    absDelta >= GATES.minRoasAbsoluteDelta &&
    Math.abs(changePct) >= GATES.minRoasChangePct
  );
}
