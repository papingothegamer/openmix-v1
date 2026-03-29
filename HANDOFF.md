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
| ...   | ...                                                 | ...    |
| 39    | Output channel standardization (bus_)              | ✅ Done |
| 40    | Selective FX Migration (Isolation)                 | ✅ Done |
| 41    | 8-Band EQ Color-Coding & Halo                      | ✅ Done |
| 42    | Main Assign Prop/Cache Sync Fix                   | ✅ Done |
| 43    | Non-Interactive Logarithmic Knob Variant           | ✅ Done |
| 44    | Channel Modal Header Responsive Layout             | ✅ Done |
| 49    | Matrix Axis Correction (Dest=Rows, Src=Cols)      | ✅ Done |
| 50    | Patching Logic Unpatched State Fix                 | ✅ Done |
| 51    | Backend Deep Synchronization Engine                | ✅ Done |
| 52    | Real-Time Hardware OSC Control & Hydration           | ✅ Done |
| 53    | Navbar Sync Status Progress Indicator              | ✅ Done |
| 54    | X32 Individual User Patching Integration            | ✅ Done |
| 55    | MR18/XR18 Full Sync Polish (FX, Links, Bus Names)  | ✅ Done |
| 56    | Main/Aux Physical Output Patching Logic            | ✅ Done |
| 57    | Auto-Sync Handshake on Connection                  | ✅ Done |

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
| channelFxInsert | Object | FX slot assignments |
| fxRack          | Object | Global FX parameters|
| stereoLinks     | Object | Link pairs          |
| mainOutAssign   | Object | LR assignment       |
| activeRole      | String | 'foh' or null       |
| activeTab       | String | UI tab              |
| activeView      | String | inputs/outputs/dcas |
| selectedChannel | String | current channel     |
| rackSlotIndex   | Number | Focused FX slot     |

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
    "stereoLinks": { "1": false },
    "fxRack": { "slots": [] },
    "channelFxInsert": { "in_1": 0 }
  }
}
```

* Backend uses `state.flatOscCache`
* Frontend restores from `uiConfig`

---

## 14. Key Technical Debt Fixed (2026-03-29)

### 14.1 Selective FX Migration
Previously, importing a legacy scene would apply a single global FX rack to all mixer channels. We implemented a migration logic in `App.svelte` that cross-references `channelFxInsert`. 
- **Isolated Racks**: FX are now only applied to channels that actually had them assigned in the export.
- **Clean Slate**: New channels on a fresh load remain empty even if other channels have FX.

### 14.2 Main Assign Sync (Modal vs. Bento)
Fixed a `=== 1` type-mismatch bug in `ChannelModal.svelte`. 
- **Bug**: Numeric OSC cache values were being compared to boolean fallbacks (`mainOut: true === 1` is false).
- **Fix**: Cast fallbacks to numeric (`params.mainOut ? 1 : 0`) during cache lookup to ensure the "ON" state persists correctly.

### 14.3 Unified Knob Component
Enhanced `frontend/src/lib/components/EffectControls/Knob.svelte` with:
- **`interactive` prop**: Disables mouse/touch listeners for "read-only" visual meters.
- **`isLogarithmic` prop**: Necessary for human-friendly frequency response control (20Hz-20kHz).
- **Consolidation**: Removed ad-hoc SVG code from `GateGraph` and `CompressionGraph` in favor of this standardized component.

### 14.4 EQ Visual Language
Moved from numbered bands to a color-coded identifier system (8 colors). 
- **Halo Selection**: Active band now draws a `Yellow/Amber Dashed Halo` on the canvas for instant selection feedback.
- **Clutter Reduction**: Numbers removed from graph dots; remains strictly color-coordinated with the sidebar.

### 14.5 X-AIR Style Routing Patchbay
The Routing tab has been completely rebuilt to provide a professional, hardware-parity experience matching the **Behringer X-AIR Edit** workflow.
- **Top Icon Mode Bar**: Provides instant access to `Input`, `USB Returns`, `USB Sends`, `Ultranet`, `Aux Out`, and `Main Out` (with `AES50` for X32/WING).
- **Corrected Axis Orientation**: Rows now represent **Destinations** (Channels/Busses) and Columns represent **Sources** (Sockets/Inputs), perfectly mirroring the X-AIR Edit layout.
- **Improved Patch Logic**: Clicking an active dot now correctly "Unpatches" the channel, with updated toast notifications reflecting the new state.
- **Zero-Scroll Vertical Constraint**: Matrix handles Destinations as Rows, fitting them vertically within the viewport.
- **Ultranet (P16)**: Added 16 dedicated output destinations with professional sub-tab categorization for internal digital sources.
### 14.6 Hardware Synchronization & OSC Control
Implemented a robust deep-sync engine that aligns the OpenMix 'Virtual Mixer' with the physical hardware state.
- **Deep Sync Engine**: Requests 300+ OSC parameters (Routing, EQ, Gate, Dynamics, Strip Config) automatically upon connection via a throttled loop.
- **Real-Time Hydration**: The UI components (Routing Matrix, EQ Graphs) reactively populate from the incoming OSC stream, ensuring a 'Single Source of Truth'.
- **OSC Control Pipeline**: The PatchingBay now emits actual `/config/routing/` commands to the hardware, enabling professional remote control.
- **Sync Visuals**: Added a pulsing `Loader2` progress indicator in the Navbar showing a live percentage of the state-pull process.
- **Scene Export Alignment**: Verified that state serialization captures the entire `flatOscCache`, allowing full restoration of complex routing and processing states from saved JSON files.

### 14.7 Field-Test Readiness (Preliminary Audit)
Completed a 'Pre-Flight' audit to ensure 100% compatibility with MR18/XR18 hardware.
- **Deep Metadata Pull**: Initial sync now includes **Stereo Links**, **FX Slot Types**, and **Bus Metadata** (names/icons), providing a seamless login experience.
- **Output Matrix Mapping**: Completed the OSC mapping for physical **XLR Main L/R** and **Aux 1-6** sockets, allowing for complete physical output re-patching.
- **Handshake Optimization**: Handled the auto-sync trigger via an explicit frontend request, ensuring the backend pulls the correct parameter set for the target mixer model.
- **Scene Fidelity**: Verified that the serialization engine captures the expanded state, including routing blocks and link pairs.
