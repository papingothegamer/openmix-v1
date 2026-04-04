<script>
  import Knob from '../EffectControls/Knob.svelte';

  export let params = {};
  export let preset = 'Stereo Pitch';
  export let onParamChange = (key, value) => {};
  export let slotIndex = 0;

  $: semi = params.semi ?? 0;
  $: cents = params.cents ?? 0;
  $: mix = params.mix ?? 100;
</script>

<div class="effect-module pitch-shifter">
  <div class="rack-metal">
    <div class="fx-header">
      <span class="brand">OPENMIX</span>
      <span class="model">STEREO PITCH SHIFTER</span>
    </div>

    <div class="pitch-content">
      <div class="lcd-display">
        <div class="lcd-label">PITCH SHIFT</div>
        <div class="lcd-value">{semi > 0 ? '+' : ''}{semi} SEMI</div>
        <div class="lcd-sub">{cents > 0 ? '+' : ''}{cents} CENTS</div>
        <div class="lcd-glow"></div>
      </div>

      <div class="knobs-row">
        <Knob 
          label="Semi" 
          value={semi} 
          min={-12} 
          max={12} 
          step={1}
          onChange={(v) => onParamChange('semi', Math.round(v))} 
        />
        <Knob 
          label="Cents" 
          value={cents} 
          min={-50} 
          max={50} 
          onChange={(v) => onParamChange('cents', v)} 
        />
        <Knob 
          label="Mix" 
          value={mix} 
          min={0} 
          max={100} 
          onChange={(v) => onParamChange('mix', v)} 
        />
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
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    position: relative;
    overflow: hidden;
  }

  .fx-header {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 1.5rem;
  }
  .brand { color: #64748b; font-weight: 900; font-size: 0.7rem; letter-spacing: 2px; }
  .model { color: #3b82f6; font-weight: 800; font-size: 1rem; font-family: 'Inter', sans-serif; opacity: 0.9; }

  .pitch-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 3rem;
    padding: 0 1rem;
  }

  .lcd-display {
    width: 200px;
    height: 100px;
    background: #000;
    border: 2px solid #334155;
    border-radius: 6px;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.2);
  }

  .lcd-label { font-family: 'JetBrains Mono', monospace; font-size: 0.6rem; color: #3b82f6; opacity: 0.5; letter-spacing: 2px; margin-bottom: 0.5rem; }
  .lcd-value { font-family: 'JetBrains Mono', monospace; font-size: 1.5rem; color: #3b82f6; font-weight: 800; text-shadow: 0 0 10px rgba(59, 130, 246, 0.5); line-height: 1; }
  .lcd-sub { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #3b82f6; opacity: 0.8; margin-top: 0.25rem; }
  .lcd-glow { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(0deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%); pointer-events: none; }

  .knobs-row {
    flex: 1;
    display: flex;
    justify-content: space-around;
    align-items: center;
  }
</style>
