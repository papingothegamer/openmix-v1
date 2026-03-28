<script>
  import { createEventDispatcher } from 'svelte';
  import { Volume2 } from 'lucide-svelte';

  export let outPan = 0;
  export let outLevel = 0;
  export let mainAssign = true;

  const dispatch = createEventDispatcher();

  function update() {
    dispatch('update', { outPan, outLevel, mainAssign });
  }
</script>

<div class="x32-panel">
  <div class="x32-top-graphs">
    <div class="x32-graph-box wide">
      <div class="graph-title">Main Out Assignment</div>
      <div class="main-assign-container flex-center">
        <div class="routing-visual-box">
          <div class="routing-label">L/R ROUTING</div>
          <button 
            class="main-lr-toggle" 
            class:active={mainAssign} 
            on:click={() => { mainAssign = !mainAssign; update(); }}
          >
            <div class="led" class:on={mainAssign}></div>
            <span>STEREO BUS</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="x32-bottom-faders">
    <div class="fader-section">
      <div class="fader-group">
        <div class="v-slider-val">{outPan === 0 ? 'C' : (outPan > 0 ? 'R'+outPan : 'L'+Math.abs(outPan))}</div>
        <div class="v-slider-wrapper">
          <input 
            type="range" 
            class="v-slider gray-thumb" 
            min="-100" 
            max="100" 
            bind:value={outPan} 
            on:input={update}
          />
        </div>
        <div class="v-slider-lbl">PAN</div>
      </div>
      <div class="fader-group">
        <div class="v-slider-val">{outLevel} dB</div>
        <div class="v-slider-wrapper">
          <input
            type="range"
            class="v-slider gray-thumb"
            min="-90"
            max="10"
            bind:value={outLevel}
            on:input={update}
          />
        </div>
        <div class="v-slider-lbl">POST LVL</div>
      </div>
    </div>
  </div>
</div>

<style>
  .x32-panel { display: flex; flex-direction: column; height: 100%; }
  .x32-top-graphs { display: flex; gap: 1rem; padding: 1rem; height: 180px; flex-shrink: 0; }
  .x32-graph-box { flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; }
  .graph-title { background: #1e293b; color: #cbd5e1; font-size: 0.7rem; font-weight: 600; padding: 0.3rem 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #334155; }
  
  .main-assign-container { flex: 1; background: #020617; }
  .routing-visual-box { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .routing-label { color: #1e293b; font-size: 2rem; font-weight: 900; letter-spacing: 0.1em; }
  
  .main-lr-toggle { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; color: #94a3b8; font-weight: 800; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.5); }
  .main-lr-toggle:hover { border-color: #475569; color: #cbd5e1; }
  .main-lr-toggle.active { background: #0f172a; border-color: #3b82f6; color: #f8fafc; box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); }
  
  .led { width: 12px; height: 12px; border-radius: 50%; background: #1e293b; border: 2px solid #0f172a; }
  .led.on { background: #3b82f6; box-shadow: 0 0 8px #3b82f6; border-color: #7dd3fc; }

  .flex-center { display: flex; justify-content: center; align-items: center; }
  
  .x32-bottom-faders { flex: 1; background: linear-gradient(180deg, #09090b 0%, #18181b 100%); display: flex; padding: 1.5rem 2rem; justify-content: center; align-items: flex-end; gap: 4rem; border-top: 1px solid #27272a; }
  .fader-section { display: flex; gap: 1.5rem; background: rgba(30,41,59,0.2); padding: 1rem 1.5rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
  .fader-group { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; min-width: 60px; }
  
  .v-slider-val { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #f8fafc; background: #0f172a; padding: 0.2rem 0.4rem; border-radius: 4px; border: 1px solid #1e293b; min-width: 48px; text-align: center; }
  .v-slider-lbl { font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
  
  .v-slider-wrapper { height: 110px; display: flex; align-items: center; justify-content: center; }
  .v-slider { -webkit-appearance: none; appearance: none; width: 100px; height: 8px; background: #000; border-radius: 4px; outline: none; transform: rotate(-90deg); margin: 0; }
  .v-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 36px; height: 16px; border-radius: 3px; cursor: pointer; border: 1px solid #000; }
  .gray-thumb::-webkit-slider-thumb { background: linear-gradient(0deg, #475569 0%, #94a3b8 100%); box-shadow: 0 4px 8px rgba(148,163,184,0.2), inset 0 2px 0 rgba(255,255,255,0.3); }
</style>
