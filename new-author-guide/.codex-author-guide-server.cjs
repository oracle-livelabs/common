const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.argv[2] || 4190);
const routes = new Set(["/home", "/quickstart", "/cheatsheet", "/nodoc"]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".vtt": "text/vtt; charset=utf-8"
};

function sendFile(response, filePath) {
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

http.createServer((request, response) => {
  const requestPath = decodeURIComponent((request.url || "/").split("?")[0]).replace(/\/+$/, "") || "/";

  if (requestPath === "/") {
    response.writeHead(302, { Location: "/home", "Cache-Control": "no-cache" });
    response.end();
    return;
  }

  if (routes.has(requestPath)) {
    sendFile(response, path.join(root, "index.html"));
    return;
  }

  const target = path.resolve(root, "." + requestPath);
  if (target !== root && !target.startsWith(root + path.sep)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }
  sendFile(response, target);
}).listen(port, "127.0.0.1", () => {
  console.log("New Author Guide available at http://127.0.0.1:" + port + "/home");
});
