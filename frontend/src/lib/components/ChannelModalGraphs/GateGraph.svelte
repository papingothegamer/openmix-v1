<script>
  // Gate visualization for the ChannelModal.
  // The OSC parameters in this project are represented as:
  // - gateThresh: threshold in dB (negative range typically)
  // - gateRange: attenuation applied below threshold in dB
  // Attack/hold/release are used to render the time envelope (not a real DSP model).

  export let gateThresh = -40;
  export let gateRange = 20;
  export let gateAttack = 5;
  export let gateHold = 50;
  export let gateRel = 100;
  export let gateScFreq = 100;
  export let gateScType = 0;

  $: logMin = Math.log10(20);
  $: logMax = Math.log10(20000);
  $: logVal = Math.log10(gateScFreq);
  
  import Knob from "../EffectControls/Knob.svelte";

  function generateGateCurve(thresh, range) {
    const pts = [];
    for (let x = -80; x <= 0; x += 2) {
      const y = x < thresh ? x - range : x;
      const sx = ((x + 80) / 80) * 100;
      const sy = 100 - ((y + 80) / 80) * 100;
      pts.push(`${sx},${sy}`);
    }
    return pts.join(" ");
  }

  function clamp01(n) {
    return Math.max(0, Math.min(1, n));
  }

  // Render a simple "gate opens then closes" envelope:
  // attack -> hold -> release.
  function generateEnvelopePath(attack, hold, rel) {
    const a = Math.max(0, Number(attack));
    const h = Math.max(0, Number(hold));
    const r = Math.max(0, Number(rel));
    const total = a + h + r;
    const safeTotal = total > 0 ? total : 1;

    const w = 100;
    const hpx = 60;

    // We map envelope amplitude between 15% and 95% of box height.
    const yOpen = hpx * 0.15;
    const yClosed = hpx * 0.95;

    // Times mapped to x positions in [0..100]
    const xA = (a / safeTotal) * w;
    const xH = xA + (h / safeTotal) * w;
    const xR = w;

    const yAtA = yOpen;

    // Attack: closed -> open
    // Hold: open
    // Release: open -> closed
    return [
      `M 0 ${yClosed}`,
      `L ${xA} ${yAtA}`,
      `L ${xH} ${yAtA}`,
      `L ${xR} ${yClosed}`,
    ].join(" ");
  }

  $: gateCurve = generateGateCurve(gateThresh, gateRange);
  $: envelopePath = generateEnvelopePath(gateAttack, gateHold, gateRel);
</script>

<div class="x32-top-graphs">
  <div class="x32-graph-box">
    <div class="graph-title">Gate Curve</div>
    <div class="graph-placeholder flex-center" style="padding: 0.5rem;">
      <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; overflow: visible;">
        <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" stroke-width="1" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="#1e293b" stroke-width="1" />
        <polyline points={gateCurve} fill="none" stroke="#38bdf8" stroke-width="2" />
      </svg>
    </div>
  </div>

  <div class="x32-graph-box">
    <div class="graph-title">Gain Envelope</div>
    <div class="graph-placeholder flex-center">
      <svg viewBox="0 0 100 60" class="envelope-svg" preserveAspectRatio="none">
        <path d={envelopePath} fill="none" stroke="#38bdf8" stroke-width="2.5" />
        <path d="M0 57 L100 57" stroke="#1e293b" stroke-width="1" />
      </svg>
    </div>
  </div>

  <div class="x32-graph-box">
    <div class="graph-title">Side Chain Filter</div>
    <div class="graph-placeholder flex-center" style="padding: 0.5rem;">
      <div class="sc-knob-wrapper">
        <Knob 
          value={gateScFreq} 
          min={20} 
          max={20000} 
          label={['2-POLE', 'LC', 'HC'][gateScType]} 
          color="#3b82f6" 
          interactive={false} 
          isLogarithmic={true} 
          size={52} 
        />
      </div>
    </div>
  </div>
</div>

<style>
  .x32-top-graphs {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    flex: 1;
    min-height: 0;
  }
  .x32-graph-box {
    flex: 1;
    min-width: 0;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .graph-title {
    background: #1e293b;
    color: #cbd5e1;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #334155;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .graph-placeholder {
    flex: 1;
    position: relative;
    min-height: 0;
  }
  .flex-center {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .envelope-svg {
    width: 100%;
    height: 100%;
  }

  .sc-knob-wrapper { display: flex; align-items: center; justify-content: center; }
</style>

