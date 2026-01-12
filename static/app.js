const tbody = document.getElementById("tbody");
const statusEl = document.getElementById("status");
const loadingIndicator = document.getElementById("loadingIndicator");
const lastUpdatedEl = document.getElementById("lastUpdated");
const loadBtn = document.getElementById("loadBtn");
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

const COLD_CACHE_NOTICE =
  "First load can take a while for large libraries; later loads are cached and faster.";
const TAUTULLI_MATCHING_NOTICE = "Tautulli matching in progress.";
const NOTICE_FLAGS_HEADER = "X-Sortarr-Notice-Flags";
const TAUTULLI_POLL_INTERVAL_MS = 4000;
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
  "PlayCount",
  "LastWatched",
  "DaysSinceWatched",
  "TotalWatchTimeHours",
  "WatchContentRatio",
  "UsersWatched",
]);
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

const noticeByApp = { sonarr: "", radarr: "" };
const tautulliPendingByApp = { sonarr: false, radarr: false };
const tautulliPollTimers = { sonarr: null, radarr: null };

const ADVANCED_PLACEHOLDER_BASE =
  "Advanced filtering examples: path:C:\\ | audio:eac3 | audio:Atmos | audiochannels>=6 | audiolang:eng | sublang:eng | nosubs:true | gbperhour:1 | totalsize:10 | videocodec:x265 | videohdr:hdr | resolution:2160p | instance:sonarr-2";
const ADVANCED_PLACEHOLDER_TAUTULLI =
  "Advanced filtering examples: path:C:\\ | audio:eac3 | audio:Atmos | audiochannels>=6 | audiolang:eng | sublang:eng | nosubs:true | playcount>=5 | neverwatched:true | mismatch:true | dayssincewatched>=365 | watchtime>=10 | contenthours>=10 | gbperhour:1 | totalsize:10 | videocodec:x265 | videohdr:hdr | resolution:2160p | instance:sonarr-2";
const ADVANCED_HELP_BASE =
  "Use field:value for wildcards and comparisons. Numeric fields treat field:value as >= (use = for exact). gbperhour/totalsize with integer values use a whole-number bucket (e.g., gbperhour:1 = 1.0-1.99). Examples: audio:Atmos audiocodec:eac3 audiolang:eng sublang:eng nosubs:true videocodec:x265 videohdr:hdr instance:sonarr-2 " +
  "Fields: title, titleslug, tmdbid, path, instance, videoquality, videocodec, videohdr, resolution, audio, audiocodec, audioprofile, audiocodecmixed, audioprofilemixed, audiolanguages, audiolang, audiolanguagesmixed, sublang, subtitlelanguagesmixed, audiochannels, nosubs, episodes, totalsize, avgepisode, runtime, filesize, gbperhour, contenthours";
const ADVANCED_HELP_TAUTULLI =
  "Use field:value for wildcards and comparisons. Numeric fields treat field:value as >= (use = for exact). gbperhour/totalsize with integer values use a whole-number bucket (e.g., gbperhour:1 = 1.0-1.99). Examples: audio:Atmos audiocodec:eac3 audiolang:eng sublang:eng nosubs:true playcount>=5 neverwatched:true mismatch:true dayssincewatched>=365 watchtime>=10 contenthours>=10 videocodec:x265 videohdr:hdr instance:sonarr-2 " +
  "Fields: title, titleslug, tmdbid, path, instance, videoquality, videocodec, videohdr, resolution, audio, audiocodec, audioprofile, audiocodecmixed, audioprofilemixed, audiolanguages, audiolang, audiolanguagesmixed, sublang, subtitlelanguagesmixed, audiochannels, nosubs, matchstatus, mismatch, playcount, lastwatched, dayssincewatched, watchtime, contenthours, watchratio, users, episodes, totalsize, avgepisode, runtime, filesize, gbperhour";

