import { getAppState } from "@/lib/analysis/service";
import { InsightListItem } from "@/components/insight-list-item";
import {
  EmptyState,
  NoFindingsState,
  SeededState,
} from "@/components/feed-states";
import { RunAnalysisButton } from "@/components/run-analysis-button";
import { Separator } from "@/components/ui/separator";

export default async function HomePage() {
  const app = await getAppState();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Ad Analyst
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            What needs my attention?
          </h1>
          {(app.state === "results" || app.state === "no_findings") && (
            <RunAnalysisButton label="Run again" />
          )}
        </div>
        <p className="max-w-prose text-muted-foreground">
          Evidence-first marketing insights. Deterministic detectors find what
          happened; wording is validated against the numbers.
        </p>
      </header>

      <Separator className="my-8" />

      {app.state === "empty" && <EmptyState />}
      {app.state === "seeded" && <SeededState />}
      {app.state === "no_findings" && <NoFindingsState />}
      {app.state === "results" && (
        <section className="flex flex-col" aria-label="Insights">
          {app.insights.map(({ insight, campaignName }) => (
            <InsightListItem
              key={insight.id}
              id={insight.id}
              severity={insight.severity}
              campaignName={campaignName}
              finding={insight.finding}
            />
          ))}
        </section>
      )}
    </main>
  );
}
