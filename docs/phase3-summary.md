# Phase 3 Summary — Receiver Web App

## Objetivo

Implementar la aplicación web Receiver (apps/receiver) usando Vite + React + TypeScript, capaz de:

1. Conectarse al signaling server vía WebSocket
2. Registrarse como `receiver`
3. Obtener y mostrar un código de sesión de 6 caracteres
4. Esperar al Sender
5. Recibir una `offer` SDP
6. Crear y configurar `RTCPeerConnection` con `iceServers: []`
7. Aplicar remote description
8. Crear y enviar `answer` SDP
9. Intercambiar candidatos ICE
10. Recibir tracks vía `ontrack`
11. Reproducir video/audio recibidos
12. Mostrar estados básicos de conexión

---

## Arquitectura implementada

```
apps/receiver/
├── src/
│   ├── main.tsx                    # Entry point React
│   ├── App.tsx                     # Componente principal
│   ├── types.ts                    # Tipos locales + re-exports del protocol
│   ├── hooks/
│   │   └── useReceiver.ts          # Hook principal de lógica del Receiver
│   ├── services/
│   │   ├── signaling.ts            # Servicio WebSocket + signaling
│   │   └── webrtc.ts               # Servicio WebRTC (RTCPeerConnection)
│   ├── components/
│   │   ├── ConnectionStatus.tsx    # UI: estado conexión + código sesión
│   │   └── VideoPlayer.tsx         # UI: video/audio recibido
│   └── test/
│       ├── setup.ts                # Configuración Vitest + mocks globales
│       ├── signaling.test.ts       # Tests SignalingService (5)
│       ├── webrtc.test.ts          # Tests WebRTCService (9)
│       ├── ConnectionStatus.test.tsx
│       └── VideoPlayer.test.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

### Separación de responsabilidades

| Capa | Responsabilidad |
|------|-----------------|
| **UI (React)** | Renderizado, estado visual, interacción usuario |
| **Hook `useReceiver`** | Orquestación: ciclo de vida, coordinación signaling ↔ WebRTC |
| **SignalingService** | WebSocket, protocolo de mensajería, reconexión |
| **WebRTCService** | RTCPeerConnection, SDP, ICE, tracks multimedia |
| **@media-catch/protocol** | Tipos y factories de mensajes (single source of truth) |

---

## Flujo WebSocket → WebRTC

```text
1. useReceiver.initialize()
       │
       ▼
2. WebRTCService.initialize() → new RTCPeerConnection({ iceServers: [] })
       │
       ▼
3. SignalingService.connect() → WebSocket a ws://localhost:8080
       │
       ▼
4. onopen → SignalingService.register({ role: 'receiver', capabilities })
       │
       ▼
5. Server responde register-ack → sessionCode (ej: ABC123)
       │
       ▼
6. UI muestra: "CÓDIGO DE SESIÓN: ABC123" + "Esperando al Sender..."
       │
       ▼
7. Sender se conecta → Server envía event peer.connected
       │
       ▼
8. SignalingService emite 'peer-connected' → useReceiver actualiza estado
       │
       ▼
9. Sender envía offer → Server reenvía al Receiver
       │
       ▼
10. SignalingService emite 'offer-received'
       │
       ▼
11. useReceiver → WebRTCService.setRemoteOffer(sdp)
       │
       ▼
12. WebRTCService.createAnswer() → setLocalDescription(answer)
       │
       ▼
13. SignalingService.sendAnswer(answer.sdp)
       │
       ▼
14. ICE candidates intercambiados (onicecandidate ↔ addIceCandidate)
       │
       ▼
15. ConnectionState: 'connected'
       │
       ▼
