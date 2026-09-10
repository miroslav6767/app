import {
    client,
    type ZenvikClientState,
} from "../client.js";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
    throw new Error("Could not find #app.");
}

type Page = "chat" | "settings";

let activePage: Page = "chat";
let toastTimer: number | undefined;


/*  Markup */


app.innerHTML = `
    <div class="shell">

        <aside class="sidebar">

            <div class="brand">
                <div class="brand-mark">Z</div>

                <div>
                    <strong>Zenvik</strong>
                    <span>Desktop</span>
                </div>
            </div>

            <nav class="navigation" aria-label="Main navigation">
                <button
                    class="nav-item active"
                    data-page="chat"
                    type="button"
                >
                    <span aria-hidden="true">▣</span>
                    Messages
                </button>

                <button
                    class="nav-item"
                    data-page="settings"
                    type="button"
                >
                    <span aria-hidden="true">⚙</span>
                    Settings
                </button>
            </nav>

            <div class="sidebar-section">

                <div class="section-head">
                    <span>CONVERSATIONS</span>

                    <button
                        id="new-conversation"
                        type="button"
                        title="New conversation"
                        aria-label="New conversation"
                    >
                        +
                    </button>
                </div>

                <div
                    id="conversation-list"
                    class="conversation-list"
                ></div>

            </div>

            <div class="account">

                <div id="avatar" class="avatar">
                    ?
                </div>

                <div class="account-info">
                    <strong id="username">Not signed in</strong>
                    <span id="connection-label">Offline</span>
                </div>

                <button
                    id="disconnect"
                    class="icon-button"
                    type="button"
                    title="Disconnect"
                    aria-label="Disconnect"
                >
                    ↪
                </button>

            </div>

        </aside>

        <main class="content">

            <!-- CHAT ------------------------------------------------------- -->

            <section id="chat-page" class="page">

                <header class="topbar">

                    <div>
                        <h1 id="conversation-title">Messages</h1>
                        <span id="conversation-status">
                            Select a conversation
                        </span>
                    </div>

                    <div class="top-actions">
                        <span
                            id="connection-dot"
                            class="connection disconnected"
                            aria-hidden="true"
                        ></span>

                        <span id="connection-text">
                            Disconnected
                        </span>
                    </div>

                </header>

                <div id="messages" class="messages">

                    <div class="empty">
                        <div class="empty-icon">Z</div>

                        <h2>Welcome to Zenvik</h2>

                        <p>
                            Choose a conversation to start messaging.
                        </p>
                    </div>

                </div>

                <form id="composer" class="composer">

                    <textarea
                        id="message-input"
                        rows="1"
                        placeholder="Connect to Zenvik to send a message..."
                        aria-label="Message"
                    ></textarea>

                    <button
                        id="send-button"
                        type="submit"
                    >
                        Send
                    </button>

                </form>

            </section>


            <!-- SETTINGS -------------------------------------------------- -->

            <section
                id="settings-page"
                class="page hidden"
            >

                <header class="topbar">

                    <div>
                        <h1>Settings</h1>

                        <span>
                            Customize your Zenvik client
                        </span>
                    </div>

                </header>

                <div class="settings-card">

                    <label class="setting">

                        <span>
                            <strong>Theme</strong>

                            <small>
                                Choose the client appearance.
                            </small>
                        </span>

                        <select id="theme-setting">
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                        </select>

                    </label>


                    <label class="setting">

                        <span>
                            <strong>Enter sends messages</strong>

                            <small>
                                Press Enter to send instead of adding a new line.
                            </small>
                        </span>

                        <input
                            id="enter-setting"
                            type="checkbox"
                        >

                    </label>


                    <label class="setting">

                        <span>
                            <strong>Notifications</strong>

                            <small>
                                Allow desktop notification behavior when supported.
                            </small>
                        </span>

                        <input
                            id="notification-setting"
                            type="checkbox"
                        >

                    </label>


                    <div class="server-box">

                        <div>
                            <strong>Server</strong>
                            <span id="server-url">Loading...</span>
                        </div>

                        <button
                            id="reconnect"
                            class="secondary"
                            type="button"
                        >
                            Reconnect
                        </button>

                    </div>

                </div>

            </section>

        </main>

    </div>


    <div
        id="toast"
        class="toast"
        role="status"
        aria-live="polite"
    ></div>


    <div
        id="modal"
        class="modal hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-conversation-title"
    >

        <div class="modal-card">

            <h2 id="new-conversation-title">
                New conversation
            </h2>

            <p>
                Create a conversation on the Zenvik server.
            </p>

            <input
                id="conversation-name"
                maxlength="80"
                placeholder="Conversation name"
                autocomplete="off"
            >

            <div class="modal-actions">

                <button
                    id="cancel-modal"
                    class="secondary"
                    type="button"
                >
                    Cancel
                </button>

                <button
                    id="create-modal"
                    type="button"
                >
                    Create
                </button>

            </div>

        </div>

    </div>
`;

