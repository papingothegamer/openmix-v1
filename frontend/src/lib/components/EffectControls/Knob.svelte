<script>
  import { onMount } from 'svelte';

  export let label = 'Param';
  export let value = 0.5;
  export let min = 0;
  export let max = 100;
  export let onChange = (val) => {}; // Fixed: Added parameter

  let knobElement;
  let isDragging = false;

  const radius = 32;
  const arcRadius = 28;
  const trackWidth = 3;
  const startAngle = -135;
  const sweepAngle = 270;

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

  function valueToAngle(val) {
    return startAngle + normalizeValue(val) * sweepAngle;
  }

  function angleToNormalized(angle) {
    return clamp((angle - startAngle) / sweepAngle, 0, 1);
  }

  function describeArc(angle) {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (angle * Math.PI) / 180;
    const x1 = arcRadius * Math.cos(startRad);
    const y1 = arcRadius * Math.sin(startRad);
    const x2 = arcRadius * Math.cos(endRad);
    const y2 = arcRadius * Math.sin(endRad);
    const largeArc = angle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  function getAngleFromPoint(clientX, clientY) {
    if (!knobElement) return startAngle;

    const rect = knobElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < startAngle) {
      angle += 360;
    }

    return clamp(angle, startAngle, startAngle + sweepAngle);
  }

  function updateFromPointer(clientX, clientY) {
    const angle = getAngleFromPoint(clientX, clientY);
    const nextValue = denormalizeValue(angleToNormalized(angle));
    onChange(nextValue);
  }

  function handleMouseDown(event) {
    event.preventDefault();
    isDragging = true;
    updateFromPointer(event.clientX, event.clientY);
  }

  function handleMouseMove(event) {
    if (!isDragging) return;
    updateFromPointer(event.clientX, event.clientY);
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function handleTouchStart(event) {
    if (!event.touches.length) return;
    isDragging = true;
    const touch = event.touches[0];
    updateFromPointer(touch.clientX, touch.clientY);
  }

  function handleTouchMove(event) {
    if (!isDragging || !event.touches.length) return;
    const touch = event.touches[0];
    updateFromPointer(touch.clientX, touch.clientY);
  }

  function handleTouchEnd() {
    isDragging = false;
  }

  function formatValue(val) {
    const rounded = Math.round(val * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  onMount(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  });
  $: clampedValue = clamp(value, Math.min(min, max), Math.max(min, max));
  $: angle = valueToAngle(clampedValue);
  $: arcPath = describeArc(angle);
  $: displayValue = formatValue(clampedValue);
  $: normalized = normalizeValue(clampedValue);
  $: pointerAngle = -135 + normalized * sweepAngle;
</script>

<div
  class="knob-container"
  class:dragging={isDragging}
  bind:this={knobElement}
  on:mousedown={handleMouseDown}
  on:touchstart|preventDefault={handleTouchStart}
>
  <svg class="knob-svg" viewBox={`${-radius} ${-radius} ${radius * 2} ${radius * 2}`}>
    <path
      d={describeArc(startAngle + sweepAngle)}
      fill="none"
      stroke="#2a2a2a"
      stroke-width={trackWidth}
      stroke-linecap="round"
    />

    <path
      d={arcPath}
      fill="none"
      stroke="#00CED1"
      stroke-width={trackWidth}
      stroke-linecap="round"
    />

    <circle cx="0" cy="0" r="19" fill="#161616" stroke="#2b2b2b" stroke-width="1.5" />

    <g transform={`rotate(${pointerAngle})`}>
      <line x1="0" y1="-3" x2="0" y2="-16" stroke="#00CED1" stroke-width="2.5" stroke-linecap="round" />
    </g>

    <circle cx="0" cy="0" r="4" fill="#00CED1" />
  </svg>

  <div class="knob-label">{label}</div>
  <div class="knob-value">{displayValue}</div>
</div>

<style>
  .knob-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    cursor: grab;
    user-select: none;
    padding: 0.5rem;
    border-radius: 8px;
    transition: background-color 0.2s, transform 0.2s;
    touch-action: none;
  }

  .knob-container:hover {
    background-color: rgba(0, 206, 209, 0.04);
  }

  .knob-container.dragging,
  .knob-container:active {
    cursor: grabbing;
    background-color: rgba(0, 206, 209, 0.08);
  }

  .knob-svg {
    width: 80px;
    height: 80px;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
  }

  .knob-label {
    font-size: 0.75rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    text-align: center;
  }

  .knob-value {
    font-size: 0.85rem;
    color: #00CED1;
    font-weight: 700;
    min-width: 2rem;
    text-align: center;
  }
</style>