<template>
  <section class="cockpit-section archive-export" aria-labelledby="campaign-archive-title">
    <header class="cockpit-section__header">
      <div>
        <span class="section-kicker">档案导出</span>
        <h2 id="campaign-archive-title">保存本周期的可交付档案</h2>
        <p>导出包含脱敏摘要、来源清单和缺失区块，不包含完整联系方式、原始提示词或内部日志。</p>
      </div>
      <el-button type="primary" :loading="creating" :disabled="disabled" @click="emit('create')">
        生成 ZIP 档案
      </el-button>
    </header>

    <el-alert
      v-if="error"
      type="warning"
      show-icon
      :closable="false"
      title="档案导出暂时不可用"
      :description="error"
    />

    <AppState
      v-if="!loading && !exports.length"
      type="empty"
      title="还没有导出记录"
      description="生成后会在这里显示状态、截点和 manifest 哈希。"
    />
    <div v-else v-loading="loading" class="export-list">
      <article v-for="item in exports" :key="item.id" class="export-row">
        <div>
          <strong>{{ formatStatus(item.status) }}</strong>
          <span>{{ item.exportFormat || 'ZIP' }} · {{ item.dataCutoffAt || '截点待确认' }}</span>
          <small v-if="item.manifestHash">manifest：{{ item.manifestHash }}</small>
          <p v-if="item.errorMessage">{{ item.errorMessage }}</p>
        </div>
        <div class="export-row__actions">
          <el-tag size="small" effect="plain" :type="statusType(item.status)">{{ formatStatus(item.status) }}</el-tag>
          <el-button v-if="item.status === 'READY'" link type="primary" @click="emit('download', item)">
            下载
          </el-button>
          <el-button v-else-if="item.status === 'FAILED'" link type="warning" @click="emit('retry', item)">
            重试
          </el-button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppState from '@/components/common/AppState.vue'
import type { CampaignArchiveExportVO } from '@/types/v8/campaign'

withDefaults(defineProps<{
  exports?: CampaignArchiveExportVO[]
  loading?: boolean
  creating?: boolean
  disabled?: boolean
  error?: string
}>(), {
  exports: () => [],
  loading: false,
  creating: false,
  disabled: false,
  error: ''
})

const emit = defineEmits<{
  create: []
  retry: [value: CampaignArchiveExportVO]
  download: [value: CampaignArchiveExportVO]
}>()

const formatStatus = (value?: string) => ({
  GENERATING: '生成中',
  READY: '可下载',
  FAILED: '生成失败'
}[String(value || '').toUpperCase()] || '状态待确认')

const statusType = (value?: string) => ({
  READY: 'success',
  FAILED: 'danger',
  GENERATING: 'warning'
}[String(value || '').toUpperCase()] || 'info') as 'success' | 'danger' | 'warning' | 'info'
</script>

<style scoped lang="scss">
.cockpit-section {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface, #151c27);
}

.cockpit-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.cockpit-section__header h2 {
  margin: 4px 0 0;
  color: var(--app-text);
  font-size: 18px;
}

.cockpit-section__header p {
  max-width: 70ch;
  margin: 6px 0 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.section-kicker {
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.export-list {
  display: grid;
  gap: 10px;
}

.export-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  border-top: 1px solid var(--app-border);
  padding-top: 12px;
}

.export-row strong,
.export-row span,
.export-row small,
.export-row p {
  display: block;
}

.export-row strong {
  color: var(--app-text);
}

.export-row span,
.export-row small,
.export-row p {
  margin-top: 5px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.export-row p {
  color: var(--cc-danger);
}

.export-row__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

@media (max-width: 680px) {
  .cockpit-section__header,
  .export-row {
    flex-direction: column;
  }
}
</style>
