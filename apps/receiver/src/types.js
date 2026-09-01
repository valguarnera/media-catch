export const DEFAULT_SIGNALING_CONFIG = {
    wsUrl: import.meta.env.VITE_SIGNALING_WS_URL ?? 'ws://localhost:8080',
    reconnectAttempts: 5,
    reconnectDelayMs: 2000,
};
export const DEFAULT_WEBRTC_CONFIG = {
    iceServers: [],
};
//# sourceMappingURL=types.js.map