<template>
  <section class="career-calendar-grid">
    <div class="calendar-toolbar">
      <div>
        <p class="section-kicker">日程安排</p>
        <h2>求职日历</h2>
      </div>
      <div class="toolbar-actions">
        <el-button :icon="ChevronLeft" circle title="上个月" :disabled="loading || Boolean(errorMessage)" @click="moveMonth(-1)" />
        <strong>{{ monthTitle }}</strong>
        <el-button :icon="ChevronRight" circle title="下个月" :disabled="loading || Boolean(errorMessage)" @click="moveMonth(1)" />
        <el-button :disabled="loading || Boolean(errorMessage)" @click="goToday">今天</el-button>
        <el-button type="primary" :icon="Plus" :disabled="loading || Boolean(errorMessage)" @click="emitCreate()">新建事件</el-button>
        <el-dropdown trigger="click" @command="handleMoreCommand">
          <el-button
            class="calendar-more-actions"
            :icon="MoreHorizontal"
            circle
            title="更多日历操作"
            aria-label="更多日历操作"
          />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="csv" :disabled="exporting || Boolean(errorMessage)">导出 CSV</el-dropdown-item>
              <el-dropdown-item command="ics" :disabled="exporting || Boolean(errorMessage)">导出 ICS</el-dropdown-item>
              <el-dropdown-item command="import" :disabled="Boolean(errorMessage)">导入日程</el-dropdown-item>
              <el-dropdown-item command="refresh" :disabled="loading">刷新日历</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
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

    <div v-if="errorMessage && !loading" class="calendar-error-state">
      <AppState type="error" title="日历数据未加载" description="当前没有可靠的日历数据，暂时不会展示可编辑的日历网格。">
        <el-button type="primary" @click="emit('refresh')">重新加载</el-button>
      </AppState>
    </div>

    <div v-if="!errorMessage || loading" class="calendar-summary">
      <span>本月 {{ events.length }} 个事件</span>
      <span :class="{ 'has-overdue': overdueEvents.length }">逾期 {{ overdueEvents.length }} 个</span>
      <span>时区 {{ timezone }}</span>
    </div>

    <div v-if="!errorMessage || loading" class="calendar-grid" v-loading="loading">
      <div v-for="weekday in weekdays" :key="weekday" class="weekday">{{ weekday }}</div>
      <div
        v-for="day in calendarDays"
        :key="day.key"
        class="calendar-day"
        :class="{
          'is-outside': !day.currentMonth,
          'is-today': day.isToday,
          'has-overdue': day.events.some((event) => isOverdue(event))
        }"
      >
        <div class="day-head">
          <span class="day-number">{{ day.dayNumber }}</span>
          <button
            class="day-create-button"
            type="button"
            :aria-label="`为 ${day.key} 新建事件`"
            :title="`为 ${day.key} 新建事件`"
            @click="emitCreate(day.date)"
          >
            <Plus :size="14" />
          </button>
        </div>
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
          <button
            v-if="day.events.length > 3"
            class="more-events"
            type="button"
            @click="openDayAgenda(day)"
          >
            查看另外 {{ day.events.length - 3 }} 个事件
          </button>
        </div>
      </div>
    </div>

    <section
      v-if="(mobileAgendaEvents.length || loading) && !errorMessage"
      class="mobile-agenda"
      aria-label="本月求职日程"
    >
      <p class="section-kicker">本月安排</p>
      <button
        v-for="event in mobileAgendaEvents"
        :key="event.id"
        class="mobile-agenda__item"
        type="button"
        @click="emit('edit', event)"
      >
        <span>{{ eventDateText(event) }} · {{ eventTimeText(event) }} · {{ eventTypeLabel(event.eventType) }}</span>
        <strong>{{ event.title }}</strong>
      </button>
    </section>

    <div v-if="!events.length && !loading && !errorMessage" class="empty-calendar">
      <CalendarDays :size="28" />
      <strong>本月还没有求职事件</strong>
      <p>可以安排投递、跟进、面试、感谢信、Offer 截止或复盘。</p>
      <el-button type="primary" @click="emitCreate()">创建第一个事件</el-button>
    </div>

    <el-drawer v-if="!errorMessage" v-model="agendaVisible" :title="agendaTitle" size="min(520px, 100vw)" append-to-body>
      <div class="agenda-drawer">
        <div class="agenda-drawer__head">
          <p>{{ selectedDayEvents.length }} 个事件</p>
          <el-button type="primary" :icon="Plus" @click="emitCreate(selectedDayDate || new Date())">新建事件</el-button>
        </div>
        <div v-if="selectedDayEvents.length" class="agenda-list">
          <article v-for="event in selectedDayEvents" :key="event.id" class="agenda-row">
            <div>
              <span>{{ eventTimeText(event) }} · {{ eventTypeLabel(event.eventType) }}</span>
              <strong>{{ event.title }}</strong>
            </div>
            <div class="agenda-row__actions">
              <el-button link type="primary" @click="emit('edit', event)">编辑</el-button>
              <el-button
                v-if="isCareerInterviewPreparationEventType(event.eventType)"
                link
                type="primary"
                @click="emit('prepare', event)"
              >
                {{ event.preparationStale ? '重新生成准备包' : '面试准备' }}
              </el-button>
            </div>
          </article>
        </div>
        <AppState v-else type="empty" title="当天没有事件" description="可以先安排一项投递、跟进或面试计划。" />
      </div>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, ChevronLeft, ChevronRight, MoreHorizontal, Plus, Sparkles } from 'lucide-vue-next'

import {
  isCareerInterviewPreparationEventType,
  type CareerCalendarEventWithPreparationVO
} from '@/api/careerGrowth'
import AppState from '@/components/common/AppState.vue'
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
const agendaVisible = ref(false)
const selectedDayKey = ref('')
const selectedDayDate = ref<Date>()

