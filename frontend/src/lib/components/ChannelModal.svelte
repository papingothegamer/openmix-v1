<script>
  import { createEventDispatcher } from 'svelte';
  import { X, Mic, AudioWaveform, Zap, Volume2 } from 'lucide-svelte';
  import { mixerState, setOsc } from "../socket";
  import GateGraph from "./ChannelModalGraphs/GateGraph.svelte";
  import CompressionGraph from "./ChannelModalGraphs/CompressionGraph.svelte";
  
  export let channelId = '';
  export let channelName = '';
  export let initialSection = 'preamp'; // 'preamp', 'gate', 'compressor', 'output'
  export let scribbles = {};
  export let mainOut = false;
  
  const dispatch = createEventDispatcher();
  
  let activeSection = initialSection;
  
  function close() {
    dispatch('close');
  }
  
  // Mixer-backed parameters for graph + sliders.
  // Graphs are always rendered from these local values.
  let params = {
    gain: 30,
    phantom: false,
    phase: false,
    gateThresh: -40,
    gateRange: 20,
    gateAttack: 5,
    gateHold: 50,
    gateRel: 100,
    compThresh: -20,
    compRatio: 4,
    compAttack: 10,
    compRelease: 100,
    compMakeup: 0,
    hpfOn: false,
    hpfFreq: 80,
    gateScFreq: 100,
    gateScType: 0, // 0=2pole, 1=LC, 2=HC
    compScFreq: 100,
    compScType: 0,
    outPan: 0,
    outLevel: 0,
    mainOut: true,
  };

  $: if (mainOut !== undefined) params.mainOut = mainOut;

  let hydratedFor = null;

  const MAX_DB = 10;

  // Handoff uses `/ch/XX/mix/fader` as a normalized float (0..1).
  // The ChannelModal UI exposes dB; this converts dB -> normalized fader value.
  function dbToFader(db) {
    const d = Number(db);
    if (!Number.isFinite(d)) return 0;

    const clamped = Math.max(-60, Math.min(MAX_DB, d));
    if (clamped <= -60) return 0;

    const linear = Math.pow(10, clamped / 20);
    const linearAtMax = Math.pow(10, MAX_DB / 20);
    return Math.max(0, Math.min(1, linear / linearAtMax));
  }

  // Inverse of `dbToFader`: normalized 0..1 -> dB for UI display.
  function faderToDb(norm) {
    const v = Number(norm);
    if (!Number.isFinite(v) || v <= 0) return -60;

    const linearAtMax = Math.pow(10, MAX_DB / 20);
    const linear = v * linearAtMax;
    const d = 20 * Math.log10(linear);
    return Math.max(-60, Math.min(MAX_DB, d));
  }

  function oscPrefixFromChannelId(id) {
    if (typeof id !== "string") return null;
    const isXR = $mixerState?.config?.presetId === 'XR18';
    
    if (id.startsWith("in_")) {
      const num = parseInt(id.replace("in_", ""), 10);
      if (!Number.isFinite(num) || num < 1) return null;
      return `/ch/${String(num).padStart(2, "0")}`;
    }
    if (id.startsWith("bus_")) {
      const num = parseInt(id.replace("bus_", ""), 10);
      if (!Number.isFinite(num) || num < 1) return null;
      // XR18 uses non-padded bus indices
      return isXR ? `/bus/${num}` : `/bus/${String(num).padStart(2, "0")}`;
    }

    return null;
  }

  function getHeadampPath(id, param) {
    if (!id.startsWith("in_")) return null;
    const num = parseInt(id.replace("in_", ""), 10);
    if (!Number.isFinite(num) || num < 1 || num > 16) return null;
    return `/headamp/${String(num).padStart(2, "0")}/${param}`;
  }

  function readCacheNumber(cache, address, fallback) {
    if (!cache) return fallback;
    const v = cache[address];
    if (v === undefined || v === null) return fallback;
    const raw = Array.isArray(v) ? v[0] : v;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  // Hydrate params once per channelId open.
  $: if (channelId && channelId !== hydratedFor) {
    hydratedFor = channelId;
    const prefix = oscPrefixFromChannelId(channelId);
    const cache = $mixerState?.flatOscCache || {};

    if (prefix) {
    if (prefix) {
      const outNorm = readCacheNumber(
        cache,
        `${prefix}/mix/fader`,
        dbToFader(params.outLevel),
      );

      const headampGainPath = getHeadampPath(channelId, 'gain');
      const headampPhantomPath = getHeadampPath(channelId, 'phantom');

      params = {
        ...params,
        gain: headampGainPath 
          ? readCacheNumber(cache, headampGainPath, params.gain)
          : readCacheNumber(cache, `${prefix}/preamp/gain`, params.gain),
        phantom: headampPhantomPath
          ? readCacheNumber(cache, headampPhantomPath, params.phantom ? 1 : 0) === 1
          : params.phantom,
        gateThresh: readCacheNumber(cache, `${prefix}/gate/thr`, params.gateThresh),
        // ... rest of params ...
        gateRange: readCacheNumber(cache, `${prefix}/gate/range`, params.gateRange),
        // These may not exist on the mixer in the current profile; defaults are preserved.
        gateAttack: readCacheNumber(cache, `${prefix}/gate/att`, params.gateAttack),
        gateHold: readCacheNumber(cache, `${prefix}/gate/hold`, params.gateHold),
        gateRel: readCacheNumber(cache, `${prefix}/gate/rel`, params.gateRel),
        compThresh: readCacheNumber(cache, `${prefix}/dyn/thr`, params.compThresh),
        compRatio: readCacheNumber(cache, `${prefix}/dyn/ratio`, params.compRatio),
        compAttack: readCacheNumber(cache, `${prefix}/dyn/att`, params.compAttack),
        compRelease: readCacheNumber(cache, `${prefix}/dyn/rel`, params.compRelease),
        compMakeup: readCacheNumber(cache, `${prefix}/dyn/makeup`, params.compMakeup),
        hpfOn: readCacheNumber(cache, `${prefix}/preamp/hpf`, params.hpfOn) === 1,
        hpfFreq: readCacheNumber(cache, `${prefix}/preamp/hpf/freq`, params.hpfFreq),
        gateScFreq: readCacheNumber(cache, `${prefix}/gate/filter/f`, params.gateScFreq),
        gateScType: readCacheNumber(cache, `${prefix}/gate/filter/t`, params.gateScType),
        compScType: readCacheNumber(cache, `${prefix}/dyn/filter/t`, params.compScType),
        outLevel: faderToDb(outNorm),
        mainOut: readCacheNumber(cache, `${prefix}/mix/lr`, params.mainOut ? 1 : 0) === 1,
      };
    }
  }

  function sendOscForGate() {
    const prefix = oscPrefixFromChannelId(channelId);
    if (!prefix) return;
    setOsc(`${prefix}/gate/thr`, params.gateThresh);
    setOsc(`${prefix}/gate/range`, params.gateRange);
    setOsc(`${prefix}/gate/att`, params.gateAttack);
    setOsc(`${prefix}/gate/hold`, params.gateHold);
    setOsc(`${prefix}/gate/rel`, params.gateRel);
  }

  function sendOscForComp() {
    const prefix = oscPrefixFromChannelId(channelId);
    if (!prefix) return;
    setOsc(`${prefix}/dyn/thr`, params.compThresh);
    setOsc(`${prefix}/dyn/ratio`, params.compRatio);
    setOsc(`${prefix}/dyn/att`, params.compAttack);
    setOsc(`${prefix}/dyn/rel`, params.compRelease);
    setOsc(`${prefix}/dyn/makeup`, params.compMakeup);
    setOsc(`${prefix}/dyn/filter/f`, params.compScFreq);
    setOsc(`${prefix}/dyn/filter/t`, params.compScType);
  }

  function sendOscForPreamp() {
    const prefix = oscPrefixFromChannelId(channelId);
    if (!prefix) return;

    const headampGainPath = getHeadampPath(channelId, 'gain');
    const headampPhantomPath = getHeadampPath(channelId, 'phantom');

    if (headampGainPath) {
      setOsc(headampGainPath, params.gain);
    } else {
      setOsc(`${prefix}/preamp/gain`, params.gain);
    }

    if (headampPhantomPath) {
      setOsc(headampPhantomPath, params.phantom ? 1 : 0);
    }

    // X-Air specific HPF addresses
    setOsc(`${prefix}/preamp/hpon`, params.hpfOn ? 1 : 0);
    setOsc(`${prefix}/preamp/hpf`, params.hpfFreq);
  }

  function sendOscForOutput() {
    const prefix = oscPrefixFromChannelId(channelId);
    if (!prefix) return;
    setOsc(`${prefix}/mix/fader`, dbToFader(params.outLevel));
    setOsc(`${prefix}/mix/lr`, params.mainOut ? 1 : 0);
  }

  // Keep outPan purely visual for now (OSC mapping is not present elsewhere in the repo).
</script>

<div class="modal-backdrop fade-in" on:click={close}>
  <div class="modal-content" on:click|stopPropagation>
    <div class="modal-header">
      <div class="header-left">
        {#if scribbles[channelId]}
          <div class="header-icon-box">
             <img src="/icons-bmp/{scribbles[channelId].iconType || 'icon_01'}.bmp" alt="" />
          </div>
        {/if}
        <div class="header-text">
          <h2 class="modal-title">{channelName || channelId.toUpperCase()}</h2>
          <div class="modal-status-line">
            <span class="badge">{activeSection.toUpperCase()}</span>
            <span class="direct-ctrl">Direct Parameter Control</span>
          </div>
        </div>
      </div>
      
      <div class="header-center">
        <div class="header-nav">
          <button class="nav-tab" class:active={activeSection === 'preamp'} on:click={() => activeSection = 'preamp'}><Mic size={14}/> Preamp</button>
          <button class="nav-tab" class:active={activeSection === 'gate'} on:click={() => activeSection = 'gate'}><AudioWaveform size={14}/> Gate</button>
          <button class="nav-tab" class:active={activeSection === 'compressor'} on:click={() => activeSection = 'compressor'}><Zap size={14}/> Comp</button>
          <button class="nav-tab" class:active={activeSection === 'output'} on:click={() => activeSection = 'output'}><Volume2 size={14}/> Output</button>
        </div>
      </div>

      <div class="header-right">
        <button class="close-btn" on:click={close}><X size={20} /></button>
      </div>
    </div>
    
    <div class="modal-body">
      {#if activeSection === 'preamp'}
        <div class="x32-panel">
            <div class="x32-top-graphs">
                <div class="x32-graph-box wide">
                    <div class="graph-title">Preamp Frequency Response</div>
                    <div class="preamp-curve-view">
                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="preamp-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="rgba(239, 68, 68, 0.2)" />
                                    <stop offset="100%" stop-color="transparent" />
                                </linearGradient>
                            </defs>
                            <!-- Grid lines -->
                            <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" stroke-width="0.5" />
                            <line x1="20" y1="0" x2="20" y2="100" stroke="#1e293b" stroke-width="0.5" />
                            <line x1="50" y1="0" x2="50" y2="100" stroke="#1e293b" stroke-width="0.5" />
                            <line x1="80" y1="0" x2="80" y2="100" stroke="#1e293b" stroke-width="0.5" />
                            
                            <!-- HPF Curve -->
                            {#if params.hpfOn}
                                <path 
                                    d="M 0 100 Q { (params.hpfFreq/400) * 100 } 100, { (params.hpfFreq/400) * 100 + 10 } 50 L 100 50 L 100 100 Z" 
                                    fill="url(#preamp-grad)" 
                                />
                                <path 
                                    d="M 0 100 Q { (params.hpfFreq/400) * 100 } 100, { (params.hpfFreq/400) * 100 + 10 } 50 L 100 50" 
                                    fill="none" 
                                    stroke="#ef4444" 
                                    stroke-width="2" 
                                />
                            {:else}
                                <rect x="0" y="50" width="100" height="50" fill="url(#preamp-grad)" />
                                <line x1="0" y1="50" x2="100" y2="50" stroke="#ef4444" stroke-width="2" />
                            {/if}
                        </svg>
                    </div>
                </div>
            </div>
            <div class="x32-bottom-faders preamp-faders">
                <div class="fader-group">
                   <input
                     type="number"
                     class="v-slider-val"
                     bind:value={params.gain}
                     on:change={() => sendOscForPreamp()}
                     min="0"
                     max="60"
                     step="0.5"
                   />
                   <div class="v-slider-wrapper">
                     <input
                       type="range"
                       class="v-slider red-thumb"
                       min="0"
                       max="60"
                       step="0.5"
                       bind:value={params.gain}
                       on:input={() => sendOscForPreamp()}
                     />
                   </div>
                   <div class="v-slider-lbl">GAIN</div>
                </div>
                <div class="fader-group">
                   <input
                     type="number"
                     class="v-slider-val"
                     class:inactive={!params.hpfOn}
                     bind:value={params.hpfFreq}
                     on:change={() => sendOscForPreamp()}
                     min="20"
                     max="400"
                   />
                   <div class="v-slider-wrapper">
                     <input
                       type="range"
                       class="v-slider red-thumb"
                       min="20"
                       max="400"
                       bind:value={params.hpfFreq}
                       disabled={!params.hpfOn}
                       on:input={() => sendOscForPreamp()}
                     />
                   </div>
                   <div class="v-slider-lbl">HPF FREQ</div>
                </div>
                <div class="fader-group push-right">
                   <button class="btn-toggle red-glow" class:active={params.hpfOn} on:click={() => {params.hpfOn = !params.hpfOn; sendOscForPreamp(); }}>HPF <br/> {params.hpfOn ? 'ON' : 'OFF'}</button>
                   <button class="btn-toggle red-glow" class:active={params.phantom} on:click={() => {params.phantom = !params.phantom; /* Phantom/Phase logic normally global/backend */ }}>48V <br/> PHAN</button>
                   <button class="btn-toggle red-glow" class:active={params.phase} on:click={() => params.phase = !params.phase}>Ø <br/> PHASE</button>
                </div>
            </div>
        </div>

      {:else if activeSection === 'gate'}
        <div class="x32-panel">
            <GateGraph
              gateThresh={params.gateThresh}
              gateRange={params.gateRange}
              gateAttack={params.gateAttack}
              gateHold={params.gateHold}
              gateRel={params.gateRel}
              gateScFreq={params.gateScFreq}
              gateScType={params.gateScType}
            />
            <div class="x32-bottom-faders">
                <div class="fader-section">
                    <div class="fader-group">
                      <input type="number" class="v-slider-val" bind:value={params.gateThresh} on:change={() => sendOscForGate()} min="-80" max="0" />
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider blue-thumb"
                          min="-80"
                          max="0"
                          bind:value={params.gateThresh}
                          on:input={() => sendOscForGate()}
                        />
                      </div>
                      <div class="v-slider-lbl">THR</div>
                    </div>
                    <div class="fader-group">
                      <input type="number" class="v-slider-val" bind:value={params.gateRange} on:change={() => sendOscForGate()} min="0" max="60" />
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider blue-thumb"
                          min="0"
                          max="60"
                          bind:value={params.gateRange}
                          on:input={() => sendOscForGate()}
                        />
                      </div>
                      <div class="v-slider-lbl">RANGE</div>
                    </div>
                </div>
                <div class="fader-section">
                    <div class="fader-group">
                      <input type="number" class="v-slider-val" bind:value={params.gateAttack} on:change={() => sendOscForGate()} min="0" max="120" />
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider blue-thumb"
                          min="0"
                          max="120"
                          bind:value={params.gateAttack}
                          on:input={() => sendOscForGate()}
                        />
                      </div>
                      <div class="v-slider-lbl">ATTACK</div>
                    </div>
                    <div class="fader-group">
                      <input type="number" class="v-slider-val" bind:value={params.gateHold} on:change={() => sendOscForGate()} min="0" max="500" />
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider blue-thumb"
                          min="0"
                          max="500"
                          bind:value={params.gateHold}
                          on:input={() => sendOscForGate()}
                        />
                      </div>
                      <div class="v-slider-lbl">HOLD</div>
                    </div>
                    <div class="fader-group">
                      <input type="number" class="v-slider-val" bind:value={params.gateRel} on:change={() => sendOscForGate()} min="5" max="500" />
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider blue-thumb"
                          min="5"
                          max="500"
                          bind:value={params.gateRel}
                          on:input={() => sendOscForGate()}
                        />
                      </div>
                      <div class="v-slider-lbl">REL</div>
                    </div>
                </div>
                <div class="fader-section sidechain-section">
                    <div class="fader-group">
                      <div style="display:flex; align-items:center; gap:0.25rem;">
                        <input type="number" class="v-slider-val" bind:value={params.gateScFreq} on:change={() => sendOscForGate()} min="20" max="20000" />
                        <span style="font-size:0.6rem; color:#64748b; font-weight:800;">Hz</span>
                      </div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider blue-thumb"
                          min="20"
                          max="20000"
                          bind:value={params.gateScFreq}
                          on:input={() => sendOscForGate()}
                        />
                      </div>
                      <div class="v-slider-lbl">SC FILT</div>
                    </div>
                    <div class="fader-group">
                       <button class="btn-toggle blue-glow mini" on:click={() => { params.gateScType = (params.gateScType + 1) % 3; sendOscForGate(); }}>
                          TYPE <br/> {['2-POLE', 'LC', 'HC'][params.gateScType]}
                       </button>
                    </div>
                </div>
            </div>
        </div>

      {:else if activeSection === 'compressor'}
        <div class="x32-panel">
            <CompressionGraph
              compThresh={params.compThresh}
              compRatio={params.compRatio}
              compAttack={params.compAttack}
              compRelease={params.compRelease}
              compMakeup={params.compMakeup}
              compScFreq={params.compScFreq}
              compScType={params.compScType}
            />
            <div class="x32-bottom-faders">
                <div class="fader-section">
                    <div class="fader-group">
                      <input type="number" class="v-slider-val" bind:value={params.compThresh} on:change={() => sendOscForComp()} min="-60" max="0" />
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider green-thumb"
                          min="-60"
                          max="0"
                          bind:value={params.compThresh}
                          on:input={() => sendOscForComp()}
                        />
                      </div>
                      <div class="v-slider-lbl">THR</div>
                    </div>
                    <div class="fader-group">
                      <input type="number" class="v-slider-val" bind:value={params.compRatio} on:change={() => sendOscForComp()} min="1" max="20" step="0.1" />
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider green-thumb"
                          min="1"
                          max="20"
                          step="0.1"
                          bind:value={params.compRatio}
                          on:input={() => sendOscForComp()}
                        />
                      </div>
                      <div class="v-slider-lbl">RATIO</div>
                    </div>
                    <div class="fader-group">
                      <input type="number" class="v-slider-val" bind:value={params.compMakeup} on:change={() => sendOscForComp()} min="0" max="24" step="0.5" />
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider green-thumb"
                          min="0"
                          max="24"
                          step="0.5"
                          bind:value={params.compMakeup}
                          on:input={() => sendOscForComp()}
                        />
                      </div>
                      <div class="v-slider-lbl">MAKEUP</div>
                    </div>
                </div>
                <div class="fader-section">
                    <div class="fader-group">
                      <input type="number" class="v-slider-val" bind:value={params.compAttack} on:change={() => sendOscForComp()} min="0" max="100" />
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider green-thumb"
                          min="0"
                          max="100"
                          bind:value={params.compAttack}
                          on:input={() => sendOscForComp()}
                        />
                      </div>
                      <div class="v-slider-lbl">ATTACK</div>
                    </div>
                    <div class="fader-group">
                      <input type="number" class="v-slider-val" bind:value={params.compRelease} on:change={() => sendOscForComp()} min="5" max="500" />
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider green-thumb"
                          min="5"
                          max="500"
                          bind:value={params.compRelease}
                          on:input={() => sendOscForComp()}
                        />
                      </div>
                      <div class="v-slider-lbl">REL</div>
                    </div>
                </div>
                <div class="fader-section sidechain-section">
                    <div class="fader-group">
                      <div style="display:flex; align-items:center; gap:0.25rem;">
                        <input type="number" class="v-slider-val" bind:value={params.compScFreq} on:change={() => sendOscForComp()} min="20" max="20000" />
                        <span style="font-size:0.6rem; color:#64748b; font-weight:800;">Hz</span>
                      </div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider green-thumb"
                          min="20"
                          max="20000"
                          bind:value={params.compScFreq}
                          on:input={() => sendOscForComp()}
                        />
                      </div>
                      <div class="v-slider-lbl">SC FILT</div>
                    </div>
                    <div class="fader-group">
                       <button class="btn-toggle green-glow mini" on:click={() => { params.compScType = (params.compScType + 1) % 3; sendOscForComp(); }}>
                          TYPE <br/> {['2-POLE', 'LC', 'HC'][params.compScType]}
                       </button>
                    </div>
                </div>
            </div>
        </div>

      {:else if activeSection === 'output'}
        <div class="x32-panel">
            <div class="x32-top-graphs">
                <div class="x32-graph-box wide">
                    <div class="graph-title">Main Out Assignment</div>
                    <div class="routing-visual-flex">
                        <div class="bus-node" class:active={params.mainOut}>L/R</div>
                        <div class="bus-path" class:active={params.mainOut}></div>
                        <div class="bus-node master">Σ</div>
                    </div>
                </div>
            </div>
            <div class="x32-bottom-faders">
                <div class="fader-section">
                    <div class="fader-group">
                      <input type="number" class="v-slider-val" bind:value={params.outPan} min="-100" max="100" />
                      <div class="v-slider-wrapper">
                        <input type="range" class="v-slider gray-thumb" min="-100" max="100" bind:value={params.outPan} />
                      </div>
                      <div class="v-slider-lbl">PAN</div>
                    </div>
                    <div class="fader-group">
                      <div style="display:flex; align-items:center; gap:0.25rem;">
                        <input
                          type="number"
                          class="v-slider-val"
                          min="-90"
                          max="10"
                          step="0.5"
                          bind:value={params.outLevel}
                          on:change={() => sendOscForOutput()}
                        />
                        <span style="font-size:0.6rem; color:#64748b; font-weight:800;">dB</span>
                      </div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider gray-thumb"
                          min="-90"
                          max="10"
                          step="0.5"
                          bind:value={params.outLevel}
                          on:input={() => sendOscForOutput()}
                        />
                      </div>
                      <div class="v-slider-lbl">LVL</div>
                    </div>
                </div>
                <div class="fader-section">
                    <div class="fader-group">
                        <button class="btn-toggle gray-glow" class:active={params.mainOut} on:click={() => { params.mainOut = !params.mainOut; dispatch('toggleMainOut'); sendOscForOutput(); }}>
                            MAIN L/R <br/> {params.mainOut ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
  .modal-content { background: #0b1120; border: 1px solid #1e293b; border-radius: 12px; width: 95%; max-width: 900px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); overflow: hidden; display: flex; flex-direction: column; }
  
  .modal-header { padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; background: #0f172a; gap: 1rem; }
  .header-left { display: flex; align-items: center; gap: 1rem; min-width: 250px; }
  .header-center { flex: 1; display: flex; justify-content: center; }
  .header-right { min-width: 40px; display: flex; justify-content: flex-end; }

  .header-text { display: flex; flex-direction: column; gap: 0.15rem; }
  .modal-title { margin: 0; color: #f8fafc; font-size: 1.25rem; letter-spacing: -0.5px; font-weight: 700; line-height: 1.1; }
  .modal-status-line { display: flex; align-items: center; gap: 0.5rem; opacity: 0.9; }
  
  .badge { font-size: 0.55rem; background: #3b82f6; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 800; text-transform: uppercase; color: white; box-shadow: 0 0 8px rgba(59, 130, 246, 0.2); line-height: 1; }
  .direct-ctrl { color: #64748b; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  
  .header-nav { display: flex; gap: 0.25rem; background: rgba(0,0,0,0.3); padding: 0.25rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
  .nav-tab { background: transparent; border: none; color: #94a3b8; padding: 0.35rem 0.65rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 600; transition: 0.2s; white-space: nowrap; }
  .nav-tab:hover { color: #f8fafc; background: rgba(255,255,255,0.05); }
  .nav-tab.active { background: #1e293b; color: #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 1px solid rgba(59, 130, 246, 0.2); }
  
  .close-btn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); color: #64748b; cursor: pointer; transition: 0.2s; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
  .close-btn:hover { color: #f8fafc; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1); }
  
  .modal-body { height: 500px; display: flex; flex-direction: column; background: #020617; }
  
  .x32-panel { display: flex; flex-direction: column; height: 100%; }
  .x32-top-graphs { display: flex; gap: 1rem; padding: 1rem; height: 180px; flex-shrink: 0; }
  .x32-graph-box { flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; }
  .x32-graph-box.wide { flex: 1; }
  .graph-title { background: #1e293b; color: #cbd5e1; font-size: 0.7rem; font-weight: 600; padding: 0.3rem 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #334155; }
  .graph-placeholder { flex: 1; position: relative; }
  .flex-center { display: flex; justify-content: center; align-items: center; }
  .graph-watermark { color: #334155; font-size: 1.5rem; font-weight: 800; letter-spacing: 0.1em; opacity: 0.3; }
  
  .x32-bottom-faders { flex: 1; background: linear-gradient(180deg, #09090b 0%, #18181b 100%); display: flex; padding: 1rem 0.5rem; justify-content: center; align-items: flex-end; gap: 1rem; border-top: 1px solid #27272a; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
  .x32-bottom-faders::-webkit-scrollbar { display: none; }
  .preamp-faders { justify-content: center; }
  .push-right { margin-left: 1.5rem; align-items: flex-start !important; gap: 1rem !important; flex-direction: row !important; height: 100%; padding-top: 1rem; }
  
  .fader-section { display: flex; gap: 1rem; background: rgba(30,41,59,0.2); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
  .fader-group { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; min-width: 60px; }
  
  .v-slider-val { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #f8fafc; background: #0f172a; padding: 0.2rem 0.4rem; border-radius: 4px; border: 1px solid #1e293b; min-width: 48px; text-align: center; outline: none; transition: 0.2s; -moz-appearance: textfield; }
  .v-slider-val::-webkit-outer-spin-button, .v-slider-val::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .v-slider-val:focus { background: #1e293b; border-color: #3b82f6; box-shadow: 0 0 8px rgba(59, 130, 246, 0.3); }
  .v-slider-lbl { font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
  
  .v-slider-wrapper { height: 110px; display: flex; align-items: center; justify-content: center; }
  .v-slider { -webkit-appearance: none; appearance: none; width: 100px; height: 8px; background: #000; border-radius: 4px; outline: none; transform: rotate(-90deg); margin: 0; box-shadow: inset 0 1px 3px rgba(0,0,0,0.8); border: 1px solid #1e293b; }
  
  .v-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 36px; height: 16px; border-radius: 3px; cursor: pointer; border: 1px solid #000; }
  
  /* Thumb Color Themes matching X32 */
  .red-thumb::-webkit-slider-thumb { background: linear-gradient(0deg, #b91c1c 0%, #ef4444 100%); box-shadow: 0 4px 8px rgba(239,68,68,0.2), inset 0 2px 0 rgba(255,255,255,0.3); }
  .blue-thumb::-webkit-slider-thumb { background: linear-gradient(0deg, #0369a1 0%, #38bdf8 100%); box-shadow: 0 4px 8px rgba(56,189,248,0.2), inset 0 2px 0 rgba(255,255,255,0.3); }
  .green-thumb::-webkit-slider-thumb { background: linear-gradient(0deg, #047857 0%, #10b981 100%); box-shadow: 0 4px 8px rgba(16,185,129,0.2), inset 0 2px 0 rgba(255,255,255,0.3); }
  .gray-thumb::-webkit-slider-thumb { background: linear-gradient(0deg, #475569 0%, #94a3b8 100%); box-shadow: 0 4px 8px rgba(148,163,184,0.2), inset 0 2px 0 rgba(255,255,255,0.3); }
  
  .btn-toggle { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 1rem; border-radius: 8px; font-weight: 700; font-size: 0.8rem; line-height: 1.4; cursor: pointer; transition: 0.2s; min-width: 80px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
  .btn-toggle:hover { background: #334155; color: #f8fafc; }
  .btn-toggle.active.red-glow { background: #ef4444; color: white; border-color: #fca5a5; box-shadow: 0 0 15px rgba(239,68,68,0.4), inset 0 2px 4px rgba(255,255,255,0.2); }
  
  .preamp-curve-view { flex: 1; padding: 0.5rem; position: relative; }
  .inactive { opacity: 0.4; }
  
  .sidechain-section { gap: 1rem; border-color: rgba(59, 130, 246, 0.1); }
  .btn-toggle.mini { padding: 0.4rem 0.6rem; font-size: 0.65rem; min-width: 60px; height: auto; }
  .blue-glow.active { background: #3b82f6; color: white; border-color: #60a5fa; box-shadow: 0 0 10px rgba(59,130,246,0.3); }
  .green-glow.active { background: #10b981; color: white; border-color: #34d399; box-shadow: 0 0 10px rgba(16,185,129,0.3); }
  .gray-glow.active { background: #475569; color: white; border-color: #94a3b8; box-shadow: 0 0 10px rgba(148,163,184,0.3); }

  .routing-visual-flex { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; }
  .bus-node { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #1e293b; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; color: #475569; transition: 0.3s; }
  .bus-node.active { border-color: #3b82f6; color: #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); }
  .bus-node.master { border-color: #f59e0b; color: #f59e0b; font-size: 1.2rem; }
  .bus-path { width: 60px; height: 2px; background: #1e293b; transition: 0.3s; position: relative; }
  .bus-path.active { background: #3b82f6; box-shadow: 0 0 8px rgba(59, 130, 246, 0.4); }
  .bus-path.active::after { content: ''; position: absolute; right: 0; top: -3px; border-left: 6px solid #3b82f6; border-top: 4px solid transparent; border-bottom: 4px solid transparent; }
  
  .fade-in { animation: fadeIn 0.15s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: scale(0.98) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
</style>