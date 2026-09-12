import { client, type ZenvikClientState } from "../client.js";
import { playZenvikIntro } from "./animations/intro.js";

type Page = "messages" | "settings";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Zenvik: #app was not found.");

let page: Page = "messages";
let searchQuery = "";
let toastTimer: number | undefined;
let lastRenderedError: string | null = null;
let previousMessages = new Map<string, number>();

const icon = (name: string): string => {
    const icons: Record<string, string> = {
        messages: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.9 8.9 0 0 1-3.8-.8L4 20l1.4-3.3A7.2 7.2 0 0 1 4 12c0-4.1 3.6-7.5 8-7.5s8 3.1 8 7Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>`,

        settings: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/><path d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 1 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A2 2 0 0 0 1.6 11H1.5a2 2 0 1 1 0-4h.1a2 2 0 0 0 1.4-3.4l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A2 2 0 0 0 9.2 2.2V2a2 2 0 1 1 4 0v.2a2 2 0 0 0 3.4 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A2 2 0 0 0 20.8 7h.2a2 2 0 1 1 0 4h-.2a2 2 0 0 0-1.4 4Z"/></svg>`,

        plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,

        send: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7.3 18-3.9-8.1L2 9l19-6Z"/><path d="M10 12 21 3"/></svg>`,

        plug: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0V7ZM12 16v5"/></svg>`,

        search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>`,

        copy: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>`,

        refresh: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"/></svg>`,

        logout: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 8l4 4-4 4M18 12H9"/></svg>`,

        close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>`,

        check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`,

        chevron: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,

        shield: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 5.1-3.4 8.7-8 10-4.6-1.3-8-4.9-8-10V6l8-3Z"/><path d="m8.5 12 2.3 2.3 4.7-4.8"/></svg>`,
    };

    return icons[name] ?? "";
};

