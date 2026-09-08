import { runDetectors } from "./detectors";
import { rankEvidencePacks } from "./rank";
import type { CampaignContext } from "./detectors/types";
import type { EvidencePack } from "./evidence";

export type AnalysisResult = {
  asOfDate: string;
  evidencePacks: EvidencePack[];
  ranked: EvidencePack[];
};

export function analyzeCampaigns(
  campaigns: CampaignContext[],
  asOfDate: string,
  limit = 5,
): AnalysisResult {
  const evidencePacks = runDetectors(campaigns, asOfDate);
  const ranked = rankEvidencePacks(evidencePacks, limit);
  return { asOfDate, evidencePacks, ranked };
}
