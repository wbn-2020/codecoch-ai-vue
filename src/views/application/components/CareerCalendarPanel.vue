<template>
  <section class="career-calendar-panel">
    <div class="calendar-toolbar">
      <div>
        <p class="section-kicker">CAREER CRM CALENDAR</p>
        <h2>求职日历</h2>
      </div>
      <div class="toolbar-actions">
        <el-button :icon="ChevronLeft" circle title="上个月" @click="moveMonth(-1)" />
        <strong>{{ monthTitle }}</strong>
        <el-button :icon="ChevronRight" circle title="下个月" @click="moveMonth(1)" />
        <el-button @click="goToday">今天</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建事件</el-button>
        <el-dropdown @command="exportCalendar">
          <el-button :icon="Download" :loading="exporting">
            导出
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="csv">导出 CSV</el-dropdown-item>
              <el-dropdown-item command="ics">导出 ICS</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          data-testid="open-career-import"
          :icon="Upload"
          @click="importDialogVisible = true"
        >
          导入
        </el-button>
        <el-button :loading="loading" @click="loadEvents">刷新</el-button>
      </div>
    </div>

    <el-alert
      v-if="errorMessage"
      type="error"
      show-icon
      :closable="false"
      title="求职日历加载失败"
      :description="errorMessage"
    />

    <div class="calendar-summary">
      <span>本月 {{ events.length }} 个事件</span>
      <span :class="{ 'has-overdue': overdueEvents.length }">逾期 {{ overdueEvents.length }} 个</span>
      <span>时区 {{ timezone }}</span>
    </div>

    <div class="calendar-grid" v-loading="loading">
      <div v-for="weekday in weekdays" :key="weekday" class="weekday">{{ weekday }}</div>
      <div
        v-for="day in calendarDays"
        :key="day.key"
        class="calendar-day"
        role="button"
        tabindex="0"
        :class="{
          'is-outside': !day.currentMonth,
          'is-today': day.isToday,
          'has-overdue': day.events.some((event) => isOverdue(event))
        }"
        @click="openCreate(day.date)"
        @keydown.enter.self="openCreate(day.date)"
      >
        <span class="day-number">{{ day.dayNumber }}</span>
        <div class="day-events">
          <button
            v-for="event in day.events.slice(0, 3)"
            :key="event.id"
            type="button"
            class="event-chip"
            :class="[`type-${String(event.eventType || '').toLowerCase()}`, { 'is-overdue': isOverdue(event) }]"
            :title="`${event.title} · ${eventTimeText(event)}`"
            @click.stop="openEdit(event)"
          >
            <span>{{ eventTimeText(event) }}</span>
            <strong>{{ event.title }}</strong>
          </button>
          <span v-if="day.events.length > 3" class="more-events">另有 {{ day.events.length - 3 }} 个</span>
        </div>
      </div>
    </div>

    <div v-if="!events.length && !loading && !errorMessage" class="empty-calendar">
      <CalendarDays :size="28" />
      <strong>本月还没有求职事件</strong>
      <p>可以安排投递、跟进、面试、感谢信、Offer 截止或复盘。</p>
      <el-button type="primary" @click="openCreate()">创建第一个事件</el-button>
    </div>

    <el-dialog v-model="eventDialogVisible" :title="editingEventId ? '编辑日历事件' : '新建日历事件'" width="660px">
      <el-form label-position="top">
        <div class="two-column">
          <el-form-item label="事件类型">
            <el-select v-model="eventForm.eventType">
              <el-option v-for="item in eventTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="关联投递">
            <el-select v-model="eventForm.applicationId" clearable filterable placeholder="可选">
              <el-option
                v-for="application in applications"
                :key="application.id"
                :value="application.id"
                :label="applicationLabel(application)"
              />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="标题">
          <el-input v-model.trim="eventForm.title" maxlength="120" />
        </el-form-item>
        <div class="two-column">
          <el-form-item label="开始时间">
            <el-date-picker
              v-model="eventForm.startsAt"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
            />
          </el-form-item>
          <el-form-item label="结束时间">
            <el-date-picker
              v-model="eventForm.endsAt"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
            />
          </el-form-item>
        </div>
        <div class="two-column compact-row">
          <el-form-item label="状态">
            <el-select v-model="eventForm.status">
              <el-option label="已确认" value="CONFIRMED" />
              <el-option label="暂定" value="TENTATIVE" />
              <el-option label="已完成" value="COMPLETED" />
              <el-option label="已取消" value="CANCELLED" />
            </el-select>
          </el-form-item>
          <el-form-item label="全天事件">
            <el-switch v-model="eventForm.allDay" />
          </el-form-item>
        </div>
        <el-form-item label="地点">
          <el-input v-model.trim="eventForm.location" maxlength="160" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model.trim="eventForm.description" type="textarea" :rows="3" maxlength="600" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button
          v-if="editingEventId"
          type="danger"
          plain
          :loading="deleting"
          @click="removeEvent"
        >
          删除
        </el-button>
        <el-button @click="eventDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEvent">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="导入求职数据" width="760px">
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
      </div>

      <el-alert
        type="info"
        :closable="false"
        title="导入边界"
        description="CSV 支持逐行错误和重复候选；ICS 使用当前时区解析。系统不会读取邮箱、登录招聘平台或自动投递。"
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
          <el-table-column prop="disposition" label="处理" width="120" />
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

      <template #footer>
        <el-button @click="closeImport">关闭</el-button>
        <el-button
          v-if="importResult?.batchId && importResult.errorCount"
          data-testid="download-career-import-errors"
          :icon="Download"
          :loading="downloadingErrors"
          @click="downloadImportErrors"
        >
          下载错误行 CSV
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
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CalendarDays, ChevronLeft, ChevronRight, Download, Plus, Upload } from 'lucide-vue-next'

