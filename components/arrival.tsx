"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CheckInForm } from "@/components/check-in-form";
import { ApiError, postJson } from "@/lib/api-client";
import type { CheckInPayload, MeetingPayload, Person } from "@/lib/types";
import { cn } from "cn";

type Phase =
  | { kind: "form" }
  | { kind: "saving" }
  | { kind: "self"; name: string; fresh: boolean }
  | { kind: "met"; person: Person }
  | { kind: "already"; person: Person }
  | { kind: "missing" }
  | { kind: "error"; message: string };

function fromMeeting(meeting: MeetingPayload, fallbackName: string): Phase {
  if (meeting.status === "met" && meeting.person) return { kind: "met", person: meeting.person };
  if (meeting.status === "already" && meeting.person) return { kind: "already", person: meeting.person };
  if (meeting.status === "self") return { kind: "self", name: meeting.person?.name ?? fallbackName, fresh: true };
  return { kind: "missing" };
}

export function Arrival({
  person,
  hasSession,
  self,
}: {
  person: Person & { code: string };
  hasSession: boolean;
  self: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(
    self && hasSession ? { kind: "self", name: person.name, fresh: false } : hasSession ? { kind: "saving" } : { kind: "form" },
  );

  useEffect(() => {
    if (!hasSession || self) return;
    let cancelled = false;

    async function record() {
      try {
        const meeting = await postJson<MeetingPayload>("/api/meet", { code: person.code });
        if (!cancelled) setPhase(fromMeeting(meeting, person.name));
      } catch (caught) {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.needCheckIn) {
          setPhase({ kind: "form" });
          return;
        }
        setPhase({
          kind: "error",
          message: caught instanceof ApiError ? caught.message : "That scan didn't land. Try again.",
        });
      }
    }

    void record();
    return () => {
      cancelled = true;
    };
  }, [hasSession, person.code, person.name, self]);

  function onCheckedIn(result: CheckInPayload) {
    if (!result.meeting || result.meeting.status === "self") {
      setPhase({ kind: "self", name: result.attendee.name, fresh: true });
      return;
    }
    setPhase(fromMeeting(result.meeting, person.name));
  }

  const detail = person.church;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Badge</p>
        <h1 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">{person.name}</h1>
        {detail ? <p className="text-base text-muted-foreground">{detail}</p> : null}
      </header>

      {phase.kind === "saving" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Adding {person.name} to your board…
        </p>
      ) : null}

      {phase.kind === "form" ? (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-2xl tracking-tight">Who&apos;s holding the phone?</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Enter your badge code. If this is someone else, you both get the point.
          </p>
          <CheckInForm meetCode={person.code} onComplete={onCheckedIn} label="Check in and count it" />
        </section>
      ) : null}

      {phase.kind === "met" ? (
        <Result
          stamp="Met"
          title={`You met ${phase.person.name}.`}
          body="You're both on the board."
          funFact={phase.person.funFact}
        />
      ) : null}

      {phase.kind === "already" ? (
        <Result
          stamp="Already"
          title={`You already met ${phase.person.name}.`}
          body="That meeting is already on the board. Scan someone new."
          funFact={phase.person.funFact}
        />
      ) : null}

      {phase.kind === "self" ? (
        <Result
          stamp="You"
          title={phase.fresh ? `You're checked in as ${phase.name}.` : "That's your badge."}
          body="Scan someone else to climb the board."
        />
      ) : null}

      {phase.kind === "missing" ? (
        <Result stamp="Missing" title="That badge is not in the room." body="Ask the desk to add them, then scan again." />
      ) : null}

      {phase.kind === "error" ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-4" role="alert">
          <p>{phase.message}</p>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "mt-3 h-10")}
            onClick={() => {
              setPhase({ kind: "saving" });
              window.location.reload();
            }}
          >
            Try the scan again
          </button>
        </div>
      ) : null}

      {phase.kind !== "form" && phase.kind !== "saving" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/scan" className={cn(buttonVariants(), "h-12 px-4 text-base")}>
            Scan another badge
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-12 px-4 text-base")}>
            See the board
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function Result({
  stamp,
  title,
  body,
  funFact,
}: {
  stamp: string;
  title: string;
  body: string;
  funFact?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-4 py-5">
      <p className="pointer-events-none absolute top-4 right-4 rotate-[-8deg] rounded-full border-2 border-primary px-3 py-1 text-xs font-bold tracking-[0.16em] text-primary uppercase">
        {stamp}
      </p>
      <h2 className="max-w-[16rem] font-display text-3xl leading-tight tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {funFact ? <p className="mt-4 border-t border-border pt-4 text-base">&ldquo;{funFact}&rdquo;</p> : null}
    </section>
  );
}
