// src/lib/fxRegistry.js

export const FX_REGISTRY = {
  'Empty': {
    family: 'Utility',
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
  'Plate Reverb': {
    family: 'Reverb',
    type: 'reverb',
    oscTypeIndex: 3, // Standard X32 index for Plate Reverb
    defaultParams: {
      decay: 20,
      preDelay: 10,
      damping: 30,
      mix: 40
    },
    oscMap: {
      decay: '/fxparam/1',
      preDelay: '/fxparam/2',
      damping: '/fxparam/3',
      mix: '/fxparam/7'
    }
  },
  'Ambient Reverb': {
    family: 'Reverb',
    type: 'reverb',
    oscTypeIndex: 5, // Mapping to Ambient/Room-style index
    defaultParams: {
      decay: 40,
      preDelay: 30,
      damping: 20,
      mix: 60
    },
    oscMap: {
      decay: '/fxparam/1',
      preDelay: '/fxparam/2',
      damping: '/fxparam/3',
      mix: '/fxparam/7'
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
  'Stereo Fair Comp': {
    family: 'Dynamics',
    type: 'compressor',
    oscTypeIndex: 32, // Stereo Fair Compressor
    defaultParams: {
      threshold: -20,
      time: 50,
      inputGain: 0,
      outputGain: 0,
      bias: 50,
      balance: 50
    },
    oscMap: {
      threshold: '/fxparam/3',
      time: '/fxparam/4',
      inputGain: '/fxparam/1',
      outputGain: '/fxparam/6',
      bias: '/fxparam/2',
      balance: '/fxparam/5'
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
  },
  'Graphic EQ': {
    family: 'Utility',
    type: 'utility',
    oscTypeIndex: 40,
    defaultParams: {
      "20": 0, "25": 0, "31.5": 0, "40": 0, "50": 0, "63": 0, "80": 0,
      "100": 0, "125": 0, "160": 0, "200": 0, "250": 0, "315": 0, "400": 0,
      "500": 0, "630": 0, "800": 0, "1k": 0, "1k25": 0, "1k6": 0, "2k": 0,
      "2k5": 0, "3k15": 0, "4k": 0, "5k": 0, "6k3": 0, "8k": 0, "10k": 0,
      "12k5": 0, "16k": 0, "20k": 0, "master": 0
    },
    oscMap: {
      "20": "/fxparam/1", "25": "/fxparam/2", "31.5": "/fxparam/3", "40": "/fxparam/4", 
      "50": "/fxparam/5", "63": "/fxparam/6", "80": "/fxparam/7", "100": "/fxparam/8",
      "125": "/fxparam/9", "160": "/fxparam/10", "200": "/fxparam/11", "250": "/fxparam/12",
      "315": "/fxparam/13", "400": "/fxparam/14", "500": "/fxparam/15", "630": "/fxparam/16",
      "800": "/fxparam/17", "1k": "/fxparam/18", "1k25": "/fxparam/19", "1k6": "/fxparam/20",
      "2k": "/fxparam/21", "2k5": "/fxparam/22", "3k15": "/fxparam/23", "4k": "/fxparam/24",
      "5k": "/fxparam/25", "6k3": "/fxparam/26", "8k": "/fxparam/27", "10k": "/fxparam/28",
      "12k5": "/fxparam/29", "16k": "/fxparam/30", "20k": "/fxparam/31", "master": "/fxparam/32"
    }
  }
};

export function getPresetMeta(preset) {
  return FX_REGISTRY[preset] || FX_REGISTRY.Empty;
}

/**
 * Returns a list of unique FX families for the first-tier dropdown.
 */
export function getFamilies() {
  const families = new Set();
  Object.values(FX_REGISTRY).forEach(fx => {
    if (fx.family) families.add(fx.family);
  });
  return Array.from(families).sort((a, b) => {
    if (a === 'Utility') return -1;
    if (b === 'Utility') return 1;
    return a.localeCompare(b);
  });
}

/**
 * Returns a list of preset names belonging to a specific family for the second-tier dropdown.
 */
export function getPresetsByFamily(family) {
  return Object.keys(FX_REGISTRY).filter(key => FX_REGISTRY[key].family === family);
}