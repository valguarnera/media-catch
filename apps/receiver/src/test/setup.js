import { vi } from 'vitest';
import '@testing-library/jest-dom';
Object.defineProperty(global, 'RTCPeerConnection', {
    value: vi.fn().mockImplementation(() => ({
        createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
        createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
        setLocalDescription: vi.fn().mockResolvedValue(undefined),
        setRemoteDescription: vi.fn().mockResolvedValue(undefined),
        addIceCandidate: vi.fn().mockResolvedValue(undefined),
        onicecandidate: null,
        ontrack: null,
        onconnectionstatechange: null,
        oniceconnectionstatechange: null,
        connectionState: 'new',
        iceConnectionState: 'new',
        close: vi.fn(),
    })),
    writable: true,
});
Object.defineProperty(global, 'MediaStream', {
    value: vi.fn().mockImplementation(() => ({
        getTracks: vi.fn().mockReturnValue([]),
        getAudioTracks: vi.fn().mockReturnValue([]),
        getVideoTracks: vi.fn().mockReturnValue([]),
    })),
    writable: true,
});
Object.defineProperty(global, 'WebSocket', {
    value: vi.fn().mockImplementation(() => ({
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
    })),
    writable: true,
});
HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
HTMLMediaElement.prototype.pause = vi.fn();
//# sourceMappingURL=setup.js.map