'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';

interface InputProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit: (text: string) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function Input({
  value,
  onChange,
  onSubmit,
  onVoiceStart,
  onVoiceEnd,
  placeholder = 'Talk to LocalGenius...',
  disabled = false,
}: InputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use visualViewport API to handle mobile keyboard without hiding input
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      // When keyboard opens, visualViewport height decreases
      const offset = window.innerHeight - viewport.height;
      setKeyboardOffset(Math.max(0, offset));
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Auto-save draft to localStorage for interruption resilience
  useEffect(() => {
    if (value) {
      localStorage.setItem('lg_draft', value);
    } else {
      localStorage.removeItem('lg_draft');
    }
  }, [value]);

  // Restore draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('lg_draft');
    if (draft && !value) {
      onChange(draft);
    }
    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value.trim());
        localStorage.removeItem('lg_draft');
      }
    }
  };

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      localStorage.removeItem('lg_draft');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleMicPress = () => {
    setIsRecording(true);
    onVoiceStart?.();
  };

  const handleMicRelease = () => {
    setIsRecording(false);
    onVoiceEnd?.();
  };

  return (
    <div
      className="fixed left-0 right-0 bg-white border-t z-10"
      style={{
        borderColor: 'var(--border-subtle)',
        bottom: keyboardOffset > 0 ? `${keyboardOffset}px` : '60px',
        transition: 'bottom 100ms ease-out',
      }}
    >
      <div className="flex items-end gap-2 px-screen-margin py-2 max-w-[640px] mx-auto">
        {/* Auto-growing textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={[
            'flex-1 resize-none',
            'min-h-[44px] max-h-[120px]',
            'px-4 py-3',
            'text-body text-charcoal placeholder:text-slate-light',
            'bg-cream rounded-md',
            'border border-transparent focus:border-terracotta',
            'outline-none transition-colors duration-fast',
          ].join(' ')}
          aria-label="Message input"
        />

        {/* Mic button — always visible */}
        <button
          onMouseDown={handleMicPress}
          onMouseUp={handleMicRelease}
          onTouchStart={handleMicPress}
          onTouchEnd={handleMicRelease}
          className={[
            'flex-shrink-0 flex items-center justify-center',
            'w-[44px] h-[44px]',
            'rounded-full transition-colors duration-instant relative',
            isRecording ? 'bg-terracotta-light text-terracotta' : 'text-slate hover:text-charcoal',
          ].join(' ')}
          aria-label={isRecording ? 'Recording... release to send' : 'Hold to record voice message'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
          {isRecording && (
            <span className="absolute w-2 h-2 bg-terracotta rounded-full animate-pulse-glow" />
          )}
        </button>

        {/* Send button — appears when there's text */}
        {value.trim().length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className={[
              'flex-shrink-0 flex items-center justify-center',
              'w-[44px] h-[44px]',
              'bg-terracotta text-white rounded-full',
              'hover:bg-terracotta-hover active:scale-95',
              'transition-all duration-instant',
              'disabled:opacity-40',
            ].join(' ')}
            aria-label="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" x2="12" y1="19" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
