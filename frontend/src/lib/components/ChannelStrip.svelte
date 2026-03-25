<script>
  import { createEventDispatcher } from 'svelte';
  import { Link2 } from 'lucide-svelte';
  
  const dispatch = createEventDispatcher();
  
  export let channelIndex = '1';
  export let name = `CH ${channelIndex}`;
  export let iconType = 'icon_01'; // Native SVG fallback
  export let color = '#3b82f6';
  export let stripType = 'input'; // 'input', 'dca', 'output', 'main'
  export let pan = 0; // -100 to +100
  export let role = 'musician'; // 'foh' or 'musician'
  
  // Requirement: Default fader value is -Infinity (-60dB in this component's scale)
  export let level = -60; 
  export let muted = false;
  export let soloed = false;
  
  // Fake meter values for demo purposes
  export let peakLevel = -60;

  // Real EQ Curve Logic
  export let eqBands = null; // Array of band objects passed from App mixer state
  export let eqCurvePath = 'M0,20 L100,20'; // Base fallback

  // FOH Extras
  export let phantom = false;
  export let stereoLink = false;

  const dispatchStatus = (param, value) => {
    console.log(`[UI Action] ${name} ${param} => ${value}`);
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

  // Reactively redraw the mini EQ line if bands change
  $: if (eqBands) eqCurvePath = generateSvgPath(eqBands);


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
  }
</script>

