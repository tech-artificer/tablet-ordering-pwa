<template>
    <div class="min-h-screen bg-black relative overflow-hidden">
        <!-- Animated background flames -->
        <div class="absolute inset-0 pointer-events-none">
            <CommonImage
                src="/gif/flame.gif"
                alt="flames"
                class="absolute opacity-60 p-0 m-0"
                fit="none"
            />
        </div>
        <!-- Floating food items -->
        <div class="absolute inset-0 pointer-events-none">
            <!-- Top left sushi -->
            <div class="floating-food absolute animate-float-slow h-56 w-56">
                <CommonImage
                    src="/images/1.png"
                    alt="sushi rolls"
                    class="object-cover transform hover:scale-110 transition-transform duration-300"
                />
            </div>
            <!-- Top right meat -->
            <div class="floating-food absolute top-0 right-0 animate-float-medium h-56 w-56">
                <CommonImage
                    src="/images/2.png"
                    alt="grilled meat"
                    class="object-cover rounded-lg shadow-2xl transform rotate-45 hover:scale-110 transition-transform duration-300"
                />
            </div>
            <!-- Bottom left fried item -->
            <div class="floating-food absolute bottom-0 left-0 animate-float-fast h-56 w-56">
                <CommonImage
                    src="/images/3.png"
                    alt="fried food"
                    class="object-cover rounded-lg shadow-2xl transform rotate-90 hover:scale-110 transition-transform duration-300"
                />
            </div>
            <!-- Bottom right rolled item -->
            <div class="floating-food absolute bottom-0 right-0 animate-float-slow h-56 w-56">
                <CommonImage
                    src="/images/4.png"
                    alt="rolled food"
                    class="object-cover rounded-lg shadow-2xl transform -rotate-90 hover:scale-110 transition-transform duration-300"
                />
            </div>
        </div>
        <!-- Main content -->
        <div class="relative z-10 flex flex-col items-center justify-center px-4">
        <!-- Logo -->
        <div>
            <CommonImage
                src="/logo/logo1.png"
                alt="logo"
                class="w-48 h-48"
            />
        </div>
        <!-- Main headline -->
        <div class="text-center mb-12">
            <h2 class="text-white text-4xl md:text-5xl leading-tight">
            The grill is hot.
            </h2>
            <h2 class="text-white text-4xl md:text-5xl leading-tight">
            The meat is marinated.
            </h2>
            <h2 class="text-white text-4xl md:text-5xl leading-tight">
            Let's get started.
            </h2>
        </div>
        <!-- Input and button -->
        <div class="w-full max-w-md space-y-2">
            <WoosooGuestCount v-model:v-model="guestCount" />
            <button
                class="w-full py-4 px-8 bg-primary text-black text-xl font-bold rounded-md hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:text-white"
                @click="startWooSoo"
            >
                Let's WooSoo This!
            </button>

            <p class="text-gray-400 text-sm text-center">
                Tap to begin your <span class="font-bold text-primary">Ultimate K-BBQ experience</span>
            </p>
        </div>
        </div>
    </div>
</template>

<script setup>
const guestCount = ref(1)

const startWooSoo = () => {
console.log(`Starting WooSoo experience for ${guestCount.value} guests!`)
    navigateTo('/menu')
}
</script>
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
</style>