import {
  createCareerCalendarEventApi,
  deleteCareerCalendarEventApi,
  downloadCareerImportErrorsApi,
  exportCareerCalendarCsvApi,
  exportCareerCalendarIcsApi,
  getCareerCalendarEventsApi,
  importCareerCsvApi,
  importCareerIcsApi,
  previewCareerCsvImportApi,
  previewCareerIcsImportApi,
  updateCareerCalendarEventApi
} from '@/api/careerGrowth'
import type { JobApplicationVO } from '@/api/v4'
import { isCalendarEventOverdue } from '@/features/career-growth'
import type {
  CareerCalendarEventSave,
  CareerCalendarEventVO,
  CareerCsvMapping,
  CareerDuplicatePolicy,
  CareerImportDuplicateCandidate,
  CareerImportPreviewVO,
  CareerImportResultVO
} from '@/types/careerGrowth'

const props = defineProps<{
  applications: JobApplicationVO[]
}>()

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const eventTypeOptions = [
  { label: '投递', value: 'APPLICATION' },
  { label: '跟进', value: 'FOLLOW_UP' },
  { label: '面试', value: 'INTERVIEW' },
  { label: '感谢信', value: 'THANK_YOU' },
  { label: 'Offer 截止', value: 'OFFER_DEADLINE' },
  { label: '复盘', value: 'REVIEW' }
]
const importFormatOptions = [
  { label: 'CSV', value: 'CSV' },
  { label: 'ICS', value: 'ICS' }
]

const currentMonth = ref(startOfMonth(new Date()))
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const exporting = ref(false)
const previewing = ref(false)
const importing = ref(false)
const downloadingErrors = ref(false)
const errorMessage = ref('')
const events = ref<CareerCalendarEventVO[]>([])
const eventDialogVisible = ref(false)
const importDialogVisible = ref(false)
const editingEventId = ref<number>()
const importFormat = ref<'CSV' | 'ICS'>('CSV')
const duplicatePolicy = ref<CareerDuplicatePolicy>('SKIP')
const selectedFile = ref<File>()
const fileInputKey = ref(0)
const importPreview = ref<CareerImportPreviewVO>()
const importResult = ref<CareerImportResultVO>()
const csvMapping = ref<CareerCsvMapping>({})
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'

const eventForm = reactive<CareerCalendarEventSave>({
  title: '',
  eventType: 'FOLLOW_UP',
  startsAt: '',
  endsAt: '',
  timezone,
  allDay: false,
  location: '',
  description: '',
  status: 'CONFIRMED'
})

const applications = computed(() => props.applications || [])
const monthTitle = computed(() =>
  new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(currentMonth.value)
)
const monthRange = computed(() => {
  const from = startOfMonth(currentMonth.value)
  const to = startOfMonth(new Date(from.getFullYear(), from.getMonth() + 1, 1))
  return { from: from.toISOString(), to: to.toISOString() }
})
const overdueEvents = computed(() => events.value.filter((event) => isOverdue(event)))
const importAccept = computed(() => importFormat.value === 'CSV' ? '.csv,text/csv' : '.ics,text/calendar')
const importSummary = computed(() => importResult.value || importPreview.value)

