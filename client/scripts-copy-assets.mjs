import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const project = join(dirname(fileURLToPath(import.meta.url)));
const source = join(project, "src", "web");
const destination = join(project, "dist", "web");
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
