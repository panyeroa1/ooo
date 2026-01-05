export const appKnowledge = `
App name: Success Class.
Underlying technology: Orbit AI.
Purpose: Video conferencing for education with Orbit AI.
Stack: Next.js App Router, React, Orbit AI Components, Orbit AI Server SDK.

Core routes:
- /: landing page with Demo and Custom connection tabs.
- /rooms/[roomName]: main meeting room experience.
- /custom: connect to a custom Orbit AI server with a token.
- /docs: developer API documentation.

Primary UI:
- Main video grid (local camera + screen share tiles).
- Right sidebar with panels (Agent, Chat, Settings).
- Bottom control bar for mic, camera, screen share, chat, agent, settings, invite, leave.

Features:
- End-to-end encryption toggle on join.
- Screen sharing.
- Chat panel for in-room messages.
- Participants are managed by Orbit AI; room state is stored in session storage to restore on refresh.
- Optional recording endpoints if S3 settings are provided.

Server API routes:
- GET /api/connection-details: creates an Orbit AI participant token.
- POST /api/room/mute: host mute controls for remote tracks.
- POST /api/room/mute-all: mute all participants (host control).
- POST /api/room/remove: remove a participant.
- POST /api/agent: AI assistant via Orbit AI.
- GET /api/record/start and /api/record/stop: room recording controls.
`.trim();
