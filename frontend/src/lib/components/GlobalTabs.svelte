<script>
  export let activeTab = 'mixer';
  export let onTabSwitch = (t) => {};
  export let disabledTabs = [];

  const fohTabs = [
    { id: 'mixer', label: 'MIXER' },
    { id: 'channel', label: 'CHANNEL' },
    { id: 'eq', label: 'EQ' },
    { id: 'sends', label: 'SENDS' },
    { id: 'fx', label: 'FX' },
    { id: 'routing', label: 'ROUTING' }
  ];
  
  function setTab(e) {
      if (disabledTabs.includes(e)) return;
      activeTab = e;
      onTabSwitch(e);
  }
</script>

<nav class="global-tabs-bar">
  {#each fohTabs as tab}
    <button 
      class="tab-btn" 
      class:active={activeTab === tab.id} 
      class:disabled={disabledTabs.includes(tab.id)}
      disabled={disabledTabs.includes(tab.id)}
      on:click={() => setTab(tab.id)}
    >{tab.label}</button>
  {/each}
</nav>

<style>
  .global-tabs-bar {
    display: flex; gap: 2px; background: #0b0f19; padding: 0.5rem 1rem 0 1rem;
    border-bottom: 1px solid #1e293b; align-items: flex-end; z-index: 50;
  }
  .tab-btn {
    background: transparent; border: none; padding: 0.6rem 1.5rem; color: #64748b; font-weight: 800;
    font-size: 0.8rem; letter-spacing: 0.5px; border-top-left-radius: 8px; border-top-right-radius: 8px;
    cursor: pointer; transition: all 0.2s ease; border-bottom: 3px solid transparent;
  }
  .tab-btn:hover:not(:disabled) { color: #cbd5e1; background: rgba(30,41,59,0.5); }
  .tab-btn.active { color: #f8fafc; background: #1e293b; border-bottom-color: #3b82f6; }
  .tab-btn:disabled { opacity: 0.25; cursor: not-allowed; }
</style>
