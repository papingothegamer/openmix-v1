<script>
  import { createEventDispatcher } from 'svelte';
  export let channelIndex = 1;
  export let currentName = '';
  export let currentIcon = 'icon_01';
  export let currentColor = '#3b82f6';
  
  const dispatch = createEventDispatcher();
  
  // Available mapped SVG native icons (from convert-icons.js pipeline)
  const iconsList = Array.from({length: 74}, (_, i) => `icon_${String(i+1).padStart(2, '0')}`);
  
  const colorsList = ['#3f3f46', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f8fafc'];

  function save() {
    dispatch('save', { name: currentName, iconType: currentIcon, color: currentColor });
  }

  function close() {
    dispatch('close');
  }
</script>

<div class="modal-backdrop">
  <div class="modal-content">
    <h3>Scribble Strip: CH {channelIndex}</h3>
    
    <div class="form-group">
      <label for="ch-name">Channel Name (max 8 char)</label>
      <input id="ch-name" type="text" bind:value={currentName} maxlength="8" placeholder="e.g. Lead Vox" />
    </div>

    <div class="form-group">
      <p class="label" style="font-weight: 600; margin-bottom: 0.5rem; font-size: 0.8rem;">Select Icon Mapping</p>
      <div class="icon-grid">
        {#each iconsList as icName}
          <button 
             class="icon-btn" 
             class:selected={currentIcon === icName} 
             on:click={() => currentIcon = icName}
           >
             <img src="/icons-bmp/{icName}.bmp" alt="{icName}" style="width: 28px; height: 28px; object-fit: contain; image-rendering: pixelated; border-radius: 2px;" />
          </button>
        {/each}
      </div>
    </div>
    
    <div class="form-group">
      <p class="label" style="font-weight: 600; margin-bottom: 0.5rem; font-size: 0.8rem;">Strip Highlight Color</p>
      <div class="color-grid">
         {#each colorsList as cName}
           <button class="color-btn" aria-label="Select color {cName}" class:selected={currentColor === cName} style="background-color: {cName};" on:click={() => currentColor = cName}></button>
         {/each}
      </div>
    </div>

    <div class="actions">
      <button class="btn cancel" on:click={close}>Cancel</button>
      <button class="btn primary" on:click={save}>Apply to Rack</button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    display: flex; justify-content: center; align-items: center; z-index: 999;
  }
  .modal-content {
    background: #18181b; border: 1px solid #27272a; border-radius: 12px;
    padding: 1.5rem; width: 350px; box-shadow: 0 12px 32px rgba(0,0,0,0.5);
    display: flex; flex-direction: column; gap: 1rem;
  }
  h3 { margin: 0; color: #f8fafc; font-size: 1.25rem; }
  
  .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
  label { font-size: 0.8rem; font-weight: 600; color: #a1a1aa; }
  input { background: #000; border: 1px solid #3f3f46; color: #fff; padding: 0.6rem; border-radius: 6px; outline: none; transition: border-color 0.2s; font-family: inherit; }
  input:focus { border-color: #3b82f6; }
  
  .icon-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.4rem; max-height: 200px; overflow-y: auto; padding: 0.5rem; background: #000; border-radius: 6px; border: 1px solid #27272a; }
  .icon-btn { background: #27272a; border: 2px solid transparent; padding: 0.5rem; border-radius: 6px; cursor: pointer; transition: all 0.2s; display: flex; justify-content: center; align-items: center; }
  .icon-btn:hover { background: #3f3f46; }
  .icon-btn.selected { background: rgba(59,130,246,0.2); border-color: #3b82f6; }
  
  .color-grid { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .color-btn { width: 32px; height: 32px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.1s; }
  .color-btn:hover { transform: scale(1.1); }
  .color-btn.selected { border: 3px solid #000; outline: 2px solid #fff; box-shadow: 0 0 8px rgba(255,255,255,0.5); }
  
  .actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
  .btn { padding: 0.6rem 1rem; border-radius: 6px; font-weight: 600; border: none; cursor: pointer; transition: 0.2s; }
  .cancel { background: transparent; color: #a1a1aa; }
  .cancel:hover { background: rgba(255,255,255,0.05); color: #fff; }
  .primary { background: #3b82f6; color: #fff; }
  .primary:hover { background: #2563eb; }
</style>
