const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const MixerConnection = require('./mixerSync');
const { discoverMixer } = require('./discovery');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with permissive CORS for now
const io = new Server(server, {
    cors: { origin: '*' }
});

// Start UDP Loop to the Digital Mixer (default IP — will be overridden by configureMixer)
const MIXER_IP = process.env.MIXER_IP || '192.168.1.100';
const MIXER_PORT = parseInt(process.env.MIXER_PORT) || 10024;
const mixer = new MixerConnection(MIXER_IP, MIXER_PORT);

mixer.connect();

const { handleConnection, emitOscBroadcast } = require('./routes');

mixer.on('stateUpdate', (data) => {
    emitOscBroadcast(io, { type: 'state', ...data });
});

mixer.on('metersUpdate', (data) => {
    emitOscBroadcast(io, { type: 'meters', ...data });
});

io.on('connection', (socket) => {
    handleConnection(socket, mixer, io);

    socket.on('discoverMixer', async (_, callback) => {
        console.log('[Discovery] Starting mixer discovery...');
        try {
            const result = await discoverMixer(4000);
            if (result) {
                console.log(`[Discovery] Found mixer: ${result.name} at ${result.ip}:${result.port}`);
            }
            if (typeof callback === 'function') callback(result);
            else socket.emit('discoveryResult', result);
        } catch (err) {
            console.error('[Discovery] Error:', err);
            if (typeof callback === 'function') callback(null);
            else socket.emit('discoveryResult', null);
        }
    });

    socket.on('configureMixer', ({ ip, port }) => {
        if (!ip) return;
        const newPort = parseInt(port) || 10024;
        console.log(`[MixerConfig] Reconfiguring to ${ip}:${newPort}`);
        mixer.reconfigure(ip, newPort);
        socket.emit('mixerConfigured', { ip, port: newPort });
    });
});

// ── Port binding ─────────────────────────────────────────────────────────────
const PORT = 3000;

server.listen(PORT, () => {
    console.log(`OpenMix Hub server listening on http://localhost:${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n[Error] Port ${PORT} is already in use.`);
        console.error(`  Kill it with:  npx kill-port ${PORT}`);
        console.error(`  Or manually:   netstat -ano | findstr :${PORT}  →  taskkill /PID <pid> /F\n`);
        process.exit(1);
    } else {
        throw err;
    }
});