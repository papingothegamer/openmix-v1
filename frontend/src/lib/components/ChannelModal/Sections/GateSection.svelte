<script>
  import { createEventDispatcher } from 'svelte';
  import GateGraph from "../../ChannelModalGraphs/GateGraph.svelte";

  export let gateThresh = -40;
  export let gateRange = 20;
  export let gateAttack = 5;
  export let gateHold = 50;
  export let gateRel = 100;
  export let filterOn = false;
  export let filterFreq = 100;

  const dispatch = createEventDispatcher();

  function update() {
    dispatch('update', { 
      gateThresh, gateRange, gateAttack, gateHold, gateRel,
      filterOn, filterFreq
    });
  }
</script>

<div class="x32-panel">
  <div class="x32-top-graphs">
    <GateGraph
      {gateThresh}
      {gateRange}
      {gateAttack}
      {gateHold}
      {gateRel}
      {filterOn}
      {filterFreq}
    />
  </div>
  
  <div class="x32-bottom-faders">
    <div class="fader-group">
      <div class="v-slider-val">{gateThresh}</div>
      <div class="v-slider-wrapper">
        <input type="range" class="v-slider blue-thumb" min="-80" max="0" bind:value={gateThresh} on:input={update} />
      </div>
      <div class="v-slider-lbl">THR</div>
    </div>
    <div class="fader-group">
      <div class="v-slider-val">{gateRange}</div>
      <div class="v-slider-wrapper">
        <input type="range" class="v-slider blue-thumb" min="0" max="60" bind:value={gateRange} on:input={update} />
      </div>
      <div class="v-slider-lbl">RANGE</div>
    </div>
    <div class="fader-group">
      <div class="v-slider-val">{gateAttack}</div>
      <div class="v-slider-wrapper">
        <input type="range" class="v-slider blue-thumb" min="0" max="120" bind:value={gateAttack} on:input={update} />
      </div>
      <div class="v-slider-lbl">ATTACK</div>
    </div>
    <div class="fader-group">
      <div class="v-slider-val">{gateHold}</div>
      <div class="v-slider-wrapper">
        <input type="range" class="v-slider blue-thumb" min="0" max="500" bind:value={gateHold} on:input={update} />
      </div>
      <div class="v-slider-lbl">HOLD</div>
    </div>
    <div class="fader-group">
      <div class="v-slider-val">{gateRel}</div>
      <div class="v-slider-wrapper">
        <input type="range" class="v-slider blue-thumb" min="5" max="500" bind:value={gateRel} on:input={update} />
      </div>
      <div class="v-slider-lbl">REL</div>
    </div>
  </div>
</div>