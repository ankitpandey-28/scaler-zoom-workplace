# Configuration, local operation, and future deployment

Deployment is deferred at the user's request. This document describes the supplied configuration and the work to perform when deployment is authorized. No live hosting resource, public tunnel, or deployment workflow is enabled by this documentation change.

## Environment variables

Copy `.env.example` to `.env` if customization is needed. `scripts/run.mjs` reads `.env`; existing process environment values take precedence. Keep `.env` outside version control.

| Variable | Default / use |
| --- | --- |
| `PORT` | `3000`, public Next.js/custom-server port |
| `BACKEND_PORT` | `8765`, internal FastAPI listener on `127.0.0.1` |
| `BACKEND_URL` | Normally derived from `BACKEND_PORT`; `.env.example` explicitly supplies `http://127.0.0.1:8765`. Update or remove it when changing the backend port. |
| `DATABASE_PATH` | `backend/zoom.db` locally; `/app/storage/zoom.db` in Docker |
| `FRONTEND_ORIGINS` | Comma-separated origins for FastAPI CORS/WebSocket checks; defaults to localhost/127.0.0.1 on port 3000 |
| `TURN_URL` | Optional TURN relay URL, such as `turn:relay.example.com:3478` |
| `TURN_USERNAME` | Optional configured relay username |
| `TURN_CREDENTIAL` | Optional configured relay credential |
| `NODE_ENV` | `production` for the Docker runtime |
| `TEST_BASE_URL` | Browser tests/captures, default `http://localhost:3000` |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE` | Optional path to an existing Chromium executable |

The browser needs no separate API base URL. Requests and cookies stay on the frontend origin. Forwarded host/protocol headers let the backend validate origins and set Secure cookies behind the custom proxy.

## Local development and production

Use the README quick start, then `npm run dev`. For the production build, stop the dev process and run:

```sh
npm run build
npm start
```

Both commands serve the local application; neither publishes it. The launcher manages FastAPI and the Node web server together. Start from the repository root so relative database/config paths resolve consistently.

### Isolated test or screenshot data

API unit tests create temporary SQLite databases automatically. Browser tests run against a live server and create persistent data. For isolated browser tests or clean seeded screenshots, set a separate database path before starting that server.

Windows PowerShell:

```powershell
$env:DATABASE_PATH = 'artifacts/browser-test.db'
npm start
```

macOS / Linux:

```sh
DATABASE_PATH=artifacts/browser-test.db npm start
```

The new database seeds on first start without altering `backend/zoom.db`. Reusing its path reuses its data. An alternate simultaneous server must have its own `PORT`, `BACKEND_PORT`, matching `BACKEND_URL`, and `FRONTEND_ORIGINS`.

### Troubleshooting

| Symptom | Check / action |
| --- | --- |
| PowerShell blocks virtualenv activation | Activation is optional. Invoke `.\.venv\Scripts\python.exe -m pip ...` directly. |
| Python cannot import FastAPI | Install `backend/requirements.txt` using the same `.venv` interpreter selected by the launcher. |
| Port already in use | Stop the earlier local app, or choose matching alternate port/origin values. |
| `/api/*` returns 502 | Wait for FastAPI startup and inspect its terminal output; verify `BACKEND_URL` matches `BACKEND_PORT`. |
| Playwright executable is missing | Run `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. |
| Devices are blocked/unavailable | Allow browser permissions; the room can still be joined with audio/video off. Use localhost or HTTPS for capture. |
| Participants join but media cannot connect | Check browser/network permissions and configure TURN for restrictive networks. |
| Demo upcoming meetings look old | Seed times are relative to the database's first initialization. Use a separate new `DATABASE_PATH` for a fresh demo; preserve your existing database. |
| Meetings disappear after changing configuration | Confirm the intended `DATABASE_PATH`; a different path creates a separate database. |

## Docker preparation

`Dockerfile` uses a separate build stage for Next.js, installs Python requirements, and runs the complete stack as the non-root `node` user behind one public port. Development npm dependencies are removed from the runtime image. Next.js telemetry is disabled; Python output is unbuffered for container logs. The container health check calls `/api/health`, which checks SQLite as well as the backend.

`docker-compose.yml` maps port 3000 and mounts a named volume at `/app/storage` for SQLite persistence. Stop other applications using port 3000 before starting it.

```sh
docker compose up --build
```

Alternatively, build and run the Dockerfile directly:

```sh
docker build -t scaler-zoom-workplace .
docker run --rm --name scaler-zoom-workplace -p 127.0.0.1:3000:3000 --mount source=scaler-zoom-data,target=/app/storage scaler-zoom-workplace
```

Open `http://localhost:3000`. This is a local container, with its own persistent SQLite volume. To use a different host port, change the first `3000` in the port mapping (for example, `127.0.0.1:3002:3000`). See logs with `docker logs scaler-zoom-workplace`; inspect health with `docker inspect --format '{{.State.Health.Status}}' scaler-zoom-workplace`. For Compose, use `docker compose logs` and `docker compose ps`.

The Docker image was built successfully on Docker Desktop's Linux engine. All 12 API tests passed inside the image, and all 7 browser tests passed against a locally running container on port 3002. The non-root runtime and container health check passed. Recreating the container with the same named volume preserved accounts, meetings, attendance, and chat. Keep one FastAPI worker/one app instance: room signaling is held in memory.

## When deployment is authorized

The repository includes `render.yaml` as a future Docker service example. Review the chosen hosting account, its current plan/storage options, and configuration at that time. The supplied example specifies a free service and does not attach a persistent disk; it must not be treated as durable SQLite storage.

1. Build and run the Docker image locally.
2. Use an authorized hosting account with a Docker service supporting persistent storage and WebSocket upgrades.
3. Mount persistent storage at `/app/storage` and set `DATABASE_PATH=/app/storage/zoom.db`.
4. Use the service's public `PORT`, HTTPS origin in `FRONTEND_ORIGINS`, and `/api/health` for its health check.
5. Configure TURN if needed and keep its credentials in the hosting environment.
6. Verify signup, account isolation, invitation links, scheduling persistence, and two browsers on independent networks.
7. Record the deployed HTTPS URL in the README/submission once it exists.

A static-only frontend deployment does not run the Python backend or its long-lived room sockets. Keep SQLite's database/sidecar files, virtualenvs, secrets, local artifacts, and dependencies out of Git. For backups, use a consistent SQLite backup rather than copying only the main file while WAL writes are active.

## Optional CI

`docs/ci-workflow.example.yml` checks API tests, production build, and browser flows on a disposable runner. It does not deploy. It is intentionally stored as a template rather than an active `.github/workflows/` file because the connected credential cannot publish active workflow files.

When using a workflow-enabled credential later, copy it to `.github/workflows/ci.yml` and review the action versions before enabling it. Repository publication and application deployment are separate steps; publishing code alone does not create a live app.
