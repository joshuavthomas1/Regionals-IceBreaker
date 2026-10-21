import type { Metadata } from "next";
import { AdminSettings } from "@/components/admin-settings";
import { getSetting, publicLinkKind, resolveBaseUrl } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const baseUrl = await getSetting("baseUrl");
  const resolvedBaseUrl = await resolveBaseUrl();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Settings</h1>
        <p className="mt-1 max-w-xl text-muted-foreground">
          Point printed QR codes at an address people can open from any network, including cellular.
        </p>
      </div>
      <AdminSettings
        baseUrl={baseUrl}
        resolvedBaseUrl={resolvedBaseUrl}
        linkKind={publicLinkKind(resolvedBaseUrl)}
      />
    </div>
  );
}
