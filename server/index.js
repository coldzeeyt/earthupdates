const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_PASSCODE_HASH = process.env.ADMIN_PASSCODE_HASH;
const REPO = process.env.REPO || "coldzeeyt/earthupdates";
const DATA_PATH = process.env.DATA_PATH || "data/patches.json";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const VALID_TYPES = new Set(["buff", "nerf", "new", "fix", "removed", "event"]);
const MAX_ENTRIES_PER_PUBLISH = 20;
const MAX_FIELD_LENGTH = 400;

if (!GITHUB_TOKEN || !ADMIN_PASSCODE_HASH) {
  console.error("Missing required env vars: GITHUB_TOKEN and/or ADMIN_PASSCODE_HASH");
  process.exit(1);
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

function githubApiUrl() {
  return `https://api.github.com/repos/${REPO}/contents/${DATA_PATH}`;
}

async function fetchLiveFile() {
  const res = await fetch(githubApiUrl(), {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`Could not read current file (HTTP ${res.status})`);
  const fileData = await res.json();
  const current = JSON.parse(Buffer.from(fileData.content, "base64").toString("utf8"));
  return { current, sha: fileData.sha };
}

async function putLiveFile(message, sha, updated) {
  const res = await fetch(githubApiUrl(), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(JSON.stringify(updated, null, 2), "utf8").toString("base64"),
      sha,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Publish failed (HTTP ${res.status})`);
  }
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

app.post("/api/publish", async (req, res) => {
  if (!checkPasscode(req, res)) return;
  try {
    const entries = sanitizeEntries(req.body.entries);
    const { current, sha } = await fetchLiveFile();

    const requestedVersion = String((req.body && req.body.version) || "").trim().slice(0, 40);
    let version = requestedVersion || bumpVersion(current[0] && current[0].version);
    if (current.some(g => g.version === version)) {
      throw new Error(`Version "${version}" already exists. Pick a different one.`);
    }

    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const updated = [{ version, date: today, entries }, ...current];
    await putLiveFile(`Add patch notes: ${version}`, sha, updated);
    res.json({ ok: true, version });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/delete-version", async (req, res) => {
  if (!checkPasscode(req, res)) return;
  try {
    const version = String((req.body && req.body.version) || "").slice(0, 40);
    if (!version) throw new Error("A version is required.");
    const { current, sha } = await fetchLiveFile();
    const updated = current.filter(g => g.version !== version);
    if (updated.length === current.length) throw new Error(`Version ${version} not found.`);
    await putLiveFile(`Remove patch notes: ${version}`, sha, updated);
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
  console.log(`earthupdates admin API listening on ${PORT}`);
});
