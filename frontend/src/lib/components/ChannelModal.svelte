<script>
  import { createEventDispatcher } from 'svelte';
  import { X, Mic, AudioWaveform, Zap, Volume2 } from 'lucide-svelte';
  import { mixerState, setOsc } from "../socket";
  
  import PreampSection from './ChannelModal/Sections/PreampSection.svelte';
  import GateSection from './ChannelModal/Sections/GateSection.svelte';
  import DynamicsSection from './ChannelModal/Sections/DynamicsSection.svelte';
  import OutputSection from './ChannelModal/Sections/OutputSection.svelte';
  
  export let channelId = '';
  export let channelName = '';
  export let initialSection = 'preamp'; 
  export let scribbles = {};
  export let config = {};
  
  $: isXR = config?.presetId === 'XR18';
  
  const dispatch = createEventDispatcher();
  
  let activeSection = initialSection;
  
  function close() {
    dispatch('close');
  }
  
  // Internal State
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
    mainAssign: true,
    stereoLink: false,
    gateFilterOn: false,
    gateFilterFreq: 100,
    compFilterOn: false,
    compFilterFreq: 100
  };

  function readCacheNumber(cache, address, fallback) {
    if (!cache) return fallback;
    const v = cache[address];
    if (v === undefined || v === null) return fallback;
    const raw = Array.isArray(v) ? v[0] : v;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  // Hydrate params once per channelId open or on cache updates
  $: if (channelId && $mixerState?.flatOscCache) {
    const cache = $mixerState.flatOscCache;
    const num = parseInt(channelId.replace(/\D/g, ''));
    const chStr = String(num).padStart(2, '0');
    const prefix = `/ch/${chStr}`;
    const oddCh = num % 2 === 1 ? num : num - 1;

    params = {
      ...params,
      gain: readCacheNumber(cache, `/headamp/${chStr}/gain`, params.gain),
      phantom: readCacheNumber(cache, `/headamp/${chStr}/phantom`, 0) === 1,
      phase: readCacheNumber(cache, `${prefix}/preamp/phase`, 0) === 1,
      
      gateThresh: readCacheNumber(cache, `${prefix}/gate/thr`, params.gateThresh),
      gateRange: readCacheNumber(cache, `${prefix}/gate/range`, params.gateRange),
      gateAttack: readCacheNumber(cache, `${prefix}/gate/att`, params.gateAttack),
      gateHold: readCacheNumber(cache, `${prefix}/gate/hold`, params.gateHold),
      gateRel: readCacheNumber(cache, `${prefix}/gate/rel`, params.gateRel),
      gateFilterOn: readCacheNumber(cache, `${prefix}/gate/hpon`, 0) === 1,
      gateFilterFreq: readCacheNumber(cache, `${prefix}/gate/hpf`, 100),
      
      compThresh: readCacheNumber(cache, `${prefix}/dyn/thr`, params.compThresh),
      compRatio: readCacheNumber(cache, `${prefix}/dyn/ratio`, params.compRatio),
      compAttack: readCacheNumber(cache, `${prefix}/dyn/att`, params.compAttack),
      compRelease: readCacheNumber(cache, `${prefix}/dyn/rel`, params.compRelease),
      compMakeup: readCacheNumber(cache, `${prefix}/dyn/makeup`, params.compMakeup),
      compFilterOn: readCacheNumber(cache, `${prefix}/dyn/hpon`, 0) === 1,
      compFilterFreq: readCacheNumber(cache, `${prefix}/dyn/hpf`, 100),
      
      outPan: readCacheNumber(cache, `${prefix}/mix/pan`, params.outPan),
      outLevel: readCacheNumber(cache, `${prefix}/mix/fader`, params.outLevel),
      mainAssign: readCacheNumber(cache, `${prefix}/mix/lr`, 1) === 1,
      stereoLink: readCacheNumber(cache, `/config/chlink/${oddCh}`, 0) === 1
    };
  }

  // Helper to get raw channel number for OSC emits
  $: chNum = channelId ? String(parseInt(channelId.replace(/\D/g, ''))).padStart(2, '0') : '01';

  // Receives unified update events from the child sections
  function handleParamUpdate(e) {
    const updatedVals = e.detail;
    params = { ...params, ...updatedVals };
    
    // OSC Emission mapping logic
    let address = "";
    let val = 0;

    if ('gain' in updatedVals) {
      address = `/headamp/${chNum}/gain`;
      val = params.gain;
    } else if ('phantom' in updatedVals) {
      address = `/headamp/${chNum}/phantom`;
      val = params.phantom ? 1 : 0;
    } else if ('phase' in updatedVals) {
      address = `/ch/${chNum}/preamp/phase`;
      val = params.phase ? 1 : 0;
    } else if ('gateThresh' in updatedVals) {
      address = `/ch/${chNum}/gate/thr`;
      val = params.gateThresh;
    } else if ('gateRange' in updatedVals) {
      address = `/ch/${chNum}/gate/range`;
      val = params.gateRange;
    } else if ('gateAttack' in updatedVals) {
      address = `/ch/${chNum}/gate/att`;
      val = params.gateAttack;
    } else if ('gateHold' in updatedVals) {
      address = `/ch/${chNum}/gate/hold`;
      val = params.gateHold;
    } else if ('gateRel' in updatedVals) {
      address = `/ch/${chNum}/gate/rel`;
      val = params.gateRel;
    } else if ('gateFilterOn' in updatedVals) {
      address = `/ch/${chNum}/gate/hpon`;
      val = params.gateFilterOn ? 1 : 0;
    } else if ('gateFilterFreq' in updatedVals) {
      address = `/ch/${chNum}/gate/hpf`;
      val = params.gateFilterFreq;
    } else if ('compThresh' in updatedVals) {
      address = `/ch/${chNum}/dyn/thr`;
      val = params.compThresh;
    } else if ('compRatio' in updatedVals) {
      address = `/ch/${chNum}/dyn/ratio`;
      val = params.compRatio;
    } else if ('compAttack' in updatedVals) {
      address = `/ch/${chNum}/dyn/att`;
      val = params.compAttack;
    } else if ('compRelease' in updatedVals) {
      address = `/ch/${chNum}/dyn/rel`;
      val = params.compRelease;
    } else if ('compMakeup' in updatedVals) {
      address = `/ch/${chNum}/dyn/makeup`;
      val = params.compMakeup;
    } else if ('compFilterOn' in updatedVals) {
      address = `/ch/${chNum}/dyn/hpon`;
      val = params.compFilterOn ? 1 : 0;
    } else if ('compFilterFreq' in updatedVals) {
      address = `/ch/${chNum}/dyn/hpf`;
      val = params.compFilterFreq;
    } else if ('outPan' in updatedVals) {
      address = `/ch/${chNum}/mix/pan`;
      val = params.outPan;
    } else if ('outLevel' in updatedVals) {
      address = `/ch/${chNum}/mix/fader`;
      val = params.outLevel;
    } else if ('mainAssign' in updatedVals) {
      address = `/ch/${chNum}/mix/lr`;
      val = params.mainAssign ? 1 : 0;
    }

    if (address) {
      setOsc(address, val);
      // Optimistic update to store
      mixerState.update(prev => ({
        ...prev,
        flatOscCache: { ...(prev.flatOscCache || {}), [address]: val }
      }));
    }
  }
</script>

<div class="modal-backdrop" on:click|self={close}>
  <div class="modal-container fade-in-up">
    <div class="modal-header">
      <div class="channel-id-badge">
        {#if scribbles[channelId]?.iconType}
          <img src="/icons-bmp/{scribbles[channelId].iconType}.bmp" alt="Icon" class="header-icon" />
        {/if}
        <div class="header-titles">
          <span class="ch-label">{channelId.replace('in_', 'CH ').toUpperCase()}</span>
          <h2 class="ch-name">{channelName || channelId.toUpperCase()}</h2>
        </div>
      </div>
      <button class="close-btn" on:click={close}><X size={24} /></button>
    </div>

    <div class="modal-body">
      <nav class="sidebar-nav">
        <button class="nav-item" class:active={activeSection === 'preamp'} on:click={() => activeSection = 'preamp'}>
          <Mic size={18} /> <span>Preamp</span>
        </button>
        <button class="nav-item" class:active={activeSection === 'gate'} on:click={() => activeSection = 'gate'}>
          <AudioWaveform size={18} /> <span>Gate</span>
        </button>
        <button class="nav-item" class:active={activeSection === 'compressor'} on:click={() => activeSection = 'compressor'}>
          <Zap size={18} /> <span>Dynamics</span>
        </button>
        <button class="nav-item" class:active={activeSection === 'output'} on:click={() => activeSection = 'output'}>
          <Volume2 size={18} /> <span>Output</span>
        </button>
      </nav>

      <div class="content-area">
        {#if activeSection === 'preamp'}
          <PreampSection 
            bind:gain={params.gain} 
            bind:phantom={params.phantom} 
            bind:phase={params.phase} 
            stereoLink={params.stereoLink}
            on:update={handleParamUpdate} 
          />
        {:else if activeSection === 'gate'}
          <GateSection 
            bind:gateThresh={params.gateThresh} 
            bind:gateRange={params.gateRange} 
            bind:gateAttack={params.gateAttack} 
            bind:gateHold={params.gateHold} 
            bind:gateRel={params.gateRel} 
            bind:filterOn={params.gateFilterOn}
            bind:filterFreq={params.gateFilterFreq}
            on:update={handleParamUpdate} 
          />
        {:else if activeSection === 'compressor'}
          <DynamicsSection 
            bind:compThresh={params.compThresh} 
            bind:compRatio={params.compRatio} 
            bind:compAttack={params.compAttack} 
            bind:compRelease={params.compRelease} 
            bind:compMakeup={params.compMakeup} 
            bind:filterOn={params.compFilterOn}
            bind:filterFreq={params.compFilterFreq}
            on:update={handleParamUpdate} 
          />
        {:else if activeSection === 'output'}
          <OutputSection 
            bind:outPan={params.outPan} 
            bind:outLevel={params.outLevel} 
            bind:mainAssign={params.mainAssign} 
            stereoLink={params.stereoLink}
            on:update={handleParamUpdate} 
          />
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);
    display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 1.5rem;
  }
  .modal-container {
    background: #0b0f19; border: 1px solid #1e293b; border-radius: 12px;
    width: 100%; max-width: 900px; height: auto; max-height: 680px;
    display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5);
  }
  .modal-header {
    display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem;
    background: #111827; border-bottom: 1px solid #1e293b; flex-shrink: 0;
  }
  .channel-id-badge { display: flex; align-items: center; gap: 1rem; }
  .header-icon { width: 36px; height: 36px; border-radius: 6px; border: 1px solid #334155; object-fit: contain; background: #020617; }
  .header-titles { display: flex; flex-direction: column; }
  .ch-label { font-size: 0.7rem; font-weight: 700; color: #3b82f6; letter-spacing: 0.05em; }
  .ch-name { margin: 0; font-size: 1.25rem; font-weight: 800; color: #f8fafc; }
  .close-btn { background: transparent; color: #64748b; border: none; cursor: pointer; transition: 0.2s; padding: 0.5rem; border-radius: 8px; }
  .close-btn:hover { color: #f8fafc; background: #1e293b; }

  .modal-body { display: flex; flex: 1; min-height: 0; }
  .sidebar-nav {
    width: 180px; background: #0f172a; border-right: 1px solid #1e293b;
    display: flex; flex-direction: column; padding: 1rem 0; gap: 0.25rem; flex-shrink: 0; overflow-y: auto;
  }
  .nav-item {
    background: transparent; color: #94a3b8; border: none; padding: 0.85rem 1.5rem;
    display: flex; align-items: center; gap: 0.75rem; width: 100%; text-align: left;
    font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: 0.2s; border-left: 3px solid transparent;
  }
  .nav-item:hover { background: #1e293b; color: #e2e8f0; }
  .nav-item.active { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-left-color: #3b82f6; }
  
  .content-area { flex: 1; overflow: hidden; padding: 1.25rem 1.5rem; background: #0b0f19; display: flex; flex-direction: column; }

  .fade-in-up { animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

  @media (max-width: 768px) {
    .modal-container { height: 100%; max-height: none; border-radius: 0; }
    .modal-backdrop { padding: 0; }
    .modal-body { flex-direction: column; }
    .sidebar-nav { width: 100%; border-right: none; border-bottom: 1px solid #1e293b; flex-direction: row; padding: 0; overflow-x: auto; }
    .nav-item { padding: 1rem; border-left: none; border-bottom: 3px solid transparent; justify-content: center; min-width: max-content; }
    .nav-item.active { border-left-color: transparent; border-bottom-color: #3b82f6; }
  }

  /* ========================================================
     GLOBAL STYLES FOR CHILD SECTIONS (FADERS & KNOBS)
     ======================================================== */
  :global(.x32-panel) { display: flex; flex-direction: column; height: 100%; gap: 1rem; min-height: min-content; }
  :global(.x32-top-graphs) { flex: 1; min-height: 160px; background: #020617; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; display: flex; position: relative; }
  :global(.x32-bottom-faders) { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; background: #111827; padding: 1rem; border-radius: 8px; border: 1px solid #1e293b; flex-shrink: 0; }
  
  :global(.fader-group) { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; min-width: 50px; }
  :global(.v-slider-val) { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #f8fafc; background: #020617; padding: 0.25rem 0.4rem; border-radius: 4px; border: 1px solid #334155; width: 100%; text-align: center; box-sizing: border-box; }
  :global(.v-slider-lbl) { font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; }
  
  /* Vertical Slider Core Magic */
  :global(.v-slider-wrapper) { height: 120px; width: 40px; display: flex; align-items: center; justify-content: center; position: relative; }
  :global(.v-slider) { -webkit-appearance: none; appearance: none; width: 110px; height: 6px; background: #020617; outline: none; transform: rotate(-90deg); transform-origin: center; border-radius: 4px; border: 1px solid #1e293b; box-shadow: inset 0 1px 3px rgba(0,0,0,0.5); margin: 0; }
  
  /* Slider Thumbs */
  :global(.v-slider::-webkit-slider-thumb) { -webkit-appearance: none; width: 34px; height: 18px; border-radius: 4px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.5); border: 2px solid #0f172a; }
  :global(.v-slider::-moz-range-thumb) { width: 34px; height: 18px; border-radius: 4px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.5); border: 2px solid #0f172a; }
  
  /* Colored Thumb Indicators */
  :global(.v-slider.red-thumb::-webkit-slider-thumb) { background: linear-gradient(0deg, #b91c1c 0%, #ef4444 100%); }
  :global(.v-slider.red-thumb::-moz-range-thumb) { background: linear-gradient(0deg, #b91c1c 0%, #ef4444 100%); }
  
  :global(.v-slider.blue-thumb::-webkit-slider-thumb) { background: linear-gradient(0deg, #1d4ed8 0%, #3b82f6 100%); }
  :global(.v-slider.blue-thumb::-moz-range-thumb) { background: linear-gradient(0deg, #1d4ed8 0%, #3b82f6 100%); }
  
  :global(.v-slider.green-thumb::-webkit-slider-thumb) { background: linear-gradient(0deg, #047857 0%, #10b981 100%); }
  :global(.v-slider.green-thumb::-moz-range-thumb) { background: linear-gradient(0deg, #047857 0%, #10b981 100%); }
  
  :global(.v-slider.amber-thumb::-webkit-slider-thumb) { background: linear-gradient(0deg, #b45309 0%, #f59e0b 100%); }
  :global(.v-slider.amber-thumb::-moz-range-thumb) { background: linear-gradient(0deg, #b45309 0%, #f59e0b 100%); }

  /* Console Buttons */
  :global(.btn-toggle) { background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; align-items: center; gap: 0.35rem; text-align: center; }
  :global(.btn-toggle:hover) { background: #334155; color: #e2e8f0; }
  :global(.btn-toggle.active.red-glow) { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border-color: #ef4444; box-shadow: inset 0 0 10px rgba(239,68,68,0.2); }
  :global(.btn-toggle.active.blue-glow) { background: rgba(59, 130, 246, 0.15); color: #93c5fd; border-color: #3b82f6; box-shadow: inset 0 0 10px rgba(59,130,246,0.2); }
  :global(.btn-toggle.active.amber-glow) { background: rgba(245, 158, 11, 0.15); color: #fcd34d; border-color: #f59e0b; box-shadow: inset 0 0 10px rgba(245,158,11,0.2); }
</style>