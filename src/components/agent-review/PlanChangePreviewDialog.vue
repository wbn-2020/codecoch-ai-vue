<template>
  <el-dialog
    :model-value="modelValue"
    class="plan-change-preview-dialog"
    width="min(960px, 94vw)"
    destroy-on-close
    :close-on-click-modal="!confirming"
    :close-on-press-escape="!confirming"
    :show-close="!confirming"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="plan-change-preview-dialog__header">
        <div>
          <h2>计划差异预览</h2>
          <p>{{ preview?.targetDate || '目标日期待确认' }} · 仅确认成功后才会写入计划</p>
        </div>
        <el-tag :type="statusPresentation.type" effect="plain">
          {{ statusPresentation.label }}
        </el-tag>
      </div>
    </template>

    <div v-if="preview" class="plan-change-preview" v-loading="loading">
      <el-alert
        class="plan-change-preview__state"
        :type="stateAlertType"
        show-icon
        :closable="false"
        :title="stateTitle"
        :description="stateDescription"
      />

      <el-alert
        v-if="weakAdjustment"
        type="warning"
        show-icon
        :closable="false"
        title="弱调整，需人工复核"
        description="本次预览包含低置信度、证据不足或规则降级结果。请逐项核对差异和限制，预览本身尚未修改计划。"
      />

      <el-alert
        v-if="expired"
        type="warning"
        show-icon
        :closable="false"
        title="预览已过期"
        description="计划或复盘基线可能已经变化，请重新生成预览后再确认。"
      />

      <el-alert
        v-if="blockers.length"
        type="error"
        show-icon
        :closable="false"
        title="存在阻断，不能确认写入计划"
        :description="blockers.join(' ')"
      />

      <section class="plan-change-preview__summary" aria-label="变更摘要">
        <div class="plan-change-preview__section-head">
          <div>
            <h3>变更摘要</h3>
            <p>任务数量与预计时长的前后对比。</p>
          </div>
          <span v-if="preview.expiresAt">有效至 {{ formatDateTime(preview.expiresAt) }}</span>
        </div>
        <div class="plan-change-preview__metrics">
          <article>
            <span>任务数</span>
            <strong>{{ summary.beforeTaskCount || 0 }} → {{ summary.afterTaskCount || 0 }}</strong>
            <small>{{ signedDelta((summary.afterTaskCount || 0) - (summary.beforeTaskCount || 0), ' 项') }}</small>
          </article>
          <article>
            <span>预计时长</span>
            <strong>{{ summary.beforeMinutes || 0 }} → {{ summary.afterMinutes || 0 }} 分钟</strong>
            <small>{{ signedDelta((summary.afterMinutes || 0) - (summary.beforeMinutes || 0), ' 分钟') }}</small>
          </article>
          <article>
            <span>新增 / 移除</span>
            <strong>{{ summary.addCount || 0 }} / {{ summary.removeCount || 0 }}</strong>
            <small>含保留到下一日的承接任务</small>
          </article>
          <article>
            <span>延后 / 优先级</span>
            <strong>{{ summary.rescheduleCount || 0 }} / {{ summary.priorityChangeCount || 0 }}</strong>
            <small>逐项查看前后值</small>
          </article>
        </div>
      </section>

      <section class="plan-change-preview__diff" aria-label="计划差异">
        <div class="plan-change-preview__section-head">
          <div>
            <h3>日计划差异</h3>
            <p>新增、移除、延后和优先级变化均来自本次持久化预览。</p>
          </div>
        </div>

        <div class="plan-change-preview__groups">
          <section
            v-for="group in groups"
            :key="group.key"
            class="plan-change-preview__group"
            :class="{ 'is-empty': !group.items.length }"
          >
            <div class="plan-change-preview__group-head">
              <div>
                <h4>{{ group.title }}</h4>
                <p>{{ group.description }}</p>
              </div>
              <el-tag size="small" effect="plain">{{ group.items.length }}</el-tag>
            </div>

            <div v-if="group.items.length" class="plan-change-preview__items">
              <article v-for="item in group.items" :key="item.id" class="plan-change-preview__item">
                <div class="plan-change-preview__item-head">
                  <div>
                    <h5>{{ item.title || '计划变更' }}</h5>
                    <div class="plan-change-preview__item-tags">
                      <el-tag size="small" effect="plain">{{ changeTypeLabel(item.changeType) }}</el-tag>
                      <el-tag size="small" effect="plain">{{ confidenceLabel(item.confidenceLevel) }}</el-tag>
                      <el-tag v-if="item.validationStatus === 'WARN'" size="small" type="warning" effect="plain">需确认</el-tag>
                      <el-tag v-if="item.fallback" size="small" type="warning" effect="plain">规则降级</el-tag>
                      <el-tag v-if="item.applyStatus === 'SKIPPED_DUPLICATE'" size="small" type="info" effect="plain">重复项已合并</el-tag>
                    </div>
                  </div>
                  <span>{{ sourceSuggestionTitle(item.sourceSuggestionId) }}</span>
                </div>

                <div class="plan-change-preview__values">
                  <div>
                    <span>变更前</span>
                    <dl>
                      <div>
                        <dt>标题</dt>
                        <dd>{{ snapshotValue(item.before, 'title') }}</dd>
                      </div>
                      <div>
                        <dt>日期</dt>
                        <dd :class="{ 'is-changed': valueChanged(item, 'dueDate') }">{{ snapshotValue(item.before, 'dueDate') }}</dd>
                      </div>
                      <div>
                        <dt>优先级</dt>
                        <dd :class="{ 'is-changed': valueChanged(item, 'priority') }">{{ snapshotValue(item.before, 'priority') }}</dd>
                      </div>
                      <div>
                        <dt>状态</dt>
                        <dd :class="{ 'is-changed': valueChanged(item, 'status') }">{{ snapshotValue(item.before, 'status') }}</dd>
                      </div>
                      <div>
                        <dt>时长</dt>
                        <dd :class="{ 'is-changed': valueChanged(item, 'estimatedMinutes') }">{{ snapshotValue(item.before, 'estimatedMinutes') }}</dd>
                      </div>
                    </dl>
                  </div>

                  <ArrowRight class="plan-change-preview__arrow" :size="18" aria-hidden="true" />

                  <div>
                    <span>变更后</span>
                    <dl>
                      <div>
                        <dt>标题</dt>
                        <dd>{{ snapshotValue(item.after, 'title') }}</dd>
                      </div>
                      <div>
                        <dt>日期</dt>
                        <dd :class="{ 'is-changed': valueChanged(item, 'dueDate') }">{{ snapshotValue(item.after, 'dueDate') }}</dd>
                      </div>
                      <div>
                        <dt>优先级</dt>
                        <dd :class="{ 'is-changed': valueChanged(item, 'priority') }">{{ snapshotValue(item.after, 'priority') }}</dd>
                      </div>
                      <div>
                        <dt>状态</dt>
                        <dd :class="{ 'is-changed': valueChanged(item, 'status') }">{{ snapshotValue(item.after, 'status') }}</dd>
                      </div>
                      <div>
                        <dt>时长</dt>
                        <dd :class="{ 'is-changed': valueChanged(item, 'estimatedMinutes') }">{{ snapshotValue(item.after, 'estimatedMinutes') }}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div class="plan-change-preview__impact">
                  <p><strong>日计划：</strong>{{ item.dailyImpact || '日计划影响待确认' }}</p>
                  <p><strong>周计划：</strong>{{ item.weekImpact || '周计划影响待确认' }}</p>
                </div>

                <div v-if="item.warnings?.length" class="plan-change-preview__item-warnings">
                  <span v-for="warning in item.warnings" :key="warning">
                    {{ warningLabel(warning) }}
                  </span>
                </div>
              </article>
            </div>
            <p v-else class="plan-change-preview__empty-group">本次没有{{ group.title }}差异。</p>
          </section>
        </div>
      </section>

      <section class="plan-change-preview__source" aria-label="来源与证据">
        <div class="plan-change-preview__section-head">
          <div>
            <h3>来源与限制</h3>
            <p>确认时只会执行这里展示并由预览哈希锁定的操作。</p>
          </div>
        </div>
        <dl>
          <div>
            <dt>来源复盘</dt>
            <dd>{{ sourceReviewDate || '日期待确认' }}</dd>
          </div>
          <div>
            <dt>结果来源</dt>
            <dd>{{ resultSourceLabel }}</dd>
          </div>
          <div>
            <dt>复盘版本</dt>
            <dd>v{{ preview.reviewVersion || 1 }}</dd>
          </div>
          <div>
            <dt>预览版本</dt>
            <dd>v{{ preview.previewVersion || 1 }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="warningCodes.length" class="plan-change-preview__warnings" aria-label="警告确认">
        <div class="plan-change-preview__section-head">
          <div>
            <h3>警告确认</h3>
            <p>全部警告确认后，“确认写入计划”才会启用。</p>
          </div>
          <span>{{ acknowledgedWarningCodes.length }} / {{ warningCodes.length }}</span>
        </div>
        <div class="plan-change-preview__warning-list">
          <el-checkbox
            v-for="warning in warningCodes"
            :key="warning"
            :model-value="acknowledgedWarningCodes.includes(warning)"
            :disabled="confirming || status !== 'PREVIEW_READY'"
            @change="toggleWarning(warning, Boolean($event))"
          >
            <span>{{ warningLabel(warning) }}</span>
            <small>{{ warning }}</small>
          </el-checkbox>
        </div>
      </section>
    </div>

    <div v-else class="plan-change-preview__empty">
      暂无可展示的计划差异预览。
    </div>

    <template #footer>
      <div class="plan-change-preview-dialog__footer">
        <el-button :disabled="confirming" @click="$emit('back')">返回修改选择</el-button>
        <el-button
          :icon="RefreshCw"
          :loading="loading"
          :disabled="confirming"
          @click="$emit('refresh')"
        >
          {{ refreshButtonLabel }}
        </el-button>
        <el-button
          v-if="status === 'PREVIEW_READY'"
          type="primary"
          :icon="FileCheck2"
          :loading="confirming"
          :disabled="confirmDisabled"
          data-testid="confirm-plan-change"
          @click="$emit('confirm', [...acknowledgedWarningCodes])"
        >
          确认写入计划
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ArrowRight, FileCheck2, RefreshCw } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import {
  canConfirmAgentPlanChange,
  getAgentPlanChangeStatusPresentation,
  getAgentPlanChangeTypeLabel,
  getAgentPlanChangeWarningCodes,
  getAgentPlanChangeWarningLabel,
  getAgentPlanConfidenceLabel,
  groupAgentPlanChangeItems,
  isAgentPlanChangePreviewExpired,
  isWeakAgentPlanChangePreview
} from '@/features/agent-plan-change'
import type {
  AgentPlanChangeItemVO,
  AgentPlanChangePreviewVO,
  AgentPlanTaskSnapshotDTO,
  AgentReviewPlanSuggestionVO
} from '@/types/agentPlanChange'
import { formatDateTime } from '@/utils/format'

