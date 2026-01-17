const tbody = document.getElementById("tbody");
const statusEl = document.getElementById("status");
const loadingIndicator = document.getElementById("loadingIndicator");
const lastUpdatedEl = document.getElementById("lastUpdated");
const loadBtn = document.getElementById("loadBtn");
const refreshTabBtn = document.getElementById("refreshTabBtn");
const progressStatusEl = document.getElementById("progressStatus");
const tautulliStatusEl = document.getElementById("tautulliStatus");
const cacheStatusEl = document.getElementById("cacheStatus");
const statusRowEl = document.getElementById("statusRow");
const statusCompleteNoteEl = document.getElementById("statusCompleteNote");
const statusPillEl = document.getElementById("statusPill");
const partialBannerEl = document.getElementById("partialBanner");
const refreshTautulliBtn = document.getElementById("refreshTautulliBtn");
const deepRefreshTautulliBtn = document.getElementById("deepRefreshTautulliBtn");
const refreshSonarrBtn = document.getElementById("refreshSonarrBtn");
const refreshRadarrBtn = document.getElementById("refreshRadarrBtn");
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
const instanceChipsSonarr = document.getElementById("instanceChipsSonarr");
const instanceChipsRadarr = document.getElementById("instanceChipsRadarr");
const chipWrapEl = document.querySelector(".chip-wrap");

const tabSonarr = document.getElementById("tabSonarr");
const tabRadarr = document.getElementById("tabRadarr");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const columnsBtn = document.getElementById("columnsBtn");
const columnsPanel = document.getElementById("columnsPanel");
const columnSearch = document.getElementById("columnSearch");
const columnsShowAll = document.getElementById("columnsShowAll");
const columnsHideAll = document.getElementById("columnsHideAll");
const columnsReset = document.getElementById("columnsReset");
const csvColumnsToggle = document.getElementById("csvColumnsToggle");

const logoEl = document.getElementById("brandLogo");
const themeBtn = document.getElementById("themeBtn");
const root = document.documentElement; // <html>
const tableEl = document.querySelector("table");
// Build API URLs without embedded credentials (basic-auth URLs break fetch).
const API_ORIGIN = window.location && window.location.host
  ? `${window.location.protocol}//${window.location.host}`
  : "";

function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  let normalized = path;
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
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
let backgroundLoading = false;
let chipsVisible = true;
const tableReadyByApp = { sonarr: false, radarr: false };
const titleWidthByApp = { sonarr: 0, radarr: 0 };
const titleWidthSigByApp = { sonarr: "", radarr: "" };
const titleWidthAppliedSigByApp = { sonarr: "", radarr: "" };
let titleMeasureCtx = null;
let titleMeasureFont = "";
let titleMeasurePadding = 0;
const columnWidthLock = { active: false, widths: new Map(), token: 0 };
let statusPollTimer = null;
let statusCountdownTimer = null;
let statusCountdownRemaining = 0;
const STATUS_COUNTDOWN_SECONDS = 5;
let statusFlashTimer = null;
let statusCompletionFlashed = false;
let statusTickTimer = null;
let statusFetchTimer = null;
let lastStatusFetchAt = null;
let statusCollapsed = false;
let statusPillTimer = null;
let tautulliRefreshReloadTimer = null;
let copyToastEl = null;
let copyToastTimer = null;
const statusState = { apps: { sonarr: null, radarr: null }, tautulli: null };
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
  "First load can take a while for large libraries; later loads are cached and faster.";
const TAUTULLI_MATCHING_NOTICE = "Tautulli matching in progress.";
const NOTICE_FLAGS_HEADER = "X-Sortarr-Notice-Flags";
const TAUTULLI_POLL_INTERVAL_MS = 4000;
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

const TAUTULLI_COLUMNS = new Set([
  "TautulliMatchStatus",
  "Diagnostics",
  "PlayCount",
  "LastWatched",
  "DaysSinceWatched",
  "TotalWatchTimeHours",
  "WatchContentRatio",
  "UsersWatched",
]);
const LANGUAGE_COLUMNS = new Set([
  "AudioLanguages",
  "SubtitleLanguages",
  "AudioLanguagesMixed",
  "SubtitleLanguagesMixed",
]);
const COLUMN_GROUPS = {
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
    "AudioProfileMixed",
    "AudioLanguagesMixed",
    "SubtitleLanguagesMixed",
  ]),
  radarr: new Set([
    "TmdbId",
    "AudioCodecMixed",
    "AudioProfileMixed",
    "AudioLanguagesMixed",
    "SubtitleLanguagesMixed",
  ]),
};
const CSV_COLUMNS_KEY = "Sortarr-csv-columns";
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

const noticeByApp = { sonarr: "", radarr: "" };
const coldCacheByApp = { sonarr: false, radarr: false };
const pendingPrefetchByApp = { sonarr: null, radarr: null };
const tautulliPendingByApp = { sonarr: false, radarr: false };
const tautulliPollTimers = { sonarr: null, radarr: null };
const followUpRefreshTimers = { sonarr: null, radarr: null };

const ADVANCED_PLACEHOLDER_BASE =
  "Advanced filtering examples: path:C:\\ | dateadded:2024 | audio:eac3 | audio:Atmos | audiochannels>=6 | audiolang:eng | sublang:eng | nosubs:true | gbperhour:1 | totalsize:10 | videocodec:x265 | videohdr:hdr | resolution:2160p | instance:sonarr-2";
const ADVANCED_PLACEHOLDER_TAUTULLI =
  "Advanced filtering examples: path:C:\\ | dateadded:2024 | audio:eac3 | audio:Atmos | audiochannels>=6 | audiolang:eng | sublang:eng | nosubs:true | playcount>=5 | neverwatched:true | mismatch:true | dayssincewatched>=365 | watchtime>=10 | contenthours>=10 | gbperhour:1 | totalsize:10 | videocodec:x265 | videohdr:hdr | resolution:2160p | instance:sonarr-2";
const ADVANCED_HELP_BASE =
  "Use field:value for wildcards and comparisons. Numeric fields treat field:value as >= (use = for exact). gbperhour/totalsize with integer values use a whole-number bucket (e.g., gbperhour:1 = 1.0-1.99). Examples: dateadded:2024 audio:Atmos audiocodec:eac3 audiolang:eng sublang:eng nosubs:true videocodec:x265 videohdr:hdr instance:sonarr-2 " +
  "Fields: title, titleslug, tmdbid, dateadded, path, instance, videoquality, videocodec, videohdr, resolution, audio, audiocodec, audioprofile, audiocodecmixed, audioprofilemixed, audiolanguages, audiolang, audiolanguagesmixed, sublang, subtitlelanguagesmixed, audiochannels, nosubs, episodes, totalsize, avgepisode, runtime, filesize, gbperhour, contenthours";
const ADVANCED_HELP_TAUTULLI =
  "Use field:value for wildcards and comparisons. Numeric fields treat field:value as >= (use = for exact). gbperhour/totalsize with integer values use a whole-number bucket (e.g., gbperhour:1 = 1.0-1.99). Examples: dateadded:2024 audio:Atmos audiocodec:eac3 audiolang:eng sublang:eng nosubs:true playcount>=5 neverwatched:true mismatch:true dayssincewatched>=365 watchtime>=10 contenthours>=10 videocodec:x265 videohdr:hdr instance:sonarr-2 " +
  "Fields: title, titleslug, tmdbid, dateadded, path, instance, videoquality, videocodec, videohdr, resolution, audio, audiocodec, audioprofile, audiocodecmixed, audioprofilemixed, audiolanguages, audiolang, audiolanguagesmixed, sublang, subtitlelanguagesmixed, audiochannels, nosubs, matchstatus, mismatch, playcount, lastwatched, dayssincewatched, watchtime, contenthours, watchratio, users, episodes, totalsize, avgepisode, runtime, filesize, gbperhour";

// Store per-tab data so switching tabs doesn't briefly show the other tab's list
const dataByApp = { sonarr: [], radarr: [] };
const dataVersionByApp = { sonarr: 0, radarr: 0 };
const lastUpdatedByApp = { sonarr: null, radarr: null };
const sortCacheByApp = { sonarr: null, radarr: null };
const configState = { sonarrConfigured: false, radarrConfigured: false };
const instanceConfig = { sonarr: [], radarr: [] };
const instanceBaseById = { sonarr: {}, radarr: {} };

// Prevent stale fetches from rendering after you switch tabs
const loadTokens = { sonarr: 0, radarr: 0 };
const prefetchTokens = { sonarr: 0, radarr: 0 };
const RENDER_FLAG_STORAGE_KEY = "Sortarr-render-flags";
const DEFAULT_RENDER_FLAGS = {
  batch: true,
  deferHeavy: false,
  widthLock: true,
  stabilize: true,
};
const RENDER_BATCH_SIZE = 300;
const RENDER_BATCH_MIN = 1200;
const RENDER_BATCH_SIZE_LARGE = 600;
const RENDER_BATCH_LARGE_MIN = 7000;
const LAZY_CELL_BATCH_SIZE = 240;
const HYDRATE_FRAME_BUDGET_MS = 10;
const RENDER_FRAME_BUDGET_MS = 10;
const RENDER_FRAME_CHECK_EVERY = 25;

