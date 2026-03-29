// src/lib/fxState.js
import { writable } from 'svelte/store';
import { FX_REGISTRY, getPresetMeta } from './fxRegistry.js';
import { setOsc } from './socket.js'; // Import the OSC sender

const DEFAULT_SLOT = {
  preset: 'Empty',
  bypass: false,
  params: {},
  level: 0,
  type: 'generic'
};

function cloneParams(params) {
  return { ...(params || {}) };
}

export function normalizeSlot(slot = {}) {
  const preset = slot.preset || 'Empty';
  const presetMeta = getPresetMeta(preset);
  return {
    ...DEFAULT_SLOT,
    ...slot,
    preset,
    type: slot.type || presetMeta.type || 'generic',
    params: {
      ...cloneParams(presetMeta.defaultParams),
      ...cloneParams(slot.params)
    }
  };
}

export const fxState = writable({ slots: [] });

export function ensureFxSlots(count) {
  fxState.update((s) => {
    const slots = Array.isArray(s.slots) ? s.slots.slice() : [];
    while (slots.length < count) {
      slots.push(normalizeSlot());
    }
    if (slots.length > count) slots.length = count;
    return {
      ...s,
      slots: slots.map((slot) => normalizeSlot(slot))
    };
  });
}

// THE ROUTER: Handles State + OSC Emission automatically
export function setSlot(idx, patch) {
  fxState.update((s) => {
    const slots = Array.isArray(s.slots) ? s.slots.slice() : [];
    const current = normalizeSlot(slots[idx]);
    
    const nextPreset = patch && patch.preset ? patch.preset : current.preset;
    const presetChanged = nextPreset !== current.preset;
    const presetMeta = getPresetMeta(nextPreset);
    
    const rtnNum = idx + 1; // OSC paths use 1-based indexing (e.g., /rtn/1/)

    const merged = {
      ...current,
      ...patch,
      preset: nextPreset
    };

    merged.type = patch && patch.type ? patch.type : (presetChanged ? presetMeta.type : current.type);

    // 1. Handle Preset Change
    if (presetChanged) {
      // Apply the default parameters for the new preset
      merged.params = {
        ...cloneParams(presetMeta.defaultParams),
        ...cloneParams(patch?.params)
      };
      
      // Tell the mixer to change the effect type
      setOsc(`/rtn/${rtnNum}/fxtype`, presetMeta.oscTypeIndex);
      
      // Blast all default parameter values to the mixer so it matches the UI
      Object.entries(merged.params).forEach(([key, value]) => {
        const oscSuffix = presetMeta.oscMap[key];
        if (oscSuffix && typeof value === 'number') {
          setOsc(`/rtn/${rtnNum}${oscSuffix}`, value);
        }
      });
    } 
    // 2. Handle Parameter Adjustments (e.g. user moving a knob)
    else {
      merged.params = {
        ...cloneParams(current.params),
        ...cloneParams(patch?.params)
      };

      // If specific parameters were changed, send only those to the mixer
      if (patch?.params) {
        Object.entries(patch.params).forEach(([key, value]) => {
          const oscSuffix = presetMeta.oscMap[key];
          if (oscSuffix && current.params[key] !== value) {
            setOsc(`/rtn/${rtnNum}${oscSuffix}`, value);
          }
        });
      }
    }

    slots[idx] = normalizeSlot(merged);
    return { ...s, slots };
  });
}

export function loadFxState(newState) {
  if (!newState || (!newState.slots || !Array.isArray(newState.slots))) return;
  fxState.update(s => {
    return {
      ...s,
      slots: newState.slots.map(slot => normalizeSlot(slot))
    };
  });
}

export default fxState;