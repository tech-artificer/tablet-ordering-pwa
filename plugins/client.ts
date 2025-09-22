export default defineNuxtPlugin(async() => {
    const { setTheme } = useTheme()
    const savedTheme = localStorage.getItem('theme') || 'woosooWarm'
    setTheme(savedTheme)
    watch(() => useTheme().currentThemeName.value, (newTheme) => {
        localStorage.setItem('theme', newTheme)
    })
})
