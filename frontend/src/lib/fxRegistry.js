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
  },
  'Stereo Flanger': {
    family: 'Flanger',
    type: 'flanger',
    oscTypeIndex: 18,
    defaultParams: {
      speed: 15,
      depth: 60,
      feedback: 40,
      mix: 50
    },
    oscMap: {
      speed: '/fxparam/1',
      depth: '/fxparam/2',
      feedback: '/fxparam/3',
      mix: '/fxparam/7'
    }
  },
  'Stereo Phaser': {
    family: 'Phaser',
    type: 'phaser',
    oscTypeIndex: 20,
    defaultParams: {
      speed: 10,
      depth: 50,
      resonance: 40,
      mix: 50
    },
    oscMap: {
      speed: '/fxparam/1',
      depth: '/fxparam/2',
      resonance: '/fxparam/3',
      mix: '/fxparam/6'
    }
  },
  'Stereo Pitch': {
    family: 'Pitch',
    type: 'pitch',
    oscTypeIndex: 21,
    defaultParams: {
      semi: 0,
      cents: 0,
      delay: 5,
      mix: 100
    },
    oscMap: {
      semi: '/fxparam/1',
      cents: '/fxparam/2',
      delay: '/fxparam/3',
      mix: '/fxparam/6'
    }
  },
  'Dimensional Chorus': {
    family: 'Chorus',
    type: 'chorus',
    oscTypeIndex: 22,
    defaultParams: {
      mode: 1
    },
    oscMap: {
      mode: '/fxparam/1'
    }
  },
  'Stereo DeEsser': {
    family: 'Dynamics',
    type: 'deesser',
    oscTypeIndex: 28,
    defaultParams: {
      threshold: -30,
      range: 50,
      ratio: 2.0
    },
    oscMap: {
      threshold: '/fxparam/1',
      range: '/fxparam/2',
      ratio: '/fxparam/3'
    }
  },
  'Precision Limiter': {
    family: 'Dynamics',
    type: 'limiter',
    oscTypeIndex: 30,
    defaultParams: {
      gain: 0,
      threshold: -2,
      attack: 0.1,
      release: 200,
      mix: 100
    },
    oscMap: {
      gain: '/fxparam/1',
      threshold: '/fxparam/2',
      attack: '/fxparam/3',
      release: '/fxparam/4',
      mix: '/fxparam/5'
    }
  },
  'Combinator': {
    family: 'Dynamics',
    type: 'compressor',
    oscTypeIndex: 31,
    defaultParams: {
      threshold: -20,
      ratio: 4.0,
      attack: 10,
      release: 100
    },
    oscMap: {
      threshold: '/fxparam/2',
      ratio: '/fxparam/1',
      attack: '/fxparam/3',
      release: '/fxparam/4'
    }
  },
  'Stereo Enhancer': {
    family: 'Enhancer',
    type: 'enhancer',
    oscTypeIndex: 35,
    defaultParams: {
      highGain: 50,
      lowGain: 30,
      mix: 60
    },
    oscMap: {
      highGain: '/fxparam/2',
      lowGain: '/fxparam/3',
      mix: '/fxparam/6'
    }
  }
};

export function getPresetMeta(preset) {
  return FX_REGISTRY[preset] || FX_REGISTRY.Empty;
}