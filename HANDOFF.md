# OpenMix V1 — IDE Handoff Document
> **Last updated:** 2026-03-25 | **Branch:** `main` | **Remote:** `https://github.com/papingothegamer/openmix-v1`

---

## 1. Project Overview

**OpenMix** is an open-source, browser-based digital mixing controller for live audio setups. It targets Behringer/Midas rack mixers (XR18, X32, M32, WING) over a local Wi-Fi network using the **OSC** (Open Sound Control) protocol.

The system has two user roles:
- **FOH Engineer** — Full console access. Channel EQ, Sends, Routing, Scribble Strips, Scene Export/Import.
- **Musician** — Fader-only sandbox view of a specific AUX monitor mix. Protected by strict backend OSC routing guards.

Communication flow:
```
[Browser Frontend] ←── WebSocket (Socket.io) ──→ [Node.js Backend] ←── UDP/OSC ──→ [Physical Mixer]
```

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Svelte 5 (Vite), `socket.io-client`, `lucide-svelte` |
| Backend | Node.js (CommonJS), Express, `socket.io`, `osc` |
| Dev runner | `concurrently` (runs frontend + backend in one terminal) |
| Icons | Custom BMP icon set from X32/WING hardware (in `frontend/public/icons-bmp/`) |
| Tooling | `potrace`, `jimp` (BMP→SVG conversion scripts, in `tools/`) |

---

## 3. Repository Structure

```
openmix-v1/
├── backend/
│   ├── server.js         ← App entry point. Socket.io server, discovery/config event wiring
│   ├── mixerSync.js      ← MixerConnection class. UDP/OSC send/receive, virtual state, keepAlive
│   ├── routes.js         ← Per-socket event handlers (setOsc, pushState, generateToken, etc.)
│   ├── scenes.js         ← Scene file parser. Validates JSON, pushes flatOscCache to mixer
│   └── discovery.js      ← UDP broadcast /xinfo auto-discovery for Behringer/Midas mixers
│
├── frontend/
│   ├── public/
│   │   └── icons-bmp/    ← .bmp mixer channel icons (instrument images)
│   │
│   └── src/
│       ├── main.js        ← Svelte app mount
│       ├── app.css        ← Global design tokens & reset
│       ├── App.svelte     ← ROOT component. All top-level state + routing + layout
│       └── lib/
│           ├── socket.js              ← socket.io-client init, mixerState store, setOsc helper
│           ├── mixerPresets.js        ← Predefined mixer hardware configs (XR18, X32, M32, WING…)
│           └── components/
│               ├── ChannelStrip.svelte   ← Single fader strip (input/output/fx/main/dca variants)
│               ├── EqEditor.svelte       ← Wing-style parametric EQ with HTML5 canvas curve
│               ├── GlobalTabs.svelte     ← Top tab bar (Mixer/Channel/EQ/Sends/FX/Routing)
│               ├── Navbar.svelte         ← Top app bar (role indicator, scribble, export, import)
│               ├── ScribbleEditor.svelte ← Modal for editing channel name, icon, color
│               └── Sidebar.svelte        ← Left sidebar (pagination, view routing, contextual tools)
│
├── tools/                ← One-off Node.js BMP→SVG conversion scripts
├── package.json          ← Root package. Scripts: `npm run dev`, `dev:backend`, `dev:frontend`
├── .gitignore
├── HANDOFF.md            ← This file
└── README.md
```

---

## 4. How to Run Locally

### Prerequisites
- **Node.js** ≥ 18 (LTS recommended)
- **npm** ≥ 9

### Steps

```powershell
# 1. Clone the repo
git clone https://github.com/papingothegamer/openmix-v1.git
cd openmix-v1

# 2. Install root dependencies (backend)
npm install

# 3. Install frontend dependencies
cd frontend && npm install && cd ..

# 4. Start both servers together
npm run dev
```

This starts:
- **Backend** at `http://localhost:3000` (Socket.io + OSC bridge)
- **Frontend** (Vite dev server) at `http://localhost:5173`

> **Note:** The frontend connects to `localhost:3000` via Socket.io. If you need to change the backend URL, edit `frontend/src/lib/socket.js`.

### Accessing from Other Devices (Tablets/Phones)
To allow other devices on your LAN to connect:
1. Find the host machine's local IP: `ipconfig` → look for your Wi-Fi IPv4 address (e.g. `192.168.1.50`)
2. Open `http://192.168.1.50:5173` on the remote device
3. The remote device and the backend must be on the same LAN

---

## 5. Mixer Network Setup

### How It Works
- The **backend** communicates with the mixer over **UDP** on port **10024** (XR18/X-AIR default)
- The backend keeps the connection alive by sending `/xremote` every 9 seconds (required by Behringer)

### Auto-Discovery
On first setup, click **"📡 Auto-Discover Mixer"** in the Setup Wizard. The backend broadcasts `/xinfo` to `255.255.255.255:10024` and waits up to 4 seconds for a response. If found, the mixer IP auto-fills.

