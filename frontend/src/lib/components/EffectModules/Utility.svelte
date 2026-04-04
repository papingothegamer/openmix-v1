<script>
  import GraphicEQ from './GraphicEQ.svelte';
  export let params = {};
  export let preset = 'Empty'; // used by dynamic loader
  export let onParamChange = (key, value) => {};
  export let slotIndex = 0; // used by dynamic loader
</script>

<div class="effect-module utility">
  {#if preset === 'Graphic EQ'}
    <GraphicEQ {params} {onParamChange} {preset} {slotIndex} />
  {:else}
    <div class="rack-metal">
      <div class="fx-header">
        <span class="brand">OPENMIX</span>
        <span class="model">UTILITY MODULE</span>
      </div>
      <div class="utility-empty">
        <div class="empty-msg">
          <h3>SYSTEM UTILITY</h3>
          <p>No active effect processor loaded in this slot.</p>
        </div>
      </div>
    </div>
  {/if}
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

  .utility-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .empty-msg { text-align: center; }
  .empty-msg h3 { color: #475569; letter-spacing: 4px; font-size: 1rem; margin-bottom: 0.5rem; }
  .empty-msg p { color: #334155; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; }
</style>
