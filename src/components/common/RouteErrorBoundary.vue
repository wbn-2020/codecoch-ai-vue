<template>
  <div v-if="errorMessage" class="route-error-boundary">
    <AppState
      type="error"
      title="页面加载失败"
      :description="errorMessage"
    >
      <div class="route-error-boundary__actions">
        <el-button type="primary" @click="reset">重试</el-button>
        <el-button @click="router.push(fallbackPath)">返回安全入口</el-button>
      </div>
    </AppState>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppState from '@/components/common/AppState.vue'

withDefaults(
  defineProps<{
    fallbackPath?: string
  }>(),
  {
    fallbackPath: '/dashboard'
  }
)

const route = useRoute()
const router = useRouter()
const errorMessage = ref('')

const reset = () => {
  errorMessage.value = ''
}

watch(
  () => route.fullPath,
  () => reset()
)

onErrorCaptured((error) => {
  errorMessage.value = error instanceof Error
    ? error.message
    : '页面组件运行异常，请重试或返回安全入口。'
  return false
})
</script>

<style scoped lang="scss">
.route-error-boundary {
  width: 100%;
}

.route-error-boundary__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}
</style>
