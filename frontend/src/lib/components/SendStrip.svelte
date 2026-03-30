<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let name = 'Bus';
  export let level = 0; // Normalized 0.0 to 1.0
  export let isOn = true;
  export let isPre = true;
  export let accentColor = '#3b82f6'; // Blue for Aux, Purple for FX, Emerald for MTX

  function toDb(val) {
    if (val <= 0.005) return '-\u221e';
    const db = 40 * Math.log10(val / 0.75);
    if (db < -80) return '-\u221e';
    return (db >= 0 ? '+' : '') + db.toFixed(1);
  }

  // Fader position calculation (matches fader track)
  $: thumbPos = (level * 100);

  function handleInput(e) {
    const val = parseFloat(e.currentTarget.value);
    dispatch('change', val);
  }

  function handleDblClick() {
    dispatch('change', 0.75); // Reset to Unity (0dB)
  }
</script>

<div class="send-strip" class:is-off={!isOn}>
  <div class="strip-label" style="border-bottom-color: {accentColor}">
    {name}
  </div>

  <div class="fader-track-container">
    <div class="fader-track">
      <div class="fader-fill" style="height: {thumbPos}%; background: {accentColor}33"></div>
      <div class="track-center"></div>
    </div>
    <input 
      type="range" 
      class="v-slider" 
      min="0" max="1" step="0.005"
      value={level}
      on:input={handleInput}
      on:dblclick={handleDblClick}
    />
    <div class="fader-thumb" style="bottom: calc({thumbPos}% - 8px); background: linear-gradient(180deg, {accentColor} 0%, #172554 100%);">
      <div class="thumb-line"></div>
    </div>
  </div>

  <div class="readout">
    {toDb(level)} <span class="unit">dB</span>
  </div>

  <div class="strip-controls">
    <button 
      class="btn on-btn" 
      class:active={isOn} 
      on:click={() => dispatch('toggleOn')}
    >
      {isOn ? 'ON' : 'OFF'}
    </button>
    <button 
      class="btn pp-btn" 
      class:active={isPre} 
      on:click={() => dispatch('togglePre')}
    >
      {isPre ? 'PRE' : 'POST'}
    </button>
  </div>
</div>

<style>
  .send-strip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.3rem;
    background: #09090b; /* Zinc 950 */
    border: 1px solid #18181b;
    border-radius: 6px;
    width: 64px;
    transition: all 0.2s;
  }
  .send-strip:hover { background: #0c0c0e; border-color: #27272a; }
  .is-off { opacity: 0.6; filter: grayscale(0.5); }

  .strip-label {
    width: 100%;
    text-align: center;
    font-size: 0.58rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #71717a;
    padding-bottom: 0.2rem;
    border-bottom: 2px solid transparent;
    letter-spacing: 0.05em;
  }

  .fader-track-container {
    position: relative;
    width: 28px;
    height: 126px;
    display: flex;
    justify-content: center;
  }

  .fader-track {
    position: absolute;
    width: 4px;
    height: 100%;
    background: #000;
    border-radius: 2px;
    overflow: hidden;
  }
  .fader-fill { width: 100%; position: absolute; bottom: 0; transition: height 0.05s linear; }
  .track-center { position: absolute; left: 50%; width: 1px; height: 100%; background: #27272a; transform: translateX(-50%); }

  .v-slider {
    position: absolute;
    width: 126px;
    height: 28px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-90deg);
    opacity: 0;
    cursor: ns-resize;
    z-index: 5;
  }

  .fader-thumb {
    position: absolute;
    width: 24px;
    height: 12px;
    border-radius: 2px;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 4px 8px rgba(0,0,0,0.5);
    pointer-events: none;
    z-index: 2;
    transition: bottom 0.05s linear;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .thumb-line { width: 100%; height: 1px; background: rgba(255,255,255,0.3); }

  .readout {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65rem;
    font-weight: 800;
    color: #3b82f6;
    background: #000;
    padding: 2px 4px;
    border-radius: 3px;
    min-width: 45px;
    text-align: right;
  }
  .unit { font-size: 0.5rem; color: #52525b; }

  .strip-controls {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 4px;
  }

  .btn {
    width: 100%;
    padding: 4px 0;
    font-size: 0.58rem;
    font-weight: 900;
    border-radius: 3px;
    border: 1px solid #18181b;
    background: #18181b;
    color: #52525b;
    cursor: pointer;
    transition: all 0.2s;
  }
  .on-btn.active { background: #052e16; color: #4ade80; border-color: #15803d; box-shadow: 0 0 8px rgba(74,222,128,0.2); }
  .pp-btn.active { background: #0c1e3c; color: #60a5fa; border-color: #1d4ed8; }
</style>
