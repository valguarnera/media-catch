import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useEffect } from 'react';
export function VideoPlayer({ stream, onError }) {
    const videoRef = useRef(null);
    const audioRef = useRef(null);
    useEffect(() => {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (!video || !audio)
            return;
        if (stream) {
            video.srcObject = stream;
            audio.srcObject = stream;
            video.play().catch((err) => {
                console.warn('[VideoPlayer] Video play failed:', err);
                onError?.(err);
            });
            audio.play().catch((err) => {
                console.warn('[VideoPlayer] Audio play failed:', err);
                onError?.(err);
            });
        }
        else {
            video.srcObject = null;
            audio.srcObject = null;
        }
        return () => {
            video.srcObject = null;
            audio.srcObject = null;
        };
    }, [stream, onError]);
    if (!stream) {
        return (_jsxs("div", { style: styles['placeholder'], children: [_jsx("div", { style: styles['placeholderIcon'], children: "\uD83D\uDCFA" }), _jsx("div", { style: styles['placeholderText'], children: "Esperando stream..." }), _jsx("div", { style: styles['placeholderHint'], children: "El video y audio aparecer\u00E1n aqu\u00ED cuando el Sender se conecte" })] }));
    }
    return (_jsxs("div", { style: styles['container'], children: [_jsx("video", { ref: videoRef, style: styles['video'], autoPlay: true, playsInline: true, muted: false }), _jsx("audio", { ref: audioRef, autoPlay: true, style: styles['audio'] })] }));
}
const styles = {
    container: {
        width: '100%',
        aspectRatio: '16/9',
        background: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#000',
    },
    audio: {
        display: 'none',
    },
    placeholder: {
        width: '100%',
        aspectRatio: '16/9',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        border: '2px dashed rgba(255,255,255,0.1)',
    },
    placeholderIcon: {
        fontSize: '3rem',
        opacity: 0.5,
    },
    placeholderText: {
        color: '#888',
        fontSize: '1.1rem',
        fontWeight: 500,
    },
    placeholderHint: {
        color: '#555',
        fontSize: '0.8rem',
        textAlign: 'center',
        padding: '0 1rem',
    },
};
//# sourceMappingURL=VideoPlayer.js.map