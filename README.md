# OpenMix

OpenMix is a high-performance, browser-accessible digital mixer controller designed exclusively for **Behringer** and **Midas** ecosystem consoles (X32, M32, X-Air, M-Air, and WING). It provides a responsive, professional-grade interface for FOH, monitor mixing, and personal monitor control.

## Supported Hardware

- **Behringer X32 Family**: X32, X32 Rack, X32 Compact, X32 Producer, X32 Core
- **Midas M32 Family**: M32, M32R, M32C
- **Behringer X-Air Family**: XR18, XR16, XR12
- **Midas M-Air Family**: MR18, MR12
- **Behringer WING**

## Core Features

- **Abstracted Universal UI**: A clean, scalable, hardware-agnostic interface sporting dark minimalist aesthetics, native `lucide-svelte` iconography, and high-performance SVG animations.
- **Role-Based Sandbox Control**:
  - **FOH Mixer View**: Master control over the entire mixer, 2D Matrix routing (AES50/USB/ULTRANET), hardware presets, and full parameter visibility.
  - **Musician Monitor View**: Touch-optimized, paginated console racks allowing performers zero-risk access strictly to their specific Auxiliary send mixes.
- **X32-Style Channel Modals**: Deep-dive parameter control utilizing dynamic mathematically interactive SVGs for graphical `Gate` bounds, logarithmic `Compressor` ratios, and flat-tracking `<canvas>` based Parametric EQ filtering constraints.
- **Scribble Strip Management**: Completely mutable labeling, icon switching (reading directly from hardware `.bmp` conversions), and visual tint assignment persisted gracefully across sessions.
- **Reactive State Synchronization**: All UI components (mixer rack, bento grid, channel modal) read from a single source of truth (`$mixerState.flatOscCache`), ensuring stereo links, LR routing, and parameter changes are reflected instantly across all views.

---

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (≥ 18 LTS) installed along with a stable sub-network connection bridging the hosting device and the digital rack mixer.

### Installation

1. Clone or download this OpenMix repository.
2. Install all dependencies:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```
3. Start the application stack (Backend OSC Hub + Frontend Vite Server):
   ```bash
   npm run dev
   ```
4. Access the web controller from any device on your local network at `http://localhost:5173` (or your mapped local IP).

---

## Recent Changes (v0.13 — 2026-04-05)

### Deep Compile-Time Stability & Error Hardening
- **Strict Svelte 5 Compliance**: Swept application runtime warnings involving reactivity parameters. Safely enclosed component constructors (`eqComponent`) inside Svelte 5 `$state()` runes to guarantee structural updates properly trigger in the DOM rendering loop.
- **Null-Safety on Critical Buffers**: Introduced robust bounds-checking for OSC metering parameters (`fohMeters`) mitigating crash risks associated with object-arrays misalignments and uninitialized default behaviors (`{} => []`).
- **Data-Type Coercion Safeguards**: Hardened derivation logics mapping hardware attributes (e.g. `muteGroups`) from implicit coercion string concatenation variables to deliberate array definitions (`[].length`), reinforcing UI load operations for non-connected offline behaviors.

---

## Recent Changes (v0.12 — 2026-03-31)

### State Synchronization Fixes
- **Stereo Link Reactivity**: `stereoLinks` is now reactively derived from the OSC cache instead of a static dictionary. Toggling a link instantly updates all ChannelStrip badges, color pairings, and the Channel Modal.
- **LR Assign Sync**: The Channel Modal Output section now reads `mainAssign` from the same OSC cache as the bento grid, eliminating the desync where the modal showed "ON" while the grid showed "OFF".
- **Bidirectional Toggle**: Toggling LR Assign from either the bento grid or the modal now optimistically updates the shared cache so both UIs reflect the change immediately.

### UI Modernization
- **Role Selection**: Clean minimalistic card layout with color-coded icons (blue for FOH, purple for Musician), hover ring effects, and proper grid/flex styling.
- **Musician AUX Selection**: Unified card design language with consistent spacing, border radius, and transitions.
- **Gate & Dynamics Layout**: Compact panel arrangement ensuring all graph visualizations (Curve, Envelope, Sidechain Filter) and fader controls fit within the modal without overflow or label clipping.

---

## 🛠️ On-Site Live Testing Guide

When you arrive on-site and physically couple the network to the Behringer/WING mixer hardware, follow this guide to verify robust bi-directional interaction:

### Phase 1: Setup & Auto-Discovery
1. **Network Sync**: Ensure the mixer and the host PC are on the same subnet.
2. **Hub Initialization**: Enter the `OpenMix` Setup Wizard. Use the `Auto-Discover` mechanism to test UDP pings. Wait for the green active handshake confirming valid IP binding.
3. **Session Construction**: Configure your Inputs and active AUX capacities via the compact form. Proceed into the app.

### Phase 2: FOH Fader & Graphic Rendering
1. **Scribble Synchronization**: Enter the `.edit-badge` settings icon on a channel. Modify the name, set a custom Hex color, and choose `icon_08`. Verify that the physical X32/M32 screen instantly adopts these attributes!
2. **Channel Modals & OSC Intercepts**:
   - Tap the `Compressor` Bento Box on `CH 01`.
   - Scale the `Threshold` slider drastically downward. Observe the live geometric SVG envelope reaction cleanly recalculating within the modal bounds.
   - Verify that dropping the `Gain` on the `Preamp` sub-tab instantly actuates the physical gain staging LEDs on the hardware itself.
3. **EQ Canvas Tracking**:
   - Select the `EQ` tab on a channel block.
   - Validate that dragging a node vertically impacts decibel cut/boosts, while clicking an `HPF12` module cleanly locks axis movements solely to horizontal spectrums.

### Phase 3: Matrix Patching
1. Navigate to the `Routing` UI block.
2. Select any specific protocol tab (e.g., `AES50-A`). 
3. Tap across the 2D Grid intersection mapping `CH 1` to `AUX 1`. Ensure the backend pushes this routing parameter without UI tearing or overflow rendering.

### Phase 4: Musician Paging (Sandbox Mode)
1. Simulate a performer joining. Open `http://<your-hub-ip>:5173` on a mobile browser or trigger the `Exit Role` button natively.
2. Select `Musician`, and bind aggressively to `AUX 4`.
3. Verify the layout paginates correctly with left/right chevrons scaling cleanly 8 channels at a time.
4. Verify the `AUX 4` Master fader sits consistently to the right regardless of viewport horizontal swiping or active channel modification.
5. Attempt touching FOH settings (Routing, EQ, Master). Due to sandbox constraints, these interactions will firmly deny access ensuring safety during live sets.
