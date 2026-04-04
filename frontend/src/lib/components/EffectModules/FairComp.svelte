<script>
  import { onMount, onDestroy } from 'svelte';
  import { rawMeters } from '../../socket.js';
  import Knob from '../EffectControls/Knob.svelte';

  export let params = {};
  export let preset = 'Stereo Fair Comp';
  export let onParamChange = (key, value) => {};
  export let slotIndex = 0; // 0-3 for XR18 FX slots

  $: threshold = params.threshold ?? -20;
  $: time = params.time ?? 50;
  $: inputGain = params.inputGain ?? 0;
  $: outputGain = params.outputGain ?? 0;

  // VU Meter Logic
  let needleAngle = 30; // Rest position (Right side for GR)
  let smoothedGR = 1.0;
  let unsubscribe;

  onMount(() => {
    unsubscribe = rawMeters.subscribe(meters => {
      const fxMeters = meters['/meters/5'];
      if (fxMeters && fxMeters.length > slotIndex * 6 + 5) {
        // XR18 /meters/5 mapping: 
        // Index [slot*6 + 4] = L GR, [slot*6 + 5] = R GR
        // Values: 1.0 (no reduction) to 0.0 (full reduction)
        const grL = fxMeters[slotIndex * 6 + 4];
        const grR = fxMeters[slotIndex * 6 + 5];
        const currentGR = (grL + grR) / 2;

        // Smooth the needle movement
        smoothedGR = smoothedGR * 0.7 + currentGR * 0.3;
        
        // Map 1.0 (No GR) to +30deg (Right)
        // Map 0.0 (Full GR) to -30deg (Left)
        needleAngle = (smoothedGR - 0.5) * 60;
      } else {
        // Idle breathing if no signal/meters
        const jitter = (Math.random() - 0.5) * 0.4;
        needleAngle = 30 + jitter;
      }
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });
</script>

<div class="effect-module fair-comp">
  <div class="rack-metal">
    <div class="fx-header">
      <span class="brand">OPENMIX</span>
      <span class="model">STEREO FAIR COMPRESSOR</span>
    </div>

    <div class="comp-content">
      <div class="main-controls">
        <div class="left-section">
          <div class="vu-meter">
            <svg viewBox="0 0 100 60">
              <!-- Meter Face -->
              <path d="M 10 50 A 45 45 0 0 1 90 50" fill="none" stroke="#222" stroke-width="8" />
              <path d="M 15 48 A 40 40 0 0 1 85 48" fill="none" stroke="#facc15" stroke-width="12" />
              
              <!-- Scale -->
              <g stroke="#000" stroke-width="0.5">
                {#each Array(11) as _, i}
                  {@const angle = -150 + i * 12}
                  {@const r1 = 38}
                  {@const r2 = 42}
                  <line x1={50 + r1 * Math.cos(angle * Math.PI / 180)} 
                        y1={50 + r1 * Math.sin(angle * Math.PI / 180)} 
                        x2={50 + r2 * Math.cos(angle * Math.PI / 180)} 
                        y2={50 + r2 * Math.sin(angle * Math.PI / 180)} />
                {/each}
              </g>
              
              <text x="50" y="32" text-anchor="middle" font-size="4" font-weight="900" fill="#000">GAIN REDUCTION</text>
              
              <!-- Needle -->
              <g transform="translate(50, 50) rotate({needleAngle})">
                <line x1="0" y1="0" x2="0" y2="-38" stroke="#cc0000" stroke-width="1.2" stroke-linecap="round" />
                <circle cx="0" cy="0" r="2.5" fill="#111" />
              </g>
            </svg>
            <div class="label">MODEL 670 - STEREO LIMITER</div>
          </div>
          
          <div class="power-lamp active"></div>
        </div>

        <div class="right-section">
          <div class="knob-matrix">
            <div class="knob-cell">
              <Knob label="Input" value={inputGain} min={-12} max={18} onChange={(v) => onParamChange('inputGain', v)} />
            </div>
            <div class="knob-cell">
              <Knob label="Threshold" value={threshold} min={-40} max={0} onChange={(v) => onParamChange('threshold', v)} />
            </div>
            <div class="knob-cell">
              <Knob label="Time" value={time} min={1} max={100} onChange={(v) => onParamChange('time', v)} />
            </div>
            <div class="knob-cell">
              <Knob label="Output" value={outputGain} min={-12} max={18} onChange={(v) => onParamChange('outputGain', v)} />
            </div>
          </div>

          <div class="finetune-row">
            <div class="micro-knob">
              <div class="cap"></div>
              <span>BIAS</span>
            </div>
            <div class="micro-knob">
              <div class="cap"></div>
              <span>BAL</span>
            </div>
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
    padding: 0.75rem 1.25rem;
    box-shadow: inset 0 1px 1px rgba(255,255,255,0.1), 0 10px 30px rgba(0,0,0,0.5);
    position: relative;
    overflow: hidden;
  }

  .fx-header {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 1rem;
  }
  .brand { color: #64748b; font-weight: 900; font-size: 0.7rem; letter-spacing: 2px; }
  .model { color: #22d3ee; font-weight: 800; font-size: 1rem; font-family: 'Inter', sans-serif; opacity: 0.9; }

  .comp-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .main-controls {
    display: flex;
    align-items: center;
    gap: 2.5rem;
    width: 100%;
  }

  .left-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .vu-meter {
    width: 200px;
    background: #111;
    padding: 1rem;
    border-radius: 8px;
    border: 2px solid #334155;
    box-shadow: inset 0 4px 12px rgba(0,0,0,0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .vu-meter .label {
    font-size: 0.6rem;
    font-weight: 800;
    color: #475569;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .power-lamp {
    width: 12px;
    height: 12px;
    background: #440000;
    border-radius: 50%;
    box-shadow: 0 0 2px #000;
  }
  .power-lamp.active {
    background: #ff0000;
    box-shadow: 0 0 10px rgba(255,0,0,0.8), inset 0 0 4px rgba(255,255,255,0.5);
  }

  .right-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .knob-matrix {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }

  .finetune-row {
    display: flex;
    justify-content: center;
    gap: 3rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  .micro-knob {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }
  .micro-knob span { font-size: 0.55rem; color: #475569; font-weight: 900; }
  .micro-knob .cap {
    width: 20px;
    height: 20px;
    background: radial-gradient(circle at 30% 30%, #475569, #1e293b);
    border-radius: 50%;
    border: 1px solid #334155;
    position: relative;
  }
  .micro-knob .cap::after {
    content: '';
    position: absolute;
    top: 3px; left: 50%; transform: translateX(-50%);
    width: 2px; height: 3px; background: #22d3ee; border-radius: 1px;
  }

</style>
