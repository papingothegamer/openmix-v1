<script>
  import { isConnected } from '../socket';
  import { UploadCloud, DownloadCloud, Maximize, Edit3 } from 'lucide-svelte';

  export let activeRole = null;
  export let onExitRole = () => {};
  export let onFileLoad = () => {};
  export let onExportScene = () => {};
  export let onScribbleEdit = () => {};
  
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
      <button class="btn-sm scribble-btn" on:click={onScribbleEdit}>
        <Edit3 size={14} /> Scribble Strips
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
    background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center; z-index: 100;
  }
  .logo { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.5px; }
  .highlight { color: #3b82f6; }

  .toolbar { display: flex; align-items: center; gap: 1rem; }
  .status-indicator { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 999px; }
  .status-indicator.connected { color: #10b981; }
  .ping-dot { width: 8px; height: 8px; border-radius: 50%; background-color: #ef4444; }
  .connected .ping-dot { background-color: #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.6); }

  .btn-sm { background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 0.5rem 0.8rem; border-radius: 6px; cursor: pointer; transition: background 0.2s; font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
  .btn-sm:hover { background: rgba(255,255,255,0.2); }
  .upload-btn { background: #3b82f6; border-color: #3b82f6; color: white; box-shadow: 0 2px 8px rgba(59,130,246,0.3); }
  .upload-btn:hover { background: #2563eb; }
  .export-btn { background: #8b5cf6; border-color: #8b5cf6; color: white; box-shadow: 0 2px 8px rgba(139,92,246,0.3); }
  .export-btn:hover { background: #7c3aed; }
  .scribble-btn { background: #10b981; border-color: #10b981; color: white; box-shadow: 0 2px 8px rgba(16,185,129,0.3); }
  .scribble-btn:hover { background: #059669; }
  .exit-btn { border-color: #ef4444; color: #fca5a5; }
  .exit-btn:hover { background: #ef4444; color: white; }
</style>
