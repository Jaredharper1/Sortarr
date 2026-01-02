const tbody = document.getElementById("tbody");
const statusEl = document.getElementById("status");
const loadingIndicator = document.getElementById("loadingIndicator");
const lastUpdatedEl = document.getElementById("lastUpdated");
const loadBtn = document.getElementById("loadBtn");
const refreshBtn = document.getElementById("refreshBtn");
const titleFilter = document.getElementById("titleFilter");
const pathFilter = document.getElementById("pathFilter");
const filterInputs = document.getElementById("filterInputs");
const simpleFilters = document.getElementById("simpleFilters");
const advancedToggle = document.getElementById("advancedToggle");
const advancedFilter = document.getElementById("advancedFilter");
const advancedHelpBtn = document.getElementById("advancedHelpBtn");
const advancedHelp = document.getElementById("advancedHelp");
const advancedWarnings = document.getElementById("advancedWarnings");

const tabSonarr = document.getElementById("tabSonarr");
const tabRadarr = document.getElementById("tabRadarr");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const columnsBtn = document.getElementById("columnsBtn");
const columnsPanel = document.getElementById("columnsPanel");
const columnSearch = document.getElementById("columnSearch");
const columnsShowAll = document.getElementById("columnsShowAll");
const columnsHideAll = document.getElementById("columnsHideAll");
const columnsReset = document.getElementById("columnsReset");

const logoEl = document.getElementById("brandLogo");
const themeBtn = document.getElementById("themeBtn");
const root = document.documentElement; // <html>

let activeApp = "sonarr"; // "sonarr" | "radarr"
let sortKey = "AvgEpisodeSizeGB";
let sortDir = "desc";
let isLoading = false;
let advancedEnabled = false;
let chipQuery = "";

// Store per-tab data so switching tabs doesn't briefly show the other tab's list
const dataByApp = { sonarr: [], radarr: [] };
const lastUpdatedByApp = { sonarr: null, radarr: null };

// Prevent stale fetches from rendering after you switch tabs
let loadToken = 0;

let sonarrBase = "";
let radarrBase = "";

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function setLoading(loading, label) {
  isLoading = loading;
  if (loadingIndicator) {
    loadingIndicator.classList.toggle("hidden", !loading);
  }
  if (loadBtn) loadBtn.disabled = loading;
  if (refreshBtn) refreshBtn.disabled = loading;
  if (label) setStatus(label);
}

function updateLastUpdatedDisplay() {
  if (!lastUpdatedEl) return;
  const ts = lastUpdatedByApp[activeApp];
  if (!ts) {
    lastUpdatedEl.textContent = "";
    return;
  }
  lastUpdatedEl.textContent = `Last updated: ${new Date(ts).toLocaleString()}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegex(s) {
  return String(s).replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

function normalizeToken(s) {
  return String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function globToRegex(glob) {
  const escaped = escapeRegex(glob);
  const regexBody = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${regexBody}$`, "i");
}

function matchPattern(value, pattern) {
  let raw = String(pattern ?? "").trim();
  if (!raw) return true;
  if (raw.includes("*") || raw.includes("?")) {
    const startsWildcard = raw[0] === "*" || raw[0] === "?";
    const endsWildcard = raw.endsWith("*") || raw.endsWith("?");
    if (startsWildcard && !endsWildcard) {
      raw = `${raw}*`;
    }
  }
  const text = String(value ?? "");
  if (raw.includes("*") || raw.includes("?")) {
    return globToRegex(raw).test(text);
  }
  return text.toLowerCase().includes(raw.toLowerCase());
}

function formatMixedValue(value, mixed) {
  const base = escapeHtml(value ?? "");
  if (!mixed) return base;
  const label = base || "Mixed";
  return `${label} <span class="mixed-badge">Mixed</span>`;
}

const FIELD_MAP = {
  title: "Title",
  path: "Path",
  videoquality: "VideoQuality",
  videocodec: "VideoCodec",
  videohdr: "VideoHDR",
  resolution: "Resolution",
  audiocodec: "AudioCodec",
  audioprofile: "AudioProfile",
  audiochannels: "AudioChannels",
  episodes: "EpisodesCounted",
  totalsize: "TotalSizeGB",
  avgepisode: "AvgEpisodeSizeGB",
  runtime: "RuntimeMins",
  filesize: "FileSizeGB",
  gbperhour: "GBPerHour",
};

