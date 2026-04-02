'use client';

import { useState } from 'react';
import Button from '../shared/Button';

/**
 * SettingsCard — In-conversation business detail editor.
 *
 * Per product-design.md: "There is no settings screen.
 * Every preference is set through conversation."
 *
 * When the owner says "change my hours" or "update my phone number",
 * the thread shows this inline card with editable fields.
 * One-tap save. No separate page. Settings ARE conversation.
 */

type SettingsField = {
  key: string;
  label: string;
  value: string;
  type?: 'text' | 'tel' | 'url' | 'textarea';
  placeholder?: string;
};

type SettingsStatus = 'editing' | 'saving' | 'saved' | 'error';

interface SettingsCardProps {
  title: string;
  description: string;
  fields: SettingsField[];
  onSave: (values: Record<string, string>) => Promise<void>;
  timestamp: string;
}

export default function SettingsCard({
  title,
  description,
  fields: initialFields,
  onSave,
  timestamp,
}: SettingsCardProps) {
  const [fields, setFields] = useState<SettingsField[]>(initialFields);
  const [status, setStatus] = useState<SettingsStatus>('editing');
  const [errorMessage, setErrorMessage] = useState('');

  const updateField = (key: string, value: string) => {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, value } : f)),
    );
  };

  const handleSave = async () => {
    setStatus('saving');
    setErrorMessage('');

    try {
      const values: Record<string, string> = {};
      for (const field of fields) {
        values[field.key] = field.value;
      }
      await onSave(values);
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setErrorMessage('Couldn\u2019t save that. Tap to try again.');
    }
  };

  // Saved state — collapsed, shows confirmation
  if (status === 'saved') {
    return (
      <article className="card animate-in flex flex-col gap-2" aria-label={`Updated: ${title}`}>
        <div className="flex items-center gap-2 text-body font-semibold text-sage-text">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-sage"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Updated
        </div>
        <p className="text-body text-charcoal">{title}</p>
        <div className="flex flex-col gap-1">
          {fields.map((field) => (
            <p key={field.key} className="text-caption text-slate">
              {field.label}: {field.value}
            </p>
          ))}
        </div>
        <span className="text-caption text-slate-light">{timestamp}</span>
      </article>
    );
  }

  // Editing state — inline form
  return (
    <article
      className="card animate-in flex flex-col gap-card-gap"
      aria-label={`Edit: ${title}`}
    >
      {/* Header */}
      <h3 className="text-h2 text-charcoal">{title}</h3>
      <p className="text-body text-slate">{description}</p>

      {/* Fields */}
      <div className="flex flex-col gap-3">
        {fields.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <label
              htmlFor={`settings-${field.key}`}
              className="text-caption text-slate font-semibold"
            >
              {field.label}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                id={`settings-${field.key}`}
                value={field.value}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-4 py-3 text-body text-charcoal placeholder:text-slate-light bg-cream rounded-md border border-transparent focus:border-terracotta outline-none transition-colors duration-fast resize-none"
              />
            ) : (
              <input
                id={`settings-${field.key}`}
                type={field.type || 'text'}
                value={field.value}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full min-h-[44px] px-4 py-3 text-body text-charcoal placeholder:text-slate-light bg-cream rounded-md border border-transparent focus:border-terracotta outline-none transition-colors duration-fast"
              />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {status === 'error' && (
        <button
          onClick={handleSave}
          className="px-4 py-3 bg-error-light text-error-dark text-body rounded-sm text-left"
        >
          {errorMessage}
        </button>
      )}

      {/* Actions — one-tap save */}
      <div className="flex gap-3">
        <div className="flex-[3]">
          <Button
            variant="primary"
            label="Save"
            onClick={handleSave}
            loading={status === 'saving'}
            fullWidth
          />
        </div>
        <div className="flex-[2]">
          <Button
            variant="secondary"
            label="Cancel"
            onClick={() => setFields(initialFields)}
            fullWidth
          />
        </div>
      </div>

      <span className="text-caption text-slate-light">{timestamp}</span>
    </article>
  );
}
