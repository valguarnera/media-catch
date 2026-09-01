import type { Command, Event, Session, Peer, Capability, Stream, Track } from './index';

export type SignalingMessageType =
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'command'
  | 'event'
  | 'register'
  | 'register-ack'
  | 'error'
  | 'ping'
  | 'pong';

export interface BaseSignalingMessage {
  type: SignalingMessageType;
  sessionId: string;
  peerId: string;
  timestamp: number;
}

export interface RegisterMessage extends BaseSignalingMessage {
  type: 'register';
  payload: {
    role: 'sender' | 'receiver';
    capabilities?: Capability;
    sessionCode?: string;
  };
}

export interface RegisterAckMessage extends BaseSignalingMessage {
  type: 'register-ack';
  payload: {
    sessionId: string;
    peerId: string;
    session: Session;
    peer: Peer;
    iceConfig: { iceServers: RTCIceServer[] };
  };
}

export interface OfferMessage extends BaseSignalingMessage {
  type: 'offer';
  payload: {
    sdp: string;
    streams: Stream[];
  };
}

export interface AnswerMessage extends BaseSignalingMessage {
  type: 'answer';
  payload: {
    sdp: string;
  };
}

export interface IceCandidateMessage extends BaseSignalingMessage {
  type: 'ice-candidate';
  payload: {
    candidate: string;
    sdpMid?: string;
    sdpMLineIndex?: number;
  };
}

export interface CommandMessage extends BaseSignalingMessage {
  type: 'command';
  payload: Command;
}

export interface EventMessage extends BaseSignalingMessage {
  type: 'event';
  payload: Event;
}

export interface ErrorMessage extends BaseSignalingMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}

export interface PingMessage extends BaseSignalingMessage {
  type: 'ping';
  payload: undefined;
}

export interface PongMessage extends BaseSignalingMessage {
  type: 'pong';
  payload: undefined;
}

export type SignalingMessage =
  | RegisterMessage
  | RegisterAckMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | CommandMessage
  | EventMessage
  | ErrorMessage
  | PingMessage
  | PongMessage;

export function isSignalingMessage(msg: unknown): msg is SignalingMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    'sessionId' in msg &&
    'peerId' in msg &&
    'timestamp' in msg
  );
}

export function createSignalingMessage<T extends SignalingMessageType>(
  type: T,
  sessionId: string,
  peerId: string,
  payload: SignalingMessage extends { type: T } ? SignalingMessage['payload'] : never
): Extract<SignalingMessage, { type: T }> {
  return {
    type,
    sessionId,
    peerId,
    timestamp: Date.now(),
    payload,
  } as Extract<SignalingMessage, { type: T }>;
}