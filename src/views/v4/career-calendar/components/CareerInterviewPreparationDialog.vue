<template>
  <el-dialog
    :model-value="visible"
    title="面试准备包"
    width="780px"
    class="career-interview-preparation-dialog"
    @update:model-value="emit('update:visible', $event)"
  >
    <template v-if="event">
      <header class="preparation-context">
        <div>
          <strong>{{ event.title }}</strong>
          <p>{{ eventTimeText }}</p>
          <p v-if="event.location">{{ event.location }}</p>
        </div>
        <el-tag size="small" effect="plain">{{ eventTypeLabel(event.eventType) }}</el-tag>
      </header>

      <div class="preparation-toolbar">
        <div>
          <span class="control-label">准备时长</span>
          <el-segmented
            :model-value="timeBudgetMinutes"
            :options="budgetOptions"
            data-testid="interview-preparation-budget"
            @change="selectTimeBudget"
          />
        </div>
        <div class="toolbar-actions">
          <el-button
            v-if="loadError"
            :icon="RefreshCw"
            :loading="loading"
            @click="loadPreparation"
          >
            重试读取
          </el-button>
          <el-button
            type="primary"
            :icon="preparation ? RefreshCw : Sparkles"
            :loading="generating"
            :disabled="loading"
            data-testid="generate-interview-preparation"
            @click="handleGenerate"
          >
            {{ generateButtonText }}
          </el-button>
        </div>
      </div>

      <el-alert
        v-if="loadError"
        type="error"
        show-icon
        :closable="false"
        title="准备包读取失败"
        :description="loadError"
      />

      <el-skeleton v-if="loading" animated :rows="7" />

      <div
        v-else-if="!preparation && !loadError"
        class="preparation-empty"
        data-testid="interview-preparation-empty"
      >
        <Sparkles :size="24" />
        <strong>还没有准备包</strong>
        <p>选择时间预算后生成。</p>
      </div>

      <article
        v-else-if="preparation"
        class="preparation-content"
        data-testid="interview-preparation-content"
      >
        <header class="preparation-summary">
          <div>
            <h3>{{ preparation.summary || '面试准备包' }}</h3>
            <p>{{ preparation.timeBudgetMinutes }} 分钟准备方案</p>
          </div>
          <div class="preparation-badges">
            <el-tag
              v-if="preparation.fallback"
              type="warning"
              effect="plain"
              data-testid="interview-preparation-fallback"
            >
              规则降级
            </el-tag>
            <el-tag
              v-if="preparation.confidenceLevel"
              :type="confidenceTagType(preparation.confidenceLevel)"
              effect="plain"
              data-testid="interview-preparation-confidence"
            >
              {{ confidenceLabel(preparation.confidenceLevel) }}
            </el-tag>
            <el-tag v-if="preparation.status" type="info" effect="plain">
              {{ statusLabel(preparation.status) }}
            </el-tag>
          </div>
        </header>

        <section v-if="preparation.facts.length" class="preparation-section">
          <h4>已知事实</h4>
          <ul>
            <li v-for="item in preparation.facts" :key="item">{{ item }}</li>
          </ul>
        </section>

        <section v-if="preparation.limits.length" class="preparation-section limitation-section">
          <h4>来源限制</h4>
          <ul>
            <li v-for="item in preparation.limits" :key="item">{{ item }}</li>
          </ul>
        </section>

        <section v-if="preparation.focusAreas.length" class="preparation-section">
          <h4>准备重点</h4>
          <ol>
            <li v-for="item in preparation.focusAreas" :key="item">{{ item }}</li>
          </ol>
        </section>

        <section v-if="preparation.projectStories.length" class="preparation-section">
          <h4>项目故事</h4>
          <ol>
            <li v-for="item in preparation.projectStories" :key="item">{{ item }}</li>
          </ol>
        </section>

        <section v-if="preparation.practiceQuestions.length" class="preparation-section">
          <h4>建议练习方向</h4>
          <ol>
            <li v-for="item in preparation.practiceQuestions" :key="item">{{ item }}</li>
          </ol>
        </section>

        <section v-if="preparation.checklist.length" class="preparation-section">
          <h4>面试前检查</h4>
          <ul class="checklist">
            <li v-for="item in preparation.checklist" :key="item">
              <Check :size="15" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </section>

        <section v-if="preparation.schedule.length" class="preparation-section">
          <h4>时间安排</h4>
          <ol class="schedule-list">
            <li v-for="item in preparation.schedule" :key="item">{{ item }}</li>
          </ol>
        </section>

        <section v-if="preparation.nextActions.length" class="preparation-section">
          <h4>下一步</h4>
          <ol>
            <li v-for="item in preparation.nextActions" :key="item">{{ item }}</li>
          </ol>
        </section>

        <section v-if="preparation.evidenceSources.length" class="preparation-section">
          <h4>证据来源</h4>
          <div class="source-tags" data-testid="interview-preparation-sources">
            <el-tag
              v-for="source in preparation.evidenceSources"
              :key="source"
              size="small"
              type="info"
              effect="plain"
            >
              {{ evidenceSourceLabel(source) }}
            </el-tag>
          </div>
        </section>

        <footer class="preparation-generation">
          <span v-if="preparation.generatedAt">{{ formatDateTime(preparation.generatedAt) }}</span>
          <span v-if="preparation.aiCallLogId">AI 调用 #{{ preparation.aiCallLogId }}</span>
          <span v-if="preparation.sourceHash">来源快照 {{ shortHash(preparation.sourceHash) }}</span>
        </footer>
      </article>
    </template>

    <template #footer>
      <ExternalPlanPreviewEntry
        v-if="preparation"
        source-type="INTERVIEW_PREPARATION"
        :source-id="event?.id"
        :source-context-hash="preparation.sourceHash"
        :target-date="event?.startsAt?.slice(0, 10)"
        :intents="preparationPlanIntents"
        :capability-available="canAddPreparationToPlan"
        button-label="加入计划"
        test-id="add-interview-preparation-to-plan"
        unavailable-reason="当前版本暂不支持加入计划"
      />
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, RefreshCw, Sparkles } from 'lucide-vue-next'

