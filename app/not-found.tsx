import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center gap-4 px-5 py-16">
      <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Missing</p>
      <h1 className="font-display text-4xl tracking-tight">That page isn&apos;t on the floor.</h1>
      <Link href="/" className={cn(buttonVariants(), "h-11 w-fit px-4")}>
        Back to the board
      </Link>
    </main>
  );
}
