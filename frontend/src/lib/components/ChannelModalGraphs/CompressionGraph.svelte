<script>
  // Compression visualization for the ChannelModal.
  // This project uses OSC params:
  // - compThresh: threshold in dB (negative typically)
  // - compRatio: compression ratio
  // - compAttack/compRelease for envelope rendering (time-domain visualization only)
  // - compMakeup for envelope/visual scaling (time-domain visualization only)

  export let compThresh = -20;
  export let compRatio = 4;
  export let compAttack = 10;
  export let compRelease = 100;
  export let compMakeup = 0;
  export let filterOn = false;
  export let filterFreq = 100;

  $: logMin = Math.log10(20);
  $: logMax = Math.log10(20000);
  $: logVal = Math.log10(filterFreq);
  
  import Knob from "../EffectControls/Knob.svelte";

  function generateCompCurve(thresh, ratio) {
    const pts = [];
    for (let x = -80; x <= 0; x += 2) {
      const y = x < thresh ? x : thresh + (x - thresh) / Math.max(1, ratio);
      const sx = ((x + 80) / 80) * 100;
      const sy = 100 - ((y + 80) / 80) * 100;
      pts.push(`${sx},${sy}`);
    }
    return pts.join(" ");
  }

  // Envelope visualization:
  // attack -> release using attack/compRelease and optional makeup shifting.
  function generateEnvelopePath(attack, release, makeup) {
    const a = Math.max(0, Number(attack));
    const r = Math.max(0, Number(release));
    const total = a + r;
    const safeTotal = total > 0 ? total : 1;

    const w = 100;
    const h = 60;

    // Map "makeup" to a vertical boost for display only.
    const makeupDb = clampToRange(Number(makeup), 0, 24);
    const yBaseClosed = h * 0.95;
    const yOpen = h * 0.22 - (makeupDb / 24) * (h * 0.12);
    const yClosed = yBaseClosed;

    const xA = (a / safeTotal) * w;

    // Closed -> ramp to open -> release back to closed.
    return [
      `M 0 ${yClosed}`,
      `L ${xA} ${yOpen}`,
      `L ${w} ${yClosed}`,
    ].join(" ");
  }

  function clampToRange(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  $: compCurve = generateCompCurve(compThresh, compRatio);
  $: envelopePath = generateEnvelopePath(compAttack, compRelease, compMakeup);
</script>

<div class="x32-top-graphs">
  <div class="x32-graph-box">
    <div class="graph-title">Compression Curve</div>
    <div class="graph-placeholder flex-center" style="padding: 0.5rem;">
      <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; overflow: visible;">
        <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" stroke-width="1" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="#1e293b" stroke-width="1" />
        <polyline points={compCurve} fill="none" stroke="#10b981" stroke-width="2" />
      </svg>
    </div>
  </div>

  <div class="x32-graph-box">
    <div class="graph-title">Compression Envelope</div>
    <div class="graph-placeholder flex-center">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" class="envelope-svg">
        <path d={envelopePath} fill="none" stroke="#10b981" stroke-width="2.5" />
        <path d="M0 57 L100 57" stroke="#1e293b" stroke-width="1" />
      </svg>
    </div>
  </div>

  <div class="x32-graph-box">
    <div class="graph-title">Side Chain Filter</div>
    <div class="graph-placeholder flex-center" style="padding: 0.5rem;">
      <div class="sc-knob-wrapper">
        <Knob 
          value={filterFreq} 
          min={20} 
          max={20000} 
          label={filterOn ? 'HPF ON' : 'HPF OFF'} 
          color="#10b981" 
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

