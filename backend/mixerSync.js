const osc = require('osc');
const EventEmitter = require('events');

class MixerConnection extends EventEmitter {
    constructor(mixerIp, mixerPort) {
        super();
        this.mixerIp = mixerIp;
        this.mixerPort = mixerPort || 10024; // Default XR18 port

        // The core "Virtual Mixer" state in RAM
        this.state = {
            buses: {},
            channels: {},
            meters: [],
            flatOscCache: {} // JSON Schema representation of the raw target values
        };

        this.udpPort = new osc.UDPPort({
            localAddress: '0.0.0.0',
            localPort: 0, // Auto-assign a random available port
            metadata: true // Required for osc package object mapping
        });

        this.udpPort.on('message', (oscMsg, timeTag, info) => {
            this.handleIncomingOsc(oscMsg, info);
        });

        this.udpPort.on('error', (err) => {
            console.error('[MixerSync] OSC UDP Error:', err);
        });

        // Sync State Tracking
        this.isSyncing = false;
        this.syncProgress = 0;
        this.hasSyncedOnce = false;
    }

    // Phase 4 Hardware Sync Templates
    getSyncTemplate(type = 'XR18') {
        const templates = {
            'XR18': [
                // Global Identity & Status
                { address: '/xinfo' },
                { address: '/-snap/name' },
                // Global Config & Routing
                { address: '/routing/i', count: 16, start: 1, suffix: true, pad: 2 },
                { address: '/routing/usb', count: 18, start: 1, suffix: true, pad: 2 },
                { address: '/routing/p16', count: 16, start: 1, suffix: true, pad: 2 },
                { address: '/routing/aux', count: 6, start: 1, suffix: true, pad: 2 },
                { address: '/routing/main', count: 2, start: 1, suffix: true, pad: 2 },
                { address: '/config/chlink', count: 1 },
                { address: '/config/buslink', count: 1 },
                // Strips (Config/Preamps)
                { address: '/ch/01-16/config/name', pattern: '/ch/{N}/config/name', count: 16 },
                { address: '/ch/01-16/config/color', pattern: '/ch/{N}/config/color', count: 16 },
                { address: '/ch/01-16/config/icon', pattern: '/ch/{N}/config/icon', count: 16 },
                { address: '/ch/01-16/config/insrc', pattern: '/ch/{N}/config/insrc', count: 16 },
                { address: '/ch/01-16/config/rtnsrc', pattern: '/ch/{N}/config/rtnsrc', count: 16 },
                { address: '/bus/1-6/config/name', pattern: '/bus/{N}/config/name', count: 6, pad: 0 },
                { address: '/bus/1-6/config/color', pattern: '/bus/{N}/config/color', count: 6, pad: 0 },
                { address: '/bus/1-6/config/icon', pattern: '/bus/{N}/config/icon', count: 6, pad: 0 },
                { address: '/headamp/01-16/gain', pattern: '/headamp/{N}/gain', count: 16, start: 1, pad: 2 },
                { address: '/headamp/01-16/phantom', pattern: '/headamp/{N}/phantom', count: 16, start: 1, pad: 2 },
                // Mix state (Fader, Mute, Pan, LR Assign)
                { address: '/ch/01-16/mix/fader', pattern: '/ch/{N}/mix/fader', count: 16 },
                { address: '/ch/01-16/mix/on', pattern: '/ch/{N}/mix/on', count: 16 },
                { address: '/ch/01-16/mix/pan', pattern: '/ch/{N}/mix/pan', count: 16 },
                { address: '/ch/01-16/mix/lr', pattern: '/ch/{N}/mix/lr', count: 16 },
                { address: '/ch/01-16/preamp/phase', pattern: '/ch/{N}/preamp/phase', count: 16 },
                
                // Aux Sends (1-6) for Channels 1-16
                { address: '/ch/01-16/mix/01', pattern: '/ch/{N}/mix/01/level', count: 16 },
                { address: '/ch/01-16/mix/02', pattern: '/ch/{N}/mix/02/level', count: 16 },
                { address: '/ch/01-16/mix/03', pattern: '/ch/{N}/mix/03/level', count: 16 },
                { address: '/ch/01-16/mix/04', pattern: '/ch/{N}/mix/04/level', count: 16 },
                { address: '/ch/01-16/mix/05', pattern: '/ch/{N}/mix/05/level', count: 16 },
                { address: '/ch/01-16/mix/06', pattern: '/ch/{N}/mix/06/level', count: 16 },

                // Bus Master Mix State
                { address: '/bus/1-6/mix/fader', pattern: '/bus/{N}/mix/fader', count: 6, pad: 0 },
                { address: '/bus/1-6/mix/on', pattern: '/bus/{N}/mix/on', count: 6, pad: 0 },
                { address: '/bus/1-6/mix/pan', pattern: '/bus/{N}/mix/pan', count: 6, pad: 0 },
                
                // Main LR Mix State
                { address: '/lr/mix/fader' },
                { address: '/lr/mix/on' },
                
                // EQ On/Off
                { address: '/ch/01-16/eq/on', pattern: '/ch/{N}/eq/on', count: 16 },

                // FX Returns Mix State
                { address: '/rtn/1-4/mix/fader', pattern: '/rtn/{N}/mix/fader', count: 4, pad: 0 },
                { address: '/rtn/1-4/mix/on', pattern: '/rtn/{N}/mix/on', count: 4, pad: 0 },
                { address: '/rtn/1-4/mix/pan', pattern: '/rtn/{N}/mix/pan', count: 4, pad: 0 },
                { address: '/rtn/1-4/mix/lr', pattern: '/rtn/{N}/mix/lr', count: 4, pad: 0 },

                // FX (Non-padded)
                { address: '/fx/1-4/type', pattern: '/fx/{N}/type', count: 4, pad: 0 }
            ],
            'X32RACK': [
                { address: '/xinfo' },
                { address: '/config/routing/user/in', count: 32, start: 1, suffix: true, pad: 2 },
                { address: '/config/routing/user/out', count: 16, start: 1, suffix: true, pad: 2 },
                // Config
                { address: '/ch/01-32/config/name', pattern: '/ch/{N}/config/name', count: 32 },
                { address: '/bus/01-16/config/name', pattern: '/bus/{N}/config/name', count: 16 },
                { address: '/mtx/01-06/config/name', pattern: '/mtx/{N}/config/name', count: 6 },
                { address: '/dca/1-8/config/name', pattern: '/dca/{N}/config/name', count: 8, pad: 0 },
                // Audio Mix State
                { address: '/ch/01-32/mix/fader', pattern: '/ch/{N}/mix/fader', count: 32 },
                { address: '/ch/01-32/mix/on', pattern: '/ch/{N}/mix/on', count: 32 },
                { address: '/ch/01-32/mix/pan', pattern: '/ch/{N}/mix/pan', count: 32 },
                { address: '/ch/01-32/mix/lr', pattern: '/ch/{N}/mix/lr', count: 32 },
                
                // Aux Sends (1-16) for X32 Channels 1-32
                { address: '/ch/01-32/mix/01', pattern: '/ch/{N}/mix/01/level', count: 32 },
                { address: '/ch/01-32/mix/02', pattern: '/ch/{N}/mix/02/level', count: 32 },
                { address: '/ch/01-32/mix/03', pattern: '/ch/{N}/mix/03/level', count: 32 },
                { address: '/ch/01-32/mix/04', pattern: '/ch/{N}/mix/04/level', count: 32 },
                { address: '/ch/01-32/mix/05', pattern: '/ch/{N}/mix/05/level', count: 32 },
                { address: '/ch/01-32/mix/06', pattern: '/ch/{N}/mix/06/level', count: 32 },

                // Bus Mix State
                { address: '/bus/01-16/mix/fader', pattern: '/bus/{N}/mix/fader', count: 16 },
                { address: '/bus/01-16/mix/on', pattern: '/bus/{N}/mix/on', count: 16 },
                { address: '/bus/01-16/mix/pan', pattern: '/bus/{N}/mix/pan', count: 16 },
                
                // Matrix Mix State
                { address: '/mtx/01-06/mix/fader', pattern: '/mtx/{N}/mix/fader', count: 6 },
                { address: '/mtx/01-06/mix/on', pattern: '/mtx/{N}/mix/on', count: 6 },
                
                // EQ On/Off
                { address: '/ch/01-32/eq/on', pattern: '/ch/{N}/eq/on', count: 32 },
                
                // FX
                { address: '/fx/1-8/type', pattern: '/fx/{N}/type', count: 8, pad: 0 }
            ],
            'WING': [
                { address: '/xinfo' },
                // WING uses different paths usually, but keeping compatible pattern for now
                { address: '/ch/01-48/config/name', pattern: '/ch/{N}/config/name', count: 48 },
                { address: '/bus/01-16/config/name', pattern: '/bus/{N}/config/name', count: 16 },
                { address: '/mtx/01-06/config/name', pattern: '/mtx/{N}/config/name', count: 6 },
                { address: '/ch/01-48/mix/fader', pattern: '/ch/{N}/mix/fader', count: 48 },
                { address: '/fx/1-8/type', pattern: '/fx/{N}/type', count: 8, pad: 0 }
            ]
        };
        const tmpl = templates[type] || templates['XR18'];

        // Dynamically append EQ, Gate, Dyn, and FX parameters to avoid massive hardcoding
        if (type === 'XR18' || type === 'X32RACK') {
            const chCount = type === 'XR18' ? 16 : 32;
            
            // Gate & Dynamics
            ['on', 'thr', 'range', 'att', 'hold', 'rel'].forEach(param => {
                tmpl.push({ address: `/ch/01-${chCount}/gate/${param}`, pattern: `/ch/{N}/gate/${param}`, count: chCount });
            });
            ['on', 'mode', 'thr', 'ratio', 'knee', 'att', 'hold', 'rel'].forEach(param => {
                tmpl.push({ address: `/ch/01-${chCount}/dyn/${param}`, pattern: `/ch/{N}/dyn/${param}`, count: chCount });
            });

            // Channel EQ (4-band)
            for (let band = 1; band <= 4; band++) {
                ['type', 'f', 'g', 'q'].forEach(param => {
                    tmpl.push({ address: `/ch/01-${chCount}/eq/${band}/${param}`, pattern: `/ch/{N}/eq/${band}/${param}`, count: chCount });
                });
            }
            
            // Bus EQ (6-band)
            for (let band = 1; band <= 6; band++) {
                ['type', 'f', 'g', 'q'].forEach(param => {
                    tmpl.push({ address: `/bus/01-16/eq/${band}/${param}`, pattern: `/bus/{N}/eq/${band}/${param}`, count: 16 });
                });
            }

            // Main LR EQ (6-band)
            for (let band = 1; band <= 6; band++) {
                ['type', 'f', 'g', 'q'].forEach(param => {
                    tmpl.push({ address: `/lr/eq/${band}/${param}` });
                });
            }

            // FX Parameters (01 to 16 for safety on complex reverbs)
            const fxCount = type === 'XR18' ? 4 : 8;
            for (let par = 1; par <= 16; par++) {
                const parStr = String(par).padStart(2, '0');
                tmpl.push({ address: `/fx/1-${fxCount}/par/${parStr}`, pattern: `/fx/{N}/par/${parStr}`, count: fxCount, pad: 0 });
            }
        }

        return tmpl;
    }

