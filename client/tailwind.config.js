/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // SUBLINE v2 — dark design system
        bg:      '#0F1221',
        surface: '#1A2035',
        card:    '#202640',
        navy:    '#1A2A6C',
        brand: {
          DEFAULT: '#2B8EF0',
          dark:    '#1A5FA8',
          light:   '#5BAEF7',
          dim:     '#1A5FA8',
        },
        ink:      '#FFFFFF',
        muted:    '#8A94B0',
        faint:    '#5A6386',
        line:     '#2A3356',
        lineSoft: '#232A47',
        success:  '#2BC8A0',
        danger:   '#E24B4A',
        warning:  '#F0B82B',
        accent:   { DEFAULT: '#8B5CF6' },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card:   '14px',
        button: '12px',
        pill:   '999px',
      },
      boxShadow: {
        card:      '0 2px 8px rgba(0,0,0,0.25)',
        'card-lg': '0 8px 24px rgba(0,0,0,0.35)',
        blue:      '0 4px 12px rgba(43,142,240,0.4)',
      },
      backgroundImage: {
        'brand-gradient':      'linear-gradient(135deg, #2B8EF0 0%, #003D7A 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #1A2035 0%, #202640 100%)',
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