/* -------------------------------------------------------------------------- */
/*                              DOM utilities                                 */
/* -------------------------------------------------------------------------- */

function $<T extends Element>(selector: string): T {
    const element = document.querySelector<T>(selector);

    if (!element) {
        throw new Error(`Missing DOM element: ${selector}`);
    }

    return element;
}

/* -------------------------------------------------------------------------- */
/*                              DOM references                                */
/* -------------------------------------------------------------------------- */

const elements = {
    conversationList: $<HTMLDivElement>("#conversation-list"),
    messages: $<HTMLDivElement>("#messages"),

    input: $<HTMLTextAreaElement>("#message-input"),
    composer: $<HTMLFormElement>("#composer"),
    sendButton: $<HTMLButtonElement>("#send-button"),

    username: $<HTMLElement>("#username"),
    avatar: $<HTMLDivElement>("#avatar"),

    connectionLabel: $<HTMLSpanElement>("#connection-label"),
    connectionText: $<HTMLSpanElement>("#connection-text"),
    connectionDot: $<HTMLSpanElement>("#connection-dot"),

    conversationTitle: $<HTMLHeadingElement>("#conversation-title"),
    conversationStatus: $<HTMLSpanElement>("#conversation-status"),

    chatPage: $<HTMLElement>("#chat-page"),
    settingsPage: $<HTMLElement>("#settings-page"),

    themeSetting: $<HTMLSelectElement>("#theme-setting"),
    enterSetting: $<HTMLInputElement>("#enter-setting"),
    notificationSetting: $<HTMLInputElement>("#notification-setting"),

    serverUrl: $<HTMLSpanElement>("#server-url"),

    modal: $<HTMLDivElement>("#modal"),
    conversationName: $<HTMLInputElement>("#conversation-name"),

    toast: $<HTMLDivElement>("#toast"),
};

/*  Helper functions   */

function escapeHtml(value: string): string {
    return value.replace(
        /[&<>'"]/g,
        character =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;",
            })[character] ?? character,
    );
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function showToast(message: string): void {
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");

    if (toastTimer !== undefined) {
        window.clearTimeout(toastTimer);
    }

    toastTimer = window.setTimeout(() => {
        elements.toast.classList.remove("visible");
        toastTimer = undefined;
    }, 3500);
}

/*     Navigation      */

function setPage(page: Page): void {
    activePage = page;

    elements.chatPage.classList.toggle(
        "hidden",
        page !== "chat",
    );

    elements.settingsPage.classList.toggle(
        "hidden",
        page !== "settings",
    );

    document
        .querySelectorAll<HTMLButtonElement>(".nav-item")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.page === page,
            );
        });
}


/*         Conversation renderin  */

function renderConversationList(
    conversations: ZenvikClientState["conversations"],
    activeConversation: string | null,
): void {
    if (conversations.length === 0) {
        elements.conversationList.innerHTML = `
            <div class="conversation-empty">
                No conversations yet.
            </div>
        `;

        return;
    }

    elements.conversationList.innerHTML = conversations
        .map(conversation => {
            const selected =
                conversation.id === activeConversation;


            const unreadCount = conversation.unread ?? 0;

            const unread = unreadCount > 0
                ? `<span class="unread">${unreadCount}</span>`
                : "";

            return `
                <button
                    class="conversation ${selected ? "selected" : ""}"
                    data-conversation="${escapeHtml(conversation.id)}"
                    type="button"
                >
                    <span
                        class="conversation-icon"
                        aria-hidden="true"
                    >
                        #
                    </span>

                    <span class="conversation-name">
                        ${escapeHtml(conversation.name)}
                    </span>

                    ${unread}
                </button>
            `;
        })
        .join("");
}

