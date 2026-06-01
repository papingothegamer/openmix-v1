<script>
  import { createEventDispatcher } from 'svelte';
  import { Link2 } from 'lucide-svelte';
  import { setOsc } from '../socket.js';
  
  const dispatch = createEventDispatcher();
  
  export let channelIndex = '1';
  export let name = `CH ${channelIndex}`;
  export let iconType = 'icon_01'; // Native SVG fallback
  export let color = '#eab308';
  export let stripType = 'input'; // 'input', 'dca', 'output', 'main'
  export let pan = 0; // -100 to +100
  export let role = 'musician'; // 'foh' or 'musician'
  export let fineMode = false; // Global fine-adjust mode
  
  // Requirement: Default fader value is -Infinity (-60dB in this component's scale)
  export let level = -60; 
  export let muted = false;
  export let soloed = false;
  export let isStereo = false;
  
  // Fake meter values for demo purposes
  export let peakLevel = -60;

  // Real EQ Curve Logic
  export let eqBands = null; // Array of band objects passed from App mixer state
  export let eqCurvePath = 'M0,20 L100,20'; // Base fallback

  // Mini gate/compression visual parameters (FOH mode).
  export let gateThresh = -40;
  export let gateRange = 20;
  export let gateOn = true;

  export let compThresh = -20;
  export let compRatio = 4;
  export let compOn = true;

  // FOH Extras
  export let phantom = false;
  export let stereoLink = false;

  const dispatchStatus = (param, value) => {
    console.log(`[UI Action] ${name} ${param} => ${value}`);
  }

  function dbToFader(db) {
    const d = Number(db);
    if (!Number.isFinite(d)) return 0;

    // Clamp to the UI's intended -60dB .. +10dB range.
    const clamped = Math.max(-60, Math.min(10, d));
    if (clamped <= -60) return 0;

    // Handoff expects `/ch/XX/mix/fader` as a normalized 0..1 float.
    // Map +10dB -> 1 and -60dB -> 0.
    const maxDb = 10;
    const linear = Math.pow(10, clamped / 20);
    const linearAtMax = Math.pow(10, maxDb / 20);
    return Math.max(0, Math.min(1, linear / linearAtMax));
  }

  function emitFaderChange() {
    const idx = parseInt(channelIndex, 10);
    const idxStr = String(idx).padStart(2, '0');
    
    // 1) Input strip fader
    if (stripType === 'input') {
      if (role !== 'foh' && role !== 'musician') return;
      if (!Number.isFinite(idx) || idx < 1) return;
      setOsc(`/ch/${idxStr}/mix/fader`, dbToFader(level));
      return;
    }

    // 2) Output strip fader
    if (stripType === 'output') {
      if (role !== 'foh') return;
      if (!Number.isFinite(idx) || idx < 1) return;
      setOsc(`/bus/${idxStr}/mix/fader`, dbToFader(level));
      return;
    }

    // 3) DCA fader
    if (stripType === 'dca') {
      if (role !== 'foh') return;
      if (!Number.isFinite(idx) || idx < 1) return;
      // Note: WING uses /ae_data/dca/N/fdr, X32/XR18 uses /dca/N/fader
      // The backend OSC bridge usually aliases these, but we'll try standard path first.
      setOsc(`/dca/${idx}/fader`, dbToFader(level));
      return;
    }
  }

  function handleLevelChange(e) {
    const val = parseFloat(e.currentTarget.value);
    level = val;
    const idx = parseInt(channelIndex, 10);
    const idxStr = String(idx).padStart(2, '0');
    
    // Official Behringer X32/XR18 piecewise fader mapping (dB to float 0.0-1.0)
    let norm = 0.0;
    if (val >= -10) {
      norm = (val + 30) / 40;
    } else if (val >= -30) {
      norm = (val + 50) / 80;
    } else if (val >= -60) {
      norm = (val + 70) / 160;
    } else if (val > -90) {
      norm = (val + 90) / 480;
    }
    
    if (stripType === 'input') {
      setOsc(`/ch/${idxStr}/mix/fader`, norm);
    } else if (stripType === 'output' || stripType === 'matrix') {
      const typeStr = stripType === 'matrix' ? 'mtx' : 'bus';
      setOsc(`/${typeStr}/${idxStr}/mix/fader`, norm);
    } else if (stripType === 'dca' || stripType === 'mgp') {
      setOsc(`/dca/${idx}/fader`, norm);
    } else if (stripType === 'main') {
      setOsc(`/lr/mix/fader`, norm);
    }
    
    dispatchStatus('level', level);
  }

  function handleMute() {
    muted = !muted;
    const idx = parseInt(channelIndex, 10);
    const idxStr = String(idx).padStart(2, '0');
    const val = muted ? 0 : 1; // 0=Mute ON, 1=Mute OFF (ON) for X32

    if (stripType === 'input') {
      setOsc(`/ch/${idxStr}/mix/on`, val);
    } else if (stripType === 'output') {
      setOsc(`/bus/${idxStr}/mix/on`, val);
    } else if (stripType === 'dca') {
      setOsc(`/dca/${idx}/on`, val);
    }
    
    dispatchStatus('mute', muted);
  }

  // --- Dynamic EQ Mini-Chart Generator ---
  function generateSvgPath(bands) {
    if (!bands || bands.length === 0) return 'M0,20 L100,20';
    
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    const points = [];
    
    for (let i = 0; i <= 100; i += 2) { // Iterate width 0 to 100px (step 2 for performance)
      const logFreq = logMin + (i / 100) * (logMax - logMin);
      const freq = Math.pow(10, logFreq);
      let totalGain = 0;
      
      for (const band of bands) {
        if (!band.enabled) continue;
        const f0 = Math.pow(10, band.logVal || Math.log10(band.freq));
        const ratio = freq / f0;
        const logR = Math.log2(ratio);

        switch(band.type) {
          case 'hpf12': totalGain += ratio < 1 ? -12 * Math.log2(1/ratio) : 0; break;
          case 'hpf48': totalGain += ratio < 1 ? -48 * Math.log2(1/ratio) : 0; break;
          case 'lpf12': totalGain += ratio > 1 ? -12 * Math.log2(ratio) : 0; break;
          case 'lpf48': totalGain += ratio > 1 ? -48 * Math.log2(ratio) : 0; break;
          case 'loshelf': totalGain += band.gain / (1 + Math.pow(ratio, 2)); break;
          case 'hishelf': totalGain += band.gain * (1 - 1 / (1 + Math.pow(ratio, 2))); break;
          case 'notch': {
            const bw = 1 / Math.max(band.q, 0.1);
            const x = logR / bw;
            totalGain += -15 / (1 + x * x);
            break;
          }
          case 'peq':
          default: {
            const bw = 1 / Math.max(band.q, 0.1);
            const x = logR / bw;
            totalGain += band.gain / (1 + x * x * 4);
            break;
          }
        }
      }
      
      // Clamp to +/- 15dB and map to SVG Y-coordinates (Height 40px, Center 20px)
      totalGain = Math.max(-15, Math.min(15, totalGain));
      const y = 20 - (totalGain / 15) * 18; 
      points.push(`${i === 0 ? 'M' : 'L'}${i},${y.toFixed(1)}`);
    }
    
    return points.join(' ');
  }

  function clampDb(v, lo = -80, hi = 0) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(lo, Math.min(hi, n));
  }

  function dbToX(db) {
    // Map [-80..0] -> [0..100] for the mini charts.
    const n = clampDb(db, -80, 0);
    return ((n + 80) / 80) * 100;
  }

  function dbToY(db) {
    // Chart SVG viewBox is 0..40 for Y.
    const n = clampDb(db, -80, 0);
    return 40 - ((n + 80) / 80) * 40;
  }

  function generateGateMiniPoints(thresh, range, enabled) {
    const effRange = enabled ? Number(range) : 0;
    const thr = Number(thresh);
    const pts = [];
    for (let x = -80; x <= 0; x += 2) {
      const y = x < thr ? x - effRange : x;
      const sx = dbToX(x);
      const sy = dbToY(y);
      pts.push(`${sx},${sy}`);
    }
    return pts.join(" ");
  }

  function generateCompMiniPoints(thresh, ratio, enabled) {
    const effRatio = enabled ? Math.max(1, Number(ratio)) : 1;
    const thr = Number(thresh);
    const pts = [];
    for (let x = -80; x <= 0; x += 2) {
      const y = x < thr ? x : thr + (x - thr) / effRatio;
      const sx = dbToX(x);
      const sy = dbToY(y);
      pts.push(`${sx},${sy}`);
    }
    return pts.join(" ");
  }

  let gateCurvePoints = "";
  let compCurvePoints = "";
  let gateThrX = 50;
  let compThrX = 50;

  $: gateCurvePoints = generateGateMiniPoints(
    gateThresh,
    gateRange,
    gateOn,
  );
  $: compCurvePoints = generateCompMiniPoints(
    compThresh,
    compRatio,
    compOn,
  );
  $: gateThrX = dbToX(gateThresh);
  $: compThrX = dbToX(compThresh);

  // Reactively redraw the mini EQ line if bands change
  $: if (eqBands) eqCurvePath = generateSvgPath(eqBands);

  // ── Vertical VU Meter ───────────────────────────────────────────────────────
  // peakLevel is already in dB (-60 to 0). Map it to a 0-100% fill.
  // Segments: green = -60..-12, yellow = -12..-3, red = -3..0
  let peakHold = -60;       // dB value of the peak-hold indicator
  let peakHoldTimer = null;

  $: {
    if (peakLevel > peakHold) {
      peakHold = peakLevel;
      clearTimeout(peakHoldTimer);
      peakHoldTimer = setTimeout(() => { peakHold = -60; }, 1800);
    }
  }

  // Convert dB (-60..0) to a 0-100 percentage for CSS height/bottom.
  function dbToPct(db) {
    const clamped = Math.max(-60, Math.min(0, db));
    return ((clamped + 60) / 60) * 100;
  }

  $: meterFillPct  = dbToPct(peakLevel);
  $: peakHoldPct   = dbToPct(peakHold);

  // Colour zones (bottom to top: green, yellow, red)
  // Green  fills 0-80% of the bar  => covers -60 to -12 dB
  // Yellow fills 80-95%            => covers -12 to -3 dB
  // Red    fills 95-100%           => covers -3 to  0 dB
  $: meterGreenH  = Math.min(meterFillPct, 80);          // 0..80
  $: meterYellowH = Math.max(0, Math.min(meterFillPct - 80, 15)); // 0..15
  $: meterRedH    = Math.max(0, meterFillPct - 95);      // 0..5

  // Fader dB tick positions (maps dB to bottom % using the fader formula)
  const FADER_TICKS = [10, 5, 0, -10, -20, -40, -60];
  function dbToTickPct(db) { return ((db + 60) / 70) * 100; }

  // Fine mode: change step resolution
  $: faderStep = fineMode ? 0.1 : 0.5;

  function handleWheel(e) {
    if (!fineMode) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    level = Math.max(-60, Math.min(10, level + delta));
    emitFaderChange();
  }
  // --- Panning UI Logic ---
  let isPanning = false;
  let startX = 0;
  let startPan = 0;

  function startPanDrag(e) {
    isPanning = true;
    startX = e.clientX;
    startPan = pan;
    window.addEventListener('pointermove', onPanMove);
    window.addEventListener('pointerup', onPanEnd);
  }

  function onPanMove(e) {
    if (!isPanning) return;
    const deltaX = e.clientX - startX;
    pan = Math.max(-100, Math.min(100, Math.round(startPan + deltaX)));
    dispatchStatus('pan', pan);
  }

  function onPanEnd() {
    isPanning = false;
    window.removeEventListener('pointermove', onPanMove);
    window.removeEventListener('pointerup', onPanEnd);
  }

  function resetPan() {
    pan = 0;
    dispatchStatus('pan', pan);
  }

  // Reset Fader to -Infinity
  function resetFader() {
    level = -60;
    dispatchStatus('level', level);
    emitFaderChange();
  }
