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
        
        // Send initial keep-alive
        this.sendOsc('/xremote', []);
    }

    sendOsc(address, args = []) {
        try {
            this.udpPort.send({ address, args }, this.mixerIp, this.mixerPort);
        } catch (err) {
            console.error('[MixerSync] Failed to send OSC command:', err);
        }
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
