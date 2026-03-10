(function () {
  function parseJsonScript(id) {
    const el = document.getElementById(id);
    if (!el) return {};
    try {
      return JSON.parse(el.textContent || "{}");
    } catch {
      return {};
    }
  }

  const i18n = parseJsonScript("i18n-json");
  if (i18n && typeof i18n === "object") {
    window.I18N = i18n;
  } else if (!window.I18N) {
    window.I18N = {};
  }

  const cfg = parseJsonScript("bootstrap-config-json");
  const provider = String(cfg.playback_provider || "").toLowerCase();
  const playbackEnabled = Boolean(cfg.playback_configured ?? cfg.tautulli_configured);
  const label = provider === "jellystat"
    ? "Jellystat"
    : (provider === "tautulli" ? "Tautulli" : (provider === "plex" ? "Plex" : "Playback"));
  const refreshBtn = document.getElementById("refreshTautulliBtn");
  const deepRefreshBtn = document.getElementById("deepRefreshTautulliBtn");
  const playbackLabelEl = document.querySelector("[data-playback-label]");
  const showDeepRefresh = playbackEnabled && provider !== "jellystat";

  if (playbackLabelEl) {
    playbackLabelEl.textContent = label;
  }
  if (refreshBtn) {
    refreshBtn.textContent = `Re-match from ${label}`;
    refreshBtn.title = `Re-match using current ${label} data`;
    refreshBtn.classList.toggle("hidden", !playbackEnabled);
    refreshBtn.disabled = !playbackEnabled;
  }
  if (deepRefreshBtn) {
    deepRefreshBtn.textContent = `Rebuild ${label} data`;
    deepRefreshBtn.title = `Refresh ${label} library data, then rebuild matches`;
    deepRefreshBtn.classList.toggle("hidden", !showDeepRefresh);
    deepRefreshBtn.disabled = !showDeepRefresh;
  }

  if (document.documentElement.getAttribute("data-filters-collapsed") === "1") {
    const btn = document.getElementById("filtersToggleBtn");
    if (btn) {
      const showFiltersLabel = String((window.I18N && window.I18N["Show filters and chips"]) || "Show filters and chips");
      btn.setAttribute("aria-expanded", "false");
      btn.title = showFiltersLabel;
      btn.setAttribute("aria-label", showFiltersLabel);
    }
  }
})();
