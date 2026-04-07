# Vyde

**Your place, together.**

Vyde is a no-signup, no-database peer-to-peer video calling app with watch parties, shared music, real-time chat, and theatre mode. Two users share a 6-character session code to connect.

---

## Features

- **Peer-to-peer video calls** - LiveKit WebRTC with adaptive bitrate (6 quality tiers)
- **Real-time chat** - PartyKit-powered, persists for session lifetime
- **Shared music queue** - YouTube, SoundCloud, or local audio file
- **Watch Party / Theatre Mode** - Shelflix embed or screen share, synced playback
- **Emoji reactions** - float-up animations synced to both users
- **Speaking indicator** - VAD ring with voice activity detection
- **Network quality indicator** - 4-bar signal display with auto-recovery
- **Draggable Picture-in-Picture** - snaps to corners with spring animation
- **Mobile-first** - works at 320px-2560px, touch drag PiP, screen wake lock
- **PWA** - installable, standalone display, theme-colored

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Video/Audio | LiveKit Cloud (WebRTC, simulcast VP9) |
| Realtime state | PartyKit (ephemeral, edge, 24h TTL) |
| UI | Tailwind CSS v4 + Framer Motion v11 |
| State | Zustand v5 |
| Code gen | nanoid (6-char custom alphabet) |
| Icons | lucide-react |
| Fonts | Syne + DM Sans (Google Fonts) |
| Deploy | Render (Node 20, Web Service) |

**No database. No auth. No user accounts.**

---

## How It Works

```
Host visits / -> clicks "Generate Call Code" -> nanoid(6) generates e.g. "X4K2PQ"
-> Room "vyde-X4K2PQ" created in PartyKit -> Host connects to LiveKit room
-> Host shares code "X4K2PQ" -> Guest enters code -> joins same room
-> Both connected. No server DB touched.
```

Session codes use a custom alphabet (ABCDEFGHJKLMNPQRSTUVWXYZ23456789) that excludes
ambiguous characters (0/O, 1/I).

---

## Getting Started

### Prerequisites

- Node.js 20+
- LiveKit Cloud account (livekit.io/cloud)
- PartyKit account (partykit.io)
- Twilio NTS account (optional, for TURN fallback)

### 1. Clone and Install

```bash
git clone https://github.com/your-username/vyde.git
cd vyde
npm install
```

### 2. Configure Environment

Copy .env.example to .env.local and fill in your credentials:

```bash
cp .env.example .env.local
```

```env
# LiveKit - from livekit.io/cloud dashboard
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud

# PartyKit - from partykit.io dashboard
NEXT_PUBLIC_PARTYKIT_HOST=your-project.username.partykit.dev

# Twilio NTS - optional TURN fallback
NEXT_PUBLIC_TURN_URL=turn:global.turn.twilio.com:3478?transport=udp
NEXT_PUBLIC_TURN_USER=your_turn_username
NEXT_PUBLIC_TURN_PASS=your_turn_credential

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Deploy PartyKit

```bash
npx partykit login
npx partykit deploy
```

Copy the deployed host URL and set it as NEXT_PUBLIC_PARTYKIT_HOST.

### 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| M | Toggle microphone |
| V | Toggle camera |
| C | Toggle chat panel |
| T | Toggle theatre mode |

---

## Project Structure

```
vyde/
+-- party/
|   +-- index.ts              # PartyKit server - all realtime logic
+-- src/
|   +-- app/
|   |   +-- layout.tsx        # Root layout
|   |   +-- globals.css       # Glass design system + Tailwind
|   |   +-- page.tsx          # Landing page
|   |   +-- call/[code]/
|   |   |   +-- page.tsx      # Main call page
|   |   +-- api/
|   |       +-- token/        # LiveKit JWT token endpoint
|   |       +-- health/       # Health check for Render
|   +-- components/
|   |   +-- call/             # Video canvas, controls, indicators
|   |   +-- features/         # Chat, music, watch party, reactions
|   |   +-- ui/               # Glass card, toasts, code entry
|   +-- lib/
|   |   +-- livekit.ts        # LiveKit room config + helpers
|   |   +-- partykit.ts       # PartyKit connection manager
|   |   +-- session.ts        # Code generation + validation
|   |   +-- streaming.ts      # Adaptive bitrate + ICE recovery
|   |   +-- utils.ts          # cn() utility
|   +-- store/
|   |   +-- call.ts           # Zustand: call state
|   |   +-- ui.ts             # Zustand: UI state
|   +-- types/
|       +-- index.ts          # Shared TypeScript types
+-- render.yaml               # Render deploy config
+-- partykit.json             # PartyKit config
+-- .env.example              # Environment variable template
```

---

## Deploying to Render

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial Vyde build"
git push origin main
```

### 2. Create Render Web Service

1. Go to render.com -> New -> Web Service
2. Connect your GitHub repo
3. Render auto-detects render.yaml - accept defaults
4. Add all environment variables from .env.local
5. Set NEXT_PUBLIC_APP_URL to your Render URL

### Keep-Alive (Free Tier)

Render free tier spins down after 15 minutes of inactivity. Add a UptimeRobot
monitor on /api/health with a 10-minute ping interval (free).

---

## Adaptive Bitrate

| Tier | Resolution | Max Bitrate | FPS |
|---|---|---|---|
| minimal | 160x90 | 80 kbps | 10 |
| low | 320x180 | 200 kbps | 15 |
| medium | 640x360 | 500 kbps | 24 |
| good | 854x480 | 900 kbps | 30 |
| high | 1280x720 | 1.5 Mbps | 30 |
| ultra | 1920x1080 | 2.5 Mbps | 30 |

- Downgrade: immediate on >5% packet loss or >200ms RTT
- Upgrade: after 3 consecutive clean samples + 4s cooldown
- Audio: never drops; uses DTX + RED (FEC) for packet loss recovery

---

## Design System

Dark glassmorphism - deep space purple midnight.

- Background: #0a0814
- Glass: rgba(255,255,255,0.06) + backdrop-filter: blur(24px)
- Accent: Purple #a78bfa, Blue #60a5fa, Pink #f472b6, Green #4ade80
- Fonts: Syne (headings) + DM Sans (body)

---

## License

MIT