let sonarrBase = "";
let radarrBase = "";
let renderToken = 0;
let sonarrHeaderNormalized = false;
const rowCacheByApp = { sonarr: new Map(), radarr: new Map() };
const pendingStabilizeByApp = { sonarr: false, radarr: false };
const hydrationState = {
  token: 0,
  rows: [],
  index: 0,
  scheduled: false,
  perf: null,
};

function perfNow() {
  if (window.performance && typeof window.performance.now === "function") {
    return window.performance.now();
  }
  return Date.now();
}

function loadRenderFlags() {
  const flags = { ...DEFAULT_RENDER_FLAGS };
  if (typeof window === "undefined") return flags;
  try {
    const stored = JSON.parse(localStorage.getItem(RENDER_FLAG_STORAGE_KEY) || "{}");
    if (stored && typeof stored === "object") {
      Object.assign(flags, stored);
    }
  } catch {}
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
    return "unconfigured";
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
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

function setChipsVisible(visible) {
  chipsVisible = Boolean(visible);
  if (chipWrapEl) {
    chipWrapEl.classList.toggle("chip-wrap--hidden", !chipsVisible);
  }
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
    if (coldCacheByApp[app]) return;
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

function shouldShowTautulliNotice(app) {
  return Boolean(chipsVisible && tableReadyByApp[app]);
}

function filterStatusNotice(msg, app) {
  const text = msg || "";
  if (!text || shouldShowTautulliNotice(app)) return text;
  if (!text.includes(TAUTULLI_MATCHING_NOTICE)) return text;
  const parts = text.split(" | ").map(part => part.trim()).filter(Boolean);
  const filtered = parts.filter(part => part !== TAUTULLI_MATCHING_NOTICE);
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

function setLoading(loading, label) {
  isLoading = loading;
  updateLoadingIndicator();
  if (loadBtn) loadBtn.disabled = loading;
  if (label) setStatus(label);
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
  if (ageSeconds == null) return `${label}: Awaiting data`;
  return `${label}: ${formatAgeShort(ageSeconds)} ago`;
}

function setPartialBanner(show) {
  if (!partialBannerEl) return;
  partialBannerEl.classList.toggle("hidden", !show);
}

function formatProgress(counts, configured, progressMeta, tautulliState) {
  if (!configured) return "Not configured";
  const progressActive = Boolean(tautulliState?.refresh_in_progress && progressMeta?.total);
  const total = progressActive
    ? progressMeta?.total || 0
    : counts?.total || 0;
  if (!total) return "No cached data";
  const matched = progressActive
    ? progressMeta?.processed || 0
    : counts?.matched || 0;
  const label = progressActive ? "processed" : "matched";
  const base = `${matched}/${total} ${label}`;
  const progressAge = withElapsedAge(progressMeta?.updated_age_seconds);
  const progressAgeLabel = progressAge == null
    ? "--"
    : `${formatAgeShort(progressAge)} ago`;
  const progressSuffix = progressActive
    ? ` | updated ${progressAgeLabel}`
    : "";
  const pending = progressActive
    ? Math.max(total - matched, 0)
    : (counts?.pending || 0);
  if (pending > 0) return `${base} - ${pending} pending${progressSuffix}`;
  const notMatched = total - matched;
  if (notMatched > 0) return `${base} - ${notMatched} not matched${progressSuffix}`;
  return `${base}${progressSuffix}`;
}

function formatTautulliStatus(state) {
  if (!state || !state.configured) return "Not configured";
  if (state.refresh_in_progress) return "Matching in progress";
  if (state.status === "stale") return "Awaiting data";
  const age = formatAgeShort(withElapsedAge(state.index_age_seconds));
  return age === "--" ? "Matched" : `Matched (${age} ago)`;
}

function formatStatusPillText(appState, tautulli) {
  if (!appState?.configured) return "Data status";
  if (tautulli?.configured && tautulli.refresh_in_progress) {
    const total = appState?.progress?.total || 0;
    if (total > 0) {
      const processed = appState?.progress?.processed || 0;
      return `Matching ${processed}/${total}`;
    }
    return "Matching...";
  }
  return "Data status";
}

function updateStatusPill(appState, tautulli) {
  if (!statusPillEl) return;
  statusPillEl.textContent = formatStatusPillText(appState, tautulli);
  const progress = appState?.progress;
  let title = "Hover to expand data status";
  if (tautulli?.configured && tautulli.refresh_in_progress) {
    if (progress?.total) {
      const processed = progress.processed || 0;
      title = `Tautulli matching in progress (${processed}/${progress.total} processed). Hover to expand status.`;
    } else {
      title = "Tautulli matching in progress. Hover to expand status.";
    }
  }
  statusPillEl.title = title;
  statusPillEl.classList.toggle(
    "status-pill--pending",
    Boolean(tautulli?.refresh_in_progress)
  );
}

function pauseStatusCountdown() {
  clearStatusCountdown();
  statusCountdownRemaining = STATUS_COUNTDOWN_SECONDS;
  muteStatusCompleteNote(true);
}

function shouldAutoHideStatus(appState, tautulli) {
  if (!appState?.configured) return false;
  const counts = appState?.counts;
  const counted = (counts?.matched || 0) +
    (counts?.unmatched || 0) +
    (counts?.skipped || 0) +
    (counts?.unavailable || 0);
  const pending = counts && typeof counts.pending === "number"
    ? counts.pending
    : Math.max((counts?.total || 0) - counted, 0);
  const progressComplete = Boolean(
    counts?.total > 0 &&
    pending === 0
  );
  const cacheAge = appState?.cache?.memory_age_seconds ?? appState?.cache?.disk_age_seconds;
  const cacheReady = Boolean(appState?.configured && cacheAge != null);
  const tautulliReady = !tautulli?.configured ||
    (tautulli.index_age_seconds != null &&
      tautulli.status !== "stale" &&
      !tautulli.refresh_in_progress);
  return progressComplete && cacheReady && tautulliReady;
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

function showStatusRow() {
  if (!statusRowEl) return;
  clearStatusPillTimer();
  statusRowEl.classList.remove("status-row--hidden");
  if (statusPillEl) statusPillEl.classList.add("status-pill--hidden");
  statusCollapsed = false;
}

function hideStatusRow() {
  if (!statusRowEl) return;
  clearStatusPillTimer();
  statusRowEl.classList.add("status-row--hidden");
  statusCollapsed = true;
  if (!statusPillEl) return;
  statusPillEl.classList.add("status-pill--hidden");
  statusPillTimer = setTimeout(() => {
    if (statusCollapsed) statusPillEl.classList.remove("status-pill--hidden");
  }, 360);
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
  statusCountdownRemaining = STATUS_COUNTDOWN_SECONDS;
  updateStatusCompleteNote(`Data loaded. Hiding in ${statusCountdownRemaining}s...`, true);
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
    if (statusRowEl.matches(":hover") || (statusPillEl && statusPillEl.matches(":hover"))) {
      return;
    }
    statusCountdownRemaining -= 1;
    if (statusCountdownRemaining <= 0) {
      clearStatusCountdown();
      updateStatusCompleteNote("", false);
      hideStatusRow();
      return;
    }
    updateStatusCompleteNote(`Data loaded. Hiding in ${statusCountdownRemaining}s...`, true);
  }, 1000);
}

function updateStatusRowVisibility(appState, tautulli) {
  if (!statusRowEl) return;
  const shouldAutoHide = shouldAutoHideStatus(appState, tautulli);
  const hovering = statusRowEl.matches(":hover") || (statusPillEl && statusPillEl.matches(":hover"));
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

function updateArrRefreshButton(btn, configured) {
  if (!btn) return;
  const busy = btn.getAttribute("data-busy") === "1";
  btn.classList.toggle("hidden", !configured);
  btn.disabled = !configured || busy;
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

  if (progressStatusEl) {
    progressStatusEl.textContent = (tautulli && tautulli.configured)
      ? formatProgress(appState?.counts, appState?.configured, appState?.progress, tautulli)
      : "--";
  }
  if (tautulliStatusEl) {
    tautulliStatusEl.textContent = formatTautulliStatus(tautulli);
  }
  if (cacheStatusEl) {
    const parts = [];
    const appCache = statusState.apps?.[activeApp]?.cache;
    if (statusState.apps?.[activeApp]?.configured) {
      const label = activeApp === "sonarr" ? "Sonarr" : "Radarr";
      const appAgeSeconds = appCache?.memory_age_seconds ?? appCache?.disk_age_seconds;
      parts.push(formatCacheStatus(label, withElapsedAge(appAgeSeconds)));
    }
    if (tautulli && tautulli.configured) {
      parts.push(formatCacheStatus("Tautulli", withElapsedAge(tautulli.index_age_seconds)));
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
  updateArrRefreshButton(refreshSonarrBtn, configState.sonarrConfigured);
  updateArrRefreshButton(refreshRadarrBtn, configState.radarrConfigured);
  updateStatusRowVisibility(appState, tautulli);
  updateStatusPill(appState, tautulli);
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
  if (!nextTautulli?.configured) return;
  const wasRefreshing = Boolean(prevTautulli?.refresh_in_progress);
  const isRefreshing = Boolean(nextTautulli?.refresh_in_progress);
  if (wasRefreshing && !isRefreshing) {
    scheduleTautulliRefreshReload();
  }
}

function scheduleStatusPoll() {
  if (statusPollTimer) return;
  if (!statusState.tautulli?.refresh_in_progress) return;
  statusPollTimer = setTimeout(async () => {
    statusPollTimer = null;
    await fetchStatus({ silent: true, lite: true });
  }, TAUTULLI_POLL_INTERVAL_MS);
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

async function fetchStatus({ silent = false, lite = false } = {}) {
  try {
    const url = lite ? "/api/status?lite=1" : "/api/status";
    const res = await fetch(apiUrl(url));
    if (!res.ok) {
      if (!silent) console.warn("Status fetch failed", res.status);
      return;
    }
    const data = await res.json();
    const prevTautulli = statusState.tautulli;
    statusState.apps = mergeStatusApps(statusState.apps, data.apps) || statusState.apps;
    statusState.tautulli = data.tautulli || statusState.tautulli;
    lastStatusFetchAt = Date.now();
    syncTautulliPendingFromStatus(prevTautulli, statusState.tautulli);
    handleTautulliRefreshState(prevTautulli, statusState.tautulli);
    updateStatusPanel();
    updateLastUpdatedDisplay();
    scheduleStatusPoll();
  } catch (e) {
    if (!silent) console.warn("Status fetch failed", e);
  }
}

function startStatusTick() {
  if (statusTickTimer) return;
  statusTickTimer = setInterval(() => {
    if (document.hidden) return;
    updateStatusPanel();
    updateLastUpdatedDisplay();
  }, 1000);
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
    if (/tautulli matching in progress/i.test(notice)) flags.add("tautulli_refresh");
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
  const pageFresh = isPageFresh();
  const coldCache = flags.has("cold_cache");
  const prevColdCache = coldCacheByApp[app];
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
        noticeByApp[other] = TAUTULLI_MATCHING_NOTICE;
      }
    }
  }

  const notices = [];
  if (tautulliPending) {
    notices.push(TAUTULLI_MATCHING_NOTICE);
  }
  if (coldCache || pageFresh) {
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
  }
  if (pageFresh) {
    schedulePageFreshNoticeClear();
  }
}

function resetUiState() {
  localStorage.removeItem(COLUMN_STORAGE_KEY);
  localStorage.removeItem(CSV_COLUMNS_KEY);
  localStorage.removeItem("Sortarr-theme");
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
      const next = new Set((chipQuery || "").split(/\s+/).filter(Boolean));
      if (next.has(query)) {
        next.delete(query);
        btn.classList.remove("active");
      } else {
        next.add(query);
        btn.classList.add("active");
      }
      chipQuery = Array.from(next).join(" ");
      if (tableReadyByApp[activeApp]) {
        pendingStabilizeByApp[activeApp] = true;
      }
      render(dataByApp[activeApp] || []);
    });
  });
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
      btn.textContent = inst.name || (app === "sonarr" ? "Sonarr" : "Radarr");
      btn.setAttribute("data-app", app);
      btn.setAttribute("data-instance", "true");
      if (inst.id) {
        const query = `instance:${inst.id}`;
        btn.setAttribute("data-query", query);
        if ((chipQuery || "").split(/\s+/).includes(query)) {
          btn.classList.add("active");
        }
      }
      container.appendChild(btn);
    });
  });

  bindChipButtons();
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
  };

  const res = await fetch(apiUrl("/api/diagnostics/tautulli-match"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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
    setStatusFor("Refresh failed: row not found.", ROW_REFRESH_FOLLOWUP_MS);
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
  setRowRefreshPending(rowEl, true);
  btn.disabled = true;
  setStatus(`Refreshing ${app === "sonarr" ? "series" : "movie"}...`);
  try {
    const arrPromise = requestArrRefresh(app, { itemId, instanceId });
    const tautulliConfigured = Boolean(statusState.tautulli?.configured);
    const tautulliPromise = tautulliConfigured
      ? requestTautulliItemRefresh(row, app)
      : null;
    const arrResultPromise = settlePromise(arrPromise);
    const tautulliResultPromise = tautulliConfigured
      ? settleWithTimeout(tautulliPromise, TAUTULLI_ROW_REFRESH_STATUS_TIMEOUT_MS)
      : Promise.resolve({ status: "fulfilled", value: { skipped: true } });
    const waitMs = tautulliConfigured ? ITEM_REFRESH_TAUTULLI_DELAY_MS : ITEM_REFRESH_DELAY_MS;
    const reloadDelayPromise = arrResultPromise.then(arrResult => {
      if (arrResult.status !== "fulfilled") return null;
      return delay(waitMs);
    });
    const [arrResult, tautulliResult] = await Promise.all([arrResultPromise, tautulliResultPromise]);
    const parts = [];
    const appLabel = app === "sonarr" ? "Sonarr" : "Radarr";
    const arrOk = arrResult.status === "fulfilled";
    if (arrOk) {
      parts.push(`${appLabel} refresh queued.`);
    } else {
      parts.push(`${appLabel} refresh failed.`);
    }
    if (tautulliConfigured) {
      if (tautulliResult.status === "timeout") {
        parts.push("Tautulli refresh pending.");
      } else if (tautulliResult.status === "fulfilled") {
        if (tautulliResult.value?.skipped) {
          parts.push("Tautulli refresh skipped.");
        } else {
          parts.push("Tautulli refresh queued.");
        }
      } else {
        parts.push("Tautulli refresh failed.");
      }
    }
    const tautulliOk = tautulliResult.status === "fulfilled";
    const tautulliSkipped = tautulliOk && tautulliResult.value?.skipped;
    const tautulliPending = tautulliResult.status === "timeout";
    const tautulliUsed = Boolean(tautulliConfigured && !tautulliSkipped && !tautulliPending);
    const shouldForceTautulli = Boolean(tautulliConfigured && !hasTautulliKeys(row));
    let refreshOutcome = arrOk ? "success" : "fail";
    if (arrOk && tautulliConfigured && (tautulliPending || tautulliSkipped || !tautulliOk)) {
      refreshOutcome = "partial";
    } else if (tautulliUsed && arrOk !== tautulliOk) {
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
          const showTautulliLabel = Boolean(tautulliConfigured);
          const tautulliLabel = tautulliPending
            ? "Tautulli refresh pending"
            : (tautulliUsed
              ? `Tautulli refresh ${tautulliOk ? "succeeded" : "failed"}`
              : "Tautulli refresh skipped");
          const filterNote = shouldClearFilters ? " Filters cleared to keep item visible." : "";
          const followup = refreshOutcome === "partial"
            ? `${rowTitle} Updated - Partial refresh (${arrLabel}, ${tautulliLabel})`
            : `${rowTitle} Updated - ${arrLabel}${showTautulliLabel ? `, ${tautulliLabel}` : ""}`;
          scheduleRowRefreshFollowup(statusToken, `${followup}${filterNote}`);
          const refreshedRow = findRowElement(app, rowKey) || rowEl;
          setRowRefreshPending(refreshedRow, false);
          flashRowRefresh(refreshedRow, refreshOutcome);
        }
      } catch (err) {
        scheduleRowRefreshFollowup(
          statusToken,
          `${rowTitle} Refresh failed - Row reload failed: ${err.message}`
        );
      }
    }
    if (!arrOk && tautulliUsed) {
      const arrLabel = `${appLabel} refresh failed`;
      const tautulliLabel = `Tautulli refresh ${tautulliOk ? "succeeded" : "failed"}`;
      const followup = refreshOutcome === "partial"
        ? `${rowTitle} Refresh failed - Partial refresh (${arrLabel}, ${tautulliLabel})`
        : `${rowTitle} Refresh failed - ${arrLabel}, ${tautulliLabel}`;
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

function findRowElement(app, rowKey) {
  if (!tbody || !rowKey) return null;
  const safeKey = window.CSS && CSS.escape ? CSS.escape(rowKey) : rowKey.replace(/["\\]/g, "\\$&");
  return tbody.querySelector(`tr[data-app="${app}"][data-row-key="${safeKey}"]`);
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

function formatMixedValue(value, mixed) {
  const base = escapeHtml(value ?? "");
  if (!mixed) return base;
  if (!base) return '<span class="mixed-badge">Mixed</span>';
  return `<span class="mixed-wrap">${base}<span class="mixed-badge">Mixed</span></span>`;
}

function formatAudioCodecCell(value) {
  if (!value) return "";
  return `<span class="audio-codec-cell">${value}</span>`;
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
  const { allowToggle = false } = options;
  const summary = summarizeLanguageValue(value);
  const base = escapeHtml(summary.display);
  if (!base && mixed) return '<span class="mixed-badge">Mixed</span>';
  if (!base) return "";

  const full = escapeHtml(summary.full);
  const classes = summary.truncated ? "lang-cell lang-cell-truncated" : "lang-cell";
  const list = `<span class="lang-list" data-lang-full="${full}" data-lang-short="${base}" data-lang-state="short"${full ? ` title="${full}"` : ""}>${base}</span>`;
  const toggle = allowToggle && summary.truncated
    ? '<button class="lang-toggle" type="button" aria-expanded="false">Show all</button>'
    : "";
  const badge = mixed ? '<span class="mixed-badge mixed-badge-inline">Mixed</span>' : "";
  return `<span class="${classes}">${list}${toggle}${badge}</span>`;
}

function formatLastWatched(value) {
  if (!value) return '<span class="muted">Never</span>';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return escapeHtml(date.toLocaleString());
}

function formatDateAdded(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return escapeHtml(date.toLocaleDateString());
}

function formatDaysSince(value, lastWatched) {
  if (!lastWatched) return '<span class="muted">Never</span>';
  const num = Number(value);
  if (!Number.isFinite(num)) return escapeHtml(value ?? "");
  return escapeHtml(num);
}

function formatHoursClock(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  const totalMinutes = Math.round(num * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatWatchTimeHours(value) {
  const text = formatHoursClock(value);
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
    if (raw === "true") return "true";
    if (raw === "false") return "false";
  }
  return value ? "true" : "false";
}

function buildMatchBadge(row) {
  const status = row?.TautulliMatchStatus;
  const reason = row?.TautulliMatchReason;
  let label = "Unavailable";
  let className = "match-pill match-pill--muted";

  if (status === "matched") {
    label = "Matched";
    className = "match-pill match-pill--ok";
  } else if (status === "unmatched") {
    label = "Potential mismatch";
    className = "match-pill match-pill--warn";
  } else if (status === "skipped") {
    if (typeof reason === "string" && /future/i.test(reason)) {
      label = "Future release";
      className = "match-pill match-pill--future";
    } else if (typeof reason === "string" && /no (episodes|file) on disk/i.test(reason)) {
      label = "Not on disk";
      className = "match-pill match-pill--nodisk";
    } else {
      label = "Not checked";
      className = "match-pill match-pill--muted";
    }
  } else if (status === "unavailable") {
    label = "Unavailable";
    className = "match-pill match-pill--muted";
  }

  const title = reason ? ` title="${escapeHtml(reason)}"` : "";
  return `<span class="${className}"${title}>${label}</span>`;
}

function formatBitrateCell(row) {
  const raw = row?.BitrateMbps;
  if (raw === "" || raw === null || raw === undefined) return "";
  const value = escapeHtml(raw);
  if (row?.BitrateEstimated) {
    return `${value} <span class="bitrate-est" title="Estimated from file size and runtime">est</span>`;
  }
  return value;
}

const FIELD_MAP = {
  title: "Title",
  titleslug: "TitleSlug",
  tmdbid: "TmdbId",
  dateadded: "DateAdded",
  added: "DateAdded",
  path: "Path",
  videoquality: "VideoQuality",
  videocodec: "VideoCodec",
  videohdr: "VideoHDR",
  resolution: "Resolution",
  audiocodec: "AudioCodec",
  audioprofile: "AudioProfile",
  audiocodecmixed: "AudioCodecMixed",
  audioprofilemixed: "AudioProfileMixed",
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
  episodes: "EpisodesCounted",
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

function parseAdvancedQuery(query) {
  const tokens = String(query ?? "").trim().split(/\s+/).filter(Boolean);
  const preds = [];
  const warnings = [];
  const tautulliWarning = "Tautulli filters are unavailable until configured.";
  let tautulliWarned = false;

  for (const token of tokens) {
    const comp = token.match(/^([a-zA-Z]+)(>=|<=|=|>|<)(.+)$/);
    if (comp) {
      const field = comp[1].toLowerCase();
      if (TAUTULLI_FILTER_FIELDS.has(field) && !tautulliEnabled) {
        if (!tautulliWarned) {
          warnings.push(tautulliWarning);
          tautulliWarned = true;
        }
        preds.push(() => false);
        continue;
      }
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
      preds.push(row => compareNumber(parseNumberValue(getFieldValue(row, field), field), comp[2], val));
      continue;
    }

    const idx = token.indexOf(":");
    if (idx > 0) {
      const field = token.slice(0, idx).toLowerCase();
      if (TAUTULLI_FILTER_FIELDS.has(field) && !tautulliEnabled) {
        if (!tautulliWarned) {
          warnings.push(tautulliWarning);
          tautulliWarned = true;
        }
        preds.push(() => false);
        continue;
      }
      const value = token.slice(idx + 1);
      if (field === "nosubs") {
        const boolVal = parseBoolValue(value);
        if (boolVal === null) {
          warnings.push(`Invalid value for '${field}' (use true/false).`);
          preds.push(() => false);
          continue;
        }
        preds.push(row => {
          const hasSubs = hasSubtitleLanguages(row);
          return boolVal ? !hasSubs : hasSubs;
        });
        continue;
      }
      if (field === "audio") {
        preds.push(row => (
          matchPattern(getFieldValue(row, "AudioCodec"), value) ||
          matchPattern(getFieldValue(row, "AudioProfile"), value)
        ));
        continue;
      }
      if (field === "neverwatched") {
        const boolVal = parseBoolValue(value);
        if (boolVal === null) {
          warnings.push(`Invalid value for '${field}' (use true/false).`);
          preds.push(() => false);
          continue;
        }
        preds.push(row => {
          const matched = row.TautulliMatched === true;
          const never = matched && !row.LastWatched;
          return boolVal ? never : !never;
        });
        continue;
      }
      if (field === "mismatch") {
        const boolVal = parseBoolValue(value);
        if (boolVal === null) {
          warnings.push(`Invalid value for '${field}' (use true/false).`);
          preds.push(() => false);
          continue;
        }
        preds.push(row => {
          const mismatched = row.TautulliMatchStatus === "unmatched";
          return boolVal ? mismatched : !mismatched;
        });
        continue;
      }
      if (field === "instance") {
        preds.push(row => (
          matchPattern(row?.InstanceName ?? "", value) ||
          matchPattern(row?.InstanceId ?? "", value)
        ));
        continue;
      }
      if (field === "audiolanguages" || field === "audiolang" ||
          field === "subtitlelanguages" || field === "sublanguages" ||
          field === "sublang" || field === "subtitles") {
        const queryValue = normalizeLanguageQuery(value);
        preds.push(row => matchPattern(
          normalizeLanguageLabel(getFieldValue(row, field)),
          queryValue
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
            const num = parseNumberValue(getFieldValue(row, field), field);
            return Number.isFinite(num) && num >= val && num < val + 1;
          });
          continue;
        }
        preds.push(row => compareNumber(parseNumberValue(getFieldValue(row, field), field), ">=", val));
        continue;
      }
      if (NUMERIC_FIELDS.has(field)) {
        const val = Number(value);
        if (!Number.isFinite(val)) {
          warnings.push(`Invalid number for '${field}'.`);
          preds.push(() => false);
          continue;
        }
        preds.push(row => compareNumber(parseNumberValue(getFieldValue(row, field), field), ">=", val));
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
      if (field === "resolution") {
        preds.push(row => resolutionMatches(getFieldValue(row, field), value));
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

function clearActiveFilters() {
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
  if (changed) {
    document.querySelectorAll(".chip.active").forEach(btn => btn.classList.remove("active"));
    updateAdvancedWarnings([]);
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
  const useAdvanced = advancedEnabled;
  const advValue = String(advancedFilter?.value ?? "").trim();
  const chipValue = String(chipQuery ?? "").trim();
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
    if (aKey.hasNum && bKey.hasNum) return (aKey.num - bKey.num) * dir;
    if (aKey.str < bKey.str) return -1 * dir;
    if (aKey.str > bKey.str) return 1 * dir;
    return 0;
  });
}

const COLUMN_STORAGE_KEY = "Sortarr-columns";
const DEFAULT_HIDDEN_COLUMNS = new Set([
  "Instance",
  "AudioProfile",
  "AudioLanguages",
  "SubtitleLanguages",
  "TitleSlug",
  "TmdbId",
  "DateAdded",
  "AudioCodecMixed",
  "AudioProfileMixed",
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
const DISPLAY_CACHE_COLUMNS = {
  AudioCodec: { key: "audioCodec", compute: row => formatAudioCodecCell(
    formatMixedValue(row.AudioCodec ?? "", row.AudioCodecMixed)
  ) },
  ContentHours: { key: "contentHours", compute: row => formatWatchTimeHours(row.ContentHours ?? "") },
  VideoQuality: { key: "videoQuality", compute: row => escapeHtml(row.VideoQuality ?? "") },
  Resolution: { key: "resolution", compute: row => escapeHtml(row.Resolution ?? "") },
  VideoCodec: { key: "videoCodec", compute: row => escapeHtml(row.VideoCodec ?? "") },
  AudioChannels: { key: "audioChannels", compute: row => escapeHtml(row.AudioChannels ?? "") },
  Path: { key: "path", compute: row => escapeHtml(row.Path ?? "") },
  TautulliMatchStatus: { key: "matchBadge", compute: row => buildMatchBadge(row) },
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

function setColumnGroup(group, checked) {
  if (!columnsPanel) return;
  const cols = COLUMN_GROUPS[group] || [];
  cols.forEach(col => {
    const input = columnsPanel.querySelector(`input[data-col="${col}"]`);
    if (input) {
      input.checked = checked;
    }
  });
}

function updateColumnGroupToggles() {
  if (!columnsPanel) return;
  columnsPanel.querySelectorAll("input[data-col-group]").forEach(input => {
    const group = input.getAttribute("data-col-group");
    const cols = COLUMN_GROUPS[group] || [];
    const inputs = cols
      .map(col => columnsPanel.querySelector(`input[data-col="${col}"]`))
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

function enforceRequiredColumns() {
  if (!columnsPanel) return;
  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    const col = input.getAttribute("data-col");
    if (REQUIRED_COLUMNS.has(col)) {
      input.checked = true;
      input.disabled = true;
    }
  });
}

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
      input.checked = !DEFAULT_HIDDEN_COLUMNS.has(col);
    }
  });
  enforceRequiredColumns();
  updateColumnGroupToggles();
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
    const col = input.getAttribute("data-col");
    if (!input.checked && !REQUIRED_COLUMNS.has(col)) {
      hidden.add(col);
    }
  });
  return hidden;
}

function isColumnHidden(col, app, hiddenColumns) {
  const hideByCol = hiddenColumns && hiddenColumns.has(col);
  const hideByTautulli = TAUTULLI_COLUMNS.has(col) && !tautulliEnabled;
  const hideByCsv = col && CSV_COLUMNS_BY_APP[app]?.has(col) && !csvColumnsEnabled();
  const hideByInstance = col === "Instance" && getInstanceCount(app) <= 1;
  return hideByCol || hideByTautulli || hideByCsv || hideByInstance;
}

function getDeferredColumns(app, hiddenColumns) {
  const deferred = new Set();
  LAZY_COLUMNS.forEach(col => {
    if (isColumnHidden(col, app, hiddenColumns)) {
      deferred.add(col);
    }
  });
  return deferred;
}

function markColumnVisibilityDirty() {
  columnVisibilityVersion += 1;
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
      return;
    }
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
      const isCsv = CSV_COLUMNS_BY_APP[activeApp]?.has(col);
      const csvMatch = !isCsv || csvEnabled;
      const hideByInstance = col === "Instance" && getInstanceCount(activeApp) <= 1;
      show = show && tautulliMatch && csvMatch && !hideByInstance;
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
    input.checked = checked;
  });
  enforceRequiredColumns();
  saveColumnPrefs();
  updateColumnGroupToggles();
  markColumnVisibilityDirty();
  updateColumnVisibility();
  applyTitleWidth(activeApp);
}

function resetColumnPrefs() {
  localStorage.removeItem(COLUMN_STORAGE_KEY);
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

  const th = document.querySelector(`th[data-sort="${CSS.escape(sortKey)}"]`);
  if (!th) return;

  th.classList.add("active-sort");
  const ind = th.querySelector(".sort-indicator");
  if (ind) ind.textContent = sortDir === "asc" ? "^" : "v";
}

function updateColumnVisibility(rootEl = document) {
  const hidden = getHiddenColumns();
  const scope = rootEl && rootEl.querySelectorAll ? rootEl : document;
  const isGlobal = scope === document;
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
    const thead = document.querySelector("thead");
    if (thead) scopes.push(thead);
  }

  scopes.forEach(scopeEl => {
    scopeEl.querySelectorAll("[data-col]").forEach(el => {
      if (columnsPanel && columnsPanel.contains(el)) return;
      const col = el.getAttribute("data-col");
      const app = el.getAttribute("data-app");
      const hideByApp = app && app !== activeApp;
      const hideByCol = hidden.has(col);
      const hideByTautulli = TAUTULLI_COLUMNS.has(col) && !tautulliEnabled;
      const hideByCsv = col && CSV_COLUMNS_BY_APP[activeApp]?.has(col) && !csvColumnsEnabled();
      const hideByInstance = col === "Instance" && getInstanceCount(activeApp) <= 1;
      el.classList.toggle(
        "col-hidden",
        hideByApp || hideByCol || hideByTautulli || hideByCsv || hideByInstance
      );
    });
  });
  if (isGlobal && newlyVisible && newlyVisible.length) {
    newlyVisible.forEach(col => hydrateLazyDisplayCells(col));
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
        btn.classList.remove("active");
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
      btn.classList.remove("active");
    }
  });

  bindChipButtons();

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

function setBatching(active) {
  if (!tableEl) return;
  tableEl.classList.toggle("is-batching", Boolean(active));
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

function lockColumnWidths(token) {
  if (!tableEl) return;
  const headers = tableEl.querySelectorAll("thead th[data-col]");
  if (!headers.length) return;
  columnWidthLock.widths.clear();
  headers.forEach(th => {
    if (th.classList.contains("col-hidden")) return;
    const col = th.getAttribute("data-col");
    if (!col || col === "Title") return;
    const width = Math.ceil(th.getBoundingClientRect().width);
    if (width > 0) {
      columnWidthLock.widths.set(col, width);
    }
  });
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
  columnWidthLock.widths.clear();
  columnWidthLock.active = false;
  columnWidthLock.token = 0;
  applyTitleWidth(activeApp, null, { skipIfUnchanged: true });
}

function getTitleMeasureContext() {
  if (titleMeasureCtx) return titleMeasureCtx;
  const canvas = document.createElement("canvas");
  titleMeasureCtx = canvas.getContext("2d");
  return titleMeasureCtx;
}

function ensureTitleMeasureStyle() {
  if (!tableEl) return false;
  const header = tableEl.querySelector('th[data-col="Title"]');
  if (!header) return false;
  const style = getComputedStyle(header);
  const fontSize = style.fontSize || "14px";
  const fontFamily = style.fontFamily || "system-ui, sans-serif";
  const font = `400 ${fontSize} ${fontFamily}`;
  const ctx = getTitleMeasureContext();
  if (!ctx) return false;
  if (font !== titleMeasureFont) {
    titleMeasureFont = font;
    ctx.font = font;
  }
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  titleMeasurePadding = paddingLeft + paddingRight;
  return true;
}

function findLongestTitle(rows) {
  if (!rows || !rows.length) return { title: "", signature: "" };
  let maxLen = 0;
  let longest = "";
  rows.forEach(row => {
    const raw = row?.Title ?? row?.title ?? "";
    if (!raw) return;
    const title = String(raw);
    const len = title.length;
    if (len > maxLen) {
      maxLen = len;
      longest = title;
    }
  });
  const signature = longest ? `${rows.length}:${maxLen}:${longest}` : `${rows.length}:0`;
  return { title: longest, signature };
}

function updateTitleWidthCache(app, rows) {
  if (!rows || !rows.length) {
    titleWidthByApp[app] = 0;
    titleWidthSigByApp[app] = "";
    return;
  }
  const { title, signature } = findLongestTitle(rows);
  if (signature === titleWidthSigByApp[app] && titleWidthByApp[app]) {
    return;
  }
  titleWidthSigByApp[app] = signature;
  if (!title) {
    titleWidthByApp[app] = 0;
    return;
  }
  if (!ensureTitleMeasureStyle()) {
    titleWidthByApp[app] = 0;
    return;
  }
  const ctx = getTitleMeasureContext();
  if (!ctx) {
    titleWidthByApp[app] = 0;
    return;
  }
  titleWidthByApp[app] = Math.ceil(ctx.measureText(title).width + titleMeasurePadding);
}

function applyTitleWidth(app, rows = null, options = {}) {
  if (rows) {
    updateTitleWidthCache(app, rows);
  }
  if (!tableEl || app !== activeApp) return;
  const header = tableEl.querySelector('th[data-col="Title"]');
  if (!header) return;
  const width = titleWidthByApp[app];
  if (!width || header.classList.contains("col-hidden")) {
    header.style.width = "";
    header.style.minWidth = "";
    header.style.maxWidth = "";
    titleWidthAppliedSigByApp[app] = "";
    return;
  }
  const widthPx = `${width}px`;
  if (options.skipIfUnchanged &&
      titleWidthAppliedSigByApp[app] === titleWidthSigByApp[app] &&
      header.style.width === widthPx &&
      header.style.minWidth === widthPx &&
      header.style.maxWidth === widthPx) {
    return;
  }
  header.style.width = widthPx;
  header.style.minWidth = widthPx;
  header.style.maxWidth = widthPx;
  titleWidthAppliedSigByApp[app] = titleWidthSigByApp[app];
}

function setActiveTab(app) {
  if (activeApp === app) return;

  activeApp = app;
  markColumnVisibilityDirty();

  tabSonarr.classList.toggle("active", activeApp === "sonarr");
  tabRadarr.classList.toggle("active", activeApp === "radarr");
  setLoading(false);
  setStatus("");
  setStatusNotice(noticeByApp[activeApp] || "");
  updateBackgroundLoading();
  updateStatusPanel();

  // default sorts per tab
  if (activeApp === "sonarr") {
    sortKey = "AvgEpisodeSizeGB";
    sortDir = "desc";
  } else {
    sortKey = "GBPerHour";
    sortDir = "desc";
  }

  syncCsvToggle();
  updateColumnVisibility();
  updateColumnFilter();
  updateSortIndicators();
  updateLastUpdatedDisplay();
  applyTitleWidth(activeApp, null, { skipIfUnchanged: true });

  // clear filter per-tab
  if (titleFilter) titleFilter.value = "";
  if (pathFilter) pathFilter.value = "";
  if (advancedFilter) advancedFilter.value = "";
  setAdvancedMode(false);
  const chipsChanged = updateChipVisibility();

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
  if (app === "sonarr") {
    const slug =
      row.TitleSlug ??
      row.titleSlug ??
      row.Slug ??
      row.slug ??
      sonarrSlugFromTitle(row.Title);

    const instanceId = row.InstanceId ?? row.instanceId;
    const base = (instanceId && instanceBaseById.sonarr[instanceId]) || sonarrBase;
    if (!base || !slug) return escapeHtml(row.Title);

    const url = `${base.replace(/\/$/, "")}/series/${slug}`;
    return `<a class="title-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.Title)}</a>`;
  } else {
    // IMPORTANT: Radarr UI expects TMDB id for /movie/<id> in your setup
    const tmdbId = row.TmdbId ?? row.tmdbId;
    const instanceId = row.InstanceId ?? row.instanceId;
    const base = (instanceId && instanceBaseById.radarr[instanceId]) || radarrBase;
    if (!base || !tmdbId) return escapeHtml(row.Title);

    const url = `${base.replace(/\/$/, "")}/movie/${tmdbId}`;
    return `<a class="title-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.Title)}</a>`;
  }
}

const ROW_REFRESH_ICON_HTML = '<span aria-hidden="true">↻</span>';
const ROW_REFRESH_BUTTON_HTML =
  `<button class="row-refresh-btn row-refresh-btn--title" type="button" title="Refresh in Arr (and Tautulli if configured)" aria-label="Refresh item">${ROW_REFRESH_ICON_HTML}</button>`;
const DIAG_BUTTON_HTML =
  `<div class="diag-actions"><button class="match-diag-btn" type="button" title="Copy match diagnostics" aria-label="Copy match diagnostics">i</button></div>`;

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

  if (colSet.has("AudioProfile")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "audioProfileCell")) {
      const rawAudioProfile = row.AudioProfile ?? "";
      const audioProfileValue = formatMixedValue(rawAudioProfile, row.AudioProfileMixed);
      cache.audioProfileCell = (rawAudioProfile || row.AudioProfileMixed)
        ? audioProfileValue
        : '<span class="muted">Not reported</span>';
    }
    values.AudioProfile = cache.audioProfileCell;
  }

  if (colSet.has("AudioLanguages")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "audioLanguagesCell")) {
      const rawAudioLanguages = row.AudioLanguages ?? "";
      cache.audioLanguagesCell = (rawAudioLanguages || row.AudioLanguagesMixed)
        ? formatLanguageValue(rawAudioLanguages, row.AudioLanguagesMixed, { allowToggle: true })
        : '<span class="muted">Not reported</span>';
    }
    values.AudioLanguages = cache.audioLanguagesCell;
  }

  if (colSet.has("SubtitleLanguages")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "subtitleLanguagesCell")) {
      const rawSubtitleLanguages = row.SubtitleLanguages ?? "";
      cache.subtitleLanguagesCell = (rawSubtitleLanguages || row.SubtitleLanguagesMixed)
        ? formatLanguageValue(rawSubtitleLanguages, row.SubtitleLanguagesMixed, { allowToggle: true })
        : '<span class="muted">Not reported</span>';
    }
    values.SubtitleLanguages = cache.subtitleLanguagesCell;
  }

  if (colSet.has("TitleSlug")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "titleSlugCell")) {
      const slug = row.TitleSlug ?? row.titleSlug ?? sonarrSlugFromTitle(row.Title);
      cache.titleSlugCell = escapeHtml(slug ?? "");
    }
    values.TitleSlug = cache.titleSlugCell;
  }

  if (colSet.has("TmdbId")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "tmdbIdCell")) {
      cache.tmdbIdCell = escapeHtml(row.TmdbId ?? row.tmdbId ?? "");
    }
    values.TmdbId = cache.tmdbIdCell;
  }

  if (colSet.has("AudioCodecMixed")) {
    values.AudioCodecMixed = formatBoolValue(row.AudioCodecMixed);
  }
  if (colSet.has("AudioProfileMixed")) {
    values.AudioProfileMixed = formatBoolValue(row.AudioProfileMixed);
  }
  if (colSet.has("AudioLanguagesMixed")) {
    values.AudioLanguagesMixed = formatBoolValue(row.AudioLanguagesMixed);
  }
  if (colSet.has("SubtitleLanguagesMixed")) {
    values.SubtitleLanguagesMixed = formatBoolValue(row.SubtitleLanguagesMixed);
  }

  if (colSet.has("VideoHDR")) {
    if (!Object.prototype.hasOwnProperty.call(cache, "videoHdrCell")) {
      cache.videoHdrCell = escapeHtml(row.VideoHDR ?? "");
    }
    values.VideoHDR = cache.videoHdrCell;
  }

  if (colSet.has("Diagnostics")) {
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
    const notReported = '<span class="muted" title="Not reported">n/a</span>';
    const noWatchData = '<span class="muted" title="No watch data">n/a</span>';
    const noRuntime = '<span class="muted" title="No runtime">n/a</span>';

    if (colSet.has("PlayCount")) {
      values.PlayCount = tautulliMatched
        ? escapeHtml(row.PlayCount ?? 0)
        : notReported;
    }
    if (colSet.has("LastWatched")) {
      values.LastWatched = tautulliMatched
        ? formatLastWatched(row.LastWatched)
        : notReported;
    }
    if (colSet.has("DaysSinceWatched")) {
      values.DaysSinceWatched = tautulliMatched
        ? formatDaysSince(row.DaysSinceWatched, row.LastWatched)
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
        ? escapeHtml(row.UsersWatched ?? 0)
        : notReported;
    }
  }

  return values;
}

