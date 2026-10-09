# Validation record

Validated on Windows with Node 22.17.1, Python 3.12, and Chromium using fake media devices.

- Next.js production build: passed.
- TypeScript typecheck: passed.
- Twelve isolated API/WebSocket tests: passed.
- Seven browser product tests: passed against the complete local production server.
- Docker image build: passed on Docker Desktop's Linux engine; container ran as the non-root `node` user and reported healthy.
- Docker API/browser validation: all 12 API tests passed inside the image, and all 7 browser tests passed against the container on local port 3002.
- Docker persistence: recreating the container with the same named volume retained accounts, meetings, attendance, and chat.
- Same-origin public HTTPS `/api/health`: returned SQLite status `ok` during verification. The temporary tunnel was subsequently stopped at the user’s request; deployment is deferred.
- Real WebRTC diagnostic: both peers reached `connected`; inbound video frames decoded on both peers (over 200 frames in the diagnostic call); audio/video tracks remained live.

The browser suite covers the public landing's carousel, feature tabs/search, guest join dialog, signup/sign-in, return to the public homepage while signed in, navigation to `/workplace`, wrong-password feedback, account details and sign-out, login persistence across reload, guest meeting validation, mobile/tablet overflow, scheduling/invitations, two independent browser sessions exchanging real video, chat, host mute-all, raised hand, screen share, host removal, and end-for-all. Signing out in another tab closes the host room and ends its captured media tracks.

The API suite verifies password hashing, normalized unique emails, password/name/email validation, HttpOnly/SameSite/Secure cookie attributes, session rotation/revocation/expiry, remembered login, login throttling, cross-origin rejection, account meeting isolation, ownership across login sessions, anonymous joining, host permissions, WebSocket ticket/session validation, schedule persistence/validation, removal/rejoin blocking, and attendance closure.

Visual checks compared the signed-out screen and auth header/form against Zoom's public screens and inspected desktop (1440px), tablet (768px), and mobile (390px) captures. The authenticated workspace follows Zoom's documented left navigation and meeting actions. Exact pixel parity with every authenticated Zoom screen has not been established. Signup is local account creation; commercial Zoom email/age verification and third-party SSO are not implemented.

The public homepage was added using Zoom's current marketing homepage as the reference, including measured headline typography, gradient styling, and card dimensions. Landing overflow checks passed at 1440px, 768px, 390px, and 320px. Signed-in users can still see the public homepage; the account dashboard now lives at `/workplace`.

Screenshots can be regenerated with `node scripts/capture.mjs` while the app is running. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an existing Chromium installation. The tracked [documentation screenshots](SCREENSHOTS.md) were regenerated against a separate local production server with a freshly seeded database; the primary local database was preserved. One Windows browser run encountered an unavailable fake camera; the final full suite passed with actual video frames in both directions.

The Docker image was validated locally; the disposable test container used its own database volume and did not alter the primary local database or other containers. Cross-network calls without a configured TURN relay were not tested. Deployment is deferred at the user’s request, and the temporary public preview has been stopped. The local production app remains available at http://localhost:3000. The repo includes a Render Blueprint and an optional GitHub Actions workflow template in `docs/ci-workflow.example.yml`. The connected GitHub credential does not have permission to publish active workflow files; copy the template to `.github/workflows/ci.yml` using your own workflow-enabled credential to enable CI.
