import { WebSocket } from 'ws';
import type {
  SignalingMessage,
  SignalingMessageType,
  RegisterMessage,
  RegisterAckMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  CommandMessage,
  EventMessage,
  ErrorMessage,
  PingMessage,
  PongMessage,
  Session,
  Peer,
  Capability,
  SessionState,
} from '@media-catch/protocol';
import {
  isSignalingMessage,
  createRegisterAckMessage,
  createOfferMessage,
  createAnswerMessage,
  createIceCandidateMessage,
  createCommandMessage,
  createEventMessage,
  createErrorMessage,
  createPongMessage,
} from '@media-catch/protocol';
import { SessionManager } from './session-manager.js';
import type { SessionStateInternal } from './session-manager.js';

interface ConnectedPeer {
  ws: WebSocket;
  sessionId: string;
  peerId: string;
  role: 'sender' | 'receiver';
}

type RegisterHandler = (ws: WebSocket, message: RegisterMessage) => Promise<void>;
type PeerMessageHandler = (peer: ConnectedPeer, message: SignalingMessage) => Promise<void>;

export class SignalingHandler {
  private sessionManager: SessionManager;
  private peers = new Map<WebSocket, ConnectedPeer>();
  private registerHandler: RegisterHandler;
  private peerMessageHandlers: Map<SignalingMessageType, PeerMessageHandler>;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.registerHandler = this.handleRegister.bind(this);
    this.peerMessageHandlers = new Map<SignalingMessageType, PeerMessageHandler>([
      ['offer', (peer, msg) => this.handleOffer(peer, msg as OfferMessage)],
      ['answer', (peer, msg) => this.handleAnswer(peer, msg as AnswerMessage)],
      ['ice-candidate', (peer, msg) => this.handleIceCandidate(peer, msg as IceCandidateMessage)],
      ['command', (peer, msg) => this.handleCommand(peer, msg as CommandMessage)],
      ['event', (peer, msg) => this.handleEvent(peer, msg as EventMessage)],
      ['ping', (peer, msg) => this.handlePing(peer, msg as PingMessage)],
    ]);
  }

  handleConnection(ws: WebSocket): void {
    console.log('[Server] New WebSocket connection');

    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('[Server] WebSocket error:', error.message);
    });
  }

  private handleMessage(ws: WebSocket, data: Buffer): void {
    let message: unknown;
    try {
      message = JSON.parse(data.toString());
    } catch {
      this.sendError(ws, 'INVALID_JSON', 'Invalid JSON format', true);
      return;
    }

    if (!isSignalingMessage(message)) {
      this.sendError(ws, 'INVALID_MESSAGE', 'Message does not match signaling protocol', true);
      return;
    }

    const connectedPeer = this.peers.get(ws);

    if (message.type === 'register') {
      this.registerHandler(ws, message).catch((error) => {
        console.error('[Server] Register handler error:', error);
        this.sendError(ws, 'HANDLER_ERROR', error.message, false);
      });
      return;
    }

    if (!connectedPeer) {
      this.sendError(ws, 'NOT_REGISTERED', 'Peer must register first', true);
      return;
    }

    const handler = this.peerMessageHandlers.get(message.type);
    if (!handler) {
      this.sendError(ws, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${message.type}`, true);
      return;
    }

    handler(connectedPeer, message).catch((error) => {
      console.error('[Server] Handler error:', error);
      this.sendError(ws, 'HANDLER_ERROR', error.message, false);
    });
  }

  private async handleRegister(ws: WebSocket, message: RegisterMessage): Promise<void> {
    const { role, capabilities, sessionCode } = message.payload;

    if (role !== 'sender' && role !== 'receiver') {
      this.sendError(ws, 'INVALID_ROLE', 'Role must be "sender" or "receiver"', true);
      return;
    }

    let session: SessionStateInternal;
    let sessionId: string;
    let isNewSession = false;

    if (sessionCode) {
      const foundSession = this.sessionManager.getSessionByCode(sessionCode);
      if (!foundSession) {
        this.sendError(ws, 'SESSION_NOT_FOUND', `Session with code ${sessionCode} not found`, true);
        return;
      }
      session = foundSession;
      sessionId = session.id;
    } else {
      session = this.sessionManager.createSession();
      sessionId = session.id;
      isNewSession = true;
    }

    const peerId = `peer_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const peer = this.sessionManager.registerPeer(sessionId, peerId, role, capabilities);

    if (!peer) {
      this.sendError(ws, 'ROLE_TAKEN', `Role ${role} already registered in this session`, true);
      if (isNewSession) {
        this.sessionManager.removePeer(sessionId, peerId);
      }
      return;
    }

    this.peers.set(ws, { ws, sessionId, peerId, role });
    this.sessionManager.updatePeerState(sessionId, peerId, 'connected');

    const ack = createRegisterAckMessage(sessionId, peerId, {
      sessionId,
      peerId,
      session: {
        id: session.id,
        code: session.code,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        peers: new Map(session.peers),
        state: session.state,
      },
      peer,
      iceConfig: this.sessionManager.getIceConfig(),
    });

    this.send(ws, ack);
    console.log(`[Server] Peer registered: ${peerId} (${role}) in session ${sessionId}${isNewSession ? ' (new)' : ''}`);

    if (!isNewSession) {
      const otherPeer = this.sessionManager.getOtherPeer(sessionId, peerId);
      if (otherPeer) {
        this.sessionManager.updatePeerState(sessionId, otherPeer.id, 'connected');
        this.notifyPeer(otherPeer.id, createEventMessage(sessionId, peerId, {
          type: 'peer.connected',
          sessionId,
          peerId,
          timestamp: Date.now(),
          payload: { role: peer.role, capabilities: peer.capabilities },
        }));
      }
    }
  }

  private async handleOffer(peer: ConnectedPeer, message: OfferMessage): Promise<void> {
    const otherPeer = this.sessionManager.getOtherPeer(peer.sessionId, peer.peerId);
    if (!otherPeer) {
      this.sendError(peer.ws, 'NO_OTHER_PEER', 'No other peer in session to receive offer', false);
      return;
    }

    this.forwardToPeer(otherPeer.id, message);
    this.sessionManager.updatePeerState(peer.sessionId, peer.peerId, 'connecting');
    console.log(`[Server] Offer forwarded: ${peer.peerId} -> ${otherPeer.id}`);
  }

  private async handleAnswer(peer: ConnectedPeer, message: AnswerMessage): Promise<void> {
    const otherPeer = this.sessionManager.getOtherPeer(peer.sessionId, peer.peerId);
    if (!otherPeer) {
      this.sendError(peer.ws, 'NO_OTHER_PEER', 'No other peer in session to receive answer', false);
      return;
    }

    this.forwardToPeer(otherPeer.id, message);
    console.log(`[Server] Answer forwarded: ${peer.peerId} -> ${otherPeer.id}`);
  }

  private async handleIceCandidate(peer: ConnectedPeer, message: IceCandidateMessage): Promise<void> {
    const otherPeer = this.sessionManager.getOtherPeer(peer.sessionId, peer.peerId);
    if (!otherPeer) {
      return;
    }

    this.forwardToPeer(otherPeer.id, message);
  }

  private async handleCommand(peer: ConnectedPeer, message: CommandMessage): Promise<void> {
    const otherPeer = this.sessionManager.getOtherPeer(peer.sessionId, peer.peerId);
    if (!otherPeer) {
      this.sendError(peer.ws, 'NO_OTHER_PEER', 'No other peer in session to receive command', false);
      return;
    }

    this.forwardToPeer(otherPeer.id, message);
    console.log(`[Server] Command forwarded: ${peer.peerId} -> ${otherPeer.id} (${message.payload.type})`);
  }

  private async handleEvent(peer: ConnectedPeer, message: EventMessage): Promise<void> {
    const otherPeer = this.sessionManager.getOtherPeer(peer.sessionId, peer.peerId);
    if (!otherPeer) {
      return;
    }

    this.forwardToPeer(otherPeer.id, message);
  }

  private async handlePing(peer: ConnectedPeer, _message: PingMessage): Promise<void> {
    const pong = createPongMessage(peer.sessionId, peer.peerId);
    this.send(peer.ws, pong);
  }

  private handleDisconnect(ws: WebSocket): void {
    const connectedPeer = this.peers.get(ws);
    if (!connectedPeer) return;

    const { sessionId, peerId, role } = connectedPeer;
    console.log(`[Server] Peer disconnected: ${peerId} (${role}) from session ${sessionId}`);

    this.peers.delete(ws);

    const removed = this.sessionManager.removePeer(sessionId, peerId);
    if (removed) {
      const otherPeer = this.sessionManager.getOtherPeer(sessionId, peerId);
      if (otherPeer) {
        this.notifyPeer(otherPeer.id, createEventMessage(sessionId, peerId, {
          type: 'peer.disconnected',
          sessionId,
          peerId,
          timestamp: Date.now(),
          payload: { reason: 'Peer disconnected' },
        }));
      }
    }
  }

  private send(ws: WebSocket, message: SignalingMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, code: string, message: string, recoverable: boolean): void {
    const error = createErrorMessage('', '', { code, message, recoverable });
    this.send(ws, error);
  }

  private forwardToPeer(targetPeerId: string, message: SignalingMessage): void {
    for (const [ws, peer] of this.peers.entries()) {
      if (peer.peerId === targetPeerId) {
        this.send(ws, message);
        break;
      }
    }
  }

  private notifyPeer(targetPeerId: string, message: EventMessage): void {
    this.forwardToPeer(targetPeerId, message);
  }

  closeAllConnections(): void {
    for (const [ws] of this.peers.entries()) {
      ws.close(1001, 'Server shutting down');
    }
  }

  getConnectedPeersCount(): number {
    return this.peers.size;
  }

  getSessionsCount(): number {
    return this.sessionManager.getAllSessions().length;
  }
}