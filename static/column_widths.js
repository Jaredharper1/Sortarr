(function () {
  const COLUMN_WIDTHS = [
    { column: "Title", strategy: "dynamic_title_path", min: "var(--title-col-width)", ideal: "var(--title-col-width)", max: "var(--title-col-width)", apps: "shared", lockDuringBatch: true, truncate: true },
    { column: "Path", strategy: "dynamic_title_path", min: "400px", ideal: "var(--path-col-width)", max: "var(--path-col-width)", apps: "shared", lockDuringBatch: true, truncate: true },
    { column: "RootFolder", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "shared", lockDuringBatch: true, truncate: true },
    { column: "TitleSlug", strategy: "fixed", min: "260px", ideal: "260px", max: "260px", apps: "sonarr", lockDuringBatch: true, truncate: true },
    { column: "TmdbId", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "Year", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "DateAdded", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "shared", lockDuringBatch: true, truncate: false },

    { column: "ContentHours", strategy: "capped", min: "var(--cap-ContentHours, auto)", ideal: "var(--cap-ContentHours, auto)", max: "var(--cap-ContentHours, auto)", apps: "sonarr", lockDuringBatch: true, truncate: false },
    { column: "RuntimeMins", strategy: "capped", min: "var(--cap-RuntimeMins, auto)", ideal: "var(--cap-RuntimeMins, auto)", max: "var(--cap-RuntimeMins, auto)", apps: "radarr", lockDuringBatch: true, truncate: false },
    { column: "EpisodesCounted", strategy: "capped", min: "60px", ideal: "max-content", max: "none", apps: "sonarr", lockDuringBatch: true, truncate: false },
    { column: "SeasonCount", strategy: "capped", min: "80px", ideal: "max-content", max: "none", apps: "sonarr", lockDuringBatch: true, truncate: false },
    { column: "MissingCount", strategy: "capped", min: "80px", ideal: "max-content", max: "none", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "CutoffUnmetCount", strategy: "capped", min: "80px", ideal: "max-content", max: "none", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "AvgEpisodeSizeGB", strategy: "capped", min: "80px", ideal: "max-content", max: "none", apps: "sonarr", lockDuringBatch: true, truncate: false },
    { column: "TotalSizeGB", strategy: "capped", min: "100px", ideal: "max-content", max: "none", apps: "sonarr", lockDuringBatch: true, truncate: false },
    { column: "FileSizeGB", strategy: "capped", min: "var(--cap-FileSizeGB, auto)", ideal: "var(--cap-FileSizeGB, auto)", max: "var(--cap-FileSizeGB, auto)", apps: "radarr", lockDuringBatch: true, truncate: false },
    { column: "GBPerHour", strategy: "capped", min: "var(--cap-GBPerHour, auto)", ideal: "var(--cap-GBPerHour, auto)", max: "var(--cap-GBPerHour, auto)", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "BitrateMbps", strategy: "capped", min: "var(--cap-BitrateMbps, auto)", ideal: "var(--cap-BitrateMbps, auto)", max: "var(--cap-BitrateMbps, auto)", apps: "shared", lockDuringBatch: true, truncate: false },

    { column: "Status", strategy: "capped", min: "100px", ideal: "max-content", max: "none", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "Monitored", strategy: "fixed", min: "96px", ideal: "96px", max: "96px", apps: "radarr", lockDuringBatch: true, truncate: false },
    { column: "Instance", strategy: "capped", min: "100px", ideal: "max-content", max: "none", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "QualityProfile", strategy: "capped", min: "100px", ideal: "max-content", max: "none", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "ReleaseGroup", strategy: "capped", min: "100px", ideal: "max-content", max: "none", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "Tags", strategy: "capped", min: "100px", ideal: "max-content", max: "none", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "Studio", strategy: "capped", min: "100px", ideal: "max-content", max: "none", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "SeriesType", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "sonarr", lockDuringBatch: true, truncate: false },
    { column: "Genres", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "OriginalLanguage", strategy: "capped", min: "var(--cap-OriginalLanguage, auto)", ideal: "var(--cap-OriginalLanguage, auto)", max: "var(--cap-OriginalLanguage, auto)", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "LastAired", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "sonarr", lockDuringBatch: true, truncate: false },
    { column: "HasFile", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "radarr", lockDuringBatch: true, truncate: false },
    { column: "IsAvailable", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "radarr", lockDuringBatch: true, truncate: false },
    { column: "InCinemas", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "radarr", lockDuringBatch: true, truncate: false },
    { column: "LastSearchTime", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "radarr", lockDuringBatch: true, truncate: false },
    { column: "Edition", strategy: "capped", min: "var(--cap-Edition, auto)", ideal: "var(--cap-Edition, auto)", max: "var(--cap-Edition, auto)", apps: "radarr", lockDuringBatch: true, truncate: false },
    { column: "CustomFormats", strategy: "capped", min: "var(--cap-CustomFormats, auto)", ideal: "var(--cap-CustomFormats, auto)", max: "var(--cap-CustomFormats, auto)", apps: "radarr", lockDuringBatch: true, truncate: false },
    { column: "CustomFormatScore", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "radarr", lockDuringBatch: true, truncate: false },
    { column: "QualityCutoffNotMet", strategy: "capped", min: "var(--cap-QualityCutoffNotMet, auto)", ideal: "var(--cap-QualityCutoffNotMet, auto)", max: "var(--cap-QualityCutoffNotMet, auto)", apps: "radarr", lockDuringBatch: true, truncate: false },

    { column: "VideoQuality", strategy: "capped", min: "var(--cap-VideoQuality, auto)", ideal: "var(--cap-VideoQuality, auto)", max: "var(--cap-VideoQuality, auto)", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "Resolution", strategy: "capped", min: "var(--cap-Resolution, auto)", ideal: "var(--cap-Resolution, auto)", max: "var(--cap-Resolution, auto)", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "VideoCodec", strategy: "capped", min: "var(--cap-VideoCodec, auto)", ideal: "var(--cap-VideoCodec, auto)", max: "var(--cap-VideoCodec, auto)", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "VideoHDR", strategy: "capped", min: "var(--cap-VideoHDR, auto)", ideal: "var(--cap-VideoHDR, auto)", max: "var(--cap-VideoHDR, auto)", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "AudioCodec", strategy: "capped", min: "112px", ideal: "max-content", max: "160px", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "AudioChannels", strategy: "capped", min: "200px", ideal: "max-content", max: "201px", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "Languages", strategy: "content", min: "220px", ideal: "var(--cap-Languages, auto)", max: "max-content", apps: "radarr", lockDuringBatch: true, truncate: false },
    { column: "AudioLanguages", strategy: "content", min: "220px", ideal: "var(--cap-AudioLanguages, auto)", max: "max-content", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "SubtitleLanguages", strategy: "content", min: "220px", ideal: "var(--cap-SubtitleLanguages, auto)", max: "max-content", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "AudioCodecMixed", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "AudioLanguagesMixed", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "SubtitleLanguagesMixed", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "shared", lockDuringBatch: true, truncate: false },

    { column: "PlayCount", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "LastWatched", strategy: "content", min: "100px", ideal: "auto", max: "none", apps: "shared", lockDuringBatch: true, truncate: true },
    { column: "DaysSinceWatched", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "TotalWatchTimeHours", strategy: "content", min: "100px", ideal: "auto", max: "none", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "WatchContentRatio", strategy: "content", min: "auto", ideal: "auto", max: "max-content", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "UsersWatched", strategy: "fixed", min: "96px", ideal: "auto", max: "120px", apps: "shared", lockDuringBatch: true, truncate: false },
    { column: "Diagnostics", strategy: "fixed", min: "72px", ideal: "72px", max: "72px", apps: "shared", lockDuringBatch: true, truncate: false }
  ];

  const VALID_STRATEGIES = new Set(["fixed", "capped", "content", "dynamic_title_path", "auto"]);
  const VALID_APPS = new Set(["shared", "sonarr", "radarr"]);

  const index = new Map();
  for (const entry of COLUMN_WIDTHS) {
    if (!entry || !entry.column) continue;
    if (!VALID_STRATEGIES.has(entry.strategy)) {
      throw new Error(`Invalid width strategy for ${entry.column}: ${entry.strategy}`);
    }
    if (!VALID_APPS.has(entry.apps)) {
      throw new Error(`Invalid app scope for ${entry.column}: ${entry.apps}`);
    }
    index.set(entry.column, entry);
  }

  function getColumnWidthEntry(column) {
    return index.get(column) || null;
  }

  function getColumnWidthEntriesForApp(app) {
    return COLUMN_WIDTHS.filter((entry) => entry.apps === "shared" || entry.apps === app);
  }

  function getMeasuredColumnsWhitelist() {
    return COLUMN_WIDTHS.filter((entry) => entry.strategy === "dynamic_title_path" || entry.strategy === "capped")
      .map((entry) => entry.column);
  }

  window.SortarrColumnWidths = {
    COLUMN_WIDTHS,
    getColumnWidthEntry,
    getColumnWidthEntriesForApp,
    getMeasuredColumnsWhitelist,
  };
})();
