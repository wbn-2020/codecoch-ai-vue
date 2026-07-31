<template>
  <section class="trace-timeline admin-panel">
    <div class="admin-panel__header">
      <div>
        <h2>时间线</h2>
        <p>弱关联会明确展示 associationType、associationConfidence 和 associationReason，避免被误认为强证据。</p>
      </div>
      <el-tag v-if="partialResult" type="warning" effect="plain">部分结果</el-tag>
    </div>

    <el-skeleton v-if="loading" :rows="5" animated />
    <AppState
      v-else-if="!nodes.length"
      type="empty"
      title="暂无时间线节点"
      description="可按 traceId、requestId、业务键、messageId、Agent Run id、异步任务 id 或时间窗口查询。"
    />
    <el-timeline v-else>
      <el-timeline-item
        v-for="node in nodes"
        :key="node.id"
        :timestamp="node.occurredAt || '无时间戳'"
        :type="timelineItemType(node)"
        placement="top"
      >
        <article class="trace-node" :class="{ 'trace-node--weak': isWeak(node), 'trace-node--failed': isFailed(node) }">
          <header class="trace-node__header">
            <div>
              <strong>{{ node.title }}</strong>
              <small>{{ node.nodeType }} / {{ node.sourceModule }}:{{ node.sourceId || '--' }}</small>
            </div>
            <div class="trace-node__tags">
              <el-tag :type="statusTagType(node.status)" effect="plain">{{ node.status }}</el-tag>
              <el-tag :type="isWeak(node) ? 'warning' : 'success'" effect="plain">
                {{ node.associationConfidence }}
              </el-tag>
            </div>
          </header>

          <p v-if="node.preview" class="trace-node__summary">{{ node.preview }}</p>

          <dl class="trace-node__meta">
            <div><dt>associationType</dt><dd>{{ node.associationType }}</dd></div>
            <div><dt>associationConfidence</dt><dd>{{ node.associationConfidence }}</dd></div>
            <div class="trace-node__reason"><dt>associationReason</dt><dd>{{ node.associationReason }}</dd></div>
          </dl>

          <div class="trace-node__actions">
            <el-button link type="primary" @click="$emit('select-node', node)">详情</el-button>
            <el-button
              v-for="link in node.links"
              :key="link.label"
              link
              type="primary"
              @click="$emit('open-link', link.to)"
            >
              {{ link.label }}
            </el-button>
          </div>
        </article>
      </el-timeline-item>
    </el-timeline>
  </section>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import AppState from '@/components/common/AppState.vue'
import type { TraceNode } from '@/types/adminTraceCockpit'

defineProps<{
  nodes: TraceNode[]
  loading?: boolean
  partialResult?: boolean
}>()

defineEmits<{
  (event: 'select-node', node: TraceNode): void
  (event: 'open-link', to: RouteLocationRaw): void
}>()

const isWeak = (node: TraceNode) => node.associationConfidence === 'LOW' || node.associationType === 'TIME_WINDOW' || node.associationType === 'MODULE_SEED'

const isFailed = (node: TraceNode) => node.status === 'FAILED'

const timelineItemType = (node: TraceNode) => {
  if (isFailed(node)) return 'danger'
  if (isWeak(node)) return 'warning'
  return 'primary'
}

const statusTagType = (status?: string) => {
  if (status === 'FAILED') return 'danger'
  if (status === 'SUCCESS') return 'success'
  if (status === 'RUNNING' || status === 'PENDING' || status === 'FALLBACK') return 'warning'
  return 'info'
}
</script>

<style scoped lang="scss">
.trace-node {
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.trace-node--weak {
  border-color: var(--el-color-warning-light-5);
  background: var(--el-color-warning-light-9);
}

.trace-node--failed {
  border-color: var(--el-color-danger-light-5);
}

.trace-node__header,
.trace-node__actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.trace-node__header small {
  display: block;
  margin-top: 4px;
  color: var(--el-text-color-secondary);
}

.trace-node__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.trace-node__summary {
  margin: 10px 0;
  color: var(--el-text-color-regular);
}

.trace-node__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(160px, 1fr));
  gap: 8px 12px;
  margin: 0;
}

.trace-node__meta dt {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.trace-node__meta dd {
  margin: 2px 0 0;
  word-break: break-word;
}

.trace-node__reason {
  grid-column: 1 / -1;
}

.trace-node__actions {
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 10px;
}

@media (max-width: 900px) {
  .trace-node__meta {
    grid-template-columns: 1fr;
  }
}
</style>
