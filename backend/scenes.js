const fs = require('fs/promises');
const path = require('path');

const SCENES_DIR = path.join(__dirname, 'scenes');

async function saveScene(sceneName, mixerState) {
    try {
        await fs.mkdir(SCENES_DIR, { recursive: true });
        const filePath = path.join(SCENES_DIR, `${sceneName}.json`);
        
        const sceneData = {
            name: sceneName,
            timestamp: Date.now(),
            state: mixerState
        };
        
        await fs.writeFile(filePath, JSON.stringify(sceneData, null, 2));
        return { success: true };
    } catch (err) {
        console.error('[Scenes] Failed to save scene:', err);
        return { error: err.message };
    }
}

async function loadSceneSafe(sceneName, mixer) {
    try {
        const filePath = path.join(SCENES_DIR, `${sceneName}.json`);
        const data = await fs.readFile(filePath, 'utf-8');
        const sceneData = JSON.parse(data);
        
        let sentCount = 0;
        let skippedCount = 0;

        // Musician Safe Logic applied to the flat cached OSC state
        if (sceneData.state && sceneData.state.flatOscCache) {
            for (const [address, args] of Object.entries(sceneData.state.flatOscCache)) {
                // Musician Safe Filter: Skip any OSC paths modifying individual mixes
                // Match patterns like /ch/01/mix/02/level (Skip auxiliary bus adjustments)
                if (address.match(/\/mix\/\d{2}\//)) {
                    skippedCount++;
                    continue;
                }
                
                mixer.sendOsc(address, args);
                sentCount++;
            }
        }

        return { success: true, sentCount, skippedCount };
    } catch (err) {
        console.error('[Scenes] Failed to load scene:', err);
        return { error: err.message };
    }
}

// Parse state uploaded directly from client device (HTML5 File API)
async function pushStateSafe(sceneData, mixer) {
    try {
        let sentCount = 0;
        let skippedCount = 0;

        if (sceneData.state && sceneData.state.flatOscCache) {
            for (const [address, args] of Object.entries(sceneData.state.flatOscCache)) {
                if (address.match(/\/mix\/\d{2}\//)) {
                    skippedCount++;
                    continue;
                }
                mixer.sendOsc(address, args);
                sentCount++;
            }
        }
        return { success: true, sentCount, skippedCount };
    } catch (err) {
        console.error('[Scenes] Failed to parse pushed state:', err);
        return { error: err.message };
    }
}

module.exports = { saveScene, loadSceneSafe, pushStateSafe };
