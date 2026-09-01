# HTTPS Development Setup (LAN)

Este documento describe cómo configurar HTTPS para desarrollo local en LAN, permitiendo que dispositivos móviles accedan a la aplicación mediante IP local con certificados válidos.

## Arquitectura

```
Host (Ubuntu)
├── mkcert (instalado en host)
├── Local CA (~/.local/share/mkcert/rootCA.pem)
├── certs/
│   ├── dev.pem          # certificado actual IP LAN
│   └── dev-key.pem      # clave privada
└── scripts/
    └── generate-dev-cert.sh

Devcontainer
├── Node.js 24
├── pnpm
├── dependencies
├── Vite dev server (HTTPS)
└── Monta certs/ como read-only
    /workspace/certs → /workspace/certs (bind mount)
```

## Requisitos previos

### En el Host (Ubuntu/Linux)

```bash
# Instalar mkcert
sudo apt update && sudo apt install -y libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Instalar CA local en el sistema
mkcert -install
```

### En Android (una sola vez)

1. Transferir `rootCA.pem` al dispositivo:
   ```bash
   # La CA se encuentra en:
   $(mkcert -CAROOT)/rootCA.pem
   ```

2. En Android:
   - Settings → Security → Install from storage
   - Seleccionar `rootCA.pem`
   - Asignar nombre: `media-catch-dev`

3. Verificar: Settings → Security → Encryption & credentials → Trusted credentials → User → buscar "media-catch-dev"

## Uso diario

### Generar/renovar certificados

```bash
# Desde la raíz del proyecto
pnpm cert:dev
# o directamente:
./scripts/generate-dev-cert.sh
```

El script:
- Detecta automáticamente la IP LAN activa
- Genera certificado con IP SAN (Subject Alternative Name)
- Incluye: IP LAN, localhost, 127.0.0.1, ::1
- Guarda en `certs/dev.pem` y `certs/dev-key.pem`

### Iniciar desarrollo

```bash
# En el devcontainer (con certs montados)
pnpm dev
```

Vite leerá automáticamente los certificados de `certs/` via variables de entorno `VITE_SSL_CERT` y `VITE_SSL_KEY`.

## Acceso desde móvil

Con el servidor corriendo, acceder desde el teléfono en la misma WiFi:

```
https://<IP-LAN>:5173   # receiver
https://<IP-LAN>:5174   # sender (cuando exista)
```

El navegador mostrará 🔒 conexión segura y `getUserMedia()` funcionará correctamente.

## Fallback: ngrok

Si no es posible configurar mkcert/CA en el dispositivo móvil:

```bash
# Terminal 1: receiver
ngrok http 5173

# Terminal 2: sender (cuando exista)
ngrok http 5174
```

Usar las URLs `https://*.ngrok-free.app` generadas.

## Solución de problemas

### "No se detectó IP LAN"
- Verificar conexión WiFi/Ethernet activa
- `ip -4 addr show scope global` para diagnóstico manual

### Certificado no confiable en Android
- Verificar que `rootCA.pem` se instaló correctamente
- Reiniciar Chrome/navagador
- Verificar en Settings → Trusted credentials → User

### Puerto en uso
```bash
# Cambiar puerto en vite.config.ts o variable de entorno
PORT=5175 pnpm dev
```

### Devcontainer no monta certs
- Rebuild devcontainer: `Dev Containers: Rebuild Container` en VS Code
- Verificar `.devcontainer/devcontainer.json` tiene el mount configurado