root.innerHTML = `
    <!-- ZENVIK INTRO -->
    <div id="zenvik-intro" class="zenvik-intro">
        <div class="intro-stage">

            <img
                id="intro-zenvik"
                class="intro-logo"
                src="./assets/zenvig.ico"
                alt="Zenvik"
            />

            <img
                id="intro-security"
                class="intro-logo"
                src="./assets/team.ico"
                alt="Zenvik Security Team"
            />

            <div id="intro-impact"></div>

            <div id="intro-final">
                <img
                    class="intro-logo"
                    src="./assets/zenvig.ico"
                    alt="Zenvik"
                />
            </div>

        </div>
    </div>

    <!-- APPLICATION -->
    <div class="app-shell">

        <aside class="sidebar">

            <div class="brand">
                <div class="brand-mark">Z</div>

                <div class="brand-copy">
                    <strong>Zenvik</strong>
                    <span>Private messaging</span>
                </div>
            </div>

            <div class="sidebar-search">
                <span class="search-icon">
                    ${icon("search")}
                </span>

                <input
                    id="conversation-search"
                    type="search"
                    placeholder="Search conversations"
                    autocomplete="off"
                    aria-label="Search conversations"
                >

                <kbd>⌘ K</kbd>
            </div>

            <nav class="main-nav" aria-label="Main navigation">

                <button
                    class="nav-item active"
                    data-page="messages"
                    type="button"
                >
                    <span class="nav-icon">
                        ${icon("messages")}
                    </span>
                    <span>Messages</span>
                </button>

                <button
                    class="nav-item"
                    data-page="settings"
                    type="button"
                >
                    <span class="nav-icon">
                        ${icon("settings")}
                    </span>
                    <span>Settings</span>
                </button>

            </nav>

            <div class="section-head">
                <span>Conversations</span>

                <button
                    id="new-conversation"
                    class="square-button"
                    type="button"
                    aria-label="New conversation"
                    title="New conversation"
                >
                    ${icon("plus")}
                </button>
            </div>

            <div
                id="conversation-list"
                class="conversation-list"
            ></div>

            <div class="sidebar-footer">

                <div class="profile-card">

                    <div
                        id="avatar"
                        class="avatar"
                    >
                        ?
                    </div>

                    <div class="profile-copy">

                        <strong id="username">
                            Not connected
                        </strong>

                        <span>
                            <i
                                id="connection-dot"
                                class="status-dot disconnected"
                            ></i>

                            <span id="connection-label">
                                Offline
                            </span>
                        </span>

                    </div>

                    <button
                        id="disconnect"
                        class="profile-action"
                        type="button"
                        title="Disconnect"
                        aria-label="Disconnect"
                    >
                        ${icon("logout")}
                    </button>

                </div>

            </div>

        </aside>

        <main class="main-content">

            <!-- MESSAGES -->

            <section
                id="messages-page"
                class="page"
            >

                <header class="topbar">

                    <div class="heading-group">

                        <div
                            id="conversation-symbol"
                            class="channel-icon"
                        >
                            Z
                        </div>

                        <div class="heading-copy">

                            <h1 id="conversation-title">
                                Messages
                            </h1>

                            <span id="conversation-status">
                                Choose a conversation to begin
                            </span>

                        </div>

                    </div>

                    <div class="topbar-actions">

                        <div
                            id="connection-pill"
                            class="connection-pill disconnected"
                        >
                            <i
                                id="connection-pill-dot"
                                class="status-dot disconnected"
                            ></i>

                            <span id="connection-text">
                                Offline
                            </span>
                        </div>

                    </div>

                </header>

                <div
                    id="messages"
                    class="messages"
                >

                    <div class="welcome-state">

                        <div class="welcome-mark">
                            Z
                        </div>

                        <span class="eyebrow">
                            Welcome to Zenvik
                        </span>

                        <h2>
                            Private conversations,<br>
                            without the clutter.
                        </h2>

                        <p>
                            Select a conversation from the sidebar
                            or create a new one to get started.
                        </p>

                        <button
                            id="welcome-new"
                            class="button primary"
                            type="button"
                        >
                            ${icon("plus")}
                            <span>New conversation</span>
                        </button>

                    </div>

                </div>

                <form
                    id="composer"
                    class="composer"
                >

                    <div class="composer-shell">

                        <textarea
                            id="message-input"
                            rows="1"
                            maxlength="4000"
                            placeholder="Select a conversation to start typing…"
                            autocomplete="off"
                            aria-label="Message"
                        ></textarea>

                        <div class="composer-meta">

                            <span id="composer-hint">
                                Enter to send · Shift + Enter for a new line
                            </span>

                            <span id="character-count">
                                0 / 4000
                            </span>

                        </div>

                    </div>

                    <button
                        id="send-button"
                        class="send-button"
                        type="submit"
                        disabled
                        aria-label="Send message"
                        title="Send message"
                    >
                        ${icon("send")}
                    </button>

                </form>

            </section>

            <!-- SETTINGS -->

            <section
                id="settings-page"
                class="page hidden"
            >

                <header class="topbar">

                    <div class="heading-copy">

                        <h1>
                            Settings
                        </h1>

                        <span>
                            Preferences for this Zenvik client.
                        </span>

                    </div>

                </header>

                <div class="settings-content">

                    <section class="settings-group">

                        <div class="settings-heading">
                            <span>Appearance</span>
                            <small>
                                Make Zenvik feel like yours.
                            </small>
                        </div>

                        <div class="settings-card">

                            <label class="setting-row">

                                <span>
                                    <strong>Theme</strong>
                                    <small>
                                        Choose the interface appearance.
                                    </small>
                                </span>

                                <select id="theme-setting">
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                </select>

                            </label>

                        </div>

                    </section>

                    <section class="settings-group">

                        <div class="settings-heading">
                            <span>Messaging</span>
                            <small>
                                Control the composer and notifications.
                            </small>
                        </div>

                        <div class="settings-card">

                            <label class="setting-row">

                                <span>
                                    <strong>Enter sends messages</strong>
                                    <small>
                                        Press Enter to send.
                                        Shift + Enter adds a new line.
                                    </small>
                                </span>

                                <input
                                    id="enter-setting"
                                    class="toggle"
                                    type="checkbox"
                                >

                            </label>

                            <label class="setting-row">

                                <span>
                                    <strong>Desktop notifications</strong>
                                    <small>
                                        Notify you when a new message
                                        arrives in another conversation.
                                    </small>
                                </span>

                                <input
                                    id="notification-setting"
                                    class="toggle"
                                    type="checkbox"
                                >

                            </label>

                        </div>

                    </section>

                    <section class="settings-group">

                        <div class="settings-heading">
                            <span>Server</span>
                            <small>
                                Connection details for this client.
                            </small>
                        </div>

                        <div class="settings-card server-card">

                            <div class="server-identity">

                                <div class="server-icon">
                                    ${icon("shield")}
                                </div>

                                <div>

                                    <strong id="settings-connection">
                                        Offline
                                    </strong>

                                    <code id="server-url">
                                        Loading…
                                    </code>

                                </div>

                            </div>

                            <div class="server-actions">

                                <button
                                    id="copy-server"
                                    class="button secondary"
                                    type="button"
                                >
                                    ${icon("copy")}
                                    <span>Copy address</span>
                                </button>

                                <button
                                    id="check-server"
                                    class="button secondary"
                                    type="button"
                                >
                                    ${icon("refresh")}
                                    <span>Check server</span>
                                </button>

                                <button
                                    id="reconnect"
                                    class="button primary"
                                    type="button"
                                >
                                    ${icon("plug")}
                                    <span>Reconnect</span>
                                </button>

                            </div>

                        </div>

                    </section>

                    <div class="client-footer">

                        <span>
                            Zenvik Client
                        </span>

                        <span id="runtime-info">
                            Loading runtime…
                        </span>

                    </div>

                </div>

            </section>

        </main>

    </div>

    <!-- TOAST -->

    <div
        id="toast"
        class="toast"
        role="status"
        aria-live="polite"
    ></div>

    <!-- MODAL -->

    <div
        id="modal"
        class="modal hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
    >

        <div class="modal-backdrop"></div>

        <div class="modal-card">

            <button
                id="close-modal"
                class="modal-close"
                type="button"
                aria-label="Close"
            >
                ${icon("close")}
            </button>

            <div class="modal-icon">
                #
            </div>

            <span class="eyebrow">
                Conversations
            </span>

            <h2 id="modal-title">
                Create a conversation
            </h2>

            <p>
                Give your new conversation a short,
                recognizable name.
            </p>

            <label
                class="field-label"
                for="conversation-name"
            >
                Name
            </label>

            <input
                id="conversation-name"
                maxlength="80"
                autocomplete="off"
                placeholder="e.g. General, Project, Friends"
            >

            <div class="modal-actions">

                <button
                    id="cancel-modal"
                    class="button secondary"
                    type="button"
                >
                    Cancel
                </button>

                <button
                    id="create-modal"
                    class="button primary"
                    type="button"
                >
                    ${icon("plus")}
                    <span>Create conversation</span>
                </button>

            </div>

        </div>

    </div>
`;

