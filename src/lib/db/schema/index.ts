import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const analysisRunStatusEnum = pgEnum("analysis_run_status", [
  "running",
  "completed",
  "failed",
]);

export const severityEnum = pgEnum("severity", ["high", "medium", "low"]);

export const evidenceStrengthEnum = pgEnum("evidence_strength", [
  "high",
  "medium",
  "low",
]);

export const hypothesisConfidenceEnum = pgEnum("hypothesis_confidence", [
  "high",
  "medium",
  "low",
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 256 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    // Placeholder until Better Auth; local MVP uses a fixed member label.
    label: varchar("label", { length: 256 }).notNull().default("local-dev"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("organization_members_org_idx").on(table.organizationId),
  ],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    source: varchar("source", { length: 64 }).notNull(),
    accountExternalId: varchar("account_external_id", { length: 128 }).notNull(),
    campaignExternalId: varchar("campaign_external_id", {
      length: 128,
    }).notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("campaigns_org_source_account_campaign_uidx").on(
      table.organizationId,
      table.source,
      table.accountExternalId,
      table.campaignExternalId,
    ),
    index("campaigns_org_idx").on(table.organizationId),
  ],
);

export const dailyMetrics = pgTable(
  "daily_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    date: date("date").notNull(),
    source: varchar("source", { length: 64 }).notNull(),
    accountExternalId: varchar("account_external_id", { length: 128 }).notNull(),
    campaignExternalId: varchar("campaign_external_id", {
      length: 128,
    }).notNull(),
    spend: numeric("spend", { precision: 14, scale: 2 }).notNull().default("0"),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    conversions: numeric("conversions", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    conversionValue: numeric("conversion_value", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    sessions: integer("sessions"),
    users: integer("users"),
    revenue: numeric("revenue", { precision: 14, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("daily_metrics_canonical_uidx").on(
      table.organizationId,
      table.source,
      table.accountExternalId,
      table.campaignExternalId,
      table.date,
    ),
    index("daily_metrics_org_date_idx").on(table.organizationId, table.date),
    index("daily_metrics_campaign_date_idx").on(
      table.campaignExternalId,
      table.date,
    ),
  ],
);

export const analysisRuns = pgTable(
  "analysis_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: analysisRunStatusEnum("status").notNull().default("running"),
    metricsWindowStart: date("metrics_window_start").notNull(),
    metricsWindowEnd: date("metrics_window_end").notNull(),
    errorMessage: text("error_message"),
  },
  (table) => [index("analysis_runs_org_idx").on(table.organizationId)],
);

export type InsightEvidenceItem = {
  label: string;
  value: string | number;
};

export const insights = pgTable(
  "insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    severity: severityEnum("severity").notNull(),
    finding: text("finding").notNull(),
    whyNow: text("why_now").notNull(),
    evidence: jsonb("evidence").$type<InsightEvidenceItem[]>().notNull(),
    hypothesis: text("hypothesis").notNull(),
    recommendation: text("recommendation").notNull(),
    evidenceStrength: evidenceStrengthEnum("evidence_strength").notNull(),
    hypothesisConfidence: hypothesisConfidenceEnum(
      "hypothesis_confidence",
    ).notNull(),
    detector: varchar("detector", { length: 64 }).notNull(),
    evidencePack: jsonb("evidence_pack").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("insights_org_idx").on(table.organizationId),
    index("insights_run_idx").on(table.analysisRunId),
    index("insights_campaign_idx").on(table.campaignId),
  ],
);

export type Organization = typeof organizations.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type AnalysisRun = typeof analysisRuns.$inferSelect;
export type Insight = typeof insights.$inferSelect;
