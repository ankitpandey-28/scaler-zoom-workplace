# Implementation notes for evaluation

The supplied brief permits AI development assistance, requires a Zoom-like UI, prohibits plagiarism from existing repositories, and expects the submitter to explain the implementation. This app was developed with AI assistance. The notes below identify the application-specific decisions to understand alongside the source code.

## Meeting creation and scheduling

`backend/database.py` generates an 11-digit ID with Python's `secrets` module and checks for a database collision. `backend/main.py` creates either an instant meeting at the current UTC time or a future scheduled meeting. The same meeting table supports both workflows; `kind` distinguishes them and `status` records their lifecycle. The invitation is a route containing the meeting ID, without session tokens or host capabilities.

The browser datetime picker uses local time, and the request supplies an explicit UTC timestamp. Pydantic rejects past or timezone-naive schedules, while both request validation and SQLite constrain duration to 15–480 minutes. Duration is scheduling metadata; it does not automatically terminate a call.

## Database design

The schema relates users, sessions, meetings, participants, and messages. A meeting belongs to a host account; attendance links each participant to a meeting and browser session, with an optional account identity for guests. Chat links messages to their participant and meeting. These relationships support account-specific meeting lists, host authorization, persisted attendance, and chat history.

SQLite connections enable foreign keys and use scoped transactions. Queries parameterize user data, and indexes support ownership, scheduling, attendance, and chat. Additive migrations preserve the earlier default-user data. Startup closes stale attendance and active meetings because in-memory sockets do not survive a restart.

## Authentication and host roles

`backend/security.py` implements salted PBKDF2-SHA256 password hashing and random HttpOnly session cookies. Authentication expires after one day or 30 days with Stay signed in. Successful login rotates the previous token; logout revokes it and disconnects its room sockets.

Host authority uses the authenticated account's ID and the meeting's `host_user_id`. Display names and invitations grant no host permissions. Guests can obtain a cookie-bound participant ticket for an open meeting without registering. A valid ticket, matching session, and open meeting are all required before the WebSocket is accepted.

## Media and signaling

`lib/useMeeting.ts` uses browser `RTCPeerConnection`, `getUserMedia`, and `getDisplayMedia` APIs. FastAPI relays SDP/ICE within a meeting and authorizes chat/participant/host messages; video/audio travels between browsers through WebRTC.

New joiners initiate connections. Offer collisions use deterministic polite/impolite peers, and ICE candidates wait until a remote description exists. Answerers reuse offered transceivers to avoid duplicate video tracks. Screen sharing replaces the outgoing video track while audio continues. Leaving, removal, sign-out, or an expired session releases browser capture tracks and peer connections.

This is a small-group mesh using one FastAPI worker. Room state is in memory; account/session/meeting/attendance/chat records persist in SQLite. Cross-network reliability can require TURN, and larger meetings would need a different media architecture.

## UI and the default-user note

The brief asks for Zoom's visual design. Application components and styles implement the public homepage, authentication screens, dashboard, reusable dialogs, and meeting room. Product artwork, icons, and fonts are identified in [asset attribution](REFERENCES.md); they are separate from the application logic.

The initial brief allows a default signed-in user. The user's subsequent request added login/signup, so creating/scheduling meetings requires sign-in, the demo shortcut exposes seeded data, and guests still join invitations without an account.

## Validation to demonstrate

Run the documented API and browser suites, then explain a complete create/join/schedule flow. The tests cover account isolation, schedule persistence, ticket/session checks, host controls, actual two-browser WebRTC video, chat, screen sharing, and cleanup after logout. Docker validation also checked a non-root healthy runtime and persistence across container recreation. See [validation](VALIDATION.md) for tested boundaries and [the assignment checklist](ASSIGNMENT_CHECKLIST.md) for remaining work.
