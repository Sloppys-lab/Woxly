/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        card: '#1a1a1a',
        'card-foreground': '#F1F5F9',
        foreground: '#F1F5F9',
        muted: '#1a1a1a',
        'muted-foreground': '#666666',
        primary: '#ffbdd3',
        'primary-foreground': '#FFFFFF',
        accent: '#ffbdd3',
        'accent-foreground': '#FFFFFF',
        destructive: '#EF4444',
        'destructive-foreground': '#FFFFFF',
        border: '#1a1a1a',
        input: '#1a1a1a',
        ring: '#ffbdd3',
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255, 189, 211, 0.3)',
        'glow-sm': '0 0 10px rgba(255, 189, 211, 0.2)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out infinite 2s',
        'smooth-pulse': 'smooth-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'smooth-ping': 'smooth-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-in': 'fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'zoom-in': 'zoom-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in-top': 'slide-in-top 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-bottom': 'slide-in-bottom 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-bottom-2': 'slide-in-bottom-2 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both',
        'slide-in-bottom-4': 'slide-in-bottom-4 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both',
        'slide-in-bottom-6': 'slide-in-bottom-6 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both',
        'shimmer': 'shimmer 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'smooth-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        'smooth-ping': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.7' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'zoom-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-in-top': {
          '0%': { transform: 'translateY(-30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-bottom': {
          '0%': { transform: 'translateY(15px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-bottom-2': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-bottom-4': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-bottom-6': {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

