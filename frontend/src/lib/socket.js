import { io } from 'socket.io-client';
import { writable } from 'svelte/store';

// Assuming backend runs on the same IP on port 3000
// In production, this should map to the window.location.hostname
const SOCKET_URL = `http://${window.location.hostname}:3000`;

export const socket = io(SOCKET_URL, {
    autoConnect: false // Connect manually when component mounts or token is available
});

// Svelte stores for reactivity
export const isConnected = writable(false);
export const mixerState = writable({ buses: {}, channels: {}, meters: [] });
export const rawMeters = writable([]);
export const meterLight = writable('off'); // 'off', 'green', 'yellow', 'red'

// Listeners
socket.on('connect', () => {
    isConnected.set(true);
});

socket.on('disconnect', () => {
    isConnected.set(false);
});

socket.on('syncState', (state) => {
    mixerState.set(state);
});

socket.on('meterTrafficLight', (data) => {
    meterLight.set(data.status);
});

socket.on('oscData', (data) => {
    if (data.type === 'meters') {
        rawMeters.set(data.values);
    } else {
        // For MVP, we log or optionally update specific state nodes
        console.log('Received OSC Data:', data);
    }
});

// Helper functions for sending OSC
export const setOsc = (address, args) => {
    socket.emit('setOsc', { address, args });
};
