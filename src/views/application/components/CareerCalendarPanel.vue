<template>
  <section class="career-calendar-panel">
    <CareerCalendarGrid
      :events="events"
      :loading="loading"
      :error-message="errorMessage"
      :timezone="timezone"
      :exporting="exporting"
      @create="openCreate"
      @edit="openEdit"
      @prepare="openPreparation"
      @export="exportCalendar"
      @import="importDialogVisible = true"
      @refresh="loadEvents"
      @month-change="handleMonthChange"
    />

    <CareerEventDialog
      :visible="eventDialogVisible"
      :form="eventForm"
      :editing-event-id="editingEventId"
      :applications="applications"
      :saving="saving"
      :deleting="deleting"
      @update:visible="eventDialogVisible = $event"
      @save="saveEvent"
      @delete="removeEvent"
    />

    <CareerInterviewPreparationDialog
      :visible="preparationDialogVisible"
      :event="selectedPreparationEvent"
      @update:visible="preparationDialogVisible = $event"
      @generated="loadEvents"
    />

    <CareerImportDialog
      :visible="importDialogVisible"
      :timezone="timezone"
      @update:visible="importDialogVisible = $event"
      @imported="loadEvents"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  createCareerCalendarEventApi,
  deleteCareerCalendarEventApi,
  exportCareerCalendarCsvApi,
  exportCareerCalendarIcsApi,
  getCareerCalendarEventsApi,
  updateCareerCalendarEventApi,
  type CareerCalendarEventWithPreparationVO
} from '@/api/careerGrowth'
import type { JobApplicationVO } from '@/api/v4'
import { useCalendarTimezone } from '@/composables/useCalendarTimezone'
import type { CareerCalendarEventSave } from '@/types/careerGrowth'
import CareerCalendarGrid from '@/views/v4/career-calendar/components/CareerCalendarGrid.vue'
import CareerEventDialog from '@/views/v4/career-calendar/components/CareerEventDialog.vue'
import CareerImportDialog from '@/views/v4/career-calendar/components/CareerImportDialog.vue'
import CareerInterviewPreparationDialog from '@/views/v4/career-calendar/components/CareerInterviewPreparationDialog.vue'

const props = defineProps<{
  applications: JobApplicationVO[]
}>()

const { timezone } = useCalendarTimezone()

const currentMonth = ref(startOfMonth(new Date()))
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const exporting = ref(false)
const errorMessage = ref('')
const events = ref<CareerCalendarEventWithPreparationVO[]>([])
const eventDialogVisible = ref(false)
const importDialogVisible = ref(false)
const editingEventId = ref<number>()
const preparationDialogVisible = ref(false)
const selectedPreparationEvent = ref<CareerCalendarEventWithPreparationVO>()

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
const monthRange = computed(() => {
  const from = startOfMonth(currentMonth.value)
  const to = startOfMonth(new Date(from.getFullYear(), from.getMonth() + 1, 1))
  return { from: from.toISOString(), to: to.toISOString() }
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

const handleMonthChange = (month: Date) => {
  currentMonth.value = month
  loadEvents()
}

const openCreate = (date: Date = new Date()) => {
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

const openEdit = (event: CareerCalendarEventWithPreparationVO) => {
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

const openPreparation = (event: CareerCalendarEventWithPreparationVO) => {
  selectedPreparationEvent.value = event
  preparationDialogVisible.value = true
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

onMounted(loadEvents)
</script>

<style scoped lang="scss">
.career-calendar-panel {
  padding: 22px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
}
</style>
