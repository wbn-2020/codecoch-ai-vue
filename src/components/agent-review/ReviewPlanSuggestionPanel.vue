<template>
  <section class="review-plan-panel" aria-label="复盘计划建议">
    <div class="review-plan-panel__head">
      <div>
        <h3>复盘建议</h3>
        <p>采纳只记录你的选择，尚未影响计划。只有确认差异预览后才会写入。</p>
      </div>
      <div class="review-plan-panel__summary">
        <el-tag size="small" effect="plain">待决定 {{ summary.pendingCount || 0 }}</el-tag>
        <el-tag size="small" type="success" effect="plain">已采纳 {{ summary.acceptedCount || 0 }}</el-tag>
        <el-tag size="small" type="info" effect="plain">已忽略 {{ summary.ignoredCount || 0 }}</el-tag>
      </div>
    </div>

    <el-alert
      v-if="weakAdjustment"
      class="review-plan-panel__weak-alert"
      type="warning"
      show-icon
      :closable="false"
      title="弱调整，需人工复核"
      description="当前建议来自低置信度、证据不足或规则降级结果。预览仍需人工检查，且不会在采纳时自动修改计划。"
    />

    <div v-if="pendingActionableSuggestions.length" class="review-plan-panel__batch">
      <el-checkbox
        :model-value="allPendingSelected"
        :indeterminate="somePendingSelected"
        :disabled="submitting"
        @change="toggleAllPending(Boolean($event))"
      >
        选择待决定建议
      </el-checkbox>
      <div>
        <el-button
          size="small"
          :icon="CheckCheck"
          :disabled="!selectedPendingIds.length || submitting"
          :loading="submitting"
          @click="submitBatch('ACCEPTED')"
        >
          批量采纳
        </el-button>
        <el-button
          size="small"
          :icon="EyeOff"
          :disabled="!selectedPendingIds.length || submitting"
          @click="submitBatch('IGNORED')"
        >
          批量忽略
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="review-plan-panel__list">
      <article
        v-for="suggestion in suggestions"
        :key="suggestion.id"
        class="review-plan-suggestion"
        :class="{
          'is-accepted': decisionStatus(suggestion) === 'ACCEPTED',
          'is-ignored': decisionStatus(suggestion) === 'IGNORED',
          'is-disabled': suggestion.actionable === false || decisionStatus(suggestion) === 'SUPERSEDED'
        }"
      >
        <el-checkbox
          v-if="decisionStatus(suggestion) === 'PENDING' && suggestion.actionable !== false"
          class="review-plan-suggestion__selector"
          :model-value="selectedPendingIds.includes(suggestion.id)"
          :disabled="submitting"
          :aria-label="`选择建议：${suggestion.title || '复盘建议'}`"
          @change="toggleSelection(suggestion.id, Boolean($event))"
        />

        <div class="review-plan-suggestion__body">
          <div class="review-plan-suggestion__title-row">
            <div>
              <h4>{{ suggestion.title || '复盘计划建议' }}</h4>
              <div class="review-plan-suggestion__tags">
                <el-tag size="small" :type="decisionTagType(suggestion)" effect="plain">
                  {{ decisionLabel(suggestion) }}
                </el-tag>
                <el-tag size="small" effect="plain">
                  {{ confidenceLabel(suggestion.confidenceLevel) }}
                </el-tag>
                <el-tag v-if="suggestion.fallback" size="small" type="warning" effect="plain">规则降级</el-tag>
                <el-tag v-if="suggestion.previouslyIgnored" size="small" type="info" effect="plain">此前已忽略</el-tag>
                <el-tag v-if="suggestion.actionable === false" size="small" type="info" effect="plain">仅供参考</el-tag>
              </div>
            </div>

            <div class="review-plan-suggestion__actions">
              <template v-if="decisionStatus(suggestion) === 'PENDING' && suggestion.actionable !== false">
                <el-button
                  size="small"
                  type="primary"
                  plain
                  :icon="Check"
                  :disabled="submitting"
                  :loading="submitting"
                  @click="submitSingle(suggestion, 'ACCEPTED')"
                >
                  采纳
                </el-button>
                <el-button
                  size="small"
                  :icon="EyeOff"
                  :disabled="submitting"
                  @click="submitSingle(suggestion, 'IGNORED')"
                >
                  忽略
                </el-button>
              </template>
              <el-button
                v-else-if="['ACCEPTED', 'IGNORED'].includes(decisionStatus(suggestion))"
                size="small"
                text
                :icon="RotateCcw"
                :disabled="submitting"
                @click="submitSingle(suggestion, 'PENDING')"
              >
                重新考虑
              </el-button>
            </div>
          </div>

          <template v-if="decisionStatus(suggestion) !== 'IGNORED'">
            <p v-if="suggestion.content" class="review-plan-suggestion__content">{{ suggestion.content }}</p>
            <dl class="review-plan-suggestion__details">
              <div v-if="suggestion.reason">
                <dt>理由</dt>
                <dd>{{ suggestion.reason }}</dd>
              </div>
              <div v-if="suggestion.targetScope || suggestion.intentType">
                <dt>范围</dt>
                <dd>{{ targetScopeLabel(suggestion.targetScope) }} · {{ intentLabel(suggestion.intentType) }}</dd>
              </div>
            </dl>
          </template>

          <p v-if="decisionStatus(suggestion) === 'ACCEPTED'" class="review-plan-suggestion__notice is-accepted">
            已采纳，尚未影响计划。
          </p>
          <p v-else-if="decisionStatus(suggestion) === 'IGNORED'" class="review-plan-suggestion__notice">
            已忽略，未影响计划。需要时可重新考虑。
          </p>
          <p v-else-if="suggestion.actionable === false" class="review-plan-suggestion__notice">
            该建议无法安全映射为计划操作，仅供人工参考。
          </p>
        </div>
      </article>

      <div v-if="!suggestions.length && !loading" class="review-plan-panel__empty">
        当前复盘没有可决策的结构化计划建议。
      </div>
    </div>

    <div v-if="acceptedSuggestionIds.length" class="review-plan-panel__preview">
      <div>
        <strong>已采纳 {{ acceptedSuggestionIds.length }} 条建议</strong>
        <span>这些选择尚未影响计划。先生成只读差异，再决定是否确认写入。</span>
      </div>
      <div class="review-plan-panel__preview-controls">
        <label>
          <span>目标日期</span>
          <el-date-picker
            v-model="targetDate"
            type="date"
            value-format="YYYY-MM-DD"
            :clearable="false"
            :disabled="previewing"
          />
        </label>
        <label>
          <span>时间预算</span>
          <el-input-number
            v-model="maxTotalMinutes"
            :min="15"
            :max="480"
            :step="15"
            controls-position="right"
            :disabled="previewing"
          />
        </label>
        <el-button
          type="primary"
          :icon="ScanSearch"
          :loading="previewing"
          :disabled="!targetDate || previewing"
          data-testid="preview-plan-change"
          @click="requestPreview"
        >
          预览计划变化
        </el-button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Check, CheckCheck, EyeOff, RotateCcw, ScanSearch } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import {
  getAcceptedAgentReviewPlanSuggestionIds,
  getAgentPlanConfidenceLabel,
  getCurrentAgentReviewPlanSuggestions,
  getDefaultAgentPlanChangeTargetDate,
  hasWeakAgentPlanSuggestions,
  summarizeAgentReviewPlanSuggestions
} from '@/features/agent-plan-change'
import type {
  AgentPlanChangePreviewCommand,
  AgentReviewPlanDecision,
  AgentReviewPlanDecisionCommand,
  AgentReviewPlanSuggestionListVO,
  AgentReviewPlanSuggestionVO
} from '@/types/agentPlanChange'

