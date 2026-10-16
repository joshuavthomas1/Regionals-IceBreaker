"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/api-client";

export function LogoutButton({
  label = "This isn't me",
  redirectTo = "/check-in",
}: {
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await postJson("/api/logout", {});
          router.push(redirectTo);
          router.refresh();
        } catch {
          setPending(false);
        }
      }}
    >
      {pending ? "Signing out…" : label}
    </Button>
  );
}
