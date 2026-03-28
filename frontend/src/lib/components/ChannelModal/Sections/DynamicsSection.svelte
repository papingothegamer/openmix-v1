<script>
  import { createEventDispatcher } from 'svelte';
  import CompressionGraph from "../../ChannelModalGraphs/CompressionGraph.svelte";

  export let compThresh = -20;
  export let compRatio = 4;
  export let compAttack = 10;
  export let compRelease = 100;
  export let compMakeup = 0;
  export let filterOn = false;
  export let filterFreq = 100;

  const dispatch = createEventDispatcher();

  function update() {
    dispatch('update', { compThresh, compRatio, compAttack, compRelease, compMakeup, filterOn, filterFreq });
  }
</script>

<div class="x32-panel">
  <CompressionGraph
    {compThresh}
    {compRatio}
    {compAttack}
    {compRelease}
    {compMakeup}
  />
  <div class="x32-bottom-faders">
    <div class="fader-section">
      <div class="fader-group">
        <div class="v-slider-val">{compThresh}</div>
        <div class="v-slider-wrapper">
          <input
            type="range"
            class="v-slider green-thumb"
            min="-60"
            max="0"
            bind:value={compThresh}
            on:input={update}
          />
        </div>
        <div class="v-slider-lbl">THR</div>
      </div>
      <div class="fader-group">
        <div class="v-slider-val">{compRatio}</div>
        <div class="v-slider-wrapper">
          <input
            type="range"
            class="v-slider green-thumb"
            min="1"
            max="20"
            bind:value={compRatio}
            on:input={update}
          />
        </div>
        <div class="v-slider-lbl">RATIO</div>
      </div>
      <div class="fader-group">
        <div class="v-slider-val">{compMakeup}</div>
        <div class="v-slider-wrapper">
          <input
            type="range"
            class="v-slider green-thumb"
            min="0"
            max="24"
            bind:value={compMakeup}
            on:input={update}
          />
        </div>
        <div class="v-slider-lbl">MAKEUP</div>
      </div>
    </div>

    <!-- Sidechain Filter Section -->
    <div class="fader-section filter-section">
      <div class="fader-group">
        <div class="v-slider-val">{Math.round(filterFreq)}Hz</div>
        <div class="v-slider-wrapper">
          <input
            type="range"
            class="v-slider green-thumb"
            min="20"
            max="20000"
            step="1"
            bind:value={filterFreq}
            on:input={update}
          />
        </div>
        <div class="v-slider-lbl">FILT F</div>
      </div>
      <div class="fader-group" style="justify-content: center;">
         <button 
           class="btn-toggle green-glow" 
           class:active={filterOn} 
           on:click={() => { filterOn = !filterOn; update(); }}
         >
           FILTER<br/>{filterOn ? 'ON' : 'OFF'}
         </button>
      </div>
    </div>

    <div class="fader-section">
      <div class="fader-group">
        <div class="v-slider-val">{compAttack}</div>
        <div class="v-slider-wrapper">
          <input
            type="range"
            class="v-slider green-thumb"
            min="0"
            max="100"
            bind:value={compAttack}
            on:input={update}
          />
        </div>
        <div class="v-slider-lbl">ATTACK</div>
      </div>
      <div class="fader-group">
        <div class="v-slider-val">{compRelease}</div>
        <div class="v-slider-wrapper">
          <input
            type="range"
            class="v-slider green-thumb"
            min="5"
            max="500"
            bind:value={compRelease}
            on:input={update}
          />
        </div>
        <div class="v-slider-lbl">RELEASE</div>
      </div>
    </div>
  </div>
</div>

<style>
  .x32-panel { display: flex; flex-direction: column; height: 100%; }
  .x32-bottom-faders { flex: 1; background: linear-gradient(180deg, #09090b 0%, #18181b 100%); display: flex; padding: 1.25rem 1.5rem; justify-content: center; align-items: flex-end; gap: 1.5rem; border-top: 1px solid #27272a; }
  .fader-section { display: flex; gap: 1rem; background: rgba(30,41,59,0.2); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
  .filter-section { border-color: rgba(16, 185, 129, 0.3); background: rgba(6, 78, 59, 0.1); }
  .fader-group { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; min-width: 50px; }
  
  .v-slider-val { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #f8fafc; background: #0f172a; padding: 0.15rem 0.3rem; border-radius: 4px; border: 1px solid #1e293b; min-width: 44px; text-align: center; }
  .v-slider-lbl { font-size: 0.6rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
  
  .v-slider-wrapper { height: 90px; display: flex; align-items: center; justify-content: center; }
  .v-slider { -webkit-appearance: none; appearance: none; width: 80px; height: 6px; background: #000; border-radius: 4px; outline: none; transform: rotate(-90deg); margin: 0; }
  .v-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 30px; height: 14px; border-radius: 3px; cursor: pointer; border: 1px solid #000; }
  .green-thumb::-webkit-slider-thumb { background: linear-gradient(0deg, #047857 0%, #10b981 100%); box-shadow: 0 4px 8px rgba(16,185,129,0.2), inset 0 2px 0 rgba(255,255,255,0.3); }

  .btn-toggle { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.7rem; line-height: 1.2; cursor: pointer; transition: 0.2s; min-width: 60px; }
  .btn-toggle.active.green-glow { background: #10b981; color: white; border-color: #34d399; box-shadow: 0 0 10px rgba(16,185,129,0.4); }
</style>
