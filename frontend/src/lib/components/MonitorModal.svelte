<script>
  import { X, Headphones } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';

  export let currentSource = 'LR';
  export let sources = [];
  export let show = false;

  const dispatch = createEventDispatcher();

  function select(e) {
    dispatch('select', e.target.value);
  }

  function close() {
    dispatch('close');
  }
</script>

{#if show}
  <div class="modal-backdrop" on:click={close}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <div class="title-left">
          <Headphones size={20} class="text-blue" />
          <h3>Monitor Source</h3>
        </div>
        <button class="close-btn" on:click={close} aria-label="Close"><X size={20} /></button>
      </div>

      <div class="modal-body">
        <p class="section-hint">Select the audio source for the physical PHONES / MONITOR output.</p>
        
        <div class="form-group">
          <label for="monitor-source">Available Sources</label>
          <div class="select-wrapper">
            <select id="monitor-source" value={currentSource} on:change={select}>
              {#each sources as src}
                <option value={src.id}>{src.name}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }

  .modal-content {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 16px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
    overflow: hidden;
    animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes modalPop {
    from { opacity: 0; transform: scale(0.9) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #1e293b;
    background: #111827;
  }

  .title-left { display: flex; align-items: center; gap: 0.75rem; }
  .title-left h3 { margin: 0; font-size: 1.1rem; color: #f8fafc; font-weight: 700; }
  .text-blue { color: #3b82f6; }
  .close-btn { background: transparent; border: none; color: #64748b; cursor: pointer; transition: 0.2s; }
  .close-btn:hover { color: #f8fafc; }
  
  .modal-body { padding: 2rem 1.5rem; }
  .section-hint { font-size: 0.85rem; color: #94a3b8; margin-bottom: 2rem; line-height: 1.5; }

  .form-group { display: flex; flex-direction: column; gap: 0.75rem; }
  .form-group label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }

  .select-wrapper { position: relative; }
  select {
    width: 100%;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 0.85rem 1rem;
    color: #f8fafc;
    font-size: 0.95rem;
    cursor: pointer;
    appearance: none;
    transition: 0.2s;
  }
  select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
  
  .select-wrapper::after {
    content: "▼";
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    font-size: 0.7rem;
    color: #64748b;
  }
</style>
