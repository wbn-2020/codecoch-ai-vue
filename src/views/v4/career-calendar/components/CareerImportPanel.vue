<template>
  <section class="career-import-panel">
    <div class="import-controls">
      <el-segmented v-model="importFormat" :options="importFormatOptions" />
      <label class="file-picker">
        <Upload :size="18" />
        <span>{{ selectedFile?.name || `选择 ${importFormat} 文件` }}</span>
        <input
          :key="fileInputKey"
          type="file"
          :accept="importAccept"
          @change="selectImportFile"
        />
      </label>
      <el-select
        v-if="importFormat === 'CSV'"
        v-model="duplicatePolicy"
        class="policy-select"
      >
        <el-option label="跳过重复项" value="SKIP" />
        <el-option label="仍然创建" value="CREATE" />
      </el-select>
      <el-button
        data-testid="preview-career-import"
        :loading="previewing"
        :disabled="!selectedFile"
        @click="previewImport"
      >
        预览
      </el-button>
      <el-button
        data-testid="commit-career-import"
        type="primary"
        :loading="importing"
        :disabled="!selectedFile || !importPreview"
        @click="commitImport"
      >
        确认导入
      </el-button>
      <el-button
        v-if="importResult?.batchId && importResult.errorCount"
        data-testid="download-career-import-errors"
        :icon="Download"
        :loading="downloadingErrors"
        @click="downloadImportErrors"
      >
        下载错误行 CSV
      </el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      title="导入边界"
      description="单次最多导入 500 行、文件不超过 2 MB。重复项在当前用户的数据范围内识别；CSV 支持逐行错误和重复候选，ICS 使用当前时区解析。系统不会读取邮箱、登录招聘平台或自动投递。"
    />

    <div
      v-if="importFormat === 'CSV' && importPreview?.headers.length"
      data-testid="career-csv-mapping"
      class="mapping-editor"
    >
      <div class="mapping-heading">
        <strong>CSV 字段映射</strong>
        <span>将系统字段对应到文件表头，未使用的字段可以留空。</span>
      </div>
      <div class="mapping-grid">
        <label v-for="field in importPreview.supportedFields" :key="field" class="mapping-row">
          <span>{{ csvFieldLabel(field) }}</span>
          <el-select v-model="csvMapping[field]" clearable placeholder="不导入">
            <el-option
              v-for="header in importPreview.headers"
              :key="header"
              :label="header"
              :value="header"
            />
          </el-select>
        </label>
      </div>
    </div>

    <template v-if="importSummary">
      <div class="import-summary">
        <span>总计 {{ importSummary.totalCount }}</span>
        <span v-if="'validCount' in importSummary">有效 {{ importSummary.validCount }}</span>
        <span v-if="'successCount' in importSummary">成功 {{ importSummary.successCount }}</span>
        <span>重复 {{ importSummary.duplicateCount }}</span>
        <span :class="{ 'has-errors': importSummary.errorCount }">错误 {{ importSummary.errorCount }}</span>
      </div>
      <el-table :data="importSummary.rows" max-height="320" size="small">
        <el-table-column prop="rowNumber" label="行" width="60" />
        <el-table-column label="处理" width="120">
          <template #default="{ row }">{{ dispositionLabel(row.disposition) }}</template>
        </el-table-column>
        <el-table-column label="内容" min-width="220">
          <template #default="{ row }">{{ rowSummary(row.raw) }}</template>
        </el-table-column>
        <el-table-column label="重复候选" min-width="180">
          <template #default="{ row }">
            {{ duplicateSummary(row.duplicateCandidates) }}
          </template>
        </el-table-column>
        <el-table-column prop="errorMessage" label="错误" min-width="180" />
      </el-table>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Upload } from 'lucide-vue-next'

import {
  downloadCareerImportErrorsApi,
  importCareerCsvApi,
  importCareerIcsApi,
  previewCareerCsvImportApi,
  previewCareerIcsImportApi
} from '@/api/careerGrowth'
import type {
  CareerCsvMapping,
  CareerDuplicatePolicy,
  CareerImportDuplicateCandidate,
  CareerImportPreviewVO,
  CareerImportResultVO
} from '@/types/careerGrowth'
import { getErrorMessage } from '@/utils/error'

const props = defineProps<{
  timezone: string
}>()

const emit = defineEmits<{
  (event: 'imported'): void
}>()

const importFormatOptions = [
  { label: 'CSV', value: 'CSV' },
  { label: 'ICS', value: 'ICS' }
]

const previewing = ref(false)
const importing = ref(false)
const downloadingErrors = ref(false)
const importFormat = ref<'CSV' | 'ICS'>('CSV')
const duplicatePolicy = ref<CareerDuplicatePolicy>('SKIP')
const selectedFile = ref<File>()
const fileInputKey = ref(0)
const importPreview = ref<CareerImportPreviewVO>()
const importResult = ref<CareerImportResultVO>()
const csvMapping = ref<CareerCsvMapping>({})