// Store per-tab data so switching tabs doesn't briefly show the other tab's list
const dataByApp = { sonarr: [], radarr: [] };
const lastUpdatedByApp = { sonarr: null, radarr: null };
const configState = { sonarrConfigured: false, radarrConfigured: false };
const instanceConfig = { sonarr: [], radarr: [] };
const instanceBaseById = { sonarr: {}, radarr: {} };

// Prevent stale fetches from rendering after you switch tabs
const loadTokens = { sonarr: 0, radarr: 0 };
const prefetchTokens = { sonarr: 0, radarr: 0 };
const RENDER_BATCH_SIZE = 300;
const RENDER_BATCH_MIN = 1200;

let sonarrBase = "";
let radarrBase = "";
let renderToken = 0;
const rowCacheByApp = { sonarr: new Map(), radarr: new Map() };

function updateStatusText() {
  if (!statusEl) return;
  const parts = [];
  if (statusMessage) parts.push(statusMessage);
  if (statusNotice) parts.push(statusNotice);
  statusEl.textContent = parts.join(" | ");
}

function setStatus(msg) {
  statusMessage = msg || "";
  updateStatusText();
}

function setStatusNotice(msg) {
  statusNotice = msg || "";
  updateStatusText();
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
    tableEl.classList.toggle("stable-columns", backgroundLoading);
  }
}

function updateBackgroundLoading() {
  setBackgroundLoading(Boolean(tautulliPendingByApp[activeApp]));
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

function cancelTautulliPoll(app) {
  if (!tautulliPollTimers[app]) return;
  clearTimeout(tautulliPollTimers[app]);
  tautulliPollTimers[app] = null;
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
    scheduleTautulliPoll(app);
  } else {
    cancelTautulliPoll(app);
  }
}

function applyNoticeState(app, flags, warnText, fallbackNotice) {
  const tautulliPending = flags.has("tautulli_refresh");
  const coldCache = flags.has("cold_cache");

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

  let notice = "";
  if (tautulliPending) {
    notice = TAUTULLI_MATCHING_NOTICE;
  } else if (coldCache) {
    notice = COLD_CACHE_NOTICE;
  } else if (fallbackNotice) {
    notice = fallbackNotice;
  }

  const combined = [warnText, notice].filter(Boolean).join(" | ");
  noticeByApp[app] = combined;

  if (app === activeApp) {
    setStatusNotice(combined);
    updateBackgroundLoading();
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
      render(dataByApp[activeApp] || [], { allowBatch: false });
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

function assignRowKeys(rows, app) {
  const seen = new Map();
  for (const row of rows || []) {
    let key = buildRowKey(row, app) || "row";
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);
    if (count) {
      key = `${key}#${count}`;
    }
    row.__sortarrKey = key;
  }
}

function formatMixedValue(value, mixed) {
  const base = escapeHtml(value ?? "");
  if (!mixed) return base;
  if (!base) return '<span class="mixed-badge">Mixed</span>';
  return `<span class="mixed-wrap">${base}<span class="mixed-badge">Mixed</span></span>`;
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
    } else if (typeof reason === "string" && /no (episodes|file) on disk/i.test(reason)) {
      label = "Not on disk";
    } else {
      label = "Not checked";
    }
    className = "match-pill match-pill--muted";
  } else if (status === "unavailable") {
    label = "Unavailable";
    className = "match-pill match-pill--muted";
  }

  const title = reason ? ` title="${escapeHtml(reason)}"` : "";
  return `<span class="${className}"${title}>${label}</span>`;
}

const FIELD_MAP = {
  title: "Title",
  titleslug: "TitleSlug",
  tmdbid: "TmdbId",
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
};

