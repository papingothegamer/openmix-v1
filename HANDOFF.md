```markdown
# OpenMix V1 — IDE Handoff Document
> **Last updated:** 2026-03-25 | **Branch:** `main` | **Remote:** `https://github.com/papingothegamer/openmix-v1`

---

## 1. Project Overview

**OpenMix** is an open-source, browser-based digital mixing controller for live audio setups. It targets Behringer/Midas rack mixers (XR18, X32, M32, WING) over a local Wi-Fi network using the **OSC** (Open Sound Control) protocol.

The system has two user roles:
- **FOH Engineer** — Full console access. Channel EQ, Sends, Routing, Scribble Strips, Scene Export/Import.
- **Musician** — Fader-only sandbox view of a specific AUX monitor mix. Protected by strict backend OSC routing guards.

Communication flow:  
[Browser Frontend] ←── WebSocket (Socket.io) ──→ [Node.js Backend] ←── UDP/OSC ──→ [Physical Mixer]

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
├── package.json          ← Root package. Scripts: npm run dev, dev:backend, dev:frontend
├── .gitignore
├── HANDOFF.md            ← This file
└── README.md

````

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
cd frontend
npm install
cd ..

# 4. Start both servers together
npm run dev
````

This starts:

* Backend at [http://localhost:3000](http://localhost:3000) (Socket.io + OSC bridge)
* Frontend (Vite dev server) at [http://localhost:5173](http://localhost:5173)

Note: The frontend connects to localhost:3000 via Socket.io. If you need to change the backend URL, edit `frontend/src/lib/socket.js`.

### Accessing from Other Devices (Tablets/Phones)

* Find the host machine's local IP: `ipconfig` → look for Wi-Fi IPv4 address (e.g. 192.168.1.50)
* Open `http://192.168.1.50:5173` on the remote device
* The remote device and backend must be on the same LAN

---

## 5. Mixer Network Setup

### How It Works

* Backend communicates with mixer over UDP on port **10024**
* Sends `/xremote` every 9 seconds to keep connection alive

### Auto-Discovery

* Click **"📡 Auto-Discover Mixer"** in Setup Wizard
* Backend broadcasts `/xinfo` to `255.255.255.255:10024`
* Waits up to 4 seconds for response

### Manual IP

* Enter mixer IP manually if discovery fails
* Use port **10024** for XR18/X32

**Important:** Mixer must be on the same LAN subnet as backend

---

## 6. Completed Implementation Phases

| Phase | Description                                         | Status |
| ----- | --------------------------------------------------- | ------ |
| 1     | Backend foundation (Express, Socket.io, OSC)        | ✅ Done |
| 2     | Frontend infrastructure (Svelte + Socket.io client) | ✅ Done |
| 3     | Role-Based Access Control                           | ✅ Done |
| 4     | Throttled metering system                           | ✅ Done |
| 5     | Scene file save/load                                | ✅ Done |
| 6     | V2 UI overhaul                                      | ✅ Done |
| 7     | Rack presets                                        | ✅ Done |
| 8     | V3 layout                                           | ✅ Done |
| 9     | Global tabs                                         | ✅ Done |
| 10    | BMP icon masking                                    | ✅ Done |
| 11    | FX routing                                          | ✅ Done |
| 12    | Contextual UI                                       | ✅ Done |
| 13    | Parametric EQ                                       | ✅ Done |
| 14    | Wing-style UX                                       | ✅ Done |
| 15    | EQ polish                                           | ✅ Done |
| 16    | EQ rail independence                                | ✅ Done |
| 17    | Bento Channel tab                                   | ✅ Done |
| 18    | Stereo linking                                      | ✅ Done |
| 19    | FX returns                                          | ✅ Done |
| 20    | .gitignore                                          | ✅ Done |
| 21    | Scene export (UI state)                             | ✅ Done |
| 22    | Mobile orientation lock                             | ✅ Done |
| 23    | Scribble shortcut                                   | ✅ Done |
| 24    | Navbar active state                                 | ✅ Done |
| 25    | Modal fix                                           | ✅ Done |
| 26    | Git cache reset                                     | ✅ Done |
| 27    | Scene import/export v2                              | ✅ Done |
| 28    | EQ initial render                                   | ✅ Done |
| 29    | Auto-discovery + manual IP                          | ✅ Done |
| 30    | Sends tab                                           | ✅ Done |
| 31    | Routing tab                                         | ✅ Done |
| 32    | Channel modal refactor                              | ✅ Done |
| 33    | OSC mapping validation                              | ✅ Done |
| 34    | Sends + routing hydration                           | ✅ Done |

---

## 7. Key State Architecture (App.svelte)

All top-level state is managed in `App.svelte`:

| Variable        | Type   | Purpose             |
| --------------- | ------ | ------------------- |
| config          | Object | Hardware config     |
| mixerConfig     | Object | `{ ip, port }`      |
| scribbles       | Object | Channel labels      |
| channelEqState  | Object | EQ band data        |
| sendsState      | Object | AUX send levels     |
| routingState    | Object | Bus routing         |
| stereoLinks     | Object | Link pairs          |
| mainOutAssign   | Object | LR assignment       |
| activeRole      | String | 'foh' or null       |
| activeTab       | String | UI tab              |
| activeView      | String | inputs/outputs/dcas |
| selectedChannel | String | current channel     |

* State persists in **localStorage**
* Scene exports include full state JSON

### OSC Emission Pattern

```js
import { socket, setOsc } from '$lib/socket.js';

setOsc('/ch/01/mix/fader', 0.75);
```

Backend converts values via `toOscArgs()`.

---

## 8. Pending Work

### High Priority

* FX full parameter UI
* Musician QR code access

### Medium

* Mute groups
* Talkback routing

### Low

* RTA overlay
* P16 routing
* AES50 routing

---

## 9. OSC Reference Paths

| Action      | Address             | Type   | Range    |
| ----------- | ------------------- | ------ | -------- |
| Fader       | /ch/XX/mix/fader    | float  | 0–1      |
| Mute        | /ch/XX/mix/on       | int    | 0/1      |
| Send level  | /ch/XX/mix/NN/level | float  | 0–1      |
| Pre/post    | /ch/XX/mix/NN/type  | int    | 0/1      |
| Stereo link | /config/chlink/1-2  | int    | 0/1      |
| Name        | /ch/XX/config/name  | string | 12 chars |
| EQ freq     | /ch/XX/eq/N/f       | float  | 20–20000 |

Keep-alive: `/xremote`
Discovery: `/xinfo`

---

## 10. IDE Setup

### VS Code

* Svelte extension
* ESLint
* Prettier (optional)

### JetBrains

* Enable Svelte plugin
* Set `frontend/` as root

### Others

* `$lib` maps to `frontend/src/lib/`

---

## 11. Environment Variables

| Variable   | Default       | Description |
| ---------- | ------------- | ----------- |
| PORT       | 3000          | Server port |
| MIXER_IP   | 192.168.1.100 | Default IP  |
| MIXER_PORT | 10024         | OSC port    |

```powershell
$env:MIXER_IP="192.168.1.50"
npm run dev:backend
```

---

## 12. Git Workflow

* Single `main` branch
* Frequent commits
* Ignore: `node_modules`, `.env`, archives

After cloning:

```bash
npm install
cd frontend && npm install
```

---

## 13. Scene File Format

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
    "scribbles": {
      "in_1": {
        "name": "Lead Vox",
        "iconType": "icon_42",
        "color": "#7c3aed"
      }
    },
    "channelEqState": {
      "in_1": []
    },
    "mainOutAssign": { "in_1": true },
    "stereoLinks": { "1": false }
  }
}
```

* Backend uses `state.flatOscCache`
* Frontend restores from `uiConfig`

```
```
