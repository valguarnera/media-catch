import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRTCService } from '../services/webrtc.js';
describe('WebRTCService', () => {
    let service;
    let mockPc;
    beforeEach(() => {
        mockPc = {
            createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-offer-sdp' }),
            createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-answer-sdp' }),
            setLocalDescription: vi.fn().mockResolvedValue(undefined),
            setRemoteDescription: vi.fn().mockResolvedValue(undefined),
            addIceCandidate: vi.fn().mockResolvedValue(undefined),
            onicecandidate: null,
            ontrack: null,
            onconnectionstatechange: null,
            oniceconnectionstatechange: null,
            connectionState: 'new',
            iceConnectionState: 'new',
            close: vi.fn(),
        };
        global.RTCPeerConnection = vi.fn().mockImplementation(() => mockPc);
        service = new WebRTCService({ iceServers: [] });
    });
    it('initializes peer connection', async () => {
        await service.initialize();
        expect(global.RTCPeerConnection).toHaveBeenCalledWith({ iceServers: [] });
        expect(mockPc.onicecandidate).toBeDefined();
        expect(mockPc.ontrack).toBeDefined();
        expect(mockPc.onconnectionstatechange).toBeDefined();
    });
    it('creates offer', async () => {
        await service.initialize();
        const offer = await service.createOffer();
        expect(mockPc.createOffer).toHaveBeenCalled();
        expect(mockPc.setLocalDescription).toHaveBeenCalled();
        expect(offer.type).toBe('offer');
    });
    it('sets remote offer', async () => {
        await service.initialize();
        await service.setRemoteOffer('remote-offer-sdp');
        expect(mockPc.setRemoteDescription).toHaveBeenCalledWith({ type: 'offer', sdp: 'remote-offer-sdp' });
    });
    it('creates answer', async () => {
        await service.initialize();
        const answer = await service.createAnswer();
        expect(mockPc.createAnswer).toHaveBeenCalled();
        expect(mockPc.setLocalDescription).toHaveBeenCalled();
        expect(answer.type).toBe('answer');
    });
    it('sets remote answer', async () => {
        await service.initialize();
        await service.setRemoteAnswer('remote-answer-sdp');
        expect(mockPc.setRemoteDescription).toHaveBeenCalledWith({ type: 'answer', sdp: 'remote-answer-sdp' });
    });
    it('adds ICE candidate', async () => {
        await service.initialize();
        await service.addIceCandidate('candidate-string', 'mid-0', 0);
        expect(mockPc.addIceCandidate).toHaveBeenCalledWith({
            candidate: 'candidate-string',
            sdpMid: 'mid-0',
            sdpMLineIndex: 0,
        });
    });
    it('emits ice-candidate event when candidate is generated', async () => {
        const events = [];
        service.onEvent((e) => events.push(e));
        await service.initialize();
        const candidateEvent = { candidate: { candidate: 'test-candidate', sdpMid: '0', sdpMLineIndex: 0 } };
        mockPc.onicecandidate(candidateEvent);
        expect(events.some((e) => e.type === 'ice-candidate' && e.candidate === 'test-candidate')).toBe(true);
    });
    it('emits track-received when track arrives', async () => {
        const events = [];
        service.onEvent((e) => events.push(e));
        await service.initialize();
        const mockStream = new MediaStream();
        const trackEvent = { streams: [mockStream] };
        mockPc.ontrack(trackEvent);
        expect(events.some((e) => e.type === 'track-received' && e.stream === mockStream)).toBe(true);
    });
    it('closes peer connection', async () => {
        await service.initialize();
        service.close();
        expect(mockPc.close).toHaveBeenCalled();
        expect(service.getRemoteStream()).toBeNull();
    });
});
//# sourceMappingURL=webrtc.test.js.map