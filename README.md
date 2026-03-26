# OpenMix

**OpenMix** is an open-source, browser-based, universal controller for digital rack mixers, fundamentally designed around modern web frameworks to bypass hardware connection limits. 

It utilizes a centralized Node.js/Socket.io local server, offering a strict, visually stunning, role-based separation between Front of House (FOH) engineers and musicians mixing their own in-ear monitors (IEMs).

## Core Features

- **Abstracted Universal UI**: A clean, scalable, hardware-agnostic interface sporting dark minimalist aesthetics, native `lucide-svelte` iconography, and high-performance SVG animations.
- **Role-Based Sandbox Control**:
  - **FOH Mixer View**: Master control over the entire mixer, 2D Matrix routing (AES50/USB/ULTRANET), hardware presets, and full parameter visibility.
  - **Musician Monitor View**: Touch-optimized, paginated console racks allowing performers zero-risk access strictly to their specific Auxiliary send mixes.
- **X32-Style Channel Modals**: Deep-dive parameter control utilizing dynamic mathematically interactive SVGs for graphical `Gate` bounds, logarithmic `Compressor` ratios, and flat-tracking `<canvas>` based Parametric EQ filtering constraints.
- **Scribble Strip Management**: Completely mutable labeling, icon switching (reading directly from hardware `.bmp` conversions), and visual tint assignment persisted gracefully across sessions.

---

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed along with a stable sub-network connection bridging the hosting device and the digital rack mixer.

### Installation

1. Clone or download this OpenMix repository.
2. Open a terminal and install dependencies:
   ```bash
   npm install
   ```
3. Start the application stack (Backend OSC Hub + Frontend Vite Server):
   ```bash
   npm run dev
   ```
4. Access the web controller from any device on your local network on `http://localhost:5173` (or your mapped local IP).

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
