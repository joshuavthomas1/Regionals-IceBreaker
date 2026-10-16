import { isAdmin } from "@/lib/auth";
import { slugify } from "@/lib/codes";
import { badgeUrl, findAttendeeByCode, resolveBaseUrl } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { qrPng } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!(await isAdmin())) return jsonError("The badge desk is locked.", 401);

  const attendee = findAttendeeByCode((await params).code);
  if (!attendee) return jsonError("That badge is not in the room.", 404);

  const png = await qrPng(badgeUrl(await resolveBaseUrl(), attendee.code));
  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "content-disposition": `attachment; filename="${slugify(attendee.name)}-${attendee.code}.png"`,
      "cache-control": "no-store",
    },
  });
}