const props = withDefaults(defineProps<{
  data?: AgentReviewPlanSuggestionListVO | null
  loading?: boolean
  submitting?: boolean
  previewing?: boolean
}>(), {
  data: null,
  loading: false,
  submitting: false,
  previewing: false
})

const emit = defineEmits<{
  decide: [commands: AgentReviewPlanDecisionCommand[]]
  preview: [command: AgentPlanChangePreviewCommand]
}>()

const selectedPendingIds = ref<number[]>([])
const targetDate = ref('')
const maxTotalMinutes = ref(120)

const suggestions = computed(() => getCurrentAgentReviewPlanSuggestions(props.data))
const pendingActionableSuggestions = computed(() =>
  suggestions.value.filter((item) =>
    decisionStatus(item) === 'PENDING'
    && item.actionable !== false
  )
)
const acceptedSuggestionIds = computed(() => getAcceptedAgentReviewPlanSuggestionIds(props.data))
const weakAdjustment = computed(() => hasWeakAgentPlanSuggestions(props.data))
const summary = computed(() =>
  props.data?.decisionSummary || summarizeAgentReviewPlanSuggestions(suggestions.value)
)
const allPendingSelected = computed(() =>
  Boolean(pendingActionableSuggestions.value.length)
  && pendingActionableSuggestions.value.every((item) => selectedPendingIds.value.includes(item.id))
)
const somePendingSelected = computed(() =>
  selectedPendingIds.value.length > 0 && !allPendingSelected.value
)

