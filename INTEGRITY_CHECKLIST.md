# OpenMix Integrity Checklist — Manual Verification (No Mixer)

> **Purpose**: Exhaustive pre-field-test checklist to verify every UI flow, interaction, and visual state **without** a physical mixer connected. Run through each section sequentially. Mark ✅ or ❌.
>
> **Setup**: `npm run dev` from root. Open `http://localhost:5173` in a Chromium-based browser at ≥ 1280×720.

---

## 1. Application Bootstrap

| # | Check | Status |
|---|-------|--------|
| 1.1 | App loads without console errors (open DevTools → Console) | ☐ |
| 1.2 | "OpenMix" brand text visible in the top-left navbar | ☐ |
| 1.3 | Connection status indicator shows in the navbar (green "Connected" or red "Disconnected") | ☐ |
| 1.4 | No blank white screen or hydration errors | ☐ |

---

## 2. Role Selection Screen

| # | Check | Status |
|---|-------|--------|
| 2.1 | Two role cards visible: "FOH Engineer" (blue icon) and "Musician" (purple icon) | ☐ |
| 2.2 | "OPENMIX" title and "Select your role" subtitle centered above cards | ☐ |
| 2.3 | Cards are in a horizontal row (not stacked vertically) | ☐ |
| 2.4 | Hovering FOH card shows blue ring effect + card lifts slightly | ☐ |
| 2.5 | Hovering Musician card shows purple ring effect + card lifts slightly | ☐ |
| 2.6 | Each card has: icon container, title, description text, right arrow | ☐ |
| 2.7 | "Re-configure Console" link visible below the cards | ☐ |
| 2.8 | Clicking "Re-configure Console" opens the Setup Wizard | ☐ |

---

## 3. Musician AUX Selection Flow

| # | Check | Status |
|---|-------|--------|
| 3.1 | Clicking "Musician" card navigates to "Select your monitor bus" screen | ☐ |
| 3.2 | AUX grid shows correct number of bus cards (matches config) | ☐ |
| 3.3 | Each AUX card displays bus number and "Output N" label | ☐ |
| 3.4 | AUX cards have purple-accent hover state | ☐ |
| 3.5 | "← Back to Roles" link visible and functional | ☐ |
| 3.6 | Clicking an AUX card enters the Musician mix view | ☐ |
| 3.7 | AUX selection grid is centered in the viewport (place-items: center) | ☐ |
| 3.8 | AUX cards display custom names from scribble strips if available | ☐ |
| 3.9 | Musician view shows fader strips for channels with the selected AUX master fader on the right | ☐ |
| 3.10| "Exit Monitor Mix" button returns to role selection | ☐ |

---

## 4. FOH Mixer View — Mixer Tab

| # | Check | Status |
|---|-------|--------|
| 4.1 | Clicking "FOH Engineer" enters the mixer rack view | ☐ |
| 4.2 | 6 top tabs visible: MIXER, CHANNEL, EQ, SENDS, FX, ROUTING | ☐ |
| 4.3 | MIXER tab is active by default (highlighted) | ☐ |
| 4.4 | Channel strips render with: Gate mini-graph, Comp mini-graph, Pan knob, M (mute) button, S (solo) button, fader, dB readout, channel number label | ☐ |
| 4.5 | Right sidebar shows: LAYERS (Inputs/Outputs/DCAs), STRIPS (count ±), BANK (pagination) | ☐ |
| 4.6 | Clicking INPUTS/OUTPUTS/DCAS switches the channel layer | ☐ |
| 4.7 | Strip count +/- buttons change the number of visible strips | ☐ |
| 4.8 | Bank pagination (< >) navigates through channel pages | ☐ |
| 4.9 | Bank indicator shows "N / M" (current / total) accurately | ☐ |

---

## 5. FOH — Channel Strip Interactions

| # | Check | Status |
|---|-------|--------|
| 5.1 | Fader thumb is draggable vertically | ☐ |
| 5.2 | dB readout updates in real-time while dragging fader | ☐ |
| 5.3 | Mute (M) button toggles red active state on click | ☐ |
| 5.4 | Solo (S) button toggles active state on click | ☐ |
| 5.5 | Pan knob position displays as "C" at default center | ☐ |
| 5.6 | Clicking "C" label below the pan knob label does not cause errors | ☐ |
| 5.7 | Channel number label visible below each strip | ☐ |

---

## 6. FOH — Stereo Link

