import type { ConnectionState } from '../types.js';

const STATUS_LABELS: Record<ConnectionState, string> = {
  disconnected: 'Desconectado',
  connecting: 'Conectando...',
  registering: 'Registrando...',
  'waiting-for-sender': 'Esperando al Sender...',
  'connecting-webrtc': 'Conectando WebRTC...',
  connected: 'Conectado',
  error: 'Error',
};

const STATUS_COLORS: Record<ConnectionState, string> = {
  disconnected: '#666',
  connecting: '#f39c12',
  registering: '#f39c12',
  'waiting-for-sender': '#3498db',
  'connecting-webrtc': '#f39c12',
  connected: '#27ae60',
  error: '#e74c3c',
};

interface ConnectionStatusProps {
  state: ConnectionState;
  sessionCode: string | null;
  remotePeerConnected: boolean;
  webrtcState: RTCPeerConnectionState | null;
}

export function ConnectionStatus({ state, sessionCode, remotePeerConnected, webrtcState }: ConnectionStatusProps) {
  return (
    <div style={styles['container']}>
      <div style={styles['statusRow']}>
        <span style={{ ...styles['statusLabel'], color: STATUS_COLORS[state] }}>
          {STATUS_LABELS[state]}
        </span>
        {webrtcState && state !== 'connected' && state !== 'error' && (
          <span style={{ ...styles['statusLabel'], color: '#999', fontSize: '0.75rem' }}>
            ICE: {webrtcState}
          </span>
        )}
      </div>

      {sessionCode && (
        <div style={styles['codeContainer']}>
          <span style={styles['codeLabel']}>CÓDIGO DE SESIÓN</span>
          <span style={styles['codeValue']}>{sessionCode}</span>
        </div>
      )}

      {remotePeerConnected && state !== 'connected' && (
        <div style={styles['peerStatus']}>
          <span style={{ ...styles['peerDot'], backgroundColor: '#f39c12' }} />
          <span style={styles['peerText']}>Sender detectado - Estableciendo conexión...</span>
        </div>
      )}

      {state === 'connected' && (
        <div style={styles['peerStatus']}>
          <span style={{ ...styles['peerDot'], backgroundColor: '#27ae60' }} />
          <span style={styles['peerText']}>Streaming activo</span>
        </div>
      )}

      {state === 'error' && (
        <div style={styles['error']}>
          Error de conexión. Verifica que el servidor de signaling esté ejecutándose.
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    textAlign: 'center',
    padding: '1rem',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '0.5rem',
  },
  statusLabel: {
    fontWeight: 600,
    fontSize: '1.1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  codeContainer: {
    marginTop: '1rem',
    padding: '1rem',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  codeLabel: {
    display: 'block',
    fontSize: '0.7rem',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '0.25rem',
  },
  codeValue: {
    fontSize: '2.5rem',
    fontWeight: 700,
    letterSpacing: '0.3em',
    fontFamily: 'monospace',
    color: '#fff',
  },
  peerStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginTop: '1rem',
    padding: '0.5rem',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '6px',
  },
  peerDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  peerText: {
    fontSize: '0.85rem',
    color: '#ccc',
  },
  error: {
    marginTop: '1rem',
    padding: '0.75rem',
    background: 'rgba(231, 76, 60, 0.2)',
    border: '1px solid #e74c3c',
    borderRadius: '6px',
    color: '#e74c3c',
    fontSize: '0.85rem',
  },
};