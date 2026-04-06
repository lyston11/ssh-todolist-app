import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version?: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version || "0.0.0"),
  },
  plugins: [react(), tailwindcss()],
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
});
