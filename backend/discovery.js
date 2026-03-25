/**
 * OpenMix Mixer Auto-Discovery
 * Sends a UDP broadcast /xinfo to the subnet and listens for an X-AIR/XR18/X32 response.
 */

const dgram = require('dgram');

const MIXER_OSC_PORT = 10024;
// Hardcoded /xinfo OSC message (no-args, null-terminated)
const XINFO_PACKET = buildXinfoPacket();

function buildXinfoPacket() {
    // OSC message: address = /xinfo, type tag = ,
    const address = '/xinfo\0\0'; // 8 bytes (padded to 4-byte boundary)
    const typetag = ',\0\0\0';    // 4 bytes
    const buf = Buffer.alloc(address.length + typetag.length);
    buf.write(address, 0, 'ascii');
    buf.write(typetag, address.length, 'ascii');
    return buf;
}

/**
 * Auto-discovers a Behringer/Midas mixer on the LAN via UDP broadcast.
 * @param {number} timeoutMs  How long to wait for a response (default 4000ms)
 * @returns {Promise<{ip:string, port:number, name:string}|null>}
 */
function discoverMixer(timeoutMs = 4000) {
    return new Promise((resolve) => {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        let resolved = false;

        const done = (result) => {
            if (resolved) return;
            resolved = true;
            try {
                socket.close();
            } catch (_) {}
            resolve(result);
        };

        socket.on('message', (msg, remote) => {
            // Any response to our broadcast means a compatible mixer was found
            // Try to extract the mixer name from /xinfo reply (best-effort)
            let name = 'Unknown Mixer';
            try {
                const str = msg.toString('ascii');
                const match = str.match(/X(?:R\d+|\d{2}|AIR|18|32|M32|WING)[^\0]*/i);
                if (match) name = match[0].replace(/\0/g, '').trim();
            } catch (_) {}
            done({ ip: remote.address, port: MIXER_OSC_PORT, name });
        });

        socket.on('error', (err) => {
            console.error('[Discovery] UDP error:', err.message);
            done(null);
        });

        socket.bind(() => {
            socket.setBroadcast(true);
            socket.send(XINFO_PACKET, 0, XINFO_PACKET.length, MIXER_OSC_PORT, '255.255.255.255', (err) => {
                if (err) {
                    console.error('[Discovery] Broadcast send failed:', err.message);
                    done(null);
                } else {
                    console.log('[Discovery] /xinfo broadcast sent — waiting for reply...');
                }
            });
        });

        setTimeout(() => {
            if (!resolved) {
                console.log('[Discovery] No mixer found within timeout.');
                done(null);
            }
        }, timeoutMs);
    });
}

module.exports = { discoverMixer };
