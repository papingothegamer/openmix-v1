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

  function scheduleOsc(address, value) {
    if (pending.has(address)) clearTimeout(pending.get(address));
    const id = setTimeout(() => { pending.delete(address); setOsc(address, value); }, DEBOUNCE_MS);
    pending.set(address, id);
  }

  function ensureKey(key) {
    if (!sendsState[key]) sendsState[key] = { level: 0, prePost: 0, on: true };
  }

  function toDb(val) {
    if (val <= 0.001) return '-\u221e';
    const db = 40 * Math.log10(val / 0.75);
    if (db < -60) return '-\u221e';
    return (db >= 0 ? '+' : '') + db.toFixed(1);
  }

  function setSendLevel(busKey, busNum, v) {
    ensureKey(busKey);
    sendsState[busKey].level = v;
    sendsState = { ...sendsState };
    if (selectedChannel?.startsWith('in_')) {
      const ch = selectedChannel.replace('in_', '').padStart(2, '0');
      scheduleOsc(`/ch/${ch}/mix/${String(busNum).padStart(2,'0')}/level`, v);
    }
  }

  function setFxLevel(busKey, idx, v) {
    ensureKey(busKey);
    sendsState[busKey].level = v;
    sendsState = { ...sendsState };
    if (selectedChannel?.startsWith('in_')) {
      const ch = selectedChannel.replace('in_', '').padStart(2, '0');
      scheduleOsc(`/ch/${ch}/mix/fx/${idx}/level`, v);
    }
  }

  function togglePrePost(busKey, busNum, busType) {
    ensureKey(busKey);
    const newTap = sendsState[busKey].prePost === 1 ? 0 : 1;
    sendsState[busKey].prePost = newTap;
    sendsState = { ...sendsState };
    if (selectedChannel?.startsWith('in_')) {
      const ch = selectedChannel.replace('in_', '').padStart(2, '0');
      if (busType === 'aux') setOsc(`/ch/${ch}/mix/${String(busNum).padStart(2,'0')}/type`, newTap);
      else setOsc(`/ch/${ch}/mix/fx/${busNum}/type`, newTap);
    }
  }

  function toggleOnOff(busKey, busNum, busType) {
    ensureKey(busKey);
    const cur = sendsState[busKey].on !== false;
    sendsState[busKey].on = !cur;
    sendsState = { ...sendsState };
    if (selectedChannel?.startsWith('in_')) {
      const ch = selectedChannel.replace('in_', '').padStart(2, '0');
      if (busType === 'aux') setOsc(`/ch/${ch}/mix/${String(busNum).padStart(2,'0')}/on`, !cur ? 1 : 0);
      else setOsc(`/ch/${ch}/mix/fx/${busNum}/on`, !cur ? 1 : 0);
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
      const m = suffix.match(/^(aux)(\d+)$/) || suffix.match(/^(fx)(\d+)$/);
      if (m && selectedChannel.startsWith('in_')) {
        const ch = selectedChannel.replace('in_', '').padStart(2, '0');
        const busNum = parseInt(m[2], 10);
        if (m[1] === 'aux') {
          scheduleOsc(`/ch/${ch}/mix/${String(busNum).padStart(2,'0')}/level`, sendsState[key].level ?? 0);
          setOsc(`/ch/${ch}/mix/${String(busNum).padStart(2,'0')}/type`, sendsState[key].prePost ?? 0);
          setOsc(`/ch/${ch}/mix/${String(busNum).padStart(2,'0')}/on`, sendsState[key].on ? 1 : 0);
        } else {
          scheduleOsc(`/ch/${ch}/mix/fx/${busNum}/level`, sendsState[key].level ?? 0);
          setOsc(`/ch/${ch}/mix/fx/${busNum}/type`, sendsState[key].prePost ?? 0);
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
      const ma = suffix.match(/^(aux)(\d+)$/) || suffix.match(/^(fx)(\d+)$/);
      if (ma && selectedChannel.startsWith('in_')) {
        const ch = selectedChannel.replace('in_', '').padStart(2, '0');
        if (ma[1] === 'aux') setOsc(`/ch/${ch}/mix/${String(ma[2]).padStart(2,'0')}/type`, sendsState[k].prePost);
        else setOsc(`/ch/${ch}/mix/fx/${ma[2]}/type`, sendsState[k].prePost);
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

  const FADER_H = 220;
  $: auxBuses     = config?.visibleBuses || Array.from({ length: config?.outputs || 0 }, (_, i) => i + 1);
  $: fxCount      = config?.fx || 0;
  $: isSmallMixer = (config?.outputs || 0) <= 8;
</script>

<div class="macro-view fade-in">

  <div class="view-header-inline">
    <h2 class="title-left">
      SENDS: <span class="ch-name">{scribbles[selectedChannel]?.name || selectedChannel?.toUpperCase()}</span>
    </h2>
    <div class="header-actions">
      <button class="ctrl-btn" on:click={toggleAllPrePost}>Pre/Post All</button>
      <button class="ctrl-btn" on:click={copyChannel}>Copy</button>
      <button class="ctrl-btn" class:has-clipboard={!!clipboard} on:click={pasteChannel}>Paste</button>
      <div class="nav-group">
        <button class="nav-icon-btn" disabled={isFirstChannel} on:click={() => cycleChannel(-1)}>
          <ChevronLeft size={16} />
        </button>
        <button class="nav-icon-btn" disabled={isLastChannel} on:click={() => cycleChannel(1)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  </div>

  <div class="tab-content-body">
    {#if !config || (config.outputs || 0) === 0}
      <p class="empty-state">No AUX buses configured. Add outputs in the Setup Wizard.</p>
    {:else}

      <div class="sendpoint-row">
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

      {#if isSmallMixer}
        <div class="side-by-side">

          {#if auxBuses.length > 0}
            <div class="sends-section">
              <div class="section-hdr"><span class="section-lbl">AUX Bus Sends</span></div>
              <div class="strips-row">
                {#each auxBuses as busNum}
                  {@const busKey = `${selectedChannel}_aux${busNum}`}
                  {@const isOn   = sendsState[busKey]?.on !== false}
                  {@const isPre  = sendsState[busKey]?.prePost === 1}
                  {@const level  = sendsState[busKey]?.level ?? 0}
                  <div class="strip" class:strip-on={isOn} class:strip-off={!isOn}>
                    <div class="strip-name">{scribbles[`out_${busNum}`]?.name || `AUX ${busNum}`}</div>
                    <div class="fader-well">
                      <input type="range" class="v-fader" min="0" max="1" step="0.005"
                        value={level} style="width:{FADER_H}px"
                        on:dblclick={() => setSendLevel(busKey, busNum, 0)}
                        on:input={(e) => setSendLevel(busKey, busNum, parseFloat(e.currentTarget.value))} />
                    </div>
                    <div class="db-read" class:db-unity={level >= 0.74 && level <= 0.76}>
                      {toDb(level)}<span class="db-unit"> dB</span>
                    </div>
                    <button class="on-btn" class:on-active={isOn} on:click={() => toggleOnOff(busKey, busNum, 'aux')}>
                      {isOn ? 'ON' : 'OFF'}
                    </button>
                    <button class="pp-btn" class:pp-active={isPre} on:click={() => togglePrePost(busKey, busNum, 'aux')}>
                      {isPre ? 'PRE' : 'POST'}
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if fxCount > 0}
            <div class="sends-section">
              <div class="section-hdr"><span class="section-lbl">FX Sends</span></div>
              <div class="strips-row">
                {#each Array(fxCount) as _, i}
                  {@const busKey = `${selectedChannel}_fx${i + 1}`}
                  {@const isOn   = sendsState[busKey]?.on !== false}
                  {@const isPre  = sendsState[busKey]?.prePost === 1}
                  {@const level  = sendsState[busKey]?.level ?? 0}
                  <div class="strip fx-strip" class:strip-on={isOn} class:strip-off={!isOn}>
                    <div class="strip-name">{scribbles[`fx_${i + 1}`]?.name || `FX ${i + 1}`}</div>
                    <div class="fader-well">
                      <input type="range" class="v-fader fx-fader" min="0" max="1" step="0.005"
                        value={level} style="width:{FADER_H}px"
                        on:dblclick={() => setFxLevel(busKey, i + 1, 0)}
                        on:input={(e) => setFxLevel(busKey, i + 1, parseFloat(e.currentTarget.value))} />
                    </div>
                    <div class="db-read" class:db-unity={level >= 0.74 && level <= 0.76}>
                      {toDb(level)}<span class="db-unit"> dB</span>
                    </div>
                    <button class="on-btn" class:on-active={isOn} on:click={() => toggleOnOff(busKey, i + 1, 'fx')}>
                      {isOn ? 'ON' : 'OFF'}
                    </button>
                    <button class="pp-btn" class:pp-active={isPre} on:click={() => togglePrePost(busKey, i + 1, 'fx')}>
                      {isPre ? 'PRE' : 'POST'}
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

        </div>

      {:else}
        {#if auxBuses.length > 0}
          <div class="sends-section">
            <div class="section-hdr"><span class="section-lbl">AUX Bus Sends</span></div>
            <div class="strips-row">
              {#each auxBuses as busNum}
                {@const busKey = `${selectedChannel}_aux${busNum}`}
                {@const isOn   = sendsState[busKey]?.on !== false}
                {@const isPre  = sendsState[busKey]?.prePost === 1}
                {@const level  = sendsState[busKey]?.level ?? 0}
                <div class="strip" class:strip-on={isOn} class:strip-off={!isOn}>
                  <div class="strip-name">{scribbles[`out_${busNum}`]?.name || `AUX ${busNum}`}</div>
                  <div class="fader-well">
                    <input type="range" class="v-fader" min="0" max="1" step="0.005"
                      value={level} style="width:{FADER_H}px"
                      on:dblclick={() => setSendLevel(busKey, busNum, 0)}
                      on:input={(e) => setSendLevel(busKey, busNum, parseFloat(e.currentTarget.value))} />
                  </div>
                  <div class="db-read" class:db-unity={level >= 0.74 && level <= 0.76}>
                    {toDb(level)}<span class="db-unit"> dB</span>
                  </div>
                  <button class="on-btn" class:on-active={isOn} on:click={() => toggleOnOff(busKey, busNum, 'aux')}>
                    {isOn ? 'ON' : 'OFF'}
                  </button>
                  <button class="pp-btn" class:pp-active={isPre} on:click={() => togglePrePost(busKey, busNum, 'aux')}>
                    {isPre ? 'PRE' : 'POST'}
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if fxCount > 0}
          <div class="sends-section">
            <div class="section-hdr"><span class="section-lbl">FX Sends</span></div>
            <div class="strips-row">
              {#each Array(fxCount) as _, i}
                {@const busKey = `${selectedChannel}_fx${i + 1}`}
                {@const isOn   = sendsState[busKey]?.on !== false}
                {@const isPre  = sendsState[busKey]?.prePost === 1}
                {@const level  = sendsState[busKey]?.level ?? 0}
                <div class="strip fx-strip" class:strip-on={isOn} class:strip-off={!isOn}>
                  <div class="strip-name">{scribbles[`fx_${i + 1}`]?.name || `FX ${i + 1}`}</div>
                  <div class="fader-well">
                    <input type="range" class="v-fader fx-fader" min="0" max="1" step="0.005"
                      value={level} style="width:{FADER_H}px"
                      on:dblclick={() => setFxLevel(busKey, i + 1, 0)}
                      on:input={(e) => setFxLevel(busKey, i + 1, parseFloat(e.currentTarget.value))} />
                  </div>
                  <div class="db-read" class:db-unity={level >= 0.74 && level <= 0.76}>
                    {toDb(level)}<span class="db-unit"> dB</span>
                  </div>
                  <button class="on-btn" class:on-active={isOn} on:click={() => toggleOnOff(busKey, i + 1, 'fx')}>
                    {isOn ? 'ON' : 'OFF'}
                  </button>
                  <button class="pp-btn" class:pp-active={isPre} on:click={() => togglePrePost(busKey, i + 1, 'fx')}>
                    {isPre ? 'PRE' : 'POST'}
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}

      {/if}

    {/if}
  </div>
</div>

<style>
  .macro-view { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }

  .view-header-inline { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
  .title-left { font-size: 1.1rem; font-weight: 900; letter-spacing: 0.06em; color: #cbd5e1; margin: 0; }
  .ch-name { color: #e2e8f0; }
  .header-actions { display: flex; align-items: center; gap: 0.4rem; }
  .nav-group { display: flex; gap: 2px; margin-left: 0.25rem; }

  .nav-icon-btn {
    background: #0d1a28; border: 1px solid #1a3040; color: #64748b;
    border-radius: 5px; padding: 4px 6px; cursor: pointer; display: flex; align-items: center;
    transition: color .12s, border-color .12s;
  }
  .nav-icon-btn:hover:not(:disabled) { color: #e2e8f0; border-color: #3b82f6; }
  .nav-icon-btn:disabled { opacity: .25; cursor: not-allowed; }

  .ctrl-btn {
    background: #0d1a28; color: #64748b; border: 1px solid #1a3040;
    padding: 4px 10px; border-radius: 5px; cursor: pointer;
    font-size: 0.72rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
    transition: background .12s, color .12s, border-color .12s;
  }
  .ctrl-btn:hover { background: #152236; color: #e2e8f0; border-color: #3b82f6; }
  .ctrl-btn.has-clipboard { border-color: #22d3ee; color: #22d3ee; }

  .sendpoint-row {
    display: flex; align-items: center; gap: 1rem;
    background: #070e18; border: 1px solid #0f1e2e; border-radius: 6px; padding: 0.4rem 0.8rem;
  }
  .sp-header { font-size: 0.62rem; font-weight: 800; letter-spacing: .12em; color: #253549; text-transform: uppercase; white-space: nowrap; }
  .sp-radios { display: flex; gap: 0; flex-wrap: wrap; }
  .sp-radio { display: flex; align-items: center; gap: 0.28rem; cursor: pointer; padding: 3px 9px; border-radius: 4px; }
  .sp-radio input[type="radio"] { display: none; }
  .sp-dot { width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid #1e3448; background: #050d16; transition: background .12s, border-color .12s, box-shadow .12s; flex-shrink: 0; }
  .sp-active .sp-dot { background: #06b6d4; border-color: #06b6d4; box-shadow: 0 0 6px rgba(6,182,212,.5); }
  .sp-lbl { font-size: 0.68rem; font-weight: 600; color: #334155; white-space: nowrap; transition: color .12s; }
  .sp-active .sp-lbl { color: #cbd5e1; }

  .side-by-side {
    display: grid; grid-template-columns: 1fr auto; gap: 0.55rem; align-items: start;
  }
  .side-by-side > :only-child { grid-column: 1 / -1; }

  .sends-section { background: #060d17; border: 1px solid #0c1a28; border-radius: 8px; overflow: hidden; }
  .section-hdr { padding: 0.3rem 0.75rem; border-bottom: 1px solid #0c1a28; background: #070f1c; }
  .section-lbl { font-size: 0.58rem; font-weight: 800; letter-spacing: .15em; color: #1e3448; text-transform: uppercase; }

  .strips-row { display: flex; flex-direction: row; overflow-x: auto; gap: 8px; padding: 0.8rem 0.6rem; }
  .strips-row::-webkit-scrollbar { height: 3px; }
  .strips-row::-webkit-scrollbar-track { background: #060d17; }
  .strips-row::-webkit-scrollbar-thumb { background: #1a3040; border-radius: 2px; }

  .strip {
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    flex: 0 0 110px; min-width: 110px;
    padding: 0.85rem 0.6rem 0.9rem;
    border-radius: 8px; border: 1px solid #0f1e2e; background: #070e1a;
    transition: border-color .18s, background .18s, transform .12s;
  }
  .strip:hover { transform: translateY(-6px); }
  .strip-on  { border-color: #1a3a5c; background: #070f1e; }
  .strip-off { border-color: #2a100e; background: #0a0606; }

  .strip-name {
    font-size: 0.78rem; font-weight: 900; letter-spacing: .06em; color: #94a3b8;
    text-align: center; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;
    transition: color .12s;
  }
  .strip-on .strip-name { color: #64748b; }

  .fader-well {
    position: relative;
    width: 36px;
    height: 220px;
    flex-shrink: 0;
    overflow: visible;
  }

  .v-fader {
    position: absolute;
    top: 50%;
    left: 50%;
    height: 36px;
    transform: translate(-50%, -50%) rotate(-90deg);
    -webkit-appearance: none;
    appearance: none; background: transparent;
    outline: none;
    cursor: ns-resize;
  }

  .v-fader::-webkit-slider-runnable-track {
    height: 7px; background: #03060b;
    border: 1px solid #0f2030;
    border-radius: 4px;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.95);
  }
  .v-fader::-moz-range-track {
    height: 5px;
    background: #04090f;
    border: 1px solid #0f2030;
    border-radius: 3px;
  }

  .v-fader::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 34px; height: 18px;
    margin-top: -6px;
    background: linear-gradient(180deg, #273248 0%, #0f1724 50%, #273248 100%);
    border: 1px solid #3b5372;
    border-radius: 4px; box-shadow: 0 6px 14px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04);
    cursor: ns-resize;
    transition: border-color .12s, box-shadow .12s, transform .08s;
  }
  .v-fader::-moz-range-thumb {
    width: 26px; height: 13px;
    background: linear-gradient(180deg, #243044, #111827);
    border: 1px solid #2d4a6a; border-radius: 3px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.8);
    cursor: ns-resize;
  }

  .strip-on .v-fader::-webkit-slider-thumb { border-color: #1d4ed8; box-shadow: 0 2px 10px rgba(29,78,216,.4), inset 0 1px 0 rgba(255,255,255,0.06); }
  .strip-on .v-fader::-moz-range-thumb     { border-color: #1d4ed8; }

  .v-fader:hover::-webkit-slider-thumb  { border-color: #60a5fa; box-shadow: 0 0 14px rgba(96,165,250,.4); }
  .v-fader:active::-webkit-slider-thumb { background: linear-gradient(180deg, #1e3a5f, #0c1e3c); cursor: grabbing; }

  .fx-strip.strip-on .v-fader::-webkit-slider-thumb { border-color: #7c3aed; box-shadow: 0 2px 10px rgba(124,58,237,.4); }
  .fx-strip.strip-on .v-fader::-moz-range-thumb     { border-color: #7c3aed; }

  .db-read {
    font-family: 'JetBrains Mono', 'Fira Mono', monospace;
    font-size: 0.78rem; font-weight: 800; color: #cbd5e1; text-align: center; white-space: nowrap; transition: color .12s;
  }
  .strip-on .db-read { color: #3d5a73; }
  .db-unity          { color: #06b6d4 !important; }
  .db-unit           { font-size: 0.5rem; opacity: .7; }

  .on-btn {
    font-size: 0.72rem; font-weight: 900; letter-spacing: .06em;
    padding: 6px 0; width: 100%; border-radius: 6px; cursor: pointer;
    border: 1px solid #0f1e2e; background: #060d18; color: #cbd5e1;
    text-align: center; transition: background .12s, color .12s, border-color .12s;
  }
  .on-active { background: #052e16; color: #4ade80; border-color: #15803d; box-shadow: 0 0 8px rgba(74,222,128,.2); }

  .pp-btn {
    font-size: 0.68rem; font-weight: 900; letter-spacing: .06em;
    padding: 6px 0; width: 100%; border-radius: 6px; cursor: pointer;
    border: 1px solid #0f1e2e; background: #060d18; color: #cbd5e1;
    text-align: center; transition: background .12s, color .12s, border-color .12s;
  }
  .pp-active { background: #0c1e3c; color: #60a5fa; border-color: #1d4ed8; }

  .empty-state { color: #334155; padding: 2rem; text-align: center; font-size: 0.85rem; }

  @media (max-width: 900px) {
    .strip { flex: 0 0 84px; min-width: 84px; }
    .fader-well { height: 160px; width: 28px; }
    .v-fader { height: 28px; }
    .db-read { font-size: 0.66rem; }
  }
</style>