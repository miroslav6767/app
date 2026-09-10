import {
    client,
    type ZenvikClientState,
} from "../client.js";

type Page = "chat" | "settings";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
    throw new Error("Zenvik: #app was not found.");
}

let activePage: Page = "chat";
let toastTimer: number | undefined;
let lastError: string | null = null;
let previousConnection: ZenvikClientState["connection"] = "disconnected";
let previousMessageIds = new Set<string>();

root.innerHTML = `
<div class="app-shell">
    <aside class="sidebar">
        <div class="brand">
            <div class="brand-icon">Z</div>
            <div class="brand-copy">
                <strong>Zenvik</strong>
                <span>Private messaging</span>
            </div>
        </div>

        <nav class="main-nav" aria-label="Main navigation">
            <button class="nav-item active" data-page="chat" type="button">
                <span class="nav-icon">◫</span>
                <span>Messages</span>
            </button>
            <button class="nav-item" data-page="settings" type="button">
                <span class="nav-icon">⚙</span>
                <span>Settings</span>
            </button>
        </nav>

        <div class="sidebar-divider"></div>

        <section class="conversation-panel">
            <div class="section-title">
                <span>Conversations</span>
                <button
                    id="new-conversation"
                    class="add-button"
                    type="button"
                    aria-label="New conversation"
                    title="New conversation"
                >+</button>
            </div>

            <div id="conversation-list" class="conversation-list">
                <div class="list-placeholder">Loading conversations…</div>
            </div>
        </section>

        <div class="account-card">
            <div id="avatar" class="avatar">?</div>
            <div class="account-details">
                <strong id="username">Not connected</strong>
                <span>
                    <i id="connection-dot" class="status-dot disconnected"></i>
                    <span id="connection-label">Offline</span>
                </span>
            </div>
            <button
                id="disconnect"
                class="account-action"
                type="button"
                title="Disconnect"
                aria-label="Disconnect"
            >↪</button>
        </div>
    </aside>

    <main class="main-content">
        <section id="chat-page" class="page">
            <header class="topbar">
                <div class="conversation-heading">
                    <div id="conversation-symbol" class="conversation-symbol">#</div>
                    <div>
                        <h1 id="conversation-title">Messages</h1>
                        <span id="conversation-status">Select a conversation</span>
                    </div>
                </div>

                <div class="connection-pill">
                    <i id="connection-pill-dot" class="status-dot disconnected"></i>
                    <span id="connection-text">Disconnected</span>
                </div>
            </header>

            <div id="messages" class="messages">
                <div class="welcome">
                    <div class="welcome-logo">Z</div>
                    <h2>Welcome to Zenvik</h2>
                    <p>Pick a conversation from the sidebar, or create a new one.</p>
                    <button id="welcome-new" class="primary small" type="button">
                        New conversation
                    </button>
                </div>
            </div>

            <form id="composer" class="composer">
                <div class="composer-box">
                    <textarea
                        id="message-input"
                        rows="1"
                        maxlength="4000"
                        autocomplete="off"
                        placeholder="Connect to Zenvik to send a message…"
                        aria-label="Message"
                    ></textarea>
                    <div class="composer-footer">
                        <span id="composer-hint">Shift + Enter for a new line</span>
                        <span id="character-count">0 / 4000</span>
                    </div>
                </div>
                <button
                    id="send-button"
                    class="send-button"
                    type="submit"
                    disabled
                    aria-label="Send message"
                >
                    <span>Send</span>
                    <span class="send-arrow">↗</span>
                </button>
            </form>
        </section>

        <section id="settings-page" class="page hidden">
            <header class="topbar settings-topbar">
                <div>
                    <h1>Settings</h1>
                    <span>Control how Zenvik behaves on this device.</span>
                </div>
            </header>

            <div class="settings-wrap">
                <section class="settings-section">
                    <div class="settings-section-heading">
                        <h2>Appearance</h2>
                        <p>Make the client feel right for you.</p>
                    </div>

                    <div class="settings-card">
                        <label class="setting-row">
                            <span class="setting-copy">
                                <strong>Theme</strong>
                                <small>Switch between the dark and light interface.</small>
                            </span>
                            <select id="theme-setting">
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                            </select>
                        </label>
                    </div>
                </section>

                <section class="settings-section">
                    <div class="settings-section-heading">
                        <h2>Messaging</h2>
                        <p>Choose how the composer behaves.</p>
                    </div>

                    <div class="settings-card">
                        <label class="setting-row">
                            <span class="setting-copy">
                                <strong>Enter sends messages</strong>
                                <small>Press Enter to send. Shift + Enter creates a new line.</small>
                            </span>
                            <input id="enter-setting" class="toggle" type="checkbox">
                        </label>

                        <label class="setting-row">
                            <span class="setting-copy">
                                <strong>Notifications</strong>
                                <small>Show a desktop notification when a new message arrives.</small>
                            </span>
                            <input id="notification-setting" class="toggle" type="checkbox">
                        </label>
                    </div>
                </section>

                <section class="settings-section">
                    <div class="settings-section-heading">
                        <h2>Connection</h2>
                        <p>Current server configuration and connection controls.</p>
                    </div>

                    <div class="settings-card server-card">
                        <div class="server-info">
                            <span class="server-status-line">
                                <i id="settings-status-dot" class="status-dot disconnected"></i>
                                <strong id="settings-connection">Disconnected</strong>
                            </span>
                            <code id="server-url">Loading…</code>
                        </div>

                        <div class="server-actions">
                            <button id="check-server" class="secondary" type="button">
                                Check server
                            </button>
                            <button id="reconnect" class="primary" type="button">
                                Reconnect
                            </button>
                        </div>
                    </div>
                </section>

                <div class="about-line">
                    <span>Zenvik Desktop & Web</span>
                    <span id="runtime-info">Connecting to runtime…</span>
                </div>
            </div>
        </section>
    </main>
</div>

<div id="toast" class="toast" role="status" aria-live="polite"></div>

<div id="modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-backdrop"></div>
    <div class="modal-card">
        <div class="modal-icon">#</div>
        <h2 id="modal-title">New conversation</h2>
        <p>Create a conversation on the Zenvik server.</p>

        <label class="modal-label" for="conversation-name">Name</label>
        <input
            id="conversation-name"
            maxlength="80"
            autocomplete="off"
            placeholder="e.g. General"
        >

        <div class="modal-actions">
            <button id="cancel-modal" class="secondary" type="button">Cancel</button>
            <button id="create-modal" class="primary" type="button">Create</button>
        </div>
    </div>
</div>
`;

