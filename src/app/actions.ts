"use server";

import { revalidatePath } from "next/cache";
import {
  getDemoOrganization,
  runAnalysisForOrg,
} from "@/lib/analysis/service";

export async function runAnalysisAction(): Promise<{
  ok: boolean;
  message: string;
}> {
  const org = await getDemoOrganization();
  if (!org) {
    return {
      ok: false,
      message: "No demo organization found. Run npm run seed first.",
    };
  }

  try {
    const result = await runAnalysisForOrg(org.id);
    revalidatePath("/");
    revalidatePath("/insights", "layout");
    return {
      ok: true,
      message: `Analysis complete — ${result.insightCount} insight(s) ready.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Analysis failed",
    };
  }
}
