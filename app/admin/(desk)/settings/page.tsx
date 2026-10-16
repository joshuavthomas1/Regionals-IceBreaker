import type { Metadata } from "next";
import { AdminSettings } from "@/components/admin-settings";
import { getSetting, isLocalHost, resolveBaseUrl } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const baseUrl = getSetting("baseUrl");
  const resolvedBaseUrl = await resolveBaseUrl();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Settings</h1>
        <p className="mt-1 max-w-xl text-muted-foreground">
          Point printed QR codes at the address phones will use on site.
        </p>
      </div>
      <AdminSettings baseUrl={baseUrl} resolvedBaseUrl={resolvedBaseUrl} local={isLocalHost(resolvedBaseUrl)} />
    </div>
  );
}
