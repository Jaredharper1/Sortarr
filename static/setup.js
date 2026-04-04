(function () {
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
    toggleButtonDisabled(jellyTest, !setupTestsEnabled);
    toggleButtonDisabled(tautulliTest, !setupTestsEnabled);
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
    initSetupCustomSelect(document.querySelector('[name="sortarr_auth_method"]'));
    initSetupCustomSelect(document.querySelector('[name="media_source_preference"]'));
    initSetupCustomSelect(document.querySelector('[name="history_source_preference"]'));
    initSetupCustomSelect(document.querySelector('[name="insights_provider_preference"]'));
    initSetupCustomSelect(document.querySelector('[name="proxy_preset"]'));
  }

  function updateMediaSourceGuidance() {
    const mediaSource = document.querySelector('[name="media_source_preference"]');
    const plexNotice = document.getElementById("plexMediaSourceNotice");
    const jellyfinNotice = document.getElementById("jellyfinMediaSourceNotice");
    const arrActions = document.getElementById("arrMediaSourceActions");
    const arrBlock = document.getElementById("arrMediaSourceBlock");
    const plexMount = document.getElementById("plexMediaSourceMount");
    const jellyfinMount = document.getElementById("jellyfinMediaSourceMount");
    const plexReuseNotice = document.getElementById("plexHistoryReuseNotice");
    if (!mediaSource || !plexNotice || !jellyfinNotice) return;
    const mediaValue = String(mediaSource.value || "").trim().toLowerCase();
    const isPlex = mediaValue === "plex";
    const isJellyfin = mediaValue === "jellyfin";
    plexNotice.classList.toggle("hidden", !isPlex);
    jellyfinNotice.classList.toggle("hidden", !isJellyfin);
    if (plexMount) {
      plexMount.classList.toggle("hidden", !isPlex);
    }
    if (jellyfinMount) {
      jellyfinMount.classList.toggle("hidden", !isJellyfin);
    }
    if (plexReuseNotice) {
      plexReuseNotice.classList.toggle("hidden", !isPlex);
    }
    if (!arrBlock || !arrActions) return;
    const keepArrVisible = String(arrBlock.dataset.userRevealed || "0") === "1";
    const showArrBlock = (!isPlex && !isJellyfin) || keepArrVisible;
    arrBlock.classList.toggle("hidden", !showArrBlock);
    arrActions.classList.toggle("hidden", (!isPlex && !isJellyfin) || showArrBlock);
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
    } else {
      step3Mount.appendChild(jellyfinBlock);
    }
  }

  function initMediaSourceGuidance() {
    const mediaSource = document.querySelector('[name="media_source_preference"]');
    const showArrMediaSourceBtn = document.getElementById("showArrMediaSourceBtn");
    const arrBlock = document.getElementById("arrMediaSourceBlock");
    const reviewPlexMediaBtn = document.getElementById("reviewPlexMediaBtn");
    const reviewJellyfinMediaBtn = document.getElementById("reviewJellyfinMediaBtn");
    const reviewPlexPlaybackBtn = document.getElementById("reviewPlexPlaybackBtn");
    const reviewJellyfinPlaybackBtn = document.getElementById("reviewJellyfinPlaybackBtn");
    const reviewPlexPlaybackMediaBtn = document.getElementById("reviewPlexPlaybackMediaBtn");
    const reviewJellyfinPlaybackMediaBtn = document.getElementById("reviewJellyfinPlaybackMediaBtn");
    if (mediaSource) {
      mediaSource.addEventListener("change", () => {
        updatePlexProviderPlacement();
        updateJellyfinProviderPlacement();
        updateMediaSourceGuidance();
        updateHistoryProviderOrdering();
        updateHistoryProviderVisibility();
        updatePlaybackProviderVisibility();
      });
      updatePlexProviderPlacement();
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
    if (reviewPlexMediaBtn) {
      reviewPlexMediaBtn.addEventListener("click", async () => {
        await openGuideStep(1);
        const plexUrlField = document.querySelector('[name="plex_url"]');
        if (plexUrlField) {
          plexUrlField.focus();
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
    if (reviewPlexPlaybackBtn) {
      reviewPlexPlaybackBtn.addEventListener("click", async () => {
        await openGuideStep(3);
        const plexUrlField = document.querySelector('[name="plex_url"]');
        if (plexUrlField) {
          plexUrlField.focus();
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
    if (reviewPlexPlaybackMediaBtn) {
      reviewPlexPlaybackMediaBtn.addEventListener("click", async () => {
        await openGuideStep(1);
        const plexUrlField = document.querySelector('[name="plex_url"]');
        if (plexUrlField) {
          plexUrlField.focus();
        }
      });
    }
    if (reviewJellyfinPlaybackMediaBtn) {
      reviewJellyfinPlaybackMediaBtn.addEventListener("click", async () => {
        await openGuideStep(1);
        const jellyfinUrlField = document.querySelector('[name="jellyfin_url"]');
        if (jellyfinUrlField) {
          jellyfinUrlField.focus();
        }
      });
    }
  }

  function preferredHistoryProviderOrder() {
    const historySource = String(getFieldValue("history_source_preference") || "").toLowerCase();
    const providers = ["streamystats", "jellystat", "tautulli"];
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
    return String(getFieldValue("media_source_preference") || "arr").toLowerCase();
  }

  function selectedHistorySourceIntent() {
    return String(getFieldValue("history_source_preference") || "auto").toLowerCase();
  }

  function selectedInsightsProviderIntent() {
    return String(getFieldValue("insights_provider_preference") || "auto").toLowerCase();
  }

  function isReusingPlexHistoryFromMedia() {
    const mediaSource = selectedMediaSourceIntent();
    const historySource = selectedHistorySourceIntent();
    return mediaSource === "plex" && (historySource === "auto" || historySource === "plex") && providerConfigured("plex");
  }

  function preferredHistoryProvider() {
    const mediaSource = selectedMediaSourceIntent();
    const historySource = selectedHistorySourceIntent();
    if (["plex", "jellystat", "streamystats", "tautulli"].includes(historySource)) {
      return historySource;
    }
    if (historySource === "auto" && mediaSource === "plex") {
      return "plex";
    }
    return "";
  }

  function updateHistoryIntentGuidance() {
    const historySource = selectedHistorySourceIntent();
    const plexReuseNotice = document.getElementById("plexHistoryReuseNotice");
    const plexIntentNotice = document.getElementById("plexHistoryIntentNotice");
    const tautulliIntentNotice = document.getElementById("tautulliHistoryIntentNotice");
    const jellystatIntentNotice = document.getElementById("jellystatHistoryIntentNotice");
    const streamystatsIntentNotice = document.getElementById("streamystatsHistoryIntentNotice");
    const usingPlexReuse = isReusingPlexHistoryFromMedia();
    if (plexReuseNotice) {
      plexReuseNotice.classList.toggle("hidden", !usingPlexReuse);
    }
    if (plexIntentNotice) {
      plexIntentNotice.classList.toggle("hidden", historySource !== "plex" || usingPlexReuse);
    }
    if (tautulliIntentNotice) {
      tautulliIntentNotice.classList.toggle("hidden", historySource !== "tautulli");
    }
    if (jellystatIntentNotice) {
      jellystatIntentNotice.classList.toggle("hidden", historySource !== "jellystat");
    }
    if (streamystatsIntentNotice) {
      streamystatsIntentNotice.classList.toggle("hidden", historySource !== "streamystats");
    }
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
      const preferSpecificProvider = ["streamystats", "jellystat", "tautulli"].includes(historySource);
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
    const mediaSource = selectedMediaSourceIntent();
    const plexReuseNotice = document.getElementById("plexPlaybackReuseNotice");
    const jellyfinReuseNotice = document.getElementById("jellyfinPlaybackReuseNotice");
    if (plexReuseNotice) {
      plexReuseNotice.classList.toggle("hidden", mediaSource !== "plex");
    }
    if (jellyfinReuseNotice) {
      jellyfinReuseNotice.classList.toggle("hidden", mediaSource !== "jellyfin");
    }
  }

  function updatePlaybackProviderVisibility() {
    updatePlexProviderPlacement();
    updateJellyfinProviderPlacement();
    updatePlaybackIntentGuidance();
    const actions = document.getElementById("playbackProviderActions");
    const container = document.getElementById("playbackProviderBlocks");
    if (!actions || !container) return;

    const mediaSource = selectedMediaSourceIntent();
    const historySource = selectedHistorySourceIntent();
    const visibleProviders = new Set();

    container.querySelectorAll("[data-playback-provider]").forEach((block) => {
      const provider = String(block.getAttribute("data-playback-provider") || "").trim().toLowerCase();
      if (!provider) return;
      const isConfigured = blockHasContent(block);
      const isRevealed = String(block.dataset.userRevealed || "0") === "1";
      const neededForHistory = historySource === provider;
      const shouldShow = isRevealed || isConfigured || neededForHistory;
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

  function instanceConfigured(urlName, keyName) {
    return fieldHasEffectiveUrl(urlName) && fieldHasEffectiveSecret(keyName);
  }

  function streamystatsCredentialsConfigured() {
    const username = getFieldValue("streamystats_username") || getFieldValue("jellyfin_username");
    const passwordReady =
      fieldHasEffectiveSecret("streamystats_password") || fieldHasEffectiveSecret("jellyfin_password");
    return Boolean(String(username || "").trim() && passwordReady);
  }

  function providerConfigured(provider) {
    if (provider === "plex") return instanceConfigured("plex_url", "plex_token");
    if (provider === "jellyfin") return instanceConfigured("jellyfin_url", "jellyfin_api_key");
    if (provider === "tautulli") return instanceConfigured("tautulli_url", "tautulli_api_key");
    if (provider === "jellystat") return instanceConfigured("jellystat_url", "jellystat_api_key");
    if (provider === "streamystats") return instanceConfigured("streamystats_url", "streamystats_api_key") && streamystatsCredentialsConfigured();
    return false;
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
      jellyfin: "jellyfin_url",
      tautulli: "tautulli_url",
      jellystat: "jellystat_url",
      streamystats: "streamystats_url",
    };
    return map[key] || key;
  }

  function stepForFieldName(field) {
    const name = String(field || "").trim();
    const mediaSource = selectedMediaSourceIntent();
    const plexFields = ["plex_url", "plex_token", "plex_section_filters"];
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
    if (name === "history_source_preference" || ["jellystat_url", "jellystat_api_key", "jellystat_library_ids_sonarr", "jellystat_library_ids_radarr", "streamystats_url", "streamystats_api_key", "streamystats_server_id", "streamystats_username", "streamystats_password", "tautulli_url", "tautulli_api_key"].includes(name)) return 2;
    if (plexFields.includes(name)) return mediaSource === "plex" ? 1 : 3;
    if (jellyfinFields.includes(name)) return mediaSource === "jellyfin" ? 1 : 3;
    if (["sortarr_auth_method", "basic_auth_user", "basic_auth_pass", "sortarr_upstream_auth_header", "proxy_preset", "sortarr_secret_key", "clear_basic_auth_pass"].includes(name)) return 4;
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
      enabled.push("Custom proxy hops");
    }
    if (getFieldValue("sortarr_csrf_trusted_origins")) {
      enabled.push("Trusted origins");
    }
    if (getFieldValue("sortarr_waitress_trusted_proxy")) {
      enabled.push("Trusted proxy");
    }
    const recovery = document.querySelector('[name="sortarr_allow_unsafe_ephemeral_recovery"]');
    if (recovery && recovery.checked) {
      enabled.push("Recovery mode");
    }
    if (hasNonDefaultNumericField("sonarr_timeout_seconds", 90)) {
      enabled.push("Sonarr timeout");
    }
    if (hasNonDefaultNumericField("radarr_timeout_seconds", 90)) {
      enabled.push("Radarr timeout");
    }
    if (hasNonDefaultNumericField("sonarr_episodefile_workers", 8)) {
      enabled.push("Episode file workers");
    }
    if (hasNonDefaultNumericField("radarr_wanted_workers", 2)) {
      enabled.push("Radarr wanted workers");
    }
    if (hasNonDefaultNumericField("radarr_instance_workers", 1)) {
      enabled.push("Radarr instance workers");
    }
    if (hasNonDefaultNumericField("tautulli_timeout_seconds", 60)) {
      enabled.push("Tautulli timeout");
    }
    if (hasNonDefaultNumericField("tautulli_fetch_seconds", 0)) {
      enabled.push("Tautulli fetch interval");
    }
    if (hasNonDefaultNumericField("tautulli_metadata_workers", 4)) {
      enabled.push("Tautulli metadata workers");
    }
    if (hasNonDefaultNumericField("streamystats_timeout_seconds", 45)) {
      enabled.push("Streamystats timeout");
    }
    if (hasNonDefaultNumericField("streamystats_search_limit", 8)) {
      enabled.push("Streamystats search limit");
    }
    if (hasNonDefaultNumericField("streamystats_workers", 4)) {
      enabled.push("Streamystats workers");
    }
    if (hasNonDefaultNumericField("plex_history_page_size", 200)) {
      enabled.push("Plex history page size");
    }
    return Array.from(new Set(enabled));
  }

  function setStepStatus(stepId, state, label) {
    const el = document.getElementById(stepId);
    if (!el) return;
    el.className = `setup-task-status setup-task-status--${state}`;
    el.textContent = label;
  }

  function summarizeMediaStep() {
    const labels = [];
    const mediaPref = String(getFieldValue("media_source_preference") || "auto").toLowerCase();
    const hasSonarr = instanceConfigured("sonarr_url", "sonarr_api_key");
    const hasRadarr = instanceConfigured("radarr_url", "radarr_api_key");
    const hasPlex = providerConfigured("plex");
    const hasJellyfin = providerConfigured("jellyfin");
    const arrConfigured = [];
    if (hasSonarr) arrConfigured.push("Sonarr");
    if (hasRadarr) arrConfigured.push("Radarr");
    if (mediaPref === "plex") {
      labels.push("Media info source: Plex");
      if (hasPlex) {
        labels.push("Plex connected");
      } else {
        labels.push("Plex connection needed");
      }
      if (arrConfigured.length) {
        labels.push(`Extra connections: ${arrConfigured.join(", ")}`);
      }
    } else if (mediaPref === "jellyfin") {
      labels.push("Media info source: Jellyfin");
      if (hasJellyfin) {
        labels.push("Jellyfin connected");
      } else {
        labels.push("Jellyfin connection needed");
      }
      if (arrConfigured.length) {
        labels.push(`Extra connections: ${arrConfigured.join(", ")}`);
      }
    } else if (mediaPref === "arr") {
      labels.push("Media info source: Sonarr/Radarr");
      if (arrConfigured.length) {
        labels.push(`Configured: ${arrConfigured.join(", ")}`);
      } else {
        labels.push("Arr connection needed");
      }
      if (hasPlex) {
        labels.push("Plex available separately");
      }
      if (hasJellyfin) {
        labels.push("Jellyfin available separately");
      }
    } else {
      labels.push("Media info source: Auto");
      const configured = [];
      if (arrConfigured.length) configured.push(arrConfigured.join(", "));
      if (hasJellyfin) configured.push("Jellyfin");
      if (hasPlex) configured.push("Plex");
      if (configured.length) {
        labels.push(`Available: ${configured.join(" + ")}`);
      } else {
        labels.push("No media connections yet");
      }
    }
    return labels.join(" · ");
  }

  function summarizeHistoryStep() {
    const historyPref = selectedHistorySourceIntent();
    const prefLabel = historyPref === "auto" ? "Auto" : sourceLabel(historyPref);
    const configured = [];
    if (providerConfigured("tautulli")) configured.push("Tautulli");
    if (providerConfigured("jellystat")) configured.push("Jellystat");
    if (providerConfigured("streamystats")) configured.push("Streamystats");
    if (isReusingPlexHistoryFromMedia()) {
      return `History source: ${prefLabel} · Reusing Plex from Step 1`;
    }
    if (historyPref === "plex") {
      return `History source: Plex · ${providerConfigured("plex") ? "Step 3 connection ready" : "Configure Plex in Step 3"}`;
    }
    if (historyPref === "tautulli") {
      return `History source: Tautulli · ${providerConfigured("tautulli") ? "Tautulli configured" : "Tautulli connection needed"}`;
    }
    if (historyPref === "jellystat") {
      return `History source: Jellystat · ${providerConfigured("jellystat") ? "Jellystat configured" : "Jellystat connection needed"}`;
    }
    if (historyPref === "streamystats") {
      return `History source: Streamystats · ${providerConfigured("streamystats") ? "Streamystats configured" : "Streamystats connection needed"}`;
    }
    const effectiveHistory =
      providerConfigured("tautulli") ? "Tautulli" :
      providerConfigured("jellystat") ? "Jellystat" :
      providerConfigured("streamystats") ? "Streamystats" :
      providerConfigured("plex") ? "Plex" :
      "";
    if (!configured.length) {
      return `History source: ${prefLabel} · No history providers configured`;
    }
    if (historyPref === "auto" && effectiveHistory) {
      return `History source: Auto · Currently using ${effectiveHistory}`;
    }
    return `History source: ${prefLabel} · Configured: ${configured.join(", ")}`;
  }

  function summarizePlaybackStep() {
    const labels = [];
    const mediaSource = selectedMediaSourceIntent();
    const historySource = selectedHistorySourceIntent();
    const insightsProvider = selectedInsightsProviderIntent();
    if (providerConfigured("plex")) {
      labels.push(mediaSource === "plex" ? "Plex via Step 1" : "Plex connected");
    } else if (historySource === "plex" && !isReusingPlexHistoryFromMedia()) {
      labels.push("Plex connection needed");
    }
    if (providerConfigured("jellyfin")) {
      labels.push(mediaSource === "jellyfin" ? "Jellyfin via Step 1" : "Jellyfin connected");
    }
    if (!labels.length) {
      return "No playback providers connected";
    }
    const preferredLabel = insightsProvider === "auto" ? "Auto" : sourceLabel(insightsProvider);
    return `Playback enrichment: ${labels.join(", ")} · Preferred insights: ${preferredLabel}`;
  }

  function summarizeSecurityStep() {
    const authMethod = String(getFieldValue("sortarr_auth_method") || "basic").toLowerCase();
    const proxyMode = String(getFieldValue("proxy_preset") || "single").toLowerCase();
    const hasSecretValue = fieldHasEffectiveSecret("sortarr_secret_key");
    const form = document.querySelector(".setup-form");
    const ephemeral = Boolean(form && String(form.dataset.ephemeralSecret || "0") === "1");
    const authLabel = authMethod === "external" ? "External auth" : "Basic auth";
    const proxyLabelMap = {
      direct: "Direct proxy mode",
      single: "Single proxy mode",
      double: "Double proxy mode",
      custom: "Custom proxy mode",
    };
    const proxyLabel = proxyLabelMap[proxyMode] || "Proxy mode set";
    const secretLabel = hasSecretValue || !ephemeral ? "Secret ready" : "Secret will be generated on save";
    return `${authLabel} · ${proxyLabel} · ${secretLabel}`;
  }

  function summarizeAdvancedStep() {
    const enabled = getAdvancedOverrideLabels();
    if (!enabled.length) {
      return "No advanced overrides";
    }
    return `Advanced settings in use: ${enabled.join(", ")}`;
  }

  function updateStepSummaries() {
    const step1 = document.getElementById("setupStep1Summary");
    const step2 = document.getElementById("setupStep2Summary");
    const step3 = document.getElementById("setupStep3Summary");
    const step4 = document.getElementById("setupStep4Summary");
    const step5 = document.getElementById("setupStep5Summary");
    if (step1) step1.textContent = summarizeMediaStep();
    if (step2) step2.textContent = summarizeHistoryStep();
    if (step3) step3.textContent = summarizePlaybackStep();
    if (step4) step4.textContent = summarizeSecurityStep();
    if (step5) step5.textContent = summarizeAdvancedStep();
    updateStepStatuses();
  }

  function updateStepStatuses() {
    const mediaPref = String(getFieldValue("media_source_preference") || "auto").toLowerCase();
    const historyPref = String(getFieldValue("history_source_preference") || "auto").toLowerCase();
    const hasArrMedia = instanceConfigured("sonarr_url", "sonarr_api_key") || instanceConfigured("radarr_url", "radarr_api_key");
    const hasJellyfinMedia = providerConfigured("jellyfin");
    const hasPlexMedia = providerConfigured("plex");
    if (stepHasErrors(1) || (!hasArrMedia && !hasJellyfinMedia && !hasPlexMedia) || (mediaPref === "arr" && !hasArrMedia) || (mediaPref === "jellyfin" && !hasJellyfinMedia) || (mediaPref === "plex" && !hasPlexMedia)) {
      setStepStatus("setupStep1Status", "needs-attention", !hasArrMedia && !hasJellyfinMedia && !hasPlexMedia ? "Action needed" : "Needs attention");
    } else {
      setStepStatus("setupStep1Status", "ready", "Ready");
    }

    const anyHistory = providerConfigured("plex") || providerConfigured("jellystat") || providerConfigured("streamystats") || providerConfigured("tautulli");
    const historyMissingPreferred =
      (historyPref === "plex" && !providerConfigured("plex") && !isReusingPlexHistoryFromMedia()) ||
      (["jellystat", "streamystats", "tautulli"].includes(historyPref) && !providerConfigured(historyPref));
    if (stepHasErrors(2) || historyMissingPreferred) {
      setStepStatus("setupStep2Status", "needs-attention", "Needs attention");
    } else if (anyHistory) {
      setStepStatus("setupStep2Status", "ready", "Ready");
    } else {
      setStepStatus("setupStep2Status", "optional", "Optional");
    }

    const playbackNeedsPreferred =
      historyPref === "plex" && !providerConfigured("plex") && !isReusingPlexHistoryFromMedia();
    const anyPlayback = providerConfigured("plex") || providerConfigured("jellyfin");
    if (stepHasErrors(3) || playbackNeedsPreferred) {
      setStepStatus("setupStep3Status", "needs-attention", "Needs attention");
    } else if (anyPlayback) {
      setStepStatus("setupStep3Status", "configured", "Configured");
    } else {
      setStepStatus("setupStep3Status", "optional", "Optional");
    }

    const authMethod = String(getFieldValue("sortarr_auth_method") || "basic").toLowerCase();
    const basicReady = Boolean(getFieldValue("basic_auth_user")) && fieldHasEffectiveSecret("basic_auth_pass");
    const externalReady = Boolean(getFieldValue("sortarr_upstream_auth_header"));
    const secretReady = fieldHasEffectiveSecret("sortarr_secret_key") && !formFlag("ephemeralSecret");
    if (stepHasErrors(4) || (authMethod === "basic" && !basicReady) || (authMethod === "external" && !externalReady) || !secretReady) {
      const authReady = authMethod === "basic" ? basicReady : externalReady;
      const secretPendingOnly = !secretReady && authReady && !stepHasErrors(4);
      setStepStatus("setupStep4Status", secretPendingOnly ? "configured" : "needs-attention", secretPendingOnly ? "Save required" : "Needs attention");
    } else {
      setStepStatus("setupStep4Status", "ready", "Ready");
    }

    const hasAdvancedOverrides = getAdvancedOverrideLabels().length > 0;
    if (stepHasErrors(5)) {
      setStepStatus("setupStep5Status", "needs-attention", "Needs attention");
    } else if (hasAdvancedOverrides) {
      setStepStatus("setupStep5Status", "configured", "Configured");
    } else {
      setStepStatus("setupStep5Status", "optional", "Optional");
    }
  }

  function initStepSummaries() {
    document.querySelectorAll(".setup-form input, .setup-form select, .setup-form textarea").forEach((field) => {
      field.addEventListener("input", updateStepSummaries);
      field.addEventListener("change", updateStepSummaries);
    });
    updateStepSummaries();
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
    if (!authMethod || !basicFields || !externalFields) return;
    const isExternal = String(authMethod.value || "").trim().toLowerCase() === "external";
    basicFields.classList.toggle("hidden", isExternal);
    externalFields.classList.toggle("hidden", !isExternal);
    basicFields.querySelectorAll("input, select, textarea, button").forEach((field) => {
      toggleFieldDisabled(field, isExternal);
    });
    externalFields.querySelectorAll("input, select, textarea, button").forEach((field) => {
      toggleFieldDisabled(field, !isExternal);
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
        ? "Guided setup is active. Use the floating controls to move between steps."
        : "Use guided setup if you want Sortarr to walk you through the setup one step at a time.";
      if (modeLabel) {
        modeLabel.classList.toggle("hidden", !guidedMode);
      }
      guidedDock.classList.toggle("hidden", !guidedMode);
      guidedDockProgress.textContent = `Step ${currentStepIndex + 1} of ${steps.length}`;
      guidedDockTitle.textContent = message || `Step ${stepNumber}`;
      startBtn.classList.toggle("hidden", guidedMode);
      dismissBtn.classList.toggle("hidden", guidedMode);
      hideBtn.classList.toggle("hidden", guidedMode);
      guidedDockBackBtn.disabled = !guidedMode || currentStepIndex === 0;
      guidedDockNextBtn.textContent = currentStepIndex >= steps.length - 1 ? "Save and continue" : "Next step";
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
    if (key === "jellyfin") return "Jellyfin";
    if (key === "plex") return "Plex";
    if (key === "tautulli") return "Tautulli";
    if (key === "jellystat") return "Jellystat";
    if (key === "streamystats") return "Streamystats";
    if (key) return key;
    return "Auto";
  }

  async function updateEffectiveSourcesHint() {
    const el = document.getElementById("setupEffectiveSources");
    if (!el) return;
    if (formFlag("setupCompleted") || formFlag("securityLocked")) return;
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
