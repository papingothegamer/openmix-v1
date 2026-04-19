<script>
  import { onMount } from "svelte";
  import { blur } from "svelte/transition";
  import { get } from "svelte/store";
  import {
    socket,
    isConnected,
    mixerState,
    rawMeters,
    meterLight,
    syncProgress,
    setOsc,
    setSocketAuthToken,
    forceRefresh,
  } from "./lib/socket";
  import ChannelStrip from "./lib/components/ChannelStrip.svelte";
  import Navbar from "./lib/components/Navbar.svelte";
  import Sidebar from "./lib/components/Sidebar.svelte";
  import ScribbleEditor from "./lib/components/ScribbleEditor.svelte";
  import GlobalTabs from "./lib/components/GlobalTabs.svelte";
  import EqEditor from "./lib/components/EqEditor.svelte";
  import SendsPanel from "./lib/components/SendsPanel.svelte";
  import EffectsRack from "./lib/components/EffectsRack.svelte";
  import ChannelModal from "./lib/components/ChannelModal.svelte";
  import MonitorModal from "./lib/components/MonitorModal.svelte";
  import Toast from "./lib/components/Toast.svelte";
  import { showToast } from "./lib/notificationStore";
  import fxState, { loadFxState } from "./lib/fxState";
  import { getPresetByIndex } from "./lib/fxRegistry.js";
  import { MixerPresets, PredefinedMixersArray } from "./lib/mixerPresets";
  import {
    ChevronLeft,
    ChevronRight,
    Edit3,
    Settings,
    Smartphone,
    RotateCcw,
    Search,
    Radio,
    Check,
    X,
    ArrowLeft,
    Sliders,
    Headphones,
    Lock,
    Mic2,
    Usb,
    Network,
    Speaker
  } from "lucide-svelte";

  let fohMeters = $state(new Array(16).fill(-60));

  // Navigation / Focus State
  let activeRole = $state(null); // 'foh' or null
  let activeTab = $state("mixer"); // 'mixer', 'channel', 'eq', 'sends', 'routing', 'fx'
  let routingMode = $state("INPUT"); // 'INPUT', 'USB_RTN', 'USB_SEND', 'ULTRANET', 'AUX_OUT', 'MAIN_OUT', 'AES50_A', 'AES50_B'
  let routingSubTab = $state("CH1-16"); 
  let routingSignalTap = $state("POST_FADER");
  let activeView = $state("inputs"); // 'inputs', 'outputs', 'dcas'
  let currentPage = $state(1);
  let channelsPerPage = $state(8);
  let stripsPerPage = $state(8); // User-configurable visible strips

  // Scribble Strip / Global Selectors
  let scribbleEditMode = $state(false);
  let showMonitorModal = $state(false);
  let editingChannel = $state(null);
  let selectedChannel = $state("in_1");
  
  $effect(() => {
    if (activeRole === 'foh' && !selectedChannel) {
      selectedChannel = 'in_1';
    }
  });

  // Musician Monitor Mix — which aux bus they control
  let musicianAux = $state(null);
  let musicianTokenLoading = $state(false);
  let musicianToken = $state(null);
  let channelFxInsert = $state({}); // Keyed by channelId: slotIndex (0-3) or null
  let perChannelFx = $state({}); // Keyed by channelId: { slots: [...] }
  let rackSlotIndex = $state(0);
  let _lastFxChannel = $state(null);

  $effect(() => {
    if (selectedChannel && selectedChannel !== _lastFxChannel) {
      // 1. Save current FX rack state for the PREVIOUS channel before switching context
      //    Use get() to read the store WITHOUT creating a reactive dependency.
      //    This prevents the feedback loop where fxState changes re-trigger this block.
      if (_lastFxChannel) {
        const currentFx = get(fxState);
        perChannelFx[_lastFxChannel] = { slots: JSON.parse(JSON.stringify(currentFx.slots)) };
      }
      
      // 2. Load or Initialize FX rack state for the NEW channel
      if (!perChannelFx[selectedChannel]) {
        // Initialize fresh 4-slot rack for this channel
        const freshSlots = Array(4).fill(null).map(() => ({ preset: 'Empty', bypass: false, params: {}, level: 0, type: 'generic' }));
        perChannelFx[selectedChannel] = { slots: freshSlots };
      }
      
      // Hydrate $fxState with this channel's context
      loadFxState(perChannelFx[selectedChannel]);
      _lastFxChannel = selectedChannel;

      // Standard reactive slot focus logic
      const ins = channelFxInsert[selectedChannel];
      if (typeof ins === 'number') rackSlotIndex = ins;
    }
  });

  function connectAsFoh() {
    setSocketAuthToken(null);
    try {
      socket.disconnect();
    } catch (_) {}
    
    socket.once("connect", () => {
      if (mixerConfig.ip) {
        // Saved mixer IP exists — configure backend and sync
        socket.emit("configureMixer", {
          ip: mixerConfig.ip,
          port: mixerConfig.port || 10024,
          presetId: config.presetId
        });
        socket.emit("requestSync", { presetId: config.presetId });
        console.log(`[OpenMix] FOH → ${mixerConfig.ip}:${mixerConfig.port || 10024}`);
      } else {
        // No IP saved — auto-discover, then auto-connect if found
        console.log("[OpenMix] No saved mixer IP. Auto-discovering...");
        socket.emit("discoverMixer", null, (result) => {
          if (result) {
            // Auto-connect: the user already chose FOH, so this is implicit consent
            discoveredMixer = result;
            confirmDiscovery(); // fills mixerConfig, configures backend, triggers sync
            socket.emit("requestSync", { presetId: config.presetId });
          } else {
            showToast("No mixer found — open Setup to enter IP manually.", "error");
          }
        });
      }
    });
    
    socket.connect();
  }

  function connectAsMusician(token, auxNum) {
    musicianToken = token;
    musicianTokenLoading = true;
    setSocketAuthToken(token);
    try {
      socket.disconnect();
    } catch (_) {}

    // Only show musician controls after the socket handshake completes.
    socket.once("connect", () => {
      musicianAux = auxNum;
      musicianTokenLoading = false;
    });
    socket.connect();
  }

  function requestMusicianTokenAndConnect(auxNum) {
    if (musicianTokenLoading) return;
    musicianTokenLoading = true;
    // Uses the current socket session (expected to be FOH by default) to mint a token.
    socket.emit("generateToken", auxNum, (res) => {
      if (!res || res.error || !res.token) {
        alert(res?.error || "Failed to generate musician token.");
        musicianTokenLoading = false;
        return;
      }
      connectAsMusician(res.token, auxNum);
    });
  }

  function isGenericName(name, id) {
    if (!name) return true;
    const n = id.split('_').pop();
    const normalized = name.toLowerCase().trim();
    const genericPatterns = [
      `bus ${n}`, `bus${n}`,
      `mixbus ${n}`, `mixbus${n}`,
      `aux ${n}`, `aux${n}`,
      `output ${n}`, `output${n}`,
      `matrix ${n}`, `matrix${n}`,
      `ch ${n}`, `ch${n}`
    ];
    return genericPatterns.some(p => normalized === p.toLowerCase());
  }

  function exitRole() {
    activeRole = null;
    musicianAux = null;
    musicianToken = null;
    musicianTokenLoading = false;
    connectAsFoh();
  }

  // ── Hardware Lifecycle: Meters ──────────────────────────────────────────────
  $effect(() => {
    if (activeTab === 'fx' && $isConnected) {
      // Start/Refresh the high-speed meter stream from mixer
      const meterPulse = setInterval(() => {
        setOsc('/meters', ['/meters/5', 0, 0, 1]); // Request FX meters
      }, 7000); 
      
      // Immediate pulse
      setOsc('/meters', ['/meters/5', 0, 0, 1]);

      return () => clearInterval(meterPulse);
    }
  });

  // Channel Modal State
  let channelModalState = $state({ isOpen: false, channelId: "", section: "preamp" });

  function cycleChannel(dir) {
    if (!selectedChannel || selectedChannel === "main_LR") return;
    const [type, numStr] = selectedChannel.split("_");
    let num = parseInt(numStr, 10) + dir;

    if (type === "in" && num >= 1 && num <= config.inputs) {
      selectedChannel = `in_${num}`;
    } else if ((type === "out" || type === "bus") && num >= 1 && num <= config.outputs) {
      selectedChannel = `bus_${num}`;
    } else if (type === "dca" && num >= 1 && num <= config.dcas) {
      selectedChannel = `dca_${num}`;
    }
  }

  // Chevron boundary detection
  const isFirstChannel = $derived.by(() => {
    if (!selectedChannel || selectedChannel === "main_LR") return true;
    const [type, numStr] = selectedChannel.split("_");
    if (type === "in" || type === "out" || type === "bus" || type === "dca") {
      return parseInt(numStr, 10) <= 1;
    }
    return true;
  });

  const isLastChannel = $derived.by(() => {
    if (!selectedChannel || selectedChannel === "main_LR") return true;
    const [type, numStr] = selectedChannel.split("_");
    const num = parseInt(numStr, 10);
    if (type === "in") return num >= config.inputs;
    if (type === "out" || type === "bus") return num >= config.outputs;
    if (type === "dca") return num >= (config.dcas || 8);
    return true;
  });

  let eqComponent = $state();
  let clipboardEq = null;

  function handleResetEq() {
    if (eqComponent) {
      eqComponent.resetFlat();
      showToast("EQ Reset to Flat", "info");
    }
  }

  function handleCopyEq() {
    if (eqComponent && selectedChannel) {
      clipboardEq = eqComponent.copyEq();
      showToast(`EQ Copied from ${selectedChannel.toUpperCase()}`, "success");
    }
  }

  function handlePasteEq() {
    if (eqComponent && clipboardEq && selectedChannel) {
      eqComponent.pasteEq(clipboardEq);
      showToast(`EQ Pasted to ${selectedChannel.toUpperCase()}`, "success");
    } else if (!clipboardEq) {
      showToast("No EQ in clipboard", "error");
    }
  }

  function handleBypassEq() {
    if (eqComponent) {
      eqComponent.toggleBypass();
      showToast("EQ Bypass Toggled", "info");
    }
  }

  let requiresSetup = $state(localStorage.getItem("openmix_setup") !== "true");
  let config = $state({
    inputs: 16,
    outputs: 6,
    matrices: 6,
    dcas: 8,
    fx: 4,
    presetId: "CUSTOM",
    visibleBuses: [1, 2, 3, 4, 5, 6],
    monitorSources: [],
    muteGroups: [],
  });

  // Mixer connection config
  let mixerConfig = $state(JSON.parse(
    localStorage.getItem("openmix_mixer") || '{"ip":"","port":10024}',
  ));

  let discoveryStatus = $state("idle"); // 'idle' | 'scanning' | 'found' | 'notfound' | 'connected'
  let discoveredMixer = $state(null);   // { ip, port, name } — holds the found device until user confirms

  function startDiscovery() {
    discoveryStatus = "scanning";
    discoveredMixer = null;

    const doDiscovery = () => {
      socket.emit("discoverMixer", null, (result) => {
        if (result) {
          discoveredMixer = result;
          discoveryStatus = "found";
        } else {
          discoveryStatus = "notfound";
          showToast("No mixer found on the network. Check Ethernet/Wi-Fi.", "error");
        }
      });
    };

    if (!socket.connected) {
      socket.once("connect", doDiscovery);
      socket.connect();
    } else {
      doDiscovery();
    }
  }

  /** User confirmed — connect to the discovered mixer */
  function confirmDiscovery() {
    if (!discoveredMixer) return;

    // 1. Populate the mixer config
    mixerConfig.ip = discoveredMixer.ip;
    mixerConfig.port = discoveredMixer.port;
    mixerConfig = { ...mixerConfig };

    // 2. Auto-detect hardware preset
    const nameToUpper = (discoveredMixer.name || '').toUpperCase();
    if (nameToUpper.includes('XR') || nameToUpper.includes('MR') || nameToUpper.includes('X18') || nameToUpper.includes('M18')) {
      config.presetId = 'XR18';
    } else if (nameToUpper.includes('X32') || nameToUpper.includes('M32')) {
      config.presetId = 'X32RACK';
    } else if (nameToUpper.includes('WING')) {
      config.presetId = 'WING';
    }
    applyPreset();

    // 3. Persist
    localStorage.setItem("openmix_mixer", JSON.stringify(mixerConfig));
    localStorage.setItem("openmix_config", JSON.stringify(config));

    // 4. Configure backend and trigger sync
    socket.emit("configureMixer", {
      ip: discoveredMixer.ip,
      port: discoveredMixer.port,
      presetId: config.presetId
    });

    showToast(`Connected to ${discoveredMixer.name} at ${discoveredMixer.ip}:${discoveredMixer.port}`, "success");
    discoveryStatus = "connected";
  }

  /** Dismiss discovery result without connecting */
  function dismissDiscovery() {
    discoveredMixer = null;
    discoveryStatus = "idle";
  }

  // Main LR cannot route to sends/FX/routing
  const disabledTabs = $derived(
    selectedChannel === "main_LR" ? ["sends", "fx", "routing"] : []
  );
  
  $effect(() => {
    if (disabledTabs.includes(activeTab)) {
      activeTab = "channel";
    }
  });

  // Watch config outputs to expand visibleBuses if CUSTOM mode expands globally without setting explicit visibility
  $effect(() => {
    if (
      config.outputs > 0 &&
      (!config.visibleBuses || config.visibleBuses.length === 0)
    ) {
      config.visibleBuses = Array.from(
        { length: config.outputs },
        (_, i) => i + 1,
      );
    }
  });

  function handleForceRefresh() {
    forceRefresh(config.presetId);
    showToast("Requesting full sync from hardware...", "info");
  }

  // Scribble state array tracking
  let scribbles = $state({});

  // Phase 13 Parametric Nodes Reference

  // Per-channel EQ state persistence (survives tab switches)
  let channelEqState = $state({});

  // Sends tab: per-channel per-bus state { level: 0-1, prePost: 0|1 }
  let sendsState = $state({});

  // Routing Architecture Phase 3.8 (X-AIR Layout)
  // Routing Architecture Phase 4 (OSC Integration)
  let routingState = $state({}); // { [dest_id]: src_id }

  /**
   * Maps UI Route IDs to Hardware OSC Paths and Values
   * @param {string} mode - 'INPUT', 'USB_RTN', etc.
   * @param {Object} dest - { id, name }
   * @param {Object} src - { id, name }
   */
  function mapPatchToOsc(mode, dest, src) {
    let path = '';
    let value = 0;
    const isXR = config.presetId === 'XR18';

    // Dest / Src ID parsing
    const destIdx = parseInt(dest.id.split('_').pop()) || 0;
    const srcIdx = parseInt(src.id.split('_').pop()) || 0;
    const dStr = destIdx.toString().padStart(2, '0');

    switch(mode) {
      case 'INPUT':
        path = isXR ? `/ch/${dStr}/config/insrc` : `/config/routing/i/${dStr}`;
        if (src.id === 'off') value = 18;
        else if (src.id === 'sock_aux_l') value = 16;
        else if (src.id === 'sock_aux_r') value = 17;
        else value = srcIdx - 1; // 0-15
        break;
      case 'USB_RTN':
        path = isXR ? `/ch/${dStr}/config/rtnsrc` : `/config/routing/card/${dStr}`;
        if (src.id === 'off') value = 18;
        else value = srcIdx - 1; // 0-17
        break;
      case 'USB_SEND':
        path = isXR ? `/routing/usb/${dStr}/src` : `/config/routing/card/${dStr}`;
        // Note: card/xx in X32 vs usb/xx in XR. 
        // Value mapping for XR: Ch01-16 (0-15), AuxL-R (16-17), Fx1L-Fx4R (18-25), Bus1-6 (26-31), Send1-4 (32-35), L, R (36-37)
        if (src.id.startsWith('in_')) value = srcIdx - 1;
        else if (src.id.startsWith('bus_')) value = 26 + (srcIdx - 1);
        else if (src.id === 'main_l') value = 36;
        else if (src.id === 'main_r') value = 37;
        break;
      case 'ULTRANET':
        path = isXR ? `/routing/p16/${dStr}/src` : `/config/routing/p16/${dStr}`;
        if (src.id === 'off') value = 0; 
        else if (src.id.startsWith('in_')) value = srcIdx - 1;
        else if (src.id.startsWith('bus_')) value = 26 + (srcIdx - 1);
        else if (src.id === 'main_l') value = 36;
        else if (src.id === 'main_r') value = 37;
        break;
      case 'AUX_OUT':
        path = isXR ? `/routing/aux/${dStr}/src` : `/config/routing/aux/${dStr}`;
        if (src.id === 'off') value = 24;
        else if (src.id.startsWith('in_')) value = srcIdx - 1;
        else if (src.id.startsWith('bus_')) value = 16 + (srcIdx - 1);
        else if (src.id === 'main_l') value = 22;
        else if (src.id === 'main_r') value = 23;
        break;
      case 'MAIN_OUT':
        path = isXR ? `/routing/main/${dStr}/src` : `/config/routing/main/${dStr}`;
        if (src.id === 'off') value = 8;
        else if (src.id === 'main_l' || src.id === 'main_r') value = src.id === 'main_l' ? 0 : 1;
        else if (src.id.startsWith('bus_')) value = 2 + (srcIdx - 1);
        break;
    }

    return { path, value };
  }

  function handlePatchChange(dest, src) {
    // 1. Update local optimistic state
    if (routingState[dest.id] === src.id) {
       routingState[dest.id] = null;
       showToast(`${dest.name} unpatched (Off)`, "info");
    } else {
       routingState[dest.id] = src.id;
       showToast(`${dest.name} patched to ${src.name}`, "info");
    }
    routingState = { ...routingState };

    // 2. Emit OSC to hardware
    const { path, value } = mapPatchToOsc(routingMode, dest, src);
    if (path) {
      setOsc(path, [{ type: 'i', value }]);
    }
  }

  // 3. Reactive Hydration (Mixer -> Frontend UI)
  $effect(() => {
    const cache = $mixerState.flatOscCache;
    const configInputs = config.inputs || 16;
    const isXR = config.presetId === 'XR18';

    if (cache && Object.keys(cache).length > 0) {
      // Hydrate INPUT Mode
      for (let i = 1; i <= configInputs; i++) {
        const iStr = i.toString().padStart(2, '0');
        // X-Air uses per-channel insrc/rtnsrc rather than a global table
        const inputPath = isXR ? `/ch/${iStr}/config/insrc` : `/config/routing/i/${iStr}`;
        const inputVal = cache[inputPath]?.[0]?.value;
        
        if (inputVal !== undefined) {
           let srcId = 'off';
           if (inputVal < 16) srcId = `sock_in_${inputVal + 1}`;
           else if (inputVal === 16) srcId = 'sock_aux_l';
           else if (inputVal === 17) srcId = 'sock_aux_r';
           routingState[`in_${i}`] = srcId;
        }

        // Hydrate USB RTN Mode (If separate in UI)
        const usbPath = isXR ? `/ch/${iStr}/config/rtnsrc` : `/config/routing/card/${iStr}`;
        const usbVal = cache[usbPath]?.[0]?.value;
        if (usbVal !== undefined) {
          // Note: On XR, rtnsrc maps 0-17 to U01-18
          let srcId = (usbVal < 18) ? `usb_in_${usbVal + 1}` : 'off';
          // Only apply if we are currently in USB_RTN mode or it won't conflict
          if (routingMode === 'USB_RTN') {
            routingState[`in_${i}`] = srcId;
          }
        }
      }
      
      // Hydrate AUX OUT Mode
      for (let i = 1; i <= 6; i++) {
        const iStr = i.toString().padStart(2, '0');
        const path = isXR ? `/routing/aux/${iStr}/src` : `/config/routing/aux/${iStr}`;
        const val = cache[path]?.[0]?.value;
        if (val !== undefined) {
          let srcId = 'off';
          if (val < 16) srcId = `in_${val + 1}`;
          else if (val < 22) srcId = `bus_${val - 15}`;
          else if (val === 22) srcId = 'main_l';
          else if (val === 23) srcId = 'main_r';
          routingState[`sock_out_${i}`] = srcId;
        }
      }

      // Hydrate MAIN OUT Mode
      for (let i = 1; i <= 2; i++) {
        const iStr = i.toString().padStart(2, '0');
        const path = isXR ? `/routing/main/${iStr}/src` : `/config/routing/main/${iStr}`;
        const val = cache[path]?.[0]?.value;
        if (val !== undefined) {
          let srcId = 'off';
          if (val < 2) srcId = val === 0 ? 'main_l' : 'main_r';
          else if (val < 8) srcId = `bus_${val - 1}`;
          routingState[i === 1 ? 'sock_main_l' : 'sock_main_r'] = srcId;
        }
      }
    }
  });
  
  // Available Modes based on Preset
  const availableRoutingModes = $derived.by(() => {
    const preset = MixerPresets[config.presetId] || MixerPresets.CUSTOM;
    const modes = [
      { id: 'INPUT', name: 'Input', icon: Mic2 },
      { id: 'USB_RTN', name: 'USB Returns', icon: Usb }
    ];
    if (preset.hasUSB) modes.push({ id: 'USB_SEND', name: 'USB Sends', icon: Usb });
    if (preset.hasUltranet) modes.push({ id: 'ULTRANET', name: 'Ultranet', icon: Network });
    modes.push({ id: 'AUX_OUT', name: 'Aux Out', icon: Sliders });
    modes.push({ id: 'MAIN_OUT', name: 'Main Out', icon: Speaker });
    if (preset.hasAES50) {
      modes.push({ id: 'AES50_A', name: 'AES50-A', icon: Network });
      modes.push({ id: 'AES50_B', name: 'AES50-B', icon: Network });
    }
    return modes;
  });

  // Sync SubTab when Mode changes
  $effect(() => {
    if (routingMode === 'INPUT') routingSubTab = "CH1-16";
    if (routingMode === 'USB_RTN') routingSubTab = "CH1-16";
    if (routingMode === 'USB_SEND') routingSubTab = "CH1-16";
  });

  // Reactive Matrix Sets (Phase 3.8.2: DEST=ROWS, SRC=COLS)
  const patchSet = $derived.by(() => {
    const preset = MixerPresets[config.presetId] || MixerPresets.CUSTOM;
    let srcs = [];
    let dests = [];
    let subTabs = [];

    switch(routingMode) {
      case 'INPUT':
        subTabs = ["CH1-16", "CH17-32", "AUX/FX"].filter((_, i) => i * 16 < config.inputs || i === 2);
        // ROWS are Destinations (Ch 1-16...)
        dests = Array.from({ length: 16 }, (_, i) => {
          const offset = routingSubTab === "CH1-16" ? 0 : (routingSubTab === "CH17-32" ? 16 : 32);
          const id = i + offset + 1;
          if (id > config.inputs) return null;
          return { id: `in_${id}`, name: scribbles[`in_${id}`]?.name || `CH ${id}` };
        }).filter(d => d);
        
        // COLS are Sources (Sockets)
        srcs = [
          ...Array.from({ length: 16 }, (_, i) => ({ id: `sock_in_${i+1}`, name: `${(i+1).toString().padStart(2, '0')}` })),
          { id: `sock_aux_l`, name: '17' },
          { id: `sock_aux_r`, name: '18' },
          { id: 'off', name: 'Off' }
        ];
        break;

      case 'USB_RTN':
        subTabs = ["CH1-16", "CH17-32", "AUX/FX"];
        dests = Array.from({ length: 16 }, (_, i) => {
          const offset = routingSubTab === "CH1-16" ? 0 : (routingSubTab === "CH17-32" ? 16 : 32);
          const id = i + offset + 1;
          if (id > config.inputs) return null;
          return { id: `in_${id}`, name: scribbles[`in_${id}`]?.name || `CH ${id}` };
        }).filter(d => d);
        srcs = [
          ...Array.from({ length: 16 }, (_, i) => ({ id: `usb_in_${i+1}`, name: `${(i+1).toString().padStart(2, '0')}` })),
          { id: `usb_aux_l`, name: '17' },
          { id: `usb_aux_r`, name: '18' },
          { id: 'off', name: 'Off (USB 1-18)' }
        ];
        break;

      case 'USB_SEND':
        subTabs = ["USB 1-16", "USB 17-32"];
        dests = Array.from({ length: 16 }, (_, i) => {
          const offset = routingSubTab === "USB 1-16" ? 0 : 16;
          return { id: `usb_out_${i+offset+1}`, name: `USB ${i+offset+1}` };
        });
        srcs = [
          ...Array.from({ length: 16 }, (_, i) => ({ id: `in_${i+1}`, name: `${(i+1).toString().padStart(2, '0')}` })),
          ...Array.from({ length: config.outputs }, (_, i) => ({ id: `bus_${i+1}`, name: `B${i+1}` })),
          { id: 'main_l', name: 'L' }, { id: 'main_r', name: 'R' }
        ];
        break;

      case 'ULTRANET':
        subTabs = ["P16 1-16"];
        dests = Array.from({ length: 16 }, (_, i) => ({ id: `p16_${i+1}`, name: `P16 ${i+1}` }));
        srcs = [
          ...Array.from({ length: 16 }, (_, i) => ({ id: `in_${i+1}`, name: `${(i+1).toString().padStart(2, '0')}` })),
          ...Array.from({ length: config.outputs }, (_, i) => ({ id: `bus_${i+1}`, name: `B${i+1}` })),
          { id: 'main_l', name: 'L' }, { id: 'main_r', name: 'R' },
          { id: 'off', name: 'Off' }
        ];
        break;

      case 'AUX_OUT':
        subTabs = ["AUX 1-16"]; 
        dests = Array.from({ length: 6 }, (_, i) => ({ id: `sock_out_${i+1}`, name: `AUX ${i+1}` }));
        srcs = [
          ...Array.from({ length: 16 }, (_, i) => ({ id: `in_${i+1}`, name: `${(i+1).toString().padStart(2, '0')}` })),
          ...Array.from({ length: 6 }, (_, i) => ({ id: `bus_${i+1}`, name: `B${i+1}` })),
          { id: 'main_l', name: 'L' }, { id: 'main_r', name: 'R' },
          { id: 'off', name: 'Off' }
        ];
        break;
      
      case 'MAIN_OUT':
        subTabs = ["MAIN L/R"];
        dests = [{ id: 'sock_main_l', name: 'MAIN L' }, { id: 'sock_main_r', name: 'MAIN R' }];
        srcs = [
          { id: 'main_l', name: 'MAIN L' }, { id: 'main_r', name: 'MAIN R' },
          ...Array.from({ length: 6 }, (_, i) => ({ id: `bus_${i+1}`, name: `B${i+1}` })),
          { id: 'off', name: 'Off' }
        ];
        break;

      case 'AES50_A':
      case 'AES50_B':
        subTabs = ["OUT 1-16", "OUT 17-32", "OUT 33-48"];
        const aesOffset = routingSubTab === "OUT 33-48" ? 32 : (routingSubTab === "OUT 17-32" ? 16 : 0);
        dests = Array.from({ length: 16 }, (_, i) => ({ id: `aes_out_${i+aesOffset+1}`, name: `AES ${i+aesOffset+1}` }));
        srcs = [
          ...Array.from({ length: 16 }, (_, i) => ({ id: `in_${i+1}`, name: `CH ${i+1}` })),
          ...Array.from({ length: 12 }, (_, i) => ({ id: `bus_${i+1}`, name: `B${i+1}` })),
          { id: 'off', name: 'Off' }
        ];
        break;
    }

    return { srcs, dests, subTabs };
  });

  // Stereo link state: derived reactively from OSC cache so rack always reflects link state
  const stereoLinks = $derived.by(() => {
    const cache = $mixerState?.flatOscCache || {};
    const links = {};
    for (let i = 1; i <= (config.inputs || 32); i += 2) {
      if (extractOscValue(cache[`/config/chlink/${i}`], 0) === 1) links[i] = true;
    }
    return links;
  });
  let outputLinks = $state({}); 


  function toggleStereoLink(ch) {
    const num = typeof ch === 'string' ? parseInt(ch.replace(/\D/g, '')) : ch;
    const oddCh = num % 2 === 1 ? num : num - 1;
    const isLinked = extractOscValue($mixerState?.flatOscCache?.[`/config/chlink/${oddCh}`], 0) === 1;
    const newState = !isLinked;
    
    // Optimistic cache update for immediate UI feedback
    mixerState.update(prev => {
      const newCache = { ...(prev.flatOscCache || {}), [`/config/chlink/${oddCh}`]: newState ? 1 : 0 };
      return { ...prev, flatOscCache: newCache };
    });

    setOsc(`/config/chlink/${oddCh}`, newState ? 1 : 0);
    showToast(`Stereo Link ${newState ? 'Enabled' : 'Disabled'} for CH ${oddCh} ↔ ${oddCh+1}`, "info");
  }

  function toggleOutputLink(ch) {
    const num = typeof ch === 'string' ? parseInt(ch.replace('bus_', '')) : ch;
    const oddCh = num % 2 === 1 ? num : num - 1;
    const newState = !outputLinks[oddCh];
    outputLinks = { ...outputLinks, [oddCh]: newState };
    setOsc(`/config/buslink/${oddCh}-${oddCh + 1}`, newState ? 1 : 0);
  }
  
  function isLinked(ch, _stereoLinksDep) {
    if (typeof ch !== "number") return false;
    const oddCh = ch % 2 === 1 ? ch : ch - 1;
    return !!_stereoLinksDep[oddCh];
  }

  // Main output assignment per channel
  let mainOutAssign = $state({}); // { 'in_1': true, 'in_2': true, ... }
  
  // Monitor / Phones Source
  let monitorSource = $state("LR"); // Fallback
  const soloSources = $derived.by(() => {
    const base = [
      ...(config.monitorSources || [
        { id: "LR", name: "Main LR" },
        { id: "PFL", name: "Inputs PFL" },
        { id: "AFL", name: "Inputs AFL" },
      ]),
    ];

    const busSources = [];
    // Pre-list all potential stereo pairs first as explicitly requested by user
    for (let i = 1; i <= config.outputs; i += 2) {
      if (i + 1 <= config.outputs) {
        busSources.push({ id: `BUS${i}-${i+1}`, name: `Bus ${i}/${i + 1} (Stereo)` });
      }
    }
    
    // Then list individual ones
    for (let i = 1; i <= config.outputs; i++) {
        busSources.push({ id: `BUS${i}`, name: `Bus ${i}` });
    }
    
    return [...base, ...busSources];
  });

  function setMonitorSource(src) {
    monitorSource = src;
    // Map to OSC: X32 has specific enum indices
    setOsc('/config/solo/source', src);
  }
  
  function toggleMainOut(chId) {
    const num = parseInt((chId || '').replace(/\D/g, ''));
    const chStr = String(num).padStart(2, '0');

    // Read current state from the OSC cache (same source as bento grid)
    let address = '';
    if (chId.startsWith("in_")) {
      address = `/ch/${chStr}/mix/lr`;
    } else if (chId.startsWith("fx_")) {
      address = `/rtn/${num}/mix/lr`;
    }

    const currentVal = extractOscValue($mixerState?.flatOscCache?.[address], 0);
    const isCurrentlyOn = currentVal === 1;
    const newState = !isCurrentlyOn;
    
    mainOutAssign = { ...mainOutAssign, [chId]: newState };

    if (address) {
      // Optimistic cache update so all UIs reflect change immediately
      mixerState.update(prev => {
        const newCache = { ...(prev.flatOscCache || {}), [address]: newState ? 1 : 0 };
        return { ...prev, flatOscCache: newCache };
      });
      setOsc(address, newState ? 1 : 0);
    }

    // Trigger visual toast
    if (typeof showToast === 'function') {
      showToast(`Main LR Assign: ${newState ? "ON" : "OFF"}`, "info");
    }
  }

  function handleBandsChange(chId, newBands) {
    channelEqState[chId] = newBands.map((b) => ({ ...b }));
    channelEqState = { ...channelEqState }; // trigger reactivity

    // Emit OSC for each band
    if (chId.startsWith("in_")) {
      const num = chId.replace("in_", "").padStart(2, "0");
      newBands.forEach((band, i) => {
        setOsc(`/ch/${num}/eq/${i + 1}/f`, band.freq);
        setOsc(`/ch/${num}/eq/${i + 1}/g`, band.gain);
        setOsc(`/ch/${num}/eq/${i + 1}/q`, band.q);
        setOsc(`/ch/${num}/eq/${i + 1}/on`, band.enabled ? 1 : 0);
      });
    } else if (chId.startsWith("bus_")) {
      const isXR = config.presetId === 'XR18';
      const n = chId.replace("bus_", "");
      const busPrefix = isXR ? `/bus/${n}/eq` : `/bus/${n.padStart(2, '0')}/eq`;
      newBands.forEach((band, i) => {
        setOsc(`${busPrefix}/${i + 1}/f`, band.freq);
        setOsc(`${busPrefix}/${i + 1}/g`, band.gain);
        setOsc(`${busPrefix}/${i + 1}/q`, band.q);
        setOsc(`${busPrefix}/${i + 1}/on`, band.enabled ? 1 : 0);
      });
    }
  }

  const currentEqBands = $derived(channelEqState[selectedChannel] || null);

  // Initialize flat EQ for channels that have never been synced/edited
  $effect(() => {
    if (selectedChannel && !channelEqState[selectedChannel]) {
      channelEqState[selectedChannel] = [
        { id: 1, type: 'hpf12', freq: 20,  gain: 0, q: 0.71, logVal: 1.301, enabled: false },
        { id: 2, type: 'loshelf', freq: 200, gain: 0, q: 0.71, logVal: 2.301, enabled: true },
        { id: 3, type: 'peq',  freq: 500, gain: 0, q: 1.0,  logVal: 2.699, enabled: true },
        { id: 4, type: 'peq',  freq: 1000,gain: 0, q: 1.0,  logVal: 3.0,   enabled: true },
        { id: 5, type: 'peq',  freq: 2000,gain: 0, q: 1.0,  logVal: 3.301, enabled: true },
        { id: 6, type: 'peq',  freq: 4000,gain: 0, q: 1.0,  logVal: 3.602, enabled: true },
        { id: 7, type: 'hishelf', freq: 8000,gain: 0, q: 0.71, logVal: 3.903, enabled: true },
        { id: 8, type: 'lpf12',  freq: 20000,gain: 0, q: 0.71, logVal: 4.301, enabled: false }
      ];
    }
  });

  // Mini EQ path computation for ChannelStrip previews
  function computeMiniEqPath(chId, w = 100, h = 40) {
    const state = channelEqState[chId];
    if (!state) return "M0,20 L100,20"; // flat line default
    const numPts = 32;
    const logMin = Math.log10(20);
    const logMax = Math.log10(22000);
    let d = "";
    for (let i = 0; i <= numPts; i++) {
      const logFreq = logMin + (i / numPts) * (logMax - logMin);
      const freq = Math.pow(10, logFreq);
      let totalGain = 0;
      for (const b of state) {
        if (!b.enabled) continue;
        const f0 = Math.pow(10, b.logVal);
        const ratio = freq / f0;
        const logR = Math.log2(ratio);
        switch (b.type) {
          case "hpf12":
            totalGain += ratio < 1 ? -12 * Math.log2(1 / ratio) : 0;
            break;
          case "hpf48":
            totalGain += ratio < 1 ? -48 * Math.log2(1 / ratio) : 0;
            break;
          case "lpf12":
            totalGain += ratio > 1 ? -12 * Math.log2(ratio) : 0;
            break;
          case "lpf48":
            totalGain += ratio > 1 ? -48 * Math.log2(ratio) : 0;
            break;
          case "loshelf":
            totalGain += b.gain / (1 + Math.pow(ratio, 2));
            break;
          case "hishelf":
            totalGain += b.gain * (1 - 1 / (1 + Math.pow(ratio, 2)));
            break;
          case "notch": {
            const bw2 = 1 / Math.max(b.q, 0.1);
            const x2 = logR / bw2;
            totalGain += -15 / (1 + x2 * x2);
            break;
          }
          default: {
            const bw = 1 / Math.max(b.q, 0.1);
            const x = logR / bw;
            totalGain += b.gain / (1 + x * x * 4);
            break;
          }
        }
      }
      totalGain = Math.max(-15, Math.min(15, totalGain));
      const x = (i / numPts) * w;
      const y = h / 2 - (totalGain / 15) * (h / 2 - 4);
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
    }
    return d;
  }

  // Convert AUX send level (normalized 0..1) to the ChannelStrip fader scale (-60dB..+10dB).
  function auxSendLevelToDb(norm) {
    const v = Number(norm);
    if (!Number.isFinite(v) || v <= 0) return -60;
    const maxDb = 10;
    const linearAtMax = Math.pow(10, maxDb / 20);
    const linear = v * linearAtMax;
    const db = 20 * Math.log10(linear);
    return Math.max(-60, Math.min(maxDb, db));
  }

  function readFlatOscNumber(address, fallback) {
    return extractOscValue(($mixerState?.flatOscCache || {})[address], fallback);
  }

  function readFlatOscBool(address, fallback = false) {
    return !!readFlatOscNumber(address, fallback ? 1 : 0);
  }

  onMount(() => {
    // Load local configuration before connecting
    const saved = localStorage.getItem("openmix_config");
    if (saved) config = JSON.parse(saved);

    // On first socket connect, push saved mixer config to the backend
    socket.once("connect", () => {
      if (mixerConfig.ip) {
        // Saved IP — configure backend immediately
        socket.emit("configureMixer", {
          ip: mixerConfig.ip,
          port: mixerConfig.port || 10024,
          presetId: config.presetId
        });
        console.log(`[OpenMix] Startup: backend → ${mixerConfig.ip}:${mixerConfig.port || 10024}`);
      } else if (!requiresSetup) {
        // No saved IP but setup done before — auto-discover and auto-connect
        console.log("[OpenMix] Startup: auto-discovering mixer...");
        socket.emit("discoverMixer", null, (result) => {
          if (result) {
            discoveredMixer = result;
            confirmDiscovery();
          }
        });
      }
    });

    socket.connect();

    // Ensure FX slots exist in store for current config
    import("./lib/fxState.js").then((mod) => {
      if (config && typeof config.fx === "number") mod.ensureFxSlots(config.fx);
    });

    return () => socket.disconnect();
  });

  // Hydrate sendsState from backend mixerState.flatOscCache when available
  $effect(() => {
    if ($mixerState && $mixerState.flatOscCache) {
      const cache = $mixerState.flatOscCache || {};
    
    // Completely rebuild updated state to clear any ghost elements from old sessions
    const updated = {}; 
    
    Object.entries(cache).forEach(([path, val]) => {
      // AUX level: /ch/01/mix/02/level
      let m = path.match(/^\/ch\/(\d{2})\/mix\/(\d{2})\/level$/);
      if (m) {
        const ch = parseInt(m[1], 10);
        const bus = parseInt(m[2], 10);
        const key = `in_${ch}_aux${bus}`;
        updated[key] = {
          ...(updated[key] || { level: 0, prePost: 0, on: true }),
          level: parseFloat(val),
        };
        return;
      }
      // AUX on/off: /ch/01/mix/02/on
      m = path.match(/^\/ch\/(\d{2})\/mix\/(\d{2})\/on$/);
      if (m) {
        const ch = parseInt(m[1], 10);
        const bus = parseInt(m[2], 10);
        const key = `in_${ch}_aux${bus}`;
       
        updated[key] = {
          ...(updated[key] || { level: 0, prePost: 0, on: true }),
          on: !!parseInt(val, 10),
        };
        return;
      }
      // AUX pre/post type: /ch/01/mix/02/type
      m = path.match(/^\/ch\/(\d{2})\/mix\/(\d{2})\/type$/);
      if (m) {
        const ch = parseInt(m[1], 10);
        const bus = parseInt(m[2], 10);
        const key = `in_${ch}_aux${bus}`;
        updated[key] = {
          ...(updated[key] || { level: 0, prePost: 0, on: true }),
          prePost: parseInt(val, 10),
        };
        return;
      }
      // FX level: /ch/01/mix/fx/1/level or /ch/01/mix/fx/1/level (some mixers use different padding)
      m = path.match(/^\/ch\/(\d{2})\/mix\/fx\/(\d+)\/level$/);
      if (m) {
        const ch = parseInt(m[1], 10);
        const fx = parseInt(m[2], 10);
        const key = `in_${ch}_fx${fx}`;
        updated[key] = {
          ...(updated[key] || { level: 0, prePost: 0, on: true }),
          level: parseFloat(val),
        };
        return;
      }
      // FX type: /ch/01/mix/fx/1/type
      m = path.match(/^\/ch\/(\d{2})\/mix\/fx\/(\d+)\/type$/);
      if (m) {
        const ch = parseInt(m[1], 10);
        const fx = parseInt(m[2], 10);
        const key = `in_${ch}_fx${fx}`;
        updated[key] = {
          ...(updated[key] || { level: 0, prePost: 0, on: true }),
          prePost: parseInt(val, 10),
        };
        return;
      }
    });
    sendsState = updated;
    }
  });

  // Hydrate Scribbles, Routing, and EQ from backend OSC cache
  $effect(() => {
    if ($mixerState && $mixerState.flatOscCache) {
      const cache = $mixerState.flatOscCache || {};
      
      const newScribbles = { ...scribbles };
      const newRouting = { ...routingState };
      const newEq = { ...channelEqState };
      let updatedScribbles = false;
      let updatedRouting = false;
      let updatedEq = false;

      Object.entries(cache).forEach(([path, val]) => {
        const v = extractOscValue(val, null);
        if (v === null && typeof val !== 'string' && !Array.isArray(val)) return;
        
        // Use string value if available (for names/colors/icons)
        const strVal = Array.isArray(val) ? val[0] : (typeof val === 'object' && val !== null ? val.value : val);

        // --- SCRIBBLES ---
        // Match: /ch/01/config/name
        let m = path.match(/^\/(ch|bus|rtn|mtx)\/(\d{2}|[1-6])\/config\/(name|color|icon)$/);
        if (m) {
          const type = m[1];
          const num = parseInt(m[2], 10);
          const prop = m[3];
          
          let keyId = "";
          if (type === 'ch') keyId = `in_${num}`;
          else if (type === 'bus') keyId = `bus_${num}`;
          else if (type === 'rtn') keyId = `fx_${num}`;
          else if (type === 'mtx') keyId = `mtx_${num}`;
          
          if (!newScribbles[keyId]) newScribbles[keyId] = {};
          
          if (prop === 'name' && newScribbles[keyId].name !== strVal) {
            newScribbles[keyId].name = strVal;
            updatedScribbles = true;
          } else if (prop === 'color') {
            // Convert Behringer color index to Hex if needed, or if it's already Hex just assign it
            const hexColor = isNaN(strVal) ? strVal : (['#000', '#f00', '#0f0', '#ff0', '#00f', '#f0f', '#0ff', '#fff'][parseInt(strVal)%8] || '#3f3f46');
            if (newScribbles[keyId].color !== hexColor) {
              newScribbles[keyId].color = hexColor;
              updatedScribbles = true;
            }
          } else if (prop === 'icon') {
            const iconStr = `icon_${String(strVal).padStart(2, '0')}`;
            if (newScribbles[keyId].iconType !== iconStr) {
              newScribbles[keyId].iconType = iconStr;
              updatedScribbles = true;
            }
          }
          return;
        }

        // --- ROUTING ---
        // Match: /ch/01/config/insrc
        m = path.match(/^\/ch\/(\d{2})\/config\/insrc$/);
        if (m) {
          const ch = parseInt(m[1], 10);
          const srcIdx = parseInt(v, 10); // Behringer uses an index mapping for sources
          // Simplified: Assume 0-15 = Analog In 1-16, 16-31 = USB 1-16
          let mappedSrc = `sock_in_${srcIdx + 1}`; 
          if (srcIdx >= 16) mappedSrc = `usb_in_${srcIdx - 15}`;
          
          if (newRouting[`in_${ch}`] !== mappedSrc) {
            newRouting[`in_${ch}`] = mappedSrc;
            updatedRouting = true;
          }
          return;
        }

        // --- EQ BANDS ---
        // Match: /ch/01/eq/1/g
        m = path.match(/^\/(ch|bus)\/(\d{2}|[1-6])\/eq\/(\d)\/(f|g|q|type)$/);
        if (m) {
          const type = m[1];
          const num = parseInt(m[2], 10);
          const band = parseInt(m[3], 10);
          const param = m[4];
          
          let keyId = "";
          if (type === 'ch') keyId = `in_${num}`;
          else if (type === 'bus') keyId = `bus_${num}`;

          if (!newEq[keyId]) {
            // Initialize 4 bands for CH, 6 for BUS
            const maxBands = type === 'ch' ? 4 : 6;
            newEq[keyId] = Array.from({length: maxBands}, (_, i) => ({
              id: i, enabled: true, freq: 1000, gain: 0, q: 1, type: 'peq'
            }));
          }

          const bIdx = band - 1;
          if (newEq[keyId][bIdx]) {
             if (param === 'g') {
                const gainDb = (v * 30) - 15; // Behringer norm: 0..1 to -15..+15
                if (Math.abs(newEq[keyId][bIdx].gain - gainDb) > 0.1) {
                  newEq[keyId][bIdx].gain = gainDb;
                  updatedEq = true;
                }
             } else if (param === 'f') {
                const freqHz = 20 * Math.pow(1000, v); // standard logarithmic frequency mapping
                if (Math.abs(newEq[keyId][bIdx].freq - freqHz) > 5) {
                  newEq[keyId][bIdx].freq = freqHz;
                  updatedEq = true;
                }
             } else if (param === 'q') {
                const qVal = 10 * v; // Simplified
                if (Math.abs(newEq[keyId][bIdx].q - qVal) > 0.1) {
                  newEq[keyId][bIdx].q = qVal;
                  updatedEq = true;
                }
             } else if (param === 'type') {
                const typeMap = ['loshelf', 'peq', 'hishelf', 'hpf12', 'lpf12', 'hpf48'];
                const tStr = typeMap[parseInt(v, 10)] || 'peq';
                if (newEq[keyId][bIdx].type !== tStr) {
                  newEq[keyId][bIdx].type = tStr;
                  updatedEq = true;
                }
             }
          }
          return;
        }

        // --- FX TYPE ---
        // Match: /fx/1/type
        m = path.match(/^\/fx\/([1-8])\/type$/);
        if (m) {
          const fxIdx = parseInt(m[1], 10) - 1; // 0-indexed for Svelte state
          const presetName = getPresetByIndex(v);
          
          // Since fxState is a writable store, we don't want to blindly spam it.
          // We read it synchronously and apply updates only if it changed.
          // Note: App.svelte's $effect block is safe to do this as it runs in the microtask queue.
          let currentSlots = [];
          fxState.subscribe(s => currentSlots = s.slots)(); // synchronous read
          
          if (currentSlots[fxIdx] && currentSlots[fxIdx].preset !== presetName) {
            // Modify without triggering OSC emit loop (which setSlot does).
            // loadFxState overwrites without emitting. We can just build a new slots array.
            const newSlots = [...currentSlots];
            newSlots[fxIdx] = { ...newSlots[fxIdx], preset: presetName };
            loadFxState({ slots: newSlots });
          }
          return;
        }

      });

      if (updatedScribbles) scribbles = newScribbles;
      if (updatedRouting) routingState = newRouting;
      if (updatedEq) channelEqState = newEq;
    }
  });

  function completeSetup() {
    scribbles = {};
    // Flush constraints from older layouts completely
    localStorage.setItem("openmix_setup", "true");
    localStorage.setItem("openmix_config", JSON.stringify(config));
    localStorage.setItem("openmix_mixer", JSON.stringify(mixerConfig));
    if (mixerConfig.ip) {
      socket.emit("configureMixer", {
        ip: mixerConfig.ip,
        port: mixerConfig.port || 10024,
        presetId: config.presetId
      });
    }
    requiresSetup = false;
  }

  function handleExportScene() {
    if (
      !$mixerState ||
      !Object.keys($mixerState).length ||
      !$mixerState.flatOscCache
    ) {
      alert("No mixer state available to export yet. Please connect first.");
      return;
    }
    const sceneLayout = {
      name: "OpenMix Export",
      mixerType: config.presetId,
      timestamp: Date.now(),
      state: { flatOscCache: $mixerState.flatOscCache },
      uiConfig: {
        config,
        scribbles,
        channelEqState,
        mainOutAssign,
        stereoLinks,
        routingState,
        sendsState,
        fxRack: $fxState,
        channelFxInsert,
        perChannelFx
      },
    };
    const sceneData = JSON.stringify(sceneLayout, null, 2);
    const blob = new Blob([sceneData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openmix-scene-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = ev.target.result;
        const text =
          typeof result === "string"
            ? result
            : new TextDecoder().decode(result);
        const json = JSON.parse(text);
        
        // MIXER AWARENESS: Prevent cross-loading incompatible architectures
        const filePreset = json.mixerType || (json.uiConfig?.config?.presetId);
        const currentPreset = config.presetId;

        if (filePreset && filePreset !== currentPreset) {
          const fileLabel = MixerPresets[filePreset]?.name || filePreset;
          const currentLabel = MixerPresets[currentPreset]?.name || currentPreset;
          showToast(`Incompatible Scene: This file is for ${fileLabel}, but you are connected to ${currentLabel}.`, "error");
          return;
        }

        // WIPE EXISTING STATE TO PREVENT LEFTOVERS FROM PREVIOUS SESSIONS
        scribbles = {};
        channelEqState = {};
        mainOutAssign = {};
        // stereoLinks is derived reactively from OSC cache — no need to reset
        routingState = {};
        sendsState = {};

        if (json.uiConfig) {
          if (json.uiConfig.config) config = json.uiConfig.config;
          
          // MIGRATION: Convert 'out_' keys to 'bus_' in all UI state objects
          const migrateKeys = (obj) => {
            if (!obj) return obj;
            const newObj = {};
            for (const key in obj) {
              const newKey = key.startsWith('out_') ? key.replace('out_', 'bus_') : key;
              newObj[newKey] = obj[key];
            }
            return newObj;
          };

          if (json.uiConfig.scribbles) scribbles = migrateKeys(json.uiConfig.scribbles);
          if (json.uiConfig.channelEqState)
            channelEqState = migrateKeys(json.uiConfig.channelEqState);
          if (json.uiConfig.mainOutAssign)
            mainOutAssign = migrateKeys(json.uiConfig.mainOutAssign);
          // stereoLinks is now derived reactively from $mixerState.flatOscCache
          // Scene import pushes OSC state which updates the cache automatically
          if (json.uiConfig.routingState)
            routingState = json.uiConfig.routingState;
          if (json.uiConfig.sendsState)
            sendsState = migrateKeys(json.uiConfig.sendsState);
          
          if (json.uiConfig.fxRack) {
            const globalVal = json.uiConfig.fxRack;
            // MIGRATION: Link legacy global rack ONLY to the channel it was inserted on
            if (!json.uiConfig.perChannelFx) {
              const inserts = json.uiConfig.channelFxInsert || {};
              // For every channel that had an FX insert, give it the legacy rack
              for (const chId in inserts) {
                 perChannelFx[chId] = JSON.parse(JSON.stringify(globalVal));
              }
              // If NO inserts found, maybe it was just a floating rack, assign to selected?
              if (Object.keys(inserts).length === 0) {
                 perChannelFx[selectedChannel || 'in_1'] = JSON.parse(JSON.stringify(globalVal));
              }
            }
          }
          if (json.uiConfig.channelFxInsert) {
            channelFxInsert = migrateKeys(json.uiConfig.channelFxInsert);
          }
          if (json.uiConfig.perChannelFx) {
            perChannelFx = migrateKeys(json.uiConfig.perChannelFx);
          }
          
          // Force UI refresh after file import
          const current = selectedChannel;
          selectedChannel = '';
          setTimeout(() => {
             selectedChannel = current;
             if (selectedChannel && perChannelFx[selectedChannel]) {
                loadFxState(perChannelFx[selectedChannel]);
             }
          }, 10);

          localStorage.setItem("openmix_config", JSON.stringify(config));
          showToast("Scene Imported Successfully", "success");
        }

        if (
          json.state &&
          json.state.flatOscCache &&
          Object.keys(json.state.flatOscCache).length > 0
        ) {
          socket.emit("pushState", json, (res) => {
            if (res && res.error) alert("Error: " + res.error);
            else
              alert(
                `Session Loaded! (${res ? res.sentCount : "Unknown"} paths successfully dispatched to mixer)`,
              );
          });
        } else {
          alert(
            "UI Configuration loaded successfully! (No OSC state found in file)",
          );
        }
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  }

  // Derived channels layout arrays depending on user config
  const presetHardLinks = $derived(
    config.presetId !== "CUSTOM"
      ? MixerPresets[config.presetId]?.hardLinks?.inputs || {}
      : {}
  );
  
  const inputChannels = $derived(
    Array.from(
      { length: config.inputs },
      (_, i) => i + 1,
    ).filter((ch) => !presetHardLinks[ch]?.hidden)
  );
  
  const outputChannels = $derived([
    ...(config.visibleBuses || Array.from({ length: config.outputs }, (_, i) => i + 1)),
    ...Array.from({ length: config.matrices || 0 }, (_, i) => -(i + 1))
  ]);
  
  const dcaChannels = $derived(
    Array.from(
      { length: (config.dcas || 0) + (config.muteGroups?.length || 0) }, 
      (_, i) => i + 1
    )
  );
  
  const fxChannels = $derived(Array.from({ length: config.fx || 4 }, (_, i) => i + 1));
  
  const currentChannels = $derived(
    activeView === "inputs"
      ? inputChannels
      : activeView === "outputs"
        ? outputChannels
        : dcaChannels
  );

  $effect(() => {
    fohMeters = $rawMeters['/meters/1'] || new Array(16).fill(-60);
  });
  
  // Fluid Pagination Logic
  let containerWidth = $state(0);
  const STRIP_WIDTH = 90;
  // Standard layout size

  const totalPages = $derived(Math.ceil(
    currentChannels.length / Math.max(1, stripsPerPage),
  ));
  
  const displayedChannels = $derived(currentChannels.slice(
    currentPage * stripsPerPage,
    (currentPage + 1) * stripsPerPage,
  ));
  
  // Musician pagination
  let musicianPage = $state(0);
  const musicianTotalPages = $derived(Math.ceil(
    inputChannels.length / Math.max(1, stripsPerPage),
  ));
  
  const musicianDisplayedChannels = $derived(inputChannels.slice(
    musicianPage * stripsPerPage,
    (musicianPage + 1) * stripsPerPage,
  ));
  
  // Watch for layer switches to reset bank
  $effect(() => {
    if (activeView) currentPage = 0;
  });

  function applyPreset() {
    if (config.presetId !== "CUSTOM") {
      const preset = MixerPresets[config.presetId];
      if (preset) {
        console.log(`[OpenMix] Applying Mixer Preset: ${preset.name}`, preset);
        config.inputs = preset.inputs;
        config.outputs = preset.outputs;
        config.matrices = preset.matrices || 0;
        config.dcas = preset.dcas || 8;
        config.fx = preset.fx || 4;
        config.visibleBuses = Array.from(
          { length: preset.outputs },
          (_, i) => i + 1,
        );

        // Reset routing sub-tab if the new mixer doesn't support the current one
        if (routingSubTab === 'aes50a' || routingSubTab === 'aes50b') {
          if (!preset.hasAES50) (routingSubTab = 'busses');
        }
        if (routingSubTab === 'ultranet' && !preset.hasUltranet) {
          routingSubTab = 'busses';
        }

        // --- ADDED RESET LOGIC ---
        activeView = "inputs";
        currentPage = 0;
        musicianPage = 0;
        // -------------------------
      }
    } else {
      console.log("[OpenMix] Switched to Custom Mixer Configuration");
    }
    config = { ...config };
  }

  function handleSaveScribble(e) {
    scribbles[editingChannel] = e.detail;
    // Triggers reactive update mapping on strips
    scribbles = { ...scribbles };
    editingChannel = null;
  }

  /**
   * Extract a robust numeric value from the OSC cache.
   * The cache can hold values in different formats:
   *  - Plain number (from optimistic updates): 1
   *  - Array of OSC args (from backend echo): [{type: 'i', value: 1}]
   *  - Array of plain values: [1]
   */
  function extractOscValue(raw, fallback) {
    if (raw === undefined || raw === null) return fallback;
    let v = raw;
    if (Array.isArray(v)) v = v[0];
    if (v !== null && typeof v === 'object' && 'value' in v) v = v.value;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function getBentoParam(cache, id, path, fallback) {
    if (!id) return fallback;
    const num = parseInt(id.replace(/\D/g, ''));
    const chStr = String(num).padStart(2, '0');
    
    let address = "";
    if (id.startsWith("in_")) {
      if (path === "preamp/gain") address = `/headamp/${chStr}/gain`;
      else if (path === "preamp/phantom" || path === "phantom") address = `/headamp/${chStr}/phantom`;
      else if (path === "preamp/phase") address = `/ch/${chStr}/preamp/phase`;
      else address = `/ch/${chStr}/${path}`;
    } else if (id.startsWith("bus_")) {
      address = `/bus/${chStr}/${path}`;
    }

    return extractOscValue(cache?.[address], fallback);
  }

  function updateBentoParam(id, path, value) {
    if (!id) return;
    const num = parseInt(id.replace(/\D/g, ''));
    const chStr = String(num).padStart(2, '0');
    
    let address = "";
    if (id.startsWith("in_")) {
      if (path === "preamp/gain") address = `/headamp/${chStr}/gain`;
      else if (path === "preamp/phantom" || path === "phantom") address = `/headamp/${chStr}/phantom`;
      else if (path === "preamp/phase") address = `/ch/${chStr}/preamp/phase`;
      else address = `/ch/${chStr}/${path}`;
    } else if (id.startsWith("bus_")) {
      address = `/bus/${chStr}/${path}`;
    }

    setOsc(address, parseFloat(value));

    // Optimistic cache update
    mixerState.update(prev => {
      const newCache = { ...(prev.flatOscCache || {}), [address]: parseFloat(value) };
      return { ...prev, flatOscCache: newCache };
    });
  }


</script>

<div class="portrait-warning">
  <div class="rotate-icon"><Smartphone size={64} /><RotateCcw size={48} /></div>
  <h2>Rotate Your Device</h2>
  <p>
    OpenMix is designed explicitly for landscape usage to mimic a real digital
    console.
  </p>
</div>

<main class="app-container" class:scribble-mode={scribbleEditMode}>
  <Navbar
    {activeRole}
    scribbleEditMode={scribbleEditMode}
    monitorMode={showMonitorModal}
    selectedChannel={selectedChannel}
    outputLinkMode={selectedChannel?.startsWith("bus_") ? (() => { 
      const n = parseInt(selectedChannel.replace("bus_", ""), 10); 
      return !!outputLinks[n % 2 === 1 ? n : n - 1]; 
    })() : false}
    onExitRole={exitRole}
    onExportScene={handleExportScene}
    onFileLoad={handleFileUpload}
    onScribbleEdit={() => (scribbleEditMode = !scribbleEditMode)}
    onToggleMonitor={() => (showMonitorModal = !showMonitorModal)}
    onToggleOutputLink={() => {
      if (selectedChannel?.startsWith("bus_")) {
        toggleOutputLink(selectedChannel);
      }
    }}
  />

  <div class="content-wrapper" class:is-mixing={activeRole}>
    {#if requiresSetup}
      <div class="setup-overlay fade-in">
        <div class="setup-card wide-setup">
          <div class="setup-col">
            <div class="setup-logo">OPENMIX</div>
        
            <div class="step-header" style="text-align: left;">
              <h2 class="step-title">Console Setup</h2>
              <p class="step-desc">Configure your session I/O counts.</p>
            </div>
            
            <div class="setup-grid">
              <div class="form-group" style="grid-column: 1 / -1;">
  
                <label for="preset">Hardware Architecture Preset</label>
                <div class="select-wrapper">
                  <select id="preset" bind:value={config.presetId} on:change={applyPreset}>
                    {#each PredefinedMixersArray as preset}
                      <option value={preset.id}>{preset.name}</option>
                    {/each}
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label for="inp">Inputs</label>
                <input id="inp" type="number" bind:value={config.inputs} min="1" max="128" disabled={config.presetId !== "CUSTOM"} />
              </div>
              <div class="form-group">
                <label for="out">Outputs (Aux)</label>
                <input id="out" type="number" bind:value={config.outputs} min="1" max="64" disabled={config.presetId !== "CUSTOM"} />
              </div>
            </div>

            <div class="form-group mixer-connect-section" style="margin-top: 0.5rem;">
              <div style="margin-bottom:0.5rem; display:block; font-weight:600; color:#a1a1aa; font-size:0.85rem;">Mixer Network Connection</div>
              <div class="discover-row">
                <button class="btn-ghost" on:click={startDiscovery} disabled={discoveryStatus === "scanning"} style="width: 100%;">
                  {#if discoveryStatus === "scanning"} <Search size={16} style="margin-right: 8px; vertical-align: bottom;" /> Scanning network... {:else} <Radio size={16} style="margin-right: 8px; vertical-align: bottom;" /> Auto-Discover Mixer {/if}
                </button>
              </div>

              {#if discoveryStatus === "found" && discoveredMixer}
                <div class="discovery-result-card">
                  <div class="discovery-result-info">
                    <div class="discovery-result-name">{discoveredMixer.name || 'Behringer Mixer'}</div>
                    <div class="discovery-result-addr">{discoveredMixer.ip}:{discoveredMixer.port}</div>
                  </div>
                  <div class="discovery-result-actions">
                    <button class="btn-connect" on:click={confirmDiscovery}>
                      <Check size={14} style="margin-right: 4px;" /> Connect
                    </button>
                    <button class="btn-dismiss" on:click={dismissDiscovery}>
                      <X size={12} />
                    </button>
                  </div>
                </div>
              {:else if discoveryStatus === "connected"}
                <span class="discovery-badge found"><Check size={14} style="margin-right: 4px; vertical-align: bottom;" /> Connected — {mixerConfig.ip}</span>
              {:else if discoveryStatus === "notfound"}
                <span class="discovery-badge notfound"><X size={14} style="margin-right: 4px; vertical-align: bottom;" /> Not found — try again or enter IP manually</span>
              {/if}

              <div class="form-row split" style="margin-top: 0.5rem;">
                <div class="form-group flex-2">
                  <label for="mixer-ip">IP Address</label>
                  <input id="mixer-ip" type="text" bind:value={mixerConfig.ip} placeholder="192.168.1.100" />
                </div>
 
                <div class="form-group flex-1">
                  <label for="mixer-port">Port</label>
                  <input id="mixer-port" type="number" bind:value={mixerConfig.port} min="1024" max="65535" />
                </div>
              </div>
            </div>
          </div>
          
          <div class="setup-col setup-col-right">
            {#if config.presetId !== "CUSTOM" || config.outputs > 0}
            <div class="form-group" style="flex: 1;">
              <div style="margin-bottom:0.5rem; display:block; font-weight:600; color:#a1a1aa; font-size:0.85rem;">Visible Buses / Outputs (Sandbox Access)</div>
              <div class="bus-grid">
                 {#each Array(config.outputs) as _, i}
                   <label class="bus-toggle">
                       <input type="checkbox" bind:group={config.visibleBuses} value={i+1} />
                      AUX {i+1}
                   </label>
                 {/each}
              </div>
            </div>
            {/if}
            <div class="action-row" style="margin-top: auto;">
              <button class="btn-primary" on:click={completeSetup}>Save Configuration &amp; Enter App</button>
            </div>
          </div>
        </div>
      </div>


    {:else if !activeRole}
      <div class="setup-overlay fade-in">
        <div class="setup-card role-select-card">
          <div class="role-select-header">
            <div class="setup-logo">OPENMIX</div>
            <p class="role-select-subtitle">Select your operating mode</p>
          </div>
          
          <div class="role-grid">
            <button
              class="role-card"
              on:click={() => {
                activeRole = "foh";
                musicianAux = null;
                musicianTokenLoading = false;
                musicianToken = null;
                connectAsFoh();
              }}
            >
              <div class="role-card-icon"><Sliders size={28} /></div>
              <div class="role-info">
                <h3>FOH Engineer</h3>
                <p>Full system control — inputs, outputs, EQ, dynamics, routing.</p>
              </div>
              <span class="role-arrow">→</span>
            </button>
            <button
              class="role-card"
              on:click={() => {
                activeRole = "musician";
                musicianAux = null;
                musicianTokenLoading = false;
                musicianToken = null;
                selectedChannel = null;
                activeTab = "mixer";
              }}
            >
              <div class="role-card-icon musician-icon"><Headphones size={28} /></div>
              <div class="role-info">
                <h3>Musician</h3>
                <p>Personal monitor mix — secure, scoped to your AUX bus.</p>
              </div>
              <span class="role-arrow">→</span>
            </button>
          </div>
          <button class="btn-text" on:click={() => requiresSetup = true}>
            <Settings size={14} /> Re-configure Console
          </button>
        </div>
      </div>
    {:else}
      {#if activeRole === "musician" && !musicianAux}
        <div class="setup-overlay fade-in">
          <div class="setup-card role-select-card musician-select-card">
            <div class="role-select-header">
              <div class="setup-logo">OPENMIX</div>
              <p class="role-select-subtitle">Select your monitor bus</p>
            </div>
            <div class="aux-grid">
              {#each config.visibleBuses || [] as auxNum}
                {@const id = `bus_${auxNum}`}
                {@const name = scribbles[id]?.name}
                <button
                  class="aux-btn"
                  disabled={musicianTokenLoading}
                  on:click={() => requestMusicianTokenAndConnect(auxNum)}
                >
                  <span class="aux-num">{auxNum.toString().padStart(2, '0')}</span>
                  {#if !isGenericName(name, id)}
                    <span class="aux-name-label">{name}</span>
                  {/if}
                </button>
              {/each}
            </div>
            <div class="selection-footer">
              <button class="btn-text secondary" on:click={exitRole}>
                <ArrowLeft size={14} /> Back to Roles
              </button>
            </div>
          </div>
        </div>
      {:else}
        {#if activeRole === "foh"}
          <GlobalTabs bind:activeTab {disabledTabs} />
        {/if}

        <div class="workspace">
          {#if activeTab === "mixer"}
            {#if activeRole === "musician"}
              <div class="musician-mix fade-in">
                <div class="musician-header">
                  {#if scribbles[`bus_${musicianAux}`]?.iconType}
                    <img
                      src="/icons-bmp/{scribbles[`bus_${musicianAux}`].iconType}.bmp"
                      alt=""
                      class="musician-header-icon"
                    />
                  {:else}
                    <div class="musician-header-icon-empty"></div>
                  {/if}
                  <h2>
                    {scribbles[`bus_${musicianAux}`]?.name || `AUX ${musicianAux} Monitor Mix`}
                  </h2>
                </div>
                <div class="musician-rack-container" style="display: flex; align-items: stretch; justify-content: flex-start; gap: 0.25rem; flex: 1; height: 100%;">
                  <button class="nav-icon-btn" style="align-self:center;" disabled={musicianPage === 0} on:click={() => musicianPage--}><ChevronLeft size={24} /></button>
                  <div class="musician-rack" style="flex:1;">
                    {#each musicianDisplayedChannels as chIndex}
                      <ChannelStrip
                        channelIndex={String(chIndex)}
                        role="musician"
                        stripType="input"
                        name={scribbles[`in_${chIndex}`]?.name || presetHardLinks[chIndex]?.defaultName || `CH ${chIndex}`}
                        iconType={scribbles[`in_${chIndex}`]?.iconType || "icon_01"}
                        color={isLinked(chIndex, stereoLinks)
                          ? chIndex % 2 === 1
                            ? "#3b82f6"
                            : "#ef4444"
                          : scribbles[`in_${chIndex}`]?.color || "#3f3f46"}
                        level={auxSendLevelToDb(
                          sendsState[`in_${chIndex}_aux${musicianAux}`]?.level ?? 0,
                        )}
                        peakLevel={fohMeters[chIndex - 1] || -60}
                        on:nameClick={() => {}}
                      />
                    {/each}
                  </div>
                  <button class="nav-icon-btn" style="align-self:center;" disabled={musicianPage >= musicianTotalPages - 1} on:click={() => musicianPage++}><ChevronRight size={24} /></button>
                  <div class="master-divider"></div>
                  <ChannelStrip
                    channelIndex={musicianAux}
                    role="musician"
                    stripType="output"
                    name={scribbles[`bus_${musicianAux}`]?.name || `AUX ${musicianAux}`}
                    iconType={scribbles[`bus_${musicianAux}`]?.iconType || "icon_01"}
                    color={scribbles[`bus_${musicianAux}`]?.color || "#8b5cf6"}
                    peakLevel={-60}
                    on:nameClick={() => {}}
                  />
                </div>
              </div>
          
            {:else}
              <div
                class="console-view fade-in"
                bind:clientWidth={containerWidth}
              >
                <div class="channels-track">
                  {#each displayedChannels as chIndex}
                    {@const isMatrix = activeView === "outputs" && chIndex < 0}
                    {@const mtxIdx = Math.abs(chIndex)}
                    {@const isMuteGroup = activeView === "dcas" && config.dcas === 0}
                    {@const sId =
                      activeView === "inputs"
                        ? `in_${chIndex}`
                        : activeView === "outputs"
                          ? (isMatrix ? `mtx_${mtxIdx}` : `bus_${chIndex}`)
                          : (isMuteGroup ? `mgp_${chIndex}` : `dca_${chIndex}`)}
                    <div
                      class="strip-wrapper"
                      role="button"
                      tabindex="0"
                      on:click={() => {
                        if (activeRole === "foh" && scribbleEditMode)
                          editingChannel = sId;
                      }}
                      on:keydown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          if (activeRole === "foh" && scribbleEditMode)
                            editingChannel = sId;
                        }
                      }}
                    >
                      <ChannelStrip
                        channelIndex={isMatrix ? String(mtxIdx) : String(chIndex)}
                        role={activeRole}
                        stripType={activeView === "outputs"
                          ? (isMatrix ? "matrix" : "output")
                          : activeView === "dcas"
                            ? (isMuteGroup ? "mgp" : "dca")
                            : "input"}
                        isStereo={activeView === "inputs" 
                          ? isLinked(chIndex, stereoLinks) 
                          : (activeView === "outputs" 
                              ? (isMatrix ? false : (config.presetId === 'WING' || isLinked(chIndex, outputLinks)))
                              : false)}
                        name={scribbles[sId]?.name ||
                          (activeView === "inputs"
                            ? presetHardLinks[chIndex]?.defaultName ||
                              `CH ${chIndex}`
                            : activeView === "outputs"
                              ? (isMatrix ? `MTX ${mtxIdx}` : `AUX ${chIndex}${config.presetId === 'WING' ? ' (St)' : ''}`)
                              : (isMuteGroup ? `MGP ${chIndex}` : (config.presetId === 'MACKIE_DL32S' ? `VCA ${chIndex}` : `DCA ${chIndex}`)))}
                        iconType={scribbles[sId]?.iconType || "icon_01"}
                        color={activeView === "inputs" &&
                        isLinked(chIndex, stereoLinks)
                          ? chIndex % 2 === 1
                            ? "#3b82f6"
                            : "#ef4444"
                          : scribbles[sId]?.color || (activeView === "inputs" ? "#3f3f46" : (isMatrix ? "#10b981" : (isMuteGroup ? "#f43f5e" : "#3b82f6")))}
                        peakLevel={activeView === "inputs"
                          ? fohMeters[chIndex - 1] || -60
                          : -60}
                        pan={getBentoParam($mixerState.flatOscCache, sId, 'mix/pan', 0)}
                        eqCurvePath={computeMiniEqPath(sId)}
                        gateThresh={
                          activeView === "inputs"
                            ? readFlatOscNumber(
                                `/ch/${String(chIndex).padStart(2, "0")}/gate/thr`,
                                -40,
                              )
                            : -40
                        }
                        gateRange={
                          activeView === "inputs"
                            ? readFlatOscNumber(
                                `/ch/${String(chIndex).padStart(2, "0")}/gate/range`,
                                20,
                              )
                            : 0
                        }
                        gateOn={
                          activeView === "inputs"
                            ? readFlatOscBool(
                                `/ch/${String(chIndex).padStart(2, "0")}/gate/on`,
                                true,
                              )
                            : false
                        }
                        compThresh={
                          activeView === "inputs"
                            ? readFlatOscNumber(
                                `/ch/${String(chIndex).padStart(2, "0")}/dyn/thr`,
                                -20,
                              )
                            : -20
                        }
                        compRatio={
                          activeView === "inputs"
                            ? readFlatOscNumber(
                                `/ch/${String(chIndex).padStart(2, "0")}/dyn/ratio`,
                                4,
                              )
                            : 1
                        }
                        compOn={
                          activeView === "inputs"
                            ? readFlatOscBool(
                                `/ch/${String(chIndex).padStart(2, "0")}/dyn/on`,
                                true,
                              )
                            : false
                        }
                        stereoLink={activeView === "inputs"
                          ? isLinked(chIndex, stereoLinks)
                          : activeView === "outputs"
                            ? isLinked(chIndex, outputLinks)
                            : false}
                        on:toggleLink={() => {
                          if (activeView === "outputs") {
                            toggleOutputLink(chIndex);
                          } else {
                            toggleStereoLink(chIndex);
                          }
                        }}
                        on:nameClick={() => {
                          if (activeRole === "foh") {
                            selectedChannel = sId;
                            activeTab = "channel";
                          }
                        }}
                      />
                    </div>
                  {/each}

                  {#if activeView === "outputs"}
                    <div class="master-divider"></div>
                    {#each fxChannels as fxIdx}
                      {@const fxSId = `fx_${fxIdx}`}
                      <div
                        class="strip-wrapper"
                        role="button"
                        tabindex="0"
                        on:click={() => {
                          if (activeRole === "foh" && scribbleEditMode)
                            editingChannel = fxSId;
                        }}
                        on:keydown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            if (activeRole === "foh" && scribbleEditMode)
                              editingChannel = fxSId;
                          }
                        }}
                      >
                        <ChannelStrip
                          channelIndex={String(fxIdx)}
                          role={activeRole}
                          stripType="fx"
                          name={scribbles[fxSId]?.name || `FX ${fxIdx}`}
                          iconType={scribbles[fxSId]?.iconType || "icon_01"}
                          color={scribbles[fxSId]?.color || "#f59e0b"}
                          peakLevel={-60}
                          eqCurvePath={computeMiniEqPath(fxSId)}
                          on:nameClick={() => {
                            if (activeRole === "foh") {
                              selectedChannel = fxSId;
                              activeTab = "channel";
                            }
                          }}
                        />
                      </div>
                    {/each}
                    <div class="master-divider"></div>
                    <div
                      class="strip-wrapper"
                      role="button"
                      tabindex="0"
                      on:click={() => {
                        if (activeRole === "foh" && scribbleEditMode)
                          editingChannel = "main_LR";
                      }}
                      on:keydown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          if (activeRole === "foh" && scribbleEditMode)
                            editingChannel = "main_LR";
                        }
                      }}
                    >
                      <ChannelStrip
                        channelIndex="LR"
                        role={activeRole}
                        stripType="main"
                        name={scribbles["main_LR"]?.name || "MAIN LR"}
                        iconType={scribbles["main_LR"]?.iconType || "icon_01"}
                        color={scribbles["main_LR"]?.color || "#ef4444"}
                        peakLevel={-60}
                        eqCurvePath={computeMiniEqPath("main_LR")}
                        on:nameClick={() => {
                          if (activeRole === "foh") {
                            selectedChannel = "main_LR";
                            activeTab = "channel";
                          }
                        }}
                      />
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          {:else if activeTab === "eq"}
            <div class="macro-view fade-in">
              <div class="view-header-inline">
                <h2 class="title-left">
                  EQ EDITOR: <span class="ch-name">{scribbles[selectedChannel]?.name || selectedChannel?.toUpperCase() || ''}</span>
                </h2>
                <div class="nav-group">
                  <button
                    class="nav-icon-btn"
                    disabled={isFirstChannel}
                    on:click={() => cycleChannel(-1)}
                    ><ChevronLeft size={16} /></button
                  >
                  <button
                    class="nav-icon-btn"
                    disabled={isLastChannel}
                    on:click={() => cycleChannel(1)}
                    ><ChevronRight size={16} /></button
                  >
                </div>
              </div>
              <div
                style="flex: 1; width: 100%; display: flex; flex-direction: column;"
              >
                <EqEditor
                  bind:this={eqComponent}
                  channelId={selectedChannel}
                  eqBands={currentEqBands}
                  onBandsChange={handleBandsChange}
                />
              </div>
            </div>
          {:else if activeTab === "channel"}
            <div class="macro-view fade-in">
              <div class="view-header-inline">
                <h2 class="title-left">
                  CHANNEL: <span class="ch-name">{scribbles[selectedChannel]?.name || selectedChannel?.toUpperCase() || ''}</span>
                </h2>
                <div class="nav-group">
                  <button
                    class="nav-icon-btn"
                    disabled={isFirstChannel}
                    on:click={() => cycleChannel(-1)}
                    ><ChevronLeft size={16} /></button
                  >
                  <button
                    class="nav-icon-btn"
                    disabled={isLastChannel}
                    on:click={() => cycleChannel(1)}
                    ><ChevronRight size={16} /></button
                  >
                </div>
              </div>
              <div class="bento-grid">
                <div
                  class="bento-card bento-icon-preview"
                  class:is-editable={activeRole === "foh" && scribbleEditMode}
                  role="button"
                  tabindex="0"
                  on:click={() => {
                    if (activeRole === "foh" && scribbleEditMode)
                      editingChannel = selectedChannel;
                  }}
                  on:keydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      if (activeRole === "foh" && scribbleEditMode)
                        editingChannel = selectedChannel;
                    }
                  }}
                >
                  <h3>Channel Icon</h3>
                  {#if activeRole === "foh" && scribbleEditMode}
                    <div class="edit-badge"><Edit3 size={14} /></div>
                  {/if}
                  <div class="icon-preview-slot">
                    {#if scribbles[selectedChannel]?.iconType}
                      <img
                        src="/icons-bmp/{scribbles[selectedChannel].iconType}.bmp"
                        alt="Icon"
                        class="icon-lg"
                      />
                    {:else}
                      <div class="icon-placeholder"></div>
                    {/if}
                    <span class="icon-name"
                      >{scribbles[selectedChannel]?.name || selectedChannel?.toUpperCase()}</span
                    >
                    <span
                      class="icon-color-dot"
                      style="background: {scribbles[selectedChannel]?.color || '#3f3f46'};"
                    ></span>
                  </div>
                </div>
                {#if selectedChannel?.startsWith("in_")}
                  <div
                    class="bento-card bento-clickable"
                    role="button"
                    tabindex="0"
                    on:click={() => {
                      channelModalState = {
                        isOpen: true,
                        channelId: selectedChannel,
                        section: "preamp",
                      };
                    }}
                    on:keydown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        channelModalState = {
                          isOpen: true,
                          channelId: selectedChannel,
                          section: "preamp",
                        };
                      }
                    }}
                  >
                    <h3>Preamp</h3>
                    <div class="param-row">
                      <span>Gain</span>
                      <input
                        type="number"
                        class="bento-input"
                        min="0"
                        max="60"
                        step="0.5"
                        value={getBentoParam($mixerState.flatOscCache, selectedChannel, 'preamp/gain', 30)}
                        on:change={(e) => updateBentoParam(selectedChannel, 'preamp/gain', e.currentTarget.value)}
                        on:click|stopPropagation
                      />
                      <span class="unit">dB</span>
                    </div>
                    <div class="param-row">
                      <span>48V</span>
                      <button 
                        class="bento-toggle-btn" 
                        class:active-yellow={getBentoParam($mixerState.flatOscCache, selectedChannel, 'preamp/phantom', 0) == 1}
                        on:click|stopPropagation={() => updateBentoParam(selectedChannel, 'preamp/phantom', (getBentoParam($mixerState.flatOscCache, selectedChannel, 'preamp/phantom', 0) == 1 ? 0 : 1))}
                      >
                        {getBentoParam($mixerState.flatOscCache, selectedChannel, 'preamp/phantom', 0) == 1 ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div class="param-row">
                      <span>Phase</span>
                      <button 
                        class="bento-toggle-btn" 
                        class:active={getBentoParam($mixerState.flatOscCache, selectedChannel, 'preamp/phase', 0) == 1}
                        on:click|stopPropagation={() => updateBentoParam(selectedChannel, 'preamp/phase', (getBentoParam($mixerState.flatOscCache, selectedChannel, 'preamp/phase', 0) == 1 ? 0 : 1))}
                      >
                        {getBentoParam($mixerState.flatOscCache, selectedChannel, 'preamp/phase', 0) == 1 ? '180°' : '0°'}
                      </button>
                    </div>
                  </div>
                {/if}
                <div
                  class="bento-card bento-clickable"
                  role="button"
                  tabindex="0"
                  on:click={() => {
                    channelModalState = {
                      isOpen: true,
                      channelId: selectedChannel,
                      section: "gate",
                    };
                  }}
                  on:keydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      channelModalState = {
                        isOpen: true,
                        channelId: selectedChannel,
                        section: "gate",
                      };
                    }
                  }}
                >
                  <h3 style="display: flex; justify-content: space-between;">Gate <Settings size={14} style="color:#f59e0b; opacity:0.5;"/></h3>
                  <div class="param-row">
                    <span>Threshold</span>
                    <input
                      type="number"
                      class="bento-input"
                      min="-80"
                      max="0"
                      value={getBentoParam($mixerState.flatOscCache, selectedChannel, 'gate/thr', -40)}
                      on:change={(e) => updateBentoParam(selectedChannel, 'gate/thr', e.currentTarget.value)}
                      on:click|stopPropagation
                    />
                    <span class="unit">dB</span>
                  </div>
                  <div class="param-row">
                    <span>Range</span>
                    <input
                      type="number"
                      class="bento-input"
                      min="0"
                      max="60"
                      value={getBentoParam($mixerState.flatOscCache, selectedChannel, 'gate/range', 20)}
                      on:change={(e) => updateBentoParam(selectedChannel, 'gate/range', e.currentTarget.value)}
                      on:click|stopPropagation
                    />
                    <span class="unit">dB</span>
                  </div>
                  <div class="param-row">
                    <span>Attack</span>
                    <input
                      type="number"
                      class="bento-input"
                      min="0"
                      max="120"
                      value={getBentoParam($mixerState.flatOscCache, selectedChannel, 'gate/att', 5)}
                      on:change={(e) => updateBentoParam(selectedChannel, 'gate/att', e.currentTarget.value)}
                      on:click|stopPropagation
                    />
                    <span class="unit">ms</span>
                  </div>
                  <div class="param-row">
                    <span>Hold</span>
                    <input
                      type="number"
                      class="bento-input"
                      min="0"
                      max="500"
                      value={getBentoParam($mixerState.flatOscCache, selectedChannel, 'gate/hold', 50)}
                      on:change={(e) => updateBentoParam(selectedChannel, 'gate/hold', e.currentTarget.value)}
                      on:click|stopPropagation
                    />
                    <span class="unit">ms</span>
                  </div>
                </div>
  
                <div
                  class="bento-card bento-clickable"
                  role="button"
                  tabindex="0"
                  on:click={() => {
                    channelModalState = {
                      isOpen: true,
                      channelId: selectedChannel,
                      section: "compressor",
                    };
                  }}
                  on:keydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      channelModalState = {
                        isOpen: true,
                        channelId: selectedChannel,
                        section: "compressor",
                      };
                    }
                  }}
                >
                  <h3 style="display: flex; justify-content: space-between;">Compressor <Settings size={14} style="color:#f59e0b; opacity:0.5;"/></h3>
                  <div class="param-row">
                    <span>Threshold</span>
                    <input
                      type="number"
                      class="bento-input"
                      min="-60"
                      max="0"
                      value={getBentoParam($mixerState.flatOscCache, selectedChannel, 'dyn/thr', -20)}
                      on:change={(e) => updateBentoParam(selectedChannel, 'dyn/thr', e.currentTarget.value)}
                      on:click|stopPropagation
                    />
                    <span class="unit">dB</span>
                  </div>
                  <div class="param-row">
                    <span>Ratio</span>
                    <input
                      type="number"
                      class="bento-input"
                      min="1"
                      max="20"
                      step="0.1"
                      value={getBentoParam($mixerState.flatOscCache, selectedChannel, 'dyn/ratio', 4)}
                      on:change={(e) => updateBentoParam(selectedChannel, 'dyn/ratio', e.currentTarget.value)}
                      on:click|stopPropagation
                    />
                    <span class="unit">:1</span>
                  </div>
                  <div class="param-row">
                    <span>Attack</span>
                    <input
                      type="number"
                      class="bento-input"
                      min="0"
                      max="100"
                      value={getBentoParam($mixerState.flatOscCache, selectedChannel, 'dyn/att', 10)}
                      on:change={(e) => updateBentoParam(selectedChannel, 'dyn/att', e.currentTarget.value)}
                      on:click|stopPropagation
                    />
                    <span class="unit">ms</span>
                  </div>
                  <div class="param-row">
                    <span>Release</span>
                    <input
                      type="number"
                      class="bento-input"
                      min="5"
                      max="500"
                      value={getBentoParam($mixerState.flatOscCache, selectedChannel, 'dyn/rel', 100)}
                      on:change={(e) => updateBentoParam(selectedChannel, 'dyn/rel', e.currentTarget.value)}
                      on:click|stopPropagation
                    />
                    <span class="unit">ms</span>
                  </div>
                  <div class="param-row">
                    <span>Makeup</span>
                    <input
                      type="number"
                      class="bento-input"
                      min="0"
                      max="24"
                      step="0.5"
                      value={getBentoParam($mixerState.flatOscCache, selectedChannel, 'dyn/makeup', 0)}
                      on:change={(e) => updateBentoParam(selectedChannel, 'dyn/makeup', e.currentTarget.value)}
                      on:click|stopPropagation
                    />
                    <span class="unit">dB</span>
                  </div>
                </div>

                <div 
                  class="bento-card bento-eq-preview bento-clickable"
                  role="button"
                  tabindex="0"
                  on:click={() => {
                    activeTab = "eq";
                  }}
                  on:keydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      activeTab = "eq";
                    }
                  }}
                >
                  <h3>EQ Preview</h3>
                  <svg viewBox="0 0 100 40" class="bento-eq-curve">
                    <path d={computeMiniEqPath(selectedChannel)} />
                  </svg>
                </div>

                <div
                  class="bento-card bento-clickable"
                  role="button"
                  tabindex="0"
                  on:click={() => {
                    channelModalState = {
                      isOpen: true,
                      channelId: selectedChannel,
                      section: "output",
                    };
                  }}
                  on:keydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      channelModalState = {
                        isOpen: true,
                        channelId: selectedChannel,
                        section: "output",
                      };
                    }
                  }}
                >
                  <h3>Output & Main Assign</h3>
                  <div class="param-row">
                    <span>Pan</span>
                    <input
                      type="number"
                      class="bento-input"
                      min="-100"
                      max="100"
                      value={getBentoParam($mixerState.flatOscCache, selectedChannel, 'mix/pan', 0)}
                      on:change={(e) => updateBentoParam(selectedChannel, 'mix/pan', e.currentTarget.value)}
                      on:click|stopPropagation
                    />
                    <span class="unit">%</span>
                  </div>
                  <div class="param-row">
                    <span>Level</span>
                    <input
                      type="number"
                      class="bento-input"
                      min="-90"
                      max="10"
                      step="0.5"
                      value={getBentoParam($mixerState.flatOscCache, selectedChannel, 'mix/fader', 0)}
                      on:change={(e) => updateBentoParam(selectedChannel, 'mix/fader', e.currentTarget.value)}
                      on:click|stopPropagation
                    />
                    <span class="unit">dB</span>
                  </div>
                  {#if selectedChannel && !selectedChannel.startsWith("out_")}
                    <div class="param-row">
                      <span>LR Assign</span>
                      <button 
                        class="bento-toggle-btn" 
                        class:active={getBentoParam($mixerState.flatOscCache, selectedChannel, 'mix/lr', 0) == 1}
                        on:click|stopPropagation={() => updateBentoParam(selectedChannel, 'mix/lr', (getBentoParam($mixerState.flatOscCache, selectedChannel, 'mix/lr', 0) == 1 ? 0 : 1))}
                      >
                        {getBentoParam($mixerState.flatOscCache, selectedChannel, 'mix/lr', 0) == 1 ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  {/if}
                </div>

                {#if selectedChannel?.startsWith("in_")}
                  {@const chNum = parseInt(selectedChannel.replace("in_", ""))}
                  {@const oddCh = chNum % 2 === 1 ? chNum : chNum - 1}
                  <div class="bento-card">
                    <h3>Stereo Link</h3>
                    <div class="param-row">
                      <span>CH {oddCh} ↔ CH {oddCh + 1}</span>
                      <button
                        class="bento-toggle-btn"
                        class:active={extractOscValue($mixerState?.flatOscCache?.[`/config/chlink/${oddCh}`], 0) == 1}
                        on:click|stopPropagation={() => toggleStereoLink(oddCh)}
                        aria-label="Toggle Stereo Link"
                      >
                        {extractOscValue($mixerState?.flatOscCache?.[`/config/chlink/${oddCh}`], 0) == 1 ? 'LINKED' : 'OFF'}
                      </button>
                    </div>
                    <p class="bento-hint">
                      Links odd→even channel pair. Both channels share gain,
                      pan, EQ, and dynamics.
                    </p>
                  </div>
                {/if}
              </div>
            </div>
          {:else if activeTab === "sends"}
            <SendsPanel
              bind:sendsState
              bind:selectedChannel
              {config}
              {scribbles}
              {cycleChannel}
              {isFirstChannel}
              {isLastChannel}
            />
          {:else if activeTab === "fx"}
            <div class="macro-view fade-in">
              <div class="view-header-inline">
                <h2 class="title-left">
                  EFFECTS RACK
                </h2>
                <div class="header-actions" style="margin-left: auto; display: flex; align-items: center; gap: 1rem;">
                   <div class="insert-control" style="background: #1e293b; padding: 0.3rem 0.6rem; border-radius: 6px; border: 1px solid #334155; display: flex; align-items: center; gap: 0.6rem; font-size: 0.75rem;">
                      <span style="color: #64748b; font-weight: 700;">INSERT TO</span>
                      <div style="display: flex; gap: 0.25rem;">
                        {#each Array(config.fx || 4) as _, i}
                          <button 
                            class="tiny-btn" 
                            class:active={channelFxInsert[selectedChannel] === i}
                            on:click={() => {
                              const current = channelFxInsert[selectedChannel];
                              channelFxInsert[selectedChannel] = (current === i) ? null : i;
                              channelFxInsert = {...channelFxInsert};
                              showToast(`FX Slot ${i+1} ${channelFxInsert[selectedChannel] === i ? 'Inserted' : 'Removed'} for ${selectedChannel?.toUpperCase() || 'UNKNOWN'}`, "info");
                            }}
                          >
                          {i+1}
                          </button>
                        {/each}
                      </div>
                   </div>
                   <div class="nav-group">
                      <button class="nav-icon-btn" aria-label="Previous Channel" disabled={isFirstChannel} on:click={() => cycleChannel(-1)}><ChevronLeft size={16} /></button>
                      <button class="nav-icon-btn" aria-label="Next Channel" disabled={isLastChannel} on:click={() => cycleChannel(1)}><ChevronRight size={16} /></button>
                   </div>
                </div>
              </div>
              <div style="flex: 1; width: 100%; display: flex; flex-direction: column;">
                <EffectsRack
                  {config}
                  {scribbles}
                  bind:selectedChannel
                  bind:selectedSlotIndex={rackSlotIndex}
                />
              </div>
            </div>
          {:else if activeTab === "routing"}
            <div class="macro-view routing-macro-view fade-in">
              <!-- X-AIR Style Top Icon Bar -->
              <div class="routing-mode-bar">
                {#each availableRoutingModes as mode}
                  <button 
                    class="mode-tab-btn" 
                    class:active={routingMode === mode.id}
                    on:click={() => {
                      routingMode = mode.id;
                      // SubTab is synced via reactive script block
                    }}
                  >
                    <svelte:component this={mode.icon} size={20} />
                    <span>{mode.name}</span>
                  </button>
                {/each}
              </div>

              <div class="matrix-window-main">
                <!-- Sub-Category Tabs (Top Right of Matrix Area) -->
                <div class="matrix-subheader">
                  <div class="sub-tab-group">
                    {#each patchSet.subTabs as sub}
                      <button 
                        class="sub-tab-btn" 
                        class:active={routingSubTab === sub}
                        on:click={() => routingSubTab = sub}
                      >{sub}</button>
                    {/each}
                  </div>
                </div>

                <div class="routing-matrix-container">
                  <div class="patch-scroll-viewport">
                    <table class="xair-matrix">
                      <thead>
                        <tr>
                          <th class="corner-label">DEST \\ SOURCE</th>
                          {#each patchSet.srcs as src}
                            <th class="col-head"><span>{src.name}</span></th>
                          {/each}
                        </tr>
                      </thead>
                      <tbody>
                        {#each patchSet.dests as dest}
                          <tr>
                            <td class="row-head">{dest.name}</td>
                            {#each patchSet.srcs as src}
                              {@const isActive = routingState[dest.id] === src.id}
                              <td class="patch-point" class:active={isActive}>
                                <button 
                                  class="radio-dot-btn" 
                                  on:click={() => handlePatchChange(dest, src)}
                                >
                                  <div class="radio-circle" title={src.name}></div>
                                </button>
                              </td>
                            {/each}
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Footer Legend & Signal Tap -->
                <div class="matrix-footer">
                  <div class="tap-legend">
                    <div class="legend-item"><div class="dot analog"></div> Analog</div>
                    <div class="legend-item"><div class="dot input"></div> Input</div>
                    <div class="legend-item"><div class="dot pre-eq"></div> Pre EQ</div>
                    <div class="legend-item"><div class="dot post-eq"></div> Post EQ</div>
                    <div class="legend-item"><div class="dot pre-fade"></div> Pre Fader</div>
                    <div class="legend-item"><div class="dot post-fade"></div> Post Fader</div>
                  </div>
                  <div class="tap-selector-box">
                    <span class="label">Default Signal Tap:</span>
                    <select bind:value={routingSignalTap} class="tap-select">
                      <option value="ANALOG">Analog</option>
                      <option value="INPUT">Input</option>
                      <option value="PRE_EQ">Pre EQ</option>
                      <option value="POST_EQ">Post EQ</option>
                      <option value="PRE_FADER">Pre Fader</option>
                      <option value="POST_FADER">Post Fader</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          {:else}
            <div class="macro-view fade-in">
              <div class="view-header-inline">
                <h2 class="title-left">
                  {activeTab?.toUpperCase() || 'VIEW'} VIEW: {scribbles[selectedChannel]?.name || selectedChannel?.toUpperCase() || ''}
                </h2>
                <div class="nav-group">
                  <button
                    class="nav-icon-btn"
                    disabled={isFirstChannel}
                    on:click={() => cycleChannel(-1)}
                    ><ChevronLeft size={20} /></button
                  >
                  <button
                    class="nav-icon-btn"
                    disabled={isLastChannel}
                    on:click={() => cycleChannel(1)}
                    ><ChevronRight size={20} /></button
                  >
                </div>
              </div>
              <div class="wireframe-content"></div>
            </div>
          {/if}

          {#if activeRole === "foh" && !["channel", "routing", "sends", "fx"].includes(activeTab)}
            <Sidebar
              {config}
              {activeTab}
              bind:activeView
              bind:currentPage
              {totalPages}
              {stripsPerPage}
              onPageChange={(p) => (currentPage = p)}
              onViewChange={(v) => (activeView = v)}
              onStripsChange={(n) => (stripsPerPage = n)}
              onResetEq={handleResetEq}
              onCopyEq={handleCopyEq}
              onPasteEq={handlePasteEq}
              onBypassEq={handleBypassEq}
            />
          {/if}
        </div>
    {/if}

    {#if activeRole === "foh" && editingChannel}
      <ScribbleEditor
        channelIndex={typeof editingChannel === "string"
          ? editingChannel
              .replace("in_", "CH ")
              .replace("out_", "AUX ")
              .toUpperCase()
          : editingChannel}
        currentName={scribbles[editingChannel]?.name ||
          (editingChannel || "").toUpperCase()}
        currentIcon={scribbles[editingChannel]?.iconType || "icon_01"}
        currentColor={scribbles[editingChannel]?.color || "#3f3f46"}
        on:save={handleSaveScribble}
        on:close={() => (editingChannel = null)}
      />
    {/if}

    {#if channelModalState.isOpen}
      {@const modalChId = channelModalState.channelId}
      {@const modalChNum = modalChId ? parseInt(modalChId.replace(/\D/g, '')) : 0}
      <ChannelModal
        {config}
        channelId={modalChId}
        channelName={scribbles[modalChId]?.name}
        initialSection={channelModalState.section}
        scribbles={scribbles}
        mainAssign={getBentoParam($mixerState.flatOscCache, modalChId, 'mix/lr', 0) === 1}
        stereoLink={modalChId?.startsWith('in_') ? isLinked(modalChNum, stereoLinks) : false}
        on:setMainOut={(e) => {
          const newState = e.detail.state;
          mainOutAssign[modalChId] = newState;
          mainOutAssign = { ...mainOutAssign };
          const num = String(modalChNum).padStart(2, '0');
          if (modalChId.startsWith('in_')) {
            // Optimistic cache update so bento grid reflects change immediately
            mixerState.update(prev => {
              const newCache = { ...(prev.flatOscCache || {}), [`/ch/${num}/mix/lr`]: newState ? 1 : 0 };
              return { ...prev, flatOscCache: newCache };
            });
            setOsc(`/ch/${num}/mix/lr`, newState ? 1 : 0);
          }
        }}
        on:toggleMainOut={() => toggleMainOut(modalChId)}
        on:close={() => (channelModalState.isOpen = false)}
      />
    {/if}
    <MonitorModal 
      show={showMonitorModal} 
      currentSource={monitorSource}
      sources={soloSources}
      on:select={(e) => { setMonitorSource(e.detail); }}
      on:close={() => showMonitorModal = false}
    />
    <Toast />
    {/if}
  </div>
</main>

{#if $isConnected && $syncProgress.active}
  <div class="sync-overlay" transition:blur={{ duration: 300 }}>
    <div class="sync-card">
      <div class="sync-icon">
        <RotateCcw size={48} class="spin-heavy" />
      </div>
      <div class="sync-content">
        <h2>Transferring from Mixer</h2>
        <p>Retrieving all volume, EQ, and FX parameters from your {config.presetId}...</p>
        
        <div class="sync-progress-bar">
          <div class="sync-progress-fill" style="width: {$syncProgress.progress}%"></div>
        </div>
        
        <div class="sync-stats">
          <span class="sync-percent">{$syncProgress.progress}%</span>
          <span class="sync-label">Stay connected via WiFi</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(#app) {
    max-width: 80% !important;
    margin: 0 auto;
    padding: 0 !important;
    height: 100vh;
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    padding: 0;
    font-family:
      "Inter",
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      Helvetica,
      Arial,
      sans-serif,
      "Apple Color Emoji",
      "Segoe UI Emoji",
      "Segoe UI Symbol";
    background-color: #0b0d12;
    color: #e2e8f0;
    overflow: hidden; /* Prevent body scroll, constrain to app-container */
  }

  /* Global Scrollbar Removal */
  :global(*) {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
  :global(*::-webkit-scrollbar) {
    display: none !important;
  }

  .app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .content-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }
  .content-wrapper:not(.is-mixing) {
    padding: 1.5rem;
    justify-content: center;
    align-items: center;
    overflow-y: auto;
  }

  .bus-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
  .bus-toggle {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.6rem;
    color: #e2e8f0;
    font-size: 0.8rem;
    cursor: pointer;
    background: #1e293b;
    padding: 0.6rem;
    border-radius: 6px;
    border: 1px solid #334155;
    transition: 0.2s;
    font-family: "JetBrains Mono", monospace;
  }
  .bus-toggle:hover {
    background: #334155;
    border-color: #64748b;
  }
  .bus-toggle input {
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: #3b82f6;
    margin: 0;
  }

  .btn-text {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 0.8rem;
    cursor: pointer;
    text-decoration: underline;
    margin-top: 1.5rem;
    display: block;
    text-align: center;
    width: 100%;
    transition: color 0.1s;
  }
  .btn-text:hover {
    color: #e2e8f0;
  }

  h2 {
    margin-top: 0;
    color: #f8fafc;
    font-size: 1.75rem;
    letter-spacing: -0.5px;
    text-align: center;
  }
  h3 {
    margin-top: 0;
    color: #f8fafc;
    font-size: 1.1rem;
  }
  p {
    color: #94a3b8;
    line-height: 1.5;
    font-size: 0.95rem;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .workspace {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .console-view {
    flex: 1;
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    background: #0b0d12;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
  }
  .console-view::-webkit-scrollbar {
    height: 12px;
  }
  .console-view::-webkit-scrollbar-track {
    background: #0b0d12;
    border-top: 1px solid #27272a;
  }
  .console-view::-webkit-scrollbar-thumb {
    background: #3f3f46;
    border-radius: 6px;
    border: 3px solid #0b0d12;
  }
  .console-view::-webkit-scrollbar-thumb:hover {
    background: #52525b;
  }

  .channels-track {
    display: flex;
    gap: 4px;
    height: 100%;
    align-items: flex-end;
    padding: 0 1rem 8px 1rem;
  }

  .strip-wrapper {
    cursor: default;
  }
  .scribble-mode .strip-wrapper {
    cursor: pointer;
    border: 2px dashed #10b981;
    border-radius: 8px;
    transition: 0.2s;
  }
  .scribble-mode .strip-wrapper:hover {
    background: rgba(16, 185, 129, 0.1);
  }

  .macro-view {
    padding: 0.5rem 1rem;
    width: 100%;
    margin: 0 auto;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .view-header-inline { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
  .title-left { font-size: 1.1rem; font-weight: 900; letter-spacing: 0.06em; color: #cbd5e1; margin: 0; }
  .nav-group { display: flex; gap: 2px; margin-left: 0.25rem; }
  .nav-icon-btn {
    background: #0d1a28; border: 1px solid #1a3040; color: #64748b;
    border-radius: 5px; padding: 4px 6px; cursor: pointer; display: flex; align-items: center;
    transition: color .12s, border-color .12s;
  }
  .nav-icon-btn:hover:not(:disabled) { color: #e2e8f0; border-color: #3b82f6; }
  .nav-icon-btn:disabled { opacity: .25; cursor: not-allowed; }

  .routing-macro-view {
    background: #090e1a;
    display: flex;
    flex-direction: column;
    padding: 0 !important;
  }

  .routing-mode-bar {
    display: flex;
    background: #111827;
    border-bottom: 2px solid #1e293b;
    padding: 0 1rem;
    gap: 0.25rem;
    flex-shrink: 0;
  }
  .mode-tab-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    color: #64748b;
    gap: 0.4rem;
    cursor: pointer;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    transition: all 0.2s;
    min-width: 80px;
  }
  .mode-tab-btn:hover {
    color: #94a3b8;
    background: rgba(30, 41, 59, 0.5);
  }
  .mode-tab-btn.active {
    color: #22d3ee;
    border-bottom-color: #06b6d4;
    background: rgba(6, 182, 212, 0.1);
  }

  .matrix-window-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: #0f172a;
  }

  .matrix-subheader {
    display: flex;
    justify-content: flex-end;
    padding: 0.5rem 1rem;
    background: #1e293b;
    border-bottom: 1px solid #334155;
  }
  .sub-tab-group {
    display: flex;
    background: #0f172a;
    border-radius: 4px;
    padding: 2px;
    border: 1px solid #334155;
  }
  .sub-tab-btn {
    padding: 0.35rem 1rem;
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 0.7rem;
    font-weight: 700;
    border-radius: 3px;
    cursor: pointer;
    transition: 0.2s;
  }
  .sub-tab-btn.active {
    background: #334155;
    color: #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }

  .routing-matrix-container {
    flex: 1;
    display: flex;
    overflow: hidden;
    background: #0b1120;
    position: relative;
  }
  .patch-scroll-viewport {
    flex: 1;
    overflow: auto;
  }

  .xair-matrix {
    border-collapse: separate;
    border-spacing: 0;
    width: auto;
    min-width: 100%;
  }
  .xair-matrix thead th {
    position: sticky;
    top: 0;
    z-index: 20;
    background: #111827;
    border-bottom: 2px solid #334155;
    padding: 0.75rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 800;
    color: #94a3b8;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .xair-matrix thead th.col-head {
    min-width: 48px;
    text-align: center;
  }
  .xair-matrix .row-head {
    position: sticky;
    left: 0;
    z-index: 10;
    background: #0f172a;
    border-right: 2px solid #334155;
    border-bottom: 1px solid #1e293b;
    padding: 0.6rem 1rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #cbd5e1;
    white-space: nowrap;
    text-align: left;
  }
  .patch-point {
    border-bottom: 1px solid #1e293b;
    border-right: 1px solid #1e293b;
    text-align: center;
    padding: 0;
    width: 48px;
    height: 48px;
    transition: background 0.1s;
  }
  .patch-point.active {
    background: rgba(34, 211, 238, 0.08);
  }
  
  .radio-dot-btn {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .radio-circle {
    width: 12px;
    height: 12px;
    border: 1px solid #334155;
    border-radius: 50%;
    transition: all 0.2s;
    background: transparent;
  }
  .patch-point.active .radio-circle {
    background: transparent;
    border: 3px solid #22d3ee;
    box-shadow: 0 0 12px rgba(34, 211, 238, 0.6);
    transform: scale(1.3);
  }
  .patch-point:hover .radio-circle {
    border-color: #94a3b8;
  }

  .matrix-footer {
    padding: 0.75rem 1.5rem;
    background: #0b111b;
    border-top: 1px solid #1e293b;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  .tap-legend {
    display: flex;
    gap: 1.25rem;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.65rem;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
  }
  .legend-item .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  .dot.analog { background: #ef4444; border: 1px solid #fca5a5; }
  .dot.input { background: #10b981; border: 1px solid #6ee7b7; }
  .dot.pre-eq { background: #f59e0b; border: 1px solid #fcd34d; }
  .dot.post-eq { background: #3b82f6; border: 1px solid #93c5fd; }
  .dot.pre-fade { background: #d946ef; border: 1px solid #f5d0fe; }
  .dot.post-fade { background: #06b6d4; border: 1px solid #67e8f9; }

  .tap-selector-box {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .tap-selector-box .label {
    font-size: 0.7rem;
    font-weight: 800;
    color: #94a3b8;
  }
  .tap-select {
    background: #1e293b;
    border: 1px solid #334155;
    color: #cbd5e1;
    font-size: 0.7rem;
    padding: 0.35rem 0.75rem;
    border-radius: 4px;
    outline: none;
    cursor: pointer;
  }
  .toggle-sm {
    background: #1e293b;
    color: #94a3b8;
    border: 1px solid #334155;
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    transition: 0.2s;
  }
  .toggle-sm:hover {
    background: #334155;
    color: #fff;
  }
  .toggle-sm.active {
    background: #3b82f6;
    color: white;
    border-color: #60a5fa;
  }
  .toggle-sm.active-yellow {
    background: #eab308;
    color: #1c1917;
    border-color: #fde047;
  }

  .aux-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.75rem;
    width: 100%;
    margin-top: 1rem;
    justify-items: center;
  }
  .aux-btn {
    background: #09090b;
    border: 1px solid #27272a;
    border-radius: 10px;
    padding: 1.5rem 0.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    color: inherit;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    width: 100%;
    max-width: 120px;
    position: relative;
    overflow: hidden;
  }
  .aux-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(139, 92, 246, 0.05) 0%, transparent 100%);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .aux-btn:hover {
    border-color: #8b5cf6;
    background: #18181b;
    transform: translateY(-2px);
    box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
  .aux-btn:hover::after { opacity: 1; }
  .aux-btn:active { transform: translateY(0); }
  .aux-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .aux-num { 
    font-family: 'JetBrains Mono', monospace; 
    font-size: 1.5rem; 
    font-weight: 800; 
    color: #fafafa;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .aux-name-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #8b5cf6;
  }
  .aux-label {
    font-size: 0.75rem;
    color: #52525b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .bento-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
    align-content: start;
  }
  .bento-grid::-webkit-scrollbar {
    width: 0;
  }
  .bento-card {
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 1rem;
  }
  .bento-card h3 {
    margin: 0 0 0.75rem 0;
    font-size: 0.65rem;
    font-weight: 800;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 0.4rem;
  }
  .bento-icon-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: 0.2s;
  }
  .bento-icon-preview.is-editable {
    cursor: pointer;
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
  }
  .bento-icon-preview.is-editable:hover {
    background: rgba(16, 185, 129, 0.1);
  }
  .edit-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    color: #10b981;
  }
  .icon-preview-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }
  .icon-lg {
    width: 48px;
    height: 48px;
    object-fit: contain;
    image-rendering: pixelated;
    border-radius: 4px;
    border: 2px solid #334155;
  }
  .icon-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: #e2e8f0;
  }
  .bento-eq-preview {
    display: flex;
    flex-direction: column;
  }
  .bento-eq-curve {
    width: 100%;
    height: 50px;
    background: #0b0f19;
    border-radius: 4px;
    border: 1px solid #1e293b;
  }
  .bento-eq-curve path {
    fill: none;
    stroke: #38bdf8;
    stroke-width: 1.5;
  }
  .bento-hint {
    font-size: 0.75rem;
    color: #64748b;
    margin: 0.5rem 0 0 0;
    line-height: 1.4;
    border-top: 1px dashed #1e293b;
    padding-top: 0.5rem;
    overflow-wrap: break-word;
    word-wrap: break-word;
    white-space: normal;
  }

  .bento-clickable {
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  .bento-clickable:hover {
    background: #1f2937;
    border-color: #475569;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .bento-input {
    width: 100%;
    background: #000;
    border: 1px solid #334155;
    color: #f8fafc;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    padding: 2px 4px;
    border-radius: 4px;
    text-align: center;
    outline: none;
    transition: all 0.2s;
    box-sizing: border-box;
  }
  .bento-input:focus { border-color: #3b82f6; box-shadow: 0 0 8px rgba(59, 130, 246, 0.3); }
  
  .param-row {
    display: grid;
    grid-template-columns: 1fr 58px 32px;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  .param-row span { font-size: 0.61rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .param-row .unit { font-size: 0.55rem; color: #475569; font-weight: 800; text-align: left; }
  
  .bento-toggle-btn {
    grid-column: 2 / -1; 
    width: 100%;
    background: #1e293b; color: #475569; border: 1px solid #334155;
    padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.6rem; font-weight: 900;
    cursor: pointer; transition: 0.2s;
  }
  .bento-toggle-btn.active { background: #3b82f6; color: white; border-color: #60a5fa; box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
  .bento-toggle-btn.active-yellow { background: #eab308; color: #451a03; border-color: #fde047; box-shadow: 0 0 10px rgba(234, 179, 8, 0.3); }
  .bento-hint {
    margin-top: 0.75rem;
    font-size: 0.65rem;
    color: #64748b;
    line-height: 1.4;
    font-weight: 600;
    border-top: 1px dashed #1e293b;
    padding-top: 0.5rem;
  }

  .musician-mix {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .musician-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #0b0f19;
    border-bottom: 1px solid #1e293b;
    flex-shrink: 0;
  }
  .musician-header h2 {
    margin: 0;
    font-size: 1.1rem;
    color: #f8fafc;
    font-weight: 800;
    letter-spacing: -0.3px;
  }
  .musician-rack {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 2px;
    padding: 0.5rem;
    overflow-x: auto;
    flex: 1;
  }
  .musician-rack::-webkit-scrollbar {
    height: 6px;
  }
  .musician-rack::-webkit-scrollbar-track {
    background: #0b0f19;
  }
  .musician-rack::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 3px;
  }
  .musician-rack::-webkit-scrollbar-thumb:hover {
    background: #475569;
  }

  .fade-in {
    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .portrait-warning {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #0b0d12;
    color: #f8fafc;
    z-index: 9999;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
  }
  .portrait-warning h2 {
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
  }
  .portrait-warning p {
    color: #94a3b8;
    font-size: 0.95rem;
    line-height: 1.5;
    max-width: 300px;
  }

  @media (max-width: 1400px) {
    :global(#app) {
      max-width: 95% !important;
    }
  }
  @media (min-width: 1600px) {
    .macro-view {
      max-width: 1800px;
      padding: 1rem 2rem;
    }
  }
  @media (max-width: 1100px) {
    :global(#app) {
      max-width: 100% !important;
    }
  }
  @media (max-width: 900px) and (orientation: portrait) {
    .app-container {
      display: none !important;
    }
    .portrait-warning {
      display: flex;
    }
  }

  .mixer-connect-section {
    border-top: 1px solid #1e293b;
    margin-top: 1.25rem;
    padding-top: 1.25rem;
  }
  .discover-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  .discovery-badge {
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.25rem 0.6rem;
    border-radius: 99px;
  }
  .discovery-badge.found {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid #10b981;
  }
  .discovery-badge.notfound {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid #ef4444;
  }

  .discovery-result-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    background: rgba(16, 185, 129, 0.06);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    animation: discovery-slide-in 0.3s ease-out;
  }
  @keyframes discovery-slide-in {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .discovery-result-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  .discovery-result-name {
    font-weight: 700;
    font-size: 0.9rem;
    color: #10b981;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .discovery-result-addr {
    font-size: 0.75rem;
    color: #6ee7b7;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.03em;
  }
  .discovery-result-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .btn-connect {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: #10b981;
    color: #022c22;
    border: none;
    padding: 0.4rem 0.9rem;
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.8rem;
    cursor: pointer;
    transition: 0.15s;
  }
  .btn-connect:hover {
    background: #34d399;
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
  }
  .btn-dismiss {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: #71717a;
    border: 1px solid #3f3f46;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    cursor: pointer;
    transition: 0.15s;
    padding: 0;
  }
  .btn-dismiss:hover {
    color: #ef4444;
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  .setup-overlay { position: absolute; inset: 0; z-index: 1000;
 background: #09090b; display: flex; justify-content: center; align-items: center; padding: 1rem; }
  .setup-card { background: #18181b; border: 1px solid #27272a;
 border-radius: 8px; padding: 2rem 2rem; width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 1.5rem;
 box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); max-height: 90vh; overflow-y: auto; }
  .setup-card::-webkit-scrollbar { width: 6px;
 } .setup-card::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
  .setup-logo { font-size: 1.25rem; font-weight: 900; letter-spacing: 0.2em; color: #fafafa;
 text-align: center; }
  .wide-setup { max-width: 840px; flex-direction: row; align-items: stretch; gap: 2.5rem; }
  .setup-col { flex: 1; display: flex; flex-direction: column; gap: 1.25rem; }
  .setup-col-right { border-left: 1px solid #27272a; padding-left: 2.5rem; justify-content: space-between; }
  .step-header { display: flex; flex-direction: column; gap: 0.25rem; text-align: center; }
  .step-title { font-size: 1.25rem; font-weight: 700;
 color: #fafafa; margin: 0; letter-spacing: -0.02em; }
  .step-desc { color: #a1a1aa; font-size: 0.85rem; margin: 0;
 }
  .setup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .action-row { display: flex; gap: 0.75rem; margin-top: 1rem; }

  /* Role Selection Card */
  .role-select-card {
    max-width: 520px;
    gap: 1.5rem;
    padding: 2.5rem 2.5rem 2rem;
    transition: max-width 0.3s ease;
  }
  .role-select-card.musician-select-card {
    max-width: 1024px;
    width: 95vw;
  }
  .selection-footer {
    display: flex;
    justify-content: center;
    margin-top: 1rem;
    padding-top: 1.5rem;
    border-top: 1px solid #27272a;
  }
  .btn-text.secondary {
    color: #71717a;
    background: transparent;
  }
  .btn-text.secondary:hover {
    color: #fafafa;
  }
  .role-select-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .role-select-subtitle {
    margin: 0;
    color: #71717a;
    font-size: 0.9rem;
    font-weight: 500;
    letter-spacing: 0.02em;
  }
  .role-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
  }
  .role-card {
    background: #09090b;
    border: 1px solid #27272a;
    border-radius: 8px;
    padding: 1.25rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    cursor: pointer;
    text-align: left;
    color: inherit;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  }
  .role-card:hover {
    background: #111113;
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
  }
  .role-card-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    background: #18181b;
    border: 1px solid #27272a;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
  }
  .role-card:hover .role-card-icon {
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
  }
  .role-card-icon.musician-icon {
    color: #8b5cf6;
  }
  .role-card:hover .role-card-icon.musician-icon {
    background: rgba(139, 92, 246, 0.1);
    color: #a78bfa;
  }
  .role-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    flex: 1;
    min-width: 0;
  }
  .role-info h3 {
    margin: 0;
    color: #fafafa;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .role-info p {
    margin: 0;
    color: #52525b;
    font-size: 0.8rem;
    line-height: 1.4;
  }
  .role-arrow {
    color: #3f3f46;
    font-size: 1.1rem;
    font-weight: 600;
    flex-shrink: 0;
    transition: color 0.15s, transform 0.15s;
  }
  .role-card:hover .role-arrow {
    color: #3b82f6;
    transform: translateX(2px);
  }
  .btn-text {
    background: transparent;
    border: none;
    color: #52525b;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0.5rem 1rem;
    transition: color 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    margin: 0 auto;
  }
  .btn-text:hover {
    color: #a1a1aa;
  }
  
  .form-group label { font-size: 0.7rem; font-weight: 600;
 color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
  .form-group input, .form-group select { background: #09090b;
 border: 1px solid #27272a; color: #fafafa; padding: 0.75rem 0.85rem; border-radius: 4px; font-size: 0.9rem; font-family: 'Inter', sans-serif; transition: border-color 0.15s;
 outline: none; width: 100%; box-sizing: border-box; }
  .form-group input:focus, .form-group select:focus { border-color: #3b82f6;
 }
  .btn-ghost, .btn-primary { padding: 0.75rem 1.5rem; border-radius: 4px; font-weight: 600; font-size: 0.85rem; cursor: pointer;
 transition: background 0.15s, color 0.15s; display: flex; align-items: center; justify-content: center; flex: 1; border: none;
 }
  .btn-ghost { background: transparent; color: #a1a1aa; border: 1px solid #27272a; }
  .btn-ghost:hover { background: #27272a; color: #fafafa;
 }
  .btn-primary { background: #fafafa; color: #09090b; }
  .btn-primary:hover:not(:disabled) { background: #e4e4e7; }
  .btn-primary:disabled { opacity: 0.5;
 cursor: not-allowed; }
  
  .side-filter-btn {
    background: #1e293b;
    border: 1px solid #334155;
    color: #94a3b8;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: 0.2s;
  }
  .side-filter-btn:hover {
    background: #334155;
    color: #f8fafc;
  }
  .side-filter-btn.active {
    background: #3b82f6;
    color: white;
    border-color: #60a5fa;
  }

  /* Sync Overlay Styles */
  .sync-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(2, 6, 23, 0.85);
    backdrop-filter: blur(12px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }

  .sync-card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 24px;
    padding: 3rem;
    max-width: 500px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes scaleIn {
    from { transform: scale(0.9) translateY(20px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }

  .sync-icon {
    width: 96px;
    height: 96px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
    color: #3b82f6;
    border: 1px solid #334155;
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.2);
  }

  :global(.spin-heavy) {
    animation: spin 2s linear infinite;
  }

  .sync-content h2 {
    font-size: 1.75rem;
    font-weight: 800;
    margin-bottom: 0.75rem;
    color: #f8fafc;
    letter-spacing: -0.02em;
  }

  .sync-content p {
    color: #94a3b8;
    line-height: 1.6;
    margin-bottom: 2.5rem;
    font-size: 1rem;
  }

  .sync-progress-bar {
    width: 100%;
    height: 8px;
    background: #1e293b;
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .sync-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    border-radius: 999px;
    transition: width 0.3s ease-out;
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
  }

  .sync-stats {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 0.85rem;
    font-weight: 700;
  }

  .sync-percent {
    color: #3b82f6;
    font-family: 'JetBrains Mono', monospace;
  }

  .sync-label {
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
</style>
