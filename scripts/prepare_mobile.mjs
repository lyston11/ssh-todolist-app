import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const outputDir = resolve(projectRoot, "mobile/www");
const sources = ["index.html", "styles.css", "app.js", "frontend"];

rmSync(outputDir, { force: true, recursive: true });
mkdirSync(outputDir, { recursive: true });

for (const source of sources) {
  const from = resolve(projectRoot, source);
  const to = resolve(outputDir, source);

  if (!existsSync(from)) {
    throw new Error(`Missing source for mobile build: ${source}`);
  }

  cpSync(from, to, { recursive: true });
}

console.log(`Prepared mobile web assets in ${outputDir}`);
