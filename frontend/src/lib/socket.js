import { io } from 'socket.io-client';
import { writable } from 'svelte/store';

// Assuming backend runs on the same IP on port 3000
const SOCKET_URL = `http://${window.location.hostname}:3000`;

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: {}
});

// Svelte stores for reactivity
export const isConnected = writable(false);
export const mixerState = writable({ buses: {}, channels: {}, meters: [], flatOscCache: {} });
export const rawMeters = writable({}); // Keyed by address: { '/meters/0': [], '/meters/5': [] }
export const meterLight = writable('off'); 
export const syncProgress = writable({ active: false, progress: 0 });

export function setSocketAuthToken(token) {
    socket.auth = token ? { token } : {};
}

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

socket.on('syncStatus', (data) => {
    syncProgress.set(data);
});

socket.on('meterTrafficLight', (data) => {
    meterLight.set(data.status);
});

socket.on('oscData', (data) => {
    if (data.type === 'meters') {
        // Store meters by their OSC address key
        rawMeters.update(prev => ({
            ...prev,
            [data.address]: data.values
        }));
    } else if (data.type === 'state') {
        if (typeof data.address === 'string') {
            mixerState.update((prev) => ({
                ...prev,
                flatOscCache: {
                    ...(prev.flatOscCache || {}),
                    [data.address]: data.args,
                },
            }));
        }
    } else {
        console.log('Received OSC Data:', data);
    }
});

// Helper functions for sending OSC
export const setOsc = (address, args) => {
    socket.emit('setOsc', { address, args });
};
