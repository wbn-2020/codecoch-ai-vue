<template>
  <section class="app-state" :class="`app-state--${type}`">
    <div class="app-state__icon">
      <el-icon v-if="type === 'loading'" class="is-loading" :size="28">
        <Loading />
      </el-icon>
      <el-icon v-else :size="28">
        <component :is="stateIcon" />
      </el-icon>
    </div>
    <div class="app-state__content">
      <h3>{{ title || defaultTitle }}</h3>
      <p>{{ description || defaultDescription }}</p>
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { CircleClose, Clock, Connection, FolderOpened, Loading, Warning } from '@element-plus/icons-vue'
import { computed } from 'vue'

type AppStateType = 'loading' | 'empty' | 'error' | 'disabled' | 'api-pending'

const props = withDefaults(
  defineProps<{
    type?: AppStateType
    title?: string
    description?: string
  }>(),
  {
    type: 'empty'
  }
)

const stateIcon = computed(() => {
  const iconMap = {
    empty: FolderOpened,
    error: CircleClose,
    disabled: Clock,
    'api-pending': Connection,
    loading: Loading
  }
  return iconMap[props.type] || Warning
})

const defaultTitle = computed(() => {
  const titleMap: Record<AppStateType, string> = {
    loading: '加载中',
    empty: '还没有可展示内容',
    error: '加载失败',
    disabled: '暂不可用',
    'api-pending': '功能准备中'
  }
  return titleMap[props.type]
})

const defaultDescription = computed(() => {
  const descMap: Record<AppStateType, string> = {
    loading: '正在加载，请稍候。',
    empty: '当前还没有可展示的数据。',
    error: '数据加载遇到问题，请稍后重试。',
    disabled: '当前状态下暂时无法操作。',
    'api-pending': '该功能正在准备中，请稍后再试。'
  }
  return descMap[props.type]
})
</script>

<style scoped lang="scss">
.app-state {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface, #ffffff);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}

.app-state__icon {
  display: inline-flex;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.app-state__content {
  min-width: 0;

  h3 {
    margin: 0;
    color: var(--app-text);
    font-size: 15px;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.app-state--error .app-state__icon {
  background: var(--app-danger-soft);
  color: var(--cc-danger);
}

.app-state--disabled .app-state__icon,
.app-state--api-pending .app-state__icon {
  background: var(--app-warning-soft);
  color: var(--cc-warning);
}
</style>
