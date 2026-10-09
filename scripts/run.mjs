import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const dev = process.argv.includes("--dev");
if (existsSync(".env")) process.loadEnvFile(".env");
const windows = process.platform === "win32";
const venvPython = path.resolve(
  ".venv",
  windows ? "Scripts/python.exe" : "bin/python",
);
const python = existsSync(venvPython)
  ? venvPython
  : windows
    ? "python"
    : "python3";
const args = [
  "-m",
  "uvicorn",
  "backend.main:app",
  "--host",
  "127.0.0.1",
  "--port",
  process.env.BACKEND_PORT || "8765",
];
if (dev) args.push("--reload", "--reload-dir", "backend");
const api = spawn(python, args, { stdio: "inherit", env: process.env });
const web = spawn(
  process.execPath,
  ["scripts/server.mjs", ...(dev ? ["--dev"] : [])],
  { stdio: "inherit", env: process.env },
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of [api, web]) {
    if (windows && child.pid)
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    else child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 300);
}
for (const child of [api, web]) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code || 0));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
