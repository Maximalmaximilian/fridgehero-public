import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // FridgeHero Color System
      colors: {
        // Primary Colors
        hero: {
          green: '#22C55E',
          amber: '#F59E0B',
          red: '#EF4444',
        },
        
        // Core Brand Colors
        primary: {
          50: '#F0FDF4',  // green-50
          100: '#DCFCE7', // green-100
          200: '#BBF7D0', // green-200
          300: '#86EFAC', // green-300
          400: '#4ADE80', // green-400
          500: '#22C55E', // Hero Green
          600: '#16A34A', // green-600
          700: '#15803D', // green-700
          800: '#166534', // green-800
          900: '#14532D', // green-900
        },
        
        // Alert & Warning Colors
        warning: {
          50: '#FFFBEB',  // amber-50
          100: '#FEF3C7', // amber-100
          200: '#FDE68A', // amber-200
          300: '#FCD34D', // amber-300
          400: '#FBBF24', // amber-400
          500: '#F59E0B', // Alert Amber
          600: '#D97706', // amber-600
          700: '#B45309', // amber-700
          800: '#92400E', // amber-800
          900: '#78350F', // amber-900
        },
        
        // Error & Expired Colors
        error: {
          50: '#FEF2F2',  // red-50
          100: '#FEE2E2', // red-100
          200: '#FECACA', // red-200
          300: '#FCA5A5', // red-300
          400: '#F87171', // red-400
          500: '#EF4444', // Expired Red
          600: '#DC2626', // red-600
          700: '#B91C1C', // red-700
          800: '#991B1B', // red-800
          900: '#7F1D1D', // red-900
        },
        
        // Secondary Palette
        sage: '#84CC16',
        ocean: '#0EA5E9',
        sunset: '#FB923C',
        lavender: '#8B5CF6',
        
        // Enhanced Gray Scale
        charcoal: '#1F2937',
        
        // Contextual Colors
        fresh: '#22C55E',
        expiring: '#F59E0B',
        expired: '#EF4444',
      },
      
      // Typography System
      fontFamily: {
        primary: ['Inter', 'system-ui', 'sans-serif'],
        secondary: ['Poppins', 'system-ui', 'sans-serif'],
        accent: ['JetBrains Mono', 'monospace'],
      },
      
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
        'h1': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'h2': ['24px', { lineHeight: '30px', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '26px', fontWeight: '600' }],
      },
      
      // Spacing System
      spacing: {
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
        '112': '28rem',   // 448px
        '128': '32rem',   // 512px
      },
      
      // Border Radius
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      
      // Box Shadows (Premium Feel)
      boxShadow: {
        'premium': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'premium-lg': '0 8px 24px rgba(0, 0, 0, 0.1)',
        'premium-xl': '0 16px 32px rgba(0, 0, 0, 0.1)',
        'green': '0 4px 12px rgba(34, 197, 94, 0.25)',
        'amber': '0 4px 12px rgba(245, 158, 11, 0.25)',
        'red': '0 4px 12px rgba(239, 68, 68, 0.25)',
      },
      
      // Gradients via CSS Variables
      backgroundImage: {
        'hero-morning': 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
        'hero-evening': 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
        'card-fresh': 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        'card-warning': 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
        'card-expired': 'linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%)',
        'primary-gradient': 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
        'warning-gradient': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'error-gradient': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      },
      
      // Animation & Transitions
      animation: {
        'pulse-gentle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      
      // Custom utilities
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [
    forms,
    // Custom plugin for design system utilities
    function({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        '.text-gradient': {
          'background': 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.glass': {
          'background': 'rgba(255, 255, 255, 0.25)',
          'backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.18)',
        },
        '.premium-card': {
          'background': 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          'border-radius': '16px',
          'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.1)',
          'border': '1px solid rgba(229, 231, 235, 0.8)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
};

export default config; 