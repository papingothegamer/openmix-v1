<script>
  import { setOsc } from '../socket.js';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';

  export let sendsState;
  export let selectedChannel;
  export let config;
  export let scribbles;
  export let cycleChannel = (dir) => {};
  export let isFirstChannel = true;
  export let isLastChannel = true;

  let clipboard = null;
  let sendPoint = 'post_fader';

  $: if (selectedChannel) {
    const sp = sendsState[`${selectedChannel}_sendPoint`];
    sendPoint = sp || 'post_fader';
  }

  const pending = new Map();
  const DEBOUNCE_MS = 120;

  function getSendOscBase(ch, num, type) {
    if (!ch) return '';
    const isXR = config?.presetId === 'XR18';
    
    // Parse source channel (in_1, bus_1, etc.)
    const parts = ch.split('_');
    const chType = parts[0];
    const chNum = parts[1];
    const c = String(chNum).padStart(2, '0');
    
    // Determine source prefix (/ch or /bus)
    let srcPrefix = '/ch';
    if (chType === 'bus' || chType === 'out') srcPrefix = '/bus';
    
    if (type === 'aux') {
      return `${srcPrefix}/${c}/mix/${String(num).padStart(2, '0')}`;
    } else if (type === 'mtx') {
      return `${srcPrefix}/${c}/mix/mtx/${String(num).padStart(2, '0')}`;
    } else {
      // FX Sends
      if (isXR) {
        const busNum = 6 + parseInt(num, 10);
        return `${srcPrefix}/${c}/mix/${String(busNum).padStart(2, '0')}`;
      } else {
        return `${srcPrefix}/${c}/mix/fx/${num}`;
      }
    }
  }

  function scheduleOsc(address, value) {
    if (pending.has(address)) clearTimeout(pending.get(address));
    const id = setTimeout(() => { pending.delete(address); setOsc(address, value); }, DEBOUNCE_MS);
    pending.set(address, id);
  }

  function ensureKey(key) {
    if (!sendsState[key]) sendsState[key] = { level: 0, prePost: 0, on: true };
  }

  function toDb(val) {
    if (val <= 0.005) return '-\u221e';
    const db = 40 * Math.log10(val / 0.75);
    if (db < -80) return '-\u221e';
    return (db >= 0 ? '+' : '') + db.toFixed(1);
  }

  function setSendLevel(busKey, busNum, v) {
    ensureKey(busKey);
    sendsState[busKey].level = v;
    sendsState = { ...sendsState };
    if (selectedChannel?.startsWith('in_')) {
      const addr = getSendOscBase(selectedChannel, busNum, 'aux');
      scheduleOsc(`${addr}/level`, v);
    }
  }

  function setFxLevel(busKey, idx, v) {
    ensureKey(busKey);
    sendsState[busKey].level = v;
    sendsState = { ...sendsState };
    if (selectedChannel?.startsWith('in_')) {
      const addr = getSendOscBase(selectedChannel, idx, 'fx');
      scheduleOsc(`${addr}/level`, v);
    }
  }

  function setMtxLevel(busKey, idx, v) {
    ensureKey(busKey);
    sendsState[busKey].level = v;
    sendsState = { ...sendsState };
    if (selectedChannel?.startsWith('in_')) {
      const addr = getSendOscBase(selectedChannel, idx, 'mtx');
      scheduleOsc(`${addr}/level`, v);
    }
  }

  function togglePrePost(busKey, busNum, busType) {
    ensureKey(busKey);
    const newTap = sendsState[busKey].prePost === 1 ? 0 : 1;
    sendsState[busKey].prePost = newTap;
    sendsState = { ...sendsState };
    if (selectedChannel?.startsWith('in_')) {
      const addr = getSendOscBase(selectedChannel, busNum, busType);
      setOsc(`${addr}/type`, newTap);
    }
  }

  function toggleOnOff(busKey, busNum, busType) {
    ensureKey(busKey);
    const cur = sendsState[busKey].on !== false;
    sendsState[busKey].on = !cur;
    sendsState = { ...sendsState };
    if (selectedChannel?.startsWith('in_')) {
      const addr = getSendOscBase(selectedChannel, busNum, busType);
      setOsc(`${addr}/on`, !cur ? 1 : 0);
    }
  }

  function copyChannel() {
    if (!selectedChannel) return;
    const copied = {};
    Object.keys(sendsState).forEach(k => {
      if (k.startsWith(`${selectedChannel}_`))
        copied[k.replace(`${selectedChannel}_`, '')] = { ...sendsState[k] };
    });
    clipboard = copied;
  }

  function pasteChannel() {
    if (!selectedChannel || !clipboard) return;
    Object.entries(clipboard).forEach(([suffix, val]) => {
      const key = `${selectedChannel}_${suffix}`;
      sendsState[key] = { ...(sendsState[key] || {}), ...val };
      sendsState = { ...sendsState };
      const m = suffix.match(/^(aux)(\d+)$/) || 
                suffix.match(/^(fx)(\d+)$/) || 
                suffix.match(/^(mtx)(\d+)$/);
      
      if (m && (selectedChannel.startsWith('in_') || selectedChannel.startsWith('bus_'))) {
        const busNum = parseInt(m[2], 10);
        const addr = getSendOscBase(selectedChannel, busNum, m[1]);
        
        scheduleOsc(`${addr}/level`, sendsState[key].level ?? 0);
        setOsc(`${addr}/type`, sendsState[key].prePost ?? 0);
        
        if (m[1] === 'aux' || m[1] === 'mtx') {
          setOsc(`${addr}/on`, sendsState[key].on ? 1 : 0);
        }
      }
    });
  }

  function toggleAllPrePost() {
    if (!selectedChannel) return;
    const anyPost = Object.keys(sendsState).some(
      k => k.startsWith(`${selectedChannel}_`) && sendsState[k].prePost === 0
    );
    Object.keys(sendsState).forEach(k => {
      if (!k.startsWith(`${selectedChannel}_`)) return;
      sendsState[k].prePost = anyPost ? 1 : 0;
      sendsState = { ...sendsState };
      const suffix = k.replace(`${selectedChannel}_`, '');
      const ma = suffix.match(/^(aux)(\d+)$/) || 
                 suffix.match(/^(fx)(\d+)$/) || 
                 suffix.match(/^(mtx)(\d+)$/);
      
      if (ma && (selectedChannel.startsWith('in_') || selectedChannel.startsWith('bus_'))) {
        const addr = getSendOscBase(selectedChannel, ma[2], ma[1]);
        setOsc(`${addr}/type`, sendsState[k].prePost);
      }
    });
  }

  const SEND_POINTS = [
    { value: 'input',      label: 'Input' },
    { value: 'pre_eq',     label: 'Pre EQ' },
    { value: 'post_eq',    label: 'Post EQ' },
    { value: 'pre_fader',  label: 'Pre Fader' },
    { value: 'post_fader', label: 'Post Fader' },
    { value: 'subgroup',   label: 'Sub Group' },
  ];

  const PAGE_SIZE = 4;
  let auxPage = 0;
  let fxPage = 0;
  let mtxPage = 0;

  import SendStrip from './SendStrip.svelte';

  $: auxBuses     = config?.visibleBuses || Array.from({ length: config?.outputs || 0 }, (_, i) => i + 1);
  $: fxCount      = config?.fx || 0;
  $: mtxCount     = config?.matrices || 0;
  
  $: totalStrips  = auxBuses.length + fxCount + mtxCount;
  $: columnCount  = mtxCount > 0 ? 3 : 2;

  $: displayedAux = auxBuses.slice(auxPage * PAGE_SIZE, (auxPage + 1) * PAGE_SIZE);
  $: displayedFx  = Array.from({ length: fxCount }).slice(fxPage * PAGE_SIZE, (fxPage + 1) * PAGE_SIZE);
  $: displayedMtx = Array.from({ length: mtxCount }).slice(mtxPage * PAGE_SIZE, (mtxPage + 1) * PAGE_SIZE);

  $: auxMaxPages = Math.ceil(auxBuses.length / PAGE_SIZE);
  $: fxMaxPages  = Math.ceil(fxCount / PAGE_SIZE);
  $: mtxMaxPages = Math.ceil(mtxCount / PAGE_SIZE);
