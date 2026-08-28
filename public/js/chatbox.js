(() => {
  const root = document.querySelector("[data-chatbox]");
  if (!root) return;

  const toggle = root.querySelector("[data-chatbox-toggle]");
  const close = root.querySelector("[data-chatbox-close]");
  const panel = root.querySelector("[data-chatbox-panel]");
  const messages = root.querySelector("[data-chatbox-messages]");
  const form = root.querySelector("[data-chatbox-form]");
  const input = root.querySelector("[data-chatbox-input]");
  const send = root.querySelector("[data-chatbox-send]");
  const notification = root.querySelector("[data-chatbox-notification]");
  const endpoint = root.dataset.apiEndpoint || "/api/chat";
  const history = [];

  const setOpen = (open) => {
    root.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    panel.setAttribute("aria-hidden", String(!open));
    if (open) {
      notification.hidden = true;
      window.setTimeout(() => input.focus(), 180);
    }
  };

  const scrollToLatest = () => {
    messages.scrollTop = messages.scrollHeight;
  };

  const messageElement = (content, role) => {
    const wrapper = document.createElement("div");
    wrapper.className = `customer-chat__message customer-chat__message--${role === "user" ? "user" : "bot"}`;

    const bubble = document.createElement("div");
    bubble.className = "customer-chat__bubble";
    bubble.textContent = content;

    const time = document.createElement("time");
    time.textContent = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date());

    wrapper.append(bubble, time);
    return wrapper;
  };

  const showTyping = () => {
    const wrapper = document.createElement("div");
    wrapper.className = "customer-chat__message customer-chat__message--bot customer-chat__typing";
    wrapper.dataset.chatboxTyping = "";
    wrapper.innerHTML = '<div class="customer-chat__bubble"><i></i><i></i><i></i></div>';
    messages.appendChild(wrapper);
    scrollToLatest();
  };

  const hideTyping = () => {
    const typing = messages.querySelector("[data-chatbox-typing]");
    if (typing) typing.remove();
  };

  const requestReply = async (message) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: history.slice(-10) }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Không thể kết nối dịch vụ chat.");
    return data.reply;
  };

  const submitMessage = async (text) => {
    const message = text.trim();
    if (!message || send.disabled) return;

    const suggestions = root.querySelector("[data-chatbox-suggestions]");
    if (suggestions) suggestions.remove();

    messages.appendChild(messageElement(message, "user"));
    history.push({ role: "user", content: message });
    input.value = "";
    input.style.height = "auto";
    send.disabled = true;
    showTyping();

    try {
      const reply = await requestReply(message);
      hideTyping();
      messages.appendChild(messageElement(reply, "assistant"));
      history.push({ role: "assistant", content: reply });
    } catch (error) {
      hideTyping();
      messages.appendChild(messageElement(error.message, "assistant"));
    } finally {
      send.disabled = false;
      scrollToLatest();
      input.focus();
    }
  };

  toggle.addEventListener("click", () => setOpen(!root.classList.contains("is-open")));
  close.addEventListener("click", () => setOpen(false));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitMessage(input.value);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 96)}px`;
  });
  root.querySelectorAll("[data-chatbox-suggestion]").forEach((button) => {
    button.addEventListener("click", () => submitMessage(button.dataset.chatboxSuggestion));
  });
})();
