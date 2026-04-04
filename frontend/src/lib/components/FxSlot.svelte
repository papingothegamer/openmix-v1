<script>
  import Reverb from './EffectModules/Reverb.svelte';
  import Delay from './EffectModules/Delay.svelte';
  import Chorus from './EffectModules/Chorus.svelte';
  import Compression from './EffectModules/Compression.svelte';
  import Flanger from './EffectModules/Flanger.svelte';
  import Phaser from './EffectModules/Phaser.svelte';
  import Utility from './EffectModules/Utility.svelte';
  import FairComp from './EffectModules/FairComp.svelte';
  import Pitch from './EffectModules/Pitch.svelte';
  import SmallSlider from './EffectControls/SmallSlider.svelte';
  import Toggle from './EffectControls/Toggle.svelte';
  import { setSlot } from '../fxState.js';
  import { getPresetMeta, getFamilies, getPresetsByFamily } from '../fxRegistry.js';

  export let index = 0;
  export let slot = { preset: 'Empty', bypass: false, params: {}, level: 0, type: 'generic' };

  let families = getFamilies();
  let selectedFamily = 'Utility';
  let presetsInFamily = getPresetsByFamily(selectedFamily);

  $: selectedPreset = slot?.preset || 'Empty';
  $: {
    const meta = getPresetMeta(selectedPreset);
    if (meta.family && meta.family !== selectedFamily) {
      selectedFamily = meta.family;
      presetsInFamily = getPresetsByFamily(selectedFamily);
    }
  }

  function handleFamilyChange(e) {
    selectedFamily = e.currentTarget.value;
    presetsInFamily = getPresetsByFamily(selectedFamily);
    const firstPreset = presetsInFamily[0] || 'Empty';
    if (firstPreset !== selectedPreset) {
      updateSlot({ preset: firstPreset });
    }
  }

  function handlePresetChange(e) {
    updateSlot({ preset: e.currentTarget.value });
  }

  function getModuleForPreset(preset) {
    if (preset === 'Stereo Fair Comp') return FairComp;
    if (preset === 'Stereo Pitch') return Pitch;
    
    const meta = getPresetMeta(preset);
    const type = meta.type || 'generic';
    
    if (type === 'reverb') return Reverb;
    if (type === 'delay') return Delay;
    if (type === 'chorus') return Chorus;
    if (type === 'compressor' || type === 'limiter' || type === 'deesser') return Compression;
    if (type === 'flanger') return Flanger;
    if (type === 'phaser') return Phaser;
    return Utility;
  }

  function updateSlot(patch) { setSlot(index, patch); }
  function updateBypass(value) { updateSlot({ bypass: !!value }); }
  function updateLevel(value) { updateSlot({ level: value }); }
  
  function onParamChange(key, value) {
    updateSlot({ params: { [key]: value } });
  }

  $: moduleComponent = getModuleForPreset(selectedPreset);
  $: selectedMeta = getPresetMeta(selectedPreset);
  
  $: slotLevel = typeof slot?.level === 'number' ? slot.level : 0;
  $: slotBypass = !!slot?.bypass;
  $: slotParams = slot?.params || {};
</script>

