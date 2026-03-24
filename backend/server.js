const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const MixerConnection = require('./mixerSync');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with permissive CORS for now
const io = new Server(server, {
    cors: { origin: '*' }
});

// Start UDP Loop to the Digital Mixer
const MIXER_IP = process.env.MIXER_IP || '192.168.1.100'; // Defaulting to common XR18 subnet IP
const MIXER_PORT = process.env.MIXER_PORT || 10024;     // XR18 default port
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
});

// Middleware for token/sandbox routes will go here later

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`OpenMix Hub server listening on port ${PORT}`);
});
