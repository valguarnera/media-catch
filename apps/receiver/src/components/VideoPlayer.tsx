import { useRef, useEffect } from 'react';

interface VideoPlayerProps {
  stream: MediaStream | null;
  onError?: (error: Error) => void;
}

export function VideoPlayer({ stream, onError }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (!video || !audio) return;

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
    } else {
      video.srcObject = null;
      audio.srcObject = null;
    }

    return () => {
      video.srcObject = null;
      audio.srcObject = null;
    };
  }, [stream, onError]);

  if (!stream) {
    return (
      <div style={styles['placeholder']}>
        <div style={styles['placeholderIcon']}>📺</div>
        <div style={styles['placeholderText']}>Esperando stream...</div>
        <div style={styles['placeholderHint']}>El video y audio aparecerán aquí cuando el Sender se conecte</div>
      </div>
    );
  }

  return (
    <div style={styles['container']}>
      <video
        ref={videoRef}
        style={styles['video']}
        autoPlay
        playsInline
        muted={false}
      />
      <audio
        ref={audioRef}
        autoPlay
        style={styles['audio']}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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