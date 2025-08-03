<template>
    <div class="order-pending">
        <h1 class="text-2xl font-bold mt-10">Order Confirmed</h1>
        <div class="flex justify-center">
            <CommonImage
                src="/logo/logo2.png"
                alt="logo"
                class="w-20 h-20"
            />
        </div>

        <!-- Chef Animation -->
        <div class="chef-container">
            <div class="chef-illustration">
                <!-- Chef SVG -->
                <svg width="120" height="120" viewBox="0 0 120 120" class="chef-svg">
                    <!-- Chef Hat -->
                    <ellipse cx="60" cy="35" rx="25" ry="15" fill="#ffa07a" stroke="#" stroke-width="2" />
                    <!-- Chef Head -->
                    <circle cx="60" cy="55" r="20" fill="black" />
                    <!-- Chef Body -->
                    <rect x="45" y="70" width="30" height="35" rx="15" fill="black" />
                    <!-- Chef Arms -->
                    <circle cx="40" cy="80" r="8" fill="black" />
                    <circle cx="80" cy="80" r="8" fill="black" />
                    <!-- Cooking Pan -->
                    <ellipse cx="60" cy="95" rx="15" ry="8" fill="#ffffff" class="cooking-pan" />
                    <!-- Steam Animation -->
                    <g class="steam">
                        <path d="M50 88 Q52 82 50 78" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.7" />
                        <path d="M60 88 Q62 82 60 78" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.7" />
                        <path d="M70 88 Q72 82 70 78" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.7" />
                    </g>
                </svg>
            </div>

            <!-- orange Circle Background -->
            <div class="gray-circle" />
        </div>

        <!-- Status Text -->
        <div class="status-text">
            <p>Preparing your food</p>
            <p>Please wait . .</p>
        </div>
    </div>
</template>
