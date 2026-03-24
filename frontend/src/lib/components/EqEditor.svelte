<script>
  import { onMount } from 'svelte';
  
  export let channelId = 'in_1'; // Targeted routing ID seamlessly piped from FOH
  
  let canvas;
  let ctx;
  let width = 800;
  let height = 300;
  
  // Ableton EQ Eight Reference Architecture
  let bands = [
    { id: 1, type: 'hpf48', freq: 30, gain: 0, q: 0.71, enabled: true, logVal: 1.477 },
    { id: 2, type: 'loshelf', freq: 100, gain: 0, q: 0.71, enabled: true, logVal: 2 },
    { id: 3, type: 'peq', freq: 250, gain: 0, q: 0.71, enabled: true, logVal: 2.398 },
    { id: 4, type: 'peq', freq: 500, gain: 0, q: 0.71, enabled: true, logVal: 2.698 },
    { id: 5, type: 'peq', freq: 1000, gain: 0, q: 0.71, enabled: true, logVal: 3 },
    { id: 6, type: 'peq', freq: 2500, gain: 0, q: 0.71, enabled: true, logVal: 3.398 },
    { id: 7, type: 'hishelf', freq: 6000, gain: 0, q: 0.71, enabled: true, logVal: 3.778 },
    { id: 8, type: 'lpf48', freq: 15000, gain: 0, q: 0.71, enabled: true, logVal: 4.176 }
  ];

  export const resetFlat = () => {
      bands.forEach(b => {
          b.gain = 0; // Flatten magnitude
          b.q = 0.71; // Base width
          if (b.type === 'peq') b.type = 'peq'; 
      });
      updateBands();
  };

  const filterTypes = ['hpf12', 'hpf48', 'loshelf', 'peq', 'notch', 'hishelf', 'lpf12', 'lpf48'];
  const filterNames = {
      hpf12: 'Highpass 12dB',
      hpf48: 'Highpass 48dB',
      loshelf: 'Low Shelf',
      peq: 'Bell',
      notch: 'Notch',
      hishelf: 'High Shelf',
      lpf12: 'Lowpass 12dB',
      lpf48: 'Lowpass 48dB'
  };
  const shortNames = {
      hpf12: 'HPF', hpf48: 'HPF', loshelf: 'LO-SHV', peq: 'BELL',
      notch: 'NOTCH', hishelf: 'HI-SHV', lpf12: 'LPF', lpf48: 'LPF'
  };

  let dropdownOpenId = null;
  function toggleDropdown(e, id) {
      if (dropdownOpenId === id) dropdownOpenId = null;
      else dropdownOpenId = id;
  }
  function selectShape(b, type) {
      b.type = type;
      dropdownOpenId = null;
      updateBands();
  }
  function closeDropdowns() { dropdownOpenId = null; }
  
  function getGainDisplay(val) {
      return val > 0 ? '+' + val.toFixed(1) : val.toFixed(1);
  }

  let selectedBandIndex = 2; // Default focus
  
  const MIN_FREQ = 10;
  const MAX_FREQ = 22000;
  const MIN_DB = -15;
  const MAX_DB = 15;

  // Logarithmic graphical interpolations natively mapped to HD canvas
  function freqToX(f) {
      const minLog = Math.log10(MIN_FREQ);
      const maxLog = Math.log10(MAX_FREQ);
      return ((Math.log10(f) - minLog) / (maxLog - minLog)) * width;
  }
  
  function dbToY(db) {
      // 0dB center line mapping
      return height/2 - (db / MAX_DB) * (height/2 - 20); // 20px headroom padding
  }

  // Purely visual curve approximation - translates parameter bounds to realistic Bell filters
  function getResponse(f) {
      let totalDb = 0;
      for (const b of bands) {
          if (!b.enabled) continue;
          if (b.type === 'peq') {
              const octaves = Math.log2(f / b.freq);
              totalDb += b.gain * Math.exp(-Math.pow(octaves * b.q * 1.5, 2));
          } else if (b.type === 'loshelf') {
              const octaves = Math.log2(f / b.freq);
              const shelf = b.gain / (1 + Math.exp(octaves * 4 * b.q));
              totalDb += shelf;
          } else if (b.type === 'hishelf') {
              const octaves = Math.log2(f / b.freq);
              const shelf = b.gain / (1 + Math.exp(-octaves * 4 * b.q));
              totalDb += shelf;
          } else if (b.type === 'notch') {
              const octaves = Math.log2(f / b.freq);
              // Mathematical notch cut depth
              totalDb += -40 * Math.exp(-Math.pow(octaves * b.q * 2, 2));
          } else if (b.type === 'hpf' || b.type === 'hpf12') {
              if (f < b.freq) totalDb += Math.log2(b.freq / Math.max(f, 1)) * -12;
          } else if (b.type === 'hpf48') {
              if (f < b.freq) totalDb += Math.log2(b.freq / Math.max(f, 1)) * -48;
          } else if (b.type === 'lpf' || b.type === 'lpf12') {
              if (f > b.freq) totalDb += Math.log2(f / b.freq) * -12;
          } else if (b.type === 'lpf48') {
              if (f > b.freq) totalDb += Math.log2(f / b.freq) * -48;
          }
      }
      return totalDb;
  }

  function draw() {
      if (!ctx || width === 0) return;
      ctx.clearRect(0, 0, width, height);

      // Render rigid grid system - Ableton dark matrix style
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      
      [-12, -6, 0, 6, 12].forEach(db => {
          const y = dbToY(db);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
          ctx.fillStyle = '#71717a';
          ctx.font = '11px "Inter", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText((db > 0 ? '+'+db : db) + 'dB', 8, y - 6);
      });

      // Frame core centerline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath(); ctx.moveTo(0, dbToY(0)); ctx.lineTo(width, dbToY(0)); ctx.stroke();

      // Logarithmic X-Axis (Dense Ableton Equivalent)
      const freqs = [
        10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 
        1000, 2000, 3000, 4000, 5000, 10000, 20000
      ];
      
      freqs.forEach(f => {
          const x = freqToX(f);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          // Highlight prime intervals 100, 1k, 10k
          if ([10, 100, 1000, 10000].includes(f)) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
              ctx.stroke();
              ctx.fillStyle = '#71717a';
              ctx.textAlign = 'center';
              ctx.fillText(f >= 1000 ? (f/1000)+'k' : f, x, height - 8);
          } else {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
              ctx.stroke();
          }
      });

      // Composite Frequency Response Render Array
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
          const normalized = x / width;
          const minLog = Math.log10(MIN_FREQ);
          const maxLog = Math.log10(MAX_FREQ);
          const f = Math.pow(10, normalized * (maxLog - minLog) + minLog);
          
          const db = Math.max(Math.min(getResponse(f), MAX_DB), MIN_DB);
          const y = dbToY(db);
          
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
      }
      
      // Ableton Cyan Curve
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      
      // Paint Under-Mask Fill organically down to bounds
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 229, 255, 0.05)';
      ctx.fill();

      // Render strictly mapped control nodes securely over active band frequencies
      bands.forEach((b, i) => {
          if (!b.enabled) return;
          const x = freqToX(b.freq);
          const y = dbToY(b.gain);
          
          // Ableton Yellow Node
          ctx.beginPath();
          ctx.arc(x, y, i === selectedBandIndex ? 10 : 8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffb700'; 
          ctx.fill();
          
          // Selection Highlight Ring
          if (i === selectedBandIndex) {
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2;
              ctx.stroke();
          }

          // Node Number Label
          ctx.fillStyle = '#000';
          ctx.font = 'bold 11px "Inter", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.id, x, y + 1);
      });
  }

  function updateBands() {
      // Safely mutate frequency natively using internal logarithmic mappings
      bands.forEach(b => { b.freq = Math.pow(10, b.logVal); });
      bands = bands; // Trigger native graphic rewrite cleanly
      if (ctx) requestAnimationFrame(draw);
  }

  onMount(() => {
      ctx = canvas.getContext('2d');
      
      // Determine immediate container geometry to prevent zeros bounding boxes
      if (canvas.parentElement) {
          width = canvas.parentElement.clientWidth || 800;
          height = canvas.parentElement.clientHeight || 280;
      }
      canvas.width = width;
      canvas.height = height;
      updateBands();
      
      const observer = new ResizeObserver(entries => {
          for (let entry of entries) {
              const newW = entry.contentRect.width;
              // Squelch infinite subpixel observation triggers
              if (newW > 0 && Math.abs(width - newW) > 1) {
                  width = newW;
                  canvas.width = width;
                  requestAnimationFrame(draw);
              }
          }
      });
      if (canvas.parentElement) observer.observe(canvas.parentElement);
      return () => observer.disconnect();
  });
