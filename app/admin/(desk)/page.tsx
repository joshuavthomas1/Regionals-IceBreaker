import type { Metadata } from "next";
import { AdminPeople } from "@/components/admin-people";
import { listAttendees } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "People",
};

export default async function AdminPeoplePage() {
  const attendees = await listAttendees();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-4xl tracking-tight">The room</h1>
        <p className="mt-1 text-muted-foreground">
          Add the room, then print codes before doors open.
        </p>
      </div>
      <AdminPeople attendees={attendees} />
    </div>
  );
}
