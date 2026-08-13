<template>
  <section class="suggestion-evidence-panel" :class="{ 'suggestion-evidence-panel--compact': compact }">
    <header class="suggestion-evidence-panel__header">
      <div class="suggestion-evidence-panel__title-group">
        <h3>{{ safeTitle }}</h3>
        <p v-if="safeContent">{{ safeContent }}</p>
      </div>

      <div class="suggestion-evidence-panel__meta">
        <el-tag :type="confidenceTagType" effect="plain">{{ confidenceLabel }}</el-tag>
        <el-tag v-for="status in statusTags" :key="status.label" :type="status.type" effect="plain">
          {{ status.label }}
        </el-tag>
      </div>
    </header>

    <el-alert
      v-for="alert in alertItems"
      :key="alert.title"
      class="suggestion-evidence-panel__alert"
      :type="alert.type"
      :closable="false"
      show-icon
      :title="alert.title"
    />

    <button class="suggestion-evidence-panel__toggle" type="button" @click="toggleOpen">
      <span>
        <ShieldCheck :size="15" />
        为什么推荐
      </span>
      <ChevronDown class="suggestion-evidence-panel__chevron" :class="{ 'is-open': isOpen }" :size="16" />
    </button>

    <div v-if="isOpen" class="suggestion-evidence-panel__body">
      <div class="suggestion-evidence-panel__reasons">
        <p v-for="reason in reasonItems" :key="reason">{{ reason }}</p>
      </div>

      <div v-if="qualityGateReasons.length" class="suggestion-evidence-panel__section">
        <h4>可信边界</h4>
        <ul class="suggestion-evidence-panel__plain-list">
          <li v-for="reason in qualityGateReasons" :key="reason">{{ reason }}</li>
        </ul>
      </div>

      <div v-if="unsupportedConclusionItems.length" class="suggestion-evidence-panel__section">
        <h4>暂不支持的结论</h4>
        <ul class="suggestion-evidence-panel__plain-list">
          <li v-for="item in unsupportedConclusionItems" :key="item">{{ item }}</li>
        </ul>
      </div>

      <div v-if="weakObservationItems.length" class="suggestion-evidence-panel__section">
        <h4>弱观察</h4>
        <ul class="suggestion-evidence-panel__plain-list">
          <li v-for="item in weakObservationItems" :key="item">{{ item }}</li>
        </ul>
      </div>

      <div class="suggestion-evidence-panel__section">
        <h4>证据来源</h4>
        <p v-if="!evidenceItems.length" class="suggestion-evidence-panel__empty">暂无可展示的证据来源</p>
        <ul v-else class="suggestion-evidence-panel__evidence-list">
          <li v-for="(evidence, index) in evidenceItems" :key="evidenceKey(evidence, index)">
            <button
              class="suggestion-evidence-panel__evidence-button"
              type="button"
              @click="emit('open-evidence', evidence)"
            >
              <span>
                <FileText :size="15" />
                {{ evidenceTitle(evidence, index) }}
              </span>
              <small v-if="evidenceSummary(evidence)">
                {{ evidenceSummary(evidence) }}
              </small>
              <em v-if="evidence.trustStatus" class="suggestion-evidence-panel__evidence-status">
                {{ evidenceTrustStatusLabel(evidence.trustStatus) }}
              </em>
            </button>
          </li>
        </ul>
      </div>

      <div v-if="actionItems.length" class="suggestion-evidence-panel__section">
        <h4>下一步行动</h4>
        <div class="suggestion-evidence-panel__actions">
          <el-button
            v-for="action in actionItems"
            :key="actionKey(action)"
            class="suggestion-evidence-panel__action-button"
            size="small"
            :disabled="isActionDisabled(action)"
            @click="handleActionClick(action)"
          >
            <span>{{ actionLabel(action) }}</span>
            <small v-if="actionDisabledReason(action)" class="suggestion-evidence-panel__action-hint">
              {{ actionDisabledReason(action) }}
            </small>
            <ExternalLink :size="14" />
          </el-button>
        </div>
      </div>

      <div v-if="showTrace && traceLabel" class="suggestion-evidence-panel__trace">
        追踪入口：{{ traceLabel }}
      </div>
      <div v-else-if="showTrace" class="suggestion-evidence-panel__trace">
        暂不可追踪：缺少 traceId 或 AI 调用记录
      </div>
    </div>

    <footer v-if="showFeedback" class="suggestion-evidence-panel__footer">
      <AiResultFeedback
        v-if="suggestion.scene"
        :scene="suggestion.scene"
        :biz-type="suggestion.bizType"
        :biz-id="feedbackBizId"
        :ai-call-log-id="feedbackAiCallLogId"
        :page-path="suggestion.pagePath"
        :compact="compact"
        @submitted="emit('feedback-submitted')"
      />
      <span v-else class="suggestion-evidence-panel__feedback-empty">
        反馈入口暂不可用：缺少建议场景，暂时不能绑定反馈。
      </span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { ChevronDown, ExternalLink, FileText, ShieldCheck } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import AiResultFeedback from '@/components/feedback/AiResultFeedback.vue'
