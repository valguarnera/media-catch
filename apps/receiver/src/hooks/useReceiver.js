import { useState, useEffect, useCallback, useRef } from 'react';
import { SignalingService } from '../services/signaling.js';
import { WebRTCService } from '../services/webrtc.js';
const INITIAL_STATE = {
    connectionState: 'disconnected',
    sessionCode: null,
    sessionId: null,
    peerId: null,
    peerRole: 'receiver',
    remotePeerConnected: false,
    webrtcState: null,
    error: null,
};
export function useReceiver() {
    const [state, setState] = useState(INITIAL_STATE);
    const signalingRef = useRef(null);
    const webrtcRef = useRef(null);
    const initializedRef = useRef(false);
    const updateState = useCallback((partial) => {
        setState((prev) => ({ ...prev, ...partial }));
    }, []);
    const initialize = useCallback(async () => {
        if (initializedRef.current)
            return;
        initializedRef.current = true;
        const signaling = new SignalingService();
        const webrtc = new WebRTCService();
        signalingRef.current = signaling;
        webrtcRef.current = webrtc;
        const unsubEvent = signaling.onEvent((event) => handleSignalingEvent(event, webrtc));
        const unsubWebRTC = webrtc.onEvent((event) => handleWebRTCEvent(event));
        await webrtc.initialize();
        try {
            await signaling.connect();
            updateState({ connectionState: 'registering' });
            signaling.register({
                audio: true,
                video: true,
                facingModes: ['user', 'environment'],
            });
        }
        catch (error) {
            updateState({
                connectionState: 'error',
                error: error instanceof Error ? error.message : 'Connection failed',
            });
        }
        return () => {
            unsubEvent();
            unsubWebRTC();
        };
    }, [updateState]);
    const handleSignalingEvent = async (event, webrtc) => {
        switch (event.type) {
            case 'state-changed':
                updateState(event.state);
                break;
            case 'offer-received':
                await handleOffer(event.offer, webrtc, signalingRef.current);
                break;
            case 'answer-received':
                if (webrtcRef.current)
                    await webrtcRef.current.setRemoteAnswer(event.answer.payload.sdp);
                break;
            case 'ice-candidate-received':
                if (webrtcRef.current)
                    await webrtcRef.current.addIceCandidate(event.candidate.payload.candidate, event.candidate.payload.sdpMid, event.candidate.payload.sdpMLineIndex);
                break;
            case 'error':
                updateState({ error: event.message, connectionState: 'error' });
                break;
            case 'peer-connected':
                updateState({ remotePeerConnected: true, connectionState: 'connecting-webrtc' });
                break;
            case 'peer-disconnected':
                updateState({ remotePeerConnected: false, connectionState: 'waiting-for-sender' });
                if (webrtcRef.current) {
                    webrtcRef.current.close();
                    await webrtcRef.current.initialize();
                }
                break;
        }
    };
    const handleWebRTCEvent = (event) => {
        switch (event.type) {
            case 'ice-candidate':
                signalingRef.current?.sendIceCandidate(event.candidate, event.sdpMid, event.sdpMLineIndex);
                break;
            case 'track-received':
                updateState({ connectionState: 'connected' });
                break;
            case 'ice-connection-state-changed':
                updateState({ webrtcState: event.state });
                break;
        }
    };
    const handleOffer = async (offerMessage, webrtc, signaling) => {
        try {
            await webrtc.setRemoteOffer(offerMessage.payload.sdp);
            const answer = await webrtc.createAnswer();
            signaling.sendAnswer(answer.sdp);
            updateState({ connectionState: 'connecting-webrtc' });
        }
        catch (error) {
            console.error('[Receiver] Failed to handle offer:', error);
            updateState({ error: 'Failed to handle offer', connectionState: 'error' });
        }
    };
    const disconnect = useCallback(() => {
        signalingRef.current?.disconnect();
        webrtcRef.current?.close();
        setState(INITIAL_STATE);
        initializedRef.current = false;
    }, []);
    const retry = useCallback(() => {
        disconnect();
        initialize();
    }, [disconnect, initialize]);
    useEffect(() => {
        return () => {
            signalingRef.current?.disconnect();
            webrtcRef.current?.close();
        };
    }, []);
    return {
        state,
        initialize,
        disconnect,
        retry,
        remoteStream: webrtcRef.current?.getRemoteStream() ?? null,
    };
}
//# sourceMappingURL=useReceiver.js.map