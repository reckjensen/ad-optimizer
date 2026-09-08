import { z } from "zod";

export const generatedInsightSchema = z.object({
  severity: z.enum(["high", "medium", "low"]),
  finding: z.string().min(1),
  whyNow: z.string().min(1),
  evidence: z
    .array(
      z.object({
        label: z.string(),
        value: z.union([z.string(), z.number()]),
      }),
    )
    .min(1),
  hypothesis: z.string().min(1),
  recommendation: z.string().min(1),
  evidenceStrength: z.enum(["high", "medium", "low"]),
  hypothesisConfidence: z.enum(["high", "medium", "low"]),
});

export type GeneratedInsight = z.infer<typeof generatedInsightSchema>;
