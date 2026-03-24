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
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';
  
  let fohMeters = new Array(16).fill(-60);
  
  // Navigation / Focus State
  let activeRole = null; // 'foh' or null
  let activeTab = 'mixer'; // 'mixer', 'channel', 'eq', 'sends', 'routing', 'fx'
  let activeView = 'inputs'; // 'inputs', 'outputs', 'dcas'
  let currentPage = 1;
  let channelsPerPage = 8;
  let stripsPerPage = 8; // User-configurable visible strips
  
  // Scribble Strip / Global Selectors
  let scribbleEditMode = false;
  let editingChannel = null;
  let selectedChannel = 'in_1';
  
  // Musician Monitor Mix — which aux bus they control
  let musicianAux = null;

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

  // Chevron boundary detection
  $: isFirstChannel = (() => {
    if (!selectedChannel || selectedChannel === 'main_LR') return true;
    const [type, numStr] = selectedChannel.split('_');
    return parseInt(numStr, 10) <= 1;
  })();
  $: isLastChannel = (() => {
    if (!selectedChannel || selectedChannel === 'main_LR') return true;
    const [type, numStr] = selectedChannel.split('_');
    const num = parseInt(numStr, 10);
    if (type === 'in') return num >= config.inputs;
    if (type === 'out') return num >= config.outputs;
    if (type === 'dca') return num >= (config.dcas || 8);
    return true;
  })();

  let requiresSetup = localStorage.getItem('openmix_setup') !== 'true';
  let config = { inputs: 16, outputs: 6, dcas: 8, fx: 4, presetId: 'CUSTOM', visibleBuses: [1,2,3,4,5,6] };

  // Main LR cannot route to sends/FX/routing
  $: disabledTabs = selectedChannel === 'main_LR' ? ['sends', 'fx', 'routing'] : [];
  $: if (disabledTabs.includes(activeTab)) { activeTab = 'channel'; }
  
  // Watch config outputs to expand visibleBuses if CUSTOM mode expands globally without setting explicit visibility
  $: {
      if (config.outputs > 0 && (!config.visibleBuses || config.visibleBuses.length === 0)) {
          config.visibleBuses = Array.from({length: config.outputs}, (_, i) => i + 1);
      }
  }
  
  // Scribble state array tracking
  let scribbles = {}; 
  
  // Phase 13 Parametric Nodes Reference
  let eqComponent;

  // Per-channel EQ state persistence (survives tab switches)
  let channelEqState = {};

  // Stereo link state: key = odd channel number, value = true if linked to next even channel
  let stereoLinks = {};  // { 1: true, 3: true } means CH1↔CH2 and CH3↔CH4 are linked
  function toggleStereoLink(ch) {
    const oddCh = ch % 2 === 1 ? ch : ch - 1; // Always reference the odd channel
    const newState = !stereoLinks[oddCh];
    stereoLinks = { ...stereoLinks, [oddCh]: newState };
    setOsc(`/config/chlink/${oddCh}-${oddCh+1}`, newState ? 1 : 0);
  }
  function isLinked(ch, _stereoLinksDep) {
    if (typeof ch !== 'number') return false;
    const oddCh = ch % 2 === 1 ? ch : ch - 1;
    return !!_stereoLinksDep[oddCh];
  }

  // Main output assignment per channel
  let mainOutAssign = {};  // { 'in_1': true, 'in_2': true, ... }
  function toggleMainOut(chId) {
    const newState = !mainOutAssign[chId];
    mainOutAssign = { ...mainOutAssign, [chId]: newState };
    
    if (chId.startsWith('in_')) {
      const num = chId.replace('in_', '').padStart(2, '0');
      setOsc(`/ch/${num}/mix/lr`, newState ? 1 : 0);
    } else if (chId.startsWith('fx_')) {
      const num = chId.replace('fx_', '');
      setOsc(`/rtn/${num}/mix/lr`, newState ? 1 : 0);
    }
  }

  function handleBandsChange(chId, newBands) {
      channelEqState[chId] = newBands.map(b => ({...b}));
      channelEqState = {...channelEqState}; // trigger reactivity
      
      // Emit OSC for each band
      if (chId.startsWith('in_')) {
          const num = chId.replace('in_', '').padStart(2, '0');
          newBands.forEach((band, i) => {
              setOsc(`/ch/${num}/eq/${i+1}/f`, band.freq);
              setOsc(`/ch/${num}/eq/${i+1}/g`, band.gain);
              setOsc(`/ch/${num}/eq/${i+1}/q`, band.q);
          });
      }
  }

  $: currentEqBands = channelEqState[selectedChannel] || null;

  // Mini EQ path computation for ChannelStrip previews
  function computeMiniEqPath(chId, w = 100, h = 40) {
      const state = channelEqState[chId];
      if (!state) return 'M0,20 L100,20'; // flat line default
      const numPts = 32;
      const logMin = Math.log10(20);
      const logMax = Math.log10(22000);
      let d = '';
      for (let i = 0; i <= numPts; i++) {
          const logFreq = logMin + (i / numPts) * (logMax - logMin);
          const freq = Math.pow(10, logFreq);
          let totalGain = 0;
          for (const b of state) {
              if (!b.enabled) continue;
              const f0 = Math.pow(10, b.logVal);
              const ratio = freq / f0;
              const logR = Math.log2(ratio);
              switch(b.type) {
                  case 'hpf12': totalGain += ratio < 1 ? -12 * Math.log2(1/ratio) : 0; break;
                  case 'hpf48': totalGain += ratio < 1 ? -48 * Math.log2(1/ratio) : 0; break;
                  case 'lpf12': totalGain += ratio > 1 ? -12 * Math.log2(ratio) : 0; break;
                  case 'lpf48': totalGain += ratio > 1 ? -48 * Math.log2(ratio) : 0; break;
                  case 'loshelf': totalGain += b.gain / (1 + Math.pow(ratio, 2)); break;
                  case 'hishelf': totalGain += b.gain * (1 - 1 / (1 + Math.pow(ratio, 2))); break;
                  case 'notch': { const bw2 = 1/Math.max(b.q,0.1); const x2 = logR/bw2; totalGain += -15/(1+x2*x2); break; }
                  default: { const bw = 1/Math.max(b.q,0.1); const x = logR/bw; totalGain += b.gain/(1+x*x*4); break; }
              }
          }
          totalGain = Math.max(-15, Math.min(15, totalGain));
          const x = (i / numPts) * w;
          const y = h / 2 - (totalGain / 15) * (h / 2 - 4);
          d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
      }
      return d;
  }

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

  function handleExportScene() {
    if (!$mixerState || !Object.keys($mixerState).length || !$mixerState.flatOscCache) {
      alert('No mixer state available to export yet. Please connect first.');
      return;
    }
    const sceneLayout = {
        name: 'OpenMix Export',
        timestamp: Date.now(),
        state: { flatOscCache: $mixerState.flatOscCache }
    };
    const sceneData = JSON.stringify(sceneLayout, null, 2);
    const blob = new Blob([sceneData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openmix-scene-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
  $: outputChannels = (config.visibleBuses || Array.from({length: config.outputs}, (_, i) => i + 1)).sort((a,b) => a-b);
  $: dcaChannels = Array.from({length: config.dcas || 8}, (_, i) => i + 1);
  $: fxChannels = Array.from({length: config.fx || 4}, (_, i) => i + 1);
  
  $: currentChannels = activeView === 'inputs' ? inputChannels : (activeView === 'outputs' ? outputChannels : dcaChannels);
  $: fohMeters = $rawMeters || [];

  // Fluid Pagination Logic
  let containerWidth = 0;
  const STRIP_WIDTH = 90; // Standard layout size
  
  $: channelsPerPage = stripsPerPage;
  $: totalPages = Math.ceil(currentChannels.length / Math.max(1, channelsPerPage));
  $: displayedChannels = currentChannels.slice(currentPage * channelsPerPage, (currentPage + 1) * channelsPerPage);

  // Musician pagination
  let musicianPage = 0;
  $: musicianTotalPages = Math.ceil(inputChannels.length / Math.max(1, stripsPerPage));
  $: musicianDisplayedChannels = inputChannels.slice(musicianPage * stripsPerPage, (musicianPage + 1) * stripsPerPage);

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
            config.visibleBuses = Array.from({length: preset.outputs}, (_, i) => i + 1);
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
      <Navbar {activeRole} onExitRole={() => activeRole = null} onExportScene={handleExportScene} onFileLoad={handleFileUpload} onScribbleEdit={() => scribbleEditMode = !scribbleEditMode} />

  <div class="content-wrapper" class:is-mixing={activeRole}>
    {#if requiresSetup}
      <!-- First Time Setup Wizard -->
      <section class="card setup-wizard fade-in">
        <h2>FOH Initial Setup</h2>
        <p>Configure OpenMix bounds for your digital live mixer.</p>
        
        <div class="form-group">
          <label for="preset">Hardware Architecture Preset</label>
          <select id="preset" bind:value={config.presetId} on:change={applyPreset}>
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
        
        {#if config.presetId !== 'CUSTOM' || config.outputs > 0}
        <div class="form-group">
          <p class="label">Visible Buses / Outputs (Sandbox Access)</p>
          <div class="bus-grid">
             {#each Array(config.outputs) as _, i}
               <label class="bus-toggle">
                  <input type="checkbox" bind:group={config.visibleBuses} value={i+1} />
                  AUX {i+1}
               </label>
             {/each}
          </div>
        </div>
        {/if}
        
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
          <button class="role-btn musician" on:click={() => { activeRole = 'musician'; musicianAux = null; }}>
            <h3>Musician Monitor Sandbox</h3>
            <p>Fader-only responsive view. Protected by strict backend auxiliary routing.</p>
          </button>
        </div>
        <button class="btn-text" on:click={() => requiresSetup = true}>Re-run I/O Setup Wizard</button>
      </section>

    {:else}
      <!-- Musician Aux Selection Gate -->
      {#if activeRole === 'musician' && !musicianAux}
        <section class="card aux-selector fade-in">
          <h2>Select Your Monitor Mix</h2>
          <p>Choose the AUX output bus assigned to your in-ear or wedge monitor.</p>
          <div class="aux-grid">
            {#each (config.visibleBuses || []) as auxNum}
              <button class="aux-btn" on:click={() => musicianAux = auxNum}>
                <span class="aux-num">AUX {auxNum}</span>
                <span class="aux-label">{scribbles[`out_${auxNum}`]?.name || `Output ${auxNum}`}</span>
              </button>
            {/each}
          </div>
          <button class="btn-text" on:click={() => activeRole = null}>← Back to Role Select</button>
        </section>

      {:else}
      {#if activeRole === 'foh'}
          <GlobalTabs bind:activeTab {disabledTabs} />
      {/if}

      <div class="workspace">
        {#if activeTab === 'mixer'}
          <!-- EDGE-TO-EDGE MIXER ROUTING -->
          {#if activeRole === 'musician'}
            <div class="musician-mix fade-in">
              <div class="musician-header">
                {#if scribbles[`out_${musicianAux}`]?.iconType}
                  <img src="/icons-bmp/{scribbles[`out_${musicianAux}`].iconType}.bmp" alt="" class="musician-header-icon" />
                {:else}
                  <div class="musician-header-icon-empty"></div>
                {/if}
                <h2>{scribbles[`out_${musicianAux}`]?.name || `AUX ${musicianAux} Monitor Mix`}</h2>
              </div>
              <div class="musician-rack">
                {#each inputChannels as chIndex}
                  <ChannelStrip 
                    channelIndex={String(chIndex)} 
                    role="musician"
                    stripType="input"
                    name={scribbles[`in_${chIndex}`]?.name || (presetHardLinks[chIndex]?.defaultName || `CH ${chIndex}`)}
                    iconType={scribbles[`in_${chIndex}`]?.iconType || 'icon_01'}
                    color={isLinked(chIndex, stereoLinks) ? (chIndex % 2 === 1 ? '#3b82f6' : '#ef4444') : (scribbles[`in_${chIndex}`]?.color || '#3f3f46')}
                    peakLevel={fohMeters[chIndex - 1] || -60}
                    on:nameClick={() => {}}
                  />
                {/each}
                <div class="master-divider"></div>
                <ChannelStrip 
                  channelIndex={musicianAux}
                  role="musician"
                  stripType="output"
                  name={scribbles[`out_${musicianAux}`]?.name || `AUX ${musicianAux}`}
                  iconType={scribbles[`out_${musicianAux}`]?.iconType || 'icon_01'}
                  color={scribbles[`out_${musicianAux}`]?.color || '#8b5cf6'}
                  peakLevel={-60}
                  on:nameClick={() => {}}
                />
              </div>
            </div>
          {:else}
            <div class="console-view fade-in" bind:clientWidth={containerWidth}>
              <div class="channels-track">
                {#each displayedChannels as chIndex}
                  {@const sId = activeView === 'inputs' ? `in_${chIndex}` : (activeView === 'outputs' ? `out_${chIndex}` : `dca_${chIndex}`)}
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="strip-wrapper" on:click={() => { if (activeRole==='foh' && scribbleEditMode) editingChannel = sId; }}>
                    <ChannelStrip 
                      channelIndex={String(chIndex)} 
                      role={activeRole}
                      stripType={activeView === 'outputs' ? 'output' : (activeView === 'dcas' ? 'dca' : 'input')}
                      name={scribbles[sId]?.name || (activeView === 'inputs' ? (presetHardLinks[chIndex]?.defaultName || `CH ${chIndex}`) : (activeView === 'outputs' ? `AUX ${chIndex}` : `DCA ${chIndex}`))}
                      iconType={scribbles[sId]?.iconType || 'icon_01'}
                      color={activeView === 'inputs' && isLinked(chIndex, stereoLinks) ? (chIndex % 2 === 1 ? '#3b82f6' : '#ef4444') : (scribbles[sId]?.color || (activeView === 'inputs' ? '#3f3f46' : '#3b82f6'))}
                      peakLevel={activeView === 'inputs' ? (fohMeters[chIndex - 1] || -60) : -60}
                      eqCurvePath={computeMiniEqPath(sId)}
                      stereoLink={activeView === 'inputs' ? isLinked(chIndex, stereoLinks) : false}
                      on:toggleLink={() => toggleStereoLink(chIndex)}
                      on:nameClick={() => { selectedChannel = sId; activeTab = 'channel'; }}
                    />
                  </div>
                {/each}
                
                {#if activeView === 'outputs'}
                  <div class="master-divider"></div>
                  {#each fxChannels as fxIdx}
                    {@const fxSId = `fx_${fxIdx}`}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div class="strip-wrapper" on:click={() => { if (activeRole==='foh' && scribbleEditMode) editingChannel = fxSId; }}>
                      <ChannelStrip
                        channelIndex={String(fxIdx)}
                        role={activeRole}
                        stripType="fx"
                        name={scribbles[fxSId]?.name || `FX ${fxIdx}`}
                        iconType={scribbles[fxSId]?.iconType || 'icon_01'}
                        color={scribbles[fxSId]?.color || '#f59e0b'}
                        peakLevel={-60}
                        eqCurvePath={computeMiniEqPath(fxSId)}
                        on:nameClick={() => { selectedChannel = fxSId; activeTab = 'channel'; }}
                      />
                    </div>
                  {/each}
                  <div class="master-divider"></div>
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="strip-wrapper" on:click={() => { if (activeRole==='foh' && scribbleEditMode) editingChannel = 'main_LR'; }}>
                    <ChannelStrip 
                      channelIndex="LR"
                      role={activeRole}
                      stripType="main"
                      name={scribbles['main_LR']?.name || "MAIN LR"}
                      iconType={scribbles['main_LR']?.iconType || 'icon_01'}
                      color={scribbles['main_LR']?.color || "#ef4444"}
                      peakLevel={-60}
                      eqCurvePath={computeMiniEqPath('main_LR')}
                      on:nameClick={() => { selectedChannel = 'main_LR'; activeTab = 'channel'; }}
                    />
                  </div>
                {/if}
              </div>
            </div>
          {/if}
                   
        {:else if activeTab === 'eq'}
          <div class="macro-view fade-in">
            <div class="view-header-inline">
              <h2 class="title-left">EQ EDITOR: {scribbles[selectedChannel]?.name || selectedChannel.toUpperCase()}</h2>
              <div class="nav-group">
                  <button class="nav-icon-btn" disabled={isFirstChannel} on:click={() => cycleChannel(-1)}><ChevronLeft size={20} /></button>
                  <button class="nav-icon-btn" disabled={isLastChannel} on:click={() => cycleChannel(1)}><ChevronRight size={20} /></button>
              </div>
            </div>
            <div style="flex: 1; width: 100%; display: flex; flex-direction: column;">
                <EqEditor bind:this={eqComponent} channelId={selectedChannel} eqBands={currentEqBands} onBandsChange={handleBandsChange} />
            </div>
          </div>

        {:else if activeTab === 'channel'}
          <div class="macro-view fade-in">
            <div class="view-header-inline">
              <h2 class="title-left">CHANNEL: {scribbles[selectedChannel]?.name || selectedChannel.toUpperCase()}</h2>
              <div class="nav-group">
                  <button class="nav-icon-btn" disabled={isFirstChannel} on:click={() => cycleChannel(-1)}><ChevronLeft size={20} /></button>
                  <button class="nav-icon-btn" disabled={isLastChannel} on:click={() => cycleChannel(1)}><ChevronRight size={20} /></button>
              </div>
            </div>
            <div class="bento-grid">
              <!-- Icon Preview -->
              <div class="bento-card bento-icon-preview">
                <h3>Channel Icon</h3>
                <div class="icon-preview-slot">
                  {#if scribbles[selectedChannel]?.iconType}
                    <img src="/icons-bmp/{scribbles[selectedChannel].iconType}.bmp" alt="Icon" class="icon-lg" />
                  {:else}
                    <div class="icon-placeholder"></div>
                  {/if}
                  <span class="icon-name">{scribbles[selectedChannel]?.name || selectedChannel.toUpperCase()}</span>
                  <span class="icon-color-dot" style="background: {scribbles[selectedChannel]?.color || '#3f3f46'};"></span>
                </div>
              </div>
              <!-- Preamp -->
              <div class="bento-card">
                <h3>Preamp</h3>
                <div class="param-row"><span>Gain</span><input type="range" min="0" max="60" value="30" /><span>30 dB</span></div>
                <div class="param-row"><span>48V</span><button class="toggle-sm">OFF</button></div>
                <div class="param-row"><span>Phase</span><button class="toggle-sm">0°</button></div>
              </div>
              <!-- Gate -->
              <div class="bento-card">
                <h3>Gate</h3>
                <div class="param-row"><span>Threshold</span><input type="range" min="-80" max="0" value="-40" /><span>-40 dB</span></div>
                <div class="param-row"><span>Range</span><input type="range" min="0" max="60" value="20" /><span>20 dB</span></div>
                <div class="param-row"><span>Attack</span><input type="range" min="0" max="120" value="5" /><span>5 ms</span></div>
                <div class="param-row"><span>Hold</span><input type="range" min="0" max="500" value="50" /><span>50 ms</span></div>
              </div>
              <!-- Compressor -->
              <div class="bento-card">
                <h3>Compressor</h3>
                <div class="param-row"><span>Threshold</span><input type="range" min="-60" max="0" value="-20" /><span>-20 dB</span></div>
                <div class="param-row"><span>Ratio</span><input type="range" min="1" max="20" value="4" /><span>4:1</span></div>
                <div class="param-row"><span>Attack</span><input type="range" min="0" max="100" value="10" /><span>10 ms</span></div>
                <div class="param-row"><span>Release</span><input type="range" min="5" max="500" value="100" /><span>100 ms</span></div>
                <div class="param-row"><span>Makeup</span><input type="range" min="0" max="24" value="0" /><span>0 dB</span></div>
              </div>
              <!-- Mini EQ Preview -->
              <div class="bento-card bento-eq-preview">
                <h3>EQ Preview</h3>
                <svg viewBox="0 0 100 40" class="bento-eq-curve"><path d="{computeMiniEqPath(selectedChannel)}" /></svg>
              </div>
              <!-- Level -->
              <div class="bento-card">
                <h3>Output</h3>
                <div class="param-row"><span>Pan</span><input type="range" min="-100" max="100" value="0" /><span>C</span></div>
                <div class="param-row"><span>Level</span><input type="range" min="-90" max="10" value="0" /><span>0 dB</span></div>
              </div>
              <!-- Main Out Assignment -->
              {#if !selectedChannel.startsWith('out_')}
                <div class="bento-card">
                  <h3>Main Out</h3>
                  <div class="param-row">
                    <span>Assign to LR</span>
                    <button class="toggle-sm" class:active={mainOutAssign[selectedChannel]} on:click={() => toggleMainOut(selectedChannel)}>
                      {mainOutAssign[selectedChannel] ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <p class="bento-hint">Route this channel to the Main LR output bus. Disable for talkback or monitor-only channels.</p>
                </div>
              {/if}
              <!-- Stereo Link -->
              {#if selectedChannel.startsWith('in_')}
                {@const chNum = parseInt(selectedChannel.replace('in_', ''))}
                {@const oddCh = chNum % 2 === 1 ? chNum : chNum - 1}
                {@const partnerCh = chNum % 2 === 1 ? chNum + 1 : chNum - 1}
                <div class="bento-card">
                  <h3>Stereo Link</h3>
                  <div class="param-row">
                    <span>CH {oddCh} ↔ CH {oddCh + 1}</span>
                    <button class="toggle-sm" class:active-yellow={stereoLinks[oddCh]} on:click={() => toggleStereoLink(chNum)}>
                      {stereoLinks[oddCh] ? 'LINKED' : 'OFF'}
                    </button>
                  </div>
                  <p class="bento-hint">Links odd→even channel pair. Both channels share gain, pan, EQ, and dynamics.</p>
                </div>
              {/if}
            </div>
          </div>

        {:else if activeTab === 'sends'}
          <div class="macro-view fade-in">
            <div class="view-header-inline">
              <h2 class="title-left">SENDS: {scribbles[selectedChannel]?.name || selectedChannel.toUpperCase()}</h2>
              <div class="nav-group">
                  <button class="nav-icon-btn" disabled={isFirstChannel} on:click={() => cycleChannel(-1)}><ChevronLeft size={20} /></button>
                  <button class="nav-icon-btn" disabled={isLastChannel} on:click={() => cycleChannel(1)}><ChevronRight size={20} /></button>
              </div>
            </div>
            <div class="tab-content-body">
              <div class="param-section">
                <h3>Bus Sends</h3>
                {#each Array(config.outputs) as _, i}
                  <div class="param-row">
                    <span>AUX {i + 1}</span>
                    <input type="range" min="-60" max="10" value="-60" />
                    <button class="toggle-sm">PRE</button>
                  </div>
                {/each}
              </div>
            </div>
          </div>

        {:else if activeTab === 'fx'}
          <div class="macro-view fade-in">
            <div class="view-header-inline">
              <h2 class="title-left">FX: {scribbles[selectedChannel]?.name || selectedChannel.toUpperCase()}</h2>
              <div class="nav-group">
                  <button class="nav-icon-btn" disabled={isFirstChannel} on:click={() => cycleChannel(-1)}><ChevronLeft size={20} /></button>
                  <button class="nav-icon-btn" disabled={isLastChannel} on:click={() => cycleChannel(1)}><ChevronRight size={20} /></button>
              </div>
            </div>
            <div class="tab-content-body">
              {#each Array(config.fx || 4) as _, i}
                <div class="param-section">
                  <h3>FX {i + 1} Send</h3>
                  <div class="param-row"><span>Level</span><input type="range" min="-60" max="10" value="-60" /><span>-∞</span></div>
                  <div class="param-row"><span>Tap</span><button class="toggle-sm">POST</button></div>
                </div>
              {/each}
            </div>
          </div>

        {:else if activeTab === 'routing'}
          <div class="macro-view fade-in">
            <div class="view-header-inline">
              <h2 class="title-left">ROUTING</h2>
              <div class="nav-group">
                  <button class="nav-icon-btn" disabled={isFirstChannel} on:click={() => cycleChannel(-1)}><ChevronLeft size={20} /></button>
                  <button class="nav-icon-btn" disabled={isLastChannel} on:click={() => cycleChannel(1)}><ChevronRight size={20} /></button>
              </div>
            </div>
            <div class="tab-content-body">
              <div class="param-section">
                <h3>Output Patching</h3>
                <p style="color:#94a3b8; font-size: 0.85rem;">Configure physical output routing, USB/DAW streams, and P16/Ultranet assignments.</p>
                <div class="wireframe-content"></div>
              </div>
            </div>
          </div>

        {:else}
          <div class="macro-view fade-in">
            <div class="view-header-inline">
              <h2 class="title-left">{activeTab.toUpperCase()} VIEW: {scribbles[selectedChannel]?.name || selectedChannel.toUpperCase()}</h2>
              <div class="nav-group">
                  <button class="nav-icon-btn" disabled={isFirstChannel} on:click={() => cycleChannel(-1)}><ChevronLeft size={20} /></button>
                  <button class="nav-icon-btn" disabled={isLastChannel} on:click={() => cycleChannel(1)}><ChevronRight size={20} /></button>
              </div>
            </div>
            <div class="wireframe-content"></div>
          </div>
        {/if}

        {#if activeRole === 'foh'}
          <Sidebar {activeTab} bind:activeView bind:currentPage {totalPages} {stripsPerPage}
                   onPageChange={(p) => currentPage = p} 
                   onViewChange={(v) => activeView = v}
                   onStripsChange={(n) => stripsPerPage = n}
                   onResetEq={() => { if (eqComponent) eqComponent.resetFlat(); }} />
        {/if}
      </div>
      {/if}
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

  .content-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
  .content-wrapper:not(.is-mixing) { padding: 1.5rem; }

  .card { background: linear-gradient(180deg, rgba(30,41,59,0.7) 0%, rgba(30,41,59,0.4) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 2.5rem; box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 800px; margin: 0 auto; width: 100%; box-sizing: border-box; }
  
  .setup-wizard .form-group { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .setup-wizard label { font-size: 0.85rem; font-weight: 600; color: #a1a1aa; }
  .setup-wizard input { background: #000; border: 1px solid #27272a; color: #fff; padding: 0.8rem; border-radius: 6px; outline: none; transition: border 0.2s; font-family: 'JetBrains Mono', monospace; }
  .setup-wizard input[type="number"]:focus { border-color: #3b82f6; }
  
  .bus-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.5rem; margin-top: 0.25rem; }
  .bus-toggle { display: flex; align-items: center; justify-content: flex-start; gap: 0.6rem; color: #e2e8f0; font-size: 0.8rem; cursor: pointer; background: #1e293b; padding: 0.6rem; border-radius: 6px; border: 1px solid #334155; transition: 0.2s; font-family: 'JetBrains Mono', monospace; }
  .bus-toggle:hover { background: #334155; border-color: #64748b; }
  .bus-toggle input { cursor: pointer; width: 16px; height: 16px; accent-color: #3b82f6; margin: 0; }
  
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
  .macro-view { padding: 0.5rem; width: 100%; max-width: 960px; margin: 0 auto; height: 100%; display: flex; flex-direction: column; overflow-y: auto; overflow-x: hidden; }
  
  .view-header-inline { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; padding: 0 0.5rem; flex-shrink: 0; }
  .title-left { margin: 0; color: #f8fafc; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
  .nav-group { display: flex; gap: 0.5rem; }
  .nav-icon-btn { background: #1e293b; border: 1px solid #334155; color: #94a3b8; border-radius: 6px; padding: 0.4rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
  .nav-icon-btn:hover:not(:disabled) { color: #fff; background: #3b82f6; border-color: #60a5fa; box-shadow: 0 2px 8px rgba(59,130,246,0.4); transform: scale(1.05); }
  .nav-icon-btn:disabled { opacity: 0.25; cursor: not-allowed; }
  
  .wireframe-content { flex: 1; border: 2px dashed #3f3f46; border-radius: 12px; opacity: 0.5; min-height: 60px; }

  /* Tab Content Body */
  .tab-content-body { flex: 1; display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; padding: 0.5rem 0; }
  .tab-content-body::-webkit-scrollbar { width: 6px; }
  .tab-content-body::-webkit-scrollbar-track { background: transparent; }
  .tab-content-body::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  .param-section { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 1rem; }
  .param-section h3 { margin: 0 0 0.8rem 0; font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
  .param-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem 0; border-bottom: 1px solid #1e293b; }
  .param-row:last-child { border-bottom: none; }
  .param-row span { font-size: 0.8rem; color: #cbd5e1; min-width: 70px; font-weight: 600; }
  .param-row span:last-child { min-width: 55px; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #94a3b8; }
  .param-row input[type="range"] { flex: 1; -webkit-appearance: none; appearance: none; height: 6px; background: #1e293b; border-radius: 3px; outline: none; margin: 0; }
  .param-row input[type="range"]::-webkit-slider-runnable-track { width: 100%; height: 6px; background: #1e293b; border-radius: 3px; }
  .param-row input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 3px; background: #3b82f6; cursor: pointer; margin-top: -5px; border: none; transition: background 0.15s; }
  .param-row input[type="range"]::-webkit-slider-thumb:hover { background: #60a5fa; }
  .param-row input[type="range"]::-moz-range-track { width: 100%; height: 6px; background: #1e293b; border-radius: 3px; border: none; }
  .param-row input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 3px; background: #3b82f6; cursor: pointer; border: none; }
  .toggle-sm { background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
  .toggle-sm:hover { background: #334155; color: #fff; }
  .toggle-sm.active { background: #3b82f6; color: white; border-color: #60a5fa; }
  .toggle-sm.active-yellow { background: #eab308; color: #1c1917; border-color: #fde047; }

  /* Musician Aux Selector */
  .aux-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 1rem; margin-top: 1.5rem; margin-bottom: 1rem; }
  .aux-btn { background: rgba(15,23,42,0.6); border: 2px solid rgba(139,92,246,0.3); border-radius: 12px; padding: 1.5rem 1rem; text-align: center; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); color: inherit; display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
  .aux-btn:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(139,92,246,0.3); border-color: #8b5cf6; background: rgba(139,92,246,0.15); }
  .aux-num { font-size: 1.5rem; font-weight: 800; color: #8b5cf6; }
  .aux-label { font-size: 0.8rem; color: #94a3b8; }

  /* Bento Grid for Channel Tab */
  .bento-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; flex: 1; overflow-y: auto; padding: 0.5rem 0; align-content: start; }
  .bento-grid::-webkit-scrollbar { width: 0; }
  .bento-card { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 0.75rem; }
  .bento-card h3 { margin: 0 0 0.5rem 0; font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; }
  .bento-icon-preview { display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .icon-preview-slot { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.5rem 0; }
  .icon-lg { width: 48px; height: 48px; object-fit: contain; image-rendering: pixelated; border-radius: 4px; border: 2px solid #334155; }
  .icon-placeholder { width: 48px; height: 48px; border-radius: 4px; border: 2px dashed #334155; background: #0f172a; }
  .icon-name { font-size: 0.85rem; font-weight: 700; color: #e2e8f0; }
  .icon-color-dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.15); }
  .bento-eq-preview { display: flex; flex-direction: column; }
  .bento-eq-curve { width: 100%; height: 50px; background: #0b0f19; border-radius: 4px; border: 1px solid #1e293b; }
  .bento-eq-curve path { fill: none; stroke: #38bdf8; stroke-width: 1.5; }
  .bento-hint { font-size: 0.75rem; color: #64748b; margin: 0.5rem 0 0 0; line-height: 1.4; border-top: 1px dashed #1e293b; padding-top: 0.5rem; }

  /* Musician Monitor Mix */
  .musician-mix { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .musician-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: #0b0f19; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
  .musician-header h2 { margin: 0; font-size: 1.1rem; color: #f8fafc; font-weight: 800; letter-spacing: -0.3px; }
  .musician-header-icon { width: 32px; height: 32px; object-fit: contain; image-rendering: pixelated; border-radius: 4px; border: 2px solid #8b5cf6; }
  .musician-header-icon-empty { width: 32px; height: 32px; border-radius: 4px; border: 2px solid #334155; background: #18181b; }
  .musician-rack { display: flex; flex-direction: row; align-items: stretch; gap: 2px; padding: 0.5rem; overflow-x: auto; flex: 1; }
  .musician-rack::-webkit-scrollbar { height: 6px; }
  .musician-rack::-webkit-scrollbar-track { background: #0b0f19; }
  .musician-rack::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  .musician-rack::-webkit-scrollbar-thumb:hover { background: #475569; }

  .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>
