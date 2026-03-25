import { writable } from 'svelte/store';

const DEFAULT_SLOT = {
  preset: 'Empty',
  bypass: false,
  params: {},
  level: 0,
  type: 'generic'
};

const PRESET_DEFAULTS = {
  'Empty': {
    type: 'generic',
    params: {}
  },
  'Hall Reverb': {
    type: 'reverb',
    params: {
      type: 'Hall Reverb',
      size: 70,
      decay: 25,
      preDelay: 20,
      damping: 50
    }
  },
  'Vintage Room': {
    type: 'reverb',
    params: {
      type: 'Vintage Room',
      size: 55,
      decay: 18,
      preDelay: 12,
      damping: 42
    }
  },
  'Stereo Delay': {
    type: 'delay',
    params: {
      type: 'Stereo Delay',
      time: 50,
      feedback: 40,
      mix: 50
    }
  },
  'Stereo Chorus': {
    type: 'chorus',
    params: {
      rate: 30,
      depth: 60,
      mix: 50
    }
  }
};

function cloneParams(params) {
  return { ...(params || {}) };
}

function getPresetMeta(preset) {
  return PRESET_DEFAULTS[preset] || PRESET_DEFAULTS.Empty;
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
      ...cloneParams(presetMeta.params),
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

export function setSlot(idx, patch) {
  fxState.update((s) => {
    const slots = Array.isArray(s.slots) ? s.slots.slice() : [];
    const current = normalizeSlot(slots[idx]);
    const nextPreset = patch && Object.prototype.hasOwnProperty.call(patch, 'preset') ? patch.preset || 'Empty' : current.preset;
    const presetChanged = nextPreset !== current.preset;
    const presetMeta = getPresetMeta(nextPreset);
    const merged = {
      ...current,
      ...patch,
      preset: nextPreset
    };

    merged.type = patch && Object.prototype.hasOwnProperty.call(patch, 'type')
      ? patch.type
      : (presetChanged ? presetMeta.type : merged.type || presetMeta.type || 'generic');

    if (presetChanged) {
      merged.params = {
        ...cloneParams(presetMeta.params),
        ...cloneParams(patch?.params)
      };
    } else {
      merged.params = {
        ...cloneParams(current.params),
        ...cloneParams(patch?.params)
      };
    }

    slots[idx] = normalizeSlot(merged);
    return { ...s, slots };
  });
}

export default fxState;