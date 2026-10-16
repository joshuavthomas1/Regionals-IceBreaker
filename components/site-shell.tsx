"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const links = [
  { href: "/", label: "Board" },
  { href: "/scan", label: "Scan" },
  { href: "/me", label: "You" },
];

function isCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/scan") return pathname === "/scan" || pathname.startsWith("/p/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-4">
          <Link href="/" className="font-display text-xl tracking-tight">
            Icebreaker
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Floor">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm",
                  isCurrent(pathname, link.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Badge desk
          </Link>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6 pb-28 md:pb-12">
        {children}
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm md:hidden"
        aria-label="Floor"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-3 pb-[env(safe-area-inset-bottom)]">
          {links.map((link) => {
            const current = isCurrent(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "flex h-14 items-center justify-center text-sm font-medium",
                    current ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-current={current ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
