# Phase 0 Summary — Environment Baseline

## Implementado en Phase 0

### Estructura del monorepo
```
media-catch/
├── .devcontainer/           # Configuración devcontainer (Node 24 + pnpm + docker-in-docker)
├── docs/                    # Documentación del proyecto
├── packages/
│   └── protocol/           # Paquete compartido de tipos (@media-catch/protocol)
├── scripts/                # Scripts de utilidad (generate-dev-cert.sh)
├── certs/                  # Certificados TLS para desarrollo LAN (gitignored)
├── package.json            # Root workspace con pnpm workspaces
├── pnpm-workspace.yaml     # Configuración workspaces: apps/*, packages/*
├── tsconfig.base.json      # TypeScript base estricto
└── .gitignore
```

### Arquitectura Host / Devcontainer / Certificados

**Host (Ubuntu):**
- `mkcert` instalado globalmente
- CA local en `~/.local/share/mkcert/rootCA.pem`
- Script `scripts/generate-dev-cert.sh` para generar certs con IP SAN
- Certificados en `certs/dev.pem` + `certs/dev-key.pem`

**Devcontainer:**
- Node.js 24 (LTS) via `node:24-bookworm`
- pnpm via feature `ghcr.io/devcontainers/features/pnpm:1`
- docker-in-docker via feature `ghcr.io/devcontainers/features/docker-in-docker:4.0.0`
- Mount read-only: `${localWorkspaceFolder}/certs` → `/workspace/certs`

**Android (una vez):**
- Instalar `rootCA.pem` via Settings → Security → Install from storage
- Nombre: `media-catch-dev`

### Decisiones tomadas

| Decisión | Motivo |
|----------|--------|
| pnpm workspaces sin Turborepo | Simplicidad inicial, evita optimización prematura |
| Solo `packages/protocol` compartido | YAGNI — extraer shared solo cuando haya duplicación real |
| `mkcert + IP SAN` para HTTPS LAN | Funciona offline, CA propia, sin depender de ngrok |
| `iceServers: []` para MVP LAN | Conexión directa en misma subred, STUN solo para Internet Mode |
| Session Code manual (6 chars) | Validar signaling + WebRTC primero, QR después |
| TypeScript estricto (`erasableSyntaxOnly`, `verbatimModuleSyntax`) | Calidad de tipos, catches errores temprano |

### Validaciones ejecutadas

| Validación | Comando | Resultado |
|------------|---------|-----------|
| pnpm install | `pnpm install` | ✅ PASS |
| TypeScript typecheck | `pnpm typecheck` | ✅ PASS |
| Build protocol | `pnpm build` | ✅ PASS |
| Workspace list | `pnpm ls -r` | ✅ PASS |
| Script syntax | `bash -n scripts/generate-dev-cert.sh` | ✅ PASS |
| pnpm version | `pnpm --version` | ✅ 9.15.0 |

### Pendientes de validación manual (requieren acción en HOST)

- [ ] `mkcert -install` — instalar CA local en host
- [ ] `./scripts/generate-dev-cert.sh` — generar certs iniciales para IP LAN actual
- [ ] Transferir `rootCA.pem` a Android e instalar
- [ ] Rebuild devcontainer en VS Code para activar feature pnpm y mount certs/

---

## Phase 1 — Protocol Package

### Implementado en Phase 1

#### Archivos nuevos
- `packages/protocol/src/media.ts` — Tipos `Stream`, `Track`, `MediaConstraints`, `MediaTrackSettings`, helpers `createStreamId`, `createTrackId`
- `packages/protocol/src/signaling.ts` — Tipos de mensaje WebSocket: `RegisterMessage`, `OfferMessage`, `AnswerMessage`, `IceCandidateMessage`, `CommandMessage`, `EventMessage`, `ErrorMessage`, `PingMessage`, `PongMessage`, union `SignalingMessage`, type guards

#### Archivos modificados
- `packages/protocol/src/index.ts` — Export barrel actualizado con `media` y `signaling`

#### Tipos implementados

**media.ts:**
- `MediaKind` — `'audio' | 'video'`
- `FacingMode` — `'user' | 'environment'`
- `MediaConstraints` / `MediaTrackConstraints` — compatibles con `getUserMedia()`
- `Stream` — stream multimedia con tracks, estado activo, timestamps
- `Track` — track individual con settings, constraints, facingMode
- `MediaTrackSettings` — configuración resuelta del track
- `StreamState` — estado agregado para UI
- Helpers: `createStreamId()`, `createTrackId()`

**signaling.ts:**
- `SignalingMessageType` — `'offer' | 'answer' | 'ice-candidate' | 'command' | 'event' | 'register' | 'register-ack' | 'error' | 'ping' | 'pong'`
- `BaseSignalingMessage` — campos comunes (type, sessionId, peerId, timestamp)
- Mensajes específicos: `RegisterMessage`, `RegisterAckMessage`, `OfferMessage`, `AnswerMessage`, `IceCandidateMessage`, `CommandMessage`, `EventMessage`, `ErrorMessage`, `PingMessage`, `PongMessage`
- `SignalingMessage` — union discriminada por `type`
- `isSignalingMessage()` — type guard
- `createSignalingMessage()` — factory type-safe

### Validaciones ejecutadas

| Validación | Resultado |
|------------|-----------|
| `pnpm typecheck` | ✅ PASS |
| `pnpm build` | ✅ PASS — genera `.d.ts`, `.js`, `.map` para 5 módulos |

### Qué NO se implementó (fuera de Phase 1)

- ❌ `apps/server` — Signaling server
- ❌ WebSocket server implementation
- ❌ `apps/receiver` — Web app
- ❌ `apps/sender` — PWA
- ❌ React UI / Vite setup
- ❌ WebRTC (`RTCPeerConnection`, `getUserMedia`)
- ❌ PWA / Service Worker / Manifest
- ❌ QR pairing
- ❌ STUN/TURN
- ❌ Internet mode
- ❌ Webhooks
- ❌ Tests

### Pendientes para Phase 2

1. Crear `apps/server` con `ws` (WebSocket server)
2. Implementar session manager en memoria
3. Manejo de mensajes de signaling (register, offer, answer, ice-candidate)
4. Health check endpoint
5. Logs estructurados