function buildRow(row, app, options = {}) {
  const tr = document.createElement("tr");
  tr.dataset.rowKey = row.__sortarrKey || buildRowKey(row, app);
  tr.dataset.app = app;
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
  const matchBadgeState = resolveDisplayCacheValue(
    row,
    app,
    "TautulliMatchStatus",
    displayCache,
    isColumnVisible("TautulliMatchStatus")
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
  const audioCodec = audioCodecState.value;
  const matchBadge = matchBadgeState.value;
  const contentHours = contentHoursState.value;
  const titleLink = displayCache.titleLink;
  const titleCell = `${ROW_REFRESH_BUTTON_HTML}${titleLink}`;
  const dateAdded = formatDateAdded(row.DateAdded);
  const videoQuality = videoQualityState.value;
  const resolution = resolutionState.value;
  const videoCodec = videoCodecState.value;
  const audioChannels = audioChannelsState.value;
  const rowPath = pathState.value;
  const bitrateCell = formatBitrateCell(row);
  const audioCodecAttr = audioCodecState.lazy ? ' data-lazy-value="1"' : "";
  const matchBadgeAttr = matchBadgeState.lazy ? ' data-lazy-value="1"' : "";
  const contentHoursAttr = contentHoursState.lazy ? ' data-lazy-value="1"' : "";
  const videoQualityAttr = videoQualityState.lazy ? ' data-lazy-value="1"' : "";
  const resolutionAttr = resolutionState.lazy ? ' data-lazy-value="1"' : "";
  const videoCodecAttr = videoCodecState.lazy ? ' data-lazy-value="1"' : "";
  const audioChannelsAttr = audioChannelsState.lazy ? ' data-lazy-value="1"' : "";
  const pathAttr = pathState.lazy ? ' data-lazy-value="1"' : "";
  const deferredColumns = options.deferredColumns;
  const visibleHeavyColumns = options.visibleHeavyColumns || LAZY_COLUMNS_ARRAY;
  const heavyValues = visibleHeavyColumns.length
    ? computeHeavyCellValues(row, app, visibleHeavyColumns)
    : {};
  const instanceName = heavyValues.Instance ?? "";
  const audioProfile = heavyValues.AudioProfile ?? "";
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
  const audioProfileMixed = heavyValues.AudioProfileMixed ?? "";
  const audioLanguagesMixed = heavyValues.AudioLanguagesMixed ?? "";
  const subtitleLanguagesMixed = heavyValues.SubtitleLanguagesMixed ?? "";
  const diagButton = heavyValues.Diagnostics ?? "";
  const videoHdr = heavyValues.VideoHDR ?? "";

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
        <td class="right" data-col="ContentHours" data-app="sonarr"${contentHoursAttr}>${contentHours}</td>
      <td class="right" data-col="EpisodesCounted" data-app="sonarr">${row.EpisodesCounted ?? ""}</td>
      <td class="right" data-col="AvgEpisodeSizeGB" data-app="sonarr">${row.AvgEpisodeSizeGB ?? ""}</td>
      <td class="right" data-col="TotalSizeGB" data-app="sonarr">${row.TotalSizeGB ?? ""}</td>
        <td data-col="VideoQuality"${videoQualityAttr}>${videoQuality}</td>
        <td data-col="Resolution"${resolutionAttr}>${resolution}</td>
        <td data-col="VideoCodec"${videoCodecAttr}>${videoCodec}</td>
      <td data-col="VideoHDR">${videoHdr}</td>
        <td data-col="AudioCodec"${audioCodecAttr}>${audioCodec}</td>
      <td data-col="AudioProfile">${audioProfile}</td>
        <td data-col="AudioChannels"${audioChannelsAttr}>${audioChannels}</td>
      <td data-col="AudioLanguages">${audioLanguages}</td>
      <td data-col="SubtitleLanguages">${subtitleLanguages}</td>
        <td data-col="TautulliMatchStatus"${matchBadgeAttr}>${matchBadge}</td>
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
      <td data-col="AudioProfileMixed">${audioProfileMixed}</td>
      <td data-col="AudioLanguagesMixed">${audioLanguagesMixed}</td>
      <td data-col="SubtitleLanguagesMixed">${subtitleLanguagesMixed}</td>
        <td data-col="Path"${pathAttr}>${rowPath}</td>
    `;
  } else {
    tr.innerHTML = `
      <td data-col="Title">${titleCell}</td>
      <td data-col="DateAdded">${dateAdded}</td>
      <td data-col="Instance">${instanceName}</td>
      <td class="right" data-col="RuntimeMins" data-app="radarr">${row.RuntimeMins ?? ""}</td>
      <td class="right" data-col="FileSizeGB" data-app="radarr">${row.FileSizeGB ?? ""}</td>
      <td class="right" data-col="GBPerHour" data-app="radarr">${row.GBPerHour ?? ""}</td>
      <td class="right" data-col="BitrateMbps" data-app="radarr">${bitrateCell}</td>
        <td data-col="VideoQuality"${videoQualityAttr}>${videoQuality}</td>
        <td data-col="Resolution"${resolutionAttr}>${resolution}</td>
        <td data-col="VideoCodec"${videoCodecAttr}>${videoCodec}</td>
      <td data-col="VideoHDR">${videoHdr}</td>
        <td data-col="AudioCodec"${audioCodecAttr}>${audioCodec}</td>
      <td data-col="AudioProfile">${audioProfile}</td>
        <td data-col="AudioChannels"${audioChannelsAttr}>${audioChannels}</td>
      <td data-col="AudioLanguages">${audioLanguages}</td>
      <td data-col="SubtitleLanguages">${subtitleLanguages}</td>
        <td data-col="TautulliMatchStatus"${matchBadgeAttr}>${matchBadge}</td>
      <td class="diag-cell" data-col="Diagnostics">${diagButton}</td>
      <td class="right" data-col="PlayCount">${playCount}</td>
      <td data-col="LastWatched">${lastWatched}</td>
      <td class="right" data-col="DaysSinceWatched">${daysSinceWatched}</td>
      <td class="right" data-col="TotalWatchTimeHours">${watchTimeHours}</td>
      <td class="right" data-col="WatchContentRatio">${watchContentHours}</td>
      <td class="right" data-col="UsersWatched">${usersWatched}</td>
      <td data-col="TmdbId">${tmdbId}</td>
      <td data-col="AudioCodecMixed">${audioCodecMixed}</td>
      <td data-col="AudioProfileMixed">${audioProfileMixed}</td>
      <td data-col="AudioLanguagesMixed">${audioLanguagesMixed}</td>
      <td data-col="SubtitleLanguagesMixed">${subtitleLanguagesMixed}</td>
        <td data-col="Path"${pathAttr}>${rowPath}</td>
    `;
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
    hydrationState.rows = rows.slice();
    hydrationState.index = 0;
    hydrationState.perf = perf;
  } else {
    hydrationState.rows = hydrationState.rows.concat(rows);
  }
  if (hydrationState.scheduled) return;
  hydrationState.scheduled = true;
  requestAnimationFrame(runHydrationPass);
}

function runHydrationPass() {
  hydrationState.scheduled = false;
  if (hydrationState.token !== renderToken) {
    hydrationState.rows = [];
    hydrationState.index = 0;
    hydrationState.perf = null;
    unlockColumnWidths(hydrationState.token);
    return;
  }
  if (hydrationState.index === 0) {
    noteHydrateStart(hydrationState.perf);
  }
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
    if (processed >= LAZY_CELL_BATCH_SIZE && (perfNow() - start) >= HYDRATE_FRAME_BUDGET_MS) {
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

function renderBatch(rows, token, start, totalRows, totalAll, app, batchSize, options) {
  if (token !== renderToken) {
    unlockColumnWidths(token);
    return;
  }
  const perf = options ? options.perf : null;
  const frag = document.createDocumentFragment();
  const frameStart = perfNow();
  let index = start;
  let processed = 0;
  while (index < rows.length && processed < batchSize) {
    frag.appendChild(getRowElement(rows[index], app, options));
    index += 1;
    processed += 1;
    if (processed % RENDER_FRAME_CHECK_EVERY === 0 &&
        (perfNow() - frameStart) >= RENDER_FRAME_BUDGET_MS) {
      break;
    }
  }
  updateColumnVisibility(frag);
  tbody.appendChild(frag);

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
  setStatus(`Loaded ${totalRows} / ${totalAll}`);
  tableReadyByApp[app] = true;
  setChipsVisible(true);
  flushDeferredPrefetch();
  if (perf && !perf.renderEnd) {
    perf.renderEnd = perfNow();
  }
  if (options && options.lazyRows && options.lazyRows.length) {
    queueHydration(options.lazyRows, token, perf);
    maybeStabilizeRender(app, options);
    return;
  }
  finalizeRenderPerf(perf);
  unlockColumnWidths(token);
  maybeStabilizeRender(app, options);
}

function render(data, options = {}) {
  const app = activeApp;
  const filtered = applyFilters(data || []);
  const filterSig = getFilterSignature();
  const isPrimaryData = data === dataByApp[app];
  const dataVersion = isPrimaryData ? dataVersionByApp[app] : 0;
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
  const shouldBatch = allowBatch &&
    resolveRenderFlag("batch", app) &&
    sorted.length > RENDER_BATCH_MIN;
  const batchSize = sorted.length >= RENDER_BATCH_LARGE_MIN
    ? RENDER_BATCH_SIZE_LARGE
    : RENDER_BATCH_SIZE;
  const existingRow = tbody ? tbody.querySelector("tr") : null;
  const existingApp = existingRow?.dataset?.app || "";
  if (existingRow && existingApp && existingApp !== app) {
    clearTable();
  }
  const token = ++renderToken;
  if (columnWidthLock.active) {
    unlockColumnWidths();
  }
  if (shouldBatch &&
      tbody &&
      tbody.children.length &&
      resolveRenderFlag("widthLock", app)) {
    lockColumnWidths(token);
  }
  const hiddenColumns = getHiddenColumns();
  const allowDeferred = resolveRenderFlag("deferHeavy", app);
  const deferredColumns = allowDeferred
    ? getDeferredColumns(app, hiddenColumns)
    : new Set();
  const useDeferred = allowDeferred && deferredColumns.size > 0;
  const visibleHeavyColumns = allowDeferred
    ? LAZY_COLUMNS_ARRAY.filter(col => !isColumnHidden(col, app, hiddenColumns))
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
    }
    : {
      visibleHeavyColumns,
      isColumnVisible,
      columnVisibilityVersionAtStart,
      lazyRows: [],
      perf,
    };
  setBatching(shouldBatch);

  if (!sorted.length) {
    clearTable();
    setBatching(false);
    setStatus(`Loaded 0 / ${data.length}`);
    updateColumnVisibility();
    normalizeSonarrRuntimeOrder();
    tableReadyByApp[app] = true;
    setChipsVisible(true);
    flushDeferredPrefetch();
    if (perf && !perf.renderEnd) {
      perf.renderEnd = perfNow();
    }
    finalizeRenderPerf(perf);
    unlockColumnWidths(token);
    maybeStabilizeRender(app, options);
    return;
  }

  if (!shouldBatch) {
    const frag = document.createDocumentFragment();
    for (const row of sorted) {
      frag.appendChild(getRowElement(row, app, rowOptions));
    }
    tbody.replaceChildren(frag);
    updateColumnVisibility(tbody);
    normalizeSonarrRuntimeOrder(tbody);
    setBatching(false);
    setStatus(`Loaded ${sorted.length} / ${data.length}`);
    tableReadyByApp[app] = true;
    setChipsVisible(true);
    flushDeferredPrefetch();
    if (perf && !perf.renderEnd) {
      perf.renderEnd = perfNow();
    }
    if (rowOptions.lazyRows && rowOptions.lazyRows.length) {
      queueHydration(rowOptions.lazyRows, token, perf);
      maybeStabilizeRender(app, options);
      return;
    }
    finalizeRenderPerf(perf);
    unlockColumnWidths(token);
    maybeStabilizeRender(app, options);
    return;
  }

  clearTable();
  renderBatch(sorted, token, 0, sorted.length, data.length, app, batchSize, rowOptions);
}

async function load(refresh, options = {}) {
  const app = activeApp;
  const myToken = ++loadTokens[app];
  const background = options.background === true;

  try {
    const label = refresh
      ? app === "sonarr"
        ? "Fetching new Sonarr data..."
        : "Fetching new Radarr data..."
      : app === "sonarr"
        ? "Loading Sonarr data..."
        : "Loading Radarr data...";
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
    const url = refresh ? `${base}?refresh=1` : base;

    const res = await fetch(apiUrl(url));
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${txt}`);
    }

    const warn = res.headers.get("X-Sortarr-Warn") || "";
    const noticeState = parseNoticeState(res.headers);

    // If a newer request for this app is in flight, ignore this response
    if (myToken !== loadTokens[app]) return;

    const existing = dataByApp[app] || [];
    if (background && noticeState.flags.has("tautulli_refresh") && existing.length) {
      applyNoticeState(app, noticeState.flags, warn, noticeState.notice, { background });
      fetchStatus({ silent: true });
      if (res.body && typeof res.body.cancel === "function") {
        res.body.cancel();
      }
      return;
    }

    const json = await res.json();
    applyNoticeState(app, noticeState.flags, warn, noticeState.notice, { background });
    if (!background) {
      handlePrefetchGate(app, noticeState.flags);
    }
    rowCacheByApp[app].clear();
    dataByApp[app] = json;
    dataVersionByApp[app] += 1;
    sortCacheByApp[app] = null;
    assignRowKeys(dataByApp[app], app);
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
      if (renderData.length > RENDER_BATCH_MIN) {
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

    updateSortIndicators();
    requestAnimationFrame(() => {
      render(dataByApp[activeApp] || []);
    });
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
    load(true);
  });
}
if (refreshSonarrBtn) {
  refreshSonarrBtn.addEventListener("click", async () => {
    refreshSonarrBtn.setAttribute("data-busy", "1");
    updateArrRefreshButton(refreshSonarrBtn, configState.sonarrConfigured);
    setStatus("Refreshing Sonarr...");
    try {
      await requestArrRefresh("sonarr");
      setStatus("Sonarr refresh queued.");
    } catch (e) {
      setStatus(`Error: ${e.message}`);
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
    setStatus("Refreshing Radarr...");
    try {
      await requestArrRefresh("radarr");
      setStatus("Radarr refresh queued.");
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      refreshRadarrBtn.removeAttribute("data-busy");
      updateArrRefreshButton(refreshRadarrBtn, configState.radarrConfigured);
    }
  });
}
if (refreshTautulliBtn) {
  refreshTautulliBtn.addEventListener("click", async () => {
    setStatus("Refreshing Tautulli...");
    try {
      const res = await fetch(apiUrl("/api/tautulli/refresh"), { method: "POST" });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${txt}`);
      }
      const data = await res.json();
      if (data.refresh_in_progress || data.started) {
        setStatusNotice(TAUTULLI_MATCHING_NOTICE);
        if (configState.sonarrConfigured) setTautulliPending("sonarr", true);
        if (configState.radarrConfigured) setTautulliPending("radarr", true);
        updateBackgroundLoading();
      }
      fetchStatus({ silent: true });
      setStatus("Tautulli refresh started.");
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  });
}
if (deepRefreshTautulliBtn) {
  deepRefreshTautulliBtn.addEventListener("click", async () => {
    setStatus("Starting deep Tautulli refresh...");
    try {
      const res = await fetch(apiUrl("/api/tautulli/deep_refresh"), { method: "POST" });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${txt}`);
      }
      const data = await res.json();
      if (data.refresh_in_progress || data.started) {
        setStatusNotice(TAUTULLI_MATCHING_NOTICE);
        if (configState.sonarrConfigured) setTautulliPending("sonarr", true);
        if (configState.radarrConfigured) setTautulliPending("radarr", true);
        updateBackgroundLoading();
      }
      fetchStatus({ silent: true });
      setStatus("Deep Tautulli refresh started. This can take a while.");
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  });
}
if (clearCachesBtn) {
  clearCachesBtn.addEventListener("click", async () => {
    if (!window.confirm("Clear cached data and reload from Sonarr/Radarr (and Tautulli if configured)?")) {
      return;
    }
    setStatus("Clearing caches...");
    try {
      const res = await fetch(apiUrl("/api/caches/clear"), { method: "POST" });
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
      setStatus("Caches cleared. Reloading...");
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
  try {
    const base = app === "sonarr" ? "/api/shows" : "/api/movies";
    const url = refresh ? `${base}?refresh=1` : base;
    const res = await fetch(apiUrl(url));
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${txt}`);
    }
    const warn = res.headers.get("X-Sortarr-Warn") || "";
    const noticeState = parseNoticeState(res.headers);
    if (token !== prefetchTokens[app]) return;
    const existing = dataByApp[app] || [];
    if (background && noticeState.flags.has("tautulli_refresh") && existing.length) {
      applyNoticeState(app, noticeState.flags, warn, noticeState.notice, { background });
      fetchStatus({ silent: true });
      if (res.body && typeof res.body.cancel === "function") {
        res.body.cancel();
      }
      return;
    }
    const json = await res.json();
    applyNoticeState(app, noticeState.flags, warn, noticeState.notice, { background });
    rowCacheByApp[app].clear();
    dataByApp[app] = json;
    dataVersionByApp[app] += 1;
    sortCacheByApp[app] = null;
    assignRowKeys(dataByApp[app], app);
    lastUpdatedByApp[app] = Date.now();
    applyTitleWidth(app, dataByApp[app]);
    if (app === activeApp) {
      const renderData = dataByApp[app];
      const renderNow = () => {
        if (token !== prefetchTokens[app] || app !== activeApp) return;
        render(renderData, { allowBatch: true });
        updateLastUpdatedDisplay();
      };
      if (renderData.length > RENDER_BATCH_MIN) {
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
  }
}

function setTautulliEnabled(enabled) {
  tautulliEnabled = Boolean(enabled);
  updateAdvancedHelpText();
  const chipsChanged = updateChipVisibility();
  updateColumnFilter();
  markColumnVisibilityDirty();
  updateColumnVisibility();
  updateStatusPanel();
  if (chipsChanged && (dataByApp[activeApp] || []).length) {
    render(dataByApp[activeApp]);
  }
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

bindChipButtons();

if (tbody) {
  tbody.addEventListener("click", e => {
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
      btn.textContent = "Show all";
      btn.setAttribute("aria-expanded", "false");
    } else {
      list.textContent = full || short;
      list.setAttribute("data-lang-state", "full");
      cell.classList.add("is-expanded");
      btn.textContent = "Show less";
      btn.setAttribute("aria-expanded", "true");
    }
  });
}

if (columnsBtn && columnsPanel) {
  const setColumnsPanelHidden = hidden => {
    columnsPanel.classList.toggle("hidden", hidden);
    columnsPanel.setAttribute("aria-hidden", hidden ? "true" : "false");
    columnsBtn.setAttribute("aria-expanded", hidden ? "false" : "true");
  };

  setColumnsPanelHidden(columnsPanel.classList.contains("hidden"));

  columnsBtn.addEventListener("click", e => {
    e.stopPropagation();
    const nowHidden = !columnsPanel.classList.contains("hidden");
    setColumnsPanelHidden(nowHidden);
    if (!nowHidden) {
      updateColumnFilter();
      columnSearch?.focus();
      requestAnimationFrame(updateColumnScrollHint);
    }
  });

  columnsPanel.addEventListener("click", e => {
    e.stopPropagation();
  });

  columnsPanel.addEventListener("scroll", () => {
    updateColumnScrollHint();
  });

  document.addEventListener("click", () => {
    setColumnsPanelHidden(true);
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      setColumnsPanelHidden(true);
    }
  });

  window.addEventListener("resize", () => {
    updateColumnScrollHint();
  });

  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    input.addEventListener("change", () => {
      saveColumnPrefs();
      markColumnVisibilityDirty();
      updateColumnVisibility();
      applyTitleWidth(activeApp);
      updateColumnGroupToggles();
    });
  });
  columnsPanel.querySelectorAll("input[data-col-group]").forEach(input => {
    input.addEventListener("change", () => {
      const group = input.getAttribute("data-col-group");
      setColumnGroup(group, input.checked);
      saveColumnPrefs();
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

function updateRuntimeLabels() {
  const labelMap = {
    ContentHours: "Runtime (hh:mm)",
    WatchContentRatio: "Watch / Runtime (hh:mm)",
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
    const episodesHeader = headerRow.querySelector('th[data-col="EpisodesCounted"][data-app="sonarr"]');
    const radarrHeader = headerRow.querySelector('th[data-app="radarr"]');
    const order = [runtimeHeader, episodesHeader, avgHeader, totalHeader].filter(Boolean);
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

    buildInstanceChips();
    setTautulliEnabled(cfg.tautulli_configured);
  } catch (e) {
    console.warn("config load failed", e);
  }
}

/* init */
(async function init() {
  if (resetUiRequested) {
    localStorage.removeItem(COLUMN_STORAGE_KEY);
    localStorage.removeItem(CSV_COLUMNS_KEY);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete(RESET_UI_PARAM);
      window.history.replaceState({}, "", url);
    } catch (e) {
      console.warn("reset_ui replaceState failed", e);
    }
  }
  loadColumnPrefs();
  loadCsvColumnsState();
  syncCsvToggle();
  setTautulliEnabled(false);
  updateRuntimeLabels();
  updateColumnFilter();
  updateColumnVisibility();
  updateChipVisibility();
  updateLastUpdatedDisplay();
  updateSortIndicators();
  setAdvancedMode(false);
  await loadConfig();
  await fetchStatus({ silent: true });
  startStatusTick();
  startStatusFetchPoll();
  setChipsVisible(false);
  if (statusPillEl && statusRowEl) {
    statusPillEl.addEventListener("mouseenter", () => {
      if (!statusCollapsed) return;
      pauseStatusCountdown();
      statusRowEl.classList.remove("status-row--hidden");
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
  const otherApp = activeApp === "sonarr" ? "radarr" : "sonarr";
  if (isAppConfigured(otherApp)) {
    queuePrefetch(otherApp, false);
  }
  await load(false);
})();

