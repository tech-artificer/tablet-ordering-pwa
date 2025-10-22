<template>
    <div class="bg-gray-900 text-white h-full w-full min-h-screen min-w-screen">
        <div class="w-full p-2 text-center">
            <div class="flex items-center justify-center gap-2">
                <p class="text-2xl">
                    Woosoo Printer Device
                    <CommonImage :src="CustomLogo.LOGO_1" alt="logo" class="w-24 h-24 mx-auto"/>
                </p>
            </div>
            <div class="flex items-center justify-center mt-2 py-4">
                <div class="rounded-full bg-white p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" :stroke="isConnected ? 'green' : 'red'">
                        <path v-if="isConnected" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        <circle v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" cx="12" cy="12" r="10"/>
                    </svg>
                </div>
                <p class="ml-2 text-xl" :class="isConnected ? 'text-green-600' : 'text-red-600'">{{ isConnected ? 'Connected' : 'Disconnected' }}</p>
            </div>

            <button v-show="isConnected" class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 w-full" @click="_print()">Print</button>
        </div>
        <div class="w-full p-2">
            <div class="w-full">
                <button v-show="!isConnected" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full" @click="connectPrinter()">Connect</button>
            </div>
            <div class="w-full">
                <button v-show="isConnected" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 w-full" @click="disconnectPrinter()">Disconnect</button>
            </div>
        </div>
        <div class="mt-4 p-3">
            <p class="font-semibold">Setup Required (for new device)</p>
            <ol class="list-decimal list-inside mt-2 space-y-1">
                <li>Install RawBT app from Play Store</li>
                <li>Open RawBT and pair your printer</li>
                <li>In RawBT settings, enable "Intent Service"</li>
                <li>Note your printer's Bluetooth MAC address</li>
            </ol>
        </div>
    </div>
</template>
<script setup>
const { $echo } = useNuxtApp()
definePageMeta({
    layout: 'printLayout'
})
onMounted(() => {
    isConnected.value = checkRawBT() ? true : false
    printListener()
})
const isConnected = ref(false)
const currentOrder = ref(null)
const printListener = () => {
    $echo
    .channel(`printCurrentOrder`)
    .listen('.order.printed', (e) => handlePrinterUpdate(e))
    .error((error) => {
        console.error('Error connecting to order channel:', error)
    })
}
const handlePrinterUpdate = (event) => {
    console.log('printer update', event)
    if (event?.order) {
        currentOrder.value = event.order
        //buildPrintData(event.order)
        buildPrintData()
    }
}
const connectViaIntent = () => {
    try {
        //android intent
        const intent = 'intent://print_test_1/#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end'
        window.location.href = intent
        // Set connected after a delay (assuming successful connection)
        setTimeout(() => {
            isConnected.value = true
        }, 2000)
    } catch (error) {
        console.log(error)
    }
}

const connectPrinter = () => {
    try {
        connectViaIntent()
        window.RawBT.connect()
    } catch (error) {
        console.error('Connection error:', error)
    }
}
const printViaIntent = () => {
    try {
        const printData = buildPrintData()
        const encoded = encodeURIComponent(printData)
        const intent = `intent:${encoded}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end`
        window.location.href = intent
        console.log(intent)
    } catch (error) {
        console.log(error)
    }
}
const checkRawBT = () => {
    console.log('Checking RawBT availability...')
    console.log('window.RawBT:', window.RawBT)
    console.log('window object keys:', Object.keys(window))

    if (typeof window.RawBT !== 'undefined') {
        return true
    } else {
        return false
    }
}
//for print test rani
const buildPrintDataTest = () => {
    const ESC = '\x1B'
    const INIT = ESC + '@'
    const ALIGN_CENTER = ESC + 'a1'
    const ALIGN_LEFT = ESC + 'a0'
    const BOLD_ON = ESC + 'E1'
    const BOLD_OFF = ESC + 'E0'
    const NEWLINE = '\n'

    let data = INIT
    data += ALIGN_CENTER
    data += BOLD_ON + 'TEST PRINT' + NEWLINE + BOLD_OFF
    data += '================================' + NEWLINE
    data += ALIGN_LEFT
    data += 'Date: ' + new Date().toLocaleString() + NEWLINE
    data += 'Device: Tablet A9' + NEWLINE
    data += 'Status: Connected' + NEWLINE
    data += ALIGN_CENTER
    data += '================================' + NEWLINE
    data += 'Print test successful!' + NEWLINE

    return data
}
const buildPrintData = () => {
    console.log(currentOrder.value)
    const ESC = '\x1B'
    const INIT = ESC + '@'
    // const ALIGN_CENTER = ESC + 'a1'
    // const ALIGN_LEFT = ESC + 'a0'
    // const BOLD_ON = ESC + 'E1'
    // const BOLD_OFF = ESC + 'E0'
    const NEWLINE = '\n'

    let data = INIT
    data += NEWLINE
    data += '================================' + NEWLINE
    //CONTENT ORDER
    data += '================================' + NEWLINE

    return data
}

const disconnectPrinter = () => {
    try {
        if (typeof window.RawBT !== 'undefined') {
            window.RawBT.disconnect()
        }
        isConnected.value = false
    } catch (error) {
        console.error('Disconnect error:', error)
    }
}

const _print = () => {
    if (!isConnected.value) {
        console.log('Please connect to printer first')
        return
    }

    try {
        //testing
        const printData = buildPrintDataTest()
        printViaIntent(printData)
    } catch (error) {
        console.error('Print error:', error)
    }
}

</script>

