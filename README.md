# Zoom Workplace — Scaler Fullstack Assignment

An original Zoom-style video conferencing application built with **Next.js, TypeScript, FastAPI, SQLite, and WebRTC**. It includes a public marketing homepage, account signup/sign-in, a meeting dashboard, instant and scheduled meetings, guest invitations, live video/audio, chat, screen sharing, and host controls.

**Author:** Ankit Pandey

**Repository:** [ankitpandey-28/scaler-zoom-workplace](https://github.com/ankitpandey-28/scaler-zoom-workplace)

**Deployment:** deferred at the user's request. No deployment is performed by the setup commands below.

![Zoom-style public landing page](docs/images/landing-desktop.png)

## Quick start

Prerequisites: **Node.js 22+**, **Python 3.11+**, npm, and a current browser. Run commands from the repository root.

```sh
git clone https://github.com/ankitpandey-28/scaler-zoom-workplace.git
cd scaler-zoom-workplace
npm ci
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm run dev
```

macOS / Linux:

```sh
.venv/bin/python -m pip install -r backend/requirements.txt
npm run dev
```

Open **http://localhost:3000**. The launcher starts both Next.js and FastAPI and automatically selects `.venv`; activating the virtual environment is optional. SQLite is initialized and seeded at `backend/zoom.db` on first startup. No API keys or Zoom account are required.

Select **Sign In → Use demo account → Sign In** to explore the seeded workspace:

| Email | Password |
| --- | --- |
| `ankit.sharma@example.com` | `ZoomDemo123!` |

New accounts start with their own empty workspace. The default database has three scheduled meetings and two previous meetings for the demo account. Their times are relative to its first initialization.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Public Zoom-style homepage, product carousel/search, signup/sign-in and guest joining |
| `/signin` | Email-first login, password visibility, Stay signed in, demo account shortcut |
| `/signup` | Create an application account with name, email, and password |
| `/workplace` | Account dashboard; signed-out visitors see the welcome screen |
| `/meeting/{11-digit-id}` | Meeting details, display name/device preview, and live meeting |
| `/api/health` | Backend and SQLite availability check |

The public homepage remains accessible after signing in. **Open Workplace** opens the account dashboard. These are independent application accounts; real Zoom credentials do not work here.

## Implemented features

- Zoom-reference homepage with dark navigation, gradient hero, carousel, feature tabs, search, mobile navigation, FAQ, and self-hosted Inter/Newsreader fonts.
- Workplace dashboard with Home/Meetings navigation, account and settings menus, four meeting actions, daily agenda, upcoming meetings, recent meetings, and search.
- Account signup, sign-in, sign-out, expiring HttpOnly sessions, account-owned meetings, and anonymous guest joining.
- Instant meeting creation with a unique 11-digit ID, shareable invitation, and navigation to the room.
- Join by ID or invitation URL, choose a display name, preview devices, and validate missing/ended/cancelled meetings.
- Schedule topic, description, timezone-aware date/time, and duration; persist, copy invitations, and cancel upcoming meetings.
- Multi-participant WebRTC camera/audio, screen sharing, gallery/speaker layouts, raised hands, participants, persisted real-time chat, and attendance history.
- Host-authorized mute all, mute one participant, remove a participant, and end for everyone.
- Responsive desktop/tablet/mobile layouts, keyboard-accessible dialogs, focus trapping, and loading/error/empty states.

![Authenticated Workplace dashboard](docs/images/workplace-desktop.png)

## Try a complete meeting

1. Sign in with the demo account or create your own account.
2. Select **New Meeting**, enter the room, and allow camera/microphone access.
3. Copy the invitation and open it in an incognito window or another browser. Join with a guest display name.
4. Check video/audio, chat, raised hand, screen sharing, and the host's participant controls.
5. End the meeting for everyone. Return to Workplace to see its recent-meeting record.
6. Select **Schedule**, enter a future time and duration, save, and copy the generated invitation. Refresh to confirm persistence.

Incognito or another browser provides a separate session. Two ordinary tabs in the same browser share the same signed-in identity. Joining with devices off or unavailable is supported. Screen sharing needs the browser's capture permission.

## Configuration and local production mode

The defaults work without an `.env` file. To customize them, copy `.env.example` to `.env`; the launcher loads it automatically. See [configuration and future deployment](docs/DEPLOYMENT.md) for all variables.

```sh
npm run build
npm start
```

This serves the production build locally. Stop `npm run dev` before starting another server on the same ports. Use the root scripts rather than starting Next.js alone: the custom server proxies both REST and WebSockets to FastAPI.

For a local Docker installation with persistent SQLite storage:

```sh
docker compose up --build
```

The [Dockerfile](Dockerfile) packages both servers with a non-root runtime and a SQLite-backed health check. The image build, all 12 API tests inside the image, and all 7 browser tests against the running container passed. SQLite data also survived recreating the container with the same named volume. Stop other applications using port 3000 before starting Compose; see [Docker instructions](docs/DEPLOYMENT.md#docker-preparation) for direct build/run commands and alternate ports.

## Validation

```sh
npm run typecheck
.venv/bin/python -m unittest discover -s backend/tests -v
npm run build
npx playwright install chromium
# Start npm run dev or npm start in another terminal, then:
npm run test:e2e
```

On Windows, use `.\.venv\Scripts\python.exe` for the Python test command. Alternatively, activate `.venv` and run `npm run test:api`.

The production build, TypeScript check, **12 isolated API/WebSocket tests**, and **7 browser tests** passed. Browser tests cover accounts, persistence, responsive layouts, actual two-browser WebRTC video frames, chat, screen sharing, host controls, and logout across tabs. Fake camera/microphone devices are used. The suite creates accounts and meetings in the running server's database; point `DATABASE_PATH` at a separate test database when you want to preserve demo data.

See the [validation record](docs/VALIDATION.md) for evidence and test boundaries. Regenerate screenshots with `node scripts/capture.mjs` while the app is running; `TEST_BASE_URL` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select another local server or installed Chromium.

## Documentation

| Document | Contents |
| --- | --- |
| [Assignment checklist](docs/ASSIGNMENT_CHECKLIST.md) | Each PDF requirement, implementation evidence, completed work, and remaining submission items |
| [Architecture and database](docs/ARCHITECTURE.md) | Component responsibilities, schema relationships, meeting lifecycle, WebRTC, and authentication decisions |
| [API reference](docs/API.md) | REST endpoints, request/response examples, session rules, WebSocket messages, and errors |
| [Configuration and future deployment](docs/DEPLOYMENT.md) | Environment variables, local troubleshooting, Docker/hosting preparation, and deferred deployment |
| [Validation](docs/VALIDATION.md) | Build/API/browser checks, visual checks, and untested scenarios |
| [Implementation notes](docs/IMPLEMENTATION_NOTES.md) | Application decisions to understand and explain during evaluation |
| [Product references and asset attribution](docs/REFERENCES.md) | Zoom design references, included artwork, icon/font attribution, and technical documentation |
| [Screenshots](docs/SCREENSHOTS.md) | Landing, dashboard, sign-in, signup, and mobile previews |

## Source organization

```text
app/                   Next.js routes, layouts, and styles
components/            Landing, auth, dashboard, dialogs, meeting room, video tiles
lib/                   API/types and the WebRTC/media hook
backend/               FastAPI routes, security, SQLite schema/seed, room manager
backend/tests/         Isolated API, authentication, persistence, WebSocket tests
tests/                 Playwright account, landing, and meeting-flow tests
scripts/               Cross-platform launcher, HTTP/WebSocket proxy, captures
docs/                  Assignment checklist, architecture, API, validation, images
public/                Brand references, meeting artwork, fonts and font licenses
```

## Assumptions and limitations

The PDF originally permits a default signed-in user; explicit user follow-up requested login/signup, so hosting and scheduling now require an account. The demo shortcut keeps the seeded workspace easy to evaluate, and invitation guests need no account.

This is a small-group WebRTC mesh using **one FastAPI worker**. SQLite stores account/session/meeting/attendance/chat data; active signaling rooms stay in memory. A restart closes stale attendance and active meetings. Restrictive networks need a configured TURN relay. Camera and screen capture require localhost or HTTPS.

The application does not implement commercial Zoom OAuth/SSO, email/age verification, password recovery, recording, or a media-server-enforced mute. Exact pixel parity with every current Zoom screen has not been established. These boundaries and remaining checks are recorded in the assignment checklist.

The meeting workflows, account/session authorization, WebRTC signaling, and SQLite schema were implemented for this assignment. The brief permits AI assistance; [implementation notes](docs/IMPLEMENTATION_NOTES.md) explain the application decisions for evaluation. Zoom's wordmark and included artwork are attributed in [REFERENCES.md](docs/REFERENCES.md); fonts retain their license files. This educational project is not affiliated with Zoom.
