import { app, BrowserWindow, ipcMain } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./core/config.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 780,
        minWidth: 900,
        minHeight: 600,
        backgroundColor: "#0b0d12",
        title: "Zenvik",
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(currentDir, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    void mainWindow.loadFile(join(currentDir, "web", "index.html"));

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

ipcMain.handle("zenvik:platform", () => ({
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    node: process.version
}));

ipcMain.handle("zenvik:config", () => ({
    backendUrl: config.backendUrl,
    websocketUrl: config.websocketUrl
}));

void app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
