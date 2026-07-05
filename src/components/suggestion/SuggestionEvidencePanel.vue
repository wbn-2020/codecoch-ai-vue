<template>
  <section class="suggestion-evidence-panel" :class="{ 'suggestion-evidence-panel--compact': compact }">
    <header class="suggestion-evidence-panel__header">
      <div class="suggestion-evidence-panel__title-group">
        <h3>{{ suggestion.title || 'AI 建议' }}</h3>
        <p v-if="suggestion.content">{{ suggestion.content }}</p>
      </div>

      <div class="suggestion-evidence-panel__meta">
        <el-tag :type="confidenceTagType" effect="plain">{{ confidenceLabel }}</el-tag>
        <el-tag v-for="status in statusTags" :key="status.label" :type="status.type" effect="plain">
          {{ status.label }}
        </el-tag>
      </div>
    </header>

    <el-alert
      v-if="sampleWarning"
      class="suggestion-evidence-panel__alert"
      type="warning"
      :closable="false"
      show-icon
      :title="sampleWarning"
    />

    <el-alert
      v-if="statusReason"
      class="suggestion-evidence-panel__alert"
      type="info"
      :closable="false"
      show-icon
      :title="statusReason"
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
                {{ evidence.title || evidence.sourceLabel || evidence.label || `证据 ${index + 1}` }}
              </span>
              <small v-if="evidence.summary || evidence.evidenceSummary || evidence.sourceSummary || evidence.sourceType">
                {{ evidence.summary || evidence.evidenceSummary || evidence.sourceSummary || evidence.sourceType }}
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
            :disabled="action.disabled"
            @click="emit('open-action', action)"
          >
            <span>{{ actionLabel(action) }}</span>
            <ExternalLink :size="14" />
          </el-button>
        </div>
      </div>

      <div v-if="showTrace && traceLabel" class="suggestion-evidence-panel__trace">
        Trace: {{ traceLabel }}
      </div>
    </div>

    <footer v-if="showFeedback && suggestion.scene" class="suggestion-evidence-panel__footer">
      <AiResultFeedback
        :scene="suggestion.scene"
        :biz-type="suggestion.bizType"
        :biz-id="feedbackBizId"
        :ai-call-log-id="feedbackAiCallLogId"
        :page-path="suggestion.pagePath"
        :compact="compact"
        @submitted="emit('feedback-submitted')"
      />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { ChevronDown, ExternalLink, FileText, ShieldCheck } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import AiResultFeedback from '@/components/feedback/AiResultFeedback.vue'

type SuggestionConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | string

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
  why?: string | string[]
  reasons?: string[]
  reason?: string
  evidenceSources?: SuggestionEvidenceSource[]
  evidences?: SuggestionEvidenceSource[]
  nextActions?: SuggestionAction[]
  nextAction?: SuggestionAction
  actions?: SuggestionAction[]
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
  ...(isMock.value ? [{ label: 'Mock', type: 'info' as const }] : []),
  ...(isFallback.value ? [{ label: 'Fallback', type: 'warning' as const }] : [])
])

const sampleWarning = computed(() => {
  if (props.suggestion.sampleWarning) return props.suggestion.sampleWarning
  return props.suggestion.sampleInsufficient ? '样本不足，不能作为强结论' : ''
})

const statusReason = computed(() =>
  props.suggestion.degradedReason || props.suggestion.mockReason || props.suggestion.fallbackReason || ''
)

const reasonItems = computed(() => {
  const why = props.suggestion.why
  if (Array.isArray(why)) return why.filter(Boolean)
  if (why) return [why]
  if (props.suggestion.reasons?.length) return props.suggestion.reasons.filter(Boolean)
  if (props.suggestion.reason) return [props.suggestion.reason]
  return ['该建议基于可展示的摘要证据、置信度和当前状态生成。']
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
  props.suggestion.trace?.traceId || String(props.suggestion.trace?.aiCallLogId || '')
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
    FALLBACK: '来源降级',
    DISABLED: '来源已停用',
    STALE: '来源可能过期'
  }
  return labelMap[normalized] || normalized
}

const actionLabel = (action: SuggestionAction) =>
  action.label || action.actionType || '查看下一步'

const actionKey = (action: SuggestionAction) =>
  action.key || action.actionUrl || action.path || action.actionType || actionLabel(action)

const toggleOpen = () => {
  isOpen.value = !isOpen.value
}
</script>

<style scoped lang="scss">
.suggestion-evidence-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.28);
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
  border-top: 1px solid rgba(148, 163, 184, 0.14);
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
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.2);
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
