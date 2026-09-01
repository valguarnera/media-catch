#!/usr/bin/env bash
set -euo pipefail

# Detectar IP LAN (no localhost, no docker, no vpn)
LAN_IP=$(ip -4 addr show scope global | awk '/inet / {print $2}' | cut -d/ -f1 | head -1)

if [[ -z "$LAN_IP" ]]; then
  echo "❌ No se detectó IP LAN. ¿Conectado a WiFi/Ethernet?"
  exit 1
fi

CERT_DIR="$(dirname "$0")/../certs"
mkdir -p "$CERT_DIR"

echo "🔐 Generando certificado para IP LAN: $LAN_IP"

mkcert \
  -cert-file "$CERT_DIR/dev.pem" \
  -key-file "$CERT_DIR/dev-key.pem" \
  "$LAN_IP" localhost 127.0.0.1 ::1

echo "✅ Certificados generados en $CERT_DIR/"
echo "   Cert: dev.pem"
echo "   Key:  dev-key.pem"
echo ""
echo "📱 En Android: instalar $(mkcert -CAROOT)/rootCA.pem una sola vez"