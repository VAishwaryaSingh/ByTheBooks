(function () {
  const STORAGE_KEY = "bythebooks_api_key";

  window.BTB_getApiKey = function () {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  };

  function setApiKey(key) {
    try {
      if (key) localStorage.setItem(STORAGE_KEY, key);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore — private browsing / storage disabled */
    }
  }

  function buildModal() {
    const overlay = document.createElement("div");
    overlay.className = "apikey-overlay hidden";
    overlay.innerHTML = `
      <div class="apikey-modal" role="dialog" aria-modal="true" aria-label="Anthropic API key">
        <div class="apikey-modal-header">
          <span>Your Anthropic API Key</span>
          <button type="button" class="apikey-close" aria-label="Close">&times;</button>
        </div>
        <p class="apikey-modal-desc">
          Chat and Compare's AI analysis run on Claude, and this key is yours to bring — it's stored only in
          this browser (never on our server) and sent along with your own Chat/Compare requests.
          Don't have one? <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Get an Anthropic API key →</a>
        </p>
        <input type="password" class="apikey-input picker-input" placeholder="sk-ant-..." autocomplete="off" spellcheck="false" />
        <div class="apikey-modal-actions">
          <button type="button" class="btn btn-outline apikey-clear">Clear key</button>
          <button type="button" class="btn btn-primary apikey-save">Save key</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector(".apikey-input");
    const close = () => overlay.classList.add("hidden");

    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector(".apikey-close").addEventListener("click", close);
    overlay.querySelector(".apikey-save").addEventListener("click", () => {
      setApiKey(input.value.trim());
      close();
      document.dispatchEvent(new CustomEvent("btb:apikey-changed"));
    });
    overlay.querySelector(".apikey-clear").addEventListener("click", () => {
      setApiKey("");
      input.value = "";
      close();
      document.dispatchEvent(new CustomEvent("btb:apikey-changed"));
    });

    return {
      open() {
        input.value = window.BTB_getApiKey();
        overlay.classList.remove("hidden");
        input.focus();
      },
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    const modal = buildModal();
    document.querySelectorAll("[data-apikey-trigger]").forEach((btn) => {
      btn.addEventListener("click", () => modal.open());
    });
    window.BTB_openApiKeyModal = () => modal.open();
  });
})();
