import type { Session, Peer, Capability, SessionState, PeerRole, IceConfig } from '@media-catch/protocol';
import { generateSessionCode, isSessionExpired, SESSION_TTL_MS, ICE_CONFIG_LAN } from '@media-catch/protocol';

export interface SessionStateInternal extends Session {
  peers: Map<string, Peer>;
}

export class SessionManager {
  private sessions = new Map<string, SessionStateInternal>();
  private codeToSessionId = new Map<string, string>();

  createSession(): SessionStateInternal {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const code = generateSessionCode();
    const now = Date.now();

    const session: SessionStateInternal = {
      id: sessionId,
      code,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      peers: new Map(),
      state: 'idle',
    };

    this.sessions.set(sessionId, session);
    this.codeToSessionId.set(code, sessionId);

    return session;
  }

  getSessionById(sessionId: string): SessionStateInternal | undefined {
    const session = this.sessions.get(sessionId);
    if (session && isSessionExpired(session)) {
      this.deleteSession(sessionId);
      return undefined;
    }
    return session;
  }

  getSessionByCode(code: string): SessionStateInternal | undefined {
    const sessionId = this.codeToSessionId.get(code);
    if (!sessionId) return undefined;
    return this.getSessionById(sessionId);
  }

  registerPeer(sessionId: string, peerId: string, role: PeerRole, capabilities?: Capability): Peer | undefined {
    const session = this.getSessionById(sessionId);
    if (!session) return undefined;

    const existingPeer = Array.from(session.peers.values()).find(p => p.role === role);
    if (existingPeer) {
      return undefined;
    }

    const peer: Peer = {
      id: peerId,
      role,
      sessionId,
      capabilities,
      state: 'pairing',
      connectedAt: Date.now(),
    };

    session.peers.set(peerId, peer);
    this.updateSessionState(session);

    return peer;
  }

  getPeer(sessionId: string, peerId: string): Peer | undefined {
    const session = this.getSessionById(sessionId);
    if (!session) return undefined;
    return session.peers.get(peerId);
  }

  getPeersBySession(sessionId: string): Peer[] {
    const session = this.getSessionById(sessionId);
    if (!session) return [];
    return Array.from(session.peers.values());
  }

  getOtherPeer(sessionId: string, peerId: string): Peer | undefined {
    const session = this.getSessionById(sessionId);
    if (!session) return undefined;
    for (const peer of session.peers.values()) {
      if (peer.id !== peerId) return peer;
    }
    return undefined;
  }

  updatePeerState(sessionId: string, peerId: string, state: SessionState): boolean {
    const session = this.getSessionById(sessionId);
    if (!session) return false;

    const peer = session.peers.get(peerId);
    if (!peer) return false;

    peer.state = state;
    this.updateSessionState(session);
    return true;
  }

  removePeer(sessionId: string, peerId: string): boolean {
    const session = this.getSessionById(sessionId);
    if (!session) return false;

    const deleted = session.peers.delete(peerId);
    if (deleted) {
      this.updateSessionState(session);
      if (session.peers.size === 0) {
        this.deleteSession(sessionId);
      }
    }
    return deleted;
  }

  getIceConfig(): IceConfig {
    return ICE_CONFIG_LAN;
  }

  private updateSessionState(session: SessionStateInternal): void {
    const states = Array.from(session.peers.values()).map(p => p.state);
    if (states.includes('streaming')) {
      session.state = 'streaming';
    } else if (states.includes('connected')) {
      session.state = 'connected';
    } else if (states.includes('connecting')) {
      session.state = 'connecting';
    } else if (states.length > 0) {
      session.state = 'pairing';
    } else {
      session.state = 'idle';
    }
  }

  private deleteSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.codeToSessionId.delete(session.code);
      this.sessions.delete(sessionId);
    }
  }

  cleanupExpiredSessions(): number {
    let cleaned = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (isSessionExpired(session)) {
        this.deleteSession(sessionId);
        cleaned++;
      }
    }
    return cleaned;
  }

  getAllSessions(): SessionStateInternal[] {
    return Array.from(this.sessions.values());
  }
}