function $<T extends Element>(selector: string): T {
    const element = document.querySelector<T>(selector);

    if (!element) {
        throw new Error(`Zenvik: missing ${selector}`);
    }

    return element;
}

const el = {
    list: $<HTMLDivElement>("#conversation-list"),

    messages: $<HTMLDivElement>("#messages"),

    input: $<HTMLTextAreaElement>("#message-input"),

    composer: $<HTMLFormElement>("#composer"),

    send: $<HTMLButtonElement>("#send-button"),

    search: $<HTMLInputElement>("#conversation-search"),

    username: $<HTMLElement>("#username"),

    avatar: $<HTMLDivElement>("#avatar"),

    connectionDot: $<HTMLElement>("#connection-dot"),

    connectionPillDot: $<HTMLElement>("#connection-pill-dot"),

    connectionPill: $<HTMLDivElement>("#connection-pill"),

    connectionLabel: $<HTMLSpanElement>("#connection-label"),

    connectionText: $<HTMLSpanElement>("#connection-text"),

    settingsConnection: $<HTMLSpanElement>("#settings-connection"),

    title: $<HTMLHeadingElement>("#conversation-title"),

    status: $<HTMLSpanElement>("#conversation-status"),

    symbol: $<HTMLDivElement>("#conversation-symbol"),

    messagesPage: $<HTMLElement>("#messages-page"),

    settingsPage: $<HTMLElement>("#settings-page"),

    theme: $<HTMLSelectElement>("#theme-setting"),

    enter: $<HTMLInputElement>("#enter-setting"),

    notifications: $<HTMLInputElement>("#notification-setting"),

    serverUrl: $<HTMLElement>("#server-url"),

    runtime: $<HTMLElement>("#runtime-info"),

    toast: $<HTMLDivElement>("#toast"),

    modal: $<HTMLDivElement>("#modal"),

    name: $<HTMLInputElement>("#conversation-name"),

    count: $<HTMLSpanElement>("#character-count"),

    hint: $<HTMLSpanElement>("#composer-hint"),
};