const NUMERIC_FIELDS = new Set([
  "episodes",
  "totalsize",
  "avgepisode",
  "runtime",
  "filesize",
  "gbperhour",
  "audiochannels",
]);

const BUCKET_FIELDS = new Set(["gbperhour", "totalsize"]);

function getFieldValue(row, field) {
  let key = FIELD_MAP[field] || field;
  if (field === "totalsize" && activeApp === "radarr") {
    key = "FileSizeGB";
  }
  return row?.[key];
}

function compareNumber(left, op, right) {
  if (!Number.isFinite(left)) return false;
  if (op === ">=") return left >= right;
  if (op === "<=") return left <= right;
  if (op === ">") return left > right;
  if (op === "<") return left < right;
  return left === right;
}

function parseAdvancedQuery(query) {
  const tokens = String(query ?? "").trim().split(/\s+/).filter(Boolean);
  const preds = [];
  const warnings = [];

  for (const token of tokens) {
    const comp = token.match(/^([a-zA-Z]+)(>=|<=|=|>|<)(.+)$/);
    if (comp) {
      const field = comp[1].toLowerCase();
      if (!NUMERIC_FIELDS.has(field)) {
        warnings.push(`Field '${field}' does not support numeric comparisons.`);
        preds.push(() => false);
        continue;
      }
      const val = Number(comp[3]);
      if (!Number.isFinite(val)) {
        warnings.push(`Invalid number for '${field}'.`);
        preds.push(() => false);
        continue;
      }
      preds.push(row => compareNumber(Number(getFieldValue(row, field)), comp[2], val));
      continue;
    }

    const idx = token.indexOf(":");
    if (idx > 0) {
      const field = token.slice(0, idx).toLowerCase();
      const value = token.slice(idx + 1);
      if (field === "audio") {
        preds.push(row => (
          matchPattern(getFieldValue(row, "AudioCodec"), value) ||
          matchPattern(getFieldValue(row, "AudioProfile"), value)
        ));
        continue;
      }
      if (BUCKET_FIELDS.has(field)) {
        const val = Number(value);
        if (!Number.isFinite(val)) {
          warnings.push(`Invalid number for '${field}'.`);
          preds.push(() => false);
          continue;
        }
        if (Number.isInteger(val)) {
          preds.push(row => {
            const num = Number(getFieldValue(row, field));
            return Number.isFinite(num) && num >= val && num < val + 1;
          });
          continue;
        }
        preds.push(row => compareNumber(Number(getFieldValue(row, field)), ">=", val));
        continue;
      }
      if (NUMERIC_FIELDS.has(field)) {
        const val = Number(value);
        if (!Number.isFinite(val)) {
          warnings.push(`Invalid number for '${field}'.`);
          preds.push(() => false);
          continue;
        }
        preds.push(row => compareNumber(Number(getFieldValue(row, field)), ">=", val));
        continue;
      }
      if (field === "videoquality") {
        if (value.includes("*") || value.includes("?")) {
          preds.push(row => matchPattern(getFieldValue(row, field), value));
        } else {
          const needle = normalizeToken(value);
          preds.push(row => normalizeToken(getFieldValue(row, field)).includes(needle));
        }
        continue;
      }
      if (field === "videocodec" || field === "videohdr") {
        if (value.includes("*") || value.includes("?")) {
          preds.push(row => matchPattern(getFieldValue(row, field), value));
        } else {
          const needle = normalizeToken(value);
          preds.push(row => normalizeToken(getFieldValue(row, field)).includes(needle));
        }
        continue;
      }
      if (!FIELD_MAP[field]) {
        warnings.push(`Unknown field '${field}'.`);
        preds.push(() => false);
        continue;
      }
      preds.push(row => matchPattern(getFieldValue(row, field), value));
      continue;
    }

    preds.push(row => matchPattern(getFieldValue(row, "Title"), token) || matchPattern(getFieldValue(row, "Path"), token));
  }

  return { preds, warnings };
}

function updateAdvancedWarnings(warnings) {
  if (!advancedWarnings) return;
  if (warnings.length === 0) {
    advancedWarnings.classList.add("hidden");
    advancedWarnings.textContent = "";
    return;
  }
  advancedWarnings.textContent = warnings.join(" ");
  advancedWarnings.classList.remove("hidden");
}