| # | Check | Status |
|---|-------|--------|
| 6.1 | Clicking the CHANNEL tab → selecting a channel shows the bento grid | ☐ |
| 6.2 | "Stereo Link" card shows "CH N – CH N+1" with OFF label | ☐ |
| 6.3 | Toggling stereo link changes the bento card state (ON/OFF) | ✅ |
| 6.4 | Switching back to MIXER tab: linked channels show a "ST" badge or color pairing | ☐ |
| 6.5 | Toggling link off: MIXER tab strips revert to independent appearance | ☐ |
| 6.6 | Opening the Channel Modal on a linked channel: "LINKED" badge appears in the Output section | ☐ |

---

## 7. FOH — Channel Tab (Bento Grid)

| # | Check | Status |
|---|-------|--------|
| 7.1 | Channel tab shows "CHANNEL: IN_N" header with < > navigation | ☐ |
| 7.2 | < > arrows cycle through channels (wrap at boundaries or stop) | ☐ |
| 7.3 | Bento grid cards visible: Channel Icon, Preamp, Gate, Compressor, EQ Preview, Output & Main Assign, Stereo Link | ☐ |
| 7.4 | Preamp card shows: Gain (dB), 48V toggle, Phase toggle | ☐ |
| 7.5 | Gate card shows: Threshold, Range, Attack, Hold, Release | ☐ |
| 7.6 | Compressor card shows: Threshold, Ratio, Attack, Release, Makeup | ☐ |
| 7.7 | Output & Main Assign card shows: Pan, Level, LR Assign toggle | ☐ |
| 7.10 | Numeric input fields accept typed values (click → type → blur) | ☐ |
| 7.11 | Clicking the EQ Preview card redirects to the EQ tab | ☐ |

---

## 8. Channel Modal — General

| # | Check | Status |
|---|-------|--------|
| 8.1 | Clicking any bento card opens the Channel Modal | ☐ |
| 8.2 | Modal shows "CH N" label and channel name at top-left | ☐ |
| 8.3 | X (close) button in top-right dismisses modal | ☐ |
| 8.4 | Left sidebar shows sections: Preamp, Gate, Dynamics, Output | ☐ |
| 8.5 | Clicking each sidebar item switches the modal content area | ☐ |
| 8.6 | Active sidebar item has blue highlight with left border accent | ☐ |
| 8.7 | Modal opens on the section matching the clicked bento card | ☐ |

---

## 9. Channel Modal — Preamp Section

| # | Check | Status |
|---|-------|--------|
| 9.1 | Shows Gain fader/knob with dB readout | ☐ |
| 9.2 | 48V toggle button works (active = red glow) | ☐ |
| 9.3 | Phase toggle button works (active state visible) | ☐ |
| 9.4 | All controls are interactive (draggable/clickable) | ☐ |

---

## 10. Channel Modal — Gate Section

| # | Check | Status |
|---|-------|--------|
| 10.1 | Three graph panels visible: "GATE CURVE", "GAIN ENVELOPE", "SIDE CHAIN FILTER" | ☐ |
| 10.2 | All three panel titles are fully visible (not clipped) | ☐ |
| 10.3 | Gate Curve shows cyan polyline that responds to threshold changes | ☐ |
| 10.4 | Gain Envelope shows attack/hold/release time-domain shape | ☐ |
| 10.5 | Sidechain Filter shows a knob with label (e.g., "2-POLE") and frequency value | ☐ |
| 10.6 | Five faders below: THR, RANGE, ATTACK, HOLD, REL | ☐ |
| 10.7 | All fader labels are fully visible (not cut off at bottom) | ☐ |
| 10.8 | Dragging faders updates both the value display and the graph above | ☐ |
| 10.9 | Fader thumbs have blue gradient styling | ☐ |

---

## 11. Channel Modal — Dynamics Section

| # | Check | Status |
|---|-------|--------|
| 11.1 | Three graph panels visible: "COMPRESSION CURVE", "COMPRESSION ENVELOPE", "SIDE CHAIN FILTER" | ☐ |
| 11.2 | All three panel titles are fully visible (not clipped) | ☐ |
| 11.3 | Compression Curve shows green polyline with knee at threshold | ☐ |
| 11.4 | Compression Envelope shows attack/release shape | ☐ |
| 11.5 | Sidechain Filter shows knob with "HPF ON/OFF" label | ☐ |
| 11.6 | Five faders below: THR, RATIO, ATTACK, RELEASE, GAIN | ☐ |
| 11.7 | All fader labels are fully visible (not cut off at bottom) | ☐ |
| 11.8 | Dragging faders updates values and graphs interactively | ☐ |
| 11.9 | Fader thumbs have green gradient styling | ☐ |

