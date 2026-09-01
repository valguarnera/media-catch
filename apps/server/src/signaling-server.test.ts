import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { SignalingServer } from './index.js';
import {
  createRegisterMessage,
  createOfferMessage,
  createAnswerMessage,
  createIceCandidateMessage,
  createCommandMessage,
  createPingMessage,
  isSignalingMessage,
} from '@media-catch/protocol';

describe('SignalingServer Integration', () => {
  let server: SignalingServer;
  const TEST_PORT = 18080;
  let wsClients: WebSocket[] = [];

  beforeEach(async () => {
    const { SignalingServer: ServerClass } = await import('./index.js');
    server = new ServerClass({ port: TEST_PORT, host: '127.0.0.1' });
    server.start();

    await new Promise<void>((resolve) => {
      server['wss'].once('listening', () => resolve());
    });
  });

  afterEach(() => {
    for (const ws of wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
    wsClients = [];
    server.stop();
    vi.useRealTimers();
  });

  function createClient(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
      wsClients.push(ws);
    });
  }

  function sendMessage(ws: WebSocket, message: object): void {
    ws.send(JSON.stringify(message));
  }

  function waitForMessage(ws: WebSocket): Promise<any> {
    return new Promise((resolve) => {
      ws.once('message', (data: Buffer) => {
        resolve(JSON.parse(data.toString()));
      });
    });
  }

  function waitForMessageOfType(ws: WebSocket, type: string, timeout = 3000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${type}`)), timeout);
      const handler = (data: Buffer) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === type) {
          clearTimeout(timer);
          ws.off('message', handler);
          resolve(msg);
        }
      };
      ws.on('message', handler);
    });
  }

  it('accepts WebSocket connection', async () => {
    const ws = await createClient();
    expect(ws.readyState).toBe(WebSocket.OPEN);
  });

  it('rejects invalid JSON', async () => {
    const ws = await createClient();
    ws.send('invalid json');

    const msg = await waitForMessage(ws);
    expect(msg.type).toBe('error');
    expect(msg.payload.code).toBe('INVALID_JSON');
  });

  it('rejects unknown message type after registration', async () => {
    const ws = await createClient();
    const registerMsg = createRegisterMessage('', '', { role: 'receiver' });
    sendMessage(ws, registerMsg);
    await waitForMessage(ws); // register-ack

    sendMessage(ws, { type: 'unknown', sessionId: 'sess', peerId: 'peer', timestamp: Date.now() });

    const msg = await waitForMessage(ws);
    expect(msg.type).toBe('error');
    expect(msg.payload.code).toBe('UNKNOWN_MESSAGE_TYPE');
  });

  it('registers receiver and returns session', async () => {
    const ws = await createClient();
    const registerMsg = createRegisterMessage('', '', {
      role: 'receiver',
      capabilities: { audio: true, video: true, facingModes: ['user'] },
    });
    sendMessage(ws, registerMsg);

    const msg = await waitForMessage(ws);
    expect(msg.type).toBe('register-ack');
    expect(msg.payload.session).toBeDefined();
    expect(msg.payload.session.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(msg.payload.peer.role).toBe('receiver');
    expect(msg.payload.iceConfig.iceServers).toEqual([]);
  });

  it('registers sender and returns session', async () => {
    const ws = await createClient();
    const registerMsg = createRegisterMessage('', '', {
      role: 'sender',
      capabilities: { audio: true, video: true, facingModes: ['user', 'environment'] },
    });
    sendMessage(ws, registerMsg);

    const msg = await waitForMessage(ws);
    expect(msg.type).toBe('register-ack');
    expect(msg.payload.peer.role).toBe('sender');
  });

  it('rejects duplicate role in same session', async () => {
    const ws1 = await createClient();
    const ws2 = await createClient();

    const register1 = createRegisterMessage('', '', { role: 'receiver' });
    sendMessage(ws1, register1);
    const ack1 = await waitForMessage(ws1);
    const sessionCode = ack1.payload.session.code;

    const register2 = createRegisterMessage('', '', { role: 'receiver', sessionCode });
    sendMessage(ws2, register2);

    const msg = await waitForMessage(ws2);
    expect(msg.type).toBe('error');
    expect(msg.payload.code).toBe('ROLE_TAKEN');
  });

  it('allows sender and receiver to pair', async () => {
    const receiverWs = await createClient();
    const senderWs = await createClient();

    const regReceiver = createRegisterMessage('', '', { role: 'receiver' });
    sendMessage(receiverWs, regReceiver);
    const ackReceiver = await waitForMessage(receiverWs);
    const sessionCode = ackReceiver.payload.session.code;

    const regSender = createRegisterMessage('', '', { role: 'sender', sessionCode });
    sendMessage(senderWs, regSender);
    const ackSender = await waitForMessage(senderWs);

    expect(ackSender.type).toBe('register-ack');
    expect(ackSender.payload.peer.role).toBe('sender');
  });

  it('forwards offer from sender to receiver', async () => {
    const receiverWs = await createClient();
    const senderWs = await createClient();

    const regR = createRegisterMessage('', '', { role: 'receiver' });
    sendMessage(receiverWs, regR);
    const ackR = await waitForMessage(receiverWs);
    const sessionCode = ackR.payload.session.code;
    const sessionId = ackR.payload.sessionId;

    const regS = createRegisterMessage('', '', { role: 'sender', sessionCode });
    sendMessage(senderWs, regS);
    await waitForMessage(senderWs);

    // Consume the peer.connected event on receiver (receiver is the existing peer)
    const eventMsg = await waitForMessageOfType(receiverWs, 'event');
    expect(eventMsg.payload.type).toBe('peer.connected');

    const offer = createOfferMessage(sessionId, ackR.payload.peerId, {
      sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\n',
      streams: [],
    });
    sendMessage(senderWs, offer);

    const forwarded = await waitForMessageOfType(receiverWs, 'offer');
    expect(forwarded.type).toBe('offer');
    expect(forwarded.payload.sdp).toContain('v=0');
  });

  it('forwards answer from receiver to sender', async () => {
    const receiverWs = await createClient();
    const senderWs = await createClient();

    const regR = createRegisterMessage('', '', { role: 'receiver' });
    sendMessage(receiverWs, regR);
    const ackR = await waitForMessage(receiverWs);
    const sessionCode = ackR.payload.session.code;

    const regS = createRegisterMessage('', '', { role: 'sender', sessionCode });
    sendMessage(senderWs, regS);
    await waitForMessage(senderWs);

    // Consume the peer.connected event on receiver (receiver is the existing peer)
    const eventMsg = await waitForMessageOfType(receiverWs, 'event');
    expect(eventMsg.payload.type).toBe('peer.connected');

    const answer = createAnswerMessage(ackR.payload.sessionId, ackR.payload.peerId, {
      sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\n',
    });
    sendMessage(receiverWs, answer);

    const forwarded = await waitForMessageOfType(senderWs, 'answer');
    expect(forwarded.type).toBe('answer');
  });

  it('forwards ice-candidate', async () => {
    const receiverWs = await createClient();
    const senderWs = await createClient();

    const regR = createRegisterMessage('', '', { role: 'receiver' });
    sendMessage(receiverWs, regR);
    const ackR = await waitForMessage(receiverWs);
    const sessionCode = ackR.payload.session.code;

    const regS = createRegisterMessage('', '', { role: 'sender', sessionCode });
    sendMessage(senderWs, regS);
    await waitForMessage(senderWs);

    // Consume the peer.connected event on receiver (receiver is the existing peer)
    const eventMsg = await waitForMessageOfType(receiverWs, 'event');
    expect(eventMsg.payload.type).toBe('peer.connected');

    const ice = createIceCandidateMessage(ackR.payload.sessionId, ackR.payload.peerId, {
      candidate: 'candidate:1 1 UDP 2122260223 192.168.1.1 54400 typ host',
      sdpMid: '0',
      sdpMLineIndex: 0,
    });
    sendMessage(senderWs, ice);

    const forwarded = await waitForMessageOfType(receiverWs, 'ice-candidate');
    expect(forwarded.type).toBe('ice-candidate');
    expect(forwarded.payload.candidate).toContain('candidate:');
  });

  it('forwards command to other peer', async () => {
    const receiverWs = await createClient();
    const senderWs = await createClient();

    const regR = createRegisterMessage('', '', { role: 'receiver' });
    sendMessage(receiverWs, regR);
    const ackR = await waitForMessage(receiverWs);
    const sessionCode = ackR.payload.session.code;

    const regS = createRegisterMessage('', '', { role: 'sender', sessionCode });
    sendMessage(senderWs, regS);
    await waitForMessage(senderWs);

    // Consume the peer.connected event on receiver (receiver is the existing peer)
    const eventMsg = await waitForMessageOfType(receiverWs, 'event');
    expect(eventMsg.payload.type).toBe('peer.connected');

    const cmd = createCommandMessage(ackR.payload.sessionId, ackR.payload.peerId, {
      type: 'switch-camera',
      sessionId: ackR.payload.sessionId,
      peerId: ackR.payload.peerId,
      timestamp: Date.now(),
      payload: { facingMode: 'environment' },
    });
    sendMessage(receiverWs, cmd);

    const forwarded = await waitForMessageOfType(senderWs, 'command');
    expect(forwarded.type).toBe('command');
    expect(forwarded.payload.type).toBe('switch-camera');
  });

  it('responds to ping with pong', async () => {
    const ws = await createClient();
    const reg = createRegisterMessage('', '', { role: 'receiver' });
    sendMessage(ws, reg);
    await waitForMessage(ws);

    const ping = createPingMessage('', '');
    sendMessage(ws, ping);

    const pong = await waitForMessage(ws);
    expect(pong.type).toBe('pong');
  });

  it('cleans up session on disconnect', async () => {
    const receiverWs = await createClient();
    const senderWs = await createClient();

    const regR = createRegisterMessage('', '', { role: 'receiver' });
    sendMessage(receiverWs, regR);
    const ackR = await waitForMessage(receiverWs);
    const sessionCode = ackR.payload.session.code;

    const regS = createRegisterMessage('', '', { role: 'sender', sessionCode });
    sendMessage(senderWs, regS);
    await waitForMessage(senderWs);

    // Consume the peer.connected event on receiver (receiver is the existing peer)
    const eventMsg = await waitForMessageOfType(receiverWs, 'event');
    expect(eventMsg.payload.type).toBe('peer.connected');

    // Set up listener for peer.disconnected BEFORE closing sender
    const disconnectPromise = waitForMessageOfType(receiverWs, 'event', 3000);

    senderWs.close();

    const peerDisconnected = await disconnectPromise;
    expect(peerDisconnected.type).toBe('event');
    expect(peerDisconnected.payload.type).toBe('peer.disconnected');
  });

  it('rejects messages before registration', async () => {
    const ws = await createClient();
    const offer = createOfferMessage('sess', 'peer', { sdp: '', streams: [] });
    sendMessage(ws, offer);

    const msg = await waitForMessage(ws);
    expect(msg.type).toBe('error');
    expect(msg.payload.code).toBe('NOT_REGISTERED');
  });
});