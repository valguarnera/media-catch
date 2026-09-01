export class WebRTCService {
    pc = null;
    config;
    eventHandlers = new Set();
    remoteStream = null;
    constructor(config = {}) {
        this.config = { ...DEFAULT_WEBRTC_CONFIG, ...config };
    }
    async initialize() {
        this.pc = new RTCPeerConnection({
            iceServers: this.config.iceServers,
        });
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.emitEvent({
                    type: 'ice-candidate',
                    candidate: event.candidate.candidate,
                    sdpMid: event.candidate.sdpMid ?? undefined,
                    sdpMLineIndex: event.candidate.sdpMLineIndex ?? undefined,
                });
            }
        };
        this.pc.ontrack = (event) => {
            const stream = event.streams[0];
            if (stream) {
                this.remoteStream = stream;
                this.emitEvent({ type: 'track-received', stream });
            }
        };
        this.pc.onconnectionstatechange = () => {
            if (this.pc) {
                this.emitEvent({ type: 'ice-connection-state-changed', state: this.pc.connectionState });
            }
        };
        this.pc.oniceconnectionstatechange = () => {
            if (this.pc) {
                console.log('[WebRTC] ICE connection state:', this.pc.iceConnectionState);
            }
        };
    }
    async createOffer() {
        if (!this.pc)
            throw new Error('PeerConnection not initialized');
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        return offer;
    }
    async setRemoteOffer(sdp) {
        if (!this.pc)
            throw new Error('PeerConnection not initialized');
        await this.pc.setRemoteDescription({ type: 'offer', sdp });
    }
    async createAnswer() {
        if (!this.pc)
            throw new Error('PeerConnection not initialized');
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        return answer;
    }
    async setRemoteAnswer(sdp) {
        if (!this.pc)
            throw new Error('PeerConnection not initialized');
        await this.pc.setRemoteDescription({ type: 'answer', sdp });
    }
    async addIceCandidate(candidate, sdpMid, sdpMLineIndex) {
        if (!this.pc)
            throw new Error('PeerConnection not initialized');
        try {
            await this.pc.addIceCandidate({ candidate, sdpMid, sdpMLineIndex });
        }
        catch (error) {
            console.warn('[WebRTC] Failed to add ICE candidate:', error);
        }
    }
    getRemoteStream() {
        return this.remoteStream;
    }
    getConnectionState() {
        return this.pc?.connectionState ?? null;
    }
    close() {
        if (this.pc) {
            this.pc.onicecandidate = null;
            this.pc.ontrack = null;
            this.pc.onconnectionstatechange = null;
            this.pc.oniceconnectionstatechange = null;
            this.pc.close();
            this.pc = null;
        }
        this.remoteStream = null;
    }
    onEvent(handler) {
        this.eventHandlers.add(handler);
        return () => this.eventHandlers.delete(handler);
    }
    emitEvent(event) {
        this.eventHandlers.forEach((handler) => handler(event));
    }
}
const DEFAULT_WEBRTC_CONFIG = {
    iceServers: [],
};
//# sourceMappingURL=webrtc.js.map