    async requestFullSync(mixerType = 'XR18', isForce = false) {
        if (this.isSyncing) return;
        
        // Prevent sync overlay and network flood if no actual mixer is connected
        if (!this.mixerIp) {
            console.log(`[MixerSync] Skipping deep sync: No Mixer IP configured.`);
            this.emit('syncComplete', { mixerType });
            return;
        }

        // Avoid re-syncing constantly on role navigation unless the user explicitly forces it
        if (this.hasSyncedOnce && !isForce) {
            console.log(`[MixerSync] Already synced with ${this.mixerIp}. Skipping full sync.`);
            this.emit('syncComplete', { mixerType });
            return;
        }

        // Ensure handshake is active before syncing
        if (!this.keepAliveInterval) {
            this.startKeepAlive();
        }

        console.log(`[MixerSync] Starting deep sync for ${mixerType}...`);
        this.isSyncing = true;
        this.syncProgress = 0;
        this.emit('syncStatus', { active: true, progress: 0 });
        this.drawTerminalProgressBar(0);

        const template = this.getSyncTemplate(mixerType);
        let totalRequests = 0;
        const requests = [];

        // Explode template into individual OSC requests
        template.forEach(item => {
            if (item.pattern) {
                for (let i = 0; i < item.count; i++) {
                    const pad = item.pad !== undefined ? item.pad : 2;
                    const n = pad > 0 
                        ? (i + (item.start || 1)).toString().padStart(pad, '0')
                        : (i + (item.start || 1)).toString();
                    requests.push(item.pattern.replace('{N}', n));
                }
            } else if (item.suffix) {
                for (let i = 0; i < item.count; i++) {
                    const pad = item.pad !== undefined ? item.pad : 2;
                    const n = pad > 0 
                        ? (i + (item.start || 1)).toString().padStart(pad, '0')
                        : (i + (item.start || 1)).toString();
                    requests.push(`${item.address}/${n}`);
                }
            } else {
                requests.push(item.address);
            }
        });

        totalRequests = requests.length;
        console.log(`[MixerSync] Dispatching ${totalRequests} sync requests...`);

        for (let i = 0; i < requests.length; i++) {
            this.sendOsc(requests[i], []); // Empty args = "Request current value" in Behringer OSC
            this.syncProgress = Math.round(((i + 1) / totalRequests) * 100);
            if (i % 20 === 0) {
                this.emit('syncStatus', { active: true, progress: this.syncProgress });
                this.drawTerminalProgressBar(this.syncProgress);
            }
            // Add a tiny delay to not swamp the network stack (handled by sendOsc throttle, but explicit help)
            if (i % 50 === 0) await new Promise(r => setTimeout(r, 50));
        }

        this.isSyncing = false;
        this.emit('syncStatus', { active: false, progress: 100 });
        this.drawTerminalProgressBar(100);
        console.log(`[MixerSync] Dispatch complete. Awaiting responses to verify connection...`);
    }

