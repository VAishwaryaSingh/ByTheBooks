(function () {
  const messagesEl = document.getElementById("chatMessages");
  const inputEl = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSendBtn");
  const emptyEl = document.getElementById("chatEmpty");
  let history = [];
  let sending = false;

  // Auto-resize textarea
  inputEl.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 160) + "px";
    sendBtn.disabled = !this.value.trim();
  });

  // Send on Enter (Shift+Enter = newline)
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending && this.value.trim()) sendMessage(this.value.trim());
    }
  });

  sendBtn.addEventListener("click", function () {
    if (!sending && inputEl.value.trim()) sendMessage(inputEl.value.trim());
  });

  // Starter buttons
  document.querySelectorAll(".starter-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      const q = this.dataset.q;
      inputEl.value = q;
      inputEl.dispatchEvent(new Event("input"));
      sendMessage(q);
    });
  });

  // Pre-fill from URL ?q=
  const urlQ = new URLSearchParams(window.location.search).get("q");
  if (urlQ) {
    inputEl.value = urlQ;
    inputEl.dispatchEvent(new Event("input"));
    setTimeout(() => sendMessage(urlQ), 300);
  }

  function sendMessage(text) {
    if (sending) return;

    const apiKey = window.BTB_getApiKey ? window.BTB_getApiKey() : "";
    if (!apiKey) {
      appendMessage("user", text);
      inputEl.value = "";
      inputEl.style.height = "auto";
      sendBtn.disabled = true;
      appendApiKeyPrompt();
      scrollToBottom();
      return;
    }

    sending = true;
    sendBtn.disabled = true;

    if (emptyEl) emptyEl.style.display = "none";

    appendMessage("user", text);
    inputEl.value = "";
    inputEl.style.height = "auto";

    const typingEl = appendTyping();

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history, api_key: apiKey }),
    })
      .then(r => r.json())
      .then(data => {
        typingEl.remove();
        if (data.error === "api_key_required") {
          appendApiKeyPrompt();
        } else if (data.error) {
          appendError(data.error);
        } else {
          appendAssistantMessage(data.reply, data.mentioned_standards || []);
          history.push({ role: "user", content: text });
          history.push({ role: "assistant", content: data.reply });
          if (history.length > 20) history = history.slice(-20);
        }
      })
      .catch(() => {
        typingEl.remove();
        appendError("Something went wrong. Please try again.");
      })
      .finally(() => {
        sending = false;
        sendBtn.disabled = !inputEl.value.trim();
        scrollToBottom();
      });
  }

  function appendMessage(role, text) {
    const div = document.createElement("div");
    div.className = `chat-message ${role}`;
    div.innerHTML = `<div class="message-bubble">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function appendAssistantMessage(text, standards) {
    const div = document.createElement("div");
    div.className = "chat-message assistant";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.innerHTML = markdownToHtml(text);
    div.appendChild(bubble);

    if (standards.length) {
      const cardsEl = document.createElement("div");
      cardsEl.className = "mentioned-standards";
      cardsEl.innerHTML = `<div class="mentioned-label">Referenced Standards</div>` +
        standards.map(std => {
          if (!std.id) return `<div class="std-card unlinked"><span class="fw-badge">${escapeHtml(std.framework_code)}</span><span class="std-card-code">${escapeHtml(std.code)}</span></div>`;
          return `<a href="/standards/${std.id}" class="std-card" target="_blank">
            <span class="fw-badge">${escapeHtml(std.framework_code)}</span>
            <span class="std-card-code">${escapeHtml(std.code)}</span>
            <span class="std-card-title">${escapeHtml(std.title)}</span>
          </a>`;
        }).join("");
      div.appendChild(cardsEl);
    }

    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function appendTyping() {
    const div = document.createElement("div");
    div.className = "chat-message assistant typing-indicator";
    div.innerHTML = `<div class="message-bubble"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function appendError(msg) {
    const div = document.createElement("div");
    div.className = "chat-message error";
    div.innerHTML = `<div class="message-bubble error-bubble">${escapeHtml(msg)}</div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function appendApiKeyPrompt() {
    const div = document.createElement("div");
    div.className = "chat-message error";
    div.innerHTML = `<div class="message-bubble error-bubble">Add your Anthropic API key to chat with the assistant — click <strong>API Key</strong> in the header.</div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function markdownToHtml(text) {
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return escaped
      .replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ol-item">$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li[^>]*>.*<\/li>\n?)+/g, m => {
        const isOl = m.includes('class="ol-item"');
        const tag = isOl ? 'ol' : 'ul';
        return `<${tag}>${m}</${tag}>`;
      })
      .replace(/\n{2,}/g, '</p><p class="md-p">')
      .replace(/\n/g, "<br>")
      .replace(/^(?!<)(.)/gm, '<p class="md-p">$1')
      .replace(/([^>])$/gm, '$1</p>');
  }
})();
