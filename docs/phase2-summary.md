# Phase 2 Summary — Signaling Server

## Implementado en Phase 2

### Archivos creados
- `apps/server/package.json` — Configuración del servidor con dependencias
- `apps/server/tsconfig.json` — Configuración TypeScript con project reference
- `apps/server/vitest.config.ts` — Configuración de tests
- `apps/server/src/types.ts` — Tipos de configuración del servidor
- `apps/server/src/session-manager.ts` — Gestor de sesiones en memoria
- `apps/server/src/signaling-handler.ts` — Manejador de mensajes WebSocket
- `apps/server/src/index.ts` — Punto de entrada del servidor
- `apps/server/src/session-manager.test.ts` — Tests unitarios (22 tests)
- `apps/server/src/signaling-server.test.ts` — Tests de integración (14 tests)

### Arquitectura implementada

```
apps/server
├── src/
│   ├── types.ts           # ServerConfig
│   ├── session-manager.ts # SessionManager (Map-based, in-memory)
│   ├── signaling-handler.ts # SignalingHandler (WebSocket routing)
│   └── index.ts           # SignalingServer entry point
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Responsabilidades del Signaling Server

1. **Conexiones WebSocket** — Acepta conexiones en puerto configurable (default 8080)
2. **Registro de peers** — `register` message con role `sender`/`receiver` + capabilities
3. **Session management** — Crea sesiones con código de 6 chars, TTL 10 min
4. **Routing de signaling** — Reenvía `offer`, `answer`, `ice-candidate`, `command`, `event`
5. **Health check** — Método interno `getHealth()` que retorna `{ status, connections, sessions }` (no es endpoint HTTP)
6. **Logging** — Conexiones, registros, routing, errores
7. **Limpieza** — TTL de sesiones, limpieza al desconectar

### Contrato de mensajes (desde @media-catch/protocol)

| Tipo | Dirección | Descripción |
|------|-----------|-------------|
| `register` | Client → Server | Registro de peer con role + capabilities |
| `register-ack` | Server → Client | Confirmación con sessionId, peerId, session, iceConfig |
| `offer` | Sender → Server → Receiver | SDP offer |
| `answer` | Receiver → Server → Sender | SDP answer |
| `ice-candidate` | Peer → Server → Other Peer | ICE candidate |
| `command` | Peer → Server → Other Peer | switch-camera, mute-audio, etc. |
| `event` | Peer → Server → Other Peer | peer.connected, peer.disconnected, etc. |
| `ping`/`pong` | Bidireccional | Heartbeat |
| `error` | Server → Client | Errores de protocolo |

### Configuración

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | 8080 | Puerto WebSocket |
| `HOST` | 0.0.0.0 | Host binding |

### Inicio del servidor

```bash
# Desarrollo
pnpm --filter=@media-catch/server dev

