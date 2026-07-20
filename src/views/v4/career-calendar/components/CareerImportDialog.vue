<template>
  <el-dialog
    :model-value="visible"
    title="导入求职数据"
    width="760px"
    destroy-on-close
    @update:model-value="(value: boolean) => emit('update:visible', value)"
  >
    <CareerImportPanel v-if="visible" :timezone="timezone" @imported="emit('imported')" />
    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import CareerImportPanel from './CareerImportPanel.vue'

defineProps<{
  visible: boolean
  timezone: string
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'imported'): void
}>()
</script>
