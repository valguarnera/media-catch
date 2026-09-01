import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SignalingService } from './signaling.js';
describe('SignalingService', () => {
    let service;
    let mockWs;
    const originalWebSocket = global.WebSocket;
    beforeEach(() => {
        mockWs = {
            readyState: WebSocket.OPEN,
            send: vi.fn(),
            close: vi.fn(),
            onopen: null,
            onmessage: null,
            onclose: null,
            onerror: null,
        };
        global.WebSocket = vi.fn().mockImplementation(() => mockWs);
        service = new SignalingService({ wsUrl: 'ws://localhost:8080', reconnectAttempts: 0 });
    });
    afterEach(() => {
        global.WebSocket = originalWebSocket;
        service.disconnect();
        vi.clearAllMocks();
    });
    it('connects and calls onopen', async () => {
        const connectPromise = service.connect();
        expect(mockWs.onopen).toBeDefined();
        mockWs.onopen({});
        await connectPromise;
        // Connect only establishes WebSocket, register is separate
        expect(mockWs.send).not.toHaveBeenCalled();
    });
    it('sends register message after connect', async () => {
        const connectPromise = service.connect();
        mockWs.onopen({});
        await connectPromise;
        vi.clearAllMocks();
        service.register({ audio: true, video: true, facingModes: ['user'] });
        expect(mockWs.send).toHaveBeenCalled();
        const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
        expect(sentMessage.type).toBe('register');
        expect(sentMessage.payload.role).toBe('receiver');
    });
    it('handles register-ack and emits session code', async () => {
        const events = [];
        service.onEvent((e) => events.push(e));
        const connectPromise = service.connect();
        mockWs.onopen({});
        await connectPromise;
        const ackMessage = {
            type: 'register-ack',
            sessionId: 'sess_123',
            peerId: 'peer_456',
            timestamp: Date.now(),
            payload: {
                sessionId: 'sess_123',
                peerId: 'peer_456',
                session: {
                    id: 'sess_123',
                    code: 'ABC123',
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 600000,
                    peers: new Map(),
                    state: 'pairing',
                },
                peer: {
                    id: 'peer_456',
                    role: 'receiver',
                    sessionId: 'sess_123',
                    state: 'connected',
                },
                iceConfig: { iceServers: [] },
            },
        };
        mockWs.onmessage({ data: JSON.stringify(ackMessage) });
        expect(events.some((e) => e.type === 'session-code' && e.code === 'ABC123')).toBe(true);
    });
    it('queues messages when WebSocket not open', () => {
        let mockWs2;
        const originalWebSocket2 = global.WebSocket;
        const WS_CONNECTING = 0;
        const WS_OPEN = 1;
        global.WebSocket = vi.fn().mockImplementation(() => {
            mockWs2 = {
                readyState: WS_CONNECTING,
                send: vi.fn(),
                close: vi.fn(),
                onopen: null,
                onmessage: null,
                onclose: null,
                onerror: null,
            };
            return mockWs2;
        });
        // Restore static properties
        global.WebSocket.CONNECTING = WS_CONNECTING;
        global.WebSocket.OPEN = WS_OPEN;
        global.WebSocket.CLOSING = 2;
        global.WebSocket.CLOSED = 3;
        const service2 = new SignalingService({ wsUrl: 'ws://localhost:8080', reconnectAttempts: 0 });
        service2.connect(); // Don't await - we don't call onopen
        // WebSocket stays in CONNECTING state
        service2.register({ audio: true, video: true, facingModes: ['user'] });
        // The message should be queued, not sent
        expect(mockWs2.send).not.toHaveBeenCalled();
        global.WebSocket = originalWebSocket2;
    });
    it('disconnects cleanly', async () => {
        const connectPromise = service.connect();
        mockWs.onopen({});
        await connectPromise;
        service.disconnect();
        expect(mockWs.close).toHaveBeenCalledWith(1000, 'Client disconnect');
    });
});
//# sourceMappingURL=signaling.test.js.map