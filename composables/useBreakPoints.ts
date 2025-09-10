export const useBreakpoints = () => {
  const windowWidth = ref(0)
  const windowHeight = ref(0)
  
  const updateSize = () => {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  }
  
  onMounted(() => {
    updateSize()
    window.addEventListener('resize', updateSize)
  })
  
  onUnmounted(() => {
    window.removeEventListener('resize', updateSize)
  })
  
  // Computed breakpoint states
  const breakpoints = computed(() => ({
    xs: windowWidth.value >= 375,
    sm: windowWidth.value >= 640,
    md: windowWidth.value >= 768,
    lg: windowWidth.value >= 1024,
    xl: windowWidth.value >= 1280,
    '2xl': windowWidth.value >= 1536,
    '3xl': windowWidth.value >= 1920,
  }))
  
  // Semantic breakpoints
  const isMobile = computed(() => windowWidth.value < 768)
  const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024)
  const isDesktop = computed(() => windowWidth.value >= 1024)
  const isTouch = computed(() => 'ontouchstart' in window)
  
  // Utility functions
  const greaterThan = (breakpoint: string) => computed(() => {
    const breakpointValues = { xs: 375, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 }
    return windowWidth.value >= breakpointValues[breakpoint as keyof typeof breakpointValues]
  })
  
  const between = (min: string, max: string) => computed(() => {
    const breakpointValues = { xs: 375, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 }
    return windowWidth.value >= breakpointValues[min as keyof typeof breakpointValues] && 
           windowWidth.value < breakpointValues[max as keyof typeof breakpointValues]
  })
  
  return {
    windowWidth: readonly(windowWidth),
    windowHeight: readonly(windowHeight),
    breakpoints,
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    greaterThan,
    between,
  }
}