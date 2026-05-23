<template>
    <div class="flex flex-col items-center gap-0.5" role="img" aria-label="Woosoo">
        <!-- Chopsticks -->
        <svg
            width="100"
            height="28"
            viewBox="0 0 100 28"
            fill="none"
            aria-hidden="true"
        >
            <line
                x1="20"
                y1="24"
                x2="44"
                y2="4"
                stroke="#c8956e"
                stroke-width="4.5"
                stroke-linecap="round"
            />
            <line
                x1="56"
                y1="24"
                x2="80"
                y2="4"
                stroke="#c8956e"
                stroke-width="4.5"
                stroke-linecap="round"
            />
        </svg>
        <!-- Character circles -->
        <div class="flex items-center gap-2.5">
            <div
                class="w-[76px] h-[76px] rounded-full bg-[#f6b56d] flex items-center justify-center select-none"
                aria-hidden="true"
            >
                <span class="text-[28px] font-bold text-[#1a0e06] leading-none">우</span>
            </div>
            <div
                class="w-[76px] h-[76px] rounded-full bg-[#1e1b19] border border-white/10 flex items-center justify-center select-none"
                aria-hidden="true"
            >
                <span class="text-[28px] font-bold text-white leading-none">수</span>
            </div>
        </div>
    </div>
</template>
