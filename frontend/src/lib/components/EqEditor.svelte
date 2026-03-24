<script>
  import { onMount } from 'svelte';
  
  export let channelId = 'in_1'; // Targeted routing ID seamlessly piped from FOH
  
  let canvas;
  let ctx;
  let width = 800;
  let height = 300;
  
  // Ableton EQ Eight Reference Architecture
  let bands = [
    { id: 1, type: 'hpf', freq: 30, gain: 0, q: 0.71, enabled: true, logVal: 1.477 },
    { id: 2, type: 'loshelf', freq: 100, gain: 0, q: 0.71, enabled: true, logVal: 2 },
    { id: 3, type: 'peq', freq: 250, gain: 0, q: 0.71, enabled: true, logVal: 2.398 },
    { id: 4, type: 'peq', freq: 500, gain: 0, q: 0.71, enabled: true, logVal: 2.698 },
    { id: 5, type: 'peq', freq: 1000, gain: 0, q: 0.71, enabled: true, logVal: 3 },
    { id: 6, type: 'peq', freq: 2500, gain: 0, q: 0.71, enabled: true, logVal: 3.398 },
    { id: 7, type: 'hishelf', freq: 6000, gain: 0, q: 0.71, enabled: true, logVal: 3.778 },
    { id: 8, type: 'lpf', freq: 15000, gain: 0, q: 0.71, enabled: true, logVal: 4.176 }
  ];

  export const resetFlat = () => {
      bands.forEach(b => {
          b.gain = 0; // Flatten magnitude
          b.q = 0.71; // Base width
          if (b.type === 'peq') b.type = 'peq'; 
      });
      updateBands();
  };

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
          } else if (b.type === 'hpf') {
              if (f < b.freq) {
                  const drop = Math.log2(b.freq / Math.max(f, 1)) * -12; // 12dB/octave cut limit
                  totalDb += drop;
              }
          } else if (b.type === 'lpf') {
              if (f > b.freq) {
                  const drop = Math.log2(f / b.freq) * -12;
                  totalDb += drop;
              }
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

<div class="eq-container fade-in">
    <div class="canvas-wrapper">
        <canvas bind:this={canvas} {width} {height}></canvas>
    </div>
    
    <div class="controls-panel">
        <div class="band-matrix">
            {#each bands as band, i}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="band-column" class:active={selectedBandIndex === i} on:click={() => selectedBandIndex = i}>
                    
                    <div class="band-header">
                        <button class="enable-btn" class:is-on={band.enabled} on:click|stopPropagation={() => { band.enabled = !band.enabled; updateBands(); }}>
                           {band.id}
                        </button>
                    </div>
                    
                    <div class="params-container">
                        <select class="type-selector" bind:value={band.type} on:change={updateBands} disabled={!band.enabled}>
                            <option value="hpf">Low Cut</option>
                            <option value="loshelf">Low Shelf</option>
                            <option value="peq">Peak</option>
                            <option value="notch">Notch</option>
                            <option value="hishelf">High Shelf</option>
                            <option value="lpf">High Cut</option>
                        </select>
                        
                        <div class="slider-group">
                            <label for="freq-{band.id}">Freq</label>
                            <input id="freq-{band.id}" type="range" class="fw knob-proxy" min="1.0" max="4.342" step="0.01" bind:value={band.logVal} on:input={updateBands} disabled={!band.enabled} />
                            <span class="val">{band.freq >= 1000 ? (band.freq/1000).toFixed(2)+' kHz' : Math.floor(band.freq)+' Hz'}</span>
                        </div>

                        <div class="slider-group">
                            <label for="gain-{band.id}">Gain</label>
                            <input id="gain-{band.id}" type="range" class="fw knob-proxy" min="-15" max="15" step="0.1" bind:value={band.gain} on:input={updateBands} disabled={!band.enabled || band.type === 'hpf' || band.type === 'lpf'} />
                            <span class="val">{band.gain > 0 ? '+'+band.gain.toFixed(1) : band.gain.toFixed(1)} dB</span>
                        </div>

                        <div class="slider-group">
                            <label for="q-{band.id}">Q</label>
                            <input id="q-{band.id}" type="range" class="fw q-proxy" min="0.1" max="10" step="0.1" bind:value={band.q} on:input={updateBands} disabled={!band.enabled} />
                            <span class="val">{band.q.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
  .eq-container { display: flex; flex-direction: column; width: 100%; height: 100%; border-radius: 4px; background: #262626; border: 1px solid #3f3f46; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.5); font-family: 'Inter', sans-serif; }
  .canvas-wrapper { flex: 1; min-height: 280px; position: relative; background: #1c1c1c; } /* Ableton Dark Graph bg */
  canvas { display: block; width: 100%; height: 100%; }

  .controls-panel { background: #b0b4b8; border-top: 1px solid #171717; padding: 0.5rem; } /* Ableton Silver layout */
  .band-matrix { display: flex; gap: 4px; justify-content: space-between; }
  
  .band-column { flex: 1; display: flex; flex-direction: column; align-items: center; background: #c2c6ca; border: 1px solid #9ca3af; border-radius: 4px; padding: 0.5rem 0.2rem; transition: all 0.2s; cursor: pointer; }
  .band-column:hover:not(.active) { background: #d1d5db; }
  .band-column.active { background: #e2e8f0; box-shadow: inset 0 0 0 1px #00e5ff; }
  
  .band-header { display: flex; align-items: center; justify-content: center; margin-bottom: 0.8rem; width: 100%; }
  .enable-btn { background: #71717a; color: #fff; border: 1px solid #52525b; width: 24px; height: 18px; border-radius: 2px; font-size: 0.7rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 2px rgba(255,255,255,0.2); transition: 0.1s; }
  .enable-btn.is-on { background: #00e5ff; color: #000; border-color: #0891b2; box-shadow: 0 0 8px rgba(0,229,255,0.4); }
  
  .params-container { display: flex; flex-direction: column; gap: 0.8rem; width: 100%; }
  
  .type-selector {
      background: #18181b; color: #f8fafc; border: 1px solid #3f3f46; border-radius: 3px; 
      font-size: 0.65rem; padding: 0.2rem 0; width: 90%; text-align: center;
      font-weight: 700; margin: 0 auto 0.2rem auto; outline: none; cursor: pointer;
  }
  .type-selector:disabled { opacity: 0.4; cursor: not-allowed; }
  
  .slider-group { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
  .slider-group label { font-size: 0.65rem; color: #3f3f46; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; }
  .val { font-size: 0.7rem; font-family: 'Inter', sans-serif; font-weight: 500; color: #18181b; background: transparent; padding: 0; text-align: center; }
  
  /* Styled Input Proxies mimicking Ableton horizontal knob parameter mapping */
  .fw { width: 85%; -webkit-appearance: none; appearance: none; height: 4px; background: #9ca3af; outline: none; border-radius: 2px; border: 1px solid #cbd5e1; box-shadow: inset 0 1px 2px rgba(0,0,0,0.2); }
  .fw::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; background: #3f3f46; border-radius: 50%; cursor: pointer; border: 2px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.5); }
  .fw:disabled::-webkit-slider-thumb { background: #9ca3af; cursor: not-allowed; }
  .fw:disabled { opacity: 0.5; }
  
  /* Cyan highlight for active node tracking */
  .band-column.active .fw::-webkit-slider-thumb { background: #00e5ff; border-color: #fff; box-shadow: 0 0 6px rgba(0,229,255,0.6); }

  .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>
