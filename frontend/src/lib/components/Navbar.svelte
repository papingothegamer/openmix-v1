<script>
  import { isConnected, syncProgress, mixerState } from '../socket';
  import { UploadCloud, DownloadCloud, Maximize, Tag, Headphones, Link2, Loader2, RotateCcw } from 'lucide-svelte';

  let {
    activeRole = null,
    scribbleEditMode = false,
    monitorMode = false,
    outputLinkMode = false,
    fineMode = false,
    selectedChannel = null,
    onExitRole = () => {},
    onFileLoad = () => {},
    onForceRefresh = () => {},
    onExportScene = () => {},
    onScribbleEdit = () => {},
    onToggleMonitor = () => {},
    onToggleOutputLink = () => {},
    onToggleFineMode = () => {}
  } = $props();

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else if (document.exitFullscreen) document.exitFullscreen();
  }
</script>

<header class="glass-header">
  <div class="logo"><span class="highlight">Open</span>Mix</div>
  <div class="toolbar">
    <div class="status-indicator" class:connected={$isConnected}>
      <div class="ping-dot" class:online={$mixerState.hasSyncedOnce}></div>
      <span>
        {#if !$isConnected}
          Server Offline
        {:else if !$mixerState.hasSyncedOnce}
          Mixer Standby
        {:else}
          Mixer Online
        {/if}
      </span>
    </div>

    {#if $syncProgress.active && $mixerState?.hasSyncedOnce}
      <div class="sync-status">
        <Loader2 class="spin" size={14} />
        <span>Syncing {$syncProgress.progress}%</span>
      </div>
    {/if}
    
    {#if activeRole === 'foh'}
      <button class="btn-sm" class:active={monitorMode} on:click={onToggleMonitor} title="Monitor/Phones Settings">
        <Headphones size={14} /> Monitor
      </button>
      
      {#if typeof selectedChannel === 'string' && selectedChannel.startsWith('bus_')}
        <button class="btn-sm" class:active={outputLinkMode} on:click={onToggleOutputLink} title="Link Stereo Output">
          <Link2 size={14} /> Link Stereo
        </button>
      {/if}

      <button class="btn-sm scribble-btn" class:active={scribbleEditMode} on:click={onScribbleEdit}>
        <Tag size={14} /> Scribble Strips
      </button>
      <button class="btn-sm" class:active={fineMode} on:click={onToggleFineMode} title="Toggle Fine Fader Control">
        <span style="font-weight: 800;">FINE</span>
      </button>
      <button class="btn-sm" on:click={onForceRefresh} title="Force Refresh from Hardware">
        <RotateCcw size={14} class={$syncProgress.active ? 'spin' : ''} /> Refresh
      </button>
      <button class="btn-sm export-btn" on:click={onExportScene} title="Download Scene as JSON">
        <DownloadCloud size={14} /> Export
      </button>
      <label class="btn-sm upload-btn" title="Import Scene from JSON">
        <UploadCloud size={14} /> Import
        <input type="file" accept=".json" on:change={onFileLoad} style="display: none;" />
      </label>
      <button class="btn-sm" on:click={toggleFullscreen} title="Toggle Fullscreen UI"><Maximize size={14} /></button>
      <button class="btn-sm exit-btn" on:click={onExitRole}>Exit Role</button>
    {/if}
    
    {#if activeRole === 'musician'}
      <button class="btn-sm" on:click={onExitRole}>Exit Monitor Mix</button>
    {/if}
  </div>
</header>

<style>
  .glass-header {
    background: #0e0e0e;
    border-bottom: 1px solid #252525;
    padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center; z-index: 100;
  }
  .logo { font-size: 1.25rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
  .highlight { color: #eab308; }

  .toolbar { display: flex; align-items: center; gap: 1rem; }
  .status-indicator { display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.75rem; background: rgba(0,0,0,0.4); padding: 0.4rem 0.8rem; border-radius: 999px; border: 1px solid #252525; }
  .status-indicator.connected { color: #10b981; }
  .ping-dot { width: 8px; height: 8px; border-radius: 50%; background-color: #555; }
  .status-indicator.connected .ping-dot { background-color: #eab308; }
  .status-indicator.connected .ping-dot.online { background-color: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6); }

  .btn-sm { background: transparent; color: #d4d4d4; border: 1px solid #333;
    padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; transition: 0.15s; font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; font-weight: 600;
  }
  .btn-sm:hover { background: #1e1e1e; color: #fafafa; }
  .upload-btn { color: #facc15; border-color: #713f12;
    background: rgba(234, 179, 8, 0.1); }
  .upload-btn:hover { background: rgba(234, 179, 8, 0.2); }
  .export-btn { color: #a78bfa;
    border-color: #4c1d95; background: rgba(139, 92, 246, 0.1); }
  .export-btn:hover { background: rgba(139, 92, 246, 0.2);
  }
  .scribble-btn { color: #34d399; border-color: #064e3b; background: rgba(16, 185, 129, 0.1);
  }
  .scribble-btn:hover { background: rgba(16, 185, 129, 0.2); }
  .scribble-btn.active { background: #047857; color: white;
  }
  .btn-sm.active:not(.scribble-btn) { background: #eab308; color: #000; border-color: #facc15; box-shadow: 0 0 10px rgba(234, 179, 8, 0.4); }
  .exit-btn { border-color: #7f1d1d; color: #fca5a5; background: rgba(239, 68, 68, 0.1); }
  .exit-btn:hover { background: #ef4444; color: white; }

  .sync-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    font-weight: 700;
    color: #eab308;
    background: rgba(234, 179, 8, 0.1);
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    border: 1px solid rgba(234, 179, 8, 0.2);
    animation: pulse-yellow 2s infinite;
  }

  @keyframes pulse-yellow {
    0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
    70% { box-shadow: 0 0 0 8px rgba(234, 179, 8, 0); }
    100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
  }

  :global(.spin) {
    animation: spin 1.5s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
