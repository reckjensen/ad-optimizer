import OpenAI from "openai";
import type { EvidencePack } from "@/lib/analysis/evidence";
import { generatedInsightSchema, type GeneratedInsight } from "./schema";
import { validateInsightAgainstEvidence } from "./validate";

function templateInsight(pack: EvidencePack): GeneratedInsight {
  const direction =
    pack.finding.changePct > 0
      ? "increased"
      : pack.finding.changePct < 0
        ? "decreased"
        : "changed";

  const hypothesis = `Traffic quality or auction dynamics may have shifted. This is a hypothesis, not a confirmed cause.`;
  const absChange = Math.abs(pack.finding.changePct);
  const fmt = (n: number) => Number(n.toFixed(2)).toString();

  return {
    severity: pack.severity,
    finding: `${pack.campaignName}: ${pack.finding.metric} ${direction} ${fmt(absChange)}% (${fmt(pack.finding.previous)} → ${fmt(pack.finding.current)}).`,
    whyNow: `Compared ${pack.comparisonWindow.previous} with ${pack.comparisonWindow.current} (${pack.comparisonWindow.label}). Evidence strength is ${pack.evidenceStrength}.`,
    evidence: [
      { label: "Current", value: Number(pack.finding.current.toFixed(2)) },
      { label: "Previous", value: Number(pack.finding.previous.toFixed(2)) },
      { label: "Change %", value: Number(pack.finding.changePct.toFixed(2)) },
      {
        label: "Current spend",
        value: Number((pack.supportingMetrics.currentSpend ?? 0).toFixed(2)),
      },
      {
        label: "Previous spend",
        value: Number((pack.supportingMetrics.previousSpend ?? 0).toFixed(2)),
      },
      {
        label: "Current conversions",
        value: Number(pack.sampleSize.currentConversions.toFixed(2)),
      },
      {
        label: "Previous conversions",
        value: Number(pack.sampleSize.previousConversions.toFixed(2)),
      },
    ],
    hypothesis,
    recommendation: `Review ${pack.campaignName} targeting, creatives, and recent changes before adjusting budget.`,
    evidenceStrength: pack.evidenceStrength,
    hypothesisConfidence: "medium",
  };
}

async function openaiInsight(pack: EvidencePack): Promise<GeneratedInsight | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a marketing analyst. Turn an evidence pack into a concise insight.
Rules:
- Use ONLY numbers and entities from the evidence pack.
- Never invent numbers, campaign names, or causes.
- Never calculate new metrics.
- Distinguish facts from hypotheses. Hypotheses must use hedging language (may/might/could) and say they are a hypothesis.
- Prefer useful brevity.
- Return JSON matching: severity, finding, whyNow, evidence[{label,value}], hypothesis, recommendation, evidenceStrength, hypothesisConfidence.`,
      },
      {
        role: "user",
        content: JSON.stringify(pack),
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return null;
  const parsed = generatedInsightSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return null;
  return parsed.data;
}

export type InsightGenerationResult = {
  pack: EvidencePack;
  insight: GeneratedInsight | null;
  rejected: boolean;
  reasons?: string[];
  source: "openai" | "template";
};

export async function generateValidatedInsight(
  pack: EvidencePack,
): Promise<InsightGenerationResult> {
  let insight: GeneratedInsight | null = null;
  let source: "openai" | "template" = "template";

  try {
    const fromOpenAi = await openaiInsight(pack);
    if (fromOpenAi) {
      insight = fromOpenAi;
      source = "openai";
    }
  } catch {
    insight = null;
  }

  if (!insight) {
    insight = templateInsight(pack);
    source = "template";
  }

  const validation = validateInsightAgainstEvidence(insight, pack);
  if (!validation.ok) {
    // Template should always pass; if OpenAI failed validation, fall back once.
    if (source === "openai") {
      const fallback = templateInsight(pack);
      const again = validateInsightAgainstEvidence(fallback, pack);
      if (again.ok) {
        return { pack, insight: fallback, rejected: false, source: "template" };
      }
      return {
        pack,
        insight: null,
        rejected: true,
        reasons: validation.reasons,
        source,
      };
    }
    return {
      pack,
      insight: null,
      rejected: true,
      reasons: validation.reasons,
      source,
    };
  }

  return { pack, insight, rejected: false, source };
}

export async function generateValidatedInsights(
  packs: EvidencePack[],
): Promise<InsightGenerationResult[]> {
  const results: InsightGenerationResult[] = [];
  for (const pack of packs) {
    results.push(await generateValidatedInsight(pack));
  }
  return results;
}
