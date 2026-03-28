<script>
  import { isConnected } from '../socket';
  import { UploadCloud, DownloadCloud, Maximize, Tag, Headphones, Link2 } from 'lucide-svelte';

  export let activeRole = null;
  export let scribbleEditMode = false;
  export let monitorMode = false;
  export let outputLinkMode = false;

  /** @type {string | null} */
  export let selectedChannel = null;
  
  export let onExitRole = () => {};
  export let onFileLoad = () => {};

  export let onExportScene = () => {};
  export let onScribbleEdit = () => {};

  export let onToggleMonitor = () => {};
  export let onToggleOutputLink = () => {};

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else if (document.exitFullscreen) document.exitFullscreen();
  }
</script>

<header class="glass-header">
  <div class="logo"><span class="highlight">Open</span>Mix</div>
  <div class="toolbar">
    <div class="status-indicator" class:connected={$isConnected}>
      <div class="ping-dot"></div>
      <span>{$isConnected ? 'Connected' : 'Offline'}</span>
    </div>
    
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
      <button class="btn-sm export-btn" on:click={onExportScene}>
        <DownloadCloud size={14} /> Export Scene
      </button>
      <label class="btn-sm upload-btn">
        <UploadCloud size={14} /> Load JSON
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
    background: #020617;
    border-bottom: 1px solid #1e293b;
    padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center; z-index: 100;
  }
  .logo { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.5px; }
  .highlight { color: #3b82f6; }

  .toolbar { display: flex; align-items: center; gap: 1rem; }
  .status-indicator { display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.75rem; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 999px; border: 1px solid #1e293b; }
  .status-indicator.connected { color: #10b981; }
  .ping-dot { width: 8px; height: 8px; border-radius: 50%; background-color: #ef4444; }
  .connected .ping-dot { background-color: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6); }

  .btn-sm { background: transparent; color: #cbd5e1; border: 1px solid #334155;
    padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; transition: 0.15s; font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; font-weight: 600;
  }
  .btn-sm:hover { background: #1e293b; color: #f8fafc; }
  .upload-btn { color: #38bdf8; border-color: #0c4a6e;
    background: rgba(14, 165, 233, 0.1); }
  .upload-btn:hover { background: rgba(14, 165, 233, 0.2); }
  .export-btn { color: #a78bfa;
    border-color: #4c1d95; background: rgba(139, 92, 246, 0.1); }
  .export-btn:hover { background: rgba(139, 92, 246, 0.2);
  }
  .scribble-btn { color: #34d399; border-color: #064e3b; background: rgba(16, 185, 129, 0.1);
  }
  .scribble-btn:hover { background: rgba(16, 185, 129, 0.2); }
  .scribble-btn.active { background: #047857; color: white;
  }
  .exit-btn { border-color: #7f1d1d; color: #fca5a5; background: rgba(239, 68, 68, 0.1); }
  .exit-btn:hover { background: #ef4444; color: white; }
</style>