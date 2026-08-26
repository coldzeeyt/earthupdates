const ICONS = {
  buff: "▲",
  nerf: "▼",
  new: "✦",
  fix: "🔧",
  removed: "✕",
  event: "★",
};

// Repo this admin panel publishes to. Only used to build the GitHub API
// URL for the "publish live" action below — never sent anywhere else.
const REPO = "coldzeeyt/earthupdates";
const DATA_PATH = "data/patches.json";
const LOCAL_KEY = "earth_local_patch_draft";

// SHA-256 of the admin passcode. The plaintext code never appears in this
// file — unlocking the panel requires hashing the entered value and
// comparing hashes. This is a UI gate, not real access control: it only
// keeps casual visitors out of the drafting panel. The thing that
// actually protects the live site is the GitHub token required to
// publish, which only people you've granted repo write access can have.
const ADMIN_HASH = "e224dac2b5ae53b6b711f7fc5d97d0fd16183179ea5f69dfe03b37d94c6c2171";

// Fallback data used only if data/patches.json can't be fetched
// (e.g. opening the file directly instead of via a server).
const DEFAULT_PATCH_GROUPS = [
  {
    version: "v6.2.1044",
    date: "Aug 26, 2026",
    entries: [
      { type: "nerf", title: "Bed bugs", detail: "Nerfed 17%. Regeneration rate reduced, detection radius on mattresses increased. Still too strong, we know." },
      { type: "nerf", title: "Global intelligence", detail: "Nerfed. Average attention span reduced across all regions. Investigating root cause, likely related to the short-form video exploit patched in v6.1." },
      { type: "removed", title: "Player 6732", detail: "Remains permanently banned. Ban appeal denied for the fourth time. Reason on file: \"violated at least six terms of service simultaneously.\"" },
      { type: "buff", title: "Food-borne germs", detail: "Response time to unattended food buffed. Contact window reduced to 3 seconds, down from 5. Kitchen counters most affected." },
      { type: "nerf", title: "Penguin spawn rate", detail: "Decreased 5% in the Antarctic biome this cycle. Colony devs say it's a \"regional balance pass,\" not a nerf. It's a nerf." },
    ],
  },
];

const ROADMAP = [
  { status: "In Progress", title: "Ocean acidification rebalance", detail: "A larger systems pass targeting pH levels across multiple biomes. No ETA — this one's complicated." },
  { status: "Planned", title: "Improved permafrost stability", detail: "Investigating a fix for gradual terrain integrity loss in northern regions." },
  { status: "Under Review", title: "Daylight saving time removal", detail: "Community-requested for over a decade. Still stuck in review. Not our call, honestly." },
  { status: "Planned", title: "Coral bleaching resistance buff", detail: "Early-stage work on heat-tolerant reef variants. Testing in a limited region first." },
  { status: "Exploring", title: "Migratory pattern QoL pass", detail: "Looking at smoothing out seasonal timing for several species affected by shifting climate cues." },
  { status: "Backlog", title: "Asteroid near-miss alert system", detail: "Nice to have. Low priority until it isn't." },
];

const KNOWN_ISSUES = [
  "<b>Jellyfish blooms</b> — occasionally spawning in unexpectedly large numbers near popular beach instances. Investigating.",
  "<b>Time zones</b> — several boundaries remain confusing by design, not a bug, please stop reporting this.",
  "<b>Tumbleweeds</b> — pathing occasionally clips through traffic intersections in arid regions.",
  "<b>Static electricity</b> — dry-season shock damage slightly above intended values in carpeted areas.",
  "<b>Ball lightning</b> — rare visual effect still not fully understood internally. Not removing it, it's cool.",
  "<b>Standing water reflections</b> — minor render flicker during high wind conditions. Cosmetic only.",
];

const TICKER_ITEMS = [
  "PATCH IS LIVE",
  "BED BUGS NERFED 17%",
  "PLAYER 6732 REMAINS BANNED",
  "NO SCHEDULED DOWNTIME",
  "AURORA RENDERING UPGRADED",
  "REPORT BUGS TO YOUR LOCAL REPRESENTATIVE",
  "NEXT HOTFIX: TBD",
  "SERVER REGION: SOL-3",
  "UPTIME: 4.543 BILLION YEARS",
];

