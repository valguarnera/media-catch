# Phase 1 Summary — Protocol Package

## Objetivo

Construir el contrato de comunicación compartido entre las futuras aplicaciones `server`, `receiver` y `sender` en `@media-catch/protocol`.

---

## Estructura creada

```
packages/protocol/
├── src/
│   ├── session.ts      # Session, Peer, Capability, IceConfig
│   ├── commands.ts     # Command types + factory
│   ├── events.ts       # Event types + factory
│   ├── media.ts        # Stream, Track, MediaConstraints
│   ├── signaling.ts    # SignalingMessage union + factories
│   └── index.ts        # Export barrel
├── package.json
└── tsconfig.json
```

---

## Responsabilidades de @media-catch/protocol

El paquete define **únicamente tipos y factories**. No contiene lógica de negocio, networking ni side effects.

### Session (`session.ts`)

```typescript
type SessionState = 'idle' | 'pairing' | 'connecting' | 'connected' | 'streaming' | 'paused' | 'disconnected' | 'error';
type PeerRole = 'sender' | 'receiver';

interface Capability {
  audio: boolean;
  video: boolean;
  facingModes: ('user' | 'environment')[];
}

interface Peer {
  id: string;
  role: PeerRole;
  sessionId: string;
  capabilities?: Capability;
  state: SessionState;
  connectedAt?: number;
}

interface Session {
  id: string;
  code: string;              // 6 chars alfanuméricos
  createdAt: number;
  expiresAt: number;
  peers: Map<string, Peer>;
  state: SessionState;
}

type IceConfig = { iceServers: RTCIceServer[] };

const ICE_CONFIG_LAN: IceConfig = { iceServers: [] };
const ICE_CONFIG_INTERNET: IceConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function generateSessionCode(): string;      // 6 chars: A-Z, 2-9
function isSessionExpired(session: Session): boolean;
const SESSION_TTL_MS = 10 * 60 * 1000;       // 10 min
```

### Peer / Capability

- `PeerRole`: `'sender' | 'receiver'`
- `Capability`: describe audio/video + facing modes disponibles
- `Peer`: identidad, rol, sesión, capacidades, estado, timestamp de conexión

### Command (`commands.ts`)

```typescript
type CommandType =
  | 'connect' | 'disconnect'
  | 'start-stream' | 'stop-stream'
  | 'switch-camera' | 'mute-audio' | 'unmute-audio'
  | 'ping';

interface BaseCommand { type: CommandType; sessionId: string; peerId: string; timestamp: number; }

// Cada comando extiende BaseCommand con payload tipado
type Command = ConnectCommand | DisconnectCommand | StartStreamCommand | ...;

function createCommand<T extends CommandType>(type, sessionId, peerId, payload): Command;
```

### Event (`events.ts`)

```typescript
type EventType =
  | 'session.created' | 'session.expired'
  | 'peer.connected' | 'peer.disconnected' | 'peer.stateChanged'
  | 'stream.started' | 'stream.stopped' | 'stream.trackAdded' | 'stream.trackRemoved'
  | 'camera.changed' | 'audio.muted' | 'audio.unmuted'
  | 'error.occurred'
  | 'ice.candidate' | 'ice.connectionStateChanged'
  | 'signaling.connected' | 'signaling.disconnected';

interface BaseEvent { type: EventType; sessionId: string; peerId: string; timestamp: number; }

// Cada evento extiende BaseEvent con payload tipado
type Event = SessionCreatedEvent | PeerConnectedEvent | ...;

function createEvent<T extends EventType>(type, sessionId, peerId, payload): Event;
```

### Media (`media.ts`)

```typescript
type MediaKind = 'audio' | 'video';
type FacingMode = 'user' | 'environment';

interface MediaConstraints {
  audio: boolean | MediaTrackConstraints;
  video: boolean | MediaTrackConstraints;
}

interface Stream {
  id: string;
  sessionId: string;
  peerId: string;
  kind: MediaKind;
  tracks: Track[];
  active: boolean;
  createdAt: number;
}

interface Track {
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

function createStreamId(): string;
function createTrackId(kind: MediaKind): string;
```

