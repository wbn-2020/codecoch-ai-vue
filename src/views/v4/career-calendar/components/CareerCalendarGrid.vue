<template>
  <section class="career-calendar-grid">
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
        <el-button type="primary" :icon="Plus" @click="emitCreate()">新建事件</el-button>
        <el-dropdown @command="(command: string) => emit('export', command)">
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
          @click="emit('import')"
        >
          导入
        </el-button>
        <el-button :loading="loading" @click="emit('refresh')">刷新</el-button>
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
        @click="emitCreate(day.date)"
        @keydown.enter.self="emitCreate(day.date)"
      >
        <span class="day-number">{{ day.dayNumber }}</span>
        <div class="day-events">
          <div
            v-for="event in day.events.slice(0, 3)"
            :key="event.id"
            class="event-entry"
          >
            <button
              type="button"
              class="event-chip"
              :class="[`type-${String(event.eventType || '').toLowerCase()}`, { 'is-overdue': isOverdue(event) }]"
              :title="`${event.title} · ${eventTimeText(event)}`"
              @click.stop="emit('edit', event)"
            >
              <span>{{ eventTimeText(event) }}</span>
              <strong>{{ event.title }}</strong>
            </button>
            <button
              v-if="isCareerInterviewPreparationEventType(event.eventType)"
              type="button"
              class="prepare-event-button"
              :class="{
                'has-preparation': Boolean(event.preparationStatus) && !event.preparationStale,
                'is-stale': event.preparationStale
              }"
              :title="eventPreparationTitle(event)"
              :aria-label="eventPreparationTitle(event)"
              data-testid="prepare-interview-event"
              @click.stop="emit('prepare', event)"
            >
              <Sparkles :size="14" />
              <span v-if="event.preparationStale" class="preparation-stale-state">已过期，重新生成</span>
            </button>
          </div>
          <span v-if="day.events.length > 3" class="more-events">另有 {{ day.events.length - 3 }} 个</span>
        </div>
      </div>
    </div>

    <div v-if="!events.length && !loading && !errorMessage" class="empty-calendar">
      <CalendarDays :size="28" />
      <strong>本月还没有求职事件</strong>
      <p>可以安排投递、跟进、面试、感谢信、Offer 截止或复盘。</p>
      <el-button type="primary" @click="emitCreate()">创建第一个事件</el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, ChevronLeft, ChevronRight, Download, Plus, Sparkles, Upload } from 'lucide-vue-next'

import {
  isCareerInterviewPreparationEventType,
  type CareerCalendarEventWithPreparationVO
} from '@/api/careerGrowth'
import { isCalendarEventOverdue } from '@/features/career-growth'

const props = withDefaults(defineProps<{
  events: CareerCalendarEventWithPreparationVO[]
  loading: boolean
  errorMessage: string
  timezone: string
  exporting?: boolean
}>(), {
  exporting: false
})

const emit = defineEmits<{
  (event: 'create', date: Date): void
  (event: 'edit', value: CareerCalendarEventWithPreparationVO): void
  (event: 'prepare', value: CareerCalendarEventWithPreparationVO): void
  (event: 'export', format: string): void
  (event: 'import'): void
  (event: 'refresh'): void
  (event: 'month-change', value: Date): void
}>()

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const currentMonth = ref(startOfMonth(new Date()))

const monthTitle = computed(() =>
  new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(currentMonth.value)
)
const overdueEvents = computed(() => props.events.filter((event) => isOverdue(event)))

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
      events: props.events
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

const isOverdue = (event: CareerCalendarEventWithPreparationVO) => isCalendarEventOverdue(event)

const eventTimeText = (event: CareerCalendarEventWithPreparationVO) => {
  if (event.allDay) return '全天'
  return event.startsAt.slice(11, 16) || '--:--'
}

const eventPreparationTitle = (event: CareerCalendarEventWithPreparationVO) => {
  if (event.preparationStale) return `准备包已过期，点击重新生成 ${event.title} 的面试准备包`
  return event.preparationStatus ? `查看 ${event.title} 的面试准备包` : `为 ${event.title} 生成面试准备包`
}

const moveMonth = (delta: number) => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + delta, 1)
  emit('month-change', currentMonth.value)
}

const goToday = () => {
  currentMonth.value = startOfMonth(new Date())
  emit('month-change', currentMonth.value)
}

const emitCreate = (date: Date = new Date()) => {
  emit('create', date)
}

defineExpose({ currentMonth })
</script>

<style scoped lang="scss">
.career-calendar-grid {
  display: block;
}

.calendar-toolbar,
.toolbar-actions,
.calendar-summary {
  display: flex;
  align-items: center;
  gap: 12px;
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

.has-overdue {
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

.event-entry {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24px;
  gap: 3px;
  min-width: 0;
}

.event-chip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 5px;
  width: 100%;
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

.prepare-event-button {
  display: inline-flex;
  width: 24px;
  height: 24px;
  padding: 0;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: transparent;
  color: var(--app-text-secondary);
  cursor: pointer;
}

.prepare-event-button:hover,
.prepare-event-button:focus-visible {
  border-color: var(--app-primary);
  color: var(--app-primary);
  outline: none;
}

.prepare-event-button.has-preparation {
  border-color: rgba(34, 197, 94, 0.55);
  color: var(--el-color-success);
}

.prepare-event-button.is-stale {
  grid-column: 1 / -1;
  width: 100%;
  padding: 0 5px;
  justify-content: flex-start;
  border-color: rgba(245, 158, 11, 0.65);
  color: var(--el-color-warning);
}

.preparation-stale-state {
  font-size: 10px;
  line-height: 1;
  white-space: nowrap;
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

@media (max-width: 900px) {
  .career-calendar-grid {
    overflow-x: auto;
  }

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
}
</style>
