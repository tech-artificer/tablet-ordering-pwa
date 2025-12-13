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
