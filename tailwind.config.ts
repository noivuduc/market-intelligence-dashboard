import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary background layers
        ops: {
          black: '#080B0E',
          900: '#0D1117',
          800: '#111820',
          700: '#161E2A',
          600: '#1C2636',
          500: '#243040',
          400: '#2E3D50',
          300: '#3A4D63',
        },
        // Tactical accent - muted green (operational)
        tac: {
          50:  '#E8F5EE',
          100: '#C3E6D0',
          200: '#9DD6B2',
          300: '#77C794',
          400: '#51B876',
          500: '#3DA85E',  // primary action green
          600: '#2D8A48',
          700: '#1F6C35',
          800: '#134E23',
          900: '#083012',
        },
        // Amber / warning
        amber: {
          50:  '#FFF8E7',
          100: '#FEECC0',
          200: '#FDD98F',
          300: '#FCC55E',
          400: '#FBB12D',
          500: '#E89B10',  // primary warning
          600: '#C07D08',
          700: '#975F05',
          800: '#6F4203',
          900: '#472501',
        },
        // Critical / red
        crit: {
          50:  '#FDECEA',
          100: '#FAC8C4',
          200: '#F5938C',
          300: '#F05E54',
          400: '#E83026',
          500: '#C72019',  // primary critical
          600: '#A31814',
          700: '#7E120F',
          800: '#5A0D0A',
          900: '#360705',
        },
        // Steel / neutral
        steel: {
          50:  '#F0F4F8',
          100: '#D9E3ED',
          200: '#B8CEDF',
          300: '#97B9D1',
          400: '#76A4C3',
          500: '#5A8EAF',
          600: '#447292',
          700: '#305674',
          800: '#1E3B55',
          900: '#0F2037',
        },
        // Text hierarchy
        ink: {
          primary:   '#E2EAF0',
          secondary: '#9AAFC2',
          muted:     '#5A7390',
          ghost:     '#384D61',
        },
        // Status semantic colors
        status: {
          confirmed: '#3DA85E',
          watch:     '#E89B10',
          critical:  '#C72019',
          delayed:   '#5A7390',
          inferred:  '#76A4C3',
          stable:    '#2D8A48',
          elevated:  '#FBB12D',
        },
      },
      fontFamily: {
        mono:    ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs:    ['0.75rem',   { lineHeight: '1.125rem' }],
        sm:    ['0.8125rem', { lineHeight: '1.25rem' }],
        base:  ['0.875rem',  { lineHeight: '1.375rem' }],
        md:    ['0.9375rem', { lineHeight: '1.5rem' }],
        lg:    ['1.0625rem', { lineHeight: '1.625rem' }],
        xl:    ['1.1875rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.375rem',  { lineHeight: '1.875rem' }],
        '3xl': ['1.625rem',  { lineHeight: '2.125rem' }],
        '4xl': ['2.125rem',  { lineHeight: '2.625rem' }],
      },
      spacing: {
        px: '1px',
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        2.5: '10px',
        3: '12px',
        3.5: '14px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
      },
      borderWidth: {
        DEFAULT: '1px',
        0: '0',
        2: '2px',
      },
      boxShadow: {
        'ops':      '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.6)',
        'ops-md':   '0 4px 6px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.6)',
        'ops-lg':   '0 10px 15px rgba(0,0,0,0.5), 0 4px 6px rgba(0,0,0,0.4)',
        'glow-tac': '0 0 12px rgba(61,168,94,0.25)',
        'glow-amb': '0 0 12px rgba(232,155,16,0.25)',
        'glow-crit':'0 0 12px rgba(199,32,25,0.25)',
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan':         'scan 4s linear infinite',
        'blink-slow':   'blink 2s step-end infinite',
        'fade-in':      'fadeIn 0.3s ease-out',
        'slide-up':     'slideUp 0.25s ease-out',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      gridTemplateColumns: {
        'dashboard': 'repeat(12, minmax(0, 1fr))',
        'sidebar':   '240px 1fr',
        'detail':    '1fr 320px',
      },
    },
  },
  plugins: [],
}

export default config
