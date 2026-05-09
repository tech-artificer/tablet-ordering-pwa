/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: [
        "./components/**/*.{vue,js,ts}",
        "./layouts/**/*.vue",
        "./pages/**/*.vue",
        "./plugins/**/*.{js,ts}",
        "./app.vue",
        "./nuxt.config.{js,ts}"
    ],
    theme: {
        extend: {
            fontFamily: {
                kanit: ["Kanit", "ui-sans-serif", "system-ui", "sans-serif"],
                raleway: ["Raleway", "ui-sans-serif", "system-ui", "sans-serif"],
                serif: ["Playfair Display", "Georgia", "serif"], // Premium display font for headings
            },
            colors: {
                // KBBQ Warm Aesthetic - Samgyupsal Experience
                // Primary: Warm gold (fire/grill heat)
                primary: "#F6B56D", // Warm gold (primary CTA)
                "primary-dark": "#C78B45", // Darker for hover/active states
                "primary-light": "#F9D0A1", // Lighter for subtle accents

                // Accent: Deep charcoal (grilling surface)
                accent: "#2A2A2A", // Warm charcoal
                "accent-warm": "#3D3530", // Warmer brown-charcoal

                // Background: Deep, warm blacks
                secondary: "#1A1A1A", // Deep background
                "secondary-dark": "#0F0F0F", // Deepest background
                "secondary-light": "#3D3D3D", // Lighter neutral

                // Semantic colors
                success: "#10B981",
                error: "#EF4444",
                warning: "#F59E0B",

                // Surface colors - warm overlays
                surface: {
                    5: "rgba(255, 255, 255, 0.05)",
                    10: "rgba(255, 255, 255, 0.10)",
                    15: "rgba(255, 255, 255, 0.12)",
                    20: "rgba(255, 255, 255, 0.20)",
                },

                // Text colors
                on: "#FFFFFF",
                text: {
                    DEFAULT: "#FFFFFF",
                    primary: "#F6B56D",
                    secondary: "#D1D5DB",
                    muted: "rgba(255, 255, 255, 0.60)",
                    hint: "rgba(255, 255, 255, 0.40)",
                },
                muted: {
                    DEFAULT: "rgba(255, 255, 255, 0.60)",
                    60: "rgba(255, 255, 255, 0.60)",
                },

                // Backdrop colors
                backdrop: {
                    40: "rgba(0, 0, 0, 0.40)",
                    60: "rgba(0, 0, 0, 0.60)",
                    80: "rgba(0, 0, 0, 0.80)",
                },

                // White/Black
                white: "#FFFFFF",
                black: "#000000",
            },
            spacing: {
                "safe-area": "max(1rem, env(safe-area-inset-bottom))",
            },
            backdropBlur: {
                xs: "2px",
                sm: "4px",
                DEFAULT: "8px",
                lg: "12px",
            },
            boxShadow: {
                glow: "0 0 20px rgba(246, 181, 109, 0.25)",
                "glow-sm": "0 0 12px rgba(246, 181, 109, 0.15)",
                warm: "0 4px 16px rgba(0, 0, 0, 0.4)",
            },
            keyframes: {
                "fade-in": {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                "slide-up": {
                    "0%": { transform: "translateY(16px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                "pulse-glow": {
                    "0%, 100%": { boxShadow: "0 0 12px rgba(246, 181, 109, 0.2)" },
                    "50%": { boxShadow: "0 0 20px rgba(246, 181, 109, 0.4)" },
                },
                "pulse-live": {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.3" },
                },
            },
            animation: {
                "fade-in": "fade-in 0.3s ease-out",
                "slide-up": "slide-up 0.4s ease-out",
                "pulse-glow": "pulse-glow 2s ease-in-out infinite",
                "pulse-live": "pulse-live 2s ease-in-out infinite",
            },
        },
    },
    plugins: []
}
