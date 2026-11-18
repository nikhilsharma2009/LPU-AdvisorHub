const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const requested = decodeURIComponent((req.url || "/").split("?")[0]);
  const relative = requested.replace(/^[/\\]+/, "");
  const file = path.resolve(root, relative || "index.html");
  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (file !== root && !file.startsWith(rootPrefix)) { res.writeHead(403); res.end("Forbidden"); return; }
  fs.readFile(file, (error, contents) => {
    if (error) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); res.end(fs.readFileSync(path.join(root, "pages", "404.html"))); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(contents);
  });
});
const port = Number(process.env.PORT) || 5173;
server.listen(port, "127.0.0.1", () => console.log(`LPU-AdvisorHUB ready at http://localhost:${port}`));
