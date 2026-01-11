(function () {
  function getFieldValue(name) {
    const el = document.querySelector(`[name="${CSS.escape(name)}"]`);
    return el ? String(el.value || "").trim() : "";
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

  async function runTest(button) {
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

    button.disabled = true;
    updateInlineMessage(inlineKey, "Testing connection...", "is-pending");
    try {
      const res = await fetch("/api/setup/test", {
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
      if (res.ok && payload.ok) {
        updateInlineMessage(inlineKey, "Connection ok.", "is-ok");
      } else {
        const msg = payload.error || "Connection failed.";
        updateInlineMessage(inlineKey, msg, "is-error");
      }
    } catch (err) {
      updateInlineMessage(inlineKey, `Connection failed: ${err}`, "is-error");
    } finally {
      button.disabled = false;
    }
  }

  document.querySelectorAll(".setup-test").forEach((button) => {
    button.addEventListener("click", () => runTest(button));
  });
})();
