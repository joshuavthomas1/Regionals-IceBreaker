import crypto from "crypto";
import postgres from "postgres";
import { CHURCHES, requireChurch, type Church } from "@/lib/churches";
import { normalizeCode } from "@/lib/codes";
import { sampleAttendees } from "@/lib/sample";
import type {
  Attendee,
  BoardSnapshot,
  ChurchProgress,
  MeetingPayload,
  MetPerson,
  NewAttendee,
  Person,
} from "@/lib/types";

type AttendeeRow = {
  id: number;
  name: string;
  company: string;
  title: string;
  church: string;
  fun_fact: string;
  code: string;
  created_at: string;
};

type Query = postgres.Sql | postgres.TransactionSql;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BOARD_LIMIT = 50;
const globalForDb = globalThis as unknown as { icebreakerSql?: postgres.Sql };
let ready: Promise<void> | null = null;

function clip(value: string, max: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function mapAttendee(row: AttendeeRow): Attendee {
  return {
    id: Number(row.id),
    name: row.name,
    company: row.company,
    title: row.title,
    church: storedChurch(row.church),
    funFact: row.fun_fact,
    code: row.code,
    createdAt: row.created_at,
  };
}

function toPerson(attendee: Attendee): Person {
  return {
    id: attendee.id,
    name: attendee.name,
    company: attendee.company,
    title: attendee.title,
    church: attendee.church,
    funFact: attendee.funFact,
  };
}

function storedChurch(value: string): Church | "" {
  return (CHURCHES as readonly string[]).includes(value) ? (value as Church) : "";
}

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required. Use the Supabase pooler connection string.");
  }
  return url;
}

function getSql() {
  if (!globalForDb.icebreakerSql) {
    globalForDb.icebreakerSql = postgres(databaseUrl(), {
      ssl: "require",
      max: 5,
      prepare: false,
      connect_timeout: 15,
      idle_timeout: 20,
    });
  }
  return globalForDb.icebreakerSql;
}

