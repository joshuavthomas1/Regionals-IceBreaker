"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, postJson } from "@/lib/api-client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await postJson("/api/admin/login", { password });
      router.push("/admin");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't open the desk.");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Badge desk</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Open the desk.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add attendees and print QR codes from here. The floor board stays public.
      </p>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <Label htmlFor="desk-password">Password</Label>
        <Input
          id="desk-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className="h-12 bg-card px-3 text-base md:text-base"
          required
        />
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="h-12 text-base">
          {pending ? "Checking…" : "Unlock"}
        </Button>
      </form>
      <Link href="/" className="mt-6 text-sm text-muted-foreground hover:text-foreground">
        Back to the board
      </Link>
    </main>
  );
}