const importAccept = computed(() => importFormat.value === 'CSV' ? '.csv,text/csv' : '.ics,text/calendar')
const importSummary = computed(() => importResult.value || importPreview.value)

const selectImportFile = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file && file.size > 2 * 1024 * 1024) {
    selectedFile.value = undefined
    input.value = ''
    ElMessage.warning('导入文件不能超过 2 MB。')
    return
  }
  selectedFile.value = file
  importPreview.value = undefined
  importResult.value = undefined
  csvMapping.value = {}
}

const previewImport = async () => {
  if (!selectedFile.value || previewing.value) return
  previewing.value = true
  try {
    const preview = importFormat.value === 'CSV'
      ? await previewCareerCsvImportApi(selectedFile.value, props.timezone, csvMapping.value)
      : await previewCareerIcsImportApi(selectedFile.value, props.timezone)
    importPreview.value = preview
    importResult.value = undefined
    if (importFormat.value === 'CSV') {
      csvMapping.value = {
        ...preview.suggestedMapping,
        ...csvMapping.value
      }
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '导入预览失败，请检查文件后重试。'))
  } finally {
    previewing.value = false
  }
}

const commitImport = async () => {
  if (!selectedFile.value || !importPreview.value || importing.value) return
  importing.value = true
  try {
    importResult.value = importFormat.value === 'CSV'
      ? await importCareerCsvApi(selectedFile.value, props.timezone, duplicatePolicy.value, csvMapping.value)
      : await importCareerIcsApi(selectedFile.value, props.timezone)
    const result = importResult.value
    if (result.errorCount || result.duplicateCount) {
      ElMessage.warning(`导入完成：成功 ${result.successCount}，错误 ${result.errorCount}，重复 ${result.duplicateCount}。`)
    } else {
      ElMessage.success(`已成功导入 ${result.successCount} 条记录。`)
    }
    emit('imported')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '导入失败，请检查预览结果后重试。'))
  } finally {
    importing.value = false
  }
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const downloadImportErrors = async () => {
  if (!importResult.value?.batchId || downloadingErrors.value) return
  downloadingErrors.value = true
  try {
    const blob = await downloadCareerImportErrorsApi(importResult.value.batchId)
    downloadBlob(blob, `career-import-${importResult.value.batchId}-errors.csv`)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '错误行下载失败，请稍后重试。'))
  } finally {
    downloadingErrors.value = false
  }
}

const rowSummary = (raw?: Record<string, string>) =>
  Object.entries(raw || {}).slice(0, 4).map(([key, value]) => `${key}: ${value}`).join(' · ') || '--'

const duplicateSummary = (candidates: CareerImportDuplicateCandidate[]) =>
  candidates?.length
    ? candidates.map((item) => `${item.companyName || '公司待填'} · ${item.jobTitle || '岗位待填'}`).join('；')
    : '--'

const csvFieldLabels: Record<string, string> = {
  company_name: '公司名称',
  job_title: '岗位名称',
  source: '来源渠道',
  status: '投递状态',
  applied_at: '投递时间',
  next_follow_up_at: '下次跟进时间',
  note: '备注',
  timezone: '时区',
  event_start: '事件开始时间',
  event_end: '事件结束时间',
  event_title: '事件标题',
  event_type: '事件类型',
  all_day: '全天事件',
  location: '地点',
  event_description: '事件说明',
  event_status: '事件状态'
}

const csvFieldLabel = (field: string) => csvFieldLabels[field] || field

const dispositionLabels: Record<string, string> = {
  INSERTED: '已导入',
  SKIPPED_DUPLICATE: '已跳过重复项',
  ERROR: '导入失败',
  VALID: '校验通过',
  INVALID: '校验失败'
}

const dispositionLabel = (value?: string) => dispositionLabels[String(value || '').toUpperCase()] || value || '--'

watch(importFormat, () => {
  selectedFile.value = undefined
  importPreview.value = undefined
  importResult.value = undefined
  csvMapping.value = {}
  fileInputKey.value += 1
})
</script>

<style scoped lang="scss">
.career-import-panel {
  display: block;
}

.import-controls,
.import-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mapping-editor {
  margin-top: 16px;
}

.mapping-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.mapping-heading span {
  color: var(--app-text-secondary);
  font-size: 13px;
}

.mapping-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  max-height: 260px;
  overflow-y: auto;
  padding-inline-end: 4px;
}

.mapping-row {
  display: grid;
  grid-template-columns: minmax(110px, 0.8fr) minmax(0, 1.2fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
  font-size: 13px;
}

.has-errors {
  color: var(--el-color-danger);
  font-weight: 700;
}

.import-controls {
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.file-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
  padding: 8px 12px;
  border: 1px dashed var(--app-border);
  cursor: pointer;
}

.file-picker input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
}

.policy-select {
  width: 150px;
}

.import-summary {
  margin: 16px 0 10px;
  flex-wrap: wrap;
}

:deep(.el-select) {
  width: 100%;
}

@media (max-width: 620px) {
  .mapping-grid {
    grid-template-columns: 1fr;
  }
}
</style>
