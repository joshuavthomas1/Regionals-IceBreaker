import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLogout } from "@/components/admin-logout";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col px-4 py-6">
      <header className="no-print mb-6 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Badge desk</p>
          <Link href="/admin" className="font-display text-3xl tracking-tight">
            Icebreaker
          </Link>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Desk">
          <Link href="/admin" className="rounded-full px-3 py-1.5 hover:bg-muted">
            People
          </Link>
          <Link href="/admin/print" className="rounded-full px-3 py-1.5 hover:bg-muted">
            Print
          </Link>
          <Link href="/admin/settings" className="rounded-full px-3 py-1.5 hover:bg-muted">
            Settings
          </Link>
          <Link href="/" className="rounded-full px-3 py-1.5 hover:bg-muted">
            Board
          </Link>
          <AdminLogout />
        </nav>
      </header>
      {children}
    </div>
  );
}
