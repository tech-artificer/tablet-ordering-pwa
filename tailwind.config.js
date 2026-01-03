import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './components/**/*.{vue,js,ts}',
        './layouts/**/*.vue',
        './pages/**/*.vue',
        './plugins/**/*.{js,ts}',
        './app.vue',
        './nuxt.config.{js,ts}'
    ],
    theme: {
        extend: {
            fontFamily: {
                kanit: ['Kanit', ...defaultTheme.fontFamily.sans],
                raleway: ['Raleway', ...defaultTheme.fontFamily.sans]
            },
            colors: {
                'primary': '#F6B56D',       // Your main orange-gold color
                'primary-dark': '#C78B45', // Darker shade for hover/active
                'primary-light': '#F9D0A1',// Lighter shade for subtle accents

                'secondary': '#252525',    // Your main dark/black color
                'secondary-dark': '#1C1C1C',// Darker for deep backgrounds
                'secondary-light': '#4A4A4A',// Lighter for borders/muted text

                'white': '#FFFFFF',
                'black': '#000000',

                // System/Utility colors
                'success': '#10B981',
                'error': '#EF4444',

                // Surface colors - for cards and containers
                'surface': {
                    '5': 'rgba(255, 255, 255, 0.05)',
                    '10': 'rgba(255, 255, 255, 0.10)',
                    '20': 'rgba(255, 255, 255, 0.20)',
                },

                // Text colors
                'on': '#FFFFFF',           // Text on dark backgrounds
                'muted': {
                    DEFAULT: 'rgba(255, 255, 255, 0.60)',
                    '60': 'rgba(255, 255, 255, 0.60)',
                },

                // Backdrop colors - for overlays
                'backdrop': {
                    '40': 'rgba(0, 0, 0, 0.40)',
                    '80': 'rgba(0, 0, 0, 0.80)',
                },
            },
            backdropBlur: {
                'xs': '2px',
                'sm': '4px',
                'DEFAULT': '8px',
            }
        },
    },
    plugins: []
}
