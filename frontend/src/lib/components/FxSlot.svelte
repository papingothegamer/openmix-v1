<script>
  import Reverb from './EffectModules/Reverb.svelte';
  import Delay from './EffectModules/Delay.svelte';
  import Chorus from './EffectModules/Chorus.svelte';
  import SmallSlider from './EffectControls/SmallSlider.svelte';
  import Toggle from './EffectControls/Toggle.svelte';
  import { setSlot } from '../fxState.js';

  export let index = 0;
  export let slot = { preset: 'Empty', bypass: false, params: {}, level: 0, type: 'generic' };

  const presetOptions = [
    'Empty',
    'Vintage Room',
    'Hall Reverb',
    'Stereo Delay',
    'Stereo Chorus'
  ];

  const presetDisplay = {
    'Empty': {
      family: 'No Effect',
      description: 'Choose a preset to load an FX processor into this return slot.'
    },
    'Vintage Room': {
      family: 'Reverb',
      description: 'Warm early reflections and compact ambience for vocals, drums, and acoustic sources.'
    },
    'Hall Reverb': {
      family: 'Reverb',
      description: 'Longer, spacious ambience suited to lush vocals, pads, and cinematic tails.'
    },
    'Stereo Delay': {
      family: 'Delay',
      description: 'Tempo-friendly repeats with stereo width and controllable feedback.'
    },
    'Stereo Chorus': {
      family: 'Chorus',
      description: 'Adds motion, width, and shimmer to guitars, keys, and backing vocals.'
    }
  };

  function getModuleForPreset(preset) {
    if (preset === 'Hall Reverb' || preset === 'Vintage Room') return Reverb;
    if (preset === 'Stereo Delay') return Delay;
    if (preset === 'Stereo Chorus') return Chorus;
    return null;
  }

  function updateSlot(patch) {
    setSlot(index, patch);
  }

  function selectPreset(event) {
    updateSlot({ preset: event.currentTarget.value });
  }

  function updateBypass(value) {
    updateSlot({ bypass: !!value });
  }

  function updateLevel(value) {
    updateSlot({ level: value });
  }

  function updateParams(patch) {
    updateSlot({
      params: {
        ...(slot?.params || {}),
        ...patch
      }
    });
  }

  $: selectedPreset = slot?.preset || 'Empty';
  $: selectedMeta = presetDisplay[selectedPreset] || presetDisplay.Empty;
  $: moduleComponent = getModuleForPreset(selectedPreset);
  $: slotLevel = typeof slot?.level === 'number' ? slot.level : 0;
  $: slotBypass = !!slot?.bypass;
  $: slotParams = slot?.params || {};
</script>

<div class="fx-slot">
  <div class="fx-header">
    <div class="slot-heading">
      <span class="slot-index">FX SLOT {index + 1}</span>
      <span class="slot-family">{selectedMeta.family}</span>
    </div>

    <div class="header-actions">
      <label class="field">
        <span class="field-label">Preset</span>
        <select class="fx-preset" on:change={selectPreset} bind:value={selectedPreset}>
          {#each presetOptions as preset}
            <option value={preset}>{preset}</option>
          {/each}
        </select>
      </label>

      <div class="bypass-wrap">
        <Toggle label="Bypass" value={slotBypass} onChange={updateBypass} />
      </div>
    </div>
  </div>

  <div class="slot-main">
    <div class="module-panel" class:is-empty={!moduleComponent}>
      {#if moduleComponent}
        <svelte:component
          this={moduleComponent}
          index={index}
          {...{ params: slotParams }}
        />
      {:else}
        <div class="empty-module">
          <div class="empty-badge">EMPTY SLOT</div>
          <h3>No effect loaded</h3>
          <p>{selectedMeta.description}</p>
        </div>
      {/if}
    </div>

    <aside class="send-panel">
      <div class="return-meter-card">
        <span class="panel-kicker">Return</span>
        <div class="level-readout">{Math.round(slotLevel)}%</div>
        <p class="panel-copy">Overall FX return level for this slot.</p>
      </div>

      <div class="slider-wrap">
        <SmallSlider
          label="Level"
          value={slotLevel}
          min={0}
          max={100}
          onChange={updateLevel}
        />
      </div>

      <div class="status-card" class:bypassed={slotBypass}>
        <span class="status-label">Status</span>
        <strong>{slotBypass ? 'Bypassed' : 'Active'}</strong>
        <span class="status-sub">{selectedMeta.description}</span>
      </div>
    </aside>
  </div>
</div>

<style>
  .fx-slot {
    width: 100%;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    color: #e2e8f0;
  }

  .fx-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem 1.1rem;
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(8, 15, 28, 0.95));
    border: 1px solid #1e293b;
    border-radius: 10px;
    box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.04);
  }

  .slot-heading {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .slot-index {
    color: #f8fafc;
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .slot-family {
    color: #22d3ee;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-family: 'JetBrains Mono', monospace;
  }

  .header-actions {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 220px;
  }

  .field-label {
    color: #94a3b8;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .fx-preset {
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #27435a;
    padding: 0.65rem 0.8rem;
    border-radius: 8px;
    font-weight: 700;
    outline: none;
  }

  .fx-preset:focus {
    border-color: #22d3ee;
    box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.25);
  }

  .bypass-wrap {
    padding-bottom: 0.15rem;
  }

  .slot-main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 160px;
    gap: 1rem;
    min-height: 0;
    flex: 1;
  }

  .module-panel {
    background: linear-gradient(180deg, #0b1220, #09101c);
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 1rem;
    min-height: 340px;
  }

  .module-panel.is-empty {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-module {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.8rem;
    max-width: 420px;
  }

  .empty-badge {
    padding: 0.3rem 0.55rem;
    border-radius: 999px;
    border: 1px solid #27435a;
    color: #22d3ee;
    background: rgba(8, 47, 73, 0.45);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  .empty-module h3 {
    margin: 0;
    font-size: 1.3rem;
    color: #f8fafc;
  }

  .empty-module p {
    margin: 0;
    color: #94a3b8;
    line-height: 1.5;
  }

  .send-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .return-meter-card,
  .status-card {
    background: linear-gradient(180deg, #0f172a, #0a1220);
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .panel-kicker,
  .status-label {
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.68rem;
    font-weight: 800;
  }

  .level-readout {
    font-size: 1.75rem;
    font-weight: 800;
    color: #f8fafc;
  }

  .panel-copy,
  .status-sub {
    color: #94a3b8;
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .slider-wrap {
    background: linear-gradient(180deg, #0f172a, #0a1220);
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 1rem 0.75rem;
    display: flex;
    justify-content: center;
    min-height: 220px;
  }

  .status-card strong {
    color: #4ade80;
    font-size: 1rem;
  }

  .status-card.bypassed strong {
    color: #f59e0b;
  }

  @media (max-width: 900px) {
    .slot-main {
      grid-template-columns: 1fr;
    }

    .send-panel {
      flex-direction: row;
      flex-wrap: wrap;
    }

    .return-meter-card,
    .slider-wrap,
    .status-card {
      flex: 1 1 180px;
    }
  }

  @media (max-width: 640px) {
    .fx-header {
      flex-direction: column;
      align-items: stretch;
    }

    .header-actions {
      align-items: stretch;
    }

    .field {
      min-width: 0;
    }
  }
</style>