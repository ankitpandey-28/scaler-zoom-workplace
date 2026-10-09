# Assignment coverage and submission status

Compared against `Scaler_SDE_Fullstack_Assignment_-_Zoom_Clone.pdf` supplied by the user. The PDF itself is not redistributed in this repository.

Core functional workflows are implemented and locally validated. Deployment is intentionally deferred. The visual design follows Zoom references, but exact pixel parity across every Zoom screen has not been established.

## Required stack and core features

| Brief requirement | Status | Implementation / evidence |
| --- | --- | --- |
| Next.js single-page frontend | Complete | App Router pages with client-side account/dashboard/meeting flows in `app/`, `components/`, and `lib/` |
| Python FastAPI or Django backend | Complete | FastAPI REST and WebSocket routes in `backend/main.py` |
| SQLite with an original schema | Complete | Five related tables, constraints, indexes, scoped transactions, WAL, additive migrations in `backend/database.py` |
| Zoom dashboard/homepage | Implemented; visual parity partial | Public homepage at `/`; meeting dashboard at `/workplace`; desktop/tablet/mobile captures provided |
| Profile/settings navigation placeholders | Complete | Account dropdown and settings modal in `components/Dashboard.tsx` |
| New Meeting, Join, Schedule buttons | Complete | Dashboard actions and reusable meeting dialogs |
| Upcoming meetings | Complete | Date-aware agenda and Meetings view, backed by account-specific API data |
| Recent meetings | Complete | Previous/attended meeting records and details |
| Create an instant meeting | Complete | Authenticated `POST /api/meetings` without `scheduled_at` |
| Unique meeting ID | Complete | Random 11-digit identifiers with database collision checks |
| Shareable invitation link | Complete | `/meeting/{id}` invitation, copy controls, and meeting information |
| Redirect to the new room | Complete | New Meeting navigates to the room/prejoin flow |
| Join with meeting ID or link | Complete | `parseMeetingId`, Join dialog, and direct invitation route |
| Display name before joining | Complete | Join dialog and device/name preview |
| Validate meeting existence | Complete | Backend 404 and ended/cancelled checks, with visible client errors |
| Schedule topic and description | Complete | Schedule dialog and validated API model |
| Date/time picker | Complete | Local datetime input converted to an explicit UTC timestamp |
| Duration | Complete | 15–480 minutes enforced by Pydantic and SQLite |
| Generate a scheduled invitation | Complete | Meeting creation returns `invite_path` |
| Persist scheduled meetings | Complete | SQLite storage; reload/persistence API and browser checks |
| Show scheduled meetings as upcoming | Complete | Home agenda and upcoming Meetings view |
| Seed sample data | Complete | Demo account plus three future/two previous meetings on first initialization |
| README with setup, stack, assumptions | Complete | Root README and linked technical documentation |
| Original work | Implemented | Application-specific meeting/account/signaling logic and schema; implementation decisions documented, included assets attributed |
| AI assistance and code understanding | AI assistance permitted; submitter preparation required | Developed with AI assistance; `docs/IMPLEMENTATION_NOTES.md` and architecture/source files support the required code explanation |

## Bonus requirements and requested additions

| Requirement | Status | Evidence |
| --- | --- | --- |
| Responsive mobile/tablet/desktop design | Complete in tested browsers | Visual checks at 1440/768/390px; landing overflow also checked at 320px |
| Login/signup | Complete | Account creation, email-first login, password hashing, expiring sessions, sign-out, account ownership |
| Host mute all / remove participant | Complete | Server-derived host authority and tested WebSocket commands |
| Zoom-style public landing page | Complete | Gradient hero, navigation, carousel, feature search/tabs, guest join, FAQ, account entry points |
| Live video/audio | Complete locally | Two independent browser sessions decoded actual WebRTC video frames |
| Screen sharing, chat, raised hand | Complete locally | Browser meeting-flow tests and persisted chat history |
| Docker packaging and local validation | Complete | Multi-stage image built; non-root/healthy container; 12 API and 7 browser tests passed; named-volume data survived container recreation |

The PDF's “No Login Required” note allowed a default user to simplify the assignment. The user's later instruction explicitly requested login/signup. The final version therefore requires sign-in for creating/scheduling meetings, provides a demo account shortcut, and allows guest invitation joining.

## Remaining work

| Item | State / next action |
| --- | --- |
| Exact Zoom appearance on every screen | Partial. Reference-based implementation and captures exist; no exhaustive pixel comparison against authenticated Zoom screens has been performed. |
| Public deployed application | Deferred by explicit user instruction. Hosting configuration is supplied; no live submission URL is available. |
| Durable hosted SQLite storage | Configure a persistent volume/disk when deployment is authorized. |
| Cross-network media validation | Local two-browser calls passed. Configure TURN and test independent networks before a public demonstration. |
| Active GitHub CI | An example is in `docs/ci-workflow.example.yml`; it is not an active workflow. The connected credential cannot publish workflow files. |

OAuth/SSO, email verification, password reset, cloud recording, an SFU, and paid Zoom products are outside the specified core features. They are not required to complete the core checklist above.

## Evaluation walkthrough

1. Start the app using the README and inspect the public homepage.
2. Use the demo account to see the sample upcoming and recent meetings.
3. Schedule a future meeting; copy the invitation and refresh the page.
4. Create an instant meeting; join the invitation in an incognito window.
5. Demonstrate real video/audio, chat, screen sharing, mute all, participant removal, and end for everyone.
6. Create a separate account and confirm its dashboard is isolated from the demo account.
7. Review `backend/database.py`, `backend/security.py`, `backend/main.py`, and `lib/useMeeting.ts` alongside the [implementation notes](IMPLEMENTATION_NOTES.md) and architecture/API documentation; be prepared to explain the code as the brief requires.

Deployment link: pending; deployment remains deferred.