16. ontrack → MediaStream → VideoPlayer reproduce video + audio
```

---

## Archivos creados

### Configuración
- `apps/receiver/package.json` — Dependencias: react, react-dom, @media-catch/protocol, vite, vitest, testing-library
- `apps/receiver/tsconfig.json` — Extiende tsconfig.base.json, project reference a protocol
- `apps/receiver/vite.config.ts` — Vite + React plugin, puerto 5173, **HTTPS automático si existen certs en `../../certs/`**
- `apps/receiver/vitest.config.ts` — jsdom, globals, setupFiles
- `apps/receiver/index.html` — HTML minimal, CSP-friendly, viewport mobile

### Tipos (`src/types.ts`)
- `ConnectionState`: `'disconnected' | 'connecting' | 'registering' | 'waiting-for-sender' | 'connecting-webrtc' | 'connected' | 'error'`
- `ReceiverState`: estado completo del Receiver
- `SignalingConfig`, `WebRTCConfig`
- `ReceiverEvent`: union discriminada para eventos internos (incluye `offer-received`, `answer-received`, `ice-candidate-received`, `ice-candidate`, etc.)
- Re-exports de `@media-catch/protocol`
- `ImportMetaEnv` declaration para `VITE_SIGNALING_WS_URL`

### Servicios

#### `SignalingService` (`src/services/signaling.ts`)
- Conexión WebSocket con reconexión automática (backoff exponencial)
- Cola de mensajes pendientes si WebSocket no está abierto
- Manejo de mensajes: `register`, `register-ack`, `offer`, `answer`, `ice-candidate`, `event`, `error`, `ping/pong`
- Emite `ReceiverEvent` para que el hook reaccione
- Métodos: `connect()`, `register()`, `sendAnswer()`, `sendIceCandidate()`, `disconnect()`, `onEvent()`

#### `WebRTCService` (`src/services/webrtc.ts`)
- `RTCPeerConnection` con `iceServers: []` (MVP LAN)
- Handlers: `onicecandidate`, `ontrack`, `onconnectionstatechange`
- Métodos: `initialize()`, `createOffer()`, `setRemoteOffer()`, `createAnswer()`, `setRemoteAnswer()`, `addIceCandidate()`, `getRemoteStream()`, `close()`, `onEvent()`

### Hook principal

#### `useReceiver` (`src/hooks/useReceiver.ts`)
- Estado: `ReceiverState` completo
- Inicializa SignalingService + WebRTCService
- Coordena flujo: registro → espera sender → oferta → respuesta → ICE → tracks
- Maneja reconexión WebRTC si sender se desconecta
- Expone: `state`, `initialize()`, `disconnect()`, `retry()`, `remoteStream`

### Componentes UI

#### `ConnectionStatus` (`src/components/ConnectionStatus.tsx`)
- Estado de conexión con colores semánticos:
  - Gris: disconnected
  - Naranja: connecting/registering/connecting-webrtc
  - Azul: waiting-for-sender
  - Verde: connected
  - Rojo: error
- Código de sesión grande (monospace, 2.5rem, letter-spacing)
- Indicador visual de sender detectado / streaming activo
- Mensaje de error amigable

#### `VideoPlayer` (`src/components/VideoPlayer.tsx`)
- Placeholder animado mientras no hay stream
- `<video>` + `<audio>` con `autoPlay` + `playsInline`
- `object-fit: contain` para mantener aspect ratio
- Manejo de errores de `play()` (autoplay policy)

#### `App` (`src/App.tsx`)
- Layout clásico: header → main (status + video + controls) → footer
- Botones contextuales:
  - "Desconectar" (conectado)
  - "Reintentar" (error)
  - "Desconectar" disabled (otros estados)
- Tema oscuro (#1a1a2e), tipografía system UI

---

## Decisiones técnicas

| Decisión | Justificación |
|----------|---------------|
| `iceServers: []` | MVP LAN-only, STUN/TURN en Phase 8 |
| WebSocket nativo (no socket.io) | Simplicidad, protocolo propio binario/JSON |
| Reconexión con backoff | Resiliencia en LAN inestable |
| Cola de mensajes pendientes | Evita pérdida si register llega antes de onopen |
| `RTCPeerConnection` en servicio separado | Separación WebRTC ≠ Signaling, testeable |
| `useReceiver` hook único | Encapsula toda la lógica, API simple para UI |
| Tipos estrictos + `verbatimModuleSyntax` | Consistencia con resto del monorepo |
| Reutiliza `@media-catch/protocol` | Single source of truth, no duplicación |
| UI minimalista, sin CSS frameworks | Zero dependencies, control total, 159 kB gzipped |
| Sin PWA/Service Worker | Exclusivo Phase 6 |
| Sin QR | Exclusivo Phase 7 |
| Sin controles avanzados (switch-camera, mute) | Exclusivo Phase 5 |

---

## Pruebas realizadas

### TypeScript typecheck
```bash
pnpm typecheck
# ✅ PASS (protocol + server + receiver)
```

### Build
```bash
pnpm build
# ✅ PASS - 38 módulos transformados, 159 kB gzipped
```

### Tests unitarios / integración

| Suite | Tests | Estado |
|-------|-------|--------|
| `signaling.test.ts` | 5 | ✅ PASS |
| `webrtc.test.ts` | 9 | ✅ PASS |
| `ConnectionStatus.test.tsx` | 6 | ✅ PASS |
| `VideoPlayer.test.tsx` | 3 | ✅ PASS |
| **Total receiver** | **23** | ✅ PASS |
| **Server (existentes)** | **36** | ✅ PASS |
| **Protocol (existentes)** | 0 | N/A |

### Validación manual (requerida para WebRTC real)

```bash
# 1. Terminal 1: Iniciar signaling server
pnpm --filter=@media-catch/server dev
# → [Server] Signaling server listening on 0.0.0.0:8080

# 2. Terminal 2: Iniciar receiver (dev mode)
pnpm --filter=@media-catch/receiver dev
# → VITE v6.x ready in xxx ms
# → Local: http://localhost:5173

