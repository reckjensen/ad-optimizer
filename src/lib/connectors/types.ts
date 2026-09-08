/**
 * Future connector contract. Fixtures and Google Ads both produce this grain.
 * No Google Ads implementation in MVP-0.
 */
export type CanonicalMetricInput = {
  organizationId: string;
  date: string;
  source: string;
  accountExternalId: string;
  campaignExternalId: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  sessions?: number | null;
  users?: number | null;
  revenue?: number | null;
};