<div class="channel-strip" class:is-foh={role === 'foh'}>
  <div class="strip-header" style="background: linear-gradient(180deg, {color}55 0%, transparent 100%); border-top: 3px solid {color};">
    <div class="icon-slot">
      {#if iconType}
        <img src="/icons-bmp/{iconType}.bmp" alt="Channel Icon" style="width: 22px; height: 22px; object-fit: contain; image-rendering: pixelated; border-radius: 2px; border: 1px solid #000;" />
      {:else}
        <div style="width: 22px; height: 22px; border-radius: 2px; border: 1px solid #27272a; background: #18181b;"></div>
      {/if}
    </div>
    <div class="channel-name" on:click={() => dispatch('nameClick')}>{name}</div>
  </div>

  <div class="gain-meter">
    <div class="gain-fill" style="width: {Math.max(0, (peakLevel + 60) / 60 * 100)}%;"></div>
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

      {#if stripType !== 'fx'}
        <div class="chart comp-chart">
          <span class="label">COMP</span>
          <div class="gr-meter"></div>
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
    <button class="mute-btn" class:active={muted} on:click={() => { muted = !muted; dispatchStatus('mute', muted); }}>M</button>
    <button class="solo-btn" class:active={soloed} on:click={() => { soloed = !soloed; dispatchStatus('solo', soloed); }}>S</button>
  </div>

  <div class="fader-container">
    <input type="range" class="fader-slider" min="-60" max="10" step="0.5" bind:value={level} on:dblclick={resetFader} />
    <div class="fader-track">
      <div class="fader-thumb" style="bottom: {((level + 60) / 70) * 100}%"></div>
    </div>
  </div>

  <div class="fader-value">
    <input type="number" bind:value={level} step="0.5" />
    <span>dB</span>
  </div>

  <div class="channel-number">{channelIndex}</div>
</div>

<style>
  .channel-strip {
    width: 82px;
    background: #18181b; /* Zinc 900 */
    border: 1px solid #27272a; /* Zinc 800 */
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 4px;
    font-family: 'Inter', sans-serif;
    color: #e2e8f0;
    box-sizing: border-box;
    flex-shrink: 0; /* Important for horizontal scrolling array */
    transition: all 0.2s;
  }
  
  .channel-strip:hover {
    background: #1f1f22;
  }

  /* Header */
  .strip-header { width: 100%; text-align: center; margin-bottom: 6px; padding-top: 4px; border-radius: 4px; }
  .icon-slot { display: flex; justify-content: center; margin-bottom: 4px; }
  .channel-name { font-size: 0.65rem; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.8); background: rgba(0,0,0,0.5); padding: 3px 0; border-radius: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; border: 1px solid transparent; transition: border-color 0.2s; }
  .channel-name:hover { border-color: #3b82f6; }

  /* Horizontal Meter */
  .gain-meter { width: 100%; height: 6px; background: #000; border-radius: 2px; margin-bottom: 8px; overflow: hidden; position: relative; box-shadow: inset 0 1px 2px rgba(0,0,0,0.8); border: 1px solid #27272a; }
  .gain-fill { height: 100%; background: linear-gradient(90deg, #10b981 60%, #f59e0b 85%, #ef4444 100%); transition: width 0.1s linear; }

  /* Panning */
  .pan-container { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 8px; width: 100%; }
  .pan-label { font-size: 0.55rem; color: #a1a1aa; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
  .pan-dial { width: 24px; height: 24px; border-radius: 50%; background: #18181b; border: 2px solid #27272a; position: relative; box-shadow: inset 0 2px 4px rgba(0,0,0,0.8); }
  .pan-pointer { position: absolute; top: 0; left: 50%; width: 2px; height: 50%; background: #3b82f6; transform-origin: bottom center; margin-left: -1px; border-radius: 1px; }

  /* FOH Controls */
  .foh-controls { width: 100%; display: flex; flex-direction: column; gap: 6px; margin-bottom: 6px; }
  .switches-row { display: flex; gap: 4px; justify-content: space-between; }
  .switch-btn { flex: 1; font-size: 0.55rem; font-weight: bold; padding: 2px 0; background: #27272a; border: 1px solid #3f3f46; color: #71717a; border-radius: 2px; cursor: pointer; transition: all 0.2s; }
  .switch-btn:hover { background: #3f3f46; }
  .switch-btn.phantom.active { background: #ef4444; color: #fff; border-color: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.4); }
  .switch-btn.link.active { background: #3b82f6; color: #fff; border-color: #3b82f6; box-shadow: 0 0 8px rgba(59, 130, 246, 0.4); }
  
  .chart { width: 100%; height: 32px; background: #09090b; border-radius: 3px; border: 1px solid #27272a; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 3px rgba(0,0,0,0.6); }
  .chart .label { position: absolute; top: 2px; left: 3px; font-size: 0.5rem; font-weight: 700; color: #52525b; z-index: 2; }
  .curve { width: 100%; height: 100%; stroke: #3b82f6; stroke-width: 1.5; fill: none; filter: drop-shadow(0 1px 2px rgba(59, 130, 246, 0.5)); }
  .gr-meter { width: 4px; height: 100%; background: #ef4444; position: absolute; right: 2px; transform-origin: top; transform: scaleY(0.3); opacity: 0.8; }

  .spacer { flex: 1; min-height: 12px; }

  /* Routing Mute/Solo */
  .routing-switches { width: 100%; display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
  .routing-switches button { width: 100%; height: 26px; font-size: 0.8rem; font-weight: 800; border: none; border-radius: 3px; cursor: pointer; color: #a1a1aa; background: #27272a; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: all 0.1s; }
  .routing-switches button:active { transform: translateY(1px); box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
  .mute-btn.active { background: #f59e0b; color: #000; box-shadow: 0 0 12px rgba(245, 158, 11, 0.5); }
  .solo-btn.active { background: #3b82f6; color: #fff; box-shadow: 0 0 12px rgba(59, 130, 246, 0.5); }

  /* Custom Fader Assembly */
  .fader-container { position: relative; width: 34px; height: 180px; display: flex; justify-content: center; margin-bottom: 12px; }
  .fader-track { position: absolute; width: 6px; height: 100%; background: #000; border-radius: 3px; border-left: 1px solid #27272a; border-right: 1px solid #3f3f46; box-shadow: inset 0 2px 4px rgba(0,0,0,0.8); }
  
  .fader-slider { 
    writing-mode: vertical-lr; direction: rtl;
    width: 34px; height: 100%; margin: 0; position: absolute; z-index: 2; opacity: 0; cursor: pointer;
  }
  
  /* 3D Thumb CSS rendering */
  .fader-thumb { 
    position: absolute; width: 30px; height: 16px; background: linear-gradient(180deg, #d4d4d8 0%, #a1a1aa 100%); 
    border-radius: 2px; left: -12px; margin-bottom: -8px; pointer-events: none; 
    border-top: 1px solid #fff; border-bottom: 2px solid #3f3f46; 
    box-shadow: 0 4px 6px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6); 
  }
  
  /* FOH distinct fader cap */
  .is-foh .fader-thumb { background: linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%); border-top: 1px solid #bfdbfe; border-bottom: 2px solid #1d4ed8; }

  /* Db Value */
  .fader-value { display: flex; align-items: center; justify-content: center; gap: 2px; width: 100%; background: #000; border-radius: 3px; padding: 4px 2px; margin-bottom: 6px; border: 1px solid #27272a; }
  .fader-value input { width: 100%; background: transparent; border: none; color: #60a5fa; font-size: 0.7rem; font-family: 'JetBrains Mono', monospace; font-weight: 600; text-align: right; outline: none; }
  .fader-value span { font-size: 0.55rem; color: #52525b; font-weight: bold; }

  .channel-number { width: 100%; text-align: center; font-size: 0.8rem; font-weight: 800; color: #52525b; padding: 4px 0; border-top: 2px solid #27272a; margin-top: auto; }
</style>