import { getSuggestionSourceTypeLabel } from '@/types/suggestion'

type SuggestionConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | string | number | null

interface SuggestionEvidenceSource {
  id?: string | number
  title?: string
  label?: string
  sourceLabel?: string
  sourceType?: string
  sourceId?: string | number | null
  summary?: string
  evidenceSummary?: string
  sourceSummary?: string
  trustStatus?: string
  metadata?: {
    enabled?: boolean
    active?: boolean
    deleted?: boolean
    stale?: boolean
  }
}

interface SuggestionAction {
  key?: string
  label?: string
  path?: string
  actionUrl?: string
  actionType?: string | null
  disabled?: boolean
  description?: string
}

interface SuggestionTrace {
  aiCallLogId?: number | null
  traceId?: string | null
  agentRunId?: number | null
  asyncTaskId?: number | null
}

interface SuggestionQualityGate {
  gateStatus?: string
  suggestionStrength?: string
  reasons?: string[]
  sampleSize?: number | null
  minSampleSize?: number | null
}

interface SuggestionFeedbackState {
  status?: string
  errorMessage?: string
  submitted?: boolean
}

interface UserSuggestion {
  title?: string
  content?: string
  scene?: string
  bizType?: string
  bizId?: number | string | null
  pagePath?: string
  trace?: SuggestionTrace
  confidence?: SuggestionConfidence
  confidenceLevel?: SuggestionConfidence
  sampleInsufficient?: boolean
  sampleWarning?: string
  degraded?: boolean
  degradedReason?: string
  fallback?: boolean
  fallbackReason?: string
  mock?: boolean
  mockReason?: string
  trustStatus?: string
  resultSource?: string
  qualityGate?: SuggestionQualityGate
  unsupportedConclusions?: string[]
  weakObservations?: string[]
  why?: string | string[]
  reasons?: string[]
  reason?: string
  evidenceSources?: SuggestionEvidenceSource[]
  evidences?: SuggestionEvidenceSource[]
  nextActions?: SuggestionAction[]
  nextAction?: SuggestionAction
  actions?: SuggestionAction[]
  feedbackState?: SuggestionFeedbackState
}

const props = withDefaults(defineProps<{
  suggestion: UserSuggestion
  compact?: boolean
  defaultOpen?: boolean
  showTrace?: boolean
  showFeedback?: boolean
}>(), {
  compact: false,
  defaultOpen: false,
  showTrace: false,
  showFeedback: true
})

const emit = defineEmits<{
  'open-action': [action: SuggestionAction]
  'open-evidence': [evidence: SuggestionEvidenceSource]
  'feedback-submitted': []
}>()

