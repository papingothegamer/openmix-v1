<script>
  import Knob from '../EffectControls/Knob.svelte';
  import { setOsc } from '../../socket.js';

  export let index = 0;
  export let params = {
    rate: 0.3,
    depth: 0.6,
    mix: 0.5
  };

  function updateParam(key, value) {
    params[key] = value;
    emitOsc();
  }

  function emitOsc() {
    const rtnNum = index + 1;
    setOsc(`/rtn/${rtnNum}/fxparam/1`, params.rate);
    setOsc(`/rtn/${rtnNum}/fxparam/2`, params.depth);
    setOsc(`/rtn/${rtnNum}/fxparam/3`, params.mix);
  }
</script>

<div class="effect-module chorus">
  <div class="module-header">
    <h3>CHORUS</h3>
  </div>

  <div class="controls-grid">
    <Knob
      label="Rate"
      value={params.rate}
      min={0}
      max={100}
      onChange={(v) => updateParam('rate', v)}
    />
    <Knob
      label="Depth"
      value={params.depth}
      min={0}
      max={100}
      onChange={(v) => updateParam('depth', v)}
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

  .controls-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 0.5rem;
  }
</style>