/*   Message rendering  */

function renderMessages(
    conversation: ZenvikClientState["conversations"][number] | undefined,
): void {
    if (!conversation) {
        elements.messages.innerHTML = `
            <div class="empty">
                <div class="empty-icon">Z</div>

                <h2>Welcome to Zenvik</h2>

                <p>
                    Choose a conversation to start messaging.
                </p>
            </div>
        `;

        return;
    }

    if (conversation.messages.length === 0) {
        elements.messages.innerHTML = `
            <div class="empty">
                <div class="empty-icon">#</div>

                <h2>
                    ${escapeHtml(conversation.name)}
                </h2>

                <p>
                    No messages yet. Send the first one.
                </p>
            </div>
        `;

        return;
    }

    elements.messages.innerHTML = conversation.messages
        .map(message => {
            const initial =
                message.author.username[0]?.toUpperCase() ?? "?";

            return `
                <article class="message">

                    <div class="message-avatar">
                        ${escapeHtml(initial)}
                    </div>

                    <div class="message-body">

                        <div class="message-meta">

                            <strong>
                                ${escapeHtml(message.author.username)}
                            </strong>

                            <time>
                                ${formatTime(message.timestamp)}
                            </time>

                        </div>

                        <div class="message-content">
                            ${escapeHtml(message.content)
                                .replace(/\n/g, "<br>")}
                        </div>

                    </div>

                </article>
            `;
        })
        .join("");

    elements.messages.scrollTop =
        elements.messages.scrollHeight;
}

/*   Main renderer    */

function render(
    state: Readonly<ZenvikClientState>,
): void {
    const connected =
        state.connection === "connected";

    /* Connection */

    if (connected) {
        elements.connectionText.textContent = "Connected";
        elements.connectionLabel.textContent = "Online";
    } else if (state.connection === "connecting") {
        elements.connectionText.textContent = "Connecting...";
        elements.connectionLabel.textContent = "Connecting";
    } else {
        elements.connectionText.textContent = "Disconnected";
        elements.connectionLabel.textContent = "Offline";
    }

    elements.connectionDot.className =
        `connection ${state.connection}`;

    /* User  */

    const username =
        state.user?.username ?? "Not signed in";

    elements.username.textContent = username;

    elements.avatar.textContent =
        username[0]?.toUpperCase() ?? "?";

    /* Compose*/

    const canSend =
        connected &&
        state.activeConversation !== null;

    elements.sendButton.disabled = !canSend;
    elements.input.disabled = !canSend;

    elements.input.placeholder = connected
        ? "Write a message..."
        : "Connect to Zenvik to send a message...";

    /* Conversations */

    renderConversationList(
        state.conversations,
        state.activeConversation,
    );

    const conversation =
        state.conversations.find(
            item => item.id === state.activeConversation,
        );

    elements.conversationTitle.textContent =
        conversation?.name ?? "Messages";

    if (conversation) {
        const count = conversation.messages.length;

        elements.conversationStatus.textContent =
            `${count} message${count === 1 ? "" : "s"}`;
    } else {
        elements.conversationStatus.textContent =
            "Select a conversation";
    }

    renderMessages(conversation);

    /* Settings */

    elements.themeSetting.value =
        state.settings.theme;

    elements.enterSetting.checked =
        state.settings.enterToSend;

    elements.notificationSetting.checked =
        state.settings.notifications;

    document.documentElement.dataset.theme =
        state.settings.theme;

    /* Server  */

    void window.zenvik
        .getConfig()
        .then(config => {
            elements.serverUrl.textContent =
                config.websocketUrl;
        })
        .catch(() => {
            elements.serverUrl.textContent =
                "Unavailable";
        });

    /* Errors  */

    if (state.error) {
        showToast(state.error);
    }
}


