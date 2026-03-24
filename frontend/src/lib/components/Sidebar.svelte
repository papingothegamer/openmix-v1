<script>
  export let activeTab = 'mixer';
  export let activeView = 'inputs';
  export let currentPage = 0;
  export let totalPages = 1;
  export let stripsPerPage = 8;
  export let onPageChange = (p) => {};
  export let onViewChange = (v) => {};
  export let onStripsChange = (n) => {};
  export let onResetEq = () => {};

  function prev() { if (currentPage > 0) onPageChange(currentPage - 1); }
  function next() { if (currentPage < totalPages - 1) onPageChange(currentPage + 1); }
</script>

<aside class="sidebar fade-in">
  {#if activeTab === 'mixer'}
    <div class="section">
      <h4>Layers</h4>
      <button class="layer-btn" class:active={activeView === 'inputs'} on:click={() => onViewChange('inputs')}>INPUTS</button>
      <button class="layer-btn" class:active={activeView === 'outputs'} on:click={() => onViewChange('outputs')}>OUTPUTS</button>
      <button class="layer-btn" class:active={activeView === 'dcas'} on:click={() => onViewChange('dcas')}>DCAs</button>
    </div>

    <div class="section compact">
      <h4>Strips</h4>
      <div class="strips-control">
        <button class="strip-adj" on:click={() => { if (stripsPerPage > 1) onStripsChange(stripsPerPage - 1); }}>−</button>
        <span class="strip-count">{stripsPerPage}</span>
        <button class="strip-adj" on:click={() => onStripsChange(stripsPerPage + 1)}>+</button>
      </div>
    </div>

    <div class="spacer"></div>

    {#if totalPages > 1}
      <div class="section compact">
        <h4>Bank</h4>
        <button class="page-btn" disabled={currentPage === 0} on:click={prev}>◀</button>
        <div class="page-count">{currentPage + 1} / {totalPages}</div>
        <button class="page-btn" disabled={currentPage >= totalPages - 1} on:click={next}>▶</button>
      </div>
    {/if}

  {:else if activeTab === 'eq'}
    <div class="section">
      <h4>EQ</h4>
      <button class="layer-btn" on:click={onResetEq}>Reset Flat</button>
      <button class="layer-btn">Bypass</button>
      <button class="layer-btn">Copy</button>
      <button class="layer-btn">Paste</button>
    </div>

  {:else if activeTab === 'channel'}
    <div class="section">
      <h4>Channel</h4>
      <button class="layer-btn">Gate</button>
      <button class="layer-btn">Comp</button>
      <button class="layer-btn">Preamp</button>
      <button class="layer-btn">Phase Inv</button>
    </div>

  {:else if activeTab === 'sends'}
    <div class="section">
      <h4>Sends</h4>
      <button class="layer-btn">Pre/Post</button>
      <button class="layer-btn">Copy</button>
      <button class="layer-btn">Paste</button>
    </div>

  {:else if activeTab === 'fx'}
    <div class="section">
      <h4>FX</h4>
      <button class="layer-btn">Reverb</button>
      <button class="layer-btn">Delay</button>
      <button class="layer-btn">Chorus</button>
      <button class="layer-btn">Tap</button>
    </div>

  {:else if activeTab === 'routing'}
    <div class="section">
      <h4>Routing</h4>
      <button class="layer-btn">USB/DAW</button>
      <button class="layer-btn">P16</button>
      <button class="layer-btn">Patch</button>
    </div>

  {:else}
    <div class="section">
      <h4>{activeTab.toUpperCase()}</h4>
      <p class="muted">Tools pending.</p>
    </div>
  {/if}
</aside>

<style>
  .sidebar { width: 120px; background: #0b0f19; border-left: 1px solid #1e293b; display: flex; flex-direction: column; padding: 0.75rem 0.5rem; gap: 0.75rem; color: #e2e8f0; height: 100%; box-sizing: border-box; flex-shrink: 0; overflow-y: auto; }
  .sidebar::-webkit-scrollbar { width: 0; }
  h4 { margin: 0 0 0.5rem 0; font-size: 0.65rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; text-align: center; }
  
  .section { display: flex; flex-direction: column; gap: 0.35rem; }
  .section.compact { gap: 0.3rem; }
  .layer-btn { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 0.5rem 0.4rem; border-radius: 4px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-size: 0.7rem; width: 100%; text-align: center; }
  .layer-btn:hover { background: #334155; }
  .layer-btn.active { background: #3b82f6; color: white; border-color: #60a5fa; }

  .spacer { flex: 1; }

  .strips-control { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
  .strip-adj { width: 26px; height: 26px; border-radius: 4px; background: #334155; color: #e2e8f0; border: 1px solid #475569; font-size: 1rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.15s; }
  .strip-adj:hover { background: #3b82f6; border-color: #60a5fa; color: #fff; }
  .strip-count { font-family: 'JetBrains Mono', monospace; font-size: 1rem; font-weight: 800; color: #f8fafc; min-width: 20px; text-align: center; }

  .page-btn { background: #334155; color: white; border: 1px solid #475569; padding: 0.5rem; border-radius: 4px; font-weight: 800; cursor: pointer; width: 100%; transition: 0.15s; font-size: 0.75rem; }
  .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .page-btn:not(:disabled):hover { background: #475569; }
  .page-count { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; font-weight: bold; color: #94a3b8; text-align: center; padding: 0.2rem 0; }

  .muted { font-size: 0.65rem; color: #475569; text-align: center; margin: 0; }

  .fade-in { animation: fadeIn 0.3s ease forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
</style>
