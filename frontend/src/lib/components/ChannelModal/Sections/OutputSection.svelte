<script>
  import { createEventDispatcher } from 'svelte';
  import { Settings2 } from 'lucide-svelte';

  export let outPan = 0;
  export let outLevel = 0;
  export let mainAssign = true;
  export let stereoLink = false;

  const dispatch = createEventDispatcher();

  function update() {
    dispatch('update', { outPan, outLevel, mainAssign });
  }
</script>

<div class="x32-panel">
  <div class="x32-top-graphs">
    <div class="routing-visual">
      <span class="routing-title"><Settings2 size={16}/> L/R BUS ROUTING</span>
      <button 
        class="main-lr-toggle" 
        class:active={mainAssign} 
        on:click={() => { mainAssign = !mainAssign; update(); }}
      >
        <div class="led-bar"></div>
        <span>MAIN L/R BUS</span>
        {#if stereoLink}
          <div class="linked-badge-mini">LINKED</div>
        {/if}
      </button>
    </div>
  </div>

  <div class="x32-bottom-faders output-bottom">
    
    <div class="pan-container">
      <div class="v-slider-lbl">PANORAMA</div>
      <div class="h-slider-wrapper">
        <span class="pan-edge">L</span>
        <input 
          type="range" 
          class="h-slider amber-thumb" 
          min="-100" max="100" 
          bind:value={outPan} 
          on:input={update} 
        />
        <span class="pan-edge">R</span>
      </div>
      <div class="v-slider-val" style="width:60px;">{outPan === 0 ? 'C' : (outPan > 0 ? 'R'+outPan : 'L'+Math.abs(outPan))}</div>
    </div>

    <div class="fader-group">
      <div class="v-slider-val">{outLevel} dB</div>
      <div class="v-slider-wrapper">
        <input 
          type="range" 
          class="v-slider amber-thumb" 
          min="-90" max="10" 
          bind:value={outLevel} 
          on:input={update} 
        />
      </div>
      <div class="v-slider-lbl">LEVEL</div>
    </div>

  </div>
</div>

<style>
  .routing-visual {
    width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem;
    background: radial-gradient(circle at center, #111827 0%, #020617 100%);
  }
  .routing-title { display: flex; align-items: center; gap: 0.5rem; color: #64748b; font-weight: 800; letter-spacing: 0.1em; font-size: 0.85rem; }
  
  .main-lr-toggle {
    position: relative;
    background: #0f172a; border: 2px solid #1e293b; padding: 1.5rem 2.5rem; border-radius: 8px;
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
    color: #94a3b8; font-weight: 800; font-size: 1.1rem; cursor: pointer; transition: 0.2s;
  }
  .main-lr-toggle:hover { background: #1e293b; color: #f8fafc; }
  .main-lr-toggle.active { border-color: #f59e0b; color: #fcd34d; background: rgba(245, 158, 11, 0.1); box-shadow: 0 10px 25px rgba(245,158,11,0.2); }
  
  .led-bar { width: 60px; height: 6px; background: #334155; border-radius: 3px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.5); }
  .main-lr-toggle.active .led-bar { background: #f59e0b; box-shadow: 0 0 10px #f59e0b, inset 0 1px 2px rgba(255,255,255,0.5); }

  .linked-badge-mini {
    position: absolute; top: -10px; right: -10px;
    background: #3b82f6; color: white; font-size: 0.65rem; font-weight: 900;
    padding: 3px 8px; border-radius: 4px; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4);
    letter-spacing: 1px;
  }

  .output-bottom { align-items: center; gap: 3rem; }
  
  .pan-container { display: flex; flex-direction: column; align-items: center; gap: 1rem; background: #0f172a; padding: 1.5rem; border-radius: 8px; border: 1px solid #1e293b; }
  .h-slider-wrapper { display: flex; align-items: center; gap: 0.75rem; width: 180px; }
  .pan-edge { font-size: 0.8rem; font-weight: 800; color: #64748b; }
  
  .h-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; background: #020617; border-radius: 4px; outline: none; border: 1px solid #1e293b; box-shadow: inset 0 1px 3px rgba(0,0,0,0.5); }
  .h-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 28px; border-radius: 4px; background: #b45309; border: 2px solid #0f172a; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.5); }
  .h-slider::-moz-range-thumb { width: 16px; height: 28px; border-radius: 4px; background: #b45309; border: 2px solid #0f172a; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.5); }
</style>