<script>
  import { createEventDispatcher } from 'svelte';
  import GateGraph from "../../ChannelModalGraphs/GateGraph.svelte";

  export let gateThresh = -40;
  export let gateRange = 20;
  export let gateAttack = 5;
  export let gateHold = 50;
  export let gateRel = 100;
  export let filterOn = false;
  export let filterFreq = 100;

  const dispatch = createEventDispatcher();

  function update() {
    dispatch('update', { gateThresh, gateRange, gateAttack, gateHold, gateRel, filterOn, filterFreq });
  }
</script>

<div class="x32-panel">
  <GateGraph
    {gateThresh}
    {gateRange}
    {gateAttack}
    {gateHold}
    {gateRel}
  />
  <div class="x32-bottom-faders">
    <div class="fader-section">
      <div class="fader-group">
        <div class="v-slider-val">{gateThresh}</div>
        <div class="v-slider-wrapper">
          <input
            type="range"
            class="v-slider blue-thumb"
            min="-80"
            max="0"
            bind:value={gateThresh}
            on:input={update}
          />
        </div>
        <div class="v-slider-lbl">THR</div>
      </div>
      <div class="fader-group">
        <div class="v-slider-val">{gateRange}</div>
        <div class="v-slider-wrapper">
          <input
            type="range"
            class="v-slider blue-thumb"
            min="0"
            max="60"
            bind:value={gateRange}
            on:input={update}
          />
        </div>
        <div class="v-slider-lbl">RANGE</div>
      </div>
    </div>

    <!-- Sidechain Filter Section -->
    <div class="fader-section filter-section">
      <div class="fader-group">
        <div class="v-slider-val">{Math.round(filterFreq)}Hz</div>
        <div class="v-slider-wrapper">
          <input
            type="range"
            class="v-slider blue-thumb"
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
           class="btn-toggle blue-glow" 
           class:active={filterOn} 
           on:click={() => { filterOn = !filterOn; update(); }}
         >
           FILTER<br/>{filterOn ? 'ON' : 'OFF'}
         </button>
      </div>
    </div>

    <div class="fader-section">
      <div class="fader-group">
        <div class="v-slider-val">{gateAttack}</div>
        <div class="v-slider-wrapper">
          <input
            type="range"
            class="v-slider blue-thumb"
            min="0"
            max="120"
            bind:value={gateAttack}
            on:input={update}
          />
        </div>
        <div class="v-slider-lbl">ATTACK</div>
      </div>
      <div class="fader-group">
        <div class="v-slider-val">{gateRel}</div>
        <div class="v-slider-wrapper">
          <input
            type="range"
            class="v-slider blue-thumb"
            min="5"
            max="500"
            bind:value={gateRel}
            on:input={update}
          />
        </div>
        <div class="v-slider-lbl">REL</div>
      </div>
    </div>
  </div>
</div>

<style>
  .x32-panel { display: flex; flex-direction: column; height: 100%; }
  .x32-bottom-faders { flex: 1; background: linear-gradient(180deg, #09090b 0%, #18181b 100%); display: flex; padding: 1.25rem 1.5rem; justify-content: center; align-items: flex-end; gap: 1.5rem; border-top: 1px solid #27272a; }
  .fader-section { display: flex; gap: 1rem; background: rgba(30,41,59,0.2); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
  .filter-section { border-color: rgba(56, 189, 248, 0.3); background: rgba(3, 105, 161, 0.1); }
  .fader-group { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; min-width: 50px; }
  
  .v-slider-val { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #f8fafc; background: #0f172a; padding: 0.15rem 0.3rem; border-radius: 4px; border: 1px solid #1e293b; min-width: 44px; text-align: center; }
  .v-slider-lbl { font-size: 0.6rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
  
  .v-slider-wrapper { height: 90px; display: flex; align-items: center; justify-content: center; }
  .v-slider { -webkit-appearance: none; appearance: none; width: 80px; height: 6px; background: #000; border-radius: 4px; outline: none; transform: rotate(-90deg); margin: 0; }
  .v-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 30px; height: 14px; border-radius: 3px; cursor: pointer; border: 1px solid #000; }
  .blue-thumb::-webkit-slider-thumb { background: linear-gradient(0deg, #0369a1 0%, #38bdf8 100%); box-shadow: 0 4px 8px rgba(56,189,248,0.2), inset 0 2px 0 rgba(255,255,255,0.3); }

  .btn-toggle { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.7rem; line-height: 1.2; cursor: pointer; transition: 0.2s; min-width: 60px; }
  .btn-toggle.active.blue-glow { background: #38bdf8; color: white; border-color: #7dd3fc; box-shadow: 0 0 10px rgba(56,189,248,0.4); }
</style>
