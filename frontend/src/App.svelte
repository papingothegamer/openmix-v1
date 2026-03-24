<script>
  import { onMount } from 'svelte';
  import { socket, isConnected, mixerState, rawMeters, meterLight, setOsc } from './lib/socket';
  import ChannelStrip from './lib/components/ChannelStrip.svelte';
  import Navbar from './lib/components/Navbar.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import ScribbleEditor from './lib/components/ScribbleEditor.svelte';
  import GlobalTabs from './lib/components/GlobalTabs.svelte';
  import EqEditor from './lib/components/EqEditor.svelte';
  import { MixerPresets, PredefinedMixersArray } from './lib/mixerPresets';
  
  let fohMeters = new Array(16).fill(-60);
  
  // Navigation / Focus State
  let activeRole = null; // 'foh' or null
  let activeTab = 'mixer'; // 'mixer', 'channel', 'eq', 'sends', 'routing', 'fx'
  let activeView = 'inputs'; // 'inputs', 'outputs', 'dcas'
  let currentPage = 1;
  let channelsPerPage = 8;
  
  // Scribble Strip / Global Selectors
  let scribbleEditMode = false;
  let editingChannel = null; // String ID like 'in_1', 'main_LR'
  let selectedChannel = 'in_1';

  function cycleChannel(dir) {
    if (!selectedChannel || selectedChannel === 'main_LR') return;
    const [type, numStr] = selectedChannel.split('_');
    let num = parseInt(numStr, 10) + dir;
    
    if (type === 'in' && num >= 1 && num <= config.inputs) {
      selectedChannel = `in_${num}`;
    } else if (type === 'out' && num >= 1 && num <= config.outputs) {
      selectedChannel = `out_${num}`;
    } else if (type === 'dca' && num >= 1 && num <= config.dcas) {
      selectedChannel = `dca_${num}`;
    }
  }

  let requiresSetup = localStorage.getItem('openmix_setup') !== 'true';
  let config = { inputs: 16, outputs: 6, dcas: 8, fx: 4, presetId: 'CUSTOM' };
  
  // Scribble state array tracking
  let scribbles = {}; 
  
  // Phase 13 Parametric Nodes Reference
  let eqComponent;

  onMount(() => {
    socket.connect();
    // Load local configuration
    const saved = localStorage.getItem('openmix_config');
    if (saved) config = JSON.parse(saved);

    return () => socket.disconnect();
  });

  function completeSetup() {
    scribbles = {}; // Flush constraints from older layouts completely
    localStorage.setItem('openmix_setup', 'true');
    localStorage.setItem('openmix_config', JSON.stringify(config));
    requiresSetup = false;
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = ev.target.result;
        const text = typeof result === 'string' ? result : new TextDecoder().decode(result);
        const json = JSON.parse(text);
        socket.emit('pushState', json, (res) => {
          if (res && res.error) alert('Error: ' + res.error);
          else alert(`Session Loaded! (${res ? res.sentCount : 'Unknown'} paths successfully dispatched to mixer)`);
        });
      } catch(err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  }

  // Derived channels layout arrays depending on user config
  $: presetHardLinks = config.presetId !== 'CUSTOM' ? (MixerPresets[config.presetId]?.hardLinks?.inputs || {}) : {};
  $: inputChannels = Array.from({length: config.inputs}, (_, i) => i + 1).filter(ch => !presetHardLinks[ch]?.hidden);
  $: outputChannels = Array.from({length: config.outputs}, (_, i) => i + 1);
  $: dcaChannels = Array.from({length: config.dcas || 8}, (_, i) => i + 1);
  
  $: currentChannels = activeView === 'inputs' ? inputChannels : (activeView === 'outputs' ? outputChannels : dcaChannels);
  $: fohMeters = $rawMeters || [];

  // Fluid Pagination Logic
  let containerWidth = 0;
  const STRIP_WIDTH = 90; // Standard layout size
  
  $: channelsPerPage = containerWidth > 0 ? Math.floor(containerWidth / STRIP_WIDTH) : currentChannels.length;
  $: totalPages = Math.ceil(currentChannels.length / Math.max(1, channelsPerPage));
  $: displayedChannels = currentChannels.slice(currentPage * channelsPerPage, (currentPage + 1) * channelsPerPage);

  // Watch for layer switches to reset bank
  $: { if (activeView) currentPage = 0; }
  
  function applyPreset() {
      if (config.presetId !== 'CUSTOM') {
         const preset = MixerPresets[config.presetId];
         if (preset) {
            config.inputs = preset.inputs;
            config.outputs = preset.outputs;
            config.dcas = preset.dcas || 8;
            config.fx = preset.fx || 4;
         }
      }
  }

  function handleSaveScribble(e) {
      scribbles[editingChannel] = e.detail;
      // Triggers reactive update mapping on strips
      scribbles = {...scribbles}; 
      editingChannel = null;
  }
