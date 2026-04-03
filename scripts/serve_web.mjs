import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const port = Number(process.argv[2] ?? "4173");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const relativePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const resolvedPath = resolve(projectRoot, `.${relativePath}`);

  if (!resolvedPath.startsWith(projectRoot)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  if (!existsSync(resolvedPath) || !statSync(resolvedPath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": mimeTypes[extname(resolvedPath)] ?? "application/octet-stream",
  });
  createReadStream(resolvedPath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Focus List app available at http://127.0.0.1:${port}`);
});
