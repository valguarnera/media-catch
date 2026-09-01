import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const STATUS_LABELS = {
    disconnected: 'Desconectado',
    connecting: 'Conectando...',
    registering: 'Registrando...',
    'waiting-for-sender': 'Esperando al Sender...',
    'connecting-webrtc': 'Conectando WebRTC...',
    connected: 'Conectado',
    error: 'Error',
};
const STATUS_COLORS = {
    disconnected: '#666',
    connecting: '#f39c12',
    registering: '#f39c12',
    'waiting-for-sender': '#3498db',
    'connecting-webrtc': '#f39c12',
    connected: '#27ae60',
    error: '#e74c3c',
};
export function ConnectionStatus({ state, sessionCode, remotePeerConnected, webrtcState }) {
    return (_jsxs("div", { style: styles['container'], children: [_jsxs("div", { style: styles['statusRow'], children: [_jsx("span", { style: { ...styles['statusLabel'], color: STATUS_COLORS[state] }, children: STATUS_LABELS[state] }), webrtcState && state !== 'connected' && state !== 'error' && (_jsxs("span", { style: { ...styles['statusLabel'], color: '#999', fontSize: '0.75rem' }, children: ["ICE: ", webrtcState] }))] }), sessionCode && (_jsxs("div", { style: styles['codeContainer'], children: [_jsx("span", { style: styles['codeLabel'], children: "C\u00D3DIGO DE SESI\u00D3N" }), _jsx("span", { style: styles['codeValue'], children: sessionCode })] })), remotePeerConnected && state !== 'connected' && (_jsxs("div", { style: styles['peerStatus'], children: [_jsx("span", { style: { ...styles['peerDot'], backgroundColor: '#f39c12' } }), _jsx("span", { style: styles['peerText'], children: "Sender detectado - Estableciendo conexi\u00F3n..." })] })), state === 'connected' && (_jsxs("div", { style: styles['peerStatus'], children: [_jsx("span", { style: { ...styles['peerDot'], backgroundColor: '#27ae60' } }), _jsx("span", { style: styles['peerText'], children: "Streaming activo" })] })), state === 'error' && (_jsx("div", { style: styles['error'], children: "Error de conexi\u00F3n. Verifica que el servidor de signaling est\u00E9 ejecut\u00E1ndose." }))] }));
}
const styles = {
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
//# sourceMappingURL=ConnectionStatus.js.map