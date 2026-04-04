import { resolve } from "node:path";

import { copyWebAssets } from "./lib/copy_web_assets.mjs";

const outputDir = resolve(process.cwd(), "dist");

copyWebAssets(outputDir);

console.log(`Built web assets in ${outputDir}`);
