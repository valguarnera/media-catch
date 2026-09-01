# Media-Catch

Sistema para conectar un dispositivo **Sender** y un **Receiver** dentro de una red LAN para establecer comunicación multimedia mediante WebRTC.

> **Estado actual:** El proyecto tiene la infraestructura, el protocolo compartido y el signaling server implementados. El streaming multimedia pertenece a fases posteriores.

---

## Estado actual

```text
MEDIA-CATCH

Phase 0  ██████████  Environment Baseline     ✅
Phase 1  ██████████  Protocol Package         ✅
Phase 2  ██████████  Signaling Server         ✅
Phase 3  ██████████  Receiver Web App         ✅ AUDITADO

Phase 4  ░░░░░░░░░░  Sender Web App           ← SIGUE
Phase 5  ░░░░░░░░░░  Integración LAN
Phase 6  ░░░░░░░░░░  PWA / Installability
Phase 7  ░░░░░░░░░░  QR Pairing
Phase 8  ░░░░░░░░░░  Internet Mode
```

El progreso histórico se documenta en:

```text
docs/phase0-summary.md
docs/phase1-summary.md
docs/phase2-summary.md
```

---

## Arquitectura actual

```
                    @media-catch/protocol
                           │
                           │ contrato compartido
                           ▼
                    Signaling Server
                           │
                       WebSocket
                           │
              ┌────────────┴────────────┐
              │                         │
           Sender                    Receiver
         Phase 4                    Phase 3
```

> **Nota:** Sender y Receiver todavía no están implementados (fases 4 y 3 respectivamente).

---

## Estructura del proyecto

```text
media-catch/
├── apps/
│   └── server/
├── packages/
│   └── protocol/
├── docs/
├── scripts/
├── certs/
└── .devcontainer/
```

---

## Requisitos

### Host (Ubuntu/Linux)
- `mkcert` instalado globalmente
- `pnpm` (gestión de workspaces)
- `git`, `bash`

### Devcontainer
- Node.js 24 LTS (via `node:24-bookworm`)
- `pnpm` (via feature `ghcr.io/devcontainers/features/pnpm:1`)
- `docker-in-docker` (via feature `ghcr.io/devcontainers/features/docker-in-docker:4.0.0`)

### Android (para pruebas futuras de cámara/media)
- Chrome / navegador compatible con `getUserMedia()`
- Instalación de CA local (`rootCA.pem`) una sola vez

> **Separación Host / Devcontainer:**
> - **Host**: `mkcert`, CA local, generación de certificados, scripts de certs
> - **Devcontainer**: runtime Node.js, pnpm, dependencias, Vite, código de la aplicación
> - Los certificados se montan read-only: `${localWorkspaceFolder}/certs` → `/workspace/certs`

---

## Instalación y uso

### 1. Host — Certificados HTTPS LAN

```bash
# Instalar mkcert (una vez)
sudo apt update && sudo apt install -y libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Instalar CA local en el sistema
mkcert -install

# Generar certificados para IP LAN actual
./scripts/generate-dev-cert.sh

# Transferir rootCA.pem a Android e instalar (una vez)
# Settings → Security → Install from storage → rootCA.pem
```

### 2. Dependencias

```bash
pnpm install
```

### 3. Desarrollo — Signaling Server

```bash
# Iniciar en modo desarrollo (con tsx + watch)
pnpm --filter=@media-catch/server dev

# O compilar y ejecutar
pnpm --filter=@media-catch/server build
pnpm --filter=@media-catch/server start
```

El servidor escucha por defecto en `ws://0.0.0.0:8080`.

Variables de entorno:
- `PORT` — puerto WebSocket (default: 8080)
- `HOST` — host binding (default: 0.0.0.0)

### 4. Validación

```bash
# TypeScript typecheck
pnpm typecheck

# Build completo
pnpm build

# Tests (protocol + server)
pnpm --filter=@media-catch/protocol test
pnpm --filter=@media-catch/server test
```

---

## Cómo probar actualmente Media-Catch

```text
┌─────────────────────────────┐
│         MEDIA-CATCH         │
│                             │
│     SIGNALING SERVER        │
│                             │
│       Status: Running       │
│                             │
│       Waiting for peers...  │
│                             │
└─────────────────────────────┘
```

### 1. Iniciar el servidor

```bash
pnpm --filter=@media-catch/server dev
```

Salida esperada:
```
[Server] Signaling server listening on 0.0.0.0:8080
[Server] WebSocket endpoint: ws://localhost:8080
```

### 2. Verificar que está ejecutándose

```bash
# Test rápido de conexión WebSocket
node --input-type=module -e "
import { WebSocket } from 'ws';
import { createRegisterMessage } from '@media-catch/protocol';

const ws = new WebSocket('ws://127.0.0.1:8080');
ws.on('open', () => {
  console.log('Connected');
  ws.send(JSON.stringify(createRegisterMessage('', '', { role: 'receiver' })));
});
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('Received:', msg.type);
  if (msg.type === 'register-ack') {
    console.log('Session code:', msg.payload.session.code);
    ws.close();
  }
});
ws.on('close', () => console.log('Closed'));
"
```

### 3. Ejecutar tests

```bash
# Tests unitarios + integración
pnpm --filter=@media-catch/server test

# Solo protocolo
pnpm --filter=@media-catch/protocol test
```

### 4. Comportamiento WebSocket probado

| Mensaje | Estado |
|---------|--------|
| `register` (sender/receiver) | ✅ Funciona |
| `register-ack` con session code | ✅ Funciona |
| `offer` / `answer` / `ice-candidate` | ✅ Forward correcto |
| `command` (switch-camera, mute-audio, etc.) | ✅ Forward correcto |
| `event` (peer.connected, peer.disconnected) | ✅ Forward correcto |
| `ping` → `pong` | ✅ Funciona |
| Limpieza al desconectar | ✅ Funciona |
| Rechazo mensajes sin registro | ✅ Funciona |

---

## Qué funciona actualmente

- ✅ Monorepo pnpm workspaces
- ✅ TypeScript estricto (`verbatimModuleSyntax`, `erasableSyntaxOnly`)
- ✅ HTTPS LAN infrastructure (mkcert + IP SAN)
- ✅ Certificados mkcert con IP SAN
- ✅ Protocolo compartido (`@media-catch/protocol`)
- ✅ Signaling Server WebSocket (`ws`)
- ✅ Sesiones en memoria con TTL 10 min
- ✅ Registro de sender / receiver
- ✅ Routing de offer / answer / ice-candidate
- ✅ Routing de command / event
- ✅ Ping / pong
- ✅ Limpieza al desconectar
- ✅ Tests unitarios (22)
- ✅ Tests de integración WebSocket (14)

---

## Qué todavía no funciona

- ❌ Receiver UI (Phase 3)
- ❌ Sender UI (Phase 4)
- ❌ Cámara (`getUserMedia()`)
- ❌ Micrófono (`getUserMedia()`)
- ❌ WebRTC real (`RTCPeerConnection`)
- ❌ Streaming audio/video
- ❌ PWA / Service Worker / Manifest
- ❌ Instalación offline
- ❌ QR pairing
- ❌ STUN / TURN
- ❌ Internet Mode

---

## Documentación

```text
README.md                    ← estado actual y cómo usar el proyecto

docs/
├── https-dev.md             ← HTTPS LAN setup
├── phase0-summary.md        ← historia Phase 0
├── phase1-summary.md        ← historia Phase 1
├── phase2-summary.md        ← historia Phase 2
```