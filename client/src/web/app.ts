import { client, type Conversation, type ZenvikClientState } from "../client.js";

const app = document.querySelector<HTMLDivElement>("#app")!;
let activePage: "chat" | "settings" = "chat";

app.innerHTML = `
<div class="shell">
  <aside class="sidebar">
    <div class="brand"><div class="brand-mark">Z</div><div><strong>Zenvik</strong><span>Desktop</span></div></div>
    <button class="nav-item active" data-page="chat"><span>▣</span> Messages</button>
    <button class="nav-item" data-page="settings"><span>⚙</span> Settings</button>
    <div class="sidebar-section">
      <div class="section-head"><span>CONVERSATIONS</span><button id="new-conversation" title="New conversation">+</button></div>
      <div id="conversation-list" class="conversation-list"></div>
    </div>
    <div class="account">
      <div id="avatar" class="avatar">?</div>
      <div class="account-info"><strong id="username">Not signed in</strong><span id="connection-label">Offline</span></div>
      <button id="disconnect" class="icon-button" title="Disconnect">↪</button>
    </div>
  </aside>

  <main class="content">
    <section id="chat-page" class="page">
      <header class="topbar">
        <div><h1 id="conversation-title">Messages</h1><span id="conversation-status">Select a conversation</span></div>
        <div class="top-actions"><span id="connection-dot" class="connection disconnected"></span><span id="connection-text">Disconnected</span></div>
      </header>
      <div id="messages" class="messages"><div class="empty"><div class="empty-icon">Z</div><h2>Welcome to Zenvik</h2><p>Choose a conversation to start messaging.</p></div></div>
      <form id="composer" class="composer">
        <textarea id="message-input" rows="1" placeholder="Connect to Zenvik to send a message..."></textarea>
        <button id="send-button" type="submit">Send</button>
      </form>
    </section>

    <section id="settings-page" class="page hidden">
      <header class="topbar"><div><h1>Settings</h1><span>Customize your Zenvik client</span></div></header>
      <div class="settings-card">
        <label class="setting"><span><strong>Theme</strong><small>Choose the client appearance.</small></span><select id="theme-setting"><option value="dark">Dark</option><option value="light">Light</option></select></label>
        <label class="setting"><span><strong>Enter sends messages</strong><small>Press Enter to send instead of adding a new line.</small></span><input id="enter-setting" type="checkbox"></label>
        <label class="setting"><span><strong>Notifications</strong><small>Allow desktop notification behavior when supported.</small></span><input id="notification-setting" type="checkbox"></label>
        <div class="server-box"><strong>Server</strong><span id="server-url"></span><button id="reconnect" class="secondary">Reconnect</button></div>
      </div>
    </section>
  </main>
</div>
<div id="toast" class="toast"></div>
<div id="modal" class="modal hidden"><div class="modal-card"><h2>New conversation</h2><p>Create a conversation on the Zenvik server.</p><input id="conversation-name" maxlength="80" placeholder="Conversation name"><div class="modal-actions"><button id="cancel-modal" class="secondary">Cancel</button><button id="create-modal">Create</button></div></div></div>
`;

const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector)!;
const list = $("#conversation-list");
const messages = $("#messages");
const input = $("#message-input");
const toast = $("#toast");

function escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}