function applyFilters(data) {
  const useAdvanced = advancedEnabled;
  const advValue = String(advancedFilter?.value ?? "").trim();
  const chipValue = String(chipQuery ?? "").trim();

  if (useAdvanced) {
    if (advValue) {
      const parsed = parseAdvancedQuery(advValue);
      updateAdvancedWarnings(parsed.warnings);
      let filtered = (data || []).filter(row => parsed.preds.every(p => p(row)));
      if (chipValue) {
        const chips = parseAdvancedQuery(chipValue);
        filtered = filtered.filter(row => chips.preds.every(p => p(row)));
      }
      return filtered;
    }
    updateAdvancedWarnings([]);
    let filtered = data || [];
    if (chipValue) {
      const chips = parseAdvancedQuery(chipValue);
      filtered = filtered.filter(row => chips.preds.every(p => p(row)));
    }
    return filtered;
  }

  updateAdvancedWarnings([]);

  const titleValue = titleFilter?.value ?? "";
  const pathValue = pathFilter?.value ?? "";

  let filtered = (data || []).filter(row => {
    const titleOk = matchPattern(getFieldValue(row, "Title"), titleValue);
    const pathOk = matchPattern(getFieldValue(row, "Path"), pathValue);
    return titleOk && pathOk;
  });
  if (chipValue) {
    const chips = parseAdvancedQuery(chipValue);
    filtered = filtered.filter(row => chips.preds.every(p => p(row)));
  }
  return filtered;
}

function sortData(arr) {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...arr].sort((a, b) => {
    const av = a?.[sortKey];
    const bv = b?.[sortKey];

    const an = Number(av);
    const bn = Number(bv);
    const bothNum = Number.isFinite(an) && Number.isFinite(bn);

    if (bothNum) return (an - bn) * dir;

    const as = String(av ?? "").toLowerCase();
    const bs = String(bv ?? "").toLowerCase();
    if (as < bs) return -1 * dir;
    if (as > bs) return 1 * dir;
    return 0;
  });
}

const COLUMN_STORAGE_KEY = "Sortarr-columns";

function loadColumnPrefs() {
  if (!columnsPanel) return;
  let prefs = null;
  try {
    prefs = JSON.parse(localStorage.getItem(COLUMN_STORAGE_KEY) || "");
  } catch {
    prefs = null;
  }

  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    const col = input.getAttribute("data-col");
    if (prefs && Object.prototype.hasOwnProperty.call(prefs, col)) {
      input.checked = Boolean(prefs[col]);
    } else {
      input.checked = col !== "AudioProfile";
    }
  });
}

function saveColumnPrefs() {
  if (!columnsPanel) return;
  const prefs = {};
  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    const col = input.getAttribute("data-col");
    prefs[col] = input.checked;
  });
  localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(prefs));
}

function getHiddenColumns() {
  const hidden = new Set();
  if (!columnsPanel) return hidden;
  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    if (!input.checked) {
      hidden.add(input.getAttribute("data-col"));
    }
  });
  return hidden;
}
function updateColumnFilter() {
  if (!columnsPanel) return;
  const query = String(columnSearch?.value ?? "").trim().toLowerCase();
  columnsPanel.querySelectorAll(".column-row").forEach(row => {
    const label = row.textContent.toLowerCase();
    const show = !query || label.includes(query);
    row.style.display = show ? "" : "none";
  });

  columnsPanel.querySelectorAll(".column-group").forEach(group => {
    const app = group.getAttribute("data-app");
    if (app && app !== activeApp) {
      group.style.display = "none";
      return;
    }
    const rows = group.querySelectorAll(".column-row");
    const anyVisible = Array.from(rows).some(row => row.style.display !== "none");
    group.style.display = anyVisible ? "" : "none";
  });
}

function setAllColumns(checked) {
  if (!columnsPanel) return;
  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    input.checked = checked;
  });
  saveColumnPrefs();
  updateColumnVisibility();
}

function resetColumnPrefs() {
  localStorage.removeItem(COLUMN_STORAGE_KEY);
  loadColumnPrefs();
  updateColumnFilter();
  updateColumnVisibility();
}


function updateSortIndicators() {
  document.querySelectorAll("th[data-sort]").forEach(h => {
    h.classList.remove("active-sort");
    const i = h.querySelector(".sort-indicator");
    if (i) i.textContent = "";
  });

  const th = document.querySelector(`th[data-sort="${CSS.escape(sortKey)}"]`);
  if (!th) return;

  th.classList.add("active-sort");
  const ind = th.querySelector(".sort-indicator");
  if (ind) ind.textContent = sortDir === "asc" ? "^" : "v";
}

