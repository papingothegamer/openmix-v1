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
    
    const rtnNum = idx + 1; 
    const rtnNumStr = rtnNum.toString().padStart(2, '0'); // For return channel paths (/rtn/01/...)
    const fxNum = rtnNum; // For FX engine paths (/fx/1/...)

    const merged = {
      ...current,
      ...patch,
      preset: nextPreset
    };

    merged.type = patch && patch.type ? patch.type : (presetChanged ? presetMeta.type : current.type);

    // 1. Handle Bypass (Mute/On)
    if (patch && patch.hasOwnProperty('bypass')) {
      setOsc(`/rtn/${rtnNumStr}/mix/on`, patch.bypass ? 0 : 1);
    }

    // 2. Handle Level (Fader)
    if (patch && patch.hasOwnProperty('level')) {
      // Convert 0-100 to 0.0-1.0 for OSC faders
      setOsc(`/rtn/${rtnNumStr}/mix/fader`, patch.level / 100);
    }

    // 3. Handle Preset Change
    if (presetChanged) {
      merged.params = {
        ...cloneParams(presetMeta.defaultParams),
        ...cloneParams(patch?.params)
      };
      
      setOsc(`/fx/${fxNum}/type`, presetMeta.oscTypeIndex);
      
      Object.entries(merged.params).forEach(([key, value]) => {
        const oscSuffix = presetMeta.oscMap[key];
        if (oscSuffix && typeof value === 'number') {
          // oscMap uses /fxparam/N, translate to /fx/N/par/NN
          const parMatch = oscSuffix.match(/\/fxparam\/(\d+)/);
          if (parMatch) {
            const parNum = String(parMatch[1]).padStart(2, '0');
            setOsc(`/fx/${fxNum}/par/${parNum}`, value);
          }
        }
      });
    } 
    // 4. Handle Parameter Adjustments
    else if (patch?.params) {
      merged.params = {
        ...cloneParams(current.params),
        ...cloneParams(patch.params)
      };

      Object.entries(patch.params).forEach(([key, value]) => {
        const oscSuffix = presetMeta.oscMap[key];
        // Safeguard: only send if key exists in map and value is a number
        if (oscSuffix && typeof value === 'number' && current.params[key] !== value) {
          // oscMap uses /fxparam/N, translate to /fx/N/par/NN
          const parMatch = oscSuffix.match(/\/fxparam\/(\d+)/);
          if (parMatch) {
            const parNum = String(parMatch[1]).padStart(2, '0');
            setOsc(`/fx/${fxNum}/par/${parNum}`, value);
          }
        }
      });
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