function escapeHtml(value: string): string {
    return value.replace(
        /[&<>'"]/g,
        c =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;",
            })[c] ?? c,
    );
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const now = new Date();

    const sameDay =
        date.toDateString() === now.toDateString();

    return sameDay
        ? date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
          })
        : date.toLocaleDateString([], {
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

    toastTimer = window.setTimeout(
        () => el.toast.classList.remove("visible"),
        3200,
    );
}

function setPage(next: Page): void {
    page = next;

    el.messagesPage.classList.toggle(
        "hidden",
        next !== "messages",
    );

    el.settingsPage.classList.toggle(
        "hidden",
        next !== "settings",
    );

    document
        .querySelectorAll<HTMLButtonElement>(".nav-item")
        .forEach(button =>
            button.classList.toggle(
                "active",
                button.dataset.page === next,
            ),
        );

    if (next === "messages") {
        requestAnimationFrame(() => {
            el.messages.scrollTop =
                el.messages.scrollHeight;
        });
    }
}

function connectionName(
    state: ZenvikClientState["connection"],
): string {
    if (state === "connected") {
        return "Online";
    }

    if (state === "connecting") {
        return "Connecting";
    }

    if (state === "error") {
        return "Connection error";
    }

    return "Offline";
}

function renderConversationList(
    state: ZenvikClientState,
): void {
    const query = searchQuery.trim().toLowerCase();

    const conversations =
        state.conversations.filter(
            conversation =>
                !query ||
                conversation.name
                    .toLowerCase()
                    .includes(query),
        );

    if (
        state.connection === "connecting" &&
        state.conversations.length === 0
    ) {
        el.list.innerHTML = `
            <div class="list-state">
                <span class="spinner"></span>
                <span>Connecting…</span>
            </div>
        `;

        return;
    }

    if (conversations.length === 0) {
        el.list.innerHTML = query
            ? `
                <div class="list-state">
                    <strong>No matches</strong>
                    <span>Try a different search.</span>
                </div>
            `
            : `
                <div class="list-state">
                    <strong>No conversations yet</strong>
                    <span>Create one with +</span>
                </div>
            `;

        return;
    }

    el.list.innerHTML = conversations
        .map(conversation => {
            const unread =
                conversation.unread ?? 0;

            const selected =
                conversation.id ===
                state.activeConversation;

            const last =
                conversation.messages.at(-1);

            return `
                <button
                    class="conversation ${
                        selected ? "selected" : ""
                    }"
                    data-conversation="${escapeHtml(
                        conversation.id,
                    )}"
                    type="button"
                >

                    <span class="conversation-icon">
                        #
                    </span>

                    <span class="conversation-copy">

                        <strong>
                            ${escapeHtml(
                                conversation.name,
                            )}
                        </strong>

                        <small>
                            ${
                                last
                                    ? escapeHtml(
                                          last.content,
                                      )
                                    : "No messages yet"
                            }
                        </small>

                    </span>

                    ${
                        unread
                            ? `
                                <span class="unread">
                                    ${
                                        unread > 99
                                            ? "99+"
                                            : unread
                                    }
                                </span>
                            `
                            : ""
                    }

                    ${
                        selected
                            ? `
                                <span class="selected-mark">
                                    ${icon("check")}
                                </span>
                            `
                            : ""
                    }

                </button>
            `;
        })
        .join("");
}

function renderMessages(
    state: ZenvikClientState,
): void {
    const conversation =
        state.conversations.find(
            conversation =>
                conversation.id ===
                state.activeConversation,
        );

    if (!conversation) {
        el.messages.innerHTML = `
            <div class="welcome-state">

                <div class="welcome-mark">
                    Z
                </div>

                <span class="eyebrow">
                    Welcome to Zenvik
                </span>

                <h2>
                    Private conversations,<br>
                    without the clutter.
                </h2>

                <p>
                    Select a conversation from the sidebar
                    or create a new one to get started.
                </p>

                <button
                    id="welcome-new"
                    class="button primary"
                    type="button"
                >
                    ${icon("plus")}
                    <span>New conversation</span>
                </button>

            </div>
        `;

        return;
    }

    if (!conversation.messages.length) {
        el.messages.innerHTML = `
            <div class="empty-channel">

                <div class="empty-channel-icon">
                    #
                </div>

                <span class="eyebrow">
                    ${escapeHtml(
                        conversation.name,
                    )}
                </span>

                <h2>
                    A new conversation starts here.
                </h2>

                <p>
                    Send a message to start the conversation.
                </p>

            </div>
        `;

        return;
    }

    const wasNearBottom =
        el.messages.scrollHeight -
            el.messages.scrollTop -
            el.messages.clientHeight <
        140;

    const groups: string[] = [];

    let lastAuthor = "";
    let lastTime = 0;

    for (const message of conversation.messages) {
        const grouped =
            lastAuthor === message.author.id &&
            message.timestamp - lastTime <
                5 * 60 * 1000;

        const own =
            state.user?.id === message.author.id;

        groups.push(`
            <article
                class="message ${own ? "own" : ""} ${
                    grouped ? "grouped" : ""
                }"
            >

                ${
                    grouped
                        ? `<div class="message-gutter"></div>`
                        : `
                            <div class="message-avatar">
                                ${escapeHtml(
                                    message.author.username[0]?.toUpperCase() ??
                                        "?",
                                )}
                            </div>
                        `
                }

                <div class="message-body">

                    ${
                        grouped
                            ? ""
                            : `
                                <div class="message-meta">

                                    <strong>
                                        ${escapeHtml(
                                            message.author.username,
                                        )}
                                    </strong>

                                    <time
                                        datetime="${new Date(
                                            message.timestamp,
                                        ).toISOString()}"
                                    >
                                        ${formatTime(
                                            message.timestamp,
                                        )}
                                    </time>

                                </div>
                            `
                    }

                    <div class="message-content">
                        ${escapeHtml(
                            message.content,
                        ).replace(/\n/g, "<br>")}
                    </div>

                </div>

            </article>
        `);

        lastAuthor =
            message.author.id;

        lastTime =
            message.timestamp;
    }

    el.messages.innerHTML = `
        <div class="message-stream">
            ${groups.join("")}
        </div>
    `;

    if (wasNearBottom) {
        requestAnimationFrame(() => {
            el.messages.scrollTop =
                el.messages.scrollHeight;
        });
    }
}

