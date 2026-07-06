<template>
  <el-drawer
    :model-value="modelValue"
    title="Trace node details"
    size="760px"
    class="trace-node-drawer"
    @update:model-value="$emit('update:modelValue', $event)"
    @closed="$emit('closed')"
  >
    <AppState
      v-if="!node"
      type="empty"
      title="No node selected"
      description="Select a timeline node to inspect safe metadata, previews, and source links."
    />
    <div v-else class="trace-node-drawer__body">
      <TraceSensitiveAccessNotice :permission="node.rawAccess.requiredPermission || node.rawAccess.rawAccessPermission" />

      <el-descriptions :column="1" border>
        <el-descriptions-item label="Node">{{ node.title }}</el-descriptions-item>
        <el-descriptions-item label="Type">{{ node.nodeType }}</el-descriptions-item>
        <el-descriptions-item label="Status">{{ node.status }}</el-descriptions-item>
        <el-descriptions-item label="Source">{{ node.sourceModule }}:{{ node.sourceId || '--' }}</el-descriptions-item>
        <el-descriptions-item label="traceId">{{ node.traceId || '--' }}</el-descriptions-item>
        <el-descriptions-item label="requestId">{{ node.requestId || '--' }}</el-descriptions-item>
        <el-descriptions-item label="messageId">{{ node.messageId || '--' }}</el-descriptions-item>
        <el-descriptions-item label="biz">{{ node.bizType && node.bizId ? `${node.bizType}:${node.bizId}` : node.businessId || '--' }}</el-descriptions-item>
        <el-descriptions-item label="associationType">{{ node.associationType }}</el-descriptions-item>
        <el-descriptions-item label="associationConfidence">{{ node.associationConfidence }}</el-descriptions-item>
        <el-descriptions-item label="associationReason">{{ node.associationReason }}</el-descriptions-item>
        <el-descriptions-item label="raw availability">{{ rawAvailableLabel }}</el-descriptions-item>
        <el-descriptions-item label="raw state">{{ node.rawAccess.state }}</el-descriptions-item>
        <el-descriptions-item label="required permission">{{ node.rawAccess.requiredPermission || node.rawAccess.rawAccessPermission || '--' }}</el-descriptions-item>
      </el-descriptions>

      <section class="trace-node-drawer__section">
        <h3>Safe preview / hash / length</h3>
        <el-table :data="previewRows" size="small">
          <el-table-column prop="label" label="Field" width="170" />
          <el-table-column prop="value" label="Preview" min-width="220" show-overflow-tooltip />
          <el-table-column prop="hash" label="Hash" min-width="180" show-overflow-tooltip />
          <el-table-column prop="length" label="Length" width="100" />
        </el-table>
      </section>

      <section class="trace-node-drawer__section">
        <h3>Metadata</h3>
        <el-table :data="metaRows" size="small">
          <el-table-column prop="key" label="Key" width="190" />
          <el-table-column prop="value" label="Value" min-width="220" show-overflow-tooltip />
        </el-table>
      </section>

      <section class="trace-node-drawer__section">
        <h3>Source links</h3>
        <div class="trace-node-drawer__links">
          <el-button v-for="link in node.links" :key="link.label" plain @click="$emit('open-link', link.to)">
            {{ link.label }}
          </el-button>
          <span v-if="!node.links.length">No source link</span>
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
  if (props.node.rawAccess.rawFieldsIncluded) return 'short-lived visible in source flow'
  if (props.node.rawAccess.rawFieldsAvailable) return 'recorded; request through existing source flow'
  return 'not recorded or unavailable'
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
