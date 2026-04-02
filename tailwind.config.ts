import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#2C2C2C',
          soft: '#3D3D3D',
        },
        'warm-white': '#FAF8F5',
        cream: '#F2EDE8',
        terracotta: {
          DEFAULT: '#C4704B',
          text: '#A35535',     // AA compliant for body text on warm-white (4.8:1)
          hover: '#B5613D',
          active: '#A35535',
          light: '#F5E0D5',
        },
        sage: {
          DEFAULT: '#7A8B6F',
          text: '#5C6B52',     // AA compliant for body text on warm-white (5.5:1)
          hover: '#6B7C60',
          light: '#E8EDE5',
        },
        gold: {
          DEFAULT: '#D4A853',
          text: '#8B6914',     // AA compliant for body text on warm-white (6.3:1)
          light: '#F5EDD8',
        },
        slate: {
          DEFAULT: '#6B7280',
          light: '#8390A0',    // Darkened from #9CA3AF for 3.2:1 (AA large text)
        },
        blush: '#F5E6E0',
        error: {
          DEFAULT: '#C0392B',
          light: '#FADBD8',
          dark: '#962D22',
        },
      },
      fontFamily: {
        sans: [
          '"Source Sans 3"',
          '"Source Sans Pro"',
          ...defaultTheme.fontFamily.sans,
        ],
      },
      fontSize: {
        display: [
          '1.75rem',
          { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.01em' },
        ],
        h1: [
          '1.25rem',
          { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.005em' },
        ],
        h2: [
          '1.125rem',
          { lineHeight: '1.3', fontWeight: '600' },
        ],
        body: [
          '1rem',
          { lineHeight: '1.5', fontWeight: '400' },
        ],
        caption: [
          '0.8125rem',
          { lineHeight: '1.385', fontWeight: '400', letterSpacing: '0.005em' },
        ],
        small: [
          '0.75rem',
          { lineHeight: '1.333', fontWeight: '400', letterSpacing: '0.01em' },
        ],
      },
      spacing: {
        'card-padding': '20px',
        'card-gap': '12px',
        'content-gap': '24px',
        'screen-margin': '20px',
        'section-gap': '32px',
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(44,44,44,0.06), 0 1px 2px rgba(44,44,44,0.04)',
        md: '0 4px 12px rgba(44,44,44,0.08), 0 2px 4px rgba(44,44,44,0.04)',
        lg: '0 12px 32px rgba(44,44,44,0.12), 0 4px 8px rgba(44,44,44,0.06)',
      },
      minHeight: {
        'tap-min': '44px',
        'tap-primary': '56px',
        'tap-nav': '48px',
      },
      transitionDuration: {
        instant: '100ms',
        fast: '200ms',
        normal: '300ms',
        slow: '500ms',
      },
      transitionTimingFunction: {
        default: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        enter: 'cubic-bezier(0, 0, 0.2, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 200ms cubic-bezier(0, 0, 0.2, 1)',
        'pulse-glow': 'pulseGlow 1500ms ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