function updateComposer(
    state: ZenvikClientState,
): void {
    const canSend =
        state.connection === "connected" &&
        state.activeConversation !== null;

    el.input.disabled = !canSend;

    el.send.disabled =
        !canSend ||
        !el.input.value.trim();

    el.input.placeholder =
        state.connection === "connected"
            ? state.activeConversation
                ? "Write a message…"
                : "Select a conversation…"
            : state.connection === "connecting"
              ? "Connecting to Zenvik…"
              : "Connect to Zenvik to send a message…";

    el.hint.textContent =
        state.settings.enterToSend
            ? "Enter to send · Shift + Enter for a new line"
            : "Enter for a new line";

    el.count.textContent =
        `${el.input.value.length} / 4000`;
}

function render(
    state: Readonly<ZenvikClientState>,
): void {
    const connection =
        state.connection;

    const label =
        connectionName(connection);

    [
        el.connectionDot,
        el.connectionPillDot,
    ].forEach(node => {
        node.className =
            `status-dot ${connection}`;
    });

    el.connectionPill.className =
        `connection-pill ${connection}`;

    el.connectionLabel.textContent =
        label;

    el.connectionText.textContent =
        label;

    el.settingsConnection.textContent =
        label;

    const username =
        state.user?.username ??
        "Not connected";

    el.username.textContent =
        username;

    el.avatar.textContent =
        username[0]?.toUpperCase() ??
        "?";

    const conversation =
        state.conversations.find(
            conversation =>
                conversation.id ===
                state.activeConversation,
        );

    el.title.textContent =
        conversation?.name ??
        "Messages";

    el.symbol.textContent =
        conversation ? "#" : "Z";

    el.status.textContent =
        conversation
            ? `${conversation.messages.length} ${
                  conversation.messages.length ===
                  1
                      ? "message"
                      : "messages"
              }`
            : "Choose a conversation to begin";

    renderConversationList(state);

    renderMessages(state);

    updateComposer(state);

    el.theme.value =
        state.settings.theme;

    el.enter.checked =
        state.settings.enterToSend;

    el.notifications.checked =
        state.settings.notifications;

    document.documentElement.dataset.theme =
        state.settings.theme;

    if (
        state.error &&
        state.error !== lastRenderedError
    ) {
        lastRenderedError =
            state.error;

        showToast(state.error);
    } else if (!state.error) {
        lastRenderedError = null;
    }

    void handleNewMessages(state);
}

