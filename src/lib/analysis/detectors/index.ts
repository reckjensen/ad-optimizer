import { detectCpaDeterioration } from "./cpa-deterioration";
import { detectCpaImprovement } from "./cpa-improvement";
import { detectSpendConversionMismatch } from "./spend-conversion";
import { detectRoasChange } from "./roas-change";
import { detectConversionRevenueShift } from "./conversion-revenue";
import {
  detectOneDayAnomaly,
  detectPersistentDeterioration,
} from "./persistence";
import type { CampaignContext, Detector } from "./types";
import type { EvidencePack } from "../evidence";

const DETECTORS: Detector[] = [
  detectCpaDeterioration,
  detectCpaImprovement,
  detectSpendConversionMismatch,
  detectRoasChange,
  detectConversionRevenueShift,
  detectPersistentDeterioration,
  detectOneDayAnomaly,
];

export function runDetectors(
  campaigns: CampaignContext[],
  asOfDate: string,
): EvidencePack[] {
  const packs: EvidencePack[] = [];
  for (const campaign of campaigns) {
    for (const detector of DETECTORS) {
      packs.push(...detector(campaign, asOfDate));
    }
  }
  return packs;
}

export {
  detectCpaDeterioration,
  detectCpaImprovement,
  detectSpendConversionMismatch,
  detectRoasChange,
  detectConversionRevenueShift,
  detectPersistentDeterioration,
  detectOneDayAnomaly,
};