const props = withDefaults(defineProps<{
  modelValue: boolean
  preview?: AgentPlanChangePreviewVO | null
  suggestions?: AgentReviewPlanSuggestionVO[]
  sourceReviewDate?: string
  loading?: boolean
  confirming?: boolean
}>(), {
  preview: null,
  suggestions: () => [],
  sourceReviewDate: '',
  loading: false,
  confirming: false
})

defineEmits<{
  'update:modelValue': [visible: boolean]
  back: []
  refresh: []
  confirm: [acknowledgedWarningCodes: string[]]
}>()

const acknowledgedWarningCodes = ref<string[]>([])
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined

const status = computed(() => String(props.preview?.status || '').toUpperCase())
const summary = computed(() => props.preview?.summary || {})
const groups = computed(() => groupAgentPlanChangeItems(props.preview?.items))
const warningCodes = computed(() => getAgentPlanChangeWarningCodes(props.preview))
const blockers = computed(() => props.preview?.blockers || [])
const expired = computed(() => isAgentPlanChangePreviewExpired(props.preview, now.value))
const weakAdjustment = computed(() => isWeakAgentPlanChangePreview(props.preview))
const statusPresentation = computed(() => getAgentPlanChangeStatusPresentation(status.value))
const confirmDisabled = computed(() =>
  props.confirming
  || props.loading
  || !canConfirmAgentPlanChange(props.preview, acknowledgedWarningCodes.value, now.value)
)
const refreshButtonLabel = computed(() =>
  ['PREVIEW_READY', 'STALE'].includes(status.value) ? '重新生成预览' : '刷新状态'
)

