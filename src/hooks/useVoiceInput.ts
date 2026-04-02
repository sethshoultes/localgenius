'use client';

/**
 * useVoiceInput Hook
 *
 * Records audio via MediaRecorder API and sends to transcription endpoint.
 * Records while user holds the mic button, transcribes on release.
 *
 * Usage:
 *   const { isRecording, isTranscribing, startRecording, stopRecording, error } = useVoiceInput({
 *     onTranscription: (text) => console.log('Got:', text),
 *   });
 */

import { useState, useRef, useCallback } from 'react';

interface UseVoiceInputOptions {
  onTranscription: (text: string) => void;
  transcribeUrl?: string;
}

interface UseVoiceInputReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  error: string | null;
}

export function useVoiceInput({
  onTranscription,
  transcribeUrl = process.env.NEXT_PUBLIC_VOICE_API_URL || 'https://localgenius-sites.pages.dev/api/voice/transcribe',
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder with webm/opus (best browser support)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(message);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    const mediaRecorder = mediaRecorderRef.current;

    // Stop recording and collect chunks
    mediaRecorder.stop();
    setIsRecording(false);

    // Clean up stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Wait for onstop to fire and chunks to be available
    await new Promise<void>((resolve) => {
      mediaRecorder.onstop = () => resolve();
    });

    // Transcribe the audio
    try {
      setIsTranscribing(true);
      setError(null);

      // Create FormData with audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      // Get auth token from cookie or localStorage
      const token = getCookie('auth') || localStorage.getItem('auth_token');

      // Send to transcription endpoint
      const response = await fetch(transcribeUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      const transcribedText = data.text || '';

      if (transcribedText.trim()) {
        onTranscription(transcribedText);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transcription failed';
      setError(message);
    } finally {
      setIsTranscribing(false);
    }
  }, [isRecording, onTranscription, transcribeUrl]);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    error,
  };
}

/**
 * Helper to read cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(nameEQ)) {
      return trimmed.substring(nameEQ.length);
    }
  }
  return null;
}
