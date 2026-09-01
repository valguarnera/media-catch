export type CommandType =
  | 'connect'
  | 'disconnect'
  | 'start-stream'
  | 'stop-stream'
  | 'switch-camera'
  | 'mute-audio'
  | 'unmute-audio'
  | 'ping';

export interface BaseCommand {
  type: CommandType;
  sessionId: string;
  peerId: string;
  timestamp: number;
}

export interface ConnectCommand extends BaseCommand {
  type: 'connect';
  payload: {
    role: 'sender' | 'receiver';
    capabilities?: {
      audio: boolean;
      video: boolean;
      facingModes: ('user' | 'environment')[];
    };
  };
}

export interface DisconnectCommand extends BaseCommand {
  type: 'disconnect';
  payload: { reason?: string };
}

export interface StartStreamCommand extends BaseCommand {
  type: 'start-stream';
  payload: { audio?: boolean; video?: boolean };
}

export interface StopStreamCommand extends BaseCommand {
  type: 'stop-stream';
  payload: { audio?: boolean; video?: boolean };
}

export interface SwitchCameraCommand extends BaseCommand {
  type: 'switch-camera';
  payload: { facingMode: 'user' | 'environment' };
}

export interface MuteAudioCommand extends BaseCommand {
  type: 'mute-audio';
  payload: undefined;
}

export interface UnmuteAudioCommand extends BaseCommand {
  type: 'unmute-audio';
  payload: undefined;
}

export interface PingCommand extends BaseCommand {
  type: 'ping';
  payload: undefined;
}

export type Command =
  | ConnectCommand
  | DisconnectCommand
  | StartStreamCommand
  | StopStreamCommand
  | SwitchCameraCommand
  | MuteAudioCommand
  | UnmuteAudioCommand
  | PingCommand;

export function createCommand<T extends CommandType>(
  type: T,
  sessionId: string,
  peerId: string,
  payload: Command extends { type: T } ? Command['payload'] : never
): Extract<Command, { type: T }> {
  return {
    type,
    sessionId,
    peerId,
    timestamp: Date.now(),
    payload,
  } as Extract<Command, { type: T }>;
}