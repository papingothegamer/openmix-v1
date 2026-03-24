<script>
  import { onMount } from 'svelte';
  
  export let channelId = 'in_1';
  
  let canvas;
  let ctx;
  let width = 800;
  let height = 400;
  let selectedBandIndex = 2; // Default to Band 3

  // --- Core EQ Band Model ---
  let bands = [
    { id: 1, type: 'hpf12', freq: 80,  gain: 0, q: 0.71, logVal: 1.903, enabled: true },
    { id: 2, type: 'loshelf', freq: 200, gain: 0, q: 0.71, logVal: 2.301, enabled: true },
    { id: 3, type: 'peq',  freq: 500, gain: 0, q: 1.0,  logVal: 2.699, enabled: true },
    { id: 4, type: 'peq',  freq: 1000,gain: 0, q: 1.0,  logVal: 3.0,   enabled: true },
    { id: 5, type: 'peq',  freq: 2000,gain: 0, q: 1.0,  logVal: 3.301, enabled: true },
    { id: 6, type: 'peq',  freq: 4000,gain: 0, q: 1.0,  logVal: 3.602, enabled: true },
    { id: 7, type: 'hishelf', freq: 8000,gain: 0, q: 0.71, logVal: 3.903, enabled: true },
    { id: 8, type: 'lpf12',  freq: 18000,gain: 0, q: 0.71, logVal: 4.255, enabled: true },
  ];

  const filterTypes = ['hpf12', 'hpf48', 'loshelf', 'peq', 'notch', 'hishelf', 'lpf12', 'lpf48'];
  const filterNames = {
      hpf12: 'Highpass 12dB', hpf48: 'Highpass 48dB',
      loshelf: 'Low Shelf', peq: 'Bell', notch: 'Notch',
      hishelf: 'High Shelf', lpf12: 'Lowpass 12dB', lpf48: 'Lowpass 48dB'
  };
  const shortNames = {
      hpf12: 'HPF', hpf48: 'HPF', loshelf: 'LO-SHV', peq: 'BELL',
      notch: 'NOTCH', hishelf: 'HI-SHV', lpf12: 'LPF', lpf48: 'LPF'
  };

  let dropdownOpenId = null;
  function toggleDropdown(e, id) {
      e.stopPropagation();
      dropdownOpenId = dropdownOpenId === id ? null : id;
  }
  function closeDropdowns() { dropdownOpenId = null; }
  function selectShape(band, type) {
      band.type = type;
      dropdownOpenId = null;
      updateBands();
  }

  function getGainDisplay(g) { return g > 0 ? '+' + g.toFixed(1) : g.toFixed(1); }

  // --- Canvas Rendering ---
  function freqToX(f) {
      const logMin = Math.log10(20);
      const logMax = Math.log10(22000);
      return ((Math.log10(f) - logMin) / (logMax - logMin)) * width;
  }

  function gainToY(g) {
      return height / 2 - (g / 15) * (height / 2 - 30);
  }

  function computeBandResponse(band, freq) {
      if (!band.enabled) return 0;
      const f0 = Math.pow(10, band.logVal);
      const ratio = freq / f0;
      const logR = Math.log2(ratio);

      switch(band.type) {
          case 'hpf12': return ratio < 1 ? -12 * Math.log2(1/ratio) : 0;
          case 'hpf48': return ratio < 1 ? -48 * Math.log2(1/ratio) : 0;
          case 'lpf12': return ratio > 1 ? -12 * Math.log2(ratio) : 0;
          case 'lpf48': return ratio > 1 ? -48 * Math.log2(ratio) : 0;
          case 'loshelf': return band.gain / (1 + Math.pow(ratio, 2));
          case 'hishelf': return band.gain * (1 - 1 / (1 + Math.pow(ratio, 2)));
          case 'notch': {
              const bw = 1 / Math.max(band.q, 0.1);
              const x = logR / bw;
              return -15 / (1 + x * x);
          }
          case 'peq':
          default: {
              const bw = 1 / Math.max(band.q, 0.1);
              const x = logR / bw;
              return band.gain / (1 + x * x * 4);
          }
      }
  }

  function drawEQ() {
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // --- Background Grid ---
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;

      // Horizontal gain lines
      const gainValues = [-12, -6, 0, 6, 12];
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      for (const g of gainValues) {
          const y = gainToY(g);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
          ctx.fillStyle = '#475569';
          ctx.fillText(`${g > 0 ? '+' : ''}${g}dB`, 42, y - 3);
      }

      // Vertical frequency lines
      const freqs = [20, 30, 40, 50, 60, 80, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000, 20000];
      const labelFreqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
      ctx.textAlign = 'center';
      for (const f of freqs) {
          const x = freqToX(f);
          ctx.strokeStyle = labelFreqs.includes(f) ? '#334155' : '#1a2233';
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
          if (labelFreqs.includes(f)) {
              ctx.fillStyle = '#475569';
              ctx.fillText(f >= 1000 ? (f/1000) + 'k' : f.toString(), x, height - 6);
          }
      }

      // --- Composite Response Curve ---
      const numPoints = 512;
      const logMin = Math.log10(20);
      const logMax = Math.log10(22000);
      const points = [];

      for (let i = 0; i <= numPoints; i++) {
          const logFreq = logMin + (i / numPoints) * (logMax - logMin);
          const freq = Math.pow(10, logFreq);
          let totalGain = 0;
          for (const b of bands) totalGain += computeBandResponse(b, freq);
          totalGain = Math.max(-15, Math.min(15, totalGain));
          points.push({ x: freqToX(freq), y: gainToY(totalGain) });
      }

      // Fill under curve
      ctx.beginPath();
      ctx.moveTo(points[0].x, gainToY(0));
      for (const p of points) ctx.lineTo(p.x, p.y);
      ctx.lineTo(points[points.length - 1].x, gainToY(0));
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
      grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.02)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.12)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Stroke curve
      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
          if (i === 0) ctx.moveTo(points[i].x, points[i].y);
          else ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // --- Band control nodes ---
      for (let i = 0; i < bands.length; i++) {
          const b = bands[i];
          const bx = freqToX(Math.pow(10, b.logVal));
          let totalGain = 0;
          const freq = Math.pow(10, b.logVal);
          for (const ob of bands) totalGain += computeBandResponse(ob, freq);
          totalGain = Math.max(-15, Math.min(15, totalGain));
          const by = gainToY(totalGain);

          ctx.beginPath();
          ctx.arc(bx, by, i === selectedBandIndex ? 9 : 7, 0, Math.PI * 2);
          ctx.fillStyle = b.enabled
              ? (i === selectedBandIndex ? '#f59e0b' : '#38bdf8')
              : '#475569';
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#000';
          ctx.font = 'bold 9px Inter';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.id.toString(), bx, by);
      }
  }

  function updateBands() {
      bands.forEach(b => { b.freq = Math.pow(10, b.logVal); });
      bands = [...bands];
      drawEQ();
  }

  export function resetFlat() {
      bands = bands.map(b => ({ ...b, gain: 0, q: 1.0 }));
      updateBands();
  }

  /** Returns a simplified SVG path for the current EQ curve (for ChannelStrip mini-chart) */
  export function getCurvePath(w = 100, h = 40) {
      const numPts = 64;
      const logMin = Math.log10(20);
      const logMax = Math.log10(22000);
      let d = '';
      for (let i = 0; i <= numPts; i++) {
          const logFreq = logMin + (i / numPts) * (logMax - logMin);
          const freq = Math.pow(10, logFreq);
          let totalGain = 0;
          for (const b of bands) totalGain += computeBandResponse(b, freq);
          totalGain = Math.max(-15, Math.min(15, totalGain));
          const x = (i / numPts) * w;
          const y = h / 2 - (totalGain / 15) * (h / 2 - 4);
          d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
      }
      return d;
  }

  onMount(() => {
      ctx = canvas.getContext('2d');
      const ro = new ResizeObserver(entries => {
          for (const entry of entries) {
              width = entry.contentRect.width;
              height = entry.contentRect.height;
              drawEQ();
          }
      });
      ro.observe(canvas.parentElement);
      drawEQ();
      return () => ro.disconnect();
  });

  $: if (ctx && bands) drawEQ();
