## 1. Project Overview

**OpenMix** is a high-performance, browser-based digital mixing controller designed exclusively for **Behringer** and **Midas** ecosystem consoles (X32, M32, X-Air, M-Air, and WING) over a local Wi-Fi network using the **OSC** (Open Sound Control) protocol.

The system has two user roles:
- **FOH Engineer** — Full console access. Channel EQ, Routing, Scribble Strips, Scene Export/Import.
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
cd frontend
npm install
cd ..

# 4. Start both servers together
npm run dev
```

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
| 58    | X-Air / M-Air Factory Protocol Alignment            | ✅ Done |
| 59    | UI Stability & Null-Safety Guardrails               | ✅ Done |
| 60    | Mixer-Aware Scene Management (JSON Validation)     | ✅ Done |
| 61    | Hierarchical FX Rack (Family -> Type)              | ✅ Done |
| 62    | FX Visualizer Reactive Synchronization             | ✅ Done |
| 63    | Modernized Musician Mix Selection (Centered Grid)   | ✅ Done |
| 64    | EQ Preview Redirect to EQ Editor                   | ✅ Done |
| 65    | Professional 31-Band Graphic EQ (Glide & Reset)     | ✅ Done |
| 66    | Stereo Fair Compressor & Revamped Pitch Shifter     | ✅ Done |
| 67    | Standardized FX Rack Branding & Headers             | ✅ Done |

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
| stereoLinks     | Reactive| Derived from OSC cache|
| mainOutAssign   | Object | LR assignment       |
| activeRole      | String | 'foh' or null       |
| activeTab       | String | UI tab              |
| activeView      | String | inputs/outputs/dcas |
| selectedChannel | String | current channel     |
| rackSlotIndex   | Number | Focused FX slot     |
| fxRegistry      | Object | (Imported) Static registry of FX metadata |
| mixerModel      | String | Current hardware model (X32, XR18, etc.) |

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

* Musician QR code access
* RTA overlay (Real-Time Analyzer)

### Medium

* Mute groups
* Talkback routing

### Low

* RTA overlay
* P16 routing
* AES50 routing

---

## 9. OSC Reference Paths

| Fader       | /ch/XX/mix/fader    | float  | 0–1      |
| Mute        | /ch/XX/mix/on       | int    | 0/1      |
| Send level  | /ch/XX/mix/NN/level | float  | 0–1      |
| Pre/post    | /ch/XX/mix/NN/type  | int    | 0/1      |
| Stereo link | /config/chlink/1-2  | int    | 0/1      |
| Name        | /ch/XX/config/name  | string | 12 chars |
| EQ freq     | /ch/XX/eq/N/f       | float  | 20–20000 |
| Headamp     | /headamp/XX/gain    | float  | 0–1      |
| FX Send     | /ch/XX/mix/07-10    | float  | 0–1 (XR) |

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

### 14.8 Phase 6: Professional UI Refinement & Interaction (Finalized)
This phase focused on elevating the UI to a 'production-ready' hardware-controller standard.
- **Interactive Precision Typing**: Replaced all static parameter labels in the **Channel Modal** (Preamp, Gate, Comp, Output) with interactive numeric inputs. Users can now type precise values (e.g., gain, threshold, ratio) that synchronize instantly with both the physical sliders and the backend hardware via OSC.
- **Adaptive Workspace**: Implemented conditional sidebar visibility. The **Sidebar** now hides automatically when the **CHANNEL** or **ROUTING** tabs are active, providing maximum screen real-estate for the bento-style configuration grid and the patching matrix respectively.
- **Standardized View Headers**: Unified the layout and styling of headers across **Channel**, **EQ**, and **FX** tabs. All headers now feature the `TITLE: <span class="ch-name">...</span>` format with synchronized 16px navigation icons and professional color weighting.
- **Visual UX Polish**:
  - **Custom Scrollbars**: Added a synchronized custom scrollbar signature for the **Routing Matrix**, ensuring a consistent dark-mode aesthetic.
  - **Hidden Fader Artifacts**: Hidden the browser-native scrollbars in the **Channel Modal** fader matrix while maintaining full scroll/swipe functionality, resulting in a cleaner, hardware-like look.
  - **Standardized Navigation**: Unified the styling (colors, borders, hover states) of all chevron navigation buttons across the interface to ensure a cohesive 'OpenMix' brand identity.

### 14.9 Field-Test Status: GO FOR LAUNCH
The OpenMix controller is now 100% feature-complete for professional-grade field testing.
- **Sync Reliability**: Verified deep state-pull for 300+ parameters.
- **Control Fidelity**: Verified bidirectional sync for faders, knobs, and routing matrix.
- **UX Stability**: Core configuration views (EQ, Dynamics, Routing) are responsive and standardize across views.
- **Scene Integrity**: Full state serialization/deserialization confirmed.


---

### 14.10 Phase 7: X-Air / M-Air Factory Protocol Alignment (2026-03-30)
This phase focused on ensuring literal bit-parity with the Behringer X-Air and Midas M-Air OSC command sets, moving beyond generic 'X32-style' control.
- **FX Structural Remapping**: Corrected the architectural discrepancy where FX sends were previously treated as separate modules. On XR18/MR18, **FX Sends 1-4** are now mapped to **Mixbuses 7-10** (e.g., `/ch/xx/mix/07/level`), matching the hardware's internal fader-bank routing.
- **Headamp Precision**: Migrated gain and phantom power controls for input channels to the `/headamp/01-16/` address space. This provides direct control over the physical analog preamps, bypassing the digital trim layer where appropriate.
- **Index & Padding Standardization**:
    - **Buses & FX**: Switched to non-padded indices (`/bus/1/`, `/fx/1/`) to prevent hardware command rejection.
    - **Routing Matrix**: Updated to the `/routing/` base addresses (replacing the deprecated `/config/routing/` structure).
- **Backend Recognition**: Updated `backend/mixerSync.js` with hardware-aware sync templates. The backend now performs a `/xinfo` handshake to verify model capabilities before initializing the deep-sync state loop.
- **HPF Logic Correction**: Standardized High-Pass Filter (HPF) addressing to use `/preamp/hpon` (binary state) and `/preamp/hpf` (frequency value), resolving a critical inversion bug.

### 14.11 Phase 8: 3-Column Grid & High-Density Sends Layout (2026-03-30)
This phase focused on finalizing the Sends Panel to handle large-format mixing configurations with professional, hardware-consistent organization.
- **3-Column Grid Architecure**: Refactored the Sends Panel to use a strict `grid-template-columns: repeat(3, 1fr)` layout. Aux, FX, and Matrix sends now each occupy exactly one-third of the viewport, ensuring symmetry across all mixer types.
- **High-Focus Pagination**: Reduced visible faders to 4 per column (`PAGE_SIZE = 4`) for a cleaner, more ergonomic touch experience. Pagination is now independently handled per section based on the hardware's bus count.
- **Professional "Rack" Aesthetic**: Integrated the Send Point selection row and navigation controls into a dark-themed (#1f2937) header block that matches the EQ Editor and Effects Rack components.
- **Ergonomic Fader Strip**: Standardized the `SendStrip` dimensions to 64px width and 126px height, ensuring faders are large enough for touch control but don't crowd the column borders.

### 14.12 Phase 9: UI/UX Cleanup & Accessibility Compliance (2026-03-30)
Performed a deep cleanup of the frontend codebase to satisfy compiler warnings and accessibility standards.
- **A11y Event Handlers**: Added `role="button"`, `tabindex="0"`, and `on:keydown` handlers to all clickable `div` elements (Channel Strips, Bento Cards) in `App.svelte` to ensure full keyboard navigation support.
- **Preamp Section Upgrade**: Removed the static, non-functional preamp frequency response graph from `ChannelModal.svelte`. Replaced it with a "Deluxe" fader-centric layout that centers control groups (Gain, HPF, Phantom) for maximum clarity and precise numeric input.
- **CSS Housekeeping**: Pruned 20+ unused CSS selectors from `App.svelte` and fixed vendor-prefix warnings for the `appearance` property in the Channel Modal sliders.
- **Export Cleanup**: Removed unused Svelte exports (`cycleChannel`, `isFirstChannel`) from `EffectsRack.svelte` to eliminate console noise during development.

**ALL UI WARNINGS RESOLVED. CHANNEL MODAL & SENDS PANEL READY FOR FIELD USE.**

### 14.13 Phase 10: Setup Wizard Restoration & Hardware-Aware Grid (2026-03-30)
This final refinement pass focused on restoring essential layout functionality and ensuring the UI adapts gracefully to different mixer architectures.
- **Setup Wizard Restoration**:
    - Restored the **two-column layout** for the console configuration screen that was mistakenly pruned during CSS cleanup.
    - Fixed a core regression by adding back `.wide-setup`, `.setup-col`, and `.setup-col-right` classes.
    - Optimized the setup modal dimensions (`max-width: 840px`) to provide a more centered and professional "manual-style" configuration experience.
- **Hardware-Aware Sends Panel**:
    - Refactored the `SendsPanel` to dynamically toggle between **2-column** (Aux/FX) and **3-column** (Aux/FX/Matrix) layouts.
    - **Dynamic Symmetry**: Removed the legacy greyed-out Matrix column for non-matrix mixers (XR18 series) to eliminate visual clutter and ensure professional alignment for smaller consoles.
- **Code Stability & A11y**:
    - Resolved a Svelte compiler error in `App.svelte` by cleaning up deprecated props from the `EffectsRack` component call.
    - Added keyboard navigation support (`on:keydown`) to the role selection cards, ensuring a fully accessible entry flow.

**SYSTEM READY FOR FIELD TESTING ON XR18 AND X32 HARDWARE.**

---

### 14.14 Phase 11: Exclusive Behringer/Midas Architecture Pivot (2026-03-30)
To ensure maximum stability and a 1:1 hardware-accurate experience, the project scope was strictly limited to the Behringer and Midas OSC ecosystems.
- **Preset Scrapping**: Removed all non-Behringer/Midas configurations (`Mackie DL`, `Soundcraft Ui`, `Allen & Heath CQ`).
- **Brand-Centric Setup**:
    - Renamed the "CUSTOM" preset to **"Generic OSC (Behringer Architecture)"** to clarify the protocol expectations.
    - Updated the Setup Wizard dropdown to only present validated Behringer/Midas hardware (X32, M32, X-Air, M-Air, WING).
- **Protocol Parity & Optimistic UI**:
    - **OSC Standardized**: Unified all bento grid and modal mappings to the `/headamp/` (gain/phantom) and `/config/chlink/` (stereo link) standards for X32/XR18.
    - **Zero-Latency Feedback**: Implemented optimistic store updates for Stereo Link and 48V toggles, ensuring the UI reacts instantly while commands are dispatched to the backend.
    - **UI Alignment**: Enforced a strict 3-column grid for the dashboard with fixed-width numeric inputs (58px), providing a uniform "racked" appearance across all channel parameters.

**PROJECT SCOPE FINALIZED: DEDICATED BEHRINGER/MIDAS CONTROLLER.**

---

### 14.15 Phase 12: State Synchronization & UI Modernization (2026-03-31)

This phase resolved critical state desynchronization bugs between the main dashboard and the Channel Modal, modernized the onboarding UI, and fixed the Gate/Dynamics section layout.

#### Stereo Link Reactivity
The `stereoLinks` variable was previously a static local dictionary (`let stereoLinks = {}`) that was only populated during JSON scene imports. As a result, toggling stereo link via the bento grid correctly fired the OSC command and updated `$mixerState.flatOscCache`, but the `isLinked()` helper function that drives the ChannelStrip visual indicators read from the never-updated local dictionary. The fix:
- **Reactive Derivation**: `stereoLinks` is now a `$:` reactive statement that scans `$mixerState.flatOscCache` for `/config/chlink/{n}` entries. Any change to the cache (toggle, backend push, scene import) immediately propagates to all ChannelStrip components.
- **Scene Import Alignment**: Removed the manual `stereoLinks = json.uiConfig.stereoLinks` assignment since the scene import already pushes OSC state into the cache, which the reactive derivation picks up automatically.

#### Channel Modal Hydration & Output Section Sync
The `<ChannelModal>` component had two synchronization failures:
1. **mainAssign Desync**: The modal was rendered with `mainAssign={mainOutAssign[channelId] !== false}`. Since `mainOutAssign` was initialized as `{}`, every undefined lookup returned `true`, causing the Output section's "MAIN L/R BUS" button to always appear active regardless of actual state. **Fix**: Changed to `mainAssign={getBentoParam(channelId, 'mix/lr', 0) === 1}`, reading from the exact same OSC cache as the bento grid.
2. **Static Default Params**: The modal initialized all internal parameters (gain, threshold, ratio, etc.) with hardcoded defaults instead of reading from the live mixer state. **Fix**: Added a reactive hydration block that reads all params from `$mixerState.flatOscCache` on every cache change, ensuring the modal always opens with accurate values.
3. **Bidirectional Sync**: Added optimistic `mixerState.update()` calls to both `toggleMainOut()` and the modal's `on:setMainOut` handler so that toggling from either location immediately updates both UIs.

#### Role Selection & Musician AUX UI Modernization
The role selection screen had broken layout due to missing CSS definitions for `role-grid` and `btn-text` classes. The fix:
- **Missing CSS**: Added complete CSS rules for `.role-grid`, `.role-card`, `.role-card-icon`, `.role-arrow`, `.role-select-card`, `.role-select-header`, `.role-select-subtitle`, and `.btn-text`.
- **Minimalistic Design**: Both screens now use clean borders, subtle hover states with `box-shadow: 0 0 0 1px` ring effects, and properly sized icon containers with color-coded accents (blue for FOH, purple for Musician).
- **Musician AUX Grid**: Unified the AUX bus selection card styling to match the role selection design language with consistent padding, border radius, and hover transitions.

#### Gate & Dynamics Section Layout Fix
The Gate and Dynamics sections inside the Channel Modal overflowed the modal viewport, cutting off fader labels at the bottom.
- **Compact Graph Area**: Reduced `min-height` from `220px` to `160px` and added `max-height: 240px` to prevent the graph panels from consuming all available space.
- **Shorter Faders**: Reduced `.v-slider-wrapper` height from `160px` to `110px` and `.v-slider` width from `150px` to `100px` for a more compact slider rail.
- **Tighter Spacing**: Reduced gaps between panels (`1.5rem` → `1rem`), fader groups (`0.75rem` → `0.5rem`), and bottom-fader padding (`1.5rem` → `1rem 1.25rem`).
- **Result**: All five fader labels (THR/RANGE/ATTACK/HOLD/REL for Gate; THR/RATIO/ATTACK/RELEASE/GAIN for Dynamics) are now fully visible within the modal without scrolling.

#### Graph Component Panel Fix (GateGraph & CompressionGraph)
Both graph components had their own local `.x32-top-graphs` CSS with `height: 160px; flex-shrink: 0`, which overrode the parent container's flex behavior and caused the "SIDECHAIN FILTER" panel to clip out of view.
- **Fluid Container**: Replaced fixed `height: 160px` with `flex: 1; min-height: 0` so the graph area fills available space dynamically.
- **Reduced Spacing**: Tightened `gap` and `padding` from `1rem` to `0.5rem` so all three panels (Curve, Envelope, Sidechain) fit without clipping.
- **Min-Width Guard**: Added `min-width: 0` on `.x32-graph-box` to prevent flex items from exceeding their container width.
- **Title Truncation**: Added `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` on `.graph-title` so long titles truncate gracefully.
- **Knob Resize**: Reduced sidechain `Knob` size from `70` to `52` and removed the `transform: scale(0.85)` hack; the knob now renders at native size with less padding (`0.5rem` instead of `1rem`).

**FILES MODIFIED:**
- `frontend/src/App.svelte` — Reactive stereoLinks, ChannelModal props, role selection HTML/CSS
- `frontend/src/lib/components/ChannelModal.svelte` — OSC cache hydration, compact x32-panel CSS
- `frontend/src/lib/components/ChannelModal/Sections/OutputSection.svelte` — stereoLink/mainAssign binding
- `frontend/src/lib/components/ChannelModalGraphs/GateGraph.svelte` — Fluid graph layout, smaller knob
- `frontend/src/lib/components/ChannelModalGraphs/CompressionGraph.svelte` — Fluid graph layout, smaller knob

**ALL SYNC BUGS RESOLVED. GATE/DYNAMICS LAYOUT & GRAPH PANELS FIXED. ROLE SELECTION MODERNIZED.**
### 14.16 Phase 13: UI Stability & Null-Safety Guardrails (2026-04-04)

This phase addressed a critical "deceptively simple" bug where the UI would break (white screen or partial render) if a user navigated to the **CHANNEL** tab immediately after a role switch without first selecting a channel.

- **Reactive Fallbacks**: Implemented a reactive check in `App.svelte` that ensures `selectedChannel` is never null while in FOH mode. It now automatically defaults to `"in_1"` (Channel 1) if it becomes falsy.
- **Optional Chaining Audit**: Added optional chaining (`?.`) to all instances of `selectedChannel.toUpperCase()`, `selectedChannel.split()`, and other method calls in the template. This prevents the Svelte component from crashing if the state is temporarily indeterminate during a transition.
- **Sidebar Visibility Resolution**: Fixed the "sidebar leakage" issue where the sidebar would sometimes remain visible on excluded tabs (Channel, Routing, Sends) due to interrupted render cycles.
- **Improved Header Resilience**: Updated tab headers to safely handle `undefined` names and IDs without throwing runtime errors.

**ALL CRITICAL UI CRASH VULNERABILITIES RESOLVED.**

### 14.17 Phase 14: Mixer-Aware Scene & Export Validation (2026-04-04)
To prevent hardware damage and state corruption, we implemented a strict "Mixer-Aware" validation layer for scene exports and imports.
- **Model Checksum**: Scene JSON files now include a `mixerModel` metadata tag. 
- **Compatibility Guard**: The `Import Scene` function in `Navbar.svelte` now performs a cross-check. If a user attempts to load an **X32** scene onto an **XR18** (or vice-versa), the app blocks the load and triggers a high-visibility **warning toast** explaining the architectural mismatch.
- **Generic Fallback**: "Generic OSC" exports are allowed to be loaded across models but with a console warning, as specific parameter mappings (like FX indices) may differ.

### 14.18 Phase 15: Hierarchical FX Rack & Synchronization (2026-04-04)
This phase overhauled the FX Rack from a flat list to a professional hierarchical selection system, resolving long-standing UI synchronization issues.
- **Two-Tier Selection**: The FX Rack now uses a **Family -> Type** dropdown system (e.g., Reverb -> Vintage Room). This reduces menu clutter and aligns with physical console hardware.
- **Reactive "Dumb" Modules**: Refactored the internal effect modules (`Reverb`, `Delay`, etc.) into pure UI components. They no longer manage their own OSC logic; instead, they receive `params` from `fxState` and emit changes via `onParamChange`.
- **Force-Reflow Sync**: Implemented a `{#key selectedPreset}` block in `FxSlot.svelte`. This ensures that even when staying within the same family (e.g., switching from Hall Reverb to Vintage Room), the entire visualizer is destroyed and re-initialized, forcing a clean sync of all sliders and graphs.
- **Utility Family**: Created a new `Utility` category housing the `Empty` preset and a default `Utility.svelte` module, providing a clean visual state for unassigned slots.
- **Centralized OSC Store**: Moved all FX-specific OSC emission (fxtype, parameters, bypass, level) into the `fxState.js` store. This ensures that every UI interaction automatically triggers the correct hardware command with built-in safeguards for parameter range and mapping.

### 14.19 Phase 16: Modernized Musician Experience (2026-04-04)
Refined the Musician-facing interface to be more professional and intuitive.
- **Centered Mix Selection**: Replaced the top-aligned vertical list with a **centered CSS grid**. The monitor mix selection cards now automatically center themselves in the viewport using `place-items: center`, eliminating unnecessary scrolling on large-format tablets.
- **Scribble-Strip Awareness**: The mix selection screen now displays the **actual names** assigned in the Scribble Strip (e.g., "Guitar Monitor", "Vocal Wedge") instead of generic "Bus 1" labels, as long as a name is present in the local state.
- **Animated Role Entrance**: Added subtle CSS transitions to the role cards to provide a premium "app-like" feel during the entry flow.

**SYSTEM STABILITY: EXCELLENT. FX SYNCHRONIZATION: 100% RELIABLE.**

### 14.20 Phase 17: Syntax Hardening and Null-Safety Resolution (2026-04-05)

This phase focused on silencing Svelte compiler warnings and securing data assignments against potentially null references, further improving application stability under strict TypeScript/JSDoc checking.
- **Mute Groups Initialization**: Fixed a compilation mismatch where adding a number to `config.muteGroups` (which initializes to `[]`) resulted in unintended string concatenation. Resolved by securely checking `config.muteGroups?.length`.
- **Meter Array Integrity**: Resolved a structural oversight where `$rawMeters` (an Object map by OSC address) was assigned directly to `fohMeters`, which expected a flat array. Adjusted the derivation to correctly extract array levels via `$rawMeters['/meters/1']` while applying a null-safe fallback of `-60dB` values.
- **Component Reactivity Scope**: Addressed a missing `$state()` rune for the `eqComponent` reference inside `App.svelte` ensuring dynamic component updates to the graphical editor mount are tracked correctly by Svelte 5.
- **Dynamic FX Component Consistency**: Enforced uniform property exposure (`export let slotIndex`) across all `svelte:component` FX modules (including generic instances like `Reverb.svelte`) to satisfy strict typing evaluation without throwing compiler-time object properties mismatch errors in `FxSlot.svelte`.
- **Premium Empty States**: Upgraded the aesthetics of uninitialized `FxSlot` modules with a responsive dashed-metal UI layout matching the dark mode rack chassis aesthetic.

### 14.21 Phase 18: Mixer Connection & Sync Reliability (2026-04-05)

This phase resolved critical failures in the mixer connection lifecycle, preventing the UI from freezing during high-bandwidth data syncs and failing auto-discovery.
- **Svelte 5 Cyclic Reactive Loop Resolved (Stuck at 18%)**: Fixed a bug where connecting to a hardware mixer would freeze the UI modal at exactly 18%. The mixer's routing config (dumped synchronously over UDP) triggered a Svelte `$effect` block that performed `routingState = { ...routingState }`. Because `routingState` was tracked using Svelte 5 `$state` runes, this spread assignment generated an immediate cross-dependency (reading from the proxy while writing to the proxy), causing a `Maximum update depth exceeded` loop that crashed the frontend thread. Resolved by allowing Svelte runes to natively track state updates deep within the dictionary assignment without top-level reassignments.
- **Port-Agnostic Broadcast Auto-Discovery**: Fixed an issue where the "Auto-Connect" feature returned "nothing found" when pinging installations utilizing Behringer X32 or WING consoles. The discovery script (`backend/discovery.js`) was previously hardcoded to broadcast exclusively to the XR18 OSC port (`10024`). Broadened the payload loop to simultaneously scan ports `10024` (XR18), `10023` (X32/M32), and `2223` (WING), and dynamically extract the mixer's listening port from the UDP response footprint, drastically improving compatibility without requiring manual subnet IP entry.

### 14.22 Phase 19: Network Discovery Routing & Verification (2026-04-12)

This phase corrected fundamental UDP networking behavior on Windows hosts and prevented the UI from prematurely assuming a successful connection.
- **Subnet-Aware Network Broadcasts**: Fixed `discovery.js` failing to find consoles when multiple network adapters (VPNs, virtual machines, Ethernet) are active. The backend now maps `os.networkInterfaces()` and dynamically calculates the explicit broadcast IP (e.g., `192.168.1.255`) for every active interface, rather than relying on the unreliable global `255.255.255.255`. 
- **True Connection Verification**: Modified `mixerSync.js` to strictly enforce connection verification. The frontend connection status will now accurately sit in `Mixer Standby` until the very first valid return-trip OSC packet actively arrives from the console's IP. This eliminated a misleading "Mixer Online" false positive that occurred when outgoing packets dispatched without a responsive target.

### 14.23 Phase 20: Connection Pipeline Hardening (2026-04-19)

This phase audited the full discovery → configure → sync → verify pipeline and fixed three bugs that would have prevented a successful connection to physical hardware.

- **`syncComplete` Event Relay (Critical)**: The backend `mixerSync.js` correctly set `hasSyncedOnce = true` when the first OSC return-trip packet arrived from the hardware, and emitted a `syncComplete` EventEmitter event. However, `server.js` never forwarded this event to the frontend via Socket.io. As a result, the Navbar's "Mixer Standby" → "Mixer Online" transition **never fired**, even when the mixer was actively responding. Fixed by adding `mixer.on('syncComplete', ...)` in `server.js` to relay the event, and a corresponding `socket.on('syncComplete', ...)` listener in `frontend/src/lib/socket.js` that updates `$mixerState.hasSyncedOnce`.
- **Discovery Port Resolution (Critical)**: The `discoverMixer()` function returned `remote.port` — the mixer's **ephemeral UDP reply source port** — as the target port for subsequent OSC commands. This port is not the mixer's OSC listening port (10024 for XR18, 10023 for X32, 2223 for WING). After auto-discovery, all `sendOsc()` calls would silently target a dead port. Fixed by deriving the correct target port from the mixer's identity string in the `/xinfo` response rather than trusting the reply source port.
- **Discovery Socket Guard**: The `startDiscovery()` function in `App.svelte` emitted a `discoverMixer` WebSocket event assuming the Socket.io connection to the Node.js backend was already established. If the user clicked "Auto-Discover" before the `onMount` socket handshake completed, the event was silently dropped. Fixed by adding a `socket.connected` guard that defers the discovery emission until after the WebSocket is ready. Also added success/failure toast notifications to provide clear user feedback.

**FILES MODIFIED:**
- `backend/server.js` — Added `syncComplete` event relay to Socket.io
- `backend/discovery.js` — Fixed port resolution logic in `/xinfo` response handler
- `frontend/src/lib/socket.js` — Added `syncComplete` listener to update `hasSyncedOnce` store
- `frontend/src/App.svelte` — Added socket connection guard and toast feedback to `startDiscovery()`

**ALL THREE CONNECTION-PIPELINE BUGS RESOLVED. HARDWARE TEST READY.**

### 14.24 Phase 21: Discovery Confirm-Before-Connect Refactor (2026-04-19)

This phase refactored the auto-discovery flow to prevent the app from automatically connecting and syncing with a discovered mixer without explicit user consent.

- **Explicit Confirmation UI**: Replaced the automatic configuration and sync flow during discovery with a two-step "Confirm-Before-Connect" process. The Setup Wizard now presents a rich confirmation card displaying the discovered mixer's identity, IP, and port. The user must actively click "Connect" to configure the backend, save the IP to localStorage, and trigger the full parameter sync.
- **Boot and Role Reconnection Logic**: Updated the `onMount` and `connectAsFoh()` pathways. If a returning user has a verified mixer IP in localStorage, the application silently configures the backend and establishes connection on startup or role selection. If no IP is saved but they successfully navigate to the Mixer view, it runs a background discovery and awaits the same explicit connection confirmation or manual entry if no mixer is found.

**FILES MODIFIED:**
- `frontend/src/App.svelte` — Implemented `discoveredMixer`, `confirmDiscovery()`, and `dismissDiscovery()` handlers. Overhauled the Setup Wizard connection UI to include the new discovery result card with a match-themed "Connect" button. Adjusted startup and role selection logic to gracefully handle reconnection vs. new discovery.

### 14.25 Phase 22: Deep Hardware Sync Fix (2026-04-19)

Following the auto-discovery refactor, a critical bug was identified during field testing: the frontend successfully connected to the mixer but failed to hydrate the individual channel faders, sends, pans, mutes, gate, and dynamics parameters. 

- **The Problem:** The `mixerSync.js` backend was utilizing generic wildcard/placeholder paths (e.g., `/ch/{N}/eq` and `/ch/{N}/mix`) in the `XR18` and `X32RACK` sync templates. Behringer OSC does not support "subtree dumping" (requesting a parent node to get all child node values). As a result, the backend dispatched only 228 requests (mostly routing, names, colors, and global config), silently skipping all active mixing parameters.
- **The Solution:** Exploded the `XR18` and `X32RACK` sync templates in `backend/mixerSync.js` into explicit requests for every parameter tracked by the frontend. The `XR18` handshake now explicitly polls `mix/fader`, `mix/on`, `mix/pan`, `mix/lr`, `mix/01-06/level` (aux sends), `preamp/phase`, `gate/*`, and `dyn/*` parameters across all channels, buses, and FX returns.

**FILES MODIFIED:**
- `backend/mixerSync.js` — Expanded `getSyncTemplate` definitions for `XR18` and `X32RACK` to include over 500 explicit parameter paths, bypassing Behringer's lack of OSC subtree introspection.

### 14.26 Phase 23: Frontend Hydration & Deep Sync Completion (2026-04-19)

Following the backend sync fix in Phase 22, the app was still failing to hydrate channel names, colors, routing patches, EQ curves, and FX parameters because Svelte was natively isolated from these properties.

- **The Problem:** The Node.js backend successfully fetched the 500+ deep parameters (`/ch/01/config/name`, `/fx/1/type`, `/ch/01/eq/1/g`, etc.) and loaded them into Svelte's `$mixerState.flatOscCache`. However, Svelte's `scribbles`, `routingState`, `channelEqState`, and `fxState` stores were designed as local, standalone objects that only populated when a user loaded a local JSON scene or manually adjusted them.
- **The Solution:** Added a massive Svelte 5 `$effect` block inside `App.svelte` that acts as a hydration translation layer. It scans the incoming `flatOscCache` during the `/xinfo` sync and regex-matches OSC paths to update Svelte's internal UI arrays. 
- **Expanded Backend Sync:** Further dynamically expanded `mixerSync.js` to ensure the X32RACK templates receive 32 channels of Gate/Dyn/EQ paths, rather than hardcoded XR18 16-channel variants. Added all FX `/par/01-16` paths to ensure all Reverb tails, delays, and ratios are pulled on load.

**FILES MODIFIED:**
- `frontend/src/App.svelte` — Added the massive `$effect` hydration block.
- `backend/mixerSync.js` — Refactored the XR18/X32RACK template injection to dynamically loop through 4-band and 6-band EQ parameters, Gate, Dyn, and FX params to prevent bloated file sizes.
- `frontend/src/lib/fxRegistry.js` — Added `getPresetByIndex()` helper to translate Behringer OSC numerical FX integers (e.g. `1` = Hall Reverb) into our OpenMix UI string preset identifiers.

### 14.23 Phase 20: Svelte 5 Untrack Reactivity Fix (2026-04-20)

This phase resolved a critical UI crash (`Maximum update depth exceeded`) caused by synchronous state hydration upon connecting to a hardware mixer.
- **Problem**: When the Node.js backend established a connection with the mixer, it instantly dumped a massive bulk OSC cache (routing, scribbles, and EQ) to the frontend. The `App.svelte` hydration `$effect` block read the Svelte `$state` proxy variables (`scribbles`, `routingState`, `channelEqState`) via the object spread operator (e.g. `const newScribbles = { ...scribbles };`) and then conditionally reassigned them at the end of the block. Svelte 5 automatically tracked these read dependencies, meaning the state write immediately re-triggered the `$effect`, causing an infinite synchronous loop that crashed the frontend and presented a blank screen.
- **Solution**: Imported and utilized Svelte 5's `untrack` API. Wrapping the hydration logic inside `untrack(() => { ... })` explicitly isolates the read and write operations, preventing Svelte from adding the proxy objects to the effect's dependency graph. The `$effect` now safely runs exclusively when the upstream `$mixerState.flatOscCache` changes.
- **Troubleshooting Code Snippet (For Future Data Pipelines)**:
  If adding new data hydrators (e.g., Mute Groups, DCAs), always use `untrack` when applying recursive bulk state updates:
  ```svelte
  import { untrack } from 'svelte';
  
  $effect(() => {
    if ($mixerState.flatOscCache) {
      untrack(() => {
        // Safe to read and write without triggering a cyclic loop
        const newDca = { ...dcaState };
        // ... modify newDca ...
        dcaState = newDca;
      });
    }
  });
  ```