function ensureReady() {
  if (!ready) {
    ready = migrate().catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function migrate() {
  const sql = getSql();
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS attendees (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text NOT NULL,
      company text NOT NULL DEFAULT '',
      title text NOT NULL DEFAULT '',
      church text NOT NULL DEFAULT '',
      fun_fact text NOT NULL DEFAULT '',
      code text NOT NULL,
      created_at text NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS attendees_code_lower_idx ON attendees (lower(code));

    CREATE TABLE IF NOT EXISTS meetings (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      scanner_id integer NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
      scanned_id integer NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
      pair_key text NOT NULL UNIQUE,
      created_at text NOT NULL,
      CHECK (scanner_id != scanned_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token text PRIMARY KEY,
      attendee_id integer NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
      created_at text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key text PRIMARY KEY,
      value text NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_meetings_scanner ON meetings(scanner_id);
    CREATE INDEX IF NOT EXISTS idx_meetings_scanned ON meetings(scanned_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_attendee ON sessions(attendee_id);

    ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
    ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE attendees, meetings, sessions, settings FROM anon, authenticated;
  `);
  await backfillChurches(sql);
}

async function backfillChurches(sql: Query) {
  const blank = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM attendees WHERE church = ''
  `;
  if ((blank[0]?.count ?? 0) === 0) return;
  const known: Record<string, Church> = {
    "Rowan Blake": "DMTC",
    "Mina Cho": "CMTC",
    "Noor El-Sayed": "STMTC",
  };
  for (const person of sampleAttendees) known[person.name] = person.church;
  for (const [name, church] of Object.entries(known)) {
    await sql`
      UPDATE attendees
      SET church = ${church}
      WHERE church = '' AND lower(name) = lower(${name})
    `;
  }
}

async function uniqueCode(sql: Query) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const bytes = crypto.randomBytes(8);
    const code = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
    const existing = await sql`SELECT 1 FROM attendees WHERE lower(code) = lower(${code})`;
    if (existing.length === 0) return code;
  }
  throw new Error("Could not mint a badge code.");
}

export async function listAttendees() {
  await ensureReady();
  const rows = await getSql()<AttendeeRow[]>`
    SELECT * FROM attendees ORDER BY lower(name) ASC, id ASC
  `;
  return rows.map(mapAttendee);
}

export async function findAttendeeById(id: number) {
  await ensureReady();
  const rows = await getSql()<AttendeeRow[]>`SELECT * FROM attendees WHERE id = ${id}`;
  return rows[0] ? mapAttendee(rows[0]) : null;
}

export async function findAttendeeByCode(raw: string) {
  const code = normalizeCode(raw);
  if (code.length < 6) return null;
  await ensureReady();
  const rows = await getSql()<AttendeeRow[]>`
    SELECT * FROM attendees WHERE lower(code) = lower(${code})
  `;
  return rows[0] ? mapAttendee(rows[0]) : null;
}

export async function addAttendee(input: NewAttendee) {
  const name = clip(input.name, 80);
  if (!name) throw new Error("A name is required.");
  await ensureReady();
  const sql = getSql();
  const createdAt = new Date().toISOString();
  const rows = await sql<{ id: number }[]>`
    INSERT INTO attendees (name, company, title, church, fun_fact, code, created_at)
    VALUES (
      ${name},
      ${clip(input.company, 80)},
      ${clip(input.title, 80)},
      ${requireChurch(input.church)},
      ${clip(input.funFact, 180)},
      ${await uniqueCode(sql)},
      ${createdAt}
    )
    RETURNING id
  `;
  return (await findAttendeeById(Number(rows[0].id)))!;
}

export async function importAttendees(rows: NewAttendee[]) {
  await ensureReady();
  return getSql().begin(async (tx) => {
    let added = 0;
    for (const item of rows) {
      const name = clip(item.name, 80);
      if (!name) continue;
      await tx`
        INSERT INTO attendees (name, company, title, church, fun_fact, code, created_at)
        VALUES (
          ${name},
          ${clip(item.company, 80)},
          ${clip(item.title, 80)},
          ${requireChurch(item.church)},
          ${clip(item.funFact, 180)},
          ${await uniqueCode(tx)},
          ${new Date().toISOString()}
        )
      `;
      added += 1;
    }
    return added;
  });
}

export async function loadSampleAttendees() {
  const existing = new Set((await listAttendees()).map((attendee) => attendee.name.toLowerCase()));
  const missing = sampleAttendees.filter((attendee) => !existing.has(attendee.name.toLowerCase()));
  return importAttendees(missing);
}

export async function updateAttendee(id: number, input: NewAttendee) {
  const name = clip(input.name, 80);
  if (!name) throw new Error("A name is required.");
  await ensureReady();
  const rows = await getSql()<{ id: number }[]>`
    UPDATE attendees
    SET name = ${name},
        company = ${clip(input.company, 80)},
        title = ${clip(input.title, 80)},
        church = ${requireChurch(input.church)},
        fun_fact = ${clip(input.funFact, 180)}
    WHERE id = ${id}
    RETURNING id
  `;
  if (rows.length === 0) return null;
  return findAttendeeById(id);
}

export async function deleteAttendee(id: number) {
  await ensureReady();
  const rows = await getSql()<{ id: number }[]>`
    DELETE FROM attendees WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}

export async function clearMeetings() {
  await ensureReady();
  await getSql()`DELETE FROM meetings`;
}

export async function resetEvent() {
  await ensureReady();
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`DELETE FROM meetings`;
    await tx`DELETE FROM sessions`;
    await tx`DELETE FROM attendees`;
  });
}

export async function createSession(attendeeId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  await ensureReady();
  await getSql()`
    INSERT INTO sessions (token, attendee_id, created_at)
    VALUES (${token}, ${attendeeId}, ${new Date().toISOString()})
  `;
  return token;
}

export async function destroySession(token: string) {
  await ensureReady();
  await getSql()`DELETE FROM sessions WHERE token = ${token}`;
}

export async function attendeeForToken(token: string | null | undefined) {
  if (!token) return null;
  await ensureReady();
  const rows = await getSql()<AttendeeRow[]>`
    SELECT a.*
    FROM sessions s
    JOIN attendees a ON a.id = s.attendee_id
    WHERE s.token = ${token}
  `;
  return rows[0] ? mapAttendee(rows[0]) : null;
}

function pairKey(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export async function recordMeeting(scannerId: number, rawCode: string): Promise<MeetingPayload> {
  const person = await findAttendeeByCode(rawCode);
  if (!person) return { status: "not_found" };
  if (person.id === scannerId) return { status: "self", person: toPerson(person) };

  const key = pairKey(scannerId, person.id);
  const createdAt = new Date().toISOString();
  await ensureReady();
  const inserted = await getSql()<{ id: number }[]>`
    INSERT INTO meetings (scanner_id, scanned_id, pair_key, created_at)
    VALUES (${scannerId}, ${person.id}, ${key}, ${createdAt})
    ON CONFLICT (pair_key) DO NOTHING
    RETURNING id
  `;
  if (inserted.length > 0) return { status: "met", person: toPerson(person) };

  const existing = await getSql()<{ created_at: string }[]>`
    SELECT created_at FROM meetings WHERE pair_key = ${key}
  `;
  const stamped = existing[0] ? Date.parse(existing[0].created_at) : 0;
  if (stamped && Date.now() - stamped < 2500) {
    return { status: "met", person: toPerson(person) };
  }
  return { status: "already", person: toPerson(person) };
}

export async function listMeetingsFor(attendeeId: number): Promise<MetPerson[]> {
  await ensureReady();
  const rows = await getSql()<
    Array<{
      id: number;
      name: string;
      company: string;
      title: string;
      church: string;
      fun_fact: string;
      created_at: string;
    }>
  >`
    SELECT
      o.id,
      o.name,
      o.company,
      o.title,
      o.church,
      o.fun_fact,
      m.created_at
    FROM meetings m
    JOIN attendees o ON o.id = CASE
      WHEN m.scanner_id = ${attendeeId} THEN m.scanned_id
      ELSE m.scanner_id
    END
    WHERE m.scanner_id = ${attendeeId} OR m.scanned_id = ${attendeeId}
    ORDER BY m.created_at DESC, m.id DESC
  `;

  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    company: row.company,
    title: row.title,
    church: storedChurch(row.church),
    funFact: row.fun_fact,
    metAt: row.created_at,
  }));
}

export async function getBoard(youId: number | null): Promise<BoardSnapshot> {
  await ensureReady();
  const sql = getSql();
  const rows = await sql<
    Array<{ id: number; name: string; church: string; score: number }>
  >`
    SELECT
      a.id,
      a.name,
      a.church,
      (
        SELECT COUNT(*)::int
        FROM meetings m
        WHERE m.scanner_id = a.id OR m.scanned_id = a.id
      ) AS score
    FROM attendees a
    ORDER BY score DESC, lower(a.name) ASC, a.id ASC
  `;

  let rank = 0;
  let seen = 0;
  let lastScore = -1;
  const ranked = rows.map((row) => {
    seen += 1;
    const score = Number(row.score);
    if (score !== lastScore) {
      rank = seen;
      lastScore = score;
    }
    return { id: Number(row.id), name: row.name, church: storedChurch(row.church), score, rank };
  });

  const active = ranked.filter((row) => row.score > 0);
  const youRow = youId == null ? undefined : ranked.find((row) => row.id === youId);
  const recent = await sql<BoardSnapshot["recent"]>`
    SELECT
      m.id,
      m.created_at AS "createdAt",
      s.name AS "scannerName",
      t.name AS "scannedName"
    FROM meetings m
    JOIN attendees s ON s.id = m.scanner_id
    JOIN attendees t ON t.id = m.scanned_id
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 8
  `;

  const attendeeCount = await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM attendees`;
  const meetingCount = await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM meetings`;
  const count = attendeeCount[0]?.count ?? 0;
  const churches = await churchProgress(sql, youId);
  return {
    leaders: active.slice(0, BOARD_LIMIT),
    you: youRow
      ? { id: youRow.id, name: youRow.name, score: youRow.score, rank: youRow.rank }
      : null,
    recent: recent.map((row) => ({ ...row, id: Number(row.id) })),
    attendeeCount: count,
    meetingCount: meetingCount[0]?.count ?? 0,
    others: Math.max(0, count - 1),
    churches,
    truncated: active.length > BOARD_LIMIT,
  };
}

async function churchProgress(sql: Query, youId: number | null): Promise<ChurchProgress[]> {
  if (youId == null) return [];

  const counts = await sql<{ church: string; headcount: number }[]>`
    SELECT church, COUNT(*)::int AS headcount FROM attendees GROUP BY church
  `;
  const headcounts = new Map(counts.map((row) => [row.church, Number(row.headcount)]));
  const metByChurch = new Map<string, number>();

  const self = await sql<{ church: string }[]>`SELECT church FROM attendees WHERE id = ${youId}`;
  const viewerChurch = self[0]?.church ?? "";
  const mets = await sql<{ church: string; met: number }[]>`
    SELECT o.church AS church, COUNT(*)::int AS met
    FROM meetings m
    JOIN attendees o ON o.id = CASE
      WHEN m.scanner_id = ${youId} THEN m.scanned_id
      ELSE m.scanner_id
    END
    WHERE m.scanner_id = ${youId} OR m.scanned_id = ${youId}
    GROUP BY o.church
  `;
  for (const row of mets) metByChurch.set(row.church, Number(row.met));

  return CHURCHES.map((church) => {
    const headcount = headcounts.get(church) ?? 0;
    const yours = viewerChurch === church;
    const pool = Math.max(0, headcount - (yours ? 1 : 0));
    return {
      church,
      met: Math.min(metByChurch.get(church) ?? 0, pool),
      pool,
      headcount,
      yours,
    };
  });
}

export async function getSetting(key: string) {
  await ensureReady();
  const rows = await getSql()<{ value: string }[]>`SELECT value FROM settings WHERE key = ${key}`;
  return rows[0]?.value ?? "";
}

export async function setSetting(key: string, value: string) {
  await ensureReady();
  const sql = getSql();
  if (!value) {
    await sql`DELETE FROM settings WHERE key = ${key}`;
    return;
  }
  await sql`
    INSERT INTO settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = excluded.value
  `;
}

export function normalizeBaseUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${url.origin}${path}`;
}

export function isLocalHost(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
  } catch {
    return true;
  }
}

export function publicLinkKind(url: string): "local" | "tunnel" | "public" {
  if (isLocalHost(url)) return "local";
  try {
    if (new URL(url).hostname.endsWith(".trycloudflare.com")) return "tunnel";
  } catch {
    return "local";
  }
  return "public";
}

export async function resolveBaseUrl() {
  const saved = await getSetting("baseUrl");
  if (saved) return saved.replace(/\/$/, "");
  const { headers } = await import("next/headers");
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "127.0.0.1:3847";
  const forwarded = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwarded || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export function badgeUrl(baseUrl: string, code: string) {
  return `${baseUrl.replace(/\/$/, "")}/p/${code}`;
}