### Manual IP
If auto-discovery doesn't work (e.g., firewall blocks broadcast on the subnet), type the mixer's IP directly into the **Mixer IP Address** field in the Setup Wizard. Set the port to `10024` for all X-AIR/XR18 and X32 mixers.

### Important: Mixer must be on the same LAN subnet as the Node.js backend server.

---

## 6. Completed Implementation Phases

| Phase | Description | Status |
|------|-------------|--------|
| 1 | Backend foundation (Express, Socket.io, OSC) | ✅ Done |
| 2 | Frontend infrastructure (Svelte + Socket.io client) | ✅ Done |
| 3 | Role-Based Access Control (FOH + Musician tokens) | ✅ Done |
| 4 | Throttled metering system (binary meter blobs → canvas) | ✅ Done |
| 5 | Scene file save/load (JSON export/import) | ✅ Done |
| 6 | V2 UI overhaul (Channel strips, Setup Wizard) | ✅ Done |
| 7 | Rack presets (BMP icons, Scribble strips, Mixer presets) | ✅ Done |
| 8 | V3 edge-to-edge layout (Sidebar, Routing views) | ✅ Done |
| 9 | Global top nav tabs + strip variants | ✅ Done |
| 10 | BMP icon CSS masking + color support | ✅ Done |
| 11 | FX tab routing structure | ✅ Done |
| 12 | Contextual UI (param routing, channel iteration arrows) | ✅ Done |
| 13 | Parametric EQ editor (canvas curve, band nodes) | ✅ Done |
| 14 | Wing-style UX (bus sandbox, fader-only musician view) | ✅ Done |
| 15 | EQ layout polish + sidebar parity | ✅ Done |
| 16 | EQ right-rail independence | ✅ Done |
| 17 | Bento-grid Channel tab | ✅ Done |
| 18 | Stereo linking (odd/even pairs, blue/red visual, yellow badge) | ✅ Done |
| 19 | FX return strips (amber color) | ✅ Done |
| 20 | .gitignore setup | ✅ Done |
| 21 | JSON Scene Export with full UI state (EQ, Scribbles, Links) | ✅ Done |
| 22 | Mobile/tablet landscape lock + portrait warning overlay | ✅ Done |
| 23 | Scribble editor shortcut from Channel tab icon box | ✅ Done |
| 24 | Scribble button active state in Navbar | ✅ Done |
| 25 | Scribble editor no-close-on-backdrop-click fix | ✅ Done |
| 26 | Git cache reset (node_modules removed from tracking) | ✅ Done |
| 27 | Scene export/import with UI config (scribbles, EQ, links) | ✅ Done |
| 28 | EQ flat-state canvas render on first channel load | ✅ Done |
| 29 | Mixer auto-discovery (UDP broadcast) + Manual IP in Setup Wizard | ✅ Done |
| 30 | Sends tab — functional per-AUX/FX level + pre/post toggles | ✅ Done |
| 31 | Routing tab — bus matrix routing toggle with OSC emit | ✅ Done |

---

## 7. Key State Architecture (App.svelte)

All top-level state is in `App.svelte`. Key state objects:

| Variable | Type | Purpose |
|---|---|---|
| `config` | `Object` | Hardware preset, input/output counts, visible buses |
| `mixerConfig` | `Object` | `{ ip, port }` — mixer network connection settings |
| `scribbles` | `Object` | Per-channel name, icon, color `{ in_1: { name, iconType, color } }` |
| `channelEqState` | `Object` | Per-channel EQ band arrays `{ in_1: [...bands] }` |
| `sendsState` | `Object` | Per-channel per-bus send level + pre/post `{ in_1_aux2: { level, prePost } }` |
| `routingState` | `Object` | Per-channel per-bus routing on/off `{ in_1_bus2: true }` |
| `stereoLinks` | `Object` | Odd channel → linked boolean `{ 1: true }` |
| `mainOutAssign` | `Object` | Per-channel LR assignment `{ in_1: true }` |
| `activeRole` | `String` | `'foh'` or `null` |
| `activeTab` | `String` | `'mixer' \| 'channel' \| 'eq' \| 'sends' \| 'fx' \| 'routing'` |
| `activeView` | `String` | `'inputs' \| 'outputs' \| 'dcas'` |
| `selectedChannel` | `String` | `'in_1'`, `'out_2'`, `'fx_1'`, `'main_LR'` |

All state is also persisted to `localStorage` for page refreshes. Scene exports pack all of this into a single JSON file.

### OSC Emission Pattern
All controls call `setOsc(address, value)` from `lib/socket.js`:
```js
import { socket, setOsc } from '$lib/socket.js';
setOsc('/ch/01/mix/fader', 0.75); // float → typed by backend toOscArgs()
```
The backend's `routes.js` coerces raw JS values to properly typed OSC args via `toOscArgs()`.

---

## 8. Pending Work / Next Steps

### High Priority
- [ ] **FX Tab** — Full FX engine parameter UI (reverb/delay type, decay, pre-delay, etc.)  
  *(Currently: basic Level + Tap wireframe)*