async function handleNewMessages(
    state: Readonly<ZenvikClientState>,
): Promise<void> {
    const current =
        new Map<string, number>();

    let notification:
        | {
              conversation: string;
              author: string;
              content: string;
          }
        | null = null;

    for (const conversation of state.conversations) {
        for (const message of conversation.messages) {
            current.set(
                message.id,
                message.timestamp,
            );

            if (
                !previousMessages.has(
                    message.id,
                ) &&
                state.user?.id !==
                    message.author.id &&
                conversation.id !==
                    state.activeConversation
            ) {
                notification = {
                    conversation:
                        conversation.name,
                    author:
                        message.author.username,
                    content:
                        message.content,
                };
            }
        }
    }

    previousMessages =
        current;

    if (
        !notification ||
        !state.settings.notifications ||
        !("Notification" in window)
    ) {
        return;
    }

    if (
        Notification.permission ===
        "default"
    ) {
        try {
            await Notification.requestPermission();
        } catch {
            return;
        }
    }

    if (
        Notification.permission ===
        "granted"
    ) {
        new Notification(
            `${notification.conversation} · ${notification.author}`,
            {
                body:
                    notification.content.slice(
                        0,
                        160,
                    ),
                silent: false,
            },
        );
    }
}

function openModal(): void {
    el.modal.classList.remove(
        "hidden",
    );

    el.name.value = "";

    requestAnimationFrame(() =>
        el.name.focus(),
    );
}

function closeModal(): void {
    el.modal.classList.add(
        "hidden",
    );
}

function createConversation(): void {
    const name =
        el.name.value.trim();

    if (!name) {
        showToast(
            "Give the conversation a name.",
        );

        el.name.focus();

        return;
    }

    if (
        !client.createConversation(
            name,
        )
    ) {
        return;
    }

    closeModal();

    setPage("messages");
}

async function copyServerAddress(): Promise<void> {
    const value =
        el.serverUrl.textContent?.trim();

    if (
        !value ||
        value === "Loading…" ||
        value === "Unavailable"
    ) {
        showToast(
            "Server address is unavailable.",
        );

        return;
    }

    try {
        await navigator.clipboard.writeText(
            value,
        );

        showToast(
            "Server address copied.",
        );
    } catch {
        showToast(
            "Could not copy the server address.",
        );
    }
}

async function loadRuntimeInfo(): Promise<void> {
    try {
        const config =
            await client.getConfig();

        el.serverUrl.textContent =
            config.websocketUrl;

        if (window.zenvik?.platform) {
            const runtime =
                await window.zenvik.platform();

            el.runtime.textContent =
                `${runtime.platform} · ${runtime.arch} · Electron ${runtime.electron}`;
        } else {
            el.runtime.textContent =
                "Web client";
        }
    } catch {
        el.serverUrl.textContent =
            "Unavailable";

        el.runtime.textContent =
            "Runtime unavailable";
    }
}

