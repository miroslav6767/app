import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("zenvik", {
    platform: () => ipcRenderer.invoke("zenvik:platform"),
    getConfig: () => ipcRenderer.invoke("zenvik:config")
});
