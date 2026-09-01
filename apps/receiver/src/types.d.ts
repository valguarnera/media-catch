import type { SignalingMessage, RegisterAckMessage, OfferMessage, AnswerMessage, IceCandidateMessage, EventMessage, ErrorMessage, Session, Peer, Capability, IceConfig } from '@media-catch/protocol';
export type ConnectionState = 'disconnected' | 'connecting' | 'registering' | 'waiting-for-sender' | 'connecting-webrtc' | 'connected' | 'error';
export interface ReceiverState {
    connectionState: ConnectionState;
    sessionCode: string | null;
    sessionId: string | null;
    peerId: string | null;
    peerRole: 'receiver';
    remotePeerConnected: boolean;
    webrtcState: RTCPeerConnectionState | null;
    error: string | null;
}
export type RTCPeerConnectionState = RTCPeerConnection['connectionState'];
export interface SignalingConfig {
    wsUrl: string;
    reconnectAttempts: number;
    reconnectDelayMs: number;
}
export interface WebRTCConfig {
    iceServers: RTCIceServer[];
}
declare global {
    interface ImportMetaEnv {
        readonly VITE_SIGNALING_WS_URL?: string;
    }
    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}
export declare const DEFAULT_SIGNALING_CONFIG: SignalingConfig;
export declare const DEFAULT_WEBRTC_CONFIG: WebRTCConfig;
export type ReceiverEvent = {
    type: 'state-changed';
    state: Partial<ReceiverState>;
} | {
    type: 'session-code';
    code: string;
} | {
    type: 'peer-connected';
} | {
    type: 'peer-disconnected';
} | {
    type: 'track-received';
    stream: MediaStream;
} | {
    type: 'track-ended';
    kind: 'audio' | 'video';
} | {
    type: 'error';
    message: string;
} | {
    type: 'ice-connection-state-changed';
    state: RTCPeerConnectionState;
} | {
    type: 'offer-received';
    offer: OfferMessage;
} | {
    type: 'answer-received';
    answer: AnswerMessage;
} | {
    type: 'ice-candidate-received';
    candidate: IceCandidateMessage;
} | {
    type: 'ice-candidate';
    candidate: string;
    sdpMid?: string;
    sdpMLineIndex?: number;
};
export type { SignalingMessage, RegisterAckMessage, OfferMessage, AnswerMessage, IceCandidateMessage, EventMessage, ErrorMessage, Session, Peer, Capability, IceConfig };
//# sourceMappingURL=types.d.ts.map