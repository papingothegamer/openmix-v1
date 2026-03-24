export const MixerPresets = {
    CUSTOM: {
        id: 'CUSTOM',
        name: 'Custom User Configuration',
        inputs: 16,
        outputs: 6,
        dcas: 8,
        fx: 4,
        hardLinks: { inputs: {} }
    },
    XR18: {
        id: 'XR18',
        name: 'Behringer XR18 / M18',
        inputs: 18, // 16 XLR + 17/18 line in
        outputs: 6,
        dcas: 4,
        fx: 4,
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
        inputs: 32, // Primary mic channels
        outputs: 16, // Mix buses
        dcas: 8,
        fx: 8, // Stereo FX Sends
        hardLinks: { inputs: {} } 
    },
    WING: {
        id: 'WING',
        name: 'Behringer WING',
        inputs: 48, // 48 stereo/mono mid-side processing channels
        outputs: 16, // 16 Stereo mix buses
        dcas: 16, // DCA Groups
        fx: 16, // True stereo engines
        hardLinks: { inputs: {} }
    },
    MACKIE_DL32S: {
        id: 'MACKIE_DL32S',
        name: 'Mackie DL32S',
        inputs: 32,
        outputs: 10, // Assignable XLR outputs
        dcas: 6, // 6 VCA groups
        fx: 4,
        hardLinks: { inputs: {} }
    },
    SOUNDCRAFT_UI24R: {
        id: 'SOUNDCRAFT_UI24R',
        name: 'Soundcraft Ui24R',
        inputs: 24, // 20 preamps + stereo USB
        outputs: 8, // XLR Aux Outs
        dcas: 6, // VCA/DCA groups
        fx: 4,
        hardLinks: {
            inputs: {
                21: { linkedTo: 22, defaultName: 'Line In L' },
                22: { linkedTo: 21, defaultName: 'Line In R', hidden: true }
            }
        }
    },
    AH_CQ20B: {
        id: 'AH_CQ20B',
        name: 'Allen & Heath CQ-20B',
        inputs: 20,
        outputs: 6, // Independent Aux
        dcas: 4, // Representing mute groups contextually
        fx: 4,
        hardLinks: {
            inputs: {
                17: { linkedTo: 18, defaultName: 'Stereo 1' },
                18: { linkedTo: 17, hidden: true },
                19: { linkedTo: 20, defaultName: 'Stereo 2' },
                20: { linkedTo: 19, hidden: true }
            }
        }
    }
};

export const PredefinedMixersArray = Object.values(MixerPresets);