function $<T extends Element>(selector: string): T {
    const element = document.querySelector(selector);

    if (!element) {
        throw new Error(`Zenvik: missing element ${selector}`);
    }

    return element as T;
}

const el = {
    conversationList: $<HTMLDivElement>("#conversation-list"),
    messages: $<HTMLDivElement>("#messages"),
    input: $<HTMLTextAreaElement>("#message-input"),
    composer: $<HTMLFormElement>("#composer"),
    sendButton: $<HTMLButtonElement>("#send-button"),
    characterCount: $<HTMLSpanElement>("#character-count"),
    composerHint: $<HTMLSpanElement>("#composer-hint"),

    avatar: $<HTMLDivElement>("#avatar"),
    username: $<HTMLElement>("#username"),
    connectionDot: $<HTMLElement>("#connection-dot"),
    connectionLabel: $<HTMLSpanElement>("#connection-label"),
    connectionPillDot: $<HTMLElement>("#connection-pill-dot"),
    connectionText: $<HTMLSpanElement>("#connection-text"),

    conversationSymbol: $<HTMLDivElement>("#conversation-symbol"),
    conversationTitle: $<HTMLHeadingElement>("#conversation-title"),
    conversationStatus: $<HTMLSpanElement>("#conversation-status"),

    chatPage: $<HTMLElement>("#chat-page"),
    settingsPage: $<HTMLElement>("#settings-page"),

    themeSetting: $<HTMLSelectElement>("#theme-setting"),
    enterSetting: $<HTMLInputElement>("#enter-setting"),
    notificationSetting: $<HTMLInputElement>("#notification-setting"),

    settingsStatusDot: $<HTMLElement>("#settings-status-dot"),
    settingsConnection: $<HTMLElement>("#settings-connection"),
    serverUrl: $<HTMLElement>("#server-url"),
    runtimeInfo: $<HTMLElement>("#runtime-info"),

    modal: $<HTMLDivElement>("#modal"),
    conversationName: $<HTMLInputElement>("#conversation-name"),
    toast: $<HTMLDivElement>("#toast"),
};

function escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
    }[character] ?? character));
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const now = new Date();
    const sameDay =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

    if (sameDay) {
        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
    });
}

