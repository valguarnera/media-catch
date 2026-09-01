import type { SignalingMessage, Capability } from '@media-catch/protocol';
import type { SignalingConfig, ReceiverEvent } from '../types.js';
type MessageHandler = (message: SignalingMessage) => void;
type EventHandler = (event: ReceiverEvent) => void;
export declare class SignalingService {
    private ws;
    private config;
    private messageHandlers;
    private eventHandlers;
    private reconnectAttempts;
    private sessionId;
    private peerId;
    private pendingMessages;
    constructor(config?: Partial<SignalingConfig>);
    connect(): Promise<void>;
    private handleMessage;
    private handleRegisterAck;
    private handleEvent;
    private handleError;
    private handleDisconnect;
    private attemptReconnect;
    private flushPendingMessages;
    register(capabilities?: Capability, sessionCode?: string): void;
    sendAnswer(sdp: string): void;
    sendIceCandidate(candidate: string, sdpMid?: string, sdpMLineIndex?: number): void;
    private sendPong;
    private send;
    onMessage(handler: MessageHandler): () => void;
    onEvent(handler: EventHandler): () => void;
    private emitEvent;
    disconnect(): void;
    getSessionId(): string | null;
    getPeerId(): string | null;
    isConnected(): boolean;
}
export {};
//# sourceMappingURL=signaling.d.ts.map