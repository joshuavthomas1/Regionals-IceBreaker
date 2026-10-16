import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { chmodSync, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const VERSION = "2026.10.1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PORT || "3847";
const localUrl = `http://127.0.0.1:${port}`;
const urlPattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

function assetForPlatform() {
  const arch = process.arch;
  if (process.platform === "linux" && arch === "x64") return "cloudflared-linux-amd64";
  if (process.platform === "linux" && arch === "arm64") return "cloudflared-linux-arm64";
  if (process.platform === "darwin" && arch === "x64") return "cloudflared-darwin-amd64.tgz";
  if (process.platform === "darwin" && arch === "arm64") return "cloudflared-darwin-arm64.tgz";
  if (process.platform === "win32" && arch === "x64") return "cloudflared-windows-amd64.exe";
  throw new Error(`No cloudflared build for ${process.platform} ${arch}.`);
}

function installedCloudflared() {
  const probe = spawnSync("cloudflared", ["--version"], { encoding: "utf8" });
  if (probe.status === 0) return "cloudflared";
  return null;
}

async function downloadCloudflared() {
  const cacheDir = path.join(root, ".cache", "cloudflared");
  mkdirSync(cacheDir, { recursive: true });
  const binaryName = process.platform === "win32" ? "cloudflared.exe" : "cloudflared";
  const binaryPath = path.join(cacheDir, binaryName);
  const versionPath = path.join(cacheDir, "VERSION");
  if (existsSync(binaryPath) && existsSync(versionPath) && readFileSync(versionPath, "utf8").trim() === VERSION) {
    return binaryPath;
  }

  const asset = assetForPlatform();
  const downloadUrl = `https://github.com/cloudflare/cloudflared/releases/download/${VERSION}/${asset}`;
  process.stdout.write(`Downloading the tunnel client (${VERSION})…\n`);
  const response = await fetch(downloadUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download ${downloadUrl} (${response.status}).`);
  }

  if (asset.endsWith(".tgz")) {
    const archivePath = path.join(cacheDir, asset);
    await pipeline(response.body, createWriteStream(archivePath));
    const extracted = spawnSync("tar", ["-xzf", archivePath, "-C", cacheDir], { encoding: "utf8" });
    if (extracted.status !== 0) throw new Error(extracted.stderr || "Could not unpack the tunnel client.");
  } else {
    await pipeline(response.body, createWriteStream(binaryPath));
  }

  if (process.platform !== "win32") chmodSync(binaryPath, 0o755);
  writeFileSync(versionPath, `${VERSION}\n`);
  return binaryPath;
}

function openDb() {
  const dbPath = process.env.ICEBREAKER_DB || path.join(root, "data", "icebreaker.sqlite");
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);
  return db;
}

function readBaseUrl(db) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'baseUrl'").get();
  return typeof row?.value === "string" ? row.value : "";
}

function writeBaseUrl(db, value) {
  if (!value) {
    db.prepare("DELETE FROM settings WHERE key = 'baseUrl'").run();
    return;
  }
  db.prepare(
    `INSERT INTO settings (key, value) VALUES ('baseUrl', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(value);
}

function isLocal(url) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
  } catch {
    return !url;
  }
}

function isTunnel(url) {
  try {
    return new URL(url).hostname.endsWith(".trycloudflare.com");
  } catch {
    return false;
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(localUrl, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // The server is still starting, or it is not running yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Nothing is serving ${localUrl} yet.\nStart the site in another terminal with npm run dev, or npm run build && npm start, then run npm run share again.`,
  );
}

async function main() {
  await waitForServer();
  const command = installedCloudflared() ?? (await downloadCloudflared());
  const child = spawn(command, ["tunnel", "--url", localUrl, "--no-autoupdate"], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const db = openDb();
  let publicUrl = "";
  let wroteBaseUrl = false;
  let dbClosed = false;
  let previousBaseUrl = readBaseUrl(db);

  function closeDb() {
    if (dbClosed) return;
    dbClosed = true;
    db.close();
  }

  function announce(url) {
    if (publicUrl) return;
    publicUrl = url;
    const keepExisting = previousBaseUrl && !isLocal(previousBaseUrl) && !isTunnel(previousBaseUrl);
    if (keepExisting) {
      process.stdout.write(
        `\nPublic link: ${url}\nSettings already uses ${previousBaseUrl} for badge QR codes, so that address was left as-is.\nLeave this running. Phones on cellular data can open ${url} while it stays up.\n`,
      );
      return;
    }
    writeBaseUrl(db, url);
    wroteBaseUrl = true;
    process.stdout.write(
      `\nPublic link: ${url}\nBadge QR codes now use this address. Phones on cellular data can open it.\nLeave this running until you are done. Stopping it closes the link, and the next run gets a new address, so print badges again if you restart.\n`,
    );
  }

  function onChunk(chunk) {
    const text = chunk.toString();
    process.stderr.write(text);
    const match = text.match(urlPattern);
    if (match) announce(match[0]);
  }

  child.stdout.on("data", onChunk);
  child.stderr.on("data", onChunk);

  function restore() {
    if (!wroteBaseUrl || !publicUrl) return;
    if (readBaseUrl(db) === publicUrl) writeBaseUrl(db, previousBaseUrl);
    wroteBaseUrl = false;
  }

  function shutdown() {
    restore();
    closeDb();
    if (!child.killed) child.kill("SIGTERM");
  }

  process.on("SIGINT", () => {
    shutdown();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    shutdown();
    process.exit(0);
  });

  child.on("exit", (code) => {
    restore();
    closeDb();
    if (!publicUrl) {
      process.stderr.write("The public link did not come up. Check the messages above.\n");
    }
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Could not share the site."}\n`);
  process.exit(1);
});
