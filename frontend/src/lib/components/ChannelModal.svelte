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
    outPan: 0,
    outLevel: 0,
  };

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
    if (id.startsWith("in_")) {
      const num = parseInt(id.replace("in_", ""), 10);
      if (!Number.isFinite(num) || num < 1) return null;
      return `/ch/${String(num).padStart(2, "0")}`;
    }

    // The ChannelModal is only wired for input-channel gate/comp editing.
    // If an out_* id ever reaches this component, we fall back to an undefined prefix.
    return null;
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
      const outNorm = readCacheNumber(
        cache,
        `${prefix}/mix/fader`,
        dbToFader(params.outLevel),
      );

      params = {
        ...params,
        gain: readCacheNumber(cache, `${prefix}/preamp/gain`, params.gain),
        gateThresh: readCacheNumber(cache, `${prefix}/gate/thr`, params.gateThresh),
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
        outLevel: faderToDb(outNorm),
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
  }

  function sendOscForPreamp() {
    const prefix = oscPrefixFromChannelId(channelId);
    if (!prefix) return;
    setOsc(`${prefix}/preamp/gain`, params.gain);
  }

  function sendOscForOutputLevel() {
    const prefix = oscPrefixFromChannelId(channelId);
    if (!prefix) return;
    setOsc(`${prefix}/mix/fader`, dbToFader(params.outLevel));
  }

  // Keep outPan purely visual for now (OSC mapping is not present elsewhere in the repo).
</script>

