import os from "node:os";

export type Platform = "windows" | "macos" | "linux" | "unknown";

export interface PlatformInfo {
    platform: Platform;
    arch: string;
    version: string;
}

export function getPlatform(): Platform {
    switch (process.platform) {
        case "win32": return "windows";
        case "darwin": return "macos";
        case "linux": return "linux";
        default: return "unknown";
    }
}

export function getPlatformInfo(): PlatformInfo {
    return {
        platform: getPlatform(),
        arch: os.arch(),
        version: os.release()
    };
}
