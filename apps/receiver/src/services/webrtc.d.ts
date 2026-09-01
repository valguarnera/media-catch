import type { WebRTCConfig, ReceiverEvent, RTCPeerConnectionState } from '../types.js';
type EventHandler = (event: ReceiverEvent) => void;
export declare class WebRTCService {
    private pc;
    private config;
    private eventHandlers;
    private remoteStream;
    constructor(config?: Partial<WebRTCConfig>);
    initialize(): Promise<void>;
    createOffer(): Promise<RTCSessionDescriptionInit>;
    setRemoteOffer(sdp: string): Promise<void>;
    createAnswer(): Promise<RTCSessionDescriptionInit>;
    setRemoteAnswer(sdp: string): Promise<void>;
    addIceCandidate(candidate: string, sdpMid?: string, sdpMLineIndex?: number): Promise<void>;
    getRemoteStream(): MediaStream | null;
    getConnectionState(): RTCPeerConnectionState | null;
    close(): void;
    onEvent(handler: EventHandler): () => void;
    private emitEvent;
}
export {};
//# sourceMappingURL=webrtc.d.ts.map