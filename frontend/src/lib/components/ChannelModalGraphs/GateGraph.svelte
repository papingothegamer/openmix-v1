<script>
  // Gate visualization for the ChannelModal.
  // - gateThresh: threshold in dB
  // - gateRange: attenuation applied below threshold in dB
  // Attack/hold/release are used to render the time envelope

  export let gateThresh = -40;
  export let gateRange = 20;
  export let gateAttack = 5;
  export let gateHold = 50;
  export let gateRel = 100;
  export let gateScFreq = 100;
  export let gateScType = 0;

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

  // Render a simple "gate opens then closes" envelope:
  // attack -> hold -> release.
  function generateEnvelopePath(attack, hold, rel) {
    const maxT = 1000; 
    const tAtt = Math.min(attack, maxT * 0.2);
    const tHold = Math.min(hold, maxT * 0.4);
    const tRel = Math.min(rel, maxT * 0.4);
    const total = tAtt + tHold + tRel || 1;

    const p1x = (tAtt / total) * 100;
    const p2x = ((tAtt + tHold) / total) * 100;
    
    return `M0,100 L${p1x},20 L${p2x},20 L100,100`;
  }
</script>

<div class="x32-top-graphs">
  <div class="x32-graph-box">
    <div class="graph-title">Gate Curve & Envelope</div>
    <div class="graph-placeholder flex-center" style="padding: 1rem; position: relative;">
      <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none" style="position: absolute; inset: 0; padding: 1.5rem;">
        <path d="M0 100 L100 0" stroke="#334155" stroke-width="1" stroke-dasharray="2,2" />
        <path d={generateGateCurve(gateThresh, gateRange)} fill="none" stroke="#3b82f6" stroke-width="2.5" />
        <path d="M0 57 L100 57" stroke="#1e293b" stroke-width="1" />
      </svg>
      <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none" style="position: absolute; inset: 0; padding: 1.5rem; opacity: 0.3;">
        <path d={generateEnvelopePath(gateAttack, gateHold, gateRel)} fill="none" stroke="#60a5fa" stroke-width="2" />
      </svg>
    </div>
  </div>

  <div class="x32-graph-box">
    <div class="graph-title">Side Chain Filter</div>
    <div class="graph-placeholder flex-center" style="padding: 1rem;">
      <div class="sc-knob-wrapper">
        <Knob 
          value={gateScFreq} 
          min={20} 
          max={20000} 
          label={['2-POLE', 'LC', 'HC'][gateScType] || 'HPF'} 
          color="#3b82f6" 
          interactive={false} 
          isLogarithmic={true} 
          size={60} 
        />
      </div>
    </div>
  </div>
</div>

<style>
  .x32-top-graphs { display: flex; gap: 1rem; padding: 1rem; height: 160px; flex-shrink: 0; }
  .x32-graph-box { flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; }
  .graph-title { background: #1e293b; color: #94a3b8; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.4rem 0.75rem; border-bottom: 1px solid #0f172a; }
  .graph-placeholder { flex: 1; background: #020617; position: relative; }
  .flex-center { display: flex; align-items: center; justify-content: center; }
  .sc-knob-wrapper { display: flex; flex-direction: column; align-items: center; transform: scale(0.9); }
</style>