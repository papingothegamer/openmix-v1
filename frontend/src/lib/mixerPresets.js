export const MixerPresets = {
  CUSTOM: {
    name: 'Generic OSC (Behringer Architecture)',
    inputs: 16,
    outputs: 6, // user-defined mix buses
    matrices: 6,
    dcas: 8,
    muteGroups: 0,
    fx: 4,
    hasAES50: true,
    hasUltranet: true,
    hasUSB: true,
    monitorSources: [
      { id: 'LR', name: 'Main LR' },
      { id: 'PFL', name: 'Inputs PFL' },
      { id: 'AFL', name: 'Inputs AFL' }
    ],
    hardLinks: { inputs: {} }
  },

  XR18: {
    id: 'XR18',
    name: 'Behringer XR18 / M18',
    inputs: 18, // 16 XLR + 2 line inputs
    outputs: 6, // 6 aux buses
    matrices: 0,
    dcas: 4,
    muteGroups: 0,
    fx: 4, // FX slots
    hasAES50: false,
    hasUltranet: true,
    hasUSB: true,
    monitorSources: [
      { id: 'LR', name: 'Main LR' },
      { id: 'PFL', name: 'Inputs PFL' },
      { id: 'AFL', name: 'Inputs AFL' },
      { id: 'LR+M', name: 'Main LR + Mono' }
    ],
    hardLinks: {
      inputs: {
        17: { linkedTo: 18, defaultName: 'AUX', mappedIcon: 'music' },
        18: { linkedTo: 17, defaultName: 'AUX R', mappedIcon: 'music', hidden: true }
      }
    }
  },

  X32RACK: {
    id: 'X32RACK',
    name: 'Behringer X32 / M32',
    inputs: 32, // Mic/line channels
    outputs: 16, // Mix buses
    matrices: 6, // Matrix buses
    dcas: 8,
    muteGroups: 0,
    fx: 8, // FX engines (stereo)
    hasAES50: true,
    hasUltranet: true,
    hasUSB: true,
    monitorSources: [
      { id: 'LR', name: 'Main LR' },
      { id: 'PFL', name: 'Inputs PFL' },
      { id: 'AFL', name: 'Inputs AFL' },
      { id: 'LR+C', name: 'Main LR + Center' }
    ],
    hardLinks: { inputs: {} } 
  },

  WING: {
    id: 'WING',
    name: 'Behringer WING',
    inputs: 48, // Configurable mono/stereo channels
    outputs: 16, // Stereo mix buses
    matrices: 6, // Matrix buses
    dcas: 8, // 8 DCA groups
    muteGroups: 8, // 8 Mute groups
    fx: 8, // FX engines (stereo)
    hasAES50: true,
    hasUltranet: true,
    hasUSB: true,
    monitorSources: [
      { id: 'LR', name: 'Main LR' },
      { id: 'PFL', name: 'Inputs PFL' },
      { id: 'AFL', name: 'Inputs AFL' }
    ],
    hardLinks: { inputs: {} }
  }
};

export const PredefinedMixersArray = Object.values(MixerPresets);
