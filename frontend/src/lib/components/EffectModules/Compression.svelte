<script>
  import Knob from '../EffectControls/Knob.svelte';
  import Toggle from '../EffectControls/Toggle.svelte';
  export let params = {};
  export let preset = '';
  export let onParamChange = (key, value) => {};
  export let slotIndex = 0;

  $: enabled = params.enabled ?? true;
  $: threshold = params.threshold ?? -20;
  $: ratio = params.ratio ?? 4.0;
  $: attack = params.attack ?? 10;
  $: release = params.release ?? 100;
</script>

<div class="effect-module compression">
  <div class="rack-metal">
    <div class="fx-header">
      <span class="brand">OPENMIX</span>
      <span class="model">{preset.toUpperCase()}</span>
    </div>

    <div class="comp-main">
      <div class="knobs-row">
        <Knob
          label="Thresh"
          value={threshold}
          min={-40}
          max={0}
          onChange={(v) => onParamChange('threshold', v)}
        />
        <Knob
          label="Ratio"
          value={ratio}
          min={1}
          max={20}
          onChange={(v) => onParamChange('ratio', v)}
        />
        <Knob
          label="Attack"
          value={attack}
          min={1}
          max={100}
          onChange={(v) => onParamChange('attack', v)}
        />
        <Knob
          label="Release"
          value={release}
          min={10}
          max={1000}
          onChange={(v) => onParamChange('release', v)}
        />
      </div>

      <div class="side-controls">
        <Toggle
          label="Active"
          value={enabled}
          onChange={(v) => onParamChange('enabled', v)}
        />
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

  .comp-main {
    display: flex;
    align-items: center;
    gap: 2rem;
    flex: 1;
  }

  .knobs-row {
    flex: 1;
    display: flex;
    justify-content: space-around;
    gap: 1rem;
    align-items: center;
  }

  .side-controls {
    width: 80px;
    display: flex;
    justify-content: center;
    border-left: 1px solid rgba(255,255,255,0.05);
    padding-left: 1rem;
  }
</style>