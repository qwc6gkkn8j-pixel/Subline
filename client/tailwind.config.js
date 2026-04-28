/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // SUBLINE brand palette
        brand: {
          DEFAULT: '#0080D0',
          dark: '#003D7A',
          light: '#E3F2FD',
        },
        accent: {
          DEFAULT: '#8B5CF6',
        },
        success: '#4CAF50',
        danger: '#EF4444',
        warning: '#F59E0B',
        ink: '#1A1A1A',
        muted: '#9CA3AF',
        surface: '#F5F5F5',
        line: '#E5E7EB',
      },
      fontFamily: {
        sans: [
          'Inter',
          'Segoe UI',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '12px',
        button: '8px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
        'card-lg': '0 4px 16px rgba(0,0,0,0.10)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0080D0 0%, #003D7A 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #E3F2FD 0%, #FFFFFF 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
