import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { RunAnalysisButton } from "@/components/run-analysis-button";

export function EmptyState() {
  return (
    <Empty className="border border-dashed border-border py-16">
      <EmptyHeader>
        <EmptyTitle>No demo data yet</EmptyTitle>
        <EmptyDescription>
          Seed fixture campaigns, then run analysis to see what needs attention.
        </EmptyDescription>
      </EmptyHeader>
      <p className="mt-4 font-mono text-sm text-muted-foreground">
        npm run seed
      </p>
    </Empty>
  );
}

export function SeededState() {
  return (
    <Empty className="border border-dashed border-border py-16">
      <EmptyHeader>
        <EmptyTitle>Fixtures ready</EmptyTitle>
        <EmptyDescription>
          Demo metrics are loaded. Run analysis to generate evidence-backed
          insights.
        </EmptyDescription>
      </EmptyHeader>
      <div className="mt-6">
        <RunAnalysisButton />
      </div>
    </Empty>
  );
}

export function NoFindingsState() {
  return (
    <Empty className="border border-dashed border-border py-16">
      <EmptyHeader>
        <EmptyTitle>Nothing needs your attention</EmptyTitle>
        <EmptyDescription>
          The analysis found no meaningful changes worth acting on. That is a
          valid analyst result.
        </EmptyDescription>
      </EmptyHeader>
      <div className="mt-6">
        <RunAnalysisButton label="Run analysis again" />
      </div>
    </Empty>
  );
}
