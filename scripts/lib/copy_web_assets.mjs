import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "../..");
const sources = ["index.html", "styles.css", "app.js", "frontend"];

export function copyWebAssets(outputDir) {
  rmSync(outputDir, { force: true, recursive: true });
  mkdirSync(outputDir, { recursive: true });

  for (const source of sources) {
    const from = resolve(projectRoot, source);
    const to = resolve(outputDir, source);

    if (!existsSync(from)) {
      throw new Error(`Missing source for web build: ${source}`);
    }

    cpSync(from, to, { recursive: true });
  }
}
