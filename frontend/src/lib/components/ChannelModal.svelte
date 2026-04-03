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
  
  // Received directly from App.svelte's live state
  export let mainAssign = false;
  export let stereoLink = false;
  
  $: isXR = config?.presetId === 'XR18';
  
  const dispatch = createEventDispatcher();
  
  let activeSection = initialSection;
  
  function close() {
    dispatch('close');
  }
  
  // Helper to get raw channel number for OSC emits
  $: chNum = channelId ? String(parseInt(channelId.replace(/\D/g, ''))).padStart(2, '0') : '01';

  // Internal State — hydrated from live OSC cache
  let params = {};
  let hasHydrated = false;

  // Extract numeric value from OSC cache entry (handles plain number, array, or {type, value} objects)
  function extractVal(raw, fallback) {
    if (raw === undefined || raw === null) return fallback;
    let v = raw;
    if (Array.isArray(v)) v = v[0];
    if (v !== null && typeof v === 'object' && 'value' in v) v = v.value;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  // Hydrate params from the live mixer state whenever channelId or cache changes
  $: {
    const cache = $mixerState?.flatOscCache || {};
    const ch = chNum;
    params = {
      gain: extractVal(cache[`/headamp/${ch}/gain`], 30),
      phantom: extractVal(cache[`/headamp/${ch}/phantom`], 0) === 1,
      phase: extractVal(cache[`/ch/${ch}/preamp/phase`], 0) === 1,
      gateThresh: extractVal(cache[`/ch/${ch}/gate/thr`], -40),
      gateRange: extractVal(cache[`/ch/${ch}/gate/range`], 20),
      gateAttack: extractVal(cache[`/ch/${ch}/gate/att`], 5),
      gateHold: extractVal(cache[`/ch/${ch}/gate/hold`], 50),
      gateRel: extractVal(cache[`/ch/${ch}/gate/rel`], 100),
      compThresh: extractVal(cache[`/ch/${ch}/dyn/thr`], -20),
      compRatio: extractVal(cache[`/ch/${ch}/dyn/ratio`], 4),
      compAttack: extractVal(cache[`/ch/${ch}/dyn/att`], 10),
      compRelease: extractVal(cache[`/ch/${ch}/dyn/rel`], 100),
      compMakeup: extractVal(cache[`/ch/${ch}/dyn/makeup`], 0),
      outPan: extractVal(cache[`/ch/${ch}/mix/pan`], 0),
      outLevel: extractVal(cache[`/ch/${ch}/mix/fader`], 0),
      mainAssign: mainAssign,
    };
    hasHydrated = true;
  }

  // Helper: optimistic cache update so all UIs reflect changes immediately
  function optimisticUpdate(address, value) {
    mixerState.update(prev => ({
      ...prev,
      flatOscCache: { ...(prev.flatOscCache || {}), [address]: value }
    }));
  }

  // Receives unified update events from the child sections
  function handleParamUpdate(e) {
    const updatedVals = e.detail;
    params = { ...params, ...updatedVals };
    
    // OSC Emission mapping logic + optimistic cache updates
    if ('gain' in updatedVals) {
      setOsc(`/headamp/${chNum}/gain`, params.gain);
      optimisticUpdate(`/headamp/${chNum}/gain`, params.gain);
    }
    if ('phantom' in updatedVals) {
      setOsc(`/headamp/${chNum}/phantom`, params.phantom ? 1 : 0);
      optimisticUpdate(`/headamp/${chNum}/phantom`, params.phantom ? 1 : 0);
    }
    
    if ('gateThresh' in updatedVals) {
      setOsc(`/ch/${chNum}/gate/thr`, params.gateThresh);
      optimisticUpdate(`/ch/${chNum}/gate/thr`, params.gateThresh);
    }
    if ('gateRange' in updatedVals) {
      setOsc(`/ch/${chNum}/gate/range`, params.gateRange);
      optimisticUpdate(`/ch/${chNum}/gate/range`, params.gateRange);
    }
    
    if ('compThresh' in updatedVals) {
      setOsc(`/ch/${chNum}/dyn/thr`, params.compThresh);
      optimisticUpdate(`/ch/${chNum}/dyn/thr`, params.compThresh);
    }
    if ('compRatio' in updatedVals) {
      setOsc(`/ch/${chNum}/dyn/ratio`, params.compRatio);
      optimisticUpdate(`/ch/${chNum}/dyn/ratio`, params.compRatio);
    }
    
    if ('outPan' in updatedVals) {
      setOsc(`/ch/${chNum}/mix/pan`, params.outPan);
      optimisticUpdate(`/ch/${chNum}/mix/pan`, params.outPan);
    }
    if ('outLevel' in updatedVals) {
      setOsc(`/ch/${chNum}/mix/fader`, params.outLevel);
      optimisticUpdate(`/ch/${chNum}/mix/fader`, params.outLevel);
    }
    
    if ('mainAssign' in updatedVals) {
      // Bounce the change back up to App.svelte where mainOutAssign is managed
      dispatch('setMainOut', { state: params.mainAssign });
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
            on:update={handleParamUpdate} 
          />
        {:else if activeSection === 'gate'}
          <GateSection 
            bind:gateThresh={params.gateThresh} 
            bind:gateRange={params.gateRange} 
            bind:gateAttack={params.gateAttack} 
            bind:gateHold={params.gateHold} 
            bind:gateRel={params.gateRel} 
            on:update={handleParamUpdate} 
          />
        {:else if activeSection === 'compressor'}
          <DynamicsSection 
            bind:compThresh={params.compThresh} 
            bind:compRatio={params.compRatio} 
            bind:compAttack={params.compAttack} 
            bind:compRelease={params.compRelease} 
            bind:compMakeup={params.compMakeup} 
            on:update={handleParamUpdate} 
          />
        {:else if activeSection === 'output'}
          <OutputSection 
            bind:outPan={params.outPan} 
            bind:outLevel={params.outLevel} 
            bind:mainAssign={params.mainAssign} 
            stereoLink={stereoLink}
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
    width: 100%; max-width: 900px; height: 85vh; max-height: 700px;
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
  
  .content-area { flex: 1; overflow-y: auto; padding: 1.5rem; background: #0b0f19; display: flex; flex-direction: column; }

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
  :global(.x32-panel) { display: flex; flex-direction: column; height: 100%; gap: 1rem; min-height: 0; }
  :global(.x32-top-graphs) { flex: 1 1 auto; min-height: 160px; max-height: 240px; background: #020617; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; display: flex; position: relative; }
  :global(.x32-bottom-faders) { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; background: #111827; padding: 1rem 1.25rem; border-radius: 8px; border: 1px solid #1e293b; flex-shrink: 0; }
  
  :global(.fader-group) { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; min-width: 55px; }
  :global(.v-slider-val) { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #f8fafc; background: #020617; padding: 0.25rem 0.4rem; border-radius: 4px; border: 1px solid #334155; width: 100%; text-align: center; box-sizing: border-box; }
  :global(.v-slider-lbl) { font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; }
  
  /* Vertical Slider Core Magic */
  :global(.v-slider-wrapper) { height: 110px; width: 36px; display: flex; align-items: center; justify-content: center; position: relative; }
  :global(.v-slider) { -webkit-appearance: none; appearance: none; width: 100px; height: 5px; background: #020617; outline: none; transform: rotate(-90deg); transform-origin: center; border-radius: 4px; border: 1px solid #1e293b; box-shadow: inset 0 1px 3px rgba(0,0,0,0.5); margin: 0; }
  
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