import ExternalPlanPreviewEntry from '@/components/v7/ExternalPlanPreviewEntry.vue'
import {
  careerInterviewPreparationBudgets,
  generateCareerInterviewPreparationApi,
  getCareerInterviewPreparationApi,
  type CareerCalendarEventWithPreparationVO,
  type CareerInterviewPreparationTimeBudget,
  type CareerInterviewPreparationVO
} from '@/api/careerGrowth'
import { formatCalendarEventLocalTime } from '@/composables/useCalendarTimezone'
import { toFriendlyMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

const props = defineProps<{
  visible: boolean
  event?: CareerCalendarEventWithPreparationVO
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'generated', value: CareerInterviewPreparationVO): void
}>()

const budgetOptions = careerInterviewPreparationBudgets.map((value) => ({
  label: `${value} 分钟`,
  value
}))

const timeBudgetMinutes = ref<CareerInterviewPreparationTimeBudget>(60)
const preparation = ref<CareerInterviewPreparationVO | null>(null)
const loading = ref(false)
const generating = ref(false)
const loadError = ref('')

const eventTimeText = computed(() =>
  formatCalendarEventLocalTime(props.event?.startsAt, props.event?.timezone)
)
const generateButtonText = computed(() => {
  if (!preparation.value) return '生成准备包'
  if (preparation.value.timeBudgetMinutes !== timeBudgetMinutes.value) {
    return `生成 ${timeBudgetMinutes.value} 分钟方案`
  }
  return '重新生成'
})
const canAddPreparationToPlan = computed(() =>
  Boolean(preparation.value?.nextActions.length && !props.event?.preparationStale)
)
const preparationPlanIntents = computed(() =>
  (preparation.value?.nextActions || []).map((title, index) => ({
    sourceItemKey: `interview-preparation-${props.event?.id || 'event'}-${index}`,
    title,
    description: preparation.value?.summary,
    planDate: props.event?.startsAt,
    estimatedMinutes: Math.max(15, Math.round((preparation.value?.timeBudgetMinutes || 60) / Math.max(1, preparation.value?.nextActions.length || 1))),
    priority: preparation.value?.confidenceLevel === 'LOW' ? 'LOW' : 'MEDIUM',
    confidenceLevel: preparation.value?.confidenceLevel,
    fallback: preparation.value?.fallback
  }))
)

const errorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage(
      (error as { message?: unknown }).message,
      '准备包请求失败，请稍后重试。'
    )
  }
  return '准备包请求失败，请稍后重试。'
}

const loadPreparation = async () => {
  const eventId = props.event?.id
  if (!eventId || loading.value) return
  loading.value = true
  loadError.value = ''
  try {
    preparation.value = await getCareerInterviewPreparationApi(eventId)
    if (preparation.value) {
      timeBudgetMinutes.value = preparation.value.timeBudgetMinutes
    }
  } catch (error) {
    preparation.value = null
    loadError.value = errorMessage(error)
  } finally {
    loading.value = false
  }
}

const selectTimeBudget = (value: unknown) => {
  const parsed = Number(value)
  timeBudgetMinutes.value = parsed === 30 || parsed === 120 ? parsed : 60
}

const handleGenerate = async () => {
  const eventId = props.event?.id
  if (!eventId || generating.value) return
  const force = Boolean(
    preparation.value &&
    preparation.value.timeBudgetMinutes === timeBudgetMinutes.value
  )
  if (force) {
    try {
      await ElMessageBox.confirm(
        '重新生成会覆盖当前准备包，但不会修改日历事件或投递记录。',
        '重新生成准备包',
        {
          type: 'warning',
          confirmButtonText: '确认重新生成',
          cancelButtonText: '取消'
        }
      )
    } catch {
      return
    }
  }

  generating.value = true
  loadError.value = ''
  try {
    const result = await generateCareerInterviewPreparationApi(eventId, {
      timeBudgetMinutes: timeBudgetMinutes.value,
      force
    })
    preparation.value = result
    timeBudgetMinutes.value = result.timeBudgetMinutes
    emit('generated', result)
    ElMessage.success(result.fallback ? '规则降级准备包已生成。' : '面试准备包已生成。')
  } catch (error) {
    loadError.value = errorMessage(error)
  } finally {
    generating.value = false
  }
}

