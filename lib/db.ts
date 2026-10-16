import fs from "fs";
import path from "path";
import crypto from "crypto";
import Database from "better-sqlite3";
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

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BOARD_LIMIT = 50;
const globalForDb = globalThis as unknown as { icebreaker?: Database.Database };
const justMet = new Map<string, number>();

function clip(value: string, max: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function mapAttendee(row: AttendeeRow): Attendee {
  return {
    id: row.id,
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

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendees (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      church TEXT NOT NULL DEFAULT '',
      fun_fact TEXT NOT NULL DEFAULT '',
      code TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY,
      scanner_id INTEGER NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
      scanned_id INTEGER NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
      pair_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      CHECK (scanner_id != scanned_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      attendee_id INTEGER NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_meetings_scanner ON meetings(scanner_id);
    CREATE INDEX IF NOT EXISTS idx_meetings_scanned ON meetings(scanned_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_attendee ON sessions(attendee_id);
  `);
  ensureChurch(db);
}

function storedChurch(value: string): Church | "" {
  return (CHURCHES as readonly string[]).includes(value) ? (value as Church) : "";
}

function ensureChurch(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(attendees)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "church")) {
    db.exec("ALTER TABLE attendees ADD COLUMN church TEXT NOT NULL DEFAULT ''");
  }
  const blank = db.prepare("SELECT COUNT(*) AS count FROM attendees WHERE church = ''").get() as {
    count: number;
  };
  if (blank.count === 0) return;
  const assign = db.prepare(
    "UPDATE attendees SET church = ? WHERE church = '' AND name = ? COLLATE NOCASE",
  );
  const known: Record<string, Church> = {
    "Rowan Blake": "DMTC",
    "Mina Cho": "CMTC",
    "Noor El-Sayed": "STMTC",
  };
  for (const person of sampleAttendees) known[person.name] = person.church;
  for (const [name, church] of Object.entries(known)) assign.run(church, name);
}

export function getDb() {
  if (!globalForDb.icebreaker) {
    const file =
      process.env.ICEBREAKER_DB ?? path.join(process.cwd(), "data", "icebreaker.sqlite");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new Database(file);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 3000");
    migrate(db);
    globalForDb.icebreaker = db;
  }
  ensureChurch(globalForDb.icebreaker);
  return globalForDb.icebreaker;
}

function uniqueCode(db: Database.Database) {
  const exists = db.prepare("SELECT 1 FROM attendees WHERE code = ?");
  for (let attempt = 0; attempt < 8; attempt++) {
    const bytes = crypto.randomBytes(8);
    const code = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
    if (!exists.get(code)) return code;
  }
  throw new Error("Could not mint a badge code.");
}

export function listAttendees() {
  const rows = getDb()
    .prepare("SELECT * FROM attendees ORDER BY name COLLATE NOCASE ASC, id ASC")
    .all() as AttendeeRow[];
  return rows.map(mapAttendee);
}

export function findAttendeeById(id: number) {
  const row = getDb().prepare("SELECT * FROM attendees WHERE id = ?").get(id) as
    | AttendeeRow
    | undefined;
  return row ? mapAttendee(row) : null;
}

export function findAttendeeByCode(raw: string) {
  const code = normalizeCode(raw);
  if (code.length < 6) return null;
  const row = getDb().prepare("SELECT * FROM attendees WHERE code = ?").get(code) as
    | AttendeeRow
    | undefined;
  return row ? mapAttendee(row) : null;
}

export function addAttendee(input: NewAttendee) {
  const name = clip(input.name, 80);
  if (!name) throw new Error("A name is required.");
  const db = getDb();
  const createdAt = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO attendees (name, company, title, church, fun_fact, code, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      name,
      clip(input.company, 80),
      clip(input.title, 80),
      requireChurch(input.church),
      clip(input.funFact, 180),
      uniqueCode(db),
      createdAt,
    );
  return findAttendeeById(Number(info.lastInsertRowid))!;
}

export function importAttendees(rows: NewAttendee[]) {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO attendees (name, company, title, church, fun_fact, code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const run = db.transaction((items: NewAttendee[]) => {
    let added = 0;
    for (const item of items) {
      const name = clip(item.name, 80);
      if (!name) continue;
      insert.run(
        name,
        clip(item.company, 80),
        clip(item.title, 80),
        requireChurch(item.church),
        clip(item.funFact, 180),
        uniqueCode(db),
        new Date().toISOString(),
      );
      added += 1;
    }
    return added;
  });
  return run(rows);
}

export function loadSampleAttendees() {
  const existing = new Set(listAttendees().map((attendee) => attendee.name.toLowerCase()));
  const missing = sampleAttendees.filter((attendee) => !existing.has(attendee.name.toLowerCase()));
  return importAttendees(missing);
}

export function updateAttendee(id: number, input: NewAttendee) {
  const name = clip(input.name, 80);
  if (!name) throw new Error("A name is required.");
  const result = getDb()
    .prepare(
      `UPDATE attendees
       SET name = ?, company = ?, title = ?, church = ?, fun_fact = ?
       WHERE id = ?`,
    )
    .run(
      name,
      clip(input.company, 80),
      clip(input.title, 80),
      requireChurch(input.church),
      clip(input.funFact, 180),
      id,
    );
  if (result.changes === 0) return null;
  return findAttendeeById(id);
}

export function deleteAttendee(id: number) {
  const result = getDb().prepare("DELETE FROM attendees WHERE id = ?").run(id);
  return result.changes > 0;
}

export function clearMeetings() {
  getDb().prepare("DELETE FROM meetings").run();
}

export function resetEvent() {
  const db = getDb();
  const run = db.transaction(() => {
    db.prepare("DELETE FROM meetings").run();
    db.prepare("DELETE FROM sessions").run();
    db.prepare("DELETE FROM attendees").run();
  });
  run();
}

export function createSession(attendeeId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  getDb()
    .prepare("INSERT INTO sessions (token, attendee_id, created_at) VALUES (?, ?, ?)")
    .run(token, attendeeId, new Date().toISOString());
  return token;
}

export function destroySession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function attendeeForToken(token: string | null | undefined) {
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT a.*
       FROM sessions s
       JOIN attendees a ON a.id = s.attendee_id
       WHERE s.token = ?`,
    )
    .get(token) as AttendeeRow | undefined;
  return row ? mapAttendee(row) : null;
}

function pairKey(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function recordMeeting(scannerId: number, rawCode: string): MeetingPayload {
  const person = findAttendeeByCode(rawCode);
  if (!person) return { status: "not_found" };
  if (person.id === scannerId) return { status: "self", person: toPerson(person) };

  const key = `${scannerId}:${person.id}`;
  const stamped = justMet.get(key);
  const db = getDb();
  const existing = db.prepare("SELECT 1 FROM meetings WHERE pair_key = ?").get(pairKey(scannerId, person.id));
  if (existing) {
    if (stamped && Date.now() - stamped < 2500) {
      return { status: "met", person: toPerson(person) };
    }
    return { status: "already", person: toPerson(person) };
  }

  try {
    db.prepare(
      `INSERT INTO meetings (scanner_id, scanned_id, pair_key, created_at)
       VALUES (?, ?, ?, ?)`,
    ).run(scannerId, person.id, pairKey(scannerId, person.id), new Date().toISOString());
  } catch (error) {
    if (!isConstraint(error)) throw error;
    return { status: "already", person: toPerson(person) };
  }
  justMet.set(key, Date.now());
  return { status: "met", person: toPerson(person) };
}

function isConstraint(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    String((error as { code: unknown }).code).startsWith("SQLITE_CONSTRAINT")
  );
}

export function listMeetingsFor(attendeeId: number): MetPerson[] {
  const rows = getDb()
    .prepare(
      `SELECT
         o.id,
         o.name,
         o.company,
         o.title,
         o.church,
         o.fun_fact,
         m.created_at
       FROM meetings m
       JOIN attendees o ON o.id = CASE
         WHEN m.scanner_id = @id THEN m.scanned_id
         ELSE m.scanner_id
       END
       WHERE m.scanner_id = @id OR m.scanned_id = @id
       ORDER BY m.created_at DESC, m.id DESC`,
    )
    .all({ id: attendeeId }) as Array<{
    id: number;
    name: string;
    company: string;
    title: string;
    church: string;
    fun_fact: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    company: row.company,
    title: row.title,
    church: storedChurch(row.church),
    funFact: row.fun_fact,
    metAt: row.created_at,
  }));
}

export function getBoard(youId: number | null): BoardSnapshot {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
         a.id,
         a.name,
         a.church,
         (
           SELECT COUNT(*)
           FROM meetings m
           WHERE m.scanner_id = a.id OR m.scanned_id = a.id
         ) AS score
       FROM attendees a
       ORDER BY score DESC, a.name COLLATE NOCASE ASC, a.id ASC`,
    )
    .all() as Array<{
    id: number;
    name: string;
    church: string;
    score: number;
  }>;

  let rank = 0;
  let seen = 0;
  let lastScore = -1;
  const ranked = rows.map((row) => {
    seen += 1;
    if (row.score !== lastScore) {
      rank = seen;
      lastScore = row.score;
    }
    return { ...row, church: storedChurch(row.church), rank };
  });

  const active = ranked.filter((row) => row.score > 0);
  const youRow = youId == null ? undefined : ranked.find((row) => row.id === youId);
  const recent = db
    .prepare(
      `SELECT
         m.id,
         m.created_at AS createdAt,
         s.name AS scannerName,
         t.name AS scannedName
       FROM meetings m
       JOIN attendees s ON s.id = m.scanner_id
       JOIN attendees t ON t.id = m.scanned_id
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 8`,
    )
    .all() as BoardSnapshot["recent"];

  const attendeeCount = db.prepare("SELECT COUNT(*) AS count FROM attendees").get() as {
    count: number;
  };
  const meetingCount = db.prepare("SELECT COUNT(*) AS count FROM meetings").get() as {
    count: number;
  };

  const count = attendeeCount.count;
  return {
    leaders: active.slice(0, BOARD_LIMIT),
    you: youRow
      ? { id: youRow.id, name: youRow.name, score: youRow.score, rank: youRow.rank }
      : null,
    recent,
    attendeeCount: count,
    meetingCount: meetingCount.count,
    others: Math.max(0, count - 1),
    churches: churchProgress(db, youId),
    truncated: active.length > BOARD_LIMIT,
  };
}

function churchProgress(db: Database.Database, youId: number | null): ChurchProgress[] {
  const counts = db.prepare("SELECT church, COUNT(*) AS headcount FROM attendees GROUP BY church").all() as Array<{
    church: string;
    headcount: number;
  }>;
  const headcounts = new Map(counts.map((row) => [row.church, row.headcount]));
  let viewerChurch = "";
  const metByChurch = new Map<string, number>();

  if (youId != null) {
    const self = db.prepare("SELECT church FROM attendees WHERE id = ?").get(youId) as
      | { church: string }
      | undefined;
    viewerChurch = self?.church ?? "";
    const mets = db
      .prepare(
        `SELECT o.church AS church, COUNT(*) AS met
         FROM meetings m
         JOIN attendees o ON o.id = CASE
           WHEN m.scanner_id = ? THEN m.scanned_id
           ELSE m.scanner_id
         END
         WHERE m.scanner_id = ? OR m.scanned_id = ?
         GROUP BY o.church`,
      )
      .all(youId, youId, youId) as Array<{ church: string; met: number }>;
    for (const row of mets) metByChurch.set(row.church, row.met);
  }

  return CHURCHES.map((church) => {
    const headcount = headcounts.get(church) ?? 0;
    const pool = Math.max(0, headcount - (viewerChurch === church ? 1 : 0));
    return {
      church,
      met: Math.min(metByChurch.get(church) ?? 0, pool),
      pool,
      headcount,
    };
  });
}

export function getSetting(key: string) {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? "";
}

export function setSetting(key: string, value: string) {
  if (!value) {
    getDb().prepare("DELETE FROM settings WHERE key = ?").run(key);
    return;
  }
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value);
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

export async function resolveBaseUrl() {
  const saved = getSetting("baseUrl");
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
