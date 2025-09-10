<template>
    <div class="max-h-screen max-w-screen bg-black relative">
        <!-- Animated background flames -->
        <div class="absolute inset-0 pointer-events-none">
            <img
                src="/gif/flame.gif"
                alt="flames"
                class="absolute opacity-60 p-0 m-0 w-full h-full"
            />
        </div>
        <!-- Floating food items -->
        <div class="absolute inset-0 pointer-events-none">
            <!-- Top left sushi -->
            <div class="floating-food absolute animate-float-slow top-left">
                <CommonImage
                    :src="CustomImage.IMAGE_1"
                    alt="sushi rolls"
                    class="floating-image-responsive"
                />
                </div>
            <!-- Top right meat -->
              <div class="floating-food absolute animate-float-slow top-right">
                <CommonImage
                    :src="CustomImage.IMAGE_4"
                    alt="sushi rolls"
                    class="floating-image-responsive"
                />
                </div>
            <!-- Bottom left fried item -->
              <div class="floating-food absolute animate-float-slow bottom-left">
                <CommonImage
                    :src="CustomImage.IMAGE_3"
                    alt="sushi rolls"
                    class="floating-image-responsive"
                />
                </div>
            <!-- Bottom right rolled item -->
              <div class="floating-food absolute animate-float-slow bottom-right">
                <CommonImage
                    :src="CustomImage.IMAGE_2"
                    alt="sushi rolls"
                    class="floating-image-responsive"
                />
                </div>
        </div>
        <WoosooHome />
    </div>
</template>
<style scoped>


@keyframes float-slow {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(2deg); }
}

@keyframes float-medium {
    0%, 100% { transform: translateY(0px) rotate(12deg); }
    50% { transform: translateY(-15px) rotate(8deg); }
}

@keyframes float-fast {
    0%, 100% { transform: translateY(0px) rotate(-6deg); }
    50% { transform: translateY(-25px) rotate(-10deg); }
}

.animate-float-slow {
    animation: float-slow 6s ease-in-out infinite;
}

.animate-float-medium {
    animation: float-medium 4s ease-in-out infinite;
}

.animate-float-fast {
    animation: float-fast 5s ease-in-out infinite;
}

.floating-food {
    filter: drop-shadow(0 25px 25px rgba(0, 0, 0, 0.5));
}

.floating-food:hover {
    filter: drop-shadow(0 35px 35px rgba(0, 0, 0, 0.7));
}

.floating-image-responsive {
  /* Responsive sizing that works with forced landscape */
  @apply w-24 h-24;           /* Mobile: 48px */
  @apply sm:w-32 sm:h-32;     /* Large mobile: 64px */
  @apply md:w-40 md:h-40;     /* Tablet (forced landscape): 80px */
  @apply lg:w-48 lg:h-48;     /* Desktop: 96px */
  @apply xl:w-56 xl:h-56;     /* Large desktop: 112px */
  @apply 2xl:w-64 2xl:h-64;   /* XL desktop: 128px */
  
  /* Common properties */
  @apply object-cover transform hover:scale-110 transition-transform duration-300;
  @apply rounded-lg shadow-sm; /* Optional styling */
}

.top-left {
  top: clamp(5%, 8vh, 12%);
  left: clamp(5%, 8vw, 12%);
}

.top-right {
  top: clamp(5%, 8vh, 12%);
  right: clamp(5%, 8vw, 12%);
}

.bottom-left {
  bottom: clamp(5%, 8vh, 12%);
  left: clamp(5%, 8vw, 12%);
}

.bottom-right {
  bottom: clamp(5%, 8vh, 12%);
  right: clamp(5%, 8vw, 12%);
}

/* Corrected the values to fit the class names */

/* Special handling for forced landscape tablets */
@media screen and (min-width: 768px) and (max-width: 1024px) {
  .floating-image-responsive {
    /* Use viewport units for rotated screens */
    width: clamp(120px, 14vh, 180px);
    height: clamp(120px, 14vh, 180px);
  }
  
  .top-left {
    top: 8%;
    left: 6%;
  }

  .top-right {
    top: 8%;
    right: 6%;
  }

  .bottom-left {
    bottom: 8%;
    left: 6%;
  }

  .bottom-right {
    bottom: 8%;
    right: 6%;
  }


}
</style>