<div class="fx-slot">
  <div class="fx-header">
    <div class="slot-heading">
      <span class="slot-index">FX SLOT {index + 1}</span>
      <span class="slot-family">{selectedFamily}</span>
    </div>

    <div class="header-actions">
      <div class="two-tier-select">
        <label class="field mini">
          <span class="field-label">Category</span>
          <select class="fx-select" on:change={handleFamilyChange} value={selectedFamily}>
            {#each families as family}
              <option value={family}>{family}</option>
            {/each}
          </select>
        </label>

        <label class="field">
          <span class="field-label">Effect Type</span>
          <select class="fx-select" on:change={handlePresetChange} value={selectedPreset}>
            {#each presetsInFamily as preset}
              <option value={preset}>{preset}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="bypass-wrap">
        <Toggle label="Bypass" value={slotBypass} defaultValue={false} onChange={updateBypass} />
      </div>
    </div>
  </div>

  <div class="slot-main">
    <div class="module-panel" class:is-empty={selectedPreset === 'Empty'}>
      {#key selectedPreset}
        {#if moduleComponent}
         <svelte:component 
           this={moduleComponent} 
           params={slotParams} 
           preset={selectedPreset}
           onParamChange={onParamChange} 
           slotIndex={index}
         />
        {/if}
      {/key}
      
      {#if selectedPreset === 'Empty'}
        <div class="empty-module">
          <div class="empty-badge">EMPTY SLOT</div>
          <h3>No effect loaded</h3>
          <p>{selectedMeta.description || 'Choose a category and type to begin.'}</p>
        </div>
      {/if}
    </div>

    <aside class="send-panel">
      <div class="return-meter-card">
        <span class="panel-kicker">Return</span>
        <div class="level-readout">{Math.round(slotLevel)}%</div>
        <p class="panel-copy">Overall FX return level.</p>
      </div>

      <div class="slider-wrap">
        <SmallSlider label="Level" value={slotLevel} defaultValue={0} min={0} max={100} onChange={updateLevel} />
      </div>

      <div class="status-card" class:bypassed={slotBypass}>
        <span class="status-label">Status</span>
        <strong>{slotBypass ? 'Bypassed' : 'Active'}</strong>
        <span class="status-sub">{slotBypass ? 'Return muted.' : 'Sending to mix.'}</span>
      </div>
    </aside>
  </div>
</div>

<style>
  .fx-slot {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 0;
    color: #e2e8f0;
  }

  .fx-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(8, 15, 28, 0.95));
    border: 1px solid #1e293b;
    border-radius: 10px;
    box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.04);
    flex-shrink: 0;
  }

  .slot-heading { display: flex; flex-direction: column; gap: 0.15rem; min-width: 100px; }
  .slot-index { color: #f8fafc; font-size: 1rem; font-weight: 800; letter-spacing: 0.08em; }
  .slot-family { color: #22d3ee; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.12em; font-family: 'JetBrains Mono', monospace; }
  
  .header-actions { display: flex; align-items: flex-end; gap: 1.5rem; flex-wrap: wrap; flex: 1; justify-content: flex-end; }
  .two-tier-select { display: flex; gap: 0.75rem; flex: 1; max-width: 500px; justify-content: flex-end; }
  
  .field { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; }
  .field.mini { flex: 0.6; min-width: 120px; }
  .field-label { color: #94a3b8; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
  
  .fx-select {
    background: #0f172a; color: #e2e8f0; border: 1px solid #27435a;
    padding: 0.5rem 0.8rem; border-radius: 8px; font-weight: 700; outline: none; width: 100%;
    font-size: 0.85rem;
  }
  .fx-select:focus { border-color: #22d3ee; box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.25); }

  .slot-main {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
    min-height: 0;
  }

  .module-panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    /* Clean container: module provides its own rack-metal look */
  }

  .module-panel.is-empty {
    align-items: center;
    justify-content: center;
  }
  
  .empty-module { display: flex; flex-direction: column; align-items: center; gap: 0.8rem; max-width: 420px; text-align: center;}
  .empty-badge { padding: 0.3rem 0.55rem; border-radius: 999px; border: 1px solid #3a3a3a; color: #00CED1; background: #2a2a2a; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.12em; }
  .empty-module h3 { margin: 0; font-size: 1.3rem; color: #e0e0e0; }
  .empty-module p { margin: 0; color: #999; line-height: 1.5; }

  .send-panel {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    flex-shrink: 0;
    height: 85px;
  }

  .return-meter-card,
  .status-card {
    background: linear-gradient(180deg, #0f172a, #0a1220);
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 0.5rem 1rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.15rem;
    height: 100%;
    box-sizing: border-box;
  }

  .panel-kicker, .status-label { color: #64748b; text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.65rem; font-weight: 800; }
  .level-readout { font-size: 1.5rem; font-weight: 800; color: #f8fafc; line-height: 1; margin: 2px 0; }
  .panel-copy, .status-sub { color: #94a3b8; font-size: 0.7rem; line-height: 1.2; margin: 0; }

  .slider-wrap {
    background: linear-gradient(180deg, #0f172a, #0a1220);
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 0.5rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    box-sizing: border-box;
  }

  .status-card strong { color: #4ade80; font-size: 1rem; line-height: 1; margin: 2px 0; }
  .status-card.bypassed strong { color: #f59e0b; }

  @media (max-width: 640px) {
    .fx-header { flex-direction: column; align-items: stretch; }
    .header-actions { align-items: stretch; }
    .field { min-width: 0; }
    .send-panel { grid-template-columns: 1fr; height: auto; }
    .two-tier-select { flex-direction: column; }
  }
</style>