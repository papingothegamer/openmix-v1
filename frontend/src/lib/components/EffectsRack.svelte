<script>
  import { onDestroy } from 'svelte';
  import FxSlot from './FxSlot.svelte';
  import fxState, { ensureFxSlots } from '../fxState.js';
  import { setOsc } from '../socket.js';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';

  export let config = { fx: 4 };
  export let scribbles = {};
  
  /** @type {string | null} */
  export let selectedChannel = null;
  
  export let cycleChannel = (dir) => {}; 
  export let isFirstChannel = true;
  export let isLastChannel = true;

  // Ensure store has correct number of slots, re-initialize whenever config.fx changes
  $: ensureFxSlots(config.fx || 4);

  let fx = { slots: [] };
  const unsub = fxState.subscribe(v => fx = v);
  onDestroy(unsub);

  let selectedSlotIndex = 0;

  const presetShortNames = {
    'Empty': 'EMPTY',
    'Vintage Room': 'VIN ROOM',
    'Hall Reverb': 'HALL RVB',
    'Stereo Delay': 'ST DELAY',
    'Stereo Chorus': 'ST CHORUS'
  };

  const OSC_DEBOUNCE_MS = 100;
  let oscDebounceTimers = {};

  function scheduleSlotOsc(index) {
    if (oscDebounceTimers[index]) clearTimeout(oscDebounceTimers[index]);

    oscDebounceTimers[index] = setTimeout(() => {
      const slot = fx.slots[index];
      if (slot) {
        const rtnNum = index + 1;
        setOsc(`/rtn/${rtnNum}/on`, slot.bypass ? 0 : 1);
        if (typeof slot.level === 'number') {
          setOsc(`/rtn/${rtnNum}/mix`, Math.max(0, Math.min(1, slot.level)));
        }
      }
      delete oscDebounceTimers[index];
    }, OSC_DEBOUNCE_MS);
  }

  $: {
    if (fx.slots && fx.slots.length > 0) {
      fx.slots.forEach((slot, i) => {
        if (slot) scheduleSlotOsc(i);
      });
    }
  }
</script>

<div class="fx-container fade-in">
  <div class="fx-sidebar">
    <div class="fx-header">
      <div class="header-title-group">
        <h2 class="title-left">FX: <span class="ch-name">{selectedChannel ? (scribbles[selectedChannel]?.name || selectedChannel.toUpperCase()) : 'SELECT'}</span></h2>
      </div>
      <div class="nav-group">
        <button class="nav-icon-btn" disabled={isFirstChannel} on:click={() => cycleChannel(-1)}><ChevronLeft size={18} /></button>
        <button class="nav-icon-btn" disabled={isLastChannel} on:click={() => cycleChannel(1)}><ChevronRight size={18} /></button>
      </div>
    </div>

    <div class="fx-slot-list">
      {#each fx.slots as slot, i}
        <button class="fx-slot-row" class:active={selectedSlotIndex === i} on:click={() => selectedSlotIndex = i}>
          <div class="fx-slot-name">
            <span class="w-id">SLOT {i + 1}</span>
            <span class="w-type">{presetShortNames[slot.preset] || slot.preset?.toUpperCase() || 'EMPTY'}</span>
          </div>
        </button>
      {/each}
    </div>
  </div>

  <div class="fx-workspace">
    <div class="fx-workspace-inner">
      {#if fx.slots[selectedSlotIndex]}
        <FxSlot slot={fx.slots[selectedSlotIndex]} index={selectedSlotIndex} />
      {:else}
        <div class="empty-state">No FX Slot Selected</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .fx-container {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 500px;
    max-height: 65vh;
    background: #0b0d12;
    border: 1px solid #1e293b;
    border-radius: 8px;
    overflow: hidden;
    font-family: 'Inter', sans-serif;
    box-shadow: 0 12px 48px rgba(0,0,0,0.4);
  }

  .fx-workspace {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: #080a0f;
  }
  
  .fx-workspace-inner {
    flex: 1;
    min-height: 0;
    padding: 1rem;
    box-sizing: border-box;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
  }

  .fx-sidebar {
    width: 260px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: #12151c;
    border-right: 1px solid #1e293b;
  }

  .fx-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1rem;
    background: #1f2937;
    border-bottom: 1px solid #1e293b;
  }

  .title-left { font-size: 1.1rem; font-weight: 800; color: #f8fafc; margin: 0; }
  .ch-name { color: #e2e8f0; }
  .header-title-group { display: flex; align-items: center; }
  .nav-group { display: flex; gap: 0.25rem; }

  .nav-icon-btn {
    background: #374151; border: none; color: #94a3b8; padding: 0.4rem;
    border-radius: 4px; cursor: pointer; transition: 0.2s; display: flex;
    align-items: center; justify-content: center;
  }
  .nav-icon-btn:hover:not(:disabled) { background: #4b5563; color: #f8fafc; }
  .nav-icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .fx-slot-list {
    display: flex; flex-direction: column; flex: 1;
    background: #0f1115; overflow-y: auto;
  }
  .fx-slot-list::-webkit-scrollbar { width: 0; }

  .fx-slot-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border: none; border-bottom: 1px solid #1e293b;
    background: transparent; cursor: pointer; transition: 0.1s; outline: none;
  }
  .fx-slot-row:hover { background: rgba(59,130,246,0.05); }
  .fx-slot-row.active { background: #1f2937; border-left: 3px solid #3b82f6; }

  .fx-slot-name { display: flex; flex-direction: column; gap: 0.3rem; text-align: left; }
  .w-id { color: #94a3b8; font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 800; }
  .w-type { color: #64748b; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; }
  .fx-slot-row.active .w-id, .fx-slot-row.active .w-type { color: #f8fafc; }

  .empty-state {
    display: flex; align-items: center; justify-content: center;
    width: 100%; height: 100%; color: #475569;
    font-family: 'JetBrains Mono', monospace; font-size: 0.9rem;
  }

  .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>