const stateTitle = computed(() => ({
  PREVIEW_READY: '只读预览，尚未修改任何计划',
  STALE: '计划基线已变化',
  CONFIRMED_WAITING_PLAN: '调整已确认，等待目标日计划生成',
  APPLYING: '确认请求正在写入计划',
  APPLIED: '本次复盘调整已应用',
  PARTIALLY_APPLIED: '本次调整仅部分应用',
  APPLY_FAILED: '已确认调整应用失败'
}[status.value] || '计划变更状态待确认'))

const stateDescription = computed(() => {
  if (status.value === 'PREVIEW_READY') {
    return '采纳和预览都不会修改计划。请核对全部差异、警告和阻断后，再决定是否确认写入。'
  }
  if (status.value === 'CONFIRMED_WAITING_PLAN') {
    return '用户确认已经保存，但目标日期尚无可写入的日计划；当前不代表任务已经创建。'
  }
  if (status.value === 'APPLIED') {
    return '后端已确认任务变化和周计划回流完成。'
  }
  return props.preview?.failureMessage || '请根据当前状态刷新或重新生成预览。'
})

const stateAlertType = computed(() => ({
  PREVIEW_READY: 'info',
  STALE: 'warning',
  CONFIRMED_WAITING_PLAN: 'warning',
  APPLYING: 'info',
  APPLIED: 'success',
  PARTIALLY_APPLIED: 'warning',
  APPLY_FAILED: 'error'
}[status.value] || 'info') as 'success' | 'warning' | 'info' | 'error')

