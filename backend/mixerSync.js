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
    }

    // Phase 4 Hardware Sync Templates
    getSyncTemplate(type = 'XR18') {
        const templates = {
            'XR18': [
                // Global Config
                { address: '/config/routing/i', count: 16, start: 1, suffix: true },
                { address: '/config/routing/card', count: 18, start: 1, suffix: true },
                { address: '/config/routing/p16', count: 16, start: 1, suffix: true },
                { address: '/config/routing/aux', count: 6, start: 1, suffix: true },
                { address: '/config/routing/main', count: 2, start: 1, suffix: true },
                { address: '/config/chlink', count: 1 },
                // Strips (Config/Preamps)
                { address: '/ch/01-16/config/name', pattern: '/ch/{N}/config/name', count: 16 },
                { address: '/ch/01-16/config/color', pattern: '/ch/{N}/config/color', count: 16 },
                { address: '/ch/01-16/config/icon', pattern: '/ch/{N}/config/icon', count: 16 },
                { address: '/bus/01-06/config/name', pattern: '/bus/{N}/config/name', count: 6 },
                { address: '/bus/01-06/config/color', pattern: '/bus/{N}/config/color', count: 6 },
                { address: '/bus/01-06/config/icon', pattern: '/bus/{N}/config/icon', count: 6 },
                { address: '/headamp/00-15/gain', pattern: '/headamp/{N}', count: 16, start: 0, pad: 2 },
                { address: '/headamp/00-15/phantom', pattern: '/headamp/{N}/phantom', count: 16, start: 0, pad: 2 },
                // EQ/Dyn/Gate
                { address: '/ch/01-16/eq', pattern: '/ch/{N}/eq', count: 16 },
                { address: '/ch/01-16/gate', pattern: '/ch/{N}/gate', count: 16 },
                { address: '/ch/01-16/dyn', pattern: '/ch/{N}/dyn', count: 16 },
                // FX
                { address: '/fx/1-4/type', pattern: '/fx/{N}/type', count: 4 }
            ],
            'X32RACK': [
                { address: '/config/routing/user/in', count: 32, start: 1, suffix: true, pad: 2 },
                { address: '/config/routing/user/out', count: 16, start: 1, suffix: true, pad: 2 },
                { address: '/ch/01-32/config/name', pattern: '/ch/{N}/config/name', count: 32 },
                { address: '/ch/01-32/eq', pattern: '/ch/{N}/eq', count: 32 }
            ]
        };
        return templates[type] || templates['XR18'];
    }

    async requestFullSync(mixerType = 'XR18') {
        if (this.isSyncing) return;
        console.log(`[MixerSync] Starting deep sync for ${mixerType}...`);
        this.isSyncing = true;
        this.syncProgress = 0;
        this.emit('syncStatus', { active: true, progress: 0 });

        const template = this.getSyncTemplate(mixerType);
        let totalRequests = 0;
        const requests = [];

        // Explode template into individual OSC requests
        template.forEach(item => {
            if (item.pattern) {
                for (let i = 0; i < item.count; i++) {
                    const n = (i + (item.start || 1)).toString().padStart(item.pad || 2, '0');
                    requests.push(item.pattern.replace('{N}', n));
                }
            } else if (item.suffix) {
                for (let i = 0; i < item.count; i++) {
                    const n = (i + (item.start || 1)).toString().padStart(item.pad || 2, '0');
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
            }
            // Add a tiny delay to not swamp the network stack (handled by sendOsc throttle, but explicit help)
            if (i % 50 === 0) await new Promise(r => setTimeout(r, 50));
        }

        this.isSyncing = false;
        this.emit('syncStatus', { active: false, progress: 100 });
        console.log(`[MixerSync] Deep sync complete.`);
    }

    connect() {
        this.udpPort.open();
        this.udpPort.on('ready', () => {
            console.log(`[MixerSync] OSC UDP Port ready. Establishing link to ${this.mixerIp}:${this.mixerPort}...`);
            this.startKeepAlive();
        });
    }

    startKeepAlive() {
        // Behringer XR18 requires /xremote every 10 seconds to keep sending asynchronous updates (like meters/faders)
        this.keepAliveInterval = setInterval(() => {
            this.sendOsc('/xremote', []);
        }, 9000);
        
        // Handshake
        this.sendOsc('/xremote', []);
        
        // Note: requestFullSync used to be here, now triggered by server.js via socket.emit('requestSync')
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

    reconfigure(newIp, newPort = 10024) {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        this.mixerIp = newIp;
        this.mixerPort = newPort;
        // Re-send /xremote to new target to handshake
        this.startKeepAlive();
        console.log(`[MixerSync] Reconfigured → ${newIp}:${newPort}`);
    }

    handleIncomingOsc(msg, info) {
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
