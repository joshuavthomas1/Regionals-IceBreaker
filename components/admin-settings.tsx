"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, postJson } from "@/lib/api-client";

export function AdminSettings({
  baseUrl,
  resolvedBaseUrl,
  linkKind,
}: {
  baseUrl: string;
  resolvedBaseUrl: string;
  linkKind: "local" | "tunnel" | "public";
}) {
  const router = useRouter();
  const [value, setValue] = useState(baseUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await postJson("/api/admin/settings", { baseUrl: value });
      setMessage(value.trim() ? "Saved. New badges will use this link." : "Cleared. Badges will use this site's address.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't save that link.");
    } finally {
      setPending(false);
    }
  }

  async function reset(scope: "meetings" | "all", warning: string) {
    if (!window.confirm(warning)) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await postJson("/api/admin/reset", { scope });
      setMessage(scope === "meetings" ? "Meetings cleared. The board is empty." : "The room was reset.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That reset didn't finish.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-2xl tracking-tight">Public link</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          QR codes open <span className="font-mono text-xs">{resolvedBaseUrl}/p/…</span>
        </p>
        {linkKind === "local" ? (
          <p className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm" role="status">
            These codes still point at this computer. A phone on cellular data cannot open them. Run{" "}
            <span className="font-mono text-xs">npm run share</span> and leave it running, then print the badges.
          </p>
        ) : null}
        {linkKind === "tunnel" ? (
          <p className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm" role="status">
            Phones on cellular data can open this link while <span className="font-mono text-xs">npm run share</span>{" "}
            stays running. Stopping that command closes the address. The next run gets a new one, so print the badges
            again if you restart it.
          </p>
        ) : null}
        {linkKind === "public" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Phones can open this link from cellular data or any other network.
          </p>
        ) : null}
        <form onSubmit={save} className="mt-4 flex flex-col gap-3">
          <Label htmlFor="base-url">Base URL</Label>
          <Input
            id="base-url"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="https://icebreaker.example.com"
            inputMode="url"
            className="h-11 bg-background px-3 text-base md:text-base"
          />
          <Button type="submit" disabled={pending} className="h-11">
            Save link
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-2xl tracking-tight">Reset</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Clear a dry run before doors open. Removing attendees also deletes their codes, so reprint badges after that.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={pending}
            onClick={() => reset("meetings", "Clear every meeting and empty the leaderboard?")}
          >
            Clear meetings
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11"
            disabled={pending}
            onClick={() =>
              reset("all", "Remove every attendee, session, and meeting? Printed badges will stop working.")
            }
          >
            Remove everyone
          </Button>
        </div>
      </section>

      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
