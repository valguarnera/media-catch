import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoPlayer } from './VideoPlayer';

describe('VideoPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders placeholder when no stream', () => {
    render(<VideoPlayer stream={null} />);
    expect(screen.getByText('Esperando stream...')).toBeInTheDocument();
    expect(screen.getByText('El video y audio aparecerán aquí cuando el Sender se conecte')).toBeInTheDocument();
  });

  it('renders video element when stream provided', () => {
    const mockStream = new MediaStream();
    const { container } = render(<VideoPlayer stream={mockStream} />);
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.srcObject).toBe(mockStream);
  });

  it('renders audio element when stream provided', () => {
    const mockStream = new MediaStream();
    const { container } = render(<VideoPlayer stream={mockStream} />);
    const audio = container.querySelector('audio') as HTMLAudioElement;
    expect(audio).toBeInTheDocument();
    expect(audio.srcObject).toBe(mockStream);
  });
});