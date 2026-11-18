/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    serverComponents: true,
  },
}
// const nextConfig = {} // nextjs config

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Tahoma', 'Arial', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      colors: {
        // Institutional colors - central theme
        institutional: {
          navy: {
            50: 'var(--institutional-navy-50)',
            100: 'var(--institutional-navy-100)',
            200: 'var(--institutional-navy-200)',
            300: 'var(--institutional-navy-300)',
            400: 'var(--institutional-navy-400)',
            500: 'var(--institutional-navy-500)',
            600: 'var(--institutional-navy-600)',
            700: 'var(--institutional-navy-700)',
            800: 'var(--institutional-navy-800)',
            900: 'var(--institutional-navy-900)',
            950: 'var(--institutional-navy-950)',
          },
        },
        slate: {
          50: 'var(--slate-50)',
          100: 'var(--slate-100)',
          200: 'var(--slate-200)',
          300: 'var(--slate-300)',
          400: 'var(--slate-400)',
          500: 'var(--slate-500)',
          600: 'var(--slate-600)',
          700: 'var(--slate-700)',
          800: 'var(--slate-800)',
          900: 'var(--slate-900)',
        },
        acadBlue: {
          50: 'var(--acadBlue-50)',
          100: 'var(--acadBlue-100)',
          200: 'var(--acadBlue-200)',
          300: 'var(--acadBlue-300)',
          400: 'var(--acadBlue-400)',
          500: 'var(--acadBlue-500)',
          600: 'var(--acadBlue-600)',
          700: 'var(--acadBlue-700)',
          800: 'var(--acadBlue-800)',
          900: 'var(--acadBlue-900)',
        },
        // Legacy compat
        portalBg: 'var(--portalBg)',
        instNavy: {
          950: 'var(--instNavy-950)',
          900: 'var(--instNavy-900)',
          800: 'var(--instNavy-800)',
          700: 'var(--instNavy-700)',
        },
        slateBorder: 'var(--slateBorder)',
        slateDarkBorder: 'var(--slateDarkBorder)',

        // Status colors
        success: {
          50: 'var(--success-50)',
          100: 'var(--success-100)',
          600: 'var(--success-600)',
        },
        error: {
          50: 'var(--error-50)',
          600: 'var(--error-600)',
        },
        warning: {
          50: 'var(--warning-50)',
          600: 'var(--warning-600)',
        },

        // Background variants
        bgPortal: '#E9EEF4',
        bgWhite: '#FFFFFF',
        bgPanel: '#F8FAFC',
        bgCard: '#FFFFFF',

        // Text colors
        textNavy: '#1E293B',
        textSlate: '#64748B',
        textMuted: '#94A3B8',
      },
      borderRadius: {
        none: '0px',
        xs: '1px',
        sm: '2px',
        DEFAULT: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '2px',
        full: '2px',
      }
    },
  },
  plugins: [],
}
export default nextConfig