# 3. Navegador: Abrir http://localhost:5173
#    - Debe mostrar "MEDIA-CATCH RECEIVER"
#    - Código de sesión: ABC123 (6 chars alfanuméricos)
#    - Estado: "Esperando al Sender..."

# 4. Terminal 3: Simular sender (script temporal)
node --input-type=module -e "
import { WebSocket } from 'ws';
import { createRegisterMessage, createOfferMessage } from '@media-catch/protocol';

const ws = new WebSocket('ws://127.0.0.1:8080');
ws.on('open', () => {
  // Registrar sender en misma sesión
  ws.send(JSON.stringify(createRegisterMessage('', '', {
    role: 'sender',
    sessionCode: 'ABC123',  // Usar código mostrado en receiver
    capabilities: { audio: true, video: true, facingModes: ['user'] }
  }));
});
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('Recibido:', msg.type);
  if (msg.type === 'register-ack') {
    // Enviar offer dummy
    const offer = createOfferMessage(msg.payload.sessionId, msg.payload.peerId, {
      sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=msid-semantic: WMS\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:test\r\na=ice-pwd:test\r\na=mid:0\r\na=sendrecv\r\na=rtpmap:96 VP8/90000\r\n',
      streams: []
    });
    ws.send(JSON.stringify(offer));
  }
});
"

# 5. Verificar en receiver:
#    - Estado cambia a "Conectando WebRTC..." → "Conectado"
#    - Video placeholder desaparece, aparece video negro (stream dummy)
#    - Console: track-received event
```

> **Nota:** El test manual completo requiere un Sender real (Phase 4) con `getUserMedia()`. El script anterior solo valida el flujo de signaling + SDP exchange.

---

## Limitaciones conocidas

1. **Solo LAN** — `iceServers: []` requiere misma subred, sin NAT traversal
2. **Un sender por sesión** — El server rechaza roles duplicados
3. **Sin reconexión WebRTC automática** — Si ICE falla, requiere reload manual
4. **Autoplay policy** — Navegadores pueden bloquear `video.play()` sin interacción usuario
5. **HTTPS en dev** — Se habilita automáticamente si existen `certs/dev.pem` y `certs/dev-key.pem` (generados con `pnpm cert:dev`). Sin certs, corre en HTTP para desarrollo local.
6. **Un solo stream** — Arquitectura preparada para múltiples tracks pero UI muestra uno
7. **Sin métricas/estadísticas** — `getStats()` no implementado

---

## Prueba manual completa (LAN real)

### Requisitos previos
- Host con `mkcert` instalado y CA configurada
- Certificados generados: `pnpm cert:dev`
- Dispositivo móvil en misma WiFi con CA instalada

### Pasos
```bash
# Terminal 1: Signaling server
pnpm --filter=@media-catch/server dev

# Terminal 2: Receiver (HTTPS automático si certs existen)
cd apps/receiver
npx vite --host 0.0.0.0 --port 5173

# Terminal 3: Sender (cuando exista Phase 4)
# Similar con puerto 5174

# En móvil: https://<IP-LAN>:5173
# En desktop: https://<IP-LAN>:5174
# 1. Receiver muestra código
# 2. Sender escanea/ingresa código (Phase 7)
# 3. Conexión WebRTC establecida
# 4. Video/audio fluye sender → receiver
```

---

## Estado final Phase 3

| Componente | Estado |
|------------|--------|
| `apps/receiver` package | ✅ Completo |
| Vite + React + TS config | ✅ Completo |
| SignalingService | ✅ Completo + tests |
| WebRTCService | ✅ Completo + tests |
| useReceiver hook | ✅ Completo |
| ConnectionStatus UI | ✅ Completo + tests |
| VideoPlayer UI | ✅ Completo + tests |
| App principal | ✅ Completo |
| TypeScript strict | ✅ PASS |
| Build producción | ✅ PASS |
| Tests (23 receiver + 36 server) | ✅ 59 PASS |
| Documentación | ✅ Esta página |

---

## Qué NO se implementó (fuera de Phase 3)

- ❌ `apps/sender` — Phase 4
- ❌ `getUserMedia()` cámara/micrófono — Phase 4
- ❌ Controles: switch-camera, mute-audio — Phase 5
- ❌ PWA / Service Worker / Manifest — Phase 6
- ❌ QR pairing — Phase 7
- ❌ STUN/TURN / Internet Mode — Phase 8
- ❌ Persistencia de sesiones / Redis
- ❌ Autenticación / usuarios
- ❌ Métricas WebRTC (bitrate, rtt, packet loss)

---

## Próximos pasos (Phase 4)

1. Crear `apps/sender` con Vite + React + TS
2. Implementar `getUserMedia()` con constraints de audio/video
3. UI: preview cámara local, selector facingMode
4. Signaling: registrar como `sender`, enviar `offer`
5. WebRTC: crear offer, manejar answer, ICE
6. Tests de integración sender ↔ receiver
7. Documentar en `docs/phase4-summary.md`