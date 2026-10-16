"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/api-client";

export function AdminLogout() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={async () => {
        await postJson("/api/admin/logout", {});
        router.push("/admin/login");
        router.refresh();
      }}
    >
      Log out
    </Button>
  );
}