</script>

<svelte:window on:click={closeDropdowns} />

<div class="eq-container fade-in">
    <svg style="display: none;">
      <symbol id="icon-hpf12" viewBox="0 0 24 24"><path d="M4 22 Q10 22 12 12 L20 12" stroke="currentColor" stroke-width="2.5" fill="none"/></symbol>
      <symbol id="icon-hpf48" viewBox="0 0 24 24"><path d="M4 22 L10 22 L10 12 L20 12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linejoin="round"/></symbol>
      <symbol id="icon-loshelf" viewBox="0 0 24 24"><path d="M4 18 L10 18 C14 18, 14 8, 18 8 L22 8" stroke="currentColor" stroke-width="2.5" fill="none"/></symbol>
      <symbol id="icon-peq" viewBox="0 0 24 24"><path d="M4 16 C8 16, 10 4, 12 4 C14 4, 16 16, 20 16" stroke="currentColor" stroke-width="2.5" fill="none"/></symbol>
      <symbol id="icon-notch" viewBox="0 0 24 24"><path d="M4 8 L10 8 L12 22 L14 8 L20 8" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linejoin="round"/></symbol>
      <symbol id="icon-hishelf" viewBox="0 0 24 24"><path d="M4 8 L10 8 C14 8, 14 18, 18 18 L22 18" stroke="currentColor" stroke-width="2.5" fill="none"/></symbol>
      <symbol id="icon-lpf12" viewBox="0 0 24 24"><path d="M4 12 L12 12 Q14 12 20 22" stroke="currentColor" stroke-width="2.5" fill="none"/></symbol>
      <symbol id="icon-lpf48" viewBox="0 0 24 24"><path d="M4 12 L14 12 L14 22 L20 22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linejoin="round"/></symbol>
    </svg>

    <!-- Left Wing Sidebar -->
    <div class="wing-sidebar">
        <div class="wing-band-list">
            {#each bands as band, i}
                <button class="wing-band-row" class:active={selectedBandIndex === i} on:click|stopPropagation={() => selectedBandIndex = i}>
                    <div class="wing-band-name">
                        <span class="w-id">{band.id}</span>
                        <span class="w-type">{shortNames[band.type]}</span>
                    </div>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div class="w-toggle" class:is-on={band.enabled} on:click|stopPropagation={() => { band.enabled = !band.enabled; updateBands(); }}></div>
                </button>
            {/each}
        </div>

        <div class="wing-detail-view">
            {#if bands[selectedBandIndex]}
                {@const activeBand = bands[selectedBandIndex]}
                <div class="w-detail-header">
                    <div class="w-detail-title-group">
                        <span class="w-band-label">BAND {activeBand.id}</span>
                        <button class="w-mini-toggle" class:is-on={activeBand.enabled} on:click|stopPropagation={() => { activeBand.enabled = !activeBand.enabled; updateBands(); }}>
                            {activeBand.enabled ? 'ON' : 'OFF'}
                        </button>
                    </div>
                    
                    <div class="w-dropdown-wrapper">
                        <button class="w-shape-btn" on:click|stopPropagation={(e) => toggleDropdown(e, activeBand.id)}>
                            <div class="w-shape-flex">
                                <svg width="24" height="14" viewBox="0 0 24 24"><use href="#icon-{activeBand.type}"/></svg>
                                <span>{filterNames[activeBand.type]}</span>
                            </div>
                            <span class="w-dropdown-arrow">▼</span>
                        </button>
                        {#if dropdownOpenId === activeBand.id}
                            <div class="w-shape-dropdown fade-in">
                                {#each filterTypes as t}
                                    <button class="shape-option" class:active={activeBand.type === t} on:click|stopPropagation={() => selectShape(activeBand, t)}>
                                        <svg width="20" height="20" viewBox="0 0 24 24"><use href="#icon-{t}"/></svg>
                                        <span>{filterNames[t]}</span>
                                        {#if activeBand.type === t}<span class="active-dot">•</span>{/if}
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="w-slider-group">
                    <label for="eq-gain-{activeBand.id}">GAIN <span class="w-val">{getGainDisplay(activeBand.gain)} dB</span></label>
                    <input id="eq-gain-{activeBand.id}" type="range" class="knob-proxy" min="-15" max="15" step="0.1" bind:value={activeBand.gain} on:input={updateBands} disabled={!activeBand.enabled} />
                </div>
                
                <div class="w-slider-group">
                    <label for="eq-q-{activeBand.id}">Q <span class="w-val-green">{activeBand.q.toFixed(2)}</span></label>
                    <input id="eq-q-{activeBand.id}" type="range" class="knob-proxy-green" min="0.1" max="10" step="0.1" bind:value={activeBand.q} on:input={updateBands} disabled={!activeBand.enabled} />
                </div>
                
                <div class="w-slider-group">
                    <label for="eq-freq-{activeBand.id}">FREQ <span class="w-val-blue">{Math.round(Math.pow(10, activeBand.logVal))} Hz</span></label>
                    <input id="eq-freq-{activeBand.id}" type="range" class="knob-proxy-blue" min="1.0" max="4.342" step="0.01" bind:value={activeBand.logVal} on:input={updateBands} disabled={!activeBand.enabled} />
                </div>
            {/if}
        </div>
    </div>

    <!-- Center Canvas Engine -->
    <div class="canvas-wrapper">
        <canvas bind:this={canvas} {width} {height}></canvas>
    </div>
</div>

<style>
  .eq-container { display: flex; flex-direction: row; width: 100%; height: 500px; max-height: 65vh; background: #0b0d12; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; font-family: 'Inter', sans-serif; box-shadow: 0 12px 48px rgba(0,0,0,0.4); }
  .canvas-wrapper { flex: 1; min-height: 0; position: relative; background: #080a0f; }
  canvas { display: block; width: 100%; height: 100%; }
  
  .wing-sidebar { width: 340px; flex-shrink: 0; display: flex; flex-direction: row; background: #12151c; border-right: 1px solid #1e293b; }
  
  .wing-band-list { width: 125px; display: flex; flex-direction: column; background: #0f1115; border-right: 1px solid #1e293b; overflow-y: auto; }
  .wing-band-list::-webkit-scrollbar { width: 0; }
  .wing-band-row { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 0.6rem; border: none; border-bottom: 1px solid #1e293b; background: transparent; cursor: pointer; transition: 0.1s; outline: none; }
  .wing-band-row:hover { background: rgba(59,130,246,0.05); }
  .wing-band-row.active { background: #1f2937; border-left: 3px solid #3b82f6; }
  .wing-band-name { display: flex; gap: 0.5rem; align-items: center; color: #64748b; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }
  .wing-band-row.active .wing-band-name { color: #f8fafc; font-weight: 700; }
  .w-id { font-weight: 800; font-size: 0.85rem; }
  
  .w-toggle { min-width: 12px; min-height: 12px; border-radius: 50%; border: 1px solid #475569; background: #0f1115; transition: 0.2s; flex-shrink: 0; }
  .w-toggle.is-on { background: transparent; border-color: #f8fafc; border-width: 2px; }
  
  .wing-detail-view { flex: 1; padding: 1.25rem 1rem; display: flex; flex-direction: column; gap: 1.5rem; background: #1f2937; }
  .w-detail-header { display: flex; flex-direction: column; gap: 0.8rem; }
  .w-detail-title-group { display: flex; justify-content: space-between; align-items: center; }
  .w-band-label { color: #94a3b8; font-size: 0.75rem; font-weight: 800; letter-spacing: 1px; }
  .w-mini-toggle { border: none; background: #374151; color: #94a3b8; font-size: 0.65rem; padding: 0.2rem 0.6rem; border-radius: 4px; cursor: pointer; font-weight: 800; transition: 0.2s; }
  .w-mini-toggle.is-on { background: #f59e0b; color: #000; }
  
  .w-dropdown-wrapper { position: relative; width: 100%; }
  .w-shape-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; background: #111827; border: 1px solid #374151; color: #f8fafc; padding: 0.6rem; border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 0.8rem; font-weight: 600; font-family: 'Inter', sans-serif; }
  .w-shape-btn:hover { background: #3b82f6; border-color: #60a5fa; color: #fff; }
  .w-shape-flex { display: flex; align-items: center; gap: 0.5rem; }
  .w-dropdown-arrow { font-size: 0.6rem; color: #94a3b8; }
  
  .w-shape-dropdown { position: absolute; top: 110%; left: 0; width: 100%; background: #111827; border: 1px solid #374151; border-radius: 6px; z-index: 1000; box-shadow: 0 12px 32px rgba(0,0,0,0.9); overflow: hidden; display: flex; flex-direction: column; }
  .shape-option { display: flex; align-items: center; gap: 0.8rem; padding: 0.75rem 1rem; background: transparent; border: none; border-bottom: 1px solid #1f2937; color: #94a3b8; width: 100%; font-size: 0.8rem; cursor: pointer; text-align: left; font-family: 'Inter', sans-serif; transition: 0.1s; }
  .shape-option:last-child { border-bottom: none; }
  .shape-option:hover { background: rgba(59,130,246,0.15); color: #fff; }
  .shape-option.active { color: #f59e0b; background: rgba(245, 158, 11, 0.05); border-left: 2px solid #f59e0b; }
  .active-dot { margin-left: auto; color: #f59e0b; font-size: 1rem; line-height: 0; }
  
  .w-slider-group { display: flex; flex-direction: column; gap: 0.5rem; }
  .w-slider-group label { display: flex; justify-content: space-between; font-size: 0.75rem; color: #e2e8f0; font-weight: 600; letter-spacing: 0.5px; }
  .w-val { color: #f8fafc; font-family: 'JetBrains Mono', monospace; }
  .w-val-green { color: #10b981; font-family: 'JetBrains Mono', monospace; }
  .w-val-blue { color: #3b82f6; font-family: 'JetBrains Mono', monospace; }
  
  .knob-proxy, .knob-proxy-green, .knob-proxy-blue { width: 100%; margin: 0; appearance: none; background: transparent; height: 16px; outline: none; }
  .knob-proxy:disabled, .knob-proxy-green:disabled, .knob-proxy-blue:disabled { opacity: 0.3; cursor: not-allowed; }
  
  .knob-proxy::-webkit-slider-runnable-track, .knob-proxy-green::-webkit-slider-runnable-track, .knob-proxy-blue::-webkit-slider-runnable-track { width: 100%; height: 4px; background: #111827; border-radius: 2px; }
  
  .knob-proxy::-webkit-slider-thumb { appearance: none; height: 16px; width: 16px; border-radius: 2px; background: #e2e8f0; border: none; margin-top: -6px; cursor: pointer; transition: 0.1s; }
  .knob-proxy:active::-webkit-slider-thumb { background: #fff; transform: scale(1.1); }
  
  .knob-proxy-green::-webkit-slider-thumb { appearance: none; height: 16px; width: 16px; border-radius: 2px; background: #10b981; border: none; margin-top: -6px; cursor: pointer; transition: 0.1s; }
  .knob-proxy-green:active::-webkit-slider-thumb { background: #34d399; transform: scale(1.1); }
  
  .knob-proxy-blue::-webkit-slider-thumb { appearance: none; height: 16px; width: 16px; border-radius: 2px; background: #3b82f6; border: none; margin-top: -6px; cursor: pointer; transition: 0.1s; }
  .knob-proxy-blue:active::-webkit-slider-thumb { background: #60a5fa; transform: scale(1.1); }
  
  .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>
