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
            fontSize: {
                'xs': '.50rem',  // This is a default, but you can override it
                'sm': '.75rem',
                'base': '85rem',
                'lg': '1rem',
                'xl': '1.25rem',
                '2xl': '1.5rem',
                '3xl': '1.875rem',
            },
            screens: {
                // Mobile-first breakpoints (recommended)
                'xs': '375px',    // Small phones
                'sm': '640px',    // Large phones / small tablets
                'md': '768px',    // Tablets
                'lg': '1024px',   // Small laptops
                'xl': '1280px',   // Desktop
                '2xl': '1536px',  // Large desktop
                '3xl': '1920px',  // Ultra-wide

                // Max-width breakpoints for desktop-first (when needed)
                'max-2xl': { 'max': '1535px' },
                'max-xl': { 'max': '1279px' },
                'max-lg': { 'max': '1023px' },
                'max-md': { 'max': '767px' },
                'max-sm': { 'max': '639px' },

                // Custom semantic breakpoints
                'mobile': { 'max': '767px' },
                'tablet': { 'min': '768px', 'max': '1023px' },
                'desktop': { 'min': '1024px' },
            },
        },
        // screens: {
        //     // Mobile-first breakpoints (recommended)
        //     'xs': '375px',    // Small phones
        //     'sm': '640px',    // Large phones / small tablets
        //     'md': '768px',    // Tablets
        //     'lg': '1024px',   // Small laptops
        //     'xl': '1280px',   // Desktop
        //     '2xl': '1536px',  // Large desktop
        //     '3xl': '1920px',  // Ultra-wide

        //     // Max-width breakpoints for desktop-first (when needed)
        //     'max-2xl': { 'max': '1535px' },
        //     'max-xl': { 'max': '1279px' },
        //     'max-lg': { 'max': '1023px' },
        //     'max-md': { 'max': '767px' },
        //     'max-sm': { 'max': '639px' },

        //     // Custom semantic breakpoints
        //     'mobile': { 'max': '767px' },
        //     'tablet': { 'min': '768px', 'max': '1023px' },
        //     'desktop': { 'min': '1024px' },
        // },

        // // Consistent spacing system
        // spacing: {
        //     '18': '4.5rem',
        //     '88': '22rem',
        //     '128': '32rem',
        // },

        // Container settings
        // container: {
        //     center: true,
        //     padding: {
        //         DEFAULT: '1rem',
        //         sm: '1.5rem',
        //         lg: '2rem',
        //         xl: '2.5rem',
        //         '2xl': '3rem',
        //     },
        //     screens: {
        //         sm: '640px',
        //         md: '768px',
        //         lg: '1024px',
        //         xl: '1280px',
        //         '2xl': '1400px', // Custom max-width
        //     },
        // },
    },
    plugins: [
    // Add responsive utilities
    // function({ addUtilities }) {
    //   const newUtilities = {
    //     '.hide-mobile': {
    //       '@media (max-width: 767px)': {
    //         display: 'none',
    //       },
    //     },
    //     '.show-mobile': {
    //       '@media (min-width: 768px)': {
    //         display: 'none',
    //       },
    //     },
    //     '.container-fluid': {
    //       width: '100%',
    //       'padding-left': '1rem',
    //       'padding-right': '1rem',
    //       'margin-left': 'auto',
    //       'margin-right': 'auto',
    //     },
    //   }
    //   addUtilities(newUtilities)
    // },
  ],
}