---

## 12. Channel Modal — Output Section

| # | Check | Status |
|---|-------|--------|
| 12.1 | "L/R BUS ROUTING" header and "MAIN L/R BUS" button visible | ☐ |
| 12.2 | MAIN L/R BUS button starts OFF (dark) when LR Assign is OFF in bento grid | ✅ |
| 12.3 | Toggling MAIN L/R BUS to ON shows amber/active styling | ✅ |
| 12.4 | Closing modal → bento grid LR Assign reflects the new state | ✅ |
| 12.5 | Toggling LR Assign in bento grid → opening modal → Output section matches | ✅ |
| 12.6 | Panorama slider visible with L/R labels and "C" center indicator | ☐ |
| 12.7 | Level fader visible with dB readout | ☐ |
| 12.8 | If channel is stereo-linked: "LINKED" badge appears | ☐ |
| 12.9 | If channel is NOT linked: no LINKED badge shown | ☐ |

---

## 13. EQ Tab

| # | Check | Status |
|---|-------|--------|
| 13.1 | EQ tab shows canvas-based parametric EQ curve | ☐ |
| 13.2 | EQ band dots are visible on the curve (up to 8 colored dots) | ☐ |
| 13.3 | Clicking/dragging a dot adjusts frequency (horizontal) and gain (vertical) | ☐ |
| 13.4 | Band sidebar shows frequency, gain, Q values for active band | ☐ |
| 13.5 | HPF/LPF filter types are selectable | ☐ |
| 13.6 | EQ ON/OFF toggle functions | ☐ |

---

## 14. Sends Tab

| # | Check | Status |
|---|-------|--------|
| 14.1 | Sends tab renders with multi-column layout (AUX / FX columns) | ☐ |
| 14.2 | If mixer has matrix buses: 3-column layout (AUX / FX / Matrix) | ☐ |
| 14.3 | If mixer lacks matrix buses: 2-column layout (AUX / FX only, no grey Matrix col) | ☐ |
| 14.4 | Each send strip has a fader and level readout | ☐ |
| 14.5 | Pre/Post send point toggle works per bus | ☐ |
| 14.6 | Pagination arrows navigate through send buses per column | ☐ |

---

## 15. FX Tab

| # | Check | Status |
|---|-------|--------|
| 15.1 | FX tab renders without errors | ✅ |
| 15.2 | FX rack slots are visible (up to 4 for XR18, 8 for X32) | ✅ |
| 15.3 | Slot header shows "FX SLOT N" and the category (Utility/Reverb/etc.) | ☐ |
| 15.4 | "Category" dropdown shows Reverb, Delay, Chorus, Utility, etc. | ☐ |
| 15.5 | "Effect Type" dropdown updates correctly when Category changes | ☐ |
| 15.6 | Switching from Hall Reverb to Vintage Room (same category) resets the visualizer | ☐ |
| 15.7 | Adjusting FX knobs (e.g., Decay) updates the UI and emits OSC | ☐ |
| 15.8 | Bypass toggle in the slot header turns red and dims the module | ☐ |
| 15.9 | Level slider in the sidebar updates the Return value in real-time | ☐ |
| 15.10| Graphic EQ: Double-clicking a fader resets it to 0dB | ☐ |
| 15.11| Graphic EQ: Dragging across faders (Glide) draws a curve accurately | ☐ |
| 15.12| Graphic EQ: Curve preview canvas matches the fader positions | ☐ |
| 15.13| Fair Comp: VU needle rests at **0 (far left)** and moves **right** on compression | ☐ |
| 15.14| Fair Comp: Meter face is yellow with white scale ticks and black text | ☐ |
| 15.15| Fair Comp: Controls (Input, Thr, Time, Output) use standard black dials | ☐ |
| 15.16| Stereo Enhancer: Pink-themed UI loads with Low/High/Mix controls | ☐ |
| 15.17| Stereo Enhancer: "Phase Compensated Excitation" shimmer visualizer is active | ☐ |
| 15.18| Pitch Shifter: LCD display shows numeric semi-tone value (e.g., +2 SEMI) | ☐ |
| 15.19| Header Standard: All FX headers show "OPENMIX" brand and model name | ☐ |
| 15.20| Empty Slots: Uninitialized modules show a premium dashed-metal layout with an icon | ☐ |

