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
  transcribeUrl = '/api/voice/transcribe',
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
      const isPermissionDenied = err instanceof Error && err.name === 'NotAllowedError';
      setError(
        isPermissionDenied
          ? "I need mic access to listen. Check your browser's address bar to allow it."
          : "I couldn't access your microphone. Want to type instead?",
      );
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

      // Send to transcription endpoint — uses lg_session httpOnly cookie
      // via credentials: 'include'. The Cloudflare endpoint also accepts
      // Bearer token from the session cookie (forwarded by the middleware).
      const response = await fetch(transcribeUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      const transcribedText = data.data?.text || data.text || '';

      if (transcribedText.trim()) {
        onTranscription(transcribedText);
      }
    } catch (err) {
      setError("I couldn't make that out. Want to try again or type it?");
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

