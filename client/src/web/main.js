async function request(path) {
    const response = await fetch(path);
    const data = await response.json();
    return data;
}

function setOutput(value) {
    document.querySelector("#output").textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

async function checkHealth() {
    const status = document.querySelector("#status");
    const message = document.querySelector("#message");
    status.textContent = "Checking...";
    try {
        const response = await fetch("/client/backend-health");
        const data = await response.json();
        status.textContent = data.ok ? "Online" : "Offline";
        message.textContent = data.ok ? "Connected to the Zenvik backend." : "Backend is not responding.";
        setOutput(data);
    } catch (error) {
        status.textContent = "Offline";
        message.textContent = "Could not reach the client service.";
        setOutput(String(error));
    }
}

document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const action = target.dataset.action;

    if (action === "health") {
        await checkHealth();
    }

    if (action === "platform") {
        try {
            const data = await request("/client/platform");
            setOutput(data);
        } catch (error) {
            setOutput(String(error));
        }
    }
});

void checkHealth();