</script>

<main class="app-container" class:scribble-mode={scribbleEditMode}>
      <Navbar {activeRole} onExitRole={() => activeRole = null} onFileLoad={handleFileUpload} onScribbleEdit={() => scribbleEditMode = !scribbleEditMode} />

  <div class="content-wrapper" class:is-mixing={activeRole}>
    {#if requiresSetup}
      <!-- First Time Setup Wizard -->
      <section class="card setup-wizard fade-in">
        <h2>FOH Initial Setup</h2>
        <p>Configure OpenMix bounds for your digital live mixer.</p>
        
        <div class="form-group">
          <label>Hardware Architecture Preset</label>
          <select bind:value={config.presetId} on:change={applyPreset}>
            {#each PredefinedMixersArray as preset}
              <option value={preset.id}>{preset.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="inp">Total Input Channels</label>
          <input id="inp" type="number" bind:value={config.inputs} min="1" max="128" disabled={config.presetId !== 'CUSTOM'} />
        </div>
        <div class="form-group">
          <label for="out">Total Output Buses</label>
          <input id="out" type="number" bind:value={config.outputs} min="1" max="64" disabled={config.presetId !== 'CUSTOM'} />
        </div>
        
        <button class="action-btn" on:click={completeSetup}>Save Configuration & Enter App</button>
      </section>

    {:else if !activeRole}
      <!-- Mode Selection Gate -->
      <section class="card role-selector fade-in">
        <h2>Select Sandbox Role</h2>
        <div class="role-grid">
          <button class="role-btn foh" on:click={() => activeRole = 'foh'}>
            <h3>FOH Master Control</h3>
            <p>Access high-res meters, processing graphs, and full routing console.</p>
          </button>
          <button class="role-btn musician" on:click={() => activeRole = 'musician'}>
            <h3>Musician Monitor Sandbox</h3>
            <p>Fader-only responsive view. Protected by strict backend auxiliary routing.</p>
          </button>
        </div>
        <button class="btn-text" on:click={() => requiresSetup = true}>Re-run I/O Setup Wizard</button>
      </section>

    {:else}
      {#if activeRole === 'foh'}
          <GlobalTabs bind:activeTab />
      {/if}

      <div class="workspace">
        {#if activeTab === 'mixer'}
          <!-- EDGE-TO-EDGE MIXER ROUTING -->
          <div class="console-view fade-in" bind:clientWidth={containerWidth}>
            <div class="channels-track">
              {#each displayedChannels as chIndex}
                {@const sId = activeView === 'inputs' ? `in_${chIndex}` : (activeView === 'outputs' ? `out_${chIndex}` : `dca_${chIndex}`)}
                <!-- Wrap in a clickable overlay if scribble mode is active -->
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="strip-wrapper" on:click={() => { if (activeRole==='foh' && scribbleEditMode) editingChannel = sId; }}>
                  <ChannelStrip 
                    channelIndex={chIndex} 
                    role={activeRole}
                    stripType={activeView === 'outputs' ? 'output' : (activeView === 'dcas' ? 'dca' : 'input')}
                    name={scribbles[sId]?.name || (activeView === 'inputs' ? (presetHardLinks[chIndex]?.defaultName || `CH ${chIndex}`) : (activeView === 'outputs' ? `AUX ${chIndex}` : `DCA ${chIndex}`))}
                    iconType={scribbles[sId]?.iconType || (activeView === 'inputs' ? 'icon_01' : 'icon_55')}
                    color={scribbles[sId]?.color || (activeView === 'inputs' ? '#3f3f46' : '#3b82f6')}
                    peakLevel={activeView === 'inputs' ? (fohMeters[chIndex - 1] || -60) : -60}
                    on:nameClick={() => { selectedChannel = sId; activeTab = 'channel'; }}
                  />
                </div>
              {/each}
              
              {#if activeView === 'outputs'}
                <div class="master-divider"></div>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="strip-wrapper" on:click={() => { if (activeRole==='foh' && scribbleEditMode) editingChannel = 'main_LR'; }}>
                  <ChannelStrip 
                    channelIndex="LR"
                    role={activeRole}
                    stripType="main"
                    name={scribbles['main_LR']?.name || "MAIN LR"}
                    iconType={scribbles['main_LR']?.iconType || "icon_68"}
                    color={scribbles['main_LR']?.color || "#ef4444"}
                    peakLevel={-60}
                    on:nameClick={() => { selectedChannel = 'main_LR'; activeTab = 'channel'; }}
                  />
                </div>
              {/if}
            </div>
          </div>
                   
        {:else if activeTab === 'eq'}
          <div class="macro-view fade-in">
            <div class="view-header">
              <button class="nav-arrow" on:click={() => cycleChannel(-1)}>&larr;</button>
              <h2>EQ EDITOR: {scribbles[selectedChannel]?.name || selectedChannel.toUpperCase()}</h2>
              <button class="nav-arrow" on:click={() => cycleChannel(1)}>&rarr;</button>
            </div>
            <div style="flex: 1; width: 100%;">
                <EqEditor bind:this={eqComponent} channelId={selectedChannel} />
            </div>
          </div>
        {:else}
          <div class="macro-view fade-in">
            <div class="view-header">
              <button class="nav-arrow" on:click={() => cycleChannel(-1)}>&larr;</button>
              <h2>{activeTab.toUpperCase()} VIEW: {scribbles[selectedChannel]?.name || selectedChannel.toUpperCase()}</h2>
              <button class="nav-arrow" on:click={() => cycleChannel(1)}>&rarr;</button>
            </div>
            <p>Focusing on parameter properties for {selectedChannel}</p>
            <div class="wireframe-content"></div>
          </div>
        {/if}

        <Sidebar {activeTab} bind:activeView bind:currentPage {totalPages} 
                 onPageChange={(p) => currentPage = p} 
                 onViewChange={(v) => activeView = v}
                 onResetEq={() => { if (eqComponent) eqComponent.resetFlat(); }} />
      </div>
    {/if}

    
    {#if activeRole === 'foh' && editingChannel}
      <ScribbleEditor 
        channelIndex={typeof editingChannel === 'string' ? editingChannel.replace('in_','CH ').replace('out_','AUX ').toUpperCase() : editingChannel}
        currentName={scribbles[editingChannel]?.name || (editingChannel || '').toUpperCase()}
        currentIcon={scribbles[editingChannel]?.iconType || 'icon_01'}
        currentColor={scribbles[editingChannel]?.color || '#3f3f46'}
        on:save={handleSaveScribble}
        on:close={() => editingChannel = null}
      />
    {/if}
  </div>
</main>

<style>
  :global(#app) { max-width: 80% !important; margin: 0 auto; padding: 0 !important; height: 100vh; display: flex; flex-direction: column; width: 100%; box-sizing: border-box; }
  :global(body) {
    margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    background-color: #0b0d12; color: #e2e8f0; overflow: hidden; /* Prevent body scroll, constrain to app-container */
  }
  
  .app-container { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

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

  .content-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
  .content-wrapper:not(.is-mixing) { padding: 1.5rem; }

  .card { background: linear-gradient(180deg, rgba(30,41,59,0.7) 0%, rgba(30,41,59,0.4) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 2.5rem; box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 800px; margin: 0 auto; width: 100%; box-sizing: border-box; }
  
  .setup-wizard .form-group { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .setup-wizard label { font-size: 0.85rem; font-weight: 600; color: #a1a1aa; }
  .setup-wizard input { background: #000; border: 1px solid #27272a; color: #fff; padding: 0.8rem; border-radius: 6px; outline: none; transition: border 0.2s; font-family: 'JetBrains Mono', monospace; }
  .setup-wizard input:focus { border-color: #3b82f6; }
  .action-btn { background: #3b82f6; color: white; border: none; padding: 1rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: block; width: 100%; transition: background 0.2s; font-size: 1rem; box-shadow: 0 4px 12px rgba(59,130,246,0.4); margin-top: 1rem; }
  .action-btn:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(59,130,246,0.5); }

  .role-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 1.5rem; margin-bottom: 1rem; }
  .role-btn { background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; text-align: left; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); color: inherit; height: 100%; }
  .role-btn:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.3); background: rgba(30,41,59,0.8); }
  .role-btn.foh { border-top: 3px solid #3b82f6; }
  .role-btn.musician { border-top: 3px solid #8b5cf6; }
  
  .btn-text { background: transparent; border: none; color: #94a3b8; font-size: 0.8rem; cursor: pointer; text-decoration: underline; margin-top: 1.5rem; display: block; text-align: center; width: 100%; transition: color 0.1s; }
  .btn-text:hover { color: #e2e8f0; }

  h2 { margin-top: 0; color: #f8fafc; font-size: 1.75rem; letter-spacing: -0.5px; }
  h3 { margin-top: 0; color: #f8fafc; font-size: 1.1rem; }
  p { color: #94a3b8; line-height: 1.5; font-size: 0.95rem; }

  /* Ableton mixer scroll view (Horizontal scroll container) */
  .workspace { display: flex; flex: 1; overflow: hidden; }
  .console-view { flex: 1; display: flex; overflow-x: auto; overflow-y: hidden; background: #0b0d12; padding-bottom: 8px; -webkit-overflow-scrolling: touch; }
  .console-view::-webkit-scrollbar { height: 12px; }
  .console-view::-webkit-scrollbar-track { background: #0b0d12; border-top: 1px solid #27272a; }
  .console-view::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 6px; border: 3px solid #0b0d12; }
  .console-view::-webkit-scrollbar-thumb:hover { background: #52525b; }

  .channels-track { display: flex; gap: 4px; height: 100%; align-items: flex-end; padding: 0 1rem 8px 1rem; }
  .master-divider { width: 2px; height: 100%; background: #1e293b; margin: 0 1rem; border-radius: 1px; box-shadow: 0 0 8px rgba(0,0,0,0.5); }
  
  .strip-wrapper { cursor: default; }
  .scribble-mode .strip-wrapper { cursor: pointer; border: 2px dashed #10b981; border-radius: 8px; transition: 0.2s; }
  .scribble-mode .strip-wrapper:hover { background: rgba(16, 185, 129, 0.1); }

  /* Macro Views Styling */
  .macro-view { padding: 1rem; width: 100%; max-width: 960px; margin: 0 auto; height: 100%; display: flex; flex-direction: column; overflow-y: auto; overflow-x: hidden; }
  .view-header { display: flex; align-items: center; justify-content: center; gap: 1.5rem; margin-bottom: 2rem; background: #1e293b; padding: 1rem; border-radius: 8px; border: 1px solid #334155; flex-shrink: 0; }
  .view-header h2 { margin: 0; color: #f8fafc; font-size: 1.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
  .nav-arrow { background: #0f172a; border: 1px solid #334155; color: #a1a1aa; font-size: 1.5rem; border-radius: 4px; cursor: pointer; transition: all 0.2s; padding: 0.2rem 1.5rem; }
  .nav-arrow:hover { color: #fff; background: #3b82f6; border-color: #60a5fa; box-shadow: 0 0 12px rgba(59,130,246,0.6); }
  .wireframe-content { flex: 1; border: 2px dashed #3f3f46; border-radius: 12px; opacity: 0.5; }

  .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>
