<script>
  import Knob from '../EffectControls/Knob.svelte';
  export let params = {};
  export let preset = '';
  export let onParamChange = (key, value) => {};
  export let slotIndex = 0;

  $: speed = params.speed ?? 15;
  $: depth = params.depth ?? 60;
  $: feedback = params.feedback ?? 40;
  $: mix = params.mix ?? 50;
</script>

<div class="effect-module flanger">
  <div class="rack-metal">
    <div class="fx-header">
      <span class="brand">OPENMIX</span>
      <span class="model">{preset.toUpperCase()}</span>
    </div>

    <div class="knobs-row">
      <Knob
        label="Speed"
        value={speed}
        min={0}
        max={100}
        onChange={(v) => onParamChange('speed', v)}
      />
      <Knob
        label="Depth"
        value={depth}
        min={0}
        max={100}
        onChange={(v) => onParamChange('depth', v)}
      />
      <Knob
        label="Feedback"
        value={feedback}
        min={0}
        max={100}
        onChange={(v) => onParamChange('feedback', v)}
      />
      <Knob
        label="Mix"
        value={mix}
        min={0}
        max={100}
        onChange={(v) => onParamChange('mix', v)}
      />
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
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
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
  .model { color: #22d3ee; font-weight: 800; font-size: 1rem; font-family: 'Inter', sans-serif; opacity: 0.9; }

  .knobs-row {
    display: flex;
    justify-content: space-around;
    gap: 1.5rem;
    align-items: center;
    flex: 1;
  }
</style>