const NUMERIC_FIELDS = new Set([
  "episodes",
  "totalsize",
  "avgepisode",
  "runtime",
  "filesize",
  "gbperhour",
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
  const isMatchStatusSort = sortKey === "TautulliMatchStatus";
  return [...arr].sort((a, b) => {
    if (isMatchStatusSort) {
      const aStatus = String(a?.TautulliMatchStatus || "").toLowerCase();
      const bStatus = String(b?.TautulliMatchStatus || "").toLowerCase();
      const aRank = MATCH_STATUS_SORT_ORDER[aStatus] ?? 99;
      const bRank = MATCH_STATUS_SORT_ORDER[bStatus] ?? 99;
      if (aRank !== bRank) return (aRank - bRank) * dir;
      if (aStatus === "skipped" && bStatus === "skipped") {
        const aReason = String(a?.TautulliMatchReason || "").toLowerCase();
        const bReason = String(b?.TautulliMatchReason || "").toLowerCase();
        const aReasonKey = aReason.includes("future")
          ? "future"
          : (aReason.includes("no episodes on disk") || aReason.includes("no file on disk"))
            ? "disk"
            : "other";
        const bReasonKey = bReason.includes("future")
          ? "future"
          : (bReason.includes("no episodes on disk") || bReason.includes("no file on disk"))
            ? "disk"
            : "other";
        const aReasonRank = SKIPPED_REASON_SORT_ORDER[aReasonKey] ?? 99;
        const bReasonRank = SKIPPED_REASON_SORT_ORDER[bReasonKey] ?? 99;
        if (aReasonRank !== bReasonRank) return (aReasonRank - bReasonRank) * dir;
      }
      const aTitle = String(a?.Title ?? "").toLowerCase();
      const bTitle = String(b?.Title ?? "").toLowerCase();
      if (aTitle < bTitle) return -1 * dir;
      if (aTitle > bTitle) return 1 * dir;
      return 0;
    }

    const av = a?.[sortKey];
    const bv = b?.[sortKey];

    const an = Number(av);
    const bn = Number(bv);
    const bothNum = Number.isFinite(an) && Number.isFinite(bn) &&
      av !== "" && av !== null && av !== undefined &&
      bv !== "" && bv !== null && bv !== undefined;

    if (bothNum) return (an - bn) * dir;

    const as = String(av ?? "").toLowerCase();
    const bs = String(bv ?? "").toLowerCase();
    if (as < bs) return -1 * dir;
    if (as > bs) return 1 * dir;
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
  "AudioCodecMixed",
  "AudioProfileMixed",
  "AudioLanguagesMixed",
  "SubtitleLanguagesMixed",
  "TotalSizeGB",
  "VideoHDR",
  "PlayCount",
  "LastWatched",
  "DaysSinceWatched",
  "TotalWatchTimeHours",
  "WatchContentRatio",
  "UsersWatched",
]);

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
  updateColumnVisibility();
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
  const csvEnabled = csvColumnsEnabled();
  columnsPanel.querySelectorAll(".column-row").forEach(row => {
    const label = row.textContent.toLowerCase();
    const app = row.getAttribute("data-app");
    const appMatch = !app || app === activeApp;
    const input = row.querySelector("input[data-col]");
    const col = input?.getAttribute("data-col");
    const isTautulli = col && TAUTULLI_COLUMNS.has(col);
    const tautulliMatch = !isTautulli || tautulliEnabled;
    const isCsv = col && CSV_COLUMNS_BY_APP[activeApp]?.has(col);
    const csvMatch = !isCsv || csvEnabled;
    const hideByInstance = col === "Instance" && getInstanceCount(activeApp) <= 1;
    const show = appMatch && tautulliMatch && csvMatch && !hideByInstance && (!query || label.includes(query));
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

function updateColumnVisibility(rootEl = document) {
  const hidden = getHiddenColumns();
  const scope = rootEl && rootEl.querySelectorAll ? rootEl : document;
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

function setActiveTab(app) {
  if (activeApp === app) return;

  activeApp = app;

  tabSonarr.classList.toggle("active", activeApp === "sonarr");
  tabRadarr.classList.toggle("active", activeApp === "radarr");
  setLoading(false);
  setStatus("");
  setStatusNotice(noticeByApp[activeApp] || "");
  updateBackgroundLoading();

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

  // clear filter per-tab
  if (titleFilter) titleFilter.value = "";
  if (pathFilter) pathFilter.value = "";
  if (advancedFilter) advancedFilter.value = "";
  setAdvancedMode(false);
  const chipsChanged = updateChipVisibility();

  if ((dataByApp[activeApp] || []).length) {
    render(dataByApp[activeApp], { allowBatch: false });
    if (chipsChanged) render(dataByApp[activeApp], { allowBatch: false });
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

function buildRow(row, app) {
  const tr = document.createElement("tr");
  const audioCodec = formatMixedValue(row.AudioCodec ?? "", row.AudioCodecMixed);
  const rawAudioProfile = row.AudioProfile ?? "";
  const audioProfileValue = formatMixedValue(rawAudioProfile, row.AudioProfileMixed);
  const audioProfile = (rawAudioProfile || row.AudioProfileMixed)
    ? audioProfileValue
    : '<span class="muted">Not reported</span>';
  const rawAudioLanguages = row.AudioLanguages ?? "";
  const audioLanguages = (rawAudioLanguages || row.AudioLanguagesMixed)
    ? formatLanguageValue(rawAudioLanguages, row.AudioLanguagesMixed, { allowToggle: true })
    : '<span class="muted">Not reported</span>';
  const rawSubtitleLanguages = row.SubtitleLanguages ?? "";
  const subtitleLanguages = (rawSubtitleLanguages || row.SubtitleLanguagesMixed)
    ? formatLanguageValue(rawSubtitleLanguages, row.SubtitleLanguagesMixed, { allowToggle: true })
    : '<span class="muted">Not reported</span>';
  const tautulliMatched = row.TautulliMatched === true;
  const matchBadge = buildMatchBadge(row);
  const playCount = tautulliMatched
    ? escapeHtml(row.PlayCount ?? 0)
    : '<span class="muted">Not reported</span>';
  const lastWatched = tautulliMatched
    ? formatLastWatched(row.LastWatched)
    : '<span class="muted">Not reported</span>';
  const daysSinceWatched = tautulliMatched
    ? formatDaysSince(row.DaysSinceWatched, row.LastWatched)
    : '<span class="muted">Not reported</span>';
  const watchTimeHours = tautulliMatched
    ? formatWatchTimeHours(row.TotalWatchTimeHours ?? 0)
    : '<span class="muted">Not reported</span>';
  let watchContentHours = '<span class="muted">No watch data</span>';
  if (tautulliMatched) {
    const watchContentValue = formatWatchContentHours(
      row.TotalWatchTimeHours ?? 0,
      row.ContentHours
    );
    watchContentHours = watchContentValue || '<span class="muted">No runtime</span>';
  }
  const usersWatched = tautulliMatched
    ? escapeHtml(row.UsersWatched ?? 0)
    : '<span class="muted">Not reported</span>';
  const contentHours = formatWatchTimeHours(row.ContentHours ?? "");
  const tmdbId = escapeHtml(row.TmdbId ?? row.tmdbId ?? "");
  const titleSlug = escapeHtml(
    row.TitleSlug ?? row.titleSlug ?? sonarrSlugFromTitle(row.Title)
  );
  const audioCodecMixed = formatBoolValue(row.AudioCodecMixed);
  const audioProfileMixed = formatBoolValue(row.AudioProfileMixed);
  const audioLanguagesMixed = formatBoolValue(row.AudioLanguagesMixed);
  const subtitleLanguagesMixed = formatBoolValue(row.SubtitleLanguagesMixed);
  const instanceName = row.InstanceName ?? row.InstanceId ?? "";

  if (row.TautulliMatchStatus === "unmatched") {
    tr.classList.add("row-mismatch");
  }

  if (app === "sonarr") {
    tr.innerHTML = `
      <td data-col="Title">${buildTitleLink(row, app)}</td>
      <td data-col="Instance">${escapeHtml(instanceName)}</td>
      <td class="right" data-col="EpisodesCounted" data-app="sonarr">${row.EpisodesCounted ?? ""}</td>
      <td class="right" data-col="TotalSizeGB" data-app="sonarr">${row.TotalSizeGB ?? ""}</td>
      <td class="right" data-col="AvgEpisodeSizeGB" data-app="sonarr">${row.AvgEpisodeSizeGB ?? ""}</td>
      <td class="right" data-col="ContentHours" data-app="sonarr">${contentHours}</td>
      <td data-col="VideoQuality">${escapeHtml(row.VideoQuality ?? "")}</td>
      <td data-col="Resolution">${escapeHtml(row.Resolution ?? "")}</td>
      <td data-col="VideoCodec">${escapeHtml(row.VideoCodec ?? "")}</td>
      <td data-col="VideoHDR">${escapeHtml(row.VideoHDR ?? "")}</td>
      <td data-col="AudioCodec">${audioCodec}</td>
      <td data-col="AudioProfile">${audioProfile}</td>
      <td data-col="AudioChannels">${escapeHtml(row.AudioChannels ?? "")}</td>
      <td data-col="AudioLanguages">${audioLanguages}</td>
      <td data-col="SubtitleLanguages">${subtitleLanguages}</td>
      <td data-col="TautulliMatchStatus">${matchBadge}</td>
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
      <td data-col="Path">${escapeHtml(row.Path ?? "")}</td>
    `;
  } else {
    tr.innerHTML = `
      <td data-col="Title">${buildTitleLink(row, app)}</td>
      <td data-col="Instance">${escapeHtml(instanceName)}</td>
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
      <td data-col="AudioLanguages">${audioLanguages}</td>
      <td data-col="SubtitleLanguages">${subtitleLanguages}</td>
      <td data-col="TautulliMatchStatus">${matchBadge}</td>
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
      <td data-col="Path">${escapeHtml(row.Path ?? "")}</td>
    `;
  }

  return tr;
}

function getRowElement(row, app) {
  const key = row.__sortarrKey || buildRowKey(row, app);
  const cache = rowCacheByApp[app];
  const existing = cache.get(key);
  if (existing) return existing;
  const tr = buildRow(row, app);
  cache.set(key, tr);
  return tr;
}

function renderBatch(rows, token, start, totalRows, totalAll, app) {
  if (token !== renderToken) return;
  const end = Math.min(start + RENDER_BATCH_SIZE, rows.length);
  const frag = document.createDocumentFragment();
  for (let i = start; i < end; i += 1) {
    frag.appendChild(getRowElement(rows[i], app));
  }
  tbody.appendChild(frag);
  updateColumnVisibility(tbody);

  if (end < rows.length) {
    requestAnimationFrame(() => renderBatch(rows, token, end, totalRows, totalAll, app));
    return;
  }

  if (token !== renderToken) return;
  setBatching(false);
  setStatus(`Loaded ${totalRows} / ${totalAll}`);
}

function render(data, options = {}) {
  const app = activeApp;
  const filtered = applyFilters(data || []);
  const sorted = sortData(filtered);
  const allowBatch = options.allowBatch !== false;
  const shouldBatch = allowBatch && sorted.length > RENDER_BATCH_MIN;
  const token = ++renderToken;

  setBatching(shouldBatch);
  clearTable();

  if (!sorted.length) {
    setBatching(false);
    setStatus(`Loaded 0 / ${data.length}`);
    updateColumnVisibility();
    return;
  }

  if (!shouldBatch) {
    const frag = document.createDocumentFragment();
    for (const row of sorted) {
      frag.appendChild(getRowElement(row, app));
    }
    tbody.appendChild(frag);
    updateColumnVisibility(tbody);
    setBatching(false);
    setStatus(`Loaded ${sorted.length} / ${data.length}`);
    return;
  }

  renderBatch(sorted, token, 0, sorted.length, data.length, app);
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
    if (app === activeApp && !background) {
      setLoading(true, label);
      if (!refresh && !(dataByApp[app] || []).length) {
        noticeByApp[app] = COLD_CACHE_NOTICE;
        setStatusNotice(COLD_CACHE_NOTICE);
      }
    }

    const base = app === "sonarr" ? "/api/shows" : "/api/movies";
    const url = refresh ? `${base}?refresh=1` : base;

    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${txt}`);
    }

    const warn = res.headers.get("X-Sortarr-Warn") || "";
    const noticeState = parseNoticeState(res.headers);
    const json = await res.json();

    // If a newer request for this app is in flight, ignore this response
    if (myToken !== loadTokens[app]) return;

    applyNoticeState(app, noticeState.flags, warn, noticeState.notice);
    rowCacheByApp[app].clear();
    dataByApp[app] = json;
    assignRowKeys(dataByApp[app], app);
    lastUpdatedByApp[app] = Date.now();
    if (app === activeApp) {
      render(dataByApp[app], { allowBatch: true });
      updateLastUpdatedDisplay();
    }
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
      render(dataByApp[activeApp] || [], { allowBatch: false });
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
    load(true);
    if ((otherApp === "sonarr" && configState.sonarrConfigured) ||
        (otherApp === "radarr" && configState.radarrConfigured)) {
      prefetch(otherApp, true);
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
  if (existing.length && !refresh) return;

  const token = ++prefetchTokens[app];
  const background = options.background === true;
  try {
    const base = app === "sonarr" ? "/api/shows" : "/api/movies";
    const url = refresh ? `${base}?refresh=1` : base;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${txt}`);
    }
    const warn = res.headers.get("X-Sortarr-Warn") || "";
    const noticeState = parseNoticeState(res.headers);
    const json = await res.json();
    if (token !== prefetchTokens[app]) return;
    applyNoticeState(app, noticeState.flags, warn, noticeState.notice);
    rowCacheByApp[app].clear();
    dataByApp[app] = json;
    assignRowKeys(dataByApp[app], app);
    lastUpdatedByApp[app] = Date.now();
    if (app === activeApp) {
      render(dataByApp[app], { allowBatch: true });
      updateLastUpdatedDisplay();
    }
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
  updateColumnVisibility();
  if (chipsChanged && (dataByApp[activeApp] || []).length) {
    render(dataByApp[activeApp], { allowBatch: false });
  }
}

if (titleFilter) {
  titleFilter.addEventListener("input", () => render(dataByApp[activeApp] || [], { allowBatch: false }));
}

if (pathFilter) {
  pathFilter.addEventListener("input", () => render(dataByApp[activeApp] || [], { allowBatch: false }));
}

if (advancedFilter) {
  advancedFilter.addEventListener("input", () => render(dataByApp[activeApp] || [], { allowBatch: false }));
}

if (advancedToggle) {
  advancedToggle.addEventListener("click", () => {
    setAdvancedMode(!advancedEnabled);
    render(dataByApp[activeApp] || [], { allowBatch: false });
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
  loadColumnPrefs();
  loadCsvColumnsState();
  syncCsvToggle();
  setTautulliEnabled(false);
  updateColumnFilter();
  updateColumnVisibility();
  updateChipVisibility();
  updateLastUpdatedDisplay();
  updateSortIndicators();
  setAdvancedMode(false);
  await loadConfig();
  const otherApp = activeApp === "sonarr" ? "radarr" : "sonarr";
  if ((otherApp === "sonarr" && configState.sonarrConfigured) ||
      (otherApp === "radarr" && configState.radarrConfigured)) {
    prefetch(otherApp, false);
  }
  await load(false);
})();