const isOpen = ref(props.defaultOpen)

const sensitivePattern = /(RAW_PROMPT|MODEL_RESPONSE|debug_trace|internal stack trace|prompt payload)/i

const cleanUserText = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  const text = value.trim()
  if (!text) return ''
  return sensitivePattern.test(text) ? '' : text
}

const containsHiddenSensitiveText = computed(() => {
  const suggestion = props.suggestion
  const rawValues: unknown[] = [
    suggestion.content,
    suggestion.reason,
    suggestion.fallbackReason,
    suggestion.degradedReason,
    suggestion.mockReason,
    ...(Array.isArray(suggestion.why) ? suggestion.why : [suggestion.why]),
    ...(suggestion.evidenceSources || []).flatMap((item) => [item.summary, item.evidenceSummary, item.sourceSummary]),
    ...(suggestion.evidences || []).flatMap((item) => [item.summary, item.evidenceSummary, item.sourceSummary])
  ]
  return rawValues.some((item) => typeof item === 'string' && sensitivePattern.test(item))
})

const safeTitle = computed(() => cleanUserText(props.suggestion.title) || 'AI 建议')
const safeContent = computed(() => cleanUserText(props.suggestion.content))

const normalizedConfidence = computed(() =>
  String(props.suggestion.confidence ?? props.suggestion.confidenceLevel ?? 'UNKNOWN').toUpperCase()
)

const confidenceLabel = computed(() => {
  const labelMap: Record<string, string> = {
    HIGH: '高置信度',
    MEDIUM: '中置信度',
    LOW: '低置信度',
    UNKNOWN: '置信度待确认'
  }
  return labelMap[normalizedConfidence.value] || String(props.suggestion.confidence || props.suggestion.confidenceLevel)
})

const confidenceTagType = computed(() => {
  if (normalizedConfidence.value === 'HIGH') return 'success'
  if (normalizedConfidence.value === 'MEDIUM') return 'warning'
  if (normalizedConfidence.value === 'LOW') return 'danger'
  return 'info'
})

const isFallback = computed(() => {
  const status = String(props.suggestion.trustStatus || props.suggestion.resultSource || '').toUpperCase()
  return props.suggestion.fallback || status === 'FALLBACK'
})

const isMock = computed(() => {
  const source = String(props.suggestion.resultSource || '').toUpperCase()
  return props.suggestion.mock || source === 'MOCK'
})

const isDegraded = computed(() => {
  const status = String(props.suggestion.trustStatus || props.suggestion.resultSource || '').toUpperCase()
  return props.suggestion.degraded || status === 'DEGRADED'
})

const statusTags = computed(() => [
  ...(isDegraded.value ? [{ label: '已降级', type: 'warning' as const }] : []),
  ...(isMock.value ? [{ label: '演示/模拟数据', type: 'info' as const }] : []),
  ...(isFallback.value ? [{ label: '兜底建议', type: 'warning' as const }] : []),
  ...(String(props.suggestion.trustStatus || '').toUpperCase() === 'UNKNOWN'
    ? [{ label: '可信状态待确认', type: 'info' as const }]
    : [])
])

const sampleWarning = computed(() => {
  if (props.suggestion.sampleWarning) return props.suggestion.sampleWarning
  return props.suggestion.sampleInsufficient ? '样本不足，不能作为强结论' : ''
})

const statusReason = computed(() =>
  cleanUserText(props.suggestion.degradedReason) ||
  cleanUserText(props.suggestion.mockReason) ||
  cleanUserText(props.suggestion.fallbackReason)
)

const reasonItems = computed(() => {
  const why = props.suggestion.why
  if (Array.isArray(why)) return why.map(cleanUserText).filter(Boolean)
  if (cleanUserText(why)) return [cleanUserText(why)]
  if (props.suggestion.reasons?.length) return props.suggestion.reasons.map(cleanUserText).filter(Boolean)
  if (cleanUserText(props.suggestion.reason)) return [cleanUserText(props.suggestion.reason)]
  return ['该建议基于可展示的摘要证据、置信度和当前状态生成。']
})

