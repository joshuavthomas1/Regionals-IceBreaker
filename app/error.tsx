"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center gap-4 px-5 py-16">
      <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Something slipped</p>
      <h1 className="font-display text-4xl tracking-tight">The floor hit a snag.</h1>
      <p className="text-muted-foreground">Refresh the standings and try that again.</p>
      <Button type="button" className="h-11 w-fit px-4" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}
