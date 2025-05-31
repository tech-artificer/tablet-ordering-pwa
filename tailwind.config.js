/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./components/**/*.{js,vue,ts}",
        "./layouts/**/*.vue",
        "./pages/**/*.vue",
        "./plugins/**/*.{js,ts}",
        "./nuxt.config.{js,ts}",
        "./app.vue"
    ],
    theme: {
        extend: {
            colors: {
                background: '#fefcfa',
                primary: '#ea7c2b',
                secondary: '#8b7355',
                accent: '#d4752a',
                surface: '#f8f5f1',
                textPrimary: '#2d1b12',
                textSecondary: '#6b5b4d',
                textLight: '#efc086',
                border: '#e8ddd4',
                success: '#22c55e',
                warning: '#ea7c2b',
                error: '#dc2626',
                info: '#3b82f6',
                muted: '#f3ede6',
                cardBackground: '#ffffff',
                hover: '#f0e6db'
            },
            fontFamily: {
                custom: ['Inter'],
            },
        }
    },
    plugins: []
}