watch(
  () => props.data?.reviewDate,
  (reviewDate) => {
    targetDate.value = getDefaultAgentPlanChangeTargetDate(reviewDate)
  },
  { immediate: true }
)

watch(
  pendingActionableSuggestions,
  (items) => {
    const available = new Set(items.map((item) => item.id))
    selectedPendingIds.value = selectedPendingIds.value.filter((id) => available.has(id))
  }
)

function decisionStatus(suggestion: AgentReviewPlanSuggestionVO) {
  return String(suggestion.decisionStatus || 'PENDING').toUpperCase()
}

const decisionLabel = (suggestion: AgentReviewPlanSuggestionVO) => ({
  PENDING: '待决定',
  ACCEPTED: '已采纳',
  IGNORED: '已忽略',
  SUPERSEDED: '旧版本'
}[decisionStatus(suggestion)] || '待确认')

const decisionTagType = (suggestion: AgentReviewPlanSuggestionVO) => ({
  ACCEPTED: 'success',
  IGNORED: 'info',
  SUPERSEDED: 'warning'
}[decisionStatus(suggestion)] || 'info') as 'success' | 'info' | 'warning'

const confidenceLabel = (value?: string) => getAgentPlanConfidenceLabel(value)

const targetScopeLabel = (value?: string) => ({
  NEXT_DAY: '下一日',
  REMAINING_WEEK: '本周剩余时间'
}[String(value || '').toUpperCase()] || '计划范围待确认')

const intentLabel = (value?: string) => ({
  REDUCE_LOAD: '降低负荷',
  CARRY_OVER: '保留未完成任务',
  ADD_PRACTICE: '增加练习',
  RESCHEDULE: '调整日期',
  CHANGE_PRIORITY: '调整优先级',
  MANUAL_ONLY: '人工参考'
}[String(value || '').toUpperCase()] || '计划调整')

const toggleSelection = (id: number, checked: boolean) => {
  const next = new Set(selectedPendingIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedPendingIds.value = Array.from(next)
}

const toggleAllPending = (checked: boolean) => {
  selectedPendingIds.value = checked
    ? pendingActionableSuggestions.value.map((item) => item.id)
    : []
}

const submitSingle = (
  suggestion: AgentReviewPlanSuggestionVO,
  decision: AgentReviewPlanDecision
) => {
  emit('decide', [{ suggestion, decision }])
}

const submitBatch = (decision: AgentReviewPlanDecision) => {
  const selected = new Set(selectedPendingIds.value)
  const commands = pendingActionableSuggestions.value
    .filter((suggestion) => selected.has(suggestion.id))
    .map((suggestion) => ({ suggestion, decision }))
  if (commands.length) emit('decide', commands)
}

const requestPreview = () => {
  if (!targetDate.value || !acceptedSuggestionIds.value.length) return
  emit('preview', {
    acceptedSuggestionIds: acceptedSuggestionIds.value,
    targetDate: targetDate.value,
    maxTotalMinutes: Math.min(480, Math.max(15, Number(maxTotalMinutes.value) || 120))
  })
}
</script>

<style scoped lang="scss">
.review-plan-panel {
  display: grid;
  gap: 12px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--app-border);
}

