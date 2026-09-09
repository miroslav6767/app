import { createServer } from "node:http";

const PORT = 8080;

export function startWeb(): Promise<void> {
    return new Promise((resolve) => {
        const server = createServer((req, res) => {
            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8"
            });

            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Zenvik</title>
                </head>
                <body>
                    <h1>Zenvik</h1>
                    <p>Web server is running.</p>
                    <p>This is a test.</p>
                    <p>API: <a href="http://localhost:3000/api/status">
                        Check API status
                    </a></p>
                </body>
                </html>
            `);
        });

        server.listen(PORT, () => {
            console.log(`Web server running on http://localhost:${PORT}`);
            resolve();
        });
    });
}