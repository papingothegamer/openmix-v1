<script>
  import Knob from '../EffectControls/Knob.svelte';
  import SmallSlider from '../EffectControls/SmallSlider.svelte';
  import { setOsc } from '../../socket.js';

  export let index = 0;
  export let params = {
    type: 'Hall Reverb',
    size: 0.7,
    decay: 2.5,
    preDelay: 0.02,
    damping: 0.5
  };

  const reverbTypes = ['Hall Reverb', 'Vintage Room', 'Spring', 'Plate'];

  function updateParam(key, value) {
    params[key] = value;
    emitOsc();
  }

  function emitOsc() {
    const rtnNum = index + 1;
    setOsc(`/rtn/${rtnNum}/fxtype`, reverbTypeToIndex(params.type));
    setOsc(`/rtn/${rtnNum}/fxparam/1`, params.size);
    setOsc(`/rtn/${rtnNum}/fxparam/2`, params.decay);
    setOsc(`/rtn/${rtnNum}/fxparam/3`, params.preDelay);
    setOsc(`/rtn/${rtnNum}/fxparam/4`, params.damping);
  }

  function reverbTypeToIndex(type) {
    const idx = reverbTypes.indexOf(type);
    return idx >= 0 ? idx : 0;
  }
</script>

<div class="effect-module reverb">
  <div class="module-header">
    <h3>REVERB</h3>
    <select value={params.type} on:change={(e) => updateParam('type', e.currentTarget.value)} class="preset-select">
      {#each reverbTypes as type}
        <option value={type}>{type}</option>
      {/each}
    </select>
  </div>

  <div class="controls-grid">
    <Knob
      label="Size"
      value={params.size}
      min={0}
      max={100}
      onChange={(v) => updateParam('size', v)}
    />
    <Knob
      label="Decay"
      value={params.decay / 10}
      min={0}
      max={10}
      onChange={(v) => updateParam('decay', v * 10)}
    />
    <Knob
      label="Pre-Delay"
      value={params.preDelay / 0.1}
      min={0}
      max={0.1}
      onChange={(v) => updateParam('preDelay', v / 10)}
    />
    <Knob
      label="Damping"
      value={params.damping}
      min={0}
      max={100}
      onChange={(v) => updateParam('damping', v)}
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

  .preset-select {
    background: #2a2a2a;
    color: #00CED1;
    border: 1px solid #3a3a3a;
    border-radius: 4px;
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .preset-select:hover {
    border-color: #00CED1;
  }

  .controls-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 0.5rem;
  }
</style>