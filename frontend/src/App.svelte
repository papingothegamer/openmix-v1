<script>
  import { onMount } from "svelte";
  import {
    socket,
    isConnected,
    mixerState,
    rawMeters,
    meterLight,
    setOsc,
    setSocketAuthToken,
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
    Lock
  } from "lucide-svelte";

  let fohMeters = new Array(16).fill(-60);

  // Navigation / Focus State
  let activeRole = null; // 'foh' or null
  let activeTab = "mixer"; // 'mixer', 'channel', 'eq', 'sends', 'routing', 'fx'
  let routingSubTab = "busses"; // 'busses', 'aes50a', 'aes50b', 'usb', 'ultranet'
  let activeView = "inputs"; // 'inputs', 'outputs', 'dcas'
  let currentPage = 1;
  let channelsPerPage = 8;
  let stripsPerPage = 8; // User-configurable visible strips

  // Scribble Strip / Global Selectors
  let scribbleEditMode = false;
  let showMonitorModal = false;
  let editingChannel = null;
  let selectedChannel = "in_1";

  // Musician Monitor Mix — which aux bus they control
  let musicianAux = null;
  let musicianTokenLoading = false;
  let musicianToken = null;

  function connectAsFoh() {
    // Clear auth token so backend defaults to master_admin_token/FOH.
    setSocketAuthToken(null);
    try {
      socket.disconnect();
    } catch (_) {}
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

  function exitRole() {
    activeRole = null;
    musicianAux = null;
    musicianToken = null;
    musicianTokenLoading = false;
    connectAsFoh();
  }

  // Channel Modal State
  let channelModalState = { isOpen: false, channelId: "", section: "preamp" };

  function cycleChannel(dir) {
    if (!selectedChannel || selectedChannel === "main_LR") return;
    const [type, numStr] = selectedChannel.split("_");
    let num = parseInt(numStr, 10) + dir;

    if (type === "in" && num >= 1 && num <= config.inputs) {
      selectedChannel = `in_${num}`;
    } else if (type === "out" && num >= 1 && num <= config.outputs) {
      selectedChannel = `out_${num}`;
    } else if (type === "dca" && num >= 1 && num <= config.dcas) {
      selectedChannel = `dca_${num}`;
    }
  }

  // Chevron boundary detection
  $: isFirstChannel = (() => {
    if (!selectedChannel || selectedChannel === "main_LR") return true;
    const [type, numStr] = selectedChannel.split("_");
    return parseInt(numStr, 10) <= 1;
  })();

  $: isLastChannel = (() => {
    if (!selectedChannel || selectedChannel === "main_LR") return true;
    const [type, numStr] = selectedChannel.split("_");
    const num = parseInt(numStr, 10);
    if (type === "in") return num >= config.inputs;
    if (type === "out") return num >= config.outputs;
    if (type === "dca") return num >= (config.dcas || 8);
    return true;
  })();

  let requiresSetup = localStorage.getItem("openmix_setup") !== "true";
  let config = {
    inputs: 16,
    outputs: 6,
    dcas: 8,
    fx: 4,
    presetId: "CUSTOM",
    visibleBuses: [1, 2, 3, 4, 5, 6],
  };

  // Mixer connection config
  let mixerConfig = JSON.parse(
    localStorage.getItem("openmix_mixer") || '{"ip":"","port":10024}',
  );

  let discoveryStatus = "idle"; // 'idle' | 'scanning' | 'found' | 'notfound'

  function startDiscovery() {
    discoveryStatus = "scanning";
    socket.emit("discoverMixer", null, (result) => {
      if (result) {
        mixerConfig.ip = result.ip;
        mixerConfig.port = result.port;
        mixerConfig = { ...mixerConfig };
        discoveryStatus = "found";
      } else {
        discoveryStatus = "notfound";
      }
    });
  }

  // Main LR cannot route to sends/FX/routing
  $: disabledTabs =
    selectedChannel === "main_LR" ? ["sends", "fx", "routing"] : [];
  $: if (disabledTabs.includes(activeTab)) {
    activeTab = "channel";
  }

  // Watch config outputs to expand visibleBuses if CUSTOM mode expands globally without setting explicit visibility
  $: {
    if (
      config.outputs > 0 &&
      (!config.visibleBuses || config.visibleBuses.length === 0)
    ) {
      config.visibleBuses = Array.from(
        { length: config.outputs },
        (_, i) => i + 1,
      );
    }
  }

  // Scribble state array tracking
  let scribbles = {};

  // Phase 13 Parametric Nodes Reference
  let eqComponent;

  // Per-channel EQ state persistence (survives tab switches)
  let channelEqState = {};

  // Sends tab: per-channel per-bus state { level: 0-1, prePost: 0|1 }
  let sendsState = {};

  // Routing tab: per-channel per-bus on/off state (defaults to true = routed)
  let routingState = {};
  let routingSourceFilter = 'all'; // 'all' | 'inputs' | 'aux' | 'fx' | 'bus'

  $: routingSources = [
    ...Array.from({ length: config.inputs }, (_, i) => ({ id: `in_${i+1}`, type: 'in', num: i+1, name: scribbles[`in_${i+1}`]?.name || `CH ${i+1}` })),
    ...Array.from({ length: 8 }, (_, i) => ({ id: `auxin_${i+1}`, type: 'aux', num: i+1, name: scribbles[`auxin_${i+1}`]?.name || `AUX ${i+1}` })),
    ...Array.from({ length: config.fx || 4 }, (_, i) => ({ id: `fxrn_${i+1}`, type: 'fx', num: i+1, name: `FX RTN ${i+1}` })),
    ...Array.from({ length: config.outputs }, (_, i) => ({ id: `bus_${i+1}`, type: 'bus', num: i+1, name: `BUS ${i+1}` }))
  ];

  $: filteredRoutingSources = (() => {
    if (routingSourceFilter === 'all') return routingSources;
    return routingSources.filter(s => s.type === (routingSourceFilter === 'bus' ? 'bus' : (routingSourceFilter === 'aux' ? 'aux' : (routingSourceFilter === 'fx' ? 'fx' : 'in'))));
  })();

  // Stereo link state: key = odd channel number, value = true if linked to next even channel
  let stereoLinks = {}; // { 1: true, 3: true } means CH1↔CH2 and CH3↔CH4 are linked
  let outputLinks = {}; 


  function toggleStereoLink(ch) {
    const oddCh = ch % 2 === 1 ? ch : ch - 1; // Always reference the odd channel
    const newState = !stereoLinks[oddCh];
    stereoLinks = { ...stereoLinks, [oddCh]: newState };
    setOsc(`/config/chlink/${oddCh}-${oddCh + 1}`, newState ? 1 : 0);
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
  let mainOutAssign = {}; // { 'in_1': true, 'in_2': true, ... }
  
  // Monitor / Phones Source
  let monitorSource = "LR"; // Fallback
  $: soloSources = (() => {
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
  })();

  function setMonitorSource(src) {
    monitorSource = src;
    // Map to OSC: X32 has specific enum indices
    setOsc('/config/solo/source', src);
  }
  
  function toggleMainOut(chId) {
    const newState = !mainOutAssign[chId];
    mainOutAssign = { ...mainOutAssign, [chId]: newState };

    if (chId.startsWith("in_")) {
      const num = chId.replace("in_", "").padStart(2, "0");
      setOsc(`/ch/${num}/mix/lr`, newState ? 1 : 0);
    } else if (chId.startsWith("fx_")) {
      const num = chId.replace("fx_", "");
      setOsc(`/rtn/${num}/mix/lr`, newState ? 1 : 0);
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
      });
    }
  }

  $: currentEqBands = channelEqState[selectedChannel] || null;

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
    const cache = $mixerState?.flatOscCache || {};
    if (cache[address] === undefined || cache[address] === null) return fallback;
    const raw = Array.isArray(cache[address]) ? cache[address][0] : cache[address];
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  function readFlatOscBool(address, fallback = false) {
    return !!readFlatOscNumber(address, fallback ? 1 : 0);
  }

  onMount(() => {
    socket.connect();
    // Load local configuration
    const saved = localStorage.getItem("openmix_config");
    if (saved) config = JSON.parse(saved);

    // Ensure FX slots exist in store for current config
    // (deferred import to avoid circular load issues)
    import("./lib/fxState.js").then((mod) => {
      if (config && typeof config.fx === "number") mod.ensureFxSlots(config.fx);
    });

    return () => socket.disconnect();
  });

  // Hydrate sendsState from backend mixerState.flatOscCache when available
  $: if ($mixerState && $mixerState.flatOscCache) {
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
        
        // WIPE EXISTING STATE TO PREVENT LEFTOVERS FROM PREVIOUS SESSIONS
        scribbles = {};
        channelEqState = {};
        mainOutAssign = {};
        stereoLinks = {};
        routingState = {};
        sendsState = {};

        if (json.uiConfig) {
          if (json.uiConfig.config) config = json.uiConfig.config;
          if (json.uiConfig.scribbles) scribbles = json.uiConfig.scribbles;
          if (json.uiConfig.channelEqState)
            channelEqState = json.uiConfig.channelEqState;
          if (json.uiConfig.mainOutAssign)
            mainOutAssign = json.uiConfig.mainOutAssign;
          if (json.uiConfig.stereoLinks)
            stereoLinks = json.uiConfig.stereoLinks;
          if (json.uiConfig.routingState)
            routingState = json.uiConfig.routingState;
          if (json.uiConfig.sendsState)
            sendsState = json.uiConfig.sendsState;

          localStorage.setItem("openmix_config", JSON.stringify(config));
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
  $: presetHardLinks =
    config.presetId !== "CUSTOM"
      ? MixerPresets[config.presetId]?.hardLinks?.inputs || {}
      : {};
  $: inputChannels = Array.from(
    { length: config.inputs },
    (_, i) => i + 1,
  ).filter((ch) => !presetHardLinks[ch]?.hidden);
  $: outputChannels = (
    config.visibleBuses ||
    Array.from({ length: config.outputs }, (_, i) => i + 1)
  ).sort((a, b) => a - b);
  $: dcaChannels = Array.from({ length: config.dcas || 8 }, (_, i) => i + 1);
  $: fxChannels = Array.from({ length: config.fx || 4 }, (_, i) => i + 1);
  $: currentChannels =
    activeView === "inputs"
      ? inputChannels
      : activeView === "outputs"
        ? outputChannels
        : dcaChannels;
  $: fohMeters = $rawMeters || [];
  
  // Fluid Pagination Logic
  let containerWidth = 0;
  const STRIP_WIDTH = 90;
  // Standard layout size

  $: channelsPerPage = stripsPerPage;
  $: totalPages = Math.ceil(
    currentChannels.length / Math.max(1, channelsPerPage),
  );
  $: displayedChannels = currentChannels.slice(
    currentPage * channelsPerPage,
    (currentPage + 1) * channelsPerPage,
  );
  // Musician pagination
  let musicianPage = 0;
  $: musicianTotalPages = Math.ceil(
    inputChannels.length / Math.max(1, stripsPerPage),
  );
  $: musicianDisplayedChannels = inputChannels.slice(
    musicianPage * stripsPerPage,
    (musicianPage + 1) * stripsPerPage,
  );
  // Watch for layer switches to reset bank
  $: {
    if (activeView) currentPage = 0;
  }

  function applyPreset() {
    if (config.presetId !== "CUSTOM") {
      const preset = MixerPresets[config.presetId];
      if (preset) {
        console.log(`[OpenMix] Applying Mixer Preset: ${preset.name}`, preset);
        config.inputs = preset.inputs;
        config.outputs = preset.outputs;
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
                  {#if discoveryStatus === "scanning"} <Search size={16} style="margin-right: 8px; vertical-align: bottom;" /> Scanning... {:else} <Radio size={16} style="margin-right: 8px; vertical-align: bottom;" /> Auto-Discover {/if}
                </button>
          
                {#if discoveryStatus === "found"}
                  <span class="discovery-badge found"><Check size={14} style="margin-right: 4px; vertical-align: bottom;" /> Found</span>
                {:else if discoveryStatus === "notfound"}
                  <span class="discovery-badge notfound"><X size={14} style="margin-right: 4px; vertical-align: bottom;" /> Not found</span>
                {/if}
              </div>
              <div class="form-row split">
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
        <div class="setup-card">
          <div class="setup-logo">OPENMIX</div>
          <div class="step-header">
            <h2 class="step-title">Select Your Role</h2>
            <p class="step-desc">Choose your operating mode to get started.</p>
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
              <span class="role-icon"><Sliders size={24} /></span>
              <div class="role-info">
                <h3>FOH Engineer</h3>
                <p>Full control over inputs, outputs, and routing.</p>
              </div>
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
              <span class="role-icon"><Headphones size={24} /></span>
              <div class="role-info">
                <h3>Musician</h3>
                <p>Control your personal monitor mix securely.</p>
              </div>
            </button>
          </div>
          <button class="btn-text" on:click={() => requiresSetup = true}>Re-run Console Setup</button>
        </div>
      </div>
    {:else}
      {#if activeRole === "musician" && !musicianAux}
        <div class="setup-overlay fade-in">
          <div class="setup-card">
            <div class="setup-logo">OPENMIX</div>
            <div class="step-header">
              <h2 class="step-title">Select Monitor Mix</h2>
              <p class="step-desc">Choose the AUX output bus assigned to you.</p>
            </div>
            <div class="aux-grid" style="margin-top: 0.5rem; margin-bottom: 0;">
              {#each config.visibleBuses || [] as auxNum}
                <button
                  class="aux-btn"
                  disabled={musicianTokenLoading}
                  on:click={() => requestMusicianTokenAndConnect(auxNum)}
                >
                  <span class="aux-num">AUX {auxNum}</span>
                  <span class="aux-label">{scribbles[`out_${auxNum}`]?.name || `Output ${auxNum}`}</span>
                </button>
              {/each}
            </div>
            <div class="action-row" style="margin-top:1.5rem;">
              <button class="btn-ghost" on:click={exitRole} style="width: 100%;"><ArrowLeft size={16} style="margin-right: 0.5rem;"/> Back to Roles</button>
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
                  {#if scribbles[`out_${musicianAux}`]?.iconType}
                    <img
                      src="/icons-bmp/{scribbles[`out_${musicianAux}`].iconType}.bmp"
                      alt=""
                      class="musician-header-icon"
                    />
                  {:else}
                    <div class="musician-header-icon-empty"></div>
                  {/if}
                  <h2>
                    {scribbles[`out_${musicianAux}`]?.name || `AUX ${musicianAux} Monitor Mix`}
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
                    name={scribbles[`out_${musicianAux}`]?.name || `AUX ${musicianAux}`}
                    iconType={scribbles[`out_${musicianAux}`]?.iconType || "icon_01"}
                    color={scribbles[`out_${musicianAux}`]?.color || "#8b5cf6"}
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
                    {@const sId =
                      activeView === "inputs"
                        ? `in_${chIndex}`
                        : activeView === "outputs"
                          ? `bus_${chIndex}`
                          : `dca_${chIndex}`}
                    <div
                      class="strip-wrapper"
                      on:click={() => {
                        if (activeRole === "foh" && scribbleEditMode)
                          editingChannel = sId;
                      }}
                    >
                      <ChannelStrip
                        channelIndex={String(chIndex)}
                        role={activeRole}
                        stripType={activeView === "outputs"
                          ? "output"
                          : activeView === "dcas"
                            ? "dca"
                            : "input"}
                        name={scribbles[sId]?.name ||
                          (activeView === "inputs"
                            ? presetHardLinks[chIndex]?.defaultName ||
                              `CH ${chIndex}`
                            : activeView === "outputs"
                              ? `AUX ${chIndex}`
                              : `DCA ${chIndex}`)}
                        iconType={scribbles[sId]?.iconType || "icon_01"}
                        color={activeView === "inputs" &&
                        isLinked(chIndex, stereoLinks)
                          ? chIndex % 2 === 1
                            ? "#3b82f6"
                            : "#ef4444"
                          : scribbles[sId]?.color || (activeView === "inputs" ? "#3f3f46" : "#3b82f6")}
                        peakLevel={activeView === "inputs"
                          ? fohMeters[chIndex - 1] || -60
                          : -60}
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
                        on:click={() => {
                          if (activeRole === "foh" && scribbleEditMode)
                            editingChannel = fxSId;
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
                      on:click={() => {
                        if (activeRole === "foh" && scribbleEditMode)
                          editingChannel = "main_LR";
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
                  EQ EDITOR: {scribbles[selectedChannel]?.name || selectedChannel?.toUpperCase()}
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
                  CHANNEL: {scribbles[selectedChannel]?.name || selectedChannel?.toUpperCase()}
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
              <div class="bento-grid">
                <div
                  class="bento-card bento-icon-preview"
                  class:is-editable={activeRole === "foh" && scribbleEditMode}
                  on:click={() => {
                    if (activeRole === "foh" && scribbleEditMode)
                      editingChannel = selectedChannel;
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
                    on:click={() => {
                      channelModalState = {
                        isOpen: true,
                        channelId: selectedChannel,
                        section: "preamp",
                      };
                    }}
                  >
                    <h3>Preamp</h3>
                    <div class="param-row">
                      <span>Gain</span><input
                        type="range"
                        class="visual-only"
                        min="0"
                        max="60"
                        value="30"
                        disabled
                      /><span>30 dB</span>
                    </div>
                    <div class="param-row">
                      <span>48V</span><button class="toggle-sm">OFF</button>
                    </div>
                    <div class="param-row">
                      <span>Phase</span><button class="toggle-sm">0°</button>
                    </div>
                  </div>
                {/if}
                <div
                  class="bento-card bento-clickable"
                  on:click={() => {
                    channelModalState = {
                      isOpen: true,
                      channelId: selectedChannel,
                      section: "gate",
                    };
                  }}
                >
                  <h3 style="display: flex; justify-content: space-between;">Gate <Settings size={14} style="color:#f59e0b; opacity:0.5;"/></h3>
                  <div class="param-row">
                    <span>Threshold</span><input
                      type="range"
                      class="visual-only"
                      min="-80"
                      max="0"
                      value="-40"
                      disabled
                    /><span>-40 dB</span>
                  </div>
                  <div class="param-row">
                    <span>Range</span><input
                      type="range"
                      class="visual-only"
                      min="0"
                      max="60"
                      value="20"
                      disabled
                    /><span>20 dB</span>
                  </div>
                  <div class="param-row">
                    <span>Attack</span><input
                      type="range"
                      class="visual-only"
                      min="0"
                      max="120"
                      value="5"
                      disabled
                    /><span>5 ms</span>
                  </div>
                  <div class="param-row">
                    <span>Hold</span><input
                      type="range"
                      class="visual-only"
                      min="0"
                      max="500"
                      value="50"
                      disabled
                    /><span>50 ms</span>
                  </div>
                </div>
  
                <div
                  class="bento-card bento-clickable"
                  on:click={() => {
                    channelModalState = {
                      isOpen: true,
                      channelId: selectedChannel,
                      section: "compressor",
                    };
                  }}
                >
                  <h3 style="display: flex; justify-content: space-between;">Compressor <Settings size={14} style="color:#f59e0b; opacity:0.5;"/></h3>
                  <div class="param-row">
                    <span>Threshold</span><input
                      type="range"
                      class="visual-only"
                      min="-60"
                      max="0"
                      value="-20"
                      disabled
                    /><span>-20 dB</span>
                  </div>
                  <div class="param-row">
                    <span>Ratio</span><input
                      type="range"
                      class="visual-only"
                      min="1"
                      max="20"
                      value="4"
                      disabled
                    /><span>4:1</span>
                  </div>
                  <div class="param-row">
                    <span>Attack</span><input
                      type="range"
                      class="visual-only"
                      min="0"
                      max="100"
                      value="10"
                      disabled
                    /><span>10 ms</span>
                  </div>
                  <div class="param-row">
                    <span>Release</span><input
                      type="range"
                      class="visual-only"
                      min="5"
                      max="500"
                      value="100"
                      disabled
                    /><span>100 ms</span>
                  </div>
                  <div class="param-row">
                    <span>Makeup</span><input
                      type="range"
                      class="visual-only"
                      min="0"
                      max="24"
                      value="0"
                      disabled
                    /><span>0 dB</span>
                  </div>
                </div>
                <div class="bento-card bento-eq-preview">
                  <h3>EQ Preview</h3>
                  <svg viewBox="0 0 100 40" class="bento-eq-curve"
                    ><path d={computeMiniEqPath(selectedChannel)} /></svg
                  >
                </div>
                <div
                  class="bento-card bento-clickable"
                  on:click={() => {
                    channelModalState = {
                      isOpen: true,
                      channelId: selectedChannel,
                      section: "output",
                    };
                  }}
                >
                  <h3>Output</h3>
                  <div class="param-row">
                    <span>Pan</span><input
                      type="range"
                      class="visual-only"
                      min="-100"
                      max="100"
                      value="0"
                      disabled
                    /><span>C</span>
                  </div>
                  <div class="param-row">
                    <span>Level</span><input
                      type="range"
                      class="visual-only"
                      min="-90"
                      max="10"
                      value="0"
                      disabled
                    /><span>0 dB</span>
                  </div>
                </div>

                {#if selectedChannel && !selectedChannel.startsWith("out_")}
                  <div class="bento-card">
                    <h3>Main Out</h3>
                    <div class="param-row">
                      <span>Assign to LR</span>
                      <button
                        class="toggle-sm"
                        class:active={mainOutAssign[selectedChannel]}
                        on:click={() => toggleMainOut(selectedChannel)}
                      >
                        {mainOutAssign[selectedChannel] ? "ON" : "OFF"}
                      </button>
                    </div>
                    <p class="bento-hint">
                      Route this channel to the Main LR output bus. Disable for
                      talkback or monitor-only channels.
                    </p>
                  </div>
                {/if}
                {#if selectedChannel.startsWith("in_")}
                  {@const chNum = parseInt(selectedChannel.replace("in_", ""))}
                  {@const oddCh = chNum % 2 === 1 ? chNum : chNum - 1}
                  {@const partnerCh = chNum % 2 === 1 ? chNum + 1 : chNum - 1}
                  <div class="bento-card">
                    <h3>Stereo Link</h3>
                    <div class="param-row">
                      <span>CH {oddCh} ↔ CH {oddCh + 1}</span>
                      <button
                        class="toggle-sm"
                        class:active-yellow={stereoLinks[oddCh]}
                        on:click={() => toggleStereoLink(chNum)}
                      >
                        {stereoLinks[oddCh] ? "LINKED" : "OFF"}
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
            <EffectsRack
              {config}
              {scribbles}
              bind:selectedChannel
              {cycleChannel}
              {isFirstChannel}
              {isLastChannel}
            />
          {:else if activeTab === "routing"}
            <div class="macro-view fade-in" style="overflow-x: auto;">
              <div class="view-header-inline">
                <h2 class="title-left">
                  GLOBAL ROUTING MATRIX
                </h2>
              </div>
              <div class="view-header-inline" style="border-top: 1px solid #1e293b; padding-top: 1rem; margin-top: 1rem;">
                <div class="nav-group" style="margin-bottom: 0;">
                  <button class="nav-btn" class:active={routingSubTab === 'busses'} on:click={() => routingSubTab = 'busses'}>Busses</button>
                  
                  {#if MixerPresets[config.presetId]?.hasAES50}
                    <button class="nav-btn" class:active={routingSubTab === 'aes50a'} on:click={() => routingSubTab = 'aes50a'}>AES50-A</button>
                    <button class="nav-btn" class:active={routingSubTab === 'aes50b'} on:click={() => routingSubTab = 'aes50b'}>AES50-B</button>
                  {/if}

                  {#if MixerPresets[config.presetId]?.hasUSB}
                    <button class="nav-btn" class:active={routingSubTab === 'usb'} on:click={() => routingSubTab = 'usb'}>USB/Card</button>
                  {/if}

                  {#if MixerPresets[config.presetId]?.hasUltranet}
                    <button class="nav-btn" class:active={routingSubTab === 'ultranet'} on:click={() => routingSubTab = 'ultranet'}>Ultranet</button>
                  {/if}
                </div>
              </div>
              <div class="tab-content-body" style="padding: 1rem;">
                <div class="param-section">
                  <h3 style="text-transform: uppercase;">{routingSubTab} Routing Matrix</h3>
                  <p style="color:#94a3b8; font-size: 0.8rem; margin-bottom: 0.75rem;">
                    Patch inputs directly from the corresponding protocol blocks.
                  </p>
                          <div class="routing-layout" style="display: flex; gap: 1rem; height: calc(100vh - 300px);">
                    <!-- Sidebar Filtering -->
                    <div class="routing-sidebar" style="width: 150px; flex-shrink: 0; background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
                      <h4 style="font-size: 0.65rem; color: #64748b; text-transform: uppercase; margin: 0.5rem 0.25rem;">Sources</h4>
                      <button class="side-filter-btn" class:active={routingSourceFilter === 'all'} on:click={() => routingSourceFilter = 'all'}>All Inputs</button>
                      <button class="side-filter-btn" class:active={routingSourceFilter === 'inputs'} on:click={() => routingSourceFilter = 'inputs'}>Local In</button>
                      <button class="side-filter-btn" class:active={routingSourceFilter === 'aux'} on:click={() => routingSourceFilter = 'aux'}>Aux In</button>
                      <button class="side-filter-btn" class:active={routingSourceFilter === 'fx'} on:click={() => routingSourceFilter = 'fx'}>FX Return</button>
                      <button class="side-filter-btn" class:active={routingSourceFilter === 'bus'} on:click={() => routingSourceFilter = 'bus'}>Mix Busses</button>
                    </div>

                    <div class="matrix-table-container" style="flex: 1; overflow: auto; border: 1px solid #1e293b; border-radius: 8px; background: #0b1120; position: relative;">
                      <table class="routing-matrix-grid" style="width: 100%; border-collapse: collapse;">
                        <thead style="position: sticky; top: 0; z-index: 10; background: #111827;">
                          <tr>
                            <th style="padding: 0.5rem; border: 1px solid #1e293b; color: #cbd5e1; font-size: 0.75rem;">SRC \\ DEST</th>
                            {#each Array(config.outputs) as _, j}
                              <th class="col-header" style="padding: 0.5rem; border: 1px solid #1e293b; color: #cbd5e1; font-size: 0.75rem;">AUX {j+1}</th>
                            {/each}
                          </tr>
                        </thead>
                        <tbody>
                          {#each filteredRoutingSources as src, i (src.id)}
                            <tr>
                              <td class="row-header" style="position: sticky; left: 0; background: #111827; z-index: 5; padding: 0.5rem; border: 1px solid #1e293b; font-size: 0.75rem; font-weight: 600; color: #cbd5e1; text-align: left;">{src.name}</td>
                              {#each Array(config.outputs) as _, j}
                                {@const rKey = `${src.id}_bus${j+1}`}
                                <td class="cell-toggle" style="padding: 0.4rem; border: 1px solid #1e293b; text-align: center;">
                                  <button class="matrix-dot" 
                                    aria-label="Toggle {src.name} to AUX {j+1}"
                                    class:active={routingState[rKey]} 
                                    on:click={() => {
                                        routingState[rKey] = !routingState[rKey];
                                        routingState = { ...routingState };
                                        const ch = src.num.toString().padStart(2, "0");
                                        const bus = String(j+1).padStart(2, "0");
                                        const prefix = src.type === 'in' ? 'ch' : (src.type === 'aux' ? 'auxin' : (src.type === 'fx' ? 'rtn' : 'bus'));
                                        setOsc(`/${prefix}/${ch}/mix/${bus}/on`, routingState[rKey] ? 1 : 0);
                                    }}
                                  ></button>
                                </td>
                              {/each}
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {:else}
            <div class="macro-view fade-in">
              <div class="view-header-inline">
                <h2 class="title-left">
                  {activeTab.toUpperCase()} VIEW: {scribbles[selectedChannel]?.name || selectedChannel.toUpperCase()}
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

          {#if activeRole === "foh"}
            <Sidebar
              {activeTab}
              bind:activeView
              bind:currentPage
              {totalPages}
              {stripsPerPage}
              onPageChange={(p) => (currentPage = p)}
              onViewChange={(v) => (activeView = v)}
              onStripsChange={(n) => (stripsPerPage = n)}
              onResetEq={() => {
                if (eqComponent) eqComponent.resetFlat();
              }}
            />
          {/if}
        </div>
      {/if}
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
      <ChannelModal
        channelId={channelModalState.channelId}
        channelName={scribbles[channelModalState.channelId]?.name}
        initialSection={channelModalState.section}
        {scribbles}
        on:close={() => (channelModalState.isOpen = false)}
      />
    {/if}
  </div>
  <MonitorModal 
    show={showMonitorModal} 
    currentSource={monitorSource}
    sources={soloSources}
    on:select={(e) => { setMonitorSource(e.detail); }}
    on:close={() => showMonitorModal = false}
  />
</main>

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

  .action-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    display: block;
    width: 100%;
    transition: background 0.2s;
    font-size: 1rem;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    margin-top: 1rem;
  }
  .action-btn:hover {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
  }

  .role-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
    margin-bottom: 1rem;
  }
  .role-btn {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1.5rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    color: inherit;
    height: 100%;
  }
  .role-btn:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(30, 41, 59, 0.8);
  }
  .role-btn.foh {
    border-top: 3px solid #3b82f6;
  }
  .role-btn.musician {
    border-top: 3px solid #8b5cf6;
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

  /* Ableton mixer scroll view (Horizontal scroll container) */
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
  .master-divider {
    width: 2px;
    height: 100%;
    background: #1e293b;
    margin: 0 1rem;
    border-radius: 1px;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
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

  /* Macro Views Styling */
  .macro-view {
    padding: 0.5rem;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .view-header-inline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    padding: 0 0.5rem;
    flex-shrink: 0;
  }
  .title-left {
    margin: 0;
    color: #f8fafc;
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.5px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }
  .nav-group {
    display: flex;
    gap: 0.5rem;
  }
  .nav-icon-btn {
    background: #1e293b;
    border: 1px solid #334155;
    color: #94a3b8;
    border-radius: 6px;
    padding: 0.4rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .nav-icon-btn:hover:not(:disabled) {
    color: #fff;
    background: #3b82f6;
    border-color: #60a5fa;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
    transform: scale(1.05);
  }
  .nav-icon-btn:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }

  .wireframe-content {
    flex: 1;
    border: 2px dashed #3f3f46;
    border-radius: 12px;
    opacity: 0.5;
    min-height: 60px;
  }

  /* Tab Content Body */
  .tab-content-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    padding: 0.5rem 0;
  }
  .tab-content-body::-webkit-scrollbar {
    width: 6px;
  }
  .tab-content-body::-webkit-scrollbar-track {
    background: transparent;
  }
  .tab-content-body::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 3px;
  }
  .param-section {
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 1rem;
  }
  .param-section h3 {
    margin: 0 0 0.8rem 0;
    font-size: 0.8rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .param-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid #1e293b;
  }
  .param-row:last-child {
    border-bottom: none;
  }
  .param-row span {
    font-size: 0.8rem;
    color: #cbd5e1;
    min-width: 70px;
    font-weight: 600;
  }
  .param-row span:last-child {
    min-width: 55px;
    text-align: right;
    font-family: "JetBrains Mono", monospace;
    font-size: 0.75rem;
    color: #94a3b8;
  }
  .param-row input[type="range"] {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    background: #1e293b;
    border-radius: 3px;
    outline: none;
    margin: 0;
  }
  .param-row input[type="range"]::-webkit-slider-runnable-track {
    width: 100%;
    height: 6px;
    background: #1e293b;
    border-radius: 3px;
  }
  .param-row input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    background: #3b82f6;
    cursor: pointer;
    margin-top: -5px;
    border: none;
    transition: background 0.15s;
  }
  .param-row input[type="range"]::-webkit-slider-thumb:hover {
    background: #60a5fa;
  }
  .param-row input[type="range"]::-moz-range-track {
    width: 100%;
    height: 6px;
    background: #1e293b;
    border-radius: 3px;
    border: none;
  }
  .param-row input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    background: #3b82f6;
    cursor: pointer;
    border: none;
  }
  .param-row input[type="range"].visual-only::-webkit-slider-thumb {
    display: none;
  }
  .param-row input[type="range"].visual-only::-moz-range-thumb {
    display: none;
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

  /* Musician Aux Selector */
  .aux-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
    margin-bottom: 1rem;
  }
  .aux-btn {
    background: rgba(15, 23, 42, 0.6);
    border: 2px solid rgba(139, 92, 246, 0.3);
    border-radius: 12px;
    padding: 1.5rem 1rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    color: inherit;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }
  .aux-btn:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(139, 92, 246, 0.3);
    border-color: #8b5cf6;
    background: rgba(139, 92, 246, 0.15);
  }
  .aux-num {
    font-size: 1.5rem;
    font-weight: 800;
    color: #8b5cf6;
  }
  .aux-label {
    font-size: 0.8rem;
    color: #94a3b8;
  }

  /* Bento Grid for Channel Tab */
  .bento-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.75rem;
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
    padding: 0.75rem;
  }
  .bento-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.7rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
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
  .icon-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    border: 2px dashed #334155;
    background: #0f172a;
  }
  .icon-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: #e2e8f0;
  }
  .icon-color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.15);
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
  }

  .bento-clickable {
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  .bento-clickable:hover {
    background: #1f2937;
    transform: translateY(-2px);
    border-color: #374151;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }


  /* Musician Monitor Mix */
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
  .musician-header-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
    image-rendering: pixelated;
    border-radius: 4px;
    border: 2px solid #8b5cf6;
  }
  .musician-header-icon-empty {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 2px solid #334155;
    background: #18181b;
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

  /* Mobile & Tablet Responsiveness */
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
  .rotate-icon {
    font-size: 4rem;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
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

  /* ─── Mixer Discovery UI ─────────────────────────────── */
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

  /* ─── Setup & Connection Overlay ─── */
  .setup-overlay { position: absolute; inset: 0; z-index: 1000;
 background: #09090b; display: flex; justify-content: center; align-items: center; padding: 1rem; }
  .setup-card { background: #18181b; border: 1px solid #27272a;
 border-radius: 8px; padding: 3rem 2.5rem; width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 2rem;
 box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); max-height: 90vh; overflow-y: auto; }
  .setup-card::-webkit-scrollbar { width: 6px;
 } .setup-card::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
  .setup-logo { font-size: 1.25rem; font-weight: 900; letter-spacing: 0.2em; color: #fafafa;
 text-align: center; }
  .wide-setup { max-width: 800px; flex-direction: row; align-items: stretch; gap: 3rem; }
  .setup-col { flex: 1;
 display: flex; flex-direction: column; gap: 1.5rem; }
  .setup-col-right { border-left: 1px solid #27272a; padding-left: 3rem; justify-content: space-between;
 }
  .step-header { display: flex; flex-direction: column; gap: 0.4rem; text-align: center; }
  .step-title { font-size: 1.25rem; font-weight: 700;
 color: #fafafa; margin: 0; letter-spacing: -0.02em; }
  .step-desc { color: #a1a1aa; font-size: 0.85rem; margin: 0;
 }
  
  .role-grid { display: flex; flex-direction: column; gap: 0.75rem; }
  .role-card { background: #09090b;
 border: 1px solid #27272a; border-radius: 6px; padding: 1.25rem; display: flex; align-items: flex-start; gap: 1rem; cursor: pointer; text-align: left;
 transition: background 0.15s, border-color 0.15s; color: inherit; }
  .role-card:hover { background: #1f1f22; border-color: #3b82f6;
 }
  .role-icon { font-size: 1.5rem; line-height: 1; margin-top: 2px; color: #fafafa; }
  .role-info { display: flex; flex-direction: column;
 gap: 0.25rem; }
  .role-info h3 { margin: 0; color: #fafafa; font-size: 0.95rem; font-weight: 600;
 }
  .role-info p { margin: 0; color: #71717a; font-size: 0.8rem; line-height: 1.4;
 }
  
  .setup-grid { display: flex; flex-direction: column; gap: 1rem; }
  .form-row { display: flex; flex-direction: column;
 gap: 1rem; width: 100%; }
  .form-row.split { flex-direction: row; }
  .form-group { display: flex; flex-direction: column; gap: 0.4rem;
 }
  .flex-1 { flex: 1; } .flex-2 { flex: 2; }
  .form-group label { font-size: 0.7rem; font-weight: 600;
 color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
  .form-group input, .form-group select { background: #09090b;
 border: 1px solid #27272a; color: #fafafa; padding: 0.75rem 0.85rem; border-radius: 4px; font-size: 0.9rem; font-family: 'Inter', sans-serif; transition: border-color 0.15s;
 outline: none; width: 100%; box-sizing: border-box; }
  .form-group input:focus, .form-group select:focus { border-color: #3b82f6;
 }
  .form-group input:disabled { opacity: 0.5; cursor: not-allowed; }
  .select-wrapper { position: relative;
 }
  .select-wrapper::after { content: '▼'; position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); color: #71717a; pointer-events: none; font-size: 0.6rem;
 }
  .form-group select { appearance: none; -webkit-appearance: none; padding-right: 2.5rem; cursor: pointer; }
  .setup-grid { display: grid;
 grid-template-columns: 1fr 1fr; gap: 1rem; }
  
  .action-row { display: flex; gap: 0.75rem; margin-top: 1rem;
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
  
  .bus-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.5rem; margin-top: 0.25rem;
 }
  .bus-toggle { display: flex; align-items: center; justify-content: flex-start; gap: 0.6rem; color: #e2e8f0; font-size: 0.8rem; cursor: pointer; background: #09090b;
 padding: 0.6rem; border-radius: 6px; border: 1px solid #27272a; transition: 0.2s; font-family: 'JetBrains Mono', monospace; }
  .bus-toggle:hover { border-color: #64748b;
 }
  .bus-toggle input { cursor: pointer; width: 16px; height: 16px; margin: 0; }
  .btn-text { background: transparent;
 border: none; color: #71717a; font-size: 0.8rem; cursor: pointer; text-decoration: underline; margin-top: 0.5rem; display: block; text-align: center; width: 100%;
 transition: color 0.1s; }
  .btn-text:hover { color: #fafafa; }

  /* ─── Mixer Discovery UI ─────────────────────────────── */
  .discover-row { display: flex;
 align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; width: 100%; }
  .discover-btn { flex: 1; justify-content: center; display: flex; gap: 0.4rem;
 }
  .discovery-badge { font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 99px; display: flex; align-items: center; gap: 0.25rem;
 }
  .discovery-badge.found { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid #10b981; }
  .discovery-badge.notfound { background: rgba(239,68,68,0.15); color: #ef4444;
 border: 1px solid #ef4444; }
  .bento-clickable h3 { margin-bottom: 0.25rem; font-size: 0.8rem; }
  .bento-clickable .param-row { display: flex;
 justify-content: space-between; font-size: 0.65rem; margin-bottom: 0.15rem; align-items: center; color: #a1a1aa; }
  .bento-clickable .param-row input[type="range"] { max-width: 45px; height: 3px;
 }
  .bento-clickable .param-row span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
 }

  /* ─── Matrix Grid Styling ─── */
  .matrix-table-container { overflow: auto; max-height: 60vh; border: 1px solid #1e293b;
 border-radius: 8px; background: #0b1120; }
  .routing-matrix-grid { border-collapse: collapse; text-align: center;
 }
  .routing-matrix-grid th, .routing-matrix-grid td { padding: 0.4rem; border: 1px solid #1e293b; font-size: 0.75rem; white-space: nowrap;
 }
  .routing-matrix-grid th { background: #111827; position: sticky; top: 0; z-index: 10; color: #cbd5e1; font-weight: 600;
 }
  .row-header { background: #111827; font-weight: 600; color: #cbd5e1; text-align: left; padding-left: 1rem !important; position: sticky; left: 0;
 z-index: 5; }
  .matrix-dot { width: 14px; height: 14px; border-radius: 50%; background: #334155; border: none; cursor: pointer; transition: 0.2s;
 margin: 0 auto; display: block; }
  .matrix-dot:hover { background: #64748b; }
  .matrix-dot.active { background: #f59e0b;
 box-shadow: 0 0 8px rgba(245,158,11,0.5); }

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
</style>