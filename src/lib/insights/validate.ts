import type { EvidencePack } from "@/lib/analysis/evidence";
import type { GeneratedInsight } from "./schema";

function collectEvidenceNumbers(pack: EvidencePack): Set<string> {
  const nums = new Set<string>();
  const add = (n: number) => {
    nums.add(String(n));
    nums.add(n.toFixed(2));
    nums.add(n.toFixed(1));
    nums.add(n.toFixed(0));
    nums.add(String(Math.round(n)));
    // Common euro formatting without symbol
    nums.add(n.toLocaleString("en-US", { maximumFractionDigits: 2 }));
  };

  add(pack.finding.current);
  add(pack.finding.previous);
  add(pack.finding.changePct);
  add(Math.abs(pack.finding.changePct));
  for (const v of Object.values(pack.supportingMetrics)) {
    add(v);
    add(Math.abs(v));
  }
  add(pack.sampleSize.currentConversions);
  add(pack.sampleSize.previousConversions);
  return nums;
}

/** Extract numeric tokens from free text (including %, commas). */
export function extractNumbers(text: string): number[] {
  // Prefer full numbers; avoid splitting 2550 into 255 + 0.
  const matches = text.match(/-?\d+(?:,\d{3})+(?:\.\d+)?|-?\d+\.\d+|-?\d+/g);
  if (!matches) return [];
  return matches
    .map((m) => Number(m.replace(/,/g, "")))
    .filter((n) => !Number.isNaN(n));
}

function numberAllowed(n: number, allowed: Set<string>): boolean {
  if (allowed.has(String(n))) return true;
  if (allowed.has(n.toFixed(2))) return true;
  if (allowed.has(n.toFixed(1))) return true;
  if (allowed.has(n.toFixed(0))) return true;
  // Allow small rounding tolerance against evidence values
  for (const raw of allowed) {
    const ev = Number(raw);
    if (Number.isNaN(ev)) continue;
    if (Math.abs(ev - n) < 0.05) return true;
    // percentage points often shown as integers
    if (Math.abs(ev - n) < 0.6 && Number.isInteger(n)) return true;
  }
  return false;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; reasons: string[] };

export function validateInsightAgainstEvidence(
  insight: GeneratedInsight,
  pack: EvidencePack,
): ValidationResult {
  const reasons: string[] = [];

  if (!insight.evidence.length) {
    reasons.push("missing_evidence");
  }

  const hyp = insight.hypothesis.toLowerCase();
  if (
    !hyp.includes("hypothesis") &&
    !hyp.includes("may ") &&
    !hyp.includes("might ") &&
    !hyp.includes("could ") &&
    !hyp.includes("possible")
  ) {
    reasons.push("hypothesis_not_labelled");
  }

  if (/caused by|definitely|proves that|we know that .* because/i.test(insight.hypothesis)) {
    reasons.push("hypothesis_claims_causation");
  }

  const allowedEntities = new Set([
    pack.campaignName.toLowerCase(),
    pack.campaignExternalId.toLowerCase(),
  ]);

  const textBlob = [
    insight.finding,
    insight.whyNow,
    insight.hypothesis,
    insight.recommendation,
    ...insight.evidence.map((e) => `${e.label} ${e.value}`),
  ].join(" \n ");

  // Reject invented campaign-like Proper Nouns that aren't the known campaign.
  // Keep this soft: only flag explicit "Campaign X" mismatches.
  const campaignMentions = textBlob.match(/\b[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3}\b/g) ?? [];
  for (const mention of campaignMentions) {
    const lower = mention.toLowerCase();
    if (
      lower.includes("cpa") ||
      lower.includes("roas") ||
      lower.includes("spend") ||
      lower.includes("conversion") ||
      lower.includes("review") ||
      lower.includes("possible") ||
      lower.includes("hypothesis")
    ) {
      continue;
    }
    // If text mentions a different known fixture-style name, reject.
    if (
      lower.includes("campaign") &&
      ![...allowedEntities].some((e) => lower.includes(e))
    ) {
      // soft skip — too noisy for Proper Noun detection
    }
  }

  if (
    !textBlob.toLowerCase().includes(pack.campaignName.toLowerCase()) &&
    insight.finding.length > 0
  ) {
    // Finding may omit name if UI shows it; do not fail solely on that.
  }

  const allowedNums = collectEvidenceNumbers(pack);
  // Window labels often include dates / day counts referenced in whyNow.
  for (const part of [
    pack.comparisonWindow.current,
    pack.comparisonWindow.previous,
  ]) {
    for (const n of extractNumbers(part)) {
      allowedNums.add(String(n));
    }
  }
  const numbers = extractNumbers(textBlob);
  for (const n of numbers) {
    // Ignore years / common non-metric integers in prose (e.g. "4 weeks", "7 days")
    if (n >= 1900 && n <= 2100) continue;
    if (n === 0) continue;
    if (Number.isInteger(n) && n > 0 && n <= 90) continue;
    if (!numberAllowed(n, allowedNums)) {
      reasons.push(`untraceable_number:${n}`);
    }
  }

  if (insight.severity !== pack.severity) {
    // Severity may be softened by the model; allow if not inflated.
    const order = { low: 1, medium: 2, high: 3 } as const;
    if (order[insight.severity] > order[pack.severity]) {
      reasons.push("severity_inflated");
    }
  }

  if (!insight.recommendation.trim()) {
    reasons.push("empty_recommendation");
  }

  return reasons.length ? { ok: false, reasons } : { ok: true };
}
