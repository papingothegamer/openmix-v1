<script>
  import { createEventDispatcher } from 'svelte';
  import { Mic } from 'lucide-svelte';

  export let gain = 30;
  export let phantom = false;
  export let phase = false;

  const dispatch = createEventDispatcher();

  function update() {
    dispatch('update', { gain, phantom, phase });
  }
</script>

<div class="x32-panel">
  <div class="x32-top-graphs">
    <div class="x32-graph-box wide">
      <div class="graph-title">Preamp Frequency Response</div>
      <div class="graph-placeholder flex-center"><span class="graph-watermark">PREAMP CURVE</span></div>
    </div>
  </div>
  <div class="x32-bottom-faders preamp-faders">
    <div class="fader-group">
      <div class="v-slider-val">{gain} dB</div>
      <div class="v-slider-wrapper">
        <input
          type="range"
          class="v-slider red-thumb"
          min="0"
          max="60"
          bind:value={gain}
          on:input={update}
        />
      </div>
      <div class="v-slider-lbl">GAIN</div>
    </div>
    <div class="fader-group push-right">
      <button 
        class="btn-toggle red-glow" 
        class:active={phantom} 
        on:click={() => { phantom = !phantom; update(); }}
      >
        48V <br/> PHANTOM
      </button>
      <button 
        class="btn-toggle red-glow" 
        class:active={phase} 
        on:click={() => { phase = !phase; update(); }}
      >
        Ø <br/> PHASE
      </button>
    </div>
  </div>
</div>

<style>
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
  
  .fader-group { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; min-width: 60px; }
  .v-slider-val { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #f8fafc; background: #0f172a; padding: 0.2rem 0.4rem; border-radius: 4px; border: 1px solid #1e293b; min-width: 48px; text-align: center; }
  .v-slider-lbl { font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
  
  .v-slider-wrapper { height: 110px; display: flex; align-items: center; justify-content: center; }
  .v-slider { -webkit-appearance: none; appearance: none; width: 100px; height: 8px; background: #000; border-radius: 4px; outline: none; transform: rotate(-90deg); margin: 0; box-shadow: inset 0 1px 3px rgba(0,0,0,0.8); border: 1px solid #1e293b; }
  .v-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 36px; height: 16px; border-radius: 3px; cursor: pointer; border: 1px solid #000; }
  .red-thumb::-webkit-slider-thumb { background: linear-gradient(0deg, #b91c1c 0%, #ef4444 100%); box-shadow: 0 4px 8px rgba(239,68,68,0.2), inset 0 2px 0 rgba(255,255,255,0.3); }
  
  .btn-toggle { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 1rem; border-radius: 8px; font-weight: 700; font-size: 0.8rem; line-height: 1.4; cursor: pointer; transition: 0.2s; min-width: 80px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
  .btn-toggle:hover { background: #334155; color: #f8fafc; }
  .btn-toggle.active.red-glow { background: #ef4444; color: white; border-color: #fca5a5; box-shadow: 0 0 15px rgba(239,68,68,0.4), inset 0 2px 4px rgba(255,255,255,0.2); }
</style>