function render(state: Readonly<ZenvikClientState>): void {
    const connected = state.connection === "connected";
    $("#connection-text").textContent = connected ? "Connected" : state.connection === "connecting" ? "Connecting..." : "Disconnected";
    $("#connection-label").textContent = connected ? "Online" : "Offline";
    $("#connection-dot").className = `connection ${state.connection}`;
    $("#send-button").disabled = !connected || !state.activeConversation;
    input.disabled = !connected || !state.activeConversation;
    input.placeholder = connected ? "Write a message..." : "Connect to Zenvik to send a message...";

    $("#username").textContent = state.user?.username ?? "Not signed in";
    $("#avatar").textContent = (state.user?.username?.[0] ?? "?").toUpperCase();

    list.innerHTML = state.conversations.map(conversation => `
      <button class="conversation ${conversation.id === state.activeConversation ? "selected" : ""}" data-conversation="${escapeHtml(conversation.id)}">
        <span class="conversation-icon">#</span><span class="conversation-name">${escapeHtml(conversation.name)}</span>${conversation.unread ? `<span class="unread">${conversation.unread}</span>` : ""}
      </button>`).join("");

    const conversation = state.conversations.find(item => item.id === state.activeConversation);
    $("#conversation-title").textContent = conversation?.name ?? "Messages";
    $("#conversation-status").textContent = conversation ? `${conversation.messages.length} message${conversation.messages.length === 1 ? "" : "s"}` : "Select a conversation";

    if (!conversation) {
        messages.innerHTML = `<div class="empty"><div class="empty-icon">Z</div><h2>Welcome to Zenvik</h2><p>Choose a conversation to start messaging.</p></div>`;
    } else if (conversation.messages.length === 0) {
        messages.innerHTML = `<div class="empty"><div class="empty-icon">#</div><h2>${escapeHtml(conversation.name)}</h2><p>No messages yet. Send the first one.</p></div>`;
    } else {
        messages.innerHTML = conversation.messages.map(message => `
          <article class="message">
            <div class="message-avatar">${escapeHtml(message.author.username[0]?.toUpperCase() ?? "?")}</div>
            <div class="message-body"><div class="message-meta"><strong>${escapeHtml(message.author.username)}</strong><time>${formatTime(message.timestamp)}</time></div><div class="message-content">${escapeHtml(message.content).replace(/\n/g, "<br>")}</div></div>
          </article>`).join("");
        messages.scrollTop = messages.scrollHeight;
    }

    $("#theme-setting").value = state.settings.theme;
    $("#enter-setting").checked = state.settings.enterToSend;
    $("#notification-setting").checked = state.settings.notifications;
    document.documentElement.dataset.theme = state.settings.theme;
    void window.zenvik.getConfig().then(config => { $("#server-url").textContent = config.websocketUrl; });

    if (state.error) {
        showToast(state.error);
    }
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

let toastTimer: number | null = null;
function showToast(message: string): void {
    toast.textContent = message;
    toast.classList.add("visible");
    if (toastTimer !== null) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3500);
}

document.addEventListener("click", event => {
    const target = event.target as HTMLElement;
    const page = target.closest<HTMLButtonElement>("[data-page]")?.dataset.page;
    if (page === "chat" || page === "settings") {
        activePage = page;
        $("#chat-page").classList.toggle("hidden", activePage !== "chat");
        $("#settings-page").classList.toggle("hidden", activePage !== "settings");
        document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.getAttribute("data-page") === activePage));
        return;
    }

    const conversation = target.closest<HTMLButtonElement>("[data-conversation]");
    if (conversation?.dataset.conversation) client.selectConversation(conversation.dataset.conversation);

    if (target.closest("#disconnect")) client.disconnect();
    if (target.closest("#reconnect")) void client.connect().catch(error => showToast(error instanceof Error ? error.message : String(error)));
    if (target.closest("#new-conversation")) $("#modal").classList.remove("hidden");
    if (target.closest("#cancel-modal")) $("#modal").classList.add("hidden");
    if (target.closest("#create-modal")) {
        const name = $("#conversation-name").value.trim();
        if (!name) return showToast("Enter a conversation name.");
        if (!client.createConversation(name)) showToast("Could not create the conversation.");
        $("#conversation-name").value = "";
        $("#modal").classList.add("hidden");
    }
});

$("#composer").addEventListener("submit", event => {
    event.preventDefault();
    if (client.sendMessage(input.value)) input.value = "";
});

input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && client.getState().settings.enterToSend) {
        event.preventDefault();
        $("#composer").requestSubmit();
    }
});

$("#theme-setting").addEventListener("change", event => client.updateSettings({ theme: (event.target as HTMLSelectElement).value as "dark" | "light" }));
$("#enter-setting").addEventListener("change", event => client.updateSettings({ enterToSend: (event.target as HTMLInputElement).checked }));
$("#notification-setting").addEventListener("change", event => client.updateSettings({ notifications: (event.target as HTMLInputElement).checked }));

client.subscribe(render);

void (async () => {
    try {
        await client.start();
    } catch (error) {
        showToast(error instanceof Error ? error.message : "Unable to connect to Zenvik.");
    }
})();
