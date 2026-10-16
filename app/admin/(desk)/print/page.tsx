import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { badgeUrl, isLocalHost, listAttendees, resolveBaseUrl } from "@/lib/db";
import { qrDataUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Print badges",
};

export default async function PrintPage() {
  const attendees = listAttendees();
  const baseUrl = await resolveBaseUrl();
  const local = isLocalHost(baseUrl);
  const badges = await Promise.all(
    attendees.map(async (attendee) => ({
      ...attendee,
      href: badgeUrl(baseUrl, attendee.code),
      qr: await qrDataUrl(badgeUrl(baseUrl, attendee.code)),
    })),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-col gap-3">
        <h1 className="font-display text-4xl tracking-tight">Print badges</h1>
        <p className="max-w-xl text-muted-foreground">
          Each block is one name tag: name, church, QR, and a backup code. Use the browser print
          dialog and save a PDF for the printer.
        </p>
        {local ? (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm" role="status">
            These QR codes point at {baseUrl}. Set the public link in{" "}
            <Link href="/admin/settings" className="underline underline-offset-4">
              settings
            </Link>{" "}
            before you print for the conference.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Codes open {baseUrl}/p/…
          </p>
        )}
        {badges.length > 0 ? <PrintButton /> : null}
      </div>

      {badges.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Add attendees before printing badges.
        </p>
      ) : (
        <div className="badge-grid">
          {badges.map((badge) => (
            <article key={badge.id} className="badge-card">
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl leading-tight tracking-tight">{badge.name}</p>
                {badge.church ? (
                  <p className="mt-1 text-xs font-medium tracking-[0.16em] text-primary uppercase">{badge.church}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badge.qr} alt="" width={132} height={132} className="size-[132px]" />
                <p className="mt-1 font-mono text-xs tracking-[0.16em]">{badge.code}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
