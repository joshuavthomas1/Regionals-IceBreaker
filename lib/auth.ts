import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { attendeeForToken, createSession, destroySession } from "@/lib/db";

const SESSION_COOKIE = "ib_session";
const ADMIN_COOKIE = "ib_admin";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const ADMIN_MAX_AGE = 60 * 60 * 12;

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || "badge-desk";
}

export function passwordsMatch(input: string, expected: string) {
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function isHttps(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded) return forwarded === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

function cookieBase(request: Request, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: isHttps(request),
  };
}

export async function getCurrentAttendee() {
  const jar = await cookies();
  return await attendeeForToken(jar.get(SESSION_COOKIE)?.value);
}

export async function startAttendeeSession(attendeeId: number, request: Request) {
  const token = await createSession(attendeeId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieBase(request, SESSION_MAX_AGE));
}

export async function endAttendeeSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  jar.delete(SESSION_COOKIE);
}

function signAdmin(exp: number) {
  return createHmac("sha256", adminPassword()).update(`admin:${exp}`).digest("base64url");
}

export async function startAdminSession(request: Request) {
  const exp = Date.now() + ADMIN_MAX_AGE * 1000;
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, `${exp}.${signAdmin(exp)}`, cookieBase(request, ADMIN_MAX_AGE));
}

export async function endAdminSession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function isAdmin() {
  const jar = await cookies();
  const value = jar.get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const [expRaw, sig] = value.split(".");
  if (!expRaw || !sig) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = signAdmin(exp);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
