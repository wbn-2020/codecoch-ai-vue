<template>
  <section class="trace-suggestions admin-panel">
    <div class="admin-panel__header">
      <div>
        <h2>治理建议</h2>
        <p>建议项只支持跳转、复制线索或展示安全预览；TraceCockpit 不会执行回滚、重试、恢复、删除或策略变更。</p>
      </div>
    </div>

    <AppState
      v-if="!suggestions.length"
      type="empty"
      title="暂无建议"
      description="样本为空或证据不足时，不展示强结论。"
    />
    <div v-else class="trace-suggestions__list">
      <article v-for="item in suggestions" :key="item.id" class="trace-suggestions__item">
        <header>
          <div>
            <strong>{{ item.title }}</strong>
            <small>{{ item.actionType }}</small>
          </div>
          <el-tag :type="item.executableInCockpit ? 'danger' : 'info'" effect="plain">
            {{ item.executableInCockpit ? '禁止在此执行' : '此处不可执行' }}
          </el-tag>
        </header>
        <p>{{ item.reason }}</p>
        <p v-if="item.requiredPermission" class="trace-suggestions__evidence">所需权限：{{ item.requiredPermission }}</p>
        <div class="trace-suggestions__actions">
          <el-button v-if="item.link" plain @click="$emit('open-link', item.link)">打开来源</el-button>
          <el-button plain @click="copyClue(item)">复制线索</el-button>
          <el-button plain @click="$emit('preview', item)">预览</el-button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { RouteLocationRaw } from 'vue-router'
import AppState from '@/components/common/AppState.vue'
import type { TraceGovernanceSuggestion } from '@/types/adminTraceCockpit'

defineProps<{
  suggestions: TraceGovernanceSuggestion[]
}>()

defineEmits<{
  (event: 'open-link', to: RouteLocationRaw): void
  (event: 'preview', suggestion: TraceGovernanceSuggestion): void
}>()

const copyClue = async (item: TraceGovernanceSuggestion) => {
  const text = [item.actionType, item.nodeId, item.targetType, item.targetId].filter(Boolean).join(' ')
  await navigator.clipboard.writeText(text || item.title)
  ElMessage.success('线索已复制')
}
</script>

<style scoped lang="scss">
.trace-suggestions__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.trace-suggestions__item {
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.trace-suggestions__item header,
.trace-suggestions__actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.trace-suggestions__item small {
  display: block;
  margin-top: 4px;
  color: var(--el-text-color-secondary);
}

.trace-suggestions__item p {
  margin: 10px 0 0;
  color: var(--el-text-color-regular);
}

.trace-suggestions__evidence {
  padding: 8px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  word-break: break-word;
}

.trace-suggestions__actions {
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 12px;
}
</style>
