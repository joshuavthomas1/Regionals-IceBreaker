import type { Metadata } from "next";
import Link from "next/link";
import { ChurchProgressStrip, MetFraction } from "@/components/church-progress";
import { LogoutButton } from "@/components/logout-button";
import { SiteShell } from "@/components/site-shell";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentAttendee } from "@/lib/auth";
import { getBoard, listMeetingsFor } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "You",
};

export default async function MePage() {
  const attendee = await getCurrentAttendee();

  if (!attendee) {
    return (
      <SiteShell>
        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">You</p>
          <h1 className="font-display text-4xl leading-none tracking-tight">Check in to see your list.</h1>
          <p className="text-muted-foreground">
            Meetings show up here after you scan someone, or after someone scans you.
          </p>
          <Link href="/check-in" className={cn(buttonVariants(), "h-12 w-fit px-4 text-base")}>
            Check in
          </Link>
        </div>
      </SiteShell>
    );
  }

  const meetings = listMeetingsFor(attendee.id);
  const board = getBoard(attendee.id);

  return (
    <SiteShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">You</p>
            <h1 className="font-display text-4xl leading-none tracking-tight">{attendee.name}</h1>
            <p className="text-muted-foreground">
              {attendee.church || "Checked in"}
            </p>
          </div>
          <MetFraction met={meetings.length} total={board.others} size="place" />
        </div>

        <ChurchProgressStrip churches={board.churches} />

        {meetings.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center">
            <p className="font-display text-2xl">No one on your list yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Scan a badge to put a name here. If someone scans you first, they show up too.
            </p>
            <Link href="/scan" className={cn(buttonVariants(), "mt-4 h-11 px-4")}>
              Scan a badge
            </Link>
          </section>
        ) : (
          <ul className="flex flex-col gap-2">
            {meetings.map((person) => (
              <li key={person.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{person.name}</p>
                  <p className="shrink-0 text-xs text-muted-foreground">{formatWhen(person.metAt)}</p>
                </div>
                {person.church ? <p className="text-sm text-muted-foreground">{person.church}</p> : null}
                {person.funFact ? <p className="mt-2 text-sm">&ldquo;{person.funFact}&rdquo;</p> : null}
              </li>
            ))}
          </ul>
        )}

        <LogoutButton />
      </div>
    </SiteShell>
  );
}