---

## 16. Routing Tab

| # | Check | Status |
|---|-------|--------|
| 16.1 | Routing tab shows the icon mode bar at top (Input, USB Returns, etc.) | ☐ |
| 16.2 | Selecting a routing mode shows a patching matrix grid | ☐ |
| 16.3 | Grid rows = Destinations, columns = Sources | ☐ |
| 16.4 | Clicking an intersection dot toggles patch assignment | ☐ |
| 16.5 | Toast notification appears on patch/unpatch | ☐ |
| 16.6 | Matrix fits vertically without requiring excessive scrolling | ☐ |
| 16.7 | Custom scrollbar styling applied (dark theme) | ☐ |

---

## 17. Navbar Actions

| # | Check | Status |
|---|-------|--------|
| 17.1 | "Monitor" button opens the Monitor Modal | ☐ |
| 17.2 | Monitor Modal shows solo source options | ☐ |
| 17.3 | "Scribble Strips" button opens the Scribble Editor | ☐ |
| 17.4 | Scribble Editor allows changing: name, icon, color | ☐ |
| 17.5 | Changes persist after closing editor | ☐ |
| 17.6 | "Export Scene" button triggers a JSON file download | ☐ |
| 17.7 | Downloaded JSON contains `state.flatOscCache` and `uiConfig` keys | ☐ |
| 17.8 | "Import Scene" button accepts a JSON file and restores state | ☐ |
| 17.9 | After import: scribble strips, fader positions, and EQ reflect imported data | ☐ |
| 17.10 | Fullscreen toggle button works | ☐ |
| 17.11 | "Exit Role" button returns to the role selection screen | ☐ |
| 17.12 | Loading an incompatible scene file (e.g. X32 on XR18) triggers a warning toast | ☐ |
| 17.13 | Loading a compatible scene file restores state successfully | ☐ |

---

## 18. Scene Export/Import Roundtrip

| # | Check | Status |
|---|-------|--------|
| 18.1 | Set specific values: rename CH 1 to "KICK", set fader to ~75%, toggle LR Assign ON | ☐ |
| 18.2 | Export scene → file downloads | ☐ |
| 18.3 | Refresh the page (hard reload) | ☐ |
| 18.4 | Import the exported scene file | ☐ |
| 18.5 | CH 1 name shows "KICK" | ☐ |
| 18.6 | CH 1 fader is at ~75% | ☐ |
| 18.7 | LR Assign state matches what was exported | ☐ |

---

## 19. Responsive & Layout

| # | Check | Status |
|---|-------|--------|
| 19.1 | At 1280×720: all tabs render without horizontal overflow | ☐ |
| 19.2 | At 1920×1080: layout fills space proportionally | ☐ |
| 19.3 | Portrait orientation on mobile: "Rotate Your Device" message appears | ☐ |
| 19.4 | Sidebar hides automatically on CHANNEL, ROUTING, and FX tabs | ☐ |
| 19.5 | Sidebar is visible on MIXER, EQ, and SENDS tabs | ☐ |

---

## 20. Setup Wizard

