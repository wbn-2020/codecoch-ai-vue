<template>
  <div class="agent-task-evidence">
    <SuggestionEvidencePanel
      :suggestion="panelSuggestion"
      :default-open="isOpen"
      :show-trace="true"
      compact
      @open-action="handleOpenAction"
      @feedback-submitted="handleFeedbackSubmitted"
    />
    <div v-if="feedbackRecorded || localFeedbackRecorded" class="agent-task-evidence__feedback-tag">已记录反馈</div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import SuggestionEvidencePanel from '@/components/suggestion/SuggestionEvidencePanel.vue'
import type { AgentTaskEvidence as AgentTaskEvidenceInfo } from '@/features/job-readiness/types'
import type { ExplainableSuggestionVO } from '@/types/suggestion'

interface PanelEvidenceSource {
  id?: string | number
  title?: string
  label?: string
  sourceLabel?: string
  sourceType?: string
  sourceId?: string | number | null
  evidenceSummary?: string
  sourceSummary?: string
  summary?: string
  trustStatus?: string
  metadata?: Record<string, unknown>
}

interface PanelAction {
  key?: string
  label: string
  path?: string
  actionUrl?: string
  disabled?: boolean
}

interface PanelSuggestion {
  id: string
  schemaVersion?: string
  scene?: string
  bizType?: string
  bizId?: number
  title?: string
  content?: string
  reason?: string
  confidence?: string
  confidenceLevel?: string
  resultSource?: string
  trustStatus?: string
  fallback?: boolean
  degraded?: boolean
  mock?: boolean
  fallbackReason?: string
  sampleInsufficient?: boolean
  sampleWarning?: string
  unsupportedConclusions?: string[]
  weakObservations?: string[]
  qualityGate?: Record<string, unknown>
  why?: string | string[]
  evidenceSources?: PanelEvidenceSource[]
  evidences?: PanelEvidenceSource[]
  nextActions?: PanelAction[]
  nextAction?: PanelAction
  pagePath?: string
  trace?: {
    aiCallLogId?: number
    traceId?: string
    agentRunId?: number
    promptVersionId?: number
    asyncTaskId?: number
  }
}

const props = withDefaults(defineProps<{
  evidence?: AgentTaskEvidenceInfo
  suggestion?: Record<string, unknown> | ExplainableSuggestionVO
  open?: boolean
  feedbackRecorded?: boolean
}>(), {
  open: undefined,
  feedbackRecorded: false
})

const emit = defineEmits<{
  open: [path: string]
  'update:open': [value: boolean]
}>()

const innerOpen = ref(false)
const localFeedbackRecorded = ref(false)
const isOpen = computed({
  get: () => props.open ?? innerOpen.value,
  set: (value: boolean) => {
    if (props.open === undefined) {
      innerOpen.value = value
    }
    emit('update:open', value)
  }
})

const fallbackEvidence: AgentTaskEvidenceInfo = {
  sourceLabel: '智能教练',
  skillLabel: '未绑定具体技能',
  bizLabel: '今日任务',
  reason: 'Agent 根据当前求职准备上下文生成了这项任务。',
  safePath: '',
  actionLabel: '查看任务'
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {}

const asString = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined

const asNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return numeric
  }
  return undefined
}

const toLegacySuggestion = (evidence: AgentTaskEvidenceInfo): PanelSuggestion => ({
  id: `agent-task-evidence:${evidence.safePath || evidence.sourceLabel}`,
  scene: 'AGENT_TASK_RECOMMENDATION',
  bizType: 'AGENT_TASK',
  title: evidence.actionLabel || 'AI 建议',
  content: evidence.reason,
  reason: evidence.reason,
  confidenceLevel: evidence.unavailableReason ? 'LOW' : 'MEDIUM',
  resultSource: evidence.unavailableReason ? 'FALLBACK' : 'LLM',
  fallback: Boolean(evidence.unavailableReason),
  fallbackReason: evidence.unavailableReason,
  evidenceSources: [
    {
      id: evidence.safePath || evidence.sourceLabel,
      title: evidence.sourceLabel,
      sourceLabel: evidence.sourceLabel,
      sourceType: evidence.bizLabel,
      summary: evidence.skillLabel
    }
  ],
  nextActions: evidence.safePath
    ? [{ key: 'legacy-agent-task-action', label: evidence.actionLabel || '查看任务', path: evidence.safePath }]
    : []
})