document.addEventListener(
    "click",
    event => {
        const target =
            event.target;

        if (
            !(target instanceof HTMLElement)
        ) {
            return;
        }

        const pageButton =
            target.closest<HTMLButtonElement>(
                "[data-page]",
            );

        if (
            pageButton?.dataset.page ===
                "messages" ||
            pageButton?.dataset.page ===
                "settings"
        ) {
            setPage(
                pageButton.dataset.page,
            );

            return;
        }

        const conversation =
            target.closest<HTMLButtonElement>(
                "[data-conversation]",
            );

        if (
            conversation?.dataset
                .conversation
        ) {
            client.selectConversation(
                conversation.dataset
                    .conversation,
            );

            setPage("messages");

            el.input.focus();

            return;
        }

        if (
            target.closest(
                "#new-conversation",
            ) ||
            target.closest(
                "#welcome-new",
            )
        ) {
            openModal();

            return;
        }

        if (
            target.closest(
                "#cancel-modal",
            ) ||
            target.closest(
                "#close-modal",
            ) ||
            target.classList.contains(
                "modal-backdrop",
            )
        ) {
            closeModal();

            return;
        }

        if (
            target.closest(
                "#create-modal",
            )
        ) {
            createConversation();

            return;
        }

        if (
            target.closest(
                "#disconnect",
            )
        ) {
            client.disconnect();

            return;
        }

        if (
            target.closest(
                "#reconnect",
            )
        ) {
            void client
                .connect()
                .catch(error =>
                    showToast(
                        error instanceof Error
                            ? error.message
                            : String(error),
                    ),
                );

            return;
        }

        if (
            target.closest(
                "#check-server",
            )
        ) {
            const button =
                $<HTMLButtonElement>(
                    "#check-server",
                );

            button.disabled = true;

            void client
                .checkBackend()
                .then(ok =>
                    showToast(
                        ok
                            ? "Server is reachable."
                            : "The server is not reachable.",
                    ),
                )
                .finally(
                    () =>
                        (button.disabled =
                            false),
                );

            return;
        }

        if (
            target.closest(
                "#copy-server",
            )
        ) {
            void copyServerAddress();

            return;
        }
    },
);

el.search.addEventListener(
    "input",
    () => {
        searchQuery =
            el.search.value;

        render(
            client.getState(),
        );
    },
);

el.composer.addEventListener(
    "submit",
    event => {
        event.preventDefault();

        const value =
            el.input.value.trim();

        if (!value) {
            return;
        }

        if (
            client.sendMessage(
                value,
            )
        ) {
            el.input.value = "";

            el.input.style.height =
                "auto";

            updateComposer(
                client.getState(),
            );
        }
    },
);

el.input.addEventListener(
    "input",
    () => {
        el.input.style.height =
            "auto";

        el.input.style.height =
            `${Math.min(
                el.input.scrollHeight,
                180,
            )}px`;

        updateComposer(
            client.getState(),
        );
    },
);

el.input.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Enter" &&
            !event.shiftKey &&
            client.getState()
                .settings.enterToSend
        ) {
            event.preventDefault();

            el.composer.requestSubmit();
        }
    },
);

el.search.addEventListener(
    "keydown",
    event => {
        if (event.key === "Escape") {
            el.search.value = "";

            searchQuery = "";

            render(
                client.getState(),
            );

            el.search.blur();
        }
    },
);

el.theme.addEventListener(
    "change",
    () => {
        const value =
            el.theme.value;

        if (
            value === "dark" ||
            value === "light"
        ) {
            client.updateSettings({
                theme: value,
            });
        }
    },
);

el.enter.addEventListener(
    "change",
    () =>
        client.updateSettings({
            enterToSend:
                el.enter.checked,
        }),
);

el.notifications.addEventListener(
    "change",
    () =>
        client.updateSettings({
            notifications:
                el.notifications.checked,
        }),
);

el.name.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            event.preventDefault();

            createConversation();
        }

        if (event.key === "Escape") {
            closeModal();
        }
    },
);

document.addEventListener(
    "keydown",
    event => {
        const typing =
            event.target instanceof
                HTMLInputElement ||
            event.target instanceof
                HTMLTextAreaElement;

        if (
            (event.ctrlKey ||
                event.metaKey) &&
            event.key.toLowerCase() ===
                "k"
        ) {
            event.preventDefault();

            el.search.focus();
        } else if (
            event.key === "Escape" &&
            !typing &&
            !el.modal.classList.contains(
                "hidden",
            )
        ) {
            closeModal();
        }
    },
);

client.subscribe(render);

void loadRuntimeInfo();

void playZenvikIntro();

void (async () => {
    try {
        await client.start();
    } catch (error) {
        showToast(
            error instanceof Error
                ? error.message
                : "Unable to connect to Zenvik.",
        );
    }
})();