(function () {
  function getFieldValue(name) {
    const el = document.querySelector(`[name="${CSS.escape(name)}"]`);
    return el ? String(el.value || "").trim() : "";
  }

  const apiOrigin = window.location && window.location.host
    ? `${window.location.protocol}//${window.location.host}`
    : "";

  const CSRF_COOKIE_NAME = "sortarr_csrf";

  function apiUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    let normalized = path;
    if (!normalized.startsWith("/")) {
      normalized = `/${normalized}`;
    }
    return apiOrigin ? `${apiOrigin}${normalized}` : normalized;
  }

  function readCookie(name) {
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
    if (button.disabled) return;
    const kind = button.dataset.kind || "";
    const urlField = button.dataset.urlId || "";
    const keyField = button.dataset.keyId || "";
    const clientIdField = button.dataset.clientId || "";
    const inlineKey = button.dataset.inlineKey || "";

    const url = getFieldValue(urlField);
    const apiKey = getFieldValue(keyField);
    const clientId = clientIdField ? getFieldValue(clientIdField) : "";
    if (!url || !apiKey) {
      updateInlineMessage(
        inlineKey,
        (window.SORTARR_I18N && window.SORTARR_I18N.url_key_required)
          ? window.SORTARR_I18N.url_key_required
          : "URL and API key are required.",
        "is-error"
      );
      return;
    }

    const startedAt = Date.now();
    button.dataset.testing = "1";
    button.classList.add("is-testing");
    button.setAttribute("aria-busy", "true");
    button.setAttribute("aria-disabled", "true");

    updateInlineMessage(
      inlineKey,
      (window.SORTARR_I18N && window.SORTARR_I18N.testing_connection)
        ? window.SORTARR_I18N.testing_connection
        : "Testing connection...",
      "is-pending"
    );

    try {
      const res = await fetch(apiUrl("/api/setup/test"), {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        credentials: "same-origin",
        body: JSON.stringify({
          kind,
          url,
          api_key: apiKey,
          ...(clientId ? { client_id: clientId } : {}),
        }),
      });

      let payload = {};
      try {
        payload = await res.json();
      } catch {
        payload = {};
      }

      await ensureMinimumDelay(startedAt, 250);

      if (res.ok && payload.ok) {
        updateInlineMessage(
          inlineKey,
          (window.SORTARR_I18N && window.SORTARR_I18N.connection_ok)
            ? window.SORTARR_I18N.connection_ok
            : "Connection OK.",
          "is-ok"
        );
        flashInline(button, "ok");
      } else {
        const backendErr = payload.error || "";
        const msg =
          (backendErr === "Connection failed. Check URL and API key.")
            ? ((window.SORTARR_I18N && window.SORTARR_I18N.connection_failed_check)
              ? window.SORTARR_I18N.connection_failed_check
              : backendErr)
            : (backendErr || ((window.SORTARR_I18N && window.SORTARR_I18N.connection_failed_check)
              ? window.SORTARR_I18N.connection_failed_check
              : "Connection failed. Check URL and API key."));
        updateInlineMessage(inlineKey, msg, "is-error");
        flashInline(button, "error");
      }
    } catch (err) {
      await ensureMinimumDelay(startedAt, 250);
      updateInlineMessage(
        inlineKey,
        `${(window.SORTARR_I18N && window.SORTARR_I18N.connection_failed_check)
          ? window.SORTARR_I18N.connection_failed_check
          : "Connection failed. Check URL and API key."}: ${err}`,
        "is-error"
      );
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

  function buildPathMapInput(name, placeholder) {
    const input = document.createElement("input");
    input.type = "text";
    input.name = name;
    if (placeholder) {
      input.placeholder = placeholder;
    }
    input.setAttribute("aria-label", "Path map");
    return input;
  }

  function initPathMapGroups() {
    document.querySelectorAll("[data-path-map-group]").forEach((group) => {
      const name = group.dataset.pathMapName || "";
      const placeholder = group.dataset.pathMapPlaceholder || "";
      const list = group.querySelector("[data-path-map-list]");
      const addBtn = group.querySelector("[data-path-map-add]");
      if (!name || !list || !addBtn) return;
      addBtn.addEventListener("click", () => {
        const input = buildPathMapInput(name, placeholder);
        list.appendChild(input);
        input.focus();
      });
    });
  }

  function toggleFieldDisabled(field, disabled) {
    if (!field) return;
    field.disabled = disabled;
    const label = field.closest("label");
    if (label) {
      label.classList.toggle("is-disabled", disabled);
    }
  }

  function toggleButtonDisabled(button, disabled) {
    if (!button) return;
    button.disabled = disabled;
    if (disabled) {
      button.setAttribute("aria-disabled", "true");
    } else {
      button.removeAttribute("aria-disabled");
    }
  }

  function updateHistorySourceLock() {
    const jellyFields = [
      document.querySelector('[name="jellystat_url"]'),
      document.querySelector('[name="jellystat_api_key"]'),
      document.querySelector('[name="jellystat_library_ids_sonarr"]'),
      document.querySelector('[name="jellystat_library_ids_radarr"]'),
    ];
    const tautulliFields = [
      document.querySelector('[name="tautulli_url"]'),
      document.querySelector('[name="tautulli_api_key"]'),
    ];
    const jellyTest = document.querySelector('.setup-test[data-kind="jellystat"]');
    const tautulliTest = document.querySelector('.setup-test[data-kind="tautulli"]');
    jellyFields.forEach((field) => toggleFieldDisabled(field, false));
    tautulliFields.forEach((field) => toggleFieldDisabled(field, false));
    toggleButtonDisabled(jellyTest, false);
    toggleButtonDisabled(tautulliTest, false);
  }

  function initHistorySourceLock() {
    const fields = [
      document.querySelector('[name="tautulli_url"]'),
      document.querySelector('[name="tautulli_api_key"]'),
      document.querySelector('[name="jellystat_url"]'),
      document.querySelector('[name="jellystat_api_key"]'),
    ];
    fields.forEach((field) => {
      if (!field) return;
      field.addEventListener("input", updateHistorySourceLock);
      field.addEventListener("change", updateHistorySourceLock);
    });
    updateHistorySourceLock();
  }


  const setupCustomSelectState = new Map();
  let setupCustomSelectListenersBound = false;
  let setupCustomSelectPositionPending = false;

  function closeSetupCustomSelects(exceptSelect) {
    setupCustomSelectState.forEach((state, selectEl) => {
      if (exceptSelect && selectEl === exceptSelect) return;
      state.wrapper.classList.remove("custom-select--open");
      state.trigger.setAttribute("aria-expanded", "false");
      state.menu.classList.add("hidden");
    });
  }

  function positionSetupCustomSelectMenu(state) {
    const triggerRect = state.trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const maxWidth = Math.min(360, viewportWidth - 16);
    const width = Math.max(triggerRect.width, 180);
    state.menu.style.width = `${Math.min(width, maxWidth)}px`;
    state.menu.style.left = `${Math.max(8, Math.min(triggerRect.left, viewportWidth - Math.min(width, maxWidth) - 8))}px`;
    state.menu.style.top = `${Math.round(triggerRect.bottom + 6)}px`;
  }

  function scheduleSetupCustomSelectReposition() {
    if (setupCustomSelectPositionPending) return;
    setupCustomSelectPositionPending = true;
    window.requestAnimationFrame(() => {
      setupCustomSelectPositionPending = false;
      setupCustomSelectState.forEach((state) => {
        if (state.wrapper.classList.contains("custom-select--open")) {
          positionSetupCustomSelectMenu(state);
        }
      });
    });
  }

  function updateSetupCustomSelect(selectEl) {
    const state = setupCustomSelectState.get(selectEl);
    if (!state) return;
    const options = Array.from(selectEl.options || []);
    const selected = options.find((opt) => opt.value === selectEl.value) || options[0] || null;
    state.label.textContent = selected ? selected.textContent : "";
    state.trigger.disabled = Boolean(selectEl.disabled);
    state.menu.innerHTML = "";

    options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "custom-select-option";
      button.textContent = option.textContent || "";
      button.dataset.value = option.value || "";
      button.setAttribute("role", "option");
      if (option.value === selectEl.value) {
        button.classList.add("is-selected");
        button.setAttribute("aria-selected", "true");
      } else {
        button.setAttribute("aria-selected", "false");
      }
      button.addEventListener("click", () => {
        if (selectEl.value !== option.value) {
          selectEl.value = option.value;
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        }
        closeSetupCustomSelects();
        state.trigger.focus();
      });
      state.menu.appendChild(button);
    });

    if (state.wrapper.classList.contains("custom-select--open")) {
      positionSetupCustomSelectMenu(state);
    }
  }

  function initSetupCustomSelect(selectEl) {
    if (!selectEl || setupCustomSelectState.has(selectEl)) return;

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

    const label = document.createElement("span");
    label.className = "custom-select-label";

    const caret = document.createElement("span");
    caret.className = "custom-select-caret";
    caret.setAttribute("aria-hidden", "true");

    trigger.appendChild(label);
    trigger.appendChild(caret);

    const menu = document.createElement("div");
    menu.className = "custom-select-menu hidden";
    menu.setAttribute("role", "listbox");

    wrapper.appendChild(trigger);
    document.body.appendChild(menu);

    const state = { select: selectEl, wrapper, trigger, label, menu };
    setupCustomSelectState.set(selectEl, state);

    trigger.addEventListener("click", () => {
      if (trigger.disabled) return;
      const isOpen = wrapper.classList.contains("custom-select--open");
      if (isOpen) {
        closeSetupCustomSelects();
        return;
      }
      closeSetupCustomSelects(selectEl);
      wrapper.classList.add("custom-select--open");
      trigger.setAttribute("aria-expanded", "true");
      menu.classList.remove("hidden");
      positionSetupCustomSelectMenu(state);
    });

    selectEl.addEventListener("change", () => updateSetupCustomSelect(selectEl));

    bindSetupCustomSelectListeners();
    updateSetupCustomSelect(selectEl);
  }

  function bindSetupCustomSelectListeners() {
    if (setupCustomSelectListenersBound) return;
    setupCustomSelectListenersBound = true;

    document.addEventListener("click", (event) => {
      const insideAny = Array.from(setupCustomSelectState.values()).some((state) => {
        return state.wrapper.contains(event.target) || state.menu.contains(event.target);
      });
      if (!insideAny) {
        closeSetupCustomSelects();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSetupCustomSelects();
      }
    });

    window.addEventListener("resize", scheduleSetupCustomSelectReposition);
    window.addEventListener("scroll", scheduleSetupCustomSelectReposition, true);
  }

  function initSourcePreferenceSelects() {
    initSetupCustomSelect(document.querySelector('[name="media_source_preference"]'));
    initSetupCustomSelect(document.querySelector('[name="history_source_preference"]'));
  }

  initPathMapGroups();
  initHistorySourceLock();
  initSourcePreferenceSelects();

  function applyCategoryTranslations() {
    const i18n = window.SORTARR_I18N || {};
    const nodes = document.querySelectorAll(".setup-category-title");
    nodes.forEach((node) => {
      const raw = node.textContent || "";
      const text = raw.trim();
      if (text === "Media Sources" && i18n.media_sources) {
        node.textContent = i18n.media_sources;
      } else if (text === "Playback History Sources" && i18n.playback_history_sources) {
        node.textContent = i18n.playback_history_sources;
      } else if (text === "Playback Providers" && i18n.playback_providers) {
        node.textContent = i18n.playback_providers;
      }
    });
  }

  function sourceLabel(value) {
    const key = String(value || "").trim().toLowerCase();
    if (key === "arr") return "Sonarr/Radarr";
    if (key === "plex") return "Plex";
    if (key === "tautulli") return "Tautulli";
    if (key === "jellystat") return "Jellystat";
    if (key) return key;
    return "Auto";
  }

  async function updateEffectiveSourcesHint() {
    const el = document.getElementById("setupEffectiveSources");
    if (!el) return;
    try {
      const res = await fetch(apiUrl("/api/config"), {
        method: "GET",
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const payload = await res.json();
      const selected = (payload && payload.option_set && payload.option_set.selected) || {};
      const media = sourceLabel(selected.media_source);
      const history = sourceLabel(selected.history_source);
      el.textContent = `Effective sources: Media ${media}, History ${history}`;
    } catch {
      // Keep server-rendered fallback when API is unavailable.
    }
  }

  applyCategoryTranslations();
  updateEffectiveSourcesHint();
})();
