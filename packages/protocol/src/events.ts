export type EventType =
  | 'session.created'
  | 'session.expired'
  | 'peer.connected'
  | 'peer.disconnected'
  | 'peer.stateChanged'
  | 'stream.started'
  | 'stream.stopped'
  | 'stream.trackAdded'
  | 'stream.trackRemoved'
  | 'camera.changed'
  | 'audio.muted'
  | 'audio.unmuted'
  | 'error.occurred'
  | 'ice.candidate'
  | 'ice.connectionStateChanged'
  | 'signaling.connected'
  | 'signaling.disconnected';

export interface BaseEvent {
  type: EventType;
  sessionId: string;
  peerId: string;
  timestamp: number;
}

export interface SessionCreatedEvent extends BaseEvent {
  type: 'session.created';
  payload: { code: string; expiresAt: number };
}

export interface SessionExpiredEvent extends BaseEvent {
  type: 'session.expired';
  payload: undefined;
}

export interface PeerConnectedEvent extends BaseEvent {
  type: 'peer.connected';
  payload: { role: 'sender' | 'receiver'; capabilities?: { audio: boolean; video: boolean } };
}

export interface PeerDisconnectedEvent extends BaseEvent {
  type: 'peer.disconnected';
  payload: { reason?: string };
}

export interface PeerStateChangedEvent extends BaseEvent {
  type: 'peer.stateChanged';
  payload: { state: 'idle' | 'pairing' | 'connecting' | 'connected' | 'streaming' | 'paused' | 'disconnected' | 'error' };
}

export interface StreamStartedEvent extends BaseEvent {
  type: 'stream.started';
  payload: { audio: boolean; video: boolean };
}

export interface StreamStoppedEvent extends BaseEvent {
  type: 'stream.stopped';
  payload: { audio?: boolean; video?: boolean };
}

export interface StreamTrackAddedEvent extends BaseEvent {
  type: 'stream.trackAdded';
  payload: { kind: 'audio' | 'video'; trackId: string };
}

export interface StreamTrackRemovedEvent extends BaseEvent {
  type: 'stream.trackRemoved';
  payload: { kind: 'audio' | 'video'; trackId: string };
}

export interface CameraChangedEvent extends BaseEvent {
  type: 'camera.changed';
  payload: { facingMode: 'user' | 'environment' };
}

export interface AudioMutedEvent extends BaseEvent {
  type: 'audio.muted';
  payload: undefined;
}

export interface AudioUnmutedEvent extends BaseEvent {
  type: 'audio.unmuted';
  payload: undefined;
}

export interface ErrorOccurredEvent extends BaseEvent {
  type: 'error.occurred';
  payload: { code: string; message: string; recoverable: boolean };
}

export interface IceCandidateEvent extends BaseEvent {
  type: 'ice.candidate';
  payload: { candidate: string; sdpMid?: string; sdpMLineIndex?: number };
}

export interface IceConnectionStateChangedEvent extends BaseEvent {
  type: 'ice.connectionStateChanged';
  payload: { state: RTCIceConnectionState };
}

export interface SignalingConnectedEvent extends BaseEvent {
  type: 'signaling.connected';
  payload: undefined;
}

export interface SignalingDisconnectedEvent extends BaseEvent {
  type: 'signaling.disconnected';
  payload: { reason?: string };
}

export type Event =
  | SessionCreatedEvent
  | SessionExpiredEvent
  | PeerConnectedEvent
  | PeerDisconnectedEvent
  | PeerStateChangedEvent
  | StreamStartedEvent
  | StreamStoppedEvent
  | StreamTrackAddedEvent
  | StreamTrackRemovedEvent
  | CameraChangedEvent
  | AudioMutedEvent
  | AudioUnmutedEvent
  | ErrorOccurredEvent
  | IceCandidateEvent
  | IceConnectionStateChangedEvent
  | SignalingConnectedEvent
  | SignalingDisconnectedEvent;

export function createEvent<T extends EventType>(
  type: T,
  sessionId: string,
  peerId: string,
  payload: Event extends { type: T } ? Event['payload'] : never
): Extract<Event, { type: T }> {
  return {
    type,
    sessionId,
    peerId,
    timestamp: Date.now(),
    payload,
  } as Extract<Event, { type: T }>;
}