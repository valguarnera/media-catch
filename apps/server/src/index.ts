import { WebSocketServer, WebSocket } from 'ws';
import { SignalingHandler } from './signaling-handler.js';
import { SessionManager } from './session-manager.js';
import type { ServerConfig } from './types.js';

function getConfig(): ServerConfig {
  return {
    port: parseInt(process.env['PORT'] || '8080', 10),
    host: process.env['HOST'] || '0.0.0.0',
  };
}

class SignalingServer {
  private wss: WebSocketServer;
  private sessionManager: SessionManager;
  private signalingHandler: SignalingHandler;
  private config: ServerConfig;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: ServerConfig) {
    this.config = config;
    this.sessionManager = new SessionManager();
    this.signalingHandler = new SignalingHandler(this.sessionManager);
    this.wss = new WebSocketServer({ port: config.port, host: config.host });
  }

  start(): void {
    this.wss.on('listening', () => {
      console.log(`[Server] Signaling server listening on ${this.config.host}:${this.config.port}`);
      console.log(`[Server] WebSocket endpoint: ws://${this.config.host === '0.0.0.0' ? 'localhost' : this.config.host}:${this.config.port}`);
    });

    this.wss.on('connection', (ws: WebSocket) => {
      this.signalingHandler.handleConnection(ws);
    });

    this.wss.on('error', (error) => {
      console.error('[Server] WebSocket server error:', error.message);
    });

    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.sessionManager.cleanupExpiredSessions();
      if (cleaned > 0) {
        console.log(`[Server] Cleaned up ${cleaned} expired sessions`);
      }
    }, 60000);
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.signalingHandler.closeAllConnections();

    this.wss.close(() => {
      console.log('[Server] Signaling server stopped');
    });
  }

  getHealth(): { status: string; connections: number; sessions: number } {
    return {
      status: 'ok',
      connections: this.signalingHandler.getConnectedPeersCount(),
      sessions: this.signalingHandler.getSessionsCount(),
    };
  }
}

const config = getConfig();
const server = new SignalingServer(config);

server.start();

process.on('SIGINT', () => {
  console.log('[Server] Received SIGINT, shutting down...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Server] Received SIGTERM, shutting down...');
  server.stop();
  process.exit(0);
});

export { SignalingServer };
export type { ServerConfig } from './types.js';