/* Modal handling */

function openConversationModal(): void {
    elements.modal.classList.remove("hidden");

    elements.conversationName.value = "";

    window.setTimeout(() => {
        elements.conversationName.focus();
    }, 0);
}

function closeConversationModal(): void {
    elements.modal.classList.add("hidden");
}


/* Global click handler  */

document.addEventListener("click", event => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
        return;
    }

    /* Navigation */

    const pageButton =
        target.closest<HTMLButtonElement>("[data-page]");

    if (pageButton) {
        const page = pageButton.dataset.page;

        if (page === "chat" || page === "settings") {
            setPage(page);
        }

        return;
    }

    /* Conversation */

    const conversationButton =
        target.closest<HTMLButtonElement>(
            "[data-conversation]",
        );

    if (conversationButton) {
        const id =
            conversationButton.dataset.conversation;

        if (id) {
            client.selectConversation(id);
            setPage("chat");
        }

        return;
    }

    /* New conversation */

    if (target.closest("#new-conversation")) {
        openConversationModal();
        return;
    }

    if (target.closest("#cancel-modal")) {
        closeConversationModal();
        return;
    }

    /* Disconnect */

    if (target.closest("#disconnect")) {
        client.disconnect();
        return;
    }

    /* Reconnect  */

    if (target.closest("#reconnect")) {
        void client
            .connect()
            .catch(error => {
                showToast(
                    error instanceof Error
                        ? error.message
                        : String(error),
                );
            });

        return;
    }

    /* Create conversation */

    if (target.closest("#create-modal")) {
        const name =
            elements.conversationName.value.trim();

        if (!name) {
            showToast("Enter a conversation name.");
            elements.conversationName.focus();
            return;
        }

        const created =
            client.createConversation(name);

        if (!created) {
            showToast(
                "Could not create the conversation.",
            );

            return;
        }

        closeConversationModal();
        setPage("chat");
    }
});

/* Modal keyboard handling */

elements.modal.addEventListener("click", event => {
    if (event.target === elements.modal) {
        closeConversationModal();
    }
});

elements.conversationName.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            event.preventDefault();

            const name =
                elements.conversationName.value.trim();

            if (!name) {
                showToast(
                    "Enter a conversation name.",
                );

                return;
            }

            if (!client.createConversation(name)) {
                showToast(
                    "Could not create the conversation.",
                );

                return;
            }

            closeConversationModal();
            setPage("chat");
        }

        if (event.key === "Escape") {
            closeConversationModal();
        }
    },
);

/* Composer */

elements.composer.addEventListener(
    "submit",
    event => {
        event.preventDefault();

        const message =
            elements.input.value.trim();

        if (!message) {
            return;
        }

        if (client.sendMessage(message)) {
            elements.input.value = "";
            elements.input.style.height = "auto";
        }
    },
);

elements.input.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Enter" &&
            !event.shiftKey &&
            client.getState().settings.enterToSend
        ) {
            event.preventDefault();

            elements.composer.requestSubmit();
        }
    },
);

/* Automatic textarea sizing  */

elements.input.addEventListener(
    "input",
    () => {
        elements.input.style.height = "auto";

        elements.input.style.height =
            `${Math.min(
                elements.input.scrollHeight,
                180,
            )}px`;
    },
);

/* Settings */

elements.themeSetting.addEventListener(
    "change",
    () => {
        const theme =
            elements.themeSetting.value;

        if (theme !== "dark" && theme !== "light") {
            return;
        }

        client.updateSettings({
            theme,
        });
    },
);

elements.enterSetting.addEventListener(
    "change",
    () => {
        client.updateSettings({
            enterToSend:
                elements.enterSetting.checked,
        });
    },
);

elements.notificationSetting.addEventListener(
    "change",
    () => {
        client.updateSettings({
            notifications:
                elements.notificationSetting.checked,
        });
    },
);

/* Client initialization */

client.subscribe(render);

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
