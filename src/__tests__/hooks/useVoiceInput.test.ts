/**
 * Tests for src/hooks/useVoiceInput.ts — Voice recording and transcription hook
 *
 * Verifies:
 * 1. Initial state (not recording, not transcribing, no error)
 * 2. startRecording triggers MediaRecorder when permission granted
 * 3. stopRecording collects audio and sends to transcription endpoint
 * 4. Error state when microphone permission denied
 * 5. Error state when transcription fails
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceInput } from '@/hooks/useVoiceInput';

// Mock the cloudflare-ai service module
vi.mock('@/services/cloudflare-ai', () => ({
  transcribeAudio: vi.fn(),
}));

import { transcribeAudio } from '@/services/cloudflare-ai';

describe('useVoiceInput', () => {
  let mockMediaRecorder: any;
  let mockStream: any;
  let mockTrack: any;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockTrack = {
      stop: vi.fn(),
    };

    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
    };

    mockMediaRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      ondataavailable: null as any,
      onstop: null as any,
    };

    // Mock the MediaRecorder constructor
    global.MediaRecorder = vi.fn(() => mockMediaRecorder) as any;

    // Mock navigator.mediaDevices.getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(() => Promise.resolve(mockStream)),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with isRecording false', () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );
      expect(result.current.isRecording).toBe(false);
    });

    it('starts with isTranscribing false', () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );
      expect(result.current.isTranscribing).toBe(false);
    });

    it('starts with error as null', () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );
      expect(result.current.error).toBeNull();
    });
  });

  describe('startRecording', () => {
    it('requests microphone access with audio constraint', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true,
      });
    });

    it('creates a MediaRecorder with webm mime type', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(global.MediaRecorder).toHaveBeenCalledWith(mockStream, {
        mimeType: 'audio/webm',
      });
    });

    it('starts the MediaRecorder', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    it('sets isRecording to true', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      expect(result.current.isRecording).toBe(false);

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
    });

    it('clears any existing error on successful start', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      // Create an error first by mocking failure
      (navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(
        new Error('Some error')
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).not.toBeNull();

      // Now resolve successfully
      (navigator.mediaDevices.getUserMedia as any).mockResolvedValueOnce(
        mockStream
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBeNull();
    });

    it('sets error when getUserMedia fails (generic error)', async () => {
      (navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(
        new Error('Some error')
      );

      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.isRecording).toBe(false);
    });

    it('sets isRecording to false when error occurs', async () => {
      (navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(
        new Error('Denied')
      );

      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('stopRecording', () => {
    it('does nothing if not recording', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      // Call stop without start
      await act(async () => {
        await result.current.stopRecording();
      });

      // MediaRecorder.stop should not have been called
      expect(mockMediaRecorder.stop).not.toHaveBeenCalled();
    });

    it('stops the MediaRecorder after recording', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      // Setup mock to prevent hang - call onstop immediately
      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockResolvedValueOnce({
        text: 'test',
      });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('stops all audio tracks in the stream', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockResolvedValueOnce({
        text: 'test',
      });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('sets isRecording to false when stopping', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockResolvedValueOnce({
        text: 'test',
      });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
    });

    it('sends audio to transcription endpoint', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockResolvedValueOnce({
        text: 'hello',
      });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(transcribeAudio).toHaveBeenCalledWith(
        expect.any(Blob)
      );
    });

    it('calls transcribeAudio service during transcription', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockResolvedValueOnce({
        text: 'test',
      });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(transcribeAudio).toHaveBeenCalled();
    });

    it('calls onTranscription with returned text', async () => {
      const onTranscription = vi.fn();
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription })
      );

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockResolvedValueOnce({
        text: 'Hello world',
      });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(onTranscription).toHaveBeenCalledWith('Hello world');
    });

    it('handles text from transcribeAudio response', async () => {
      const onTranscription = vi.fn();
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription })
      );

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockResolvedValueOnce({
        text: 'Response text',
      });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(onTranscription).toHaveBeenCalledWith('Response text');
    });

    it('does not call onTranscription if text is empty', async () => {
      const onTranscription = vi.fn();
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription })
      );

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockResolvedValueOnce({
        text: '   ',
      });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(onTranscription).not.toHaveBeenCalled();
    });

    it('sets error when transcribeAudio throws', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockRejectedValueOnce(
        new Error('Transcription failed')
      );

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.error).toBeTruthy();
    });

    it('sets error when transcribeAudio call fails', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockRejectedValueOnce(new Error('Network failed'));

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.error).toBeTruthy();
    });

    it('clears error on successful transcription', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      // First, cause an error
      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockRejectedValueOnce(new Error('Failed'));

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.error).toBeTruthy();

      // Now succeed
      (transcribeAudio as any).mockResolvedValueOnce({
        text: 'Success',
      });

      await act(async () => {
        await result.current.startRecording();
      });

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.error).toBeNull();
    });

    it('sets isTranscribing to false after transcription completes', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockResolvedValueOnce({
        text: 'test',
      });

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.isTranscribing).toBe(false);
    });

    it('sets isTranscribing to false even if transcription fails', async () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription: vi.fn() })
      );

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockRejectedValueOnce(new Error('Failed'));

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.isTranscribing).toBe(false);
    });
  });

  describe('integration', () => {
    it('completes a full recording and transcription cycle', async () => {
      const onTranscription = vi.fn();
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription })
      );

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any).mockResolvedValueOnce({
        text: 'I need coffee',
      });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(result.current.error).toBeNull();

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isTranscribing).toBe(false);
      expect(onTranscription).toHaveBeenCalledWith('I need coffee');
      expect(result.current.error).toBeNull();
    });

    it('can record multiple times in sequence', async () => {
      const onTranscription = vi.fn();
      const { result } = renderHook(() =>
        useVoiceInput({ onTranscription })
      );

      mockMediaRecorder.stop.mockImplementation(() => {
        setTimeout(() => {
          if (mockMediaRecorder.onstop) {
            mockMediaRecorder.onstop();
          }
        }, 0);
      });

      (transcribeAudio as any)
        .mockResolvedValueOnce({
          text: 'First',
        })
        .mockResolvedValueOnce({
          text: 'Second',
        });

      // First recording
      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(onTranscription).toHaveBeenNthCalledWith(1, 'First');

      // Second recording
      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(onTranscription).toHaveBeenNthCalledWith(2, 'Second');
    });
  });
});
