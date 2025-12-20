<template>
  <!-- <el-dialog :visible.sync="visible" width="600px" :append-to-body="true" custom-class="kbbq-modal"> -->
  <el-dialog>
  
      <div class="flex items-center justify-between text-white">
        <div class="font-bold text-xl"> sdsdsssd</div>
        <div class="text-lg font-semibold"></div>
      </div>
   

    <div>
      <!-- <div v-for="group in modifiers" :key="group.id" class="mb-3">
        <div class="font-semibold mb-1">{{ group }}</div>
        <div class="flex gap-3">
          <el-radio-group v-model="selected[group]">
            <el-radio v-for="mod in group.items" :label="mod.id" :key="mod.id">{{ mod.name }}</el-radio>
          </el-radio-group>
        </div>
      </div> -->
    </div>

  
      <!-- <div class="flex justify-end gap-3">
        <el-button @click="cancel">Cancel</el-button>
        <el-button type="primary" @click="confirm">Add to Cart</el-button>
      </div> -->
  
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({ visible: Boolean, item: Object, modifiers: Array })
const emit = defineEmits(['update:visible','confirm'])
const selected = ref({})

const cancel = () => emit('update:visible', false)
const confirm = () => { emit('confirm', { item: props.item, selected: selected.value }); emit('update:visible', false) }
</script>
