import type { ReceiverState } from '../types.js';
export declare function useReceiver(): {
    state: ReceiverState;
    initialize: () => Promise<(() => void) | undefined>;
    disconnect: () => void;
    retry: () => void;
    remoteStream: MediaStream | null;
};
//# sourceMappingURL=useReceiver.d.ts.map