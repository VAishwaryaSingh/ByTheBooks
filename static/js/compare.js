(function () {
  let selectedA = null;
  let selectedB = null;
  let debounceA = null;
  let debounceB = null;

  function setupPicker(inputId, dropdownId, selectedId, onSelect) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    const selectedEl = document.getElementById(selectedId);

    input.addEventListener("input", function () {
      const q = input.value.trim();
      if (!q) { dropdown.innerHTML = ""; dropdown.classList.remove("open"); return; }
      if (inputId === "searchA") clearTimeout(debounceA); else clearTimeout(debounceB);
      const timer = setTimeout(() => {
        fetch(`/api/standards?q=${encodeURIComponent(q)}`)
          .then(r => r.json())
          .then(data => {
            if (!data.length) { dropdown.innerHTML = '<div class="dropdown-empty">No results</div>'; dropdown.classList.add("open"); return; }
            dropdown.innerHTML = data.map(std => `
              <div class="dropdown-item" data-id="${std.id}" data-code="${std.code}" data-title="${std.title}" data-fw="${std.framework_code}">
                <span class="fw-badge small">${std.framework_code}</span>
                <span class="dropdown-code">${std.code}</span>
                <span class="dropdown-title">${std.title}</span>
              </div>
            `).join("");
            dropdown.classList.add("open");
            dropdown.querySelectorAll(".dropdown-item").forEach(item => {
              item.addEventListener("click", function () {
                const std = { id: item.dataset.id, code: item.dataset.code, title: item.dataset.title, framework_code: item.dataset.fw };
                onSelect(std);
                selectedEl.innerHTML = `
                  <div class="selected-tag">
                    <span class="fw-badge">${std.framework_code}</span>
                    <span class="selected-code">${std.code}</span>
                    <span class="selected-title">${std.title}</span>
                    <button class="remove-btn">×</button>
                  </div>
                `;
                selectedEl.querySelector(".remove-btn").addEventListener("click", function () {
                  onSelect(null);
                  selectedEl.innerHTML = '<span class="picker-placeholder">No standard selected</span>';
                  input.value = "";
                  updateCompareBtn();
                });
                input.value = "";
                dropdown.innerHTML = "";
                dropdown.classList.remove("open");
                updateCompareBtn();
              });
            });
          });
      }, 250);
      if (inputId === "searchA") debounceA = timer; else debounceB = timer;
    });

    document.addEventListener("click", function (e) {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove("open");
    });
  }

  function updateCompareBtn() {
    document.getElementById("compareBtn").disabled = !(selectedA && selectedB);
  }

  setupPicker("searchA", "dropdownA", "selectedA", function (std) { selectedA = std; });
  setupPicker("searchB", "dropdownB", "selectedB", function (std) { selectedB = std; });

  document.getElementById("compareBtn").addEventListener("click", function () {
    if (!selectedA || !selectedB) return;

    const result = document.getElementById("compareResult");
    const loading = document.getElementById("compareLoading");
    const error = document.getElementById("compareError");

    result.classList.add("hidden");
    error.classList.add("hidden");
    loading.classList.remove("hidden");

    const apiKey = window.BTB_getApiKey ? window.BTB_getApiKey() : "";

    fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ standard_id_1: selectedA.id, standard_id_2: selectedB.id, api_key: apiKey }),
    })
      .then(r => r.json())
      .then(data => {
        loading.classList.add("hidden");
        if (data.error) { error.textContent = data.error; error.classList.remove("hidden"); return; }
        renderComparison(data);
        result.classList.remove("hidden");
      })
      .catch(() => {
        loading.classList.add("hidden");
        error.textContent = "Comparison failed. Please try again.";
        error.classList.remove("hidden");
      });
  });

  function renderComparison(data) {
    const a = data.standard_a;
    const b = data.standard_b;

    // Column headers
    document.getElementById("colHeaderA").innerHTML =
      `<span class="fw-badge">${a.framework_code}</span> ${a.code}`;
    document.getElementById("colHeaderB").innerHTML =
      `<span class="fw-badge">${b.framework_code}</span> ${b.code}`;

    const content = document.getElementById("compareContent");

    // Build side-by-side DB comparison
    const pointsA = (a.key_points || []);
    const pointsB = (b.key_points || []);

    let html = `
      <!-- Title row -->
      <div class="cmp-row cmp-title-row">
        <div class="cmp-cell">
          <div class="cmp-std-title">${esc(a.code)}</div>
          <div class="cmp-std-subtitle">${esc(a.title)}</div>
        </div>
        <div class="cmp-cell">
          <div class="cmp-std-title">${esc(b.code)}</div>
          <div class="cmp-std-subtitle">${esc(b.title)}</div>
        </div>
      </div>

      <!-- Metadata row -->
      <div class="cmp-section-header">Overview</div>
      <div class="cmp-row">
        <div class="cmp-cell">
          <dl class="cmp-meta">
            <dt>Framework</dt><dd>${esc(a.framework_name)}</dd>
            <dt>Region</dt><dd>${esc(a.region)}</dd>
            <dt>Effective Date</dt><dd>${esc(a.effective_date || '—')}</dd>
            <dt>Topics</dt><dd>${(a.topics || []).map(t => `<span class="topic-tag small">${esc(t)}</span>`).join(' ')}</dd>
          </dl>
        </div>
        <div class="cmp-cell">
          <dl class="cmp-meta">
            <dt>Framework</dt><dd>${esc(b.framework_name)}</dd>
            <dt>Region</dt><dd>${esc(b.region)}</dd>
            <dt>Effective Date</dt><dd>${esc(b.effective_date || '—')}</dd>
            <dt>Topics</dt><dd>${(b.topics || []).map(t => `<span class="topic-tag small">${esc(t)}</span>`).join(' ')}</dd>
          </dl>
        </div>
      </div>

      <!-- Summary row -->
      <div class="cmp-section-header">Summary</div>
      <div class="cmp-row">
        <div class="cmp-cell"><p class="cmp-summary">${esc(a.summary || '—')}</p></div>
        <div class="cmp-cell"><p class="cmp-summary">${esc(b.summary || '—')}</p></div>
      </div>

      <!-- Key points row -->
      <div class="cmp-section-header">Key Points</div>
      <div class="cmp-row cmp-points-row">
        <div class="cmp-cell">
          <ul class="cmp-points">
            ${pointsA.map(p => `<li>${esc(p)}</li>`).join('')}
          </ul>
        </div>
        <div class="cmp-cell">
          <ul class="cmp-points">
            ${pointsB.map(p => `<li>${esc(p)}</li>`).join('')}
          </ul>
        </div>
      </div>

      <!-- Official links -->
      <div class="cmp-row cmp-links-row">
        <div class="cmp-cell">
          ${a.official_url ? `<a href="${a.official_url}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">View Official Standard →</a>` : ''}
        </div>
        <div class="cmp-cell">
          ${b.official_url ? `<a href="${b.official_url}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">View Official Standard →</a>` : ''}
        </div>
      </div>
    `;

    // AI analysis section (if available)
    if (data.ai_powered && data.ai_comparison) {
      html += `
        <div class="cmp-ai-section">
          <div class="cmp-ai-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            AI Analysis
          </div>
          <div class="cmp-ai-body">${markdownToHtml(data.ai_comparison)}</div>
        </div>
      `;
    } else if (!data.ai_powered) {
      html += `
        <div class="cmp-ai-prompt">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          Add your Anthropic API key (click <strong>API Key</strong> in the header) to get an AI-powered analysis of the key differences between these two standards.
        </div>
      `;
    }

    content.innerHTML = html;
  }

  document.getElementById("clearCompare").addEventListener("click", function () {
    selectedA = null; selectedB = null;
    ["selectedA", "selectedB"].forEach(id => {
      document.getElementById(id).innerHTML = '<span class="picker-placeholder">No standard selected</span>';
    });
    ["searchA", "searchB"].forEach(id => { document.getElementById(id).value = ""; });
    document.getElementById("compareResult").classList.add("hidden");
    document.getElementById("compareError").classList.add("hidden");
    updateCompareBtn();
  });

  function esc(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function markdownToHtml(text) {
    const e = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return e
      .replace(/^#{1,3} (.+)$/gm, '<h4 class="compare-section-title">$1</h4>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ol-item">$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li[^>]*>.*?<\/li>\n?)+/gs, m => {
        const tag = m.includes('ol-item') ? 'ol' : 'ul';
        return `<${tag}>${m}</${tag}>`;
      })
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  // Pre-fill Standard A from URL ?a=
  const urlA = new URLSearchParams(window.location.search).get("a");
  if (urlA) {
    fetch(`/api/standards/${urlA}`)
      .then(r => r.json())
      .then(std => {
        selectedA = { id: std.id, code: std.code, title: std.title, framework_code: std.framework_code };
        document.getElementById("selectedA").innerHTML = `
          <div class="selected-tag">
            <span class="fw-badge">${std.framework_code}</span>
            <span class="selected-code">${std.code}</span>
            <span class="selected-title">${std.title}</span>
            <button class="remove-btn">×</button>
          </div>
        `;
        document.getElementById("selectedA").querySelector(".remove-btn").addEventListener("click", function () {
          selectedA = null;
          document.getElementById("selectedA").innerHTML = '<span class="picker-placeholder">No standard selected</span>';
          updateCompareBtn();
        });
        updateCompareBtn();
      });
  }
})();
