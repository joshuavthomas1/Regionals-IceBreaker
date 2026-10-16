"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, postJson } from "@/lib/api-client";
import type { CheckInPayload } from "@/lib/types";

export function CheckInForm({
  meetCode,
  onComplete,
  label = "Check in",
}: {
  meetCode?: string;
  onComplete?: (result: CheckInPayload) => void;
  label?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await postJson<CheckInPayload>("/api/check-in", {
        code,
        meetCode,
      });
      if (onComplete) {
        onComplete(result);
      } else {
        router.push("/me");
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That didn't work. Try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="badge-code">Your badge code</Label>
        <Input
          id="badge-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="K7MNPQ2R"
          className="h-12 bg-card px-3 font-mono text-base tracking-[0.18em] uppercase md:text-base"
          autoFocus
          required
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          The short code under your QR. This phone stays checked in as you.
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-12 text-base">
        {pending ? "Checking you in…" : label}
      </Button>
    </form>
  );
}
