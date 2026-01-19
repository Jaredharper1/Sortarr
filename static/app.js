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
const fastModeBannerEl = document.getElementById("fastModeBanner");
const refreshTautulliBtn = document.getElementById("refreshTautulliBtn");
const deepRefreshTautulliBtn = document.getElementById("deepRefreshTautulliBtn");
const refreshSonarrBtn = document.getElementById("refreshSonarrBtn");
const refreshRadarrBtn = document.getElementById("refreshRadarrBtn");
const arrRefreshButtonsEl = document.getElementById("arrRefreshButtons");
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
const filtersToggleBtn = document.getElementById("filtersToggleBtn");
const filtersEl = document.getElementById("filtersPanel");

const logoEl = document.getElementById("brandLogo");
const themeBtn = document.getElementById("themeBtn");
const root = document.documentElement; // <html>
const tableEl = document.querySelector("table");
const tableWrapEl = document.getElementById("tableWrap");
const TABLE_SCROLL_SNAP_IDLE_MS = 140;
const TABLE_SCROLL_SNAP_EPSILON = 4;
const TABLE_SCROLL_SNAP_MIN_MS = 140;
const TABLE_SCROLL_SNAP_MAX_MS = 260;
const TABLE_SCROLL_SNAP_BOTTOM_EPSILON = 6;
const TABLE_SCROLL_ANCHOR_LOCK_MS = 420;
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
const FILTER_RENDER_DEBOUNCE_MS = 140;
let filterRenderTimer = null;

function scheduleFilterRender() {
  if (filterRenderTimer) {
    window.clearTimeout(filterRenderTimer);
  }
  filterRenderTimer = window.setTimeout(() => {
    filterRenderTimer = null;
    render(dataByApp[activeApp] || []);
  }, FILTER_RENDER_DEBOUNCE_MS);
}

function flushFilterRender() {
  if (filterRenderTimer) {
    window.clearTimeout(filterRenderTimer);
    filterRenderTimer = null;
  }
  render(dataByApp[activeApp] || []);
}

function bindFilterInput(input) {
  if (!input) return;
  input.addEventListener("input", scheduleFilterRender);
  input.addEventListener("blur", flushFilterRender);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      flushFilterRender();
    }
  });
}

function updateTableWrapMaxHeight() {
  if (!tableWrapEl) return;
  const rect = tableWrapEl.getBoundingClientRect();
  const bottomPadding = 12;
  const available = window.innerHeight - rect.top - bottomPadding;
  if (available > 200) {
    tableWrapEl.style.maxHeight = `${available}px`;
  } else {
    tableWrapEl.style.maxHeight = "";
  }
  scheduleTableLayoutSync({ force: false, skipIfUnchanged: true });
}

function scheduleTableWrapLayout() {
  if (tableWrapLayoutPending) return;
  tableWrapLayoutPending = true;
  window.requestAnimationFrame(() => {
    tableWrapLayoutPending = false;
    updateTableWrapMaxHeight();
  });
}

if (tableWrapEl) {
  tableWrapEl.setAttribute("tabindex", "0");
  scheduleTableWrapLayout();
  window.addEventListener("resize", scheduleTableWrapLayout);
  if (window.ResizeObserver && appEl) {
    const tableWrapObserver = new ResizeObserver(scheduleTableWrapLayout);
    tableWrapObserver.observe(appEl);
  }
  lastTableScrollTop = tableWrapEl.scrollTop;
  tableWrapEl.addEventListener("scroll", handleTableWrapScroll, { passive: true });
  tableWrapEl.addEventListener("wheel", cancelTableScrollSnap, { passive: true });
  tableWrapEl.addEventListener("touchstart", cancelTableScrollSnap, { passive: true });
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
  if (pendingScrollAnchor) return false;
  if (tableEl.classList.contains("is-batching")) return false;
  if (isSeriesExpansionActive()) return false;
  if (!tbody.rows.length) return false;
  if (tableWrapEl.scrollHeight - tableWrapEl.clientHeight < 2) return false;
  return true;
}

function tableNearBottom() {
  if (!tableWrapEl) return false;
  const maxScroll = Math.max(0, tableWrapEl.scrollHeight - tableWrapEl.clientHeight);
  if (maxScroll < 1) return false;
  return (maxScroll - tableWrapEl.scrollTop) <= TABLE_SCROLL_SNAP_BOTTOM_EPSILON;
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
  const rows = tbody.rows;
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
    rowEl = tbody.rows[anchor.rowIndex] || null;
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
  const rows = tbody.rows;
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
  if (filtersActive && hasTitleWidth && hasPathWidth) {
    root.style.setProperty("--title-col-width", `${titleWidthByApp[app]}px`);
    root.style.setProperty("--path-col-width", `${pathWidthByApp[app]}px`);
    return;
  }
  const versionChanged = titlePathWidthVersionByApp[app] !== columnVisibilityVersion;
  const shouldMeasure = !hasTitleWidth ||
    !hasPathWidth ||
    versionChanged ||
    (!filtersActive && titlePathWidthFilterDirtyByApp[app]);
  if (shouldMeasure) {
    root.style.removeProperty("--title-col-width");
    root.style.removeProperty("--path-col-width");
    const titleWidth = Math.round(titleTh.getBoundingClientRect().width);
    const pathWidth = Math.round(pathTh.getBoundingClientRect().width);
    if (titleWidth > 0) {
      titleWidthByApp[app] = titleWidth;
    }
    if (pathWidth > 0) {
      pathWidthByApp[app] = pathWidth;
    }
    titlePathWidthVersionByApp[app] = columnVisibilityVersion;
    titlePathWidthFilterDirtyByApp[app] = filtersActive;
  }
  const canonicalTitleWidth = titleWidthByApp[app] || 0;
  if (canonicalTitleWidth > 0) {
    root.style.setProperty("--title-col-width", `${canonicalTitleWidth}px`);
  }
  if (pathWidthByApp[app] > 0) {
    root.style.setProperty("--path-col-width", `${pathWidthByApp[app]}px`);
  }
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
    filtersToggleBtn.title = filtersCollapsed ? "Show filters and chips" : "Hide filters and chips";
  }
  try {
    localStorage.setItem(FILTERS_COLLAPSED_KEY, filtersCollapsed ? "1" : "0");
  } catch {}
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
let backgroundLoading = false;
let chipsVisible = true;
let filtersCollapsed = false;
const tableReadyByApp = { sonarr: false, radarr: false };
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
let statusCollapsed = false;
let statusPillTimer = null;
let statusPillLoadedTimer = null;
let statusPillLoadedUntil = 0;
const STATUS_PILL_LOADED_MS = 5000;
let tautulliRefreshReloadTimer = null;
let copyToastEl = null;
let copyToastTimer = null;
const statusState = { apps: { sonarr: null, radarr: null }, tautulli: null };
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
  "First load can take a while for large libraries; later loads are cached and faster.";