<div class="modal-backdrop fade-in" on:click={close}>
  <div class="modal-content" on:click|stopPropagation>
    <div class="modal-header">
      <div class="header-info">
        {#if scribbles[channelId]}
          <div class="header-icon-box">
             <img src="/icons-bmp/{scribbles[channelId].iconType || 'icon_01'}.bmp" alt="" />
          </div>
        {/if}
        <div class="header-text">
          <div class="title-row">
            <h2 class="modal-title">{channelName || channelId.toUpperCase()}</h2>
            <span class="badge">{activeSection.toUpperCase()}</span>
          </div>
          <div class="modal-subtitle">Direct Parameter Control</div>
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; width: 30%;">
        <button class="nav-tab" class:active={activeSection === 'preamp'} on:click={() => activeSection = 'preamp'}><Mic size={16}/> Preamp</button>
        <button class="nav-tab" class:active={activeSection === 'gate'} on:click={() => activeSection = 'gate'}><AudioWaveform size={16}/> Gate</button>
        <button class="nav-tab" class:active={activeSection === 'compressor'} on:click={() => activeSection = 'compressor'}><Zap size={16}/> Comp</button>
        <button class="nav-tab" class:active={activeSection === 'output'} on:click={() => activeSection = 'output'}><Volume2 size={16}/> Output</button>
      </div>
      <button class="close-btn" on:click={close}><X size={24} /></button>
    </div>
    
    <div class="modal-body">
      {#if activeSection === 'preamp'}
        <div class="x32-panel">
            <div class="x32-top-graphs">
                <div class="x32-graph-box wide">
                    <div class="graph-title">Preamp Frequency Response</div>
                    <div class="graph-placeholder flex-center"><span class="graph-watermark">PREAMP CURVE</span></div>
                </div>
            </div>
            <div class="x32-bottom-faders preamp-faders">
                <div class="fader-group">
                   <div class="v-slider-val">{params.gain} dB</div>
                   <div class="v-slider-wrapper">
                     <input
                       type="range"
                       class="v-slider red-thumb"
                       min="0"
                       max="60"
                       value={params.gain}
                       on:input={(e) => { params.gain = Number(e.currentTarget.value); sendOscForPreamp(); }}
                     />
                   </div>
                   <div class="v-slider-lbl">GAIN</div>
                </div>
                <div class="fader-group push-right">
                   <button class="btn-toggle red-glow" class:active={params.phantom} on:click={() => params.phantom = !params.phantom}>48V <br/> PHANTOM</button>
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
            />
            <div class="x32-bottom-faders">
                <div class="fader-section">
                    <div class="fader-group">
                      <div class="v-slider-val">{params.gateThresh}</div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider blue-thumb"
                          min="-80"
                          max="0"
                          value={params.gateThresh}
                          on:input={(e) => { params.gateThresh = Number(e.currentTarget.value); sendOscForGate(); }}
                        />
                      </div>
                      <div class="v-slider-lbl">THR</div>
                    </div>
                    <div class="fader-group">
                      <div class="v-slider-val">{params.gateRange}</div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider blue-thumb"
                          min="0"
                          max="60"
                          value={params.gateRange}
                          on:input={(e) => { params.gateRange = Number(e.currentTarget.value); sendOscForGate(); }}
                        />
                      </div>
                      <div class="v-slider-lbl">RANGE</div>
                    </div>
                </div>
                <div class="fader-section">
                    <div class="fader-group">
                      <div class="v-slider-val">{params.gateAttack}</div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider blue-thumb"
                          min="0"
                          max="120"
                          value={params.gateAttack}
                          on:input={(e) => { params.gateAttack = Number(e.currentTarget.value); sendOscForGate(); }}
                        />
                      </div>
                      <div class="v-slider-lbl">ATTACK</div>
                    </div>
                    <div class="fader-group">
                      <div class="v-slider-val">{params.gateHold}</div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider blue-thumb"
                          min="0"
                          max="500"
                          value={params.gateHold}
                          on:input={(e) => { params.gateHold = Number(e.currentTarget.value); sendOscForGate(); }}
                        />
                      </div>
                      <div class="v-slider-lbl">HOLD</div>
                    </div>
                    <div class="fader-group">
                      <div class="v-slider-val">{params.gateRel}</div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider blue-thumb"
                          min="5"
                          max="500"
                          value={params.gateRel}
                          on:input={(e) => { params.gateRel = Number(e.currentTarget.value); sendOscForGate(); }}
                        />
                      </div>
                      <div class="v-slider-lbl">RELEASE</div>
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
            />
            <div class="x32-bottom-faders">
                <div class="fader-section">
                    <div class="fader-group">
                      <div class="v-slider-val">{params.compThresh}</div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider green-thumb"
                          min="-60"
                          max="0"
                          value={params.compThresh}
                          on:input={(e) => { params.compThresh = Number(e.currentTarget.value); sendOscForComp(); }}
                        />
                      </div>
                      <div class="v-slider-lbl">THR</div>
                    </div>
                    <div class="fader-group">
                      <div class="v-slider-val">{params.compRatio}</div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider green-thumb"
                          min="1"
                          max="20"
                          value={params.compRatio}
                          on:input={(e) => { params.compRatio = Number(e.currentTarget.value); sendOscForComp(); }}
                        />
                      </div>
                      <div class="v-slider-lbl">RATIO</div>
                    </div>
                    <div class="fader-group">
                      <div class="v-slider-val">{params.compMakeup}</div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider green-thumb"
                          min="0"
                          max="24"
                          value={params.compMakeup}
                          on:input={(e) => { params.compMakeup = Number(e.currentTarget.value); sendOscForComp(); }}
                        />
                      </div>
                      <div class="v-slider-lbl">MAKEUP</div>
                    </div>
                </div>
                <div class="fader-section">
                    <div class="fader-group">
                      <div class="v-slider-val">{params.compAttack}</div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider green-thumb"
                          min="0"
                          max="100"
                          value={params.compAttack}
                          on:input={(e) => { params.compAttack = Number(e.currentTarget.value); sendOscForComp(); }}
                        />
                      </div>
                      <div class="v-slider-lbl">ATTACK</div>
                    </div>
                    <div class="fader-group">
                      <div class="v-slider-val">{params.compRelease}</div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider green-thumb"
                          min="5"
                          max="500"
                          value={params.compRelease}
                          on:input={(e) => { params.compRelease = Number(e.currentTarget.value); sendOscForComp(); }}
                        />
                      </div>
                      <div class="v-slider-lbl">RELEASE</div>
                    </div>
                </div>
            </div>
        </div>

      {:else if activeSection === 'output'}
        <div class="x32-panel">
            <div class="x32-top-graphs">
                <div class="x32-graph-box wide">
                    <div class="graph-title">Main Out Assignment</div>
                    <div class="graph-placeholder flex-center"><span class="graph-watermark">L/R ROUTING</span></div>
                </div>
            </div>
            <div class="x32-bottom-faders">
                <div class="fader-section">
                    <div class="fader-group">
                      <div class="v-slider-val">{params.outPan === 0 ? 'C' : params.outPan}</div>
                      <div class="v-slider-wrapper">
                        <input type="range" class="v-slider gray-thumb" min="-100" max="100" bind:value={params.outPan} />
                      </div>
                      <div class="v-slider-lbl">PAN</div>
                    </div>
                    <div class="fader-group">
                      <div class="v-slider-val">{params.outLevel} dB</div>
                      <div class="v-slider-wrapper">
                        <input
                          type="range"
                          class="v-slider gray-thumb"
                          min="-90"
                          max="10"
                          value={params.outLevel}
                          on:input={(e) => { params.outLevel = Number(e.currentTarget.value); sendOscForOutputLevel(); }}
                        />
                      </div>
                      <div class="v-slider-lbl">POST LVL</div>
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
  
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #1e293b; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); }
  .header-info { display: flex; gap: 1rem; align-items: center; min-width: 0; flex: 1; }
  .header-icon-box { flex-shrink: 0; }
  .header-icon-box img { width: 44px; height: 44px; border-radius: 6px; border: 2px solid #334155; object-fit: contain; image-rendering: pixelated; }
  .header-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .title-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: nowrap; overflow: hidden; }
  .modal-title { margin: 0; color: #f8fafc; font-size: 1.5rem; letter-spacing: -0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .badge { font-size: 0.6rem; background: #3b82f6; padding: 0.2rem 0.6rem; border-radius: 4px; letter-spacing: 1px; font-weight: 800; flex-shrink: 0; text-transform: uppercase; color: white; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3); }
  .modal-subtitle { color: #94a3b8; font-size: 0.75rem; margin-top: -2px; }
  
  .nav-tab { background: rgba(255,255,255,0.05); border: 1px solid transparent; color: #94a3b8; padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 600; transition: 0.2s; }
  .nav-tab:hover { background: rgba(255,255,255,0.1); color: #f8fafc; }
  .nav-tab.active { background: #1e293b; border-color: #3b82f6; color: #3b82f6; }
  
  .close-btn { background: transparent; border: none; color: #64748b; cursor: pointer; transition: 0.2s; padding: 0.5rem; margin-top: -1.5rem; margin-right: -0.5rem; border-radius: 50%; align-self: flex-start; }
  .close-btn:hover { color: #f8fafc; }
  
  .modal-body { height: 500px; display: flex; flex-direction: column; background: #020617; }
  
  .x32-panel { display: flex; flex-direction: column; height: 100%; }
  .x32-top-graphs { display: flex; gap: 1rem; padding: 1rem; height: 180px; flex-shrink: 0; }
  .x32-graph-box { flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; }
  .x32-graph-box.wide { flex: 1; }
  .graph-title { background: #1e293b; color: #cbd5e1; font-size: 0.7rem; font-weight: 600; padding: 0.3rem 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #334155; }
  .graph-placeholder { flex: 1; position: relative; }
  .flex-center { display: flex; justify-content: center; align-items: center; }
  .graph-watermark { color: #334155; font-size: 1.5rem; font-weight: 800; letter-spacing: 0.1em; opacity: 0.3; }
  
  .x32-bottom-faders { flex: 1; background: linear-gradient(180deg, #09090b 0%, #18181b 100%); display: flex; padding: 1.5rem 2rem; justify-content: center; align-items: flex-end; gap: 4rem; border-top: 1px solid #27272a; }
  .preamp-faders { justify-content: flex-start; padding-left: 4rem; }
  .push-right { margin-left: 3rem; align-items: flex-start !important; gap: 1rem !important; flex-direction: row !important; height: 100%; padding-top: 2rem; }
  
  .fader-section { display: flex; gap: 1.5rem; background: rgba(30,41,59,0.2); padding: 1rem 1.5rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
  .fader-group { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; min-width: 60px; }
  
  .v-slider-val { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #f8fafc; background: #0f172a; padding: 0.2rem 0.4rem; border-radius: 4px; border: 1px solid #1e293b; min-width: 48px; text-align: center; }
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
  
  .fade-in { animation: fadeIn 0.15s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: scale(0.98) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
</style>