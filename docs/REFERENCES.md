# Product references and asset attribution

The Scaler brief requires studying Zoom's design, an original Next.js/Python/SQLite implementation, and an independently designed database schema. It permits AI development assistance and requires the submitter to understand and explain the code. Application code and schema were implemented for this assignment with AI assistance.

The meeting workflow, account/session logic, database access, room authorization, and WebRTC signaling live in this repository. See [implementation notes](IMPLEMENTATION_NOTES.md) and [architecture](ARCHITECTURE.md) for the decisions behind them.

## Product design references

- [Zoom public homepage](https://www.zoom.com/en/): navigation, gradient hero, typography, product-card layout, and responsive behavior. The landing page describes features implemented by this application.
- [Zoom web app](https://app.zoom.us/wc/), [Sign in](https://www.zoom.us/signin), and [Sign up](https://www.zoom.us/signup): welcome actions, auth layout, form styling, and account entry points. Registration and authentication use this app's own backend.
- [Zoom web app guidance](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0064261): left navigation, header/search, and meeting controls.

## Included assets

| Asset | Source / attribution |
| --- | --- |
| `public/zoom-logo.svg` | Zoom wordmark obtained from the official sign-in page |
| `public/zoom-signup-illustration.png` | [Zoom signup illustration](https://st1.zoom.us/fe-static/fe-signup-login-active-v3/assets/banner-step-1.DTtJ7nly.png) |
| `public/landing/meetings.jpg` | [Zoom homepage meeting artwork](https://st1.zoom.us/homepage/20260930-1234/primary/dist/assets/zoommedia/meetings.jpg) |
| `public/fonts/inter-latin.woff2` | [Inter](https://fonts.google.com/specimen/Inter); copyright and SIL Open Font License preserved in [inter-OFL.txt](../public/fonts/inter-OFL.txt) |
| `public/fonts/newsreader-latin.woff2` | [Newsreader](https://fonts.google.com/specimen/Newsreader); copyright and SIL Open Font License preserved in [newsreader-OFL.txt](../public/fonts/newsreader-OFL.txt) |
| Interface icons | Lucide through the `lucide-react` dependency; its package license notices apply |

Other landing previews use application HTML/CSS. The workspace uses system fonts; auth uses Helvetica/Arial fallbacks. Zoom's wordmark and artwork are product assets, and this project is not affiliated with Zoom.

## Technical documentation

- [MDN perfect negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation): offer collision handling and ICE sequencing.
- [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/): connection lifecycle and messaging APIs.
- [Next.js App Router](https://nextjs.org/docs/app): route/layout framework APIs.
- [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): PBKDF2-SHA256 work factor.
