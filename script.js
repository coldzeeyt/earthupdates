const ICONS = {
  buff: "▲",
  nerf: "▼",
  new: "✦",
  fix: "🔧",
  removed: "✕",
  event: "★",
};

const LOCAL_KEY = "earth_local_patch_draft";
const EARTHQUAKE_FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson";

// Backend (see /server) that stores patch notes on its own persistent
// volume and handles publish/delete. No GitHub credentials involved
// anywhere in this flow — the browser only ever sends the passcode over
// HTTPS to this service.
const BACKEND_URL = "https://admin-api-production-2fa7.up.railway.app";

// SHA-256 of the admin passcode. The plaintext code never appears in this
// file — unlocking the panel requires hashing the entered value and
// comparing hashes. This is a fast client-side UX gate only; the backend
// independently re-checks the passcode before touching the repo, which is
// the actual access control.
const ADMIN_HASH = "e224dac2b5ae53b6b711f7fc5d97d0fd16183179ea5f69dfe03b37d94c6c2171";

// Fallback used only if the backend can't be reached.
const DEFAULT_PATCH_GROUPS = [
  {
    version: "v1.0.0",
    date: "Aug 26, 2026",
    entries: [
      { type: "new", title: "Earth Updates launched", detail: "Patch notes for planet Earth start here." },
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
  "NO SCHEDULED DOWNTIME",
  "REPORT BUGS TO YOUR LOCAL REPRESENTATIVE",
  "NEXT HOTFIX: TBD",
  "SERVER REGION: SOL-3",
  "UPTIME: 4.543 BILLION YEARS",
  "SEE REAL EVENTS SECTION FOR LIVE USGS DATA",
];

let pendingEntries = [];
let liveGroups = [];
let adminPasscode = ""; // kept in memory only while the admin panel is open

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

function updateVersionDisplays(version) {
  const build = (version || "v1.0.0").replace(/^v/, "");
  const live = document.getElementById("live-version");
  const heroBuild = document.getElementById("build-number");
  const footerBuild = document.getElementById("footer-build");
  if (live) live.textContent = version;
  if (heroBuild) heroBuild.textContent = build;
  if (footerBuild) footerBuild.textContent = build;
}

function updatePatchCountStat(groups) {
  const stat = document.getElementById("stat-patches");
  if (!stat) return;
  const total = groups.reduce((sum, g) => sum + (g.entries ? g.entries.length : 0), 0);
  stat.dataset.target = String(total);
}

async function loadPatchGroups() {
  let groups = DEFAULT_PATCH_GROUPS;
  try {
    const res = await fetch(`${BACKEND_URL}/api/patches?v=${Date.now()}`, { cache: "no-store" });
    if (res.ok) groups = await res.json();
  } catch {
    // stay on fallback data
  }

  liveGroups = groups;
  updateVersionDisplays(groups[0] && groups[0].version);
  updatePatchCountStat(groups);

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

async function loadRealEvents() {
  const container = document.getElementById("real-events-list");
  try {
    const res = await fetch(EARTHQUAKE_FEED, { cache: "no-store" });
    if (!res.ok) throw new Error("feed unavailable");
    const data = await res.json();
    const items = (data.features || [])
      .slice()
      .sort((a, b) => b.properties.time - a.properties.time)
      .slice(0, 6);

    if (!items.length) {
      container.innerHTML = '<p class="admin-empty">No significant seismic events reported this month.</p>';
      return;
    }

    container.innerHTML = items.map(f => {
      const mag = typeof f.properties.mag === "number" ? f.properties.mag.toFixed(1) : "—";
      const place = escapeHtml(f.properties.place || "Unknown location");
      const when = new Date(f.properties.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const url = f.properties.url || "#";
      return `
        <a class="real-event" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
          <span class="real-event-mag">M${mag}</span>
          <span class="real-event-body">
            <span class="real-event-place">${place}</span>
            <span class="real-event-time">${when}</span>
          </span>
        </a>`;
    }).join("");
  } catch {
    container.innerHTML = '<p class="admin-empty">Live feed unavailable right now — try refreshing.</p>';
  }
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
  const duration = 1200;
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

function renderManageList() {
  const list = document.getElementById("manage-list");
  if (!liveGroups.length) {
    list.innerHTML = '<p class="admin-empty">Nothing published yet.</p>';
    return;
  }
  list.innerHTML = liveGroups.map(g => `
    <div class="manage-item">
      <div class="manage-info">
        <span class="manage-version">${escapeHtml(g.version)}</span>
        <span class="manage-date">${escapeHtml(g.date)}</span>
      </div>
      <button type="button" class="manage-delete" data-version="${escapeHtml(g.version)}">Delete</button>
    </div>
  `).join("");
  list.querySelectorAll(".manage-delete").forEach(btn => {
    btn.addEventListener("click", () => deleteVersion(btn.dataset.version));
  });
}

async function deleteVersion(version) {
  const status = document.getElementById("admin-status");
  if (!confirm(`Delete ${version} from the live site? This can't be undone from here.`)) return;

  status.textContent = `Deleting ${version}…`;
  try {
    const res = await fetch(`${BACKEND_URL}/api/delete-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: adminPasscode, version }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Delete failed (HTTP ${res.status})`);
    status.textContent = `${version} removed. Live once the site rebuilds (usually under a minute).`;
    await loadPatchGroups();
    renderManageList();
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

function suggestNextVersion(v) {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(v || "");
  if (!match) return "v1.0.1";
  const [, maj, min, build] = match;
  return `v${maj}.${min}.${Number(build) + 1}`;
}

async function publishLive() {
  const status = document.getElementById("admin-status");
  const versionInput = document.getElementById("f-version");
  if (!pendingEntries.length) { status.textContent = "Add at least one entry first."; return; }

  status.textContent = "Publishing…";
  try {
    const res = await fetch(`${BACKEND_URL}/api/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: adminPasscode, entries: pendingEntries, version: versionInput.value.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Publish failed (HTTP ${res.status})`);
    status.textContent = `Published ${data.version}. It'll appear for everyone once the site rebuilds (usually under a minute).`;
    pendingEntries = [];
    renderDraftList();
    await loadPatchGroups();
    renderManageList();
    versionInput.value = suggestNextVersion(liveGroups[0] && liveGroups[0].version);
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
  function closeModal() {
    overlay.classList.remove("open");
    adminPasscode = "";
  }

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  async function tryUnlock() {
    const value = passInput.value.trim();
    const hash = await sha256Hex(value);
    if (hash === ADMIN_HASH) {
      adminPasscode = value;
      gate.classList.add("hidden-entry");
      panel.classList.remove("hidden-entry");
      errorEl.textContent = "";
      pendingEntries = [];
      renderDraftList();
      renderManageList();
      document.getElementById("f-version").value = suggestNextVersion(liveGroups[0] && liveGroups[0].version);
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
  loadRealEvents();
});