function showToast(message: string): void {
    el.toast.textContent = message;
    el.toast.classList.add("visible");

    if (toastTimer !== undefined) {
        window.clearTimeout(toastTimer);
    }

    toastTimer = window.setTimeout(() => {
        el.toast.classList.remove("visible");
        toastTimer = undefined;
    }, 3600);
}

function setPage(page: Page): void {
    activePage = page;

    el.chatPage.classList.toggle("hidden", page !== "chat");
    el.settingsPage.classList.toggle("hidden", page !== "settings");

    document.querySelectorAll<HTMLButtonElement>(".nav-item").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    if (page === "chat") {
        requestAnimationFrame(() => {
            el.messages.scrollTop = el.messages.scrollHeight;
        });
    }
}

function connectionLabel(state: ZenvikClientState["connection"]): string {
    switch (state) {
        case "connected":
            return "Online";
        case "connecting":
            return "Connecting";
        case "error":
            return "Connection error";
        default:
            return "Offline";
    }
}

function setStatusClass(element: Element, state: ZenvikClientState["connection"]): void {
    element.className = `status-dot ${state}`;
}

function renderConversationList(state: ZenvikClientState): void {
    if (state.connection === "connecting" && state.conversations.length === 0) {
        el.conversationList.innerHTML = `
            <div class="list-placeholder">
                <span class="spinner"></span>
                Connecting…
            </div>
        `;
        return;
    }

    if (state.conversations.length === 0) {
        el.conversationList.innerHTML = `
            <div class="list-placeholder empty-list">
                <span>No conversations</span>
                <small>Create one with +</small>
            </div>
        `;
        return;
    }

    el.conversationList.innerHTML = state.conversations.map(conversation => {
        const unread = conversation.unread ?? 0;
        const selected = conversation.id === state.activeConversation;

        return `
            <button
                class="conversation ${selected ? "selected" : ""}"
                data-conversation="${escapeHtml(conversation.id)}"
                type="button"
            >
                <span class="conversation-hash">#</span>
                <span class="conversation-main">
                    <strong>${escapeHtml(conversation.name)}</strong>
                    ${
                        conversation.messages.length > 0
                            ? `<small>${escapeHtml(
                                conversation.messages[conversation.messages.length - 1]?.content ?? "",
                            )}</small>`
                            : `<small>No messages yet</small>`
                    }
                </span>
                ${unread > 0 ? `<span class="unread">${unread > 99 ? "99+" : unread}</span>` : ""}
            </button>
        `;
    }).join("");
}

function renderMessages(
    conversation: ZenvikClientState["conversations"][number] | undefined,
): void {
    if (!conversation) {
        el.messages.innerHTML = `
            <div class="welcome">
                <div class="welcome-logo">Z</div>
                <h2>Welcome to Zenvik</h2>
                <p>Pick a conversation from the sidebar, or create a new one.</p>
                <button id="welcome-new" class="primary small" type="button">
                    New conversation
                </button>
            </div>
        `;
        return;
    }

    if (conversation.messages.length === 0) {
        el.messages.innerHTML = `
            <div class="conversation-empty-state">
                <div class="empty-channel-icon">#</div>
                <h2>${escapeHtml(conversation.name)}</h2>
                <p>This conversation is empty. Send the first message.</p>
            </div>
        `;
        return;
    }

    const oldHeight = el.messages.scrollHeight;
    const wasNearBottom =
        oldHeight - el.messages.scrollTop - el.messages.clientHeight < 120;

    el.messages.innerHTML = conversation.messages.map(message => {
        const initial = message.author.username[0]?.toUpperCase() ?? "?";
        const own = client.getState().user?.id === message.author.id;

        return `
            <article class="message ${own ? "own" : ""}">
                <div class="message-avatar">${escapeHtml(initial)}</div>
                <div class="message-body">
                    <div class="message-meta">
                        <strong>${escapeHtml(message.author.username)}</strong>
                        <time datetime="${new Date(message.timestamp).toISOString()}">
                            ${formatTime(message.timestamp)}
                        </time>
                    </div>
                    <div class="message-content">
                        ${escapeHtml(message.content).replace(/\n/g, "<br>")}
                    </div>
                </div>
            </article>
        `;
    }).join("");

    if (wasNearBottom) {
        requestAnimationFrame(() => {
            el.messages.scrollTop = el.messages.scrollHeight;
        });
    }
}

