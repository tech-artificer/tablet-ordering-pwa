<script setup lang="ts">

const router = useRouter();

const handleRegistrationSuccess = () => {
  // 1. Set the persistent flag indicating success
//   localStorage.setItem('device_registered', 'true');
  
//   // 2. Redirect the device to the customer starting flow
//   router.replace('/order/start');
};
</script>


<template>
  <AuthDeviceRegistration/>
</template>