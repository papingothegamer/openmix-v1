const crypto = require('crypto');
const { saveScene, loadSceneSafe } = require('./scenes');

// In-memory store of active session tokens
// tokens['token_string'] = { role: 'musician', targetBus: 1, createdAt: Date.now() }
// 'foh' role is the master admin module.
const tokens = {
    'master_admin_token': { role: 'foh' }
};

function generateToken(busNumber) {
    const token = crypto.randomBytes(8).toString('hex');
    tokens[token] = {
        role: 'musician',
        targetBus: parseInt(busNumber),
        createdAt: Date.now()
    };
    return token;
}

function handleConnection(socket, mixer, io) {
    const token = socket.handshake.auth.token || 'master_admin_token'; // Defaulting for simple MVP testing
    
    const session = tokens[token];
    
    if (!session) {
        socket.emit('authError', 'Invalid or missing token. Access Denied.');
        socket.disconnect();
        return;
    }

    socket.session = session;
    console.log(`[Socket] Authorized ${session.role} on socket ${socket.id} (Bus: ${session.targetBus || 'ALL'})`);

    if (session.role === 'musician') {
        socket.join(`bus_${session.targetBus}`);
    } else {
        socket.join('foh');
    }

    // Push initial sink state
    socket.emit('syncState', mixer.getVirtualState());

    // Handling inbound OSC requests
    // Helper: coerce raw JS values to typed OSC argument objects
    function toOscArgs(raw) {
        if (!raw && raw !== 0) return [];
        const vals = Array.isArray(raw) ? raw : [raw];
        return vals.map(v => {
            if (typeof v === 'object' && v !== null && 'type' in v) return v; // already typed
            if (typeof v === 'number') {
                if (Number.isInteger(v)) return { type: 'i', value: v };
                return { type: 'f', value: v };
            }
            if (typeof v === 'string') return { type: 's', value: v };
            if (typeof v === 'boolean') return { type: 'i', value: v ? 1 : 0 };
            return { type: 'f', value: Number(v) };
        });
    }

    socket.on('setOsc', (data) => {
        if (!data.address) return;
        const oscArgs = toOscArgs(data.args);

        if (session.role === 'foh') {
            // FOH has Master Control - Forward anything
            mixer.sendOsc(data.address, oscArgs);
            return;
        }

        if (session.role === 'musician') {
            // Enforce WebSocket OSC routing rewrite
            const targetBusStr = String(session.targetBus).padStart(2, '0');
            
            // Prevent touching main LR by strict matching
            // Example: Incoming /ch/01/mix/fader translates to /ch/01/mix/0N/level
            if (data.address.endsWith('mix/fader')) {
                const rewriteAddr = data.address.replace('/mix/fader', `/mix/${targetBusStr}/level`);
                mixer.sendOsc(rewriteAddr, oscArgs);
                console.log(`[Security] Rewrote Fader to Bus level: ${rewriteAddr}`);
            } else if (data.address.includes(`/mix/${targetBusStr}/`)) {
                // Exact auxiliary bus modification
                mixer.sendOsc(data.address, oscArgs);
            } else {
                console.log(`[Security] Blocked unauthorized OSC from token ${token}: ${data.address}`);
            }
        }
    });

    // Handle Token Request from FOH UI
    socket.on('generateToken', (busNumber, callback) => {
        if (session.role !== 'foh') {
            if (callback) callback({ error: 'Unauthorized' });
            return;
        }
        const newToken = generateToken(busNumber);
        if (callback) callback({ token: newToken, bus: busNumber });
    });

    // Handle Local Scene Save/Load
    socket.on('saveScene', async (sceneName, callback) => {
        if (session.role !== 'foh') {
            if (callback) callback({ error: 'Unauthorized' });
            return;
        }
        const res = await saveScene(sceneName, mixer.getVirtualState());
        if (callback) callback(res);
    });

    socket.on('loadScene', async (sceneName, callback) => {
        if (session.role !== 'foh') {
            if (callback) callback({ error: 'Unauthorized' });
            return;
        }
        const res = await loadSceneSafe(sceneName, mixer);
        if (callback) callback(res);
    });

    socket.on('pushState', async (sceneData, callback) => {
        if (session.role !== 'foh') {
            if (callback) callback({ error: 'Unauthorized' });
            return;
        }
        const res = await require('./scenes').pushStateSafe(sceneData, mixer);
        if (callback) callback(res);
    });


    socket.on('disconnect', () => {
        console.log(`[Socket] Disconnected ${session.role} (${socket.id})`);
    });
}

const musicianMeterThrottles = {}; // targetBus -> lastSentTime

// Broadcasts OSC data per role limitations
function emitOscBroadcast(io, mixerData) {
    if (mixerData.type === 'meters') {
        // 30+ FPS directly to FOH Room
        io.to('foh').emit('oscData', mixerData);
        
        const now = Date.now();
        // Downsample for musicians
        io.sockets.adapter.rooms.forEach((_, roomName) => {
            if (roomName.startsWith('bus_')) {
                const targetBus = roomName.split('_')[1];
                if (!musicianMeterThrottles[targetBus] || now - musicianMeterThrottles[targetBus] > 200) { // 5 FPS throttle
                    musicianMeterThrottles[targetBus] = now;
                    
                    // Simple threshold logic for traffic light
                    const busLevel = mixerData.values[parseInt(targetBus)] || -100;
                    let status = 'green';
                    if (busLevel > -3) status = 'red';
                    else if (busLevel > -18) status = 'yellow';
                    else if (busLevel < -60) status = 'off';

                    io.to(roomName).emit('meterTrafficLight', { bus: targetBus, status });
                }
            }
        });
    } else {
        // Standard State Updates
        io.to('foh').emit('oscData', mixerData);
    }
}

module.exports = {
    handleConnection,
    emitOscBroadcast,
    generateToken
};