### Signaling (`signaling.ts`)

```typescript
type SignalingMessageType =
  | 'offer' | 'answer' | 'ice-candidate'
  | 'command' | 'event'
  | 'register' | 'register-ack' | 'error'
  | 'ping' | 'pong';

interface BaseSignalingMessage {
  type: SignalingMessageType;
  sessionId: string;
  peerId: string;
  timestamp: number;
}

// Mensajes específicos con payload tipado
type SignalingMessage =
  | RegisterMessage | RegisterAckMessage
  | OfferMessage | AnswerMessage
  | IceCandidateMessage
  | CommandMessage | EventMessage | ErrorMessage
  | PingMessage | PongMessage;

// Type guard
function isSignalingMessage(msg: unknown): msg is SignalingMessage;

// Factory functions (reemplazan createSignalingMessage genérico)
function createRegisterMessage(sessionId, peerId, payload): RegisterMessage;
function createRegisterAckMessage(sessionId, peerId, payload): RegisterAckMessage;
function createOfferMessage(sessionId, peerId, payload): OfferMessage;
function createAnswerMessage(sessionId, peerId, payload): AnswerMessage;
function createIceCandidateMessage(sessionId, peerId, payload): IceCandidateMessage;
function createCommandMessage(sessionId, peerId, payload): CommandMessage;
function createEventMessage(sessionId, peerId, payload): EventMessage;
function createErrorMessage(sessionId, peerId, payload): ErrorMessage;
function createPingMessage(sessionId, peerId): PingMessage;
function createPongMessage(sessionId, peerId): PongMessage;
```

---

## Decisiones técnicas clave

### 1. Union discriminada por `type`

Todos los mensajes (Command, Event, SignalingMessage) usan discriminación por campo `type` literal. Esto permite type narrowing seguro en TypeScript.

### 2. Factory functions vs constructor genérico

Phase 1 usó `createSignalingMessage<T>(type, ...)` con conditional types. En Phase 2 se migró a factories específicas (`createOfferMessage`, `createRegisterMessage`, etc.) por:

- Mejor inferencia de tipos en handlers
- Evitar conditional types complejos
- Código más legible y mantenible

### 3. Imports con extensiones `.js` en source

```typescript
// src/index.ts
export * from './session.js';
export * from './commands.js';
// ...
```

Requerido por Node ESM nativo con `verbatimModuleSyntax: true`. TypeScript preserva las extensiones en el output.

### 4. Exports hacia `dist/`

`package.json` configurado con:

```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

### 5. Types vs Runtime values

- **Types** (interfaces, type aliases): solo existen en `.d.ts`
- **Values** (constantes, factory functions): existen en `.js` + `.d.ts`
- Tests de consumo validan solo valores runtime

---

## Validaciones realizadas

| Validación | Comando | Resultado |
|------------|---------|-----------|
| TypeScript typecheck | `pnpm typecheck` | ✅ PASS |
| Build | `pnpm build` | ✅ PASS — 5 módulos (session, commands, events, media, signaling) |
| Consumo package | `import from '@media-catch/protocol'` | ✅ PASS |
| Factory functions | `create*Message`, `createStreamId`, etc. | ✅ PASS |
| Type guards | `isSignalingMessage` | ✅ PASS |
| Constantes exportadas | `ICE_CONFIG_LAN`, `SESSION_TTL_MS` | ✅ PASS |

---

## Qué NO se implementó

- ❌ `apps/server` — Signaling server
- ❌ WebSocket server implementation
- ❌ `apps/receiver` — Web app
- ❌ `apps/sender` — PWA
- ❌ React UI / Vite setup
- ❌ WebRTC (`RTCPeerConnection`, `getUserMedia`)
- ❌ PWA / Service Worker / Manifest
- ❌ QR pairing
- ❌ STUN / TURN
- ❌ Internet mode
- ❌ Webhooks
- ❌ Tests

---

## Qué habilitó para Phase 2

El protocolo completo permitió implementar el Signaling Server con:

- Type safety end-to-end
- Factories para crear mensajes válidos
- Type guards para validación en runtime
- Contrato compartido sin duplicación