function updateColumnVisibility() {
  const hidden = getHiddenColumns();
  document.querySelectorAll("[data-col]").forEach(el => {
    if (columnsPanel && columnsPanel.contains(el)) return;
    const col = el.getAttribute("data-col");
    const app = el.getAttribute("data-app");
    const hideByApp = app && app !== activeApp;
    const hideByCol = hidden.has(col);
    el.classList.toggle("col-hidden", hideByApp || hideByCol);
  });
}

function updateChipVisibility() {
  const hiddenQueries = new Set();
  document.querySelectorAll(".chip-group").forEach(group => {
    const app = group.getAttribute("data-app");
    const hideGroup = app && app !== activeApp;
    group.classList.toggle("hidden", hideGroup);
    if (hideGroup) {
      group.querySelectorAll(".chip").forEach(btn => {
        const query = btn.getAttribute("data-query") || "";
        if (query) hiddenQueries.add(query);
        btn.classList.remove("active");
      });
    }
  });

  document.querySelectorAll(".chip").forEach(btn => {
    const app = btn.getAttribute("data-app");
    const hideChip = app && app !== activeApp;
    btn.classList.toggle("hidden", hideChip);
    if (hideChip) {
      const query = btn.getAttribute("data-query") || "";
      if (query) hiddenQueries.add(query);
      btn.classList.remove("active");
    }
  });

  if (!hiddenQueries.size) return false;
  const current = new Set((chipQuery || "").split(/\s+/).filter(Boolean));
  let changed = false;
  hiddenQueries.forEach(q => {
    if (current.delete(q)) changed = true;
  });
  if (changed) {
    chipQuery = Array.from(current).join(" ");
  }
  return changed;
}

function clearTable() {
  tbody.innerHTML = "";
}

function setActiveTab(app) {
  if (activeApp === app) return;

  activeApp = app;

  tabSonarr.classList.toggle("active", activeApp === "sonarr");
  tabRadarr.classList.toggle("active", activeApp === "radarr");

  // default sorts per tab
  if (activeApp === "sonarr") {
    sortKey = "AvgEpisodeSizeGB";
    sortDir = "desc";
  } else {
    sortKey = "GBPerHour";
    sortDir = "desc";
  }

  updateColumnVisibility();
  updateColumnFilter();
  updateSortIndicators();
  updateLastUpdatedDisplay();

  // clear filter per-tab
  if (titleFilter) titleFilter.value = "";
  if (pathFilter) pathFilter.value = "";
  if (advancedFilter) advancedFilter.value = "";
  setAdvancedMode(false);
  const chipsChanged = updateChipVisibility();

  if ((dataByApp[activeApp] || []).length) {
    render(dataByApp[activeApp]);
    if (chipsChanged) render(dataByApp[activeApp]);
    return;
  }

  // IMPORTANT: clear previous list and load new data immediately
  clearTable();
  load(false);
}