</script>

<div class="macro-view fade-in">
  
  <div class="header-container-rack">
    <div class="rack-header-main">
      <div class="header-title-group">
        <h2 class="title-left">SENDS: <span class="ch-name">{scribbles[selectedChannel]?.name || selectedChannel?.toUpperCase()}</span></h2>
      </div>
      
      <div class="header-actions">
        <button class="ctrl-btn-rack" on:click={toggleAllPrePost}>Pre/Post All</button>
        <button class="ctrl-btn-rack" on:click={copyChannel}>Copy</button>
        <button class="ctrl-btn-rack" class:has-clipboard={!!clipboard} on:click={pasteChannel}>Paste</button>
        <div class="nav-group">
          <button class="nav-icon-btn-rack" disabled={isFirstChannel} on:click={() => cycleChannel(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button class="nav-icon-btn-rack" disabled={isLastChannel} on:click={() => cycleChannel(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>

    <div class="sendpoint-rack-row">
      <span class="sp-header">SEND POINT</span>
      <div class="sp-radios">
        {#each SEND_POINTS as sp}
          <label class="sp-radio" class:sp-active={sendPoint === sp.value}>
            <input
              type="radio"
              name="sendpoint_{selectedChannel}"
              value={sp.value}
              bind:group={sendPoint}
              on:change={() => {
                if (!selectedChannel) return;
                sendsState[`${selectedChannel}_sendPoint`] = sp.value;
                sendsState = { ...sendsState };
              }}
            />
            <span class="sp-dot"></span>
            <span class="sp-lbl">{sp.label}</span>
          </label>
        {/each}
      </div>
    </div>
  </div>

  <div class="tab-content-body">
    {#if !config || (config.outputs || 0) === 0}
      <p class="empty-state">No AUX buses configured. Add outputs in the Setup Wizard.</p>
    {:else}

      <div class="sends-grid" style="--cols: {columnCount}; max-width: {columnCount === 2 ? '1100px' : '1600px'};">
        
        <!-- Column 1: AUX Sends -->
        <div class="sends-section">
          <div class="section-hdr">
            <span class="section-lbl">AUX Bus Sends</span>
            {#if auxMaxPages > 1}
              <div class="page-nav">
                <button class="page-btn" disabled={auxPage === 0} on:click={() => auxPage--}>
                  <ChevronLeft size={14} />
                </button>
                <span class="page-nums">{auxPage + 1}/{auxMaxPages}</span>
                <button class="page-btn" disabled={auxPage >= auxMaxPages - 1} on:click={() => auxPage++}>
                  <ChevronRight size={14} />
                </button>
              </div>
            {/if}
          </div>
          <div class="strips-flex">
            {#each displayedAux as busNum}
              {@const busKey = `${selectedChannel}_aux${busNum}`}
              {@const isOn   = sendsState[busKey]?.on !== false}
              {@const isPre  = sendsState[busKey]?.prePost === 1}
              {@const level  = sendsState[busKey]?.level ?? 0}
              <SendStrip 
                name={scribbles[`bus_${busNum}`]?.name || `AUX ${busNum}`}
                {level}
                {isOn}
                {isPre}
                accentColor="#3b82f6"
                on:change={(e) => setSendLevel(busKey, busNum, e.detail)}
                on:toggleOn={() => toggleOnOff(busKey, busNum, 'aux')}
                on:togglePre={() => togglePrePost(busKey, busNum, 'aux')}
              />
            {/each}
          </div>
        </div>

        <!-- Column 2: FX Sends -->
        <div class="sends-section">
          <div class="section-hdr">
            <span class="section-lbl">FX Sends</span>
            {#if fxMaxPages > 1}
              <div class="page-nav">
                <button class="page-btn" disabled={fxPage === 0} on:click={() => fxPage--}>
                  <ChevronLeft size={14} />
                </button>
                <span class="page-nums">{fxPage + 1}/{fxMaxPages}</span>
                <button class="page-btn" disabled={fxPage >= fxMaxPages - 1} on:click={() => fxPage++}>
                  <ChevronRight size={14} />
                </button>
              </div>
            {/if}
          </div>
          <div class="strips-flex">
            {#each displayedFx as _, i}
              {@const num = (fxPage * PAGE_SIZE) + i + 1}
              {@const busKey = `${selectedChannel}_fx${num}`}
              {@const isOn   = sendsState[busKey]?.on !== false}
              {@const isPre  = sendsState[busKey]?.prePost === 1}
              {@const level  = sendsState[busKey]?.level ?? 0}
              <SendStrip 
                name={scribbles[`fx_${num}`]?.name || `FX ${num}`}
                {level}
                {isOn}
                {isPre}
                accentColor="#7c3aed"
                on:change={(e) => setFxLevel(busKey, num, e.detail)}
                on:toggleOn={() => toggleOnOff(busKey, num, 'fx')}
                on:togglePre={() => togglePrePost(busKey, num, 'fx')}
              />
            {/each}
          </div>
        </div>

        <!-- Column 3: MTX Sends (Optional) -->
        {#if mtxCount > 0}
          <div class="sends-section">
            <div class="section-hdr mtx-hdr">
              <span class="section-lbl">MTX Sends</span>
              {#if mtxMaxPages > 1}
                <div class="page-nav">
                  <button class="page-btn" disabled={mtxPage === 0} on:click={() => mtxPage--}>
                    <ChevronLeft size={14} />
                  </button>
                  <span class="page-nums">{mtxPage + 1}/{mtxMaxPages}</span>
                  <button class="page-btn" disabled={mtxPage >= mtxMaxPages - 1} on:click={() => mtxPage++}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              {/if}
            </div>
            <div class="strips-flex">
              {#each displayedMtx as _, i}
                {@const busNum = (mtxPage * PAGE_SIZE) + i + 1}
                {@const busKey = `${selectedChannel}_mtx${busNum}`}
                {@const isOn   = sendsState[busKey]?.on !== false}
                {@const isPre  = sendsState[busKey]?.prePost === 1}
                {@const level  = sendsState[busKey]?.level ?? 0}
                <SendStrip 
                  name={scribbles[`mtx_${busNum}`]?.name || `MTX ${busNum}`}
                  {level}
                  {isOn}
                  {isPre}
                  accentColor="#10b981"
                  on:change={(e) => setMtxLevel(busKey, busNum, e.detail)}
                  on:toggleOn={() => toggleOnOff(busKey, busNum, 'mtx')}
                  on:togglePre={() => togglePrePost(busKey, busNum, 'mtx')}
                />
              {/each}
            </div>
          </div>
        {/if}

      </div>

    {/if}
  </div>
</div>

<style>
  .macro-view { 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    width: 100%;
    min-height: 100%;
    background: #080a0f;
  }

  .header-container-rack {
    width: 100%;
    display: flex;
    flex-direction: column;
    background: #1f2937;
    border-bottom: 1px solid #1e293b;
    margin-bottom: 2rem;
  }

  .rack-header-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }

  .header-title-group { display: flex; align-items: center; }
  .title-left { font-size: 1.1rem; font-weight: 800; color: #f8fafc; margin: 0; letter-spacing: 0.02em; }
  .ch-name { color: #94a3b8; }
  
  .header-actions { display: flex; align-items: center; gap: 0.5rem; }
  .nav-group { display: flex; gap: 4px; margin-left: 0.5rem; }

  .nav-icon-btn-rack {
    background: #111827; border: 1px solid #374151; color: #94a3b8;
    border-radius: 4px; padding: 5px 8px; cursor: pointer; display: flex; align-items: center;
    transition: all 0.2s;
  }
  .nav-icon-btn-rack:hover:not(:disabled) { background: #3b82f6; color: #fff; border-color: #60a5fa; }
  .nav-icon-btn-rack:disabled { opacity: 0.2; cursor: not-allowed; }

  .ctrl-btn-rack {
    background: #111827; color: #f8fafc; border: 1px solid #374151;
    padding: 6px 12px; border-radius: 4px; cursor: pointer;
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
    transition: all 0.2s;
  }
  .ctrl-btn-rack:hover { background: #3b82f6; border-color: #60a5fa; }
  .ctrl-btn-rack.has-clipboard { border-color: #06b6d4; color: #06b6d4; }

  .sendpoint-rack-row {
    display: flex; align-items: center; justify-content: center; gap: 1rem;
    padding: 0.75rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.03);
    background: rgba(0,0,0,0.1);
  }

  .tab-content-body { 
    width: 100%; 
    display: flex; 
    justify-content: center; 
    padding: 0 1.5rem 3rem 1.5rem; 
    box-sizing: border-box;
    overflow-x: auto;
  }

  .sends-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols, 3), 1fr); 
    gap: 2rem; 
    align-items: stretch;
    justify-content: center; 
    width: 100%;
    max-width: 1600px;
    min-width: 1100px;
  }

  .sends-section { 
    background: #09090b; border: 1px solid #18181b; border-radius: 8px; 
    overflow: hidden; display: flex; flex-direction: column; 
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    min-width: 0;
  }
  .sends-section.empty { opacity: 0.2; }
  .empty-col { flex: 1; display: flex; align-items: center; justify-content: center; color: #3f3f46; font-size: 0.8rem; height: 300px; }

  .section-hdr { 
    padding: 0.5rem 0.8rem; border-bottom: 2px solid #18181b; background: #111114; 
    display: flex; justify-content: space-between; align-items: center;
  }
  .section-lbl { font-size: 0.6rem; font-weight: 900; letter-spacing: .1em; color: #52525b; text-transform: uppercase; }

  .page-nav { display: flex; align-items: center; gap: 0.4rem; }
  .page-nums { font-size: 0.65rem; font-weight: 800; color: #3f3f46; font-family: 'JetBrains Mono', monospace; }
  .page-btn { 
    background: #18181b; border: 1px solid #27272a; color: #52525b; cursor: pointer; padding: 2px; 
    border-radius: 4px; display: flex; align-items: center; transition: all .12s;
  }
  .page-btn:hover:not(:disabled) { color: #60a5fa; border-color: #3b82f6; }
  .page-btn:disabled { opacity: 0.1; cursor: not-allowed; }

  .strips-flex { 
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.25rem 0.75rem;
    align-items: flex-start;
  }

  .mtx-hdr { border-bottom-color: #064e3b; background: #064e3b11; }
  .mtx-hdr .section-lbl { color: #10b981; }

  .empty-state { color: #3f3f46; padding: 2rem; text-align: center; font-size: 0.85rem; font-weight: 600; }

  @media (max-width: 1000px) {
    .sends-grid { grid-template-columns: 1fr; }
  }
</style>