import { and, desc, eq } from "drizzle-orm";
import { analyzeCampaigns } from "@/lib/analysis/run";
import type { CampaignContext } from "@/lib/analysis/detectors/types";
import { db } from "@/lib/db/client";
import {
  analysisRuns,
  campaigns,
  dailyMetrics,
  insights,
  organizations,
} from "@/lib/db/schema";
import { FIXTURE_AS_OF, FIXTURE_ORG_NAME } from "@/lib/fixtures/scenarios";
import { generateValidatedInsights } from "@/lib/insights/generate";
import { subDays, format, parseISO } from "date-fns";

function num(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

export async function getDemoOrganization() {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, FIXTURE_ORG_NAME))
    .limit(1);
  return org ?? null;
}

export async function loadCampaignContexts(
  organizationId: string,
): Promise<CampaignContext[]> {
  const campaignRows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.organizationId, organizationId));

  const metricRows = await db
    .select()
    .from(dailyMetrics)
    .where(eq(dailyMetrics.organizationId, organizationId));

  return campaignRows.map((c) => ({
    campaignId: c.id,
    campaignName: c.name,
    campaignExternalId: c.campaignExternalId,
    metrics: metricRows
      .filter(
        (m) =>
          m.campaignExternalId === c.campaignExternalId &&
          m.source === c.source &&
          m.accountExternalId === c.accountExternalId,
      )
      .map((m) => ({
        date: m.date,
        source: m.source,
        accountExternalId: m.accountExternalId,
        campaignExternalId: m.campaignExternalId,
        spend: num(m.spend),
        impressions: m.impressions,
        clicks: m.clicks,
        conversions: num(m.conversions),
        conversionValue: num(m.conversionValue),
        sessions: m.sessions,
        users: m.users,
        revenue: m.revenue != null ? num(m.revenue) : null,
      })),
  }));
}

export async function runAnalysisForOrg(organizationId: string, asOfDate = FIXTURE_AS_OF) {
  const windowStart = format(subDays(parseISO(asOfDate), 89), "yyyy-MM-dd");

  const [run] = await db
    .insert(analysisRuns)
    .values({
      organizationId,
      status: "running",
      metricsWindowStart: windowStart,
      metricsWindowEnd: asOfDate,
    })
    .returning();

  try {
    const contexts = await loadCampaignContexts(organizationId);
    const { ranked } = analyzeCampaigns(contexts, asOfDate, 5);
    const generated = await generateValidatedInsights(ranked);
    const accepted = generated.filter((g) => g.insight && !g.rejected);

    if (accepted.length) {
      await db.insert(insights).values(
        accepted.map((g) => ({
          organizationId,
          analysisRunId: run!.id,
          campaignId: g.pack.campaignId,
          severity: g.insight!.severity,
          finding: g.insight!.finding,
          whyNow: g.insight!.whyNow,
          evidence: g.insight!.evidence,
          hypothesis: g.insight!.hypothesis,
          recommendation: g.insight!.recommendation,
          evidenceStrength: g.insight!.evidenceStrength,
          hypothesisConfidence: g.insight!.hypothesisConfidence,
          detector: g.pack.detector,
          evidencePack: g.pack as unknown as Record<string, unknown>,
        })),
      );
    }

    const [completed] = await db
      .update(analysisRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(analysisRuns.id, run!.id))
      .returning();

    return {
      run: completed,
      insightCount: accepted.length,
      rejectedCount: generated.filter((g) => g.rejected).length,
    };
  } catch (error) {
    await db
      .update(analysisRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(analysisRuns.id, run!.id));
    throw error;
  }
}

export async function getLatestInsights(organizationId: string) {
  const [latestRun] = await db
    .select()
    .from(analysisRuns)
    .where(
      and(
        eq(analysisRuns.organizationId, organizationId),
        eq(analysisRuns.status, "completed"),
      ),
    )
    .orderBy(desc(analysisRuns.completedAt))
    .limit(1);

  if (!latestRun) {
    return { run: null, insights: [] as (typeof insights.$inferSelect)[] };
  }

  const rows = await db
    .select({
      insight: insights,
      campaignName: campaigns.name,
      campaignExternalId: campaigns.campaignExternalId,
    })
    .from(insights)
    .leftJoin(campaigns, eq(insights.campaignId, campaigns.id))
    .where(eq(insights.analysisRunId, latestRun.id))
    .orderBy(desc(insights.createdAt));

  return { run: latestRun, insights: rows };
}

export async function getInsightById(id: string) {
  const [row] = await db
    .select({
      insight: insights,
      campaignName: campaigns.name,
      campaignExternalId: campaigns.campaignExternalId,
    })
    .from(insights)
    .leftJoin(campaigns, eq(insights.campaignId, campaigns.id))
    .where(eq(insights.id, id))
    .limit(1);
  return row ?? null;
}

export async function getAppState() {
  const org = await getDemoOrganization();
  if (!org) {
    return { state: "empty" as const, org: null, run: null, insights: [] };
  }

  const metricCount = await db
    .select({ id: dailyMetrics.id })
    .from(dailyMetrics)
    .where(eq(dailyMetrics.organizationId, org.id))
    .limit(1);

  if (!metricCount.length) {
    return { state: "empty" as const, org, run: null, insights: [] };
  }

  const { run, insights: rows } = await getLatestInsights(org.id);
  if (!run) {
    return { state: "seeded" as const, org, run: null, insights: [] };
  }
  if (!rows.length) {
    return { state: "no_findings" as const, org, run, insights: rows };
  }
  return { state: "results" as const, org, run, insights: rows };
}
