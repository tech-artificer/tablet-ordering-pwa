import type { DeviceOrder } from '~/types';



export const useRawBTPrinter = () => {
  const isPrinting = ref(false)
  // 60:6E:41:63:20:66
  const printerMAC = ref('A8:E2:91:08:5E:51') // Your printer's MAC address/Id  
  const isRawBTInstalled = ref(false)

  // Check if RawBT is installed
  const checkRawBT = () => {
    // Try to detect RawBT app
    const testUrl = 'rawbt:test'
    const timeout = setTimeout(() => {
      isRawBTInstalled.value = false
    }, 1000)

    try {
      // window.location.href = testUrl
      clearTimeout(timeout)
      isRawBTInstalled.value = true
    } catch (e) {
      isRawBTInstalled.value = false
    }
  }

  // Generate ESC/POS commands for thermal printer
  const generateESCPOS = (order: DeviceOrder) => {

    // const date = new Date(order.created_at? order.created_at : Date.now());
    let cmd = ''
    
    // Initialize printer
    cmd += '\x1b\x40'
    cmd += '\n'
    // cmd += '\n' // Line feed
    // Separator
    cmd += '\x1b\x61\x00' // Left align
    cmd += '================================\n'
    // cmd += '\n'

    // Header - Center aligned, large text
    cmd += '\x1b\x61\x01' // Center align
    cmd += 'DINE IN\n'
    // cmd += `Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n`
    // cmd += '\x1d\x21\x00' // Normal size
    // cmd += '123 Main Street\n'
    // cmd += 'Tel: (555) 123-4567\n'
    // cmd += '\n' 
    
    // Separator
    // cmd += '\x1b\x61\x00' // Left align
    // cmd += '================================\n'
    // cmd += '\n'

    // Order header
    // cmd += '\x1b\x45\x01' // Bold on
    // cmd += '\x1d\x21\x11' // Double size
    cmd += '\x1b\x61\x00' // Left align
    cmd += '================================\n'
    // cmd += `Package #${order.id}\n`
    // cmd += `Table #${order.id}\n`
    cmd += `Guests: 2\n`
    cmd += '================================\n'
    cmd += '\n'
    // cmd += '\x1d\x21\x00' // Normal size
    // cmd += '\x1b\x45\x00' // Bold off
    

    // cmd += '********************************\n'
    // // Order header
    // // cmd += '\x1b\x45\x01' // Bold on
    // // cmd += '\x1d\x21\x11' // Double size
    // cmd += '\x1b\x61\x01' // Center align
    // cmd += `ORDER #${order.id}\n`
    // cmd += '********************************\n'
    // cmd += '\x1d\x21\x00' // Normal size
    // cmd += '\x1b\x45\x00' // Bold off
    
   
    // cmd += `Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n`
    // cmd += `Customer: ${order.customerName || 'Guest'}\n`
    
    // if (order.tableNumber) {
    //   cmd += `Table: ${order.tableNumber}\n`
    // }
    
    // if (order.orderType) {
    //   cmd += `Type: ${order.orderType}\n`
    // }
    
    // cmd += '\n'
    // cmd += '--------------------------------\n'
    // cmd += '\n'
    
    // Items section
    // cmd += '\x1b\x45\x01' // Bold on
    // cmd += 'ITEMS:\n'
    // cmd += '\x1b\x45\x00' // Bold off
    // cmd += '\n'
    
    // order.items.forEach((item: any) => {
    //   // Item name and quantity
    //   // cmd += '\x1d\x21\x11' // Double size for item name
    //   cmd += `${item.quantity}x ${item.name}\n`
    //   // cmd += '\x1d\x21\x00' // Normal size
      
    //   // Special instructions
    //   // if (item.notes) {
    //   //   cmd += `   NOTE: ${item.notes}\n`
    //   // }
      
    //   // Modifiers/additions
    //   // if (item.modifiers && item.modifiers.length > 0) {
    //   //   item.modifiers.forEach((mod: any) => {
    //   //     cmd += `   + ${mod.name}\n`
    //   //   })
    //   // }
      
    //   // Price - right aligned
    //   // const priceStr = `$${item.price.toFixed(2)}`
    //   // const spaces = 32 - priceStr.length
    //   // cmd += ' '.repeat(spaces) + priceStr + '\n'
    //   // cmd += '\n'
    // })
    
    // cmd += '--------------------------------\n'
    
    // // Subtotal, tax, total
    // if (order.subtotal) {
    //   cmd += `Subtotal:${' '.repeat(19)}$${order.subtotal.toFixed(2)}\n`
    // }
    // if (order.tax) {
    //   cmd += `Tax:${' '.repeat(24)}$${order.tax.toFixed(2)}\n`
    // }
    // if (order.tip) {
    //   cmd += `Tip:${' '.repeat(24)}$${order.tip.toFixed(2)}\n`
    // }
    
    // cmd += '\x0a'
    
    // // // Total - right aligned, large, bold
    // // cmd += '\x1b\x61\x02' // Right align
    // // cmd += '\x1b\x45\x01' // Bold on
    // // cmd += '\x1d\x21\x11' // Double size
    // // cmd += `TOTAL: $${order.total.toFixed(2)}\n`
    // // cmd += '\x1d\x21\x00' // Normal size
    // // cmd += '\x1b\x45\x00' // Bold off
    // // cmd += '\x1b\x61\x00' // Left align
    
    // cmd += '\x0a'
    // cmd += '\x0a'
    cmd += '\x0a'
    // Footer
    cmd += '********************************\n'
    // Order header
    // cmd += '\x1b\x45\x01' // Bold on
    // cmd += '\x1d\x21\x11' // Double size
    cmd += '\x1b\x61\x01' // Center align
    // cmd += `ORDER #${order.id}\n`
    cmd += '********************************\n'
    // cmd += '\x1b\x61\x01' // Center align
    // cmd += 'Thank you for your order!\n'
    // cmd += 'Please come again\n'
    cmd += '\n'
    
    // Cut paper
    cmd += '\x1d\x56\x00'
    
    return cmd
  }

  // Print using RawBT (base64 method)
  const printViaBase64 = (escposCommands: any) => {
    try {
      // Convert to base64
      const base64 = btoa(escposCommands)
      
      // Build RawBT URL
      const url = `rawbt:base64,${base64}`
      
      // Method 1: Direct navigation (works best)
      window.location.href = url
      
    } catch (error) {
      console.error('Base64 print failed:', error)
      throw error
    }
  }

  // Print using RawBT (intent method - alternative)
  const printViaIntent = (escposCommands: any) => {
    try {
      // URL encode the commands
      const encoded = encodeURIComponent(escposCommands)
      
      // Build intent URL
      const url = `intent://send/${encoded}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`
      
      window.location.href = url
      
    } catch (error) {
      console.error('Intent print failed:', error)
      throw error
    }
  }

  // Main print function
  const printOrder = async (order: any) => {
    if (!isRawBTInstalled.value) {
      throw new Error('RawBT app not installed. Please install from Play Store.')
    }

    isPrinting.value = true

    try {
      // Generate ESC/POS commands
      const escpos = generateESCPOS(order)
      
      // Print via RawBT
      // printViaBase64(escpos)
      // printViaIntent(escpos)
      
      // Wait a moment for print to process
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return true
    } catch (error) {
      console.error('Print failed:', error)
      throw error
    } finally {
      isPrinting.value = false
    }
  }

  // Print multiple orders in sequence
  const printQueue = async (orders: any[]) => {
    for (const order of orders) {
      try {
        await printOrder(order)
        
        // Delay between prints to avoid overwhelming printer
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error(`Failed to print order ${order.id}:`, error)
        // Continue with next order even if one fails
      }
    }
  }

  const testOrder = {
      id: 'TEST',
      customerName: 'Test Customer',
      createdAt: new Date(),
      items: [
        {
          quantity: 2,
          name: 'Test Item 1',
          price: 9.99,
          notes: 'Extra cheese'
        },
        {
          quantity: 1,
          name: 'Test Item 2',
          price: 14.99
        }
      ],
      subtotal: 34.97,
      tax: 2.80,
      total: 37.77
  }

  // Test print
  const testPrint = async () => {
    await printOrder(testOrder)
  }

   const rawbtScheme = (data: string) =>
    `intent://print?text=${encodeURIComponent(data)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end`;

  const printRaw = (text: string) => {
    try {
      window.location.href = rawbtScheme(text);
    } catch (e) {
      console.warn("RawBT launch failed", e);
    }
  };

  const printRawSilentAttempt = (order: DeviceOrder) => {
       ElNotification({
            title: 'printRawSilentAttempt',
            message: 'Order.',
            type: 'info',
          })
    // const textToPrint = generateESCPOS(order);
    const text= 'test print';
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = `rawbt://print?text=${encodeURIComponent(text)}`;
    iframe.src = `http://192.168.100.83.133:9100:${encodeURIComponent(text)}`;
    document.body.appendChild(iframe);

    setTimeout(() => iframe.remove(), 2000);
  };

  // Initialize
  onMounted(() => {
    checkRawBT()

    // printOrder(testOrder)
  })

  return {
    isPrinting,
    isRawBTInstalled,
    printerMAC,
    printOrder,
    printQueue,
    testPrint,
    checkRawBT,
    printRaw, 
    printRawSilentAttempt
  }
}
