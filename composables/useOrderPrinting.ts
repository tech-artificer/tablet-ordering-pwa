export const useOrderPrinting = () => {
//   const { unprintedOrders, markAsPrinted } = useOrderMonitor()
const unprintedOrders = ref([])
  const { isPrinting, isRawBTInstalled, testPrint, printOrder, printQueue } = useRawBTPrinter()

  // Print single order and mark as printed
  const printAndMark = async (order: any) => {
    try {
      await printOrder(order)
    //   await markAsPrinted(order.id)
      return true
    } catch (error) {
      console.error('Failed to print and mark order:', error)
      throw error
    }
  }

  // Print all unprinted orders
  const printAllOrders = async () => {
    if (unprintedOrders.value.length === 0) {
      return
    }

    try {
      for (const order of unprintedOrders.value) {
        await printAndMark(order)
        // Small delay between prints
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error('Failed to print all orders:', error)
      throw error
    }
  }

  // Auto-print new orders (optional)
  const autoPrintEnabled = ref(true)
  
  // watch(unprintedOrders, (newOrders, oldOrders) => {
  //   if (!autoPrintEnabled.value || !isRawBTInstalled.value) {
  //     return
  //   }

  //   // Check for new orders
  //   const newOrderIds = newOrders.map((o: any) => o.id)
  //   const oldOrderIds = oldOrders.map((o: any) => o.id)
  //   const addedOrders = newOrders.filter((o: any) => !oldOrderIds.includes(o.id))

  //   // Auto-print new orders
  //   addedOrders.forEach((order: any) => {
  //     printAndMark(order).catch(console.error)
  //   })
  // })

  return {
    unprintedOrders,
    isPrinting,
    isRawBTInstalled,
    printOrder,
    testPrint,
    printAndMark,
    printAllOrders,
    autoPrintEnabled
  }
}