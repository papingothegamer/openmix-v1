<script>
  import { createEventDispatcher } from 'svelte';
  import CompressionGraph from "../../ChannelModalGraphs/CompressionGraph.svelte";

  export let compThresh = -20;
  export let compRatio = 4;
  export let compAttack = 10;
  export let compRelease = 100;
  export let compMakeup = 0;
  export let filterOn = false;
  export let filterFreq = 100;

  const dispatch = createEventDispatcher();

  function update() {
    dispatch('update', { 
      compThresh, compRatio, compAttack, compRelease, compMakeup,
      filterOn, filterFreq
    });
  }
</script>

<div class="x32-panel">
  <div class="x32-top-graphs">
    <CompressionGraph
      {compThresh}
      {compRatio}
      {compAttack}
      {compRelease}
      {compMakeup}
      {filterOn}
      {filterFreq}
    />
  </div>
  
  <div class="x32-bottom-faders">
    <div class="fader-group">
      <div class="v-slider-val">{compThresh}</div>
      <div class="v-slider-wrapper">
        <input type="range" class="v-slider green-thumb" min="-60" max="0" bind:value={compThresh} on:input={update} />
      </div>
      <div class="v-slider-lbl">THR</div>
    </div>
    <div class="fader-group">
      <div class="v-slider-val">{compRatio}:1</div>
      <div class="v-slider-wrapper">
        <input type="range" class="v-slider green-thumb" min="1" max="20" bind:value={compRatio} on:input={update} />
      </div>
      <div class="v-slider-lbl">RATIO</div>
    </div>
    <div class="fader-group">
      <div class="v-slider-val">{compAttack}</div>
      <div class="v-slider-wrapper">
        <input type="range" class="v-slider green-thumb" min="0" max="100" bind:value={compAttack} on:input={update} />
      </div>
      <div class="v-slider-lbl">ATTACK</div>
    </div>
    <div class="fader-group">
      <div class="v-slider-val">{compRelease}</div>
      <div class="v-slider-wrapper">
        <input type="range" class="v-slider green-thumb" min="5" max="500" bind:value={compRelease} on:input={update} />
      </div>
      <div class="v-slider-lbl">RELEASE</div>
    </div>
    <div class="fader-group">
      <div class="v-slider-val">{compMakeup}</div>
      <div class="v-slider-wrapper">
        <input type="range" class="v-slider green-thumb" min="0" max="24" bind:value={compMakeup} on:input={update} />
      </div>
      <div class="v-slider-lbl">GAIN</div>
    </div>
  </div>
</div>