const monthTitle = computed(() =>
  new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(currentMonth.value)
)
const overdueEvents = computed(() => props.events.filter((event) => isOverdue(event)))
const mobileAgendaEvents = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  return props.events
    .filter((event) => {
      const date = new Date(event.startsAt)
      return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month
    })
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
})
const selectedDayEvents = computed(() =>
  props.events
    .filter((event) => String(event.startsAt).slice(0, 10) === selectedDayKey.value)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
)
const agendaTitle = computed(() =>
  selectedDayDate.value
    ? new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(selectedDayDate.value)
    : '当天日程'
)

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

const eventDateText = (event: CareerCalendarEventWithPreparationVO) => {
  const date = new Date(event.startsAt)
  if (Number.isNaN(date.getTime())) return '日期待确认'
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(date)
}

const eventTypeLabel = (value?: string) => {
  const labels: Record<string, string> = {
    APPLICATION: '投递',
    FOLLOW_UP: '跟进',
    INTERVIEW: '面试',
    THANK_YOU: '感谢信',
    OFFER_DEADLINE: '录用截止',
    REVIEW: '复盘'
  }
  return labels[String(value || '').toUpperCase()] || '日程'
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

const handleMoreCommand = (command: string) => {
  if (command === 'csv' || command === 'ics') {
    emit('export', command)
    return
  }
  if (command === 'import') {
    emit('import')
    return
  }
  if (command === 'refresh') {
    emit('refresh')
  }
}

const openDayAgenda = (day: { key: string; date: Date }) => {
  selectedDayKey.value = day.key
  selectedDayDate.value = day.date
  agendaVisible.value = true
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
  color: var(--arena-grn-d, var(--app-primary-hover));
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

.calendar-error-state {
  padding: 12px 0 8px;
}

.has-overdue {
  color: var(--el-color-danger);
  font-weight: 700;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  overflow: hidden;
  border: 1.5px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-surface);
  box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
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
  border-right: 1px solid var(--app-border);
  border-bottom: 1px solid var(--app-border);
  background: var(--app-surface);
  color: inherit;
  text-align: left;
}

.calendar-day:hover {
  background: var(--arena-grn-soft, rgba(23, 178, 106, 0.13));
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
  background: var(--arena-red-soft, rgba(229, 72, 77, 0.1));
}

.day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.day-create-button {
  display: inline-grid;
  width: 24px;
  height: 24px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text-muted);
  cursor: pointer;
}

.calendar-day:hover .day-create-button,
.day-create-button:hover,
.day-create-button:focus-visible {
  background: var(--app-surface);
  color: var(--arena-grn-d, var(--app-primary-hover));
  outline: none;
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
  border: 1px solid #b9e7cd;
  border-radius: 8px;
  background: var(--arena-grn-soft, rgba(23, 178, 106, 0.13));
  color: inherit;
  cursor: pointer;
  font-size: 11px;
  text-align: left;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}

.event-chip:hover,
.event-chip:focus-visible {
  border-color: var(--arena-grn, var(--app-primary));
  background: var(--app-surface);
  color: var(--arena-grn-d, var(--app-primary-hover));
  outline: none;
}

.event-chip strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-chip.is-overdue {
  border-color: #f4c3c5;
  background: var(--arena-red-soft, rgba(229, 72, 77, 0.1));
}

.event-chip.type-interview {
  border-color: #b9e7cd;
  background: var(--arena-grn-soft, rgba(23, 178, 106, 0.13));
}

.event-chip.type-offer_deadline {
  border-color: rgba(247, 144, 9, 0.32);
  background: var(--arena-amber-soft, rgba(247, 144, 9, 0.13));
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
  width: fit-content;
  padding: 2px 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--arena-grn-d, var(--app-primary-hover));
  cursor: pointer;
  font-size: 11px;
  font: inherit;
  text-align: left;
}

.more-events:hover,
.more-events:focus-visible {
  background: var(--arena-grn-soft, rgba(23, 178, 106, 0.13));
  outline: none;
}

.agenda-drawer {
  display: grid;
  gap: 16px;
}

.agenda-drawer__head,
.agenda-row,
.agenda-row__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agenda-drawer__head {
  justify-content: space-between;
}

.agenda-drawer__head p {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

.agenda-list {
  display: grid;
  gap: 10px;
}

.agenda-row {
  justify-content: space-between;
  padding: 14px;
  border: 1.5px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
}

.agenda-row > div:first-child {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.agenda-row span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.agenda-row strong {
  overflow-wrap: anywhere;
}

.agenda-row__actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
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

.mobile-agenda {
  display: none;
}

@media (max-width: 900px) {
  .career-calendar-grid {
    overflow: visible;
  }

  .calendar-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-actions {
    justify-content: flex-start;
  }

  .calendar-grid {
    display: none;
  }

  .mobile-agenda {
    display: grid;
    gap: 8px;
    margin-top: 12px;
  }

  .mobile-agenda__item {
    display: grid;
    gap: 4px;
    min-height: 58px;
    padding: 12px 14px;
    border: 1px solid var(--app-border);
    border-radius: 12px;
    background: var(--app-surface);
    color: var(--app-text);
    text-align: left;
  }

  .mobile-agenda__item {
    cursor: pointer;
  }

  .mobile-agenda__item:hover,
  .mobile-agenda__item:focus-visible {
    border-color: var(--app-primary);
    background: var(--arena-grn-soft, rgba(23, 178, 106, 0.13));
    outline: none;
  }

  .mobile-agenda__item span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  .mobile-agenda__item strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .agenda-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .agenda-row__actions {
    justify-content: flex-start;
  }
}
</style>
