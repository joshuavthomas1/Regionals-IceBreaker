import { SiteShell } from "@/components/site-shell";
import { Leaderboard } from "@/components/leaderboard";
import { getCurrentAttendee } from "@/lib/auth";
import { getBoard } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const attendee = await getCurrentAttendee();
  const board = getBoard(attendee?.id ?? null);

  return (
    <SiteShell>
      <Leaderboard initial={board} />
    </SiteShell>
  );
}
