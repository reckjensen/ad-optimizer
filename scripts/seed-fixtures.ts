import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  analysisRuns,
  campaigns,
  dailyMetrics,
  insights,
  organizationMembers,
  organizations,
} from "@/lib/db/schema";
import {
  FIXTURE_AS_OF,
  FIXTURE_ORG_NAME,
  FIXTURE_SOURCE,
  buildAllFixtureMetrics,
} from "@/lib/fixtures/scenarios";

async function main() {
  const { campaigns: campaignDefs, metrics } = buildAllFixtureMetrics();

  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, FIXTURE_ORG_NAME))
    .limit(1);

  let organizationId = existing[0]?.id;

  if (organizationId) {
    await db.delete(insights).where(eq(insights.organizationId, organizationId));
    await db
      .delete(analysisRuns)
      .where(eq(analysisRuns.organizationId, organizationId));
    await db
      .delete(dailyMetrics)
      .where(eq(dailyMetrics.organizationId, organizationId));
    await db.delete(campaigns).where(eq(campaigns.organizationId, organizationId));
    await db
      .delete(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));
  } else {
    const [org] = await db
      .insert(organizations)
      .values({ name: FIXTURE_ORG_NAME })
      .returning();
    organizationId = org!.id;
  }

  await db.insert(organizationMembers).values({
    organizationId,
    label: "local-dev",
  });

  const insertedCampaigns = await db
    .insert(campaigns)
    .values(
      campaignDefs.map((c) => ({
        organizationId,
        source: FIXTURE_SOURCE,
        accountExternalId: "acc-demo-001",
        campaignExternalId: c.externalId,
        name: c.name,
      })),
    )
    .returning();

  console.log(
    `Seeded org ${organizationId} with ${insertedCampaigns.length} campaigns`,
  );

  const chunkSize = 500;
  for (let i = 0; i < metrics.length; i += chunkSize) {
    const chunk = metrics.slice(i, i + chunkSize);
    await db.insert(dailyMetrics).values(
      chunk.map((m) => ({
        organizationId,
        date: m.date,
        source: m.source,
        accountExternalId: m.accountExternalId,
        campaignExternalId: m.campaignExternalId,
        spend: m.spend.toFixed(2),
        impressions: m.impressions,
        clicks: m.clicks,
        conversions: m.conversions.toFixed(4),
        conversionValue: m.conversionValue.toFixed(2),
        sessions: m.sessions ?? null,
        users: m.users ?? null,
        revenue: m.revenue != null ? m.revenue.toFixed(2) : null,
      })),
    );
  }

  console.log(
    `Seeded ${metrics.length} daily_metrics rows (as of ${FIXTURE_AS_OF})`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
