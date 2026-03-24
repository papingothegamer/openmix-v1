# OpenMix

**OpenMix** is an open-source, browser-based, universal controller for digital rack mixers, starting with the Behringer XR18.

It bypasses hardware connection limits by utilizing a centralized local server, offering a strict, role-based separation between Front of House (FOH) engineers and musicians mixing their own in-ear monitors (IEMs).

## Features
- **Role-Based Access Control**:
  - **FOH**: Master control over the entire mixer, scene management, and secure token generation for musicians.
  - **Musician Sandbox**: Zero-risk, restricted access via a mobile web app to only their specific monitor mix, preventing altering the main PA or others' mixes.
- **Throttled Metering Systems**:
  - High-Res 30+ FPS meters rendered on an HTML5 `<canvas>` for FOH.
  - Bandwidth-friendly "Traffic Light" style meters for musicians.
- **Ableton-Inspired Channel Strips**: An intuitive, vertical-column mixing interface featuring editable channel names, icons, horizontal gain meters, Mute/Solo switches, and precision typable faders.
- **FOH Setup Wizard & Hardware Presets**: Initial setup wizard utilizing built-in structural templates for physical racks (X AIR, X32, M32, WING, Soundcraft Ui, etc), intelligently managing hard-linked paired channels, I/O limits, and visible monitoring buses.
- **Fluid & Paginated UI**: Smart viewport detection spans the active mixer perfectly across sprawling monitors, or automatically parses the UI into intuitive channel pages for tablets and smaller screens.
- **Scribble Strip Editor**: Total freedom for FOH control to assign custom colors, channel names, and native vector X32-style SVG graphics to individual strips.
- **Local File Session Loading**: Rapidly load saved mix sessions directly from the user's mobile or PC file manager.
- **State Persistence (Wake-up Sync)**: Rapid reconnection without UI lag if a mobile device drops connection.
- **App-Level Show Files with "Musician Safe" Mode**: Save and load scenes natively to your local drive without wiping out active monitor mixes during a live set.
- **Abstracted Universal UI**: A clean, scalable, hardware-agnostic interface supporting standard parameter abstractions.

## Architecture
- **Backend (Hub)**: Node.js, Express, Socket.io, translating specific OSC logic over UDP to the physical mixer.
- **Frontend (Clients)**: Svelte/Vue-based high-performance UI connected via WebSockets.

## Getting Started
*(Coming Soon - Initial setup instructions will be provided once the project structure is completed)*