# Producción
pnpm --filter=@media-catch/server build
pnpm --filter=@media-catch/server start
```

### Validaciones ejecutadas

| Validación | Comando | Resultado |
|------------|---------|-----------|
| TypeScript typecheck | `pnpm typecheck` | ✅ PASS |
| Build | `pnpm build` | ✅ PASS |
| Tests unitarios | `pnpm --filter=@media-catch/server test` | ✅ 22/22 PASS |
| Tests de integración | `pnpm --filter=@media-catch/server test` | ✅ 14/14 PASS |
| Server startup manual | `pnpm --filter=@media-catch/server start` | ✅ PASS |
| WebSocket connection test | Manual test script | ✅ PASS |

### Tests implementados

**SessionManager (22 tests):**
- Crear sesión, obtener por ID/código
- Registrar peer (sender/receiver), rechazar role duplicado
- Obtener peer, getOtherPeer
- Actualizar estado peer
- Remover peer, eliminar sesión vacía
- getIceConfig (LAN)
- Cleanup sesiones expiradas

**SignalingServer Integration (14 tests):**
- Conexión WebSocket aceptada
- Rechazo JSON inválido
- Rechazo tipo de mensaje desconocido (tras registro)
- Registro receiver/sender con session code
- Rechazo role duplicado en misma sesión
- Pairing sender + receiver
- Forward offer (sender → receiver)
- Forward answer (receiver → sender)
- Forward ice-candidate
- Forward command (switch-camera)
- Ping → pong
- Cleanup sesión al desconectar
- Rechazo mensajes sin registro

### Dependencias agregadas

| Package | Versión | Tipo |
|---------|---------|------|
| `ws` | 8.18.0 | Runtime |
| `@types/ws` | 8.5.13 | Dev |
| `@types/node` | 22.10.0 | Dev |
| `typescript` | 7.0.0 | Dev |
| `tsx` | 4.19.0 | Dev |
| `vitest` | 3.0.0 | Dev |

> **Nota sobre @types/node 22.10.0:** El devcontainer usa Node.js 24.20.0 (LTS). @types/node 22.x es compatible hacia atrás con Node 24 para los APIs utilizados (fs, path, process, timers). No se observaron problemas de tipos en la validación. Si surgen incompatibilidades futuras, actualizar a @types/node 24.x.

### Cambios realizados en @media-catch/protocol durante Phase 2

Durante la implementación del Signaling Server, se realizaron los siguientes cambios en `@media-catch/protocol`:

| Cambio | Archivo | Motivo |
|--------|---------|--------|
| Agregadas factory functions `create*Message` (`createRegisterMessage`, `createOfferMessage`, `createAnswerMessage`, `createIceCandidateMessage`, `createCommandMessage`, `createEventMessage`, `createErrorMessage`, `createPingMessage`, `createPongMessage`, `createRegisterAckMessage`) | `signaling.ts` | Reemplaza `createSignalingMessage` genérico para mejor type inference y evitar conditional types complejos en handlers del servidor |
| Exports con extensiones `.js` | `index.ts` | Requerido por Node ESM nativo con `verbatimModuleSyntax: true` |
| `createSignalingMessage` genérico eliminado | `signaling.ts` | Reemplazado por factories específicas para mejor type inference |

> **No se modificaron tipos de datos existentes** (Session, Peer, Command, Event, Media, Stream, Track, IceConfig, Capability, etc.).

### Qué NO se implementó

- ❌ `apps/receiver` — Web app
- ❌ `apps/sender` — PWA
- ❌ React UI / Vite setup
- ❌ WebRTC (`RTCPeerConnection`, `getUserMedia`)
- ❌ Captura de cámara/audio
- ❌ Streaming real
- ❌ PWA / Service Worker / Manifest
- ❌ QR pairing
- ❌ STUN/TURN
- ❌ Internet Mode
- ❌ Base de datos / Redis
- ❌ Autenticación de usuarios
- ❌ Persistencia de sesiones
- ❌ API REST completa

### Roadmap corregido

| Fase | Objetivo | PWA | QR |
|------|----------|-----|-----|
| Phase 3 | Receiver Web App | ❌ | ❌ |
| Phase 4 | Sender Web App | ❌ | ❌ |
| Phase 5 | LAN Integration | ❌ | ❌ |
| Phase 6 | PWA / Installability | ✅ | ❌ |
| Phase 7 | QR Pairing | ✅ | ✅ |
| Phase 8 | Internet Mode | ✅ | ✅ |

> **Regla:** PWA (Service Worker, Manifest, `vite-plugin-pwa`) → Phase 6 exclusivamente. QR pairing (`qrcode`, `html5-qrcode`) → Phase 7 exclusivamente.

### Pendientes para Phase 3

1. Crear `apps/receiver` con Vite + React + TypeScript
2. Implementar UI: generar session code (6 chars, **manual** — sin QR)
3. WebRTC `RTCPeerConnection` con `iceServers: []`
4. Manejo `ontrack` → render `<video>` + `<audio>`
4. Controles básicos: disconnect, toggle audio/video
5. Integración completa LAN: receiver → session code → sender → stream