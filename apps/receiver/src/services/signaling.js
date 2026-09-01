import { createRegisterMessage, isSignalingMessage, createAnswerMessage, createIceCandidateMessage, } from '@media-catch/protocol';
export class SignalingService {
    ws = null;
    config;
    messageHandlers = new Set();
    eventHandlers = new Set();
    reconnectAttempts = 0;
    sessionId = null;
    peerId = null;
    pendingMessages = [];
    constructor(config = {}) {
        this.config = { ...DEFAULT_SIGNALING_CONFIG, ...config };
    }
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.wsUrl);
                this.ws.onopen = () => {
                    this.reconnectAttempts = 0;
                    this.flushPendingMessages();
                    this.emitEvent({ type: 'state-changed', state: { connectionState: 'registering' } });
                    resolve();
                };
                this.ws.onmessage = (event) => this.handleMessage(event);
                this.ws.onclose = () => {
                    this.handleDisconnect();
                };
                this.ws.onerror = (error) => {
                    console.error('[Signaling] WebSocket error:', error);
                    if (this.ws?.readyState === WebSocket.CONNECTING) {
                        reject(new Error('Failed to connect to signaling server'));
                    }
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    handleMessage(event) {
        let message;
        try {
            message = JSON.parse(event.data);
        }
        catch {
            console.error('[Signaling] Failed to parse message:', event.data);
            return;
        }
        if (!isSignalingMessage(message)) {
            console.error('[Signaling] Invalid message format:', message);
            return;
        }
        this.messageHandlers.forEach((handler) => handler(message));
        switch (message.type) {
            case 'register-ack':
                this.handleRegisterAck(message);
                break;
            case 'offer':
                this.emitEvent({ type: 'offer-received', offer: message });
                break;
            case 'answer':
                this.emitEvent({ type: 'answer-received', answer: message });
                break;
            case 'ice-candidate':
                this.emitEvent({ type: 'ice-candidate-received', candidate: message });
                break;
            case 'event':
                this.handleEvent(message);
                break;
            case 'error':
                this.handleError(message);
                break;
            case 'ping':
                this.sendPong();
                break;
        }
    }
    handleRegisterAck(message) {
        this.sessionId = message.payload.sessionId;
        this.peerId = message.payload.peerId;
        this.emitEvent({
            type: 'state-changed',
            state: {
                sessionId: this.sessionId,
                peerId: this.peerId,
                sessionCode: message.payload.session.code,
                connectionState: 'waiting-for-sender',
            },
        });
        this.emitEvent({ type: 'session-code', code: message.payload.session.code });
    }
    handleEvent(message) {
        switch (message.payload.type) {
            case 'peer.connected':
                this.emitEvent({ type: 'state-changed', state: { remotePeerConnected: true, connectionState: 'connecting-webrtc' } });
                this.emitEvent({ type: 'peer-connected' });
                break;
            case 'peer.disconnected':
                this.emitEvent({ type: 'state-changed', state: { remotePeerConnected: false, connectionState: 'waiting-for-sender' } });
                this.emitEvent({ type: 'peer-disconnected' });
                break;
        }
    }
    handleError(message) {
        const errorMsg = `[${message.payload.code}] ${message.payload.message}`;
        this.emitEvent({ type: 'error', message: errorMsg });
        this.emitEvent({ type: 'state-changed', state: { error: errorMsg, connectionState: 'error' } });
    }
    handleDisconnect() {
        this.ws = null;
        this.sessionId = null;
        this.peerId = null;
        this.emitEvent({
            type: 'state-changed',
            state: { connectionState: 'disconnected', remotePeerConnected: false },
        });
        this.attemptReconnect();
    }
    attemptReconnect() {
        if (this.reconnectAttempts >= this.config.reconnectAttempts) {
            this.emitEvent({ type: 'error', message: 'Max reconnection attempts reached' });
            return;
        }
        this.reconnectAttempts++;
        setTimeout(() => {
            this.connect().catch(() => { });
        }, this.config.reconnectDelayMs * this.reconnectAttempts);
    }
    flushPendingMessages() {
        while (this.pendingMessages.length > 0) {
            const message = this.pendingMessages.shift();
            if (message)
                this.send(message);
        }
    }
    register(capabilities, sessionCode) {
        const message = createRegisterMessage('', '', {
            role: 'receiver',
            capabilities,
            sessionCode,
        });
        this.send(message);
    }
    sendAnswer(sdp) {
        if (!this.sessionId || !this.peerId)
            return;
        const message = createAnswerMessage(this.sessionId, this.peerId, { sdp });
        this.send(message);
    }
    sendIceCandidate(candidate, sdpMid, sdpMLineIndex) {
        if (!this.sessionId || !this.peerId)
            return;
        const message = createIceCandidateMessage(this.sessionId, this.peerId, {
            candidate,
            sdpMid,
            sdpMLineIndex,
        });
        this.send(message);
    }
    sendPong() {
        if (!this.sessionId || !this.peerId || !this.ws)
            return;
        const pong = {
            type: 'pong',
            sessionId: this.sessionId,
            peerId: this.peerId,
            timestamp: Date.now(),
            payload: undefined,
        };
        this.send(pong);
    }
    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
        else {
            this.pendingMessages.push(message);
        }
    }
    onMessage(handler) {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }
    onEvent(handler) {
        this.eventHandlers.add(handler);
        return () => this.eventHandlers.delete(handler);
    }
    emitEvent(event) {
        this.eventHandlers.forEach((handler) => handler(event));
    }
    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.sessionId = null;
        this.peerId = null;
    }
    getSessionId() {
        return this.sessionId;
    }
    getPeerId() {
        return this.peerId;
    }
    isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}
const DEFAULT_SIGNALING_CONFIG = {
    wsUrl: import.meta.env.VITE_SIGNALING_WS_URL ?? 'ws://localhost:8080',
    reconnectAttempts: 5,
    reconnectDelayMs: 2000,
};
//# sourceMappingURL=signaling.js.map