let pendingEntries = [];

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function renderTicker() {
  const track = document.getElementById("ticker-track");
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  track.innerHTML = items.map(t => `<span>${escapeHtml(t)}</span>`).join('<span style="color:var(--accent)"> &nbsp;//&nbsp; </span>');
}

function renderPatches(groups) {
  const list = document.getElementById("patch-list");
  list.innerHTML = groups.map(group => `
    <div class="patch-group${group.isDraft ? " patch-group-draft" : ""}">
      <div class="patch-group-header">
        <span class="patch-version">${escapeHtml(group.version)}</span>
        <span class="patch-date">${escapeHtml(group.date)}</span>
      </div>
      ${group.entries.map(e => `
        <div class="patch-entry" data-type="${escapeHtml(e.type)}">
          <div class="patch-icon" style="color:var(--${e.type})">${ICONS[e.type] || "•"}</div>
          <div>
            <div class="patch-title">
              ${escapeHtml(e.title)}
              <span class="tag tag-${escapeHtml(e.type)}">${escapeHtml(e.type)}</span>
            </div>
            <div class="patch-desc">${escapeHtml(e.detail)}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `).join("");
}

function getLocalDraft() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

async function loadPatchGroups() {
  let groups = DEFAULT_PATCH_GROUPS;
  try {
    const res = await fetch(`${DATA_PATH}?v=${Date.now()}`, { cache: "no-store" });
    if (res.ok) groups = await res.json();
  } catch {
    // stay on fallback data
  }

  const localDraft = getLocalDraft();
  const rendered = localDraft.length
    ? [{ version: "UNPUBLISHED DRAFT", date: "saved in this browser only", entries: localDraft, isDraft: true }, ...groups]
    : groups;

  renderPatches(rendered);
  return groups;
}

function renderRoadmap() {
  const grid = document.getElementById("roadmap-grid");
  grid.innerHTML = ROADMAP.map(r => `
    <div class="roadmap-card">
      <span class="roadmap-status">${escapeHtml(r.status)}</span>
      <h3>${escapeHtml(r.title)}</h3>
      <p>${escapeHtml(r.detail)}</p>
    </div>
  `).join("");
}

function renderIssues() {
  const ul = document.getElementById("issues-list");
  ul.innerHTML = KNOWN_ISSUES.map(i => `<li>${i}</li>`).join("");
}

function setupFilters() {
  const bar = document.getElementById("filter-bar");
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    bar.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const filter = btn.dataset.filter;
    document.querySelectorAll(".patch-entry").forEach(entry => {
      const show = filter === "all" || entry.dataset.type === filter;
      entry.classList.toggle("hidden-entry", !show);
    });
    document.querySelectorAll(".patch-group").forEach(group => {
      const visible = group.querySelectorAll(".patch-entry:not(.hidden-entry)").length;
      group.style.display = visible ? "" : "none";
    });
  });
}

function animateStats() {
  const nodes = document.querySelectorAll(".stat-value");
  const duration = 1600;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    nodes.forEach(node => {
      const target = Number(node.dataset.target);
      const suffix = node.dataset.suffix || "";
      const value = Math.floor(target * eased);
      node.textContent = value.toLocaleString() + suffix;
    });
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function b64DecodeUnicode(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

function b64EncodeUnicode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function bumpVersion(v) {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(v || "");
  if (!match) return "v1.0.1";
  const [, maj, min, build] = match;
  return `v${maj}.${min}.${Number(build) + 1}`;
}

function renderDraftList() {
  const list = document.getElementById("draft-list");
  if (!pendingEntries.length) {
    list.innerHTML = '<p class="admin-empty">No entries staged yet. Add one above.</p>';
    return;
  }
  list.innerHTML = pendingEntries.map((e, i) => `
    <div class="draft-item">
      <span class="tag tag-${escapeHtml(e.type)}">${escapeHtml(e.type)}</span>
      <span class="draft-title">${escapeHtml(e.title)}</span>
      <button type="button" class="draft-remove" data-index="${i}">Remove</button>
    </div>
  `).join("");
  list.querySelectorAll(".draft-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      pendingEntries.splice(Number(btn.dataset.index), 1);
      renderDraftList();
    });
  });
}

async function publishLive() {
  const status = document.getElementById("admin-status");
  const tokenInput = document.getElementById("gh-token");
  const token = tokenInput.value.trim();

  if (!pendingEntries.length) { status.textContent = "Add at least one entry first."; return; }
  if (!token) { status.textContent = "Paste a GitHub token first."; return; }

  status.textContent = "Publishing…";
  try {
    const apiUrl = `https://api.github.com/repos/${REPO}/contents/${DATA_PATH}`;
    const getRes = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!getRes.ok) throw new Error(`Could not read current file (HTTP ${getRes.status})`);
    const fileData = await getRes.json();
    const current = JSON.parse(b64DecodeUnicode(fileData.content));

    const nextVersion = bumpVersion(current[0] && current[0].version);
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const updated = [{ version: nextVersion, date: today, entries: pendingEntries }, ...current];

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Add patch notes: ${nextVersion}`,
        content: b64EncodeUnicode(JSON.stringify(updated, null, 2)),
        sha: fileData.sha,
      }),
    });
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || `Publish failed (HTTP ${putRes.status})`);
    }

    status.textContent = `Published ${nextVersion}. It'll appear for everyone once the site rebuilds (usually under a minute).`;
    pendingEntries = [];
    tokenInput.value = "";
    renderDraftList();
    loadPatchGroups();
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

function setupAdmin() {
  const overlay = document.getElementById("admin-overlay");
  const openBtn = document.getElementById("admin-open");
  const closeBtn = document.getElementById("admin-close");
  const gate = document.getElementById("admin-gate");
  const panel = document.getElementById("admin-panel");
  const passInput = document.getElementById("admin-passcode");
  const unlockBtn = document.getElementById("admin-unlock");
  const errorEl = document.getElementById("admin-error");

  function openModal() {
    overlay.classList.add("open");
    passInput.value = "";
    errorEl.textContent = "";
    gate.classList.remove("hidden-entry");
    panel.classList.add("hidden-entry");
    setTimeout(() => passInput.focus(), 50);
  }
  function closeModal() { overlay.classList.remove("open"); }

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  async function tryUnlock() {
    const hash = await sha256Hex(passInput.value.trim());
    if (hash === ADMIN_HASH) {
      gate.classList.add("hidden-entry");
      panel.classList.remove("hidden-entry");
      errorEl.textContent = "";
      pendingEntries = [];
      renderDraftList();
    } else {
      errorEl.textContent = "Incorrect passcode.";
      passInput.value = "";
      passInput.focus();
    }
  }
  unlockBtn.addEventListener("click", tryUnlock);
  passInput.addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });

  document.getElementById("admin-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const type = document.getElementById("f-type").value;
    const title = document.getElementById("f-title").value.trim();
    const detail = document.getElementById("f-detail").value.trim();
    if (!title || !detail) return;
    pendingEntries.push({ type, title, detail });
    e.target.reset();
    renderDraftList();
  });

  document.getElementById("save-local").addEventListener("click", () => {
    if (!pendingEntries.length) {
      document.getElementById("admin-status").textContent = "Add at least one entry first.";
      return;
    }
    const existing = getLocalDraft();
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...existing, ...pendingEntries]));
    pendingEntries = [];
    renderDraftList();
    document.getElementById("admin-status").textContent = "Saved — visible only in this browser until published live.";
    loadPatchGroups();
  });

  document.getElementById("publish-live").addEventListener("click", publishLive);
}

document.addEventListener("DOMContentLoaded", () => {
  renderTicker();
  loadPatchGroups();
  renderRoadmap();
  renderIssues();
  setupFilters();
  animateStats();
  setupAdmin();
});
