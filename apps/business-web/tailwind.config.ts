import type { Config } from 'tailwindcss';

// NOTE: These tokens must stay in sync with
//   ../../src/constants/colors.ts
// so mobile and web feel like the same product. If you change
// one, update the other in the same PR.
const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe7ff',
          200: '#bfd2ff',
          300: '#99b6ff',
          400: '#6d92ff',
          500: '#4d73ff',
          600: '#3459e6',
          700: '#2846b8',
          800: '#233b94',
          900: '#203274',
        },
        ink: {
          50: '#f8fafc',
          100: '#eef2f7',
          200: '#d7e0ea',
          300: '#b5c1d0',
          400: '#8a98ab',
          500: '#66758a',
          600: '#4b596c',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        surface: {
          base: '#f6f7fb',
          card: '#ffffff',
          muted: '#e9eef6',
          strong: '#d5deeb',
        },
        success: '#1f8a5b',
        warning: '#b7791f',
        danger: '#c24141',
      },
      borderRadius: {
        '4xl': '1.75rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(17, 24, 39, 0.04)',
        pop: '0 8px 28px rgba(52, 89, 230, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
