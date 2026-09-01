import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from './ConnectionStatus';

describe('ConnectionStatus', () => {
  it('renders disconnected state', () => {
    render(<ConnectionStatus state="disconnected" sessionCode={null} remotePeerConnected={false} webrtcState={null} />);
    expect(screen.getByText('Desconectado')).toBeInTheDocument();
  });

  it('renders waiting-for-sender state', () => {
    render(<ConnectionStatus state="waiting-for-sender" sessionCode={null} remotePeerConnected={false} webrtcState={null} />);
    expect(screen.getByText('Esperando al Sender...')).toBeInTheDocument();
  });

  it('displays session code when available', () => {
    render(<ConnectionStatus state="waiting-for-sender" sessionCode="ABC123" remotePeerConnected={false} webrtcState={null} />);
    expect(screen.getByText('CÓDIGO DE SESIÓN')).toBeInTheDocument();
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });

  it('shows sender detected message when remotePeerConnected', () => {
    render(<ConnectionStatus state="connecting-webrtc" sessionCode="ABC123" remotePeerConnected={true} webrtcState={null} />);
    expect(screen.getByText('Sender detectado - Estableciendo conexión...')).toBeInTheDocument();
  });

  it('shows streaming active when connected', () => {
    render(<ConnectionStatus state="connected" sessionCode="ABC123" remotePeerConnected={true} webrtcState={null} />);
    expect(screen.getByText('Streaming activo')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<ConnectionStatus state="error" sessionCode={null} remotePeerConnected={false} webrtcState={null} />);
    expect(screen.getByText('Error de conexión. Verifica que el servidor de signaling esté ejecutándose.')).toBeInTheDocument();
  });
});