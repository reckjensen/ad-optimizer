import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const severityVariant: Record<
  string,
  "destructive" | "secondary" | "outline"
> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export function InsightListItem({
  id,
  severity,
  campaignName,
  finding,
}: {
  id: string;
  severity: string;
  campaignName: string | null;
  finding: string;
}) {
  return (
    <Link
      href={`/insights/${id}`}
      className={cn(
        "group flex flex-col gap-2 border-b border-border py-5 transition-colors",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-center gap-3">
        <Badge variant={severityVariant[severity] ?? "outline"}>
          {severity}
        </Badge>
        <span className="text-sm font-medium text-muted-foreground">
          {campaignName ?? "Campaign"}
        </span>
      </div>
      <p className="text-base leading-relaxed text-foreground group-hover:underline underline-offset-4">
        {finding}
      </p>
    </Link>
  );
}