.review-plan-panel__head,
.review-plan-panel__batch,
.review-plan-suggestion__title-row,
.review-plan-panel__preview,
.review-plan-panel__preview-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.review-plan-panel__head {
  align-items: flex-start;
}

.review-plan-panel__head h3,
.review-plan-suggestion h4 {
  margin: 0;
  color: var(--app-text);
  letter-spacing: 0;
}

.review-plan-panel__head h3 {
  font-size: 15px;
}

.review-plan-panel__head p,
.review-plan-suggestion__content,
.review-plan-panel__preview span {
  color: var(--app-text-muted);
  line-height: 1.6;
}

.review-plan-panel__head p {
  max-width: 68ch;
  margin: 5px 0 0;
  font-size: 12px;
}

.review-plan-panel__summary,
.review-plan-suggestion__tags,
.review-plan-suggestion__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.review-plan-panel__batch {
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.24);
}

.review-plan-panel__list {
  display: grid;
  gap: 10px;
  min-height: 44px;
}

.review-plan-suggestion {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.24);
}

.review-plan-suggestion.is-accepted {
  border-color: rgba(34, 197, 94, 0.42);
  background: rgba(22, 101, 52, 0.12);
}

.review-plan-suggestion.is-ignored,
.review-plan-suggestion.is-disabled {
  background: rgba(15, 23, 42, 0.26);
}

.review-plan-suggestion__selector {
  margin-top: 3px;
}

.review-plan-suggestion__body {
  min-width: 0;
}

.review-plan-suggestion__title-row {
  align-items: flex-start;
}

.review-plan-suggestion h4 {
  font-size: 14px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.review-plan-suggestion__tags {
  margin-top: 7px;
}

.review-plan-suggestion__content {
  margin: 10px 0 0;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.review-plan-suggestion__details {
  display: grid;
  gap: 6px;
  margin: 9px 0 0;
}

.review-plan-suggestion__details div {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 8px;
}

.review-plan-suggestion__details dt,
.review-plan-suggestion__details dd {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
}

.review-plan-suggestion__details dt {
  color: var(--app-text-muted);
  font-weight: 700;
}

.review-plan-suggestion__details dd {
  color: var(--app-text);
  overflow-wrap: anywhere;
}

.review-plan-suggestion__notice {
  margin: 9px 0 0;
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.review-plan-suggestion__notice.is-accepted {
  color: #4ade80;
}

.review-plan-panel__empty {
  padding: 14px;
  color: var(--app-text-muted);
  text-align: center;
  font-size: 13px;
}

.review-plan-panel__preview {
  align-items: flex-end;
  padding: 12px;
  border: 1px solid rgba(37, 99, 235, 0.42);
  border-radius: 8px;
  background: rgba(30, 64, 175, 0.12);
}

.review-plan-panel__preview strong,
.review-plan-panel__preview span {
  display: block;
}

.review-plan-panel__preview strong {
  color: var(--app-text);
  font-size: 13px;
}

.review-plan-panel__preview span {
  margin-top: 4px;
  font-size: 12px;
}

.review-plan-panel__preview-controls {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.review-plan-panel__preview-controls label {
  display: grid;
  gap: 5px;
}

.review-plan-panel__preview-controls label > span {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 11px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .review-plan-panel__head,
  .review-plan-panel__preview,
  .review-plan-suggestion__title-row {
    align-items: stretch;
    flex-direction: column;
  }

  .review-plan-panel__preview-controls {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .review-plan-panel__batch {
    align-items: flex-start;
    flex-direction: column;
  }

  .review-plan-panel__preview-controls,
  .review-plan-panel__preview-controls label,
  .review-plan-panel__preview-controls :deep(.el-date-editor),
  .review-plan-panel__preview-controls :deep(.el-input-number),
  .review-plan-panel__preview-controls :deep(.el-button) {
    width: 100%;
  }
}
</style>
