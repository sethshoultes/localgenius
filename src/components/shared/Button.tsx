'use client';

import { type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'default' | 'small';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-terracotta text-white hover:bg-terracotta-hover active:bg-terracotta-active',
  secondary:
    'bg-transparent text-terracotta border border-charcoal/12 hover:bg-terracotta-light',
  ghost:
    'bg-transparent text-terracotta hover:bg-terracotta-light',
  danger:
    'bg-transparent text-error border border-error hover:bg-error-light',
};

const sizeStyles: Record<ButtonSize, string> = {
  default: 'min-h-tap-primary px-[var(--space-button-padding-x)] py-[var(--space-button-padding-y)]',
  small: 'min-h-tap-min px-4 py-2',
};

export default function Button({
  variant = 'primary',
  size = 'default',
  label,
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2',
        'font-semibold text-body tracking-[var(--letter-spacing-button)]',
        'rounded-sm transition-all duration-instant ease-default',
        'active:scale-[0.98]',
        'disabled:opacity-40 disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="loading-glow w-5 h-5 rounded-full" aria-label="Loading" />
      ) : (
        <>
          {icon && <span className="w-5 h-5 flex-shrink-0">{icon}</span>}
          {label}
        </>
      )}
    </button>
  );
}