    drawTerminalProgressBar(progress) {
        const width = 40;
        const fillSpaces = Math.round((progress / 100) * width);
        const emptySpaces = width - fillSpaces;
        const bar = '█'.repeat(fillSpaces) + '░'.repeat(emptySpaces);
        
        process.stdout.write(`\r[MixerSync] Syncing: [${bar}] ${progress}%`);
        
        if (progress >= 100) {
            process.stdout.write('\n');
        }
    }

    connect() {
        this.udpPort.open();
        this.udpPort.on('ready', () => {
            console.log(`[MixerSync] OSC UDP Port ready. Passive mode enabled (waiting for client sync request).`);
        });
    }

    startKeepAlive(autoSyncType = null) {
        // Behringer XR18 requires /xremote every 10 seconds to keep sending asynchronous updates (like meters/faders)
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        
        console.log(`[MixerSync] Starting keep-alive handshake (IP: ${this.mixerIp})`);
        this.keepAliveInterval = setInterval(() => {
            this.sendOsc('/xremote', []);
        }, 9000);
        
        // Handshake
        this.sendOsc('/xremote', []);
        
        // Auto-trigger sync if requested
        if (autoSyncType) {
            this.requestFullSync(autoSyncType);
        }
    }

    sendOsc(address, args = []) {
        if (!this.oscQueue) {
            this.oscQueue = [];
            this.isFlushing = false;
            this.throttleDelayMs = 5; // 200 packets per second ceiling ensuring stability
        }
        
        this.oscQueue.push({ address, args });
        
        if (!this.isFlushing) {
            this.flushQueue();
        }
    }

