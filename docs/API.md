# API reference

Use the app's origin, for example `http://localhost:3000`. The Node server proxies `/api/*` and `/api/ws/*` to FastAPI. JSON REST requests use `Content-Type: application/json`; browser requests include cookies. There are no bearer tokens or credentials in invitation URLs.

FastAPI's interactive schema is available locally at `http://127.0.0.1:8765/docs`, with OpenAPI JSON at `/openapi.json` on that internal backend port. The custom public proxy forwards `/api/*`, so `/docs` at the frontend origin is not that schema endpoint.

## REST endpoints

| Method | Path | Access | Successful result |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | 200, `{ "status": "ok", "database": "sqlite" }` |
| POST | `/api/auth/signup` | Public | 201, account object and session cookie |
| POST | `/api/auth/login` | Public | 200, account object and rotated session cookie |
| POST | `/api/auth/logout` | Current/guest session | 204, revoked cookie and room disconnects |
| GET | `/api/me` | Signed in | 200, account object |
| GET | `/api/meetings` | Signed in | 200, array of owned/attended meetings ordered by schedule |
| POST | `/api/meetings` | Signed in | 201, created meeting |
| GET | `/api/meetings/{id}` | Public invitation | 200, meeting object; guest cookie issued if needed |
| DELETE | `/api/meetings/{id}` | Owning account | 204, upcoming meeting marked cancelled |
| POST | `/api/meetings/{id}/join` | Account or guest | 200, cookie-bound participant ticket |
| GET | `/api/rtc-config` | Public | 200, browser `iceServers` configuration |

## Account requests

Signup:

```json
{
  "display_name": "Priya Shah",
  "email": "priya@example.com",
  "password": "MeetingDemo123!",
  "remember": false
}
```

Login uses `email`, `password`, and optional `remember` (defaults to `false`). Emails are trimmed/lowercased and validated; duplicate signup emails return 409. Display names are trimmed, nonempty, and at most 60 characters. Signup passwords must contain at least eight characters, uppercase/lowercase letters, and a number; maximum length is 128.

Signup/login and `/api/me` return an account object without its password hash:

```json
{ "id": 2, "display_name": "Priya Shah", "email": "priya@example.com" }
```

The `zoom_session` cookie is HttpOnly, SameSite=Lax, path `/`, and Secure on HTTPS. Expiry is one day or 30 days with `remember=true`. Wrong credentials return 401; ten failed attempts within a minute for the same IP/email trigger 429. Signed-out/expired access to authenticated routes returns 401.

## Create a meeting

Instant meeting:

```json
{ "title": "Design sync", "duration_minutes": 30 }
```

An empty object also creates an instant meeting with the account's default title. Schedule by supplying a future timezone-aware `scheduled_at`:

```json
{
  "title": "Weekly review",
  "description": "Review the next release.",
  "scheduled_at": "2030-01-15T10:00:00+05:30",
  "duration_minutes": 45
}
```

| Field | Validation / default |
| --- | --- |
| `title` | Optional; nonblank when supplied, at most 120 characters; defaults to the host's meeting title |
| `description` | Optional, default empty, at most 2,000 characters |
| `scheduled_at` | Optional; a timezone-aware future datetime; omitted means instant |
| `duration_minutes` | Optional, default 30; integer from 15 through 480 |

An illustrative meeting response:

```json
{
  "id": "12345678901",
  "host_user_id": 2,
  "host_name": "Priya Shah",
  "title": "Design sync",
  "description": "",
  "scheduled_at": "2030-01-15T04:30:00+00:00",
  "duration_minutes": 30,
  "kind": "instant",
  "status": "scheduled",
  "created_at": "2030-01-15T04:30:00+00:00",
  "started_at": null,
  "ended_at": null,
  "is_host": true,
  "invite_path": "/meeting/12345678901"
}
```

IDs are strings of 11 digits. `is_host` depends on the requesting account, and `host_session` is never returned. The list adds `participant_count`, a count of attendance/join records, not live sockets. Meeting times are stored as UTC ISO timestamps. A created meeting becomes active only when its first valid room socket connects; cancellation retains the record with `status=cancelled`.

## Join a room

```http
POST /api/meetings/12345678901/join
Content-Type: application/json
```

```json
{ "display_name": "Guest reviewer" }
```

Response:

```json
{
  "participant_id": "server-generated-ticket",
  "is_host": false,
  "display_name": "Guest reviewer"
}
```

Use the same cookie to connect to `/api/ws/12345678901/server-generated-ticket`. A ticket from a different session, a removed participant, or an ended/cancelled room is rejected. Display names use the same nonempty/60-character limit. The browser's media preferences are sent over the WebSocket after joining, rather than in this REST body.

## WebSocket protocol

Connect to `ws://localhost:3000/api/ws/{meeting_id}/{participant_id}` locally, or `wss://` on a future HTTPS deployment. Payloads are JSON objects. The server validates ticket/session/room membership before accepting the connection, and checks the session again on incoming messages. Rejection/removal/session expiry uses close code 1008; ending a meeting closes its sockets with code 1000.

Client to server:

| `type` | Other fields | Effect |
| --- | --- | --- |
| `signal` | `to`, `payload: {description}` or `{candidate}` | Relay SDP/ICE to a different connected participant in this room |
| `media` | Optional booleans `audio`, `video`, `sharing`, `hand` | Update participant state and broadcast it |
| `chat` | `body` | Persist/broadcast trimmed text, 1–2,000 characters |
| `mute-all` | None | Host requests mute for all non-host participants |
| `mute` | `target` participant ID | Host requests mute for that non-host participant |
| `remove` | `target` participant ID | Host removes that non-host participant and blocks the session/account from rejoining |
| `end` | None | Host ends the room for everyone |
| `ping` | None | Receive `pong` |

Server to client:

| `type` | Fields / meaning |
| --- | --- |
| `welcome` | `self`, current `participants`, latest `messages` (up to 100) |
| `participant-joined` | `participant` |
| `participant-updated` | `participant` with current media/hand state |
| `participant-left` | `id` |
| `signal` | `from`, `payload` |
| `chat` | `message` with ID, body, timestamp, participant ID, and display name |
| `force-mute` | Receiving browser disables its audio track |
| `removed` | Receiving browser leaves and releases media |
| `ended` | All browsers leave and release media |
| `session-expired` | Session is no longer valid; browser closes the room |
| `error` | `message`, such as unauthorized host action or oversized input |
| `pong` | Keepalive response |

Participant objects contain `id`, `display_name`, `is_host`, `audio`, `video`, `sharing`, and `hand`. Private session tokens are excluded. Raw socket messages above 100,000 characters return an error; malformed JSON/nonobject payloads and invalid chat payloads are ignored.

## Errors

| Status | Typical cause |
| --- | --- |
| 401 | Sign-in required, expired session, or wrong credentials |
| 403 | Cross-origin mutation, non-host cancellation, or removed visitor trying to rejoin |
| 404 | Meeting ID does not exist |
| 409 | Duplicate account email, ended/cancelled room, or cancelling a non-upcoming meeting |
| 422 | Pydantic field validation, including invalid/past/naive schedule times |
| 429 | Login attempt limit reached |
| 502 | Node proxy cannot reach the backend, often while it starts |

Application errors use `{ "detail": "message" }`. Validation errors use FastAPI's `detail` array. Client `ApiError` preserves the HTTP status and shows the returned message.
