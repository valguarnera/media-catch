import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from './session-manager.js';
import type { SessionState, PeerRole, Capability } from '@media-catch/protocol';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSession', () => {
    it('creates a session with unique ID and code', () => {
      const session = manager.createSession();

      expect(session.id).toMatch(/^sess_\d+_[a-z0-9]+$/);
      expect(session.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(session.state).toBe('idle');
      expect(session.peers.size).toBe(0);
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.expiresAt).toBe(session.createdAt + 600000);
    });

    it('creates sessions with different codes', () => {
      const s1 = manager.createSession();
      const s2 = manager.createSession();

      expect(s1.code).not.toBe(s2.code);
      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe('getSessionById', () => {
    it('returns session by ID', () => {
      const session = manager.createSession();
      const found = manager.getSessionById(session.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(session.id);
    });

    it('returns undefined for non-existent session', () => {
      const found = manager.getSessionById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getSessionByCode', () => {
    it('returns session by code', () => {
      const session = manager.createSession();
      const found = manager.getSessionByCode(session.code);

      expect(found).toBeDefined();
      expect(found?.code).toBe(session.code);
    });

    it('returns undefined for non-existent code', () => {
      const found = manager.getSessionByCode('INVALID');
      expect(found).toBeUndefined();
    });
  });

  describe('registerPeer', () => {
    it('registers a sender peer', () => {
      const session = manager.createSession();
      const peer = manager.registerPeer(session.id, 'peer-1', 'sender', { audio: true, video: true, facingModes: ['user'] });

      expect(peer).toBeDefined();
      expect(peer?.id).toBe('peer-1');
      expect(peer?.role).toBe('sender');
      expect(peer?.state).toBe('pairing');
      expect(peer?.capabilities).toEqual({ audio: true, video: true, facingModes: ['user'] });
    });

    it('registers a receiver peer', () => {
      const session = manager.createSession();
      const peer = manager.registerPeer(session.id, 'peer-1', 'receiver');

      expect(peer).toBeDefined();
      expect(peer?.role).toBe('receiver');
    });

    it('rejects duplicate role in same session', () => {
      const session = manager.createSession();
      manager.registerPeer(session.id, 'peer-1', 'sender');
      const peer = manager.registerPeer(session.id, 'peer-2', 'sender');

      expect(peer).toBeUndefined();
    });

    it('allows sender and receiver in same session', () => {
      const session = manager.createSession();
      const sender = manager.registerPeer(session.id, 'peer-1', 'sender');
      const receiver = manager.registerPeer(session.id, 'peer-2', 'receiver');

      expect(sender).toBeDefined();
      expect(receiver).toBeDefined();
    });

    it('returns undefined for non-existent session', () => {
      const peer = manager.registerPeer('non-existent', 'peer-1', 'sender');
      expect(peer).toBeUndefined();
    });
  });

  describe('getPeer', () => {
    it('returns peer by ID', () => {
      const session = manager.createSession();
      const peer = manager.registerPeer(session.id, 'peer-1', 'sender');
      const found = manager.getPeer(session.id, 'peer-1');

      expect(found).toBeDefined();
      expect(found?.id).toBe('peer-1');
    });

    it('returns undefined for non-existent peer', () => {
      const session = manager.createSession();
      const found = manager.getPeer(session.id, 'non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getOtherPeer', () => {
    it('returns the other peer in session', () => {
      const session = manager.createSession();
      manager.registerPeer(session.id, 'peer-1', 'sender');
      manager.registerPeer(session.id, 'peer-2', 'receiver');

      const other = manager.getOtherPeer(session.id, 'peer-1');
      expect(other?.id).toBe('peer-2');
    });

    it('returns undefined if only one peer', () => {
      const session = manager.createSession();
      manager.registerPeer(session.id, 'peer-1', 'sender');

      const other = manager.getOtherPeer(session.id, 'peer-1');
      expect(other).toBeUndefined();
    });
  });

  describe('updatePeerState', () => {
    it('updates peer state', () => {
      const session = manager.createSession();
      manager.registerPeer(session.id, 'peer-1', 'sender');

      const result = manager.updatePeerState(session.id, 'peer-1', 'connected');
      expect(result).toBe(true);

      const peer = manager.getPeer(session.id, 'peer-1');
      expect(peer?.state).toBe('connected');
    });

    it('returns false for non-existent peer', () => {
      const session = manager.createSession();
      const result = manager.updatePeerState(session.id, 'non-existent', 'connected');
      expect(result).toBe(false);
    });
  });

  describe('removePeer', () => {
    it('removes peer from session', () => {
      const session = manager.createSession();
      manager.registerPeer(session.id, 'peer-1', 'sender');

      const removed = manager.removePeer(session.id, 'peer-1');
      expect(removed).toBe(true);

      const peer = manager.getPeer(session.id, 'peer-1');
      expect(peer).toBeUndefined();
    });

    it('returns false for non-existent peer', () => {
      const session = manager.createSession();
      const removed = manager.removePeer(session.id, 'non-existent');
      expect(removed).toBe(false);
    });

    it('deletes session when last peer removed', () => {
      const session = manager.createSession();
      manager.registerPeer(session.id, 'peer-1', 'sender');
      manager.removePeer(session.id, 'peer-1');

      const found = manager.getSessionById(session.id);
      expect(found).toBeUndefined();
    });
  });

  describe('getIceConfig', () => {
    it('returns LAN config with empty iceServers', () => {
      const config = manager.getIceConfig();
      expect(config.iceServers).toEqual([]);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('removes expired sessions', () => {
      const session = manager.createSession();
      vi.useFakeTimers();
      vi.setSystemTime(session.expiresAt + 1000);

      const cleaned = manager.cleanupExpiredSessions();
      expect(cleaned).toBe(1);

      const found = manager.getSessionById(session.id);
      expect(found).toBeUndefined();

      vi.useRealTimers();
    });
  });
});