    flushQueue() {
        this.isFlushing = true;
        const flushNext = () => {
            if (this.oscQueue.length === 0) {
                this.isFlushing = false;
                return;
            }
            const packet = this.oscQueue.shift();
            try {
                this.udpPort.send({ address: packet.address, args: packet.args }, this.mixerIp, this.mixerPort);
            } catch (err) {
                console.error('[MixerSync] Failed to send OSC command:', err);
            }
            // Rapid single executions bypass UI lag, whereas massive payloads trickle nicely
            setTimeout(flushNext, this.throttleDelayMs);
        };
        flushNext();
    }

    reconfigure(newIp, newPort = 10024, mixerType = 'XR18') {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        this.mixerIp = newIp;
        this.mixerPort = newPort;
        this.hasSyncedOnce = false; // Reset sync status for new target
        
        // Re-send /xremote to new target to handshake AND trigger a fresh sync
        this.startKeepAlive(mixerType);
        console.log(`[MixerSync] Reconfigured → ${newIp}:${newPort} (${mixerType})`);
    }

    handleIncomingOsc(msg, info) {
        if (!this.hasSyncedOnce) {
            console.log(`[MixerSync] Received first packet from ${info.address}:${info.port}. Connection verified!`);
            this.hasSyncedOnce = true;
            this.emit('syncComplete', { mixerType: 'verified' }); // Frontend ignores type currently
        }

        const address = msg.address;
        const args = msg.args;

        // Intercept Binary Meter Blobs
        if (address.startsWith('/meters/')) {
            if (args.length > 0 && args[0] instanceof Uint8Array) {
                try {
                    const buffer = args[0];
                    const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
                    const floatsCount = Math.floor(buffer.byteLength / 4);
                    const floats = [];
                    for(let i = 0; i < floatsCount; i++) {
                        floats.push(dataView.getFloat32(i * 4, true)); // LE
                    }

                    this.emit('metersUpdate', {
                        address,
                        values: floats
                    });
                } catch(e) {
                    console.error('[Meters] Decode error', e);
                }
            }
            return;
        }

        // Cache the raw value
        this.state.flatOscCache[address] = args;

        // Broadcast raw OSC for immediate reactivity
        this.emit('stateUpdate', { address, args });
    }

    getVirtualState() {
        return this.state;
    }
}

module.exports = MixerConnection;
