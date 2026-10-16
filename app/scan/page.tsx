import type { Metadata } from "next";
import Link from "next/link";
import { Scanner } from "@/components/scanner";
import { SiteShell } from "@/components/site-shell";
import { getCurrentAttendee } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scan",
};

export default async function ScanPage() {
  const attendee = await getCurrentAttendee();

  return (
    <SiteShell>
      {!attendee ? (
        <p className="mb-4 rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-sm">
          You can scan first.{" "}
          <Link href="/check-in" className="font-medium text-primary underline-offset-4 hover:underline">
            Check in
          </Link>{" "}
          when the badge opens so the meeting counts.
        </p>
      ) : null}
      <Scanner />
    </SiteShell>
  );
}
