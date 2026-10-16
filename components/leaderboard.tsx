"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChurchProgressStrip, MetFraction } from "@/components/church-progress";
import { buttonVariants } from "@/components/ui/button";
import { formatWhen, ordinal } from "@/lib/format";
import type { BoardSnapshot } from "@/lib/types";
import { cn } from "cn";

export function Leaderboard({ initial }: { initial: BoardSnapshot }) {
  const [board, setBoard] = useState(initial);
  const [live, setLive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/leaderboard", { cache: "no-store" });
        if (!response.ok) throw new Error("refresh failed");
        const data = (await response.json()) as BoardSnapshot;
        if (!cancelled) {
          setBoard(data);
          setLive(true);
          setError(null);
          setNow(Date.now());
        }
      } catch {
        if (!cancelled) {
          setLive(false);
          setError("The board didn't refresh. Showing the last standings.");
        }
      }
    }

    const id = window.setInterval(load, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const you = board.you;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-primary uppercase">
          <span
            className={cn("size-2 rounded-full", live ? "bg-primary" : "bg-muted-foreground")}
            aria-hidden
          />
          {live ? "Live floor" : "Reconnecting"}
        </p>
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
          Who&apos;s met the most people?
        </h1>
        <p className="max-w-md text-base text-muted-foreground">
          Scan a badge. Both of you move up. The score is people met over the people in the room.
          {board.attendeeCount > 0
            ? ` ${board.attendeeCount} ${board.attendeeCount === 1 ? "badge" : "badges"}, ${board.meetingCount} ${board.meetingCount === 1 ? "meeting" : "meetings"}.`
            : " Badges go up once the desk adds the room."}
        </p>
      </div>

      <ChurchProgressStrip churches={board.churches} />

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="status">
          {error}
        </p>
      ) : null}

      {you ? (
        <section className="rounded-2xl border border-primary/30 bg-card px-4 py-4">
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Your place</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="font-display text-2xl tracking-tight">{you.name}</p>
            <MetFraction met={you.score} total={board.others} size="place" />
          </div>
          {you.score > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {you.rank === 1 ? "You're in the lead." : `${ordinal(you.rank)} place.`}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              You haven&apos;t met anyone yet. The first scan puts you on the board.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Link href="/scan" className={cn(buttonVariants(), "h-10 px-3")}>
              Scan a badge
            </Link>
            <Link href="/me" className={cn(buttonVariants({ variant: "outline" }), "h-10 px-3")}>
              People you&apos;ve met
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-card px-4 py-4">
          <p className="font-display text-2xl tracking-tight">Check in to hold your place.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the code under your own QR once. After that, every badge you scan counts.
          </p>
          <Link href="/check-in" className={cn(buttonVariants(), "mt-3 h-10 px-3")}>
            Check in
          </Link>
        </section>
      )}

      {board.leaders.length === 0 ? (
        <section className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
          <p className="font-display text-3xl tracking-tight">The board is open.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {board.attendeeCount === 0
              ? "No badges have been added yet. The desk can load the room, then the first scan takes the top spot."
              : "No meetings yet. The first scan takes the top spot, and it counts for both people."}
          </p>
        </section>
      ) : (
        <ol className="flex flex-col gap-2">
          {board.leaders.map((row) => {
            const mine = you?.id === row.id;
            return (
              <li
                key={row.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border bg-card px-3 py-3",
                  mine ? "border-primary" : "border-border",
                )}
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-full font-display text-lg",
                    row.rank === 1
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                  aria-label={`Rank ${row.rank}`}
                >
                  {row.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {row.name}
                    {mine ? <span className="text-primary"> · you</span> : null}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {row.church || "In the room"}
                  </span>
                </span>
                <MetFraction met={row.score} total={board.others} />
              </li>
            );
          })}
        </ol>
      )}

      {board.truncated ? (
        <p className="text-sm text-muted-foreground">Showing the top 50. Your place stays pinned above.</p>
      ) : null}

      {board.recent.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Just met
          </h2>
          <ul className="flex flex-col gap-1.5">
            {board.recent.map((meet) => (
              <li key={meet.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium">{meet.scannerName}</span>
                  <span className="text-muted-foreground"> met </span>
                  <span className="font-medium">{meet.scannedName}</span>
                </span>
                <span className="shrink-0 text-muted-foreground">{formatWhen(meet.createdAt, now)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
