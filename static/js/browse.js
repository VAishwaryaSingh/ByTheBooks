(function () {
  let debounceTimer = null;

  function getFilters() {
    const q = document.getElementById("searchInput").value.trim();
    const frameworks = Array.from(document.querySelectorAll(".filter-fw:checked")).map(el => el.value);
    const topics = Array.from(document.querySelectorAll(".filter-topic:checked")).map(el => el.value);
    const statusEl = document.querySelector(".filter-status:checked");
    const status = statusEl ? statusEl.value : "";
    return { q, frameworks, topics, status };
  }

  function buildUrl(filters) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    filters.frameworks.forEach(f => params.append("framework", f));
    filters.topics.forEach(t => params.append("topic", t));
    if (filters.status) params.set("status", filters.status);
    return "/api/standards?" + params.toString();
  }

  function renderCard(std) {
    const topicHtml = (std.topics || []).map(t =>
      `<a href="/browse?topic=${encodeURIComponent(t)}" class="topic-tag small">${t}</a>`
    ).join("");

    const summary = std.summary ? std.summary.slice(0, 160) + (std.summary.length > 160 ? "…" : "") : "";

    return `
      <a href="/standards/${std.id}" class="standard-card">
        <div class="card-header">
          <span class="fw-badge">${std.framework_code}</span>
          <span class="card-code">${std.code}</span>
          ${std.status !== "active" ? `<span class="status-pill ${std.status}">${std.status}</span>` : ""}
        </div>
        <div class="card-title">${std.title}</div>
        ${summary ? `<p class="card-summary">${summary}</p>` : ""}
        ${topicHtml ? `<div class="card-topics">${topicHtml}</div>` : ""}
      </a>
    `;
  }

  function load() {
    const filters = getFilters();
    const grid = document.getElementById("standardsGrid");
    const count = document.getElementById("resultsCount");

    grid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading…</p></div>';

    fetch(buildUrl(filters))
      .then(r => r.json())
      .then(data => {
        count.textContent = `${data.length} standard${data.length !== 1 ? "s" : ""}`;
        if (data.length === 0) {
          grid.innerHTML = '<div class="empty-state"><p>No standards match your filters.</p><button class="btn btn-outline btn-sm" onclick="document.getElementById(\'clearFilters\').click()">Clear filters</button></div>';
          return;
        }
        grid.innerHTML = data.map(renderCard).join("");
      })
      .catch(() => {
        grid.innerHTML = '<div class="error-state"><p>Failed to load standards. Please refresh.</p></div>';
      });
  }

  function triggerLoad() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(load, 250);
  }

  document.getElementById("searchInput").addEventListener("input", triggerLoad);
  document.querySelectorAll(".filter-fw, .filter-topic, .filter-status").forEach(el => {
    el.addEventListener("change", load);
  });
  document.getElementById("clearFilters").addEventListener("click", function () {
    document.getElementById("searchInput").value = "";
    document.querySelectorAll(".filter-fw, .filter-topic").forEach(el => el.checked = false);
    const allStatus = document.querySelector('.filter-status[value=""]');
    if (allStatus) allStatus.checked = true;
    load();
  });

  // Initial load
  load();
})();
