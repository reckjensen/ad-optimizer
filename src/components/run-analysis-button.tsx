"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runAnalysisAction } from "@/app/actions";

export function RunAnalysisButton({
  label = "Run analysis",
}: {
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await runAnalysisAction();
          if (!result.ok) {
            console.error(result.message);
          }
          router.refresh();
        });
      }}
    >
      {pending ? (
        <Loader2Icon data-icon="inline-start" className="animate-spin" />
      ) : null}
      {pending ? "Analyzing…" : label}
    </Button>
  );
}
