export type SessionState =
  | 'idle'
  | 'pairing'
  | 'connecting'
  | 'connected'
  | 'streaming'
  | 'paused'
  | 'disconnected'
  | 'error';

export type PeerRole = 'sender' | 'receiver';

export interface Capability {
  audio: boolean;
  video: boolean;
  facingModes: ('user' | 'environment')[];
}

export interface Peer {
  id: string;
  role: PeerRole;
  sessionId: string;
  capabilities?: Capability;
  state: SessionState;
  connectedAt?: number;
}

export interface Session {
  id: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  peers: Map<string, Peer>;
  state: SessionState;
}

export type IceConfig = {
  iceServers: RTCIceServer[];
};

export const ICE_CONFIG_LAN: IceConfig = {
  iceServers: [],
};

export const ICE_CONFIG_INTERNET: IceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function isSessionExpired(session: Session): boolean {
  return Date.now() > session.expiresAt;
}

export const SESSION_TTL_MS = 10 * 60 * 1000;