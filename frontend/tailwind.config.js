/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        horizon: {
          abyss: '#03060C',
          void: '#060A14',
          deep: '#0A1124',
          surface: '#0F182E',
          elevated: '#15223E',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-bright': 'rgba(255, 255, 255, 0.16)',
          accent: '#38BDF8',
          'accent-bright': '#60A5FA',
          'accent-dim': 'rgba(56, 189, 248, 0.12)',
          silver: '#E2E8F0',
          muted: '#94A3B8',
          cyan: '#06B6D4',
        },
        ott: {
          bg: '#03060C',
          surface: '#0A1124',
          card: '#0F182E',
          elevated: '#15223E',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.04)',
          purple: '#38BDF8',
          violet: '#2563EB',
          cyan: '#38BDF8',
          crimson: '#F43F5E',
          emerald: '#38BDF8',
          amber: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-electric': '0 0 30px -5px rgba(56, 189, 248, 0.25)',
        'glow-silver': '0 0 30px -5px rgba(226, 232, 240, 0.15)',
        'glow-cyan': '0 0 30px -5px rgba(6, 182, 212, 0.25)',
        'ring-accretion': '0 0 60px 2px rgba(56, 189, 248, 0.18)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.6)',
      },
      letterSpacing: {
        'widest-editorial': '0.25em',
        'super-wide': '0.35em',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'orbit-slow': 'spin 60s linear infinite',
      },
    },
  },
  plugins: [],
}