const confidenceLabel = (value?: string) => {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'HIGH') return '高置信度'
  if (normalized === 'MEDIUM') return '中置信度'
  if (normalized === 'LOW') return '低置信度'
  return value || '置信度待确认'
}

const confidenceTagType = (value?: string) => {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'HIGH') return 'success'
  if (normalized === 'LOW') return 'warning'
  return 'info'
}

const statusLabel = (value?: string) => {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'READY') return '已生成'
  if (normalized === 'FALLBACK') return '降级结果'
  if (normalized === 'FAILED') return '生成失败'
  return value || '状态待确认'
}

const eventTypeLabel = (value?: string) => {
  const labels: Record<string, string> = {
    INTERVIEW: '面试',
    INTERVIEW_SCHEDULED: '面试安排',
    PHONE_SCREEN: '电话沟通',
    TECHNICAL_INTERVIEW: '技术面试',
    HR_INTERVIEW: 'HR 面试',
    FINAL_INTERVIEW: '终面'
  }
  const normalized = String(value || '').toUpperCase()
  return labels[normalized] || value || '面试事件'
}

const evidenceSourceLabel = (source: string) => {
  const [rawType, rawId] = source.split(':', 2)
  const type = String(rawType || '').trim().toUpperCase()
  const id = String(rawId || '').trim()
  const labels: Record<string, string> = {
    CAREER_CALENDAR_EVENT: '日历事件',
    CALENDAR_EVENT: '日历事件',
    JOB_APPLICATION: '关联投递',
    APPLICATION: '关联投递',
    TARGET_JOB: '目标岗位',
    RESUME_VERSION: '简历版本',
    PROJECT_EVIDENCE: '项目证据',
    JOB_READINESS_SNAPSHOT: '岗位准备度',
    INTERVIEW_WEAKNESS_SUMMARY: '近期面试弱项'
  }
  const label = labels[type] || '其他证据来源'
  return id ? `${label} #${id}` : label
}

const shortHash = (value: string) =>
  value.length > 14 ? `${value.slice(0, 7)}...${value.slice(-7)}` : value

watch(
  () => [props.visible, props.event?.id] as const,
  ([visible]) => {
    if (!visible) return
    preparation.value = null
    loadError.value = ''
    timeBudgetMinutes.value = 60
    void loadPreparation()
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.preparation-context,
.preparation-toolbar,
.toolbar-actions,
.preparation-summary,
.preparation-badges,
.source-tags,
.preparation-generation {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.preparation-context,
.preparation-toolbar,
.preparation-summary {
  justify-content: space-between;
}

.preparation-context {
  padding-bottom: 14px;
  border-bottom: 1px solid var(--app-border);
}

.preparation-context p,
.preparation-summary p,
.preparation-empty p {
  margin: 5px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.55;
}

.preparation-toolbar {
  align-items: flex-end;
  margin: 16px 0;
}

.control-label {
  display: block;
  margin-bottom: 7px;
  color: var(--app-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.toolbar-actions,
.preparation-badges,
.source-tags,
.preparation-generation {
  flex-wrap: wrap;
}

.preparation-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 34px 16px;
  color: var(--app-text-secondary);
  text-align: center;
}

.preparation-empty strong {
  color: var(--app-text);
}

.preparation-content {
  display: grid;
  gap: 0;
}

.preparation-summary {
  padding: 4px 0 16px;
}

.preparation-summary h3 {
  max-width: 65ch;
  margin: 0;
  font-size: 17px;
  line-height: 1.5;
}

.preparation-badges {
  justify-content: flex-end;
}

.preparation-section {
  padding: 14px 0;
  border-top: 1px solid var(--app-border);
}

.preparation-section h4 {
  margin: 0 0 8px;
  font-size: 13px;
}

.preparation-section ul,
.preparation-section ol {
  display: grid;
  gap: 7px;
  margin: 0;
  padding-left: 21px;
  color: var(--app-text-secondary);
  line-height: 1.65;
}

.limitation-section {
  color: var(--el-color-warning);
}

.limitation-section ul {
  color: inherit;
}

.checklist {
  padding-left: 0 !important;
  list-style: none;
}

.checklist li {
  display: flex;
  align-items: flex-start;
  gap: 7px;
}

.checklist svg {
  flex: 0 0 auto;
  margin-top: 4px;
  color: var(--el-color-success);
}

.schedule-list {
  list-style-position: outside;
}

.preparation-generation {
  padding-top: 12px;
  border-top: 1px solid var(--app-border);
  color: var(--app-text-secondary);
  font-size: 12px;
}

@media (max-width: 680px) {
  .preparation-toolbar,
  .preparation-summary {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar-actions,
  .preparation-badges {
    justify-content: flex-start;
  }
}
</style>
