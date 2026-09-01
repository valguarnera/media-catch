import type { ConnectionState } from '../types.js';
interface ConnectionStatusProps {
    state: ConnectionState;
    sessionCode: string | null;
    remotePeerConnected: boolean;
    webrtcState: RTCPeerConnectionState | null;
}
export declare function ConnectionStatus({ state, sessionCode, remotePeerConnected, webrtcState }: ConnectionStatusProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=ConnectionStatus.d.ts.map