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
import { toFriendlyMessage } from '@/utils/error'

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
  errorMessage.value = toFriendlyMessage(
    error instanceof Error ? error.message : error,
    '\u9875\u9762\u7ec4\u4ef6\u8fd0\u884c\u5f02\u5e38\uff0c\u8bf7\u91cd\u8bd5\u6216\u8fd4\u56de\u5b89\u5168\u5165\u53e3\u3002'
  )
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
