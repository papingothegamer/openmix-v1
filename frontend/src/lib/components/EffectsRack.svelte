<script>
  import { onDestroy } from 'svelte';
  import FxSlot from './FxSlot.svelte';
  import fxState, { ensureFxSlots } from '../fxState.js';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';

  export let config = { fx: 4 };
  export let scribbles = {};
  
  /** @type {string | null} */
  export let selectedChannel = null;
  


  // Ensure store has correct number of slots, re-initialize whenever config.fx changes
  $: ensureFxSlots(config.fx || 4);

  let fx = { slots: [] };
  const unsub = fxState.subscribe(v => fx = v);
  onDestroy(unsub);

  export let selectedSlotIndex = 0;

  const presetShortNames = {
    'Empty': 'EMPTY',
    'Vintage Room': 'VIN ROOM',
    'Hall Reverb': 'HALL RVB',
    'Stereo Delay': 'ST DELAY',
    'Stereo Chorus': 'ST CHORUS'
  };

  // Note: All OSC emission for FX bypass/level/params is handled by
  // setSlot() in fxState.js. No additional reactive OSC push needed here.
</script>

<div class="fx-container fade-in">
  <div class="fx-sidebar">
    <div class="fx-header">
      <div class="header-title-group">
        <h2 class="title-left">FX: <span class="ch-name">{selectedChannel ? (scribbles[selectedChannel]?.name || selectedChannel.toUpperCase()) : 'SELECT'}</span></h2>
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
    min-height: 480px;
    max-height: 75vh;
    background: #0a0a0a;
    border: 1px solid #252525;
    border-radius: 8px;
    overflow: hidden;
    font-family: 'Inter', sans-serif;
    box-shadow: 0 12px 48px rgba(0,0,0,0.4);
  }

  @media (max-width: 768px) {
    .fx-container {
      flex-direction: column;
      height: auto;
      max-height: none;
    }
    .fx-sidebar {
      width: 100% !important;
      border-right: none !important;
      border-bottom: 1px solid #252525;
      height: auto !important;
    }
    .fx-slot-list {
      flex-direction: row !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      height: 60px;
    }
    .fx-slot-row {
      border-bottom: none !important;
      border-right: 1px solid #252525;
      padding: 0.5rem 1rem !important;
      white-space: nowrap;
    }
    .fx-slot-row.active {
      border-left: none !important;
      border-bottom: 3px solid #eab308;
    }
  }

  .fx-workspace {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: #0c0c0c;
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
    background: #141414;
    border-right: 1px solid #252525;
  }

  .fx-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1rem;
    background: #222222;
    border-bottom: 1px solid #252525;
  }

  .title-left { font-size: 1.1rem; font-weight: 800; color: #fafafa; margin: 0; }
  .ch-name { color: #e5e5e5; }
  .header-title-group { display: flex; align-items: center; }
 
  .fx-slot-list {
    display: flex; flex-direction: column; flex: 1;
    background: #111111; overflow-y: auto;
  }
  .fx-slot-list::-webkit-scrollbar { width: 0; }

  .fx-slot-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border: none; border-bottom: 1px solid #252525;
    background: transparent; cursor: pointer; transition: 0.1s; outline: none;
  }
  .fx-slot-row:hover { background: rgba(234,179,8,0.05); }
  .fx-slot-row.active { background: #222222; border-left: 3px solid #eab308; }

  .fx-slot-name { display: flex; flex-direction: column; gap: 0.3rem; text-align: left; }
  .w-id { color: #999999; font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 800; }
  .w-type { color: #777777; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; }
  .fx-slot-row.active .w-id, .fx-slot-row.active .w-type { color: #fafafa; }

  .empty-state {
    display: flex; align-items: center; justify-content: center;
    width: 100%; height: 100%; color: #666666;
    font-family: 'JetBrains Mono', monospace; font-size: 0.9rem;
  }

  .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>