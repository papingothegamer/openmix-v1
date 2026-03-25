// src/lib/fxRegistry.js

export const FX_REGISTRY = {
  'Empty': {
    family: 'No Effect',
    type: 'generic',
    oscTypeIndex: 0,
    defaultParams: {},
    oscMap: {}
  },
  'Hall Reverb': {
    family: 'Reverb',
    type: 'reverb',
    oscTypeIndex: 1, // Standard X32 index for Hall Reverb
    defaultParams: {
      type: 'Hall Reverb',
      size: 70,
      decay: 25,
      preDelay: 20,
      damping: 50
    },
    oscMap: {
      size: '/fxparam/1',
      decay: '/fxparam/2',
      preDelay: '/fxparam/3',
      damping: '/fxparam/4'
    }
  },
  'Vintage Room': {
    family: 'Reverb',
    type: 'reverb',
    oscTypeIndex: 4, // Standard X32 index for Vintage Room
    defaultParams: {
      type: 'Vintage Room',
      size: 55,
      decay: 18,
      preDelay: 12,
      damping: 42
    },
    oscMap: {
      size: '/fxparam/1',
      decay: '/fxparam/2',
      preDelay: '/fxparam/3',
      damping: '/fxparam/4'
    }
  },
  'Stereo Delay': {
    family: 'Delay',
    type: 'delay',
    oscTypeIndex: 10, // Standard X32 index for Stereo Delay
    defaultParams: {
      type: 'Stereo Delay',
      time: 50,
      feedback: 40,
      mix: 50
    },
    oscMap: {
      time: '/fxparam/1',
      feedback: '/fxparam/2',
      mix: '/fxparam/3'
    }
  },
  'Stereo Chorus': {
    family: 'Chorus',
    type: 'chorus',
    oscTypeIndex: 15, // Standard X32 index for Stereo Chorus
    defaultParams: {
      rate: 30,
      depth: 60,
      mix: 50
    },
    oscMap: {
      rate: '/fxparam/1',
      depth: '/fxparam/2',
      mix: '/fxparam/3'
    }
  }
};

export function getPresetMeta(preset) {
  return FX_REGISTRY[preset] || FX_REGISTRY.Empty;
}