| # | Check | Status |
|---|-------|--------|
| 20.1 | Setup Wizard opens from "Re-configure Console" or initial load | ☐ |
| 20.2 | Hardware preset dropdown shows only Behringer/Midas options | ☐ |
| 20.3 | Selecting a preset populates Input/Output/AUX/FX counts | ☐ |
| 20.4 | "Auto-Discover Mixer" button triggers discovery (may timeout without hardware — that's OK) | ☐ |
| 20.5 | Manual IP input accepts a valid IP address | ☐ |
| 20.6 | Clicking "Start Mixing" proceeds to the role selection screen | ☐ |
| 20.7 | Two-column layout is intact (left = config, right = connection) | ☐ |

---

## 21. Console Errors & Warnings

| # | Check | Status |
|---|-------|--------|
| 21.1 | No unhandled JavaScript errors in DevTools console during full walkthrough | ☐ |
| 21.2 | No Svelte runtime warnings (missing props, reactivity issues) | ☐ |
| 21.3 | No 404 errors for assets (icons, fonts) | ☐ |
| 21.4 | No deprecation warnings from Svelte or Vite | ☐ |

---

## 22. Cross-Section State Consistency

| # | Check | Status |
|---|-------|--------|
| 22.1 | Toggle LR Assign ON in bento grid → open Channel Modal Output → button is ON | ✅ |
| 22.2 | Toggle LR Assign OFF in Channel Modal → close → bento grid shows OFF | ✅ |
| 22.3 | Toggle Stereo Link ON in bento grid → MIXER tab shows ST badge → Channel Modal shows LINKED | ✅ |
| 22.4 | Toggle Stereo Link OFF → all three views revert to unlinked state | ✅ |
| 22.5 | Change fader in MIXER tab → switch to CHANNEL tab → Output section Level fader matches | ✅ |
| 22.6 | Change gate threshold in Channel Modal → close → Gate bento card shows updated value | ✅ |
| 22.7 | Change comp ratio in Channel Modal → close → Compressor bento card shows updated value | ✅ |
| 22.8 | Toggle 48V in bento grid → open Channel Modal Preamp → 48V state matches | ✅ |
| 22.9 | Apply scribble strip changes → channel labels update across MIXER tab, CHANNEL tab header, and Modal title | ✅ |

## 23. Stability & Edge Cases (Role Switching)

| # | Check | Status |
|---|-------|--------|
| 23.1 | Enter Musician role → Return to Role Selection → Enter FOH role → **Immediately** click CHANNEL tab | ☐ |
| 23.2 | Verify 23.1 does NOT cause a white screen or crash | ☐ |
| 23.3 | Verify 23.1 shows Channel 1 (in_1) by default in the bento grid | ☐ |
| 23.4 | Verify Sidebar is HIDDEN during 23.1 | ☐ |
| 23.5 | Rapidly click between MIXER and CHANNEL tabs → UI remains responsive and stable | ☐ |
| 23.6 | Click EQ tab → verify "EQ EDITOR: VIEW" (or name) shows correctly without crashing | ☐ |

---

## 24. Code Quality & Type Safety

| # | Check | Status |
|---|-------|--------|
| 24.1 | No Svelte compiler warnings outputted by `svelte-check` logic (type mismatches) | ✅ |
| 24.2 | `eqComponent` updates trigger correctly because it uses `$state()` | ✅ |
| 24.3 | Application renders channels fully without failing if meter buffers misalign | ✅ |
| 24.4 | DCAs and Mute Group permutations do not cause implicit type coercion to string | ✅ |

---

## 25. Live Hardware Testing (Saturday Field Test)

| # | Check | Status |
|---|-------|--------|
| 25.1 | Auto-Discovery successfully locates the hardware (XR18/X32) over the church Wi-Fi subnet | ☐ |
| 25.2 | The UI automatically switches the `presetId` (Hardware Model) based on the discovered OSC fingerprint | ☐ |
| 25.3 | Check the running terminal `npm run dev`: The simulated progress bar `[████░░░░] 50%` draws flawlessly inline | ☐ |
| 25.4 | The frontend connection modal completes 100% of the sync without stalling at 18% | ☐ |
| 25.5 | Moving a physical fader on the hardware console corresponds with near zero-latency to the Web UI | ☐ |
| 25.6 | Changing an EQ band on the Web UI alters the digital parametric EQ on the master bus | ☐ |
| 25.7 | Console `/xremote` keep-alive maintains connection beyond 10 seconds without dropping packets | ☐ |
| 25.8 | Navbar transitions from "Mixer Standby" (amber dot) to "Mixer Online" (green dot) within 3s of connecting | ☐ |
| 25.9 | Setup Wizard "Auto-Discover" returns a green Confirmation Card showing mixer name and IP | ☐ |
| 25.9b| Clicking "Connect" on the Discovery Confirmation Card targets the correct IP, configures the backend, and transitions the system to "Online" | ☐ |
| 25.10| After discovery, the port field in the Setup Wizard shows **10024** (not a random ephemeral port) | ☐ |

---

## 26. Expected Problems & Failsafes

**Problem: Church network blocks UDP Broadcast packets (Auto-Discovery fails).**
- **Failsafe Added**: Auto-Discovery now maps every active network interface (VPNs, Ethernet, Wi-Fi) and calculates explicit subnet broadcast IPs (e.g., `192.168.1.255`), which bypasses many Windows routing failures. If that still fails, you can find the mixer IP from the physical router or X-Touch terminal and enter it manually. The frontend forces the backend to use the correct `presetId` directly, completely avoiding fallback loops.

**Problem: Offline IP Configuration / Bad IP Address Entered.**
- **Failsafe Present**: The system now strictly verifies return OSC packets. If you enter an incorrect IP address or the router drops it, the top-right navbar will safely remain in **"Mixer Standby"** (grey/yellow) instead of falsely reporting "Mixer Online". It waits until the physical console responds to flip green.

**Problem: Slow Wi-Fi causing sync loops to drop.**
- **Failsafe Present**: The OSC sync engine utilizes a `throttleDelayMs = 5` inside `flushQueue()` preventing the backend from flooding the router's UDP buffer. If the interface stalls, the Svelte 5 loop is no longer cyclic and will properly catch up to whatever payload arrives.

**Problem: The mixer configuration is slightly strange (P16 routing vs traditional Aux).**
- **Failsafe Present**: The Svelte 5 frontend utilizes strict optional chaining (`?.`) when hydrating values from `$mixerState.flatOscCache`. If the XR18 returns unexpected addresses, Svelte will safely default those UI elements to undefined or "off" rather than throwing white-screen crashes.

**Problem: Discovery returns wrong port after auto-discovery (Phase 20 fix).**
- **Failsafe Added**: The `discoverMixer()` function no longer trusts `remote.port` from the UDP reply. Instead, it maps the mixer's identity string to the correct OSC listening port (XR18→10024, X32→10023, WING→2223). This prevents silent command failures where OSC packets are sent to the mixer's ephemeral reply port instead of its command port.

**Problem: Navbar stuck on "Mixer Standby" even when mixer is responding (Phase 20 fix).**
- **Failsafe Added**: The `syncComplete` event is now properly relayed from the backend EventEmitter through Socket.io to the frontend. The `hasSyncedOnce` flag in `$mixerState` is updated the moment the first valid OSC return-trip packet arrives, ensuring accurate connection status.

**Problem: Auto-Discover button clicked before WebSocket is ready (Phase 20 fix).**
- **Failsafe Added**: `startDiscovery()` now checks `socket.connected` before emitting. If the socket isn't ready, it defers the discovery request until after the handshake completes. Toast notifications inform the user of success or failure.

**Problem: Unwanted Auto-Connections via Auto-Discovery.**
- **Failsafe Added**: The Auto-Discovery system now employs a "Confirm-Before-Connect" flow. It will populate a confirmation UI card instead of silently assigning `mixerConfig` and initiating a sync. This prevents disrupting the current mix state or accidentally hijacking an active hardware unit without explicit operator consent.

---

## 27. Field Diagnostic Code Snippets

> **Purpose**: Copy-paste these snippets into a Node.js REPL or save as temporary scripts to diagnose connection issues on-site. Run from the project root.

### 27.1 Verify Network Interfaces & Broadcast Addresses

```js
// Save as: diag_network.js — Run: node diag_network.js
const os = require('os');
const ifaces = os.networkInterfaces();
console.log('=== Active Network Interfaces ===');
for (const [name, addrs] of Object.entries(ifaces)) {
  for (const a of addrs) {
    if (a.family === 'IPv4' && !a.internal) {
      const ip = a.address.split('.').map(Number);
      const mask = a.netmask.split('.').map(Number);
      const bcast = ip.map((p, i) => p | (~mask[i] & 255)).join('.');
      console.log(`  [${name}]  IP: ${a.address}  Mask: ${a.netmask}  Broadcast: ${bcast}`);
    }
  }
}
```

**What to check**: Your laptop's IPv4 address must share the first 3 octets with the XR18 (e.g., both `192.168.1.X`). If you see `169.254.X.X`, DHCP failed — wait 30s or set a static IP.

---

### 27.2 Direct UDP Discovery Probe

```js
// Save as: diag_discovery.js — Run: node diag_discovery.js
const dgram = require('dgram');
const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });

// Build /xinfo OSC packet
const addr = Buffer.from('/xinfo\0\0', 'ascii'); // 8 bytes
const tag  = Buffer.from(',\0\0\0', 'ascii');     // 4 bytes
const pkt  = Buffer.concat([addr, tag]);

sock.on('message', (msg, rinfo) => {
  console.log(`\n✅ MIXER FOUND at ${rinfo.address}:${rinfo.port}`);
  console.log('   Raw response:', msg.toString('ascii').replace(/\0/g, ' '));
  sock.close();
  process.exit(0);
});

sock.bind(() => {
  sock.setBroadcast(true);
  // Try all three Behringer port families
  for (const port of [10024, 10023, 2223]) {
    sock.send(pkt, 0, pkt.length, port, '255.255.255.255');
    console.log(`Sent /xinfo broadcast to 255.255.255.255:${port}`);
  }
});

setTimeout(() => {
  console.log('\n❌ No mixer responded within 5 seconds.');
  console.log('   Checklist:');
  console.log('   1. Is the XR18 powered on?');
  console.log('   2. Is the Remote switch set to ETHERNET?');
  console.log('   3. Are you on the same subnet? (run: ipconfig)');
  console.log('   4. Is Windows Firewall blocking Node.js?');
  sock.close();
  process.exit(1);
}, 5000);
```

---

### 27.3 Direct /xremote Handshake Test

```js
// Save as: diag_handshake.js — Run: node diag_handshake.js <MIXER_IP>
// Example: node diag_handshake.js 192.168.1.100
const dgram = require('dgram');
const MIXER_IP = process.argv[2] || '192.168.1.100';
const MIXER_PORT = 10024;
const sock = dgram.createSocket('udp4');

const xremote = Buffer.from('/xremote\0\0\0\0,\0\0\0', 'ascii');
const xinfo   = Buffer.from('/xinfo\0\0,\0\0\0', 'ascii');

let received = false;

sock.on('message', (msg, rinfo) => {
  received = true;
  console.log(`✅ Reply from ${rinfo.address}:${rinfo.port}`);
  console.log('   Data:', msg.toString('ascii').replace(/\0/g, ' ').trim());
});

sock.bind(() => {
  console.log(`Sending /xremote + /xinfo to ${MIXER_IP}:${MIXER_PORT}...`);
  sock.send(xremote, 0, xremote.length, MIXER_PORT, MIXER_IP);
  sock.send(xinfo,   0, xinfo.length,   MIXER_PORT, MIXER_IP);
});

setTimeout(() => {
  if (!received) {
    console.log(`\n❌ No response from ${MIXER_IP}:${MIXER_PORT}`);
    console.log('   The IP may be wrong, or the mixer is unreachable.');
    console.log('   Try pinging: ping ' + MIXER_IP);
  }
  sock.close();
  process.exit(received ? 0 : 1);
}, 3000);
```

---

### 27.4 Windows Firewall Quick Check

```powershell
# Run in PowerShell (Admin):
# Check if Node.js is allowed through the firewall
Get-NetFirewallRule -DisplayName "*node*" | Format-Table DisplayName, Enabled, Direction, Action

# If no rules exist or they're disabled, add one:
# New-NetFirewallRule -DisplayName "Node.js (OpenMix)" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow -Protocol UDP
```

---

### 27.5 Subnet Mismatch Detection

```powershell
# Quick subnet check — run this at church:
ipconfig | findstr /C:"IPv4" /C:"Subnet"

# Both your laptop and the XR18 must share the same first 3 octets.
# Example GOOD:  Laptop=192.168.1.50, Mixer=192.168.1.100  (same /24 subnet)
# Example BAD:   Laptop=192.168.0.50, Mixer=192.168.1.100  (different subnets!)
#
# If subnets don't match:
#   Option A: Connect to the same router/switch as the XR18
#   Option B: Set a static IP on your laptop in the same range:
#             Control Panel -> Network -> Ethernet -> Properties -> IPv4 -> Use the following IP:
#             IP: 192.168.1.50  Mask: 255.255.255.0  Gateway: 192.168.1.1
```

---

### 27.6 Force Manual Connection (Bypass Discovery)

```js
// If auto-discovery fails but you know the IP, paste this in browser DevTools console:
// (Adjust the IP to match your mixer)

// 1. Get the socket instance
const sock = document.querySelector('body').__svelte_meta?.socket 
  || window.__openmix_socket; // May not be exposed — use Setup Wizard manual IP instead

// Or simply: In the Setup Wizard, type the IP manually and click "Start Mixing".
// The backend will connect directly without needing broadcast discovery.
```

> **Recommended approach**: If discovery fails, just type the mixer IP in the Setup Wizard manually. 
> Find the IP via: router admin page, X-Air Edit app on a phone, or `diag_discovery.js` above.

---

**SIGN-OFF**: If all checks pass ✅, the application is ready for live hardware testing.