const qualityGateReasons = computed(() =>
  (props.suggestion.qualityGate?.reasons || []).map(cleanUserText).filter(Boolean)
)

const unsupportedConclusionItems = computed(() =>
  (props.suggestion.unsupportedConclusions || []).map(cleanUserText).filter(Boolean)
)

const weakObservationItems = computed(() =>
  (props.suggestion.weakObservations || []).map(cleanUserText).filter(Boolean)
)

const strengthAlertTitle = computed(() => {
  const strength = String(props.suggestion.qualityGate?.suggestionStrength || '').toUpperCase()
  if (strength === 'STRONG') return ''
  if (strength === 'NORMAL') return '建议仍需结合来源复核'
  if (strength === 'WEAK') return '仅作为弱观察'
  if (strength === 'LOW_SAMPLE') return '样本不足，仅作为下一轮假设'
  if (strength === 'MOCK') return '演示/模拟数据不能作为真实强建议'
  if (strength === 'FALLBACK') return '兜底建议，需要补充证据后再判断'
  return ''
})

const alertItems = computed(() => {
  const items: Array<{ title: string; type: 'success' | 'warning' | 'info' | 'error' }> = []
  if (sampleWarning.value) items.push({ title: sampleWarning.value, type: 'warning' })
  if (statusReason.value) items.push({ title: statusReason.value, type: 'warning' })
  if (strengthAlertTitle.value) items.push({ title: strengthAlertTitle.value, type: 'warning' })
  if (containsHiddenSensitiveText.value) items.push({ title: '已隐藏内部生成细节', type: 'info' })
  if (String(props.suggestion.feedbackState?.status || '').toUpperCase() === 'FAILED') {
    items.push({ title: '反馈暂未提交成功，请稍后再试', type: 'warning' })
  }
  return items
})

const evidenceItems = computed(() =>
  (props.suggestion.evidenceSources?.length ? props.suggestion.evidenceSources : props.suggestion.evidences) || []
)

const actionItems = computed(() =>
  (props.suggestion.nextActions?.length
    ? props.suggestion.nextActions
    : props.suggestion.actions?.length
      ? props.suggestion.actions
      : props.suggestion.nextAction
        ? [props.suggestion.nextAction]
        : [])
)

const traceLabel = computed(() =>
  cleanUserText(props.suggestion.trace?.traceId) ||
  (props.suggestion.trace?.aiCallLogId ? `AI 调用 ${props.suggestion.trace.aiCallLogId}` : '') ||
  (props.suggestion.trace?.agentRunId ? `Agent Run ${props.suggestion.trace.agentRunId}` : '') ||
  (props.suggestion.trace?.asyncTaskId ? `异步任务 ${props.suggestion.trace.asyncTaskId}` : '')
)

const feedbackBizId = computed(() =>
  typeof props.suggestion.bizId === 'number' ? props.suggestion.bizId : undefined
)

const feedbackAiCallLogId = computed(() =>
  typeof props.suggestion.trace?.aiCallLogId === 'number' ? props.suggestion.trace.aiCallLogId : undefined
)

const evidenceKey = (evidence: SuggestionEvidenceSource, index: number) =>
  evidence.id ?? evidence.sourceId ?? evidence.title ?? evidence.sourceLabel ?? index

const evidenceTrustStatusLabel = (status?: string) => {
  const normalized = String(status || '').toUpperCase()
  const labelMap: Record<string, string> = {
    VERIFIED: '来源已验证',
    PARTIAL: '来源部分可信',
    FALLBACK: '来源为兜底摘要',
    DISABLED: '来源已停用',
    STALE: '来源可能过期',
    UNKNOWN: '来源状态待确认'
  }
  return labelMap[normalized] || '来源状态待确认'
}

