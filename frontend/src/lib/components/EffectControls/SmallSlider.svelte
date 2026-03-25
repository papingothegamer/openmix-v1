<script>
  export let label = 'Level';
  export let value = 0.5;
  export let min = 0;
  export let max = 100;
  export let onChange = (val) => {}; // Fixed: Added parameter

  function clamp(val, low, high) {
    return Math.min(high, Math.max(low, val));
  }

  function getSafeRange() {
    return max === min ? 1 : max - min;
  }

  function normalizeValue(val) {
    return clamp((val - min) / getSafeRange(), 0, 1);
  }

  function denormalizeValue(normalized) {
    return min + clamp(normalized, 0, 1) * getSafeRange();
  }

  function handleInput(event) {
    const sliderPosition = Number(event.target.value) / 100;
    const nextValue = denormalizeValue(sliderPosition);
    onChange(nextValue);
  }

  function formatValue(val) {
    const rounded = Math.round(val * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  $: clampedValue = clamp(value, Math.min(min, max), Math.max(min, max));
  $: normalizedValue = normalizeValue(clampedValue);
  $: sliderValue = normalizedValue * 100;
  $: displayValue = formatValue(clampedValue);
  $: fillPercent = `${sliderValue}%`;
</script>

<div class="slider-container">
  <div class="slider-label">{label}</div>

  <div class="slider-wrapper" style={`--fill:${fillPercent};`}>
    <input
      type="range"
      min="0"
      max="100"
      step="0.1"
      value={sliderValue}
      on:input={handleInput}
      class="slider-input"
    />
  </div>

  <div class="slider-value">{displayValue}</div>
</div>

<style>
  .slider-container {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    align-items: center;
    width: 100%;
  }

  .slider-label {
    font-size: 0.7rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    text-align: center;
  }

  .slider-wrapper {
    --fill: 0%;
    width: 100%;
    height: 4px;
    position: relative;
    padding: 6px 0;
  }

  .slider-input {
    width: 100%;
    height: 4px;
    border-radius: 999px;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    background: linear-gradient(to right, #00ced1 0%, #00ced1 var(--fill), #2a2a2a var(--fill), #2a2a2a 100%);
  }

  .slider-input::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #00ced1;
    cursor: pointer;
    border: none;
    box-shadow: 0 0 4px rgba(0, 206, 209, 0.4);
  }

  .slider-input::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #00ced1;
    cursor: pointer;
    border: none;
    box-shadow: 0 0 4px rgba(0, 206, 209, 0.4);
  }

  .slider-input::-moz-range-track {
    height: 4px;
    border-radius: 999px;
    background: #2a2a2a;
  }

  .slider-value {
    font-size: 0.75rem;
    color: #00ced1;
    font-weight: 700;
  }
</style>