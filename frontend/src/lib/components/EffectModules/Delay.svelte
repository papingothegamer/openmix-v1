<script>
  import Knob from '../EffectControls/Knob.svelte';
  import { setOsc } from '../../socket.js';

  export let index = 0;
  export let params = {
    type: 'Stereo Delay',
    time: 0.5,
    feedback: 0.4,
    mix: 0.5
  };

  const delayTypes = ['Stereo Delay', 'Pingpong', 'Tape Echo', 'Analog'];

  function updateParam(key, value) {
    params[key] = value;
    emitOsc();
  }

  function emitOsc() {
    const rtnNum = index + 1;
    setOsc(`/rtn/${rtnNum}/fxtype`, delayTypeToIndex(params.type));
    setOsc(`/rtn/${rtnNum}/fxparam/1`, params.time);
    setOsc(`/rtn/${rtnNum}/fxparam/2`, params.feedback);
    setOsc(`/rtn/${rtnNum}/fxparam/3`, params.mix);
  }

  function delayTypeToIndex(type) {
    const idx = delayTypes.indexOf(type);
    return idx >= 0 ? idx : 0;
  }
</script>

<div class="effect-module delay">
  <div class="module-header">
    <h3>DELAY</h3>
    <select value={params.type} on:change={(e) => updateParam('type', e.currentTarget.value)} class="preset-select">
      {#each delayTypes as type}
        <option value={type}>{type}</option>
      {/each}
    </select>
  </div>

  <div class="controls-grid">
    <Knob
      label="Time"
      value={params.time}
      min={0}
      max={100}
      onChange={(v) => updateParam('time', v)}
    />
    <Knob
      label="Feedback"
      value={params.feedback}
      min={0}
      max={100}
      onChange={(v) => updateParam('feedback', v)}
    />
    <Knob
      label="Mix"
      value={params.mix}
      min={0}
      max={100}
      onChange={(v) => updateParam('mix', v)}
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