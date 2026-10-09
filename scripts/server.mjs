import http from "node:http";
import next from "next";
import httpProxy from "http-proxy";

const dev = process.argv.includes("--dev");
const port = Number(process.env.PORT || 3000);
const target =
  process.env.BACKEND_URL ||
  `http://127.0.0.1:${process.env.BACKEND_PORT || 8765}`;
const app = next({ dev, hostname: "0.0.0.0", port });
await app.prepare();
const handle = app.getRequestHandler();
const proxy = httpProxy.createProxyServer({ target, ws: true, xfwd: true });
proxy.on("error", (_error, _request, response) => {
  if (response && "writeHead" in response && !response.headersSent) {
    response.writeHead(502, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        detail: "Meeting service is starting. Please try again.",
      }),
    );
  } else response?.destroy();
});
const server = http.createServer((request, response) => {
  if (request.url?.startsWith("/api/")) proxy.web(request, response);
  else handle(request, response);
});
server.on("upgrade", (request, socket, head) => {
  if (request.url?.startsWith("/api/ws/")) proxy.ws(request, socket, head);
  else if (dev) app.getUpgradeHandler()(request, socket, head);
  else socket.destroy();
});
server.listen(port, "0.0.0.0", () =>
  console.log(`Zoom Workplace ready at http://localhost:${port}`),
);