const actionLabel = (action: SuggestionAction) =>
  cleanUserText(action.label) || cleanUserText(action.actionType) || '查看下一步'

const actionKey = (action: SuggestionAction) =>
  action.key || action.actionUrl || action.path || action.actionType || actionLabel(action)

const toggleOpen = () => {
  isOpen.value = !isOpen.value
}

const evidenceTitle = (evidence: SuggestionEvidenceSource, index: number) =>
  cleanUserText(evidence.sourceLabel) ||
  cleanUserText(evidence.label) ||
  cleanUserText(evidence.title) ||
  getSuggestionSourceTypeLabel(evidence.sourceType) ||
  `证据来源 ${index + 1}`

const evidenceSummary = (evidence: SuggestionEvidenceSource) =>
  cleanUserText(evidence.evidenceSummary) ||
  cleanUserText(evidence.sourceSummary) ||
  cleanUserText(evidence.summary)

const actionDisabledReason = (action: SuggestionAction) => {
  if (action.disabled) return cleanUserText(action.description) || '暂不可用'
  return action.path || action.actionUrl ? '' : '暂无可跳转入口'
}

const isActionDisabled = (action: SuggestionAction) => Boolean(action.disabled || actionDisabledReason(action))

const handleActionClick = (action: SuggestionAction) => {
  if (isActionDisabled(action)) return
  emit('open-action', action)
}
</script>

<style scoped lang="scss">
.suggestion-evidence-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
  color: var(--app-text);
}

.suggestion-evidence-panel--compact {
  gap: 10px;
  padding: 12px;
}

.suggestion-evidence-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.suggestion-evidence-panel__title-group {
  min-width: 0;
}

.suggestion-evidence-panel h3,
.suggestion-evidence-panel h4,
.suggestion-evidence-panel p {
  margin: 0;
}

.suggestion-evidence-panel h3 {
  color: var(--app-text);
  font-size: 16px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.suggestion-evidence-panel h4 {
  color: var(--app-text);
  font-size: 13px;
  line-height: 1.45;
}

.suggestion-evidence-panel__title-group p,
.suggestion-evidence-panel__reasons p,
.suggestion-evidence-panel__empty {
  margin-top: 6px;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.suggestion-evidence-panel__meta {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  max-width: 44%;
}

.suggestion-evidence-panel__alert {
  min-width: 0;
}

.suggestion-evidence-panel__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 0 0;
  border: 0;
  border-top: 1px solid var(--app-border);
  background: transparent;
  color: var(--app-text-muted);
  cursor: pointer;
}

.suggestion-evidence-panel__toggle > span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  overflow-wrap: anywhere;
}

.suggestion-evidence-panel__chevron {
  flex: 0 0 auto;
  transition: transform 0.18s ease;
}

.suggestion-evidence-panel__chevron.is-open {
  transform: rotate(180deg);
}

.suggestion-evidence-panel__body {
  display: grid;
  gap: 12px;
}

.suggestion-evidence-panel__section {
  display: grid;
  gap: 8px;
}

.suggestion-evidence-panel__evidence-list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.suggestion-evidence-panel__evidence-button {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--user-control-bg-muted);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
}

.suggestion-evidence-panel__evidence-button > span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.suggestion-evidence-panel__evidence-button small {
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.suggestion-evidence-panel__evidence-status {
  color: var(--app-primary);
  font-size: 12px;
  font-style: normal;
  line-height: 1.4;
}

.suggestion-evidence-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestion-evidence-panel__actions :deep(.el-button > span) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.suggestion-evidence-panel__trace {
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.suggestion-evidence-panel__footer {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .suggestion-evidence-panel__header {
    display: grid;
  }

  .suggestion-evidence-panel__meta {
    justify-content: flex-start;
    max-width: none;
  }
}
</style>
