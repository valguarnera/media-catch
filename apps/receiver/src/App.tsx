import { useEffect } from 'react';
import { ConnectionStatus } from './components/ConnectionStatus';
import { VideoPlayer } from './components/VideoPlayer';
import { useReceiver } from './hooks/useReceiver';

function App() {
  const { state, initialize, disconnect, retry, remoteStream } = useReceiver();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleDisconnect = () => {
    disconnect();
  };

  const handleRetry = () => {
    retry();
  };

  return (
    <div style={styles['container']}>
      <header style={styles['header']}>
        <h1 style={styles['title']}>MEDIA-CATCH</h1>
        <p style={styles['subtitle']}>RECEIVER</p>
      </header>

      <main style={styles['main']}>
        <ConnectionStatus
          state={state.connectionState}
          sessionCode={state.sessionCode}
          remotePeerConnected={state.remotePeerConnected}
          webrtcState={state.webrtcState}
        />

        <VideoPlayer stream={remoteStream} />

        <div style={styles['controls']}>
          {state.connectionState === 'connected' ? (
            <button style={styles['buttonDanger']} onClick={handleDisconnect}>
              Desconectar
            </button>
          ) : state.connectionState === 'error' ? (
            <button style={styles['buttonPrimary']} onClick={handleRetry}>
              Reintentar
            </button>
          ) : (
            <button style={styles['buttonDisabled']} onClick={handleDisconnect} disabled>
              Desconectar
            </button>
          )}
        </div>
      </main>

      <footer style={styles['footer']}>
        <p style={styles['footerText']}>LAN WebRTC Streaming · Phase 3</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#1a1a2e',
    color: '#eaeaea',
  },
  header: {
    textAlign: 'center',
    padding: '1.5rem 1rem 1rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: '#fff',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.7rem',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    margin: '0.25rem 0 0',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem',
    gap: '1rem',
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: '0.5rem',
  },
  buttonPrimary: {
    padding: '0.75rem 2rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#fff',
    background: '#3498db',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  buttonDanger: {
    padding: '0.75rem 2rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#fff',
    background: '#e74c3c',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  buttonDisabled: {
    padding: '0.75rem 2rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#666',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    cursor: 'not-allowed',
  },
  footer: {
    padding: '1rem',
    textAlign: 'center',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  footerText: {
    margin: 0,
    fontSize: '0.7rem',
    color: '#444',
  },
};

export default App;