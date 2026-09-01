import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsxs("div", { style: styles['container'], children: [_jsxs("header", { style: styles['header'], children: [_jsx("h1", { style: styles['title'], children: "MEDIA-CATCH" }), _jsx("p", { style: styles['subtitle'], children: "RECEIVER" })] }), _jsxs("main", { style: styles['main'], children: [_jsx(ConnectionStatus, { state: state.connectionState, sessionCode: state.sessionCode, remotePeerConnected: state.remotePeerConnected, webrtcState: state.webrtcState }), _jsx(VideoPlayer, { stream: remoteStream }), _jsx("div", { style: styles['controls'], children: state.connectionState === 'connected' ? (_jsx("button", { style: styles['buttonDanger'], onClick: handleDisconnect, children: "Desconectar" })) : state.connectionState === 'error' ? (_jsx("button", { style: styles['buttonPrimary'], onClick: handleRetry, children: "Reintentar" })) : (_jsx("button", { style: styles['buttonDisabled'], onClick: handleDisconnect, disabled: true, children: "Desconectar" })) })] }), _jsx("footer", { style: styles['footer'], children: _jsx("p", { style: styles['footerText'], children: "LAN WebRTC Streaming \u00B7 Phase 3" }) })] }));
}
const styles = {
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
//# sourceMappingURL=App.js.map