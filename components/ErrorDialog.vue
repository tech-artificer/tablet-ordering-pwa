<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useErrorDialogStore } from '@/stores/ErrorDialog'

const errorStore = useErrorDialogStore()
const { visible, message, retrying, attempts } = storeToRefs(errorStore)

function handleClose() {
  errorStore.hide()
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="Connection Error"
    width="30%"
    :close-on-click-modal="false"
    :show-close="false"
  >
    <p>{{ message }}</p>
    <p v-if="retrying">Attempt #{{ attempts }}</p>

    <template #footer>
      <el-button type="primary" @click="handleClose" v-if="!retrying">OK</el-button>
    </template>
  </el-dialog>
</template>
