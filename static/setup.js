(function () {
  function getFieldValue(name) {
    const el = document.querySelector(`[name="${CSS.escape(name)}"]`);
    return el ? String(el.value || "").trim() : "";
  }

  const apiOrigin = window.location && window.location.host
    ? `${window.location.protocol}//${window.location.host}`
    : "";

  function apiUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    let normalized = path;
    if (!normalized.startsWith("/")) {
      normalized = `/${normalized}`;
    }
    return apiOrigin ? `${apiOrigin}${normalized}` : normalized;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function ensureMinimumDelay(startedAt, minMs) {
    const elapsed = Date.now() - startedAt;
    const remaining = minMs - elapsed;
    if (remaining > 0) {
      await delay(remaining);
    }
  }

  function updateInlineMessage(key, message, state) {
    const el = document.querySelector(`[data-inline="${CSS.escape(key)}"]`);
    if (!el) return;
    if (!message) {
      el.textContent = "";
      el.classList.add("hidden");
      el.classList.remove("is-error", "is-ok", "is-pending");
      return;
    }
    el.textContent = message;
    el.classList.remove("hidden", "is-error", "is-ok", "is-pending");
    if (state) {
      el.classList.add(state);
    }
  }

  function flashInline(button, kind) {
    const inline = button.closest(".setup-inline");
    if (!inline) return;
    const messageEl = inline.querySelector(".setup-inline-message");
    if (messageEl) {
      const inlineRect = inline.getBoundingClientRect();
      const msgRect = messageEl.getBoundingClientRect();
      const width = Math.min(inlineRect.width, Math.max(0, msgRect.right - inlineRect.left + 10));
      inline.style.setProperty("--setup-flash-width", `${Math.round(width)}px`);
    }
    if (inline._flashTimer) {
      clearTimeout(inline._flashTimer);
      inline._flashTimer = null;
    }
    inline.classList.remove("setup-inline--flash-ok", "setup-inline--flash-error");
    void inline.offsetWidth;
    inline.classList.add(kind === "ok" ? "setup-inline--flash-ok" : "setup-inline--flash-error");
    inline._flashTimer = setTimeout(() => {
      inline.classList.remove("setup-inline--flash-ok", "setup-inline--flash-error");
      inline._flashTimer = null;
    }, 2600);
  }

  async function runTest(button) {
    if (button.dataset.testing === "1") return;
    const kind = button.dataset.kind || "";
    const urlField = button.dataset.urlId || "";
    const keyField = button.dataset.keyId || "";
    const inlineKey = button.dataset.inlineKey || "";

    const url = getFieldValue(urlField);
    const apiKey = getFieldValue(keyField);
    if (!url || !apiKey) {
      updateInlineMessage(inlineKey, "URL and API key are required.", "is-error");
      return;
    }

    const startedAt = Date.now();
    button.dataset.testing = "1";
    button.classList.add("is-testing");
    button.setAttribute("aria-busy", "true");
    button.setAttribute("aria-disabled", "true");
    updateInlineMessage(inlineKey, "Testing connection...", "is-pending");
    try {
      const res = await fetch(apiUrl("/api/setup/test"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ kind, url, api_key: apiKey }),
      });
      let payload = {};
      try {
        payload = await res.json();
      } catch {
        payload = {};
      }
      await ensureMinimumDelay(startedAt, 250);
      if (res.ok && payload.ok) {
        updateInlineMessage(inlineKey, "Connection ok.", "is-ok");
        flashInline(button, "ok");
      } else {
        const msg = payload.error || "Connection failed.";
        updateInlineMessage(inlineKey, msg, "is-error");
        flashInline(button, "error");
      }
    } catch (err) {
      await ensureMinimumDelay(startedAt, 250);
      updateInlineMessage(inlineKey, `Connection failed: ${err}`, "is-error");
      flashInline(button, "error");
    } finally {
      button.dataset.testing = "0";
      button.classList.remove("is-testing");
      button.removeAttribute("aria-busy");
      button.removeAttribute("aria-disabled");
    }
  }

  document.querySelectorAll(".setup-test").forEach((button) => {
    button.addEventListener("click", () => runTest(button));
  });
})();
