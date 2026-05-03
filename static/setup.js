(function () {
  function i18n(key, fallback, vars) {
    const dict = window.SORTARR_I18N || {};
    let value = (dict[key] !== undefined && dict[key] !== null)
      ? dict[key]
      : (fallback !== undefined ? fallback : key);
    if (!vars) return value;
    return String(value).replace(/%\(([^)]+)\)s/g, (_, name) => (
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `%(${name})s`
    ));
  }

  function getFieldValue(name) {
    const el = document.querySelector(`[name="${CSS.escape(name)}"]`);
    return el ? String(el.value || "").trim() : "";
  }

  const apiOrigin = window.location && window.location.host
    ? `${window.location.protocol}//${window.location.host}`
    : "";
  const setupForm = document.querySelector(".setup-form");
  const setupTestsEnabled = !setupForm || String(setupForm.dataset.setupTestsEnabled || "1") === "1";
  const setupSecurityLocked = Boolean(
    setupForm && String(setupForm.dataset.securityLocked || "0") === "1"
  );

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
    const cookieToken = readCookie(CSRF_COOKIE_NAME);
    if (cookieToken) return cookieToken;
    const meta = document.querySelector('meta[name="csrf-token"]');
    const metaToken = meta && meta.getAttribute("content");
    if (metaToken) return metaToken;
    return "";
  }

  function withCsrfHeaders(headers = {}) {
    const token = getCsrfToken();
    if (!token) return headers;
    return { ...headers, "X-CSRF-Token": token };
  }

  function syncSetupFormCsrfToken() {
    const form = document.querySelector(".setup-form");
    if (!form) return;
    const csrfInput = form.querySelector('input[name="csrf_token"]');
    if (!csrfInput) return;
    const token = getCsrfToken();
    if (token) {
      csrfInput.value = token;
    }
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function setSecretInlineMessage(message, state) {
    const el = document.getElementById("secretKeyInlineMessage");
    if (!el) return;
    if (!message) {
      el.textContent = "";
      el.classList.add("hidden");
      el.classList.remove("is-error", "is-ok", "is-pending");
      return;
    }
    el.textContent = message;
    el.classList.remove("hidden", "is-error", "is-ok", "is-pending");
    if (state) el.classList.add(state);
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
    const usernameField = button.dataset.usernameId || "";
    const passwordField = button.dataset.passwordId || "";
    const serverIdField = button.dataset.serverIdId || "";
    const clientIdField = button.dataset.clientId || "";
    const inlineKey = button.dataset.inlineKey || "";
    const slot = button.dataset.slot || "";
    const storedSecretAvailable = String(button.dataset.storedSecret || "0") === "1";

    const url = getFieldValue(urlField);
    const apiKey = getFieldValue(keyField);
    const username = usernameField ? getFieldValue(usernameField) : "";
    const password = passwordField ? getFieldValue(passwordField) : "";
    const serverId = serverIdField ? getFieldValue(serverIdField) : "";
    const clientId = clientIdField ? getFieldValue(clientIdField) : "";
    const useStoredSecret = Boolean(url && !apiKey && storedSecretAvailable && slot);
    if (!url || (!apiKey && !useStoredSecret)) {
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
          slot,
          use_stored_secret: useStoredSecret,
          ...(username ? { username } : {}),
          ...(password ? { password } : {}),
          ...(serverId ? { server_id: serverId } : {}),
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
    toggleButtonDisabled(button, !setupTestsEnabled);
    button.addEventListener("click", () => runTest(button));
  });

  function generateSecretKey() {
    if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
      throw new Error("crypto unavailable");
    }
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function initSecretKeyActions() {
    const form = document.querySelector(".setup-form");
    const input = document.querySelector('[name="sortarr_secret_key"]');
    const generateBtn = document.getElementById("generateSecretKeyBtn");
    if (!input || !generateBtn) return;

    generateBtn.addEventListener("click", async () => {
      try {
        input.value = generateSecretKey();
        setSecretInlineMessage(
          (window.SORTARR_I18N && window.SORTARR_I18N.secret_generated)
            ? window.SORTARR_I18N.secret_generated
            : "Permanent secret key generated. Save settings to persist it.",
          "is-ok"
        );
      } catch {
        try {
          const res = await fetch(apiUrl("/api/setup/secret_key"), {
            method: "POST",
            headers: withCsrfHeaders({ "Content-Type": "application/json" }),
            credentials: "same-origin",
            body: JSON.stringify({ action: "generate" }),
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok || !payload.ok || !payload.secret_key) {
            throw new Error("generate failed");
          }
          input.value = String(payload.secret_key || "");
          setSecretInlineMessage(
            (window.SORTARR_I18N && window.SORTARR_I18N.secret_generated)
              ? window.SORTARR_I18N.secret_generated
              : "Permanent secret key generated. Save settings to persist it.",
            "is-ok"
          );
        } catch {
          setSecretInlineMessage(
            (window.SORTARR_I18N && window.SORTARR_I18N.secret_generate_failed)
              ? window.SORTARR_I18N.secret_generate_failed
              : "Unable to generate a secret key right now.",
            "is-error"
          );
        }
      }
    });

    if (form && String(form.dataset.ephemeralSecret || "") === "1") {
      form.addEventListener("submit", (event) => {
        if (String(input.value || "").trim()) {
          return;
        }
        try {
          input.value = generateSecretKey();
          setSecretInlineMessage(
            (window.SORTARR_I18N && window.SORTARR_I18N.secret_generated)
              ? window.SORTARR_I18N.secret_generated
              : "Permanent secret key generated. Save settings to persist it.",
            "is-ok"
          );
        } catch {
          event.preventDefault();
          setSecretInlineMessage(
            (window.SORTARR_I18N && window.SORTARR_I18N.secret_required_before_save)
              ? window.SORTARR_I18N.secret_required_before_save
              : "Generate or enter a permanent Session secret key before saving settings.",
            "is-error"
          );
          generateBtn.focus();
        }
      });
    }
  }

  function buildPathMapInput(name, placeholder) {
    const input = document.createElement("input");
    input.type = "text";
    input.name = name;
    if (placeholder) {
      input.placeholder = placeholder;
    }
      input.setAttribute("aria-label", i18n("path_map", "Path map"));
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
    const tracearrFields = [
      document.querySelector('[name="tracearr_url"]'),
      document.querySelector('[name="tracearr_api_key"]'),
    ];
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
    const tracearrTest = document.querySelector('.setup-test[data-kind="tracearr"]');
    const jellyTest = document.querySelector('.setup-test[data-kind="jellystat"]');
    const tautulliTest = document.querySelector('.setup-test[data-kind="tautulli"]');
    tracearrFields.forEach((field) => toggleFieldDisabled(field, false));
    jellyFields.forEach((field) => toggleFieldDisabled(field, false));
    tautulliFields.forEach((field) => toggleFieldDisabled(field, false));
    toggleButtonDisabled(tracearrTest, !setupTestsEnabled);
    toggleButtonDisabled(jellyTest, !setupTestsEnabled);
    toggleButtonDisabled(tautulliTest, !setupTestsEnabled);
  }

  function initHistorySourceLock() {
    const fields = [
      document.querySelector('[name="tracearr_url"]'),
      document.querySelector('[name="tracearr_api_key"]'),
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
    initSetupCustomSelect(document.querySelector('[name="sortarr_auth_method"]'));
    initSetupCustomSelect(document.querySelector('[name="media_source_preference"]'));
    initSetupCustomSelect(document.querySelector('[name="history_source_preference"]'));
    initSetupCustomSelect(document.querySelector('[name="insights_provider_preference"]'));
    initSetupCustomSelect(document.querySelector('[name="proxy_preset"]'));
  }

  function updateMediaSourceGuidance() {
    const mediaSource = document.querySelector('[name="media_source_preference"]');
    const plexNotice = document.getElementById("plexMediaSourceNotice");
    const embyNotice = document.getElementById("embyMediaSourceNotice");
    const jellyfinNotice = document.getElementById("jellyfinMediaSourceNotice");
    const arrActions = document.getElementById("arrMediaSourceActions");
    const arrBlock = document.getElementById("arrMediaSourceBlock");
    const plexMount = document.getElementById("plexMediaSourceMount");
    const embyMount = document.getElementById("embyMediaSourceMount");
    const jellyfinMount = document.getElementById("jellyfinMediaSourceMount");
    if (!mediaSource || !plexNotice || !embyNotice || !jellyfinNotice) return;
    const mediaValue = String(mediaSource.value || "").trim().toLowerCase();
    const isPlex = mediaValue === "plex";
    const isEmby = mediaValue === "emby";
    const isJellyfin = mediaValue === "jellyfin";
    plexNotice.classList.toggle("hidden", !isPlex);
    embyNotice.classList.toggle("hidden", !isEmby);
    jellyfinNotice.classList.toggle("hidden", !isJellyfin);
    if (plexMount) {
      plexMount.classList.toggle("hidden", !isPlex);
    }
    if (embyMount) {
      embyMount.classList.toggle("hidden", !isEmby);
    }
    if (jellyfinMount) {
      jellyfinMount.classList.toggle("hidden", !isJellyfin);
    }
    if (!arrBlock || !arrActions) return;
    const keepArrVisible = String(arrBlock.dataset.userRevealed || "0") === "1";
    const showArrBlock = (!isPlex && !isEmby && !isJellyfin) || keepArrVisible;
    arrBlock.classList.toggle("hidden", !showArrBlock);
    arrActions.classList.toggle("hidden", (!isPlex && !isEmby && !isJellyfin) || showArrBlock);
  }

  function updatePlexProviderPlacement() {
    const mediaSource = document.querySelector('[name="media_source_preference"]');
    const plexBlock = document.getElementById("plexProviderBlock");
    const step1Mount = document.getElementById("plexMediaSourceMount");
    const step3Mount = document.getElementById("plexPlaybackProviderMount");
    if (!mediaSource || !plexBlock || !step1Mount || !step3Mount) return;
    const isPlex = String(mediaSource.value || "").trim().toLowerCase() === "plex";
    if (isPlex) {
      step1Mount.appendChild(plexBlock);
      plexBlock.classList.remove("hidden");
    } else {
      step3Mount.appendChild(plexBlock);
    }
  }

  function updateJellyfinProviderPlacement() {
    const mediaSource = document.querySelector('[name="media_source_preference"]');
    const jellyfinBlock = document.getElementById("jellyfinProviderBlock");
    const step1Mount = document.getElementById("jellyfinMediaSourceMount");
    const step3Mount = document.getElementById("jellyfinPlaybackProviderMount");
    if (!mediaSource || !jellyfinBlock || !step1Mount || !step3Mount) return;
    const isJellyfin = String(mediaSource.value || "").trim().toLowerCase() === "jellyfin";
    if (isJellyfin) {
      step1Mount.appendChild(jellyfinBlock);
      jellyfinBlock.classList.remove("hidden");
    } else {
      step3Mount.appendChild(jellyfinBlock);
    }
  }

  function updateEmbyProviderPlacement() {
    const mediaSource = document.querySelector('[name="media_source_preference"]');
    const embyBlock = document.getElementById("embyProviderBlock");
    const step1Mount = document.getElementById("embyMediaSourceMount");
    const step3Mount = document.getElementById("embyPlaybackProviderMount");
    if (!mediaSource || !embyBlock || !step1Mount || !step3Mount) return;
    const isEmby = String(mediaSource.value || "").trim().toLowerCase() === "emby";
    if (isEmby) {
      step1Mount.appendChild(embyBlock);
      embyBlock.classList.remove("hidden");
    } else {
      step3Mount.appendChild(embyBlock);
    }
  }

  function initMediaSourceGuidance() {
    const mediaSource = document.querySelector('[name="media_source_preference"]');
    const showArrMediaSourceBtn = document.getElementById("showArrMediaSourceBtn");
    const arrBlock = document.getElementById("arrMediaSourceBlock");
    const reviewJellyfinMediaBtn = document.getElementById("reviewJellyfinMediaBtn");
    const reviewJellyfinPlaybackBtn = document.getElementById("reviewJellyfinPlaybackBtn");
    if (mediaSource) {
      mediaSource.addEventListener("change", () => {
        updatePlexProviderPlacement();
        updateEmbyProviderPlacement();
        updateJellyfinProviderPlacement();
        updateMediaSourceGuidance();
        updateHistoryProviderOrdering();
        updateHistoryProviderVisibility();
        updatePlaybackProviderVisibility();
      });
      updatePlexProviderPlacement();
      updateEmbyProviderPlacement();
      updateJellyfinProviderPlacement();
      updateMediaSourceGuidance();
    }
    if (arrBlock) {
      arrBlock.querySelectorAll("input, select, textarea").forEach((field) => {
        field.addEventListener("input", updateMediaSourceGuidance);
        field.addEventListener("change", updateMediaSourceGuidance);
      });
    }
    if (showArrMediaSourceBtn && arrBlock) {
      showArrMediaSourceBtn.addEventListener("click", () => {
        arrBlock.dataset.userRevealed = "1";
        updateMediaSourceGuidance();
        const firstField = arrBlock.querySelector("input, select, textarea");
        if (firstField) {
          firstField.focus();
        }
      });
    }
    if (reviewJellyfinMediaBtn) {
      reviewJellyfinMediaBtn.addEventListener("click", async () => {
        await openGuideStep(1);
        const jellyfinUrlField = document.querySelector('[name="jellyfin_url"]');
        if (jellyfinUrlField) {
          jellyfinUrlField.focus();
        }
      });
    }
    if (reviewJellyfinPlaybackBtn) {
      reviewJellyfinPlaybackBtn.addEventListener("click", async () => {
        await openGuideStep(3);
        const jellyfinUrlField = document.querySelector('[name="jellyfin_url"]');
        if (jellyfinUrlField) {
          jellyfinUrlField.focus();
        }
      });
    }
  }

  function preferredHistoryProviderOrder() {
    const historySource = String(getFieldValue("history_source_preference") || "").toLowerCase();
    const providers = ["tracearr", "streamystats", "jellystat", "tautulli"];
    let preferred = "";
    if (providers.includes(historySource)) {
      preferred = historySource;
    }
    if (!preferred) {
      return providers;
    }
    return [preferred].concat(providers.filter((provider) => provider !== preferred));
  }

  function updateHistoryProviderOrdering() {
    const container = document.getElementById("historyProviderBlocks");
    if (!container) return;
    const blockMap = new Map();
    container.querySelectorAll("[data-history-provider]").forEach((block) => {
      const key = String(block.getAttribute("data-history-provider") || "").trim().toLowerCase();
      if (key) {
        blockMap.set(key, block);
      }
    });
    preferredHistoryProviderOrder().forEach((provider) => {
      const block = blockMap.get(provider);
      if (block) {
        container.appendChild(block);
      }
    });
  }

  function initHistoryProviderOrdering() {
    const mediaSource = document.querySelector('[name="media_source_preference"]');
    const historySource = document.querySelector('[name="history_source_preference"]');
    if (mediaSource) {
      mediaSource.addEventListener("change", updateHistoryProviderOrdering);
    }
    if (historySource) {
      historySource.addEventListener("change", updateHistoryProviderOrdering);
    }
    updateHistoryProviderOrdering();
  }

  function blockHasContent(block) {
    if (!block) return false;
    const fields = block.querySelectorAll("input, select, textarea");
    return Array.from(fields).some((field) => {
      if (!field || field.disabled) return false;
      if (field.type === "hidden" || field.name === "csrf_token") return false;
      if (field.type === "checkbox" || field.type === "radio") {
        return field.checked;
      }
      return String(field.value || "").trim() !== "";
    });
  }

  function syncOptionalReveal(button, block) {
    if (!button || !block) return;
    const visible = !block.classList.contains("hidden");
    button.classList.toggle("hidden", visible);
  }

  function bindOptionalReveal(buttonId, blockId, nextButtonId) {
    const button = document.getElementById(buttonId);
    const block = document.getElementById(blockId);
    const nextButton = nextButtonId ? document.getElementById(nextButtonId) : null;
    if (!button || !block) return;

    const update = () => {
      const shouldShow = String(block.dataset.userRevealed || "0") === "1" || blockHasContent(block);
      block.classList.toggle("hidden", !shouldShow);
      syncOptionalReveal(button, block);
      if (nextButton) {
        nextButton.classList.toggle("hidden", block.classList.contains("hidden"));
      }
    };
    block._syncOptionalReveal = update;

    button.addEventListener("click", () => {
      const removeFlag = block.querySelector('input[type="hidden"][name^="clear_"]');
      if (removeFlag) removeFlag.value = "0";
      block.dataset.userRevealed = "1";
      update();
      const firstField = block.querySelector("input, select, textarea");
      if (firstField) {
        firstField.focus();
      }
    });

    block.querySelectorAll("input, select, textarea").forEach((field) => {
      field.addEventListener("input", () => {
        const removeFlag = block.querySelector('input[type="hidden"][name^="clear_"]');
        if (removeFlag) removeFlag.value = "0";
        update();
      });
      field.addEventListener("change", () => {
        const removeFlag = block.querySelector('input[type="hidden"][name^="clear_"]');
        if (removeFlag) removeFlag.value = "0";
        update();
      });
    });

    update();
  }

  function initOptionalInstanceReveals() {
    bindOptionalReveal("showSonarrInstance2Btn", "sonarrInstance2Block", "showSonarrInstance3Btn");
    bindOptionalReveal("showSonarrInstance3Btn", "sonarrInstance3Block");
    bindOptionalReveal("showRadarrInstance2Btn", "radarrInstance2Block", "showRadarrInstance3Btn");
    bindOptionalReveal("showRadarrInstance3Btn", "radarrInstance3Block");
  }

  function clearBlockEditableFields(block) {
    if (!block) return;
    block.querySelectorAll("input, select, textarea").forEach((field) => {
      if (!field || field.disabled) return;
      if (field.type === "hidden" || field.name === "csrf_token") return;
      if (field.type === "checkbox" || field.type === "radio") {
        field.checked = false;
        return;
      }
      if (field.tagName === "SELECT") {
        field.selectedIndex = 0;
        return;
      }
      field.value = "";
    });
  }

  function initConnectionRemovalActions() {
    document.querySelectorAll("[data-remove-connection]").forEach((button) => {
      button.addEventListener("click", () => {
        const provider = String(button.getAttribute("data-remove-connection") || "").trim().toLowerCase();
        if (!provider) return;
        const block =
          document.getElementById(`${provider}ProviderBlock`) ||
          document.querySelector(`[data-history-provider="${CSS.escape(provider)}"]`) ||
          document.querySelector(`[data-playback-provider="${CSS.escape(provider)}"]`);
        if (!block) return;
        clearBlockEditableFields(block);
        const removeFlag = block.querySelector(`input[type="hidden"][name="clear_${provider}_connection"]`);
        if (removeFlag) removeFlag.value = "1";
        block.dataset.userRevealed = "0";
        updateHistoryProviderVisibility();
        updatePlaybackProviderVisibility();
        updateSetupSummaries();
      });
    });

    document.querySelectorAll("[data-remove-optional-block]").forEach((button) => {
      button.addEventListener("click", () => {
        const blockId = String(button.getAttribute("data-remove-optional-block") || "").trim();
        const block = blockId ? document.getElementById(blockId) : null;
        if (!block) return;
        clearBlockEditableFields(block);
        const removeFlag = block.querySelector('input[type="hidden"][name^="clear_"]');
        if (removeFlag) removeFlag.value = "1";
        block.dataset.userRevealed = "0";
        if (typeof block._syncOptionalReveal === "function") {
          block._syncOptionalReveal();
        } else {
          block.classList.add("hidden");
        }
        updateSetupSummaries();
      });
    });
  }

  function selectedMediaSourceIntent() {
    return String(buildSetupProviderState().media.selected || "arr").toLowerCase();
  }

  function selectedHistorySourceIntent() {
    return String(buildSetupProviderState().history.selected || "auto").toLowerCase();
  }

  function selectedInsightsProviderIntent() {
    return String(buildSetupProviderState().enrichment.selected || "auto").toLowerCase();
  }

  function isReusingPlexHistoryFromMedia() {
    const state = buildSetupProviderState();
    return String(state.history.reason || "").trim().toLowerCase() === "reusing plex from media source"
      || String(state.history.reason || "").trim().toLowerCase() === "auto selected, reusing plex from media source";
  }

  function preferredHistoryProvider() {
    const state = buildSetupProviderState();
    const mediaSource = String(state.media.selected || "").toLowerCase();
    const historySource = String(state.history.selected || "").toLowerCase();
    if (["plex", "tracearr", "jellystat", "streamystats", "tautulli"].includes(historySource)) {
      return historySource;
    }
    if (historySource === "auto" && mediaSource === "plex") {
      return "plex";
    }
    return "";
  }

  function focusProviderField(stepNumber, selector) {
    openGuideStep(stepNumber).then(() => {
      const field = selector ? document.querySelector(selector) : null;
      if (field) {
        field.focus();
      }
    });
  }

  function setSetupNotice(noticeId, textId, actionId, config) {
    const noticeEl = document.getElementById(noticeId);
    const textEl = document.getElementById(textId);
    const actionEl = document.getElementById(actionId);
    if (!noticeEl || !textEl || !actionEl) return;
    const text = String(config?.text || "").trim();
    textEl.textContent = text;
    noticeEl.classList.toggle("hidden", !text);
    const action = (config && typeof config.action === "object") ? config.action : null;
    if (!text || !action || !action.label) {
      actionEl.textContent = "";
      actionEl.classList.add("hidden");
      actionEl.onclick = null;
      return;
    }
    actionEl.textContent = action.label;
    actionEl.classList.remove("hidden");
    actionEl.onclick = () => {
      if (action.type === "step") {
        focusProviderField(action.step || 1, action.selector || "");
        return;
      }
      if (action.type === "reveal") {
        const provider = String(action.provider || "").trim().toLowerCase();
        if (!provider) return;
        const button = document.querySelector(`[data-provider-reveal="${CSS.escape(provider)}"]`);
        if (button) {
          button.click();
        }
      }
    };
  }

  function updateHistoryIntentGuidance() {
    const historySource = selectedHistorySourceIntent();
    const historyState = buildSetupProviderState().history || {};
    const selectedLabel = sourceLabel(historyState.selected);
    const usingPlexReuse = isReusingPlexHistoryFromMedia();
    let config = null;
    if (usingPlexReuse) {
      config = {
      text: i18n("plex_reuse_history_hint", "Plex is already set up in Step 1, so Sortarr can use it here for history too."),
        action: {
          type: "step",
          step: 1,
          selector: '[name="plex_url"]',
      label: i18n("review_plex_step_1", "Review Plex in Step 1"),
        },
      };
    } else if (historySource === "plex") {
      config = {
      text: i18n("plex_history_step_3_hint", "Plex is selected for history. Add your Plex details in Step 3 below."),
        action: {
          type: "step",
          step: 3,
          selector: '[name="plex_url"]',
      label: i18n("open_step_3", "Open Step 3"),
        },
      };
    } else if (["tautulli", "tracearr", "jellystat", "streamystats"].includes(historySource)) {
      const block = document.querySelector(`[data-history-provider="${CSS.escape(historySource)}"]`);
      const blockHidden = Boolean(block && block.classList.contains("hidden"));
      let text = summarizeRoleHelper("history");
      if (historySource === "streamystats") {
    text += i18n("streamystats_history_hint_suffix", " Add your Streamystats details below to use Jellyfin-backed watch history and detail stats.");
      } else {
        text += ` Add your ${selectedLabel} details below.`;
      }
      config = {
        text,
        action: blockHidden ? {
          type: "reveal",
          provider: historySource,
          label: `Add ${selectedLabel}`,
        } : null,
      };
    }
    setSetupNotice("historyProviderNotice", "historyProviderNoticeText", "historyProviderNoticeAction", config);
  }

  function updateHistoryProviderVisibility() {
    updateHistoryIntentGuidance();
    const actions = document.getElementById("historyProviderActions");
    const container = document.getElementById("historyProviderBlocks");
    if (!actions || !container) return;

    const historySource = selectedHistorySourceIntent();
    const preferred = preferredHistoryProvider();
    const visibleProviders = new Set();

    container.querySelectorAll("[data-history-provider]").forEach((block) => {
      const provider = String(block.getAttribute("data-history-provider") || "").trim().toLowerCase();
      if (!provider) return;
      const isConfigured = blockHasContent(block);
      const isRevealed = String(block.dataset.userRevealed || "0") === "1";
      const preferSpecificProvider = ["tracearr", "streamystats", "jellystat", "tautulli"].includes(historySource);
      const shouldShow =
        isRevealed ||
          provider === preferred ||
          (!preferSpecificProvider && isConfigured);
      block.classList.toggle("hidden", !shouldShow);
      if (shouldShow) {
        visibleProviders.add(provider);
      }
    });

    actions.querySelectorAll("[data-provider-reveal]").forEach((button) => {
      const provider = String(button.getAttribute("data-provider-reveal") || "").trim().toLowerCase();
      const hidden = visibleProviders.has(provider);
      button.classList.toggle("hidden", hidden);
      button.disabled = hidden;
      if (hidden) {
        button.setAttribute("aria-disabled", "true");
      } else {
        button.removeAttribute("aria-disabled");
      }
    });

    actions.classList.toggle(
      "hidden",
      Array.from(actions.querySelectorAll("[data-provider-reveal]")).every((button) => button.classList.contains("hidden"))
    );
  }

  function initHistoryProviderReveals() {
    const mediaSource = document.querySelector('[name="media_source_preference"]');
    const historySource = document.querySelector('[name="history_source_preference"]');
    const actions = document.getElementById("historyProviderActions");
    const container = document.getElementById("historyProviderBlocks");
    if (!actions || !container) return;

    actions.querySelectorAll("[data-provider-reveal]").forEach((button) => {
      button.addEventListener("click", () => {
        const provider = String(button.getAttribute("data-provider-reveal") || "").trim().toLowerCase();
        if (!provider) return;
        const block = container.querySelector(`[data-history-provider="${CSS.escape(provider)}"]`);
        if (!block) return;
        const removeFlag = block.querySelector(`input[type="hidden"][name="clear_${provider}_connection"]`);
        if (removeFlag) removeFlag.value = "0";
        block.dataset.userRevealed = "1";
        updateHistoryProviderOrdering();
        updateHistoryProviderVisibility();
        const firstField = block.querySelector("input, select, textarea");
        if (firstField) {
          firstField.focus();
        }
      });
    });

    container.querySelectorAll("[data-history-provider]").forEach((block) => {
      block.querySelectorAll("input, select, textarea").forEach((field) => {
        field.addEventListener("input", () => {
          const provider = String(block.getAttribute("data-history-provider") || "").trim().toLowerCase();
          const removeFlag = block.querySelector(`input[type="hidden"][name="clear_${provider}_connection"]`);
          if (removeFlag) removeFlag.value = "0";
          updateHistoryProviderVisibility();
        });
        field.addEventListener("change", () => {
          const provider = String(block.getAttribute("data-history-provider") || "").trim().toLowerCase();
          const removeFlag = block.querySelector(`input[type="hidden"][name="clear_${provider}_connection"]`);
          if (removeFlag) removeFlag.value = "0";
          updateHistoryProviderVisibility();
        });
      });
    });

    if (mediaSource) {
      mediaSource.addEventListener("change", updateHistoryProviderVisibility);
    }
    if (historySource) {
      historySource.addEventListener("change", updateHistoryProviderVisibility);
    }

    updateHistoryProviderVisibility();
  }

  function updatePlaybackIntentGuidance() {
    const mediaEffective = String(buildSetupProviderState().media?.effective || "").toLowerCase();
    const mediaLabel = sourceLabel(mediaEffective);
    const selectorMap = {
      plex: '[name="plex_url"]',
      emby: '[name="emby_url"]',
      jellyfin: '[name="jellyfin_url"]',
    };
    const config = ["plex", "emby", "jellyfin"].includes(mediaEffective)
      ? {
        text: i18n("provider_reuse_enrichment_hint", "%(provider)s is already set up in Step 1, so Sortarr can use it here for enrichment too.", { provider: mediaLabel }),
        action: {
          type: "step",
          step: 1,
          selector: selectorMap[mediaEffective] || "",
          label: i18n("review_provider_step_1", "Review %(provider)s in Step 1", { provider: mediaLabel }),
        },
      }
      : null;
    setSetupNotice("playbackProviderNotice", "playbackProviderNoticeText", "playbackProviderNoticeAction", config);
  }

  function updatePlaybackProviderVisibility() {
    updatePlexProviderPlacement();
    updateEmbyProviderPlacement();
    updateJellyfinProviderPlacement();
    updatePlaybackIntentGuidance();
    const actions = document.getElementById("playbackProviderActions");
    const container = document.getElementById("playbackProviderBlocks");
    if (!actions || !container) return;

    const mediaSource = selectedMediaSourceIntent();
    const historySource = selectedHistorySourceIntent();
    const insightsProvider = selectedInsightsProviderIntent();
    const visibleProviders = new Set();

    container.querySelectorAll("[data-playback-provider]").forEach((block) => {
      const provider = String(block.getAttribute("data-playback-provider") || "").trim().toLowerCase();
      if (!provider) return;
      const isConfigured = blockHasContent(block);
      const isRevealed = String(block.dataset.userRevealed || "0") === "1";
      const neededForHistory = historySource === provider;
      const neededForMedia = mediaSource === provider;
      const neededForInsights = insightsProvider === provider;
      const shouldShow = isRevealed || isConfigured || neededForHistory || neededForMedia || neededForInsights;
      block.classList.toggle("hidden", !shouldShow);
      if (shouldShow) {
        visibleProviders.add(provider);
      }
    });

    actions.querySelectorAll("[data-playback-provider-reveal]").forEach((button) => {
      const provider = String(button.getAttribute("data-playback-provider-reveal") || "").trim().toLowerCase();
      const hidden = visibleProviders.has(provider) || mediaSource === provider;
      button.classList.toggle("hidden", hidden);
      button.disabled = hidden;
      if (hidden) {
        button.setAttribute("aria-disabled", "true");
      } else {
        button.removeAttribute("aria-disabled");
      }
    });

    actions.classList.toggle(
      "hidden",
      Array.from(actions.querySelectorAll("[data-playback-provider-reveal]")).every((button) => button.classList.contains("hidden"))
    );
  }

  function initPlaybackProviderReveals() {
    const mediaSource = document.querySelector('[name="media_source_preference"]');
    const historySource = document.querySelector('[name="history_source_preference"]');
    const actions = document.getElementById("playbackProviderActions");
    const container = document.getElementById("playbackProviderBlocks");
    if (!actions || !container) return;

    actions.querySelectorAll("[data-playback-provider-reveal]").forEach((button) => {
      button.addEventListener("click", () => {
        const provider = String(button.getAttribute("data-playback-provider-reveal") || "").trim().toLowerCase();
        if (!provider) return;
        const block = container.querySelector(`[data-playback-provider="${CSS.escape(provider)}"]`);
        if (!block) return;
        const removeFlag = block.querySelector(`input[type="hidden"][name="clear_${provider}_connection"]`);
        if (removeFlag) removeFlag.value = "0";
        block.dataset.userRevealed = "1";
        updatePlaybackProviderVisibility();
        const firstField = block.querySelector("input, select, textarea");
        if (firstField) {
          firstField.focus();
        }
      });
    });

    container.querySelectorAll("[data-playback-provider]").forEach((block) => {
      block.querySelectorAll("input, select, textarea").forEach((field) => {
        field.addEventListener("input", () => {
          const provider = String(block.getAttribute("data-playback-provider") || "").trim().toLowerCase();
          const removeFlag = block.querySelector(`input[type="hidden"][name="clear_${provider}_connection"]`);
          if (removeFlag) removeFlag.value = "0";
          updatePlaybackProviderVisibility();
        });
        field.addEventListener("change", () => {
          const provider = String(block.getAttribute("data-playback-provider") || "").trim().toLowerCase();
          const removeFlag = block.querySelector(`input[type="hidden"][name="clear_${provider}_connection"]`);
          if (removeFlag) removeFlag.value = "0";
          updatePlaybackProviderVisibility();
        });
      });
    });

    if (mediaSource) {
      mediaSource.addEventListener("change", updatePlaybackProviderVisibility);
    }
    if (historySource) {
      historySource.addEventListener("change", updatePlaybackProviderVisibility);
    }

    updatePlaybackProviderVisibility();
  }

  function formFlag(name) {
    const form = document.querySelector(".setup-form");
    if (!form) return false;
    return String(form.dataset[name] || "0") === "1";
  }

  function storedSecretAvailableForKey(keyName) {
    if (!keyName) return false;
    const button = document.querySelector(`.setup-test[data-key-id="${CSS.escape(keyName)}"]`);
    return Boolean(button && String(button.dataset.storedSecret || "0") === "1");
  }

  function fieldHasEffectiveSecret(keyName) {
    if (!keyName) return false;
    if (getFieldValue(keyName)) return true;
    if (keyName === "basic_auth_pass") return formFlag("basicAuthPassConfigured");
    if (keyName === "sortarr_secret_key") return formFlag("secretKeyConfigured");
    return storedSecretAvailableForKey(keyName);
  }

  function fieldHasEffectiveUrl(name) {
    return Boolean(getFieldValue(name));
  }

  function getInitialSetupProviderState() {
    const script = document.getElementById("setup-provider-state-json");
    if (!script) return {};
    try {
      return JSON.parse(script.textContent || "{}") || {};
    } catch {
      return {};
    }
  }

  function getInitialSetupProviderSelectionNotice() {
    const script = document.getElementById("setup-provider-selection-notice-json");
    if (!script) return "";
    try {
      return String(JSON.parse(script.textContent || "\"\"") || "").trim();
    } catch {
      return "";
    }
  }

  const initialSetupProviderState = getInitialSetupProviderState();
  let setupProviderState = initialSetupProviderState;
  let setupProviderSelectionNotice = getInitialSetupProviderSelectionNotice();
  let setupProviderPreviewSeq = 0;
  let setupProviderPreviewTimer = null;
  const SETUP_PROVIDER_PREVIEW_SECRET_FIELDS = new Set([
    "sonarr_api_key",
    "sonarr_api_key_2",
    "sonarr_api_key_3",
    "radarr_api_key",
    "radarr_api_key_2",
    "radarr_api_key_3",
    "plex_token",
    "emby_api_key",
    "jellyfin_api_key",
    "jellyfin_password",
    "tautulli_api_key",
    "tracearr_api_key",
    "jellystat_api_key",
    "streamystats_api_key",
    "streamystats_password",
    "basic_auth_pass",
    "sortarr_secret_key",
  ]);

  function buildSetupProviderState() {
    return setupProviderState || initialSetupProviderState || {};
  }

  function buildProviderStatePreviewPayload() {
    const payload = new FormData();
    const rawFormData = new FormData(setupForm);
    rawFormData.forEach((value, key) => {
      if (SETUP_PROVIDER_PREVIEW_SECRET_FIELDS.has(key)) return;
      payload.append(key, value);
    });
    SETUP_PROVIDER_PREVIEW_SECRET_FIELDS.forEach((key) => {
      if (fieldHasEffectiveSecret(key)) {
        payload.append(`${key}_configured`, "1");
      }
    });
    return payload;
  }

  async function refreshSetupProviderStatePreview() {
    if (!setupForm) return;
    const requestSeq = ++setupProviderPreviewSeq;
    const formData = buildProviderStatePreviewPayload();
    try {
      const res = await fetch(apiUrl("/api/setup/provider_state"), {
        method: "POST",
        headers: withCsrfHeaders({}),
        body: formData,
      });
      if (!res.ok) return;
      const payload = await res.json();
      if (requestSeq !== setupProviderPreviewSeq) return;
      if (payload && typeof payload.provider_state === "object") {
        setupProviderState = payload.provider_state || {};
      }
      setupProviderSelectionNotice = String(payload?.provider_selection_notice || "").trim();
      updateStepSummaries();
    } catch {
    }
  }

  function scheduleSetupProviderStatePreview() {
    if (!setupForm) return;
    if (setupProviderPreviewTimer) {
      clearTimeout(setupProviderPreviewTimer);
    }
    setupProviderPreviewTimer = setTimeout(() => {
      setupProviderPreviewTimer = null;
      refreshSetupProviderStatePreview();
    }, 120);
  }

  function getFieldErrors() {
    const script = document.getElementById("setup-field-errors-json");
    if (!script) return {};
    try {
      return JSON.parse(script.textContent || "{}") || {};
    } catch {
      return {};
    }
  }

  function setupErrorKeyToFieldName(key) {
    const map = {
      sonarr_1: "sonarr_url",
      sonarr_2: "sonarr_url_2",
      sonarr_3: "sonarr_url_3",
      radarr_1: "radarr_url",
      radarr_2: "radarr_url_2",
      radarr_3: "radarr_url_3",
      plex: "plex_url",
      emby: "emby_url",
      jellyfin: "jellyfin_url",
      tautulli: "tautulli_url",
      tracearr: "tracearr_url",
      jellystat: "jellystat_url",
      streamystats: "streamystats_url",
    };
    return map[key] || key;
  }

  function stepForFieldName(field) {
    const name = String(field || "").trim();
    const mediaSource = selectedMediaSourceIntent();
    const plexFields = ["plex_url", "plex_token", "plex_section_filters"];
    const embyFields = [
      "emby_url",
      "emby_api_key",
      "emby_user_id",
      "emby_library_ids_sonarr",
      "emby_library_ids_radarr",
    ];
    const jellyfinFields = [
      "jellyfin_url",
      "jellyfin_api_key",
      "jellyfin_username",
      "jellyfin_password",
      "jellyfin_user_id",
      "jellyfin_library_ids_sonarr",
      "jellyfin_library_ids_radarr",
    ];
    if (name.startsWith("sonarr_") || name.startsWith("radarr_") || name === "media_source_preference") return 1;
    if (name === "history_source_preference" || ["tracearr_url", "tracearr_api_key", "jellystat_url", "jellystat_api_key", "jellystat_library_ids_sonarr", "jellystat_library_ids_radarr", "streamystats_url", "streamystats_api_key", "streamystats_server_id", "streamystats_username", "streamystats_password", "tautulli_url", "tautulli_api_key"].includes(name)) return 2;
    if (name === "insights_provider_preference") return 3;
    if (plexFields.includes(name)) return mediaSource === "plex" ? 1 : 3;
    if (embyFields.includes(name)) return mediaSource === "emby" ? 1 : 3;
    if (jellyfinFields.includes(name)) return mediaSource === "jellyfin" ? 1 : 3;
    if (["sortarr_auth_method", "basic_auth_user", "basic_auth_pass", "sortarr_local_auth_bypass", "sortarr_local_auth_bypass_cidrs", "sortarr_upstream_auth_header", "proxy_preset", "sortarr_secret_key", "clear_basic_auth_pass"].includes(name)) return 4;
    return 5;
  }

  function stepHasErrors(stepNumber) {
    return Array.from(document.querySelectorAll("label.is-error [name]")).some((fieldNode) => {
      const field = String(fieldNode.getAttribute("name") || "").trim();
      return stepForFieldName(field) === stepNumber;
    });
  }

  function hasNonDefaultNumericField(name, defaultValue) {
    const raw = getFieldValue(name);
    if (!raw) return false;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return true;
    return parsed !== defaultValue;
  }

  function getAdvancedOverrideLabels() {
    const enabled = [];
    if (String(getFieldValue("proxy_preset") || "").toLowerCase() === "custom") {
      enabled.push(i18n("custom_proxy_hops", "Custom proxy hops"));
    }
    if (getFieldValue("sortarr_csrf_trusted_origins")) {
      enabled.push(i18n("trusted_origins", "Trusted origins"));
    }
    if (getFieldValue("sortarr_waitress_trusted_proxy")) {
      enabled.push(i18n("trusted_proxy", "Trusted proxy"));
    }
    const recovery = document.querySelector('[name="sortarr_allow_unsafe_ephemeral_recovery"]');
    if (recovery && recovery.checked) {
      enabled.push(i18n("recovery_mode", "Recovery mode"));
    }
    if (hasNonDefaultNumericField("sonarr_timeout_seconds", 90)) {
      enabled.push(i18n("sonarr_timeout", "Sonarr timeout"));
    }
    if (hasNonDefaultNumericField("radarr_timeout_seconds", 90)) {
      enabled.push(i18n("radarr_timeout", "Radarr timeout"));
    }
    if (hasNonDefaultNumericField("sonarr_episodefile_workers", 8)) {
      enabled.push(i18n("episode_file_workers", "Episode file workers"));
    }
    if (hasNonDefaultNumericField("radarr_wanted_workers", 2)) {
      enabled.push(i18n("radarr_wanted_workers", "Radarr wanted workers"));
    }
    if (hasNonDefaultNumericField("radarr_instance_workers", 1)) {
      enabled.push(i18n("radarr_instance_workers", "Radarr instance workers"));
    }
    if (hasNonDefaultNumericField("tautulli_timeout_seconds", 60)) {
      enabled.push(i18n("tautulli_timeout", "Tautulli timeout"));
    }
    if (hasNonDefaultNumericField("tautulli_fetch_seconds", 0)) {
      enabled.push(i18n("tautulli_fetch_interval", "Tautulli fetch interval"));
    }
    if (hasNonDefaultNumericField("tautulli_metadata_workers", 4)) {
      enabled.push(i18n("tautulli_metadata_workers", "Tautulli metadata workers"));
    }
    if (hasNonDefaultNumericField("streamystats_timeout_seconds", 45)) {
      enabled.push(i18n("streamystats_timeout", "Streamystats timeout"));
    }
    if (hasNonDefaultNumericField("streamystats_search_limit", 8)) {
      enabled.push(i18n("streamystats_search_limit", "Streamystats search limit"));
    }
    if (hasNonDefaultNumericField("streamystats_workers", 4)) {
      enabled.push(i18n("streamystats_workers", "Streamystats workers"));
    }
    if (hasNonDefaultNumericField("plex_history_page_size", 200)) {
      enabled.push(i18n("plex_history_page_size", "Plex history page size"));
    }
    return Array.from(new Set(enabled));
  }

  function setStepStatus(stepId, state, label) {
    const el = document.getElementById(stepId);
    if (!el) return;
    el.className = `setup-task-status setup-task-status--${state}`;
    el.textContent = label;
  }

  function roleLabel(role) {
    if (role === "media") return i18n("role_media", "media");
    if (role === "history") return i18n("role_history", "history");
    return i18n("role_enrichment", "enrichment");
  }

  function roleTitle(role) {
    if (role === "media") return i18n("role_title_media", "Media");
    if (role === "history") return i18n("role_title_history", "History");
    return i18n("role_title_enrichment", "Enrichment");
  }

  function providerStateDisplayValue(state, key) {
    if (key === "effective" && !state?.effective) {
      return "none";
    }
    return sourceLabel(state?.[key]);
  }

  function summarizeRoleStep(roleStateKey) {
    const state = buildSetupProviderState()[roleStateKey];
    const selectedLabel = sourceLabel(state.selected);
    const available = Array.isArray(state.available) ? state.available : [];
    const alternates = available
      .filter((provider) => provider && provider !== state.selected && provider !== state.effective)
      .map(sourceLabel);
    const parts = [i18n("selected_provider_summary", "Selected: %(provider)s", { provider: selectedLabel })];
    if (!state.effective) {
      parts.push(i18n("using_none", "Using: none"));
    } else if (state.selected === "auto" || state.effective !== state.selected) {
      parts.push(i18n("using_provider_summary", "Using: %(provider)s", { provider: sourceLabel(state.effective) }));
    } else if (alternates.length) {
      parts.push(i18n("also_ready_summary", "Also ready: %(providers)s", { providers: alternates.join(", ") }));
    }
    return parts.join(" · ");
  }

  function summarizeMediaStep() {
    return summarizeRoleStep("media");
  }

  function summarizeHistoryStep() {
    return summarizeRoleStep("history");
  }

  function summarizePlaybackStep() {
    return summarizeRoleStep("enrichment");
  }

  function summarizeRoleHelper(roleStateKey) {
    const state = buildSetupProviderState()[roleStateKey] || {};
    const roleName = roleLabel(roleStateKey);
    const title = roleTitle(roleStateKey);
    const selectedLabel = sourceLabel(state.selected);
    const effectiveLabel = sourceLabel(state.effective);
    const reason = String(state.reason || "").trim().toLowerCase();
    if (state.selected === "auto") {
      if (state.effective) {
        if (reason === "auto selected, reusing plex from media source") {
          return i18n("role_auto_reusing_plex", "%(role)s is set to Auto, so Sortarr is currently using Plex from Step 1.", { role: title });
        }
        if (reason === "auto selected, following history source") {
          return i18n("role_auto_following_history", "%(role)s is set to Auto, so Sortarr is currently following your history choice: %(provider)s.", { role: title, provider: effectiveLabel });
        }
        if (reason === "auto selected, following media source") {
          return i18n("role_auto_following_media", "%(role)s is set to Auto, so Sortarr is currently following your media choice: %(provider)s.", { role: title, provider: effectiveLabel });
        }
        return i18n("role_auto_using_provider", "%(role)s is set to Auto, so Sortarr is currently using %(provider)s.", { role: title, provider: effectiveLabel });
      }
      return i18n("role_auto_none_ready", "%(role)s is set to Auto, but nothing is ready to use yet.", { role: title });
    }
    if (!state.effective) {
      return i18n("role_selected_not_configured", "%(provider)s is selected for %(role)s, but it is not configured yet, so %(role)s is currently unavailable.", { provider: selectedLabel, role: roleName });
    }
    if (reason === "reusing plex from media source") {
      return i18n("role_selected_reusing_plex", "%(provider)s is selected for %(role)s and Sortarr is using the same Plex details from Step 1.", { provider: selectedLabel, role: roleName });
    }
    if (state.selected === state.effective) {
      return i18n("role_selected_in_use", "%(provider)s is selected for %(role)s and is currently in use.", { provider: selectedLabel, role: roleName });
    }
    return i18n("role_selected_effective_different", "%(selected)s is selected for %(role)s, but %(effective)s is currently active.", { selected: selectedLabel, role: roleName, effective: effectiveLabel });
  }

  function updateProviderStateChips(state) {
    const chipMap = {
      media: document.getElementById("setupProviderChipMedia"),
      history: document.getElementById("setupProviderChipHistory"),
      enrichment: document.getElementById("setupProviderChipEnrichment"),
    };
    Object.entries(chipMap).forEach(([roleKey, chip]) => {
      if (!chip) return;
      const roleState = state[roleKey] || {};
      const selectedLabel = providerStateDisplayValue(roleState, "selected");
      const effectiveLabel = providerStateDisplayValue(roleState, "effective");
      const detail = chip.querySelector(".setup-provider-chip__detail");
      if (detail) {
        detail.textContent = i18n("selected_effective_summary", "Selected: %(selected)s · Effective: %(effective)s", {
          selected: selectedLabel,
          effective: effectiveLabel,
        });
      }
      chip.classList.toggle(
        "setup-provider-chip--different",
        String(roleState.selected || "") !== String(roleState.effective || ""),
      );
    });
  }

  function summarizeSecurityStep() {
    const authMethod = String(getFieldValue("sortarr_auth_method") || "basic").toLowerCase();
    const proxyMode = String(getFieldValue("proxy_preset") || "single").toLowerCase();
    const hasSecretValue = fieldHasEffectiveSecret("sortarr_secret_key");
    const form = document.querySelector(".setup-form");
    const ephemeral = Boolean(form && String(form.dataset.ephemeralSecret || "0") === "1");
    const authLabel = authMethod === "external"
      ? i18n("external_auth", "External auth")
      : (authMethod === "basic_local_bypass" ? i18n("basic_local_bypass_auth", "Basic + local bypass") : i18n("basic_auth", "Basic auth"));
    const proxyLabelMap = {
      direct: i18n("direct_proxy_mode", "Direct proxy mode"),
      single: i18n("single_proxy_mode", "Single proxy mode"),
      double: i18n("double_proxy_mode", "Double proxy mode"),
      custom: i18n("custom_proxy_mode", "Custom proxy mode"),
    };
    const proxyLabel = proxyLabelMap[proxyMode] || i18n("proxy_mode_set", "Proxy mode set");
    const secretLabel = hasSecretValue || !ephemeral ? i18n("secret_ready", "Secret ready") : i18n("secret_generated_on_save", "Secret will be generated on save");
    return `${authLabel} · ${proxyLabel} · ${secretLabel}`;
  }

  function summarizeAdvancedStep() {
    const enabled = getAdvancedOverrideLabels();
    if (!enabled.length) {
      return i18n("no_advanced_overrides", "No advanced overrides");
    }
    return i18n("advanced_settings_in_use", "Advanced settings in use: %(settings)s", { settings: enabled.join(", ") });
  }

  function updateStepSummaries() {
    const step1 = document.getElementById("setupStep1Summary");
    const step2 = document.getElementById("setupStep2Summary");
    const step3 = document.getElementById("setupStep3Summary");
    const step1Helper = document.getElementById("setupStep1Helper");
    const step2Helper = document.getElementById("setupStep2Helper");
    const step3Helper = document.getElementById("setupStep3Helper");
    const step4 = document.getElementById("setupStep4Summary");
    const step5 = document.getElementById("setupStep5Summary");
    if (step1) step1.textContent = summarizeMediaStep();
    if (step2) step2.textContent = summarizeHistoryStep();
    if (step3) step3.textContent = summarizePlaybackStep();
    if (step1Helper) step1Helper.textContent = summarizeRoleHelper("media");
    if (step2Helper) step2Helper.textContent = summarizeRoleHelper("history");
    if (step3Helper) step3Helper.textContent = summarizeRoleHelper("enrichment");
    if (step4) step4.textContent = summarizeSecurityStep();
    if (step5) step5.textContent = summarizeAdvancedStep();
    updateStepStatuses();
    updateEffectiveSourcesHint();
  }

  function updateStepStatuses() {
    const state = buildSetupProviderState();
    const media = state.media;
    const history = state.history;
    const enrichment = state.enrichment;
    if (stepHasErrors(1) || (!media.available.length) || (media.selected !== "auto" && !media.effective)) {
      setStepStatus("setupStep1Status", "needs-attention", i18n("needs_setup", "Needs setup"));
    } else {
      setStepStatus("setupStep1Status", "ready", i18n("in_use", "In use"));
    }

    if (stepHasErrors(2) || (history.selected !== "auto" && !history.effective)) {
      setStepStatus("setupStep2Status", "needs-attention", i18n("needs_setup", "Needs setup"));
    } else if (history.available.length) {
      setStepStatus("setupStep2Status", "ready", i18n("in_use", "In use"));
    } else {
      setStepStatus("setupStep2Status", "optional", i18n("not_set", "Not set"));
    }

    if (stepHasErrors(3) || (enrichment.selected !== "auto" && !enrichment.effective)) {
      setStepStatus("setupStep3Status", "needs-attention", i18n("needs_setup", "Needs setup"));
    } else if (enrichment.available.length) {
      setStepStatus("setupStep3Status", "configured", i18n("available", "Available"));
    } else {
      setStepStatus("setupStep3Status", "optional", i18n("not_set", "Not set"));
    }

    const authMethod = String(getFieldValue("sortarr_auth_method") || "basic").toLowerCase();
    const basicReady = Boolean(getFieldValue("basic_auth_user")) && fieldHasEffectiveSecret("basic_auth_pass");
    const externalReady = Boolean(getFieldValue("sortarr_upstream_auth_header"));
    const localBypassReady = Boolean(getFieldValue("sortarr_local_auth_bypass")) && String(getFieldValue("proxy_preset") || "single").toLowerCase() === "direct";
    const secretReady = fieldHasEffectiveSecret("sortarr_secret_key") && !formFlag("ephemeralSecret");
    if (stepHasErrors(4) || (authMethod === "basic" && !basicReady) || (authMethod === "basic_local_bypass" && (!basicReady || !localBypassReady)) || (authMethod === "external" && !externalReady) || !secretReady) {
      const authReady = authMethod === "external" ? externalReady : (authMethod === "basic_local_bypass" ? (basicReady && localBypassReady) : basicReady);
      const secretPendingOnly = !secretReady && authReady && !stepHasErrors(4);
      setStepStatus("setupStep4Status", secretPendingOnly ? "configured" : "needs-attention", secretPendingOnly ? i18n("save_needed", "Save needed") : i18n("needs_setup", "Needs setup"));
    } else {
      setStepStatus("setupStep4Status", "ready", i18n("ready", "Ready"));
    }

    const hasAdvancedOverrides = getAdvancedOverrideLabels().length > 0;
    if (stepHasErrors(5)) {
      setStepStatus("setupStep5Status", "needs-attention", i18n("check_settings", "Check settings"));
    } else if (hasAdvancedOverrides) {
      setStepStatus("setupStep5Status", "configured", i18n("custom", "Custom"));
    } else {
      setStepStatus("setupStep5Status", "optional", i18n("default", "Default"));
    }
  }

  function initStepSummaries() {
    document.querySelectorAll(".setup-form input, .setup-form select, .setup-form textarea").forEach((field) => {
      field.addEventListener("input", () => {
        updateStepSummaries();
        scheduleSetupProviderStatePreview();
      });
      field.addEventListener("change", () => {
        updateStepSummaries();
        scheduleSetupProviderStatePreview();
      });
    });
    updateStepSummaries();
    scheduleSetupProviderStatePreview();
  }

  function initSetupFieldErrors() {
    const fieldErrors = getFieldErrors();
    Object.entries(fieldErrors).forEach(([key, message]) => {
      const fieldName = setupErrorKeyToFieldName(key);
      const field = document.querySelector(`[name="${CSS.escape(fieldName)}"]`);
      if (!field) return;
      const label = field.closest("label");
      if (!label || label.querySelector(`[data-setup-field-error="${CSS.escape(fieldName)}"]`)) return;
      label.classList.add("is-error");
      const errorEl = document.createElement("span");
      errorEl.className = "setup-field-error";
      errorEl.dataset.setupFieldError = fieldName;
      errorEl.textContent = message;
      label.appendChild(errorEl);
      const clearError = () => {
        label.classList.remove("is-error");
        label.querySelectorAll(`[data-setup-field-error="${CSS.escape(fieldName)}"]`).forEach((node) => node.remove());
        updateStepStatuses();
      };
      field.addEventListener("input", clearError, { once: true });
      field.addEventListener("change", clearError, { once: true });
    });
  }

  function initSetupErrorRouting() {
    const form = document.querySelector(".setup-form");
    if (!form) return;
    const errorSteps = String(form.dataset.errorSteps || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const focusFieldName = String(form.dataset.focusField || "").trim();
    if (!errorSteps.length) return;
    window.requestAnimationFrame(async () => {
      await openGuideStep(Number(errorSteps[0]));
      if (!focusFieldName) return;
      const field = document.querySelector(`[name="${CSS.escape(focusFieldName)}"]`);
      if (!field) return;
      const advanced = field.closest("details.setup-advanced");
      if (advanced) {
        advanced.open = true;
      }
      field.focus();
      if (typeof field.select === "function" && !field.matches("select")) {
        field.select();
      }
    });
  }

  function initSetupCompletionAction() {
    const continueBtn = document.getElementById("setupContinueBtn");
    if (!continueBtn) return;
    continueBtn.addEventListener("click", () => {
      const targetUrl = String(continueBtn.dataset.targetUrl || "/").trim() || "/";
      window.location.assign(targetUrl);
    });
  }

  function updateAuthMethodFields() {
    const authMethod = document.querySelector('[name="sortarr_auth_method"]');
    const basicFields = document.getElementById("basicAuthFields");
    const externalFields = document.getElementById("externalAuthFields");
    const localBypassFields = document.getElementById("localAuthBypassFields");
    if (!authMethod || !basicFields || !externalFields || !localBypassFields) return;
    const mode = String(authMethod.value || "").trim().toLowerCase();
    const isExternal = mode === "external";
    const isLocalBypass = mode === "basic_local_bypass";
    basicFields.classList.toggle("hidden", isExternal);
    externalFields.classList.toggle("hidden", !isExternal);
    localBypassFields.classList.toggle("hidden", !isLocalBypass);
    basicFields.querySelectorAll("input, select, textarea, button").forEach((field) => {
      toggleFieldDisabled(field, isExternal);
    });
    externalFields.querySelectorAll("input, select, textarea, button").forEach((field) => {
      toggleFieldDisabled(field, !isExternal);
    });
    localBypassFields.querySelectorAll("input, select, textarea, button").forEach((field) => {
      toggleFieldDisabled(field, !isLocalBypass);
    });
  }

  function initAuthMethodFields() {
    const authMethod = document.querySelector('[name="sortarr_auth_method"]');
    if (!authMethod) return;
    authMethod.addEventListener("change", updateAuthMethodFields);
    updateAuthMethodFields();
  }

  function updateProxyPresetFields() {
    const preset = document.querySelector('[name="proxy_preset"]');
    const custom = document.getElementById("proxyCustomFields");
    if (!preset || !custom) return;
    const isCustom = String(preset.value || "").trim().toLowerCase() === "custom";
    custom.classList.toggle("hidden", !isCustom);
  }

  function initProxyPresetFields() {
    const preset = document.querySelector('[name="proxy_preset"]');
    if (!preset) return;
    preset.addEventListener("change", updateProxyPresetFields);
    updateProxyPresetFields();
  }

  function setCsrfDiagnosticsInline(message, state) {
    const inline = document.getElementById("csrfDiagnosticsInlineMessage");
    if (!inline) return;
    if (!message) {
      inline.textContent = "";
      inline.classList.add("hidden");
      inline.classList.remove("is-error", "is-ok", "is-pending");
      return;
    }
    inline.textContent = message;
    inline.classList.remove("hidden", "is-error", "is-ok", "is-pending");
    if (state) inline.classList.add(state);
  }

  function setCsrfDiagnosticsOutput(lines = []) {
    const output = document.getElementById("csrfDiagnosticsOutput");
    if (!output) return;
    if (!Array.isArray(lines) || !lines.length) {
      output.textContent = "";
      output.classList.add("hidden");
      return;
    }
    output.textContent = lines.join("\n");
    output.classList.remove("hidden");
  }

  function initSetupCsrfSync() {
    const form = document.querySelector(".setup-form");
    if (!form) return;
    form.addEventListener("submit", () => {
      syncSetupFormCsrfToken();
    });
    window.addEventListener("focus", syncSetupFormCsrfToken);
    window.addEventListener("pageshow", syncSetupFormCsrfToken);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        syncSetupFormCsrfToken();
      }
    });
    syncSetupFormCsrfToken();
  }

  function initCsrfDiagnosticsAction() {
    const button = document.getElementById("runCsrfDiagnosticsBtn");
    if (!button) return;
    if (setupSecurityLocked) {
      toggleButtonDisabled(button, true);
      return;
    }
    function formatWaitressSettings(settings) {
      if (!settings || settings.enabled !== true) return "disabled";
      const trustedProxy = String(settings.trusted_proxy || "").trim() || "*";
      const headers = Array.isArray(settings.trusted_proxy_headers) && settings.trusted_proxy_headers.length
        ? settings.trusted_proxy_headers.join(", ")
        : "(none)";
      const count = Number(settings.trusted_proxy_count || 0);
      const clearUntrusted = settings.clear_untrusted_proxy_headers !== false ? "true" : "false";
      return `trusted_proxy=${trustedProxy}; count=${count}; headers=${headers}; clear_untrusted=${clearUntrusted}`;
    }
    button.addEventListener("click", async () => {
      if (button.dataset.loading === "1") return;
      button.dataset.loading = "1";
      button.classList.add("is-testing");
      button.setAttribute("aria-busy", "true");
      setCsrfDiagnosticsInline(
        (window.SORTARR_I18N && window.SORTARR_I18N.csrf_diag_running)
          ? window.SORTARR_I18N.csrf_diag_running
          : "Running CSRF/proxy diagnostics...",
        "is-pending"
      );
      setCsrfDiagnosticsOutput([]);
      try {
        const res = await fetch(apiUrl("/api/diagnostics/csrf"), {
          method: "GET",
          credentials: "same-origin",
          headers: withCsrfHeaders({}),
        });
        const rawBody = await res.text();
        let payload = {};
        if (rawBody) {
          try {
            payload = JSON.parse(rawBody);
          } catch {
            payload = {};
          }
        }
        if (!res.ok || !payload || payload.ok !== true) {
          const rawMessage = String(rawBody || "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 240);
          throw new Error((payload && payload.error) || rawMessage || `diagnostics failed (${res.status})`);
        }
        const current = payload.current || {};
        const last = payload.last_csrf_event || {};
        const guidance = payload.guidance || {};
        const runtimeMode = current.proxy_mode_runtime || current.proxy_mode_current || "unknown";
        const configuredMode = current.proxy_mode_configured || runtimeMode;
        const forwardedHeaderWarnings = Array.isArray(current.forwarded_header_warnings)
          ? current.forwarded_header_warnings
          : [];
        const lines = [
          `Runtime proxy mode: ${runtimeMode}`,
          `Configured proxy mode: ${configuredMode}`,
          `Suggested proxy mode: ${current.proxy_mode_suggested || "unknown"}`,
          `Request scheme/host: ${current.scheme || "?"}://${current.host || "?"}`,
          `Waitress runtime trust: ${formatWaitressSettings(current.waitress_runtime || {})}`,
          `Waitress configured trust: ${formatWaitressSettings(current.waitress_configured || {})}`,
          `X-Forwarded-Proto: ${((current.headers || {})["X-Forwarded-Proto"] || "").trim() || "(missing)"}`,
          `X-Forwarded-Host: ${((current.headers || {})["X-Forwarded-Host"] || "").trim() || "(missing)"}`,
          `X-Forwarded-Port: ${((current.headers || {})["X-Forwarded-Port"] || "").trim() || "(missing)"}`,
          `X-Forwarded-For: ${((current.headers || {})["X-Forwarded-For"] || "").trim() || "(missing)"}`,
          `Last CSRF event: ${last.seen ? `${last.reason || "unknown"} (${last.age_seconds ?? "?"}s ago)` : "none recorded"}`,
        ];
        forwardedHeaderWarnings.forEach((warning) => {
          if (warning && warning.message) {
            lines.push(`Warning: ${warning.message}`);
          }
        });
        if (current.restart_required) {
          lines.push("Restart required: saved proxy header trust differs from the live Waitress runtime.");
        }
        if (guidance.message) lines.push(`Guidance: ${guidance.message}`);
        setCsrfDiagnosticsOutput(lines);
        setCsrfDiagnosticsInline(
          (window.SORTARR_I18N && window.SORTARR_I18N.csrf_diag_done)
            ? window.SORTARR_I18N.csrf_diag_done
            : "Diagnostics complete.",
          "is-ok"
        );
      } catch (err) {
        setCsrfDiagnosticsInline(
          `${(window.SORTARR_I18N && window.SORTARR_I18N.csrf_diag_failed)
            ? window.SORTARR_I18N.csrf_diag_failed
            : "Unable to run diagnostics."} ${err}`,
          "is-error"
        );
      } finally {
        button.dataset.loading = "0";
        button.classList.remove("is-testing");
        button.removeAttribute("aria-busy");
      }
    });
  }

  function topLevelStepDetails() {
    return Array.from(document.querySelectorAll('.setup-form > details[data-guide-step]')).sort((a, b) => {
      return Number(a.dataset.guideStep || 0) - Number(b.dataset.guideStep || 0);
    });
  }

  function normalizeTopLevelStepOrder() {
    const form = document.querySelector(".setup-form");
    if (!form) return;
    const footer = form.querySelector(".setup-form-footer");
    topLevelStepDetails().forEach((step) => {
      form.insertBefore(step, footer || null);
    });
  }

  function stepBody(step) {
    return step ? step.querySelector(':scope > .setup-task-details-body') : null;
  }

  function prefersReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function stopStepAnimation(body) {
    if (!body) return;
    if (body._stepAnimationFrame) {
      cancelAnimationFrame(body._stepAnimationFrame);
      body._stepAnimationFrame = null;
    }
    if (body._stepAnimationCleanup) {
      body.removeEventListener("transitionend", body._stepAnimationCleanup);
      body._stepAnimationCleanup = null;
    }
  }

  function setStepBodyImmediate(step, expanded) {
    const body = stepBody(step);
    if (!body) return;
    stopStepAnimation(body);
    body.style.transition = "none";
    body.style.height = expanded ? "auto" : "0px";
    body.style.opacity = expanded ? "1" : "0";
    body.style.transform = expanded ? "translateY(0)" : "translateY(-4px)";
  }

  function animateStep(step, expanded) {
    const body = stepBody(step);
    if (!body) {
      step.open = expanded;
      return Promise.resolve();
    }
    stopStepAnimation(body);
    if (!expanded && !step.open) {
      setStepBodyImmediate(step, false);
      return Promise.resolve();
    }
    if (prefersReducedMotion()) {
      step.open = expanded;
      setStepBodyImmediate(step, expanded);
      return Promise.resolve();
    }
    const durationMs = 280;
    const fadeInMs = 210;
    const fadeOutMs = 190;
    if (expanded) {
      step.open = true;
      body.style.transition = "none";
      body.style.height = "0px";
      body.style.opacity = "0";
      body.style.transform = "translateY(-4px)";
      void body.offsetHeight;
      const targetHeight = body.scrollHeight;
      return new Promise((resolve) => {
        const cleanup = (event) => {
          if (event && event.target !== body) return;
          stopStepAnimation(body);
          body.style.transition = "";
          body.style.height = "auto";
          body.style.opacity = "1";
          body.style.transform = "translateY(0)";
          resolve();
        };
        body._stepAnimationCleanup = cleanup;
        body.addEventListener("transitionend", cleanup);
        body._stepAnimationFrame = requestAnimationFrame(() => {
          body.style.transition = `height ${durationMs}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${fadeInMs}ms ease, transform ${durationMs}ms ease`;
          body.style.height = `${targetHeight}px`;
          body.style.opacity = "1";
          body.style.transform = "translateY(0)";
        });
      });
    }
    const startHeight = body.getBoundingClientRect().height || body.scrollHeight;
    if (!startHeight) {
      step.open = false;
      setStepBodyImmediate(step, false);
      return Promise.resolve();
    }
    body.style.transition = "none";
    body.style.height = `${startHeight}px`;
    body.style.opacity = "1";
    body.style.transform = "translateY(0)";
    void body.offsetHeight;
    return new Promise((resolve) => {
      const cleanup = (event) => {
        if (event && event.target !== body) return;
        stopStepAnimation(body);
        step.open = false;
        body.style.transition = "";
        body.style.height = "0px";
        body.style.opacity = "0";
        body.style.transform = "translateY(-4px)";
        resolve();
      };
      body._stepAnimationCleanup = cleanup;
      body.addEventListener("transitionend", cleanup);
      body._stepAnimationFrame = requestAnimationFrame(() => {
        body.style.transition = `height ${durationMs}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${fadeOutMs}ms ease, transform ${durationMs}ms ease`;
        body.style.height = "0px";
        body.style.opacity = "0";
        body.style.transform = "translateY(-4px)";
      });
    });
  }

  function initDefaultSetupState() {
    const step1 = document.getElementById("setupStep1");
    if (step1 && "open" in step1) {
      step1.open = true;
    }
    ["setupStep2", "setupStep3", "setupStep4", "setupStep5", "setupStep1SonarrAdvanced", "setupStep1RadarrAdvanced"].forEach((id) => {
      const el = document.getElementById(id);
      if (el && "open" in el) {
        el.open = false;
      }
    });
    topLevelStepDetails().forEach((step) => {
      setStepBodyImmediate(step, Boolean(step.open));
    });
  }

  async function closeTopLevelStepsExcept(keepStepNumber) {
    const keep = String(keepStepNumber || "").trim();
    const tasks = [];
    topLevelStepDetails().forEach((step) => {
      if (String(step.dataset.guideStep || "") !== keep) {
        tasks.push(animateStep(step, false));
      }
    });
    await Promise.all(tasks);
  }

  async function preserveViewportAnchor(anchorEl, work) {
    if (!anchorEl || typeof work !== "function") {
      return typeof work === "function" ? work() : Promise.resolve();
    }
    const startTop = anchorEl.getBoundingClientRect().top;
    let rafId = 0;
    let active = true;
    const syncScroll = () => {
      if (!active) return;
      const currentTop = anchorEl.getBoundingClientRect().top;
      const delta = currentTop - startTop;
      if (delta) {
        window.scrollBy(0, delta);
      }
      rafId = requestAnimationFrame(syncScroll);
    };
    rafId = requestAnimationFrame(syncScroll);
    try {
      return await work();
    } finally {
      active = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      const currentTop = anchorEl.getBoundingClientRect().top;
      const delta = currentTop - startTop;
      if (delta) {
        window.scrollBy(0, delta);
      }
    }
  }

  function initTopLevelStepAccordion() {
    topLevelStepDetails().forEach((step) => {
      const summary = step.querySelector(":scope > summary");
      if (!summary) return;
      summary.addEventListener("click", async (event) => {
        event.preventDefault();
        const isOpen = Boolean(step.open);
        if (isOpen) {
          await preserveViewportAnchor(summary, () => animateStep(step, false));
          return;
        }
        await preserveViewportAnchor(summary, async () => {
          await closeTopLevelStepsExcept(step.dataset.guideStep || "");
          await animateStep(step, true);
        });
      });
    });
  }

  async function openGuideStep(stepNumber) {
    const step = document.querySelector(`[data-guide-step="${CSS.escape(String(stepNumber))}"]`);
    if (!step) return false;
    if (step.tagName === "DETAILS") {
      await closeTopLevelStepsExcept(stepNumber);
      await animateStep(step, true);
    }
    step.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  function initSetupGuide() {
    const form = document.querySelector(".setup-form");
    const guide = document.getElementById("setupGuide");
    const guideText = document.getElementById("setupGuideText");
    const modeLabel = document.getElementById("setupGuideModeLabel");
    const guidedDock = document.getElementById("setupGuidedDock");
    const guidedDockProgress = document.getElementById("setupGuidedDockProgress");
    const guidedDockTitle = document.getElementById("setupGuidedDockTitle");
    const guidedDockBackBtn = document.getElementById("setupGuidedDockBackBtn");
    const guidedDockNextBtn = document.getElementById("setupGuidedDockNextBtn");
    const guidedDockExitBtn = document.getElementById("setupGuidedDockExitBtn");
    const startBtn = document.getElementById("setupGuideStartBtn");
    const dismissBtn = document.getElementById("setupGuideDismissBtn");
    const hideBtn = document.getElementById("setupGuideHideBtn");
    if (!form || !guide || !guideText || !guidedDock || !guidedDockProgress || !guidedDockTitle || !guidedDockBackBtn || !guidedDockNextBtn || !guidedDockExitBtn || !startBtn || !dismissBtn || !hideBtn) return;
    if (guidedDock.parentElement !== document.body) {
      document.body.appendChild(guidedDock);
    }

    const storageKey = String(guide.dataset.guideStorageKey || "sortarr.setup.guide.dismissed");
    const modeStorageKey = String(guide.dataset.guideModeStorageKey || "sortarr.setup.guide.mode");
    let hiddenPermanently = false;
    let hideOnceAfterSubmit = false;
    let guidedMode = false;
    try {
      hiddenPermanently = window.localStorage.getItem(storageKey) === "1";
      hideOnceAfterSubmit = window.sessionStorage.getItem("sortarr.setup.guide.hide_once") === "1";
      guidedMode = window.sessionStorage.getItem(modeStorageKey) === "guided";
    } catch {
      hiddenPermanently = false;
      hideOnceAfterSubmit = false;
      guidedMode = false;
    }
    if (hiddenPermanently) {
      guide.remove();
      return;
    }

    try {
      if (hideOnceAfterSubmit) {
        window.sessionStorage.removeItem("sortarr.setup.guide.hide_once");
      }
    } catch {
      // Ignore storage failures.
    }

    guide.classList.toggle("hidden", hideOnceAfterSubmit);
    const steps = topLevelStepDetails().map((step) => Number(step.dataset.guideStep || 0)).filter((step) => step > 0);
    let currentStepIndex = 0;

    function guideMessage(stepNumber) {
      const i18n = window.SORTARR_I18N || {};
      return i18n[`guide_step_${stepNumber}`] || "";
    }

    function syncGuidedStepState(stepNumber) {
      const active = String(stepNumber || "");
      form.dataset.guidedStep = active;
      topLevelStepDetails().forEach((step) => {
        step.classList.toggle("setup-task-section--guided-active", String(step.dataset.guideStep || "") === active);
      });
    }

    function setGuidedMode(enabled) {
      guidedMode = Boolean(enabled);
      form.dataset.guidedMode = guidedMode ? "1" : "0";
      if (guidedMode) {
        syncGuidedStepState(steps[currentStepIndex] || 1);
      } else {
        form.dataset.guidedStep = "";
        topLevelStepDetails().forEach((step) => step.classList.remove("setup-task-section--guided-active"));
      }
      try {
        window.sessionStorage.setItem(modeStorageKey, guidedMode ? "guided" : "full");
      } catch {
        // Ignore storage failures.
      }
      updateGuide();
    }

    function updateGuide() {
      const stepNumber = steps[currentStepIndex] || steps[steps.length - 1];
      const message = guideMessage(stepNumber);
      guideText.textContent = guidedMode
        ? i18n("guided_setup_active", "Guided setup is active. Use the floating controls to move between steps.")
        : i18n("guided_setup_intro", "Use guided setup if you want Sortarr to walk you through the setup one step at a time.");
      if (modeLabel) {
        modeLabel.classList.toggle("hidden", !guidedMode);
      }
      guidedDock.classList.toggle("hidden", !guidedMode);
      guidedDockProgress.textContent = i18n("guided_step_progress", "Step %(current)s of %(total)s", {
        current: currentStepIndex + 1,
        total: steps.length,
      });
      guidedDockTitle.textContent = message || i18n("guided_step_title", "Step %(step)s", { step: stepNumber });
      startBtn.classList.toggle("hidden", guidedMode);
      dismissBtn.classList.toggle("hidden", guidedMode);
      hideBtn.classList.toggle("hidden", guidedMode);
      guidedDockBackBtn.disabled = !guidedMode || currentStepIndex === 0;
      guidedDockNextBtn.textContent = currentStepIndex >= steps.length - 1
        ? i18n("save_and_continue", "Save and continue")
        : i18n("next_step", "Next step");
    }

    async function goToStepIndex(nextIndex) {
      currentStepIndex = Math.max(0, Math.min(nextIndex, steps.length - 1));
      const stepNumber = steps[currentStepIndex] || 1;
      await openGuideStep(stepNumber);
      syncGuidedStepState(stepNumber);
      updateGuide();
    }

    async function goBack() {
      if (!guidedMode || currentStepIndex <= 0) return;
      await goToStepIndex(currentStepIndex - 1);
    }

    async function goNext() {
      if (currentStepIndex >= steps.length - 1) {
        setGuidedMode(false);
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.submit();
        }
        return;
      }
      await goToStepIndex(currentStepIndex + 1);
    }

    startBtn.addEventListener("click", async () => {
      setGuidedMode(true);
      await goToStepIndex(currentStepIndex);
    });

    guidedDockBackBtn.addEventListener("click", goBack);

    guidedDockNextBtn.addEventListener("click", goNext);

    guidedDockExitBtn.addEventListener("click", () => {
      setGuidedMode(false);
    });

    dismissBtn.addEventListener("click", () => {
      guide.classList.add("hidden");
    });

    hideBtn.addEventListener("click", () => {
      try {
        window.localStorage.setItem(storageKey, "1");
      } catch {
        // Ignore storage failures and still hide the guide for this page view.
      }
      guide.classList.add("hidden");
    });

    form.addEventListener("submit", () => {
      try {
        window.sessionStorage.setItem("sortarr.setup.guide.hide_once", "1");
      } catch {
        // Ignore storage failures.
      }
    });

    topLevelStepDetails().forEach((step, index) => {
      const summary = step.querySelector(":scope > summary");
      if (!summary) return;
      summary.addEventListener("click", () => {
        currentStepIndex = index;
        if (guidedMode) {
          syncGuidedStepState(Number(step.dataset.guideStep || 0));
          updateGuide();
        }
      });
    });

    if (guidedMode) {
      setGuidedMode(true);
    } else {
      form.dataset.guidedMode = "0";
      form.dataset.guidedStep = "";
    }
    updateGuide();
  }

  initPathMapGroups();
  initHistorySourceLock();
  initSourcePreferenceSelects();
  initMediaSourceGuidance();
  initHistoryProviderOrdering();
  initOptionalInstanceReveals();
  initConnectionRemovalActions();
  initHistoryProviderReveals();
  initPlaybackProviderReveals();
  initSetupFieldErrors();
  initStepSummaries();
  initAuthMethodFields();
  initProxyPresetFields();
  normalizeTopLevelStepOrder();
  initDefaultSetupState();
  initTopLevelStepAccordion();
  initSecretKeyActions();
  initSetupCsrfSync();
  initCsrfDiagnosticsAction();
  initSetupGuide();
  initSetupErrorRouting();
  initSetupCompletionAction();

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
    if (key === "auto") return "Auto";
    if (key === "emby") return "Emby";
    if (key === "jellyfin") return "Jellyfin";
    if (key === "plex") return "Plex";
    if (key === "tautulli") return "Tautulli";
    if (key === "tracearr") return "Tracearr";
    if (key === "jellystat") return "Jellystat";
    if (key === "streamystats") return "Streamystats";
    if (key) return key;
    return "Auto";
  }

  function currentEffectiveMediaSource() {
    return String(buildSetupProviderState().media.effective || "").toLowerCase();
  }

  function currentEffectiveHistorySource() {
    return String(buildSetupProviderState().history.effective || "").toLowerCase();
  }

  function currentEffectiveInsightsProvider() {
    return String(buildSetupProviderState().enrichment.effective || "").toLowerCase();
  }

  function updateEffectiveSourcesHint() {
    const state = buildSetupProviderState();
    updateProviderStateChips(state);
  }

  applyCategoryTranslations();
  updateEffectiveSourcesHint();
})();