const calendarDays = computed(() => {
  const first = startOfMonth(currentMonth.value)
  const mondayIndex = (first.getDay() + 6) % 7
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - mondayIndex)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    const key = dateKey(date)
    return {
      key,
      date,
      dayNumber: date.getDate(),
      currentMonth: date.getMonth() === first.getMonth(),
      isToday: key === dateKey(new Date()),
      events: events.value
        .filter((event) => String(event.startsAt).slice(0, 10) === key)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    }
  })
})

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const localDateTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${dateKey(date)}T${hours}:${minutes}:00`
}

const applicationLabel = (item: JobApplicationVO) =>
  `${item.companyName || '未填写公司'} · ${item.jobTitle || '未填写岗位'}`

const isOverdue = (event: CareerCalendarEventVO) => isCalendarEventOverdue(event)

const eventTimeText = (event: CareerCalendarEventVO) => {
  if (event.allDay) return '全天'
  return event.startsAt.slice(11, 16) || '--:--'
}

const moveMonth = (delta: number) => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + delta, 1)
}

const goToday = () => {
  currentMonth.value = startOfMonth(new Date())
}

const loadEvents = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    events.value = await getCareerCalendarEventsApi(monthRange.value)
  } catch (error) {
    events.value = []
    errorMessage.value = error instanceof Error ? error.message : '求职日历加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

const openCreate = (date = new Date()) => {
  editingEventId.value = undefined
  const startsAt = new Date(date)
  startsAt.setHours(9, 0, 0, 0)
  const endsAt = new Date(startsAt)
  endsAt.setHours(10)
  Object.assign(eventForm, {
    applicationId: undefined,
    title: '',
    eventType: 'FOLLOW_UP',
    startsAt: localDateTime(startsAt),
    endsAt: localDateTime(endsAt),
    timezone,
    allDay: false,
    location: '',
    description: '',
    status: 'CONFIRMED'
  })
  eventDialogVisible.value = true
}

const openEdit = (event: CareerCalendarEventVO) => {
  editingEventId.value = event.id
  Object.assign(eventForm, {
    applicationId: event.applicationId,
    title: event.title,
    eventType: event.eventType,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone || timezone,
    allDay: event.allDay,
    location: event.location || '',
    description: event.description || '',
    status: event.status || 'CONFIRMED'
  })
  eventDialogVisible.value = true
}

const validateEvent = () => {
  if (!eventForm.title.trim()) return '请填写事件标题。'
  if (!eventForm.startsAt || !eventForm.endsAt) return '请选择完整的开始和结束时间。'
  if (new Date(eventForm.startsAt) >= new Date(eventForm.endsAt)) return '结束时间必须晚于开始时间。'
  return ''
}

const saveEvent = async () => {
  if (saving.value) return
  const message = validateEvent()
  if (message) {
    ElMessage.warning(message)
    return
  }
  saving.value = true
  try {
    if (editingEventId.value) {
      await updateCareerCalendarEventApi(editingEventId.value, eventForm)
      ElMessage.success('日历事件已更新。')
    } else {
      await createCareerCalendarEventApi(eventForm)
      ElMessage.success('日历事件已创建。')
    }
    eventDialogVisible.value = false
    await loadEvents()
  } finally {
    saving.value = false
  }
}

const removeEvent = async () => {
  if (!editingEventId.value || deleting.value) return
  try {
    await ElMessageBox.confirm('确定删除这个日历事件吗？', '删除事件', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  deleting.value = true
  try {
    await deleteCareerCalendarEventApi(editingEventId.value)
    eventDialogVisible.value = false
    ElMessage.success('日历事件已删除。')
    await loadEvents()
  } finally {
    deleting.value = false
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

const exportCalendar = async (format: string) => {
  if (exporting.value) return
  exporting.value = true
  try {
    if (format === 'ics') {
      downloadBlob(await exportCareerCalendarIcsApi(timezone, monthRange.value), `career-calendar-${dateKey(currentMonth.value)}.ics`)
    } else {
      downloadBlob(await exportCareerCalendarCsvApi(monthRange.value), `career-calendar-${dateKey(currentMonth.value)}.csv`)
    }
    ElMessage.success('日历导出已开始。')
  } finally {
    exporting.value = false
  }
}

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
  importResult.value = undefined
  try {
    importPreview.value = importFormat.value === 'CSV'
      ? await previewCareerCsvImportApi(selectedFile.value, timezone, csvMapping.value)
      : await previewCareerIcsImportApi(selectedFile.value, timezone)
    if (importFormat.value === 'CSV') {
      csvMapping.value = {
        ...importPreview.value.suggestedMapping,
        ...csvMapping.value
      }
    }
  } finally {
    previewing.value = false
  }
}

const commitImport = async () => {
  if (!selectedFile.value || !importPreview.value || importing.value) return
  importing.value = true
  try {
    importResult.value = importFormat.value === 'CSV'
      ? await importCareerCsvApi(selectedFile.value, timezone, duplicatePolicy.value, csvMapping.value)
      : await importCareerIcsApi(selectedFile.value, timezone)
    const result = importResult.value
    if (result.errorCount || result.duplicateCount) {
      ElMessage.warning(`导入完成：成功 ${result.successCount}，错误 ${result.errorCount}，重复 ${result.duplicateCount}。`)
    } else {
      ElMessage.success(`已成功导入 ${result.successCount} 条记录。`)
    }
    await loadEvents()
  } finally {
    importing.value = false
  }
}

const downloadImportErrors = async () => {
  if (!importResult.value?.batchId || downloadingErrors.value) return
  downloadingErrors.value = true
  try {
    const blob = await downloadCareerImportErrorsApi(importResult.value.batchId)
    downloadBlob(blob, `career-import-${importResult.value.batchId}-errors.csv`)
  } finally {
    downloadingErrors.value = false
  }
}

const closeImport = () => {
  importDialogVisible.value = false
  selectedFile.value = undefined
  importPreview.value = undefined
  importResult.value = undefined
  csvMapping.value = {}
  fileInputKey.value += 1
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

watch(importFormat, () => {
  selectedFile.value = undefined
  importPreview.value = undefined
  importResult.value = undefined
  csvMapping.value = {}
  fileInputKey.value += 1
})

watch(currentMonth, loadEvents)
onMounted(loadEvents)
</script>

<style scoped lang="scss">
.career-calendar-panel {
  padding: 22px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
}

.calendar-toolbar,
.toolbar-actions,
.calendar-summary,
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

.calendar-toolbar {
  justify-content: space-between;
  margin-bottom: 14px;
}

.calendar-toolbar h2,
.calendar-toolbar p {
  margin: 0;
}

.section-kicker {
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.toolbar-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.calendar-summary {
  padding: 10px 0;
  color: var(--app-text-secondary);
  font-size: 13px;
}

.has-overdue,
.has-errors {
  color: var(--el-color-danger);
  font-weight: 700;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border-top: 1px solid var(--app-border);
  border-left: 1px solid var(--app-border);
}

.weekday {
  min-width: 0;
  padding: 9px;
  border-right: 1px solid var(--app-border);
  border-bottom: 1px solid var(--app-border);
  color: var(--app-text-secondary);
  font-size: 12px;
  text-align: center;
}

.calendar-day {
  min-width: 0;
  min-height: 118px;
  padding: 8px;
  border: 0;
  border-right: 1px solid var(--app-border);
  border-bottom: 1px solid var(--app-border);
  background: transparent;
  color: inherit;
  text-align: left;
}

.calendar-day:hover {
  background: var(--app-surface-muted, rgba(15, 23, 42, 0.035));
}

.calendar-day.is-outside {
  color: var(--app-text-secondary);
  opacity: 0.55;
}

.calendar-day.is-today .day-number {
  display: inline-grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 50%;
  background: var(--app-primary);
  color: white;
}

.calendar-day.has-overdue {
  box-shadow: inset 3px 0 0 var(--el-color-danger);
}

.day-events {
  display: grid;
  gap: 4px;
  margin-top: 6px;
}

.event-chip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 5px;
  min-width: 0;
  padding: 4px 6px;
  border: 0;
  border-left: 3px solid var(--app-primary);
  background: rgba(59, 130, 246, 0.1);
  color: inherit;
  font-size: 11px;
  text-align: left;
}

.event-chip strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-chip.is-overdue {
  border-left-color: var(--el-color-danger);
  background: rgba(239, 68, 68, 0.1);
}

.event-chip.type-interview {
  border-left-color: var(--el-color-success);
  background: rgba(34, 197, 94, 0.1);
}

.event-chip.type-offer_deadline {
  border-left-color: var(--el-color-warning);
  background: rgba(245, 158, 11, 0.12);
}

.more-events {
  color: var(--app-text-secondary);
  font-size: 11px;
}

.empty-calendar {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 30px;
  color: var(--app-text-secondary);
  text-align: center;
}

.empty-calendar p {
  margin: 0;
}

.two-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.compact-row {
  align-items: end;
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

:deep(.el-select),
:deep(.el-date-editor) {
  width: 100%;
}

@media (max-width: 900px) {
  .calendar-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-actions {
    justify-content: flex-start;
  }

  .calendar-grid {
    min-width: 760px;
  }

  .career-calendar-panel {
    overflow-x: auto;
  }
}

@media (max-width: 620px) {
  .two-column {
    grid-template-columns: 1fr;
  }

  .mapping-grid {
    grid-template-columns: 1fr;
  }
}
</style>