function updateComposer(state: ZenvikClientState): void {
    const canSend =
        state.connection === "connected" &&
        state.activeConversation !== null;

    el.sendButton.disabled = !canSend;
    el.input.disabled = !canSend;

    if (state.connection === "connected") {
        el.input.placeholder = state.activeConversation
            ? "Write a message…"
            : "Select a conversation…";
    } else if (state.connection === "connecting") {
        el.input.placeholder = "Connecting to Zenvik…";
    } else {
        el.input.placeholder = "Connect to Zenvik to send a message…";
    }

    el.composerHint.textContent = state.settings.enterToSend
        ? "Enter to send · Shift + Enter for a new line"
        : "Enter for a new line";

    el.characterCount.textContent = `${el.input.value.length} / 4000`;
}

function render(state: Readonly<ZenvikClientState>): void {
    const connection = state.connection;

    setStatusClass(el.connectionDot, connection);
    setStatusClass(el.connectionPillDot, connection);
    setStatusClass(el.settingsStatusDot, connection);

    const label = connectionLabel(connection);

    el.connectionLabel.textContent = label;
    el.connectionText.textContent = label;
    el.settingsConnection.textContent = label;

    const username = state.user?.username ?? "Not connected";
    el.username.textContent = username;
    el.avatar.textContent = username[0]?.toUpperCase() ?? "?";

    renderConversationList(state);

    const conversation = state.conversations.find(
        item => item.id === state.activeConversation,
    );

    el.conversationTitle.textContent = conversation?.name ?? "Messages";
    el.conversationSymbol.textContent = conversation ? "#" : "Z";

    if (conversation) {
        const count = conversation.messages.length;
        el.conversationStatus.textContent =
            `${count} message${count === 1 ? "" : "s"}`;
    } else {
        el.conversationStatus.textContent = "Select a conversation";
    }

    renderMessages(conversation);
    updateComposer(state);

    el.themeSetting.value = state.settings.theme;
    el.enterSetting.checked = state.settings.enterToSend;
    el.notificationSetting.checked = state.settings.notifications;

    document.documentElement.dataset.theme = state.settings.theme;

    if (state.error && state.error !== lastError) {
        lastError = state.error;
        showToast(state.error);
    }

    if (!state.error) {
        lastError = null;
    }

    if (
        state.connection === "connected" &&
        previousConnection !== "connected"
    ) {
        showToast("Connected to the Zenvik server.");
    }

    previousConnection = state.connection;

    const currentMessageIds = new Set<string>();

    for (const item of state.conversations) {
        for (const message of item.messages) {
            currentMessageIds.add(message.id);
        }
    }

    if (previousMessageIds.size > 0 && state.settings.notifications) {
        for (const item of state.conversations) {
            for (const message of item.messages) {
                if (
                    currentMessageIds.has(message.id) &&
                    !previousMessageIds.has(message.id) &&
                    message.author.id !== state.user?.id &&
                    item.id !== state.activeConversation
                ) {
                    notifyNewMessage(item.name, message.author.username, message.content);
                }
            }
        }
    }

    previousMessageIds = currentMessageIds;
}

async function notifyNewMessage(
    conversationName: string,
    author: string,
    content: string,
): Promise<void> {
    if (!("Notification" in window)) {
        return;
    }

    if (Notification.permission === "default") {
        try {
            await Notification.requestPermission();
        } catch {
            return;
        }
    }

    if (Notification.permission === "granted") {
        new Notification(`${conversationName} · ${author}`, {
            body: content.slice(0, 160),
            silent: false,
        });
    }
}

async function updateNotificationPermission(): Promise<void> {
    if (!el.notificationSetting.checked) {
        return;
    }

    if (!("Notification" in window)) {
        showToast("Notifications are not supported in this browser.");
        return;
    }

    if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            client.updateSettings({ notifications: false });
            showToast("Notification permission was not granted.");
        }
    } else if (Notification.permission === "denied") {
        client.updateSettings({ notifications: false });
        showToast("Notifications are blocked by the browser.");
    }
}

function openModal(): void {
    el.modal.classList.remove("hidden");
    el.conversationName.value = "";

    requestAnimationFrame(() => {
        el.conversationName.focus();
    });
}

function closeModal(): void {
    el.modal.classList.add("hidden");
}

function createConversation(): void {
    const name = el.conversationName.value.trim();

    if (!name) {
        showToast("Give the conversation a name first.");
        el.conversationName.focus();
        return;
    }

    if (!client.createConversation(name)) {
        return;
    }

    closeModal();
}

