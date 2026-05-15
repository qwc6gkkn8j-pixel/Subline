/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // SUBLINE v3 — Uber-Eats-style light design system
        bg:      '#FFFFFF',
        surface: '#F6F6F6',
        card:    '#FFFFFF',
        line:    '#E0E0E0',     // inputs, chips, ghost borders
        lineSoft:'#F0F0F0',     // row separators, subtle dividers
        brand: {
          DEFAULT: '#2B8EF0',
          dark:    '#1A5FA8',
          light:   '#5BAEF7',
          dim:     '#EBF4FE',   // rgba(43,142,240,.10) on white
        },
        ink:     '#000000',
        muted:   '#6B6B6B',
        faint:   '#9B9B9B',
        cta:     '#000000',
        success: '#2BC8A0',
        danger:  '#E24B4A',
        warning: '#F0B82B',
        promo:   '#D74E2F',
        accent:  { DEFAULT: '#8B5CF6' },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display': ['30px', { lineHeight: '1.1', letterSpacing: '-0.013em', fontWeight: '700' }],
        'h1':      ['26px', { lineHeight: '1.15', letterSpacing: '-0.012em', fontWeight: '700' }],
        'h2':      ['20px', { lineHeight: '1.2',  letterSpacing: '-0.010em', fontWeight: '700' }],
        'h3':      ['17px', { lineHeight: '1.25', fontWeight: '700' }],
        'card-title': ['15px', { lineHeight: '1.3', letterSpacing: '-0.005em', fontWeight: '700' }],
        'meta':    ['13px', { lineHeight: '1.4', fontWeight: '500' }],
        'micro':   ['11px', { lineHeight: '1.3', fontWeight: '600' }],
      },
      borderRadius: {
        card:      '16px',
        'card-lg': '20px',
        tile:      '14px',
        input:     '12px',
        button:    '12px',
        pill:      '999px',
      },
      boxShadow: {
        // Button drop-shot glow system
        btn:              '0 5px 14px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.08)',
        'btn-hover':      '0 8px 20px rgba(0,0,0,0.18), 0 2px 5px rgba(0,0,0,0.11)',
        'btn-brand':      '0 6px 18px rgba(43,142,240,0.22), 0 1px 4px rgba(43,142,240,0.14)',
        'btn-brand-hover':'0 9px 24px rgba(43,142,240,0.28), 0 2px 6px rgba(43,142,240,0.18)',
        'btn-ghost':      '0 2px 8px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        'btn-danger':     '0 4px 12px rgba(226,75,74,0.14), 0 1px 3px rgba(226,75,74,0.08)',
        // Layout
        fab:              '0 2px 8px rgba(0,0,0,0.18)',
        card:             '0 1px 4px rgba(0,0,0,0.06)',
        'card-lg':        '0 8px 24px rgba(0,0,0,0.12)',
        menu:             '0 8px 24px rgba(0,0,0,0.12)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #2B8EF0, #5BAEF7)',
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
