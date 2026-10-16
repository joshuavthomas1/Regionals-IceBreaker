import type { Metadata } from "next";
import Link from "next/link";
import { Arrival } from "@/components/arrival";
import { SiteShell } from "@/components/site-shell";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentAttendee } from "@/lib/auth";
import { findAttendeeByCode } from "@/lib/db";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const attendee = findAttendeeByCode((await params).code);
  return { title: attendee ? attendee.name : "Unknown badge" };
}

export default async function BadgePage({ params }: { params: Promise<{ code: string }> }) {
  const attendee = findAttendeeByCode((await params).code);

  if (!attendee) {
    return (
      <SiteShell>
        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Badge</p>
          <h1 className="font-display text-4xl leading-none tracking-tight">This badge is not in the room.</h1>
          <p className="text-muted-foreground">
            The code isn&apos;t on the list. Ask the desk to add them, then scan again.
          </p>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-11 w-fit px-4")}>
            Back to the board
          </Link>
        </div>
      </SiteShell>
    );
  }

  const session = await getCurrentAttendee();

  return (
    <SiteShell>
      <Arrival
        person={{
          id: attendee.id,
          name: attendee.name,
          company: "",
          title: "",
          church: attendee.church,
          funFact: attendee.funFact,
          code: attendee.code,
        }}
        hasSession={Boolean(session)}
        self={session?.id === attendee.id}
      />
    </SiteShell>
  );
}