const TAUTULLI_MATCHING_NOTICE = "Tautulli matching in progress.";
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
  "AudioLanguages",
  "SubtitleLanguages",
  "Languages",
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
const titleWidthByApp = { sonarr: null, radarr: null };
const pathWidthByApp = { sonarr: null, radarr: null };
const titlePathWidthVersionByApp = { sonarr: -1, radarr: -1 };
const titlePathWidthFilterDirtyByApp = { sonarr: false, radarr: false };

const ADVANCED_PLACEHOLDER_BASE =
  "Advanced filtering examples: path:C:\\ | dateadded:2024 | status:continuing | monitored:true | qualityprofile:HD-1080p | tags:kids | releasegroup:ntb | studio:pixar | seriestype:anime | audiolang:eng | sublang:eng | nosubs:true | missing:true | cutoff:true | airing:true | isavailable:true | customformatscore>=100 | gbperhour:1 | totalsize:10 | videocodec:x265 | videohdr:hdr | resolution:2160p | instance:sonarr-2";
const ADVANCED_PLACEHOLDER_TAUTULLI =
  "Advanced filtering examples: path:C:\\ | dateadded:2024 | status:continuing | monitored:true | qualityprofile:HD-1080p | tags:kids | releasegroup:ntb | studio:pixar | seriestype:anime | audiolang:eng | sublang:eng | nosubs:true | missing:true | cutoff:true | airing:true | isavailable:true | playcount>=5 | neverwatched:true | mismatch:true | dayssincewatched>=365 | watchtime>=10 | contenthours>=10 | gbperhour:1 | totalsize:10 | videocodec:x265 | videohdr:hdr | resolution:2160p | instance:sonarr-2";
const ADVANCED_HELP_BASE =
  "Use field:value for wildcards and comparisons. Numeric fields treat field:value as >= (use = for exact). gbperhour/totalsize with integer values use a whole-number bucket (e.g., gbperhour:1 = 1.0-1.99). Examples: dateadded:2024 status:continuing monitored:true qualityprofile:HD-1080p tags:kids releasegroup:ntb studio:pixar seriestype:anime originallanguage:eng genres:drama missing:true cutoff:true airing:true " +
  "Fields: title, titleslug, tmdbid, dateadded, path, instance, status, monitored, qualityprofile, tags, releasegroup, studio, seriestype, originallanguage, genres, lastaired, hasfile, isavailable, incinemas, lastsearchtime, edition, customformats, customformatscore, qualitycutoffnotmet, languages, videoquality, videocodec, videohdr, resolution, audio, audiocodec, audiocodecmixed, audiolanguages, audiolang, audiolanguagesmixed, sublang, subtitlelanguagesmixed, audiochannels, nosubs, missing, cutoff, recentlygrabbed, scene, airing, episodes, seasons, totalsize, avgepisode, runtime, filesize, gbperhour, contenthours";
