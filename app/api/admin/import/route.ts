import { isAdmin } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { importAttendees } from "@/lib/db";
import { asString, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

const MAX_ROWS = 2000;

export async function POST(request: Request) {
  if (!(await isAdmin())) return jsonError("The badge desk is locked.", 401);

  const body = await readJson(request);
  const csv = asString(body?.csv);
  if (!csv.trim()) return jsonError("Choose a CSV file first.", 400);
  if (csv.length > 1_000_000) return jsonError("That file is too large. Split it under 1 MB.", 400);

  const parsed = parseCsv(csv);
  if (parsed.rows.length > MAX_ROWS) {
    return jsonError(`Import up to ${MAX_ROWS} people at a time.`, 400);
  }
  if (parsed.rows.length === 0) {
    return jsonError(parsed.errors[0] ?? "No attendees were found.", 400);
  }

  const added = importAttendees(parsed.rows);
  return Response.json({ added, errors: parsed.errors.slice(0, 8) });
}
