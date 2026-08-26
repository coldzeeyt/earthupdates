const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ADMIN_PASSCODE_HASH = process.env.ADMIN_PASSCODE_HASH;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
const DATA_FILE = process.env.DATA_FILE || "/data/patches.json";

const VALID_TYPES = new Set(["buff", "nerf", "new", "fix", "removed", "event"]);
const MAX_ENTRIES_PER_PUBLISH = 20;
const MAX_FIELD_LENGTH = 400;

const DEFAULT_PATCHES = [
  {
    version: "v1.0.0",
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    entries: [
      { type: "new", title: "Earth Updates launched", detail: "Patch notes for planet Earth start here." },
    ],
  },
];

if (!ADMIN_PASSCODE_HASH) {
  console.error("Missing required env var: ADMIN_PASSCODE_HASH");
  process.exit(1);
}

// --- persistent storage on the Railway volume ---
function readPatches() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code !== "ENOENT") console.error("Failed to read data file, using defaults:", err.message);
    return DEFAULT_PATCHES;
  }
}

function writePatches(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmpFile, DATA_FILE);
}

if (!fs.existsSync(DATA_FILE)) {
  writePatches(DEFAULT_PATCHES);
}

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "100kb" }));
app.use(cors({
  origin(origin, callback) {
    // Allow no-Origin requests (curl, health checks) and configured origins only.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  },
}));

// --- naive in-memory brute-force guard, keyed by IP ---
const attempts = new Map(); // ip -> { count, lockedUntil }
const MAX_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

function checkLockout(ip) {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (rec.lockedUntil && rec.lockedUntil > Date.now()) return true;
  if (rec.lockedUntil && rec.lockedUntil <= Date.now()) attempts.delete(ip);
  return false;
}

function recordFailure(ip) {
  const rec = attempts.get(ip) || { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) rec.lockedUntil = Date.now() + LOCKOUT_MS;
  attempts.set(ip, rec);
}

function recordSuccess(ip) {
  attempts.delete(ip);
}

function sha256Hex(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function checkPasscode(req, res) {
  const ip = req.ip;
  if (checkLockout(ip)) {
    res.status(429).json({ error: "Too many attempts. Try again later." });
    return false;
  }
  const passcode = (req.body && req.body.passcode) || "";
  if (sha256Hex(passcode) !== ADMIN_PASSCODE_HASH) {
    recordFailure(ip);
    res.status(401).json({ error: "Incorrect passcode." });
    return false;
  }
  recordSuccess(ip);
  return true;
}

function bumpVersion(v) {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(v || "");
  if (!match) return "v1.0.1";
  const [, maj, min, build] = match;
  return `v${maj}.${min}.${Number(build) + 1}`;
}

function sanitizeEntries(entries) {
  if (!Array.isArray(entries) || !entries.length) {
    throw new Error("At least one entry is required.");
  }
  if (entries.length > MAX_ENTRIES_PER_PUBLISH) {
    throw new Error(`Too many entries in one publish (max ${MAX_ENTRIES_PER_PUBLISH}).`);
  }
  return entries.map(e => {
    const type = String(e.type || "");
    const title = String(e.title || "").trim().slice(0, MAX_FIELD_LENGTH);
    const detail = String(e.detail || "").trim().slice(0, MAX_FIELD_LENGTH);
    if (!VALID_TYPES.has(type)) throw new Error(`Invalid entry type: ${type}`);
    if (!title || !detail) throw new Error("Every entry needs a title and detail.");
    return { type, title, detail };
  });
}

app.get("/", (req, res) => {
  res.json({ service: "earthupdates-admin-api", ok: true });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/patches", (req, res) => {
  res.json(readPatches());
});

app.post("/api/publish", (req, res) => {
  if (!checkPasscode(req, res)) return;
  try {
    const entries = sanitizeEntries(req.body.entries);
    const current = readPatches();

    const requestedVersion = String((req.body && req.body.version) || "").trim().slice(0, 40);
    const version = requestedVersion || bumpVersion(current[0] && current[0].version);
    if (current.some(g => g.version === version)) {
      throw new Error(`Version "${version}" already exists. Pick a different one.`);
    }

    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const updated = [{ version, date: today, entries }, ...current];
    writePatches(updated);
    res.json({ ok: true, version });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/delete-version", (req, res) => {
  if (!checkPasscode(req, res)) return;
  try {
    const version = String((req.body && req.body.version) || "").slice(0, 40);
    if (!version) throw new Error("A version is required.");
    const current = readPatches();
    const updated = current.filter(g => g.version !== version);
    if (updated.length === current.length) throw new Error(`Version ${version} not found.`);
    writePatches(updated);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(err.message === "Origin not allowed" ? 403 : 500).json({ error: err.message || "Unexpected error" });
});

app.listen(PORT, () => {
  console.log(`earthupdates admin API listening on ${PORT}, data file: ${DATA_FILE}`);
});