const normalizePanelSuggestion = (suggestion: Record<string, unknown>): PanelSuggestion => {
  const fallback = Boolean(suggestion.fallback || String(suggestion.resultSource || '').toUpperCase() === 'FALLBACK')
  const nextAction = asRecord(suggestion.nextAction)
  const nextActionUrl = asString(nextAction.actionUrl)
  const nextActions = Array.isArray(suggestion.nextActions)
    ? suggestion.nextActions as PanelAction[]
    : nextActionUrl
      ? [{ key: `${String(suggestion.id || 'suggestion')}:action`, label: asString(nextAction.label) || '打开任务入口', path: nextActionUrl }]
      : []
  const trace = asRecord(suggestion.trace)
  const scene = asString(suggestion.scene)

  return {
    id: String(suggestion.id || 'agent-task-evidence'),
    schemaVersion: asString(suggestion.schemaVersion),
    scene: scene === 'AGENT_TASK' ? 'AGENT_TASK_RECOMMENDATION' : scene,
    bizType: asString(suggestion.bizType),
    bizId: asNumber(suggestion.bizId),
    title: asString(suggestion.title),
    content: asString(suggestion.content),
    reason: asString(suggestion.reason),
    confidence: asString(suggestion.confidence) || asString(suggestion.confidenceLevel),
    confidenceLevel: asString(suggestion.confidenceLevel),
    resultSource: asString(suggestion.resultSource),
    trustStatus: asString(suggestion.trustStatus),
    fallback,
    degraded: Boolean(suggestion.degraded),
    mock: Boolean(suggestion.mock),
    fallbackReason: asString(suggestion.fallbackReason) || (fallback ? '推荐依据不足，已使用降级建议。' : undefined),
    sampleInsufficient: Boolean(suggestion.sampleInsufficient),
    sampleWarning: asString(suggestion.sampleWarning),
    unsupportedConclusions: Array.isArray(suggestion.unsupportedConclusions)
      ? suggestion.unsupportedConclusions.filter(Boolean).map(String)
      : undefined,
    weakObservations: Array.isArray(suggestion.weakObservations)
      ? suggestion.weakObservations.filter(Boolean).map(String)
      : undefined,
    qualityGate: asRecord(suggestion.qualityGate),
    why: Array.isArray(suggestion.why) ? suggestion.why.filter(Boolean).map(String) : asString(suggestion.why) || asString(suggestion.reason),
    evidenceSources: Array.isArray(suggestion.evidenceSources) ? suggestion.evidenceSources as PanelEvidenceSource[] : undefined,
    evidences: Array.isArray(suggestion.evidences) ? suggestion.evidences as PanelEvidenceSource[] : undefined,
    nextActions,
    nextAction: Object.keys(nextAction).length ? nextAction as unknown as PanelAction : undefined,
    pagePath: asString(suggestion.pagePath),
    trace: {
      agentRunId: asNumber(trace.agentRunId),
      aiCallLogId: asNumber(trace.aiCallLogId),
      traceId: asString(trace.traceId),
      promptVersionId: asNumber(trace.promptVersionId),
      asyncTaskId: asNumber(trace.asyncTaskId)
    }
  }
}

const panelSuggestion = computed(() =>
  props.suggestion ? normalizePanelSuggestion(props.suggestion as unknown as Record<string, unknown>) : toLegacySuggestion(props.evidence || fallbackEvidence)
)

const handleOpenAction = (action: { path?: string; actionUrl?: string; disabled?: boolean }) => {
  if (action.disabled) return
  const path = action.path || action.actionUrl
  if (path) emit('open', path)
}

const handleFeedbackSubmitted = () => {
  localFeedbackRecorded.value = true
}
</script>

<style scoped lang="scss">
.agent-task-evidence {
  margin-top: 12px;
}

.agent-task-evidence__feedback-tag {
  display: inline-flex;
  width: fit-content;
  margin-top: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.14);
  color: #86efac;
  font-size: 12px;
  line-height: 1.5;
}
</style>
