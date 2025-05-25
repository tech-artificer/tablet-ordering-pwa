export default defineNuxtPlugin(() => {
    const { setTheme } = useTheme()
    // Initialize theme from localStorage or default
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    // Save theme changes to localStorage
    watch(() => useTheme().currentThemeName.value, (newTheme) => {
        localStorage.setItem('theme', newTheme)
    })
})
