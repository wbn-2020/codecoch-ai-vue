<template>
  <div v-if="errorMessage" class="route-error-boundary">
    <AppState
      type="error"
      title="当前页面暂时不可用"
      :description="errorMessage"
    >
      <div class="route-error-boundary__actions">
        <el-button type="primary" @click="retry('error')">重试</el-button>
        <el-button @click="router.push(fallbackPath)">返回可继续的页面</el-button>
      </div>
    </AppState>
  </div>
  <section
    v-else-if="loading"
    class="route-loading-skeleton"
    aria-busy="true"
    aria-live="polite"
    data-test="route-loading-skeleton"
  >
    <div class="route-loading-skeleton__heading">
      <span class="route-loading-skeleton__line route-loading-skeleton__line--title" />
      <span class="route-loading-skeleton__line route-loading-skeleton__line--meta" />
    </div>
    <div class="route-loading-skeleton__grid">
      <span v-for="index in 3" :key="index" class="route-loading-skeleton__block" />
    </div>
    <p class="route-loading-skeleton__message">
      {{ loadingMessage }}
    </p>
    <div v-if="showLoadingRetry" class="route-error-boundary__actions">
      <el-button type="primary" @click="retry('loading')">重新加载页面</el-button>
    </div>
  </section>
  <slot v-else :key="renderKey" />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onErrorCaptured, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppState from '@/components/common/AppState.vue'
import { toFriendlyMessage } from '@/utils/error'

const props = withDefaults(
  defineProps<{
    fallbackPath?: string
    loading?: boolean
  }>(),
  {
    fallbackPath: '/dashboard',
    loading: false
  }
)

const emit = defineEmits<{
  retry: [reason: 'error' | 'loading']
}>()

const route = useRoute()
const router = useRouter()
const errorMessage = ref('')
const renderKey = ref(0)
const loadingElapsedMs = ref(0)
let loadingStartedAt = 0
let loadingTimer: ReturnType<typeof window.setInterval> | undefined

const stopLoadingTimer = () => {
  if (loadingTimer) {
    window.clearInterval(loadingTimer)
    loadingTimer = undefined
  }
  loadingStartedAt = 0
  loadingElapsedMs.value = 0
}

const startLoadingTimer = () => {
  stopLoadingTimer()
  loadingStartedAt = Date.now()
  loadingTimer = window.setInterval(() => {
    loadingElapsedMs.value = Date.now() - loadingStartedAt
  }, 250)
}

const reset = () => {
  errorMessage.value = ''
}

const retry = (reason: 'error' | 'loading') => {
  reset()
  renderKey.value += 1
  emit('retry', reason)
}

const loadingMessage = computed(() => {
  if (loadingElapsedMs.value >= 2_000) {
    return '页面资源仍在加载。网络较慢时可能需要一点时间。'
  }
  return '正在加载页面内容...'
})

const showLoadingRetry = computed(() => loadingElapsedMs.value >= 10_000)

watch(
  () => route.fullPath,
  () => {
    reset()
    if (props.loading) startLoadingTimer()
  }
)

watch(
  () => props.loading,
  (loading) => {
    if (loading) {
      startLoadingTimer()
    } else {
      stopLoadingTimer()
    }
  },
  { immediate: true }
)

onErrorCaptured((error) => {
  errorMessage.value = toFriendlyMessage(
    error instanceof Error ? error.message : error,
    '当前页面暂时没有加载成功，请重试或返回可继续的页面。'
  )
  return false
})

onBeforeUnmount(stopLoadingTimer)
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

.route-loading-skeleton {
  display: grid;
  gap: 16px;
  min-height: 280px;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
}

.route-loading-skeleton__heading {
  display: grid;
  gap: 10px;
}

.route-loading-skeleton__line,
.route-loading-skeleton__block {
  display: block;
  overflow: hidden;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--app-surface-muted, rgb(148 163 184 / 14%)) 20%,
    rgb(255 255 255 / 12%) 50%,
    var(--app-surface-muted, rgb(148 163 184 / 14%)) 80%
  );
  background-size: 200% 100%;
  animation: route-skeleton-shimmer 1.4s ease-in-out infinite;
}

.route-loading-skeleton__line--title {
  width: min(320px, 70%);
  height: 24px;
}

.route-loading-skeleton__line--meta {
  width: min(220px, 48%);
  height: 14px;
}

.route-loading-skeleton__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.route-loading-skeleton__block {
  min-height: 132px;
}

.route-loading-skeleton__message {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 14px;
}

@keyframes route-skeleton-shimmer {
  to {
    background-position: -200% 0;
  }
}

@media (max-width: 640px) {
  .route-loading-skeleton {
    min-height: 220px;
    padding: 18px;
  }

  .route-loading-skeleton__grid {
    grid-template-columns: 1fr;
  }

  .route-loading-skeleton__block {
    min-height: 72px;
  }
}
</style>
