<script>
  import Knob from '../EffectControls/Knob.svelte';
  import Toggle from '../EffectControls/Toggle.svelte';
  import { setOsc } from '../../socket.js';

  export let index = 0;
  export let params = {
    enabled: true,
    threshold: 0.5,
    ratio: 0.6,
    attack: 0.3,
    release: 0.7,
    makeup: 0.4
  };

  function updateParam(key, value) {
    params[key] = value;
    emitOsc();
  }

  function emitOsc() {
    const rtnNum = index + 1;
    setOsc(`/rtn/${rtnNum}/on`, params.enabled ? 1 : 0);
    setOsc(`/rtn/${rtnNum}/fxparam/1`, params.threshold);
    setOsc(`/rtn/${rtnNum}/fxparam/2`, params.ratio);
    setOsc(`/rtn/${rtnNum}/fxparam/3`, params.attack);
    setOsc(`/rtn/${rtnNum}/fxparam/4`, params.release);
    setOsc(`/rtn/${rtnNum}/fxparam/5`, params.makeup);
  }
</script>

<div class="effect-module compression">
  <div class="module-header">
    <h3>COMPRESSION</h3>
    <Toggle
      label="Active"
      value={params.enabled}
      onChange={(v) => updateParam('enabled', v)}
    />
  </div>

  <div class="controls-grid">
    <Knob
      label="Threshold"
      value={params.threshold}
      min={-60}
      max={0}
      onChange={(v) => updateParam('threshold', v)}
    />
    <Knob
      label="Ratio"
      value={params.ratio}
      min={1}
      max={10}
      onChange={(v) => updateParam('ratio', v)}
    />
    <Knob
      label="Attack"
      value={params.attack}
      min={0}
      max={100}
      onChange={(v) => updateParam('attack', v)}
    />
    <Knob
      label="Release"
      value={params.release}
      min={0}
      max={100}
      onChange={(v) => updateParam('release', v)}
    />
    <Knob
      label="Makeup"
      value={params.makeup}
      min={0}
      max={24}
      onChange={(v) => updateParam('makeup', v)}
    />
  </div>
</div>

<style>
  .effect-module {
    background: linear-gradient(135deg, #1a1a1a 0%, #222 100%);
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .module-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #2a2a2a;
    padding-bottom: 0.75rem;
  }

  .module-header h3 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #e0e0e0;
  }

  .controls-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 0.5rem;
  }
</style>