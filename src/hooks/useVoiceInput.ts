'use client';

/**
 * useVoiceInput Hook
 *
 * Records audio via MediaRecorder API and sends to transcription endpoint on Cloudflare.
 * Records while user holds the mic button, transcribes on release.
 *
 * Usage:
 *   const { isRecording, isTranscribing, startRecording, stopRecording, error } = useVoiceInput({
 *     onTranscription: (text) => console.log('Got:', text),
 *   });
 */

import { useState, useRef, useCallback } from 'react';
import { transcribeAudio } from '@/services/cloudflare-ai';

interface UseVoiceInputOptions {
  onTranscription: (text: string) => void;
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

      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      // Send to Cloudflare AI transcription endpoint
      const data = await transcribeAudio(audioBlob);
      const transcribedText = data.text || '';

      if (transcribedText.trim()) {
        onTranscription(transcribedText);
      }
    } catch (err) {
      setError("I couldn't make that out. Want to try again or type it?");
    } finally {
      setIsTranscribing(false);
    }
  }, [isRecording, onTranscription]);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    error,
  };
}

