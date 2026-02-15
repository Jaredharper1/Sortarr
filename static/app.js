(function () {
  const ua = (navigator.userAgent || "").toLowerCase();

  const isIOS =
    /ipad|iphone|ipod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isSafari =
    ua.includes("safari") &&
    !ua.includes("chrome") &&
    !ua.includes("chromium") &&
    !ua.includes("edg") &&
    !ua.includes("opr") &&
    !ua.includes("android");

  const isAndroid = ua.includes("android");
  const isFirefox = ua.includes("firefox");
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;

  const root = document.documentElement;
  if (isIOS) root.classList.add("is-ios");
  if (isAndroid) root.classList.add("is-android");
  if (isSafari) root.classList.add("is-safari");
  if (isFirefox) root.classList.add("is-firefox");
  if (isCoarse) root.classList.add("is-coarse");
})();


const tbody = document.getElementById("tbody");
const statusEl = document.getElementById("status");
const effectiveSourcesEl = document.getElementById("effectiveSources");
const loadingIndicator = document.getElementById("loadingIndicator");
const lastUpdatedEl = document.getElementById("lastUpdated");
const loadBtn = document.getElementById("loadBtn");
const refreshTabBtn = document.getElementById("refreshTabBtn");
const progressStatusEl = document.getElementById("progressStatus");
const tautulliStatusEl = document.getElementById("tautulliStatus");
const cacheStatusEl = document.getElementById("cacheStatus");
const healthBadgesEl = document.getElementById("healthBadges");
const STATUS_VALUE_ELS = [progressStatusEl, tautulliStatusEl, cacheStatusEl].filter(Boolean);
const healthStatusRowEl = document.getElementById("healthStatusRow");
const statusRowEl = document.getElementById("statusRow");
const statusCompleteNoteEl = document.getElementById("statusCompleteNote");
const statusPillEl = document.getElementById("statusPill");
const partialBannerEl = document.getElementById("partialBanner");
const fastModeBannerEl = document.getElementById("fastModeBanner");
const playbackLabelEls = document.querySelectorAll("[data-playback-label]");
const playbackTitleEls = document.querySelectorAll("[data-playback-title]");
const playbackMatchTitleEls = document.querySelectorAll("[data-playback-match-title]");
const refreshTautulliBtn = document.getElementById("refreshTautulliBtn");
const deepRefreshTautulliBtn = document.getElementById("deepRefreshTautulliBtn");
const refreshSonarrBtn = document.getElementById("refreshSonarrBtn");
const refreshRadarrBtn = document.getElementById("refreshRadarrBtn");
const arrRefreshButtonsEl = document.getElementById("arrRefreshButtons");
const plexInsightsBtn = document.getElementById("plexInsightsBtn");
const mismatchCenterBtn = document.getElementById("mismatchCenterBtn");
const clearCachesBtn = document.getElementById("clearCachesBtn");
const resetUiBtn = document.getElementById("resetUiBtn");
const settingsBtn = document.getElementById("settingsBtn");
const titleFilter = document.getElementById("titleFilter");
const pathFilter = document.getElementById("pathFilter");
const filterInputs = document.getElementById("filterInputs");
const simpleFilters = document.getElementById("simpleFilters");
const advancedToggle = document.getElementById("advancedToggle");
const advancedFilter = document.getElementById("advancedFilter");
const advancedHelpBtn = document.getElementById("advancedHelpBtn");
const advancedHelp = document.getElementById("advancedHelp");
const advancedWarnings = document.getElementById("advancedWarnings");
const filterBuilder = document.getElementById("filterBuilder");
const instanceChipsSonarr = document.getElementById("instanceChipsSonarr");
const instanceChipsRadarr = document.getElementById("instanceChipsRadarr");
const chipWrapEl = document.querySelector(".chip-wrap");
const chipsToggle = document.getElementById("chipsToggle");
const filterCategory = document.getElementById("filterCategory");
const filterCondition = document.getElementById("filterCondition");
const filterValueInput = document.getElementById("filterValueInput");
const filterValueSelect = document.getElementById("filterValueSelect");
const filterAddBtn = document.getElementById("filterAddBtn");
const activeFiltersEl = document.getElementById("activeFilters");
const plexLibraryScopeEl = document.getElementById("plexLibraryScope");
const plexLibrarySelect = document.getElementById("plexLibrarySelect");
const plexLibraryAllBtn = document.getElementById("plexLibraryAllBtn");

const tabSonarr = document.getElementById("tabSonarr");
const tabRadarr = document.getElementById("tabRadarr");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const columnsBtn = document.getElementById("columnsBtn");
const columnsPanel = document.getElementById("columnsPanel");

function setColumnsPanelHiddenState(hidden) {
  if (!columnsBtn || !columnsPanel) return;
  columnsPanel.classList.toggle("hidden", hidden);
  columnsPanel.setAttribute("aria-hidden", hidden ? "true" : "false");
  columnsBtn.setAttribute("aria-expanded", hidden ? "false" : "true");
}

function closeColumnsPanelIfOpen() {
  if (!columnsPanel || columnsPanel.classList.contains("hidden")) return;
  setColumnsPanelHiddenState(true);
}
const columnSearch = document.getElementById("columnSearch");
const columnsShowAll = document.getElementById("columnsShowAll");
const columnsHideAll = document.getElementById("columnsHideAll");
const columnsReset = document.getElementById("columnsReset");
const csvColumnsToggle = document.getElementById("csvColumnsToggle");
const filtersToggleBtn = document.getElementById("filtersToggleBtn");
const filtersEl = document.getElementById("filtersPanel");

const logoEl = document.getElementById("brandLogo");
const themeBtn = document.getElementById("themeBtn");
const tableFullscreenBtn = document.getElementById("tableFullscreenBtn");
const root = document.documentElement; // <html>
const IS_IOS = root.classList.contains("is-ios");
const IS_ANDROID = root.classList.contains("is-android");
const tableEl = document.querySelector("table");
const tableWrapEl = document.getElementById("tableWrap");
const TABLE_SCROLL_SNAP_IDLE_MS = 140;
const TABLE_SCROLL_SNAP_EPSILON = 4;
const TABLE_SCROLL_SNAP_MIN_MS = 140;
const TABLE_SCROLL_SNAP_MAX_MS = 260;
const TABLE_SCROLL_SNAP_BOTTOM_EPSILON = 6;
const TABLE_SCROLL_ANCHOR_LOCK_MS = 420;
const I18N = window.I18N || {};
window.I18N = I18N;

function sourceLabelFromKey(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "arr") return t("sourceArr", "Sonarr/Radarr");
  if (key === "plex") return t("sourcePlex", "Plex");
  if (key === "tautulli") return t("sourceTautulli", "Tautulli");
  if (key === "jellystat") return t("sourceJellystat", "Jellystat");
  if (key === "auto") return t("sourceAuto", "Auto");
  return key || t("sourceNone", "None");
}

function normalizeIdList(values) {
  const out = [];
  const seen = new Set();
  const list = Array.isArray(values) ? values : [];
  for (const value of list) {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function parseIdList(raw) {
  if (Array.isArray(raw)) return normalizeIdList(raw);
  const text = String(raw || "").trim();
  if (!text) return [];
  return normalizeIdList(text.split(/[,\s;]+/g));
}

function getPlexAvailableForApp(app) {
  return Array.isArray(plexLibraryState.available[app]) ? plexLibraryState.available[app] : [];
}

function getPlexSelectedForApp(app) {
  return Array.isArray(plexLibraryState.selected[app]) ? plexLibraryState.selected[app] : [];
}

function savePlexLibrarySelection() {
  try {
    localStorage.setItem(
      PLEX_LIBRARY_SELECTION_KEY,
      JSON.stringify({
        sonarr: getPlexSelectedForApp("sonarr"),
        radarr: getPlexSelectedForApp("radarr"),
      }),
    );
  } catch {
  }
}

function loadPlexLibrarySelection() {
  try {
    const raw = JSON.parse(localStorage.getItem(PLEX_LIBRARY_SELECTION_KEY) || "{}");
    plexLibraryState.selected.sonarr = normalizeIdList(raw?.sonarr || []);
    plexLibraryState.selected.radarr = normalizeIdList(raw?.radarr || []);
  } catch {
    plexLibraryState.selected.sonarr = [];
    plexLibraryState.selected.radarr = [];
  }
}

function setPlexAvailableForApp(app, libraries) {
  const list = Array.isArray(libraries) ? libraries : [];
  const normalized = [];
  const seen = new Set();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const id = String(item.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push({
      id,
      title: String(item.title || id),
      type: String(item.type || "").trim().toLowerCase(),
    });
  }
  plexLibraryState.available[app] = normalized;
  configState.plexLibraries[app] = normalized;
  const allowed = new Set(normalized.map(item => item.id));
  if (allowed.size) {
    plexLibraryState.selected[app] = getPlexSelectedForApp(app).filter(id => allowed.has(id));
  }
}

function setPlexSelectedForApp(app, ids, { persist = true } = {}) {
  const selected = normalizeIdList(ids);
  const available = getPlexAvailableForApp(app);
  if (available.length) {
    const allowed = new Set(available.map(item => item.id));
    plexLibraryState.selected[app] = selected.filter(id => allowed.has(id));
  } else {
    plexLibraryState.selected[app] = selected;
  }
  if (persist) savePlexLibrarySelection();
}

function getPlexScopeParams(app, key = "plex_library_ids") {
  const selected = getPlexSelectedForApp(app);
  if (!selected.length) return [];
  return [`${key}=${encodeURIComponent(selected.join(","))}`];
}

function plexScopeEnabledForApp(app) {
  if (!configState.plexConfigured) return false;
  const selected = (configState.optionSelected || {}).media_source;
  if (String(selected || "").toLowerCase() !== "plex") return false;
  return app === "sonarr" ? configState.sonarrConfigured : configState.radarrConfigured;
}

function formatPlexScopeLabel(app) {
  if (!plexScopeEnabledForApp(app)) return "";
  const selected = getPlexSelectedForApp(app);
  if (!selected.length) return t("plexLibrariesAll", "Libraries: All");
  const available = getPlexAvailableForApp(app);
  const byId = new Map(available.map(item => [item.id, item.title || item.id]));
  const labels = selected.map(id => byId.get(id) || id);
  return tp("plexLibrariesScoped", { libraries: labels.join(", ") }, "Libraries: %(libraries)s");
}

function updatePlexLibraryScopeControl() {
  if (!plexLibraryScopeEl || !plexLibrarySelect) return;
  const enabled = plexScopeEnabledForApp(activeApp);
  setElementVisible(plexLibraryScopeEl, enabled);
  if (!enabled) return;
  plexLibraryScopeEl.setAttribute("data-app", activeApp);
  const available = getPlexAvailableForApp(activeApp);
  const selected = new Set(getPlexSelectedForApp(activeApp));
  plexLibrarySelect.innerHTML = "";
  for (const item of available) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.title || item.id;
    option.selected = selected.has(item.id);
    plexLibrarySelect.appendChild(option);
  }
  if (plexLibraryAllBtn) {
    plexLibraryAllBtn.textContent = t("plexLibrariesSelectAll", "All");
  }
}

function applyPlexScopeFromHeaders(app, headers) {
  if (!headers) return;
  const rawLibraries = headers.get("X-Sortarr-Plex-Libraries") || "";
  if (rawLibraries) {
    try {
      const parsed = JSON.parse(rawLibraries);
      setPlexAvailableForApp(app, parsed);
    } catch {
    }
  }
  const selected = parseIdList(headers.get("X-Sortarr-Plex-Library-Ids-Selected") || "");
  if (selected.length || rawLibraries) {
    setPlexSelectedForApp(app, selected, { persist: false });
  }
}

function applyPlexScopeFromStatus(scopePayload) {
  const plex = scopePayload?.plex;
  if (!plex || typeof plex !== "object") return;
  const available = plex.available || {};
  setPlexAvailableForApp("sonarr", available.sonarr || []);
  setPlexAvailableForApp("radarr", available.radarr || []);
  const selected = plex.selected || {};
  setPlexSelectedForApp("sonarr", selected.sonarr || getPlexSelectedForApp("sonarr"), { persist: false });
  setPlexSelectedForApp("radarr", selected.radarr || getPlexSelectedForApp("radarr"), { persist: false });
}

function capabilityEnabled(name, fallback = true) {
  const caps = (configState && configState.optionCapabilities) || {};
  const value = caps[name];
  if (value === undefined || value === null) return !!fallback;
  return !!value;
}

function setElementVisible(el, visible) {
  if (!el) return;
  el.classList.toggle("hidden", !visible);
  el.style.display = visible ? "" : "none";
}

function updateEffectiveSourcesLine() {
  if (!effectiveSourcesEl) return;
  const selected = (configState && configState.optionSelected) || {};
  const media = sourceLabelFromKey(selected.media_source);
  const history = sourceLabelFromKey(selected.history_source);
  let text = `${t("effectiveSourcesLabel", "Effective sources")}: ${tp("effectiveSourcesValue", { media, history }, "Media: %(media)s | History: %(history)s")}`;
  const scope = formatPlexScopeLabel(activeApp);
  if (scope) {
    text += ` | ${scope}`;
  }
  effectiveSourcesEl.textContent = text;
}

function updateMismatchCenterButtonVisibility() {
  if (!mismatchCenterBtn) return;
  const available = Array.isArray(configState.historySourcesAvailable)
    ? configState.historySourcesAvailable
    : [];
  const supported = available.filter(provider => provider === "tautulli" || provider === "plex" || provider === "jellystat");
  mismatchCenterBtn.classList.toggle("hidden", supported.length < 2);
}
function applyOptionSetCapabilities() {
  const arrTables = capabilityEnabled("arr_tables", configState.sonarrConfigured || configState.radarrConfigured);
  const cacheActions = capabilityEnabled("cache_actions", arrTables);
  const refreshActions = capabilityEnabled("arr_refresh", arrTables);
  setElementVisible(arrRefreshButtonsEl, arrTables && refreshActions);
  setElementVisible(refreshTabBtn, arrTables && refreshActions);
  setElementVisible(clearCachesBtn, cacheActions);
  setElementVisible(tabSonarr, arrTables && !!configState.sonarrConfigured);
  setElementVisible(tabRadarr, arrTables && !!configState.radarrConfigured);

  if (!arrTables && tbody) {
    const message = configState.plexConfigured
      ? t("noArrMediaSourcePlexAvailable", "No Sonarr/Radarr media source configured. Plex features are available.")
      : t("noMediaSourceConfigured", "No media source configured. Open Setup to configure Sonarr, Radarr, or Plex.");
    tbody.innerHTML = `<tr><td colspan="99">${escapeHtml(message)}</td></tr>`;
  }
  updatePlexLibraryScopeControl();
  updateEffectiveSourcesLine();
}


let tableUnfullscreenBtn = null;

function syncTableUnfullscreenBtnHost() {
  if (!tableUnfullscreenBtn) return;
  if (tableUnfullscreenBtn.parentNode !== document.body) {
    document.body.appendChild(tableUnfullscreenBtn);
  }
}

function ensureTableUnfullscreenBtn() {
  if (tableUnfullscreenBtn) return tableUnfullscreenBtn;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "table-unfullscreen-btn";
  btn.id = "tableUnfullscreenBtn";
  btn.textContent = "✕";
  btn.title = t("Exit fullscreen", "Exit fullscreen");
  btn.setAttribute("aria-label", t("Exit fullscreen", "Exit fullscreen"));

  btn.addEventListener("click", () => {
    setTableFullscreenEnabled(false);
    if (document.fullscreenElement) {
      exitTrueFullscreenIfPossible();
      return;
    }
    applyTableFullscreen(false);
  });

  tableUnfullscreenBtn = btn;
  syncTableUnfullscreenBtnHost();
  return btn;
}


const TABLE_FULLSCREEN_STORAGE_KEY = "Sortarr-table-fullscreen";

function isTableFullscreenEnabled() {
  try {
    return localStorage.getItem(TABLE_FULLSCREEN_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function setTableFullscreenEnabled(enabled) {
  try {
    localStorage.setItem(TABLE_FULLSCREEN_STORAGE_KEY, enabled ? "1" : "0");
  } catch { }
}

function measureTableFullscreenTop() {
  const toolbar = document.querySelector(".toolbar");
  if (!toolbar) return 0;
  const rect = toolbar.getBoundingClientRect();
  // Keep a small breathing room so the table header isn't glued to the toolbar border.
  return Math.max(0, Math.round(rect.bottom + 8));
}

function applyTableFullscreen(enabled) {
  ensureTableUnfullscreenBtn();
  syncTableUnfullscreenBtnHost();

  if (enabled) {
    closeColumnsPanelIfOpen();
  }
  root.classList.toggle("table-fullscreen", enabled);

  // Toolbar is hidden in fullscreen, so table should start at top of viewport.
  const topPx = enabled ? 0 : measureTableFullscreenTop();
  root.style.setProperty("--table-fullscreen-top", `${topPx}px`);

  // IMPORTANT: when fullscreen, remove JS max-height clamps
  if (tableWrapEl) {
    tableWrapEl.style.maxHeight = enabled ? "" : tableWrapEl.style.maxHeight;
  }

  scheduleTableWrapLayout();
}

function canUseElementFullscreen() {
  const el = document.documentElement;
  return !!(document.fullscreenEnabled && el && el.requestFullscreen);
}

async function enterTrueFullscreenIfPossible() {
  if (!canUseElementFullscreen()) return false;
  if (IS_IOS) return false; // iOS Safari unreliable

  try {
    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    return true;
  } catch {
    return false;
  }
}

async function exitTrueFullscreenIfPossible() {
  if (!document.fullscreenElement) return;
  try { await document.exitFullscreen(); } catch { }
}

document.addEventListener("fullscreenchange", () => {
  const isFs = !!document.fullscreenElement;
  setTableFullscreenEnabled(isFs);
  applyTableFullscreen(isFs);
  try { syncHistoryOverlayHost(); } catch { }
});


if (progressStatusEl) {
  progressStatusEl.addEventListener("click", (e) => {
    const link = e.target && e.target.closest
      ? e.target.closest('a[data-progress-token]')
      : null;
    if (!link) return;

    const tok = link.getAttribute("data-progress-token") || "";
    console.log("[progressStatus click]", tok);

    e.preventDefault();
    applyProgressStatusFilter(tok);
  }, { passive: false });
}


function lockPageZoomIOSButAllowTableCustomZoom() {
  if (!IS_IOS) return;

  const isInTable = (target) =>
    Boolean(tableWrapEl && target && tableWrapEl.contains(target));

  // 1) Kill iOS native pinch zoom / gesture zoom everywhere.
  // This prevents "whole page zoom" even when the pinch starts on the table.
  ["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
    document.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
      },
      { passive: false, capture: true }
    );
  });

  // 2) Also block the two-finger touch fallback (some iOS builds zoom via touchmove).
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches && e.touches.length === 2 && !isInTable(e.target)) {
        e.preventDefault();
      }
      // If the pinch is in the table, your existing wrap touch handlers
      // already preventDefault and apply custom scale().
    },
    { passive: false, capture: true }
  );

  // 3) Block double-tap-to-zoom outside the table (optional, but usually desired)
  let lastTap = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      if (isInTable(e.target)) return;
      if (!e.changedTouches || e.changedTouches.length !== 1) return;

      const now = Date.now();
      if (now - lastTap < 320) {
        e.preventDefault();
        lastTap = 0;
      } else {
        lastTap = now;
      }
    },
    { passive: false, capture: true }
  );
}

function focusNoScroll(el) {
  if (!el) return;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
}


function t(key, fallback, vars) {
  const dict = window.I18N || {};
  let s = (dict[key] !== undefined && dict[key] !== null)
    ? dict[key]
    : (fallback !== undefined ? fallback : key);

  if (!vars) return s;

  return String(s).replace(/%\(([^)]+)\)s/g, (_, name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) return String(vars[name]);
    return `%(${name})s`;
  });
}

function tp(key, params, fallback) {
  return t(key, fallback, params);
}

function withWrapScrollLock(fn) {
  const wrap = document.querySelector(".table-wrap");
  if (!wrap) return fn();
  const x = wrap.scrollLeft;
  const y = wrap.scrollTop;
  fn();
  requestAnimationFrame(() => {
    wrap.scrollLeft = x;
    wrap.scrollTop = y;
  });
}




// Perf overlay (Phase 0)
const PERF_OVERLAY_STORAGE_KEY = "Sortarr-perf-overlay";
function isPerfOverlayEnabled() {
  try {
    return localStorage.getItem(PERF_OVERLAY_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function setPerfOverlayEnabled(enabled) {
  try {
    localStorage.setItem(PERF_OVERLAY_STORAGE_KEY, enabled ? "1" : "0");
  } catch { }
}

let perfOverlay = null;
const perfOverlayState = {
  enabled: false,
  fps: 0,
  frames: 0,
  lastFpsAt: 0,
  longTasks: 0,
  lastLongTaskAt: 0,
  lastRenderMs: null,
  lastRowsTotal: 0,
  lastRowsVisible: 0,
  lastDomRows: 0,
  lastDomCells: 0,
};

function initPerfOverlay() {
  if (perfOverlay) return;
  perfOverlayState.enabled = isPerfOverlayEnabled();
  const el = document.createElement("div");
  el.id = "perfOverlay";
  el.className = "perf-overlay hidden";
  el.innerHTML = `
    <div class="perf-overlay__row"><strong>${t('Perf')}</strong> <span id="perfOverlayState"></span></div>
    <div class="perf-overlay__row">${t('FPS')}: <span id="perfOverlayFps">0</span> | ${t('Long tasks')}: <span id="perfOverlayLong">0</span></div>
    <div class="perf-overlay__row">${t('Render')}: <span id="perfOverlayRender">-</span> ms</div>
    <div class="perf-overlay__row">${t('Rows')}: <span id="perfOverlayRows">-</span></div>
    <div class="perf-overlay__row">${t('DOM')}: <span id="perfOverlayDom">-</span></div>
    <div class="perf-overlay__row perf-overlay__hint">${t('Toggle')}: Ctrl+Shift+P</div>
  `;

  document.body.appendChild(el);
  perfOverlay = el;

  // Long tasks (best-effort)
  try {
    if ("PerformanceObserver" in window) {
      const obs = new PerformanceObserver(list => {
        const entries = list.getEntries();
        if (entries && entries.length) {
          perfOverlayState.longTasks += entries.length;
          perfOverlayState.lastLongTaskAt = Date.now();
          schedulePerfOverlayUpdate();
        }
      });
      // "longtask" is not supported everywhere.
      obs.observe({ entryTypes: ["longtask"] });
    }
  } catch { }

  // FPS loop
  const tick = (ts) => {
    if (!perfOverlay) return;
    if (!perfOverlayState.lastFpsAt) perfOverlayState.lastFpsAt = ts;
    perfOverlayState.frames += 1;
    const dt = ts - perfOverlayState.lastFpsAt;
    if (dt >= 500) {
      perfOverlayState.fps = Math.round((perfOverlayState.frames * 1000) / dt);
      perfOverlayState.frames = 0;
      perfOverlayState.lastFpsAt = ts;
      schedulePerfOverlayUpdate();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  applyPerfOverlayVisibility();
  schedulePerfOverlayUpdate();
}

function applyPerfOverlayVisibility() {
  if (!perfOverlay) return;
  perfOverlayState.enabled = isPerfOverlayEnabled();
  perfOverlay.classList.toggle("hidden", !perfOverlayState.enabled);
}

let perfOverlayFrame = null;
function schedulePerfOverlayUpdate() {
  if (!perfOverlay || !perfOverlayState.enabled) return;
  if (perfOverlayFrame) return;
  perfOverlayFrame = requestAnimationFrame(() => {
    perfOverlayFrame = null;
    updatePerfOverlay();
  });
}

function updatePerfOverlay() {
  if (!perfOverlay || !perfOverlayState.enabled) return;
  const s = perfOverlayState;
  const stateEl = document.getElementById("perfOverlayState");
  const fpsEl = document.getElementById("perfOverlayFps");
  const longEl = document.getElementById("perfOverlayLong");
  const renderEl = document.getElementById("perfOverlayRender");
  const rowsEl = document.getElementById("perfOverlayRows");
  const domEl = document.getElementById("perfOverlayDom");
  if (stateEl) stateEl.textContent = "";
  if (fpsEl) fpsEl.textContent = String(s.fps || 0);
  if (longEl) longEl.textContent = String(s.longTasks || 0);
  if (renderEl) renderEl.textContent = s.lastRenderMs == null ? "-" : String(Math.round(s.lastRenderMs));
  if (rowsEl) rowsEl.textContent = `${s.lastRowsVisible} visible / ${s.lastRowsTotal} total`;
  if (domEl) domEl.textContent = `${s.lastDomRows} rows, ${s.lastDomCells} cells`;
}

// Keyboard toggle
document.addEventListener("keydown", (e) => {
  if (!e) return;
  if (e.ctrlKey && e.shiftKey && (e.key === "P" || e.key === "p")) {
    e.preventDefault();
    setPerfOverlayEnabled(!isPerfOverlayEnabled());
    initPerfOverlay();
    applyPerfOverlayVisibility();
    schedulePerfOverlayUpdate();
  }
}, { passive: false });

const TABLE_SCROLL_ANCHOR_MAX_FRAMES = 90;
let tableScrollSnapTimer = null;
let tableScrollSnapInProgress = false;
let lastTableScrollTop = 0;
let tableScrollSnapAnimFrame = null;
let tableScrollSnapLocked = false;
let tableScrollSnapIgnoreUntil = 0;
let pendingScrollAnchor = null;
let scrollAnchorFrame = null;
let tableLayoutFrame = null;
let tableLayoutForce = false;
let tableLayoutSkipIfUnchanged = false;
let lastTableWrapSize = { width: 0, height: 0 };
let chipGroupLayoutPending = false;
let tableHasFocus = false;
let selectedRowEl = null;
let selectedSeasonRowEl = null;
let selectedEpisodeRowEl = null;
let pointerSelectionEnabled = true;
let tableTouchActive = false;
let tableTouchActiveTimer = null;

function setTableTouchActive(active) {
  tableTouchActive = active;
  if (!active) return;
  if (tableTouchActiveTimer) window.clearTimeout(tableTouchActiveTimer);
  tableTouchActiveTimer = window.setTimeout(() => {
    tableTouchActive = false;
    tableTouchActiveTimer = null;
  }, 200);
}

const keyboardNavState = {
  level: "rows",
  rowIndex: -1,
  seriesRowKey: "",
  seriesKey: "",
  seasonIndex: -1,
  seasonNumber: "",
  episodeIndex: -1,
};
const appEl = document.querySelector(".app");
// Build API URLs without embedded credentials (basic-auth URLs break fetch).
const API_ORIGIN = window.location && window.location.host
  ? `${window.location.protocol}//${window.location.host}`
  : "";

let tableWrapLayoutPending = false;
let lastTableWrapLayoutSignature = "";
let lastAppliedTableWrapMaxHeight = "";
let firstPaintSettled = false;
let deferredUiBindingsReady = false;
let deferredUiBindingsScheduled = false;
const FILTER_RENDER_DEBOUNCE_MS = 140;
const FILTER_RENDER_DEBOUNCE_MS_MOBILE_RADARR = 500;
let filterRenderTimer = null;
const CHIP_RENDER_DEBOUNCE_MS_MOBILE_RADARR = 500;
let chipRenderTimer = null;
let chipRenderAnchor = null;

function scheduleFilterRender() {
  if (filterRenderTimer) {
    window.clearTimeout(filterRenderTimer);
  }
  const debounce = (IS_MOBILE && activeApp === "radarr")
    ? FILTER_RENDER_DEBOUNCE_MS_MOBILE_RADARR
    : FILTER_RENDER_DEBOUNCE_MS;
  filterRenderTimer = window.setTimeout(() => {
    filterRenderTimer = null;
    render(dataByApp[activeApp] || []);
  }, debounce);
}

function flushFilterRender() {
  if (filterRenderTimer) {
    window.clearTimeout(filterRenderTimer);
    filterRenderTimer = null;
  }
  render(dataByApp[activeApp] || []);
}

function scheduleChipRender(anchor) {
  if (chipRenderTimer) {
    window.clearTimeout(chipRenderTimer);
  }
  if (anchor) {
    chipRenderAnchor = anchor;
  }
  const debounce = (IS_MOBILE && activeApp === "radarr")
    ? CHIP_RENDER_DEBOUNCE_MS_MOBILE_RADARR
    : 0;
  chipRenderTimer = window.setTimeout(() => {
    chipRenderTimer = null;
    const scrollAnchor = chipRenderAnchor;
    chipRenderAnchor = null;
    render(dataByApp[activeApp] || [], { scrollAnchor });
  }, debounce);
}

function bindFilterInput(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    scheduleFilterRender();
    scheduleViewStateSave();
  });
  input.addEventListener("blur", () => {
    flushFilterRender();
    flushViewStateSave();
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      flushFilterRender();
      flushViewStateSave();
    }
  });
}

function getFilterBuilderFields() {
  return FILTER_BUILDER_FIELDS.filter(field => {
    if (field.tautulli && !tautulliEnabled) return false;
    if (field.id === "instance") {
      const instances = instanceConfig[activeApp] || [];
      if (instances.length <= 1) return false;
    }
    if (!field.app) return true;
    if (Array.isArray(field.app)) return field.app.includes(activeApp);
    return field.app === activeApp;
  });
}

function shouldUseNativeSelects() {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

let activeCustomSelectState = null;
let customSelectPositionPending = false;

function ensureCustomSelectPortal(state) {
  if (!state?.menu || !document.body) return;
  if (state.menu.parentNode !== document.body) {
    document.body.appendChild(state.menu);
  }
}

function positionCustomSelectMenu(state) {
  if (!state?.menu || state.menu.classList.contains("hidden")) return;
  const rect = state.trigger?.getBoundingClientRect();
  if (!rect || (!rect.width && !rect.height)) return;

  const menu = state.menu;
  const padding = 8;
  const gap = 6;
  const viewportWidth = window.innerWidth || 0;
  const viewportHeight = window.innerHeight || 0;

  let width = rect.width;
  let left = rect.left;
  if (left + width > viewportWidth - padding) {
    left = Math.max(padding, viewportWidth - padding - width);
  }
  if (left < padding) {
    left = padding;
  }

  let top = rect.bottom + gap;
  let maxHeight = viewportHeight - padding - top;
  if (maxHeight < 160) {
    const aboveSpace = rect.top - gap - padding;
    if (aboveSpace > maxHeight) {
      maxHeight = aboveSpace;
      top = rect.top - gap - Math.min(menu.scrollHeight, maxHeight);
    }
  }

  menu.style.width = `${Math.round(width)}px`;
  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(Math.max(padding, top))}px`;
  menu.style.maxHeight = `${Math.round(Math.max(120, Math.min(240, maxHeight)))}px`;
}

function scheduleCustomSelectPosition() {
  if (!activeCustomSelectState || customSelectPositionPending) return;
  customSelectPositionPending = true;
  window.requestAnimationFrame(() => {
    customSelectPositionPending = false;
    if (activeCustomSelectState) {
      positionCustomSelectMenu(activeCustomSelectState);
    }
  });
}

function closeAllCustomSelects() {
  CUSTOM_SELECTS.forEach(state => {
    state.menu.classList.add("hidden");
    state.trigger.setAttribute("aria-expanded", "false");
    state.wrapper.classList.remove("custom-select--open");
    if (state.searchInput) {
      state.searchInput.value = "";
      state.menu.querySelectorAll(".custom-select-option").forEach(btn => {
        btn.style.display = "";
      });
    }
  });
  activeCustomSelectState = null;
}

function openCustomSelect(state) {
  if (!state || state.trigger.disabled) return;
  closeAllCustomSelects();
  ensureCustomSelectPortal(state);
  state.menu.classList.remove("hidden");
  state.trigger.setAttribute("aria-expanded", "true");
  state.wrapper.classList.add("custom-select--open");
  activeCustomSelectState = state;
  scheduleCustomSelectPosition();
  window.requestAnimationFrame(scheduleCustomSelectPosition);
  if (state.searchInput) {
    try { state.searchInput.focus({ preventScroll: true }); } catch { state.searchInput.focus(); }
    return;
  }
  const selected = state.menu.querySelector(".custom-select-option.is-selected");
  const target = selected || state.menu.querySelector(".custom-select-option");
  if (target) {
    try { target.focus({ preventScroll: true }); } catch { target.focus(); }
  }
}

function applyCustomSelectSearchFilter(state) {
  if (!state?.searchInput) return;
  const query = String(state.searchInput.value || "").trim().toLowerCase();
  state.menu.querySelectorAll(".custom-select-option").forEach(btn => {
    const label = String(btn.textContent || "").toLowerCase();
    btn.style.display = !query || label.includes(query) ? "" : "none";
  });
}

function updateCustomSelect(selectEl) {
  const state = CUSTOM_SELECTS.get(selectEl);
  if (!state) return;
  const isHidden = selectEl.classList.contains("hidden");
  state.wrapper.classList.toggle("hidden", isHidden);
  if (isHidden) {
    closeAllCustomSelects();
    return;
  }
  state.trigger.disabled = selectEl.disabled;
  const options = Array.from(selectEl.options || []);
  const selectedOption = options.find(opt => opt.value === selectEl.value) || options[0];
  state.label.textContent = selectedOption ? selectedOption.textContent : t("Select");
  state.menu.textContent = "";
  if (state.searchWrap) {
    state.menu.appendChild(state.searchWrap);
  }
  options.forEach(option => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "custom-select-option";
    btn.textContent = option.textContent;
    btn.setAttribute("role", "option");
    if (option.disabled) {
      btn.disabled = true;
    }
    if (option.value === selectEl.value) {
      btn.classList.add("is-selected");
      btn.setAttribute("aria-selected", "true");
    }
    btn.addEventListener("click", () => {
      if (option.disabled) return;
      if (selectEl.value !== option.value) {
        selectEl.value = option.value;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
      closeAllCustomSelects();
      try { state.trigger.focus({ preventScroll: true }); } catch { state.trigger.focus(); }
    });
    state.menu.appendChild(btn);
  });
  applyCustomSelectSearchFilter(state);
  if (state === activeCustomSelectState) {
    ensureCustomSelectPortal(state);
    scheduleCustomSelectPosition();
  }
}

function initCustomSelect(selectEl) {
  if (!selectEl || CUSTOM_SELECTS.has(selectEl)) return;
  const wrapper = document.createElement("div");
  wrapper.className = "custom-select";
  selectEl.parentNode.insertBefore(wrapper, selectEl);
  wrapper.appendChild(selectEl);
  selectEl.classList.add("custom-select-native");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "custom-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.id = `${selectEl.id}-trigger`;

  const label = document.createElement("span");
  label.className = "custom-select-label";
  trigger.appendChild(label);

  const caret = document.createElement("span");
  caret.className = "custom-select-caret";
  caret.setAttribute("aria-hidden", "true");
  trigger.appendChild(caret);

  const menu = document.createElement("div");
  menu.className = "custom-select-menu hidden";
  menu.setAttribute("role", "listbox");
  menu.id = `${selectEl.id}-menu`;

  trigger.setAttribute("aria-controls", menu.id);

  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);

  const labelEl = document.querySelector(`label[for="${selectEl.id}"]`);
  if (labelEl) {
    labelEl.setAttribute("for", trigger.id);
  }

  const state = { select: selectEl, wrapper, trigger, label, menu };
  CUSTOM_SELECTS.set(selectEl, state);

  if (selectEl === filterCategory) {
    const searchWrap = document.createElement("div");
    searchWrap.className = "custom-select-search-wrap";

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.className = "custom-select-search";
    searchInput.placeholder = t("Search categories…", "Search categories…");
    searchInput.setAttribute("aria-label", t("Search categories", "Search categories"));
    searchInput.autocomplete = "off";
    searchInput.spellcheck = false;

    searchInput.addEventListener("input", () => applyCustomSelectSearchFilter(state));
    searchInput.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        searchInput.value = "";
        applyCustomSelectSearchFilter(state);
      }
    });

    searchWrap.appendChild(searchInput);
    state.searchWrap = searchWrap;
    state.searchInput = searchInput;
  }

  menu.addEventListener(
    "wheel",
    e => {
      if (menu.classList.contains("hidden")) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY || e.deltaX;
      if (delta) {
        menu.scrollTop += delta;
      }
    },
    { passive: false }
  );

  trigger.addEventListener("click", () => {
    if (!state.menu.classList.contains("hidden")) {
      closeAllCustomSelects();
      return;
    }
    openCustomSelect(state);
  });
  trigger.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      openCustomSelect(state);
      return;
    }
    if (e.key === "Escape") {
      closeAllCustomSelects();
    }
  });
  selectEl.addEventListener("change", () => updateCustomSelect(selectEl));
  updateCustomSelect(selectEl);
}

function initFilterCustomSelects() {
  if (customSelectsEnabled || shouldUseNativeSelects()) return;
  customSelectsEnabled = true;
  root.classList.add("custom-selects");
  [filterCategory, filterCondition, filterValueSelect].forEach(initCustomSelect);
  document.addEventListener("click", e => {
    const target = e.target;
    let inside = false;
    CUSTOM_SELECTS.forEach(state => {
      if (state.wrapper.contains(target) || state.menu.contains(target)) inside = true;
    });
    if (!inside) closeAllCustomSelects();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeAllCustomSelects();
    }
  });
  window.addEventListener("resize", scheduleCustomSelectPosition);
  window.addEventListener("scroll", scheduleCustomSelectPosition, true);
}

function getFilterFieldMeta(fieldId) {
  if (!fieldId) return null;
  return FILTER_BUILDER_FIELDS.find(field => field.id === fieldId) || null;
}

function resolveFilterValues(meta) {
  if (!meta || !meta.values) return [];
  if (typeof meta.values === "function") {
    try {
      const values = meta.values();
      return Array.isArray(values) ? values.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(meta.values) ? meta.values.filter(Boolean) : [];
}

function updateFilterConditionOptions() {
  if (!filterCondition) return;
  const meta = getFilterFieldMeta(filterCategory?.value);
  const type = meta?.type || "string";
  const conditions = FILTER_CONDITIONS[type] || FILTER_CONDITIONS.string;
  const current = filterCondition.value;
  filterCondition.textContent = "";
  conditions.forEach(condition => {
    const opt = document.createElement("option");
    opt.value = condition.id;
    opt.textContent = condition.label;
    filterCondition.appendChild(opt);
  });
  if (conditions.some(condition => condition.id === current)) {
    filterCondition.value = current;
  }
  updateCustomSelect(filterCondition);
}

function updateFilterValueOptions() {
  if (!filterValueInput || !filterValueSelect) return;
  const meta = getFilterFieldMeta(filterCategory?.value);
  const values = resolveFilterValues(meta);
  const allowCustom = Boolean(meta?.allowCustom);
  const useSelect = values.length > 0;
  const placeholder = meta?.placeholder || t("Value");

  filterValueInput.placeholder = placeholder;

  if (!useSelect) {
    filterValueSelect.textContent = "";
    filterValueSelect.classList.add("hidden");
    filterValueInput.classList.remove("hidden");
    filterValueInput.disabled = false;
    updateCustomSelect(filterValueSelect);
    return;
  }

  const current = filterValueSelect.value;
  filterValueSelect.textContent = "";
  values.forEach(option => {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    filterValueSelect.appendChild(opt);
  });
  if (allowCustom) {
    const opt = document.createElement("option");
    opt.value = "__custom__";
    opt.textContent = t("Custom");
    filterValueSelect.appendChild(opt);
  }
  if (current && Array.from(filterValueSelect.options).some(opt => opt.value === current)) {
    filterValueSelect.value = current;
  } else {
    filterValueSelect.value = filterValueSelect.options[0]?.value || "";
  }

  filterValueSelect.classList.remove("hidden");
  const isCustom = allowCustom && filterValueSelect.value === "__custom__";
  filterValueInput.classList.toggle("hidden", !isCustom);
  filterValueInput.disabled = !isCustom;
  if (!isCustom) {
    filterValueInput.value = "";
  }
  updateCustomSelect(filterValueSelect);
}

function updateFilterBuilderOptions() {
  if (!filterCategory) return;
  const fields = getFilterBuilderFields()
    .slice()
    .sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    }));
  const current = filterCategory.value;
  filterCategory.textContent = "";
  fields.forEach(field => {
    const opt = document.createElement("option");
    opt.value = field.id;
    opt.textContent = field.label;
    filterCategory.appendChild(opt);
  });
  if (fields.some(field => field.id === current)) {
    filterCategory.value = current;
  } else {
    filterCategory.value = fields[0]?.id || "";
  }
  updateCustomSelect(filterCategory);
  updateFilterConditionOptions();
  updateFilterValueOptions();
}

function formatFilterTokenLabel(token) {
  const rawToken = String(token || "").trim();
  if (!rawToken) return "";
  let negated = false;
  let raw = rawToken;
  if (raw[0] === "-" && raw.length > 1) {
    negated = true;
    raw = raw.slice(1);
  }

  let field = "";
  let op = "";
  let value = "";
  const compMatch = raw.match(/^([a-zA-Z]+)(>=|<=|=|>|<)(.+)$/);
  if (compMatch) {
    field = compMatch[1];
    op = compMatch[2];
    value = compMatch[3];
  } else {
    const idx = raw.indexOf(":");
    if (idx > 0) {
      field = raw.slice(0, idx);
      op = ":";
      value = raw.slice(idx + 1);
    } else {
      return negated ? t(`not ${raw}`) : raw;
    }
  }

  const fieldKey = field.toLowerCase();
  const fieldLabel = FILTER_FIELD_LABELS[fieldKey] || field;
  if (op === ":" || op === "=") {
    const wildcard = /[*?]/.test(value);
    let cleanValue = value.replace(/[*?]+/g, " ").trim();
    if (!cleanValue) cleanValue = value;
    const condition = wildcard
      ? (negated ? "does not contain" : "contains")
      : (negated ? "is not" : "is");
    return `${fieldLabel} ${condition} ${cleanValue}`;
  }
  const opLabels = {
    ">": t("greater than"),
    "<": t("less than"),
    ">=": t("at least"),
    "<=": t("at most"),
  };
  const opLabel = opLabels[op] || op;
  const condition = negated ? `not ${opLabel}` : opLabel;
  return `${fieldLabel} ${condition} ${value}`;
}

function renderActiveFilterChips() {
  if (!activeFiltersEl) return;
  const tokens = String(chipQuery || "").split(/\s+/).filter(Boolean);
  activeFiltersEl.textContent = "";
  activeFiltersEl.classList.toggle("hidden", tokens.length === 0);
  scheduleTableWrapLayout();
  if (!tokens.length) return;
  const frag = document.createDocumentFragment();
  tokens.forEach(token => {
    const label = formatFilterTokenLabel(token);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-bubble";
    btn.setAttribute("data-token", token);
    btn.setAttribute(
      "aria-label",
      tp("ariaRemoveFilter", { label }, "Remove filter %(label)s")
    );
    btn.title = token;
    const text = document.createElement("span");
    text.className = "filter-bubble-label";
    text.textContent = label;
    const remove = document.createElement("span");
    remove.className = "filter-bubble-remove";
    remove.textContent = "x";
    remove.setAttribute("aria-hidden", "true");
    btn.appendChild(text);
    btn.appendChild(remove);
    frag.appendChild(btn);
  });
  activeFiltersEl.appendChild(frag);
}

function normalizeBuilderValue(value, meta, condition) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (meta?.type === "number") {
    const cleaned = raw.replace(/[^0-9.+-]/g, "");
    if (!cleaned) return "";
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return "";
    return String(num);
  }
  if (meta?.type === "bool") {
    const lowered = raw.toLowerCase();
    if (["1", "true", "yes", "y"].includes(lowered)) return "true";
    if (["0", "false", "no", "n"].includes(lowered)) return "false";
    return "";
  }
  let normalized = raw.replace(/\s+/g, "*");
  if (condition?.wrap === "contains") {
    if (!normalized.startsWith("*")) normalized = `*${normalized}`;
    if (!normalized.endsWith("*")) normalized = `${normalized}*`;
  }
  return normalized;
}

function buildFilterTokenFromBuilder() {
  const meta = getFilterFieldMeta(filterCategory?.value);
  if (!meta) return "";
  const conditions = FILTER_CONDITIONS[meta.type] || FILTER_CONDITIONS.string;
  const condition = conditions.find(item => item.id === filterCondition?.value) || conditions[0];
  let rawValue = "";
  if (filterValueSelect && !filterValueSelect.classList.contains("hidden")) {
    const selected = filterValueSelect.value;
    if (selected === "__custom__") {
      rawValue = filterValueInput?.value || "";
    } else {
      rawValue = selected || "";
    }
  } else {
    rawValue = filterValueInput?.value || "";
  }
  const normalized = normalizeBuilderValue(rawValue, meta, condition);
  if (!normalized) return "";
  let token = `${meta.id}${condition.op}${normalized}`;
  if (condition.negate) {
    token = `-${token}`;
  }
  return token;
}

function addBuilderFilterToken() {
  const token = buildFilterTokenFromBuilder();
  if (!token) return;
  const tokens = String(chipQuery || "").split(/\s+/).filter(Boolean);
  if (tokens.includes(token)) return;
  tokens.push(token);
  chipQuery = tokens.join(" ");
  syncChipButtonsToQuery();
  scheduleViewStateSave();
  if (filterValueInput && (!filterValueSelect || filterValueSelect.value === "__custom__")) {
    filterValueInput.value = "";
  }
  const scrollAnchor = captureTableScrollAnchor();
  render(dataByApp[activeApp] || [], { scrollAnchor });
}

function getDefaultSortKey(app) {
  return app === "sonarr" ? "AvgEpisodeSizeGB" : "GBPerHour";
}

function normalizeSortKey(app, key) {
  if (!key) return getDefaultSortKey(app);
  const th = document.querySelector(`th[data-sort="${CSS.escape(key)}"]`);
  if (!th) return getDefaultSortKey(app);
  const appAttr = th.getAttribute("data-app");
  if (appAttr && appAttr !== app) return getDefaultSortKey(app);
  return key;
}

function buildDefaultViewState(app) {
  return {
    titleFilter: "",
    pathFilter: "",
    advancedFilter: "",
    advancedEnabled: false,
    chipQuery: "",
    sortKey: getDefaultSortKey(app),
    sortDir: "desc",
    columnPrefs: null,
  };
}

function loadViewState() {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(VIEW_STATE_KEY) || "");
  } catch {
    stored = null;
  }
  viewStateByApp.sonarr = {
    ...buildDefaultViewState("sonarr"),
    ...(stored?.sonarr || {}),
  };
  viewStateByApp.radarr = {
    ...buildDefaultViewState("radarr"),
    ...(stored?.radarr || {}),
  };
}

function saveViewState() {
  try {
    localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(viewStateByApp));
  } catch {
  }
}

function syncViewStateFromUi(app = activeApp) {
  const state = viewStateByApp[app] || buildDefaultViewState(app);
  state.titleFilter = String(titleFilter?.value ?? "").trim();
  state.pathFilter = String(pathFilter?.value ?? "").trim();
  state.advancedFilter = String(advancedFilter?.value ?? "").trim();
  state.advancedEnabled = Boolean(advancedEnabled);
  state.chipQuery = String(chipQuery ?? "").trim();
  state.sortKey = normalizeSortKey(app, sortKey || getDefaultSortKey(app));
  state.sortDir = sortDir === "asc" ? "asc" : "desc";
  state.columnPrefs = { ...getColumnPrefs(app) };
  viewStateByApp[app] = state;
}

function scheduleViewStateSave(app = activeApp) {
  syncViewStateFromUi(app);
  if (viewStateSaveTimer) return;
  viewStateSaveTimer = window.setTimeout(() => {
    viewStateSaveTimer = null;
    saveViewState();
  }, 200);
}

function flushViewStateSave(app = activeApp) {
  syncViewStateFromUi(app);
  if (viewStateSaveTimer) {
    window.clearTimeout(viewStateSaveTimer);
    viewStateSaveTimer = null;
  }
  saveViewState();
}

function applyViewState(app) {
  const state = viewStateByApp[app] || buildDefaultViewState(app);
  if (state && state.columnPrefs && typeof state.columnPrefs === "object") {
    columnPrefsByApp[app] = { ...state.columnPrefs };
    loadColumnPrefs(app);
  }
  sortKey = normalizeSortKey(app, state.sortKey);
  sortDir = state.sortDir === "asc" ? "asc" : "desc";
  chipQuery = String(state.chipQuery || "").trim();
  setAdvancedMode(Boolean(state.advancedEnabled));
  if (titleFilter) titleFilter.value = state.titleFilter || "";
  if (pathFilter) pathFilter.value = state.pathFilter || "";
  if (advancedFilter) {
    advancedFilter.value = state.advancedEnabled ? (state.advancedFilter || "") : "";
  }
  syncChipButtonsToQuery();
}

function measureTableWrapLayout() {
  if (!tableWrapEl) return null;
  const fullscreen = root.classList.contains("table-fullscreen");
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const viewportOffset = window.visualViewport?.offsetTop || 0;
  if (fullscreen) {
    return {
      signature: `1|${Math.round(viewportHeight)}|${Math.round(viewportOffset)}`,
      maxHeight: "",
    };
  }
  const rect = tableWrapEl.getBoundingClientRect();
  const bottomPadding = 12;
  const anchorTop = Math.max(rect.top, viewportOffset);
  const available = viewportHeight - (anchorTop - viewportOffset) - bottomPadding;
  return {
    signature: `0|${Math.round(anchorTop)}|${Math.round(viewportHeight)}|${Math.round(viewportOffset)}`,
    maxHeight: available > 200 ? `${Math.round(available)}px` : "",
  };
}

function applyTableWrapLayoutMeasure(measure) {
  if (!tableWrapEl || !measure) return;
  if (measure.signature === lastTableWrapLayoutSignature &&
    measure.maxHeight === lastAppliedTableWrapMaxHeight) {
    return;
  }
  lastTableWrapLayoutSignature = measure.signature;
  if (measure.maxHeight !== lastAppliedTableWrapMaxHeight) {
    tableWrapEl.style.maxHeight = measure.maxHeight;
    lastAppliedTableWrapMaxHeight = measure.maxHeight;
  }
  scheduleTableLayoutSync({ force: false, skipIfUnchanged: true });
}

function updateTableWrapMaxHeight() {
  applyTableWrapLayoutMeasure(measureTableWrapLayout());
}

function scheduleTableWrapLayout() {
  if (tableWrapLayoutPending) return;
  tableWrapLayoutPending = true;
  window.requestAnimationFrame(() => {
    const measure = measureTableWrapLayout();
    window.requestAnimationFrame(() => {
      tableWrapLayoutPending = false;
      applyTableWrapLayoutMeasure(measure);
    });
  });
}

if (tableWrapEl) {
  tableWrapEl.setAttribute("tabindex", "0");
  scheduleTableWrapLayout();
  window.addEventListener("resize", scheduleTableWrapLayout);
  // visualViewport resize disabled to avoid mobile scroll/URL-bar resize jank
  //if (window.visualViewport) {
  //  window.visualViewport.addEventListener("resize", scheduleTableWrapLayout);
  //}
  if (window.ResizeObserver && appEl) {
    const tableWrapObserver = new ResizeObserver(scheduleTableWrapLayout);
    tableWrapObserver.observe(appEl);
  }
  lastTableScrollTop = tableWrapEl.scrollTop;
  tableWrapEl.addEventListener("scroll", handleTableWrapScroll, { passive: true });
  tableWrapEl.addEventListener("wheel", cancelTableScrollSnap, { passive: true });
  tableWrapEl.addEventListener("touchstart", () => {
    cancelTableScrollSnap();
    setTableTouchActive(true);
  }, { passive: true });

  tableWrapEl.addEventListener("touchmove", () => {
    setTableTouchActive(true);
  }, { passive: true });

  tableWrapEl.addEventListener("touchend", () => {
    setTableTouchActive(true);
  }, { passive: true });

  tableWrapEl.addEventListener("touchcancel", () => {
    setTableTouchActive(true);
  }, { passive: true });

  window.addEventListener("keydown", cancelTableScrollSnap);
  tableWrapEl.addEventListener("focus", () => {
    tableHasFocus = true;
  });
  tableWrapEl.addEventListener("blur", () => {
    tableHasFocus = false;
  });
  tableWrapEl.addEventListener("keydown", handleTableKeydown);
}




function getTableHeaderHeight() {
  if (!tableEl) return 0;
  const header = tableEl.querySelector("thead");
  if (!header) return 0;
  const rect = header.getBoundingClientRect();
  return rect.height || 0;
}

function scrollElementIntoTableView(el) {
  if (!tableWrapEl || !el) return false;
  const wrapRect = tableWrapEl.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  if (!wrapRect.height || !elRect.height) return false;
  const headerHeight = getTableHeaderHeight();
  // Keep selected rows clear of the sticky header.
  const visibleTop = wrapRect.top + headerHeight;
  const visibleBottom = wrapRect.bottom;
  let nextTop = null;
  if (elRect.top < visibleTop) {
    nextTop = tableWrapEl.scrollTop - (visibleTop - elRect.top);
  } else if (elRect.bottom > visibleBottom) {
    nextTop = tableWrapEl.scrollTop + (elRect.bottom - visibleBottom);
  }
  if (nextTop == null) return false;
  return applyTableScrollTop(nextTop);
}

function isSeriesExpansionActive() {
  if (sonarrExpansionState.expandedSeries.size) return true;
  if (!tbody) return false;
  return Boolean(tbody.querySelector("tr.series-child-row"));
}

function tableCanSnapScroll() {
  if (!tableWrapEl || !tbody || !tableEl) return false;
  // Disable the "auto align to nearest row" behavior on iOS
  if (IS_IOS) return false;
  if (pendingScrollAnchor) return false;
  if (tableEl.classList.contains("is-batching")) return false;
  if (isSeriesExpansionActive()) return false;
  if (!getTableSnapRows().length) return false;
  if (tableWrapEl.scrollHeight - tableWrapEl.clientHeight < 2) return false;
  return true;
}

function tableNearBottom() {
  if (!tableWrapEl) return false;
  const maxScroll = Math.max(0, tableWrapEl.scrollHeight - tableWrapEl.clientHeight);
  if (maxScroll < 1) return false;
  return (maxScroll - tableWrapEl.scrollTop) <= TABLE_SCROLL_SNAP_BOTTOM_EPSILON;
}

function getTableSnapRows() {
  if (!tbody) return [];
  return Array.from(tbody.rows).filter(row => {
    if (!row) return false;
    if (row.classList.contains("virtual-spacer-row")) return false;
    if (row.classList.contains("series-child-row")) return false;
    return true;
  });
}
function findTopVisibleRowIndex(rows, visibleTop) {
  let low = 0;
  let high = rows.length - 1;
  let bestIndex = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const row = rows[mid];
    const rowTop = row.offsetTop;
    if (rowTop <= visibleTop) {
      bestIndex = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return bestIndex;
}

function captureTableScrollAnchor() {
  if (!tableWrapEl || !tbody) return null;
  const rows = getTableSnapRows();
  if (!rows || !rows.length) return null;
  const headerHeight = getTableHeaderHeight();
  const visibleTop = tableWrapEl.scrollTop + headerHeight;
  const index = findTopVisibleRowIndex(rows, visibleTop);
  const row = rows[index];
  if (!row) return null;
  const rowTop = row.offsetTop;
  return {
    app: activeApp,
    rowKey: row.dataset.rowKey || "",
    rowIndex: index,
    offset: Math.max(0, visibleTop - rowTop),
    scrollTop: tableWrapEl.scrollTop,
    renderToken: 0,
    attempts: 0,
  };
}

function applyTableScrollTop(targetTop) {
  if (!tableWrapEl) return false;
  const maxScroll = Math.max(0, tableWrapEl.scrollHeight - tableWrapEl.clientHeight);
  const nextTop = Math.max(0, Math.min(maxScroll, Math.round(targetTop)));
  cancelTableScrollSnap();
  tableScrollSnapLocked = true;
  tableScrollSnapIgnoreUntil = perfNow() + TABLE_SCROLL_ANCHOR_LOCK_MS;
  tableWrapEl.scrollTop = nextTop;
  lastTableScrollTop = tableWrapEl.scrollTop;
  return true;
}

function restoreTableScrollAnchor(anchor) {
  if (!anchor || !tableWrapEl || !tbody) return false;
  if (anchor.app && anchor.app !== activeApp) return true;
  if (anchor.renderToken && anchor.renderToken !== renderToken) return true;
  let rowEl = null;
  if (anchor.rowKey) {
    rowEl = findRowElement(activeApp, anchor.rowKey);
  }
  if (!rowEl && Number.isInteger(anchor.rowIndex)) {
    const rows = getTableSnapRows();
    rowEl = rows[anchor.rowIndex] || null;
  }
  if (!rowEl) {
    if (!tableReadyByApp[activeApp]) return false;
    return applyTableScrollTop(anchor.scrollTop || 0);
  }
  const headerHeight = getTableHeaderHeight();
  const offset = Number(anchor.offset) || 0;
  const targetTop = rowEl.offsetTop - headerHeight + offset;
  return applyTableScrollTop(targetTop);
}

function scheduleScrollAnchorRestore(anchor, token) {
  if (!anchor) return;
  pendingScrollAnchor = {
    ...anchor,
    renderToken: token || anchor.renderToken || renderToken,
    attempts: anchor.attempts || 0,
  };
  if (scrollAnchorFrame) return;
  scrollAnchorFrame = window.requestAnimationFrame(attemptScrollAnchorRestore);
}

function attemptScrollAnchorRestore() {
  scrollAnchorFrame = null;
  const anchor = pendingScrollAnchor;
  if (!anchor) return;
  const restored = restoreTableScrollAnchor(anchor);
  if (restored) {
    pendingScrollAnchor = null;
    return;
  }
  anchor.attempts += 1;
  if (anchor.attempts >= TABLE_SCROLL_ANCHOR_MAX_FRAMES) {
    pendingScrollAnchor = null;
    return;
  }
  scrollAnchorFrame = window.requestAnimationFrame(attemptScrollAnchorRestore);
}

function snapTableScroll() {
  if (!tableCanSnapScroll()) return;
  if (tableScrollSnapInProgress) return;
  if (tableNearBottom()) return;
  const headerHeight = getTableHeaderHeight();
  const currentTop = tableWrapEl.scrollTop;
  const visibleTop = currentTop + headerHeight;
  const rows = getTableSnapRows();
  if (!rows.length) return;
  const currentIndex = findTopVisibleRowIndex(rows, visibleTop);
  const currentRow = rows[currentIndex];
  if (!currentRow) return;
  let targetIndex = currentIndex;
  const currentRowTop = currentRow.offsetTop;
  const nextRow = rows[currentIndex + 1];
  if (nextRow) {
    const nextTop = nextRow.offsetTop;
    if (nextTop > currentRowTop) {
      const distUp = Math.abs(visibleTop - currentRowTop);
      const distDown = Math.abs(nextTop - visibleTop);
      if (distDown < distUp) {
        targetIndex = currentIndex + 1;
      }
    }
  }
  const targetRow = rows[targetIndex];
  if (!targetRow) return;
  const maxScroll = Math.max(0, tableWrapEl.scrollHeight - tableWrapEl.clientHeight);
  const targetTop = Math.max(0, Math.min(maxScroll, targetRow.offsetTop - headerHeight));
  const delta = Math.abs(targetTop - currentTop);
  if (delta <= TABLE_SCROLL_SNAP_EPSILON) return;
  animateTableScrollTo(targetTop);
}

function scheduleTableScrollSnap() {
  if (tableScrollSnapTimer) {
    window.clearTimeout(tableScrollSnapTimer);
  }
  tableScrollSnapTimer = window.setTimeout(() => {
    tableScrollSnapTimer = null;
    snapTableScroll();
  }, TABLE_SCROLL_SNAP_IDLE_MS);
}

function cancelTableScrollSnap() {
  if (tableScrollSnapTimer) {
    window.clearTimeout(tableScrollSnapTimer);
    tableScrollSnapTimer = null;
  }
  if (tableScrollSnapAnimFrame) {
    window.cancelAnimationFrame(tableScrollSnapAnimFrame);
    tableScrollSnapAnimFrame = null;
  }
  tableScrollSnapInProgress = false;
  tableScrollSnapLocked = false;
  tableScrollSnapIgnoreUntil = 0;
}

function animateTableScrollTo(targetTop) {
  if (!tableWrapEl) return;
  cancelTableScrollSnap();
  const startTop = tableWrapEl.scrollTop;
  if (Math.abs(targetTop - startTop) < 1) return;
  const delta = Math.abs(targetTop - startTop);
  const duration = Math.min(
    TABLE_SCROLL_SNAP_MAX_MS,
    Math.max(TABLE_SCROLL_SNAP_MIN_MS, delta * 8)
  );
  tableScrollSnapInProgress = true;
  tableScrollSnapLocked = true;
  tableScrollSnapIgnoreUntil = perfNow() + duration + 80;
  const startAt = performance.now();
  const step = (now) => {
    if (!tableWrapEl) {
      cancelTableScrollSnap();
      return;
    }
    const elapsed = now - startAt;
    const t = Math.min(1, elapsed / duration);
    const eased = t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const nextTop = startTop + (targetTop - startTop) * eased;
    tableWrapEl.scrollTop = nextTop;
    if (t < 1) {
      tableScrollSnapAnimFrame = window.requestAnimationFrame(step);
      return;
    }
    tableScrollSnapAnimFrame = null;
    tableScrollSnapInProgress = false;
  };
  tableScrollSnapAnimFrame = window.requestAnimationFrame(step);
}

function handleTableWrapScroll() {
  if (!tableWrapEl) return;

  // Don’t do scroll snapping while touch gestures are in play (iOS pinch/drag)
  if (tableTouchActive) {
    lastTableScrollTop = tableWrapEl.scrollTop;
    return;
  }

  if (tableScrollSnapInProgress) return;
  if (isSeriesExpansionActive()) {
    lastTableScrollTop = tableWrapEl.scrollTop;
    return;
  }
  const now = perfNow();
  const nextTop = tableWrapEl.scrollTop;
  const deltaTop = Math.abs(nextTop - lastTableScrollTop);
  lastTableScrollTop = nextTop;
  if (tableNearBottom()) {
    cancelTableScrollSnap();
    return;
  }
  if (tableScrollSnapLocked) {
    if (now < tableScrollSnapIgnoreUntil) return;
    tableScrollSnapLocked = false;
  }
  if (deltaTop <= 0) return;
  scheduleTableScrollSnap();
}

function setTruncationTooltip(el, value) {
  if (!el) return;
  if (el.classList.contains("col-hidden")) {
    el.removeAttribute("title");
    return;
  }
  if (el.offsetParent === null) return;
  const max = el.clientWidth;
  const actual = el.scrollWidth;
  const truncated = actual - max > 2;
  if (truncated && value) {
    el.setAttribute("title", value);
  } else {
    el.removeAttribute("title");
  }
}

function updateTruncationTooltips() {
  if (!tbody) return;
  Array.from(tbody.rows).forEach(tr => {
    const row = tr.__sortarrRow;
    if (!row) return;
    const app = tr.dataset.app || activeApp;
    const titleEl = tr.querySelector(".title-text");
    const rawTitle = formatRowTitle(row, app);
    if (titleEl) setTruncationTooltip(titleEl, rawTitle);
    const pathCell = tr.querySelector('td[data-col="Path"]');
    if (pathCell) {
      const rawPath = String(row.Path ?? row.path ?? "").trim();
      setTruncationTooltip(pathCell, rawPath);
    }
    const rootCell = tr.querySelector('td[data-col="RootFolder"]');
    if (rootCell) {
      const rawRoot = String(row.RootFolder ?? "").trim();
      setTruncationTooltip(rootCell, rawRoot);
    }
  });
}

function lockTitlePathWidths() {
  if (!root || !tableEl) return;
  const app = activeApp;
  const titleTh = tableEl.querySelector('th[data-col="Title"]');
  const pathTh = tableEl.querySelector('th[data-col="Path"]');
  if (!titleTh || !pathTh) return;
  const filtersActive = hasActiveFilters();
  const hasTitleWidth = titleWidthByApp[app] > 0;
  const hasPathWidth = pathWidthByApp[app] > 0;
  const sharedTitleWidth = clampTitleWidth(Math.max(titleWidthByApp.sonarr || 0, titleWidthByApp.radarr || 0));
  if (filtersActive && sharedTitleWidth > 0 && hasPathWidth) {
    root.style.setProperty("--title-col-width", `${sharedTitleWidth}px`);
    root.style.setProperty("--path-col-width", `${pathWidthByApp[app]}px`);
    applyTitleWidth(app, null, { skipIfUnchanged: true });
    return;
  }
  const versionChanged = titlePathWidthVersionByApp[app] !== columnVisibilityVersion;
  const shouldMeasure = !hasTitleWidth ||
    !hasPathWidth ||
    versionChanged ||
    (!filtersActive && titlePathWidthFilterDirtyByApp[app]);
  if (shouldMeasure) {
    const passCache = titlePathMeasurePassByApp[app];
    const canUsePassCache = Boolean(passCache) &&
      passCache.token === renderToken &&
      passCache.columnVersion === columnVisibilityVersion &&
      passCache.filtersActive === filtersActive &&
      passCache.titleWidth > 0 &&
      passCache.pathWidth > 0;
    if (canUsePassCache) {
      titleWidthByApp[app] = clampTitleWidth(passCache.titleWidth);
      pathWidthByApp[app] = passCache.pathWidth;
    } else {
      root.style.removeProperty("--title-col-width");
      root.style.removeProperty("--path-col-width");
      const titleMin = parseFloat(window.getComputedStyle(titleTh).minWidth || "0");
      const titleSignal = Number.isFinite(titleMin) && titleMin > 0
        ? Math.round(titleMin)
        : Math.round(titleTh.scrollWidth || 0);
      const titleWidth = clampTitleWidth(titleSignal);
      const pathWidth = Math.round(pathTh.getBoundingClientRect().width);
      if (titleWidth > 0) {
        titleWidthByApp[app] = titleWidth;
      }
      if (pathWidth > 0) {
        pathWidthByApp[app] = pathWidth;
      }
      if (passCache) {
        passCache.token = renderToken;
        passCache.columnVersion = columnVisibilityVersion;
        passCache.filtersActive = filtersActive;
        passCache.titleWidth = clampTitleWidth(titleWidthByApp[app] || 0);
        passCache.pathWidth = pathWidthByApp[app] || 0;
      }
    }
    titlePathWidthVersionByApp[app] = columnVisibilityVersion;
    titlePathWidthFilterDirtyByApp[app] = filtersActive;
  }
  const canonicalTitleWidth = clampTitleWidth(Math.max(titleWidthByApp.sonarr || 0, titleWidthByApp.radarr || 0));
  if (canonicalTitleWidth > 0) {
    root.style.setProperty("--title-col-width", `${canonicalTitleWidth}px`);
  }
  if (pathWidthByApp[app] > 0) {
    root.style.setProperty("--path-col-width", `${pathWidthByApp[app]}px`);
  }
  applyTitleWidth(app, null, { skipIfUnchanged: true });
}

function isTableWrapOffscreen(rect) {
  if (!rect) return true;
  return rect.bottom <= 0 ||
    rect.top >= window.innerHeight ||
    rect.right <= 0 ||
    rect.left >= window.innerWidth;
}

function scheduleTableLayoutSync(options = {}) {
  const force = options.force ?? true;
  const skipIfUnchanged = Boolean(options.skipIfUnchanged);
  if (force) tableLayoutForce = true;
  if (skipIfUnchanged) tableLayoutSkipIfUnchanged = true;
  if (tableLayoutFrame) return;
  tableLayoutFrame = window.requestAnimationFrame(() => {
    tableLayoutFrame = null;
    const shouldForce = tableLayoutForce;
    const shouldSkipIfUnchanged = tableLayoutSkipIfUnchanged && !shouldForce;
    tableLayoutForce = false;
    tableLayoutSkipIfUnchanged = false;
    if (!tableWrapEl) return;
    const rect = tableWrapEl.getBoundingClientRect();
    if (!rect || isTableWrapOffscreen(rect)) return;
    if (shouldSkipIfUnchanged) {
      const sizeUnchanged =
        rect.width === lastTableWrapSize.width &&
        rect.height === lastTableWrapSize.height;
      if (sizeUnchanged) return;
    }
    lastTableWrapSize = { width: rect.width, height: rect.height };
    lockTitlePathWidths();
    updateTruncationTooltips();
    updateChipGroupDividers();
  });
}

function scheduleTitlePathWidthLock(options = {}) {
  scheduleTableLayoutSync(options);
}

function scheduleTruncationTooltipUpdate(options = {}) {
  scheduleTableLayoutSync(options);
}

function updateChipGroupDividers() {
  if (!chipWrapEl || chipWrapEl.classList.contains("chip-wrap--hidden")) return;
  const groups = Array.from(document.querySelectorAll(".chip-group"));
  if (!groups.length) return;
  let lastTop = null;
  groups.forEach(group => {
    if (group.classList.contains("hidden")) {
      group.classList.remove("chip-group--row-start");
      return;
    }
    const rect = group.getBoundingClientRect();
    if (!rect) return;
    const top = Math.round(rect.top);
    const isRowStart = lastTop === null || Math.abs(top - lastTop) > 2;
    group.classList.toggle("chip-group--row-start", isRowStart);
    if (isRowStart) lastTop = top;
  });
}

function scheduleChipGroupLayout() {
  if (chipGroupLayoutPending) return;
  chipGroupLayoutPending = true;
  window.requestAnimationFrame(() => {
    chipGroupLayoutPending = false;
    updateChipGroupDividers();
  });
}

function setFiltersCollapsed(collapsed) {
  if (!filtersEl) return;
  filtersCollapsed = Boolean(collapsed);
  filtersEl.classList.toggle("filters--collapsed", filtersCollapsed);
  if (filtersToggleBtn) {
    filtersToggleBtn.setAttribute("aria-expanded", String(!filtersCollapsed));
    filtersToggleBtn.textContent = filtersCollapsed ? "▾" : "▴";
    filtersToggleBtn.title = filtersCollapsed ? t("Show filters and chips") : t("Hide filters and chips");
  }
  try {
    localStorage.setItem(FILTERS_COLLAPSED_KEY, filtersCollapsed ? "1" : "0");
  } catch { }
  syncStatusPillVisibility();
  scheduleTableWrapLayout();
}

function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  let normalized = path;
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
}

// Benchmark mode (Phase 0): add ?bench=1&app=radarr&rows=20000&wide=1
const BENCH_PARAMS = (() => {
  try {
    const sp = new URLSearchParams(window.location.search || "");
    const enabled = sp.get("bench") === "1" || sp.get("benchmark") === "1";
    const app = (sp.get("app") || "").toLowerCase();
    const rows = Number(sp.get("rows") || sp.get("n") || "5000");
    const wide = sp.get("wide") === "1";
    return {
      enabled,
      app: app === "sonarr" || app === "radarr" ? app : null,
      rows: Number.isFinite(rows) && rows > 0 ? Math.min(rows, 50000) : 5000,
      wide,
    };
  } catch {
    return { enabled: false, app: null, rows: 5000, wide: false };
  }
})()

const IS_MOBILE = (() => {
  try {
    const mq = window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
    const ua = navigator.userAgent || "";
    const touch = /iPhone|iPad|iPod|Android/i.test(ua);
    return Boolean(mq || touch);
  } catch {
    return false;
  }
})();

const IMAGES_ENABLED = (() => {
  try {
    const sp = new URLSearchParams(window.location.search || "");
    return sp.get("images") !== "0";
  } catch (err) {
    return true;
  }
})();

const RADARR_IMAGES_ENABLED = (() => {
  try {
    const sp = new URLSearchParams(window.location.search || "");
    if (sp.get("radarr_images") === "0") return false;
    // Disable Radarr posters on mobile to avoid heavy DOM/memory
    if (IS_MOBILE) return false;
    return IMAGES_ENABLED;
  } catch {
    return IMAGES_ENABLED && !IS_MOBILE;
  }
})();
;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function makeBenchmarkRows(app, count) {
  const out = [];
  const now = Date.now();
  const studios = ["HBO", "Netflix", "Apple", "BBC", "FX", "Paramount", "Disney"];
  const codecs = ["H264", "H265", "AV1"];
  const audio = ["AAC", "EAC3", "DTS", "TrueHD"];
  for (let i = 0; i < count; i += 1) {
    const minutes = randomInt(20, 180);
    const sizeGb = Math.round((Math.random() * 50 + 0.2) * 100) / 100;
    const gbPerHour = Math.round((sizeGb / (minutes / 60)) * 100) / 100;
    const dateAdded = new Date(now - randomInt(0, 365) * 86400000).toISOString();
    const title = app === "sonarr"
      ? `Series ${i} Season ${randomInt(1, 20)}`
      : `Movie ${i}`;
    const row = {
      Title: title,
      Path: `/media/${app}/${i}`,
      DateAdded: dateAdded,
      RuntimeMins: minutes,
      FileSizeGB: sizeGb,
      GBPerHour: gbPerHour,
      BitrateMbps: Math.round((gbPerHour * 1.2) * 100) / 100,
      VideoCodec: randomFrom(codecs),
      AudioCodec: randomFrom(audio),
      Studio: randomFrom(studios),
      InstanceName: "Bench",
      InstanceId: "bench",
      __sortarrKey: `bench-${app}-${i}`,
    };
    if (app === "sonarr") {
      row.SeriesId = i + 1;
      row.SeasonCount = randomInt(1, 20);
      row.EpisodeCount = randomInt(10, 300);
      row.AvgEpisodeSizeGB = Math.round((sizeGb / Math.max(1, row.EpisodeCount)) * 1000) / 1000;
      row.TotalSizeGB = Math.round((row.AvgEpisodeSizeGB * row.EpisodeCount) * 100) / 100;
    } else {
      row.MovieId = i + 1;
    }
    out.push(row);
  }
  return out;
}

const CSRF_COOKIE_NAME = "sortarr_csrf";

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie || ""}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length < 2) return "";
  return parts.pop().split(";").shift() || "";
}

function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  const metaToken = meta && meta.getAttribute("content");
  if (metaToken) return metaToken;
  return readCookie(CSRF_COOKIE_NAME);
}

function withCsrfHeaders(headers = {}) {
  const token = getCsrfToken();
  if (!token) return headers;
  return { ...headers, "X-CSRF-Token": token };
}

let activeApp = "sonarr"; // "sonarr" | "radarr"
let sortKey = "AvgEpisodeSizeGB";
let sortDir = "desc";
let isLoading = false;
let statusMessage = "";
let statusNotice = "";
let advancedEnabled = false;
let chipQuery = "";
let tautulliEnabled = false;
let playbackProvider = "";
let playbackLabel = t("Playback");
let playbackSupportsItemRefresh = false;
let playbackSupportsDiagnostics = false;
let backgroundLoading = false;
let chipsVisible = true;
let filtersCollapsed = false;
let chipsEnabled = false;
const tableReadyByApp = { sonarr: false, radarr: false };
const CUSTOM_SELECTS = new Map();
let customSelectsEnabled = false;
const columnWidthLock = { active: false, widths: new Map(), token: 0 };
const columnWidthCacheByApp = { sonarr: new Map(), radarr: new Map() };
const columnWidthCacheVersionByApp = { sonarr: -1, radarr: -1 };
let statusPollTimer = null;
let statusCountdownTimer = null;
let statusCountdownRemaining = 0;

if (tableEl) {
  tableEl.dataset.app = activeApp;
}
const STATUS_COUNTDOWN_SECONDS = 5;
let statusFlashTimer = null;
let statusCompletionFlashed = false;
let statusTickTimer = null;
let statusFetchTimer = null;
let lastStatusFetchAt = null;
let statusFetchInFlight = false;
let statusFetchQueuedOptions = null;
let statusHoverBindingsReady = false;
let statusCollapsed = false;
let statusPillTimer = null;
let statusPillLoadedTimer = null;
let statusReadyAfterFirstData = false;
let statusPillLoadedUntil = 0;
const STATUS_PILL_LOADED_MS = 5000;
let tautulliRefreshReloadTimer = null;
let copyToastEl = null;
let copyToastTimer = null;
const statusState = { apps: { sonarr: null, radarr: null }, tautulli: null };
const healthState = { sonarr: null, radarr: null, lastFetchedAt: { sonarr: 0, radarr: 0 }, dismissed: { sonarr: {}, radarr: {} } };
const HEALTH_DISMISS_KEY = "Sortarr-health-dismissed";

function loadHealthDismissed() {
  try {
    const raw = localStorage.getItem(HEALTH_DISMISS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (parsed.sonarr && typeof parsed.sonarr === "object") healthState.dismissed.sonarr = parsed.sonarr;
      if (parsed.radarr && typeof parsed.radarr === "object") healthState.dismissed.radarr = parsed.radarr;
    }
  } catch (_) { }

  // Migration: older builds stored category-level keys (error/warning/notice/unreachable).
  // Keep only per-alert keys plus the optional "ok" dismissal.
  const clean = (obj) => {
    const next = {};
    if (!obj || typeof obj !== "object") return next;
    for (const [k, v] of Object.entries(obj)) {
      if (k === "ok") next[k] = v;
      else if (String(k).startsWith("alert:")) next[k] = v;
    }
    return next;
  };
  healthState.dismissed.sonarr = clean(healthState.dismissed.sonarr);
  healthState.dismissed.radarr = clean(healthState.dismissed.radarr);
}

function saveHealthDismissed() {
  try {
    localStorage.setItem(HEALTH_DISMISS_KEY, JSON.stringify(healthState.dismissed));
  } catch (_) { }
}

loadHealthDismissed();


const progressDisplayByApp = {
  sonarr: {
    processed: 0,
    total: 0,
    targetProcessed: 0,
    targetTotal: 0,
    startedTs: 0,
    timer: null,
  },
  radarr: {
    processed: 0,
    total: 0,
    targetProcessed: 0,
    targetTotal: 0,
    startedTs: 0,
    timer: null,
  },
};
const rowRefreshTimers = new WeakMap();
const ROW_REFRESH_FLASH_MS = 2200;
const ROW_REFRESH_NOTICE_MS = 6000;
const ROW_REFRESH_FOLLOWUP_MS = 15000;
let rowRefreshStatusTimer = null;
let rowRefreshFollowupTimer = null;
let rowRefreshNoticeStartedAt = 0;
let rowRefreshStatusToken = 0;
const rowFocusTimers = new WeakMap();
const ROW_FOCUS_FLASH_MS = 2600;
const ROW_FOCUS_RETRY_MS = 140;
const ROW_FOCUS_MAX_ATTEMPTS = 12;
let rowFocusRetryTimer = null;
let pendingRowFocus = null;

const PAGE_FRESH_NOTICE_MS = 10000;
const PAGE_LOAD_AT = Date.now();
let pageFreshNoticeTimer = null;
const COLD_CACHE_NOTICE =
  (window.I18N && window.I18N.coldCacheNotice) ||
  t("First load can take a while for large libraries; later loads are cached and faster.");

const PLAYBACK_MATCHING_NOTICE =
  (window.I18N && window.I18N.playbackMatchingNotice) ||
  t("Playback matching in progress.");

const NOTICE_FLAGS_HEADER = "X-Sortarr-Notice-Flags";
const TAUTULLI_POLL_INTERVAL_MS = 4000;
const TAUTULLI_STATUS_POLL_INTERVAL_MS = 1000;
const PROGRESS_ANIMATION_INTERVAL_MS = 120;
const PROGRESS_ANIMATION_STEPS = 12;
const ITEM_REFRESH_DELAY_MS = 1200;
const ITEM_REFRESH_TAUTULLI_DELAY_MS = 2000;
const TAUTULLI_ROW_REFRESH_STATUS_TIMEOUT_MS = 1500;
const MATCH_STATUS_SORT_ORDER = {
  matched: 0,
  unmatched: 1,
  skipped: 2,
  unavailable: 3,
};
const SKIPPED_REASON_SORT_ORDER = {
  future: 0,
  disk: 1,
  other: 2,
};

function getPlaybackLabel() {
  return playbackLabel || "Playback";
}

function getPlaybackMatchingNotice() {
  const label = getPlaybackLabel();
  if (label && label !== "Playback") {
    return t("matchingInProgressLabel", "%(label)s matching in progress.", { label });
  }
  return PLAYBACK_MATCHING_NOTICE;
}


const SONARR_COLUMNS = new Set([
  "SeriesType",
  "Genres",
  "LastAired",
  "MissingCount",
  "CutoffUnmetCount",
  "ContentHours",
  "EpisodesCounted",
  "SeasonCount",
  "AvgEpisodeSizeGB",
  "TotalSizeGB",
  "GBPerHour",
  "BitrateMbps",
  "Status",
  "Monitored",
  "Tags",
  "ReleaseGroup",
  "Studio",
  "QualityProfile",
]);


const RADARR_COLUMNS = new Set([
  "SeriesType",
  "RuntimeMins",
  "FileSizeGB",
  "GBPerHour",
  "BitrateMbps",
  "Status",
  "Monitored",
  "Tags",
  "ReleaseGroup",
  "QualityProfile",
  "Studio",
  "Genres",
  "MissingCount",
  "CutoffUnmetCount",
  "HasFile",
  "IsAvailable",
  "InCinemas",
  "LastSearchTime",
  "Edition",
  "CustomFormats",
  "CustomFormatScore",
  "QualityCutoffNotMet",
]);


const VIDEO_COLUMNS = new Set([
  "VideoHDR",
  "VideoCodec",
  "Resolution",
  "VideoQuality",
]);


const TAUTULLI_COLUMNS = new Set([
  "Diagnostics",
  "PlayCount",
  "LastWatched",
  "DaysSinceWatched",
  "TotalWatchTimeHours",
  "WatchContentRatio",
  "UsersWatched",
]);
const LANGUAGE_COLUMNS = new Set([
  "OriginalLanguage",
  "Languages",
  "AudioLanguages",
  "SubtitleLanguages",
  "AudioCodec",
  "AudioChannels",
  "AudioLanguagesMixed",
  "SubtitleLanguagesMixed",
]);
const COLUMN_GROUPS = {
  sonarr: Array.from(SONARR_COLUMNS),
  radarr: Array.from(RADARR_COLUMNS),
  video: Array.from(VIDEO_COLUMNS),
  language: Array.from(LANGUAGE_COLUMNS),
  tautulli: Array.from(TAUTULLI_COLUMNS),
};



const TAUTULLI_FILTER_FIELDS = new Set([
  "mismatch",
  "match",
  "matchstatus",
  "playcount",
  "lastwatched",
  "dayssincewatched",
  "watchtime",
  "watchtimehours",
  "totalwatchtime",
  "contenthours",
  "watchratio",
  "watchvs",
  "userswatched",
  "users",
  "neverwatched",
]);

const CSV_COLUMNS_BY_APP = {
  sonarr: new Set([
    "TitleSlug",
    "TmdbId",
    "AudioCodecMixed",
    "AudioLanguagesMixed",
    "SubtitleLanguagesMixed",
  ]),
  radarr: new Set([
    "TmdbId",
    "AudioCodecMixed",
    "AudioLanguagesMixed",
    "SubtitleLanguagesMixed",
  ]),
};
const CSV_COLUMNS_KEY = "Sortarr-csv-columns";
const FILTERS_COLLAPSED_KEY = "Sortarr-filters-collapsed";
const CHIPS_ENABLED_KEY = "Sortarr-chips-enabled";
const VIEW_STATE_KEY = "Sortarr-view-state";
const PLEX_LIBRARY_SELECTION_KEY = "Sortarr-plex-library-selection";
const csvColumnsState = { sonarr: false, radarr: false };
const RESET_UI_PARAM = "reset_ui";
const RENDER_PERF_PARAM = "render_perf";
const resetUiRequested = new URLSearchParams(window.location.search).has(RESET_UI_PARAM);

const renderPerfState = {
  enabled: new URLSearchParams(window.location.search).has(RENDER_PERF_PARAM),
  renderId: 0,
  activeId: 0,
  last: null,
};

const viewStateByApp = { sonarr: null, radarr: null };
let viewStateSaveTimer = null;
const noticeByApp = { sonarr: "", radarr: "" };
const fastModeByApp = { sonarr: false, radarr: false };
const coldCacheByApp = { sonarr: false, radarr: false };
const coldCacheStickyByApp = { sonarr: false, radarr: false };
const pendingPrefetchByApp = { sonarr: null, radarr: null };
const liteHydrateInFlightByApp = { sonarr: false, radarr: false };
const tautulliPendingByApp = { sonarr: false, radarr: false };
const tautulliPollTimers = { sonarr: null, radarr: null };
const followUpRefreshTimers = { sonarr: null, radarr: null };
const arrRefreshBusy = { sonarr: new Set(), radarr: new Set() };
let arrRefreshRenderKey = "";
const TITLE_WIDTH_MIN = 420;
const TITLE_WIDTH_MAX = 620;

function clampTitleWidth(value) {
  const width = Number(value);
  if (!Number.isFinite(width) || width <= 0) return 0;
  return Math.max(TITLE_WIDTH_MIN, Math.min(TITLE_WIDTH_MAX, Math.round(width)));
}

const titleWidthByApp = { sonarr: null, radarr: null };
const pathWidthByApp = { sonarr: null, radarr: null };
const titlePathWidthVersionByApp = { sonarr: -1, radarr: -1 };
const titlePathWidthFilterDirtyByApp = { sonarr: false, radarr: false };
const titlePathMeasurePassByApp = {
  sonarr: { token: -1, columnVersion: -1, filtersActive: false, titleWidth: 0, pathWidth: 0 },
  radarr: { token: -1, columnVersion: -1, filtersActive: false, titleWidth: 0, pathWidth: 0 },
};

const ADVANCED_PLACEHOLDER_BASE = I18N.advancedPlaceholderBase;
const ADVANCED_PLACEHOLDER_TAUTULLI = I18N.advancedPlaceholderTautulli;

const ADVANCED_HELP_BASE = I18N.advancedHelpBase;
const ADVANCED_HELP_TAUTULLI = I18N.advancedHelpTautulli;


const FILTER_CONDITIONS = {
  string: [
    { id: "is", label: t("is"), op: ":", negate: false },
    { id: "is_not", label: t("is not"), op: ":", negate: true },
    { id: "contains", label: t("contains"), op: ":", negate: false, wrap: "contains" },
    { id: "not_contains", label: t("does not contain"), op: ":", negate: true, wrap: "contains" },
  ],
  number: [
    { id: "eq", label: t("is"), op: "=", negate: false },
    { id: "neq", label: t("is not"), op: "=", negate: true },
    { id: "gt", label: t("greater than"), op: ">", negate: false },
    { id: "gte", label: t("at least"), op: ">=", negate: false },
    { id: "lt", label: t("less than"), op: "<", negate: false },
    { id: "lte", label: t("at most"), op: "<=", negate: false },
  ],
  bool: [
    { id: "is", label: t("is"), op: ":", negate: false },
    { id: "is_not", label: t("is not"), op: ":", negate: true },
  ],
};

const FILTER_LANGUAGE_VALUES = [
  { label: t("English"), value: "English" },
  { label: t("Spanish"), value: "Spanish" },
  { label: t("French"), value: "French" },
  { label: t("German"), value: "German" },
  { label: t("Japanese"), value: "Japanese" },
];
const FILTER_TRUE_FALSE_VALUES = [
  { label: t("True"), value: "true" },
  { label: t("False"), value: "false" },
];

const FILTER_BUILDER_FIELDS = [
  {
    id: "title",
    label: t("Title"),
    type: "string",
    placeholder: "Star Trek",
    allowCustom: true,
  },
  {
    id: "titleslug",
    label: t("Title Slug"),
    type: "string",
    app: "sonarr",
    placeholder: "star-trek",
    allowCustom: true,
  },
  {
    id: "tmdbid",
    label: t("TMDB ID"),
    type: "string",
    placeholder: "12345",
    allowCustom: true,
  },
  {
    id: "dateadded",
    label: t("Date Added"),
    type: "string",
    placeholder: "2024",
    allowCustom: true,
  },
  {
    id: "path",
    label: t("Path"),
    type: "string",
    placeholder: "/data/shows",
    allowCustom: true,
  },
  {
    id: "rootfolder",
    label: t("Root Folder"),
    type: "string",
    placeholder: "/data",
    allowCustom: true,
  },
  {
    id: "status",
    label: t("Status"),
    type: "string",
    values: [
      { label: t("Continuing"), value: "continuing" },
      { label: t("Ended"), value: "ended" },
      { label: t("Announced"), value: "announced" },
      { label: t("In Cinemas"), value: "incinemas" },
      { label: t("Released"), value: "released" },
      { label: t("Deleted"), value: "deleted" },
    ],
    allowCustom: true,
  },
  {
    id: "monitored",
    label: t("Availability"),
    type: "bool",
    values: [
      { label: t("Monitored"), value: "true" },
      { label: t("Unmonitored"), value: "false" },
    ],
  },
  {
    id: "qualityprofile",
    label: t("Quality Profile"),
    type: "string",
    placeholder: "HD-1080p",
    allowCustom: true,
  },
  {
    id: "tags",
    label: t("Tags"),
    type: "string",
    placeholder: "kids",
    allowCustom: true,
  },
  {
    id: "releasegroup",
    label: t("Release Group"),
    type: "string",
    placeholder: "ntb",
    allowCustom: true,
  },
  {
    id: "studio",
    label: t("Studio"),
    type: "string",
    placeholder: "Pixar",
    allowCustom: true,
  },
  {
    id: "seriestype",
    label: t("Series Type"),
    type: "string",
    app: "sonarr",
    placeholder: "anime",
    allowCustom: true,
  },
  {
    id: "originallanguage",
    label: t("Original Language"),
    type: "string",
    placeholder: "English",
    values: FILTER_LANGUAGE_VALUES,
    allowCustom: true,
  },
  {
    id: "genres",
    label: t("Genres"),
    type: "string",
    placeholder: "Drama",
    allowCustom: true,
  },
  {
    id: "lastaired",
    label: t("Last Aired"),
    type: "string",
    app: "sonarr",
    placeholder: "2024",
    allowCustom: true,
  },
  {
    id: "hasfile",
    label: t("Has File"),
    type: "bool",
    app: "radarr",
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "isavailable",
    label: t("Is Available"),
    type: "bool",
    app: "radarr",
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "incinemas",
    label: t("In Cinemas"),
    type: "bool",
    app: "radarr",
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "lastsearchtime",
    label: t("Last Search Time"),
    type: "string",
    app: "radarr",
    placeholder: "2024",
    allowCustom: true,
  },
  {
    id: "edition",
    label: t("Edition"),
    type: "string",
    app: "radarr",
    placeholder: "Director's Cut",
    allowCustom: true,
  },
  {
    id: "customformats",
    label: t("Custom Formats"),
    type: "string",
    app: "radarr",
    placeholder: "HDR",
    allowCustom: true,
  },
  {
    id: "customformatscore",
    label: t("Custom Format Score"),
    type: "number",
    app: "radarr",
    placeholder: "100",
  },
  {
    id: "qualitycutoffnotmet",
    label: t("Quality Cutoff Not Met"),
    type: "bool",
    app: "radarr",
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "videoquality",
    label: t("Quality"),
    type: "string",
    values: [
      { label: "2160p", value: "2160p" },
      { label: "1080p", value: "1080p" },
      { label: "720p", value: "720p" },
      { label: "480p", value: "480p" },
      { label: "WEB-DL", value: "webdl" },
      { label: "WEBRip", value: "webrip" },
      { label: "BluRay", value: "bluray" },
      { label: "Remux", value: "remux" },
    ],
    allowCustom: true,
  },
  {
    id: "resolution",
    label: t("Resolution"),
    type: "string",
    values: [
      { label: "4K", value: "4k" },
      { label: "2160p", value: "2160p" },
      { label: "1080p", value: "1080p" },
      { label: "720p", value: "720p" },
      { label: "480p", value: "480p" },
    ],
    allowCustom: true,
  },
  {
    id: "videocodec",
    label: t("Video Codec"),
    type: "string",
    values: [
      { label: "x265", value: "x265" },
      { label: "x264", value: "x264" },
    ],
    allowCustom: true,
  },
  {
    id: "videohdr",
    label: t("Video HDR"),
    type: "string",
    values: [
      { label: "HDR", value: "hdr" },
      { label: "Dolby Vision", value: "dolby" },
    ],
    allowCustom: true,
  },
  {
    id: "audiocodec",
    label: t("Audio Codec"),
    type: "string",
    values: [
      { label: "Atmos", value: "Atmos" },
      { label: "DD+", value: "eac3" },
      { label: "TrueHD", value: "truehd" },
    ],
    allowCustom: true,
  },
  {
    id: "audiocodecmixed",
    label: t("Audio Codec Mixed"),
    type: "bool",
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "audiochannels",
    label: t("Audio Channels"),
    type: "number",
    placeholder: "6",
  },
  {
    id: "audiolanguages",
    label: t("Audio Languages"),
    type: "string",
    placeholder: "English",
    values: FILTER_LANGUAGE_VALUES,
    allowCustom: true,
  },
  {
    id: "audiolanguagesmixed",
    label: t("Audio Languages Mixed"),
    type: "bool",
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "subtitlelanguages",
    label: t("Subtitle Languages"),
    type: "string",
    placeholder: "English",
    values: FILTER_LANGUAGE_VALUES,
    allowCustom: true,
  },
  {
    id: "subtitlelanguagesmixed",
    label: t("Subtitle Languages Mixed"),
    type: "bool",
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "nosubs",
    label: t("No Subtitles"),
    type: "bool",
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "missing",
    label: t("Missing"),
    type: "bool",
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "cutoff",
    label: t("Cutoff Unmet"),
    type: "bool",
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "cutoffunmet",
    label: t("Cutoff Unmet Count"),
    type: "number",
    placeholder: "1",
  },
  {
    id: "recentlygrabbed",
    label: t("Recently Grabbed"),
    type: "bool",
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "airing",
    label: t("Airing/Available"),
    type: "bool",
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "scene",
    label: t("Scene"),
    type: "bool",
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "episodes",
    label: t("Episodes"),
    type: "number",
    app: "sonarr",
    placeholder: "10",
  },
  {
    id: "seasons",
    label: t("Seasons"),
    type: "number",
    app: "sonarr",
    placeholder: "3",
  },
  {
    id: "totalsize",
    label: t("Size (GB)"),
    type: "number",
    placeholder: "10",
  },
  {
    id: "avgepisode",
    label: t("Avg Episode Size (GB)"),
    type: "number",
    app: "sonarr",
    placeholder: "1",
  },
  {
    id: "runtime",
    label: t("Runtime (mins)"),
    type: "number",
    placeholder: "60",
  },
  {
    id: "filesize",
    label: t("File Size (GB)"),
    type: "number",
    app: "radarr",
    placeholder: "8",
  },
  {
    id: "gbperhour",
    label: t("GB per Hour"),
    type: "number",
    placeholder: "1",
  },
  {
    id: "bitrate",
    label: t("Bitrate (Mbps)"),
    type: "number",
    placeholder: "5",
  },
  {
    id: "instance",
    label: t("Instance"),
    type: "string",
    allowCustom: true,
    values: () => {
      const instances = instanceConfig[activeApp] || [];
      return instances
        .map(inst => ({
          label: inst?.name || inst?.id || "",
          value: inst?.id || "",
        }))
        .filter(opt => opt.label && opt.value);
    },
  },
  {
    id: "matchstatus",
    label: t("Match Status"),
    type: "string",
    tautulli: true,
    values: [
      { label: t("Matched"), value: "matched" },
      { label: t("Unmatched"), value: "unmatched" },
      { label: t("Skipped"), value: "skipped" },
      { label: t("Unavailable"), value: "unavailable" },
      { label: t("Future"), value: "future" },
      { label: t("Not On Disk"), value: "nodisk" },
      { label: t("Not Checked"), value: "notchecked" },
    ],
  },
  {
    id: "mismatch",
    label: t("Mismatch"),
    type: "bool",
    tautulli: true,
    values: FILTER_TRUE_FALSE_VALUES,
  },
  {
    id: "playcount",
    label: t("Play Count"),
    type: "number",
    tautulli: true,
    placeholder: "1",
  },
  {
    id: "lastwatched",
    label: t("Last Watched"),
    type: "string",
    tautulli: true,
    placeholder: "2024",
    allowCustom: true,
  },
  {
    id: "dayssincewatched",
    label: t("Days Since Watched"),
    type: "number",
    tautulli: true,
    placeholder: "30",
  },
  {
    id: "watchtime",
    label: t("Watch Time (hours)"),
    type: "number",
    tautulli: true,
    placeholder: "10",
  },
  {
    id: "contenthours",
    label: t("Content Hours"),
    type: "number",
    tautulli: true,
    placeholder: "10",
  },
  {
    id: "watchratio",
    label: t("Watch / Runtime Ratio"),
    type: "number",
    tautulli: true,
    placeholder: "1",
  },
  {
    id: "users",
    label: t("Users Watched"),
    type: "number",
    tautulli: true,
    placeholder: "2",
  },
  {
    id: "neverwatched",
    label: t("Never Watched"),
    type: "bool",
    tautulli: true,
    values: FILTER_TRUE_FALSE_VALUES,
  },
];

const FILTER_FIELD_LABELS = FILTER_BUILDER_FIELDS.reduce((acc, field) => {
  acc[field.id] = field.label;
  return acc;
}, {});

// Store per-tab data so switching tabs doesn't briefly show the other tab's list
const dataByApp = { sonarr: [], radarr: [] };
const dataVersionByApp = { sonarr: 0, radarr: 0 };
const lastUpdatedByApp = { sonarr: null, radarr: null };
const sortCacheByApp = { sonarr: null, radarr: null };
const configState = {
  sonarrConfigured: false,
  radarrConfigured: false,
  playbackProvider: "",
  playbackConfigured: false,
  plexConfigured: false,
  historySourcesAvailable: [],
  plexLibraries: { sonarr: [], radarr: [] },
};
const plexLibraryState = {
  available: { sonarr: [], radarr: [] },
  selected: { sonarr: [], radarr: [] },
};
const instanceConfig = { sonarr: [], radarr: [] };
const instanceBaseById = { sonarr: {}, radarr: {} };

// Prevent stale fetches from rendering after you switch tabs
const loadTokens = { sonarr: 0, radarr: 0 };
const prefetchTokens = { sonarr: 0, radarr: 0 };
const RENDER_FLAG_STORAGE_KEY = "Sortarr-render-flags";
const DEFAULT_RENDER_FLAGS = {
  batch: true,
  deferHeavy: { sonarr: true, radarr: true },
  widthLock: true,
  stabilize: true,
  virtualize: { sonarr: true, radarr: true },
  virtualRows: { sonarr: true, radarr: true },
};
const HEADER_WIDTH_CAP_COLUMNS = new Set([
  "ContentHours",
  "RuntimeMins",
  "EpisodesCounted",
  "SeasonCount",
  "MissingCount",
  "CutoffUnmetCount",
  "QualityCutoffNotMet",
  "AvgEpisodeSizeGB",
  "TotalSizeGB",
  "FileSizeGB",
  "GBPerHour",
  "BitrateMbps",
  "VideoQuality",
  "Resolution",
  "VideoCodec",
  "AudioCodec",
  "AudioChannels",
  "Monitored",
  "Status",
  "Instance",
  "QualityProfile",
  "ReleaseGroup",
  "Tags",
  "Studio",
  "OriginalLanguage",
  "Genres",
  "LastSearchTime",
  "LastWatched",
  "Edition",
  "CustomFormats",
  "Languages",
  "AudioLanguages",
  "SubtitleLanguages",
  "VideoHDR",
]);
const HEADER_CAP_MIN_TEXT = {
  ContentHours: "Runtime (hh:mm) v",
  EpisodesCounted: "Episodes v",
  AvgEpisodeSizeGB: "Avg / Ep (GiB) v",
  TotalSizeGB: "Total (GiB) v",
  RuntimeMins: "Runtime (hh:mm) v",
  QualityCutoffNotMet: "Cutoff Not Met v",
  VideoQuality: "WEBRip-2160p",
  Resolution: "3840x2160p",
  VideoCodec: "Video Codec v",
  AudioCodec: "EAC3 Atmos v",
  AudioChannels: "Audio Channels v",
  Monitored: "Monitored v",
  Status: "Status v",
  Instance: "Instance Name v",
  QualityProfile: "Quality Profile v",
  ReleaseGroup: "Release Group v",
  Tags: "Tag List v",
  Studio: "Studio Name v",
  OriginalLanguage: "Original Language v",
  Genres: "Drama, Sci-Fi, Thriller",
  LastSearchTime: "Last Search v",
  LastWatched: "Last Watched v",
  Edition: "Director Cut v",
  CustomFormats: "Custom Formats v",
  Languages: "Audio Languages v",
  AudioLanguages: "Audio Languages v",
  SubtitleLanguages: "Subtitle Languages v",
  VideoHDR: "Dolby Vision v",
};
const HEADER_CAP_TARGET_WIDTH_BY_APP = {
  sonarr: {
    GBPerHour: 112,
    BitrateMbps: 152,
    VideoQuality: 184,
    Resolution: 170,
    VideoCodec: 168,
    AudioCodec: 190,
    AudioLanguages: 300,
    SubtitleLanguages: 300,
    CustomFormats: 280,
    Genres: 300,
    Tags: 240,
    LastWatched: 190,
    CutoffUnmetCount: 110,
    QualityCutoffNotMet: 110,
  },
  radarr: {
    FileSizeGB: 108,
    GBPerHour: 120,
    BitrateMbps: 154,
    Monitored: 96,
    Tags: 240,
    Studio: 320,
    OriginalLanguage: 188,
    Genres: 280,
    MissingCount: 104,
    CutoffUnmetCount: 124,
    LastSearchTime: 190,
    Edition: 170,
    QualityCutoffNotMet: 130,
    Languages: 300,
    AudioLanguages: 300,
    SubtitleLanguages: 300,
    LastWatched: 190,
  },
};
const HEADER_CAP_EXTRA_PX = 4;
const RENDER_BATCH_SIZE = 300;
const RENDER_BATCH_MIN = 1200;
const RENDER_BATCH_SIZE_LARGE = 600;
const RENDER_BATCH_LARGE_MIN = 7000;
const RADARR_RENDER_BATCH_MIN = 800;
const RADARR_VIRTUAL_MIN_ROWS = 1000;
const LAZY_CELL_BATCH_SIZE = 240;
const RADARR_LAZY_CELL_BATCH_SIZE = 320;
const STARTUP_LAZY_CELL_BATCH_SIZE = 120;
const STARTUP_RADARR_LAZY_CELL_BATCH_SIZE = 160;
const HYDRATE_FRAME_BUDGET_MS = 10;
const RADARR_HYDRATE_FRAME_BUDGET_MS = 14;
const STARTUP_HYDRATE_FRAME_BUDGET_MS = 6;
const STARTUP_RADARR_HYDRATE_FRAME_BUDGET_MS = 8;
const STARTUP_HYDRATE_DELAY_MS = 120;
const RENDER_FRAME_BUDGET_MS = 10;
const RADARR_RENDER_FRAME_BUDGET_MS = 12;
const RENDER_FRAME_CHECK_EVERY = 25;
const RADARR_RENDER_FRAME_CHECK_EVERY = 20;

let sonarrBase = "";
let radarrBase = "";
let renderToken = 0;
let sonarrHeaderNormalized = false;
const rowCacheByApp = { sonarr: new Map(), radarr: new Map() };
const pendingStabilizeByApp = { sonarr: false, radarr: false };

let radarrPosterTooltipEl = null;
let radarrPosterTooltipImg = null;
let radarrPosterHoverTimer = 0;
let radarrPosterHoverKey = "";

function ensureRadarrPosterTooltip() {
  if (radarrPosterTooltipEl) return radarrPosterTooltipEl;
  const el = document.createElement("div");
  el.className = "radarr-poster-tooltip";
  el.setAttribute("aria-hidden", "true");
  const img = document.createElement("img");
  img.className = "radarr-poster-tooltip__img";
  img.alt = "";
  img.decoding = "async";
  img.loading = "lazy";
  el.appendChild(img);
  document.body.appendChild(el);
  radarrPosterTooltipEl = el;
  radarrPosterTooltipImg = img;
  return el;
}

function hideRadarrPosterTooltip() {
  if (radarrPosterHoverTimer) {
    clearTimeout(radarrPosterHoverTimer);
    radarrPosterHoverTimer = 0;
  }
  radarrPosterHoverKey = "";
  if (radarrPosterTooltipImg) {
    radarrPosterTooltipImg.removeAttribute("src");
  }
  if (radarrPosterTooltipEl) {
    radarrPosterTooltipEl.classList.remove("is-visible");
  }
}

function positionRadarrPosterTooltip(anchorRect) {
  if (!radarrPosterTooltipEl || !anchorRect) return;
  const margin = 10;
  const width = radarrPosterTooltipEl.offsetWidth || 190;
  const height = radarrPosterTooltipEl.offsetHeight || 285;
  let left = anchorRect.right + 12;
  let top = anchorRect.top + Math.max(0, (anchorRect.height - height) / 2);
  const maxLeft = window.innerWidth - width - margin;
  const maxTop = window.innerHeight - height - margin;
  if (left > maxLeft) left = Math.max(margin, anchorRect.left - width - 12);
  if (top > maxTop) top = maxTop;
  if (top < margin) top = margin;
  radarrPosterTooltipEl.style.left = `${Math.round(left)}px`;
  radarrPosterTooltipEl.style.top = `${Math.round(top)}px`;
}

function setupRadarrPosterTooltipDelegation() {
  if (!RADARR_IMAGES_ENABLED) return;
  if (setupRadarrPosterTooltipDelegation._done) return;
  setupRadarrPosterTooltipDelegation._done = true;

  document.addEventListener("pointerover", (e) => {
    const target = e.target;
    if (!target || !(target instanceof Element)) return;
    const titleEl = target.closest('a.title-link.title-text, span.title-text');
    if (!titleEl) return;
    const cell = titleEl.closest('td[data-col="Title"], td[data-col="Name"], td.col-title, td.col-name, td.title, td.name');
    if (!cell) return;
    const table = cell.closest('table[data-app="radarr"]');
    if (!table) return;
    const rowEl = cell.closest('tr[data-row-key], tr[data-id], tr[data-movie-id]');
    if (!rowEl) return;

    const key = rowEl.dataset.rowKey || rowEl.dataset.id || rowEl.dataset.movieId || "";
    const row = key ? (rowCacheByApp.radarr.get(key) || findRowByKey("radarr", key)) : null;

    const movieId =
      row?.MovieId ?? row?.movieId ?? row?.Id ?? row?.id ??
      rowEl.dataset.movieId ?? rowEl.dataset.id;
    if (!movieId) return;
    const instId = row?.InstanceId ?? row?.instanceId ?? rowEl.dataset.instanceId ?? "radarr-1";
    const anchorRect = titleEl.getBoundingClientRect();

    if (radarrPosterHoverTimer) clearTimeout(radarrPosterHoverTimer);
    const hoverKey = `${String(instId)}:${String(movieId)}`;
    radarrPosterHoverKey = hoverKey;
    radarrPosterHoverTimer = setTimeout(() => {
      radarrPosterHoverTimer = 0;
      if (!radarrPosterHoverKey || radarrPosterHoverKey !== hoverKey) return;
      ensureRadarrPosterTooltip();
      if (!radarrPosterTooltipEl || !radarrPosterTooltipImg) return;
      radarrPosterTooltipImg.src = `/api/radarr/asset/${encodeURIComponent(String(instId))}/poster/${encodeURIComponent(String(movieId))}`;
      radarrPosterTooltipEl.classList.add("is-visible");
      positionRadarrPosterTooltip(anchorRect);
    }, 150);
  });

  document.addEventListener("pointerout", (e) => {
    const target = e.target;
    if (!target || !(target instanceof Element)) return;
    const titleEl = target.closest('a.title-link.title-text, span.title-text');
    if (!titleEl) return;
    const cell = titleEl.closest('td[data-col="Title"], td[data-col="Name"], td.col-title, td.col-name, td.title, td.name');
    if (!cell) return;
    const table = cell.closest('table[data-app="radarr"]');
    if (!table) return;
    const related = e.relatedTarget;
    if (related && related instanceof Element && titleEl.contains(related)) return;
    hideRadarrPosterTooltip();
  });

  document.addEventListener("scroll", () => hideRadarrPosterTooltip(), true);
  window.addEventListener("resize", () => hideRadarrPosterTooltip());
}
setupRadarrPosterTooltipDelegation._done = false;
const sonarrExpansionState = {
  expandedSeries: new Set(),
  expandedSeasons: new Set(),
  extrasBySeason: new Set(),
  seasonsBySeries: new Map(),
  episodesBySeason: new Map(),
  inflight: new Map(),
  fastModeBySeries: new Map(),
  childRowsBySeries: new Map(),
  expansionHeightBySeries: new Map(),
};
const SERIES_EXPANSION_MAX_HEIGHT = 280;
const SERIES_EXPANSION_ROW_HEIGHT = 32;
const SERIES_EXPANSION_OVERSCAN = 8;
const SERIES_EXPANSION_ANIM_MS = 420;
const hydrationState = {
  token: 0,
  app: "",
  rows: [],
  index: 0,
  scheduled: false,
  perf: null,
  deferTimer: null,
};
const headerCapCacheByApp = { sonarr: new Map(), radarr: new Map() };
const headerCapKeyByApp = { sonarr: new Map(), radarr: new Map() };
const headerCapAppliedVersionByApp = { sonarr: -1, radarr: -1 };
let headerCapMeasureEl = null;
let headerCapCleanupDone = false;

function perfNow() {
  if (window.performance && typeof window.performance.now === "function") {
    return window.performance.now();
  }
  return Date.now();
}

function getRenderBatchMin(app) {
  return app === "radarr" ? RADARR_RENDER_BATCH_MIN : RENDER_BATCH_MIN;
}

function loadRenderFlags() {
  const flags = { ...DEFAULT_RENDER_FLAGS };
  if (typeof window === "undefined") return flags;
  try {
    const stored = JSON.parse(localStorage.getItem(RENDER_FLAG_STORAGE_KEY) || "{}");
    if (stored && typeof stored === "object") {
      Object.assign(flags, stored);
    }
  } catch { }
  if (window.SORTARR_RENDER_FLAGS && typeof window.SORTARR_RENDER_FLAGS === "object") {
    Object.assign(flags, window.SORTARR_RENDER_FLAGS);
  }
  return flags;
}

function resolveRenderFlag(flag, app) {
  const value = renderFlags[flag];
  if (value && typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, app)) {
      return Boolean(value[app]);
    }
  }
  if (typeof value === "boolean") return value;
  return DEFAULT_RENDER_FLAGS[flag];
}

const renderFlags = loadRenderFlags();

function startRenderPerf(summary) {
  if (!renderPerfState.enabled) return null;
  const perf = {
    id: ++renderPerfState.renderId,
    app: summary.app,
    totalRows: summary.totalRows,
    filteredRows: summary.filteredRows,
    shouldBatch: summary.shouldBatch,
    useDeferred: summary.useDeferred,
    start: perfNow(),
    renderEnd: null,
    hydrateStart: null,
    hydrateEnd: null,
    cacheHits: 0,
    cacheMisses: 0,
  };
  renderPerfState.activeId = perf.id;
  return perf;
}

function buildRenderPerfScenario() {
  if (!configState.sonarrConfigured && !configState.radarrConfigured) {
    return configState.plexConfigured ? "plex-only" : "unconfigured";
  }
  const multi = getInstanceCount("sonarr") > 1 || getInstanceCount("radarr") > 1;
  const instanceLabel = multi ? "multi-instance" : "single-instance";
  const tautulliLabel = tautulliEnabled ? "tautulli" : "no-tautulli";
  return `${instanceLabel}-${tautulliLabel}`;
}

function buildRenderPerfStory(perf) {
  if (!perf) return "";
  const rows = Number(perf.totalRows) || 0;
  const filtered = Number(perf.filteredRows) || 0;
  const batch = perf.shouldBatch ? 1 : 0;
  const deferred = perf.useDeferred ? 1 : 0;
  return `${perf.app}|rows=${rows}|filtered=${filtered}|batch=${batch}|deferred=${deferred}`;
}

function queueRenderPerfSink(perf) {
  if (!renderPerfState.enabled || !perf || perf.sent) return;
  perf.sent = true;
  const payload = {
    test: "render_perf",
    scenario: buildRenderPerfScenario(),
    story: buildRenderPerfStory(perf),
    app: perf.app,
    rows: perf.totalRows,
    filtered_rows: perf.filteredRows,
    shouldBatch: Boolean(perf.shouldBatch),
    useDeferred: Boolean(perf.useDeferred),
    renderMs: perf.renderMs,
    hydrateMs: perf.hydrateMs,
    totalMs: perf.totalMs,
    cacheHitRate: perf.cacheHitRate,
  };
  fetch(apiUrl("/api/perf/render"), {
    method: "POST",
    headers: withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => { });
}

function finalizeRenderPerf(perf) {
  if (!perf || perf.finalized) return;
  if (perf.id !== renderPerfState.activeId) return;
  if (perf.hydrateStart && !perf.hydrateEnd) return;
  if (!perf.renderEnd) {
    perf.renderEnd = perfNow();
  }
  const end = perf.hydrateEnd || perf.renderEnd;
  perf.renderMs = Number((perf.renderEnd - perf.start).toFixed(2));
  perf.hydrateMs = perf.hydrateStart && perf.hydrateEnd
    ? Number((perf.hydrateEnd - perf.hydrateStart).toFixed(2))
    : 0;
  perf.totalMs = Number((end - perf.start).toFixed(2));
  const cacheTotal = perf.cacheHits + perf.cacheMisses;
  perf.cacheHitRate = cacheTotal ? Number((perf.cacheHits / cacheTotal).toFixed(3)) : 0;
  renderPerfState.last = perf;
  window.__sortarrRenderPerf = perf;
  try { perfOverlayState.lastRenderMs = perf.totalMs; schedulePerfOverlayUpdate(); } catch { }
  console.info("[Sortarr perf]", JSON.stringify(perf));
  queueRenderPerfSink(perf);
  perf.finalized = true;
}

function noteHydrateStart(perf) {
  if (!perf || perf.hydrateStart) return;
  perf.hydrateStart = perfNow();
}

function noteHydrateEnd(perf) {
  if (!perf || perf.hydrateEnd) return;
  perf.hydrateEnd = perfNow();
  finalizeRenderPerf(perf);
  unlockColumnWidths(renderToken);
}

function updateStatusText() {
  if (!statusEl) return;
  const parts = [];
  if (statusMessage) parts.push(statusMessage);
  if (statusNotice) parts.push(statusNotice);
  statusEl.textContent = parts.join(" | ");
}

function syncChipWrapVisibility() {
  if (!chipWrapEl) return;
  const show = chipsVisible && chipsEnabled;
  chipWrapEl.classList.toggle("chip-wrap--hidden", !show);
  scheduleChipGroupLayout();
  scheduleTableWrapLayout();
}

function updateFilterUiMode() {
  const builderMode = !chipsEnabled;
  if (filterBuilder) filterBuilder.classList.toggle("hidden", !builderMode);
  if (filterInputs) filterInputs.classList.toggle("hidden", builderMode);
  if (advancedToggle) advancedToggle.classList.toggle("hidden", builderMode);
  if (advancedHelpBtn) {
    if (builderMode) {
      advancedHelpBtn.classList.add("hidden");
    } else {
      advancedHelpBtn.classList.toggle("hidden", !advancedEnabled);
    }
  }
  if (builderMode) {
    if (advancedHelp) advancedHelp.classList.add("hidden");
    if (advancedWarnings) updateAdvancedWarnings([]);
    updateFilterBuilderOptions();
  }
  scheduleTableWrapLayout();
}

function setChipsEnabled(enabled) {
  chipsEnabled = Boolean(enabled);
  if (chipsToggle) {
    chipsToggle.setAttribute("aria-pressed", chipsEnabled ? "true" : "false");
    chipsToggle.title = chipsEnabled ? t("Hide quick chips") : t("Show quick chips");
  }
  try {
    localStorage.setItem(CHIPS_ENABLED_KEY, chipsEnabled ? "1" : "0");
  } catch {
  }
  syncChipWrapVisibility();
  updateFilterUiMode();
  if ((dataByApp[activeApp] || []).length) {
    const scrollAnchor = captureTableScrollAnchor();
    render(dataByApp[activeApp] || [], { scrollAnchor });
  }
}

function setChipsVisible(visible) {
  chipsVisible = Boolean(visible);
  syncChipWrapVisibility();
  syncStatusNotice(activeApp);
}

function setStatus(msg) {
  statusMessage = msg || "";
  updateStatusText();
}

function setStatusFor(msg, durationMs) {
  const text = msg || "";
  statusMessage = text;
  updateStatusText();
  if (rowRefreshStatusTimer) {
    clearTimeout(rowRefreshStatusTimer);
    rowRefreshStatusTimer = null;
  }
  if (!text || !durationMs) return;
  rowRefreshStatusTimer = setTimeout(() => {
    rowRefreshStatusTimer = null;
    if (statusMessage === text) {
      statusMessage = "";
      updateStatusText();
    }
  }, durationMs);
}

function setRowRefreshNotice(token, message) {
  rowRefreshNoticeStartedAt = Date.now();
  if (rowRefreshFollowupTimer) {
    clearTimeout(rowRefreshFollowupTimer);
    rowRefreshFollowupTimer = null;
  }
  if (token !== rowRefreshStatusToken) return;
  setStatusFor(message, ROW_REFRESH_NOTICE_MS);
}

function showRowRefreshFollowupNow(token, message) {
  rowRefreshNoticeStartedAt = Date.now();
  if (rowRefreshFollowupTimer) {
    clearTimeout(rowRefreshFollowupTimer);
    rowRefreshFollowupTimer = null;
  }
  if (rowRefreshStatusTimer) {
    clearTimeout(rowRefreshStatusTimer);
    rowRefreshStatusTimer = null;
  }
  if (token !== rowRefreshStatusToken) return;
  setStatusFor(message, ROW_REFRESH_FOLLOWUP_MS);
}

function scheduleRowRefreshFollowup(token, message) {
  const elapsed = Date.now() - rowRefreshNoticeStartedAt;
  const delay = Math.max(0, ROW_REFRESH_NOTICE_MS - elapsed);
  if (rowRefreshFollowupTimer) {
    clearTimeout(rowRefreshFollowupTimer);
  }
  rowRefreshFollowupTimer = setTimeout(() => {
    rowRefreshFollowupTimer = null;
    if (token !== rowRefreshStatusToken) return;
    setStatusFor(message, ROW_REFRESH_FOLLOWUP_MS);
  }, delay);
}

function formatRowTitle(row, app) {
  const raw = row?.Title ?? row?.title ?? "";
  const title = String(raw || "").trim();
  if (title) return title;
  return app === "sonarr" ? "Sonarr item" : "Radarr item";
}

function setStatusNotice(msg) {
  statusNotice = filterStatusNotice(msg, activeApp);
  updateStatusText();
}

function isPageFresh() {
  return (Date.now() - PAGE_LOAD_AT) < PAGE_FRESH_NOTICE_MS;
}

function stripNoticePart(text, part) {
  if (!text) return "";
  const parts = text.split(" | ").map(piece => piece.trim()).filter(Boolean);
  return parts.filter(piece => piece !== part).join(" | ");
}

function clearPageFreshNotice() {
  if (isPageFresh()) return;
  ["sonarr", "radarr"].forEach(app => {
    if (coldCacheByApp[app] || coldCacheStickyByApp[app]) return;
    const current = noticeByApp[app];
    if (!current || !current.includes(COLD_CACHE_NOTICE)) return;
    const next = stripNoticePart(current, COLD_CACHE_NOTICE);
    if (next === current) return;
    noticeByApp[app] = next;
    if (app === activeApp) {
      setStatusNotice(next);
    }
  });
}

function schedulePageFreshNoticeClear() {
  if (pageFreshNoticeTimer) return;
  const remaining = (PAGE_LOAD_AT + PAGE_FRESH_NOTICE_MS) - Date.now();
  if (remaining <= 0) {
    clearPageFreshNotice();
    return;
  }
  pageFreshNoticeTimer = setTimeout(() => {
    pageFreshNoticeTimer = null;
    clearPageFreshNotice();
  }, remaining);
}

function shouldShowPlaybackNotice(app) {
  return Boolean(chipsVisible && tableReadyByApp[app]);
}

function filterStatusNotice(msg, app) {
  const text = msg || "";
  if (!text || shouldShowPlaybackNotice(app)) return text;
  const notice = getPlaybackMatchingNotice();
  if (!text.includes(notice)) return text;
  const parts = text.split(" | ").map(part => part.trim()).filter(Boolean);
  const filtered = parts.filter(part => part !== notice);
  return filtered.join(" | ");
}

function syncStatusNotice(app) {
  if (app !== activeApp) return;
  setStatusNotice(noticeByApp[app] || "");
}

function updateLoadingIndicator() {
  if (!loadingIndicator) return;
  loadingIndicator.classList.toggle("hidden", !(isLoading || backgroundLoading));
}

function clearLoadingUiPlaceholders() {
  STATUS_VALUE_ELS.forEach(el => {
    el.classList.remove("status-value--skeleton");
  });
  if (healthBadgesEl) {
    healthBadgesEl.classList.remove("health-badges-slot--loading");
  }
  document.body.classList.remove("sortarr-loading");
}

function setLoading(loading, label) {
  isLoading = loading;
  updateLoadingIndicator();
  if (loadBtn) loadBtn.disabled = loading;
  updatePrimaryRefreshButton();
  if (label) setStatus(label);
  if (!loading) {
    clearLoadingUiPlaceholders();
  }
}

function setBackgroundLoading(loading) {
  backgroundLoading = Boolean(loading);
  updateLoadingIndicator();
  if (tableEl) {
    tableEl.classList.add("stable-columns");
  }
}

function updateBackgroundLoading() {
  setBackgroundLoading(Boolean(tautulliPendingByApp[activeApp]));
}

function formatAgeShort(ageSeconds) {
  if (ageSeconds == null) return "--";
  if (ageSeconds < 60) return `${ageSeconds}s`;
  if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)}m`;
  if (ageSeconds < 86400) return `${Math.round(ageSeconds / 3600)}h`;
  return `${Math.round(ageSeconds / 86400)}d`;
}

function withElapsedAge(ageSeconds) {
  if (ageSeconds == null || lastStatusFetchAt == null) return ageSeconds;
  const elapsed = Math.floor((Date.now() - lastStatusFetchAt) / 1000);
  return ageSeconds + Math.max(0, elapsed);
}

function formatCacheStatus(label, ageSeconds) {
  if (ageSeconds == null) return tp("cacheAwaitingData", { label }, "%(label)s: Awaiting data");
  return tp("cacheAgeAgo", { label, age: formatAgeShort(ageSeconds) }, "%(label)s: %(age)s ago");
}

function setPartialBanner(show) {
  if (!partialBannerEl) return;
  partialBannerEl.classList.toggle("hidden", !show);
}

function updateFastModeBanner() {
  if (!fastModeBannerEl) return;
  const show = activeApp === "sonarr" && fastModeByApp.sonarr;
  fastModeBannerEl.classList.toggle("hidden", !show);
}

function getLoadedRowProgressCounts(app = activeApp) {
  const rows = Array.isArray(dataByApp?.[app]) ? dataByApp[app] : [];
  if (!rows.length) return null;
  let matched = 0;
  let unmatched = 0;
  let skipped = 0;
  let unavailable = 0;
  for (const row of rows) {
    const status = String(row?.TautulliMatchStatus || "").toLowerCase();
    if (status === "matched") matched += 1;
    else if (status === "unmatched") unmatched += 1;
    else if (status === "skipped") skipped += 1;
    else if (status === "unavailable") unavailable += 1;
  }
  const total = rows.length;
  const pending = Math.max(total - (matched + unmatched + skipped + unavailable), 0);
  return { total, matched, unmatched, skipped, unavailable, pending };
}

function resolveProgressCounts(counts, app = activeApp) {
  const src = counts && typeof counts === "object" ? counts : {};
  const loaded = getLoadedRowProgressCounts(app) || {};
  const numOr = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const matched = Math.max(0, numOr(src.matched, numOr(loaded.matched, 0)));
  const unmatched = Math.max(0, numOr(src.unmatched, numOr(loaded.unmatched, 0)));
  const skipped = Math.max(0, numOr(src.skipped, numOr(loaded.skipped, 0)));
  const unavailable = Math.max(0, numOr(src.unavailable, numOr(loaded.unavailable, 0)));

  const directTotal = numOr(src.total, NaN);
  const loadedTotal = numOr(loaded.total, NaN);
  let total = Number.isFinite(directTotal) && directTotal > 0
    ? directTotal
    : (Number.isFinite(loadedTotal) && loadedTotal > 0 ? loadedTotal : 0);

  const pendingSource = numOr(src.pending, NaN);
  let pending;
  if (Number.isFinite(pendingSource) && pendingSource >= 0) {
    pending = pendingSource;
  } else {
    if (!total) {
      total = matched + unmatched + skipped + unavailable;
    }
    pending = Math.max(total - (matched + unmatched + skipped + unavailable), 0);
  }

  if (!total) {
    total = matched + unmatched + skipped + unavailable + pending;
  }

  return { total, matched, unmatched, skipped, unavailable, pending };
}
function formatProgress(counts, configured, progressMeta, tautulliState, displayProcessed = null) {
  if (!configured) return t("notConfigured", "Not configured");

  const progressActive = Boolean(tautulliState?.refresh_in_progress && progressMeta?.total);
  const resolvedCounts = resolveProgressCounts(counts, activeApp);
  const total = progressActive ? (progressMeta?.total || 0) : resolvedCounts.total;
  if (!total) return t("noCachedData", "No cached data");

  const matched = progressActive
    ? (Number.isFinite(displayProcessed) ? displayProcessed : (progressMeta?.processed || 0))
    : resolvedCounts.matched;

  const labelKey = progressActive ? "processedLower" : "matchedLower";
  const label = t(labelKey, progressActive ? "processed" : "matched");

  const base = tp("progressBase", { matched, total, label }, "%(matched)s/%(total)s %(label)s");

  const progressAge = withElapsedAge(progressMeta?.updated_age_seconds);
  const progressAgeLabel = progressAge == null
    ? t("progressAgeUnknown", "--")
    : tp("progressAgeAgo", { age: formatAgeShort(progressAge) }, "%(age)s ago")

  const progressSuffix = progressActive
    ? tp("progressUpdatedSuffix", { ageLabel: progressAgeLabel }, " | updated %(ageLabel)s")
    : "";

  const pending = progressActive ? Math.max(total - matched, 0) : resolvedCounts.pending;
  if (pending > 0) {
    return `${base}${tp("progressPendingSuffix", { pending }, " - %(pending)s pending")}${progressSuffix}`;
  }

  const notMatched = total - matched;
  if (notMatched > 0) {
    return `${base}${tp("progressNotMatchedSuffix", { notMatched }, " - %(notMatched)s not matched")}${progressSuffix}`;
  }

  return `${base}${progressSuffix}`;
}


function formatProgressHtml(counts, configured, progressMeta, tautulliState, displayProcessed = null) {
  // Render progress status with optional clickable links to apply match-status filtering.
  if (!configured) return t("notConfigured", "Not configured");

  const progressActive = Boolean(tautulliState?.refresh_in_progress && progressMeta?.total);
  const resolvedCounts = resolveProgressCounts(counts, activeApp);
  const total = progressActive ? (progressMeta?.total || 0) : resolvedCounts.total;
  if (!total) return t("noCachedData", "No cached data");

  const matched = progressActive
    ? (Number.isFinite(displayProcessed) ? displayProcessed : (progressMeta?.processed || 0))
    : resolvedCounts.matched;

  const labelKey = progressActive ? "processedLower" : "matchedLower";
  const label = t(labelKey, progressActive ? "processed" : "matched");

  const baseText = tp("progressBase", { matched, total, label }, "%(matched)s/%(total)s %(label)s");

  const progressAge = withElapsedAge(progressMeta?.updated_age_seconds);
  const progressAgeLabel = progressAge == null
    ? t("progressAgeUnknown", "--")
    : tp("progressAgeAgo", { age: formatAgeShort(progressAge) }, "%(age)s ago");

  const progressSuffix = progressActive
    ? tp("progressUpdatedSuffix", { ageLabel: progressAgeLabel }, " | updated %(ageLabel)s")
    : "";

  // Only link when not in active refresh mode (counts are stable and filtering is meaningful).
  const base = progressActive
    ? baseText
    : `<a href="#" class="progress-link" data-progress-token="matchstatus:matched">${escapeHtml(baseText)}</a>`;

  const pending = progressActive ? Math.max(total - matched, 0) : resolvedCounts.pending;
  if (pending > 0) {
    return `${base}${tp("progressPendingSuffix", { pending }, " - %(pending)s pending")}${progressSuffix}`;
  }

  const notMatched = total - matched;
  if (notMatched > 0) {
    const notMatchedText = tp("progressNotMatchedSuffix", { notMatched }, " - %(notMatched)s not matched");
    const notMatchedSuffix = progressActive
      ? notMatchedText
      : ` - <a href="#" class="progress-link" data-progress-token="-matchstatus:matched">${escapeHtml(
        tp("progressNotMatchedLabel", { notMatched }, "%(notMatched)s not matched")
      )}</a>`;
    // If we used the linked variant, we already included the leading " - " in the template above.
    if (!progressActive) {
      return `${base}${notMatchedSuffix}${progressSuffix}`;
    }
    return `${base}${notMatchedText}${progressSuffix}`;
  }


  return `${base}${progressSuffix}`;
}

function applyProgressStatusFilter(token) {
  if (!token) return;

  const tokens = (chipQuery || "").split(/\s+/).filter(Boolean);
  const next = [];

  // Remove any existing matchstatus tokens.
  for (const tkn of tokens) {
    const raw = tkn.startsWith("-") ? tkn.slice(1) : tkn;
    if (raw.startsWith("matchstatus")) continue;
    next.push(tkn);
  }

  const hasSame = tokens.includes(token);
  if (!hasSame) {
    next.push(token);
  }

  chipQuery = next.join(" ").trim();

  renderActiveFilterChips();
  syncChipButtonsToQuery();

  if (tableReadyByApp[activeApp]) {
    pendingStabilizeByApp[activeApp] = true;
  }
  const scrollAnchor = captureTableScrollAnchor();
  scheduleChipRender(scrollAnchor);
  scheduleViewStateSave();
}


function formatTautulliStatus(state, progressMeta) {
  if (!state || !state.configured) return t("notConfigured", "Not configured");

  if (state.refresh_in_progress) {
    const total = Number.isFinite(progressMeta?.total) ? progressMeta.total : 0;
    if (total > 0) return t("matchingInProgress", "Matching in progress");
    return tp("receivingPlaybackData", { label: getPlaybackLabel() }, "Receiving %(label)s data...");
  }

  if (state.status === "stale") return t("awaitingData", "Awaiting data");

  const age = formatAgeShort(withElapsedAge(state.index_age_seconds));
  if (age === "--") return t("matched", "Matched");
  return tp("matchedWithAge", { age }, `Matched (${age} ago)`);
}


function formatStatusPillText(appState, tautulli, displayProcessed = null) {
  if (!appState?.configured) return t("dataStatus", "Data status");

  if (tautulli?.configured && tautulli.refresh_in_progress) {
    const total = appState?.progress?.total || 0;

    if (!total) {
      return tp("receivingPlaybackData", { label: getPlaybackLabel() }, "Receiving %(label)s data...");
    }

    const processed = Number.isFinite(displayProcessed)
      ? displayProcessed
      : (appState?.progress?.processed || 0);

    return `${t("matching", "Matching")} ${processed}/${total}`;
  }

  if (isStatusPillLoadedActive(appState, tautulli)) {
    return t("dataLoaded", "Data loaded");
  }

  return t("dataStatus", "Data status");
}


function updateStatusPill(appState, tautulli, displayProcessed = null) {
  if (!statusPillEl) return;

  statusPillEl.textContent = formatStatusPillText(appState, tautulli, displayProcessed);

  const progress = appState?.progress;
  let title = t("hoverToExpandDataStatus", "Hover to expand data status");

  const showLoaded = isStatusPillLoadedActive(appState, tautulli);

  if (tautulli?.configured && tautulli.refresh_in_progress) {
    if (progress?.total) {
      const processed = Number.isFinite(displayProcessed)
        ? displayProcessed
        : (progress.processed || 0);

      title = tp(
        "matchingInProgressHoverProcessed",
        { label: getPlaybackLabel(), processed, total: progress.total },
        `${getPlaybackLabel()} matching in progress (${processed}/${progress.total} processed). Hover to expand status.`
      );
    } else {
      title = tp(
        "receivingPlaybackDataHover",
        { label: getPlaybackLabel() },
        "Receiving %(label)s data... Hover to expand status."
      );
    }
  } else if (showLoaded) {
    title = t("dataLoadedHover", "Data loaded. Hover to expand status.");
  }

  statusPillEl.title = title;

  statusPillEl.classList.toggle("status-pill--pending", Boolean(tautulli?.refresh_in_progress));
  statusPillEl.classList.toggle("status-pill--loaded", showLoaded);
}

function pauseStatusCountdown() {
  clearStatusCountdown();
  statusCountdownRemaining = STATUS_COUNTDOWN_SECONDS;
  muteStatusCompleteNote(true);
}

function shouldAutoHideStatus(appState, tautulli) {
  if (!appState?.configured) return false;
  const counts = appState?.counts;
  const hasCountTotal = Number.isFinite(counts?.total);
  const tableReady = tableReadyByApp[activeApp] === true;
  const playbackRefreshDone = !tautulli?.configured || !tautulli.refresh_in_progress;
  const progressComplete = playbackRefreshDone && (hasCountTotal || tableReady);
  const cacheAge = appState?.cache?.memory_age_seconds ?? appState?.cache?.disk_age_seconds;
  const cacheReady = Boolean(appState?.configured && cacheAge != null);
  return progressComplete && cacheReady;
}
function clearStatusCountdown() {
  if (statusCountdownTimer) {
    clearInterval(statusCountdownTimer);
    statusCountdownTimer = null;
  }
  statusCountdownRemaining = 0;
}

function clearStatusPillTimer() {
  if (statusPillTimer) {
    clearTimeout(statusPillTimer);
    statusPillTimer = null;
  }
}

function isStatusHovering() {
  if (!statusRowEl) return false;
  return statusRowEl.matches(":hover") ||
    (statusPillEl && statusPillEl.matches(":hover"));
}

function clearStatusPillLoaded() {
  if (statusPillLoadedTimer) {
    clearTimeout(statusPillLoadedTimer);
    statusPillLoadedTimer = null;
  }
  statusPillLoadedUntil = 0;
}

function startStatusPillLoaded() {
  clearStatusPillLoaded();
  statusPillLoadedUntil = Date.now() + STATUS_PILL_LOADED_MS;
  statusPillLoadedTimer = setTimeout(() => {
    statusPillLoadedTimer = null;
    statusPillLoadedUntil = 0;
    updateStatusPanel();
  }, STATUS_PILL_LOADED_MS);
  updateStatusPanel();
}

function isStatusPillLoadedActive(appState, tautulli) {
  if (!appState?.configured) return false;
  if (!tautulli?.configured || tautulli.refresh_in_progress) return false;
  if (!statusPillLoadedUntil) return false;
  return Date.now() < statusPillLoadedUntil;
}

function shouldShowStatusPill() {
  return true;
}

function syncStatusPillVisibility() {
  if (!statusPillEl) return;
  statusPillEl.classList.toggle("status-pill--hidden", !shouldShowStatusPill());
}

function getProgressDisplayState(app) {
  return progressDisplayByApp[app] || null;
}

function stopProgressDisplayTimer(app) {
  const state = getProgressDisplayState(app);
  if (!state || !state.timer) return;
  clearInterval(state.timer);
  state.timer = null;
}

function resetProgressDisplay(app) {
  const state = getProgressDisplayState(app);
  if (!state) return;
  stopProgressDisplayTimer(app);
  state.processed = 0;
  state.total = 0;
  state.targetProcessed = 0;
  state.targetTotal = 0;
  state.startedTs = 0;
}

function updateProgressTargets(app, progressMeta, tautulliState) {
  const state = getProgressDisplayState(app);
  if (!state) return null;
  const totalRaw = progressMeta?.total;
  const total = Number.isFinite(totalRaw) ? Math.max(0, totalRaw) : 0;
  const refreshing = Boolean(tautulliState?.refresh_in_progress && total > 0);
  if (!refreshing) {
    resetProgressDisplay(app);
    return null;
  }
  const processedRaw = progressMeta?.processed;
  const processed = Number.isFinite(processedRaw)
    ? Math.max(0, Math.min(total, processedRaw))
    : 0;
  const startedTs = Number.isFinite(progressMeta?.started_ts) ? progressMeta.started_ts : 0;
  if (!state.startedTs || (startedTs && startedTs !== state.startedTs)) {
    state.startedTs = startedTs || state.startedTs;
    state.processed = 0;
    state.total = total;
  }
  if (total !== state.total) {
    state.total = total;
  }
  if (processed < state.processed) {
    state.processed = processed;
  }
  state.targetProcessed = processed;
  state.targetTotal = total;
  if (state.processed < state.targetProcessed) {
    startProgressDisplayTimer(app);
  }
  return state;
}

function renderProgressStatus(appState, tautulliState) {
  const displayState = getProgressDisplayState(activeApp);
  const displayProcessed = displayState?.total
    ? displayState.processed
    : null;
  if (progressStatusEl) {
    if (tautulliState && tautulliState.configured) {
      progressStatusEl.innerHTML = formatProgressHtml(
        appState?.counts,
        appState?.configured,
        appState?.progress,
        tautulliState,
        displayProcessed
      );
    } else {
      progressStatusEl.textContent = "--";
    }
  }
  updateStatusPill(appState, tautulliState, displayProcessed);
}

function startProgressDisplayTimer(app) {
  const state = getProgressDisplayState(app);
  if (!state || state.timer) return;
  state.timer = setInterval(() => {
    if (activeApp !== app) {
      stopProgressDisplayTimer(app);
      return;
    }
    const remaining = state.targetProcessed - state.processed;
    if (remaining <= 0) {
      stopProgressDisplayTimer(app);
      return;
    }
    const step = Math.max(1, Math.ceil(remaining / PROGRESS_ANIMATION_STEPS));
    state.processed = Math.min(state.targetProcessed, state.processed + step);
    renderProgressStatus(statusState.apps?.[activeApp], statusState.tautulli);
  }, PROGRESS_ANIMATION_INTERVAL_MS);
}

function markStatusReadyFromRows(rowCount) {
  if (statusReadyAfterFirstData) return;
  if (!Number.isFinite(rowCount) || rowCount <= 0) return;
  statusReadyAfterFirstData = true;
  updateStatusPanel();
}

function showStatusRow() {
  if (!statusRowEl || !statusReadyAfterFirstData) return;
  clearStatusPillTimer();
  statusRowEl.classList.remove("status-row--hidden");
  statusCollapsed = false;
  syncStatusPillVisibility();
}

function hideStatusRow() {
  if (!statusRowEl) return;
  clearStatusPillTimer();
  statusRowEl.classList.add("status-row--hidden");
  statusCollapsed = true;
  syncStatusPillVisibility();
}

function updateStatusCompleteNote(text, show) {
  if (!statusCompleteNoteEl) return;
  statusCompleteNoteEl.textContent = text || "";
  statusCompleteNoteEl.classList.toggle("hidden", !show);
  statusCompleteNoteEl.classList.remove("status-complete--muted");
}

function muteStatusCompleteNote(muted) {
  if (!statusCompleteNoteEl || statusCompleteNoteEl.classList.contains("hidden")) return;
  statusCompleteNoteEl.classList.toggle("status-complete--muted", muted);
}

function startStatusCountdown() {
  if (!statusRowEl || !statusCompleteNoteEl) return;
  if (statusRowEl.classList.contains("status-row--hidden") || statusCountdownTimer) return;

  const renderCountdownText = () =>
    t(
      "dataLoadedHidingIn",
      "Data loaded. Hiding in %(seconds)s…",
      { seconds: statusCountdownRemaining }
    );

  statusCountdownRemaining = STATUS_COUNTDOWN_SECONDS;
  updateStatusCompleteNote(renderCountdownText(), true);

  if (statusFlashTimer) {
    clearTimeout(statusFlashTimer);
    statusFlashTimer = null;
  }

  statusRowEl.classList.remove("status-row--complete-flash");
  if (!statusCompletionFlashed) {
    void statusRowEl.offsetWidth;
    statusRowEl.classList.add("status-row--complete-flash");
    statusCompletionFlashed = true;
    statusFlashTimer = setTimeout(() => {
      statusRowEl.classList.remove("status-row--complete-flash");
      statusFlashTimer = null;
    }, 2600);
  }

  statusCountdownTimer = setInterval(() => {
    if (isStatusHovering()) return;

    statusCountdownRemaining -= 1;
    if (statusCountdownRemaining <= 0) {
      clearStatusCountdown();
      updateStatusCompleteNote("", false);
      hideStatusRow();
      return;
    }

    updateStatusCompleteNote(renderCountdownText(), true);
  }, 1000);
}

function updateStatusRowVisibility(appState, tautulli) {
  if (!statusRowEl) return;
  if (!statusReadyAfterFirstData) {
    hideStatusRow();
    return;
  }
  const shouldAutoHide = shouldAutoHideStatus(appState, tautulli);
  const hovering = isStatusHovering();
  if (shouldAutoHide) {
    if (hovering) {
      pauseStatusCountdown();
    } else {
      startStatusCountdown();
    }
  } else {
    clearStatusCountdown();
    statusCompletionFlashed = false;
    updateStatusCompleteNote("", false);
    showStatusRow();
  }
}

// Mobile: no hover, so allow tap to expand (only when collapsed).
statusEl.addEventListener(
  "touchstart",
  () => {
    if (statusCollapsed) showStatusRow();
  },
  { passive: true }
);

if (statusPillEl) {
  statusPillEl.addEventListener("touchstart", showStatusRow, { passive: true });
}


function syncStatusPillVisibility() {
  if (!statusPillEl) return;
  statusPillEl.classList.toggle("status-pill--hidden", !shouldShowStatusPill());
}


function updateArrRefreshButton(btn, configured) {
  if (!btn) return;
  const busy = btn.getAttribute("data-busy") === "1";
  btn.classList.toggle("hidden", !configured);
  btn.disabled = !configured || busy;
}

function getAppConfigured(app) {
  if (app === "sonarr") {
    return Boolean(configState.sonarrConfigured || statusState.apps?.sonarr?.configured);
  }
  return Boolean(configState.radarrConfigured || statusState.apps?.radarr?.configured);
}

function normalizeInstanceId(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function getArrRefreshInstances(app) {
  const instances = instanceConfig[app] || [];
  if (instances.length) return instances;
  if (!getAppConfigured(app)) return [];
  return [{ id: "", name: "" }];
}

function getAppLabel(app) {
  return app === "sonarr" ? t("tabShows", "Shows") : t("tabMovies", "Movies");
}

function getArrRefreshSuffix(app, instance, index, total) {
  if (total <= 1) return "";
  const appLabel = getAppLabel(app);
  const name = String(instance?.name || "").trim();
  if (name) return name;
  return `${appLabel} ${index + 1}`;
}



function formatArrRefreshLabel(app, suffix) {
  const appLabel = getAppLabel(app);
  const base = t(
    "refreshArrMetadata",
    "Refresh %(appLabel)s metadata",
    { appLabel }
  );
  if (!suffix) return base;
  return t(
    "refreshArrMetadataWithSuffix",
    "%(base)s (%(suffix)s)",
    { base, suffix }
  );
}

function formatArrRefreshStatusLabel(app, suffix) {
  const appLabel = getAppLabel(app);
  if (!suffix) return appLabel;
  return `${appLabel} (${suffix})`;
}

function updatePrimaryRefreshButton() {
  if (!refreshTabBtn) return;
  const appLabel = getAppLabel(activeApp);
  const configured = getAppConfigured(activeApp);

  refreshTabBtn.textContent = t(
    "refreshArrData",
    "Refresh %(appLabel)s data",
    { appLabel }
  );
  refreshTabBtn.title = t(
    "refreshArrDataTitle",
    "Refresh %(appLabel)s metadata, reload %(appLabel)s data, and update the cache.",
    { appLabel }
  );
  refreshTabBtn.disabled = !configured || isLoading;
}

requestAnimationFrame(() => {
  const activeData = dataByApp[activeApp] || [];
  if (!activeData.length) {
    clearTable();
    load(false);
  } else {
    render(activeData);
  }
});

async function refreshActiveAppData() {
  const app = activeApp;
  const appLabel = getAppLabel(app);
  if (!getAppConfigured(app)) {
    setStatus(t("appNotConfigured", "%(app)s is not configured.", { app: appLabel }));
    return;
  }
  setStatus(t("refreshingAppData", "Refreshing %(app)s data...", { app: appLabel }));
  try {
    await requestArrRefresh(app);
    setStatus(t("appMetadataRefreshQueued", "%(app)s metadata refresh queued.", { app: appLabel }));
  } catch (e) {
    setStatus(t("errorPrefix", "Error: ") + e.message);
  }
  load(true);
}

function updateArrRefreshButtons() {
  if (!arrRefreshButtonsEl) return;
  const app = activeApp;
  const configured = getAppConfigured(app);
  const instances = getArrRefreshInstances(app);
  const busySet = arrRefreshBusy[app];
  const keyParts = [
    app,
    configured ? "1" : "0",
    instances.map(inst => `${normalizeInstanceId(inst?.id)}:${String(inst?.name || "")}`).join("|"),
    Array.from(busySet).sort().join(","),
  ];
  const renderKey = keyParts.join("||");
  if (renderKey === arrRefreshRenderKey) return;
  arrRefreshRenderKey = renderKey;
  arrRefreshButtonsEl.textContent = "";
  if (!configured || !instances.length) {
    arrRefreshButtonsEl.classList.add("hidden");
    return;
  }
  arrRefreshButtonsEl.classList.remove("hidden");
  instances.forEach((inst, index) => {
    const suffix = getArrRefreshSuffix(app, inst, index, instances.length);
    const label = formatArrRefreshLabel(app, suffix);
    const statusLabel = formatArrRefreshStatusLabel(app, suffix);
    const instanceId = normalizeInstanceId(inst?.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.title = t(
      "askArrRefreshMetadata",
      "Ask %(app)s to refresh its metadata. Sortarr updates on the next fetch.",
      { app: statusLabel }
    );
    btn.dataset.app = app;
    if (instanceId) btn.dataset.instanceId = instanceId;
    const busy = busySet.has(instanceId);
    btn.disabled = !configured || busy;
    if (busy) btn.setAttribute("data-busy", "1");
    btn.addEventListener("click", async () => {
      if (busySet.has(instanceId)) return;
      busySet.add(instanceId);
      updateArrRefreshButtons();
      setStatus(t("refreshingAppData", "Refreshing %(app)s data...", { app: statusLabel }));
      try {
        await requestArrRefresh(app, instanceId ? { instanceId } : {});
        setStatus(t("appRefreshQueued", "%(app)s refresh queued.", { app: statusLabel }));
      } catch (e) {
        setStatus(t("errorPrefix", "Error: ") + e.message);
      } finally {
        busySet.delete(instanceId);
        updateArrRefreshButtons();
      }
    });
    arrRefreshButtonsEl.appendChild(btn);
  });
}

function updateStatusPanel() {
  if (!progressStatusEl && !tautulliStatusEl && !cacheStatusEl) return;
  const appState = statusState.apps?.[activeApp];
  const tautulli = statusState.tautulli;
  const progressBlock = progressStatusEl?.closest(".status-block");
  if (progressBlock) {
    progressBlock.classList.toggle("hidden", !(tautulli && tautulli.configured));
  }
  const ageSeed = appState?.cache?.memory_age_seconds ??
    appState?.cache?.disk_age_seconds ??
    tautulli?.index_age_seconds;
  if (ageSeed != null && lastStatusFetchAt == null) {
    lastStatusFetchAt = Date.now();
  }

  updateProgressTargets(activeApp, appState?.progress, tautulli);
  renderProgressStatus(appState, tautulli);
  if (tautulliStatusEl) {
    tautulliStatusEl.textContent = formatTautulliStatus(tautulli, appState?.progress);
  }
  if (cacheStatusEl) {
    const parts = [];
    const appCache = statusState.apps?.[activeApp]?.cache;
    if (statusState.apps?.[activeApp]?.configured) {
      const label = t(activeApp === "sonarr" ? "Sonarr" : "Radarr");
      const appAgeSeconds = appCache?.memory_age_seconds ?? appCache?.disk_age_seconds;
      parts.push(formatCacheStatus(label, withElapsedAge(appAgeSeconds)));
    }
    if (tautulli && tautulli.configured) {
      parts.push(formatCacheStatus(getPlaybackLabel(), withElapsedAge(tautulli.index_age_seconds)));
    }
    cacheStatusEl.textContent = parts.length ? parts.join(" | ") : "--";
  }
  setPartialBanner(Boolean(tautulli?.partial));
  if (refreshTautulliBtn) {
    refreshTautulliBtn.classList.toggle("hidden", !(tautulli && tautulli.configured));
    refreshTautulliBtn.disabled = !(tautulli && tautulli.configured);
  }
  if (deepRefreshTautulliBtn) {
    deepRefreshTautulliBtn.classList.toggle("hidden", !(tautulli && tautulli.configured));
    deepRefreshTautulliBtn.disabled = !(tautulli && tautulli.configured);
  }
  updatePrimaryRefreshButton();
  updateStatusRowVisibility(appState, tautulli);
}

function syncTautulliPendingFromStatus(prevTautulli, nextTautulli) {
  if (!nextTautulli?.configured) return;
  if (nextTautulli.refresh_in_progress) {
    if (configState.sonarrConfigured) setTautulliPending("sonarr", true);
    if (configState.radarrConfigured) setTautulliPending("radarr", true);
    updateBackgroundLoading();
    return;
  }
  if (prevTautulli?.refresh_in_progress) {
    if (configState.sonarrConfigured) setTautulliPending("sonarr", false);
    if (configState.radarrConfigured) setTautulliPending("radarr", false);
    updateBackgroundLoading();
  }
}

function scheduleTautulliRefreshReload() {
  if (tautulliRefreshReloadTimer) return;
  tautulliRefreshReloadTimer = setTimeout(() => {
    tautulliRefreshReloadTimer = null;
    if (configState.sonarrConfigured) {
      if (activeApp === "sonarr") {
        load(false, { background: true });
      } else {
        prefetch("sonarr", false, { background: true, force: true });
      }
    }
    if (configState.radarrConfigured) {
      if (activeApp === "radarr") {
        load(false, { background: true });
      } else {
        prefetch("radarr", false, { background: true, force: true });
      }
    }
  }, 200);
}

function handleTautulliRefreshState(prevTautulli, nextTautulli) {
  if (!nextTautulli?.configured) {
    clearStatusPillLoaded();
    return;
  }
  const wasRefreshing = Boolean(prevTautulli?.refresh_in_progress);
  const isRefreshing = Boolean(nextTautulli?.refresh_in_progress);
  if (isRefreshing) {
    clearStatusPillLoaded();
  }
  if (wasRefreshing && !isRefreshing) {
    startStatusPillLoaded();
    scheduleTautulliRefreshReload();
  }
}

function scheduleStatusPoll() {
  if (statusPollTimer) return;
  if (!statusState.tautulli?.refresh_in_progress) return;
  const progress = statusState.apps?.[activeApp]?.progress;
  const hasProgress = Number.isFinite(progress?.total) && Number.isFinite(progress?.processed);
  const interval = hasProgress && progress.processed < progress.total
    ? TAUTULLI_STATUS_POLL_INTERVAL_MS
    : TAUTULLI_POLL_INTERVAL_MS;
  statusPollTimer = window.setTimeout(() => {
    statusPollTimer = null;
    if (document.hidden) return;
    fetchStatus({ silent: true, lite: true });
  }, interval);
}


  function enableTablePinchZoom() {
    const wrap = document.querySelector(".table-wrap");
    if (!wrap) return;


    if (wrap.dataset.pinchZoomEnabled === "1") return;

    // Allow the browser to handle page pinch-zoom everywhere else,
    // but take over pinch gestures that start on the table area.
    let table = wrap.querySelector("table");
    if (!table) return;

    wrap.dataset.pinchZoomEnabled = "1";

    let inner = wrap.querySelector(".table-zoom-inner");
    if (!inner) {
      inner = document.createElement("div");
      inner.className = "table-zoom-inner";
      table.parentNode.insertBefore(inner, table);
      inner.appendChild(table);
    }

    let scale = 1;
    let startScale = 1;
    let startDist = 0;
    let baseW = 0;
    let baseH = 0;
    let isPinching = false;
    let measureFrame = null;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    const dist = (t1, t2) => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.hypot(dx, dy);
    };

    const getAnchor = (clientX, clientY) => {
      const rect = wrap.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      const offsetY = clientY - rect.top;
      return {
        offsetX,
        offsetY,
        contentX: (wrap.scrollLeft + offsetX) / scale,
        contentY: (wrap.scrollTop + offsetY) / scale,
      };
    };

    const applyScale = (nextScale, anchor = null) => {
      scale = clamp(nextScale, 0.85, 2.75);
      inner.style.transformOrigin = "0 0";
      inner.style.transform = `scale(${scale})`;

      // Keep the scrollable area consistent with the scaled table size.
      if (baseW && baseH) {
        inner.style.width = `${Math.ceil(baseW * scale)}px`;
        inner.style.height = `${Math.ceil(baseH * scale)}px`;
      }
      if (anchor && baseW && baseH) {
        const scaledW = Math.ceil(baseW * scale);
        const scaledH = Math.ceil(baseH * scale);
        const maxLeft = Math.max(0, scaledW - wrap.clientWidth);
        const maxTop = Math.max(0, scaledH - wrap.clientHeight);
        const nextLeft = anchor.contentX * scale - anchor.offsetX;
        const nextTop = anchor.contentY * scale - anchor.offsetY;
        wrap.scrollLeft = Math.max(0, Math.min(maxLeft, nextLeft));
        wrap.scrollTop = Math.max(0, Math.min(maxTop, nextTop));
      }
    };

    const getTouchCenter = (t1, t2) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const scheduleMeasure = () => {
      if (measureFrame) return;
      measureFrame = requestAnimationFrame(() => {
        measureFrame = null;
        measureBase();
      });
    };

    const measureBase = () => {
      // Reset transforms to measure intrinsic size
      inner.style.transform = "scale(1)";
      inner.style.width = "";
      inner.style.height = "";

      // Re-find table in case the app re-rendered it
      const newTable = wrap.querySelector("table");
      if (newTable && newTable !== table) {
        table = newTable;
        inner.innerHTML = "";
        inner.appendChild(table);
      }

      baseW = table ? table.offsetWidth : baseW;
      baseH = table ? table.offsetHeight : baseH;
      applyScale(scale);
    };

    // Re-measure after layout-affecting DOM updates in the table area
    const obs = new MutationObserver(() => {
      scheduleMeasure();
    });
    obs.observe(wrap, { childList: true, subtree: true });

    scheduleMeasure();

    // iOS Safari requires passive:false to prevent default pinch-zoom.
    wrap.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches && e.touches.length === 2) {
          e.preventDefault();
          isPinching = true;
          startScale = scale;
          startDist = dist(e.touches[0], e.touches[1]);
        }
      },
      { passive: false }
    );

    wrap.addEventListener(
      "touchmove",
      (e) => {
        if (!isPinching) return;
        if (!e.touches || e.touches.length !== 2) return;

        // This prevents the page from zooming when the pinch starts on the table.
        e.preventDefault();

        const d = dist(e.touches[0], e.touches[1]);
        if (!startDist) return;
        const center = getTouchCenter(e.touches[0], e.touches[1]);
        const anchor = getAnchor(center.x, center.y);
        const nextScale = startScale * (d / startDist);
        requestApplyScale(nextScale, anchor);
      },
      { passive: false }
    );

    wrap.addEventListener(
      "touchend",
      (e) => {
        if (!e.touches || e.touches.length < 2) {
          isPinching = false;
          startDist = 0;
        }
      },
      { passive: true }
    );

    if (document.documentElement.classList.contains("is-ios")) {
      ["gesturestart", "gesturechange", "gestureend"].forEach(eventName => {
        wrap.addEventListener(
          eventName,
          (e) => {
            e.preventDefault();
            if (eventName === "gestureend") {
              isPinching = false;
              startDist = 0;
            }
          },
          { passive: false }
        );
      });
    }
    const isFirefox = document.documentElement.classList.contains("is-firefox");
    wrap.addEventListener(
      "wheel",
      (e) => {
        if (!isFirefox || !e.ctrlKey) return;
        if (!wrap.contains(e.target)) return;
        e.preventDefault();
        const anchor = getAnchor(e.clientX, e.clientY);
        const zoomFactor = Math.exp(-e.deltaY * 0.002);
        requestApplyScale(scale * zoomFactor, anchor);
      },
      { passive: false }
    );

    // Optional: double-tap to reset zoom on touch devices
    let lastTap = 0;
    wrap.addEventListener(
      "touchend",
      (e) => {
        if (isPinching) return;
        if (e.changedTouches && e.changedTouches.length === 1) {
          const now = Date.now();
          if (now - lastTap < 320) {
            const touch = e.changedTouches[0];
            const anchor = touch ? getAnchor(touch.clientX, touch.clientY) : null;
            applyScale(1, anchor);
            lastTap = 0;
          } else {
            lastTap = now;
          }
        }
      },
      { passive: false }
    );
  }

  function enableTableScrollChaining() {
    if (!tableWrapEl) return;
    if (!document.documentElement.classList.contains("is-ios")) return;
    let tracking = false;
    let lastY = 0;
    tableWrapEl.addEventListener(
      "touchstart",
      (e) => {
        if (!e.touches || e.touches.length !== 1) {
          tracking = false;
          return;
        }
        tracking = true;
        lastY = e.touches[0].clientY;
      },
      { passive: true }
    );
    tableWrapEl.addEventListener(
      "touchmove",
      (e) => {
        if (!tracking || !e.touches || e.touches.length !== 1) return;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - lastY;
        lastY = currentY;
        const maxScroll = Math.max(0, tableWrapEl.scrollHeight - tableWrapEl.clientHeight);
        if (maxScroll <= 0) return;
        const atTop = tableWrapEl.scrollTop <= 0;
        const atBottom = tableWrapEl.scrollTop >= maxScroll - 1;
        if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
          window.scrollBy(0, -deltaY);
        }
      },
      { passive: true }
    );
    tableWrapEl.addEventListener(
      "touchend",
      () => {
        tracking = false;
      },
      { passive: true }
    );
  }

  function enableStatusRowScrollChaining() {
    if (!statusRowEl) return;
    if (!document.documentElement.classList.contains("is-coarse")) return;
    let tracking = false;
    let lastY = 0;
    statusRowEl.addEventListener(
      "touchstart",
      (e) => {
        if (!e.touches || e.touches.length !== 1) {
          tracking = false;
          return;
        }
        tracking = true;
        lastY = e.touches[0].clientY;
      },
      { passive: true }
    );
    statusRowEl.addEventListener(
      "touchmove",
      (e) => {
        if (!tracking || !e.touches || e.touches.length !== 1) return;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - lastY;
        lastY = currentY;
        if (!deltaY) return;
        if (!tableWrapEl) return;
        const maxScroll = Math.max(0, tableWrapEl.scrollHeight - tableWrapEl.clientHeight);
        if (maxScroll <= 0) return;
        const nextTop = Math.max(0, Math.min(maxScroll, tableWrapEl.scrollTop - deltaY));
        if (nextTop === tableWrapEl.scrollTop) return;
        e.preventDefault();
        tableWrapEl.scrollTop = nextTop;
      },
      { passive: false }
    );
    statusRowEl.addEventListener(
      "touchend",
      () => {
        tracking = false;
      },
      { passive: true }
    );
  }
function mergeStatusApps(prevApps, nextApps) {
  if (!nextApps) return prevApps;
  const merged = { ...(prevApps || {}) };
  ["sonarr", "radarr"].forEach(app => {
    const next = nextApps[app];
    if (!next) return;
    const prev = (prevApps && prevApps[app]) || {};
    const nextHasCounts = Object.prototype.hasOwnProperty.call(next, "counts");
    merged[app] = {
      ...prev,
      ...next,
      counts: nextHasCounts ? next.counts : prev.counts,
    };
  });
  return merged;
}


function buildHealthTooltip(data, allowedTypes = null) {
  if (!data) return "";
  const parts = [];
  const instances = Array.isArray(data.instances) ? data.instances : [];
  for (const inst of instances) {
    const name = inst?.name || inst?.id || "";
    if (inst?.error) {
      if (!allowedTypes || allowedTypes.has("error")) parts.push(`${name}: ${inst.error}`);
      continue;
    }
    const alerts = Array.isArray(inst?.alerts) ? inst.alerts : [];
    for (const a of alerts) {
      const t = (a?.type || "").toLowerCase();
      if (allowedTypes && !allowedTypes.has(t)) continue;
      const msg = (a?.message || "").toString().trim();
      if (!msg) continue;
      parts.push(`${name} [${t}]: ${msg}`);
    }
  }
  return parts.join("\n");
}

function applyFLIP(container, updateFn) {
  if (!container) return updateFn();
  const prev = new Map();
  for (const el of Array.from(container.children)) {
    const key = el.getAttribute("data-key") || el.id || "";
    if (!key) continue;
    prev.set(key, el.getBoundingClientRect());
  }
  updateFn();
  const nextChildren = Array.from(container.children);
  for (const el of nextChildren) {
    const key = el.getAttribute("data-key") || el.id || "";
    if (!key) continue;
    const first = prev.get(key);
    if (!first) continue;
    const last = el.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    if (!dx && !dy) continue;
    el.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0px, 0px)" }],
      { duration: 220, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
    );
  }
}



function healthSignature(data, type) {
  if (!data) return "";
  const instances = Array.isArray(data.instances) ? data.instances : [];
  const parts = [];

  for (const inst of instances) {
    const name = inst?.name || inst?.id || "";

    if (type === "error" && inst?.error) {
      parts.push(`${name}|${inst.error}`);
      continue;
    }

    const alerts = Array.isArray(inst?.alerts) ? inst.alerts : [];
    for (const a of alerts) {
      const t = (a?.type || "").toLowerCase();
      if (t !== type) continue;
      const msg = (a?.message || "").toString().trim();
      if (!msg) continue;
      parts.push(`${name}|${msg}`);
    }
  }

  parts.sort();
  return parts.join("\n");
}

function healthAlertKey(app, inst, alert) {
  const appKey = String(app || "").trim().toLowerCase() || "unknown";
  const instId = String(inst?.id || inst?.name || "").trim() || "unknown";
  const type = String(alert?.type || "").trim().toLowerCase() || "unknown";
  const source = String(alert?.source || "").trim() || "";
  const id = String(alert?.id || "").trim();
  const msg = String(alert?.message || "").trim();

  // Prefer stable IDs if provided by Arr; fall back to message-based key.
  const tail = id || (source ? `${source}:${msg}` : msg) || "unknown";
  return `alert:${appKey}:${instId}:${type}:${tail}`;
}

function healthAlertSig(alert) {
  const type = String(alert?.type || "").trim().toLowerCase() || "unknown";
  const source = String(alert?.source || "").trim() || "";
  const id = String(alert?.id || "").trim() || "";
  const msg = String(alert?.message || "").trim() || "";
  const wiki = String(alert?.wikiUrl || "").trim() || "";
  return `${type}|${source}|${id}|${msg}|${wiki}`;
}

function formatHealthBadgeText(instName, type, msg) {
  const name = String(instName || "").trim();
  const message = String(msg || "").trim();
  const t = String(type || "").trim().toLowerCase();
  const icon = t === "error" ? "⛔" : t === "warning" ? "⚠️" : "ℹ️";
  if (!name) return `${icon} ${message}`.trim();
  if (!message) return `${icon} ${name}`.trim();
  return `${icon} ${name}: ${message}`.trim();
}

function compactHealthBadgeText(text, maxLen = 96) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw || raw.length <= maxLen) return raw;
  return `${raw.slice(0, Math.max(12, maxLen - 1)).trimEnd()}…`;
}

function formatHealthBadgeTitle(instName, type, msg, wikiUrl = "") {
  const name = String(instName || "").trim();
  const message = String(msg || "").trim();
  const t = String(type || "").trim().toLowerCase();
  const wiki = String(wikiUrl || "").trim();
  const head = name ? `${name} [${t}]` : `[${t}]`;
  return wiki ? `${head}: ${message}\n${wiki}`.trim() : `${head}: ${message}`.trim();
}

function getHealthBadgeClass(type) {
  const t = String(type || "").trim().toLowerCase();
  if (t === "error") return "health-badge--error";
  if (t === "warning") return "health-badge--warning";
  if (t === "notice") return "health-badge--notice";
  return "health-badge--notice";
}





function renderHealthStatus(app, data) {
  if (app !== activeApp) return;

  // Row summary (kept in the status bar)
  if (healthStatusRowEl) {
    healthStatusRowEl.textContent = "";
    healthStatusRowEl.removeAttribute("title");
    healthStatusRowEl.style.display = "none";
  }

  if (!healthBadgesEl) return;

  if (!data || !data.configured) {
    healthBadgesEl.innerHTML = "";
    healthBadgesEl.removeAttribute("title");
    return;
  }

  const total = Number(data.total || 0) || 0;
  const unreachable = Number(data.unreachable || 0) || 0;

  const dismissed = healthState.dismissed?.[app] || {};

  const container = healthBadgesEl;

  function buildBadge({ key, text, cls, title = "", dismissSig = "1" }) {
    const b = document.createElement("span");
    b.className = `health-badge ${cls}`;
    b.setAttribute("data-key", key);
    const fullText = String(text || "");
    const compactText = compactHealthBadgeText(fullText);

    const label = document.createElement("span");
    label.className = "health-badge__text";
    label.innerHTML = escapeHtml(compactText);

    const details = document.createElement("button");
    details.type = "button";
    details.className = "health-badge__details";
    details.setAttribute("aria-label", `Details ${key}`);
    details.textContent = "i";
    details.title = t("details", "Details");
    if (compactText === fullText) {
      details.classList.add("hidden");
    }
    details.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const expanded = b.classList.toggle("is-expanded");
      label.innerHTML = escapeHtml(expanded ? fullText : compactText);
    });


    const close = document.createElement("button");
    close.type = "button";
    close.className = "health-badge__close";
    close.setAttribute("aria-label", `Dismiss ${key}`);
    close.textContent = "×";

    close.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      b.classList.add("is-dismissing");

      // After the fade, remove with FLIP so remaining badges glide into place.
      window.setTimeout(() => {
        applyFLIP(container, () => {
          b.remove();
        });
      }, 180);

      healthState.dismissed[app] = { ...(healthState.dismissed[app] || {}), [key]: dismissSig };
      saveHealthDismissed();
    });

    b.appendChild(label);
    b.appendChild(details);
    b.appendChild(close);

    b.title = title || "";
    if (key === "ok") b.title = t("No health issues reported.");

    return b;
  }


  applyFLIP(container, () => {
    container.innerHTML = "";
    container.classList.add("health-badges");

    const instances = Array.isArray(data.instances) ? data.instances : [];
    let visibleBadgeCount = 0;

    // One badge per alert so users can dismiss specific warnings/errors.
    for (const inst of instances) {
      const instName = inst?.name || inst?.id || "";

      if (inst?.error) {
        const alert = { type: "error", source: "instance", id: "unreachable", message: String(inst.error || "unreachable") };
        const key = healthAlertKey(app, inst, alert);
        const sig = healthAlertSig(alert);
        if (dismissed[key] === sig) continue;

        container.appendChild(
          buildBadge({
            key,
            text: formatHealthBadgeText(instName, "error", alert.message),
            cls: "health-badge--error",
            title: formatHealthBadgeTitle(instName, "error", alert.message),
            dismissSig: sig,
          })
        );
        visibleBadgeCount += 1;
        continue;
      }

      const alerts = Array.isArray(inst?.alerts) ? inst.alerts : [];
      for (const a of alerts) {
        const type = String(a?.type || "").toLowerCase();
        if (!type || type === "ok") continue;
        const msg = String(a?.message || "").trim();
        if (!msg) continue;

        const key = healthAlertKey(app, inst, a);
        const sig = healthAlertSig(a);
        if (dismissed[key] === sig) continue;

        container.appendChild(
          buildBadge({
            key,
            text: formatHealthBadgeText(instName, type, msg),
            cls: getHealthBadgeClass(type),
            title: formatHealthBadgeTitle(instName, type, msg, a?.wikiUrl || ""),
            dismissSig: sig,
          })
        );
        visibleBadgeCount += 1;
      }
    }

    if (visibleBadgeCount === 0 && total === 0 && unreachable === 0 && dismissed.ok !== "1") {
      container.appendChild(buildBadge({ key: "ok", text: "OK", cls: "health-badge--ok", title: "", dismissSig: "1" }));
    }
  });

}

async function fetchHealth({ app = activeApp, silent = false, force = false } = {}) {
  if (!app) return;
  const now = Date.now();
  const last = Number(healthState.lastFetchedAt?.[app] || 0) || 0;
  if (!force && healthState[app] && now - last < 20000) {
    renderHealthStatus(app, healthState[app]);
    return;
  }
  try {
    const res = await fetch(apiUrl(`/api/${app}/health`));
    if (!res.ok) {
      if (!silent) console.warn("Health fetch failed", app, res.status);
      return;
    }
    const data = await res.json();
    healthState[app] = data;
    healthState.lastFetchedAt[app] = now;
    renderHealthStatus(app, data);
  } catch (e) {
    if (!silent) console.warn("Health fetch error", app, e);
  }
}

function mergeStatusFetchOptions(base, extra) {
  const first = base || { silent: true, lite: true };
  const next = extra || {};
  return {
    silent: Boolean(first.silent) && Boolean(next.silent !== false),
    lite: Boolean(first.lite) && Boolean(next.lite !== false),
  };
}

async function fetchStatusNow({ silent = false, lite = false } = {}) {
  try {
    const params = [];
    if (lite) params.push("lite=1");
    params.push(...getPlexScopeParams("sonarr", "plex_library_ids_sonarr"));
    params.push(...getPlexScopeParams("radarr", "plex_library_ids_radarr"));
    const url = params.length ? `/api/status?${params.join("&")}` : "/api/status";
    const res = await fetch(apiUrl(url));
    if (!res.ok) {
      if (!silent) console.warn("Status fetch failed", res.status);
      return;
    }
    const data = await res.json();
    const prevTautulli = statusState.tautulli;
    statusState.apps = mergeStatusApps(statusState.apps, data.apps) || statusState.apps;
    statusState.tautulli = data.tautulli || statusState.tautulli;
    applyPlexScopeFromStatus(data.scope || {});
    lastStatusFetchAt = Date.now();
    syncTautulliPendingFromStatus(prevTautulli, statusState.tautulli);
    handleTautulliRefreshState(prevTautulli, statusState.tautulli);
    updateStatusPanel();
    updatePlexLibraryScopeControl();
    updateEffectiveSourcesLine();
    updateLastUpdatedDisplay();
    fetchHealth({ app: activeApp, silent: true });
    scheduleStatusPoll();
  } catch (e) {
    if (!silent) console.warn("Status fetch failed", e);
  }
}

async function fetchStatus(options = {}) {
  const request = {
    silent: options.silent !== false,
    lite: options.lite !== false,
  };
  if (statusFetchInFlight) {
    statusFetchQueuedOptions = mergeStatusFetchOptions(statusFetchQueuedOptions || request, request);
    return;
  }
  statusFetchInFlight = true;
  let current = request;
  try {
    while (current) {
      await fetchStatusNow(current);
      current = statusFetchQueuedOptions;
      statusFetchQueuedOptions = null;
    }
  } finally {
    statusFetchInFlight = false;
  }
}

function startStatusTick() {
  if (statusTickTimer) return;
  statusTickTimer = setInterval(() => {
    if (document.hidden) return;
    updateStatusPanel();
    updateLastUpdatedDisplay();
  }, 3000);
}

function startStatusFetchPoll() {
  if (statusFetchTimer) return;
  statusFetchTimer = setInterval(() => {
    if (document.hidden) return;
    fetchStatus({ silent: true, lite: true });
  }, 15000);
}

function parseNoticeState(headers) {
  const flags = new Set();
  const rawFlags = headers.get(NOTICE_FLAGS_HEADER) || "";
  if (rawFlags) {
    rawFlags.split(",").forEach(flag => {
      const value = flag.trim();
      if (value) flags.add(value);
    });
  }
  const notice = headers.get("X-Sortarr-Notice") || "";
  if (!rawFlags && notice) {
    if (notice.includes(COLD_CACHE_NOTICE)) flags.add("cold_cache");
    if (/(tautulli|jellystat|playback) matching in progress/i.test(notice)) {
      flags.add("tautulli_refresh");
    }
  }
  return { flags, notice };
}

function getOtherApp(app) {
  return app === "sonarr" ? "radarr" : "sonarr";
}

function isAppConfigured(app) {
  return app === "sonarr" ? configState.sonarrConfigured : configState.radarrConfigured;
}

function queuePrefetch(app, refresh) {
  if (!isAppConfigured(app)) return;
  const existing = pendingPrefetchByApp[app];
  pendingPrefetchByApp[app] = {
    refresh: Boolean(refresh) || (existing && existing.refresh),
    deferred: existing ? existing.deferred : false,
  };
}

function deferQueuedPrefetch(app) {
  const pending = pendingPrefetchByApp[app];
  if (pending) pending.deferred = true;
}

function runQueuedPrefetch(app) {
  const pending = pendingPrefetchByApp[app];
  if (!pending) return false;
  pendingPrefetchByApp[app] = null;
  if (!isAppConfigured(app)) return false;
  prefetch(app, pending.refresh);
  return true;
}

function flushDeferredPrefetch(options = {}) {
  const requireWarm = options.requireWarm === true;
  if (requireWarm && coldCacheByApp[activeApp]) return;
  ["sonarr", "radarr"].forEach(app => {
    const pending = pendingPrefetchByApp[app];
    if (!pending || !pending.deferred) return;
    pending.deferred = false;
    runQueuedPrefetch(app);
  });
}

function handlePrefetchGate(app, flags) {
  if (app !== activeApp) return;
  const otherApp = getOtherApp(app);
  const pending = pendingPrefetchByApp[otherApp];
  if (!pending) return;
  if (flags && flags.has("cold_cache")) {
    deferQueuedPrefetch(otherApp);
    return;
  }
  runQueuedPrefetch(otherApp);
}

function cancelTautulliPoll(app) {
  if (!tautulliPollTimers[app]) return;
  clearTimeout(tautulliPollTimers[app]);
  tautulliPollTimers[app] = null;
}

function cancelFollowUpRefresh(app) {
  if (!followUpRefreshTimers[app]) return;
  clearTimeout(followUpRefreshTimers[app]);
  followUpRefreshTimers[app] = null;
}

function scheduleFollowUpRefresh(app) {
  if (followUpRefreshTimers[app]) return;
  followUpRefreshTimers[app] = setTimeout(() => {
    followUpRefreshTimers[app] = null;
    if (tautulliPendingByApp[app]) return;
    if (app === activeApp) {
      load(false, { background: true });
    }
  }, TAUTULLI_POLL_INTERVAL_MS);
}

function scheduleTautulliPoll(app) {
  if (tautulliPollTimers[app]) return;
  tautulliPollTimers[app] = setTimeout(() => {
    tautulliPollTimers[app] = null;
    if (!tautulliPendingByApp[app]) return;
    if (app === activeApp) {
      load(false, { background: true });
    } else {
      prefetch(app, false, { background: true });
    }
  }, TAUTULLI_POLL_INTERVAL_MS);
}

function setTautulliPending(app, pending) {
  tautulliPendingByApp[app] = pending;
  if (pending) {
    cancelFollowUpRefresh(app);
    scheduleTautulliPoll(app);
  } else {
    cancelTautulliPoll(app);
  }
}

function applyNoticeState(app, flags, warnText, fallbackNotice, options = {}) {
  const tautulliPending = flags.has("tautulli_refresh");
  fastModeByApp[app] = flags.has("sonarr_fast");
  const pageFresh = isPageFresh();
  const background = options.background === true;
  const coldCacheFlag = flags.has("cold_cache");
  const prevColdCache = coldCacheByApp[app];
  let sticky = coldCacheStickyByApp[app];
  if (coldCacheFlag) {
    sticky = true;
  } else if (sticky) {
    sticky = false;
  }
  coldCacheStickyByApp[app] = sticky;
  const coldCache = coldCacheFlag || sticky || (background && prevColdCache && !coldCacheFlag);
  coldCacheByApp[app] = coldCache;
  if (app === activeApp && prevColdCache && !coldCache) {
    flushDeferredPrefetch({ requireWarm: true });
  }
  setTautulliPending(app, tautulliPending);
  if (tautulliPending) {
    const other = app === "sonarr" ? "radarr" : "sonarr";
    const otherConfigured =
      other === "sonarr" ? configState.sonarrConfigured : configState.radarrConfigured;
    if (otherConfigured) {
      setTautulliPending(other, true);
      if (!noticeByApp[other]) {
        noticeByApp[other] = getPlaybackMatchingNotice();
      }
    }
  }

  const notices = [];
  if (tautulliPending) {
    notices.push(getPlaybackMatchingNotice());
  }
  if (coldCache) {
    notices.push(COLD_CACHE_NOTICE);
  }
  if (!notices.length && fallbackNotice) {
    notices.push(fallbackNotice);
  }

  const combined = [warnText, ...notices].filter(Boolean).join(" | ");
  noticeByApp[app] = combined;

  if (app === activeApp) {
    setStatusNotice(combined);
    updateBackgroundLoading();
    updateFastModeBanner();
  }
  if (pageFresh) {
    schedulePageFreshNoticeClear();
  }
}

function resetUiState() {
  if (viewStateSaveTimer) {
    window.clearTimeout(viewStateSaveTimer);
    viewStateSaveTimer = null;
  }
  localStorage.removeItem(COLUMN_STORAGE_KEY);
  localStorage.removeItem(CSV_COLUMNS_KEY);
  localStorage.removeItem(FILTERS_COLLAPSED_KEY);
  localStorage.removeItem(CHIPS_ENABLED_KEY);
  localStorage.removeItem(VIEW_STATE_KEY);
  localStorage.removeItem(PLEX_LIBRARY_SELECTION_KEY);
  localStorage.removeItem("Sortarr-theme");
  viewStateByApp.sonarr = buildDefaultViewState("sonarr");
  viewStateByApp.radarr = buildDefaultViewState("radarr");
  clearActiveFilters({ persist: false, forceUi: true });
  setAdvancedMode(false);
  chipQuery = "";
  syncChipButtonsToQuery();
}
function getSonarrSeriesKey(seriesId, instanceId) {
  if (!seriesId) return "";
  const cleanInstance = String(instanceId || "").trim();
  return `${cleanInstance}::${seriesId}`;
}

function getSonarrSeriesKeyFromRow(row) {
  if (!row) return "";
  const seriesId = row.SeriesId ?? row.seriesId ?? "";
  const instanceId = row.InstanceId ?? row.instanceId ?? "";
  return getSonarrSeriesKey(seriesId, instanceId);
}

function getCachedSeriesExpansionHeight(seriesKey) {
  if (!seriesKey) return 0;
  const value = Number(sonarrExpansionState.expansionHeightBySeries.get(seriesKey));
  if (Number.isFinite(value) && value > 0) return value;
  return SERIES_EXPANSION_MAX_HEIGHT;
}

function cacheSeriesExpansionHeight(seriesKey, childRowEl) {
  if (!seriesKey || !childRowEl || !childRowEl.isConnected) return;
  try {
    const h = childRowEl.getBoundingClientRect().height;
    if (Number.isFinite(h) && h > 0) {
      const rounded = Math.round(h * 100) / 100;
      sonarrExpansionState.expansionHeightBySeries.set(seriesKey, rounded);
    }
  } catch { }
}

function getCachedSeriesChildRow(seriesKey, colCount = 1) {
  if (!seriesKey) return null;
  const row = sonarrExpansionState.childRowsBySeries.get(seriesKey) || null;
  if (!row) return null;
  if (row.__collapseTimer) {
    clearTimeout(row.__collapseTimer);
    row.__collapseTimer = null;
  }
  row.classList.add("series-child-row", "series-child-row--open");
  row.dataset.seriesKey = seriesKey;
  let td = row.firstElementChild;
  if (!td) {
    td = document.createElement("td");
    row.appendChild(td);
  }
  td.colSpan = Math.max(1, Number(colCount) || 1);
  return row;
}
function clearSonarrSeriesExpansion(seriesKey) {
  if (!seriesKey) return;
  sonarrExpansionState.seasonsBySeries.delete(seriesKey);
  sonarrExpansionState.fastModeBySeries.delete(seriesKey);
  Array.from(sonarrExpansionState.episodesBySeason.keys()).forEach(key => {
    if (key.startsWith(`${seriesKey}::`)) {
      sonarrExpansionState.episodesBySeason.delete(key);
    }
  });
  Array.from(sonarrExpansionState.expandedSeasons).forEach(key => {
    if (key.startsWith(`${seriesKey}::`)) {
      sonarrExpansionState.expandedSeasons.delete(key);
    }
  });
  sonarrExpansionState.expandedSeries.delete(seriesKey);
  sonarrExpansionState.childRowsBySeries.delete(seriesKey);
  sonarrExpansionState.expansionHeightBySeries.delete(seriesKey);
  if (tbody) {
    const safeKey = window.CSS && CSS.escape ? CSS.escape(seriesKey) : seriesKey.replace(/["\\]/g, "\\$&");
    tbody.querySelectorAll(`tr.series-child-row[data-series-key="${safeKey}"]`).forEach(row => row.remove());
    tbody.querySelectorAll(`button.series-expander[data-series-key="${safeKey}"]`).forEach(btn => {
      btn.setAttribute("aria-expanded", "false");
      const icon = btn.querySelector("span");
      if (icon) icon.textContent = "+";
    });
    tbody.querySelectorAll(`tr.series-expanded[data-series-key="${safeKey}"]`).forEach(row => {
      row.classList.remove("series-expanded");
    });
  }
}

function resetSonarrExpansionState(options = {}) {
  sonarrExpansionState.expandedSeries.clear();
  sonarrExpansionState.expandedSeasons.clear();
  sonarrExpansionState.seasonsBySeries.clear();
  sonarrExpansionState.episodesBySeason.clear();
  sonarrExpansionState.inflight.clear();
  sonarrExpansionState.fastModeBySeries.clear();
  sonarrExpansionState.childRowsBySeries.clear();
  sonarrExpansionState.expansionHeightBySeries.clear();
  if (options.clearDom === false) return;
  if (!tbody) return;
  tbody.querySelectorAll("tr.series-child-row").forEach(row => row.remove());
  tbody.querySelectorAll("button.series-expander[aria-expanded=\"true\"]").forEach(btn => {
    btn.setAttribute("aria-expanded", "false");
    const icon = btn.querySelector("span");
    if (icon) icon.textContent = "+";
  });
  tbody.querySelectorAll("tr.series-expanded").forEach(row => {
    row.classList.remove("series-expanded");
  });
}

function resetSonarrExpansionDisplayState() {
  sonarrExpansionState.expandedSeries.clear();
  sonarrExpansionState.expandedSeasons.clear();
  sonarrExpansionState.childRowsBySeries.clear();
  sonarrExpansionState.expansionHeightBySeries.clear();
}

function getInstanceCount(app) {
  return (instanceConfig[app] || []).length;
}

function bindChipButtons(rootEl = document) {
  rootEl.querySelectorAll(".chip").forEach(btn => {
    if (btn.dataset.chipBound === "1") return;
    btn.dataset.chipBound = "1";
    btn.addEventListener("click", () => {
      const query = btn.getAttribute("data-query") || "";
      if (!query) return;

      // Tri-state chips:
      //  - disabled: no token
      //  - positive: token
      //  - negative: -token
      const negToken = `-${query}`;
      const tokens = new Set((chipQuery || "").split(/\s+/).filter(Boolean));

      const hasPos = tokens.has(query);
      const hasNeg = tokens.has(negToken);

      // Cycle: off -> + -> - -> off
      tokens.delete(query);
      tokens.delete(negToken);

      btn.classList.remove("chip--pos", "chip--neg");

      if (!hasPos && !hasNeg) {
        tokens.add(query);
        btn.classList.add("chip--pos");
        btn.setAttribute("aria-pressed", "true");
        btn.dataset.state = "pos";
      } else if (hasPos) {
        tokens.add(negToken);
        btn.classList.add("chip--neg");
        btn.setAttribute("aria-pressed", "true");
        btn.dataset.state = "neg";
      } else {
        btn.setAttribute("aria-pressed", "false");
        btn.dataset.state = "off";
      }

      chipQuery = Array.from(tokens).join(" ");
      renderActiveFilterChips();
      if (tableReadyByApp[activeApp]) {
        pendingStabilizeByApp[activeApp] = true;
      }
      const scrollAnchor = captureTableScrollAnchor();
      scheduleChipRender(scrollAnchor);
      scheduleViewStateSave();
    });
  });
}

function syncChipButtonsToQuery(rootEl = document) {
  const tokens = new Set((chipQuery || "").split(/\s+/).filter(Boolean));
  rootEl.querySelectorAll(".chip").forEach(btn => {
    const query = btn.getAttribute("data-query") || "";
    if (!query) return;
    const negToken = `-${query}`;
    btn.classList.remove("chip--pos", "chip--neg");
    if (tokens.has(query)) {
      btn.classList.add("chip--pos");
      btn.setAttribute("aria-pressed", "true");
      btn.dataset.state = "pos";
    } else if (tokens.has(negToken)) {
      btn.classList.add("chip--neg");
      btn.setAttribute("aria-pressed", "true");
      btn.dataset.state = "neg";
    } else {
      btn.setAttribute("aria-pressed", "false");
      btn.dataset.state = "off";
    }
  });
  renderActiveFilterChips();
}

function buildInstanceChips() {
  const configs = [
    { app: "sonarr", container: instanceChipsSonarr, instances: instanceConfig.sonarr },
    { app: "radarr", container: instanceChipsRadarr, instances: instanceConfig.radarr },
  ];

  configs.forEach(({ app, container, instances }) => {
    if (!container) return;
    container.textContent = "";
    (instances || []).forEach((inst) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = inst.name || (app === "sonarr" ? t("Sonarr") : t("Radarr"));
      btn.setAttribute("data-app", app);
      btn.setAttribute("data-instance", "true");
      if (inst.id) {
        const query = `instance:${inst.id}`;
        btn.setAttribute("data-query", query);
        {
          const tokens = (chipQuery || "").split(/\s+/).filter(Boolean);
          if (tokens.includes(query)) {
            btn.classList.add("chip--pos");
            btn.setAttribute("aria-pressed", "true");
            btn.dataset.state = "pos";
          } else if (tokens.includes(`-${query}`)) {
            btn.classList.add("chip--neg");
            btn.setAttribute("aria-pressed", "true");
            btn.dataset.state = "neg";
          } else {
            btn.setAttribute("aria-pressed", "false");
            btn.dataset.state = "off";
          }
        }
      }
      container.appendChild(btn);
    });
  });

  bindChipButtons();
  scheduleChipGroupLayout();
}

function formatLastUpdatedTimestamp(ts) {
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLastUpdatedAge(ts) {
  const ageSeconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  return formatLastUpdatedAgeSeconds(ageSeconds);
}

function formatLastUpdatedAgeSeconds(ageSeconds) {
  const clamped = Math.max(0, Math.floor(ageSeconds));
  if (clamped < 60) {
    return `${clamped} second${clamped === 1 ? "" : "s"} ago`;
  }
  if (clamped < 3600) {
    const minutes = Math.floor(clamped / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  if (minutes < 1) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"}, ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
}

function getLastUpdatedAgeSeconds() {
  const ages = [];
  const apps = statusState.apps || {};
  ["sonarr", "radarr"].forEach(app => {
    const appState = apps[app];
    if (!appState?.configured) return;
    const age = appState.cache?.memory_age_seconds;
    if (age != null) ages.push(withElapsedAge(age));
  });
  if (ages.length) return Math.min(...ages);
  return null;
}

function updateLastUpdatedDisplay() {
  if (!lastUpdatedEl) return;
  const ageSeconds = getLastUpdatedAgeSeconds();
  const fallbackTs = lastUpdatedByApp[activeApp];
  if (ageSeconds == null && !fallbackTs) {
    lastUpdatedEl.textContent = "";
    lastUpdatedEl.title = "";
    return;
  }
  const ts = ageSeconds == null
    ? fallbackTs
    : Date.now() - Math.max(0, Math.floor(ageSeconds * 1000));
  const timestamp = formatLastUpdatedTimestamp(ts);
  const age = ageSeconds == null
    ? formatLastUpdatedAge(ts)
    : formatLastUpdatedAgeSeconds(ageSeconds);
  lastUpdatedEl.textContent = `Last updated: ${age}`;
  lastUpdatedEl.title = `Last updated: ${timestamp}`;
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

const RESOLUTION_ALIASES = {
  "4k": 2160,
  uhd: 2160,
  fhd: 1080,
  fullhd: 1080,
  hd: 720,
  sd: 480,
};

function parseResolutionDimensions(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return { width: null, height: null };
  if (RESOLUTION_ALIASES[raw]) return { width: null, height: RESOLUTION_ALIASES[raw] };
  const dimMatch = raw.match(/(\d{3,4})\s*x\s*(\d{3,4})/);
  if (dimMatch) {
    return { width: Number(dimMatch[1]), height: Number(dimMatch[2]) };
  }
  const match = raw.match(/(\d{3,4})\s*[pi]?/);
  if (match) return { width: null, height: Number(match[1]) };
  return { width: null, height: null };
}

function classifyResolutionByWidth(info) {
  if (!info.width || !info.height) return null;
  if (info.width >= 3000 && info.height >= 1400) return 2160;
  if (info.width >= 1800 && info.height >= 600) return 1080;
  if (info.width >= 1200 && info.height >= 500) return 720;
  if (info.width >= 900 && info.height >= 400) return 480;
  return null;
}

function extractResolutionSuffix(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  const match = raw.match(/(\d{3,4})\s*[pi]?$/);
  return match ? match[1] : "";
}

function resolveResolutionInfo(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  const { width, height } = parseResolutionDimensions(raw);
  const suffix = extractResolutionSuffix(raw);
  return { raw, width, height, suffix };
}

function resolutionMatches(value, query) {
  const rawQuery = String(query ?? "").trim();
  if (!rawQuery) return true;
  if (rawQuery.includes("*") || rawQuery.includes("?")) {
    return matchPattern(value, rawQuery);
  }
  const target = resolveResolutionInfo(rawQuery);
  if (!target.height) return matchPattern(value, rawQuery);
  const actual = resolveResolutionInfo(value);
  if (!actual.height) return matchPattern(value, rawQuery);
  const tolerance = 80;
  const diff = Math.abs(actual.height - target.height);
  const widthHint = classifyResolutionByWidth(actual);
  if (diff <= tolerance) {
    if (widthHint && target.height !== widthHint) {
      return false;
    }
    if (target.height === 720 && widthHint === 1080) {
      return false;
    }
    return true;
  }

  if (widthHint && target.height === widthHint) {
    return true;
  }
  return false;
}

function buildRowKey(row, app) {
  const instanceId = row.InstanceId ?? row.instanceId ?? "";
  if (app === "sonarr") {
    const base = String(
      row.SeriesId ?? row.seriesId ?? row.TvdbId ?? row.tvdbId ?? row.TitleSlug ?? row.titleSlug ?? row.Title ?? row.Path ?? ""
    );
    return instanceId ? `${instanceId}::${base}` : base;
  }
  const base = String(
    row.MovieId ?? row.movieId ?? row.TmdbId ?? row.tmdbId ?? row.ImdbId ?? row.imdbId ?? row.Title ?? row.Path ?? ""
  );
  return instanceId ? `${instanceId}::${base}` : base;
}

function buildRowKeySuffix(row) {
  const path = String(row.Path ?? row.path ?? "").trim();
  if (path) return path;
  const title = String(row.TitleSlug ?? row.titleSlug ?? row.Title ?? row.title ?? "").trim();
  const year = String(row.Year ?? row.year ?? "").trim();
  if (!title && !year) return "";
  return [title, year].filter(Boolean).join("::");
}

function assignRowKeys(rows, app) {
  const baseKeys = [];
  const baseCounts = new Map();
  for (const row of rows || []) {
    const base = buildRowKey(row, app) || "row";
    baseKeys.push(base);
    baseCounts.set(base, (baseCounts.get(base) || 0) + 1);
  }
  const duplicateBases = new Set(
    Array.from(baseCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  );
  const seen = new Map();
  for (let i = 0; i < (rows || []).length; i += 1) {
    const row = rows[i];
    let key = baseKeys[i];
    if (duplicateBases.has(key)) {
      const suffix = buildRowKeySuffix(row);
      if (suffix) {
        key = `${key}::${suffix}`;
      }
    }
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);
    if (count) {
      key = `${key}#${count}`;
    }
    row.__sortarrKey = key;
  }
}

function findRowByKey(app, key) {
  const rows = dataByApp[app] || [];
  if (!key) return null;
  return rows.find(row => row.__sortarrKey === key) || null;
}

function sanitizeFileName(value) {
  return String(value || "diagnostics")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function requestMatchDiagnostics(row, app) {
  const payload = {
    app,
    instance_id: row.InstanceId ?? row.instanceId ?? "",
    title: row.Title ?? "",
    year: row.Year ?? "",
    title_slug: row.TitleSlug ?? row.titleSlug ?? "",
    path: row.Path ?? row.path ?? "",
    tvdb_id: row.TvdbId ?? row.tvdbId ?? "",
    tmdb_id: row.TmdbId ?? row.tmdbId ?? "",
    imdb_id: row.ImdbId ?? row.imdbId ?? "",
    scope_library_ids: getPlexSelectedForApp(app),
  };

  const res = await fetch(apiUrl("/api/diagnostics/playback-match"), {
    method: "POST",
    headers: withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error || "";
    } catch {
      detail = await res.text();
    }
    throw new Error(detail || res.statusText);
  }
  return res.json();
}

async function readErrorDetail(res) {
  try {
    const err = await res.json();
    return err?.error || "";
  } catch {
    return res.text();
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function settlePromise(promise) {
  return promise
    .then(value => ({ status: "fulfilled", value }))
    .catch(reason => ({ status: "rejected", reason }));
}

async function settleWithTimeout(promise, timeoutMs) {
  if (!promise) return { status: "fulfilled", value: { skipped: true } };
  if (!timeoutMs || timeoutMs <= 0) return settlePromise(promise);
  const settled = settlePromise(promise);
  return Promise.race([
    settled,
    delay(timeoutMs).then(() => ({ status: "timeout" })),
  ]);
}

async function requestArrRefresh(app, options = {}) {
  const itemId = options.itemId;
  const instanceId = options.instanceId || "";
  const idKey = app === "sonarr" ? "seriesId" : "movieId";
  const base = app === "sonarr" ? "/api/sonarr/refresh" : "/api/radarr/refresh";
  const url = itemId ? `${base}?${idKey}=${encodeURIComponent(itemId)}` : base;
  const payload = {};
  if (instanceId) payload.instance_id = instanceId;
  if (itemId) payload[idKey] = itemId;
  const res = await fetch(apiUrl(url), {
    method: "POST",
    headers: withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail || res.statusText);
  }
  return res.json();
}

async function requestArrItemReload(app, options = {}) {
  const itemId = options.itemId;
  const instanceId = options.instanceId || "";
  const forceTautulli = options.forceTautulli === true;
  const idKey = app === "sonarr" ? "seriesId" : "movieId";
  const base = app === "sonarr" ? "/api/sonarr/item" : "/api/radarr/item";
  if (!itemId) {
    throw new Error(`${idKey} is required.`);
  }
  const params = new URLSearchParams();
  params.set(idKey, itemId);
  if (instanceId) {
    params.set("instance_id", instanceId);
  }
  if (forceTautulli) {
    params.set("tautulli_refresh", "1");
  }
  const res = await fetch(apiUrl(`${base}?${params.toString()}`));
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    const err = new Error(detail || res.statusText);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function requestSonarrSeasons(seriesId, instanceId) {
  if (!seriesId) {
    throw new Error("series_id is required.");
  }
  const params = new URLSearchParams();
  if (instanceId) {
    params.set("instance_id", instanceId);
  }
  params.set("include_specials", "1");
  const url = `/api/sonarr/series/${encodeURIComponent(seriesId)}/seasons?${params.toString()}`;
  const res = await fetch(apiUrl(url));
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail || res.statusText);
  }
  return res.json();
}

async function requestSonarrEpisodes(seriesId, seasonNumber, instanceId) {
  if (!seriesId) {
    throw new Error("series_id is required.");
  }
  if (seasonNumber == null || Number.isNaN(Number(seasonNumber))) {
    throw new Error("season_number is required.");
  }
  const params = new URLSearchParams();
  if (instanceId) {
    params.set("instance_id", instanceId);
  }
  const url = `/api/sonarr/series/${encodeURIComponent(seriesId)}/seasons/${encodeURIComponent(seasonNumber)}/episodes?${params.toString()}`;
  const res = await fetch(apiUrl(url));
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail || res.statusText);
  }
  return res.json();
}

async function requestTautulliItemRefresh(row, app) {
  const ratingKey = row.TautulliRatingKey ?? row.tautulliRatingKey ?? "";
  const sectionId = row.TautulliSectionId ?? row.tautulliSectionId ?? "";
  if (!ratingKey && !sectionId) {
    return { skipped: true, reason: "No Tautulli key" };
  }
  const payload = { app };
  if (ratingKey) payload.rating_key = ratingKey;
  if (sectionId) payload.section_id = sectionId;
  const res = await fetch(apiUrl("/api/tautulli/refresh_item"), {
    method: "POST",
    headers: withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail || res.statusText);
  }
  return res.json();
}

function hasTautulliKeys(row) {
  if (!row) return false;
  const ratingKey = row.TautulliRatingKey ?? row.tautulliRatingKey ?? "";
  const sectionId = row.TautulliSectionId ?? row.tautulliSectionId ?? "";
  return Boolean(String(ratingKey).trim() || String(sectionId).trim());
}

async function copyDiagnosticsToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy copy
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}

function downloadDiagnostics(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showCopyToast(message, event, sourceEl) {
  if (copyToastTimer) {
    clearTimeout(copyToastTimer);
    copyToastTimer = null;
  }
  if (copyToastEl) {
    copyToastEl.remove();
    copyToastEl = null;
  }

  const toast = document.createElement("div");
  toast.className = "copy-toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  let x = event?.clientX;
  let y = event?.clientY;
  if ((x == null || y == null) && sourceEl) {
    const rect = sourceEl.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top;
  }
  if (x == null || y == null) {
    x = window.innerWidth / 2;
    y = window.innerHeight / 2;
  }
  const margin = 12;
  const maxX = window.innerWidth - margin;
  const maxY = window.innerHeight - margin;
  const clampedX = Math.min(Math.max(margin, x), maxX);
  const clampedY = Math.min(Math.max(margin, y), maxY);
  toast.style.left = `${clampedX}px`;
  toast.style.top = `${clampedY}px`;
  requestAnimationFrame(() => toast.classList.add("copy-toast--show"));
  copyToastEl = toast;
  copyToastTimer = setTimeout(() => {
    toast.classList.remove("copy-toast--show");
    setTimeout(() => {
      toast.remove();
    }, 200);
    copyToastEl = null;
    copyToastTimer = null;
  }, 1600);
}

async function handleMatchDiagnosticsClick(btn, event) {
  const rowEl = btn.closest("tr");
  const app = rowEl?.dataset.app || activeApp;
  const rowKey = rowEl?.dataset.rowKey || "";
  const row = findRowByKey(app, rowKey);
  if (!row) {
    setStatus("Diagnostics failed: row not found.");
    return;
  }
  if (!playbackSupportsDiagnostics) {
    setStatus(`${getPlaybackLabel()} diagnostics are unavailable.`);
    return;
  }
  try {
    const data = await requestMatchDiagnostics(row, app);
    const text = JSON.stringify(data, null, 2);
    const baseName = sanitizeFileName(row.Title || app);
    const filename = `sortarr-${baseName}-match.json`;
    const copied = await copyDiagnosticsToClipboard(text);
    if (copied) {
      showCopyToast("Diagnostics copied to clipboard.", event, btn);
      return;
    }
    setStatus("Diagnostics copy failed.");
  } catch (err) {
    setStatus(`Diagnostics failed: ${err.message}`);
  }
}

function applyArrItemUpdate(app, updatedRow, options = {}) {
  if (!updatedRow) return false;
  const rows = dataByApp[app] || [];
  const idKey = app === "sonarr" ? "SeriesId" : "MovieId";
  const updatedId = updatedRow[idKey];
  if (updatedId == null) {
    return false;
  }
  const updatedInstanceId = String(updatedRow.InstanceId ?? updatedRow.instanceId ?? "");
  let replaced = false;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowId = row[idKey];
    const rowInstanceId = String(row.InstanceId ?? row.instanceId ?? "");
    if (String(rowId) === String(updatedId) && rowInstanceId === updatedInstanceId) {
      rows[i] = updatedRow;
      replaced = true;
      break;
    }
  }
  if (!replaced) {
    rows.push(updatedRow);
  }
  if (app === "sonarr") {
    const seriesKey = getSonarrSeriesKeyFromRow(updatedRow);
    if (seriesKey) {
      clearSonarrSeriesExpansion(seriesKey);
    }
  }
  rowCacheByApp[app].clear();
  dataVersionByApp[app] += 1;
  sortCacheByApp[app] = null;
  assignRowKeys(rows, app);
  applyTitleWidth(app, rows);
  lastUpdatedByApp[app] = Date.now();
  if (app === activeApp) {
    if (!options.skipRender) {
      render(rows, { allowBatch: true });
      updateLastUpdatedDisplay();
    }
  }
  return true;
}

function removeArrItem(app, row, rowKey, options = {}) {
  if (!row) return false;
  const rows = dataByApp[app] || [];
  const idKey = app === "sonarr" ? "SeriesId" : "MovieId";
  const altIdKey = app === "sonarr" ? "seriesId" : "movieId";
  const targetId = row[idKey] ?? row[altIdKey];
  const targetInstanceId = String(row.InstanceId ?? row.instanceId ?? "");
  let removed = false;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const existing = rows[i];
    const existingId = existing[idKey] ?? existing[altIdKey];
    const existingInstanceId = String(existing.InstanceId ?? existing.instanceId ?? "");
    const existingKey = existing.__sortarrKey ?? "";
    if (
      (targetId != null
        && String(existingId) === String(targetId)
        && existingInstanceId === targetInstanceId)
      || (rowKey && existingKey === rowKey)
    ) {
      rows.splice(i, 1);
      removed = true;
      break;
    }
  }
  if (!removed) return false;
  if (app === "sonarr") {
    const seriesKey = getSonarrSeriesKeyFromRow(row);
    if (seriesKey) {
      clearSonarrSeriesExpansion(seriesKey);
    }
  }
  rowCacheByApp[app].clear();
  dataVersionByApp[app] += 1;
  sortCacheByApp[app] = null;
  assignRowKeys(rows, app);
  applyTitleWidth(app, rows);
  lastUpdatedByApp[app] = Date.now();
  if (app === activeApp) {
    if (!options.skipRender) {
      render(rows, { allowBatch: true });
      updateLastUpdatedDisplay();
    }
  }
  return true;
}

async function handleRowRefreshClick(btn) {
  const rowEl = btn.closest("tr");
  const app = rowEl?.dataset.app || activeApp;
  const rowKey = rowEl?.dataset.rowKey || "";
  const row = findRowByKey(app, rowKey);
  const statusToken = rowRefreshStatusToken + 1;
  rowRefreshStatusToken = statusToken;
  if (!row) {
    setStatusFor(t("refreshFailedRowNotFound", "Refresh failed: row not found."), ROW_REFRESH_FOLLOWUP_MS);
    return;
  }
  const itemId = app === "sonarr"
    ? (row.SeriesId ?? row.seriesId)
    : (row.MovieId ?? row.movieId);
  if (!itemId) {
    setStatusFor("Refresh failed: item ID missing.", ROW_REFRESH_FOLLOWUP_MS);
    return;
  }
  const instanceId = row.InstanceId ?? row.instanceId ?? "";
  const rowTitle = formatRowTitle(row, app);
  const appLabel = app === "sonarr" ? "Sonarr" : "Radarr";
  const playbackConfigured = Boolean(statusState.tautulli?.configured);
  const playbackItemRefresh = Boolean(playbackConfigured && playbackSupportsItemRefresh);
  const playbackLabel = getPlaybackLabel();
  setRowRefreshPending(rowEl, true);
  btn.disabled = true;
  const initialParts = [`${appLabel} refresh queued.`];
  if (playbackItemRefresh) {
    initialParts.push(`${playbackLabel} refresh queued.`);
  }
  setRowRefreshNotice(statusToken, `Refreshing ${rowTitle} - ${initialParts.join(" ")}`);
  try {
    const arrPromise = requestArrRefresh(app, { itemId, instanceId });
    const playbackPromise = playbackItemRefresh
      ? requestTautulliItemRefresh(row, app)
      : null;
    const arrResultPromise = settlePromise(arrPromise);
    const playbackResultPromise = playbackItemRefresh
      ? settleWithTimeout(playbackPromise, TAUTULLI_ROW_REFRESH_STATUS_TIMEOUT_MS)
      : Promise.resolve({ status: "fulfilled", value: { skipped: true } });
    const waitMs = playbackItemRefresh ? ITEM_REFRESH_TAUTULLI_DELAY_MS : ITEM_REFRESH_DELAY_MS;
    const reloadDelayPromise = arrResultPromise.then(arrResult => {
      if (arrResult.status !== "fulfilled") return null;
      return delay(waitMs);
    });
    const [arrResult, playbackResult] = await Promise.all([arrResultPromise, playbackResultPromise]);
    const parts = [];
    const arrOk = arrResult.status === "fulfilled";
    if (arrOk) {
      parts.push(`${appLabel} refresh queued.`);
    } else {
      parts.push(`${appLabel} refresh failed.`);
    }
    if (playbackItemRefresh) {
      if (playbackResult.status === "timeout") {
        parts.push(`${playbackLabel} refresh pending.`);
      } else if (playbackResult.status === "fulfilled") {
        if (playbackResult.value?.skipped) {
          parts.push(`${playbackLabel} refresh skipped.`);
        } else {
          parts.push(`${playbackLabel} refresh queued.`);
        }
      } else {
        parts.push(`${playbackLabel} refresh failed.`);
      }
    }
    const playbackOk = playbackResult.status === "fulfilled";
    const playbackSkipped = playbackOk && playbackResult.value?.skipped;
    const playbackPending = playbackResult.status === "timeout";
    const playbackUsed = Boolean(playbackItemRefresh && !playbackSkipped && !playbackPending);
    const playbackLabelText = playbackItemRefresh
      ? (playbackPending
        ? `${playbackLabel} refresh pending`
        : (playbackUsed
          ? `${playbackLabel} refresh ${playbackOk ? "succeeded" : "failed"}`
          : `${playbackLabel} refresh skipped`))
      : "";
    const shouldForceTautulli = Boolean(playbackItemRefresh && !hasTautulliKeys(row));
    let refreshOutcome = arrOk ? "success" : "fail";
    if (arrOk && playbackItemRefresh && (playbackPending || playbackSkipped || !playbackOk)) {
      refreshOutcome = "partial";
    } else if (playbackUsed && arrOk !== playbackOk) {
      refreshOutcome = "partial";
    }
    setRowRefreshNotice(statusToken, `Refreshing ${rowTitle} - ${parts.join(" ")}`);
    if (!arrOk) {
      flashRowRefresh(rowEl, refreshOutcome);
    }
    if (arrOk) {
      try {
        await reloadDelayPromise;
        const updatedRow = await requestArrItemReload(app, {
          itemId,
          instanceId,
          forceTautulli: shouldForceTautulli,
        });
        const filtersActive = hasActiveFilters();
        const shouldClearFilters = filtersActive && !rowMatchesCurrentFilters(updatedRow);
        if (applyArrItemUpdate(app, updatedRow, { skipRender: true })) {
          if (app === activeApp) {
            if (shouldClearFilters) {
              clearActiveFilters();
            }
            render(dataByApp[app] || [], { allowBatch: true });
            updateLastUpdatedDisplay();
            if (shouldClearFilters) {
              const focusKey = updatedRow.__sortarrKey || rowKey;
              queueRowFocus(app, focusKey);
            }
          }
          const arrLabel = `${appLabel} refresh succeeded`;
          const filterNote = shouldClearFilters ? " Filters cleared to keep item visible." : "";
          const followup = refreshOutcome === "partial"
            ? `${rowTitle} Updated - Partial refresh (${arrLabel}, ${playbackLabelText})`
            : `${rowTitle} Updated - ${arrLabel}${playbackItemRefresh ? `, ${playbackLabelText}` : ""}`;
          showRowRefreshFollowupNow(statusToken, `${followup}${filterNote}`);
          const refreshedRow = findRowElement(app, rowKey) || rowEl;
          setRowRefreshPending(refreshedRow, false);
          flashRowRefresh(refreshedRow, refreshOutcome);
        }
      } catch (err) {
        if (err && err.status === 404) {
          const removed = removeArrItem(app, row, rowKey);
          if (removed) {
            const appLabel = app === "sonarr" ? "Sonarr" : "Radarr";
            scheduleRowRefreshFollowup(
              statusToken,
              `${rowTitle} Removed - Not found in ${appLabel}.`
            );
            return;
          }
        }
        scheduleRowRefreshFollowup(
          statusToken,
          `${rowTitle} Refresh failed - Row reload failed: ${err.message}`
        );
      }
    }
    if (!arrOk && playbackUsed) {
      const arrLabel = `${appLabel} refresh failed`;
      const followup = refreshOutcome === "partial"
        ? `${rowTitle} Refresh failed - Partial refresh (${arrLabel}, ${playbackLabelText})`
        : `${rowTitle} Refresh failed - ${arrLabel}, ${playbackLabelText}`;
      scheduleRowRefreshFollowup(statusToken, followup);
    } else if (!arrOk) {
      scheduleRowRefreshFollowup(
        statusToken,
        `${rowTitle} Refresh failed - ${appLabel} refresh failed.`
      );
    }
  } catch (err) {
    scheduleRowRefreshFollowup(statusToken, `${rowTitle} Refresh failed - ${err.message}`);
    flashRowRefresh(rowEl, "fail");
  } finally {
    setRowRefreshPending(rowEl, false);
    btn.disabled = false;
  }
}

function formatSeasonLabel(seasonNumber) {
  return t("label_season_number", "Season %(num)s", { num: seasonNumber });
}


function formatEpisodeCode(seasonNumber, episodeNumber) {
  const season = String(Math.max(0, Number(seasonNumber || 0))).padStart(2, "0");
  const episode = String(Math.max(0, Number(episodeNumber || 0))).padStart(2, "0");
  return `S${season}E${episode}`;
}

function formatGiBValue(value) {
  if (value == null || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return `${num.toFixed(2)} GiB`;
}

function formatEpisodeSizeValue(value) {
  if (value == null || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  if (num < 1) {
    return `${Math.max(0, Math.round(num * 1000))}MB`;
  }
  return `${num.toFixed(2)} GiB`;
}

function formatEpisodeRuntimeMinutes(value) {
  if (value == null || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  const totalMinutes = Math.max(0, Math.round(num));
  if (totalMinutes === 0) return "";
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}h ${minutes}m`;
}

function summarizeListValues(value, limit = 3) {
  const items = [];
  if (Array.isArray(value)) {
    value.forEach(entry => {
      if (entry == null) return;
      if (typeof entry === "string") {
        items.push(entry);
        return;
      }
      if (typeof entry === "object") {
        const name = entry.name || entry.format || entry.id;
        if (name != null) items.push(String(name));
        return;
      }
      items.push(String(entry));
    });
  } else if (typeof value === "string") {
    value.split(",").forEach(entry => {
      const trimmed = entry.trim();
      if (trimmed) items.push(trimmed);
    });
  } else if (value != null && value !== "") {
    items.push(String(value));
  }
  const cleaned = [];
  const seen = new Set();
  items.forEach(item => {
    const trimmed = String(item).trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    cleaned.push(trimmed);
  });
  if (!cleaned.length) return { display: "", full: "", truncated: false };
  const full = cleaned.join(", ");
  if (cleaned.length <= limit) return { display: full, full, truncated: false };
  const display = `${cleaned.slice(0, limit).join(", ")}, +${cleaned.length - limit} more`;
  return { display, full, truncated: true };
}

const INLINE_LIST_TOGGLE_CHARS = 24;

function truncateInlineText(text, maxChars) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  const clipped = text.slice(0, Math.max(0, maxChars - 3)).trim();
  return clipped ? `${clipped}...` : text.slice(0, maxChars);
}

function formatToggleListCell({ display, full, mixed = false, allowToggle = false } = {}) {
  const safeDisplay = escapeHtml(display ?? "");
  const safeFull = escapeHtml(full ?? "");
  if (!safeDisplay && !safeFull && !mixed) return "";
  const shortText = safeDisplay || safeFull;
  const fullText = safeFull || shortText;
  const showToggle = allowToggle && fullText && fullText !== shortText;
  const classes = showToggle ? "lang-cell lang-cell-truncated" : "lang-cell";
  const titleAttr = fullText && fullText !== shortText ? ` title="${fullText}"` : "";
  const list = `<span class="lang-list" data-lang-full="${fullText}" data-lang-short="${shortText}" data-lang-state="short"${titleAttr}>${shortText}</span>`;
  const toggle = showToggle
    ? '<button class="lang-toggle" type="button" aria-expanded="false">Show all</button>'
    : "";
  const badge = mixed ? '<span class="mixed-badge mixed-badge-inline">Mixed</span>' : "";
  return `<span class="${classes}">${list}${toggle}${badge}</span>`;
}

function formatEpisodeLanguageSummary(value) {
  const summary = summarizeLanguageValue(value);
  if (!summary.display) return "";
  const full = summary.full ? ` title="${escapeHtml(summary.full)}"` : "";
  return `<span class="series-episode-language"${full}>${escapeHtml(summary.display)}</span>`;
}

function formatEpisodeCustomFormats(value) {
  const summary = summarizeListValues(value, 3);
  if (!summary.display) return "";
  const full = summary.full ? ` title="${escapeHtml(summary.full)}"` : "";
  return `<span class="series-episode-custom"${full}>${escapeHtml(summary.display)}</span>`;
}

function formatEpisodeBool(value) {
  if (value === "" || value === null || value === undefined) return "";
  return formatBoolValue(value);
}

function formatEpisodeAirDate(value) {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString();
}

function formatEpisodeDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatEpisodeScore(value) {
  if (value == null || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(1);
}

const EPISODE_NOT_REPORTED_HTML = '<span class="muted">' + t("Not Reported") + '</span>';
const NOT_REPORTED_HTML = '<span class="muted" title="' + t("Not reported by Arr") + '">' + t("Not reported") + '</span>';

function notReportedIfEmpty(value) {
  if (value === "" || value === null || value === undefined) return NOT_REPORTED_HTML;
  return value;
}

function formatOptionalBool(value) {
  if (value === "" || value === null || value === undefined) return NOT_REPORTED_HTML;
  return formatBoolValue(value);
}

function formatOptionalNumeric(value, widths = null) {
  if (value === "" || value === null || value === undefined) return NOT_REPORTED_HTML;
  return formatNumericCell(value, widths);
}

function formatEpisodeTextCell(value) {
  if (value === null || value === undefined) return EPISODE_NOT_REPORTED_HTML;
  const text = String(value);
  if (!text.trim()) return EPISODE_NOT_REPORTED_HTML;
  return escapeHtml(text);
}

function formatEpisodeHtmlCell(value) {
  if (value === null || value === undefined) return EPISODE_NOT_REPORTED_HTML;
  const text = String(value);
  if (!text.trim()) return EPISODE_NOT_REPORTED_HTML;
  return text;
}

const EPISODE_GRID_MAIN_WIDTH = "minmax(120px, 18vw)";
const EPISODE_GRID_COLUMNS = [
  {
    key: "runtime",
    label: t("Runtime"),
    className: "series-episode-runtime",
    width: "80px",
    extra: false,
    render: episode => formatEpisodeTextCell(
      formatEpisodeRuntimeMinutes(episode.runtimeMins ?? "")
    ),
  },
  {
    key: "size",
    label: t("Size"),
    className: "series-episode-size",
    width: "100px",
    extra: false,
    render: episode => {
      const sizeText = episode.hasFile === false
        ? "Missing"
        : formatEpisodeSizeValue(episode.fileSizeGiB);
      return formatEpisodeTextCell(sizeText);
    },
  },
  {
    key: "quality",
    label: t("Video Quality"),
    className: "series-episode-quality",
    width: "140px",
    extra: false,
    render: episode => formatEpisodeTextCell(episode.quality || ""),
  },
  {
    key: "resolution",
    label: t("Resolution"),
    className: "series-episode-resolution",
    width: "120px",
    extra: false,
    render: episode => formatEpisodeTextCell(episode.resolution || ""),
  },
  {
    key: "videoCodec",
    label: t("Video Codec"),
    className: "series-episode-video-codec",
    width: "120px",
    extra: false,
    render: episode => formatEpisodeTextCell(episode.videoCodec || ""),
  },
  {
    key: "audioCodec",
    label: t("Audio Codec"),
    className: "series-episode-audio-codec",
    width: "120px",
    extra: false,
    render: episode => formatEpisodeTextCell(episode.audioCodec || ""),
  },
  {
    key: "audioChannels",
    label: t("Audio Channels"),
    className: "series-episode-audio-channels",
    width: "110px",
    extra: false,
    render: episode => formatEpisodeHtmlCell(
      formatAudioChannelsCell(escapeHtml(episode.audioChannels ?? ""))
    ),
  },
  {
    key: "audioLanguages",
    label: t("Languages"),
    className: "series-episode-audio-langs",
    width: "150px",
    extra: false,
    render: episode => formatEpisodeHtmlCell(
      formatEpisodeLanguageSummary(episode.audioLanguages ?? "")
    ),
  },
  {
    key: "subtitleLanguages",
    label: t("Subtitles"),
    className: "series-episode-subs",
    width: "150px",
    extra: true,
    render: episode => formatEpisodeHtmlCell(
      formatEpisodeLanguageSummary(episode.subtitleLanguages ?? "")
    ),
  },
  {
    key: "airDate",
    label: t("Air Date"),
    className: "series-episode-air-date",
    width: "110px",
    extra: true,
    render: episode => formatEpisodeTextCell(
      formatEpisodeAirDate(episode.airDate ?? "")
    ),
  },
  {
    key: "cutoff",
    label: t("Cutoff"),
    className: "series-episode-cutoff",
    width: "90px",
    extra: true,
    render: episode => formatEpisodeTextCell(
      formatEpisodeBool(episode.qualityCutoffNotMet)
    ),
  },
  {
    key: "monitored",
    label: t("Monitored"),
    className: "series-episode-monitored",
    width: "90px",
    extra: true,
    render: episode => formatEpisodeTextCell(formatEpisodeBool(episode.monitored)),
  },
  {
    key: "releaseGroup",
    label: t("Release Group"),
    className: "series-episode-release-group",
    width: "120px",
    extra: true,
    render: episode => formatEpisodeTextCell(episode.releaseGroup ?? ""),
  },
  {
    key: "lastSearch",
    label: t("Last Search"),
    className: "series-episode-last-search",
    width: "150px",
    extra: true,
    render: episode => formatEpisodeTextCell(
      formatEpisodeDateTime(episode.lastSearchTime ?? "")
    ),
  },
  {
    key: "customFormats",
    label: t("Custom Formats"),
    className: "series-episode-custom-formats",
    width: "180px",
    extra: true,
    render: episode => formatEpisodeHtmlCell(
      formatEpisodeCustomFormats(episode.customFormats ?? "")
    ),
  },
  {
    key: "customScore",
    label: t("CF Score"),
    className: "series-episode-custom-score",
    width: "90px",
    extra: true,
    render: episode => formatEpisodeTextCell(
      formatEpisodeScore(episode.customFormatScore ?? "")
    ),
  },
];

function isEpisodeCellReported(cellHtml) {
  return Boolean(cellHtml && cellHtml !== EPISODE_NOT_REPORTED_HTML);
}

function buildEpisodeGridTemplate(columns) {
  const widths = (columns || []).map(col => col.width).filter(Boolean);
  if (!widths.length) return EPISODE_GRID_MAIN_WIDTH;
  return `${EPISODE_GRID_MAIN_WIDTH} ${widths.join(" ")}`;
}

function applyEpisodeGridTemplate(container, columns) {
  if (!container) return;
  const baseColumns = (columns || []).filter(col => !col.extra);
  container.style.setProperty("--series-episode-grid-base", buildEpisodeGridTemplate(baseColumns));
  container.style.setProperty("--series-episode-grid-extras", buildEpisodeGridTemplate(columns));
}

function getEpisodeGridColumns(episodes) {
  const reportedByKey = new Map();
  EPISODE_GRID_COLUMNS.forEach(col => reportedByKey.set(col.key, false));
  if (Array.isArray(episodes)) {
    episodes.forEach(episode => {
      EPISODE_GRID_COLUMNS.forEach(col => {
        if (reportedByKey.get(col.key)) return;
        const cell = col.render(episode);
        if (isEpisodeCellReported(cell)) {
          reportedByKey.set(col.key, true);
        }
      });
    });
  }
  const baseReported = [];
  const extraReported = [];
  const baseUnreported = [];
  const extraUnreported = [];
  EPISODE_GRID_COLUMNS.forEach(col => {
    const reported = reportedByKey.get(col.key);
    if (col.extra) {
      (reported ? extraReported : extraUnreported).push(col);
    } else {
      (reported ? baseReported : baseUnreported).push(col);
    }
  });
  return baseReported.concat(extraReported, baseUnreported, extraUnreported);
}

function formatSeriesType(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw
    .replace(/[_-]+/g, " ")
    .split(" ")
    .map(word => word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : "")
    .join(" ");
}

function formatSeriesLanguage(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const isCode = /^[a-z]{2,3}([_-][a-z0-9]+)?$/i.test(raw);
  const display = isCode ? languageCodeToName(raw) : raw;
  return escapeHtml(display);
}

function formatSeriesGenres(value) {
  const summary = summarizeListValues(value, 3);
  if (!summary.display) return "";
  const full = summary.full;
  let display = summary.display;
  let allowToggle = summary.truncated;
  if (!allowToggle && full.length > INLINE_LIST_TOGGLE_CHARS) {
    display = truncateInlineText(full, INLINE_LIST_TOGGLE_CHARS);
    allowToggle = display !== full;
  }
  return formatToggleListCell({
    display,
    full,
    allowToggle,
  });
}

function formatCustomFormatsValue(value) {
  const summary = summarizeListValues(value, 3);
  if (!summary.display) return "";
  const full = summary.full;
  let display = summary.display;
  let allowToggle = summary.truncated;
  if (!allowToggle && full.length > INLINE_LIST_TOGGLE_CHARS) {
    display = truncateInlineText(full, INLINE_LIST_TOGGLE_CHARS);
    allowToggle = display !== full;
  }
  return formatToggleListCell({
    display,
    full,
    allowToggle,
  });
}

function formatLanguagesValue(value) {
  if (!value) return "";
  return formatLanguageValue(value, false, { allowToggle: true });
}

function formatSeriesDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return escapeHtml(date.toLocaleDateString());
}

function formatDateTimeValue(value) {
  if (!value) return "";
  // If it's already a Tautulli formatted string, pretty print it
  if (typeof value === "string" && value.includes(" - ")) {
    return escapeHtml(formatTautulliRawPretty(value));
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return escapeHtml(`${day}/${month}/${year} - ${hours}:${minutes}`);
}


// Detect 12h vs 24h user preference
function prefers12Hour() {
  const opt = Intl.DateTimeFormat().resolvedOptions();
  if (typeof opt.hour12 === "boolean") return opt.hour12;

  // Fallback inference: format an hour and see if AM/PM appears
  const s = new Intl.DateTimeFormat(undefined, { hour: "numeric" })
    .format(new Date("2025-01-01T13:00:00"));
  return /AM|PM|am|pm/.test(s);
}



function formatDateDMY_to_DDMonYYYY(dateStr) {
  const [dd, mm, yyyy] = dateStr.split("/");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = Number(mm);
  if (!dd || !mm || !yyyy || m < 1 || m > 12) return dateStr;
  return `${dd.padStart(2, "0")} ${months[m - 1]} ${yyyy}`;
}

function formatTautulliRawPretty(ts) {
  const [date, time] = ts.split(" - ");
  if (!date || !time) return ts;

  const prettyDate = formatDateDMY_to_DDMonYYYY(date);

  // 24h users -> keep time
  if (!prefers12Hour()) return `${prettyDate} · ${time}`;

  // Convert to 12h
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;

  return `${prettyDate} · ${hour12}:${mStr.padStart(2, "0")} ${suffix}`;
}


function buildSeasonMetaText(season) {
  const parts = [];
  const epCount = season.episodeCount;
  const fileCount = season.episodeFileCount;
  if (epCount != null && epCount !== "") {
    parts.push(`${epCount} eps`);
  }
  if (fileCount != null && fileCount !== "") {
    parts.push(`${fileCount} files`);
  }
  const sizeText = formatGiBValue(season.sizeOnDiskGiB);
  if (sizeText) parts.push(sizeText);
  const avgText = formatGiBValue(season.avgEpisodeSizeGiB);
  if (avgText) parts.push(`${avgText}/ep`);
  if (season.monitored === false) parts.push("Unmonitored");
  return parts.join(" | ");
}

function buildEpisodeMetaText(episode) {
  const parts = [];
  if (episode.hasFile === false) {
    parts.push("Missing");
  }
  const sizeText = formatEpisodeSizeValue(episode.fileSizeGiB);
  if (sizeText) parts.push(sizeText);
  const quality = [episode.quality, episode.resolution].filter(Boolean).join(" ");
  if (quality) parts.push(quality);
  if (episode.audioCodec) parts.push(episode.audioCodec);
  return parts.join(" | ");
}

function buildEpisodeGridHeader(columns) {
  const row = document.createElement("div");
  row.className = "series-episode-header";
  const ordered = Array.isArray(columns) && columns.length
    ? columns
    : EPISODE_GRID_COLUMNS;
  const cells = [
    `<div class="series-episode-header-cell series-episode-header-title">${t("episode_grid_column_episode_title", "Episode")}</div>`,
  ];
  ordered.forEach(col => {
    const classes = [
      "series-episode-header-cell",
      "series-episode-col",
      col.className,
    ];
    if (col.extra) classes.push("series-episode-extra");
    cells.push(`<div class="${classes.join(" ")}">${col.label}</div>`);
  });
  row.innerHTML = cells.join("");
  return row;
}

function buildEpisodeGridRow(episode, columns, index) {
  const row = document.createElement("div");
  row.className = "series-episode-row";
  if (episode.hasFile === false) {
    row.classList.add("series-episode-row--missing");
  }
  if (Number.isFinite(index)) {
    row.dataset.episodeIndex = String(index);
  }
  const code = formatEpisodeCode(episode.seasonNumber, episode.episodeNumber);
  const overviewText = String(episode.overview ?? "").trim();
  const overviewAttr = overviewText ? ` title="${escapeHtml(overviewText)}"` : "";
  const ordered = Array.isArray(columns) && columns.length
    ? columns
    : EPISODE_GRID_COLUMNS;
  const historyButton = buildEpisodeHistoryButton(episode);
  const cells = [
    `<div class="series-episode-main">
      ${historyButton}
      <span class="series-episode-code"${overviewAttr}>${escapeHtml(code)}</span>
      <span class="series-episode-title"${overviewAttr}>${escapeHtml(episode.title || t("episode_title_untitled", "Untitled"))}</span>
    </div>`,
  ];
  ordered.forEach(col => {
    const classes = ["series-episode-cell", "series-episode-col", col.className];
    if (col.extra) classes.push("series-episode-extra");
    cells.push(`<div class="${classes.join(" ")}">${col.render(episode)}</div>`);
  });
  row.innerHTML = cells.join("");
  return row;
}

function createVirtualList({ height, rowHeight, overscan, headerEl } = {}) {
  const root = document.createElement("div");
  root.className = "series-episode-scroll";
  const spacer = document.createElement("div");
  spacer.className = "series-episode-virtual-spacer";
  const items = document.createElement("div");
  items.className = "series-episode-virtual-items";
  let headerOffset = 0;
  if (headerEl) {
    root.appendChild(headerEl);
  }
  root.append(spacer, items);

  let data = [];
  let renderRow = () => document.createElement("div");
  const rowSize = rowHeight || SERIES_EXPANSION_ROW_HEIGHT;
  const listHeight = height || SERIES_EXPANSION_MAX_HEIGHT;
  const listOverscan = overscan || SERIES_EXPANSION_OVERSCAN;
  root.style.maxHeight = `${listHeight}px`;

  const updateHeaderOffset = () => {
    headerOffset = headerEl ? headerEl.offsetHeight : 0;
    items.style.top = `${headerOffset}px`;
  };

  function render() {
    const viewport = root.clientHeight || listHeight;
    const scrollTop = Math.max(0, root.scrollTop - headerOffset);
    const start = Math.max(0, Math.floor(scrollTop / rowSize) - listOverscan);
    const end = Math.min(data.length, start + Math.ceil(viewport / rowSize) + listOverscan * 2);
    items.style.transform = `translateY(${start * rowSize}px)`;
    items.textContent = "";
    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i += 1) {
      const row = renderRow(data[i], i);
      row.classList.add("series-episode-row");
      row.style.height = `${rowSize}px`;
      frag.appendChild(row);
    }
    items.appendChild(frag);
  }

  function setData(next) {
    data = Array.isArray(next) ? next : [];
    spacer.style.height = `${data.length * rowSize}px`;
    if (headerEl && root.isConnected) {
      updateHeaderOffset();
      render();
      return;
    }
    requestAnimationFrame(() => {
      updateHeaderOffset();
      render();
    });
  }

  function setRenderRow(fn) {
    if (typeof fn === "function") {
      renderRow = fn;
      render();
    }
  }

  let scrollFrame = null;
  const scheduleRender = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      render();
    });
  };
  root.addEventListener("scroll", scheduleRender, { passive: true });
  return { root, setData, setRenderRow, render };
}

function renderSeriesSkeleton(container, count) {
  if (!container) return;
  container.textContent = "";
  const frag = document.createDocumentFragment();
  const total = count || 4;
  for (let i = 0; i < total; i += 1) {
    const row = document.createElement("div");
    row.className = "series-skeleton";
    frag.appendChild(row);
  }
  container.appendChild(frag);
}

function renderSeriesError(container, message) {
  if (!container) return;
  container.textContent = "";
  const error = document.createElement("div");
  error.className = "series-expansion-error";
  error.textContent = message || t("series_failed_to_load", "Failed to load.");
  container.appendChild(error);
}

function buildSeriesExpansionShell(seriesKey, seriesId, instanceId) {
  const template = document.getElementById("sonarrSeriesExpansionTemplate");
  let shell = null;
  if (template && template.content && template.content.firstElementChild) {
    shell = template.content.firstElementChild.cloneNode(true);
  }
  if (!shell) {
    shell = document.createElement("div");
    shell.className = "series-expansion";
    shell.innerHTML = `
        <div class="series-expansion-header">
          <div class="series-expansion-poster">
            <img class="series-expansion-poster-img" data-role="series-expansion-poster" alt="" loading="lazy" decoding="async" />
          </div>
          <button class="series-expansion-toggle hidden" type="button" data-role="series-expand-all-seasons" aria-pressed="false">${t("Expand all seasons", "Expand all seasons")}</button>
          <div class="series-expansion-title">${t("series_expansion_title_seasons", "Seasons")}</div>
          <div class="series-expansion-actions">
            <div class="series-expansion-status muted" data-role="series-expansion-status"></div>
          </div>
        </div>
        <div class="series-expansion-body" data-role="series-expansion-body"></div>
    `;
  }
  shell.dataset.seriesKey = seriesKey;
  if (seriesId != null) {
    shell.dataset.seriesId = String(seriesId);
  }
  if (instanceId != null) {
    shell.dataset.instanceId = String(instanceId);
  }
  const body = shell.querySelector('[data-role="series-expansion-body"]') || shell;
  const statusEl = shell.querySelector('[data-role="series-expansion-status"]');
  const posterImg = shell.querySelector('[data-role="series-expansion-poster"]');
  return { shell, body, statusEl, posterImg };
}

function updateExpandAllSeasonsButton(expansion, seriesKey) {
  if (!expansion) return;
  const btn = expansion.querySelector('[data-role="series-expand-all-seasons"]');
  if (!btn) return;

  const blocks = Array.from(expansion.querySelectorAll(".series-season-block"));
  if (blocks.length <= 1) {
    btn.classList.add("hidden");
    btn.disabled = true;
    btn.setAttribute("aria-pressed", "false");
    return;
  }

  const keys = blocks.map((block) => {
    const seasonNumber = Number(block?.dataset?.season || 0);
    return `${seriesKey}::${seasonNumber}`;
  });
  const allExpanded = keys.length > 0 && keys.every((k) => sonarrExpansionState.expandedSeasons.has(k));

  btn.classList.remove("hidden");
  btn.disabled = false;
  btn.setAttribute("aria-pressed", allExpanded ? "true" : "false");
  btn.textContent = allExpanded
    ? t("Collapse all seasons", "Collapse all seasons")
    : t("Expand all seasons", "Expand all seasons");
}

function setSeasonExtrasState(block, enabled) {
  if (!block) return;
  const seriesKey = block.dataset.seriesKey || "";
  const season = block.dataset.season || "";
  const seasonKey = seriesKey && season ? `${seriesKey}::${season}` : "";
  const episodesWrap = block.querySelector(".series-season-episodes");
  const toggle = block.querySelector('[data-role="episode-extras-toggle"]');
  if (episodesWrap) {
    episodesWrap.classList.toggle("series-episode-extras", enabled);
  }
  if (toggle) {
    toggle.setAttribute("aria-pressed", enabled ? "true" : "false");
    toggle.classList.toggle("is-active", enabled);
  }
  if (!seasonKey) return;
  if (enabled) {
    sonarrExpansionState.extrasBySeason.add(seasonKey);
  } else {
    sonarrExpansionState.extrasBySeason.delete(seasonKey);
  }
}

function updateSeriesExpansionStatus(statusEl, text, options = {}) {
  if (!statusEl) return;
  statusEl.textContent = text || "";
  statusEl.classList.toggle("series-expansion-status--warn", Boolean(options.warn));
}

function ensureSeriesChildRow(rowEl, seriesKey) {
  if (!rowEl || !seriesKey) return null;
  const existing = rowEl.nextElementSibling;
  if (existing && existing.classList.contains("series-child-row")) {
    if (existing.__collapseTimer) {
      clearTimeout(existing.__collapseTimer);
      existing.__collapseTimer = null;
    }
    sonarrExpansionState.childRowsBySeries.set(seriesKey, existing);
    const td = existing.firstElementChild;
    if (td) {
      const colCount = tableEl ? tableEl.querySelectorAll("thead th").length : 1;
      td.colSpan = colCount || 1;
    }
    requestAnimationFrame(() => {
      existing.classList.add("series-child-row--open");
      cacheSeriesExpansionHeight(seriesKey, existing);
    });
    return existing;
  }

  const cached = getCachedSeriesChildRow(seriesKey, tableEl ? tableEl.querySelectorAll("thead th").length : 1);
  if (cached) {
    rowEl.insertAdjacentElement("afterend", cached);
    requestAnimationFrame(() => cacheSeriesExpansionHeight(seriesKey, cached));
    return cached;
  }

  const tr = document.createElement("tr");
  tr.className = "series-child-row";
  tr.dataset.seriesKey = seriesKey;
  const td = document.createElement("td");
  const colCount = tableEl ? tableEl.querySelectorAll("thead th").length : 1;
  td.colSpan = colCount || 1;
  tr.appendChild(td);
  rowEl.insertAdjacentElement("afterend", tr);
  sonarrExpansionState.childRowsBySeries.set(seriesKey, tr);
  requestAnimationFrame(() => {
    tr.classList.add("series-child-row--open");
    cacheSeriesExpansionHeight(seriesKey, tr);
  });
  return tr;
}
function collapseSeriesExpansion(rowEl, btn, seriesKey) {
  sonarrExpansionState.expandedSeries.delete(seriesKey);
  sonarrExpansionState.childRowsBySeries.delete(seriesKey);
  sonarrExpansionState.expansionHeightBySeries.delete(seriesKey);
  Array.from(sonarrExpansionState.expandedSeasons).forEach(key => {
    if (key.startsWith(`${seriesKey}::`)) {
      sonarrExpansionState.expandedSeasons.delete(key);
    }
  });
  Array.from(sonarrExpansionState.extrasBySeason).forEach(key => {
    if (key.startsWith(`${seriesKey}::`)) {
      sonarrExpansionState.extrasBySeason.delete(key);
    }
  });
  if (btn) {
    btn.setAttribute("aria-expanded", "false");
    const icon = btn.querySelector("span");
    if (icon) icon.textContent = "+";
  }
  if (rowEl) rowEl.classList.remove("series-expanded");
  if (tbody) {
    const safeKey = window.CSS && CSS.escape ? CSS.escape(seriesKey) : seriesKey.replace(/["\\]/g, "\\$&");
    tbody.querySelectorAll(`tr.series-child-row[data-series-key="${safeKey}"]`).forEach(row => {
      cacheSeriesExpansionHeight(seriesKey, row);
      row.classList.remove("series-child-row--open");
      if (row.__collapseTimer) {
        clearTimeout(row.__collapseTimer);
      }
      row.__collapseTimer = window.setTimeout(() => {
        if (row.isConnected) {
          row.remove();
        }
        row.__collapseTimer = null;
      }, SERIES_EXPANSION_ANIM_MS);
    });
  }
}

async function loadSeriesSeasons(row, seriesKey, expansion) {
  const cached = sonarrExpansionState.seasonsBySeries.get(seriesKey);
  if (cached) {
    renderSeasonList(expansion.body, seriesKey, cached);
    const fastMode = sonarrExpansionState.fastModeBySeries.get(seriesKey) === true;
    updateSeriesExpansionStatus(
      expansion.statusEl,
      fastMode ? t("sonarr_fast_mode_limited", "Fast mode: file details limited.") : ""
    );
    return;
  }
  const requestKey = `seasons::${seriesKey}`;
  let request = sonarrExpansionState.inflight.get(requestKey);
  if (!request) {
    const seriesId = row.SeriesId ?? row.seriesId ?? "";
    const instanceId = row.InstanceId ?? row.instanceId ?? "";
    request = requestSonarrSeasons(seriesId, instanceId);
    sonarrExpansionState.inflight.set(requestKey, request);
  }
  try {
    const payload = await request;
    const seasons = Array.isArray(payload?.seasons) ? payload.seasons : [];
    sonarrExpansionState.seasonsBySeries.set(seriesKey, seasons);
    sonarrExpansionState.fastModeBySeries.set(seriesKey, payload?.fast_mode === true);
    if (!expansion.body || !expansion.body.isConnected) return;
    renderSeasonList(expansion.body, seriesKey, seasons);
    updateSeriesExpansionStatus(
      expansion.statusEl,
      payload?.fast_mode ? t("sonarr_fast_mode_limited", "Fast mode: file details limited.") : ""
    );
  } catch (err) {
    const loadSeasonsFail = t("sonarr_failed_load_seasons", "Failed to load seasons.");
    renderSeriesError(expansion.body, err.message || loadSeasonsFail);
    updateSeriesExpansionStatus(expansion.statusEl, loadSeasonsFail, { warn: true });
  } finally {
    sonarrExpansionState.inflight.delete(requestKey);
  }
}

function renderSeasonList(container, seriesKey, seasons) {
  if (!container) return;
  container.textContent = "";
  const expansion = container.closest(".series-expansion");
  const seriesId = expansion?.dataset?.seriesId || "";
  const instanceId = expansion?.dataset?.instanceId || "";
  const visible = Array.isArray(seasons)
    ? seasons.filter(season => {
      const seasonNumber = Number(season.seasonNumber || 0);
      if (seasonNumber !== 0) return true;
      const fileCount = season.episodeFileCount;
      const episodeCount = season.episodeCount;
      if (fileCount != null && fileCount !== "") {
        return Number(fileCount) > 0;
      }
      if (episodeCount != null && episodeCount !== "") {
        return Number(episodeCount) > 0;
      }
      return false;
    })
    : [];
  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "series-expansion-empty";
    empty.textContent = t("sonarr_no_seasons_available", "No seasons available.");
    container.appendChild(empty);
    updateExpandAllSeasonsButton(expansion, seriesKey);
    return;
  }
  const frag = document.createDocumentFragment();
  visible.forEach(season => {
    const seasonNumber = Number(season.seasonNumber || 0);
    const seasonKey = `${seriesKey}::${seasonNumber}`;
    const block = document.createElement("div");
    block.className = "series-season-block";
    block.dataset.seriesKey = seriesKey;
    block.dataset.season = String(seasonNumber);

    const row = document.createElement("div");
    row.className = "series-season-row";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "series-season-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "+";
    toggle.dataset.seriesKey = seriesKey;
    toggle.dataset.season = String(seasonNumber);

    toggle.addEventListener("click", (e) => {
      withWrapScrollLock(() => {
        // whatever you currently do to open/close the season
        // (example: block.classList.toggle("is-open") etc)
        // leave your existing logic inside here
      });
      focusNoScroll(e.currentTarget);
    });

    const label = document.createElement("div");
    label.className = "series-season-title";
    label.textContent = formatSeasonLabel(seasonNumber);

    const meta = document.createElement("div");
    meta.className = "series-season-meta";
    meta.textContent = buildSeasonMetaText(season);

    const headerWrap = document.createElement("div");
    headerWrap.className = "series-season-header";

    const metaWrap = document.createElement("div");
    metaWrap.className = "series-season-main";
    const extrasToggle = document.createElement("button");
    extrasToggle.type = "button";
    extrasToggle.className = "series-expansion-toggle series-season-extras";
    extrasToggle.setAttribute("aria-pressed", "false");
    extrasToggle.setAttribute("data-role", "episode-extras-toggle");
    extrasToggle.textContent = t("label_extras", "Extras");

    headerWrap.append(label, extrasToggle);
    metaWrap.append(headerWrap, meta);

    row.append(toggle, metaWrap);

    const episodesWrap = document.createElement("div");
    episodesWrap.className = "series-season-episodes";
    episodesWrap.dataset.seriesKey = seriesKey;
    episodesWrap.dataset.season = String(seasonNumber);
    episodesWrap.setAttribute("aria-hidden", "true");
    const extrasEnabled = sonarrExpansionState.extrasBySeason.has(seasonKey);
    if (extrasEnabled) {
      episodesWrap.classList.add("series-episode-extras");
      extrasToggle.setAttribute("aria-pressed", "true");
      extrasToggle.classList.add("is-active");
    }

    if (sonarrExpansionState.expandedSeasons.has(seasonKey)) {
      toggle.setAttribute("aria-expanded", "true");
      toggle.textContent = "-";
      episodesWrap.classList.add("is-open");
      episodesWrap.setAttribute("aria-hidden", "false");
      const cachedEpisodes = sonarrExpansionState.episodesBySeason.get(seasonKey);
      if (cachedEpisodes) {
        renderEpisodeList(episodesWrap, cachedEpisodes);
      } else {
        renderSeriesSkeleton(episodesWrap, 3);
        if (seriesId) {
          void loadSeasonEpisodes(seriesId, seasonNumber, instanceId, episodesWrap, seriesKey);
        }
      }
    }

    block.append(row, episodesWrap);
    frag.appendChild(block);
  });
  container.appendChild(frag);
  updateExpandAllSeasonsButton(expansion, seriesKey);
}

async function loadSeasonEpisodes(seriesId, seasonNumber, instanceId, container, seriesKey) {
  const cacheKey = `${seriesKey}::${seasonNumber}`;
  const cached = sonarrExpansionState.episodesBySeason.get(cacheKey);
  if (cached) {
    renderEpisodeList(container, cached);
    return;
  }
  const requestKey = `episodes::${cacheKey}`;
  let request = sonarrExpansionState.inflight.get(requestKey);
  if (!request) {
    request = requestSonarrEpisodes(seriesId, seasonNumber, instanceId);
    sonarrExpansionState.inflight.set(requestKey, request);
  }
  try {
    const payload = await request;
    const episodes = Array.isArray(payload?.episodes) ? payload.episodes : [];
    sonarrExpansionState.episodesBySeason.set(cacheKey, episodes);
    if (!sonarrExpansionState.expandedSeasons.has(cacheKey)) return;
    if (!container || !container.isConnected) return;
    renderEpisodeList(container, episodes);
  } catch (err) {
    const loadEpisodesFail = t("sonarr_failed_load_episodes", "Failed to load episodes.");
    renderSeriesError(container, err.message || loadEpisodesFail);
    updateSeriesExpansionStatus(expansion.statusEl, loadEpisodesFail, { warn: true });
  } finally {
    sonarrExpansionState.inflight.delete(requestKey);
  }
}

function renderEpisodeList(container, episodes) {
  if (!container) return;
  container.textContent = "";
  if (!episodes || !episodes.length) {
    const empty = document.createElement("div");
    empty.className = "series-expansion-empty";
    empty.textContent = t("sonarr_no_episodes_available", "No episodes available.");
    container.appendChild(empty);
    return;
  }
  const orderedColumns = getEpisodeGridColumns(episodes);
  applyEpisodeGridTemplate(container, orderedColumns);
  const header = buildEpisodeGridHeader(orderedColumns);
  const renderEpisodeRow = (episode, index) => {
    const row = buildEpisodeGridRow(episode, orderedColumns, index);
    if (container.dataset.selectedEpisodeIndex === String(index)) {
      row.classList.add("series-episode-row--selected");
      selectedEpisodeRowEl = row;
    }
    return row;
  };
  if (episodes.length <= 40) {
    const scroll = document.createElement("div");
    scroll.className = "series-episode-scroll";
    scroll.style.maxHeight = `${SERIES_EXPANSION_MAX_HEIGHT}px`;
    scroll.appendChild(header);
    const rows = document.createElement("div");
    rows.className = "series-episode-rows";
    episodes.forEach((episode, index) => {
      rows.appendChild(renderEpisodeRow(episode, index));
    });
    scroll.appendChild(rows);
    container.appendChild(scroll);
    const selectedIndex = Number(container.dataset.selectedEpisodeIndex);
    const seasonKey = container.dataset.seriesKey || "";
    const seasonNumber = container.dataset.season || "";
    if (Number.isFinite(selectedIndex) &&
      keyboardNavState.level === "episodes" &&
      seasonKey &&
      seasonKey === keyboardNavState.seriesKey &&
      seasonNumber === String(keyboardNavState.seasonNumber)) {
      requestAnimationFrame(() => {
        applyEpisodeSelection(container, selectedIndex, { scroll: true });
      });
    }
    return;
  }
  const vlist = createVirtualList({
    height: SERIES_EXPANSION_MAX_HEIGHT,
    rowHeight: SERIES_EXPANSION_ROW_HEIGHT,
    overscan: SERIES_EXPANSION_OVERSCAN,
    headerEl: header,
  });
  vlist.setRenderRow(renderEpisodeRow);
  vlist.setData(episodes);
  container.appendChild(vlist.root);
  const selectedIndex = Number(container.dataset.selectedEpisodeIndex);
  const seasonKey = container.dataset.seriesKey || "";
  const seasonNumber = container.dataset.season || "";
  if (Number.isFinite(selectedIndex) &&
    keyboardNavState.level === "episodes" &&
    seasonKey &&
    seasonKey === keyboardNavState.seriesKey &&
    seasonNumber === String(keyboardNavState.seasonNumber)) {
    requestAnimationFrame(() => {
      applyEpisodeSelection(container, selectedIndex, { scroll: true });
    });
  }
}

async function handleSeriesExpanderClick(btn) {
  let rowEl = btn.closest("tr");
  if (!rowEl) return;
  const app = rowEl.dataset.app || activeApp;
  if (app !== "sonarr") return;
  const row = rowEl.__sortarrRow || findRowByKey(app, rowEl.dataset.rowKey || "");
  if (!row) return;
  const seriesId = row.SeriesId ?? row.seriesId ?? "";
  if (!seriesId) return;
  const instanceId = row.InstanceId ?? row.instanceId ?? "";
  const seriesKey = getSonarrSeriesKey(seriesId, instanceId);
  if (!seriesKey) return;
  if (sonarrExpansionState.expandedSeries.has(seriesKey)) {
    collapseSeriesExpansion(rowEl, btn, seriesKey);
    return;
  }
  sonarrExpansionState.expandedSeries.add(seriesKey);
  rowEl.classList.add("series-expanded");
  rowEl.dataset.seriesKey = seriesKey;
  btn.setAttribute("aria-expanded", "true");
  const icon = btn.querySelector("span");
  if (icon) icon.textContent = "-";

  const childRow = ensureSeriesChildRow(rowEl, seriesKey);
  const cell = childRow.querySelector("td");
  cell.textContent = "";
  const expansion = buildSeriesExpansionShell(seriesKey, seriesId, instanceId);
  cell.appendChild(expansion.shell);
  if (IMAGES_ENABLED && expansion.posterImg && seriesId) {
    const inst = instanceId ? encodeURIComponent(String(instanceId)) : "";
    expansion.posterImg.src = inst ? `/api/sonarr/asset/${inst}/poster/${encodeURIComponent(String(seriesId))}` : `/api/sonarr/asset/sonarr-1/poster/${encodeURIComponent(String(seriesId))}`;
    expansion.posterImg.onerror = () => {
      const img = expansion.posterImg;
      if (!img) return;
      if (img.complete && img.naturalWidth > 0) return;
      const wrap = img.closest(".series-expansion-poster");
      if (wrap) wrap.classList.add("series-expansion-poster--empty");
    };
    const wrap = expansion.posterImg.closest(".series-expansion-poster");
    if (wrap) wrap.classList.remove("series-expansion-poster--empty");
  } else if (expansion.posterImg) {
    expansion.posterImg.removeAttribute("src");
    const wrap = expansion.posterImg.closest(".series-expansion-poster");
    if (wrap) wrap.classList.add("series-expansion-poster--empty");
  }
  updateSeriesExpansionStatus(expansion.statusEl, "Loading seasons...");
  renderSeriesSkeleton(expansion.body, 4);
  await loadSeriesSeasons(row, seriesKey, expansion);
}

async function handleSeriesSeasonToggle(btn) {
  const block = btn.closest(".series-season-block");
  if (!block) return;
  const seriesKey = block.dataset.seriesKey || "";
  const seasonNumber = Number(block.dataset.season || 0);
  if (!seriesKey) return;
  const expansion = block.closest(".series-expansion");
  const seriesId = expansion?.dataset?.seriesId || "";
  const instanceId = expansion?.dataset?.instanceId || "";
  const seasonKey = `${seriesKey}::${seasonNumber}`;
  const episodesWrap = block.querySelector(".series-season-episodes");
  if (!episodesWrap) return;

  if (sonarrExpansionState.expandedSeasons.has(seasonKey)) {
    sonarrExpansionState.expandedSeasons.delete(seasonKey);
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = "+";
    episodesWrap.classList.remove("is-open");
    episodesWrap.setAttribute("aria-hidden", "true");
    if (selectedEpisodeRowEl && episodesWrap.contains(selectedEpisodeRowEl)) {
      delete episodesWrap.dataset.selectedEpisodeIndex;
      selectedEpisodeRowEl.classList.remove("series-episode-row--selected");
      selectedEpisodeRowEl = null;
    }
    updateExpandAllSeasonsButton(expansion, seriesKey);
    return;
  }

  sonarrExpansionState.expandedSeasons.add(seasonKey);
  btn.setAttribute("aria-expanded", "true");
  btn.textContent = "-";
  episodesWrap.classList.add("is-open");
  episodesWrap.setAttribute("aria-hidden", "false");
  renderSeriesSkeleton(episodesWrap, 3);
  if (!seriesId) {
    renderSeriesError(episodesWrap, "Series id missing.");
    updateExpandAllSeasonsButton(expansion, seriesKey);
    return;
  }
  await loadSeasonEpisodes(seriesId, seasonNumber, instanceId, episodesWrap, seriesKey);
  updateExpandAllSeasonsButton(expansion, seriesKey);
}

async function handleExpandAllSeasonsToggle(btn) {
  const expansion = btn.closest(".series-expansion");
  const seriesKey = expansion?.dataset?.seriesKey || "";
  if (!expansion || !seriesKey) return;

  const toggles = Array.from(expansion.querySelectorAll(".series-season-toggle"));
  if (!toggles.length) return;

  const keys = toggles.map((toggle) => {
    const seasonNumber = Number(toggle?.dataset?.season || 0);
    return `${seriesKey}::${seasonNumber}`;
  });
  const allExpanded = keys.length > 0 && keys.every((k) => sonarrExpansionState.expandedSeasons.has(k));

  // Use existing toggle logic so state + fetch behavior stays consistent.
  for (const toggle of toggles) {
    const seasonNumber = Number(toggle?.dataset?.season || 0);
    const seasonKey = `${seriesKey}::${seasonNumber}`;
    const isExpanded = sonarrExpansionState.expandedSeasons.has(seasonKey);
    if (!allExpanded && !isExpanded) {
      await handleSeriesSeasonToggle(toggle);
    } else if (allExpanded && isExpanded) {
      await handleSeriesSeasonToggle(toggle);
    }
  }

  updateExpandAllSeasonsButton(expansion, seriesKey);
}

function findRowElement(app, rowKey) {
  if (!tbody || !rowKey) return null;
  const safeKey = window.CSS && CSS.escape ? CSS.escape(rowKey) : rowKey.replace(/["\\]/g, "\\$&");
  return tbody.querySelector(`tr[data-app="${app}"][data-row-key="${safeKey}"]`);
}

function clearTableSelection() {
  if (selectedRowEl) {
    selectedRowEl.classList.remove("row-selected");
    selectedRowEl = null;
  }
  if (selectedSeasonRowEl) {
    selectedSeasonRowEl.classList.remove("series-season-row--selected");
    selectedSeasonRowEl = null;
  }
  if (selectedEpisodeRowEl) {
    const wrap = selectedEpisodeRowEl.closest(".series-season-episodes");
    if (wrap) {
      delete wrap.dataset.selectedEpisodeIndex;
    }
    selectedEpisodeRowEl.classList.remove("series-episode-row--selected");
    selectedEpisodeRowEl = null;
  }
  keyboardNavState.level = "rows";
  keyboardNavState.rowIndex = -1;
  keyboardNavState.seriesRowKey = "";
  keyboardNavState.seriesKey = "";
  keyboardNavState.seasonIndex = -1;
  keyboardNavState.seasonNumber = "";
  keyboardNavState.episodeIndex = -1;
}

function getMainRowElements() {
  if (!tbody) return [];
  return Array.from(
    tbody.querySelectorAll(`tr[data-app="${activeApp}"]:not(.series-child-row)`)
  );
}

function getRowIndex(rowEl) {
  const rows = getMainRowElements();
  return rows.indexOf(rowEl);
}

function getSeriesExpansionRow(rowEl) {
  const next = rowEl?.nextElementSibling;
  if (next && next.classList.contains("series-child-row")) {
    return next;
  }
  return null;
}

function getSeasonRowsForRow(rowEl) {
  const childRow = getSeriesExpansionRow(rowEl);
  if (!childRow) return [];
  return Array.from(childRow.querySelectorAll(".series-season-row"));
}

function getSeasonBlockInfo(rowEl, seasonIndex) {
  const seasons = getSeasonRowsForRow(rowEl);
  if (!seasons.length) return null;
  const index = Math.max(0, Math.min(seasonIndex, seasons.length - 1));
  const seasonRow = seasons[index];
  const block = seasonRow?.closest(".series-season-block");
  if (!block) return null;
  return { seasons, index, seasonRow, block };
}

function getSeasonKeyFromBlock(block) {
  if (!block) return "";
  const seriesKey = block.dataset.seriesKey || "";
  const season = block.dataset.season || "";
  return seriesKey && season ? `${seriesKey}::${season}` : "";
}

function findLastExpandedEpisodeInfo(rowEl) {
  const seasons = getSeasonRowsForRow(rowEl);
  if (!seasons.length) return null;
  for (let i = seasons.length - 1; i >= 0; i -= 1) {
    const seasonRow = seasons[i];
    const block = seasonRow?.closest(".series-season-block");
    const seasonKey = getSeasonKeyFromBlock(block);
    if (!seasonKey || !sonarrExpansionState.expandedSeasons.has(seasonKey)) continue;
    const episodes = sonarrExpansionState.episodesBySeason.get(seasonKey);
    if (episodes && episodes.length) {
      return { seasonIndex: i, episodeIndex: episodes.length - 1 };
    }
  }
  return null;
}

function findSeriesRowByKey(seriesKey) {
  if (!tbody || !seriesKey) return null;
  const safeKey = window.CSS && CSS.escape ? CSS.escape(seriesKey) : seriesKey.replace(/["\\]/g, "\\$&");
  return tbody.querySelector(`tr.series-expanded[data-series-key="${safeKey}"]`);
}

function setRowSelection(rowEl, options = {}) {
  if (!rowEl) return;
  if (selectedSeasonRowEl) {
    selectedSeasonRowEl.classList.remove("series-season-row--selected");
    selectedSeasonRowEl = null;
  }
  if (selectedEpisodeRowEl) {
    const wrap = selectedEpisodeRowEl.closest(".series-season-episodes");
    if (wrap) {
      delete wrap.dataset.selectedEpisodeIndex;
    }
    selectedEpisodeRowEl.classList.remove("series-episode-row--selected");
    selectedEpisodeRowEl = null;
  }
  if (selectedRowEl && selectedRowEl !== rowEl) {
    selectedRowEl.classList.remove("row-selected");
  }
  selectedRowEl = rowEl;
  selectedRowEl.classList.add("row-selected");
  keyboardNavState.level = "rows";
  keyboardNavState.seriesRowKey = "";
  keyboardNavState.seriesKey = rowEl.dataset.seriesKey || "";
  keyboardNavState.seasonIndex = -1;
  keyboardNavState.seasonNumber = "";
  keyboardNavState.episodeIndex = -1;
  keyboardNavState.rowIndex = getRowIndex(rowEl);
  if (options.scroll !== false) {
    if (!scrollElementIntoTableView(rowEl)) {
      rowEl.scrollIntoView({ block: "nearest" });
    }
  }
}

function setSeasonSelection(rowEl, seasonIndex, options = {}) {
  const seasons = getSeasonRowsForRow(rowEl);
  if (!seasons.length) return false;
  const index = Math.max(0, Math.min(seasonIndex, seasons.length - 1));
  const seasonRow = seasons[index];
  if (selectedSeasonRowEl && selectedSeasonRowEl !== seasonRow) {
    selectedSeasonRowEl.classList.remove("series-season-row--selected");
  }
  selectedSeasonRowEl = seasonRow;
  selectedSeasonRowEl.classList.add("series-season-row--selected");
  if (selectedEpisodeRowEl) {
    const wrap = selectedEpisodeRowEl.closest(".series-season-episodes");
    if (wrap) {
      delete wrap.dataset.selectedEpisodeIndex;
    }
    selectedEpisodeRowEl.classList.remove("series-episode-row--selected");
    selectedEpisodeRowEl = null;
  }
  if (selectedRowEl) {
    selectedRowEl.classList.remove("row-selected");
  }
  selectedRowEl = rowEl;
  keyboardNavState.level = options.level === "episodes" ? "episodes" : "season";
  keyboardNavState.seriesRowKey = rowEl.dataset.rowKey || "";
  const seasonBlock = seasonRow.closest(".series-season-block");
  keyboardNavState.seriesKey = seasonBlock?.dataset?.seriesKey || rowEl.dataset.seriesKey || "";
  keyboardNavState.seasonIndex = index;
  keyboardNavState.seasonNumber = seasonBlock?.dataset?.season || "";
  keyboardNavState.episodeIndex = -1;
  keyboardNavState.rowIndex = getRowIndex(rowEl);
  if (options.scroll !== false) {
    if (!scrollElementIntoTableView(seasonRow)) {
      seasonRow.scrollIntoView({ block: "nearest" });
    }
  }
  return true;
}

function applyEpisodeSelection(episodesWrap, episodeIndex, options = {}) {
  if (!episodesWrap) return false;
  const index = Number.isFinite(episodeIndex) ? episodeIndex : 0;
  episodesWrap.querySelectorAll(".series-episode-row--selected")
    .forEach(row => row.classList.remove("series-episode-row--selected"));
  const selector = `.series-episode-row[data-episode-index="${index}"]`;
  let target = episodesWrap.querySelector(selector);
  if (target) {
    target.classList.add("series-episode-row--selected");
    selectedEpisodeRowEl = target;
    if (options.scroll !== false) {
      target.scrollIntoView({ block: "nearest" });
    }
    return true;
  }
  const scroll = episodesWrap.querySelector(".series-episode-scroll");
  if (scroll && options.scroll !== false) {
    const header = scroll.querySelector(".series-episode-header");
    const headerOffset = header ? header.offsetHeight : 0;
    scroll.scrollTop = headerOffset + index * SERIES_EXPANSION_ROW_HEIGHT;
  }
  let attempts = 0;
  const retry = () => {
    attempts += 1;
    target = episodesWrap.querySelector(selector);
    if (target) {
      target.classList.add("series-episode-row--selected");
      selectedEpisodeRowEl = target;
      if (options.scroll !== false) {
        target.scrollIntoView({ block: "nearest" });
      }
      return;
    }
    if (attempts < 4) {
      requestAnimationFrame(retry);
    }
  };
  requestAnimationFrame(retry);
  return false;
}

function setEpisodeSelection(rowEl, seasonIndex, episodeIndex, options = {}) {
  const info = getSeasonBlockInfo(rowEl, seasonIndex);
  if (!info) return false;
  const { block, index } = info;
  const episodesWrap = block.querySelector(".series-season-episodes");
  if (!episodesWrap || !episodesWrap.classList.contains("is-open")) return false;
  if (selectedEpisodeRowEl) {
    const prevWrap = selectedEpisodeRowEl.closest(".series-season-episodes");
    if (prevWrap && prevWrap !== episodesWrap) {
      delete prevWrap.dataset.selectedEpisodeIndex;
    }
    selectedEpisodeRowEl.classList.remove("series-episode-row--selected");
    selectedEpisodeRowEl = null;
  }
  const seriesKey = block.dataset.seriesKey || "";
  const seasonNumber = block.dataset.season || "";
  const episodeKey = seriesKey && seasonNumber ? `${seriesKey}::${seasonNumber}` : "";
  const episodes = episodeKey ? sonarrExpansionState.episodesBySeason.get(episodeKey) : null;
  const total = episodes ? episodes.length : null;
  if (!total) {
    keyboardNavState.level = "episodes";
    keyboardNavState.seriesRowKey = rowEl.dataset.rowKey || "";
    keyboardNavState.seriesKey = seriesKey;
    keyboardNavState.seasonIndex = index;
    keyboardNavState.seasonNumber = seasonNumber;
    keyboardNavState.episodeIndex = Math.max(0, episodeIndex || 0);
    keyboardNavState.rowIndex = getRowIndex(rowEl);
    episodesWrap.dataset.selectedEpisodeIndex = String(keyboardNavState.episodeIndex);
    if (selectedSeasonRowEl) {
      selectedSeasonRowEl.classList.remove("series-season-row--selected");
      selectedSeasonRowEl = null;
    }
    if (selectedRowEl) {
      selectedRowEl.classList.remove("row-selected");
    }
    selectedRowEl = rowEl;
    return false;
  }
  const clamped = Math.max(0, Math.min(episodeIndex, total - 1));
  if (selectedSeasonRowEl) {
    selectedSeasonRowEl.classList.remove("series-season-row--selected");
    selectedSeasonRowEl = null;
  }
  if (selectedRowEl) {
    selectedRowEl.classList.remove("row-selected");
  }
  selectedRowEl = rowEl;
  keyboardNavState.level = "episodes";
  keyboardNavState.seriesRowKey = rowEl.dataset.rowKey || "";
  keyboardNavState.seriesKey = seriesKey;
  keyboardNavState.seasonIndex = index;
  keyboardNavState.seasonNumber = seasonNumber;
  keyboardNavState.episodeIndex = clamped;
  keyboardNavState.rowIndex = getRowIndex(rowEl);
  episodesWrap.dataset.selectedEpisodeIndex = String(clamped);
  applyEpisodeSelection(episodesWrap, clamped, options);
  return true;
}

function ensureRowSelection(direction = "down") {
  if (selectedRowEl && selectedRowEl.isConnected) {
    return true;
  }
  const rows = getMainRowElements();
  if (!rows.length) return false;
  const index = direction === "up" ? rows.length - 1 : 0;
  setRowSelection(rows[index]);
  return true;
}

function isEditableElement(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (typeof el.closest !== "function") return false;
  return Boolean(el.closest("input, textarea, select, [contenteditable]"));
}

function focusTableWrapIfAllowed() {
  if (!tableWrapEl) return false;
  const active = document.activeElement;
  if (active && isEditableElement(active)) return false;
  if (active === tableWrapEl) return true;
  tableWrapEl.focus({ preventScroll: true });
  return document.activeElement === tableWrapEl;
}

function updateSelectionFromPointer(target) {
  if (!pointerSelectionEnabled) return false;
  if (!target) return false;
  const episodeRow = target.closest(".series-episode-row");
  if (episodeRow) {
    const block = episodeRow.closest(".series-season-block");
    const seriesKey = block?.dataset?.seriesKey || "";
    const rowEl = seriesKey ? findSeriesRowByKey(seriesKey) : null;
    if (!rowEl) return false;
    const seasonRow = block?.querySelector(".series-season-row");
    const seasons = getSeasonRowsForRow(rowEl);
    const seasonIndex = seasonRow ? seasons.indexOf(seasonRow) : -1;
    const indexAttr = Number(episodeRow.dataset.episodeIndex);
    const episodeIndex = Number.isFinite(indexAttr)
      ? indexAttr
      : Array.from(block?.querySelectorAll(".series-episode-row") || []).indexOf(episodeRow);
    if (seasonIndex >= 0 && episodeIndex >= 0) {
      setEpisodeSelection(rowEl, seasonIndex, episodeIndex, { scroll: false });
      return true;
    }
  }
  const seasonRow = target.closest(".series-season-row");
  if (seasonRow) {
    const block = seasonRow.closest(".series-season-block");
    const seriesKey = block?.dataset?.seriesKey || "";
    const rowEl = seriesKey ? findSeriesRowByKey(seriesKey) : null;
    if (!rowEl) return false;
    const seasons = getSeasonRowsForRow(rowEl);
    const index = seasons.indexOf(seasonRow);
    if (index >= 0) {
      if (selectedSeasonRowEl === seasonRow) return true;
      setSeasonSelection(rowEl, index, { scroll: false, level: "season" });
      return true;
    }
  }
  const rowEl = target.closest('tr[data-app]');
  if (rowEl && !rowEl.classList.contains("series-child-row")) {
    if (selectedRowEl === rowEl) return true;
    setRowSelection(rowEl, { scroll: false });
    return true;
  }
  return false;
}

function finalizeTableInteractionState(app) {
  if (app !== activeApp) return;
  const rows = getMainRowElements();
  if (!rows.length) {
    clearTableSelection();
    focusTableWrapIfAllowed();
    return;
  }
  if (!selectedRowEl || !selectedRowEl.isConnected) {
    setRowSelection(rows[0], { scroll: false });
  }
  focusTableWrapIfAllowed();
}

async function handleSeriesExpandForRow(rowEl) {
  if (!rowEl || activeApp !== "sonarr") return false;
  const btn = rowEl.querySelector(".series-expander");
  if (!btn) return false;
  if (rowEl.classList.contains("series-expanded") || btn.getAttribute("aria-expanded") === "true") {
    return false;
  }
  await handleSeriesExpanderClick(btn);
  return true;
}

async function expandSeriesAndSelectSeason(rowEl, seasonIndex = 0) {
  if (!rowEl || activeApp !== "sonarr") return false;
  await handleSeriesExpandForRow(rowEl);
  return setSeasonSelection(rowEl, seasonIndex, { level: "season" });
}

function collapseSeriesForRow(rowEl) {
  if (!rowEl || activeApp !== "sonarr") return;
  if (!rowEl.classList.contains("series-expanded")) return;
  const btn = rowEl.querySelector(".series-expander");
  if (btn) {
    handleSeriesExpanderClick(btn);
  }
}

async function ensureSeasonExpanded(rowEl, seasonIndex) {
  const seasons = getSeasonRowsForRow(rowEl);
  if (!seasons.length) return false;
  const index = Math.max(0, Math.min(seasonIndex, seasons.length - 1));
  const toggle = seasons[index].querySelector(".series-season-toggle");
  if (!toggle) return false;
  if (toggle.getAttribute("aria-expanded") !== "true") {
    await handleSeriesSeasonToggle(toggle);
  }
  return true;
}

function toggleSeasonExtrasForRow(rowEl, seasonIndex) {
  const info = getSeasonBlockInfo(rowEl, seasonIndex);
  if (!info) return false;
  const episodesWrap = info.block.querySelector(".series-season-episodes");
  const enabled = episodesWrap?.classList.contains("series-episode-extras");
  setSeasonExtrasState(info.block, !enabled);
  return true;
}

function enableSeasonExtrasForRow(rowEl, seasonIndex) {
  const info = getSeasonBlockInfo(rowEl, seasonIndex);
  if (!info) return false;
  const episodesWrap = info.block.querySelector(".series-season-episodes");
  const enabled = episodesWrap?.classList.contains("series-episode-extras");
  if (enabled) return true;
  setSeasonExtrasState(info.block, true);
  return true;
}

function triggerRowRefreshForRow(rowEl) {
  if (!rowEl) return false;
  const btn = rowEl.querySelector(".row-refresh-btn");
  if (!btn || btn.disabled) return false;
  handleRowRefreshClick(btn);
  return true;
}

async function handleTableKeydown(e) {
  if (!tableWrapEl || document.activeElement !== tableWrapEl || !tableHasFocus) return;
  const key = e.key;
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(key)) return;
  if (!ensureRowSelection(key === "ArrowUp" ? "up" : "down")) return;
  pointerSelectionEnabled = false;
  e.preventDefault();

  const rows = getMainRowElements();
  if (!rows.length) return;
  const rowEl = selectedRowEl && selectedRowEl.isConnected ? selectedRowEl : rows[keyboardNavState.rowIndex] || rows[0];
  if (!rowEl) return;
  const rowIndex = getRowIndex(rowEl);
  const expanded = rowEl.classList.contains("series-expanded");

  if (key === "Enter") {
    if (keyboardNavState.level === "rows") {
      triggerRowRefreshForRow(rowEl);
    } else if (keyboardNavState.level === "season") {
      toggleSeasonExtrasForRow(rowEl, keyboardNavState.seasonIndex);
    } else if (keyboardNavState.level === "episodes") {
      enableSeasonExtrasForRow(rowEl, keyboardNavState.seasonIndex);
    }
    return;
  }

  if (keyboardNavState.level === "episodes") {
    const info = getSeasonBlockInfo(rowEl, keyboardNavState.seasonIndex);
    if (!info) {
      setRowSelection(rowEl);
      return;
    }
    const { block, index: seasonIndex } = info;
    const episodesWrap = block.querySelector(".series-season-episodes");
    if (!episodesWrap || !episodesWrap.classList.contains("is-open")) {
      setSeasonSelection(rowEl, seasonIndex, { level: "season" });
      return;
    }
    const seriesKey = block.dataset.seriesKey || "";
    const seasonNumber = block.dataset.season || "";
    const episodeKey = seriesKey && seasonNumber ? `${seriesKey}::${seasonNumber}` : "";
    const episodes = episodeKey ? sonarrExpansionState.episodesBySeason.get(episodeKey) : null;
    const total = episodes ? episodes.length : block.querySelectorAll(".series-episode-row").length;
    if (key === "ArrowDown") {
      if (total && keyboardNavState.episodeIndex < total - 1) {
        setEpisodeSelection(rowEl, seasonIndex, keyboardNavState.episodeIndex + 1);
        return;
      }
      if (seasonIndex < info.seasons.length - 1) {
        setSeasonSelection(rowEl, seasonIndex + 1, { level: "season" });
        return;
      }
      if (rowIndex < rows.length - 1) {
        setRowSelection(rows[rowIndex + 1]);
      }
      return;
    }
    if (key === "ArrowUp") {
      if (keyboardNavState.episodeIndex > 0) {
        setEpisodeSelection(rowEl, seasonIndex, keyboardNavState.episodeIndex - 1);
        return;
      }
      setSeasonSelection(rowEl, seasonIndex, { level: "season" });
      return;
    }
    if (key === "ArrowLeft") {
      const toggle = block.querySelector(".series-season-toggle");
      if (toggle && toggle.getAttribute("aria-expanded") === "true") {
        await handleSeriesSeasonToggle(toggle);
      }
      setSeasonSelection(rowEl, seasonIndex, { level: "season" });
      return;
    }
    if (key === "ArrowRight") {
      return;
    }
  }

  if (keyboardNavState.level === "season") {
    const seasons = getSeasonRowsForRow(rowEl);
    if (!seasons.length) {
      setRowSelection(rowEl);
      return;
    }
    if (key === "ArrowDown") {
      const info = getSeasonBlockInfo(rowEl, keyboardNavState.seasonIndex);
      if (info) {
        const episodesWrap = info.block.querySelector(".series-season-episodes");
        if (episodesWrap && episodesWrap.classList.contains("is-open")) {
          setEpisodeSelection(rowEl, info.index, 0);
          return;
        }
      }
      if (keyboardNavState.seasonIndex < seasons.length - 1) {
        setSeasonSelection(rowEl, keyboardNavState.seasonIndex + 1, { level: "season" });
        return;
      }
      if (rowIndex < rows.length - 1) {
        setRowSelection(rows[rowIndex + 1]);
      }
      return;
    }
    if (key === "ArrowUp") {
      if (keyboardNavState.seasonIndex > 0) {
        setSeasonSelection(rowEl, keyboardNavState.seasonIndex - 1, { level: "season" });
        return;
      }
      setRowSelection(rowEl);
      return;
    }
    if (key === "ArrowRight") {
      const ok = await ensureSeasonExpanded(rowEl, keyboardNavState.seasonIndex);
      if (ok) {
        setEpisodeSelection(rowEl, keyboardNavState.seasonIndex, 0);
      }
      return;
    }
    if (key === "ArrowLeft") {
      const index = Math.max(0, Math.min(keyboardNavState.seasonIndex, seasons.length - 1));
      const toggle = seasons[index]?.querySelector(".series-season-toggle");
      const expandedSeason = toggle?.getAttribute("aria-expanded") === "true";
      if (expandedSeason) {
        await handleSeriesSeasonToggle(toggle);
        return;
      }
      collapseSeriesForRow(rowEl);
      setRowSelection(rowEl);
      return;
    }
  }

  if (key === "ArrowDown") {
    if (expanded) {
      const moved = setSeasonSelection(rowEl, 0, { level: "season" });
      if (moved) return;
      return;
    }
    if (rowIndex < rows.length - 1) {
      setRowSelection(rows[rowIndex + 1]);
    }
    return;
  }
  if (key === "ArrowUp") {
    if (rowIndex > 0) {
      const prevRow = rows[rowIndex - 1];
      if (prevRow.classList.contains("series-expanded")) {
        const lastEpisode = findLastExpandedEpisodeInfo(prevRow);
        if (lastEpisode) {
          setEpisodeSelection(prevRow, lastEpisode.seasonIndex, lastEpisode.episodeIndex);
          return;
        }
        const seasons = getSeasonRowsForRow(prevRow);
        if (seasons.length) {
          setSeasonSelection(prevRow, seasons.length - 1, { level: "season" });
          return;
        }
      }
      setRowSelection(prevRow);
    }
    return;
  }
  if (key === "ArrowRight") {
    if (activeApp === "sonarr") {
      await expandSeriesAndSelectSeason(rowEl, 0);
    }
    return;
  }
  if (key === "ArrowLeft") {
    if (expanded) {
      collapseSeriesForRow(rowEl);
    }
  }
}

function setRowRefreshPending(rowEl, active) {
  if (!rowEl) return;
  rowEl.classList.toggle("row-refresh-pending", Boolean(active));
}

function focusRowElement(rowEl) {
  if (!rowEl) return;
  rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
  const existing = rowFocusTimers.get(rowEl);
  if (existing) {
    clearTimeout(existing);
  }
  rowEl.classList.remove("row-refresh-focus");
  void rowEl.offsetWidth;
  rowEl.classList.add("row-refresh-focus");
  const timer = window.setTimeout(() => {
    rowEl.classList.remove("row-refresh-focus");
    rowFocusTimers.delete(rowEl);
  }, ROW_FOCUS_FLASH_MS);
  rowFocusTimers.set(rowEl, timer);
}

function queueRowFocus(app, rowKey) {
  if (!rowKey) return;
  if (rowFocusRetryTimer) {
    clearTimeout(rowFocusRetryTimer);
    rowFocusRetryTimer = null;
  }
  pendingRowFocus = { app, rowKey, attempts: 0 };
  const attempt = () => {
    if (!pendingRowFocus) return;
    if (pendingRowFocus.app !== activeApp) {
      pendingRowFocus = null;
      return;
    }
    const rowEl = findRowElement(pendingRowFocus.app, pendingRowFocus.rowKey);
    if (rowEl) {
      focusRowElement(rowEl);
      pendingRowFocus = null;
      return;
    }
    pendingRowFocus.attempts += 1;
    if (pendingRowFocus.attempts >= ROW_FOCUS_MAX_ATTEMPTS) {
      pendingRowFocus = null;
      return;
    }
    rowFocusRetryTimer = setTimeout(attempt, ROW_FOCUS_RETRY_MS);
  };
  attempt();
}

function flashRowRefresh(rowEl, outcome) {
  if (!rowEl) return;
  const className = outcome === "partial"
    ? "row-refresh-partial"
    : (outcome === "success" ? "row-refresh-success" : "row-refresh-fail");
  const existing = rowRefreshTimers.get(rowEl);
  if (existing) {
    clearTimeout(existing);
  }
  rowEl.classList.remove("row-refresh-success", "row-refresh-fail", "row-refresh-partial");
  void rowEl.offsetWidth;
  rowEl.classList.add(className);
  const timer = window.setTimeout(() => {
    rowEl.classList.remove(className);
    rowRefreshTimers.delete(rowEl);
  }, ROW_REFRESH_FLASH_MS);
  rowRefreshTimers.set(rowEl, timer);
}

function formatAudioCodecCell(value, mixed = false, fullValue = "") {
  const raw = value ?? "";
  const fullText = fullValue ?? "";
  if (!raw && !mixed && !fullText) {
    return NOT_REPORTED_HTML;
  }
  return formatLanguageValue(raw, mixed, {
    allowToggle: true,
    fullValue: fullText,
  });
}

function formatMixedValueCell(value, fullValue, mixed = false, wrapperClass = "") {
  const text = String(value ?? "").trim();
  const fullText = String(fullValue ?? "").trim();
  if (!text && !fullText && !mixed) return "";
  const cell = formatToggleListCell({
    display: text || fullText,
    full: fullText || text,
    mixed,
    allowToggle: true,
  });
  if (!wrapperClass) return cell;
  return `<span class="${wrapperClass}">${cell}</span>`;
}

function formatAudioChannelsCell(value) {
  if (!value) return "";
  return `<span class="audio-channels-cell">${value}</span>`;
}

const NUMERIC_DISPLAY_COLUMNS = {
  sonarr: [
    "EpisodesCounted",
    "SeasonCount",
    "MissingCount",
    "CutoffUnmetCount",
    "AvgEpisodeSizeGB",
    "GBPerHour",
    "BitrateMbps",
    "PlayCount",
    "DaysSinceWatched",
    "UsersWatched",
  ],
  radarr: [
    "RuntimeMins",
    "FileSizeGB",
    "GBPerHour",
    "BitrateMbps",
    "MissingCount",
    "CutoffUnmetCount",
    "CustomFormatScore",
    "PlayCount",
    "DaysSinceWatched",
    "UsersWatched",
  ],
};

const numericWidthsByApp = { sonarr: {}, radarr: {} };
const numericWidthsVersionByApp = { sonarr: 0, radarr: 0 };

function computeNumericColumnWidths(rows, app) {
  const columns = NUMERIC_DISPLAY_COLUMNS[app] || [];
  const widths = {};
  columns.forEach(col => {
    widths[col] = { int: 1, frac: 0 };
  });
  if (!rows || !rows.length) return widths;
  rows.forEach(row => {
    columns.forEach(col => {
      const rawValue = row?.[col];
      if (rawValue == null || rawValue === "") return;
      const rawText = typeof rawValue === "string" ? rawValue.trim() : String(rawValue);
      if (!rawText || rawText.includes("<") || rawText.includes(":") || rawText.includes("/")) return;
      const num = Number(rawText);
      if (!Number.isFinite(num)) return;
      let working = rawText;
      let sign = "";
      if (working.startsWith("-")) {
        sign = "-";
        working = working.slice(1);
      }
      const parts = working.split(".");
      const intPart = parts[0] || "0";
      const fracPart = parts[1] || "";
      const current = widths[col];
      const intLen = intPart.length + (sign ? 1 : 0);
      if (intLen > current.int) current.int = intLen;
      if (fracPart.length > current.frac) current.frac = fracPart.length;
    });
  });
  return widths;
}

function ensureNumericColumnWidths(app, rows, dataVersion, isPrimary) {
  if (!app) return;
  const version = isPrimary ? dataVersion : dataVersionByApp[app];
  if (numericWidthsVersionByApp[app] === version) return;
  const sourceRows = isPrimary ? rows : dataByApp[app];
  numericWidthsByApp[app] = computeNumericColumnWidths(sourceRows || [], app);
  numericWidthsVersionByApp[app] = version;
}

function getNumericWidths(app, col) {
  if (!app || !col) return null;
  const map = numericWidthsByApp[app] || {};
  return map[col] || null;
}

function formatNumericCell(value, widths = null) {
  if (value == null || value === "") return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.includes("<")) return trimmed;
    if (trimmed.includes(":") || trimmed.includes("/")) return escapeHtml(trimmed);
    const num = Number(trimmed);
    if (!Number.isFinite(num)) return escapeHtml(trimmed);
  } else if (!Number.isFinite(Number(value))) {
    return escapeHtml(value);
  }

  const rawText = typeof value === "string" ? value.trim() : String(value);
  return `<span class="num-cell-flat">${escapeHtml(rawText)}</span>`;
}

const LANGUAGE_NAME_MAP = {
  und: "Unknown",
  mul: "Multiple",
  ave: "Avestan",
  eng: "English",
  en: "English",
  spa: "Spanish",
  es: "Spanish",
  baq: "Basque",
  eus: "Basque",
  ben: "Bengali",
  bn: "Bengali",
  cat: "Catalan",
  ca: "Catalan",
  ces: "Czech",
  cze: "Czech",
  cs: "Czech",
  dan: "Danish",
  da: "Danish",
  deu: "German",
  ger: "German",
  de: "German",
  ell: "Greek",
  gre: "Greek",
  el: "Greek",
  fra: "French",
  fre: "French",
  fr: "French",
  hrv: "Croatian",
  scr: "Croatian",
  ita: "Italian",
  it: "Italian",
  est: "Estonian",
  et: "Estonian",
  fin: "Finnish",
  fi: "Finnish",
  fil: "Filipino",
  tgl: "Filipino",
  phi: "Philippine",
  glg: "Galician",
  guj: "Gujarati",
  por: "Portuguese",
  pt: "Portuguese",
  ptbr: "Portuguese (Brazil)",
  ptpt: "Portuguese (Portugal)",
  rus: "Russian",
  ru: "Russian",
  jpn: "Japanese",
  ja: "Japanese",
  kor: "Korean",
  ko: "Korean",
  zho: "Chinese",
  chi: "Chinese",
  zh: "Chinese",
  hin: "Hindi",
  hi: "Hindi",
  heb: "Hebrew",
  he: "Hebrew",
  hun: "Hungarian",
  hu: "Hungarian",
  ind: "Indonesian",
  id: "Indonesian",
  ara: "Arabic",
  ar: "Arabic",
  nld: "Dutch",
  dut: "Dutch",
  nl: "Dutch",
  swe: "Swedish",
  sv: "Swedish",
  nob: "Norwegian Bokmal",
  nb: "Norwegian Bokmal",
  nor: "Norwegian",
  no: "Norwegian",
  pol: "Polish",
  pl: "Polish",
  pan: "Punjabi",
  pa: "Punjabi",
  nep: "Nepali",
  ne: "Nepali",
  tur: "Turkish",
  tr: "Turkish",
  tha: "Thai",
  th: "Thai",
  vie: "Vietnamese",
  vi: "Vietnamese",
  ukr: "Ukrainian",
  uk: "Ukrainian",
  lit: "Lithuanian",
  lt: "Lithuanian",
  lav: "Latvian",
  lv: "Latvian",
  ice: "Icelandic",
  isl: "Icelandic",
  is: "Icelandic",
  ron: "Romanian",
  rum: "Romanian",
  ro: "Romanian",
  rom: "Romani",
  bul: "Bulgarian",
  bg: "Bulgarian",
  srp: "Serbian",
  sr: "Serbian",
  slk: "Slovak",
  slo: "Slovak",
  sk: "Slovak",
  slv: "Slovenian",
  sl: "Slovenian",
  may: "Malay",
  msa: "Malay",
  mal: "Malayalam",
  kan: "Kannada",
  mar: "Marathi",
  mac: "Macedonian",
  mkd: "Macedonian",
  tam: "Tamil",
  ta: "Tamil",
  tel: "Telugu",
  te: "Telugu",
  ms: "Malay",
  urd: "Urdu",
  ur: "Urdu",
  sin: "Sinhala",
  si: "Sinhala",
  fas: "Persian",
  per: "Persian",
  fa: "Persian",
};

function languageCodeToName(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const compact = lower.replace(/[^a-z0-9]/g, "");
  if (LANGUAGE_NAME_MAP[compact]) return LANGUAGE_NAME_MAP[compact];
  const base = lower.split(/[-_]/)[0];
  if (LANGUAGE_NAME_MAP[base]) {
    const region = lower.split(/[-_]/)[1];
    if (region) {
      return `${LANGUAGE_NAME_MAP[base]} (${region.toUpperCase()})`;
    }
    return LANGUAGE_NAME_MAP[base];
  }
  return raw;
}

function normalizeLanguageLabel(value) {
  const raw = String(value ?? "");
  if (!raw) return "";
  const parts = raw.split(",").map(part => part.trim()).filter(Boolean);
  if (!parts.length) return "";
  return parts
    .map(part => languageCodeToName(part))
    .join(", ");
}

function normalizeLanguageQuery(value) {
  return languageCodeToName(value);
}

function summarizeLanguageValue(value) {
  const normalized = normalizeLanguageLabel(value);
  if (!normalized) return { display: "", full: "", truncated: false };
  const parts = normalized.split(",").map(part => part.trim()).filter(Boolean);
  const full = parts.join(", ");
  const limit = 4;
  if (parts.length <= limit) return { display: full, full, truncated: false };
  const display = `${parts.slice(0, limit).join(", ")}, +${parts.length - limit} more`;
  return { display, full, truncated: true };
}

function formatLanguageValue(value, mixed, options = {}) {
  const { allowToggle = false, fullValue = "" } = options;
  const summary = summarizeLanguageValue(value);
  const fullSummary = fullValue ? summarizeLanguageValue(fullValue) : summary;
  let display = summary.display;
  const full = fullSummary.full || fullSummary.display || "";
  if (!display && full) {
    display = full;
  }
  return formatToggleListCell({
    display,
    full,
    mixed,
    allowToggle,
  });
}

function formatLastWatched(value) {
  if (!value) return '<span class="muted">Never</span>';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return escapeHtml(`${day}/${month}/${year} - ${hours}:${minutes}`);
}

function formatDateAdded(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return escapeHtml(date.toLocaleDateString());
}

function formatDaysSince(value, lastWatched, widths = null) {
  if (!lastWatched) return '<span class="muted">Never</span>';
  const num = Number(value);
  if (!Number.isFinite(num)) return escapeHtml(value ?? "");
  return formatNumericCell(num, widths);
}

function formatHoursClock(value) {
  if (value == null) return "";
  if (typeof value === "string" && value.trim() === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  const totalMinutes = Math.round(num * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatMinutesClock(value) {
  if (value == null) return "";
  if (typeof value === "string" && value.trim() === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  const totalMinutes = Math.round(num);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatWatchTimeHours(value) {
  const text = formatHoursClock(value);
  return text ? escapeHtml(text) : "";
}

function formatRuntimeMinutes(value) {
  const text = formatMinutesClock(value);
  return text ? escapeHtml(text) : "";
}

function formatWatchContentHours(watchHours, contentHours) {
  const contentText = formatHoursClock(contentHours);
  if (!contentText) return "";
  const watchText = formatHoursClock(
    Number.isFinite(Number(watchHours)) ? watchHours : 0
  ) || "0:00";
  return `${escapeHtml(watchText)} / ${escapeHtml(contentText)}`;
}

function formatBoolValue(value) {
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (raw === "true") return "True";
    if (raw === "false") return "False";
  }
  return value ? "True" : "False";
}

function formatStatusValue(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const key = raw.toLowerCase();
  if (key === "ended") return "Ended";
  if (key === "continuing") return "Continuing";
  if (key === "announced") return "Announced";
  if (key === "incinemas") return "In Cinemas";
  if (key === "released") return "Released";
  if (key === "deleted") return "Deleted";
  return escapeHtml(raw);
}

function formatVideoHdrValue(value) {
  if (value === "" || value === null || value === undefined) return t("False");
  if (typeof value === "boolean") return value ? t("True") : t("False");
  const raw = String(value).trim();
  if (!raw) return t("False");
  return t("True");
}

function getMatchStatusMeta(row) {
  const status = row?.TautulliMatchStatus;
  const reason = row?.TautulliMatchReason;
  let label = t("Unavailable");
  let variant = "muted";

  if (status === "matched") {
    label = t("Matched");
    variant = "ok";
  } else if (status === "unmatched") {
    label = t("Potential mismatch");
    variant = "warn";
  } else if (status === "skipped") {
    if (typeof reason === "string" && /future/i.test(reason)) {
      label = t("Future release");
      variant = "future";
    } else if (typeof reason === "string" && /no (episodes|file) on disk/i.test(reason)) {
      label = t("Not on disk");
      variant = "nodisk";
    } else {
      label = t("Not checked");
      variant = "muted";
    }
  } else if (status === "unavailable") {
    label = t("Unavailable");
    variant = "muted";
  }

  return { label, reason, variant };
}

function buildMatchBadge(row) {
  const meta = getMatchStatusMeta(row);
  const title = meta.reason ? ` title="${escapeHtml(meta.reason)}"` : "";
  return `<span class="match-pill match-pill--${meta.variant}"${title}>${meta.label}</span>`;
}

function buildMatchOrb(row) {
  if (!tautulliEnabled) {
    if (document.body.classList.contains("sortarr-loading")) {
      return `<span class="match-orb match-orb--placeholder" aria-hidden="true"></span>`;
    }
    return "";
  }
  const meta = getMatchStatusMeta(row);
  const titleText = meta.reason ? `${meta.label} - ${meta.reason}` : meta.label;
  const titleAttr = titleText ? ` title="${escapeHtml(titleText)}"` : "";
  return `<span class="match-orb match-orb--${meta.variant}"${titleAttr} role="img" aria-label="${escapeHtml(meta.label)}"></span>`;
}
function formatBitrateCell(row, app) {
  const raw = row?.BitrateMbps;
  if (raw === "" || raw === null || raw === undefined) return "";

  const value = formatNumericCell(raw, getNumericWidths(app, "BitrateMbps"));
  if (app !== "radarr") {
    if (row?.BitrateEstimated) {
      return `${value} <span class="bitrate-est" title="${t('Estimated from file size and runtime')}">${t('est')}</span>`;
    }
    return value;
  }

  const hasValue = (v) => !(v === "" || v === null || v === undefined);
  const formatPart = (partRaw) => {
    if (!hasValue(partRaw)) return t("n/a");
    const num = Number(partRaw);
    if (!Number.isFinite(num)) return String(partRaw);
    return num.toFixed(2);
  };

  const hasVideo = hasValue(row?.VideoBitrateMbps);
  const hasAudio = hasValue(row?.AudioBitrateMbps);
  const partsTitle = `${t("Video")}: ${formatPart(row?.VideoBitrateMbps)} | ${t("Audio")}: ${formatPart(row?.AudioBitrateMbps)}`;
  const showEst = !(hasVideo && hasAudio);
  const valueHtml = `<span title="${escapeHtml(partsTitle)}">${value}</span>`;

  if (showEst) {
    return `${valueHtml} <span class="bitrate-est" title="${t('Estimated from file size and runtime')}">${t('est')}</span>`;
  }
  return valueHtml;
}

const FIELD_MAP = {
  title: "Title",
  titleslug: "TitleSlug",
  tmdbid: "TmdbId",
  dateadded: "DateAdded",
  added: "DateAdded",
  path: "Path",
  rootfolder: "RootFolder",
  rootpath: "RootFolder",
  status: "Status",
  monitored: "Monitored",
  qualityprofile: "QualityProfile",
  profile: "QualityProfile",
  tags: "Tags",
  tag: "Tags",
  releasegroup: "ReleaseGroup",
  release: "ReleaseGroup",
  studio: "Studio",
  hasfile: "HasFile",
  isavailable: "IsAvailable",
  incinemas: "InCinemas",
  lastsearchtime: "LastSearchTime",
  edition: "Edition",
  customformats: "CustomFormats",
  customformat: "CustomFormats",
  customformatscore: "CustomFormatScore",
  qualitycutoffnotmet: "QualityCutoffNotMet",
  languages: "Languages",
  videoquality: "VideoQuality",
  videocodec: "VideoCodec",
  videohdr: "VideoHDR",
  resolution: "Resolution",
  audiocodec: "AudioCodec",
  audiocodecmixed: "AudioCodecMixed",
  audiochannels: "AudioChannels",
  audiolanguages: "AudioLanguages",
  audiolang: "AudioLanguages",
  audiolanguagesmixed: "AudioLanguagesMixed",
  subtitlelanguages: "SubtitleLanguages",
  sublanguages: "SubtitleLanguages",
  sublang: "SubtitleLanguages",
  subtitles: "SubtitleLanguages",
  subtitlelanguagesmixed: "SubtitleLanguagesMixed",
  playcount: "PlayCount",
  lastwatched: "LastWatched",
  dayssincewatched: "DaysSinceWatched",
  watchtime: "TotalWatchTimeHours",
  watchtimehours: "TotalWatchTimeHours",
  totalwatchtime: "TotalWatchTimeHours",
  contenthours: "ContentHours",
  watchratio: "WatchContentRatio",
  watchvs: "WatchContentRatio",
  userswatched: "UsersWatched",
  users: "UsersWatched",
  matchstatus: "TautulliMatchStatus",
  match: "TautulliMatchStatus",
  seriestype: "SeriesType",
  originallanguage: "OriginalLanguage",
  genres: "Genres",
  lastaired: "LastAired",
  missing: "MissingCount",
  cutoff: "CutoffUnmetCount",
  cutoffunmet: "CutoffUnmetCount",
  recentlygrabbed: "RecentlyGrabbed",
  scene: "UseSceneNumbering",
  airing: "Airing",
  episodes: "EpisodesCounted",
  seasons: "SeasonCount",
  season: "SeasonCount",
  totalsize: "TotalSizeGB",
  avgepisode: "AvgEpisodeSizeGB",
  runtime: "RuntimeMins",
  filesize: "FileSizeGB",
  gbperhour: "GBPerHour",
  bitrate: "BitrateMbps",
  bitratembps: "BitrateMbps",
};

const NUMERIC_FIELDS = new Set([
  "episodes",
  "seasons",
  "season",
  "missing",
  "cutoff",
  "cutoffunmet",
  "totalsize",
  "avgepisode",
  "runtime",
  "filesize",
  "gbperhour",
  "bitrate",
  "bitratembps",
  "audiochannels",
  "playcount",
  "dayssincewatched",
  "watchtime",
  "watchtimehours",
  "totalwatchtime",
  "contenthours",
  "watchratio",
  "watchvs",
  "userswatched",
  "users",
  "customformatscore",
]);

const BUCKET_FIELDS = new Set(["gbperhour", "totalsize"]);

function getFieldValue(row, field) {
  let key = FIELD_MAP[field] || field;
  if (field === "totalsize" && activeApp === "radarr") {
    key = "FileSizeGB";
  }
  if (field === "scene" && activeApp === "radarr") {
    return row?.Scene ?? row?.SceneName ?? "";
  }
  if (field === "airing" && activeApp === "radarr") {
    return row?.Airing ?? row?.IsAvailable ?? row?.InCinemas ?? "";
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

function parseNumberValue(value, field) {
  if (value === "" || value === null || value === undefined) return NaN;
  const num = Number(value);
  if (!Number.isFinite(num)) return NaN;
  if (field === "audiochannels") {
    return Math.ceil(num);
  }
  return num;
}

function parseBoolValue(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(raw)) return true;
  if (["0", "false", "no", "n"].includes(raw)) return false;
  return null;
}

function hasSubtitleLanguages(row) {
  const raw = String(getFieldValue(row, "SubtitleLanguages") ?? "").trim();
  if (!raw) return false;
  const parts = raw.split(",").map(part => part.trim()).filter(Boolean);
  return parts.length > 0;
}

function getMatchStatusFilterPredicate(rawValue) {
  const value = String(rawValue ?? "").trim();
  if (!value || /[*?]/.test(value)) return null;
  const key = value.toLowerCase().replace(/[^a-z]/g, "");
  if (!key) return null;

  if (key === "matched") {
    return row => String(row?.TautulliMatchStatus || "").toLowerCase() === "matched";
  }
  if (key === "unmatched" || key === "mismatch") {
    return row => String(row?.TautulliMatchStatus || "").toLowerCase() === "unmatched";
  }
  if (key === "skipped") {
    return row => String(row?.TautulliMatchStatus || "").toLowerCase() === "skipped";
  }
  if (key === "future" || key === "futurerelease") {
    return row => {
      const status = String(row?.TautulliMatchStatus || "").toLowerCase();
      if (status !== "skipped") return false;
      return /future/i.test(String(row?.TautulliMatchReason || ""));
    };
  }
  if (key === "nodisk" || key === "notondisk") {
    return row => {
      const status = String(row?.TautulliMatchStatus || "").toLowerCase();
      if (status !== "skipped") return false;
      return /no (episodes|file) on disk/i.test(String(row?.TautulliMatchReason || ""));
    };
  }
  if (key === "notchecked" || key === "unchecked") {
    return row => {
      const status = String(row?.TautulliMatchStatus || "").toLowerCase();
      if (status !== "skipped") return false;
      const reason = String(row?.TautulliMatchReason || "");
      const isFuture = /future/i.test(reason);
      const isNoDisk = /no (episodes|file) on disk/i.test(reason);
      return !isFuture && !isNoDisk;
    };
  }
  if (key === "unavailable" || key === "unknown") {
    return row => String(row?.TautulliMatchStatus || "").toLowerCase() === "unavailable";
  }

  return null;
}

function parseAdvancedQuery(query) {
  const tokens = String(query ?? "").trim().split(/\s+/).filter(Boolean);
  const preds = [];
  const warnings = [];
  const playbackWarning = () => {
    const label = getPlaybackLabel();
    if (label && label !== "Playback") {
      return `${label} ${t("filters are unavailable until configured.")}`;
    }
    return t("Playback filters are unavailable until configured.");
  };
  let playbackWarned = false;

  const invertOp = (op) => {
    switch (op) {
      case ">=": return "<";
      case ">": return "<=";
      case "<=": return ">";
      case "<": return ">=";
      default: return null;
    }
  };

  for (const rawToken of tokens) {
    let token = rawToken;
    let neg = false;

    // Leading '-' indicates a negated token (exclude).
    // This is intentionally token-scoped (not a general query language feature beyond this).
    if (token[0] === "-" && token.length > 1) {
      neg = true;
      token = token.slice(1);
    }

    const addPred = (pred) => {
      // Guard: never let a predicate exception break filtering.
      preds.push((row) => {
        try { return Boolean(pred(row)); } catch (_) { return false; }
      });
    };

    const comp = token.match(/^([a-zA-Z]+)(>=|<=|=|>|<)(.+)$/);
    if (comp) {
      const field = comp[1].toLowerCase();
      const op = comp[2];
      if (TAUTULLI_FILTER_FIELDS.has(field) && !tautulliEnabled) {
        if (!playbackWarned) { warnings.push(playbackWarning()); playbackWarned = true; }
        addPred(() => false);
        continue;
      }
      if (!NUMERIC_FIELDS.has(field)) {
        warnings.push(`Field '${field}' does not support numeric comparisons.`);
        addPred(() => false);
        continue;
      }
      const val = Number(comp[3]);
      if (!Number.isFinite(val)) {
        warnings.push(`Invalid number for '${field}'.`);
        addPred(() => false);
        continue;
      }

      if (op === "=") {
        // Explicit (not via generic predicate inversion): '=' negates to '!='.
        addPred(row => {
          const num = parseNumberValue(getFieldValue(row, field), field);
          if (!Number.isFinite(num)) return false;
          return neg ? (num !== val) : (num === val);
        });
      } else if (neg) {
        const inv = invertOp(op);
        addPred(row => compareNumber(parseNumberValue(getFieldValue(row, field), field), inv, val));
      } else {
        addPred(row => compareNumber(parseNumberValue(getFieldValue(row, field), field), op, val));
      }
      continue;
    }

    const idx = token.indexOf(":");
    if (idx > 0) {
      const field = token.slice(0, idx).toLowerCase();
      if (TAUTULLI_FILTER_FIELDS.has(field) && !tautulliEnabled) {
        if (!tautulliWarned) { warnings.push(tautulliWarning); tautulliWarned = true; }
        addPred(() => false);
        continue;
      }
      const value = token.slice(idx + 1);

      if (field === "nosubs") {
        const boolVal = parseBoolValue(value);
        if (boolVal === null) {
          warnings.push(t(`Invalid value for '${field}' (use true/false).`));
          addPred(() => false);
          continue;
        }
        addPred(row => {
          const hasSubs = hasSubtitleLanguages(row);
          const wantNoSubs = boolVal ? !hasSubs : hasSubs;
          return neg ? !wantNoSubs : wantNoSubs;
        });
        continue;
      }

      if (field === "missing" || field === "cutoff" || field === "cutoffunmet") {
        const boolVal = parseBoolValue(value);
        if (boolVal === null) {
          warnings.push(t(`Invalid value for '${field}' (use true/false).`));
          addPred(() => false);
          continue;
        }
        addPred(row => {
          const raw = getFieldValue(row, field);
          const count = Number(raw);
          const hasCount = Number.isFinite(count) && count > 0;
          const want = boolVal ? hasCount : !hasCount;
          return neg ? !want : want;
        });
        continue;
      }

      if (field === "recentlygrabbed" || field === "scene" || field === "airing") {
        const boolVal = parseBoolValue(value);
        if (boolVal === null) {
          warnings.push(t(`Invalid value for '${field}' (use true/false).`));
          addPred(() => false);
          continue;
        }
        addPred(row => {
          const want = (Boolean(getFieldValue(row, field)) === boolVal);
          return neg ? !want : want;
        });
        continue;
      }

      if (field === "audio") {
        addPred(row => {
          const hit = matchPattern(getFieldValue(row, "AudioCodec"), value);
          return neg ? !hit : hit;
        });
        continue;
      }

      if (field === "neverwatched") {
        const boolVal = parseBoolValue(value);
        if (boolVal === null) {
          warnings.push(t(`Invalid value for '${field}' (use true/false).`));
          addPred(() => false);
          continue;
        }
        addPred(row => {
          const matched = row.TautulliMatched === true;
          const never = matched && !row.LastWatched;
          const want = boolVal ? never : !never;
          return neg ? !want : want;
        });
        continue;
      }

      if (field === "mismatch") {
        const boolVal = parseBoolValue(value);
        if (boolVal === null) {
          warnings.push(t(`Invalid value for '${field}' (use true/false).`));
          addPred(() => false);
          continue;
        }
        addPred(row => {
          const mismatched = row.TautulliMatchStatus === "unmatched";
          const want = boolVal ? mismatched : !mismatched;
          return neg ? !want : want;
        });
        continue;
      }

      if (field === "matchstatus" || field === "match") {
        const matchPred = getMatchStatusFilterPredicate(value);
        if (matchPred) {
          addPred(row => {
            const hit = matchPred(row);
            return neg ? !hit : hit;
          });
          continue;
        }
      }

      if (field === "instance") {
        addPred(row => {
          const hit = (
            matchPattern(row?.InstanceName ?? "", value) ||
            matchPattern(row?.InstanceId ?? "", value)
          );
          return neg ? !hit : hit;
        });
        continue;
      }

      const f = String(field || "").toLowerCase();

      if (f === "audiolanguages" || f === "audiolang" ||
        f === "subtitlelanguages" || f === "sublanguages" ||
        f === "sublang" || f === "subtitles" ||
        f === "languages") {
        const queryValue = normalizeLanguageQuery(value);
        addPred(row => {
          const hit = matchPattern(
            normalizeLanguageLabel(getFieldValue(row, field)),
            queryValue
          );
          return neg ? !hit : hit;
        });
        continue;
      }

      if (BUCKET_FIELDS.has(field)) {
        const val = Number(value);
        if (!Number.isFinite(val)) {
          warnings.push(`Invalid number for '${field}'.`);
          addPred(() => false);
          continue;
        }
        if (Number.isInteger(val)) {
          addPred(row => {
            const num = parseNumberValue(getFieldValue(row, field), field);
            if (!Number.isFinite(num)) return false;
            const inBucket = (num >= val && num < val + 1);
            return neg ? !inBucket : inBucket;
          });
          continue;
        }
        // Default: >= val, negates to < val.
        addPred(row => compareNumber(parseNumberValue(getFieldValue(row, field), field), neg ? "<" : ">=", val));
        continue;
      }

      if (NUMERIC_FIELDS.has(field)) {
        const val = Number(value);
        if (!Number.isFinite(val)) {
          warnings.push(`Invalid number for '${field}'.`);
          addPred(() => false);
          continue;
        }
        // Default: >= val, negates to < val.
        addPred(row => compareNumber(parseNumberValue(getFieldValue(row, field), field), neg ? "<" : ">=", val));
        continue;
      }

      if (field === "videoquality" || field === "videocodec" || field === "videohdr") {
        addPred(row => {
          const hay = getFieldValue(row, field);
          let hit;
          if (value.includes("*") || value.includes("?")) {
            hit = matchPattern(hay, value);
          } else {
            const needle = normalizeToken(value);
            hit = normalizeToken(hay).includes(needle);
          }
          return neg ? !hit : hit;
        });
        continue;
      }

      if (field === "resolution") {
        addPred(row => {
          const hit = resolutionMatches(getFieldValue(row, field), value);
          return neg ? !hit : hit;
        });
        continue;
      }

      if (!FIELD_MAP[field]) {
        warnings.push(`Unknown field '${field}'.`);
        addPred(() => false);
        continue;
      }

      addPred(row => {
        const hit = matchPattern(getFieldValue(row, field), value);
        return neg ? !hit : hit;
      });
      continue;
    }

    // Fallback search: Title or Path
    addPred(row => {
      const hit = matchPattern(getFieldValue(row, "Title"), token) || matchPattern(getFieldValue(row, "Path"), token);
      return neg ? !hit : hit;
    });
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
  const chipValue = String(chipQuery ?? "").trim();

  if (!chipsEnabled) {
    updateAdvancedWarnings([]);
    if (!chipValue) {
      return data || [];
    }
    let filtered = data || [];
    if (chipValue) {
      const chips = parseAdvancedQuery(chipValue);
      filtered = filtered.filter(row => chips.preds.every(p => p(row)));
    }
    return filtered;
  }

  const useAdvanced = advancedEnabled;
  const advValue = String(advancedFilter?.value ?? "").trim();

  if (!useAdvanced && !chipValue) {
    const titleValue = String(titleFilter?.value ?? "").trim();
    const pathValue = String(pathFilter?.value ?? "").trim();
    if (!titleValue && !pathValue) {
      updateAdvancedWarnings([]);
      return data || [];
    }
  }

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
    if (!chipValue) {
      return data || [];
    }
    let filtered = data || [];
    if (chipValue) {
      const chips = parseAdvancedQuery(chipValue);
      filtered = filtered.filter(row => chips.preds.every(p => p(row)));
    }
    return filtered;
  }

  updateAdvancedWarnings([]);

  const titleValue = String(titleFilter?.value ?? "").trim();
  const pathValue = String(pathFilter?.value ?? "").trim();

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

function hasActiveFilters() {
  const chipValue = String(chipQuery ?? "").trim();
  if (!chipsEnabled) {
    return Boolean(chipValue);
  }
  if (advancedEnabled) {
    const advValue = String(advancedFilter?.value ?? "").trim();
    return Boolean(chipValue || advValue);
  }
  const titleValue = String(titleFilter?.value ?? "").trim();
  const pathValue = String(pathFilter?.value ?? "").trim();
  return Boolean(chipValue || titleValue || pathValue);
}

function rowMatchesCurrentFilters(row) {
  if (!row) return false;
  const chipValue = String(chipQuery ?? "").trim();
  if (!chipsEnabled) {
    if (!chipValue) return true;
    const chips = parseAdvancedQuery(chipValue);
    return chips.preds.every(p => p(row));
  }
  if (advancedEnabled) {
    const advValue = String(advancedFilter?.value ?? "").trim();
    if (advValue) {
      const parsed = parseAdvancedQuery(advValue);
      if (!parsed.preds.every(p => p(row))) return false;
    }
    if (chipValue) {
      const chips = parseAdvancedQuery(chipValue);
      if (!chips.preds.every(p => p(row))) return false;
    }
    return true;
  }

  const titleValue = String(titleFilter?.value ?? "").trim();
  const pathValue = String(pathFilter?.value ?? "").trim();
  let ok = matchPattern(getFieldValue(row, "Title"), titleValue) &&
    matchPattern(getFieldValue(row, "Path"), pathValue);
  if (ok && chipValue) {
    const chips = parseAdvancedQuery(chipValue);
    ok = chips.preds.every(p => p(row));
  }
  return ok;
}

function clearActiveFilters(options = {}) {
  const persist = options.persist !== false;
  const forceUi = options.forceUi === true;
  let changed = false;
  if (titleFilter && titleFilter.value) {
    titleFilter.value = "";
    changed = true;
  }
  if (pathFilter && pathFilter.value) {
    pathFilter.value = "";
    changed = true;
  }
  if (advancedFilter && advancedFilter.value) {
    advancedFilter.value = "";
    changed = true;
  }
  if (chipQuery) {
    chipQuery = "";
    changed = true;
  }
  if (changed || forceUi) {
    document.querySelectorAll(".chip.chip--pos, .chip.chip--neg").forEach(btn => {
      btn.classList.remove("chip--pos", "chip--neg");
      btn.setAttribute("aria-pressed", "false");
      btn.dataset.state = "off";
    });
    updateAdvancedWarnings([]);
    renderActiveFilterChips();
    if (persist) {
      scheduleViewStateSave();
    }
  }
  return changed;
}

function getSortCache(row) {
  if (!row) return {};
  if (!row.__sortarrSortCache) {
    row.__sortarrSortCache = {};
  }
  return row.__sortarrSortCache;
}

function getDisplayCache(row) {
  if (!row) return {};
  if (!row.__sortarrDisplayCache) {
    row.__sortarrDisplayCache = {};
  }
  return row.__sortarrDisplayCache;
}

function getFilterSignature() {
  const chipValue = String(chipQuery ?? "").trim();
  if (!chipsEnabled) {
    return `builder|${chipValue}`;
  }
  const useAdvanced = advancedEnabled;
  const advValue = String(advancedFilter?.value ?? "").trim();
  if (useAdvanced) {
    return `adv|${advValue}|${chipValue}`;
  }
  const titleValue = String(titleFilter?.value ?? "").trim();
  const pathValue = String(pathFilter?.value ?? "").trim();
  return `basic|${titleValue}|${pathValue}|${chipValue}`;
}

function getMatchStatusSortKey(row) {
  const cache = getSortCache(row);
  if (cache.TautulliMatchStatus) return cache.TautulliMatchStatus;

  const status = String(row?.TautulliMatchStatus || "").toLowerCase();
  const rank = MATCH_STATUS_SORT_ORDER[status] ?? 99;
  let reasonRank = 99;
  if (status === "skipped") {
    const reason = String(row?.TautulliMatchReason || "").toLowerCase();
    const reasonKey = reason.includes("future")
      ? "future"
      : (reason.includes("no episodes on disk") || reason.includes("no file on disk"))
        ? "disk"
        : "other";
    reasonRank = SKIPPED_REASON_SORT_ORDER[reasonKey] ?? 99;
  }
  const title = String(row?.Title ?? "").toLowerCase();
  const value = { rank, reasonRank, title };
  cache.TautulliMatchStatus = value;
  return value;
}

function compareMatchStatusTie(a, b) {
  const aKey = getMatchStatusSortKey(a);
  const bKey = getMatchStatusSortKey(b);
  if (aKey.rank !== bKey.rank) return aKey.rank - bKey.rank;
  if (aKey.rank === MATCH_STATUS_SORT_ORDER.skipped &&
    bKey.rank === MATCH_STATUS_SORT_ORDER.skipped) {
    if (aKey.reasonRank !== bKey.reasonRank) {
      return aKey.reasonRank - bKey.reasonRank;
    }
  }
  const hasMatchInfo = Boolean(
    a?.TautulliMatchStatus || b?.TautulliMatchStatus ||
    a?.TautulliMatchReason || b?.TautulliMatchReason
  );
  if (!hasMatchInfo) return 0;
  if (aKey.title < bKey.title) return -1;
  if (aKey.title > bKey.title) return 1;
  return 0;
}

function getFieldSortKey(row, field) {
  const cache = getSortCache(row);
  if (cache[field]) return cache[field];

  const raw = row?.[field];
  const num = Number(raw);
  const hasNum = Number.isFinite(num) && raw !== "" && raw !== null && raw !== undefined;
  const str = String(raw ?? "").toLowerCase();
  const value = { num, hasNum, str };
  cache[field] = value;
  return value;
}

function sortData(arr) {
  const dir = sortDir === "asc" ? 1 : -1;
  const isMatchStatusSort = sortKey === "TautulliMatchStatus";
  return [...arr].sort((a, b) => {
    if (isMatchStatusSort) {
      const aKey = getMatchStatusSortKey(a);
      const bKey = getMatchStatusSortKey(b);
      if (aKey.rank !== bKey.rank) return (aKey.rank - bKey.rank) * dir;
      if (aKey.rank === MATCH_STATUS_SORT_ORDER.skipped &&
        bKey.rank === MATCH_STATUS_SORT_ORDER.skipped) {
        if (aKey.reasonRank !== bKey.reasonRank) {
          return (aKey.reasonRank - bKey.reasonRank) * dir;
        }
      }
      if (aKey.title < bKey.title) return -1 * dir;
      if (aKey.title > bKey.title) return 1 * dir;
      return 0;
    }

    const aKey = getFieldSortKey(a, sortKey);
    const bKey = getFieldSortKey(b, sortKey);
    if (aKey.hasNum && bKey.hasNum) {
      const diff = aKey.num - bKey.num;
      if (diff !== 0) return diff * dir;
      const matchDiff = compareMatchStatusTie(a, b);
      if (matchDiff !== 0) return matchDiff;
      return 0;
    }
    if (aKey.str < bKey.str) return -1 * dir;
    if (aKey.str > bKey.str) return 1 * dir;
    const matchDiff = compareMatchStatusTie(a, b);
    if (matchDiff !== 0) return matchDiff;
    return 0;
  });
}

const COLUMN_STORAGE_KEY = "Sortarr-columns";
const columnPrefsByApp = { sonarr: {}, radarr: {} };
const DEFAULT_HIDDEN_COLUMNS = new Set([
  "Instance",
  "RootFolder",
  "Status",
  "Monitored",
  "QualityProfile",
  "Tags",
  "ReleaseGroup",
  "Studio",
  "SeriesType",
  "OriginalLanguage",
  "Genres",
  "LastAired",
  "MissingCount",
  "CutoffUnmetCount",
  "HasFile",
  "IsAvailable",
  "InCinemas",
  "LastSearchTime",
  "Edition",
  "CustomFormats",
  "CustomFormatScore",
  "QualityCutoffNotMet",
  "Languages",
  "SeasonCount",
  "AudioLanguages",
  "SubtitleLanguages",
  "TitleSlug",
  "TmdbId",
  "DateAdded",
  "AudioCodecMixed",
  "AudioLanguagesMixed",
  "SubtitleLanguagesMixed",
  "VideoHDR",
  "BitrateMbps",
  "Diagnostics",
  "PlayCount",
  "LastWatched",
  "DaysSinceWatched",
  "TotalWatchTimeHours",
  "WatchContentRatio",
  "UsersWatched",
]);
const REQUIRED_COLUMNS = new Set(["Title", "Path"]);
const LAZY_COLUMNS = new Set(DEFAULT_HIDDEN_COLUMNS);
const LAZY_COLUMNS_ARRAY = Array.from(LAZY_COLUMNS);
const RADARR_VIRTUAL_EAGER_COLUMNS = new Set([
  "DateAdded",
  "Instance",
  "RootFolder",
  "RuntimeMins",
  "FileSizeGB",
  "GBPerHour",
  "BitrateMbps",
]);
const RADARR_VIRTUAL_DEFER_COLUMNS = new Set(
  LAZY_COLUMNS_ARRAY.filter(col => !RADARR_VIRTUAL_EAGER_COLUMNS.has(col))
);
const DISPLAY_CACHE_COLUMNS = {
  AudioCodec: {
    key: "audioCodec", compute: row => formatAudioCodecCell(
      row.AudioCodec ?? "",
      row.AudioCodecMixed,
      row.AudioCodecAll ?? ""
    )
  },
  ContentHours: { key: "contentHours", compute: row => formatWatchTimeHours(row.ContentHours ?? "") },
  VideoQuality: {
    key: "videoQuality", compute: row => {
      const full = row.VideoQualityAll ?? "";
      const mixed = row.VideoQualityMixed;
      const cell = (full || mixed)
        ? formatMixedValueCell(row.VideoQuality ?? "", full, mixed)
        : escapeHtml(row.VideoQuality ?? "");
      return notReportedIfEmpty(cell);
    }
  },
  Resolution: {
    key: "resolution", compute: row => {
      const full = row.ResolutionAll ?? "";
      const mixed = row.ResolutionMixed;
      const cell = (full || mixed)
        ? formatMixedValueCell(row.Resolution ?? "", full, mixed)
        : escapeHtml(row.Resolution ?? "");
      return notReportedIfEmpty(cell);
    }
  },
  VideoCodec: {
    key: "videoCodec", compute: row => {
      const full = row.VideoCodecAll ?? "";
      const mixed = row.VideoCodecMixed;
      const cell = (full || mixed)
        ? formatMixedValueCell(row.VideoCodec ?? "", full, mixed)
        : escapeHtml(row.VideoCodec ?? "");
      return notReportedIfEmpty(cell);
    }
  },
  AudioChannels: {
    key: "audioChannels", compute: row => {
      const full = row.AudioChannelsAll ?? "";
      const mixed = row.AudioChannelsMixed;
      const cell = (full || mixed)
        ? formatMixedValueCell(row.AudioChannels ?? "", full, mixed, "audio-channels-cell")
        : formatAudioChannelsCell(escapeHtml(row.AudioChannels ?? ""));
      return notReportedIfEmpty(cell);
    }
  },
  RootFolder: { key: "rootFolder", compute: row => escapeHtml(row.RootFolder ?? "") },
  Path: { key: "path", compute: row => escapeHtml(row.Path ?? "") },
};
const DISPLAY_CACHE_COLUMN_LIST = Object.keys(DISPLAY_CACHE_COLUMNS);
let columnVisibilityVersion = 0;
const lastVisibleDisplayColumns = { sonarr: null, radarr: null };

function loadCsvColumnsState() {
  let prefs = null;
  try {
    prefs = JSON.parse(localStorage.getItem(CSV_COLUMNS_KEY) || "");
  } catch {
    prefs = null;
  }
  ["sonarr", "radarr"].forEach(app => {
    if (prefs && Object.prototype.hasOwnProperty.call(prefs, app)) {
      csvColumnsState[app] = Boolean(prefs[app]);
    }
  });
}

function saveCsvColumnsState() {
  localStorage.setItem(CSV_COLUMNS_KEY, JSON.stringify(csvColumnsState));
}

function csvColumnsEnabled() {
  return csvColumnsState[activeApp] === true;
}

function syncCsvToggle() {
  if (!csvColumnsToggle) return;
  csvColumnsToggle.checked = csvColumnsEnabled();
}

function setCsvColumnsEnabled(enabled) {
  csvColumnsState[activeApp] = Boolean(enabled);
  saveCsvColumnsState();
  syncCsvToggle();
  updateColumnFilter();
  markColumnVisibilityDirty();
  updateColumnVisibility();
  applyTitleWidth(activeApp);
}

function getColumnInputApp(input) {
  if (!input) return "";
  const row = input.closest(".column-row");
  if (row) return row.getAttribute("data-app") || "";
  const group = input.closest(".column-group");
  return group ? (group.getAttribute("data-app") || "") : "";
}

function inputMatchesApp(input, app = activeApp) {
  const inputApp = getColumnInputApp(input);
  return !inputApp || inputApp === app;
}

function getColumnInputs(col, app = activeApp) {
  if (!columnsPanel || !col) return [];
  return Array.from(columnsPanel.querySelectorAll(`input[data-col="${CSS.escape(col)}"]`))
    .filter(input => inputMatchesApp(input, app));
}

function getColumnCheckedState(col, app = activeApp) {
  const inputs = getColumnInputs(col, app);
  if (!inputs.length) return false;
  return inputs.some(input => input.checked);
}

function syncColumnInputs(col, checked, app = activeApp) {
  getColumnInputs(col, app).forEach(input => {
    input.checked = checked;
  });
}

function setColumnGroup(group, checked, app = activeApp) {
  if (!columnsPanel) return;
  const cols = COLUMN_GROUPS[group] || [];
  cols.forEach(col => {
    syncColumnInputs(col, checked, app);
  });
}

function updateColumnGroupToggles(app = activeApp) {
  if (!columnsPanel) return;
  columnsPanel.querySelectorAll("input[data-col-group]").forEach(input => {
    if (!inputMatchesApp(input, app)) return;
    const group = input.getAttribute("data-col-group");
    const cols = COLUMN_GROUPS[group] || [];
    const inputs = cols
      .map(col => getColumnInputs(col, app)[0])
      .filter(Boolean);
    if (!inputs.length) {
      input.checked = false;
      input.indeterminate = false;
      input.disabled = true;
      return;
    }
    const checkedCount = inputs.filter(colInput => colInput.checked).length;
    input.disabled = false;
    input.checked = checkedCount === inputs.length;
    input.indeterminate = checkedCount > 0 && checkedCount < inputs.length;
  });
}

function enforceRequiredColumns(app = activeApp) {
  if (!columnsPanel) return;
  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    if (!inputMatchesApp(input, app)) return;
    const col = input.getAttribute("data-col");
    if (REQUIRED_COLUMNS.has(col)) {
      input.checked = true;
      input.disabled = true;
    }
  });
}

function loadColumnPrefsState() {
  let prefs = null;
  try {
    prefs = JSON.parse(localStorage.getItem(COLUMN_STORAGE_KEY) || "");
  } catch {
    prefs = null;
  }
  if (prefs && (prefs.sonarr || prefs.radarr)) {
    columnPrefsByApp.sonarr = { ...(prefs.sonarr || {}) };
    columnPrefsByApp.radarr = { ...(prefs.radarr || {}) };
    return;
  }
  if (prefs && typeof prefs === "object") {
    columnPrefsByApp.sonarr = { ...prefs };
    columnPrefsByApp.radarr = { ...prefs };
    return;
  }
  columnPrefsByApp.sonarr = {};
  columnPrefsByApp.radarr = {};
}

function storeColumnPrefs() {
  try {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columnPrefsByApp));
  } catch {
  }
}

function getColumnPrefs(app) {
  return columnPrefsByApp[app] || {};
}

function loadColumnPrefs(app = activeApp) {
  if (!columnsPanel) return;
  const prefs = getColumnPrefs(app);

  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    if (!inputMatchesApp(input, app)) return;
    const col = input.getAttribute("data-col");
    if (Object.prototype.hasOwnProperty.call(prefs, col)) {
      input.checked = Boolean(prefs[col]);
    } else {
      input.checked = !DEFAULT_HIDDEN_COLUMNS.has(col);
    }
  });
  enforceRequiredColumns(app);
  updateColumnGroupToggles(app);
}

function saveColumnPrefs(app = activeApp) {
  if (!columnsPanel) return;
  const prefs = {};
  const seen = new Set();
  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    if (!inputMatchesApp(input, app)) return;
    const col = input.getAttribute("data-col");
    if (seen.has(col)) return;
    const checked = getColumnCheckedState(col, app);
    prefs[col] = checked;
    syncColumnInputs(col, checked, app);
    seen.add(col);
  });
  columnPrefsByApp[app] = prefs;
  storeColumnPrefs();
}

function getHiddenColumns(app = activeApp) {
  const hidden = new Set();
  if (!columnsPanel) return hidden;
  const seen = new Set();
  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    if (!inputMatchesApp(input, app)) return;
    const col = input.getAttribute("data-col");
    if (seen.has(col)) return;
    const checked = getColumnCheckedState(col, app);
    if (!checked && !REQUIRED_COLUMNS.has(col)) {
      hidden.add(col);
    }
    seen.add(col);
  });
  return hidden;
}

function isColumnHidden(col, app, hiddenColumns) {
  const hideByCol = hiddenColumns && hiddenColumns.has(col);
  const hideByTautulli = TAUTULLI_COLUMNS.has(col) && !tautulliEnabled;
  const hideByDiagnostics = col === "Diagnostics" && !playbackSupportsDiagnostics;
  const hideByCsv = col && CSV_COLUMNS_BY_APP[app]?.has(col) && !csvColumnsEnabled();
  const hideByInstance = col === "Instance" && getInstanceCount(app) <= 1;
  return hideByCol || hideByTautulli || hideByDiagnostics || hideByCsv || hideByInstance;
}

function getDeferredColumns(app, hiddenColumns, options = {}) {
  const deferred = new Set();
  const virtualize = options.virtualize === true && app === "radarr";
  LAZY_COLUMNS.forEach(col => {
    if (isColumnHidden(col, app, hiddenColumns)) {
      deferred.add(col);
    } else if (virtualize && RADARR_VIRTUAL_DEFER_COLUMNS.has(col)) {
      deferred.add(col);
    }
  });
  return deferred;
}

function markColumnVisibilityDirty() {
  columnVisibilityVersion += 1;
  columnWidthCacheByApp.sonarr.clear();
  columnWidthCacheByApp.radarr.clear();
  columnWidthCacheVersionByApp.sonarr = -1;
  columnWidthCacheVersionByApp.radarr = -1;
}

function computeDisplayCacheValue(row, app, column, cache) {
  const entry = DISPLAY_CACHE_COLUMNS[column];
  if (!entry) return "";
  if (!Object.prototype.hasOwnProperty.call(cache, entry.key)) {
    cache[entry.key] = entry.compute(row, app);
  }
  return cache[entry.key];
}

function resolveDisplayCacheValue(row, app, column, cache, isVisible) {
  const entry = DISPLAY_CACHE_COLUMNS[column];
  if (!entry) return { value: "", lazy: false };
  if (isVisible || Object.prototype.hasOwnProperty.call(cache, entry.key)) {
    return { value: computeDisplayCacheValue(row, app, column, cache), lazy: false };
  }
  return { value: "", lazy: true };
}

function hydrateLazyDisplayCells(column, rootEl = document) {
  if (!Object.prototype.hasOwnProperty.call(DISPLAY_CACHE_COLUMNS, column)) return;
  const scope = rootEl && rootEl.querySelectorAll ? rootEl : document;
  const selector = `td[data-col="${column}"][data-lazy-value="1"]`;
  scope.querySelectorAll(selector).forEach(cell => {
    const tr = cell.closest("tr");
    const row = tr ? tr.__sortarrRow : null;
    if (!row) return;
    const app = tr?.dataset?.app || activeApp;
    const cache = getDisplayCache(row);
    const value = computeDisplayCacheValue(row, app, column, cache);
    if (value !== undefined) {
      cell.innerHTML = value;
      cell.removeAttribute("data-lazy-value");
    }
  });
}

function getVisibleDisplayColumns(app, hiddenColumns) {
  const visible = new Set();
  DISPLAY_CACHE_COLUMN_LIST.forEach(col => {
    if (!isColumnHidden(col, app, hiddenColumns)) {
      visible.add(col);
    }
  });
  return visible;
}
function updateColumnScrollHint() {
  if (!columnsPanel) return;
  if (columnsPanel.classList.contains("hidden")) {
    columnsPanel.classList.remove("column-panel--scrollable-down");
    columnsPanel.style.height = "";
    columnsPanel.style.maxHeight = "";
    columnsPanel.style.overflow = "";
    resetColumnsPanelPosition();
    return;
  }
  positionColumnsPanel();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const rect = columnsPanel.getBoundingClientRect();
  const availableHeight = Math.floor(viewportHeight - rect.top - 16);
  const maxHeight = Math.max(120, availableHeight);

  columnsPanel.style.maxHeight = `${maxHeight}px`;
  columnsPanel.style.height = "auto";
  columnsPanel.style.overflow = "hidden";

  const scrollHeight = columnsPanel.scrollHeight;
  const targetHeight = Math.min(scrollHeight, maxHeight);
  columnsPanel.style.height = `${targetHeight}px`;

  const clientHeight = columnsPanel.clientHeight;
  const canScroll = scrollHeight - clientHeight > 2;
  if (!canScroll && columnsPanel.scrollTop !== 0) {
    columnsPanel.scrollTop = 0;
  }
  columnsPanel.style.overflow = canScroll ? "auto" : "hidden";
  const atBottom = columnsPanel.scrollTop + clientHeight >= scrollHeight - 1;
  columnsPanel.classList.toggle("column-panel--scrollable-down", canScroll && !atBottom);
}

function resetColumnsPanelPosition() {
  if (!columnsPanel) return;
  columnsPanel.style.position = "";
  columnsPanel.style.left = "";
  columnsPanel.style.right = "";
  columnsPanel.style.top = "";
  columnsPanel.style.transform = "";
  columnsPanel.style.width = "";
  columnsPanel.style.maxWidth = "";
}

function positionColumnsPanel() {
  if (!columnsPanel || !columnsBtn) return;
  const isSmall = window.innerWidth <= 700;
  if (!isSmall) {
    resetColumnsPanelPosition();
    return;
  }
  const btnRect = columnsBtn.getBoundingClientRect();
  const viewportWidth = window.visualViewport?.width || window.innerWidth;
  const maxWidth = Math.round(Math.min(viewportWidth * 0.94, 360));
  const top = Math.round(btnRect.bottom + 8);
  columnsPanel.style.position = "fixed";
  columnsPanel.style.left = "50%";
  columnsPanel.style.right = "auto";
  columnsPanel.style.top = `${top}px`;
  columnsPanel.style.transform = "translateX(-50%)";
  columnsPanel.style.width = `${maxWidth}px`;
  columnsPanel.style.maxWidth = `${maxWidth}px`;
}

function updateColumnFilter() {
  if (!columnsPanel) return;
  const query = String(columnSearch?.value ?? "").trim().toLowerCase();
  const csvEnabled = csvColumnsEnabled();
  columnsPanel.querySelectorAll(".column-row").forEach(row => {
    const label = row.textContent.toLowerCase();
    const app = row.getAttribute("data-app");
    const appMatch = !app || app === activeApp;
    const input = row.querySelector("input[data-col]");
    const groupInput = row.querySelector("input[data-col-group]");
    const col = input?.getAttribute("data-col");
    const group = groupInput?.getAttribute("data-col-group");
    let show = appMatch && (!query || label.includes(query));
    if (col) {
      const isTautulli = TAUTULLI_COLUMNS.has(col);
      const tautulliMatch = !isTautulli || tautulliEnabled;
      const hideDiagnostics = col === "Diagnostics" && !playbackSupportsDiagnostics;
      const isCsv = CSV_COLUMNS_BY_APP[activeApp]?.has(col);
      const csvMatch = !isCsv || csvEnabled;
      const hideByInstance = col === "Instance" && getInstanceCount(activeApp) <= 1;
      show = show && tautulliMatch && csvMatch && !hideByInstance && !hideDiagnostics;
    } else if (group) {
      if (group === "tautulli" && !tautulliEnabled) {
        show = false;
      }
    }
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
  updateColumnGroupToggles();
  updateColumnScrollHint();
}

function setAllColumns(checked) {
  if (!columnsPanel) return;
  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    if (!inputMatchesApp(input, activeApp)) return;
    input.checked = checked;
  });
  enforceRequiredColumns(activeApp);
  saveColumnPrefs(activeApp);
  updateColumnGroupToggles(activeApp);
  markColumnVisibilityDirty();
  updateColumnVisibility();
  applyTitleWidth(activeApp);
}

function resetColumnPrefs() {
  columnPrefsByApp[activeApp] = {};
  storeColumnPrefs();
  loadColumnPrefs();
  updateColumnFilter();
  markColumnVisibilityDirty();
  updateColumnVisibility();
  applyTitleWidth(activeApp);
}


function updateSortIndicators() {
  document.querySelectorAll("th[data-sort]").forEach(h => {
    h.classList.remove("active-sort");
    const i = h.querySelector(".sort-indicator");
    if (i) i.textContent = "";
  });

  const escapedSortKey = CSS.escape(sortKey);
  const candidates = Array.from(document.querySelectorAll(`th[data-sort="${escapedSortKey}"]`));
  const th = candidates.find(header => {
    if (header.classList.contains("col-hidden")) return false;
    const app = header.getAttribute("data-app");
    return !app || app === activeApp;
  }) || candidates[0] || null;
  if (!th) return;

  th.classList.add("active-sort");
  const ind = th.querySelector(".sort-indicator");
  if (ind) ind.textContent = sortDir === "asc" ? "^" : "v";
}

function updateColumnVisibility(rootEl = document) {
  const hidden = getHiddenColumns(activeApp);
  const scope = rootEl && rootEl.querySelectorAll ? rootEl : document;
  const isGlobal = scope === document;
  const isFragment = scope && scope.nodeType === 11;
  const includeHeader = !isFragment;
  const csvDisabled = !csvColumnsEnabled();
  const csvCols = csvDisabled ? CSV_COLUMNS_BY_APP[activeApp] : null;
  const hideTautulli = !tautulliEnabled;
  const hideInstance = getInstanceCount(activeApp) <= 1;
  const checkPanel = isGlobal && columnsPanel;
  let newlyVisible = null;
  if (isGlobal) {
    const currentVisible = getVisibleDisplayColumns(activeApp, hidden);
    const previousVisible = lastVisibleDisplayColumns[activeApp];
    if (previousVisible) {
      newlyVisible = [];
      currentVisible.forEach(col => {
        if (!previousVisible.has(col)) {
          newlyVisible.push(col);
        }
      });
    }
    lastVisibleDisplayColumns[activeApp] = currentVisible;
  }
  const scopes = [];
  if (scope === document) {
    scopes.push(document);
  } else {
    scopes.push(scope);
    if (includeHeader) {
      const thead = document.querySelector("thead");
      if (thead) scopes.push(thead);
    }
  }

  scopes.forEach(scopeEl => {
    scopeEl.querySelectorAll("[data-col]").forEach(el => {
      if (checkPanel && columnsPanel.contains(el)) return;
      const col = el.getAttribute("data-col");
      const app = el.getAttribute("data-app");
      const hideByApp = app && app !== activeApp;
      const hideByCol = hidden.has(col);
      const hideByTautulli = hideTautulli && col && TAUTULLI_COLUMNS.has(col);
      const hideByDiagnostics = col === "Diagnostics" && !playbackSupportsDiagnostics;
      const hideByCsv = csvCols && col && csvCols.has(col);
      const hideByInstance = hideInstance && col === "Instance";
      el.classList.toggle(
        "col-hidden",
        hideByApp || hideByCol || hideByTautulli || hideByDiagnostics || hideByCsv || hideByInstance
      );
    });
  });
  if (isGlobal && newlyVisible && newlyVisible.length) {
    newlyVisible.forEach(col => hydrateLazyDisplayCells(col));
  }
  if (isGlobal) {
    applyColumnHeaderCaps();
    scheduleTitlePathWidthLock();
    scheduleTruncationTooltipUpdate();
  }
}

function updateChipVisibility() {
  const hiddenQueries = new Set();
  document.querySelectorAll(".chip-group").forEach(group => {
    const app = group.getAttribute("data-app") ||
      (group.querySelector("#instanceChipsSonarr") ? "sonarr" :
        (group.querySelector("#instanceChipsRadarr") ? "radarr" : ""));
    const isTautulli = group.getAttribute("data-tautulli") === "true";
    const isInstanceGroup = group.getAttribute("data-instance-group") === "true";
    const instanceApp = app || activeApp;
    const hideByInstance = isInstanceGroup && getInstanceCount(instanceApp) <= 1;
    const hideGroup = (app && app !== activeApp) || (isTautulli && !tautulliEnabled) || hideByInstance;
    group.classList.toggle("hidden", hideGroup);
    if (hideGroup) {
      group.querySelectorAll(".chip").forEach(btn => {
        const query = btn.getAttribute("data-query") || "";
        if (query) hiddenQueries.add(query);
        btn.classList.remove("chip--pos", "chip--neg");
        btn.setAttribute("aria-pressed", "false");
        btn.dataset.state = "off";
      });
    }
  });

  document.querySelectorAll(".chip").forEach(btn => {
    const app = btn.getAttribute("data-app");
    const isTautulli = btn.getAttribute("data-tautulli") === "true";
    const isInstance = btn.getAttribute("data-instance") === "true";
    const instanceApp = app || activeApp;
    const hideByInstance = isInstance && getInstanceCount(instanceApp) <= 1;
    const hideChip = (app && app !== activeApp) || (isTautulli && !tautulliEnabled) || hideByInstance;
    btn.classList.toggle("hidden", hideChip);
    if (hideChip) {
      const query = btn.getAttribute("data-query") || "";
      if (query) hiddenQueries.add(query);
      btn.classList.remove("chip--pos", "chip--neg");
      btn.setAttribute("aria-pressed", "false");
      btn.dataset.state = "off";
    }
  });

  bindChipButtons();

  if (!hiddenQueries.size) {
    syncChipButtonsToQuery();
    return false;
  }
  const current = new Set((chipQuery || "").split(/\s+/).filter(Boolean));
  let changed = false;
  hiddenQueries.forEach(q => {
    if (current.delete(q)) changed = true;
  });
  if (changed) {
    chipQuery = Array.from(current).join(" ");
  }
  syncChipButtonsToQuery();
  return changed;
}

function clearTable() {
  try { teardownVirtual("sonarr"); teardownVirtual("radarr"); } catch { }
  tbody.innerHTML = "";
}

function setBatching(active) {
  if (!tableEl) return;
  tableEl.classList.toggle("is-batching", Boolean(active));
}

function getCellContentWidth(el) {
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  if (!rect) return 0;
  const style = window.getComputedStyle(el);
  const padding = parseFloat(style.paddingLeft || 0) + parseFloat(style.paddingRight || 0);
  const border = parseFloat(style.borderLeftWidth || 0) + parseFloat(style.borderRightWidth || 0);
  const boxSizing = style.boxSizing || "content-box";
  let width = rect.width || 0;
  if (boxSizing !== "border-box") {
    width -= padding + border;
  }
  return Math.max(0, Math.ceil(width));
}

function maybeStabilizeRender(app, options = {}) {
  if (!resolveRenderFlag("stabilize", app)) {
    pendingStabilizeByApp[app] = false;
    return;
  }
  if (options.stabilize) return;
  if (!pendingStabilizeByApp[app]) return;
  pendingStabilizeByApp[app] = false;
  requestAnimationFrame(() => {
    if (app !== activeApp) return;
    render(dataByApp[app] || [], { allowBatch: true, stabilize: true });
  });
}


function getAppliedColumnCapWidth(col) {
  if (!tableEl || !col) return 0;
  const raw = tableEl.style.getPropertyValue(`--cap-${col}`) || "";
  const value = parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function cacheColumnWidths(app, options = {}) {
  if (!tableEl) return;
  if (!options.force && hasActiveFilters()) return;
  const headers = tableEl.querySelectorAll("thead th[data-col]");
  if (!headers.length) return;
  const cache = columnWidthCacheByApp[app];
  cache.clear();
  headers.forEach(th => {
    if (th.classList.contains("col-hidden")) return;
    const col = th.getAttribute("data-col");
    if (!col || col === "Title") return;
    const width = getCellContentWidth(th);
    const capWidth = getAppliedColumnCapWidth(col);
    const cachedWidth = capWidth > 0 ? Math.min(width, capWidth) : width;
    if (cachedWidth > 0) {
      cache.set(col, cachedWidth);
    }
  });
  if (cache.size) {
    columnWidthCacheVersionByApp[app] = columnVisibilityVersion;
  }
}

function lockColumnWidths(token) {
  if (!tableEl) return;
  const app = activeApp;
  const headers = tableEl.querySelectorAll("thead th[data-col]");
  if (!headers.length) return;
  columnWidthLock.widths.clear();
  const useCache = columnWidthCacheVersionByApp[app] === columnVisibilityVersion &&
    columnWidthCacheByApp[app].size > 0;
  if (useCache) {
    columnWidthCacheByApp[app].forEach((width, col) => {
      if (!col || col === "Title") return;
      if (width > 0) {
        columnWidthLock.widths.set(col, width);
      }
    });
  } else {
    headers.forEach(th => {
      if (th.classList.contains("col-hidden")) return;
      const col = th.getAttribute("data-col");
      if (!col || col === "Title") return;
      const width = getCellContentWidth(th);
      if (width > 0) {
        columnWidthLock.widths.set(col, width);
      }
    });
  }
  if (!columnWidthLock.widths.size) return;
  headers.forEach(th => {
    const col = th.getAttribute("data-col");
    const width = columnWidthLock.widths.get(col);
    if (!width) return;
    const widthPx = `${width}px`;
    th.style.width = widthPx;
    th.style.minWidth = widthPx;
    th.style.maxWidth = widthPx;
  });
  if (tbody && columnWidthLock.widths.size) {
    columnWidthLock.widths.forEach((width, col) => {
      if (!col || col === "Title") return;
      const widthPx = `${width}px`;
      tbody.querySelectorAll(`td[data-col="${col}"]`).forEach(td => {
        td.style.width = widthPx;
        td.style.minWidth = widthPx;
        td.style.maxWidth = widthPx;
      });
    });
  }
  columnWidthLock.active = true;
  columnWidthLock.token = token || 0;
}

function unlockColumnWidths(token) {
  if (!tableEl || !columnWidthLock.active) return;
  if (token && columnWidthLock.token && columnWidthLock.token !== token) return;
  const headers = tableEl.querySelectorAll("thead th[data-col]");
  headers.forEach(th => {
    const col = th.getAttribute("data-col");
    if (!col || !columnWidthLock.widths.has(col)) return;
    th.style.width = "";
    th.style.minWidth = "";
    th.style.maxWidth = "";
  });
  if (tbody && columnWidthLock.widths.size) {
    columnWidthLock.widths.forEach((_width, col) => {
      if (!col || col === "Title") return;
      tbody.querySelectorAll(`td[data-col="${col}"]`).forEach(td => {
        td.style.width = "";
        td.style.minWidth = "";
        td.style.maxWidth = "";
      });
    });
  }
  columnWidthLock.widths.clear();
  columnWidthLock.active = false;
  columnWidthLock.token = 0;
  applyTitleWidth(activeApp, null, { skipIfUnchanged: true });
}

function measureHeaderCapWidth(th) {
  if (!th || !document.body) return 0;
  const col = th.getAttribute("data-col") || "";
  const appKey = activeApp;
  const labelKey = (th.textContent || "").trim();
  const minText = HEADER_CAP_MIN_TEXT[col] || "";
  const targetWidth = HEADER_CAP_TARGET_WIDTH_BY_APP[appKey]?.[col] || 0;
  if (!labelKey) return targetWidth;
  const style = window.getComputedStyle(th);
  const fontKey = style?.font || `${style?.fontWeight || ""} ${style?.fontSize || ""} ${style?.fontFamily || ""}`;
  const cacheKey = `${labelKey}||${minText}||${targetWidth}||${fontKey}||${style?.letterSpacing || ""}||${style?.textTransform || ""}`;
  const cachedKey = headerCapKeyByApp[appKey].get(col);
  if (cachedKey === cacheKey && headerCapCacheByApp[appKey].has(col)) {
    return headerCapCacheByApp[appKey].get(col);
  }
  if (!headerCapMeasureEl) {
    headerCapMeasureEl = document.createElement("span");
    headerCapMeasureEl.style.position = "absolute";
    headerCapMeasureEl.style.visibility = "hidden";
    headerCapMeasureEl.style.whiteSpace = "nowrap";
    headerCapMeasureEl.style.pointerEvents = "none";
    headerCapMeasureEl.style.left = "-9999px";
    headerCapMeasureEl.style.top = "0";
    document.body.appendChild(headerCapMeasureEl);
  }
  let text = labelKey;
  let sampleText = minText;
  const transform = style?.textTransform || "none";
  if (transform === "uppercase") {
    text = text.toUpperCase();
    sampleText = sampleText.toUpperCase();
  } else if (transform === "lowercase") {
    text = text.toLowerCase();
    sampleText = sampleText.toLowerCase();
  } else if (transform === "capitalize") {
    text = text.replace(/\b\w/g, c => c.toUpperCase());
    sampleText = sampleText.replace(/\b\w/g, c => c.toUpperCase());
  }
  headerCapMeasureEl.style.font = fontKey;
  if (style?.letterSpacing) {
    headerCapMeasureEl.style.letterSpacing = style.letterSpacing;
  }
  headerCapMeasureEl.textContent = text;
  const labelWidth = Math.ceil(headerCapMeasureEl.getBoundingClientRect().width);
  let minWidth = 0;
  if (sampleText) {
    headerCapMeasureEl.textContent = sampleText;
    minWidth = Math.ceil(headerCapMeasureEl.getBoundingClientRect().width);
  }
  const width = Math.max(labelWidth, minWidth);
  const measured = width ? width + HEADER_CAP_EXTRA_PX : 0;
  const capped = Math.max(measured, targetWidth);
  headerCapCacheByApp[appKey].set(col, capped);
  headerCapKeyByApp[appKey].set(col, cacheKey);
  return capped;
}

function applyColumnHeaderCaps() {
  if (!tableEl) return;
  const app = activeApp;
  if (!headerCapCleanupDone) {
    HEADER_WIDTH_CAP_COLUMNS.forEach(col => {
      tableEl.querySelectorAll(`th[data-col="${col}"], td[data-col="${col}"]`).forEach(el => {
        el.style.width = "";
        el.style.minWidth = "";
        el.style.maxWidth = "";
      });
    });
    headerCapCleanupDone = true;
  }
  const headers = Array.from(tableEl.querySelectorAll("thead th[data-col]"));
  let hasVisibleCap = false;
  let missingCap = false;
  headers.forEach(th => {
    const col = th.getAttribute("data-col");
    if (!col || !HEADER_WIDTH_CAP_COLUMNS.has(col)) return;
    const appAttr = th.getAttribute("data-app");
    if (appAttr && appAttr !== app) return;
    if (th.classList.contains("col-hidden")) return;
    hasVisibleCap = true;
    if (!tableEl.style.getPropertyValue(`--cap-${col}`).trim()) {
      missingCap = true;
    }
  });
  if (!hasVisibleCap) {
    headerCapAppliedVersionByApp[app] = columnVisibilityVersion;
    return;
  }
  if (headerCapAppliedVersionByApp[app] === columnVisibilityVersion && !missingCap) return;
  headers.forEach(th => {
    const col = th.getAttribute("data-col");
    if (!col || !HEADER_WIDTH_CAP_COLUMNS.has(col)) return;
    const appAttr = th.getAttribute("data-app");
    if (appAttr && appAttr !== app) return;

    if (th.classList.contains("col-hidden")) return;
    const width = measureHeaderCapWidth(th);
    if (!width) return;
    const widthPx = `${width}px`;
    tableEl.style.setProperty(`--cap-${col}`, widthPx);
  });
  headerCapAppliedVersionByApp[app] = columnVisibilityVersion;
}

function applyTitleWidth(app, _rows = null, _options = {}) {
  if (!tableEl || app !== activeApp) return;
  const sharedTitleWidth = clampTitleWidth(Math.max(titleWidthByApp.sonarr || 0, titleWidthByApp.radarr || 0));
  const header = tableEl.querySelector('th[data-col="Title"]');
  if (!header) return;

  if (sharedTitleWidth <= 0) {
    header.style.width = "";
    header.style.minWidth = "";
    header.style.maxWidth = "";
    if (tbody) {
      tbody.querySelectorAll('td[data-col="Title"]').forEach(td => {
        td.style.width = "";
        td.style.minWidth = "";
        td.style.maxWidth = "";
      });
    }
    return;
  }

  const widthPx = `${sharedTitleWidth}px`;
  header.style.width = widthPx;
  header.style.minWidth = widthPx;
  header.style.maxWidth = widthPx;
  if (tbody) {
    tbody.querySelectorAll('td[data-col="Title"]').forEach(td => {
      td.style.width = widthPx;
      td.style.minWidth = widthPx;
      td.style.maxWidth = widthPx;
    });
  }
}


function setActiveTab(app) {
  if (activeApp === app) return;

  flushViewStateSave(activeApp);
  activeApp = app;
  unlockColumnWidths();

  // Clear stale badges immediately
  if (healthBadgesEl) {
    healthBadgesEl.innerHTML = "";
    healthBadgesEl.removeAttribute("title");
  }

  // Re-render cached health instantly if we have it
  renderHealthStatus(activeApp, statusState.apps?.[activeApp]?.health);

  // Force a health refresh for the newly selected app
  fetchHealth(activeApp).catch(() => { });

  clearTableSelection();
  markColumnVisibilityDirty();
  if (tableEl) {
    tableEl.dataset.app = activeApp;
  }

  clearTableSelection();
  markColumnVisibilityDirty();
  if (tableEl) {
    tableEl.dataset.app = activeApp;
  }

  tabSonarr.classList.toggle("active", activeApp === "sonarr");
  tabRadarr.classList.toggle("active", activeApp === "radarr");
  updatePlexLibraryScopeControl();
  updateEffectiveSourcesLine();
  setLoading(false);
  setStatus("");
  setStatusNotice(noticeByApp[activeApp] || "");
  updateFastModeBanner();
  updateBackgroundLoading();
  updateStatusPanel();
  if (mismatchCenterState.open) {
    fetchMismatchCenterData(activeApp, { force: false, silent: true }).catch(() => {
      renderMismatchCenter();
    });
  }

  loadColumnPrefs();
  applyViewState(activeApp);
  updateFilterBuilderOptions();
  sortCacheByApp[activeApp] = null;
  syncCsvToggle();
  updateColumnVisibility();
  updateColumnFilter();
  updateSortIndicators();
  updateLastUpdatedDisplay();
  applyTitleWidth(activeApp, null, { skipIfUnchanged: true });
  scheduleTitlePathWidthLock();

  const chipsChanged = updateChipVisibility();
  if (chipsChanged) {
    scheduleViewStateSave();
  }

  const activeData = dataByApp[activeApp] || [];
  if (activeData.length) {
    pendingStabilizeByApp[activeApp] = true;
    render(activeData);
    if (chipsChanged) render(activeData);
    return;
  }

  // IMPORTANT: clear previous list and load new data immediately
  clearTable();
  load(false);
  fetchHealth({ app: activeApp, silent: true });
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

function buildTitleLink(row, app) {
  const rawTitle = formatRowTitle(row, app);
  const display = escapeHtml(rawTitle);
  const titleAttr = rawTitle ? ` title="${escapeHtml(rawTitle)}"` : "";
  const fallback = `<span class="title-text"${titleAttr}>${display}</span>`;

  if (app === "sonarr") {
    const slug =
      row.TitleSlug ??
      row.titleSlug ??
      row.Slug ??
      row.slug ??
      sonarrSlugFromTitle(row.Title);

    const instanceId = row.InstanceId ?? row.instanceId;
    const base = (instanceId && instanceBaseById.sonarr[instanceId]) || sonarrBase;
    if (!base || !slug) return fallback;

    const url = `${base.replace(/\/$/, "")}/series/${slug}`;
    return `<a class="title-link title-text" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"${titleAttr}>${display}</a>`;
  } else {
    // IMPORTANT: Radarr UI expects TMDB id for /movie/<id> in your setup
    const tmdbId = row.TmdbId ?? row.tmdbId;
    const instanceId = row.InstanceId ?? row.instanceId;
    const base = (instanceId && instanceBaseById.radarr[instanceId]) || radarrBase;
    if (!base || !tmdbId) return fallback;

    const url = `${base.replace(/\/$/, "")}/movie/${tmdbId}`;
    return `<a class="title-link title-text" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"${titleAttr}>${display}</a>`;
  }
}

const ROW_REFRESH_ICON_HTML = '<span aria-hidden="true">↻</span>';
const ROW_REFRESH_BUTTON_HTML =
  `<button class="row-refresh-btn row-refresh-btn--title" type="button" title="${escapeHtml(t("Refresh in Arr (and playback if supported)"))}" aria-label="${escapeHtml(t("Refresh item"))}">${ROW_REFRESH_ICON_HTML}</button>`;
const SERIES_EXPAND_ICON_HTML = '<span aria-hidden="true">+</span>';
const DIAG_BUTTON_HTML =
  `<div class="diag-actions"><button class="match-diag-btn" type="button" title="${escapeHtml(t("Copy match diagnostics"))}" aria-label="${escapeHtml(t("Copy match diagnostics"))}">i</button></div>`;

function buildSeriesExpanderButton(row) {
  const seriesId = row.SeriesId ?? row.seriesId ?? "";
  if (!seriesId) return "";
  const instanceId = row.InstanceId ?? row.instanceId ?? "";
  const seriesKey = getSonarrSeriesKey(seriesId, instanceId);
  const keyAttr = seriesKey ? ` data-series-key="${escapeHtml(seriesKey)}"` : "";
  const seriesAttr = seriesId ? ` data-series-id="${escapeHtml(seriesId)}"` : "";
  const instanceAttr = instanceId ? ` data-instance-id="${escapeHtml(instanceId)}"` : "";
  return `<button class="series-expander" type="button" title="${escapeHtml(t("Expand seasons"))}" aria-label="${escapeHtml(t("Expand seasons"))}" aria-expanded="false"${keyAttr}${seriesAttr}${instanceAttr}>${SERIES_EXPAND_ICON_HTML}</button>`;
}

function computeHeavyCellValues(row, app, columns) {
  if (!columns || !columns.length) return {};
  const colSet = columns instanceof Set ? columns : new Set(columns);
  const values = {};
  const cache = getDisplayCache(row);

  if (colSet.has("Instance")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "instanceCell")) {
      cache.instanceCell = escapeHtml(row.InstanceName ?? row.InstanceId ?? "");
    }
    values.Instance = cache.instanceCell;
  }

  if (colSet.has("Status")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "statusCell")) {
      cache.statusCell = notReportedIfEmpty(formatStatusValue(row.Status ?? ""));
    }
    values.Status = cache.statusCell;
  }

  if (colSet.has("Monitored")) {
    values.Monitored = formatOptionalBool(row.Monitored);
  }

  if (colSet.has("QualityProfile")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "qualityProfileCell")) {
      cache.qualityProfileCell = notReportedIfEmpty(
        escapeHtml(row.QualityProfile ?? "")
      );
    }
    values.QualityProfile = cache.qualityProfileCell;
  }

  if (colSet.has("Tags")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "tagsCell")) {
      cache.tagsCell = notReportedIfEmpty(escapeHtml(row.Tags ?? ""));
    }
    values.Tags = cache.tagsCell;
  }

  if (colSet.has("ReleaseGroup")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "releaseGroupCell")) {
      cache.releaseGroupCell = notReportedIfEmpty(
        escapeHtml(row.ReleaseGroup ?? "")
      );
    }
    values.ReleaseGroup = cache.releaseGroupCell;
  }

  if (colSet.has("SeriesType")) {
    values.SeriesType = notReportedIfEmpty(formatSeriesType(row.SeriesType ?? ""));
  }

  if (colSet.has("OriginalLanguage")) {
    values.OriginalLanguage = notReportedIfEmpty(
      formatSeriesLanguage(row.OriginalLanguage ?? "")
    );
  }

  if (colSet.has("Genres")) {
    values.Genres = notReportedIfEmpty(formatSeriesGenres(row.Genres ?? ""));
  }

  if (colSet.has("Studio")) {
    values.Studio = notReportedIfEmpty(escapeHtml(row.Studio ?? ""));
  }

  if (colSet.has("HasFile")) {
    values.HasFile = formatOptionalBool(row.HasFile);
  }

  if (colSet.has("IsAvailable")) {
    values.IsAvailable = formatOptionalBool(row.IsAvailable);
  }

  if (colSet.has("InCinemas")) {
    values.InCinemas = notReportedIfEmpty(formatSeriesDate(row.InCinemas ?? ""));
  }

  if (colSet.has("LastSearchTime")) {
    values.LastSearchTime = notReportedIfEmpty(
      formatDateTimeValue(row.LastSearchTime ?? "")
    );
  }

  if (colSet.has("Edition")) {
    values.Edition = notReportedIfEmpty(escapeHtml(row.Edition ?? ""));
  }

  if (colSet.has("CustomFormats")) {
    values.CustomFormats = notReportedIfEmpty(
      formatCustomFormatsValue(row.CustomFormats ?? "")
    );
  }

  if (colSet.has("CustomFormatScore")) {
    values.CustomFormatScore = formatOptionalNumeric(
      row.CustomFormatScore ?? "",
      getNumericWidths(app, "CustomFormatScore")
    );
  }

  if (colSet.has("QualityCutoffNotMet")) {
    values.QualityCutoffNotMet = formatOptionalBool(row.QualityCutoffNotMet);
  }

  if (colSet.has("Languages")) {
    values.Languages = notReportedIfEmpty(formatLanguagesValue(row.Languages ?? ""));
  }

  if (colSet.has("LastAired")) {
    values.LastAired = notReportedIfEmpty(formatSeriesDate(row.LastAired ?? ""));
  }

  if (colSet.has("MissingCount")) {
    if (app === "radarr") {
      const raw = row.MissingCount;
      const boolValue = raw === "" || raw === null || raw === undefined
        ? false
        : Boolean(raw);
      values.MissingCount = formatBoolValue(boolValue);
    } else if (row.MissingCount === "" || row.MissingCount === null || row.MissingCount === undefined) {
      values.MissingCount = NOT_REPORTED_HTML;
    } else {
      values.MissingCount = formatNumericCell(
        row.MissingCount ?? "",
        getNumericWidths(app, "MissingCount")
      );
    }
  }

  if (colSet.has("CutoffUnmetCount")) {
    if (app === "radarr") {
      const raw = row.CutoffUnmetCount;
      const boolValue = raw === "" || raw === null || raw === undefined
        ? false
        : Boolean(raw);
      values.CutoffUnmetCount = formatBoolValue(boolValue);
    } else if (row.CutoffUnmetCount === "" || row.CutoffUnmetCount === null || row.CutoffUnmetCount === undefined) {
      values.CutoffUnmetCount = NOT_REPORTED_HTML;
    } else {
      values.CutoffUnmetCount = formatNumericCell(
        row.CutoffUnmetCount ?? "",
        getNumericWidths(app, "CutoffUnmetCount")
      );
    }
  }

  if (colSet.has("AudioLanguages")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "audioLanguagesCell")) {
      const rawAudioLanguages = row.AudioLanguages ?? "";
      const fullAudioLanguages = row.AudioLanguagesAll ?? "";
      cache.audioLanguagesCell = (rawAudioLanguages || row.AudioLanguagesMixed || fullAudioLanguages)
        ? formatLanguageValue(rawAudioLanguages, row.AudioLanguagesMixed, {
          allowToggle: true,
          fullValue: fullAudioLanguages,
        })
        : NOT_REPORTED_HTML;
    }
    values.AudioLanguages = cache.audioLanguagesCell;
  }

  if (colSet.has("SubtitleLanguages")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "subtitleLanguagesCell")) {
      const rawSubtitleLanguages = row.SubtitleLanguages ?? "";
      const fullSubtitleLanguages = row.SubtitleLanguagesAll ?? "";
      cache.subtitleLanguagesCell = (rawSubtitleLanguages || row.SubtitleLanguagesMixed || fullSubtitleLanguages)
        ? formatLanguageValue(rawSubtitleLanguages, row.SubtitleLanguagesMixed, {
          allowToggle: true,
          fullValue: fullSubtitleLanguages,
        })
        : NOT_REPORTED_HTML;
    }
    values.SubtitleLanguages = cache.subtitleLanguagesCell;
  }

  if (colSet.has("TitleSlug")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "titleSlugCell")) {
      const slug = row.TitleSlug ?? row.titleSlug ?? sonarrSlugFromTitle(row.Title);
      cache.titleSlugCell = notReportedIfEmpty(escapeHtml(slug ?? ""));
    }
    values.TitleSlug = cache.titleSlugCell;
  }

  if (colSet.has("TmdbId")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "tmdbIdCell")) {
      cache.tmdbIdCell = notReportedIfEmpty(
        escapeHtml(row.TmdbId ?? row.tmdbId ?? "")
      );
    }
    values.TmdbId = cache.tmdbIdCell;
  }

  if (colSet.has("AudioCodecMixed")) {
    values.AudioCodecMixed = formatOptionalBool(row.AudioCodecMixed);
  }
  if (colSet.has("AudioLanguagesMixed")) {
    values.AudioLanguagesMixed = formatOptionalBool(row.AudioLanguagesMixed);
  }
  if (colSet.has("SubtitleLanguagesMixed")) {
    values.SubtitleLanguagesMixed = formatOptionalBool(row.SubtitleLanguagesMixed);
  }

  if (colSet.has("VideoHDR")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "videoHdrCell")) {
      cache.videoHdrCell = formatVideoHdrValue(row.VideoHDR);
    }
    values.VideoHDR = cache.videoHdrCell;
  }

  if (colSet.has("Diagnostics") && playbackSupportsDiagnostics) {
    values.Diagnostics = DIAG_BUTTON_HTML;
  }

  const needsTautulliStats = colSet.has("PlayCount") ||
    colSet.has("LastWatched") ||
    colSet.has("DaysSinceWatched") ||
    colSet.has("TotalWatchTimeHours") ||
    colSet.has("WatchContentRatio") ||
    colSet.has("UsersWatched");
  if (needsTautulliStats) {
    const tautulliMatched = row.TautulliMatched === true;
    const notReported = `<span class="muted" title="${escapeHtml(t("Not reported"))}">${escapeHtml(t("n/a"))}</span>`;
    const noWatchData = `<span class="muted" title="${escapeHtml(t("No watch data"))}">${escapeHtml(t("n/a"))}</span>`;
    const noRuntime = `<span class="muted" title="${escapeHtml(t("No runtime"))}">${escapeHtml(t("n/a"))}</span>`;

    if (colSet.has("PlayCount")) {
      values.PlayCount = tautulliMatched
        ? formatNumericCell(row.PlayCount ?? 0, getNumericWidths(app, "PlayCount"))
        : notReported;
    }
    if (colSet.has("LastWatched")) {
      values.LastWatched = tautulliMatched
        ? formatLastWatched(row.LastWatched)
        : notReported;
    }
    if (colSet.has("DaysSinceWatched")) {
      values.DaysSinceWatched = tautulliMatched
        ? formatDaysSince(row.DaysSinceWatched, row.LastWatched, getNumericWidths(app, "DaysSinceWatched"))
        : notReported;
    }
    if (colSet.has("TotalWatchTimeHours")) {
      values.TotalWatchTimeHours = tautulliMatched
        ? formatWatchTimeHours(row.TotalWatchTimeHours ?? 0)
        : notReported;
    }
    if (colSet.has("WatchContentRatio")) {
      if (tautulliMatched) {
        const watchContentValue = formatWatchContentHours(
          row.TotalWatchTimeHours ?? 0,
          row.ContentHours
        );
        values.WatchContentRatio = watchContentValue || noRuntime;
      } else {
        values.WatchContentRatio = noWatchData;
      }
    }
    if (colSet.has("UsersWatched")) {
      values.UsersWatched = tautulliMatched
        ? formatNumericCell(row.UsersWatched ?? 0, getNumericWidths(app, "UsersWatched"))
        : notReported;
    }
  }

  return values;
}

function buildRow(row, app, options = {}) {
  const tr = document.createElement("tr");
  tr.dataset.rowKey = row.__sortarrKey || buildRowKey(row, app);
  tr.dataset.app = app;
  if (app === "sonarr") {
    const seriesKey = getSonarrSeriesKeyFromRow(row);
    if (seriesKey) {
      tr.dataset.seriesKey = seriesKey;
    }
  }
  tr.__sortarrRow = row;
  const displayCache = getDisplayCache(row);
  const isColumnVisible = options.isColumnVisible || (() => true);
  if (displayCache.titleLinkApp !== app || !Object.prototype.hasOwnProperty.call(displayCache, "titleLink")) {
    displayCache.titleLink = buildTitleLink(row, app);
    displayCache.titleLinkApp = app;
  }
  const audioCodecState = resolveDisplayCacheValue(
    row,
    app,
    "AudioCodec",
    displayCache,
    isColumnVisible("AudioCodec")
  );
  const contentHoursState = resolveDisplayCacheValue(
    row,
    app,
    "ContentHours",
    displayCache,
    isColumnVisible("ContentHours")
  );
  const videoQualityState = resolveDisplayCacheValue(
    row,
    app,
    "VideoQuality",
    displayCache,
    isColumnVisible("VideoQuality")
  );
  const resolutionState = resolveDisplayCacheValue(
    row,
    app,
    "Resolution",
    displayCache,
    isColumnVisible("Resolution")
  );
  const videoCodecState = resolveDisplayCacheValue(
    row,
    app,
    "VideoCodec",
    displayCache,
    isColumnVisible("VideoCodec")
  );
  const audioChannelsState = resolveDisplayCacheValue(
    row,
    app,
    "AudioChannels",
    displayCache,
    isColumnVisible("AudioChannels")
  );
  const pathState = resolveDisplayCacheValue(
    row,
    app,
    "Path",
    displayCache,
    isColumnVisible("Path")
  );
  const rootFolderState = resolveDisplayCacheValue(
    row,
    app,
    "RootFolder",
    displayCache,
    isColumnVisible("RootFolder")
  );
  const audioCodec = audioCodecState.value;
  const contentHours = contentHoursState.value;
  const titleLink = displayCache.titleLink;
  const matchOrb = buildMatchOrb(row);
  const seriesExpander = app === "sonarr" ? buildSeriesExpanderButton(row) : "";
  const historyButton = app === "radarr" ? buildHistoryButton(row, app) : "";
  const titleCell = `${seriesExpander}<span class="title-control-wrap">${ROW_REFRESH_BUTTON_HTML}${historyButton}</span><span class="title-orb-wrap">${matchOrb}${titleLink}</span>`;
  const dateAdded = formatDateAdded(row.DateAdded);
  const videoQuality = videoQualityState.value;
  const resolution = resolutionState.value;
  const videoCodec = videoCodecState.value;
  const audioChannels = audioChannelsState.value;
  const rowPath = pathState.value;
  const rootFolder = rootFolderState.value;
  const bitrateCell = formatBitrateCell(row, app);
  const audioCodecAttr = audioCodecState.lazy ? ' data-lazy-value="1"' : "";
  const contentHoursAttr = contentHoursState.lazy ? ' data-lazy-value="1"' : "";
  const videoQualityAttr = videoQualityState.lazy ? ' data-lazy-value="1"' : "";
  const resolutionAttr = resolutionState.lazy ? ' data-lazy-value="1"' : "";
  const videoCodecAttr = videoCodecState.lazy ? ' data-lazy-value="1"' : "";
  const audioChannelsAttr = audioChannelsState.lazy ? ' data-lazy-value="1"' : "";
  const pathAttr = pathState.lazy ? ' data-lazy-value="1"' : "";
  const rootFolderAttr = rootFolderState.lazy ? ' data-lazy-value="1"' : "";
  const deferredColumns = options.deferredColumns;
  const visibleHeavyColumns = options.visibleHeavyColumns || LAZY_COLUMNS_ARRAY;
  const heavyValues = visibleHeavyColumns.length
    ? computeHeavyCellValues(row, app, visibleHeavyColumns)
    : {};
  const instanceName = heavyValues.Instance ?? "";
  const status = heavyValues.Status ?? "";
  const monitored = heavyValues.Monitored ?? "";
  const qualityProfile = heavyValues.QualityProfile ?? "";
  const tags = heavyValues.Tags ?? "";
  const releaseGroup = heavyValues.ReleaseGroup ?? "";
  const seriesType = heavyValues.SeriesType ?? "";
  const originalLanguage = heavyValues.OriginalLanguage ?? "";
  const genres = heavyValues.Genres ?? "";
  const lastAired = heavyValues.LastAired ?? "";
  const missingCount = heavyValues.MissingCount ?? "";
  const cutoffUnmetCount = heavyValues.CutoffUnmetCount ?? "";
  const studio = heavyValues.Studio ?? "";
  const hasFile = heavyValues.HasFile ?? "";
  const isAvailable = heavyValues.IsAvailable ?? "";
  const inCinemas = heavyValues.InCinemas ?? "";
  const lastSearchTime = heavyValues.LastSearchTime ?? "";
  const edition = heavyValues.Edition ?? "";
  const customFormats = heavyValues.CustomFormats ?? "";
  const customFormatScore = heavyValues.CustomFormatScore ?? "";
  const qualityCutoffNotMet = heavyValues.QualityCutoffNotMet ?? "";
  const languages = heavyValues.Languages ?? "";
  const audioLanguages = heavyValues.AudioLanguages ?? "";
  const subtitleLanguages = heavyValues.SubtitleLanguages ?? "";
  const playCount = heavyValues.PlayCount ?? "";
  const lastWatched = heavyValues.LastWatched ?? "";
  const daysSinceWatched = heavyValues.DaysSinceWatched ?? "";
  const watchTimeHours = heavyValues.TotalWatchTimeHours ?? "";
  const watchContentHours = heavyValues.WatchContentRatio ?? "";
  const usersWatched = heavyValues.UsersWatched ?? "";
  const titleSlug = heavyValues.TitleSlug ?? "";
  const tmdbId = heavyValues.TmdbId ?? "";
  const audioCodecMixed = heavyValues.AudioCodecMixed ?? "";
  const audioLanguagesMixed = heavyValues.AudioLanguagesMixed ?? "";
  const subtitleLanguagesMixed = heavyValues.SubtitleLanguagesMixed ?? "";
  const diagButton = heavyValues.Diagnostics ?? "";
  const videoHdr = heavyValues.VideoHDR ?? "";
  const episodesCounted = formatNumericCell(
    row.EpisodesCounted ?? "",
    getNumericWidths(app, "EpisodesCounted")
  );
  const seasonCount = formatNumericCell(
    row.SeasonCount ?? "",
    getNumericWidths(app, "SeasonCount")
  );
  const avgEpisodeSize = formatNumericCell(
    row.AvgEpisodeSizeGB ?? "",
    getNumericWidths(app, "AvgEpisodeSizeGB")
  );
  const totalSizeRaw = row.TotalSizeGB;
  const totalSize = (() => {
    if (totalSizeRaw == null || totalSizeRaw === "") return "";
    const num = Number(totalSizeRaw);
    const text = Number.isFinite(num) ? num.toFixed(2) : String(totalSizeRaw);
    return escapeHtml(text);
  })();
  const runtimeMinsRaw = formatRuntimeMinutes(row.RuntimeMins);
  const runtimeMins = runtimeMinsRaw || `<span class="muted" title="${escapeHtml(t("No runtime"))}">${escapeHtml(t("n/a"))}</span>`;
  const fileSize = formatNumericCell(
    row.FileSizeGB ?? "",
    getNumericWidths(app, "FileSizeGB")
  );
  const gbPerHour = formatNumericCell(
    row.GBPerHour ?? "",
    getNumericWidths(app, "GBPerHour")
  );

  if (row.TautulliMatchStatus === "unmatched") {
    tr.classList.add("row-mismatch");
  }
  if (deferredColumns && deferredColumns.size) {
    tr.dataset.lazy = "1";
    tr.__sortarrDeferredCols = Array.from(deferredColumns);
  }

  if (app === "sonarr") {
    tr.innerHTML = `
    <td data-col="Title">${titleCell}</td>
    <td data-col="DateAdded">${dateAdded}</td>
    <td data-col="Instance">${instanceName}</td>
    <td data-col="SeriesType" data-app="sonarr">${seriesType}</td>
    <td data-col="Studio" data-app="sonarr">${studio}</td>
    <td data-col="OriginalLanguage" data-app="sonarr">${originalLanguage}</td>
    <td data-col="Genres" data-app="sonarr">${genres}</td>
    <td data-col="LastAired" data-app="sonarr">${lastAired}</td>
    <td class="right" data-col="MissingCount" data-app="sonarr">${missingCount}</td>
    <td class="right" data-col="CutoffUnmetCount" data-app="sonarr">${cutoffUnmetCount}</td>
    <td class="right" data-col="ContentHours" data-app="sonarr" ${contentHoursAttr}>${contentHours}</td>
    <td class="right" data-col="EpisodesCounted" data-app="sonarr">${episodesCounted}</td>
    <td class="right" data-col="SeasonCount" data-app="sonarr">${seasonCount}</td>
    <td class="right" data-col="AvgEpisodeSizeGB" data-app="sonarr">${avgEpisodeSize}</td>
    <td data-col="TotalSizeGB" data-app="sonarr">${totalSize}</td>
    <td class="right" data-col="GBPerHour" data-app="sonarr">${gbPerHour}</td>
    <td class="right" data-col="BitrateMbps" data-app="sonarr">${bitrateCell}</td>
    <td data-col="Status">${status}</td>
    <td data-col="Monitored">${monitored}</td>
    <td data-col="Tags">${tags}</td>
    <td data-col="ReleaseGroup">${releaseGroup}</td>
    <td data-col="QualityProfile">${qualityProfile}</td>
    <td data-col="VideoQuality" ${videoQualityAttr}>${videoQuality}</td>
    <td data-col="Resolution" ${resolutionAttr}>${resolution}</td>
    <td data-col="VideoCodec" ${videoCodecAttr}>${videoCodec}</td>
    <td data-col="VideoHDR">${videoHdr}</td>
    <td data-col="AudioCodec" ${audioCodecAttr}>${audioCodec}</td>
    <td data-col="AudioChannels" ${audioChannelsAttr}>${audioChannels}</td>
    <td data-col="AudioLanguages">${audioLanguages}</td>
    <td data-col="SubtitleLanguages">${subtitleLanguages}</td>
    <td class="diag-cell" data-col="Diagnostics">${diagButton}</td>
    <td class="right" data-col="PlayCount">${playCount}</td>
    <td data-col="LastWatched">${lastWatched}</td>
    <td class="right" data-col="DaysSinceWatched">${daysSinceWatched}</td>
    <td class="right" data-col="TotalWatchTimeHours">${watchTimeHours}</td>
    <td class="right" data-col="WatchContentRatio">${watchContentHours}</td>
    <td class="right" data-col="UsersWatched">${usersWatched}</td>
    <td data-col="TitleSlug" data-app="sonarr">${titleSlug}</td>
    <td data-col="TmdbId">${tmdbId}</td>
    <td data-col="AudioCodecMixed">${audioCodecMixed}</td>
    <td data-col="AudioLanguagesMixed">${audioLanguagesMixed}</td>
    <td data-col="SubtitleLanguagesMixed">${subtitleLanguagesMixed}</td>
    <td data-col="RootFolder" ${rootFolderAttr}>${rootFolder}</td>
    <td data-col="Path" ${pathAttr}>${rowPath}</td>
  `;
  } else {
    tr.innerHTML = `
    <td data-col="Title">${titleCell}</td>
    <td data-col="DateAdded">${dateAdded}</td>
    <td data-col="Instance">${instanceName}</td>
    <td class="right" data-col="RuntimeMins" data-app="radarr">${runtimeMins}</td>
    <td class="right" data-col="FileSizeGB" data-app="radarr">${fileSize}</td>
    <td class="right" data-col="GBPerHour" data-app="radarr">${gbPerHour}</td>
    <td class="right" data-col="BitrateMbps" data-app="radarr">${bitrateCell}</td>
    <td data-col="Status">${status}</td>
    <td data-col="Monitored">${monitored}</td>
    <td data-col="Tags">${tags}</td>
    <td data-col="ReleaseGroup">${releaseGroup}</td>
    <td data-col="QualityProfile">${qualityProfile}</td>
    <td data-col="Studio" data-app="radarr">${studio}</td>
    <td data-col="OriginalLanguage" data-app="radarr">${originalLanguage}</td>
    <td data-col="Genres" data-app="radarr">${genres}</td>
    <td class="right" data-col="MissingCount" data-app="radarr">${missingCount}</td>
    <td class="right" data-col="CutoffUnmetCount" data-app="radarr">${cutoffUnmetCount}</td>
    <td data-col="HasFile" data-app="radarr">${hasFile}</td>
    <td data-col="IsAvailable" data-app="radarr">${isAvailable}</td>
    <td data-col="InCinemas" data-app="radarr">${inCinemas}</td>
    <td data-col="LastSearchTime" data-app="radarr">${lastSearchTime}</td>
    <td data-col="Edition" data-app="radarr">${edition}</td>
    <td data-col="CustomFormats" data-app="radarr">${customFormats}</td>
    <td class="right" data-col="CustomFormatScore" data-app="radarr">${customFormatScore}</td>
    <td data-col="QualityCutoffNotMet" data-app="radarr">${qualityCutoffNotMet}</td>
    <td data-col="Languages" data-app="radarr">${languages}</td>
    <td data-col="VideoQuality" ${videoQualityAttr}>${videoQuality}</td>
    <td data-col="Resolution" ${resolutionAttr}>${resolution}</td>
    <td data-col="VideoCodec" ${videoCodecAttr}>${videoCodec}</td>
    <td data-col="VideoHDR">${videoHdr}</td>
    <td data-col="AudioCodec" ${audioCodecAttr}>${audioCodec}</td>
    <td data-col="AudioChannels" ${audioChannelsAttr}>${audioChannels}</td>
    <td data-col="SubtitleLanguages">${subtitleLanguages}</td>
    <td class="diag-cell" data-col="Diagnostics">${diagButton}</td>
    <td class="right" data-col="PlayCount">${playCount}</td>
    <td data-col="LastWatched">${lastWatched}</td>
    <td class="right" data-col="DaysSinceWatched">${daysSinceWatched}</td>
    <td class="right" data-col="TotalWatchTimeHours">${watchTimeHours}</td>
    <td class="right" data-col="WatchContentRatio">${watchContentHours}</td>
    <td class="right" data-col="UsersWatched">${usersWatched}</td>
    <td data-col="TmdbId">${tmdbId}</td>
    <td data-col="AudioCodecMixed">${audioCodecMixed}</td>
    <td data-col="AudioLanguagesMixed">${audioLanguagesMixed}</td>
    <td data-col="SubtitleLanguagesMixed">${subtitleLanguagesMixed}</td>
    <td data-col="RootFolder" ${rootFolderAttr}>${rootFolder}</td>
    <td data-col="Path" ${pathAttr}>${rowPath}</td>
  `;
  }

  requestAnimationFrame(() => {
    tr.querySelectorAll('td[data-col="TitleSlug"]').forEach(td => {
      const slug = (td.textContent || "").trim();
      td.removeAttribute("title");
      if (slug && td.scrollWidth > td.clientWidth) td.title = slug;
    });
  });

  if (columnWidthLock.active && columnWidthLock.widths.size) {
    columnWidthLock.widths.forEach((width, col) => {
      if (!col || col === "Title") return;
      const cell = tr.querySelector(`td[data-col="${col}"]`);
      if (!cell) return;
      const widthPx = `${width}px`;
      cell.style.width = widthPx;
      cell.style.minWidth = widthPx;
      cell.style.maxWidth = widthPx;
    });
  }

  return tr;
}

function hydrateDeferredCells(tr) {
  if (!tr || tr.dataset.lazy !== "1") return false;
  const deferredCols = tr.__sortarrDeferredCols;
  if (!deferredCols || !deferredCols.length) {
    tr.dataset.lazy = "";
    return false;
  }
  const row = tr.__sortarrRow;
  if (!row) return false;
  const app = tr.dataset.app;
  const values = computeHeavyCellValues(row, app, deferredCols);
  deferredCols.forEach(col => {
    const cell = tr.querySelector(`td[data-col="${col}"]`);
    if (!cell) return;
    const value = values[col];
    if (value !== undefined) {
      cell.innerHTML = value;
    }
  });
  tr.dataset.lazy = "";
  tr.__sortarrDeferredCols = null;
  return true;
}

function queueHydration(rows, token, perf = null) {
  if (!rows || !rows.length) return;
  if (token !== renderToken) {
    unlockColumnWidths(token);
    return;
  }
  if (hydrationState.token !== token) {
    hydrationState.token = token;
    hydrationState.app = rows[0]?.dataset?.app || activeApp;
    hydrationState.rows = rows.slice();
    hydrationState.index = 0;
    hydrationState.perf = perf;
  } else {
    hydrationState.rows = hydrationState.rows.concat(rows);
    if (!hydrationState.app && rows[0]?.dataset?.app) {
      hydrationState.app = rows[0].dataset.app;
    }
  }
  if (hydrationState.scheduled) return;
  hydrationState.scheduled = true;
  if (!firstPaintSettled) {
    if (hydrationState.deferTimer) return;
    hydrationState.deferTimer = window.setTimeout(() => {
      hydrationState.deferTimer = null;
      requestAnimationFrame(runHydrationPass);
    }, STARTUP_HYDRATE_DELAY_MS);
    return;
  }
  requestAnimationFrame(runHydrationPass);
}

function runHydrationPass() {
  hydrationState.scheduled = false;
  if (hydrationState.deferTimer) {
    window.clearTimeout(hydrationState.deferTimer);
    hydrationState.deferTimer = null;
  }
  if (hydrationState.token !== renderToken) {
    hydrationState.rows = [];
    hydrationState.app = "";
    hydrationState.index = 0;
    hydrationState.perf = null;
    unlockColumnWidths(hydrationState.token);
    return;
  }
  if (hydrationState.index === 0) {
    noteHydrateStart(hydrationState.perf);
  }
  const app = hydrationState.app || activeApp;
  const startupMode = !firstPaintSettled;
  const batchSize = startupMode
    ? (app === "radarr" ? STARTUP_RADARR_LAZY_CELL_BATCH_SIZE : STARTUP_LAZY_CELL_BATCH_SIZE)
    : (app === "radarr" ? RADARR_LAZY_CELL_BATCH_SIZE : LAZY_CELL_BATCH_SIZE);
  const frameBudget = startupMode
    ? (app === "radarr" ? STARTUP_RADARR_HYDRATE_FRAME_BUDGET_MS : STARTUP_HYDRATE_FRAME_BUDGET_MS)
    : (app === "radarr" ? RADARR_HYDRATE_FRAME_BUDGET_MS : HYDRATE_FRAME_BUDGET_MS);
  const start = perfNow();
  const total = hydrationState.rows.length;
  let processed = 0;
  while (hydrationState.index < total) {
    const tr = hydrationState.rows[hydrationState.index];
    hydrationState.index += 1;
    processed += 1;
    if (tr && tr.dataset.lazy === "1") {
      hydrateDeferredCells(tr);
    }
    if (processed >= batchSize && (perfNow() - start) >= frameBudget) {
      break;
    }
  }
  if (hydrationState.index < total) {
    hydrationState.scheduled = true;
    requestAnimationFrame(runHydrationPass);
    return;
  }
  noteHydrateEnd(hydrationState.perf);
  hydrationState.rows = [];
  hydrationState.app = "";
  hydrationState.index = 0;
  hydrationState.perf = null;
}

function getRowElement(row, app, options = {}) {
  const key = row.__sortarrKey || buildRowKey(row, app);
  const cache = rowCacheByApp[app];
  const perf = options.perf;
  const existing = cache.get(key);
  if (perf) {
    if (existing) {
      perf.cacheHits += 1;
    } else {
      perf.cacheMisses += 1;
    }
  }
  if (existing) {
    if (existing.dataset.lazy === "1" && options.lazyRows) {
      options.lazyRows.push(existing);
    } else if (!options.lazyRows && existing.dataset.lazy === "1") {
      hydrateDeferredCells(existing);
    }
    return existing;
  }
  const tr = buildRow(row, app, options);
  cache.set(key, tr);
  if (options.deferredColumns && options.lazyRows && tr.dataset.lazy === "1") {
    options.lazyRows.push(tr);
  }
  return tr;
}



function syncRowWidthLock(tr) {
  if (!tr) return;
  const currentToken = columnWidthLock && columnWidthLock.active ? (columnWidthLock.token || 0) : 0;
  const prevToken = tr.__sortarrWidthToken || 0;
  if (currentToken === prevToken) return;

  // If a lock is active, ensure this row's cells match the locked widths.
  if (currentToken && columnWidthLock && columnWidthLock.widths && columnWidthLock.widths.size) {
    columnWidthLock.widths.forEach((width, col) => {
      if (!col || col === "Title") return;
      const cell = tr.querySelector(`td[data-col="${col}"]`);
      if (!cell) return;
      const widthPx = `${width}px`;
      cell.style.width = widthPx;
      cell.style.minWidth = widthPx;
      cell.style.maxWidth = widthPx;
    });
  } else if (prevToken) {
    // No lock active anymore, clear stale inline widths from prior locks.
    try {
      tr.querySelectorAll("td").forEach(td => {
        td.style.width = "";
        td.style.minWidth = "";
        td.style.maxWidth = "";
      });
    } catch { }
  }

  tr.__sortarrWidthToken = currentToken;
}


// Virtualized main table body (Phase 1)
// Note: Uses top/bottom spacer rows to preserve scroll height and keeps DOM bounded.
const VIRTUAL_MIN_ROWS = 800;
const SONARR_VIRTUAL_MIN_ROWS = 250;
const VIRTUAL_OVERSCAN_ROWS = 8; // Render overscan rows above/below viewport (keeps scroll smooth)
const VIRTUAL_OVERSCAN_ROWS_IOS = 4;
const VIRTUAL_HYDRATION_OVERSCAN_ROWS = 12; // Extra rows to pre-hydrate offscreen (reduces visible "pop-in")
const VIRTUAL_HYDRATION_OVERSCAN_ROWS_IOS = 4;
const VIRTUAL_ROW_CACHE_MULTIPLIER = 5; // LRU cap = pool * multiplier
const VIRTUAL_ROW_CACHE_MULTIPLIER_IOS = 3;

const virtualStateByApp = { sonarr: null, radarr: null };

function getTableColumnCount() {
  const thead = document.querySelector("table thead");
  if (!thead) return 1;
  const ths = thead.querySelectorAll("th");
  return Math.max(1, ths.length);
}

function makeSpacerRow(colCount, className) {
  const tr = document.createElement("tr");
  tr.className = className || "virtual-spacer-row";
  const td = document.createElement("td");
  td.colSpan = colCount;
  td.className = "virtual-spacer-cell";
  td.style.height = "0px";
  tr.appendChild(td);
  return tr;
}

function getRowHeightOnce() {
  // Measure once from an existing row, otherwise fallback.
  try {
    const tr = tbody && tbody.querySelector("tr:not(.virtual-spacer-row):not(.series-child-row):not(.table-empty-row)");
    const h = tr ? tr.getBoundingClientRect().height : 0;
    if (h && Number.isFinite(h) && h > 10) return h;
  } catch { }
  return 34; // reasonable fallback
}

function lruGet(map, key) {
  const v = map.get(key);
  if (!v) return null;
  map.delete(key);
  map.set(key, v);
  return v;
}

function lruSet(map, key, value, max) {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > max) {
    const first = map.keys().next().value;
    map.delete(first);
  }
}

function teardownVirtual(app) {
  const state = virtualStateByApp[app];
  if (!state) return;
  try {
    if (state.onScroll) {
      tableWrapEl && tableWrapEl.removeEventListener("scroll", state.onScroll);
    }
    if (state.resizeObserver) {
      try { state.resizeObserver.disconnect(); } catch { }
    }
  } catch { }
  virtualStateByApp[app] = null;
}

function renderVirtualWindow(state) {
  if (!state || state.token !== renderToken) return;
  const wrap = tableWrapEl;
  if (!wrap || !tbody) return;

  const hasSonarrExpansions = state.app === "sonarr" && sonarrExpansionState.expandedSeries.size > 0;

  const scrollTop = wrap.scrollTop || 0;
  const height = wrap.clientHeight || 0;
  const rowHeight = state.rowHeight;
  const total = state.rows.length;
  if (!total) return;

  const visibleCount = Math.max(1, Math.ceil(height / rowHeight));
  // DOM window size (rendered rows): viewport rows + overscan on both sides.
  const poolSize = visibleCount + state.overscan * 2;
  // Hydration window size: we pre-hydrate additional rows beyond the rendered overscan so that
  // rows are already "filled" before they scroll into view (avoids visible pop-in/blinks).
  const hydrationOverscan = IS_IOS ? VIRTUAL_HYDRATION_OVERSCAN_ROWS_IOS : VIRTUAL_HYDRATION_OVERSCAN_ROWS;
  const hydratePoolSize = visibleCount + (state.overscan + hydrationOverscan) * 2;
  // Cache must be large enough to hold prebuilt + prehydrated rows without churn.
  const cacheMultiplier = IS_IOS ? VIRTUAL_ROW_CACHE_MULTIPLIER_IOS : VIRTUAL_ROW_CACHE_MULTIPLIER;
  const maxCache = Math.max(100, hydratePoolSize * cacheMultiplier);

  const expandedEntries = [];
  let totalExpandedHeight = 0;
  if (hasSonarrExpansions) {
    for (let i = 0; i < total; i += 1) {
      const row = state.rows[i];
      const seriesKey = row.__sortarrSeriesKey || (row.__sortarrSeriesKey = getSonarrSeriesKeyFromRow(row));
      if (!seriesKey || !sonarrExpansionState.expandedSeries.has(seriesKey)) continue;
      const h = getCachedSeriesExpansionHeight(seriesKey);
      expandedEntries.push({ index: i, height: h, seriesKey });
      totalExpandedHeight += h;
    }
  }

  const extraBeforeIndex = (index) => {
    if (!expandedEntries.length || index <= 0) return 0;
    let sum = 0;
    for (let i = 0; i < expandedEntries.length; i += 1) {
      const entry = expandedEntries[i];
      if (entry.index >= index) break;
      sum += entry.height;
    }
    return sum;
  };

  let start = Math.floor(scrollTop / rowHeight) - state.overscan;
  if (hasSonarrExpansions && expandedEntries.length) {
    let estimate = Math.max(0, start);
    for (let iter = 0; iter < 3; iter += 1) {
      const adjusted = Math.floor(Math.max(0, scrollTop - extraBeforeIndex(estimate)) / rowHeight) - state.overscan;
      const next = Math.max(0, adjusted);
      if (next === estimate) break;
      estimate = next;
    }
    start = estimate;
  }
  if (start < 0) start = 0;
  let end = start + poolSize;
  if (end > total) end = total;
  if (end < total && (end - start) < poolSize) {
    start = Math.max(0, end - poolSize);
  }

  // Hydration range extends beyond the rendered window.
  // We build rows into the cache and hydrate their deferred cells even if the rows are not in the DOM yet.
  // This makes scrolling feel instant because upcoming rows are already populated.
  let hydrateStart = start - hydrationOverscan;
  if (hydrateStart < 0) hydrateStart = 0;
  let hydrateEnd = end + hydrationOverscan;
  if (hydrateEnd > total) hydrateEnd = total;

  // Avoid churn if window unchanged.
  if (state.lastStart === start && state.lastEnd === end && state.lastColVisVer === columnVisibilityVersion) {
    return;
  }
  const prevColVisVer = state.lastColVisVer;
  state.lastStart = start;
  state.lastEnd = end;
  state.lastColVisVer = columnVisibilityVersion;

  const topPx = (start * rowHeight) + extraBeforeIndex(start);
  const bottomPx = ((total - end) * rowHeight) + (totalExpandedHeight - extraBeforeIndex(end));

  const topTd = state.topSpacer.firstElementChild;
  const bottomTd = state.bottomSpacer.firstElementChild;
  if (topTd) topTd.style.height = `${Math.max(0, topPx)}px`;
  if (bottomTd) bottomTd.style.height = `${Math.max(0, bottomPx)}px`;

  const frag = document.createDocumentFragment();
  frag.appendChild(state.topSpacer);

  const lazyRows = [];
  const lazySet = new Set();
  const colCount = getTableColumnCount();

  for (let i = start; i < end; i += 1) {
    const row = state.rows[i];
    const key = row.__sortarrKey || buildRowKey(row, state.app);
    let tr = lruGet(state.rowCache, key);
    if (!tr) {
      tr = buildRow(row, state.app, state.rowOptions);
    } else {
      // Patch minimal row pointer for handlers.
      tr.__sortarrRow = row;
    }
    syncRowWidthLock(tr);
    let rowSeriesKey = "";
    if (state.app === "sonarr") {
      rowSeriesKey = tr.dataset.seriesKey || row.__sortarrSeriesKey || (row.__sortarrSeriesKey = getSonarrSeriesKeyFromRow(row));
      const expanded = Boolean(rowSeriesKey && sonarrExpansionState.expandedSeries.has(rowSeriesKey));
      tr.classList.toggle("series-expanded", expanded);
      if (rowSeriesKey) {
        tr.dataset.seriesKey = rowSeriesKey;
      }
      const expander = tr.querySelector("button.series-expander");
      if (expander) {
        expander.setAttribute("aria-expanded", expanded ? "true" : "false");
        const icon = expander.querySelector("span");
        if (icon) icon.textContent = expanded ? "-" : "+";
      }
    }
    if (tr && tr.dataset && tr.dataset.lazy === "1" && !lazySet.has(tr)) { lazySet.add(tr); lazyRows.push(tr); }
    frag.appendChild(tr);
    lruSet(state.rowCache, key, tr, maxCache);
    if (state.app === "sonarr" && rowSeriesKey && sonarrExpansionState.expandedSeries.has(rowSeriesKey)) {
      const childRow = getCachedSeriesChildRow(rowSeriesKey, colCount);
      if (childRow) {
        frag.appendChild(childRow);
        requestAnimationFrame(() => cacheSeriesExpansionHeight(rowSeriesKey, childRow));
      }
    }
  }

  // Pre-warm and hydrate rows just outside the rendered window so they are ready before they appear.
  // This intentionally does NOT append rows to the DOM.
  if (hydrateStart < start || hydrateEnd > end) {
    for (let i = hydrateStart; i < hydrateEnd; i += 1) {
      if (i >= start && i < end) continue; // already built/handled above
      const row = state.rows[i];
      const key = row.__sortarrKey || buildRowKey(row, state.app);
      let tr = lruGet(state.rowCache, key);
      if (!tr) {
        tr = buildRow(row, state.app, state.rowOptions);
      } else {
        tr.__sortarrRow = row;
      }
      // Keep width lock state consistent so hydrated cells match locked widths when inserted.
      syncRowWidthLock(tr);
      if (tr && tr.dataset && tr.dataset.lazy === "1" && !lazySet.has(tr)) { lazySet.add(tr); lazyRows.push(tr); }
      lruSet(state.rowCache, key, tr, maxCache);
    }
  }

  frag.appendChild(state.bottomSpacer);

  // Apply current column visibility to any newly built/reused rows before they enter the DOM.
  // (Virtual windows can introduce brand new rows that have never had visibility classes applied.)
  updateColumnVisibility(frag);
  tbody.replaceChildren(frag);

  // Hydrate deferred (lazy) cells for the visible window AND an extended hydration overscan window.
  // Large datasets render rows in a light mode first; this fills in heavy columns without hydrating the entire table.
  if (lazyRows.length) {
    queueHydration(lazyRows, state.token, state.perf);
  }

  // If column visibility changed since the last virtual paint, ensure header + body stay in sync.
  if (prevColVisVer !== columnVisibilityVersion) {
    updateColumnVisibility(tbody);
  }

  // Update interaction classes after window render.
  finalizeTableInteractionState(state.app);

  // Perf overlay stats
  perfOverlayState.lastRowsTotal = total;
  perfOverlayState.lastRowsVisible = end - start;
  try {
    perfOverlayState.lastDomRows = tbody.querySelectorAll("tr").length;
    perfOverlayState.lastDomCells = tbody.querySelectorAll("td").length;
  } catch { }
  schedulePerfOverlayUpdate();
}

function enableVirtualRows(rows, app, rowOptions, token, perf) {
  teardownVirtual(app);
  if (!tbody || !tableWrapEl) return false;

  const colCount = getTableColumnCount();
  const topSpacer = makeSpacerRow(colCount, "virtual-spacer-row virtual-spacer-row--top");
  const bottomSpacer = makeSpacerRow(colCount, "virtual-spacer-row virtual-spacer-row--bottom");

  const state = {
    app,
    rows,
    rowOptions,
    token,
    perf,
    rowHeight: getRowHeightOnce(),
    overscan: IS_IOS ? VIRTUAL_OVERSCAN_ROWS_IOS : VIRTUAL_OVERSCAN_ROWS,
    topSpacer,
    bottomSpacer,
    rowCache: new Map(),
    lastStart: -1,
    lastEnd: -1,
    lastColVisVer: -1,
    scrollFrame: null,
    onScroll: null,
    resizeFrame: null,
    onResize: null,
    resizeObserver: null,
  };

  const onScroll = () => {
    if (state.scrollFrame) return;
    state.scrollFrame = requestAnimationFrame(() => {
      state.scrollFrame = null;
      renderVirtualWindow(state);
    });
  };
  state.onScroll = onScroll;
  tableWrapEl.addEventListener("scroll", onScroll, { passive: true });

  // Re-render when the scroll container size changes (chips/header transitions can change height after initial paint).
  const onResize = () => {
    if (state.resizeFrame) return;
    state.resizeFrame = requestAnimationFrame(() => {
      state.resizeFrame = null;
      renderVirtualWindow(state);
    });
  };
  state.onResize = onResize;
  if (typeof ResizeObserver !== "undefined") {
    try {
      state.resizeObserver = new ResizeObserver(() => onResize());
      state.resizeObserver.observe(tableWrapEl);
    } catch { }
  }

  // Initial paint
  tbody.replaceChildren(topSpacer, bottomSpacer);
  renderVirtualWindow(state);
  // In some layouts, the wrap height finalizes after this tick (chip/status transitions).
  requestAnimationFrame(() => renderVirtualWindow(state));
  setTimeout(() => renderVirtualWindow(state), 250);


  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (app === "radarr") {
    requestAnimationFrame(() => {
      const newH = getRowHeightOnce();
      if (newH && Math.abs(newH - state.rowHeight) > 1) {
        state.rowHeight = newH;
        renderVirtualWindow(state);
      }
    });

    setTimeout(() => {
      const newH = getRowHeightOnce();
      if (newH && Math.abs(newH - state.rowHeight) > 1) {
        state.rowHeight = newH;
        renderVirtualWindow(state);
      }
    }, 400);
  }

  // Finalize
  tableReadyByApp[app] = true;
  setChipsVisible(true);
  flushDeferredPrefetch();
  if (perf && !perf.renderEnd) {
    perf.renderEnd = perfNow();
  }
  if (perf) {
    perfOverlayState.lastRenderMs = perf.renderEnd && perf.renderStart ? (perf.renderEnd - perf.renderStart) : null;
  }
  finalizeRenderPerf(perf);
  if (!(rowOptions && rowOptions.skipWidthCacheUpdate === true)) cacheColumnWidths(app);
  applyColumnHeaderCaps();
  scheduleTitlePathWidthLock();
  scheduleTruncationTooltipUpdate();
  maybeStabilizeRender(app, { allowBatch: false });
  finalizeTableInteractionState(app);

  virtualStateByApp[app] = state;
  return true;
}

function renderBatch(rows, token, start, totalRows, totalAll, app, batchSize, options) {
  if (token !== renderToken) {
    unlockColumnWidths(token);
    return;
  }
  const perf = options ? options.perf : null;
  const holdWidthLock = options && options.holdWidthLock === true;
  const skipWidthCacheUpdate = options && options.skipWidthCacheUpdate === true;
  const frameCheckEvery = app === "radarr"
    ? RADARR_RENDER_FRAME_CHECK_EVERY
    : RENDER_FRAME_CHECK_EVERY;
  const frameBudget = app === "radarr"
    ? RADARR_RENDER_FRAME_BUDGET_MS
    : RENDER_FRAME_BUDGET_MS;
  const frag = document.createDocumentFragment();
  const frameStart = perfNow();
  let index = start;
  let processed = 0;
  while (index < rows.length && processed < batchSize) {
    frag.appendChild(getRowElement(rows[index], app, options));
    index += 1;
    processed += 1;
    if (processed % frameCheckEvery === 0 &&
      (perfNow() - frameStart) >= frameBudget) {
      break;
    }
  }
  updateColumnVisibility(frag);
  tbody.appendChild(frag);
  markStatusReadyFromRows(index);

  if (index < rows.length) {
    requestAnimationFrame(() => renderBatch(rows, token, index, totalRows, totalAll, app, batchSize, options));
    return;
  }

  if (token !== renderToken) return;
  setBatching(false);
  if (options &&
    options.columnVisibilityVersionAtStart !== undefined &&
    options.columnVisibilityVersionAtStart !== columnVisibilityVersion) {
    updateColumnVisibility(tbody);
    const visibleColumns = getVisibleDisplayColumns(activeApp, getHiddenColumns());
    visibleColumns.forEach(col => hydrateLazyDisplayCells(col, tbody));
  }
  normalizeSonarrRuntimeOrder(tbody);
  setStatus(t("statusLoadedCounts", "Loaded %(rows)s / %(total)s", { rows: totalRows, total: totalAll }));

  tableReadyByApp[app] = true;
  setChipsVisible(true);
  flushDeferredPrefetch();
  if (perf && !perf.renderEnd) {
    perf.renderEnd = perfNow();
  }
  if (options && options.lazyRows && options.lazyRows.length) {
    applyColumnHeaderCaps();
    scheduleTitlePathWidthLock();
    scheduleTruncationTooltipUpdate();
    queueHydration(options.lazyRows, token, perf);
    maybeStabilizeRender(app, options);
    if (!skipWidthCacheUpdate) cacheColumnWidths(app);
    finalizeTableInteractionState(app);
    return;
  }
  finalizeRenderPerf(perf);
  if (!skipWidthCacheUpdate) cacheColumnWidths(app);
  if (!holdWidthLock) {
    unlockColumnWidths(token);
  }
  applyColumnHeaderCaps();
  scheduleTitlePathWidthLock();
  scheduleTruncationTooltipUpdate();
  maybeStabilizeRender(app, options);
  finalizeTableInteractionState(app);
}


function renderZeroResultsState(totalCount) {
  if (!tbody || !hasActiveFilters()) {
    clearTable();
    return;
  }
  const summary = [];
  const chipTokens = String(chipQuery || "").split(/\s+/).filter(Boolean).map(formatFilterTokenLabel);
  if (chipTokens.length) {
    summary.push(`${t("chips", "chips")}: ${chipTokens.join(", ")}`);
  }
  const titleValue = String(titleFilter?.value || "").trim();
  if (titleValue) summary.push(`${t("Title", "Title")}: ${titleValue}`);
  const pathValue = String(pathFilter?.value || "").trim();
  if (pathValue) summary.push(`${t("Path", "Path")}: ${pathValue}`);
  const advancedValue = String(advancedFilter?.value || "").trim();
  if (advancedEnabled && advancedValue) summary.push(`${t("Advanced", "Advanced")}: ${advancedValue}`);

  const summaryHtml = summary.length
    ? summary.map(item => `<li>${escapeHtml(item)}</li>`).join("")
    : `<li>${escapeHtml(t("activeFiltersApplied", "Active filters applied"))}</li>`;

  tbody.innerHTML = `
    <tr class="table-empty-row">
      <td colspan="99">
        <div class="table-empty-state" role="status" aria-live="polite">
          <div class="table-empty-title">${escapeHtml(t("noResultsCurrentFilters", "No rows match the current filters"))}</div>
          <div class="table-empty-meta">${escapeHtml(t("statusLoadedCounts", "Loaded %(rows)s / %(total)s", { rows: 0, total: totalCount }))}</div>
          <ul class="table-empty-summary">${summaryHtml}</ul>
          <button type="button" class="table-empty-clear-btn" data-role="clear-active-filters">${escapeHtml(t("clearActiveFiltersAction", "Clear active filters"))}</button>
        </div>
      </td>
    </tr>`;
}
function render(data, options = {}) {
  const app = activeApp;
  if (app === "sonarr") {
    resetSonarrExpansionDisplayState();
  }
  applyColumnHeaderCaps();
  const filtered = applyFilters(data || []);
  const filterSig = getFilterSignature();
  const isPrimaryData = data === dataByApp[app];
  const dataVersion = isPrimaryData ? dataVersionByApp[app] : 0;
  ensureNumericColumnWidths(app, data, dataVersion, isPrimaryData);
  const skipWidthCacheUpdate = options.skipWidthCacheUpdate === true;
  let sorted = null;
  const sortCache = isPrimaryData ? sortCacheByApp[app] : null;
  if (sortCache &&
    sortCache.version === dataVersion &&
    sortCache.sortKey === sortKey &&
    sortCache.sortDir === sortDir &&
    sortCache.filterSig === filterSig) {
    sorted = sortCache.sorted;
  } else {
    sorted = sortData(filtered);
    if (isPrimaryData) {
      sortCacheByApp[app] = {
        version: dataVersion,
        sortKey,
        sortDir,
        filterSig,
        sorted,
      };
    }
  }
  const allowBatch = options.allowBatch !== false;
  const batchMin = getRenderBatchMin(app);
  const shouldBatch = allowBatch &&
    resolveRenderFlag("batch", app) &&
    sorted.length > batchMin;
  const existingRow = tbody ? tbody.querySelector("tr") : null;
  const existingApp = existingRow?.dataset?.app || "";
  if (existingRow && existingApp && existingApp !== app) {
    clearTable();
  }
  const hasWidthCache = columnWidthCacheVersionByApp[app] === columnVisibilityVersion &&
    columnWidthCacheByApp[app].size > 0;
  const tableReady = tableReadyByApp[app] === true;
  const widthLockAllowed = tbody &&
    resolveRenderFlag("widthLock", app) &&
    (hasWidthCache || (tableReady && tbody.children.length));
  const forceWidthLock = options.forceWidthLock === true;
  const shouldLock = widthLockAllowed &&
    (shouldBatch || hasWidthCache || forceWidthLock);
  const holdWidthLock = shouldLock && (app === "radarr" || app === "sonarr");
  const batchSize = sorted.length >= RENDER_BATCH_LARGE_MIN
    ? RENDER_BATCH_SIZE_LARGE
    : RENDER_BATCH_SIZE;
  const token = ++renderToken;
  const scrollAnchor = options.scrollAnchor || null;
  if (scrollAnchor) {
    scrollAnchor.renderToken = token;
    scrollAnchor.attempts = 0;
  }
  if (columnWidthLock.active && !shouldLock) {
    unlockColumnWidths();
  }
  if (shouldLock) {
    applyColumnHeaderCaps();
    lockColumnWidths(token);
  }
  const hiddenColumns = getHiddenColumns();
  const allowDeferred = resolveRenderFlag("deferHeavy", app);
  // Radarr large lists: render light rows first, hydrate heavy cells after.
  const forceMobileVirtual = IS_MOBILE && app === "radarr";
  const virtualizeRadarr = app === "radarr" &&
    resolveRenderFlag("virtualize", app) &&
    (forceMobileVirtual || sorted.length >= RADARR_VIRTUAL_MIN_ROWS);
  const deferredColumns = allowDeferred
    ? getDeferredColumns(app, hiddenColumns, { virtualize: virtualizeRadarr })
    : new Set();
  const useDeferred = allowDeferred && deferredColumns.size > 0;
  const visibleHeavyColumns = allowDeferred
    ? LAZY_COLUMNS_ARRAY.filter(
      col => !isColumnHidden(col, app, hiddenColumns) && !deferredColumns.has(col)
    )
    : LAZY_COLUMNS_ARRAY;
  const isColumnVisible = col => !isColumnHidden(col, app, hiddenColumns);
  const columnVisibilityVersionAtStart = columnVisibilityVersion;
  const perf = startRenderPerf({
    app,
    totalRows: (data || []).length,
    filteredRows: sorted.length,
    shouldBatch,
    useDeferred: Boolean(useDeferred),
  });
  const rowOptions = useDeferred
    ? {
      deferredColumns,
      visibleHeavyColumns,
      isColumnVisible,
      columnVisibilityVersionAtStart,
      lazyRows: [],
      perf,
      holdWidthLock,
      skipWidthCacheUpdate,
    }
    : {
      visibleHeavyColumns,
      isColumnVisible,
      columnVisibilityVersionAtStart,
      lazyRows: [],
      perf,
      holdWidthLock,
      skipWidthCacheUpdate,
    };
  setBatching(shouldBatch);

  const virtualizeRows = !options.disableVirtualRows &&
    resolveRenderFlag("virtualRows", app) &&
    (
      app === "radarr"
        ? (forceMobileVirtual || sorted.length >= VIRTUAL_MIN_ROWS)
        : app === "sonarr"
          ? sorted.length >= SONARR_VIRTUAL_MIN_ROWS
          : false
    );
  if (virtualizeRows) {
    const ok = enableVirtualRows(sorted, app, rowOptions, token, perf);
    if (ok) {
      markStatusReadyFromRows(sorted.length);
      setStatus(
        t(
          "statusLoadedCounts",
          "Loaded %(rows)s / %(total)s",
          { rows: sorted.length, total: (data || []).length }
        )
      );

      if (!holdWidthLock) {
        unlockColumnWidths(token);
      }
      return;
    }
  }

  if (!sorted.length) {
    renderZeroResultsState(data.length);
    setBatching(false);
    setStatus(
      t("statusLoadedCounts", "Loaded %(rows)s / %(total)s", { rows: 0, total: data.length })
    );
    updateColumnVisibility();
    normalizeSonarrRuntimeOrder();
    tableReadyByApp[app] = true;
    setChipsVisible(true);
    flushDeferredPrefetch();
    if (scrollAnchor) {
      scheduleScrollAnchorRestore(scrollAnchor, token);
    }
    if (perf && !perf.renderEnd) {
      perf.renderEnd = perfNow();
    }
    finalizeRenderPerf(perf);
    if (!(rowOptions && rowOptions.skipWidthCacheUpdate === true)) cacheColumnWidths(app);
    if (!holdWidthLock) {
      unlockColumnWidths(token);
    }
    applyColumnHeaderCaps();
    scheduleTitlePathWidthLock();
    scheduleTruncationTooltipUpdate();
    maybeStabilizeRender(app, options);
    finalizeTableInteractionState(app);
    return;
  }

  if (!shouldBatch) {
    markStatusReadyFromRows(sorted.length);
    const frag = document.createDocumentFragment();
    for (const row of sorted) {
      frag.appendChild(getRowElement(row, app, rowOptions));
    }
    tbody.replaceChildren(frag);
    if (scrollAnchor) {
      scheduleScrollAnchorRestore(scrollAnchor, token);
    }
    updateColumnVisibility(tbody);
    normalizeSonarrRuntimeOrder(tbody);
    setBatching(false);
    setStatus(
      t("statusLoadedCounts", "Loaded %(rows)s / %(total)s", { rows: sorted.length, total: data.length })
    );
    tableReadyByApp[app] = true;
    setChipsVisible(true);
    flushDeferredPrefetch();
    if (perf && !perf.renderEnd) {
      perf.renderEnd = perfNow();
    }
    if (rowOptions.lazyRows && rowOptions.lazyRows.length) {
      applyColumnHeaderCaps();
      scheduleTitlePathWidthLock();
      scheduleTruncationTooltipUpdate();
      queueHydration(rowOptions.lazyRows, token, perf);
      maybeStabilizeRender(app, options);
      if (!(rowOptions && rowOptions.skipWidthCacheUpdate === true)) cacheColumnWidths(app);
      finalizeTableInteractionState(app);
      return;
    }
    finalizeRenderPerf(perf);
    if (!(rowOptions && rowOptions.skipWidthCacheUpdate === true)) cacheColumnWidths(app);
    if (!holdWidthLock) {
      unlockColumnWidths(token);
    }
    applyColumnHeaderCaps();
    scheduleTitlePathWidthLock();
    scheduleTruncationTooltipUpdate();
    maybeStabilizeRender(app, options);
    finalizeTableInteractionState(app);
    return;
  }

  clearTable();
  if (scrollAnchor) {
    scheduleScrollAnchorRestore(scrollAnchor, token);
  }
  renderBatch(sorted, token, 0, sorted.length, data.length, app, batchSize, rowOptions);
}

async function load(refresh, options = {}) {
  const app = activeApp;
  const myToken = ++loadTokens[app];
  // Benchmark mode bypasses network and renders synthetic rows.
  if (BENCH_PARAMS.enabled) {
    const benchApp = BENCH_PARAMS.app || app;
    if (benchApp !== activeApp) {
      setActiveApp(benchApp);
    }
    const synthetic = makeBenchmarkRows(benchApp, BENCH_PARAMS.rows);
    if (BENCH_PARAMS.wide) {
      try { setHiddenColumns([]); } catch { }
    }
    dataByApp[benchApp] = synthetic;
    dataVersionByApp[benchApp] = (dataVersionByApp[benchApp] || 0) + 1;
    setStatus(`Benchmark: ${BENCH_PARAMS.rows} rows (${benchApp})`);
    renderData(benchApp, { allowBatch: false });
    return;
  }

  if (BENCH_PARAMS.enabled) {
    const benchApp = BENCH_PARAMS.app || app;
    activeApp = benchApp;
    setActiveApp(benchApp);
    const synthetic = makeBenchmarkRows(benchApp, BENCH_PARAMS.rows);
    // Force wide mode if requested by showing all columns.
    if (BENCH_PARAMS.wide) {
      try { setHiddenColumns([]); } catch { }
    }
    dataByApp[benchApp] = synthetic;
    dataVersionByApp[benchApp] = (dataVersionByApp[benchApp] || 0) + 1;
    setStatus(`Benchmark: ${synthetic.length} rows (${benchApp})`);
    renderData(benchApp, { allowBatch: false });
    return;
  }

  const background = options.background === true;
  const hydrate = options.hydrate === true;
  if (hydrate) {
    liteHydrateInFlightByApp[app] = true;
  }

  try {
    const label = refresh
      ? app === "sonarr"
        ? I18N.fetchingNewShowsData
        : I18N.fetchingNewMoviesData
      : app === "sonarr"
        ? I18N.loadingShowsData
        : I18N.loadingMoviesData;
    const hasData = (dataByApp[app] || []).length > 0;
    if (app === activeApp && !background) {
      setLoading(true, label);
      if (!hasData) {
        setChipsVisible(false);
      }
      if (!refresh && !hasData && isPageFresh()) {
        noticeByApp[app] = COLD_CACHE_NOTICE;
        setStatusNotice(COLD_CACHE_NOTICE);
        schedulePageFreshNoticeClear();
      }
    }
    if (app === activeApp && !background && !tableReadyByApp[app]) {
      pendingStabilizeByApp[app] = true;
    }



    const base = app === "sonarr" ? "/api/shows" : "/api/movies";
    const params = [];
    if (refresh) params.push("refresh=1");
    if (options.lite === true) {
      params.push("lite=1");
    } else if (options.lite === false) {
      params.push("lite=0");
    }
    params.push(...getPlexScopeParams(app));
    const url = params.length ? `${base}?${params.join("&")}` : base;

    const res = await fetch(apiUrl(url));
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${txt}`);
    }

    const warn = res.headers.get("X-Sortarr-Warn") || "";
    const noticeState = parseNoticeState(res.headers);
    applyPlexScopeFromHeaders(app, res.headers);

    // If a newer request for this app is in flight, ignore this response
    if (myToken !== loadTokens[app]) return;

    const existing = dataByApp[app] || [];
    if (background && noticeState.flags.has("tautulli_refresh") && existing.length && !hydrate) {
      applyNoticeState(app, noticeState.flags, warn, noticeState.notice, { background });
      fetchStatus({ silent: true });
      if (res.body && typeof res.body.cancel === "function") {
        res.body.cancel();
      }
      return;
    }

    const json = await res.json();
    updatePlexLibraryScopeControl();
    updateEffectiveSourcesLine();
    applyNoticeState(app, noticeState.flags, warn, noticeState.notice, { background });
    if (app === activeApp) {
      clearTableSelection();
    }
    if (app === "radarr" && noticeState.flags.has("radarr_lite")) {
      if (!hydrate && !liteHydrateInFlightByApp.radarr) {
        liteHydrateInFlightByApp.radarr = true;
        load(false, { background: true, lite: false, hydrate: true });
      }
    }
    if (!background) {
      handlePrefetchGate(app, noticeState.flags);
    }
    rowCacheByApp[app].clear();
    dataByApp[app] = json;
    dataVersionByApp[app] += 1;
    sortCacheByApp[app] = null;
    assignRowKeys(dataByApp[app], app);
    if (app === "sonarr") {
      resetSonarrExpansionState();
    }
    lastUpdatedByApp[app] = Date.now();
    applyTitleWidth(app, dataByApp[app]);
    if (refresh && !background && tautulliEnabled && !noticeState.flags.has("tautulli_refresh")) {
      scheduleFollowUpRefresh(app);
    }
    if (app === activeApp) {
      const renderData = dataByApp[app];
      const renderNow = () => {
        if (myToken !== loadTokens[app] || app !== activeApp) return;
        render(renderData, { allowBatch: true });
        updateLastUpdatedDisplay();
      };
      const batchMin = getRenderBatchMin(app);
      if (renderData.length > batchMin) {
        requestAnimationFrame(renderNow);
      } else {
        renderNow();
      }
    }
    fetchStatus({ silent: true });
  } catch (e) {
    // Only show error if this is still the latest request for this app
    if (myToken !== loadTokens[app]) return;
    if (app === activeApp && !background) {
      setStatus(`Error: ${e.message}`);
    }
    console.error(e);
  } finally {
    if (hydrate) {
      liteHydrateInFlightByApp[app] = false;
    }
    if (myToken === loadTokens[app] && app === activeApp && !background) {
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

    sortCacheByApp[activeApp] = null;
    updateSortIndicators();
    scheduleViewStateSave();
    requestAnimationFrame(() => {
      render(dataByApp[activeApp] || [], {
        skipWidthCacheUpdate: true,
        forceWidthLock: true,
      });
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  tabSonarr?.addEventListener("click", () => setActiveTab("sonarr"));
  tabRadarr?.addEventListener("click", () => setActiveTab("radarr"));
  exportCsvBtn?.addEventListener("click", () => {
    const base = activeApp === "sonarr" ? "/api/shows.csv" : "/api/movies.csv";
    const params = getPlexScopeParams(activeApp);
    const url = params.length ? `${base}?${params.join("&")}` : base;
    window.location.href = url;
  });
  requestAnimationFrame(loadColumnPrefs);
});

if (plexLibrarySelect) {
  plexLibrarySelect.addEventListener("change", () => {
    const selected = Array.from(plexLibrarySelect.selectedOptions || []).map(opt => opt.value);
    setPlexSelectedForApp(activeApp, selected);
    updateEffectiveSourcesLine();
    updatePlexLibraryScopeControl();
    load(false);
    fetchStatus({ silent: true, lite: true });
  });
}

if (plexLibraryAllBtn) {
  plexLibraryAllBtn.addEventListener("click", () => {
    setPlexSelectedForApp(activeApp, []);
    updatePlexLibraryScopeControl();
    updateEffectiveSourcesLine();
    load(false);
    fetchStatus({ silent: true, lite: true });
  });
}

/* buttons */
if (loadBtn) {
  loadBtn.addEventListener("click", () => {
    const otherApp = activeApp === "sonarr" ? "radarr" : "sonarr";
    if (isAppConfigured(otherApp)) {
      queuePrefetch(otherApp, true);
    }
    load(true);
  });
}
if (refreshTabBtn) {
  refreshTabBtn.addEventListener("click", () => {
    refreshActiveAppData();
  });
}
if (refreshSonarrBtn) {
  refreshSonarrBtn.addEventListener("click", async () => {
    refreshSonarrBtn.setAttribute("data-busy", "1");
    updateArrRefreshButton(refreshSonarrBtn, configState.sonarrConfigured);
    setStatus(t("refreshingShows", "Refreshing Shows..."));
    try {
      await requestArrRefresh("sonarr");
      setStatus(t("showsRefreshQueued", "Shows refresh queued."));
    } catch (e) {
      setStatus(t("errorPrefix", "Error: ") + e.message);
    } finally {
      refreshSonarrBtn.removeAttribute("data-busy");
      updateArrRefreshButton(refreshSonarrBtn, configState.sonarrConfigured);
    }
  });
}
if (refreshRadarrBtn) {
  refreshRadarrBtn.addEventListener("click", async () => {
    refreshRadarrBtn.setAttribute("data-busy", "1");
    updateArrRefreshButton(refreshRadarrBtn, configState.radarrConfigured);
    setStatus(t("refreshingMovies", "Refreshing Movies..."));
    try {
      await requestArrRefresh("radarr");
      setStatus(t("moviesRefreshQueued", "Movies refresh queued."));
    } catch (e) {
      setStatus(t("errorPrefix", "Error: ") + e.message);
    } finally {
      refreshRadarrBtn.removeAttribute("data-busy");
      updateArrRefreshButton(refreshRadarrBtn, configState.radarrConfigured);
    }
  });
}
if (refreshTautulliBtn) {
  refreshTautulliBtn.addEventListener("click", async () => {
    const label = getPlaybackLabel();
    setStatus(t("refreshingPlayback", "Refreshing %(label)s…", { label }));
    try {
      const res = await fetch(apiUrl("/api/tautulli/refresh"), {
        method: "POST",
        headers: withCsrfHeaders(),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${txt}`);
      }
      const data = await res.json();
      if (data.refresh_in_progress || data.started) {
        setStatusNotice(getPlaybackMatchingNotice());
        if (configState.sonarrConfigured) setTautulliPending("sonarr", true);
        if (configState.radarrConfigured) setTautulliPending("radarr", true);
        updateBackgroundLoading();
      }
      fetchStatus({ silent: true });
      setStatus(t("playbackRefreshStarted", "%(label)s refresh started.", { label }));
    } catch (e) {
      setStatus(t("errorPrefix", "Error: ") + e.message);
    }
  });
}
if (deepRefreshTautulliBtn) {
  deepRefreshTautulliBtn.addEventListener("click", async () => {
    const label = getPlaybackLabel();
    setStatus(t("refreshingPlaybackData", "Refreshing %(label)s data...", { label }));
    try {
      const res = await fetch(apiUrl("/api/tautulli/deep_refresh"), {
        method: "POST",
        headers: withCsrfHeaders(),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${txt}`);
      }
      const data = await res.json();
      if (data.refresh_in_progress || data.started) {
        setStatusNotice(getPlaybackMatchingNotice());
        if (configState.sonarrConfigured) setTautulliPending("sonarr", true);
        if (configState.radarrConfigured) setTautulliPending("radarr", true);
        updateBackgroundLoading();
      }
      fetchStatus({ silent: true });
      setStatus(t("playbackDeepRefreshStarted", "%(label)s refresh started. This can take a while.", { label }));
    } catch (e) {
      setStatus(t("errorPrefix", "Error: ") + e.message);
    }
  });
}
if (clearCachesBtn) {
  clearCachesBtn.addEventListener("click", async () => {
    const playbackLabel = playbackProvider ? getPlaybackLabel() : t("playbackLabel", "playback");
    if (!window.confirm(
      t(
        "confirmClearCaches",
        "Clear all Sortarr caches and rebuild from Sonarr/Radarr (and %(playback)s if configured)?",
        { playback: playbackLabel }
      )
    )) return;
    setStatus(t("clearingCaches", "Clearing caches..."));
    try {
      const res = await fetch(apiUrl("/api/caches/clear"), {
        method: "POST",
        headers: withCsrfHeaders(),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${txt}`);
      }
      dataByApp.sonarr = [];
      dataByApp.radarr = [];
      rowCacheByApp.sonarr.clear();
      rowCacheByApp.radarr.clear();
      lastUpdatedByApp.sonarr = null;
      lastUpdatedByApp.radarr = null;
      noticeByApp.sonarr = "";
      noticeByApp.radarr = "";
      resetSonarrExpansionState();
      clearTable();
      updateLastUpdatedDisplay();
      if (configState.sonarrConfigured) setTautulliPending("sonarr", true);
      if (configState.radarrConfigured) setTautulliPending("radarr", true);
      updateBackgroundLoading();
      const otherApp = activeApp === "sonarr" ? "radarr" : "sonarr";
      if (isAppConfigured(otherApp)) {
        queuePrefetch(otherApp, true);
      }
      load(true);
      fetchStatus({ silent: true });
      setStatus(t("cachesClearedReloading", "Caches cleared. Reloading..."));
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  });
}
if (resetUiBtn) {
  resetUiBtn.addEventListener("click", () => {
    resetUiState();
    window.location.reload();
  });
}
if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    window.location.href = "/setup?force=1";
  });
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
  updateFilterUiMode();
}

function updateAdvancedHelpText() {
  if (advancedFilter) {
    advancedFilter.placeholder = tautulliEnabled
      ? ADVANCED_PLACEHOLDER_TAUTULLI
      : ADVANCED_PLACEHOLDER_BASE;
  }
  if (advancedHelp) {
    advancedHelp.textContent = tautulliEnabled
      ? ADVANCED_HELP_TAUTULLI
      : ADVANCED_HELP_BASE;
  }
}

async function prefetch(app, refresh, options = {}) {
  const existing = dataByApp[app] || [];
  const force = options.force === true;
  if (existing.length && !refresh && !force) return;

  const token = ++prefetchTokens[app];
  const background = options.background === true;
  const hydrate = options.hydrate === true;
  if (hydrate) {
    liteHydrateInFlightByApp[app] = true;
  }
  try {
    const base = app === "sonarr" ? "/api/shows" : "/api/movies";
    const params = [];
    if (refresh) params.push("refresh=1");
    if (options.lite === true) {
      params.push("lite=1");
    } else if (options.lite === false) {
      params.push("lite=0");
    }
    params.push(...getPlexScopeParams(app));
    const url = params.length ? `${base}?${params.join("&")}` : base;
    const res = await fetch(apiUrl(url));
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${txt}`);
    }
    const warn = res.headers.get("X-Sortarr-Warn") || "";
    const noticeState = parseNoticeState(res.headers);
    applyPlexScopeFromHeaders(app, res.headers);
    if (token !== prefetchTokens[app]) return;
    const existing = dataByApp[app] || [];
    if (background && noticeState.flags.has("tautulli_refresh") && existing.length && !hydrate) {
      applyNoticeState(app, noticeState.flags, warn, noticeState.notice, { background });
      fetchStatus({ silent: true });
      if (res.body && typeof res.body.cancel === "function") {
        res.body.cancel();
      }
      return;
    }
    const json = await res.json();
    updatePlexLibraryScopeControl();
    updateEffectiveSourcesLine();
    applyNoticeState(app, noticeState.flags, warn, noticeState.notice, { background });
    if (app === activeApp) {
      clearTableSelection();
    }
    if (app === "radarr" && noticeState.flags.has("radarr_lite")) {
      if (!hydrate && !liteHydrateInFlightByApp.radarr) {
        liteHydrateInFlightByApp.radarr = true;
        prefetch("radarr", false, { background: true, lite: false, hydrate: true, force: true });
      }
    }
    rowCacheByApp[app].clear();
    dataByApp[app] = json;
    dataVersionByApp[app] += 1;
    sortCacheByApp[app] = null;
    assignRowKeys(dataByApp[app], app);
    if (app === "sonarr") {
      resetSonarrExpansionState();
    }
    lastUpdatedByApp[app] = Date.now();
    applyTitleWidth(app, dataByApp[app]);
    if (app === activeApp) {
      const renderData = dataByApp[app];
      const renderNow = () => {
        if (token !== prefetchTokens[app] || app !== activeApp) return;
        render(renderData, { allowBatch: true });
        updateLastUpdatedDisplay();
      };
      const batchMin = getRenderBatchMin(app);
      if (renderData.length > batchMin) {
        requestAnimationFrame(renderNow);
      } else {
        renderNow();
      }
    }
    fetchStatus({ silent: true });
  } catch (e) {
    if (!background) {
      console.warn(`Prefetch ${app} failed`, e);
    }
  } finally {
    if (hydrate) {
      liteHydrateInFlightByApp[app] = false;
    }
  }
}

function updatePlaybackLabels() {
  const label = getPlaybackLabel();

  playbackLabelEls.forEach(el => {
    el.textContent = label;
  });

  playbackTitleEls.forEach(el => {
    el.textContent = playbackProvider
      ? t("playbackTitleWithLabel", "Playback (%(label)s)", { label })
      : t("playbackTitle", "Playback");
  });

  playbackMatchTitleEls.forEach(el => {
    el.textContent = playbackProvider
      ? t("matchTitleWithLabel", "Match (%(label)s)", { label })
      : t("matchTitle", "Match");
  });

  if (refreshTautulliBtn) {
    refreshTautulliBtn.textContent = playbackProvider
      ? t("refreshPlaybackProvider", "Refresh %(label)s", { label })
      : t("refreshPlayback", "Refresh playback");

    refreshTautulliBtn.title = playbackProvider
      ? t(
        "refreshPlaybackProviderTitle",
        "Refresh %(label)s library data and rebuild matches",
        { label }
      )
      : t(
        "refreshPlaybackTitle",
        "Refresh playback library data and rebuild matches"
      );
  }

  if (deepRefreshTautulliBtn) {
    deepRefreshTautulliBtn.textContent = playbackProvider
      ? t("deepRefreshPlaybackProvider", "Refresh %(label)s data", { label })
      : t("deepRefreshPlayback", "Refresh playback data");

    deepRefreshTautulliBtn.title = playbackProvider
      ? t(
        "refreshPlaybackProviderTitle",
        "Refresh %(label)s library data and rebuild matches",
        { label }
      )
      : t(
        "refreshPlaybackTitle",
        "Refresh playback library data and rebuild matches"
      );
  }
}


function setPlaybackProvider(provider) {
  playbackProvider = provider || "";
  playbackLabel = playbackProvider === "jellystat"
    ? "Jellystat"
    : (playbackProvider === "tautulli" ? "Tautulli" : "Playback");
  playbackSupportsItemRefresh = playbackProvider === "tautulli";
  playbackSupportsDiagnostics = playbackProvider === "tautulli" || playbackProvider === "plex";
  updatePlaybackLabels();
}

function setTautulliEnabled(enabled, provider = "") {
  tautulliEnabled = Boolean(enabled);
  setPlaybackProvider(provider);
  updateAdvancedHelpText();
  updateFilterBuilderOptions();
  const chipsChanged = updateChipVisibility();
  updateColumnFilter();
  markColumnVisibilityDirty();
  updateColumnVisibility();
  updateStatusPanel();
  if (chipsChanged) {
    scheduleViewStateSave();
  }
  if (chipsChanged && (dataByApp[activeApp] || []).length) {
    render(dataByApp[activeApp]);
  }
}

bindFilterInput(titleFilter);
bindFilterInput(pathFilter);
bindFilterInput(advancedFilter);

if (filterCategory) {
  filterCategory.addEventListener("change", () => {
    updateFilterConditionOptions();
    updateFilterValueOptions();
  });
}
if (filterValueSelect) {
  filterValueSelect.addEventListener("change", () => {
    const allowCustom = Boolean(getFilterFieldMeta(filterCategory?.value)?.allowCustom);
    const isCustom = allowCustom && filterValueSelect.value === "__custom__";
    if (filterValueInput) {
      filterValueInput.classList.toggle("hidden", !isCustom);
      filterValueInput.disabled = !isCustom;
      if (!isCustom) {
        filterValueInput.value = "";
      }
    }
    updateCustomSelect(filterValueSelect);
  });
}
if (filterValueInput) {
  filterValueInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBuilderFilterToken();
    }
  });
}
if (filterAddBtn) {
  filterAddBtn.addEventListener("click", () => {
    addBuilderFilterToken();
  });
}
if (activeFiltersEl) {
  activeFiltersEl.addEventListener("click", e => {
    const btn = e.target.closest(".filter-bubble");
    if (!btn) return;
    const token = btn.getAttribute("data-token") || "";
    if (!token) return;
    const tokens = String(chipQuery || "").split(/\s+/).filter(Boolean);
    const next = tokens.filter(item => item !== token);
    if (next.length === tokens.length) return;
    chipQuery = next.join(" ");
    syncChipButtonsToQuery();
    scheduleViewStateSave();
    const scrollAnchor = captureTableScrollAnchor();
    render(dataByApp[activeApp] || [], { scrollAnchor });
  });
}
if (chipsToggle) {
  chipsToggle.addEventListener("click", () => {
    setChipsEnabled(!chipsEnabled);
  });
}

window.addEventListener("beforeunload", () => {
  flushViewStateSave();
});

if (advancedToggle) {
  advancedToggle.addEventListener("click", () => {
    setAdvancedMode(!advancedEnabled);
    scheduleViewStateSave();
    render(dataByApp[activeApp] || []);
  });
}

if (advancedHelpBtn) {
  advancedHelpBtn.addEventListener("click", () => {
    if (!advancedHelp) return;
    advancedHelp.classList.toggle("hidden");
  });
}

  if (tbody) {
    tbody.addEventListener("mouseover", e => {
      const updated = updateSelectionFromPointer(e.target);
      if (updated) {
        focusTableWrapIfAllowed();
      }
    });
  document.addEventListener("mousemove", () => {
    if (!pointerSelectionEnabled) {
      pointerSelectionEnabled = true;
    }
  }, { passive: true });
  tbody.addEventListener("click", e => {
    if (tableWrapEl && !e.target.closest("input, textarea, select, [contenteditable]")) {
      tableWrapEl.focus({ preventScroll: true });
    }
    const clearFiltersBtn = e.target.closest('[data-role="clear-active-filters"]');
    if (clearFiltersBtn) {
      if (clearActiveFilters()) {
        const scrollAnchor = captureTableScrollAnchor();
        render(dataByApp[activeApp] || [], { scrollAnchor });
      }
      return;
    }
    const expandAllBtn = e.target.closest('[data-role="series-expand-all-seasons"]');
    if (expandAllBtn) {
      handleExpandAllSeasonsToggle(expandAllBtn);
      return;
    }
    const seasonRow = e.target.closest(".series-season-row");
    if (seasonRow) {
      const block = seasonRow.closest(".series-season-block");
      const seriesKey = block?.dataset?.seriesKey || "";
      const rowEl = seriesKey ? findSeriesRowByKey(seriesKey) : null;
      if (rowEl) {
        const seasons = getSeasonRowsForRow(rowEl);
        const index = seasons.indexOf(seasonRow);
        if (index >= 0) {
          setSeasonSelection(rowEl, index, { scroll: false });
        }
      }
    } else {
      const rowEl = e.target.closest('tr[data-app]');
      if (rowEl && !rowEl.classList.contains("series-child-row")) {
        setRowSelection(rowEl, { scroll: false });
      }
    }
    const episodeExtrasToggle = e.target.closest('[data-role="episode-extras-toggle"]');
    if (episodeExtrasToggle) {
      const block = episodeExtrasToggle.closest(".series-season-block");
      if (!block) return;
      const enabled = episodeExtrasToggle.getAttribute("aria-pressed") !== "true";
      setSeasonExtrasState(block, enabled);
      return;
    }
    const expandBtn = e.target.closest(".series-expander");
    if (expandBtn) {
      handleSeriesExpanderClick(expandBtn);
      return;
    }
    const seasonToggle = e.target.closest(".series-season-toggle");
    if (seasonToggle) {
      handleSeriesSeasonToggle(seasonToggle);
      return;
    }
    const diagBtn = e.target.closest(".match-diag-btn");
    if (diagBtn) {
      handleMatchDiagnosticsClick(diagBtn, e);
      return;
    }
    const refreshBtn = e.target.closest(".row-refresh-btn");
    if (refreshBtn) {
      handleRowRefreshClick(refreshBtn);
      return;
    }
    const btn = e.target.closest(".lang-toggle");
    if (!btn) return;
    const cell = btn.closest(".lang-cell");
    const list = cell?.querySelector(".lang-list");
    if (!list) return;

    const expanded = list.getAttribute("data-lang-state") === "full";
    const full = list.getAttribute("data-lang-full") || "";
    const short = list.getAttribute("data-lang-short") || "";

    if (expanded) {
      list.textContent = short;
      list.setAttribute("data-lang-state", "short");
      cell.classList.remove("is-expanded");
      btn.textContent = t("Show all");
      btn.setAttribute("aria-expanded", "false");
    } else {
      list.textContent = full || short;
      list.setAttribute("data-lang-state", "full");
      cell.classList.add("is-expanded");
      btn.textContent = t("Show less");
      btn.setAttribute("aria-expanded", "true");
    }
  });
}

if (columnsBtn && columnsPanel) {
  setColumnsPanelHiddenState(columnsPanel.classList.contains("hidden"));

  columnsBtn.addEventListener("click", e => {
    e.stopPropagation();
    const nowHidden = !columnsPanel.classList.contains("hidden");
    setColumnsPanelHiddenState(nowHidden);
    if (!nowHidden) {
      closeAllCustomSelects();
    }
    if (!nowHidden) {
      updateColumnFilter();
      columnSearch?.focus();
      requestAnimationFrame(updateColumnScrollHint);
    }
  });

  columnsPanel.addEventListener("scroll", () => {
    updateColumnScrollHint();
  });

  document.addEventListener("click", e => {
    if (columnsPanel.classList.contains("hidden")) return;
    if (columnsPanel.contains(e.target) || columnsBtn.contains(e.target)) return;
    setColumnsPanelHiddenState(true);
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      setColumnsPanelHiddenState(true);
    }
  });

  window.addEventListener("resize", () => {
    updateColumnScrollHint();
  });

  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    input.addEventListener("change", () => {
      const col = input.getAttribute("data-col");
      if (col) {
        syncColumnInputs(col, input.checked, activeApp);
      }
      saveColumnPrefs(activeApp);
      scheduleViewStateSave(activeApp);
      markColumnVisibilityDirty();
      updateColumnVisibility();
      applyTitleWidth(activeApp);
      updateColumnGroupToggles();
    });
  });
  columnsPanel.querySelectorAll("input[data-col-group]").forEach(input => {
    input.addEventListener("change", () => {
      const group = input.getAttribute("data-col-group");
      setColumnGroup(group, input.checked, activeApp);
      saveColumnPrefs(activeApp);
      scheduleViewStateSave(activeApp);
      markColumnVisibilityDirty();
      updateColumnVisibility();
      applyTitleWidth(activeApp);
      updateColumnGroupToggles();
    });
  });
  if (csvColumnsToggle) {
    csvColumnsToggle.addEventListener("change", () => {
      setCsvColumnsEnabled(csvColumnsToggle.checked);
    });
  }

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

function updateRuntimeLabels(fn = t) {
  const labelMap = {
    ContentHours: fn("label_runtime_hhmm", "Runtime (hh:mm)"),
    RuntimeMins: fn("label_runtime_hhmm", "Runtime (hh:mm)"),
    WatchContentRatio: fn("label_watch_over_runtime_hhmm", "Watch / Runtime (hh:mm)"),
  };
  const updateLabelText = (label, text) => {
    if (!label) return;
    const textNode = Array.from(label.childNodes).find(
      node => node.nodeType === Node.TEXT_NODE
    );
    if (textNode) {
      textNode.nodeValue = ` ${text}`;
    } else {
      label.appendChild(document.createTextNode(` ${text}`));
    }
  };

  const updateHeaderText = (th, text) => {
    if (!th) return;
    const textNode = Array.from(th.childNodes).find(
      node => node.nodeType === Node.TEXT_NODE
    );
    if (textNode) {
      textNode.nodeValue = `${text} `;
    } else {
      th.insertBefore(document.createTextNode(`${text} `), th.firstChild);
    }
  };

  Object.entries(labelMap).forEach(([key, text]) => {
    document.querySelectorAll(`[data-col="${key}"]`).forEach(el => {
      if (el.tagName === "INPUT") {
        updateLabelText(el.closest("label"), text);
      } else if (el.tagName === "TH") {
        updateHeaderText(el, text);
      }
    });
  });
}

function normalizeSonarrRuntimeOrder(scope = document) {
  if (sonarrHeaderNormalized) return;
  const headerRow = scope.querySelector?.("thead tr") || document.querySelector("thead tr");
  if (headerRow) {
    const runtimeHeader = headerRow.querySelector('th[data-col="ContentHours"][data-app="sonarr"]');
    const totalHeader = headerRow.querySelector('th[data-col="TotalSizeGB"][data-app="sonarr"]');
    const avgHeader = headerRow.querySelector('th[data-col="AvgEpisodeSizeGB"][data-app="sonarr"]');
    const gbPerHourHeader = headerRow.querySelector('th[data-col="GBPerHour"][data-app="sonarr"]');
    const bitrateHeader = headerRow.querySelector('th[data-col="BitrateMbps"][data-app="sonarr"]');
    const episodesHeader = headerRow.querySelector('th[data-col="EpisodesCounted"][data-app="sonarr"]');
    const seasonsHeader = headerRow.querySelector('th[data-col="SeasonCount"][data-app="sonarr"]');
    const radarrHeader = headerRow.querySelector('th[data-app="radarr"]');
    const order = [
      runtimeHeader,
      episodesHeader,
      seasonsHeader,
      avgHeader,
      totalHeader,
      gbPerHourHeader,
      bitrateHeader,
    ].filter(Boolean);
    if (order.length && radarrHeader) {
      order.forEach(el => headerRow.insertBefore(el, radarrHeader));
      sonarrHeaderNormalized = true;
    }
  }
}

const savedTheme = localStorage.getItem("Sortarr-theme") || "dark";
setTheme(savedTheme);

themeBtn.addEventListener("click", () => {
  const current = root.getAttribute("data-theme") || "dark";
  setTheme(current === "dark" ? "light" : "dark");
});
if (tableFullscreenBtn) {
  // Initialize from storage
  applyTableFullscreen(isTableFullscreenEnabled());

  tableFullscreenBtn.addEventListener("click", async () => {
    const enabled = !root.classList.contains("table-fullscreen");
    setTableFullscreenEnabled(enabled);

    if (enabled) {
      await enterTrueFullscreenIfPossible();
      applyTableFullscreen(true);   // CSS fallback always
    } else {
      await exitTrueFullscreenIfPossible();
      applyTableFullscreen(false);
    }
  });


  document.addEventListener("keydown", async (e) => {
    if (e.key === "Escape" && root.classList.contains("table-fullscreen")) {
      setTableFullscreenEnabled(false);
      await exitTrueFullscreenIfPossible(); // <-- add this
      applyTableFullscreen(false);
    }
  });
}


async function exitTrueFullscreenIfPossible() {
  if (!document.fullscreenElement) return;
  try { await document.exitFullscreen(); } catch { }
}

document.addEventListener("fullscreenchange", () => {
  const isFs = !!document.fullscreenElement;
  setTableFullscreenEnabled(isFs);
  applyTableFullscreen(isFs);
});



const savedFiltersCollapsed = localStorage.getItem(FILTERS_COLLAPSED_KEY) === "1";
if (filtersEl) {
  setFiltersCollapsed(savedFiltersCollapsed);
}
if (filtersToggleBtn) {
  filtersToggleBtn.addEventListener("click", () => {
    setFiltersCollapsed(!filtersCollapsed);
  });
}

let savedChipsEnabled = false;
try {
  savedChipsEnabled = localStorage.getItem(CHIPS_ENABLED_KEY) === "1";
} catch {
}
setChipsEnabled(savedChipsEnabled);



/* config load for link bases */
async function loadConfig() {
  try {
    const res = await fetch(apiUrl("/api/config"));
    if (!res.ok) return;
    const cfg = await res.json();
    const sonarrInstances = Array.isArray(cfg.sonarr_instances) ? cfg.sonarr_instances : [];
    const radarrInstances = Array.isArray(cfg.radarr_instances) ? cfg.radarr_instances : [];

    instanceConfig.sonarr = sonarrInstances;
    instanceConfig.radarr = radarrInstances;

    instanceBaseById.sonarr = {};
    instanceBaseById.radarr = {};
    sonarrInstances.forEach(inst => {
      if (inst?.id) instanceBaseById.sonarr[inst.id] = inst.url || "";
    });
    radarrInstances.forEach(inst => {
      if (inst?.id) instanceBaseById.radarr[inst.id] = inst.url || "";
    });

    sonarrBase = cfg.sonarr_url || sonarrInstances[0]?.url || "";
    radarrBase = cfg.radarr_url || radarrInstances[0]?.url || "";
    configState.sonarrConfigured = sonarrInstances.length > 0;
    configState.radarrConfigured = radarrInstances.length > 0;
    configState.playbackProvider = cfg.playback_provider || "";
    configState.playbackConfigured = Boolean(
      cfg.playback_configured ?? cfg.tautulli_configured
    );
    configState.plexConfigured = Boolean(cfg.plex_configured);
    configState.historySourcesAvailable = Array.isArray(cfg.history_sources_available)
      ? cfg.history_sources_available.map(value => String(value || "").trim().toLowerCase()).filter(Boolean)
      : [];
    const plexLibraries = (cfg.plex_libraries && typeof cfg.plex_libraries === "object")
      ? cfg.plex_libraries
      : {};
    setPlexAvailableForApp("sonarr", plexLibraries.sonarr || []);
    setPlexAvailableForApp("radarr", plexLibraries.radarr || []);
    if (plexInsightsBtn) {
      plexInsightsBtn.classList.toggle("hidden", !configState.plexConfigured);
    }
    updateMismatchCenterButtonVisibility();

    buildInstanceChips();
    updateFilterBuilderOptions();
    setTautulliEnabled(configState.playbackConfigured, configState.playbackProvider);
    updatePlexLibraryScopeControl();
    updateEffectiveSourcesLine();
    updatePrimaryRefreshButton();
  } catch (e) {
    console.warn("config load failed", e);
  }
}

// History drawer state and helpers
const historyDrawerState = {
  open: false,
  expanded: false,
  loading: false,
  data: null,
  target: null,
};
let historyOverlayEl = null;
let historyDrawerEl = null;
let historyBodyEl = null;
let historySummaryEl = null;
let historyExpandBtn = null;
let historyExportBtn = null;
let historyTitleEl = null;

// Background scroll lock for History (prevents iOS rubber-banding + keeps page fixed)
let historyLockedScrollY = 0;
let historyLockedPaddingRight = "";
let historyScrollLocked = false;

function lockBackgroundScrollForHistory() {
  if (IS_ANDROID) return;
  if (historyScrollLocked) return;
  historyScrollLocked = true;

  historyLockedScrollY = window.scrollY || window.pageYOffset || 0;

  // Prevent layout shift when the scrollbar disappears (desktop)
  historyLockedPaddingRight = document.body.style.paddingRight || "";
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  document.body.style.position = "fixed";
  document.body.style.top = `-${historyLockedScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockBackgroundScrollForHistory() {
  if (!historyScrollLocked) return;
  historyScrollLocked = false;

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  document.body.style.paddingRight = historyLockedPaddingRight;

  window.scrollTo(0, historyLockedScrollY);
}


function buildHistoryButton(row, app) {
  if (app === "radarr") {
    const movieId = row.MovieId ?? row.movieId;
    if (!movieId) return "";
    const instanceId = escapeHtml(String(row.InstanceId ?? row.instanceId ?? ""));
    const title = escapeHtml(formatRowTitle(row, app) || "");
    return `<button class="history-btn" type="button" data-history-btn="1" data-app="radarr" data-instance-id="${instanceId}" data-movie-id="${escapeHtml(String(movieId))}" data-history-title="${title}" aria-label="${escapeHtml(t("History"))}">H</button>`;
  }
  return "";
}

function buildEpisodeHistoryButton(episode) {
  const episodeId = episode.id ?? episode.episodeId ?? "";
  if (!episodeId) return "";
  const seriesId = episode.seriesId ?? episode.SeriesId ?? "";
  const instanceId = episode.instanceId ?? episode.InstanceId ?? "";
  const title = escapeHtml(String(episode.title || t("Episode")));
  return `<button class="history-btn history-btn--episode" type="button" data-history-btn="1" data-app="sonarr" data-series-id="${escapeHtml(String(seriesId))}" data-episode-id="${escapeHtml(String(episodeId))}" data-instance-id="${escapeHtml(String(instanceId))}" data-history-title="${title}" aria-label="${escapeHtml(t("History"))}">H</button>`;
}

function syncHistoryOverlayHost() {
  if (!historyOverlayEl) return;
  if (historyOverlayEl.parentNode !== document.body) {
    document.body.appendChild(historyOverlayEl);
  }
}

function ensureHistoryDrawer() {
  if (historyOverlayEl && historyDrawerEl) return;
  historyOverlayEl = document.createElement("div");
  historyOverlayEl.className = "history-overlay hidden";
  historyOverlayEl.innerHTML = `
    <div class="history-scrim" data-history-close="1"></div>
    <div class="history-drawer glass-panel">
      <div class="history-header">
        <div class="history-title" data-role="history-title">History</div>
        <div class="history-actions">
          <button class="history-btn-text" type="button" data-role="history-export">Export CSV</button>
          <button class="history-close" type="button" aria-label="${escapeHtml(t("Close"))}" data-history-close="1">\u00d7</button>
        </div>
      </div>
      <div class="history-summary" data-role="history-summary"></div>
      <button class="history-expand" type="button" data-role="history-expand">Show all events</button>
      <div class="history-body" data-role="history-body"></div>
    </div>
    `;
  historyDrawerEl = historyOverlayEl.querySelector(".history-drawer");
  historyBodyEl = historyOverlayEl.querySelector('[data-role="history-body"]');

  historySummaryEl = historyOverlayEl.querySelector('[data-role="history-summary"]');
  historyExpandBtn = historyOverlayEl.querySelector('[data-role="history-expand"]');
  historyExportBtn = historyOverlayEl.querySelector('[data-role="history-export"]');
  historyTitleEl = historyOverlayEl.querySelector('[data-role="history-title"]');
  syncHistoryOverlayHost();
  // Prevent wheel/trackpad from scrolling the page behind the overlay (and stop scroll chaining at edges)
  historyOverlayEl.addEventListener(
    "wheel",
    ev => {
      if (!historyBodyEl) {
        ev.preventDefault();
        return;
      }

      const inDrawerScroll = ev.target && ev.target.closest && ev.target.closest('[data-role="history-body"]');
      if (!inDrawerScroll) {
        // Wheel over scrim / header / anywhere outside the scroll container: never scroll background
        ev.preventDefault();
        return;
      }

      // Wheel over the drawer scroll container: allow scrolling, but block chaining at the ends
      const el = historyBodyEl;
      const deltaY = ev.deltaY || 0;

      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

      if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
        ev.preventDefault();
      }
    },
    { passive: false }
  );

}



function setHistoryExpanded(expanded) {
  historyDrawerState.expanded = expanded;
  if (historyExpandBtn) {
    historyExpandBtn.textContent = expanded ? t("Show latest vs previous") : t("Show all events");
    historyExpandBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
  }
  renderHistoryContent();
}

function formatHistorySize(bytes) {
  const size = Number(bytes || 0);
  if (!size || size < 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = size;
  let idx = 0;
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024;
    idx += 1;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[idx]}`;
}

function formatHistoryEventLabel(eventType) {
  const map = {
    grabbed: "Grabbed",
    downloadFolderImported: "Imported",
    movieFolderImported: "Imported",
    seriesFolderImported: "Imported",
    episodeFileRenamed: "Renamed",
    movieFileRenamed: "Renamed",
    downloadFailed: "Failed",
    downloadIgnored: "Ignored",
    episodeFileDeleted: "Deleted",
    movieFileDeleted: "Deleted",
  };
  return map[eventType] || (eventType ? eventType : "Unknown");
}

function summarizeQuality(ev) {
  const name = ev?.qualityName || "";
  const res = ev?.qualityResolution ? `${ev.qualityResolution}p` : "";
  const source = ev?.qualitySource || "";
  return [name, res, source].filter(Boolean).join(" · ");
}

function renderHistorySummaryContent(data) {
  if (!historySummaryEl) return;
  if (!data || !data.all) {
    historySummaryEl.textContent = t("No history yet—will populate on next grab/import.");
    return;
  }
  const latest = data.latest;
  const previous = data.previous;
  if (!latest && !previous) {
    historySummaryEl.textContent = t("No file history yet—will populate on next grab/import.");
    return;
  }
  const buildRow = (label, ev) => {
    if (!ev) return `<div class="history-summary-row"><div class="history-summary-label">${escapeHtml(label)}</div><div class="history-summary-empty">No data</div></div>`;
    const size = formatHistorySize(ev.size);
    const score = Number(ev.customFormatScore || 0);
    const deltaScore = previous && label === "Latest" ? score - Number(previous.customFormatScore || 0) : null;
    const sizeDelta = previous && label === "Latest" && ev.size && previous.size ? ev.size - previous.size : null;
    const deltaParts = [];
    if (deltaScore !== null) deltaParts.push(`CF ${deltaScore >= 0 ? "+" : ""}${deltaScore}`);
    if (sizeDelta !== null) deltaParts.push(`${sizeDelta >= 0 ? "+" : ""}${formatHistorySize(sizeDelta)}`);
    const deltas = deltaParts.length ? `<div class="history-summary-delta">${deltaParts.join(" / ")}</div>` : "";
    return `
      <div class="history-summary-row">
        <div class="history-summary-label">${escapeHtml(label)}</div>
        <div class="history-summary-main">
          <div class="history-summary-line">
            <span class="history-event">${escapeHtml(formatHistoryEventLabel(ev.eventType))}</span>
            <span class="history-quality">${escapeHtml(summarizeQuality(ev))}</span>
            ${size ? `<span class="history-size">${escapeHtml(size)}</span>` : ""}
          </div>
          <div class="history-summary-sub">
            <span>${escapeHtml(ev.date || "")}</span>
            ${ev.sourceTitle ? `<span class="muted">${escapeHtml(ev.sourceTitle)}</span>` : ""}
          </div>
        </div>
        ${deltas}
      </div>
    `;
  };
  historySummaryEl.innerHTML = buildRow("Latest", latest) + buildRow("Previous", previous);
}

function renderHistoryTimeline(data) {
  if (!historyBodyEl) return;
  if (!data || !Array.isArray(data.all) || !data.all.length) {
    historyBodyEl.textContent = t("No events available.");
    return;
  }
  const items = historyDrawerState.expanded ? data.all : (data.latest ? [data.latest] : []);
  const timeline = items.map(ev => {
    const size = formatHistorySize(ev.size);
    const quality = summarizeQuality(ev);
    const languages = (ev.languages || []).join(", ");
    return `
      <div class="history-row">
        <div class="history-row-primary">
          <span class="history-event">${escapeHtml(formatHistoryEventLabel(ev.eventType))}</span>
          <span class="history-quality">${escapeHtml(quality)}</span>
          ${size ? `<span class="history-size">${escapeHtml(size)}</span>` : ""}
          ${ev.customFormatScore ? `<span class="history-cf">CF ${escapeHtml(String(ev.customFormatScore))}</span>` : ""}
        </div>
        <div class="history-row-meta">
          <span>${escapeHtml(ev.date || "")}</span>
          ${ev.sourceTitle ? `<span class="muted">${escapeHtml(ev.sourceTitle)}</span>` : ""}
          ${languages ? `<span class="muted">${escapeHtml(languages)}</span>` : ""}
          ${ev.releaseGroup ? `<span class="muted">RG: ${escapeHtml(ev.releaseGroup)}</span>` : ""}
          ${ev.downloadId ? `<span class="muted">DL: ${escapeHtml(ev.downloadId)}</span>` : ""}
        </div>
      </div>
    `;
  });
  historyBodyEl.innerHTML = timeline.join("") || "No events available.";
}

function renderHistoryContent() {
  if (historyDrawerState.loading) {
    if (historySummaryEl) historySummaryEl.textContent = t("Fetching history...");
    if (historyBodyEl) historyBodyEl.textContent = "";
    return;
  }
  renderHistorySummaryContent(historyDrawerState.data);
  renderHistoryTimeline(historyDrawerState.data);
  if (historyDrawerState.data && historyDrawerState.data.historyStart && historyBodyEl) {
    historyBodyEl.insertAdjacentHTML(
      "beforeend",
      `<div class="history-note muted">History begins ${escapeHtml(historyDrawerState.data.historyStart)} (from Arr)</div>`
    );
  }
}

function closeHistoryDrawer() {
  historyDrawerState.open = false;
  historyDrawerState.data = null;
  historyDrawerState.loading = false;
  if (historyOverlayEl) historyOverlayEl.classList.add("hidden");
  unlockBackgroundScrollForHistory();
  document.body.classList.remove("history-open");
}

// Plex insights drawer state and helpers
const plexInsightsState = {
  open: false,
  loading: false,
  data: null,
  selectedHub: 0,
  sectionId: "",
  sections: [],
  matchHealth: null,
  live: false,
  liveStatus: "",
};
let plexOverlayEl = null;
let plexDrawerEl = null;
let plexBodyEl = null;
let plexMetaEl = null;
let plexHubChipsEl = null;
let plexHubItemsEl = null;
let plexSectionChipsEl = null;
let plexActivitiesEl = null;
let plexButlerEl = null;
let plexMatchEl = null;
let plexRefreshBtn = null;
let plexLiveBtn = null;
let plexLiveSource = null;
let plexLiveRefreshTimer = null;

function ensurePlexOverlay() {
  if (plexOverlayEl && plexDrawerEl) return;
  plexOverlayEl = document.createElement("div");
  plexOverlayEl.className = "plex-overlay hidden";
  plexOverlayEl.innerHTML = `
    <div class="plex-scrim" data-plex-close="1"></div>
    <div class="plex-drawer glass-panel">
      <div class="plex-header">
        <div class="plex-title">${escapeHtml(t("Plex Insights"))}</div>
        <div class="plex-actions">
          <button class="plex-btn" type="button" data-role="plex-refresh">${escapeHtml(t("Refresh"))}</button>
          <button class="plex-btn plex-live-toggle" type="button" data-role="plex-live">${escapeHtml(t("Live"))}</button>
          <button class="plex-close" type="button" aria-label="${escapeHtml(t("Close"))}" data-plex-close="1">\u00d7</button>
        </div>
      </div>
      <div class="plex-meta" data-role="plex-meta"></div>
      <div class="plex-body" data-role="plex-body">
        <div class="plex-section">
          <div class="plex-section-title">${escapeHtml(t("Hubs"))}</div>
          <div class="plex-hub-filters">
            <span class="plex-label">${escapeHtml(t("Library"))}</span>
            <div class="plex-section-chips" data-role="plex-section-chips"></div>
          </div>
          <div class="plex-hub-chips" data-role="plex-hub-chips"></div>
          <div class="plex-hub-items" data-role="plex-hub-items"></div>
        </div>
        <div class="plex-section">
          <div class="plex-section-title">${escapeHtml(t("Match Health"))}</div>
          <div class="plex-match" data-role="plex-match"></div>
        </div>
        <div class="plex-section">
          <div class="plex-section-title">${escapeHtml(t("Activities"))}</div>
          <div class="plex-activities" data-role="plex-activities"></div>
        </div>
        <div class="plex-section">
          <div class="plex-section-title">${escapeHtml(t("Butler"))}</div>
          <div class="plex-butler" data-role="plex-butler"></div>
        </div>
      </div>
    </div>
    `;
  document.body.appendChild(plexOverlayEl);
  plexDrawerEl = plexOverlayEl.querySelector(".plex-drawer");
  plexBodyEl = plexOverlayEl.querySelector('[data-role="plex-body"]');
  plexMetaEl = plexOverlayEl.querySelector('[data-role="plex-meta"]');
  plexHubChipsEl = plexOverlayEl.querySelector('[data-role="plex-hub-chips"]');
  plexHubItemsEl = plexOverlayEl.querySelector('[data-role="plex-hub-items"]');
  plexSectionChipsEl = plexOverlayEl.querySelector('[data-role="plex-section-chips"]');
  plexActivitiesEl = plexOverlayEl.querySelector('[data-role="plex-activities"]');
  plexButlerEl = plexOverlayEl.querySelector('[data-role="plex-butler"]');
  plexMatchEl = plexOverlayEl.querySelector('[data-role="plex-match"]');
  plexRefreshBtn = plexOverlayEl.querySelector('[data-role="plex-refresh"]');
  plexLiveBtn = plexOverlayEl.querySelector('[data-role="plex-live"]');
}

function closePlexOverlay() {
  plexInsightsState.open = false;
  if (plexOverlayEl) plexOverlayEl.classList.add("hidden");
  stopPlexLive();
}

function formatEpochAge(ts) {
  if (!ts) return "";
  const ageSeconds = Math.max(0, Math.round(Date.now() / 1000 - ts));
  return tp("progressAgeAgo", { age: formatAgeShort(ageSeconds) }, "%(age)s ago");
}

function updatePlexMeta(text, warn = false) {
  if (!plexMetaEl) return;
  plexMetaEl.textContent = text || "";
  plexMetaEl.classList.toggle("plex-meta--warn", Boolean(warn));
}

function getPlexSectionLabel() {
  const sectionId = plexInsightsState.sectionId;
  if (!sectionId) return t("All Libraries");
  const sections = Array.isArray(plexInsightsState.sections) ? plexInsightsState.sections : [];
  const match = sections.find(section => String(section.id) === String(sectionId));
  if (match && match.title) return match.title;
  return t("All Libraries");
}

function renderPlexSections(sections) {
  if (!plexSectionChipsEl) return;
  const list = Array.isArray(sections) ? sections : [];
  plexInsightsState.sections = list;
  const validIds = new Set(list.map(section => String(section.id || "")));
  if (plexInsightsState.sectionId && !validIds.has(String(plexInsightsState.sectionId))) {
    plexInsightsState.sectionId = "";
  }
  const chips = [];
  const allActive = !plexInsightsState.sectionId;
  chips.push(
    `<button class="plex-chip${allActive ? " plex-chip--active" : ""}" type="button" data-plex-section="">${escapeHtml(t("All Libraries"))}</button>`
  );
  for (const section of list) {
    const id = String(section.id || "");
    if (!id) continue;
    const title = escapeHtml(section.title || t("Untitled", "Untitled"));
    const active = String(plexInsightsState.sectionId) === id ? " plex-chip--active" : "";
    chips.push(
      `<button class="plex-chip${active}" type="button" data-plex-section="${escapeHtml(id)}">${title}</button>`
    );
  }
  plexSectionChipsEl.innerHTML = chips.join("");
}

function renderPlexHubChips(hubs) {
  if (!plexHubChipsEl) return;
  if (!Array.isArray(hubs) || !hubs.length) {
    plexHubChipsEl.innerHTML = `<span class="plex-empty">${escapeHtml(t("No hubs available"))}</span>`;
    return;
  }
  if (plexInsightsState.selectedHub >= hubs.length) {
    plexInsightsState.selectedHub = 0;
  }
  const chips = hubs.map((hub, idx) => {
    const title = escapeHtml(hub.title || t("Untitled", "Untitled"));
    const active = idx === plexInsightsState.selectedHub ? " plex-chip--active" : "";
    return `<button class="plex-chip${active}" type="button" data-plex-hub="${idx}">${title}</button>`;
  });
  plexHubChipsEl.innerHTML = chips.join("");
}

function renderPlexHubItems(hubs) {
  if (!plexHubItemsEl) return;
  if (!Array.isArray(hubs) || !hubs.length) {
    plexHubItemsEl.innerHTML = `<div class="plex-empty">${escapeHtml(t("No hub items"))}</div>`;
    return;
  }
  const hub = hubs[Math.max(0, Math.min(plexInsightsState.selectedHub, hubs.length - 1))];
  const items = Array.isArray(hub?.items) ? hub.items : [];
  if (!items.length) {
    plexHubItemsEl.innerHTML = `<div class="plex-empty">${escapeHtml(t("No hub items"))}</div>`;
    return;
  }
  const rows = items.map(item => {
    const title = escapeHtml(item.title || "");
    const year = item.year ? `· ${item.year}` : "";
    const type = item.type ? `· ${escapeHtml(item.type)}` : "";
    const viewed = item.last_viewed_at ? `· ${formatEpochAge(item.last_viewed_at)}` : "";
    const watched = item.view_count ? `· ${item.view_count}x` : "";
    return `
      <div class="plex-hub-item">
        <div class="plex-hub-title">${title}</div>
        <div class="plex-hub-meta">${[year, type, watched, viewed].filter(Boolean).join(" ")}</div>
      </div>
    `;
  });
  plexHubItemsEl.innerHTML = rows.join("");
}

function renderPlexActivities(activities) {
  if (!plexActivitiesEl) return;
  if (!Array.isArray(activities) || !activities.length) {
    plexActivitiesEl.innerHTML = `<div class="plex-empty">${escapeHtml(t("No active tasks"))}</div>`;
    return;
  }
  plexActivitiesEl.innerHTML = activities.map(activity => {
    const title = escapeHtml(activity.title || "");
    const subtitle = activity.subtitle ? `<div class="plex-sub">${escapeHtml(activity.subtitle)}</div>` : "";
    let progress = Number(activity.progress || 0);
    if (progress > 0 && progress <= 1) progress = Math.round(progress * 100);
    else progress = Math.round(progress);
    const progressLabel = progress ? `${progress}%` : "";
    const state = activity.state ? escapeHtml(activity.state) : "";
    return `
      <div class="plex-task">
        <div class="plex-task-row">
          <div class="plex-task-title">${title}</div>
          <div class="plex-task-meta">${[progressLabel, state].filter(Boolean).join(" · ")}</div>
        </div>
        ${subtitle}
      </div>
    `;
  }).join("");
}

function renderPlexButler(tasks) {
  if (!plexButlerEl) return;
  if (!Array.isArray(tasks) || !tasks.length) {
    plexButlerEl.innerHTML = `<div class="plex-empty">${escapeHtml(t("No butler tasks"))}</div>`;
    return;
  }
  plexButlerEl.innerHTML = tasks.map(task => {
    const title = escapeHtml(task.title || "");
    const schedule = task.schedule ? escapeHtml(task.schedule) : "";
    const status = task.status ? escapeHtml(task.status) : "";
    const desc = task.description ? `<div class="plex-sub">${escapeHtml(task.description)}</div>` : "";
    const meta = [schedule, status].filter(Boolean).join(" · ");
    return `
      <div class="plex-task">
        <div class="plex-task-row">
          <div class="plex-task-title">${title}</div>
          <div class="plex-task-meta">${meta}</div>
        </div>
        ${desc}
      </div>
    `;
  }).join("");
}

function formatMatchValue(value, total, withPercent = false) {
  const count = Number(value || 0);
  if (!withPercent || !total) return `${count}`;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return `${count} (${pct}%)`;
}

function renderPlexMatchHealth(matchHealth) {
  if (!plexMatchEl) return;
  if (!matchHealth || !matchHealth.apps) {
    plexMatchEl.innerHTML = `<div class="plex-empty">${escapeHtml(t("No match data"))}</div>`;
    return;
  }
  const apps = ["sonarr", "radarr"];
  const cards = apps.map(app => {
    const label = app === "sonarr" ? t("Sonarr") : t("Radarr");
    const appHealth = matchHealth.apps?.[app] || {};
    const counts = appHealth.counts || {};
    const total = Number(counts.total || 0);
    const buckets = Array.isArray(appHealth.buckets) ? appHealth.buckets : [];
    const reasons = Array.isArray(appHealth.reasons) ? appHealth.reasons : [];
    if (!total) {
      return `
        <div class="plex-match-card">
          <div class="plex-match-title">${escapeHtml(label)}</div>
          <div class="plex-empty">${escapeHtml(t("No match data"))}</div>
        </div>
      `;
    }
    const grid = [
      [t("Matched"), formatMatchValue(counts.matched, total, true)],
      [t("Unmatched"), formatMatchValue(counts.unmatched, total)],
      [t("Skipped"), formatMatchValue(counts.skipped, total)],
      [t("Unavailable"), formatMatchValue(counts.unavailable, total)],
      [t("Pending"), formatMatchValue(counts.pending, total)],
    ]
      .map(row => `<div>${escapeHtml(row[0])}</div><div>${escapeHtml(row[1])}</div>`)
      .join("");
    const bucketText = buckets.map(item => `${item.label} (${item.count})`).join(", ");
    const reasonText = reasons.map(item => `${item.label} (${item.count})`).join(", ");
    const bucketLine = bucketText
      ? `<div class="plex-match-line"><span class="plex-match-label">${escapeHtml(t("Matched by"))}</span>${escapeHtml(bucketText)}</div>`
      : "";
    const reasonLine = reasonText
      ? `<div class="plex-match-line"><span class="plex-match-label">${escapeHtml(t("Top reasons"))}</span>${escapeHtml(reasonText)}</div>`
      : "";
    return `
      <div class="plex-match-card">
        <div class="plex-match-title">${escapeHtml(label)}</div>
        <div class="plex-match-grid">${grid}</div>
        ${bucketLine}
        ${reasonLine}
      </div>
    `;
  });
  plexMatchEl.innerHTML = cards.join("") || `<div class="plex-empty">${escapeHtml(t("No match data"))}</div>`;
}

function renderPlexInsights() {
  if (!plexOverlayEl) return;
  const data = plexInsightsState.data || {};
  renderPlexSections(data.sections || []);
  renderPlexHubChips(data.hubs || []);
  renderPlexHubItems(data.hubs || []);
  renderPlexMatchHealth(data.match_health || {});
  renderPlexActivities(data.activities || []);
  renderPlexButler(data.butler || []);
}

function updatePlexLiveButton() {
  if (!plexLiveBtn) return;
  plexLiveBtn.classList.toggle("is-active", plexInsightsState.live);
  plexLiveBtn.textContent = plexInsightsState.live ? t("Live on") : t("Live");
  if (plexInsightsState.liveStatus) {
    plexLiveBtn.title = plexInsightsState.liveStatus;
  } else {
    plexLiveBtn.removeAttribute("title");
  }
}

function schedulePlexInsightsRefresh() {
  if (!plexInsightsState.open) return;
  if (plexLiveRefreshTimer) return;
  plexLiveRefreshTimer = setTimeout(() => {
    plexLiveRefreshTimer = null;
    fetchPlexInsights({ refresh: true, silent: true });
  }, 1500);
}

function startPlexLive() {
  if (plexLiveSource) return;
  if (!window.EventSource) {
    plexInsightsState.liveStatus = t("Live unavailable");
    updatePlexLiveButton();
    return;
  }
  plexInsightsState.live = true;
  plexInsightsState.liveStatus = "";
  updatePlexLiveButton();
  plexLiveSource = new EventSource(apiUrl("/api/plex/events"));
  plexLiveSource.onmessage = () => {
    schedulePlexInsightsRefresh();
  };
  plexLiveSource.onerror = () => {
    plexInsightsState.liveStatus = t("Live connection unstable");
    updatePlexLiveButton();
  };
}

function stopPlexLive() {
  plexInsightsState.live = false;
  plexInsightsState.liveStatus = "";
  if (plexLiveSource) {
    plexLiveSource.close();
    plexLiveSource = null;
  }
  if (plexLiveRefreshTimer) {
    clearTimeout(plexLiveRefreshTimer);
    plexLiveRefreshTimer = null;
  }
  updatePlexLiveButton();
}

async function fetchPlexInsights({ refresh = false, silent = false } = {}) {
  if (!configState.plexConfigured) return;
  ensurePlexOverlay();
  if (!silent) updatePlexMeta(t("Fetching Plex insights..."));
  plexInsightsState.loading = true;
  try {
    const params = new URLSearchParams();
    params.set("hub_count", "6");
    params.set("item_count", "8");
    params.set("include", "hubs,activities,butler,sections,match_health");
    if (plexInsightsState.sectionId) params.set("section_id", plexInsightsState.sectionId);
    if (refresh) params.set("refresh", "1");
    const res = await fetch(apiUrl(`/api/plex/insights?${params.toString()}`));
    if (!res.ok) {
      throw new Error(await res.text());
    }
    const payload = await res.json();
    plexInsightsState.data = payload || {};
    plexInsightsState.loading = false;
    renderPlexInsights();
    const fetchedAt = payload?.fetched_at || payload?.cache_ts || 0;
    const sectionLabel = getPlexSectionLabel();
    const metaBits = [];
    if (fetchedAt) {
      metaBits.push(`${t("Updated")} ${formatEpochAge(fetchedAt)}`);
    }
    if (sectionLabel) {
      metaBits.push(`${t("Library")}: ${sectionLabel}`);
    }
    updatePlexMeta(metaBits.join(" · "));
  } catch (err) {
    plexInsightsState.loading = false;
    updatePlexMeta(t("Plex insights unavailable."), true);
  }
}

function openPlexInsights() {
  if (!configState.plexConfigured) return;
  ensurePlexOverlay();
  plexInsightsState.open = true;
  if (plexOverlayEl) plexOverlayEl.classList.remove("hidden");
  if (!plexInsightsState.data) {
    fetchPlexInsights({ refresh: true });
  } else {
    renderPlexInsights();
  }
}


const mismatchCenterState = {
  open: false,
  loading: false,
  dataByApp: { sonarr: null, radarr: null },
  filters: {
    provider: "any",
    status: "any",
    category: "any",
    groupBy: "none",
    search: "",
  },
};

let mismatchOverlayEl = null;
let mismatchDrawerEl = null;
let mismatchBodyEl = null;
let mismatchMetaEl = null;
let mismatchSummaryEl = null;
let mismatchProviderFilterEl = null;
let mismatchStatusFilterEl = null;
let mismatchCategoryFilterEl = null;
let mismatchGroupByEl = null;
let mismatchSearchEl = null;
let mismatchRefreshBtn = null;
let mismatchExportBtn = null;

function ensureMismatchCenterOverlay() {
  if (mismatchOverlayEl && mismatchDrawerEl) return;
  mismatchOverlayEl = document.createElement("div");
  mismatchOverlayEl.className = "mismatch-overlay hidden";
  mismatchOverlayEl.innerHTML = `
    <div class="mismatch-drawer" role="dialog" aria-modal="true" aria-label="${escapeHtml(t("mismatchCenterTitle", "Mismatch Center"))}">
      <div class="mismatch-header">
        <div>
          <div class="mismatch-title">${escapeHtml(t("mismatchCenterTitle", "Mismatch Center"))}</div>
          <div class="mismatch-meta" data-role="mismatch-meta"></div>
        </div>
        <div class="mismatch-actions">
          <button type="button" data-role="mismatch-refresh">${escapeHtml(t("Refresh", "Refresh"))}</button>
          <button type="button" data-role="mismatch-export">${escapeHtml(t("Export CSV", "Export CSV"))}</button>
          <button type="button" data-mismatch-close>${escapeHtml(t("Close", "Close"))}</button>
        </div>
      </div>
      <div class="mismatch-controls">
        <label>${escapeHtml(t("Provider", "Provider"))}
          <select data-role="mismatch-provider">
            <option value="any">${escapeHtml(t("All", "All"))}</option>
          </select>
        </label>
        <label>${escapeHtml(t("Status", "Status"))}
          <select data-role="mismatch-status">
            <option value="any">${escapeHtml(t("All", "All"))}</option>
            <option value="unmatched">${escapeHtml(t("Unmatched", "Unmatched"))}</option>
            <option value="skipped">${escapeHtml(t("Skipped", "Skipped"))}</option>
            <option value="unavailable">${escapeHtml(t("Unavailable", "Unavailable"))}</option>
            <option value="matched">${escapeHtml(t("Matched", "Matched"))}</option>
          </select>
        </label>
        <label>${escapeHtml(t("Category", "Category"))}
          <select data-role="mismatch-category">
            <option value="any">${escapeHtml(t("All", "All"))}</option>
            <option value="provider_conflict">${escapeHtml(t("Provider conflict", "Provider conflict"))}</option>
            <option value="unmatched_all">${escapeHtml(t("Unmatched all", "Unmatched all"))}</option>
            <option value="skipped_all">${escapeHtml(t("Skipped all", "Skipped all"))}</option>
            <option value="unavailable_all">${escapeHtml(t("Unavailable all", "Unavailable all"))}</option>
          </select>
        </label>
        <label>${escapeHtml(t("Group", "Group"))}
          <select data-role="mismatch-group-by">
            <option value="none">${escapeHtml(t("None", "None"))}</option>
            <option value="provider">${escapeHtml(t("Provider", "Provider"))}</option>
            <option value="status">${escapeHtml(t("Status", "Status"))}</option>
            <option value="reason">${escapeHtml(t("Reason", "Reason"))}</option>
            <option value="category">${escapeHtml(t("Category", "Category"))}</option>
          </select>
        </label>
        <label class="mismatch-search-wrap">${escapeHtml(t("Search", "Search"))}
          <input data-role="mismatch-search" type="search" placeholder="${escapeHtml(t("Search mismatches", "Search mismatches"))}" />
        </label>
      </div>
      <div class="mismatch-summary" data-role="mismatch-summary"></div>
      <div class="mismatch-body" data-role="mismatch-body"></div>
    </div>
  `;
  document.body.appendChild(mismatchOverlayEl);
  mismatchDrawerEl = mismatchOverlayEl.querySelector(".mismatch-drawer");
  mismatchBodyEl = mismatchOverlayEl.querySelector('[data-role="mismatch-body"]');
  mismatchMetaEl = mismatchOverlayEl.querySelector('[data-role="mismatch-meta"]');
  mismatchSummaryEl = mismatchOverlayEl.querySelector('[data-role="mismatch-summary"]');
  mismatchProviderFilterEl = mismatchOverlayEl.querySelector('[data-role="mismatch-provider"]');
  mismatchStatusFilterEl = mismatchOverlayEl.querySelector('[data-role="mismatch-status"]');
  mismatchCategoryFilterEl = mismatchOverlayEl.querySelector('[data-role="mismatch-category"]');
  mismatchGroupByEl = mismatchOverlayEl.querySelector('[data-role="mismatch-group-by"]');
  mismatchSearchEl = mismatchOverlayEl.querySelector('[data-role="mismatch-search"]');
  mismatchRefreshBtn = mismatchOverlayEl.querySelector('[data-role="mismatch-refresh"]');
  mismatchExportBtn = mismatchOverlayEl.querySelector('[data-role="mismatch-export"]');

  [mismatchProviderFilterEl, mismatchStatusFilterEl, mismatchCategoryFilterEl, mismatchGroupByEl]
    .filter(Boolean)
    .forEach(selectEl => initCustomSelect(selectEl));

  const onFilterChange = () => {
    mismatchCenterState.filters.provider = mismatchProviderFilterEl?.value || "any";
    mismatchCenterState.filters.status = mismatchStatusFilterEl?.value || "any";
    mismatchCenterState.filters.category = mismatchCategoryFilterEl?.value || "any";
    mismatchCenterState.filters.groupBy = mismatchGroupByEl?.value || "none";
    mismatchCenterState.filters.search = mismatchSearchEl?.value || "";
    renderMismatchCenter();
  };

  mismatchProviderFilterEl?.addEventListener("change", onFilterChange);
  mismatchStatusFilterEl?.addEventListener("change", onFilterChange);
  mismatchCategoryFilterEl?.addEventListener("change", onFilterChange);
  mismatchGroupByEl?.addEventListener("change", onFilterChange);
  mismatchSearchEl?.addEventListener("input", onFilterChange);

  mismatchOverlayEl.addEventListener("click", event => {
    if (event.target === mismatchOverlayEl) {
      closeMismatchCenter();
    }
  });
}

function mismatchProviderLabel(provider) {
  if (provider === "tautulli") return "Tautulli";
  if (provider === "plex") return "Plex";
  if (provider === "jellystat") return "Jellystat";
  return String(provider || "");
}

function mismatchCategoryLabel(category) {
  const key = String(category || "").trim().toLowerCase();
  if (key === "provider_conflict") return t("Provider conflict", "Provider conflict");
  if (key === "unmatched_all") return t("Unmatched all", "Unmatched all");
  if (key === "skipped_all") return t("Skipped all", "Skipped all");
  if (key === "unavailable_all") return t("Unavailable all", "Unavailable all");
  return key || t("Unknown", "Unknown");
}

function mismatchStatusClass(status) {
  const key = String(status || "").trim().toLowerCase();
  if (key === "matched") return "is-matched";
  if (key === "unmatched") return "is-unmatched";
  if (key === "skipped") return "is-skipped";
  return "is-unavailable";
}

function mismatchStatusMatchesFilter(row, providerFilter, statusFilter) {
  if (statusFilter === "any") return true;
  const providers = row?.providers || {};
  if (providerFilter !== "any") {
    const status = String(providers[providerFilter]?.status || "").trim().toLowerCase();
    return status === statusFilter;
  }
  return Object.values(providers).some(entry => String(entry?.status || "").trim().toLowerCase() === statusFilter);
}

function mismatchRowSearchText(row) {
  const fields = [
    row?.title,
    row?.year,
    row?.instance_name,
    row?.instance_id,
    row?.path,
    row?.mismatch_reason,
    row?.mismatch_category,
  ];
  const providers = row?.providers || {};
  Object.entries(providers).forEach(([provider, value]) => {
    fields.push(provider);
    fields.push(value?.status || "");
    fields.push(value?.reason || "");
  });
  return fields.map(value => String(value || "").toLowerCase()).join(" ");
}

function mismatchGroupKey(row, groupBy, providerFilter) {
  if (groupBy === "provider") {
    const providers = row?.providers || {};
    const keys = providerFilter === "any"
      ? Object.keys(providers)
      : [providerFilter];
    for (const provider of keys) {
      const status = String(providers?.[provider]?.status || "").trim().toLowerCase();
      if (status && status !== "matched") {
        return mismatchProviderLabel(provider);
      }
    }
    return t("Matched", "Matched");
  }
  if (groupBy === "status") {
    const providers = row?.providers || {};
    const keys = providerFilter === "any"
      ? Object.keys(providers)
      : [providerFilter];
    for (const provider of keys) {
      const status = String(providers?.[provider]?.status || "").trim().toLowerCase();
      if (status && status !== "matched") {
        return status;
      }
    }
    return "matched";
  }
  if (groupBy === "reason") {
    return row?.mismatch_reason || t("Unknown", "Unknown");
  }
  if (groupBy === "category") {
    return mismatchCategoryLabel(row?.mismatch_category || "");
  }
  return "";
}

function getFilteredMismatchRows(data) {
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const providerFilter = mismatchCenterState.filters.provider || "any";
  const statusFilter = mismatchCenterState.filters.status || "any";
  const categoryFilter = mismatchCenterState.filters.category || "any";
  const searchFilter = String(mismatchCenterState.filters.search || "").trim().toLowerCase();
  return rows.filter(row => {
    if (categoryFilter !== "any" && String(row?.mismatch_category || "") !== categoryFilter) {
      return false;
    }
    if (!mismatchStatusMatchesFilter(row, providerFilter, statusFilter)) {
      return false;
    }
    if (providerFilter !== "any" && !row?.providers?.[providerFilter]) {
      return false;
    }
    if (searchFilter) {
      const haystack = mismatchRowSearchText(row);
      if (!haystack.includes(searchFilter)) return false;
    }
    return true;
  });
}

function populateMismatchProviderFilter(data) {
  if (!mismatchProviderFilterEl) return;
  const providers = Array.isArray(data?.providers) ? data.providers : [];
  const previous = mismatchCenterState.filters.provider || "any";
  const options = [`<option value="any">${escapeHtml(t("All", "All"))}</option>`];
  providers.forEach(provider => {
    const id = String(provider?.provider || "").trim().toLowerCase();
    if (!id) return;
    options.push(`<option value="${escapeHtml(id)}">${escapeHtml(provider.label || mismatchProviderLabel(id))}</option>`);
  });
  mismatchProviderFilterEl.innerHTML = options.join("");
  mismatchProviderFilterEl.value = options.some(item => item.includes(`value="${previous}"`)) ? previous : "any";
  mismatchCenterState.filters.provider = mismatchProviderFilterEl.value || "any";
  updateCustomSelect(mismatchProviderFilterEl);
}

function renderMismatchRows(rows, data) {
  if (!mismatchBodyEl) return;
  if (!rows.length) {
    mismatchBodyEl.innerHTML = `<div class="mismatch-empty">${escapeHtml(t("No mismatch rows found.", "No mismatch rows found."))}</div>`;
    return;
  }

  const groupBy = mismatchCenterState.filters.groupBy || "none";
  const providerFilter = mismatchCenterState.filters.provider || "any";
  const groups = new Map();
  if (groupBy === "none") {
    groups.set("", rows);
  } else {
    rows.forEach(row => {
      const key = mismatchGroupKey(row, groupBy, providerFilter);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
  }

  const providerOrder = (Array.isArray(data?.providers) ? data.providers : [])
    .map(item => String(item?.provider || "").trim().toLowerCase())
    .filter(Boolean);

  const html = [];
  for (const [groupName, groupRows] of groups.entries()) {
    if (groupBy !== "none") {
      html.push(`<div class="mismatch-group-title">${escapeHtml(groupName || t("Other", "Other"))} <span>${groupRows.length}</span></div>`);
    }
    html.push('<div class="mismatch-table-wrap"><table class="mismatch-table"><thead><tr><th>' +
      escapeHtml(t("Title", "Title")) + '</th><th>' +
      escapeHtml(t("Instance", "Instance")) + '</th><th>' +
      escapeHtml(t("Category", "Category")) + '</th><th>' +
      escapeHtml(t("Reason", "Reason")) + '</th><th>' +
      escapeHtml(t("Providers", "Providers")) +
      '</th></tr></thead><tbody>');

    groupRows.forEach(row => {
      const providerCells = [];
      const providers = row?.providers || {};
      const ordered = providerOrder.length ? providerOrder : Object.keys(providers);
      ordered.forEach(provider => {
        if (providerFilter !== "any" && provider !== providerFilter) return;
        const entry = providers[provider];
        if (!entry) return;
        const status = String(entry.status || "").trim().toLowerCase() || "unavailable";
        const reason = String(entry.reason || "");
        providerCells.push(`<div class="mismatch-provider-row ${mismatchStatusClass(status)}"><span class="mismatch-provider-name">${escapeHtml(mismatchProviderLabel(provider))}</span><span class="mismatch-provider-status">${escapeHtml(status)}</span><span class="mismatch-provider-reason">${escapeHtml(reason)}</span></div>`);
      });
      html.push(`<tr>
        <td>
          <div class="mismatch-title-cell">${escapeHtml(row.title || "")}</div>
          <div class="mismatch-sub muted">${escapeHtml(row.year || "")}${row.path ? " • " + escapeHtml(row.path) : ""}</div>
        </td>
        <td>${escapeHtml(row.instance_name || row.instance_id || "")}</td>
        <td><span class="mismatch-category-pill">${escapeHtml(mismatchCategoryLabel(row.mismatch_category || ""))}</span></td>
        <td>${escapeHtml(row.mismatch_reason || "")}</td>
        <td>${providerCells.join("")}</td>
      </tr>`);
    });

    html.push('</tbody></table></div>');
  }

  mismatchBodyEl.innerHTML = html.join("");
}

function renderMismatchCenter() {
  if (!mismatchOverlayEl || !mismatchBodyEl || !mismatchSummaryEl || !mismatchMetaEl) return;
  const data = mismatchCenterState.dataByApp[activeApp];
  if (mismatchCenterState.loading) {
    mismatchBodyEl.innerHTML = `<div class="mismatch-empty">${escapeHtml(t("Loading mismatch data...", "Loading mismatch data..."))}</div>`;
    return;
  }
  if (!data) {
    mismatchBodyEl.innerHTML = `<div class="mismatch-empty">${escapeHtml(t("No mismatch data yet.", "No mismatch data yet."))}</div>`;
    return;
  }

  populateMismatchProviderFilter(data);
  const rows = getFilteredMismatchRows(data);
  const total = Array.isArray(data.rows) ? data.rows.length : 0;
  mismatchSummaryEl.textContent = t("showingMismatchRows", "Showing %(filtered)s of %(total)s mismatches", {
    filtered: rows.length,
    total,
  });

  const providers = Array.isArray(data.providers) ? data.providers : [];
  const metaParts = [
    `${activeApp === "sonarr" ? t("Shows", "Shows") : t("Movies", "Movies")}`,
    providers.map(provider => provider.label || mismatchProviderLabel(provider.provider)).join(" vs "),
  ].filter(Boolean);
  mismatchMetaEl.textContent = metaParts.join(" • ");

  renderMismatchRows(rows, data);
}

function exportMismatchCsv(data) {
  const rows = getFilteredMismatchRows(data);
  if (!rows.length) return;
  const providers = Array.isArray(data?.providers)
    ? data.providers.map(item => String(item?.provider || "").trim().toLowerCase()).filter(Boolean)
    : [];
  const csvRows = rows.map(row => {
    const out = {
      title: row.title || "",
      year: row.year || "",
      instance_name: row.instance_name || "",
      instance_id: row.instance_id || "",
      path: row.path || "",
      category: row.mismatch_category || "",
      reason: row.mismatch_reason || "",
    };
    providers.forEach(provider => {
      const entry = row?.providers?.[provider] || {};
      out[`${provider}_status`] = entry.status || "";
      out[`${provider}_reason`] = entry.reason || "";
    });
    return out;
  });
  const header = Object.keys(csvRows[0]);
  const csv = [header.join(",")].concat(
    csvRows.map(item => header.map(key => `"${String(item[key] ?? "").replace(/"/g, '""')}"`).join(","))
  ).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `mismatches_${activeApp}.csv`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 100);
}

async function fetchMismatchCenterData(app, { force = false, silent = false } = {}) {
  const appName = app === "radarr" ? "radarr" : "sonarr";
  if (!force && mismatchCenterState.dataByApp[appName]) {
    if (appName === activeApp) renderMismatchCenter();
    return mismatchCenterState.dataByApp[appName];
  }
  mismatchCenterState.loading = true;
  if (appName === activeApp) renderMismatchCenter();
  try {
    const params = [
      `app=${encodeURIComponent(appName)}`,
      "limit=3000",
      ...getPlexScopeParams(appName),
    ];
    const res = await fetch(apiUrl(`/api/mismatches?${params.join("&")}`));
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `${res.status} ${res.statusText}`);
    }
    const payload = await res.json();
    mismatchCenterState.dataByApp[appName] = payload;
    return payload;
  } catch (err) {
    if (!silent) {
      setStatus(t("errorPrefix", "Error: ") + (err?.message || String(err)));
    }
    throw err;
  } finally {
    mismatchCenterState.loading = false;
    if (appName === activeApp) renderMismatchCenter();
  }
}

function openMismatchCenter() {
  ensureMismatchCenterOverlay();
  mismatchCenterState.open = true;
  if (mismatchOverlayEl) mismatchOverlayEl.classList.remove("hidden");
  fetchMismatchCenterData(activeApp, { force: true, silent: true }).catch(() => {
    renderMismatchCenter();
  });
}

function closeMismatchCenter() {
  mismatchCenterState.open = false;
  if (mismatchOverlayEl) mismatchOverlayEl.classList.add("hidden");
}
async function fetchHistoryData(target) {
  const params = new URLSearchParams();
  params.set("app", target.app);
  if (target.instanceId) params.set("instance_id", target.instanceId);
  if (target.app === "radarr") {
    params.set("movieId", target.movieId);
  } else {
    params.set("seriesId", target.seriesId);
    params.set("episodeId", target.episodeId);
  }
  const res = await fetch(apiUrl(`/api/history?${params.toString()}`));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "History request failed");
  }
  return res.json();
}

function exportHistoryCsv(data, target) {
  if (!data || !Array.isArray(data.all) || !data.all.length) return;
  const rows = data.all.map(ev => ({
    title: target?.title || "",
    instance: target?.instanceId || "",
    app: target?.app || "",
    seriesId: ev.seriesId || "",
    episodeId: ev.episodeId || "",
    movieId: ev.movieId || "",
    eventDate: ev.date || "",
    eventType: ev.eventType || "",
    sourceTitle: ev.sourceTitle || "",
    qualityName: ev.qualityName || "",
    qualityResolution: ev.qualityResolution || "",
    qualitySource: ev.qualitySource || "",
    customFormats: (ev.customFormats || []).join("|"),
    customFormatScore: ev.customFormatScore || "",
    qualityCutoffNotMet: ev.qualityCutoffNotMet ? "1" : "0",
    size: ev.size || "",
    languages: (ev.languages || []).join("|"),
    releaseGroup: ev.releaseGroup || "",
    downloadId: ev.downloadId || "",
    rawDataJson: ev.data ? JSON.stringify(ev.data) : "",
  }));
  const header = Object.keys(rows[0]);
  const csv = [header.join(",")].concat(
    rows.map(r => header.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))
  ).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `history_${target?.app || "arr"}.csv`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 100);
}

async function openHistoryFromButton(btn) {
  const app = (btn.dataset.app || "").toLowerCase();
  if (!app) return;
  ensureHistoryDrawer();
  syncHistoryOverlayHost();
  const title = btn.dataset.historyTitle || "";
  const target = {
    app,
    instanceId: btn.dataset.instanceId || "",
    seriesId: btn.dataset.seriesId || "",
    episodeId: btn.dataset.episodeId || "",
    movieId: btn.dataset.movieId || "",
    title,
  };
  if (app === "sonarr" && (!target.seriesId || !target.episodeId)) {
    const expansion = btn.closest(".series-expansion");
    if (expansion) {
      target.seriesId = target.seriesId || expansion.dataset.seriesId || "";
      target.instanceId = target.instanceId || expansion.dataset.instanceId || "";
    }
  }
  historyDrawerState.target = target;
  historyDrawerState.loading = true;
  historyDrawerState.expanded = false;
  historyDrawerState.data = null;
  if (historyTitleEl) historyTitleEl.textContent = title || t("History");
  if (historyOverlayEl) historyOverlayEl.classList.remove("hidden");
  document.body.classList.add("history-open");
  lockBackgroundScrollForHistory();
  renderHistoryContent();
  try {
    const data = await fetchHistoryData(target);
    historyDrawerState.data = data;
  } catch (err) {
    if (historySummaryEl) historySummaryEl.textContent = err.message || t("Failed to load history.");
    if (historyBodyEl) historyBodyEl.textContent = "";
    historyDrawerState.loading = false;
    return;
  }
  historyDrawerState.loading = false;
  renderHistoryContent();
}

document.addEventListener("click", event => {
  const historyBtn = event.target.closest("[data-history-btn]");
  if (historyBtn) {
    event.preventDefault();
    openHistoryFromButton(historyBtn);
    return;
  }
  if (historyOverlayEl && !historyOverlayEl.classList.contains("hidden")) {
    if (event.target.matches("[data-history-close]")) {
      closeHistoryDrawer();
    } else if (historyExpandBtn && event.target === historyExpandBtn) {
      setHistoryExpanded(!historyDrawerState.expanded);
    } else if (historyExportBtn && event.target === historyExportBtn) {
      exportHistoryCsv(historyDrawerState.data, historyDrawerState.target);
    }
  }
});

document.addEventListener("click", event => {
  const plexBtn = event.target.closest("#plexInsightsBtn");
  if (plexInsightsBtn && plexBtn) {
    event.preventDefault();
    openPlexInsights();
    return;
  }
  const mismatchBtn = event.target.closest("#mismatchCenterBtn");
  if (mismatchCenterBtn && mismatchBtn) {
    event.preventDefault();
    openMismatchCenter();
    return;
  }
  const sectionBtn = event.target.closest("[data-plex-section]");
  if (sectionBtn) {
    const nextSection = String(sectionBtn.dataset.plexSection || "");
    if (String(plexInsightsState.sectionId || "") !== nextSection) {
      plexInsightsState.sectionId = nextSection;
      plexInsightsState.selectedHub = 0;
      fetchPlexInsights({ refresh: true });
    }
    return;
  }
  const hubBtn = event.target.closest("[data-plex-hub]");
  if (hubBtn) {
    const idx = Number(hubBtn.dataset.plexHub || 0);
    if (!Number.isNaN(idx)) {
      plexInsightsState.selectedHub = idx;
      renderPlexInsights();
    }
    return;
  }
  if (plexOverlayEl && !plexOverlayEl.classList.contains("hidden")) {
    if (event.target.matches("[data-plex-close]")) {
      closePlexOverlay();
    } else if (plexRefreshBtn && event.target === plexRefreshBtn) {
      fetchPlexInsights({ refresh: true });
    } else if (plexLiveBtn && event.target === plexLiveBtn) {
      if (plexInsightsState.live) stopPlexLive();
      else startPlexLive();
    }
  }
  if (mismatchOverlayEl && !mismatchOverlayEl.classList.contains("hidden")) {
    if (event.target.matches("[data-mismatch-close]")) {
      closeMismatchCenter();
    } else if (mismatchRefreshBtn && event.target === mismatchRefreshBtn) {
      fetchMismatchCenterData(activeApp, { force: true }).catch(() => { });
    } else if (mismatchExportBtn && event.target === mismatchExportBtn) {
      exportMismatchCsv(mismatchCenterState.dataByApp[activeApp]);
    }
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && historyOverlayEl && !historyOverlayEl.classList.contains("hidden")) {
    closeHistoryDrawer();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && plexOverlayEl && !plexOverlayEl.classList.contains("hidden")) {
    closePlexOverlay();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && mismatchOverlayEl && !mismatchOverlayEl.classList.contains("hidden")) {
    closeMismatchCenter();
  }
});

async function syncOptionSetFromApi() {
  try {
    const res = await fetch(apiUrl("/api/config"));
    if (!res.ok) return;
    const cfg = await res.json();
    configState.optionSet = cfg.option_set || {};
    configState.optionCapabilities = configState.optionSet.capabilities || {};
    configState.optionSelected = configState.optionSet.selected || {};
    if (typeof cfg.sonarr_configured !== "undefined") configState.sonarrConfigured = !!cfg.sonarr_configured;
    if (typeof cfg.radarr_configured !== "undefined") configState.radarrConfigured = !!cfg.radarr_configured;
    if (typeof cfg.plex_configured !== "undefined") configState.plexConfigured = !!cfg.plex_configured;
    configState.historySourcesAvailable = Array.isArray(cfg.history_sources_available)
      ? cfg.history_sources_available.map(value => String(value || "").trim().toLowerCase()).filter(Boolean)
      : configState.historySourcesAvailable;
    const plexLibraries = (cfg.plex_libraries && typeof cfg.plex_libraries === "object")
      ? cfg.plex_libraries
      : {};
    setPlexAvailableForApp("sonarr", plexLibraries.sonarr || []);
    setPlexAvailableForApp("radarr", plexLibraries.radarr || []);
    applyOptionSetCapabilities();
  } catch {
    // Best-effort only; retain existing behavior when config API is unavailable.
  }
}

function initStatusHoverBindings() {
  if (statusHoverBindingsReady) return;
  statusHoverBindingsReady = true;
  if (!statusPillEl || !statusRowEl) return;
  if (statusEl) {
    statusEl.addEventListener("mouseenter", () => {
      if (!statusCollapsed) return;
      showStatusRow();
      pauseStatusCountdown();
    });
  }

  statusPillEl.addEventListener("mouseenter", () => {
    if (!statusCollapsed || !statusReadyAfterFirstData) return;
    pauseStatusCountdown();
    showStatusRow();
    statusPillEl.classList.add("status-pill--active");
  });
  statusPillEl.addEventListener("mouseleave", () => {
    if (!statusCollapsed) return;
    statusPillEl.classList.remove("status-pill--active");
    setTimeout(() => {
      if (!statusRowEl.matches(":hover") && !statusPillEl.matches(":hover")) {
        if (shouldAutoHideStatus(statusState.apps?.[activeApp], statusState.tautulli)) {
          startStatusCountdown();
        } else {
          showStatusRow();
        }
      }
    }, 50);
  });
  statusRowEl.addEventListener("mouseenter", () => {
    if (statusCollapsed) pauseStatusCountdown();
  });
  statusRowEl.addEventListener("mouseleave", () => {
    if (!statusCollapsed) return;
    if (!statusRowEl.matches(":hover") && !(statusPillEl && statusPillEl.matches(":hover"))) {
      if (shouldAutoHideStatus(statusState.apps?.[activeApp], statusState.tautulli)) {
        startStatusCountdown();
      } else {
        showStatusRow();
      }
    }
  });
}

function initDeferredUiBindings() {
  if (deferredUiBindingsReady) return;
  deferredUiBindingsReady = true;
  bindChipButtons();
  initStatusHoverBindings();
}

function scheduleDeferredUiBindings() {
  if (deferredUiBindingsScheduled || deferredUiBindingsReady) return;
  deferredUiBindingsScheduled = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        deferredUiBindingsScheduled = false;
        firstPaintSettled = true;
        initDeferredUiBindings();
        fetchStatus({ silent: true, lite: true });
        startStatusTick();
        startStatusFetchPoll();
      }, 60);
    });
  });
}

/* init */
(async function init() {
  initPerfOverlay();
  updatePrimaryRefreshButton();

  if (resetUiRequested) {
    resetUiState();
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete(RESET_UI_PARAM);
      window.history.replaceState({}, "", url);
    } catch (e) {
      console.warn("reset_ui replaceState failed", e);
    }
  }
  loadColumnPrefsState();
  loadColumnPrefs();
  loadCsvColumnsState();
  loadPlexLibrarySelection();
  loadViewState();
  applyViewState(activeApp);
  updateFilterBuilderOptions();
  initFilterCustomSelects();
  syncCsvToggle();
  setTautulliEnabled(false, "");
  updateRuntimeLabels();
  updateColumnFilter();
  updateColumnVisibility();
  updateChipVisibility();
  updateLastUpdatedDisplay();
  updateSortIndicators();
  if (IMAGES_ENABLED) setupRadarrPosterTooltipDelegation();
  scheduleTitlePathWidthLock();
  await loadConfig();
  await syncOptionSetFromApi();
  setChipsVisible(false);
  const otherApp = activeApp === "sonarr" ? "radarr" : "sonarr";
  if (isAppConfigured(otherApp)) {
    queuePrefetch(otherApp, false);

  }
  if (capabilityEnabled("arr_tables", configState.sonarrConfigured || configState.radarrConfigured)) {
    await load(false);
  } else if (configState.plexConfigured) {
    setStatus(t("noArrMediaSourcePlexAvailable", "No Sonarr/Radarr media source configured. Plex features are available."));
    setLoading(false);
  } else {
    setStatus(t("noMediaSourceConfigured", "No media source configured. Open Setup to configure Sonarr, Radarr, or Plex."));
    setLoading(false);
  }


  if (IS_IOS && typeof lockPageZoomIOSButAllowTableCustomZoom === "function") {
    lockPageZoomIOSButAllowTableCustomZoom();
  }

  // Enable custom table pinch-zoom on touch devices (Android + iOS)
  if (root.classList.contains("is-coarse") && typeof enableTablePinchZoom === "function") {
    enableTablePinchZoom();
  }

  if (typeof enableTableScrollChaining === "function") {
    enableTableScrollChaining();
  }
  if (
    typeof enableStatusRowScrollChaining === "function" &&
    document.documentElement.classList.contains("is-coarse")
  ) {
    enableStatusRowScrollChaining();
  }

  scheduleDeferredUiBindings();
})();
























