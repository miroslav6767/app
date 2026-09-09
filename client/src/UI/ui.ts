import { renderButtons } from "./buttons";

export function renderApp(): string {
    return `
        <main class="app">
            <header>
                <div>
                    <span class="eyebrow">CLIENT</span>
                    <h1>Zenvik</h1>
                    <p>Cross-platform client runtime</p>
                </div>
                <span id="status" class="status">Starting...</span>
            </header>

            <section class="card">
                <h2>Connection</h2>
                <p id="message">Checking the Zenvik backend...</p>
                <div class="actions">
                    ${renderButtons()}
                </div>
            </section>

            <section class="card">
                <h2>Output</h2>
                <pre id="output">Ready.</pre>
            </section>
        </main>
    `;
}
