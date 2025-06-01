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
                primary: '#F6B56D',
                secondary: '#8b7355',
                lightGreen: '#A5D6A7',
                darkGreen: '#4AD775',
                accent: '#d4752a',
                surface: '#f8f5f1',
                textLightPrimary: '#f8f5f1',
                textLightSecondary: '#D3D3D3',
                textDarkPrimary: '#2d1b12',
                textDarkSecondary: '#6b5b4d',
                rose: '#FFA0A2',
                lightRose: '#FCCCCC',
                textLight: '#efc086',
                border: '#e8ddd4',
                success: '#4AD775',
                warning: '#FFB01D',
                error: '#dc2626',
                info: '#3b82f6',
                muted: '#D3D3D3',
                PeachPuff: '#FFD88E',
                cardBackground: '#ffffff',
                hover: '#f0e6db',
            },
            fontFamily: {
                custom: ['Inter'],
            },
        }
    },
    plugins: []
}
