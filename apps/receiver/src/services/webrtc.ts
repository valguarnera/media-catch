import type { WebRTCConfig, ReceiverEvent, RTCPeerConnectionState } from '../types.js';

type EventHandler = (event: ReceiverEvent) => void;

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private config: WebRTCConfig;
  private eventHandlers = new Set<EventHandler>();
  private remoteStream: MediaStream | null = null;

  constructor(config: Partial<WebRTCConfig> = {}) {
    this.config = { ...DEFAULT_WEBRTC_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
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

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async setRemoteOffer(sdp: string): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    await this.pc.setRemoteDescription({ type: 'offer', sdp });
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteAnswer(sdp: string): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    await this.pc.setRemoteDescription({ type: 'answer', sdp });
  }

  async addIceCandidate(candidate: string, sdpMid?: string, sdpMLineIndex?: number): Promise<void> {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    try {
      await this.pc.addIceCandidate({ candidate, sdpMid, sdpMLineIndex });
    } catch (error) {
      console.warn('[WebRTC] Failed to add ICE candidate:', error);
    }
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState ?? null;
  }

  close(): void {
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

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(event: ReceiverEvent): void {
    this.eventHandlers.forEach((handler) => handler(event));
  }
}

const DEFAULT_WEBRTC_CONFIG: WebRTCConfig = {
  iceServers: [],
};