</script>

<div class="channel-strip" class:is-foh={role === 'foh'}>
  <div class="strip-header" style="background: linear-gradient(180deg, {color}55 0%, transparent 100%); border-top: 3px solid {color};">
    <div class="icon-slot">
      {#if iconType}
        <img src="/icons-bmp/{iconType}.bmp" alt="Channel Icon" style="width: 22px; height: 22px; object-fit: contain; image-rendering: pixelated; border-radius: 2px; border: 1px solid #000;" />
      {:else}
        <div style="width: 22px; height: 22px; border-radius: 2px; border: 1px solid #252525; background: #18181b;"></div>
      {/if}
    </div>
    <div class="channel-name" on:click={() => dispatch('nameClick')}>
      {name}
      {#if isStereo}
        <span class="st-indicator" title="Stereo Bus">ST</span>
      {/if}
    </div>
  </div>



  {#if role === 'foh' && stripType !== 'dca'}
    <div class="foh-controls">
      {#if stripType === 'input' || stripType === 'output'}
        <div class="switches-row">
          <button class="switch-btn phantom" class:active={phantom} on:click={() => phantom = !phantom}>48V</button>
          <button class="switch-btn link" class:active={stereoLink} on:click={() => dispatch('toggleLink')}>LINK</button>
        </div>
      {/if}

      <div class="chart eq-chart">
        <span class="label">EQ</span>
        <svg viewBox="0 0 100 40" class="curve"><path d="{eqCurvePath}" /></svg>
      </div>

      {#if stripType === 'input'}
        <div class="chart gate-chart">
          <span class="label">GATE</span>
          <svg viewBox="0 0 100 40" class="mini-svg">
            <line x1={gateThrX} y1="0" x2={gateThrX} y2="40" stroke="#252525" stroke-width="1" opacity={gateOn ? 0.9 : 0.25} />
            <polyline points={gateCurvePoints} class="gate-poly" />
          </svg>
        </div>
      {/if}

      {#if stripType !== 'fx'}
        <div class="chart comp-chart">
          <span class="label">COMP</span>
          <svg viewBox="0 0 100 40" class="mini-svg">
            <line x1={compThrX} y1="0" x2={compThrX} y2="40" stroke="#252525" stroke-width="1" opacity={compOn ? 0.9 : 0.25} />
            <polyline points={compCurvePoints} class="comp-poly" />
          </svg>
        </div>
      {/if}
    </div>
  {/if}

  <div class="spacer"></div>

  <div class="pan-container" title="Pan: {pan}">
    <span class="pan-label">{pan < 0 ? 'L' + Math.abs(pan) : pan > 0 ? 'R' + pan : 'C'}</span>
    <div class="pan-dial" 
         on:pointerdown|preventDefault={startPanDrag} 
         on:dblclick={resetPan} 
         style="cursor: ew-resize;"
         role="slider"
         aria-valuenow={pan}
         tabindex="0">
      <div class="pan-pointer" style="transform: rotate({pan * 1.3}deg);"></div>
    </div>
  </div>

  <div class="routing-switches">
    <button class="mute-btn" class:active={muted} on:click={handleMute}>M</button>
    <button class="solo-btn" class:active={soloed} on:click={() => { soloed = !soloed; dispatchStatus('solo', soloed); }}>S</button>
  </div>

  <div class="fader-meter-row">
    <!-- Vertical VU Meter -->
    <div class="vu-meter" title="{peakLevel.toFixed(1)} dB">
      <div class="vu-track">
        <!-- Coloured fill segments, growing from bottom -->
        <div class="vu-seg vu-green"  style="height: {meterGreenH}%"></div>
        <div class="vu-seg vu-yellow" style="height: {meterYellowH}%"></div>
        <div class="vu-seg vu-red"    style="height: {meterRedH}%"></div>
      </div>
      <!-- Peak-hold tick -->
      <div class="vu-peak" style="bottom: {peakHoldPct}%"></div>
    </div>

    <!-- Fader dB Tick Marks -->
    <div class="fader-ticks">
      {#each FADER_TICKS as db}
        <div class="tick" style="bottom: {dbToTickPct(db)}%" class:tick-zero={db === 0}></div>
      {/each}
    </div>

    <!-- Fader -->
    <div class="fader-container">
      <input
        type="range"
        class="fader-slider"
        min="-60"
        max="10"
        step={faderStep}
        bind:value={level}
        on:dblclick={resetFader}
        on:input={emitFaderChange}
        on:wheel|preventDefault={handleWheel}
      />
      <div class="fader-track">
        <div class="fader-thumb" style="bottom: {((level + 60) / 70) * 100}%"></div>
      </div>
    </div>
  </div>

  <div class="fader-value">
    <input
      type="number"
      bind:value={level}
      step="0.5"
      on:input={emitFaderChange}
    />
    <span>dB</span>
  </div>

  <div class="channel-number">{channelIndex}</div>
</div>

<style>
  .channel-strip {
    width: 86px;
    background: #141414;
    border: 1px solid #252525;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 4px;
    font-family: var(--sans);
    color: #e5e5e5;
    box-sizing: border-box;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  
  .channel-strip:hover {
    background: #1a1a1a;
  }

  /* Header */
  .strip-header { width: 100%; text-align: center; margin-bottom: 6px; padding-top: 4px; border-radius: 4px; }
  .icon-slot { display: flex; justify-content: center; margin-bottom: 4px; }
  .channel-name { font-size: 0.65rem; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.8); background: rgba(0,0,0,0.5); padding: 3px 0; border-radius: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; border: 1px solid transparent; transition: border-color 0.2s; }
  .channel-name:hover { border-color: #eab308; }

  /* Fader + Ticks + Meter side-by-side row */
  .fader-meter-row {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    gap: 2px;
    margin-bottom: 12px;
  }

  /* Vertical VU Meter */
  .vu-meter {
    position: relative;
    width: 8px;
    height: 180px;
    background: #0a0a0a;
    border-radius: 3px;
    border: 1px solid #252525;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.8);
    flex-shrink: 0;
  }

  .vu-track {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    display: flex;
    flex-direction: column-reverse;
    height: 100%;
    align-items: stretch;
  }

  .vu-seg {
    width: 100%;
    flex-shrink: 0;
    transition: height 0.06s linear;
  }
  .vu-green  { background: #10b981; box-shadow: 0 0 4px rgba(16,185,129,0.6); }
  .vu-yellow { background: #eab308; box-shadow: 0 0 4px rgba(234,179,8,0.6); }
  .vu-red    { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.8); }

  /* Peak-hold indicator tick */
  .vu-peak {
    position: absolute;
    left: 0;
    width: 100%;
    height: 2px;
    background: #fff;
    opacity: 0.85;
    border-radius: 1px;
    transition: bottom 0.1s ease-out;
    pointer-events: none;
  }

  /* Fader dB Tick Marks */
  .fader-ticks {
    position: relative;
    width: 6px;
    height: 180px;
    flex-shrink: 0;
  }
  .tick {
    position: absolute;
    right: 0;
    width: 4px;
    height: 1px;
    background: #404040;
    transform: translateY(0.5px);
  }
  .tick.tick-zero {
    width: 6px;
    height: 2px;
    background: #eab308;
  }

  /* Panning */
  .pan-container { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 8px; width: 100%; }
  .pan-label { font-size: 0.55rem; color: #a3a3a3; font-weight: 700; font-family: var(--mono); }
  .pan-dial { width: 24px; height: 24px; border-radius: 50%; background: #141414; border: 2px solid #252525; position: relative; box-shadow: inset 0 2px 4px rgba(0,0,0,0.8); }
  .pan-pointer { position: absolute; top: 0; left: 50%; width: 2px; height: 50%; background: #eab308; transform-origin: bottom center; margin-left: -1px; border-radius: 1px; }

  /* FOH Controls */
  .foh-controls { width: 100%; display: flex; flex-direction: column; gap: 6px; margin-bottom: 6px; }
  .switches-row { display: flex; gap: 4px; justify-content: space-between; }
  .switch-btn { flex: 1; font-size: 0.55rem; font-weight: bold; padding: 2px 0; background: #1e1e1e; border: 1px solid #333; color: #666; border-radius: 2px; cursor: pointer; transition: all 0.2s; }
  .switch-btn:hover { background: #2a2a2a; }
  .switch-btn.phantom.active { background: #ef4444; color: #fff; border-color: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.4); }
  .switch-btn.link.active { background: #eab308; color: #000; border-color: #eab308; box-shadow: 0 0 8px rgba(234, 179, 8, 0.4); }
  
  .chart { width: 100%; height: 32px; background: #0a0a0a; border-radius: 3px; border: 1px solid #252525; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 3px rgba(0,0,0,0.6); }
  .chart .label { position: absolute; top: 2px; left: 3px; font-size: 0.5rem; font-weight: 700; color: #555; z-index: 2; }
  .curve { width: 100%; height: 100%; stroke: #3b82f6; stroke-width: 1.5; fill: none; filter: drop-shadow(0 1px 2px rgba(59, 130, 246, 0.4)); }
  .gr-meter { width: 4px; height: 100%; background: #ef4444; position: absolute; right: 2px; transform-origin: top; transform: scaleY(0.3); opacity: 0.8; }

  .mini-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .gate-poly {
    fill: none;
    stroke: #facc15;
    stroke-width: 2;
  }

  .comp-poly {
    fill: none;
    stroke: #10b981;
    stroke-width: 2;
  }

  .spacer { flex: 1; min-height: 12px; }

  /* Routing Mute/Solo */
  .routing-switches { width: 100%; display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
  .routing-switches button { width: 100%; height: 26px; font-size: 0.8rem; font-weight: 800; border: none; border-radius: 3px; cursor: pointer; color: #888; background: #1e1e1e; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: all 0.1s; }
  .routing-switches button:active { transform: translateY(1px); box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
  .mute-btn.active { background: #ef4444; color: #fff; box-shadow: 0 0 12px rgba(239, 68, 68, 0.5); }
  .solo-btn.active { background: #eab308; color: #000; box-shadow: 0 0 12px rgba(234, 179, 8, 0.5); }

  /* Custom Fader Assembly */
  .fader-container { position: relative; width: 34px; height: 180px; display: flex; justify-content: center; }
  .fader-track { position: absolute; width: 6px; height: 100%; background: #0a0a0a; border-radius: 3px; border-left: 1px solid #252525; border-right: 1px solid #333; box-shadow: inset 0 2px 4px rgba(0,0,0,0.8); }
  
  .fader-slider { 
    writing-mode: vertical-lr; direction: rtl;
    width: 34px; height: 100%; margin: 0; position: absolute; z-index: 2; opacity: 0; cursor: pointer;
  }
  
  /* 3D Thumb CSS rendering */
  .fader-thumb { 
    position: absolute; width: 30px; height: 16px; background: linear-gradient(180deg, #d4d4d8 0%, #a3a3a3 100%); 
    border-radius: 2px; left: -12px; margin-bottom: -8px; pointer-events: none; 
    border-top: 1px solid #fff; border-bottom: 2px solid #555; 
    box-shadow: 0 4px 6px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6); 
  }
  
  /* FOH distinct fader cap — white */
  .is-foh .fader-thumb { background: linear-gradient(180deg, #ffffff 0%, #d4d4d8 100%); border-top: 1px solid #fff; border-bottom: 2px solid #a1a1aa; box-shadow: 0 4px 6px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6), 0 0 8px rgba(255,255,255,0.15); }

  /* Db Value */
  .fader-value { display: flex; align-items: center; justify-content: center; gap: 2px; width: 100%; background: #0a0a0a; border-radius: 3px; padding: 4px 2px; margin-bottom: 6px; border: 1px solid #252525; }
  .fader-value input { width: 100%; background: transparent; border: none; color: #facc15; font-size: 0.7rem; font-family: var(--mono); font-weight: 600; text-align: right; outline: none; }
  .fader-value span { font-size: 0.55rem; color: #555; font-weight: bold; }

  .st-indicator { font-size: 0.5rem; background: #eab308; color: #000; padding: 1px 3px; border-radius: 2px; margin-left: 4px; font-weight: 900; vertical-align: middle; }

  .channel-number { width: 100%; text-align: center; font-size: 0.8rem; font-weight: 800; color: #555; padding: 4px 0; border-top: 2px solid #252525; margin-top: auto; }
</style>
