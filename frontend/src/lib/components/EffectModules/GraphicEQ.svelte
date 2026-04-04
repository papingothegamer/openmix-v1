<script>
  import { onMount, onDestroy } from 'svelte';

  export let params = {};
  export let preset = 'Graphic EQ';
  export let dual = false;
  export let onParamChange = (key, value) => {};
  export let slotIndex = 0;

  const frequencies = [
    "20", "25", "31.5", "40", "50", "63", "80", 
    "100", "125", "160", "200", "250", "315", "400", 
    "500", "630", "800", "1k", "1k25", "1k6", "2k", 
    "2k5", "3k15", "4k", "5k", "6k3", "8k", "10k", 
    "12k5", "16k", "20k"
  ];

  // Map to store frequency -> index for curve math
  const freqMap = frequencies.map((f, i) => {
    let hz = parseFloat(f);
    if (f.includes('k')) hz = parseFloat(f.replace('k', '')) * 1000;
    if (f.match(/^\d+k\d+$/)) {
      const parts = f.split('k');
      hz = (parseInt(parts[0]) * 1000) + (parseInt(parts[1]) * (parts[1].length === 1 ? 100 : 10));
    }
    const labels = {
      "31.5": 31.5, "1k": 1000, "1k25": 1250, "1k6": 1600, 
      "2k": 2000, "2k5": 2500, "3k15": 3150, "6k3": 6300, "12k5": 12500
    };
    return { label: f, hz: labels[f] || hz };
  });

  let canvas;
  let ctx;
  let width = 600;
  let height = 80;
  let isDragging = false;

  function handleSliderInput(f, val) {
    onParamChange(f, parseFloat(val));
    drawCurve();
  }

  function freqToX(f) {
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    return ((Math.log10(f) - logMin) / (logMax - logMin)) * width;
  }

  function gainToY(g) {
    return (height / 2) - (g / 15) * (height / 2 - 10);
  }

  function computeBandResponse(bandHz, gain, freq) {
    if (gain === 0) return 0;
    const q = 4.3; // Approx 1/3 octave
    const f0 = bandHz;
    const ratio = freq / f0;
    const logR = Math.log2(ratio);
    const bw = 1 / q;
    const x = logR / bw;
    return gain / (1 + x * x * 4);
  }

  function drawCurve() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.1)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const numPoints = 150;
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    const points = [];

    for (let i = 0; i <= numPoints; i++) {
        const logFreq = logMin + (i / numPoints) * (logMax - logMin);
        const freq = Math.pow(10, logFreq);
        let totalGain = 0;
        
        freqMap.forEach(fMeta => {
          const gain = params[fMeta.label] ?? 0;
          totalGain += computeBandResponse(fMeta.hz, gain, freq);
        });

        totalGain = Math.max(-20, Math.min(20, totalGain));
        points.push({ x: freqToX(freq), y: gainToY(totalGain) });
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(34, 211, 238, 0.1)');
    grad.addColorStop(1, 'rgba(34, 211, 238, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      if (i === 0) ctx.moveTo(points[i].x, points[i].y);
      else ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  let ro;
  onMount(() => {
    ctx = canvas.getContext('2d');
    ro = new ResizeObserver(() => {
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width * (window.devicePixelRatio || 1);
      canvas.height = height * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      drawCurve();
    });
    ro.observe(canvas.parentElement);
    drawCurve();
  });

  onDestroy(() => {
    if (ro) ro.disconnect();
  });

  $: if (params) setTimeout(drawCurve, 0);

  function handleGlideMove(e) {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const buckets = frequencies.length;
    const bucketWidth = rect.width / (buckets + 1);
    const index = Math.floor(x / bucketWidth);
    
    if (index >= 0 && index < frequencies.length) {
      const f = frequencies[index];
      const percent = 1 - (y / rect.height);
      const val = (percent * 30) - 15;
      handleSliderInput(f, Math.round(val * 2) / 2);
    }
  }

</script>

<div class="effect-module graphic-eq">
  <div class="rack-metal">
    <div class="fx-header">
      <span class="brand">OPENMIX</span>
      <span class="model">31-BAND GRAPHIC EQUALIZER</span>
      {#if dual}
        <div class="rack-tabs">
          <button class="active">CH 1</button>
          <button disabled>CH 2</button>
        </div>
      {/if}
    </div>

    <div class="eq-body">
      <div class="curve-area">
        <canvas bind:this={canvas}></canvas>
        <div class="grid-overlay"></div>
      </div>

      <div 
        class="faders-rack"
        role="group"
        aria-label="31-band Graphic EQ faders"
        on:mousedown={() => isDragging = true}
        on:mouseup={() => isDragging = false}
        on:mouseleave={() => isDragging = false}
        on:mousemove={handleGlideMove}
      >
        <div class="faders-scroll">
          {#each frequencies as f}
            <div class="fader-band">
              <div class="slider-track">
                <input 
                  type="range" 
                  min="-15" 
                  max="15" 
                  step="0.5"
                  value={params[f] ?? 0}
                  on:input={(e) => handleSliderInput(f, e.currentTarget.value)}
                  on:dblclick={() => handleSliderInput(f, 0)}
                />
              </div>
              <span class="band-label">{f}</span>
            </div>
          {/each}

          <div class="divider"></div>

          <div class="fader-band master">
            <div class="slider-track">
              <input 
                type="range" 
                min="-15" 
                max="15" 
                step="0.5"
                value={params.master ?? 0}
                on:input={(e) => handleSliderInput('master', e.currentTarget.value)}
                on:dblclick={() => handleSliderInput('master', 0)}
              />
            </div>
            <span class="band-label">MASTER</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .effect-module {
    width: 100%;
    height: 100%;
    display: flex;
  }

  .rack-metal {
    flex: 1;
    background: linear-gradient(135deg, #1e293b, #0f172a);
    border: 1px solid #334155;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    padding: 0.75rem 1rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    position: relative;
    overflow: hidden;
  }

  .fx-header {
    display: flex;
    align-items: baseline;
    gap: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 0.75rem;
  }
  .brand { color: #475569; font-weight: 900; font-size: 0.65rem; letter-spacing: 2px; }
  .model { color: #f8fafc; font-weight: 800; font-size: 0.9rem; font-family: 'Inter', sans-serif; opacity: 0.8; }

  .rack-tabs { display: flex; gap: 4px; margin-left: auto; }
  .rack-tabs button {
    background: #0f172a; color: #64748b; border: 1px solid #334155;
    padding: 2px 8px; font-size: 0.6rem; font-weight: 800; border-radius: 2px;
  }
  .rack-tabs button.active { background: #22d3ee; color: #0f172a; border-color: #22d3ee; }

  .eq-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .curve-area {
    height: 60px;
    background: rgba(0,0,0,0.4);
    border-radius: 4px;
    margin-bottom: 1rem;
    position: relative;
    border: 1px solid rgba(255,255,255,0.05);
  }
  canvas { width: 100%; height: 100%; display: block; }
  .grid-overlay {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background-image: 
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 20px 20px;
    pointer-events: none;
  }

  .faders-rack {
    flex: 1;
    min-height: 0;
    display: flex;
    user-select: none;
  }

  .faders-scroll {
    display: flex;
    width: 100%;
    height: 100%;
    gap: 0;
  }

  .fader-band {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 12px;
    height: 100%;
  }

  .slider-track {
    flex: 1;
    width: 20px;
    position: relative;
    display: flex;
    justify-content: center;
  }

  /* Vertical Slider Trick */
  input[type="range"] {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-90deg);
    width: 120px; /* Slider length */
    height: 40px; /* Interaction zone */
    background: transparent;
    appearance: none;
    cursor: ns-resize;
    margin: 0;
  }

  input[type="range"]::-webkit-slider-runnable-track {
    height: 2px;
    background: rgba(255,255,255,0.1);
    border-radius: 1px;
  }
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 16px;
    background: #f8fafc;
    border-radius: 2px;
    border: 1px solid #334155;
    margin-top: -7px;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
  }

  .band-label {
    font-size: 0.5rem;
    font-weight: 800;
    color: #64748b;
    text-transform: lowercase;
    transform: rotate(-90deg);
    white-space: nowrap;
    margin-bottom: 8px;
    height: 24px;
    display: flex;
    align-items: center;
  }

  .divider {
    width: 1px;
    background: rgba(255,255,255,0.05);
    margin: 10px 6px;
  }

  .fader-band.master {
    min-width: 32px;
  }
  .fader-band.master .band-label { transform: none; color: #22d3ee; margin-bottom: 4px; }
  .fader-band.master input::-webkit-slider-thumb { background: #22d3ee; }

</style>