function updateCharacterCount(): void {
    el.characterCount.textContent = `${el.input.value.length} / 4000`;
}

function resizeComposer(): void {
    el.input.style.height = "auto";
    el.input.style.height = `${Math.min(el.input.scrollHeight, 180)}px`;
}

document.addEventListener("click", event => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
        return;
    }

    const pageButton = target.closest<HTMLButtonElement>("[data-page]");

    if (pageButton) {
        const page = pageButton.dataset.page;

        if (page === "chat" || page === "settings") {
            setPage(page);
        }

        return;
    }

    const conversationButton =
        target.closest<HTMLButtonElement>("[data-conversation]");

    if (conversationButton?.dataset.conversation) {
        client.selectConversation(conversationButton.dataset.conversation);
        setPage("chat");
        return;
    }

    if (
        target.closest("#new-conversation") ||
        target.closest("#welcome-new")
    ) {
        openModal();
        return;
    }

    if (target.closest("#cancel-modal") || target.classList.contains("modal-backdrop")) {
        closeModal();
        return;
    }

    if (target.closest("#create-modal")) {
        createConversation();
        return;
    }

    if (target.closest("#disconnect")) {
        client.disconnect();
        return;
    }

    if (target.closest("#reconnect")) {
        const button = target.closest<HTMLButtonElement>("#reconnect");

        if (button) {
            button.disabled = true;
            button.textContent = "Connecting…";

            void client.connect()
                .catch(error => {
                    showToast(
                        error instanceof Error
                            ? error.message
                            : String(error),
                    );
                })
                .finally(() => {
                    button.disabled = false;
                    button.textContent = "Reconnect";
                });
        }

        return;
    }

    if (target.closest("#check-server")) {
        const button = target.closest<HTMLButtonElement>("#check-server");

        if (!button) {
            return;
        }

        button.disabled = true;
        button.textContent = "Checking…";

        void client.checkBackend()
            .then(ok => {
                showToast(
                    ok
                        ? "Server is reachable."
                        : "The backend is not reachable.",
                );
            })
            .finally(() => {
                button.disabled = false;
                button.textContent = "Check server";
            });

        return;
    }
});

el.composer.addEventListener("submit", event => {
    event.preventDefault();

    const content = el.input.value.trim();

    if (!content) {
        return;
    }

    if (client.sendMessage(content)) {
        el.input.value = "";
        updateCharacterCount();
        resizeComposer();
        el.input.focus();
    }
});

el.input.addEventListener("input", () => {
    updateCharacterCount();
    resizeComposer();
});

el.input.addEventListener("keydown", event => {
    if (
        event.key === "Enter" &&
        !event.shiftKey &&
        client.getState().settings.enterToSend
    ) {
        event.preventDefault();
        el.composer.requestSubmit();
    }
});

el.conversationName.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        createConversation();
    }

    if (event.key === "Escape") {
        closeModal();
    }
});

el.themeSetting.addEventListener("change", () => {
    const value = el.themeSetting.value;

    if (value === "dark" || value === "light") {
        client.updateSettings({ theme: value });
    }
});

el.enterSetting.addEventListener("change", () => {
    client.updateSettings({
        enterToSend: el.enterSetting.checked,
    });
});

el.notificationSetting.addEventListener("change", () => {
    client.updateSettings({
        notifications: el.notificationSetting.checked,
    });

    void updateNotificationPermission();
});

window.addEventListener("beforeunload", () => {
    // WebSocket cleanup is handled by the browser/Electron process.
});

client.subscribe(render);

void (async () => {
    try {
        const [config, platform] = await Promise.all([
            client.getConfig(),
            window.zenvik?.platform?.() ?? Promise.resolve(null),
        ]);

        el.serverUrl.textContent = config.websocketUrl;

        if (platform) {
            el.runtimeInfo.textContent =
                `${platform.platform} · ${platform.arch} · Electron ${platform.electron}`;
        } else {
            el.runtimeInfo.textContent =
                `Browser · ${window.location.hostname || "localhost"}`;
        }
    } catch {
        el.serverUrl.textContent = "Unavailable";
        el.runtimeInfo.textContent = "Runtime information unavailable";
    }
})();

void client.start().catch(error => {
    showToast(
        error instanceof Error
            ? error.message
            : "Unable to connect to Zenvik.",
    );
});
