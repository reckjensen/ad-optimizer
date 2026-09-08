import Link from "next/link";
import { notFound } from "next/navigation";
import { getInsightById } from "@/lib/analysis/service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export default async function InsightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getInsightById(id);
  if (!row) notFound();

  const { insight, campaignName } = row;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <div className="mb-8">
        <Button variant="ghost" nativeButton={false} render={<Link href="/" />}>
          ← Back to attention
        </Button>
      </div>

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Badge
            variant={
              insight.severity === "high"
                ? "destructive"
                : insight.severity === "medium"
                  ? "secondary"
                  : "outline"
            }
          >
            {insight.severity}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {campaignName ?? "Campaign"}
          </span>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {insight.finding}
        </h1>
      </header>

      <Separator className="my-8" />

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Why now
          </h2>
          <p className="leading-relaxed">{insight.whyNow}</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            What we know
          </h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {insight.evidence.map((item) => (
              <div key={item.label} className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd className="font-mono text-base tabular-nums">
                  {String(item.value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Possible explanation
          </h2>
          <p className="leading-relaxed">{insight.hypothesis}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Recommended action
          </h2>
          <p className="leading-relaxed">{insight.recommendation}</p>
        </section>

        <section className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <p>
            Evidence strength:{" "}
            <span className="font-medium text-foreground">
              {insight.evidenceStrength}
            </span>
          </p>
          <p>
            Hypothesis confidence:{" "}
            <span className="font-medium text-foreground">
              {insight.hypothesisConfidence}
            </span>
          </p>
          <p>
            Detector:{" "}
            <span className="font-mono text-foreground">{insight.detector}</span>
          </p>
        </section>
      </div>
    </main>
  );
}