function sonarrSlugFromTitle(title) {
  // fallback if API doesn't provide TitleSlug
  return String(title ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildTitleLink(row) {
  if (activeApp === "sonarr") {
    const slug =
      row.TitleSlug ??
      row.titleSlug ??
      row.Slug ??
      row.slug ??
      sonarrSlugFromTitle(row.Title);

    if (!sonarrBase || !slug) return escapeHtml(row.Title);

    const url = `${sonarrBase.replace(/\/$/, "")}/series/${slug}`;
    return `<a class="title-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.Title)}</a>`;
  } else {
    // IMPORTANT: Radarr UI expects TMDB id for /movie/<id> in your setup
    const tmdbId = row.TmdbId ?? row.tmdbId;
    if (!radarrBase || !tmdbId) return escapeHtml(row.Title);

    const url = `${radarrBase.replace(/\/$/, "")}/movie/${tmdbId}`;
    return `<a class="title-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.Title)}</a>`;
  }
}

function render(data) {
  const filtered = applyFilters(data || []);
  const sorted = sortData(filtered);

  clearTable();

  for (const row of sorted) {
    const tr = document.createElement("tr");
    const audioCodec = formatMixedValue(row.AudioCodec ?? "", row.AudioCodecMixed);
    const rawAudioProfile = row.AudioProfile ?? "";
    const audioProfileValue = formatMixedValue(rawAudioProfile, row.AudioProfileMixed);
    const audioProfile = (rawAudioProfile || row.AudioProfileMixed)
      ? audioProfileValue
      : '<span class="muted">Not reported</span>';

    if (activeApp === "sonarr") {
      tr.innerHTML = `
        <td data-col="Title">${buildTitleLink(row)}</td>
        <td class="right" data-col="EpisodesCounted" data-app="sonarr">${row.EpisodesCounted ?? ""}</td>
        <td class="right" data-col="TotalSizeGB" data-app="sonarr">${row.TotalSizeGB ?? ""}</td>
        <td class="right" data-col="AvgEpisodeSizeGB" data-app="sonarr">${row.AvgEpisodeSizeGB ?? ""}</td>
        <td data-col="VideoQuality">${escapeHtml(row.VideoQuality ?? "")}</td>
        <td data-col="Resolution">${escapeHtml(row.Resolution ?? "")}</td>
        <td data-col="VideoCodec">${escapeHtml(row.VideoCodec ?? "")}</td>
        <td data-col="VideoHDR">${escapeHtml(row.VideoHDR ?? "")}</td>
        <td data-col="AudioCodec">${audioCodec}</td>
        <td data-col="AudioProfile">${audioProfile}</td>
        <td data-col="AudioChannels">${escapeHtml(row.AudioChannels ?? "")}</td>
        <td data-col="Path">${escapeHtml(row.Path ?? "")}</td>
      `;
    } else {
      tr.innerHTML = `
        <td data-col="Title">${buildTitleLink(row)}</td>
        <td class="right" data-col="RuntimeMins" data-app="radarr">${row.RuntimeMins ?? ""}</td>
        <td class="right" data-col="FileSizeGB" data-app="radarr">${row.FileSizeGB ?? ""}</td>
        <td class="right" data-col="GBPerHour" data-app="radarr">${row.GBPerHour ?? ""}</td>
        <td data-col="VideoQuality">${escapeHtml(row.VideoQuality ?? "")}</td>
        <td data-col="Resolution">${escapeHtml(row.Resolution ?? "")}</td>
        <td data-col="VideoCodec">${escapeHtml(row.VideoCodec ?? "")}</td>
        <td data-col="VideoHDR">${escapeHtml(row.VideoHDR ?? "")}</td>
        <td data-col="AudioCodec">${audioCodec}</td>
        <td data-col="AudioProfile">${audioProfile}</td>
        <td data-col="AudioChannels">${escapeHtml(row.AudioChannels ?? "")}</td>
        <td data-col="Path">${escapeHtml(row.Path ?? "")}</td>
      `;
    }

    tbody.appendChild(tr);
  }

  setStatus(`Loaded ${sorted.length} / ${data.length}`);
  updateColumnVisibility();
}

async function load(refresh) {
  const myToken = ++loadToken;

  try {
    const label = activeApp === "sonarr" ? "Loading Sonarr..." : "Loading Radarr...";
    setLoading(true, label);

    const base = activeApp === "sonarr" ? "/api/shows" : "/api/movies";
    const url = refresh ? `${base}?refresh=1` : base;

    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${txt}`);
    }

    const json = await res.json();

    // If user switched tabs while this request was in flight, ignore it
    if (myToken !== loadToken) return;

    dataByApp[activeApp] = json;
    render(dataByApp[activeApp]);
    lastUpdatedByApp[activeApp] = Date.now();
    updateLastUpdatedDisplay();
  } catch (e) {
    // Only show error if this is still the latest request
    if (myToken !== loadToken) return;
    setStatus(`Error: ${e.message}`);
    console.error(e);
  } finally {
    if (myToken === loadToken) {
      setLoading(false);
    }
  }
}

/* sorting clicks */
document.querySelectorAll("th[data-sort]").forEach(th => {
  th.style.cursor = "pointer";
  th.addEventListener("click", () => {
    const key = th.getAttribute("data-sort");

    // ignore clicks on columns that are not for the active tab
    const app = th.getAttribute("data-app");
    if (app && app !== activeApp) return;

    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = "desc";
    }

    updateSortIndicators();
    render(dataByApp[activeApp] || []);
  });
});

/* tabs */
tabSonarr.addEventListener("click", () => setActiveTab("sonarr"));
tabRadarr.addEventListener("click", () => setActiveTab("radarr"));

/* export */
exportCsvBtn.addEventListener("click", () => {
  const url = activeApp === "sonarr" ? "/api/shows.csv" : "/api/movies.csv";
  window.location.href = url;
});

/* buttons */
if (loadBtn) {
  loadBtn.addEventListener("click", () => load(false));
}
if (refreshBtn) {
  refreshBtn.addEventListener("click", () => load(true));
}

function setAdvancedMode(enabled) {
  advancedEnabled = enabled;
  if (advancedToggle) {
    advancedToggle.setAttribute("aria-pressed", enabled ? "true" : "false");
  }
  if (filterInputs) filterInputs.classList.toggle("advanced-on", enabled);
  if (advancedHelpBtn) advancedHelpBtn.classList.toggle("hidden", !enabled);
  if (titleFilter) titleFilter.disabled = enabled;
  if (pathFilter) pathFilter.disabled = enabled;
  if (advancedFilter) advancedFilter.disabled = !enabled;
  if (!enabled && advancedFilter) advancedFilter.value = "";
  if (!enabled && advancedHelp) advancedHelp.classList.add("hidden");
  if (!enabled && advancedWarnings) updateAdvancedWarnings([]);
}

if (titleFilter) {
  titleFilter.addEventListener("input", () => render(dataByApp[activeApp] || []));
}

if (pathFilter) {
  pathFilter.addEventListener("input", () => render(dataByApp[activeApp] || []));
}

if (advancedFilter) {
  advancedFilter.addEventListener("input", () => render(dataByApp[activeApp] || []));
}

if (advancedToggle) {
  advancedToggle.addEventListener("click", () => {
    setAdvancedMode(!advancedEnabled);
    render(dataByApp[activeApp] || []);
  });
}

if (advancedHelpBtn) {
  advancedHelpBtn.addEventListener("click", () => {
    if (!advancedHelp) return;
    advancedHelp.classList.toggle("hidden");
  });
}

document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => {
    const query = btn.getAttribute("data-query") || "";
    if (!query) return;
    const next = new Set((chipQuery || "").split(/\s+/).filter(Boolean));
    if (next.has(query)) {
      next.delete(query);
      btn.classList.remove("active");
    } else {
      next.add(query);
      btn.classList.add("active");
    }
    chipQuery = Array.from(next).join(" ");
    render(dataByApp[activeApp] || []);
  });
});

if (columnsBtn && columnsPanel) {
  columnsBtn.addEventListener("click", e => {
    e.stopPropagation();
    const nowHidden = columnsPanel.classList.toggle("hidden");
    if (!nowHidden) {
      updateColumnFilter();
      columnSearch?.focus();
    }
  });

  columnsPanel.addEventListener("click", e => {
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    columnsPanel.classList.add("hidden");
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      columnsPanel.classList.add("hidden");
    }
  });

  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    input.addEventListener("change", () => {
      saveColumnPrefs();
      updateColumnVisibility();
    });
  });

  if (columnSearch) {
    columnSearch.addEventListener("input", () => updateColumnFilter());
  }

  if (columnsShowAll) {
    columnsShowAll.addEventListener("click", () => {
      setAllColumns(true);
      updateColumnFilter();
    });
  }

  if (columnsHideAll) {
    columnsHideAll.addEventListener("click", () => {
      setAllColumns(false);
      updateColumnFilter();
    });
  }

  if (columnsReset) {
    columnsReset.addEventListener("click", () => {
      resetColumnPrefs();
      updateColumnFilter();
    });
  }
}


/* theme */
function setTheme(theme) {
  root.setAttribute("data-theme", theme);
  localStorage.setItem("Sortarr-theme", theme);

  // button shows what you switch TO
  themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";

  if (logoEl) {
    logoEl.src = theme === "dark" ? "/static/logo.svg" : "/static/logo-light.svg";
  }
}

const savedTheme = localStorage.getItem("Sortarr-theme") || "dark";
setTheme(savedTheme);

themeBtn.addEventListener("click", () => {
  const current = root.getAttribute("data-theme") || "dark";
  setTheme(current === "dark" ? "light" : "dark");
});

/* config load for link bases */
async function loadConfig() {
  try {
    const res = await fetch("/api/config");
    if (!res.ok) return;
    const cfg = await res.json();
    sonarrBase = cfg.sonarr_url || "";
    radarrBase = cfg.radarr_url || "";
  } catch (e) {
    console.warn("config load failed", e);
  }
}

/* init */
(async function init() {
  loadColumnPrefs();
  updateColumnFilter();
  updateColumnVisibility();
  updateChipVisibility();
  updateLastUpdatedDisplay();
  updateSortIndicators();
  setAdvancedMode(false);
  await loadConfig();
  await load(false);
})();


