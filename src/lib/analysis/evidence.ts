import type { ComparisonWindows } from "@/lib/metrics/periods";

export type Severity = "high" | "medium" | "low";
export type EvidenceStrength = "high" | "medium" | "low";

export type EvidencePack = {
  detector: string;
  campaignId: string;
  campaignName: string;
  campaignExternalId: string;
  severity: Severity;
  finding: {
    metric: string;
    current: number;
    previous: number;
    changePct: number;
  };
  supportingMetrics: Record<string, number>;
  comparisonWindow: {
    current: string;
    previous: string;
    label: ComparisonWindows["label"];
  };
  sampleSize: {
    currentConversions: number;
    previousConversions: number;
  };
  evidenceStrength: EvidenceStrength;
  commercialImpact: number;
  persistenceScore: number;
  actionability: number;
  notes?: string[];
};

export function commercialImpactFromSpend(spend: number, changePct: number): number {
  return Math.abs(spend) * (Math.abs(changePct) / 100);
}