const resultSourceLabel = computed(() => {
  const source = String(props.preview?.resultSource || '').toUpperCase()
  if (source === 'FALLBACK') return '规则降级预览'
  if (source === 'LLM') return 'AI 建议，经规则校验'
  if (source === 'RULE') return '确定性规则预览'
  return '来源待确认'
})

watch(
  () => [props.modelValue, props.preview?.changeSetId, props.preview?.previewHash],
  ([visible]) => {
    if (visible) {
      acknowledgedWarningCodes.value = []
      now.value = Date.now()
      if (!clock) {
        clock = setInterval(() => {
          now.value = Date.now()
        }, 15_000)
        ;(clock as ReturnType<typeof setInterval> & { unref?: () => void }).unref?.()
      }
    } else if (clock) {
      clearInterval(clock)
      clock = undefined
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
})

const signedDelta = (value: number, suffix: string) => {
  if (!value) return `无变化`
  return `${value > 0 ? '+' : ''}${value}${suffix}`
}

const changeTypeLabel = (value?: string) => getAgentPlanChangeTypeLabel(value)
const confidenceLabel = (value?: string) => getAgentPlanConfidenceLabel(value)
const warningLabel = (value?: string) => getAgentPlanChangeWarningLabel(value)

const sourceSuggestionTitle = (suggestionId?: number) => {
  const suggestion = props.suggestions.find((item) => item.id === suggestionId)
  return suggestion?.title ? `来源建议：${suggestion.title}` : '来源建议待确认'
}

const priorityLabel = (value?: string) => ({
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低'
}[String(value || '').toUpperCase()] || value || '-')

const statusLabel = (value?: string) => ({
  TODO: '待完成',
  DOING: '进行中',
  DONE: '已完成',
  DEFERRED: '已推迟',
  SKIPPED: '已跳过',
  EXPIRED: '已过期'
}[String(value || '').toUpperCase()] || value || '-')

const snapshotValue = (
  snapshot: AgentPlanTaskSnapshotDTO | null | undefined,
  field: keyof AgentPlanTaskSnapshotDTO
) => {
  if (!snapshot) return '-'
  const value = snapshot[field]
  if (field === 'priority') return priorityLabel(String(value || ''))
  if (field === 'status') return statusLabel(String(value || ''))
  if (field === 'estimatedMinutes') return value == null ? '-' : `${value} 分钟`
  return value == null || value === '' ? '-' : String(value)
}

const valueChanged = (
  item: AgentPlanChangeItemVO,
  field: keyof AgentPlanTaskSnapshotDTO
) => snapshotValue(item.before, field) !== snapshotValue(item.after, field)

const toggleWarning = (warning: string, checked: boolean) => {
  const next = new Set(acknowledgedWarningCodes.value)
  if (checked) next.add(warning)
  else next.delete(warning)
  acknowledgedWarningCodes.value = Array.from(next)
}
</script>

<style scoped lang="scss">
.plan-change-preview-dialog__header,
.plan-change-preview-dialog__footer,
.plan-change-preview__section-head,
.plan-change-preview__group-head,
.plan-change-preview__item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.plan-change-preview-dialog__header h2,
.plan-change-preview h3,
.plan-change-preview h4,
.plan-change-preview h5 {
  margin: 0;
  letter-spacing: 0;
}

.plan-change-preview-dialog__header h2 {
  font-size: 20px;
}

.plan-change-preview-dialog__header p {
  margin: 5px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.plan-change-preview {
  display: grid;
  gap: 16px;
  max-height: min(72vh, 760px);
  overflow-y: auto;
  padding-right: 4px;
}

.plan-change-preview__summary,
.plan-change-preview__diff,
.plan-change-preview__source,
.plan-change-preview__warnings {
  display: grid;
  gap: 12px;
}

.plan-change-preview__section-head h3 {
  color: var(--el-text-color-primary);
  font-size: 15px;
}

.plan-change-preview__section-head p {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.plan-change-preview__section-head > span,
.plan-change-preview__item-head > span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  text-align: right;
}

.plan-change-preview__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

.plan-change-preview__metrics article {
  min-width: 0;
  padding: 12px;
  border-right: 1px solid var(--el-border-color);
}

.plan-change-preview__metrics article:last-child {
  border-right: 0;
}

.plan-change-preview__metrics span,
.plan-change-preview__metrics strong,
.plan-change-preview__metrics small {
  display: block;
}

.plan-change-preview__metrics span,
.plan-change-preview__metrics small {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.plan-change-preview__metrics strong {
  margin: 6px 0 4px;
  color: var(--el-text-color-primary);
  font-size: 16px;
  line-height: 1.4;
}

.plan-change-preview__groups {
  display: grid;
  gap: 12px;
}

.plan-change-preview__group {
  display: grid;
  gap: 10px;
}

.plan-change-preview__group + .plan-change-preview__group {
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.plan-change-preview__group-head h4 {
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.plan-change-preview__group-head p,
.plan-change-preview__empty-group {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.plan-change-preview__items {
  display: grid;
  gap: 10px;
}

.plan-change-preview__item {
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

.plan-change-preview__item h5 {
  color: var(--el-text-color-primary);
  font-size: 14px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.plan-change-preview__item-tags,
.plan-change-preview__item-warnings {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 7px;
}

.plan-change-preview__values {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.plan-change-preview__values > div > span {
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 700;
}

.plan-change-preview__values dl {
  display: grid;
  gap: 5px;
  margin: 7px 0 0;
}

.plan-change-preview__values dl div {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 8px;
}

.plan-change-preview__values dt,
.plan-change-preview__values dd {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
}

.plan-change-preview__values dt {
  color: var(--el-text-color-secondary);
}

.plan-change-preview__values dd {
  color: var(--el-text-color-primary);
  overflow-wrap: anywhere;
}

.plan-change-preview__values dd.is-changed {
  color: var(--el-color-primary);
  font-weight: 700;
}

.plan-change-preview__arrow {
  color: var(--el-text-color-placeholder);
}

.plan-change-preview__impact {
  display: grid;
  gap: 5px;
}

.plan-change-preview__impact p {
  margin: 0;
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.55;
}

.plan-change-preview__item-warnings span {
  color: var(--el-color-warning-dark-2);
  font-size: 11px;
  font-weight: 700;
}

.plan-change-preview__source dl {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.plan-change-preview__source dl div {
  min-width: 0;
}

.plan-change-preview__source dt,
.plan-change-preview__source dd {
  margin: 0;
  font-size: 12px;
}

.plan-change-preview__source dt {
  color: var(--el-text-color-secondary);
}

.plan-change-preview__source dd {
  margin-top: 5px;
  color: var(--el-text-color-primary);
  overflow-wrap: anywhere;
}

.plan-change-preview__warning-list {
  display: grid;
  gap: 8px;
}

.plan-change-preview__warning-list :deep(.el-checkbox) {
  height: auto;
  margin: 0;
  padding: 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  white-space: normal;
}

.plan-change-preview__warning-list span,
.plan-change-preview__warning-list small {
  display: block;
}

.plan-change-preview__warning-list small {
  margin-top: 3px;
  color: var(--el-text-color-secondary);
  font-size: 10px;
}

.plan-change-preview__empty {
  padding: 30px 0;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.plan-change-preview-dialog__footer {
  justify-content: flex-end;
}

@media (max-width: 760px) {
  .plan-change-preview-dialog__header,
  .plan-change-preview__section-head,
  .plan-change-preview__item-head {
    align-items: stretch;
    flex-direction: column;
  }

  .plan-change-preview__section-head > span,
  .plan-change-preview__item-head > span {
    text-align: left;
  }

  .plan-change-preview__metrics,
  .plan-change-preview__source dl {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .plan-change-preview__metrics article:nth-child(2) {
    border-right: 0;
  }

  .plan-change-preview__metrics article:nth-child(-n + 2) {
    border-bottom: 1px solid var(--el-border-color);
  }

  .plan-change-preview__values {
    grid-template-columns: 1fr;
  }

  .plan-change-preview__arrow {
    transform: rotate(90deg);
    justify-self: center;
  }
}

@media (max-width: 520px) {
  .plan-change-preview__metrics,
  .plan-change-preview__source dl {
    grid-template-columns: 1fr;
  }

  .plan-change-preview__metrics article {
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color);
  }

  .plan-change-preview__metrics article:last-child {
    border-bottom: 0;
  }

  .plan-change-preview-dialog__footer {
    display: grid;
    grid-template-columns: 1fr;
  }

  .plan-change-preview-dialog__footer :deep(.el-button) {
    width: 100%;
    margin: 0;
  }
}
</style>
