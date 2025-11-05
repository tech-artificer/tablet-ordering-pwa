<script setup lang="ts">

import { defineEventHandler, readBody } from 'h3';
import net from 'net'; // Node.js net module for TCP communication

import { onMounted, onUnmounted } from 'vue';
import type { DeviceOrder } from '~/types';
import { useOrderStore } from '~/stores/Order';
// import order from '~/middleware/order';
const { $echo } = useNuxtApp()
const subscribedtoPrintChannel = ref(false);
const orderStore = useOrderStore()


// const {
//   unprintedOrders,
//   isPrinting,
//   isRawBTInstalled,
//   testPrint,
//   printAndMark,
// printOrder,
//   printAllOrders,
//   autoPrintEnabled
// } = useOrderPrinting()

const { printRaw, printRawSilentAttempt } = useRawBTPrinter()
const order = ref<DeviceOrder | any>(null);
// const currentOrder = ref(<DeviceOrder | null>(null));
// const orderValue = computed(() => currentOrder.value); 


const handlePrinterUpdate = (event: DeviceOrder) => {
   
   order.value = event.order

  // currentOrder.value = order;
  // console.log(order);
  //   // if( order.is_printed ) return
  //     currentOrder.value = order
  //       ElNotification({
  //           title: 'ToPrint',
  //           message: 'Order.',
  //           type: 'info',
  //         })
            // printRawSilentAttempt(order)
            // printOrder(order)
            printRaw('sample')
    // console.log('printer admin.print', event)
    // if (event?.order) {
    //     currentOrder.value = event.order
    //     // Auto-print when order is received
    // }else{
    //     console.log('event', event)
    // }
      
}

orderStore.fetchOrder(1)
onMounted(async() => {

   console.log('Start -------------');
   printRaw('sample text print');

    // const dataToSend = "Server Print Test\nItem A: $1.00\nTotal: $1.00\n"; 

  // const response = await $fetch('http://192.168.100.133:9100/print', {
  //     method: 'POST',
  //     body: { printData: dataToSend },
  //   });
    
    // console.log('Print server response:', response);
  //  window.fully.kioskPrint();
  // console.log(orderStore.sessionOrder);
  //  printRawSilentAttempt(orderStore.sessionOrder as DeviceOrder);
   
  if ( !subscribedtoPrintChannel.value ) {
     subscribedtoPrintChannel.value = true;

    $echo
    .channel(`admin.print`)
    .listen('.order.printed', (e: DeviceOrder) => handlePrinterUpdate(e))
    .error((error : any) => {
        console.error('Error connecting to order channel:', error)
        
      // ElNotification({
      //       title: 'ORder',
      //       message: 'Error.',
      //       type: 'info',
      //     })
    })
  }
 
})

onBeforeUnmount(() => {
  subscribedtoPrintChannel.value = false;
  $echo.leave(`admin.print`)
});


  // const rawbtServerIp = '192.168.100.133'; // e.g., '192.168.1.100'
  // const rawbtServerPort = 9100; // Default port for direct printing protocol

  // try {
  //   await new Promise<void>((resolve, reject) => {
  //     const client = new net.Socket();

  //     client.connect(rawbtServerPort, rawbtServerIp, () => {
  //       console.log('Connected to RawBT server');
  //       // Send the ESC/POS commands or plain text data
  //       client.write('Hello, RawBT Printer!\nThis is a test print.\n\n'); 
  //       client.end(); // Close the connection after sending
  //     });

  //     client.on('end', () => {
  //       console.log('Print job sent and connection closed');
  //       resolve();
  //     });

  //     client.on('error', (err) => {
  //       console.error('RawBT connection error:', err);
  //       reject(err);
  //     });
  //   });

  //   // return { success: true, message: 'Print job sent successfully.' };

  // } catch (error) {
  //   // return { success: false, message: 'Failed to send print job to RawBT server.', error: error.message };
  // }

// const {
// //   unprintedOrders,
// //   isPrinting,
//   isRawBTInstalled,
//   // testPrint,
// //   printAndMark,
// //   printAllOrders,
//   autoPrintEnabled
// } = useOrderPrinting()
// Show notification for new orders
// watch(unprintedOrders, (newOrders) => {
//   if (newOrders.length > 0 && Notification.permission === 'granted') {
//     new Notification(`${newOrders.length} unprinted orders`)
//   }
// })


// Request notification permission
// onMounted(() => {
  // doPrint()
  // testPrint
  // if ('Notification' in window) {
  //   Notification.requestPermission()
  // }
// })
</script>

<template>
  <div class="kitchen-display">
    <!-- RawBT Status -->
    <div class="status-bar">
      <div v-if="true" class="alert alert-danger">
        ⚠️ RawBT not installed
        <a href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter" target="_blank">
          Install from Play Store
        </a>
      </div>
      <div v-else class="alert alert-success">
        ✅ RawBT Ready
      </div>
    </div>

    <button class="text-white" @click="">Print</button> 

    <!-- Auto-print toggle -->
    <div class="controls text-white">
      {{ order }}
    </div>

    <!-- Orders list -->
    <div class="orders-section text-white">
      <!-- {{ orderStore.sessionOrder }} -->
      <!-- <h2>Unprinted Orders ({{ unprintedOrders.length }})</h2> -->
   
        <!-- v-if="unprintedOrders.length > 0"
        @click="printAllOrders"
        :disabled="isPrinting || !isRawBTInstalled"
        class="btn-primary"
      > -->
        <!-- {{ isPrinting ? 'Printing...' : `Print All (${unprintedOrders.length})` }}
      </button> --> 

     
    </div>
  </div>
</template>



<style scoped>
.status-bar {
  padding: 1rem;
  margin-bottom: 1rem;
}

.alert {
  padding: 1rem;
  border-radius: 0.5rem;
}

.alert-danger {
  background: #fee;
  color: #c00;
}

.alert-success {
  background: #efe;
  color: #060;
}

.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.order-card {
  border: 1px solid #ddd;
  padding: 1rem;
  border-radius: 0.5rem;
}

.total {
  font-size: 1.5rem;
  font-weight: bold;
  color: #060;
}

.btn-print {
  width: 100%;
  padding: 0.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.btn-print:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
