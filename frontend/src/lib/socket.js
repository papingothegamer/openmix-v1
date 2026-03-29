import { io } from 'socket.io-client';
import { writable } from 'svelte/store';

// Assuming backend runs on the same IP on port 3000
// In production, this should map to the window.location.hostname
const SOCKET_URL = `http://${window.location.hostname}:3000`;

export const socket = io(SOCKET_URL, {
    autoConnect: false, // Connect manually when component mounts or token is available
    auth: {} // Populated at connect-time via setSocketAuthToken()
});

// Svelte stores for reactivity
export const isConnected = writable(false);
export const mixerState = writable({ buses: {}, channels: {}, meters: [], flatOscCache: {} });
export const rawMeters = writable([]);
export const meterLight = writable('off'); 
export const syncProgress = writable({ active: false, progress: 0 }); // { active: boolean, progress: 0-100 }

// Ensure musician session tokens are included in the Socket.io handshake.
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
        rawMeters.set(data.values);
    } else if (data.type === 'state') {
        // Merge raw OSC target values into the flat cache.
        // `address -> args` is later used by App.svelte to hydrate UI state.
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
        // Unknown osc payload type
        console.log('Received OSC Data:', data);
    }
});

// Helper functions for sending OSC
export const setOsc = (address, args) => {
    socket.emit('setOsc', { address, args });
};
