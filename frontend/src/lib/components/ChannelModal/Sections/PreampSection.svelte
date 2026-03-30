<script>
  import { createEventDispatcher } from 'svelte';
  import { Zap, Activity } from 'lucide-svelte';

  export let gain = 30;
  export let phantom = false;
  export let phase = false;
  export let stereoLink = false;

  const dispatch = createEventDispatcher();

  function update() {
    dispatch('update', { gain, phantom, phase });
  }
</script>

<div class="x32-panel">
  <div class="x32-top-graphs">
    <div class="preamp-visual">
      {#if stereoLink}
        <div class="link-badge">STEREO LINKED</div>
      {/if}
      <div class="stage-flow">
        <div class="stage-node input">
          <Activity size={16} />
          <span>MIC/LINE</span>
        </div>
        <div class="stage-connector">
          <div class="connector-line"></div>
          <div class="gain-blob" style="transform: scale({1 + (gain/60)})"></div>
        </div>
        <div class="stage-node processor">
          <span class="gain-val">{gain}dB</span>
          <div class="stage-label">PREAMP</div>
        </div>
        <div class="stage-connector">
          <div class="connector-line"></div>
        </div>
        <div class="stage-node output">
          <Zap size={16} class={phantom ? 'active-48v' : ''} />
          <span>ADC</span>
        </div>
      </div>
      <div class="gain-track">
        <div class="gain-fill" style="width: {(gain/60)*100}%"></div>
      </div>
    </div>
  </div>

  <div class="x32-bottom-faders">
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
    
    <div class="fader-group push-toggles">
      <button 
        class="btn-toggle red-glow" 
        class:active={phantom} 
        on:click={() => { phantom = !phantom; update(); }}
      >
        <Zap size={18} />
        48V
      </button>
      <button 
        class="btn-toggle blue-glow" 
        class:active={phase} 
        on:click={() => { phase = !phase; update(); }}
      >
        <span style="font-size: 1.1rem; line-height: 1;">∅</span>
        PHASE
      </button>
    </div>
  </div>
</div>

<style>
  .preamp-visual {
    width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2rem; padding: 2rem;
    background: radial-gradient(circle at center, #111827 0%, #020617 100%);
  }
  .stage-flow { display: flex; align-items: center; gap: 0.5rem; }
  .stage-node { 
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem; 
    padding: 0.75rem 1rem; background: #0f172a; border: 1px solid #1e293b; border-radius: 8px;
    min-width: 80px;
  }
  .stage-node span { font-size: 0.6rem; font-weight: 800; color: #64748b; letter-spacing: 0.1em; }
  .stage-node.processor { border-color: #ef4444; background: rgba(239, 68, 68, 0.05); }
  .gain-val { font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; font-weight: 800; color: #f8fafc; }
  .stage-label { font-size: 0.55rem; font-weight: 900; color: #ef4444; text-transform: uppercase; }
  
  .stage-connector { width: 40px; height: 2px; position: relative; display: flex; align-items: center; justify-content: center; }
  .connector-line { width: 100%; height: 1px; background: #1e293b; }
  .gain-blob { position: absolute; width: 6px; height: 6px; background: #ef4444; border-radius: 50%; filter: blur(2px); transition: transform 0.2s; }
  
  .gain-track { width: 250px; height: 4px; background: #0f172a; border-radius: 2px; overflow: hidden; border: 1px solid #1e293b; position: relative; }
  .gain-fill { height: 100%; background: linear-gradient(to right, #ef4444, #f87171); transition: width 0.1s; }
  
  :global(.active-48v) { color: #f59e0b; filter: drop-shadow(0 0 5px rgba(245, 158, 11, 0.5)); }
  .link-badge { 
    position: absolute; top: 1rem; right: 1rem; 
    padding: 0.35rem 0.6rem; background: rgba(59, 130, 246, 0.2); 
    border: 1px solid #3b82f6; color: #3b82f6; 
    border-radius: 4px; font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em;
  }
  .push-toggles { justify-content: center; gap: 1.5rem; margin-left: 2rem; }
</style>