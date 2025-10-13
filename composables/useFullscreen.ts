export const useFullscreen = () => {
    const isFullscreen = ref(false)

    const enterFullscreen = async() => {
       
        try {
            const elem = document.documentElement

            if (elem.requestFullscreen) {
                await elem.requestFullscreen()
            } else if ((elem as any).mozRequestFullScreen) { /* Firefox */
                await (elem as any).mozRequestFullScreen()
            } else if ((elem as any).webkitRequestFullScreen) { /* Chrome, Safari & Opera */
                await (elem as any).webkitRequestFullScreen()
            } else if ((elem as any).msRequestFullscreen) { /* IE/Edge */
                await (elem as any).msRequestFullscreen()
            }

            isFullscreen.value = true
        } catch (error) {
            console.error('Error entering fullscreen:', error)
        }
    };


    const exitFullscreen = async() => {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen()
            } else if ((document as any).mozCancelFullScreen) { /* Firefox */
                await (document as any).mozCancelFullScreen()
            } else if ((document as any).webkitExitFullscreen) { /* Chrome, Safari and Opera */
                await (document as any).webkitExitFullscreen()
            } else if ((document as any).msExitFullscreen) { /* IE/Edge */
                await (document as any).msExitFullscreen()
            }
            isFullscreen.value = false
        } catch (error) {
            console.error('Error exiting fullscreen:', error)
        }
    };

    const toggleFullscreen = () => {
        if (isFullscreen.value) {
            exitFullscreen()
        } else {
             enterFullscreen()
        }
    };

    
    onMounted(() => {
        const handleFullscreenChange = () => {
            isFullscreen.value = !!(
                document.fullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).msFullscreenElement
            )
        }   

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        document.addEventListener('mozfullscreenchange', handleFullscreenChange)
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
        document.addEventListener('MSFullscreenChange', handleFullscreenChange)

        onUnmounted(() => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
        });
    });

        

    return {
        isFullscreen,
        enterFullscreen,
        exitFullscreen,
        toggleFullscreen
    }
}