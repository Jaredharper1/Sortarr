(function () {
  try {
    const root = document.documentElement;
    if (localStorage.getItem("Sortarr-filters-collapsed") === "1") {
      root.setAttribute("data-filters-collapsed", "1");
    }
    if (localStorage.getItem("Sortarr-chips-enabled") === "1") {
      root.setAttribute("data-chips-enabled", "1");
    }
  } catch {
    // Ignore storage access failures (private mode / restricted browsers).
  }
})();
