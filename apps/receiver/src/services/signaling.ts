import type {
  SignalingMessage,
  RegisterMessage,
  RegisterAckMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  EventMessage,
  ErrorMessage,
  PingMessage,
  PongMessage,
  Session,
  Peer,
  Capability,
} from '@media-catch/protocol';
import {
  createRegisterMessage,
  isSignalingMessage,
  createAnswerMessage,
  createIceCandidateMessage,
} from '@media-catch/protocol';
import type { SignalingConfig, ReceiverEvent } from '../types.js';

type MessageHandler = (message: SignalingMessage) => void;
type EventHandler = (event: ReceiverEvent) => void;

export class SignalingService {
  private ws: WebSocket | null = null;
  private config: SignalingConfig;
  private messageHandlers = new Set<MessageHandler>();
  private eventHandlers = new Set<EventHandler>();
  private reconnectAttempts = 0;
  private sessionId: string | null = null;
  private peerId: string | null = null;
  private pendingMessages: SignalingMessage[] = [];

  constructor(config: Partial<SignalingConfig> = {}) {
    this.config = { ...DEFAULT_SIGNALING_CONFIG, ...config };
  }

  connect(): Promise<void> {
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
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(event: MessageEvent): void {
    let message: unknown;
    try {
      message = JSON.parse(event.data);
    } catch {
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
        this.emitEvent({ type: 'offer-received', offer: message as OfferMessage });
        break;
      case 'answer':
        this.emitEvent({ type: 'answer-received', answer: message as AnswerMessage });
        break;
      case 'ice-candidate':
        this.emitEvent({ type: 'ice-candidate-received', candidate: message as IceCandidateMessage });
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

  private handleRegisterAck(message: RegisterAckMessage): void {
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

  private handleEvent(message: EventMessage): void {
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

  private handleError(message: ErrorMessage): void {
    const errorMsg = `[${message.payload.code}] ${message.payload.message}`;
    this.emitEvent({ type: 'error', message: errorMsg });
    this.emitEvent({ type: 'state-changed', state: { error: errorMsg, connectionState: 'error' } });
  }

  private handleDisconnect(): void {
    this.ws = null;
    this.sessionId = null;
    this.peerId = null;
    this.emitEvent({
      type: 'state-changed',
      state: { connectionState: 'disconnected', remotePeerConnected: false },
    });
    this.attemptReconnect();
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      this.emitEvent({ type: 'error', message: 'Max reconnection attempts reached' });
      return;
    }
    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect().catch(() => {});
    }, this.config.reconnectDelayMs * this.reconnectAttempts);
  }

  private flushPendingMessages(): void {
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (message) this.send(message);
    }
  }

  register(capabilities?: Capability, sessionCode?: string): void {
    const message = createRegisterMessage('', '', {
      role: 'receiver',
      capabilities,
      sessionCode,
    });
    this.send(message);
  }

  sendAnswer(sdp: string): void {
    if (!this.sessionId || !this.peerId) return;
    const message = createAnswerMessage(this.sessionId, this.peerId, { sdp });
    this.send(message);
  }

  sendIceCandidate(candidate: string, sdpMid?: string, sdpMLineIndex?: number): void {
    if (!this.sessionId || !this.peerId) return;
    const message = createIceCandidateMessage(this.sessionId, this.peerId, {
      candidate,
      sdpMid,
      sdpMLineIndex,
    });
    this.send(message);
  }

  private sendPong(): void {
    if (!this.sessionId || !this.peerId || !this.ws) return;
    const pong: PongMessage = {
      type: 'pong',
      sessionId: this.sessionId,
      peerId: this.peerId,
      timestamp: Date.now(),
      payload: undefined,
    };
    this.send(pong);
  }

  private send(message: SignalingMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.pendingMessages.push(message);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(event: ReceiverEvent): void {
    this.eventHandlers.forEach((handler) => handler(event));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.sessionId = null;
    this.peerId = null;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getPeerId(): string | null {
    return this.peerId;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

const DEFAULT_SIGNALING_CONFIG: SignalingConfig = {
  wsUrl: import.meta.env.VITE_SIGNALING_WS_URL ?? 'ws://localhost:8080',
  reconnectAttempts: 5,
  reconnectDelayMs: 2000,
};