(function () {
  const el = document.getElementById("setup-i18n-json");
  if (!el) {
    window.SORTARR_I18N = window.SORTARR_I18N || {};
    return;
  }
  try {
    const parsed = JSON.parse(el.textContent || "{}");
    window.SORTARR_I18N = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    window.SORTARR_I18N = {};
  }
})();
