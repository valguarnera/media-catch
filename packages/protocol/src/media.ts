export type MediaKind = 'audio' | 'video';

export type FacingMode = 'user' | 'environment';

export interface MediaConstraints {
  audio: boolean | MediaTrackConstraints;
  video: boolean | MediaTrackConstraints;
}

export interface MediaTrackConstraints {
  facingMode?: FacingMode;
  width?: number | ConstrainLong;
  height?: number | ConstrainLong;
  frameRate?: number | ConstrainLong;
  deviceId?: string | ConstrainDOMString;
}

export interface ConstrainLong {
  exact?: number;
  ideal?: number;
  min?: number;
  max?: number;
}

export interface ConstrainDOMString {
  exact?: string | string[];
  ideal?: string | string[];
}

export interface Stream {
  id: string;
  sessionId: string;
  peerId: string;
  kind: MediaKind;
  tracks: Track[];
  active: boolean;
  createdAt: number;
}

export interface Track {
  id: string;
  streamId: string;
  kind: MediaKind;
  label: string;
  enabled: boolean;
  muted: boolean;
  readyState: 'live' | 'ended';
  facingMode?: FacingMode;
  settings?: MediaTrackSettings;
  constraints?: MediaTrackConstraints;
}

export interface MediaTrackSettings {
  deviceId: string;
  groupId: string;
  facingMode?: FacingMode;
  width: number;
  height: number;
  frameRate: number;
}

export interface StreamState {
  streamId: string;
  peerId: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioTrackId?: string;
  videoTrackId?: string;
  facingMode?: FacingMode;
}

export function createStreamId(): string {
  return `stream_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createTrackId(kind: MediaKind): string {
  return `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}