const ADVANCED_HELP_TAUTULLI =
  "Use field:value for wildcards and comparisons. Numeric fields treat field:value as >= (use = for exact). gbperhour/totalsize with integer values use a whole-number bucket (e.g., gbperhour:1 = 1.0-1.99). Examples: dateadded:2024 status:continuing monitored:true qualityprofile:HD-1080p tags:kids releasegroup:ntb studio:pixar seriestype:anime originallanguage:eng genres:drama missing:true cutoff:true airing:true playcount>=5 neverwatched:true mismatch:true dayssincewatched>=365 watchtime>=10 contenthours>=10 " +
  "Fields: title, titleslug, tmdbid, dateadded, path, instance, status, monitored, qualityprofile, tags, releasegroup, studio, seriestype, originallanguage, genres, lastaired, hasfile, isavailable, incinemas, lastsearchtime, edition, customformats, customformatscore, qualitycutoffnotmet, languages, videoquality, videocodec, videohdr, resolution, audio, audiocodec, audiocodecmixed, audiolanguages, audiolang, audiolanguagesmixed, sublang, subtitlelanguagesmixed, audiochannels, nosubs, missing, cutoff, recentlygrabbed, scene, airing, matchstatus, mismatch, playcount, lastwatched, dayssincewatched, watchtime, contenthours, watchratio, users, episodes, seasons, totalsize, avgepisode, runtime, filesize, gbperhour";

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
  deferHeavy: { sonarr: true, radarr: true },
  widthLock: true,
  stabilize: true,
  virtualize: { sonarr: false, radarr: true },
};
const HEADER_WIDTH_CAP_COLUMNS = new Set([
  "ContentHours",
  "RuntimeMins",
  "EpisodesCounted",
  "SeasonCount",
  "MissingCount",
  "CutoffUnmetCount",
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
  "Status",
  "Instance",
  "QualityProfile",
  "ReleaseGroup",
  "Tags",
  "Studio",
  "OriginalLanguage",
  "Genres",
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
  VideoQuality: "WEBRip-2160p",
  Resolution: "3840x2160p",
  VideoCodec: "Video Codec v",
  AudioCodec: "EAC3 Atmos v",
  AudioChannels: "Audio Channels v",
  Status: "Status v",
  Instance: "Instance Name v",
  QualityProfile: "Quality Profile v",
  ReleaseGroup: "Release Group v",
  Tags: "Tag List v",
  Studio: "Studio Name v",
  OriginalLanguage: "Original Language v",
  Genres: "Drama, Sci-Fi, Thriller",
  Edition: "Director Cut v",
  CustomFormats: "Custom Formats v",
  Languages: "Languages v",
  AudioLanguages: "Audio Languages v",
  SubtitleLanguages: "Subtitle Languages v",
  VideoHDR: "Dolby Vision v",
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
const HYDRATE_FRAME_BUDGET_MS = 10;
const RADARR_HYDRATE_FRAME_BUDGET_MS = 14;
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
const sonarrExpansionState = {
  expandedSeries: new Set(),
  expandedSeasons: new Set(),
  extrasBySeason: new Set(),
  seasonsBySeries: new Map(),
  episodesBySeason: new Map(),
  inflight: new Map(),
  fastModeBySeries: new Map(),
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
    headers: withCsrfHeaders({ "Content-Type": "application/json" }),
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
    scheduleChipGroupLayout();
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

function updateFastModeBanner() {
  if (!fastModeBannerEl) return;
  const show = activeApp === "sonarr" && fastModeByApp.sonarr;
  fastModeBannerEl.classList.toggle("hidden", !show);
}

function formatProgress(counts, configured, progressMeta, tautulliState, displayProcessed = null) {
  if (!configured) return "Not configured";
  const progressActive = Boolean(tautulliState?.refresh_in_progress && progressMeta?.total);
  const total = progressActive
    ? progressMeta?.total || 0
    : counts?.total || 0;
  if (!total) return "No cached data";
  const matched = progressActive
    ? (Number.isFinite(displayProcessed) ? displayProcessed : (progressMeta?.processed || 0))
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

function formatTautulliStatus(state, progressMeta) {
  if (!state || !state.configured) return "Not configured";
  if (state.refresh_in_progress) {
    const total = Number.isFinite(progressMeta?.total) ? progressMeta.total : 0;
    return total > 0 ? "Matching in progress" : "Receiving Tautulli data...";
  }
  if (state.status === "stale") return "Awaiting data";
  const age = formatAgeShort(withElapsedAge(state.index_age_seconds));
  return age === "--" ? "Matched" : `Matched (${age} ago)`;
}

function formatStatusPillText(appState, tautulli, displayProcessed = null) {
  if (!appState?.configured) return "Data status";
  if (tautulli?.configured && tautulli.refresh_in_progress) {
    const total = appState?.progress?.total || 0;
    if (!total) {
      return "Receiving Tautulli data...";
    }
    if (total > 0) {
      const processed = Number.isFinite(displayProcessed)
        ? displayProcessed
        : (appState?.progress?.processed || 0);
      return `Matching ${processed}/${total}`;
    }
    return "Matching...";
  }
  if (isStatusPillLoadedActive(appState, tautulli)) {
    return "Data loaded";
  }
  return "Data status";
}

function updateStatusPill(appState, tautulli, displayProcessed = null) {
  if (!statusPillEl) return;
  statusPillEl.textContent = formatStatusPillText(appState, tautulli, displayProcessed);
  const progress = appState?.progress;
  let title = "Hover to expand data status";
  const showLoaded = isStatusPillLoadedActive(appState, tautulli);
  if (tautulli?.configured && tautulli.refresh_in_progress) {
    if (progress?.total) {
      const processed = Number.isFinite(displayProcessed)
        ? displayProcessed
        : (progress.processed || 0);
      title = `Tautulli matching in progress (${processed}/${progress.total} processed). Hover to expand status.`;
    } else {
      title = "Receiving Tautulli data. Hover to expand status.";
    }
  } else if (showLoaded) {
    title = "Data loaded. Hover to expand status.";
  }
  statusPillEl.title = title;
  statusPillEl.classList.toggle(
    "status-pill--pending",
    Boolean(tautulli?.refresh_in_progress)
  );
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
    progressStatusEl.textContent = (tautulliState && tautulliState.configured)
      ? formatProgress(appState?.counts, appState?.configured, appState?.progress, tautulliState, displayProcessed)
      : "--";
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

function showStatusRow() {
  if (!statusRowEl) return;
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
    const hovering = isStatusHovering();
    if (hovering) {
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

function getArrRefreshSuffix(app, instance, index, total) {
  if (total <= 1) return "";
  const appLabel = app === "sonarr" ? "Sonarr" : "Radarr";
  const name = String(instance?.name || "").trim();
  if (name) return name;
  return `${appLabel} ${index + 1}`;
}

function formatArrRefreshLabel(app, suffix) {
  const appLabel = app === "sonarr" ? "Sonarr" : "Radarr";
  const base = `Refresh ${appLabel} metadata`;
  if (!suffix) return base;
  return `${base} (${suffix})`;
}

function formatArrRefreshStatusLabel(app, suffix) {
  const appLabel = app === "sonarr" ? "Sonarr" : "Radarr";
  if (!suffix) return appLabel;
  return `${appLabel} (${suffix})`;
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
    btn.title = `Ask ${statusLabel} to refresh its metadata. Sortarr updates on the next fetch.`;
    btn.dataset.app = app;
    if (instanceId) btn.dataset.instanceId = instanceId;
    const busy = busySet.has(instanceId);
    btn.disabled = !configured || busy;
    if (busy) btn.setAttribute("data-busy", "1");
    btn.addEventListener("click", async () => {
      if (busySet.has(instanceId)) return;
      busySet.add(instanceId);
      updateArrRefreshButtons();
      setStatus(`Refreshing ${statusLabel}...`);
      try {
        await requestArrRefresh(app, instanceId ? { instanceId } : {});
        setStatus(`${statusLabel} refresh queued.`);
      } catch (e) {
        setStatus(`Error: ${e.message}`);
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
  updateArrRefreshButtons();
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
  statusPollTimer = setTimeout(async () => {
    statusPollTimer = null;
    await fetchStatus({ silent: true, lite: true });
  }, interval);
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
        noticeByApp[other] = TAUTULLI_MATCHING_NOTICE;
      }
    }
  }

  const notices = [];
  if (tautulliPending) {
    notices.push(TAUTULLI_MATCHING_NOTICE);
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
  localStorage.removeItem(COLUMN_STORAGE_KEY);
  localStorage.removeItem(CSV_COLUMNS_KEY);
  localStorage.removeItem(FILTERS_COLLAPSED_KEY);
  localStorage.removeItem("Sortarr-theme");
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
      const scrollAnchor = captureTableScrollAnchor();
      render(dataByApp[activeApp] || [], { scrollAnchor });
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
  };

  const res = await fetch(apiUrl("/api/diagnostics/tautulli-match"), {
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
  const appLabel = app === "sonarr" ? "Sonarr" : "Radarr";
  const tautulliConfigured = Boolean(statusState.tautulli?.configured);
  setRowRefreshPending(rowEl, true);
  btn.disabled = true;
  const initialParts = [`${appLabel} refresh queued.`];
  if (tautulliConfigured) {
    initialParts.push("Tautulli refresh queued.");
  }
  setRowRefreshNotice(statusToken, `Refreshing ${rowTitle} - ${initialParts.join(" ")}`);
  try {
    const arrPromise = requestArrRefresh(app, { itemId, instanceId });
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

function formatSeasonLabel(seasonNumber) {
  return `Season ${seasonNumber}`;
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

const EPISODE_NOT_REPORTED_HTML = '<span class="muted">Not Reported</span>';
const NOT_REPORTED_HTML = '<span class="muted" title="Not reported by Arr">Not reported</span>';

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
    label: "Runtime",
    className: "series-episode-runtime",
    width: "80px",
    extra: false,
    render: episode => formatEpisodeTextCell(
      formatEpisodeRuntimeMinutes(episode.runtimeMins ?? "")
    ),
  },
  {
    key: "size",
    label: "Size",
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
    label: "Video Quality",
    className: "series-episode-quality",
    width: "140px",
    extra: false,
    render: episode => formatEpisodeTextCell(episode.quality || ""),
  },
  {
    key: "resolution",
    label: "Resolution",
    className: "series-episode-resolution",
    width: "120px",
    extra: false,
    render: episode => formatEpisodeTextCell(episode.resolution || ""),
  },
  {
    key: "videoCodec",
    label: "Video Codec",
    className: "series-episode-video-codec",
    width: "120px",
    extra: false,
    render: episode => formatEpisodeTextCell(episode.videoCodec || ""),
  },
  {
    key: "audioCodec",
    label: "Audio Codec",
    className: "series-episode-audio-codec",
    width: "120px",
    extra: false,
    render: episode => formatEpisodeTextCell(episode.audioCodec || ""),
  },
  {
    key: "audioChannels",
    label: "Audio Channels",
    className: "series-episode-audio-channels",
    width: "110px",
    extra: false,
    render: episode => formatEpisodeHtmlCell(
      formatAudioChannelsCell(escapeHtml(episode.audioChannels ?? ""))
    ),
  },
  {
    key: "audioLanguages",
    label: "Languages",
    className: "series-episode-audio-langs",
    width: "150px",
    extra: false,
    render: episode => formatEpisodeHtmlCell(
      formatEpisodeLanguageSummary(episode.audioLanguages ?? "")
    ),
  },
  {
    key: "subtitleLanguages",
    label: "Subtitles",
    className: "series-episode-subs",
    width: "150px",
    extra: true,
    render: episode => formatEpisodeHtmlCell(
      formatEpisodeLanguageSummary(episode.subtitleLanguages ?? "")
    ),
  },
  {
    key: "airDate",
    label: "Air Date",
    className: "series-episode-air-date",
    width: "110px",
    extra: true,
    render: episode => formatEpisodeTextCell(
      formatEpisodeAirDate(episode.airDate ?? "")
    ),
  },
  {
    key: "cutoff",
    label: "Cutoff",
    className: "series-episode-cutoff",
    width: "90px",
    extra: true,
    render: episode => formatEpisodeTextCell(
      formatEpisodeBool(episode.qualityCutoffNotMet)
    ),
  },
  {
    key: "monitored",
    label: "Monitored",
    className: "series-episode-monitored",
    width: "90px",
    extra: true,
    render: episode => formatEpisodeTextCell(formatEpisodeBool(episode.monitored)),
  },
  {
    key: "releaseGroup",
    label: "Release Group",
    className: "series-episode-release-group",
    width: "120px",
    extra: true,
    render: episode => formatEpisodeTextCell(episode.releaseGroup ?? ""),
  },
  {
    key: "lastSearch",
    label: "Last Search",
    className: "series-episode-last-search",
    width: "150px",
    extra: true,
    render: episode => formatEpisodeTextCell(
      formatEpisodeDateTime(episode.lastSearchTime ?? "")
    ),
  },
  {
    key: "customFormats",
    label: "Custom Formats",
    className: "series-episode-custom-formats",
    width: "180px",
    extra: true,
    render: episode => formatEpisodeHtmlCell(
      formatEpisodeCustomFormats(episode.customFormats ?? "")
    ),
  },
  {
    key: "customScore",
    label: "CF Score",
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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return escapeHtml(`${day}/${month}/${year} - ${hours}:${minutes}`);
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
    '<div class="series-episode-header-cell series-episode-header-title">Episode</div>',
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
  const cells = [
    `<div class="series-episode-main">
      <span class="series-episode-code"${overviewAttr}>${escapeHtml(code)}</span>
      <span class="series-episode-title"${overviewAttr}>${escapeHtml(episode.title || "Untitled")}</span>
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
  error.textContent = message || "Failed to load.";
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
          <div class="series-expansion-title">Seasons</div>
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
  return { shell, body, statusEl };
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
  const existing = rowEl?.nextElementSibling;
  if (existing && existing.classList.contains("series-child-row")) {
    if (existing.__collapseTimer) {
      clearTimeout(existing.__collapseTimer);
      existing.__collapseTimer = null;
    }
    requestAnimationFrame(() => {
      existing.classList.add("series-child-row--open");
    });
    return existing;
  }
  const tr = document.createElement("tr");
  tr.className = "series-child-row";
  tr.dataset.seriesKey = seriesKey;
  const td = document.createElement("td");
  const colCount = tableEl ? tableEl.querySelectorAll("thead th").length : 1;
  td.colSpan = colCount || 1;
  tr.appendChild(td);
  rowEl.insertAdjacentElement("afterend", tr);
  requestAnimationFrame(() => {
    tr.classList.add("series-child-row--open");
  });
  return tr;
}

function collapseSeriesExpansion(rowEl, btn, seriesKey) {
  sonarrExpansionState.expandedSeries.delete(seriesKey);
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
      fastMode ? "Fast mode: file details limited." : ""
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
      payload?.fast_mode ? "Fast mode: file details limited." : ""
    );
  } catch (err) {
    renderSeriesError(expansion.body, err.message || "Failed to load seasons.");
    updateSeriesExpansionStatus(expansion.statusEl, "Failed to load seasons.", { warn: true });
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
    empty.textContent = "No seasons available.";
    container.appendChild(empty);
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
    extrasToggle.textContent = "Extras";

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
    renderSeriesError(container, err.message || "Failed to load episodes.");
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
    empty.textContent = "No episodes available.";
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
  const rowEl = btn.closest("tr");
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
    return;
  }
  await loadSeasonEpisodes(seriesId, seasonNumber, instanceId, episodesWrap, seriesKey);
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
  let working = rawText;
  let sign = "";
  if (working.startsWith("-")) {
    sign = "-";
    working = working.slice(1);
  }
  const parts = working.split(".");
  const intPart = parts[0] || "0";
  const fracPart = parts[1] || "";
  const noFrac = !fracPart;
  const className = noFrac ? "num-cell no-frac" : "num-cell";
  const style = widths
    ? ` style="--num-int-width:${widths.int}ch; --num-frac-width:${widths.frac}ch; --num-dot-width:${widths.frac ? "0.4ch" : "0ch"};"`
    : "";
  return `<span class="${className}"${style}><span class="num-int">${escapeHtml(
    `${sign}${intPart}`
  )}</span><span class="num-dot">.</span><span class="num-frac">${escapeHtml(fracPart)}</span></span>`;
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
  if (key === "deleted") return "Deleted";
  return escapeHtml(raw);
}

function formatVideoHdrValue(value) {
  if (value === "" || value === null || value === undefined) return "False";
  if (typeof value === "boolean") return value ? "True" : "False";
  const raw = String(value).trim();
  if (!raw) return "False";
  return "True";
}

function getMatchStatusMeta(row) {
  const status = row?.TautulliMatchStatus;
  const reason = row?.TautulliMatchReason;
  let label = "Unavailable";
  let variant = "muted";

  if (status === "matched") {
    label = "Matched";
    variant = "ok";
  } else if (status === "unmatched") {
    label = "Potential mismatch";
    variant = "warn";
  } else if (status === "skipped") {
    if (typeof reason === "string" && /future/i.test(reason)) {
      label = "Future release";
      variant = "future";
    } else if (typeof reason === "string" && /no (episodes|file) on disk/i.test(reason)) {
      label = "Not on disk";
      variant = "nodisk";
    } else {
      label = "Not checked";
      variant = "muted";
    }
  } else if (status === "unavailable") {
    label = "Unavailable";
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
  if (!tautulliEnabled) return "";
  const meta = getMatchStatusMeta(row);
  const titleText = meta.reason ? `${meta.label} - ${meta.reason}` : meta.label;
  const titleAttr = titleText ? ` title="${escapeHtml(titleText)}"` : "";
  return `<span class="match-orb match-orb--${meta.variant}"${titleAttr} role="img" aria-label="${escapeHtml(meta.label)}"></span>`;
}

function formatBitrateCell(row, app) {
  const raw = row?.BitrateMbps;
  if (raw === "" || raw === null || raw === undefined) return "";
  const value = formatNumericCell(raw, getNumericWidths(app, "BitrateMbps"));
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
      if (field === "missing" || field === "cutoff" || field === "cutoffunmet") {
        const boolVal = parseBoolValue(value);
        if (boolVal === null) {
          warnings.push(`Invalid value for '${field}' (use true/false).`);
          preds.push(() => false);
          continue;
        }
        preds.push(row => {
          const raw = getFieldValue(row, field);
          const count = Number(raw);
          const hasCount = Number.isFinite(count) && count > 0;
          return boolVal ? hasCount : !hasCount;
        });
        continue;
      }
      if (field === "recentlygrabbed" || field === "scene" || field === "airing") {
        const boolVal = parseBoolValue(value);
        if (boolVal === null) {
          warnings.push(`Invalid value for '${field}' (use true/false).`);
          preds.push(() => false);
          continue;
        }
        preds.push(row => Boolean(getFieldValue(row, field)) === boolVal);
        continue;
      }
      if (field === "audio") {
        preds.push(row => matchPattern(getFieldValue(row, "AudioCodec"), value));
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
      if (field === "matchstatus" || field === "match") {
        const matchPred = getMatchStatusFilterPredicate(value);
        if (matchPred) {
          preds.push(matchPred);
          continue;
        }
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
          field === "sublang" || field === "subtitles" ||
          field === "languages") {
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
const DEFAULT_HIDDEN_COLUMNS = new Set([
  "Instance",
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
  "RuntimeMins",
  "FileSizeGB",
  "GBPerHour",
  "BitrateMbps",
]);
const RADARR_VIRTUAL_DEFER_COLUMNS = new Set(
  LAZY_COLUMNS_ARRAY.filter(col => !RADARR_VIRTUAL_EAGER_COLUMNS.has(col))
);
const DISPLAY_CACHE_COLUMNS = {
  AudioCodec: { key: "audioCodec", compute: row => formatAudioCodecCell(
    row.AudioCodec ?? "",
    row.AudioCodecMixed,
    row.AudioCodecAll ?? ""
  ) },
  ContentHours: { key: "contentHours", compute: row => formatWatchTimeHours(row.ContentHours ?? "") },
  VideoQuality: { key: "videoQuality", compute: row => {
    const full = row.VideoQualityAll ?? "";
    const mixed = row.VideoQualityMixed;
    const cell = (full || mixed)
      ? formatMixedValueCell(row.VideoQuality ?? "", full, mixed)
      : escapeHtml(row.VideoQuality ?? "");
    return notReportedIfEmpty(cell);
  } },
  Resolution: { key: "resolution", compute: row => {
    const full = row.ResolutionAll ?? "";
    const mixed = row.ResolutionMixed;
    const cell = (full || mixed)
      ? formatMixedValueCell(row.Resolution ?? "", full, mixed)
      : escapeHtml(row.Resolution ?? "");
    return notReportedIfEmpty(cell);
  } },
  VideoCodec: { key: "videoCodec", compute: row => {
    const full = row.VideoCodecAll ?? "";
    const mixed = row.VideoCodecMixed;
    const cell = (full || mixed)
      ? formatMixedValueCell(row.VideoCodec ?? "", full, mixed)
      : escapeHtml(row.VideoCodec ?? "");
    return notReportedIfEmpty(cell);
  } },
  AudioChannels: { key: "audioChannels", compute: row => {
    const full = row.AudioChannelsAll ?? "";
    const mixed = row.AudioChannelsMixed;
    const cell = (full || mixed)
      ? formatMixedValueCell(row.AudioChannels ?? "", full, mixed, "audio-channels-cell")
      : formatAudioChannelsCell(escapeHtml(row.AudioChannels ?? ""));
    return notReportedIfEmpty(cell);
  } },
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

function getColumnInputs(col) {
  if (!columnsPanel || !col) return [];
  return columnsPanel.querySelectorAll(`input[data-col="${CSS.escape(col)}"]`);
}

function getColumnCheckedState(col) {
  const inputs = getColumnInputs(col);
  if (!inputs.length) return false;
  return Array.from(inputs).some(input => input.checked);
}

function syncColumnInputs(col, checked) {
  getColumnInputs(col).forEach(input => {
    input.checked = checked;
  });
}

function setColumnGroup(group, checked) {
  if (!columnsPanel) return;
  const cols = COLUMN_GROUPS[group] || [];
  cols.forEach(col => {
    syncColumnInputs(col, checked);
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
  const seen = new Set();
  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    const col = input.getAttribute("data-col");
    if (seen.has(col)) return;
    const checked = getColumnCheckedState(col);
    prefs[col] = checked;
    syncColumnInputs(col, checked);
    seen.add(col);
  });
  localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(prefs));
}

function getHiddenColumns() {
  const hidden = new Set();
  if (!columnsPanel) return hidden;
  const seen = new Set();
  columnsPanel.querySelectorAll("input[data-col]").forEach(input => {
    const col = input.getAttribute("data-col");
    if (seen.has(col)) return;
    const checked = getColumnCheckedState(col);
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
  const hideByCsv = col && CSV_COLUMNS_BY_APP[app]?.has(col) && !csvColumnsEnabled();
  const hideByInstance = col === "Instance" && getInstanceCount(app) <= 1;
  return hideByCol || hideByTautulli || hideByCsv || hideByInstance;
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
      const hideByCsv = csvCols && col && csvCols.has(col);
      const hideByInstance = hideInstance && col === "Instance";
      el.classList.toggle(
        "col-hidden",
        hideByApp || hideByCol || hideByTautulli || hideByCsv || hideByInstance
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
    if (width > 0) {
      cache.set(col, width);
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
  if (!labelKey) return 0;
  const style = window.getComputedStyle(th);
  const fontKey = style?.font || `${style?.fontWeight || ""} ${style?.fontSize || ""} ${style?.fontFamily || ""}`;
  const cacheKey = `${labelKey}||${minText}||${fontKey}||${style?.letterSpacing || ""}||${style?.textTransform || ""}`;
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
  const capped = width ? width + HEADER_CAP_EXTRA_PX : 0;
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
  const header = tableEl.querySelector('th[data-col="Title"]');
  if (!header) return;
  header.style.width = "";
  header.style.minWidth = "";
  header.style.maxWidth = "";
}

function setActiveTab(app) {
  if (activeApp === app) return;

  activeApp = app;
  clearTableSelection();
  markColumnVisibilityDirty();
  if (tableEl) {
    tableEl.dataset.app = activeApp;
  }

  tabSonarr.classList.toggle("active", activeApp === "sonarr");
  tabRadarr.classList.toggle("active", activeApp === "radarr");
  setLoading(false);
  setStatus("");
  setStatusNotice(noticeByApp[activeApp] || "");
  updateFastModeBanner();
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
  scheduleTitlePathWidthLock();

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
  `<button class="row-refresh-btn row-refresh-btn--title" type="button" title="Refresh in Arr (and Tautulli if configured)" aria-label="Refresh item">${ROW_REFRESH_ICON_HTML}</button>`;
const SERIES_EXPAND_ICON_HTML = '<span aria-hidden="true">+</span>';
const DIAG_BUTTON_HTML =
  `<div class="diag-actions"><button class="match-diag-btn" type="button" title="Copy match diagnostics" aria-label="Copy match diagnostics">i</button></div>`;

function buildSeriesExpanderButton(row) {
  const seriesId = row.SeriesId ?? row.seriesId ?? "";
  if (!seriesId) return "";
  const instanceId = row.InstanceId ?? row.instanceId ?? "";
  const seriesKey = getSonarrSeriesKey(seriesId, instanceId);
  const keyAttr = seriesKey ? ` data-series-key="${escapeHtml(seriesKey)}"` : "";
  const seriesAttr = seriesId ? ` data-series-id="${escapeHtml(seriesId)}"` : "";
  const instanceAttr = instanceId ? ` data-instance-id="${escapeHtml(instanceId)}"` : "";
  return `<button class="series-expander" type="button" title="Expand seasons" aria-label="Expand seasons" aria-expanded="false"${keyAttr}${seriesAttr}${instanceAttr}>${SERIES_EXPAND_ICON_HTML}</button>`;
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
  const audioCodec = audioCodecState.value;
  const contentHours = contentHoursState.value;
  const titleLink = displayCache.titleLink;
  const matchOrb = buildMatchOrb(row);
  const seriesExpander = app === "sonarr" ? buildSeriesExpanderButton(row) : "";
  const titleCell = `${seriesExpander}${ROW_REFRESH_BUTTON_HTML}<span class="title-orb-wrap">${matchOrb}${titleLink}</span>`;
  const dateAdded = formatDateAdded(row.DateAdded);
  const videoQuality = videoQualityState.value;
  const resolution = resolutionState.value;
  const videoCodec = videoCodecState.value;
  const audioChannels = audioChannelsState.value;
  const rowPath = pathState.value;
  const bitrateCell = formatBitrateCell(row, app);
  const audioCodecAttr = audioCodecState.lazy ? ' data-lazy-value="1"' : "";
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
  const runtimeMins = runtimeMinsRaw || '<span class="muted" title="No runtime">n/a</span>';
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
      <td data-col="OriginalLanguage" data-app="sonarr">${originalLanguage}</td>
      <td data-col="Genres" data-app="sonarr">${genres}</td>
      <td data-col="LastAired" data-app="sonarr">${lastAired}</td>
      <td class="right" data-col="MissingCount" data-app="sonarr">${missingCount}</td>
      <td class="right" data-col="CutoffUnmetCount" data-app="sonarr">${cutoffUnmetCount}</td>
      <td class="right" data-col="ContentHours" data-app="sonarr"${contentHoursAttr}>${contentHours}</td>
      <td class="right" data-col="EpisodesCounted" data-app="sonarr">${episodesCounted}</td>
      <td class="right" data-col="SeasonCount" data-app="sonarr">${seasonCount}</td>
      <td class="right" data-col="AvgEpisodeSizeGB" data-app="sonarr">${avgEpisodeSize}</td>
      <td data-col="TotalSizeGB" data-app="sonarr">${totalSize}</td>
      <td data-col="Status">${status}</td>
      <td data-col="Monitored">${monitored}</td>
      <td data-col="Tags">${tags}</td>
      <td data-col="ReleaseGroup">${releaseGroup}</td>
      <td data-col="QualityProfile">${qualityProfile}</td>
      <td data-col="VideoQuality"${videoQualityAttr}>${videoQuality}</td>
      <td data-col="Resolution"${resolutionAttr}>${resolution}</td>
      <td data-col="VideoCodec"${videoCodecAttr}>${videoCodec}</td>
      <td data-col="VideoHDR">${videoHdr}</td>
      <td data-col="AudioCodec"${audioCodecAttr}>${audioCodec}</td>
      <td data-col="AudioChannels"${audioChannelsAttr}>${audioChannels}</td>
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
        <td data-col="Path"${pathAttr}>${rowPath}</td>
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
      <td data-col="VideoQuality"${videoQualityAttr}>${videoQuality}</td>
      <td data-col="Resolution"${resolutionAttr}>${resolution}</td>
      <td data-col="VideoCodec"${videoCodecAttr}>${videoCodec}</td>
      <td data-col="VideoHDR">${videoHdr}</td>
      <td data-col="AudioCodec"${audioCodecAttr}>${audioCodec}</td>
      <td data-col="AudioChannels"${audioChannelsAttr}>${audioChannels}</td>
      <td data-col="AudioLanguages">${audioLanguages}</td>
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
        <td data-col="Path"${pathAttr}>${rowPath}</td>
    `;
  }

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
  requestAnimationFrame(runHydrationPass);
}

function runHydrationPass() {
  hydrationState.scheduled = false;
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
  const batchSize = app === "radarr"
    ? RADARR_LAZY_CELL_BATCH_SIZE
    : LAZY_CELL_BATCH_SIZE;
  const frameBudget = app === "radarr"
    ? RADARR_HYDRATE_FRAME_BUDGET_MS
    : HYDRATE_FRAME_BUDGET_MS;
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

function renderBatch(rows, token, start, totalRows, totalAll, app, batchSize, options) {
  if (token !== renderToken) {
    unlockColumnWidths(token);
    return;
  }
  const perf = options ? options.perf : null;
  const holdWidthLock = options && options.holdWidthLock === true;
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
    applyColumnHeaderCaps();
    scheduleTitlePathWidthLock();
    scheduleTruncationTooltipUpdate();
    queueHydration(options.lazyRows, token, perf);
    maybeStabilizeRender(app, options);
    cacheColumnWidths(app);
    finalizeTableInteractionState(app);
    return;
  }
  finalizeRenderPerf(perf);
  cacheColumnWidths(app);
  if (!holdWidthLock) {
    unlockColumnWidths(token);
  }
  applyColumnHeaderCaps();
  scheduleTitlePathWidthLock();
  scheduleTruncationTooltipUpdate();
  maybeStabilizeRender(app, options);
  finalizeTableInteractionState(app);
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
  const widthLockAllowed = tbody &&
    resolveRenderFlag("widthLock", app) &&
    (tbody.children.length || app === "radarr");
  const hasWidthCache = columnWidthCacheVersionByApp[app] === columnVisibilityVersion &&
    columnWidthCacheByApp[app].size > 0;
  const shouldLock = widthLockAllowed &&
    (shouldBatch || (app === "radarr" && hasWidthCache));
  const holdWidthLock = shouldLock && app === "radarr";
  const batchSize = sorted.length >= RENDER_BATCH_LARGE_MIN
    ? RENDER_BATCH_SIZE_LARGE
    : RENDER_BATCH_SIZE;
  const existingRow = tbody ? tbody.querySelector("tr") : null;
  const existingApp = existingRow?.dataset?.app || "";
  if (existingRow && existingApp && existingApp !== app) {
    clearTable();
  }
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
  const virtualizeRadarr = app === "radarr" &&
    resolveRenderFlag("virtualize", app) &&
    sorted.length >= RADARR_VIRTUAL_MIN_ROWS;
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
    }
    : {
      visibleHeavyColumns,
      isColumnVisible,
      columnVisibilityVersionAtStart,
      lazyRows: [],
      perf,
      holdWidthLock,
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
    if (scrollAnchor) {
      scheduleScrollAnchorRestore(scrollAnchor, token);
    }
    if (perf && !perf.renderEnd) {
      perf.renderEnd = perfNow();
    }
    finalizeRenderPerf(perf);
    cacheColumnWidths(app);
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
    setStatus(`Loaded ${sorted.length} / ${data.length}`);
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
      cacheColumnWidths(app);
      finalizeTableInteractionState(app);
      return;
    }
    finalizeRenderPerf(perf);
    cacheColumnWidths(app);
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
  const background = options.background === true;
  const hydrate = options.hydrate === true;
  if (hydrate) {
    liteHydrateInFlightByApp[app] = true;
  }

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
    const params = [];
    if (refresh) params.push("refresh=1");
    if (options.lite === true) {
      params.push("lite=1");
    } else if (options.lite === false) {
      params.push("lite=0");
    }
    const url = params.length ? `${base}?${params.join("&")}` : base;

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
    if (background && noticeState.flags.has("tautulli_refresh") && existing.length && !hydrate) {
      applyNoticeState(app, noticeState.flags, warn, noticeState.notice, { background });
      fetchStatus({ silent: true });
      if (res.body && typeof res.body.cancel === "function") {
        res.body.cancel();
      }
      return;
    }

    const json = await res.json();
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
    const url = params.length ? `${base}?${params.join("&")}` : base;
    const res = await fetch(apiUrl(url));
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${txt}`);
    }
    const warn = res.headers.get("X-Sortarr-Warn") || "";
    const noticeState = parseNoticeState(res.headers);
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

bindFilterInput(titleFilter);
bindFilterInput(pathFilter);
bindFilterInput(advancedFilter);

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
      const col = input.getAttribute("data-col");
      if (col) {
        syncColumnInputs(col, input.checked);
      }
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
    RuntimeMins: "Runtime (hh:mm)",
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
    const seasonsHeader = headerRow.querySelector('th[data-col="SeasonCount"][data-app="sonarr"]');
    const radarrHeader = headerRow.querySelector('th[data-app="radarr"]');
    const order = [runtimeHeader, episodesHeader, seasonsHeader, avgHeader, totalHeader].filter(Boolean);
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

const savedFiltersCollapsed = localStorage.getItem(FILTERS_COLLAPSED_KEY) === "1";
if (filtersEl) {
  setFiltersCollapsed(savedFiltersCollapsed);
}
if (filtersToggleBtn) {
  filtersToggleBtn.addEventListener("click", () => {
    setFiltersCollapsed(!filtersCollapsed);
  });
}

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
    updateArrRefreshButtons();
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
  scheduleTitlePathWidthLock();
  await loadConfig();
  fetchStatus({ silent: true, lite: true });
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

