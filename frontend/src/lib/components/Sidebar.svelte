<script>
  export let activeTab = 'mixer';
  export let activeView = 'inputs'; // 'inputs', 'outputs', 'dcas'
  export let currentPage = 0;
  export let totalPages = 1;
  export let onPageChange = (p) => {};
  export let onViewChange = (v) => {};
  export let onResetEq = () => {};

  function prev() { if (currentPage > 0) onPageChange(currentPage - 1); }
  function next() { if (currentPage < totalPages - 1) onPageChange(currentPage + 1); }
</script>

<aside class="sidebar fade-in">
  {#if activeTab === 'mixer'}
    <div class="routing-section">
      <h4>Routing Layers</h4>
      <button class="layer-btn" class:active={activeView === 'inputs'} on:click={() => onViewChange('inputs')}>INPUTS</button>
      <button class="layer-btn" class:active={activeView === 'outputs'} on:click={() => onViewChange('outputs')}>OUTPUTS</button>
      <button class="layer-btn" class:active={activeView === 'dcas'} on:click={() => onViewChange('dcas')}>DCAs</button>
    </div>

    <div class="spacer"></div>

    {#if totalPages > 1}
      <div class="pagination-section">
        <h4>Bank Control</h4>
        <button class="page-btn" disabled={currentPage === 0} on:click={prev}>◀ Prev</button>
        <div class="page-count">{currentPage + 1} / {totalPages}</div>
        <button class="page-btn" disabled={currentPage >= totalPages - 1} on:click={next}>Next ▶</button>
      </div>
    {/if}
  {:else if activeTab === 'eq'}
    <div class="routing-section">
      <h4>EQ Controls</h4>
      <button class="layer-btn">RTA Overlay</button>
      <button class="layer-btn" on:click={onResetEq}>Reset Flat</button>
    </div>
  {:else if activeTab === 'sends'}
    <div class="routing-section">
      <h4>Sends Tap</h4>
      <button class="layer-btn">Toggle Pre/Post</button>
    </div>
  {:else}
    <div class="routing-section">
      <h4>{activeTab.toUpperCase()} Tools</h4>
      <p style="font-size:0.75rem; color:#94a3b8; text-align:center;">Macro tools pending.</p>
    </div>
  {/if}
</aside>

<style>
  .sidebar { width: 140px; background: #0b0f19; border-left: 1px solid #1e293b; display: flex; flex-direction: column; padding: 1.5rem 1rem; color: #e2e8f0; height: 100%; box-sizing: border-box; flex-shrink: 0; box-shadow: -4px 0 24px rgba(0,0,0,0.5); }
  h4 { margin: 0 0 1rem 0; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
  
  .routing-section { display: flex; flex-direction: column; gap: 0.6rem; }
  .layer-btn { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 0.8rem; border-radius: 6px; font-weight: 800; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); font-size: 0.8rem; width: 100%; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
  .layer-btn:hover { background: #334155; transform: translateY(-2px); }
  .layer-btn:active { transform: translateY(0); }
  .layer-btn.active { background: #3b82f6; color: white; border-color: #60a5fa; box-shadow: 0 0 16px rgba(59,130,246,0.3); transform: translateY(-2px); }

  .spacer { flex: 1; }

  .pagination-section { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; border: 1px solid #1e293b; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); }
  .pagination-section h4 { margin-bottom: 0.5rem; }
  .page-btn { background: #334155; color: white; border: 1px solid #475569; padding: 0.8rem; border-radius: 6px; font-weight: 800; cursor: pointer; width: 100%; transition: all 0.2s; font-size: 0.8rem; }
  .page-btn:disabled { opacity: 0.4; cursor: not-allowed; border-color: #334155; }
  .page-btn:not(:disabled):hover { background: #475569; border-color: #94a3b8; }
  .page-count { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; font-weight: bold; color: #94a3b8; margin: 0.4rem 0; }

  .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
</style>
