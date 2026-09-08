import "dotenv/config";
import {
  getDemoOrganization,
  runAnalysisForOrg,
} from "../src/lib/analysis/service";

async function main() {
  const org = await getDemoOrganization();
  if (!org) {
    throw new Error("No demo organization. Run npm run seed first.");
  }
  const result = await runAnalysisForOrg(org.id);
  console.log(
    `Analysis ${result.run?.id}: ${result.insightCount} insights (${result.rejectedCount} rejected)`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
