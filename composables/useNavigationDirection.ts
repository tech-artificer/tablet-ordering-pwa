export const useNavigationDirection = () => {
    const route = useRoute()
    const direction = ref<'forward' | 'back'>('forward')
    const routeHistory = ref<string[]>([])
    const routeDepth = ref<Record<string, number>>({})

    // Calculate route depth based on path segments
    const calculateRouteDepth = (path: string): number => {
        return path.split('/').filter(segment => segment.length > 0).length
    }

    // Initialize route tracking
    const initializeNavigation = () => {
        const currentPath = route.fullPath
        routeHistory.value = [currentPath]
        routeDepth.value[currentPath] = calculateRouteDepth(currentPath)
    }

    // Watch for route changes
    watch(() => route.fullPath, (newPath, oldPath) => {
        if (!oldPath) {
            direction.value = 'forward'
            return
        }

        const newDepth = calculateRouteDepth(newPath)
        const oldDepth = routeDepth.value[oldPath] || calculateRouteDepth(oldPath)

        // Store depth for new route
        routeDepth.value[newPath] = newDepth

        // Check if this is a back navigation based on history
        const historyIndex = routeHistory.value.indexOf(newPath)
        const isInHistory = historyIndex !== -1 && historyIndex < routeHistory.value.length - 1

        // Determine direction
        if (isInHistory) {
            direction.value = 'back'
            // Clean up history - remove routes after the current one
            routeHistory.value = routeHistory.value.slice(0, historyIndex + 1)
        } else if (newDepth < oldDepth) {
            // Going to a shallower route (likely back)
            direction.value = 'back'
            routeHistory.value.push(newPath)
        } else {
            // Going forward
            direction.value = 'forward'
            if (!routeHistory.value.includes(newPath)) {
                routeHistory.value.push(newPath)
            }
        }
    })

    // Handle browser back button
    const handlePopState = () => {
        direction.value = 'back'
    }

    // Get page transition config
    const getPageTransition = (customDuration = 300) => {
        return computed(() => ({
            name: direction.value === 'forward' ? 'slide-left' : 'slide-right',
            mode: 'out-in' as const,
            duration: customDuration
        }))
    }

    // Programmatic navigation with direction control
    const navigateForward = (to: string | object) => {
        direction.value = 'forward'
        return navigateTo(to)
    }

    const navigateBack = (to?: string | object) => {
        direction.value = 'back'
        if (to) {
            return navigateTo(to)
        } else {
            return window.history.back()
        }
    }

    return {
        direction: readonly(direction),
        routeHistory: readonly(routeHistory),
        initializeNavigation,
        handlePopState,
        getPageTransition,
        navigateForward,
        navigateBack
    }
}
