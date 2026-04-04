<script>
  import Knob from '../EffectControls/Knob.svelte';

  export let params = {};
  export let preset = 'Stereo Enhancer'; // used by dynamic loader
  export let onParamChange = (key, value) => {};
  export let slotIndex = 0; // used by dynamic loader

  $: highGain = params.highGain ?? 50;
  $: lowGain = params.lowGain ?? 30;
  $: mix = params.mix ?? 60;

  // Visual animation for "shimmer"
  let shimmerActive = true;
</script>

<div class="effect-module enhancer">
  <div class="rack-metal">
    <div class="fx-header">
      <span class="brand">OPENMIX</span>
      <span class="model">STEREO ENHANCER</span>
    </div>

    <div class="enhancer-content">
      <div class="visualizer-section">
        <div class="glow-box">
          <div class="shimmer-wave" style="animation-duration: {200 - highGain}ms;"></div>
          <div class="shimmer-wave delay" style="animation-duration: {200 - lowGain}ms;"></div>
          <div class="status-text">EXCITER ACTIVE</div>
        </div>
      </div>

      <div class="controls-section">
        <div class="knob-row">
          <Knob 
            label="Low Gain" 
            value={lowGain} 
            min={0} 
            max={100} 
            onChange={(v) => onParamChange('lowGain', v)} 
          />
          <Knob 
            label="High Gain" 
            value={highGain} 
            min={0} 
            max={100} 
            onChange={(v) => onParamChange('highGain', v)} 
          />
          <Knob 
            label="Mix" 
            value={mix} 
            min={0} 
            max={100} 
            onChange={(v) => onParamChange('mix', v)} 
          />
        </div>
        
        <div class="label-row">
          <span class="sub-label">PHASE COMPENSATED EXCITATION</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .effect-module {
    width: 100%;
    height: 100%;
    display: flex;
  }

  .rack-metal {
    flex: 1;
    background: linear-gradient(135deg, #1e293b, #0f172a);
    border: 1px solid #334155;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    padding: 0.75rem 1.25rem;
    box-shadow: inset 0 1px 1px rgba(255,255,255,0.1), 0 10px 30px rgba(0,0,0,0.5);
    position: relative;
    overflow: hidden;
  }

  .fx-header {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 1rem;
  }
  .brand { color: #64748b; font-weight: 900; font-size: 0.7rem; letter-spacing: 2px; }
  .model { color: #f472b6; font-weight: 800; font-size: 1rem; font-family: 'Inter', sans-serif; opacity: 0.9; }

  .enhancer-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 3rem;
    padding: 0 1rem;
  }

  .visualizer-section {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .glow-box {
    width: 240px;
    height: 80px;
    background: #000;
    border: 2px solid #334155;
    border-radius: 6px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 2px 10px rgba(0,0,0,1);
  }

  .shimmer-wave {
    position: absolute;
    width: 200%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #f472b6, transparent);
    opacity: 0.5;
    animation: shimmer linear infinite;
  }
  .shimmer-wave.delay {
    animation-delay: 1s;
    background: linear-gradient(90deg, transparent, #22d3ee, transparent);
    top: 60%;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%) translateY(-20px); }
    100% { transform: translateX(50%) translateY(20px); }
  }

  .status-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    font-weight: 900;
    color: #f472b6;
    letter-spacing: 3px;
    text-shadow: 0 0 8px rgba(244, 114, 182, 0.6);
    z-index: 2;
  }

  .controls-section {
    flex: 1.5;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .knob-row {
    display: flex;
    justify-content: space-around;
    align-items: center;
  }

  .label-row {
    text-align: center;
    padding-top: 1rem;
    border-top: 1px solid rgba(255,255,255,0.05);
  }
  .sub-label {
    font-size: 0.6rem;
    font-weight: 800;
    color: #475569;
    letter-spacing: 2px;
  }
</style>