</script>

<svelte:window on:click={closeDropdowns} />

<div class="eq-container fade-in layout-wing">
    <svg style="display: none;">
      <symbol id="icon-hpf12" viewBox="0 0 24 24"><path d="M4 22 Q10 22 12 12 L20 12" stroke="currentColor" stroke-width="2.5" fill="none"/></symbol>
      <symbol id="icon-hpf48" viewBox="0 0 24 24"><path d="M4 22 L10 22 L10 12 L20 12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linejoin="round"/></symbol>
      <symbol id="icon-loshelf" viewBox="0 0 24 24"><path d="M4 18 L10 18 C14 18, 14 8, 18 8 L22 8" stroke="currentColor" stroke-width="2.5" fill="none"/></symbol>
      <symbol id="icon-peq" viewBox="0 0 24 24"><path d="M4 16 C8 16, 10 4, 12 4 C14 4, 16 16, 20 16" stroke="currentColor" stroke-width="2.5" fill="none"/></symbol>
      <symbol id="icon-notch" viewBox="0 0 24 24"><path d="M4 8 L10 8 L12 22 L14 8 L20 8" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linejoin="round"/></symbol>
      <symbol id="icon-hishelf" viewBox="0 0 24 24"><path d="M4 8 L10 8 C14 8, 14 18, 18 18 L22 18" stroke="currentColor" stroke-width="2.5" fill="none"/></symbol>
      <symbol id="icon-lpf12" viewBox="0 0 24 24"><path d="M4 12 L12 12 Q14 12 20 22" stroke="currentColor" stroke-width="2.5" fill="none"/></symbol>
      <symbol id="icon-lpf48" viewBox="0 0 24 24"><path d="M4 12 L14 12 L14 22 L20 22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linejoin="round"/></symbol>
      <symbol id="icon-hpf" viewBox="0 0 24 24"><use href="#icon-hpf12"/></symbol>
      <symbol id="icon-lpf" viewBox="0 0 24 24"><use href="#icon-lpf12"/></symbol>
    </svg>

    <!-- Wing CSS Architecture Sidebar (Moved to LEFT axis) -->
    <div class="wing-sidebar">
        <!-- Vertical Column 1: Band Selection -->
        <div class="wing-band-list">
            {#each bands as band, i}
                <button class="wing-band-row" class:active={selectedBandIndex === i} on:click|stopPropagation={() => selectedBandIndex = i}>
                    <div class="wing-band-name">
                        <span class="w-id">{band.id}</span>
                        <span class="w-type">{shortNames[band.type]}</span>
                    </div>
                    <div class="w-toggle" class:is-on={band.enabled} on:click|stopPropagation={() => { band.enabled = !band.enabled; updateBands(); }}></div>
                </button>
            {/each}
        </div>

        <!-- Vertical Column 2: Specific Selection Parameter Array -->
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
                    <label>GAIN <span class="w-val">{getGainDisplay(activeBand.gain)} dB</span></label>
                    <input type="range" class="knob-proxy" min="-15" max="15" step="0.1" bind:value={activeBand.gain} on:input={updateBands} disabled={!activeBand.enabled} />
                </div>
                
                <div class="w-slider-group">
                    <label>Q <span class="w-val-green">{activeBand.q.toFixed(2)}</span></label>
                    <input type="range" class="knob-proxy-green" min="0.1" max="10" step="0.1" bind:value={activeBand.q} on:input={updateBands} disabled={!activeBand.enabled} />
                </div>
                
                <div class="w-slider-group">
                    <label>FREQ <span class="w-val-blue">{Math.round(Math.pow(10, activeBand.logVal))} Hz</span></label>
                    <input type="range" class="knob-proxy-blue" min="1.0" max="4.342" step="0.01" bind:value={activeBand.logVal} on:input={updateBands} disabled={!activeBand.enabled} />
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
  /* Layout Wing UI Overrides */
  .layout-wing { display: flex; flex-direction: row; width: 100%; height: 500px; max-height: 65vh; background: #0b0d12; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; font-family: 'Inter', sans-serif; box-shadow: 0 12px 48px rgba(0,0,0,0.4); margin: 0 auto; }
  .canvas-wrapper { flex: 1; min-height: 0; position: relative; background: #080a0f; }
  canvas { display: block; width: 100%; height: 100%; }
  
  /* Left Sidebar Split */
  .wing-sidebar { width: 340px; flex-shrink: 0; display: flex; flex-direction: row; background: #12151c; border-right: 1px solid #1e293b; }
  
  /* Band Selection List Base */
  .wing-band-list { width: 125px; display: flex; flex-direction: column; background: #0f1115; border-right: 1px solid #1e293b; overflow-y: auto; }
  .wing-band-row { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 0.6rem; border: none; border-bottom: 1px solid #1e293b; background: transparent; cursor: pointer; transition: 0.1s; outline: none; }
  .wing-band-row:hover { background: rgba(59,130,246,0.05); }
  .wing-band-row.active { background: #1f2937; border-left: 3px solid #3b82f6; }
  .wing-band-name { display: flex; gap: 0.5rem; align-items: center; color: #64748b; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }
  .wing-band-row.active .wing-band-name { color: #f8fafc; font-weight: 700; }
  .w-id { font-weight: 800; font-size: 0.85rem; }
  
  .w-toggle { min-width: 12px; min-height: 12px; border-radius: 50%; border: 1px solid #475569; background: #0f1115; transition: 0.2s; flex-shrink: 0; }
  .w-toggle.is-on { background: transparent; border-color: #f8fafc; border-width: 2px; }
  
  /* Detail View Array Panel */
  .wing-detail-view { flex: 1; padding: 1.25rem 1rem; display: flex; flex-direction: column; gap: 1.5rem; background: #1f2937; }
  .w-detail-header { display: flex; flex-direction: column; gap: 0.8rem; }
  .w-detail-title-group { display: flex; justify-content: space-between; align-items: center; }
  .w-band-label { color: #94a3b8; font-size: 0.75rem; font-weight: 800; letter-spacing: 1px; }
  .w-mini-toggle { border: none; background: #374151; color: #94a3b8; font-size: 0.65rem; padding: 0.2rem 0.6rem; border-radius: 4px; cursor: pointer; font-weight: 800; transition: 0.2s; }
  .w-mini-toggle.is-on { background: #f59e0b; color: #000; }
  
  /* Filter Geometries UI Overlay */
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
  
  /* Parameter Sliders */
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