- [ ] **OSC Address Mapping validation** — Verify all emitted OSC paths against the actual XR18 OSC spec document (in repo root: `behringer-x32-x32-osc-remote-protocol-en-44463.pdf`)
- [ ] **Musician QR Code** — Generate per-AUX QR code (encodes `?token=xxx`) for musicians to scan and auto-access their sandbox

### Medium Priority
- [ ] **Sends state hydration from mixer** — When the OSC backend receives inbound fader/on values from the mixer, hydrate the frontend `sendsState` and `routingState` stores
- [ ] **Mute group assignments** — Assign channels to mute groups (DCA-style)
- [ ] **Talkback routing** — Dedicated talkback button wired to backend OSC

### Lower Priority / Polish
- [ ] **RTA overlay** — Real-time FFT analysis overlay on EQ canvas (requires FFT data from backend)
- [ ] **P16/Ultranet routing** — Phase 2 routing for monitoring hardware
- [ ] **AES50 routing** — Advanced X32/M32 stage box routing matrix

---

## 9. OSC Reference Paths (XR18 / X-AIR)

| Action | OSC Address | Type | Range |
|---|---|---|---|
| Channel fader | `/ch/XX/mix/fader` | float | 0–1 |
| Channel mute | `/ch/XX/mix/on` | int | 0/1 |
| Send to AUX N | `/ch/XX/mix/NN/level` | float | 0–1 |
| Send pre/post | `/ch/XX/mix/NN/type` | int | 0=post, 1=pre |
| Send on/off | `/ch/XX/mix/NN/on` | int | 0/1 |
| Stereo link | `/config/chlink/1-2` | int | 0/1 |
| Channel name | `/ch/XX/config/name` | string | 12 chars max |
| EQ on/off | `/ch/XX/eq/on` | int | 0/1 |
| EQ band N freq | `/ch/XX/eq/N/f` | float | 20–20000 Hz |
| EQ band N gain | `/ch/XX/eq/N/g` | float | -15 to +15 dB |
| EQ band N Q | `/ch/XX/eq/N/q` | float | 0.3–10 |
| Gate on | `/ch/XX/gate/on` | int | 0/1 |
| Comp on | `/ch/XX/dyn/on` | int | 0/1 |
| FX send level | `/ch/XX/mix/fx/N/level` | float | 0–1 |
| Keep alive | `/xremote` | (no args) | — |
| Request info | `/xinfo` | (no args) | — |

> Full OSC spec: see `behringer-x32-x32-osc-remote-protocol-en-44463.pdf` in repo root.  
> WING OSC spec: see `WING_OSC_Documentation.pdf` in repo root.

---

## 10. IDE / Editor Setup Recommendations

### VS Code (Recommended)
Install these extensions:
- **Svelte for VS Code** (`svelte.svelte-vscode`) — syntax, IntelliSense, linting
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (optional, `esbenp.prettier-vscode`)

### JetBrains WebStorm / Rider
- Enable **Svelte plugin** from the JetBrains plugin marketplace
- Set the `frontend/` folder as the **project root** for module resolution
- The repo uses `$lib` path aliases (configured in `frontend/vite.config.js`)

### Cursor / Windsurf / GitHub Copilot
- All standard — the project is plain JS/Svelte with no exotic configs
- The `$lib` alias in import statements maps to `frontend/src/lib/`

---

## 11. Environment Variables (Backend)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP/WebSocket server port |
| `MIXER_IP` | `192.168.1.100` | Default fallback mixer IP (overridden dynamically via `configureMixer` socket event) |
| `MIXER_PORT` | `10024` | Default OSC port |

Override via a `.env` file in the root or by passing them inline:
```powershell
$env:MIXER_IP="192.168.1.50"; npm run dev:backend
```

---

## 12. Git Workflow Notes

- All development has been on the `main` branch
- Commits are made frequently after each feature phase
- **Never commit** `node_modules/`, `*.zip`, `*.pdf`, `.env` (these are in `.gitignore`)
- After cloning, always run `npm install` in both the root AND `frontend/` separately

---

## 13. Scene File Format

Scene files are JSON exports of the full app state:

```json
{
  "name": "OpenMix Export",
  "timestamp": 1748123456789,
  "state": {
    "flatOscCache": {
      "/ch/01/config/name": "Lead Vox",
      "/ch/01/mix/fader": 0.75
    }
  },
  "uiConfig": {
    "config": { "inputs": 18, "outputs": 6 },
    "scribbles": { "in_1": { "name": "Lead Vox", "iconType": "icon_42", "color": "#7c3aed" } },
    "channelEqState": { "in_1": [ ...8 band objects... ] },
    "mainOutAssign": { "in_1": true },
    "stereoLinks": { "1": false }
  }
}
```

The backend (`scenes.js`) only reads `state.flatOscCache` to push OSC values to the mixer.  
The frontend reads `uiConfig` to restore all visual state.

---

*End of handoff document. Questions or contributions: open an issue or PR at https://github.com/papingothegamer/openmix-v1*
