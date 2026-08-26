const ICONS = {
  buff: "▲",
  nerf: "▼",
  new: "✦",
  fix: "🔧",
  removed: "✕",
  event: "★",
};

const PATCH_GROUPS = [
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
  {
    version: "v6.1.998",
    date: "Aug 12, 2026",
    entries: [
      { type: "new", title: "Aurora rendering upgrade", detail: "Northern and southern lights now render at higher fidelity during solar storm events. Best viewed above 55° latitude, weather permitting." },
      { type: "fix", title: "Migratory bird pathing", detail: "Fixed a bug where several species were routing through active runways. Navigation mesh rebaked." },
      { type: "nerf", title: "Mosquitoes", detail: "Buzzing frequency increased by mistake in a hotfix two builds ago. Reverted. You're welcome." },
      { type: "event", title: "Perseid meteor shower", detail: "Limited-time event live now through Aug 24. Peak spawn rate around 2 AM local time. No cooldown, first come first served." },
    ],
  },
  {
    version: "v6.0.912",
    date: "Jul 29, 2026",
    entries: [
      { type: "buff", title: "Coral reef regeneration", detail: "Recovery rate buffed in three marine zones following a sustained cooldown period. Still fragile — please stop standing on it." },
      { type: "nerf", title: "Heatwaves, Northern Hemisphere", detail: "Intensity increased for the third patch in a row. Multiple bug reports filed as feedback. Devs aware, no fix scheduled." },
      { type: "new", title: "Bioluminescent plankton bloom", detail: "New seasonal visual effect added to select coastlines at night. Triggered by wave disturbance." },
      { type: "fix", title: "Tectonic plate desync", detail: "Patched a minor desync along a fault line that was causing inconsistent tremor readings. No major shifts expected this build." },
      { type: "removed", title: "That one square of ozone", detail: "Fully restored, actually — removing it from the known issues list after 30 years open. Nice work, everyone who filed a report." },
    ],
  },
  {
    version: "v5.9.844",
    date: "Jul 14, 2026",
    entries: [
      { type: "nerf", title: "Human patience, in traffic", detail: "Reduced further. Working as intended per design doc, apparently." },
      { type: "buff", title: "Golden hour lighting", detail: "Global lighting engine tuned. Sunsets now last approximately 4% longer in clear-sky conditions." },
      { type: "new", title: "Rare double rainbow event", detail: "Spawn conditions loosened slightly after sun-shower weather. Still uncommon, still not guaranteed." },
      { type: "event", title: "Cicada emergence, Brood cluster", detail: "17-year timer expired. Full spawn event active in affected regions through late summer. Loud." },
    ],
  },
  {
    version: "v5.8.771",
    date: "Jun 30, 2026",
    entries: [
      { type: "fix", title: "Monsoon season timing", detail: "Corrected a scheduling bug causing onset to drift. Should now align with historical patch cadence." },
      { type: "nerf", title: "Glacier mass, global average", detail: "Continued decline this patch. Long-running balance issue, no hotfix planned — this is a core systems problem, not a bug." },
      { type: "buff", title: "Beekeeper population", detail: "Slight uptick in active players this season. Hive health metrics trending positive in three regions." },
      { type: "new", title: "Wildflower super-bloom", detail: "One-time seasonal spawn triggered by ideal winter rainfall. Desert biomes only. Screenshots encouraged." },
    ],
  },
  {
    version: "v5.7.702",
    date: "Jun 9, 2026",
    entries: [
      { type: "nerf", title: "Group chat notification spam", detail: "Not an Earth-side patch, but we're getting blamed for it anyway. Escalated to the platform team." },
      { type: "buff", title: "Sourdough starter viability", detail: "Ambient yeast strains buffed slightly. Should be more forgiving for new players this patch." },
      { type: "removed", title: "Leap second", detail: "Skipped this cycle due to rotational speed drift. Timekeeping team says it's fine. It's probably fine." },
      { type: "fix", title: "Firefly sync timing", detail: "Patched flash synchronization bug in select Southeast Asian regions. Should look less chaotic now." },
    ],
  },
  {
    version: "v5.6.633",
    date: "May 22, 2026",
    entries: [
      { type: "new", title: "New volcanic island", detail: "Small landmass added via underwater eruption in the South Pacific. Currently uninhabited. Claim rights TBD." },
      { type: "nerf", title: "Allergy season", detail: "Pollen count buffed — sorry, that's a typo in last patch's notes, it was in fact nerfed against players. Apologies for the confusion." },
      { type: "buff", title: "Whale song range", detail: "Acoustic propagation distance increased following a background noise pass in shipping lanes." },
      { type: "event", title: "Total solar eclipse", detail: "Path of totality event scheduled and delivered on time. Attendance metrics exceeded projections." },
    ],
  },
  {
    version: "v5.5.560",
    date: "May 3, 2026",
    entries: [
      { type: "fix", title: "River delta erosion rate", detail: "Corrected an edge case causing accelerated sediment loss in two major deltas." },
      { type: "nerf", title: "Standing in line at the DMV", detail: "Wait time balance pass. Not technically an Earth-engine issue but morale team asked us to acknowledge it." },
      { type: "buff", title: "Songbird dawn chorus", detail: "Volume and variety buffed in temperate zones as breeding season ramped up." },
      { type: "new", title: "Bioluminescent fungi patch", detail: "New rare spawn added to a handful of forest biomes. Only visible at night, low light required." },
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
  "PATCH v6.2.1044 IS LIVE",
  "BED BUGS NERFED 17%",
  "PLAYER 6732 REMAINS BANNED",
  "NO SCHEDULED DOWNTIME",
  "AURORA RENDERING UPGRADED",
  "REPORT BUGS TO YOUR LOCAL REPRESENTATIVE",
  "NEXT HOTFIX: TBD",
  "SERVER REGION: SOL-3",
  "UPTIME: 4.543 BILLION YEARS",
];

function renderTicker() {
  const track = document.getElementById("ticker-track");
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  track.innerHTML = items.map(t => `<span>${t}</span>`).join('<span style="color:var(--accent)"> &nbsp;//&nbsp; </span>');
}

function renderPatches() {
  const list = document.getElementById("patch-list");
  list.innerHTML = PATCH_GROUPS.map(group => `
    <div class="patch-group">
      <div class="patch-group-header">
        <span class="patch-version">${group.version}</span>
        <span class="patch-date">${group.date}</span>
      </div>
      ${group.entries.map(e => `
        <div class="patch-entry" data-type="${e.type}">
          <div class="patch-icon" style="color:var(--${e.type})">${ICONS[e.type]}</div>
          <div>
            <div class="patch-title">
              ${e.title}
              <span class="tag tag-${e.type}">${e.type}</span>
            </div>
            <div class="patch-desc">${e.detail}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `).join("");
}

function renderRoadmap() {
  const grid = document.getElementById("roadmap-grid");
  grid.innerHTML = ROADMAP.map(r => `
    <div class="roadmap-card">
      <span class="roadmap-status">${r.status}</span>
      <h3>${r.title}</h3>
      <p>${r.detail}</p>
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

document.addEventListener("DOMContentLoaded", () => {
  renderTicker();
  renderPatches();
  renderRoadmap();
  renderIssues();
  setupFilters();
  animateStats();
});
