import type { Metadata } from "next";
import Link from "next/link";
import { CheckInForm } from "@/components/check-in-form";
import { LogoutButton } from "@/components/logout-button";
import { SiteShell } from "@/components/site-shell";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentAttendee } from "@/lib/auth";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Check in",
};

export default async function CheckInPage() {
  const attendee = await getCurrentAttendee();

  return (
    <SiteShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Check in</p>
          <h1 className="font-display text-4xl leading-none tracking-tight">
            {attendee ? `You're ${attendee.name}.` : "Check in with your badge."}
          </h1>
          <p className="text-muted-foreground">
            {attendee
              ? "This phone will count the badges you scan. Switch badges if someone else is using it."
              : "Enter the code printed under your QR. You only do this once on this phone."}
          </p>
        </div>
        {attendee ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/scan" className={cn(buttonVariants(), "h-12 px-4 text-base")}>
              Scan someone
            </Link>
            <LogoutButton label="Use a different badge" />
          </div>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-4">
            <CheckInForm />
          </section>
        )}
      </div>
    </SiteShell>
  );
}
