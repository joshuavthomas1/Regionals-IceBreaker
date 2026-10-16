import type { ChurchProgress } from "@/lib/types";

export function ChurchProgressStrip({ churches }: { churches: ChurchProgress[] }) {
  return (
    <section aria-label="People met from each church" className="grid grid-cols-3 gap-2">
      {churches.map((group) => (
        <div key={group.church} className="rounded-2xl border border-border bg-card px-2 py-3 text-center">
          <p className="text-[11px] font-medium tracking-[0.16em] text-primary uppercase">{group.church}</p>
          <p
            className="mt-1 font-display text-3xl leading-none tracking-tight"
            aria-label={`${group.met} of ${group.pool} other ${group.church} attendees met`}
          >
            {group.met}
            <span className="text-muted-foreground">/{group.pool}</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {group.headcount} {group.headcount === 1 ? "attendee" : "attendees"}
          </p>
        </div>
      ))}
    </section>
  );
}

export function MetFraction({
  met,
  total,
  size = "row",
}: {
  met: number;
  total: number;
  size?: "row" | "place";
}) {
  return (
    <span className="text-right" aria-label={`${met} of ${total} people met`}>
      <span
        className={
          size === "place"
            ? "block font-display text-3xl leading-none tracking-tight"
            : "block font-display text-2xl leading-none"
        }
      >
        {met}
        <span className="text-muted-foreground">/{total}</span>
      </span>
      <span className="text-[11px] tracking-wide text-muted-foreground uppercase">met</span>
    </span>
  );
}
