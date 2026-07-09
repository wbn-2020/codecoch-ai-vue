<template>
  <el-drawer
    :model-value="modelValue"
    title="链路节点详情"
    size="760px"
    class="trace-node-drawer"
    @update:model-value="$emit('update:modelValue', $event)"
    @closed="$emit('closed')"
  >
    <AppState
      v-if="!node"
      type="empty"
      title="未选择节点"
      description="请选择一个时间线节点，查看安全元数据、预览和来源链接。"
    />
    <div v-else class="trace-node-drawer__body">
      <TraceSensitiveAccessNotice :permission="node.rawAccess.requiredPermission || node.rawAccess.rawAccessPermission" />

      <el-descriptions :column="1" border>
        <el-descriptions-item label="节点">{{ node.title }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ node.nodeType }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ node.status }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ node.sourceModule }}:{{ node.sourceId || '--' }}</el-descriptions-item>
        <el-descriptions-item label="traceId">{{ node.traceId || '--' }}</el-descriptions-item>
        <el-descriptions-item label="requestId">{{ node.requestId || '--' }}</el-descriptions-item>
        <el-descriptions-item label="messageId">{{ node.messageId || '--' }}</el-descriptions-item>
        <el-descriptions-item label="biz">{{ node.bizType && node.bizId ? `${node.bizType}:${node.bizId}` : node.businessId || '--' }}</el-descriptions-item>
        <el-descriptions-item label="associationType">{{ node.associationType }}</el-descriptions-item>
        <el-descriptions-item label="associationConfidence">{{ node.associationConfidence }}</el-descriptions-item>
        <el-descriptions-item label="associationReason">{{ node.associationReason }}</el-descriptions-item>
        <el-descriptions-item label="原文可用性">{{ rawAvailableLabel }}</el-descriptions-item>
        <el-descriptions-item label="原文状态">{{ node.rawAccess.state }}</el-descriptions-item>
        <el-descriptions-item label="所需权限">{{ node.rawAccess.requiredPermission || node.rawAccess.rawAccessPermission || '--' }}</el-descriptions-item>
      </el-descriptions>

      <section class="trace-node-drawer__section">
        <h3>安全预览 / 哈希 / 长度</h3>
        <el-table :data="previewRows" size="small">
          <el-table-column prop="label" label="字段" width="170" />
          <el-table-column prop="value" label="预览" min-width="220" show-overflow-tooltip />
          <el-table-column prop="hash" label="哈希" min-width="180" show-overflow-tooltip />
          <el-table-column prop="length" label="长度" width="100" />
        </el-table>
      </section>

      <section class="trace-node-drawer__section">
        <h3>元数据</h3>
        <el-table :data="metaRows" size="small">
          <el-table-column prop="key" label="键" width="190" />
          <el-table-column prop="value" label="值" min-width="220" show-overflow-tooltip />
        </el-table>
      </section>

      <section class="trace-node-drawer__section">
        <h3>来源链接</h3>
        <div class="trace-node-drawer__links">
          <el-button v-for="link in node.links" :key="link.label" plain @click="$emit('open-link', link.to)">
            {{ link.label }}
          </el-button>
          <span v-if="!node.links.length">暂无来源链接</span>
        </div>
      </section>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import AppState from '@/components/common/AppState.vue'
import TraceSensitiveAccessNotice from '@/components/admin/trace/TraceSensitiveAccessNotice.vue'
import type { TraceNode } from '@/types/adminTraceCockpit'

const props = defineProps<{
  modelValue: boolean
  node?: TraceNode | null
}>()

defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'open-link', to: RouteLocationRaw): void
  (event: 'closed'): void
}>()

const rawAvailableLabel = computed(() => {
  if (!props.node) return '--'
  if (props.node.rawAccess.rawFieldsIncluded) return '仅在来源流程中短时可见'
  if (props.node.rawAccess.rawFieldsAvailable) return '已记录；需通过现有来源流程申请查看'
  return '未记录或不可用'
})

const previewRows = computed(() => {
  if (!props.node) return []
  const rows = props.node.previews?.length
    ? props.node.previews
    : [{ label: 'preview', value: props.node.preview, hash: props.node.contentHash, length: props.node.contentLength }]
  return rows.map((row) => ({
    label: row.label || 'preview',
    value: row.value || '--',
    hash: row.hash || '--',
    length: row.length ?? '--'
  }))
})

const metaRows = computed(() => {
  if (!props.node) return []
  return Object.entries(props.node.meta)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({ key, value: String(value) }))
})
</script>

<style scoped lang="scss">
.trace-node-drawer__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trace-node-drawer__section h3 {
  margin: 0 0 10px;
  font-size: 15px;
}

.trace-node-drawer__links {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  color: var(--el-text-color-secondary);
}
</style>
