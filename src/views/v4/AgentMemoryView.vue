<template>
  <div class="page-shell v4-memory-page">
    <section class="v4-page-header">
      <div>
        <div class="v4-eyebrow">长期记忆</div>
        <h1>长期记忆治理</h1>
        <p>长期记忆只表达偏好、约束和复盘结论，不是能力证据；候选、低置信、停用或删除记忆不会进入 Agent 强推荐上下文。</p>
      </div>
      <div class="v4-actions">
        <el-button :icon="Plus" type="primary" @click="openCreate()">新增记忆</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
      </div>
    </section>

    <section class="v4-memory-summary" aria-label="长期记忆状态概览">
      <div class="v4-summary-item">
        <span class="v4-summary-item__value">{{ summary.total }}</span>
        <span class="v4-summary-item__label">全部记忆</span>
      </div>
      <div class="v4-summary-item is-trusted">
        <span class="v4-summary-item__value">{{ summary.trusted }}</span>
        <span class="v4-summary-item__label">可信输入</span>
      </div>
      <div class="v4-summary-item is-candidate">
        <span class="v4-summary-item__value">{{ summary.candidate }}</span>
        <span class="v4-summary-item__label">候选待确认</span>
      </div>
      <div class="v4-summary-item is-risk">
        <span class="v4-summary-item__value">{{ summary.governance }}</span>
        <span class="v4-summary-item__label">需治理</span>
      </div>
    </section>

    <section class="v4-memory-controls">
      <el-radio-group v-model="activeFilter" size="large">
        <el-radio-button label="ALL">全部</el-radio-button>
        <el-radio-button label="TRUSTED">可信输入</el-radio-button>
        <el-radio-button label="CANDIDATE">候选</el-radio-button>
        <el-radio-button label="GOVERNANCE">需治理</el-radio-button>
        <el-radio-button label="DISABLED">已停用</el-radio-button>
      </el-radio-group>
      <p class="v4-memory-controls__hint">从复盘、投递、实验或 AI 总结抽取的内容只能先作为候选，必须显式确认后才可能影响 Agent 行动。</p>
    </section>

    <section class="v4-boundary-panel" aria-label="长期记忆边界">
      <div>
        <strong>候选状态</strong>
        <p>candidate / pending confirmation 表示待确认；active 仅表示可作为偏好输入；disabled、deleted、stale 和 low-confidence 会被降级或隔离。</p>
      </div>
      <div>
        <strong>上下文边界</strong>
        <p>只有已启用、已确认、非低置信、非过期且未删除的记忆可进入 Agent 上下文；记忆永远不能替代项目、投递、面试或题目证据。</p>
      </div>
    </section>

    <section class="content-card">
      <div class="content-card__body v4-list" v-loading="loading">
        <article
          v-for="view in filteredMemories"
          :key="view.item.id"
          class="v4-row"
          :class="[`v4-row--${view.lifecycle}`, { 'v4-row--disabled': !isStrictlyEnabled(view.item) }]"
        >
          <div class="v4-row-head">
            <div class="v4-row-main">
              <div class="v4-row-title">
                <strong>{{ memoryTypeLabel(view.item.memoryType) }}</strong>
                <el-tag size="small" :type="view.statusTagType" effect="plain">{{ view.statusLabel }}</el-tag>
                <el-tag v-if="view.canEnterTrustedContext" size="small" type="success" effect="dark">可作为可信输入</el-tag>
                <el-tag v-else size="small" type="info" effect="plain">不进入强推荐</el-tag>
              </div>

              <p class="v4-memory-content">{{ view.item.content || '这条记忆没有返回内容摘要。' }}</p>

              <div class="v4-memory-meta">
                <span class="v4-memory-meta__item">
                  <span class="v4-memory-meta__label">来源</span>
                  {{ sourceDetailLabel(view.item) }}
                </span>
                <span class="v4-memory-meta__item">
                  <span class="v4-memory-meta__label">确认状态</span>
                  {{ confirmationLabel(view) }}
                </span>
                <span class="v4-memory-meta__item">
                  <span class="v4-memory-meta__label">启用状态</span>
                  {{ enabledLabel(view.item) }}
                </span>
                <span class="v4-memory-meta__item">
                  <span class="v4-memory-meta__label">可信度</span>
                  <el-tag size="small" :type="confidenceTagType(view.item.confidence)" effect="plain">
                    {{ confidenceLabel(view.item.confidence) }}
                  </el-tag>
                </span>
                <span class="v4-memory-meta__item v4-memory-meta__item--wide">
                  <span class="v4-memory-meta__label">影响预览</span>
                  {{ impactScopeLabel(view) }}
                </span>
              </div>

              <ul v-if="view.reasons.length" class="v4-memory-reasons">
                <li v-for="reason in view.reasons" :key="reason">{{ reason }}</li>
              </ul>
            </div>

            <div class="v4-row-actions">
              <el-button
                v-if="view.isCandidate && !view.isDeleted"
                :icon="Check"
                link
                type="primary"
                @click="toggle(view)"
              >
                确认
              </el-button>
              <el-button
                v-else-if="!isStrictlyEnabled(view.item)"
                :icon="Check"
                link
                type="primary"
                @click="toggle(view)"
              >
                启用
              </el-button>
              <el-button v-else :icon="TurnOff" link type="warning" @click="toggle(view)">停用</el-button>
              <el-button :icon="Delete" link type="danger" @click="remove(view)">删除</el-button>
            </div>
          </div>
        </article>

        <AppState
          v-if="errorMessage && !loading"
          type="error"
          title="长期记忆加载失败"
          :description="errorMessage"
        >
          <div class="empty-actions">
            <el-button :icon="Refresh" type="primary" :loading="loading" @click="load">重新加载</el-button>
          </div>
        </AppState>
        <AppState
          v-else-if="!memories.length && !loading"
          type="empty"
          title="还没有长期记忆"
          description="可以先手动记录一条偏好、弱项或复盘结论；系统沉淀的候选记忆需要确认后才会影响强推荐。"
        >
          <div class="empty-actions">
            <el-button :icon="Plus" type="primary" @click="openCreate('SKILL_GAP')">记录一个弱项</el-button>
            <el-button @click="openCreate('JOB_SEARCH_PREFERENCE')">记录偏好</el-button>
          </div>
        </AppState>
        <AppState
          v-else-if="!filteredMemories.length && !loading"
          type="empty"
          title="当前筛选下没有记忆"
          description="可以切换到全部记忆查看完整生命周期状态。"
        />
      </div>
    </section>

    <section class="v4-governance-panel" aria-label="污染治理建议">
      <div>
        <div class="v4-eyebrow">治理动作</div>
        <h2>污染治理入口</h2>
        <p>这些动作不会自动清理记忆，只把需要人工确认、复核或隔离的来源显式展示出来。</p>
      </div>
      <div class="v4-governance-list">
        <article v-for="action in governanceActions" :key="action.key" class="v4-governance-item">
          <el-icon><Warning /></el-icon>
          <div>
            <strong>{{ action.title }}</strong>
            <p>{{ action.description }}</p>
          </div>
          <span>{{ action.count }}</span>
        </article>
      </div>
    </section>

    <el-dialog v-model="dialogVisible" title="新增长期记忆" width="520px">
      <el-form label-position="top">
        <el-form-item label="类型">
          <el-select v-model="form.memoryType" allow-create filterable style="width: 100%" placeholder="选择记忆类型">
            <el-option v-for="item in memoryTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="4" maxlength="500" show-word-limit />
        </el-form-item>
        <p class="v4-form-note">手动新增会被视为用户确认，但仍建议只记录稳定偏好、长期弱项或复盘结论，避免写入临时情绪和敏感原文。</p>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="!form.content.trim()" @click="create">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Check, Delete, Plus, Refresh, TurnOff, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  confirmAgentMemoryApi,
  createAgentMemoryApi,
  deleteAgentMemoryApi,
  disableAgentMemoryApi,
  enableAgentMemoryApi,
  getAgentMemoriesApi,
  getAgentMemoryImpactPreviewApi
} from '@/api/agent'
import AppState from '@/components/common/AppState.vue'
import type { AgentContextImpactPreviewVO, AgentMemoryLifecycle, AgentMemoryVO } from '@/types/agent'
import { isAuthOrForbiddenError } from '@/utils/apiError'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

type MemoryFilter = 'ALL' | 'TRUSTED' | 'CANDIDATE' | 'GOVERNANCE' | 'DISABLED'
type MemoryLifecycle = AgentMemoryLifecycle | 'trusted'

interface MemoryViewState {
  item: AgentMemoryVO
  lifecycle: MemoryLifecycle
  statusLabel: string
  statusTagType: 'success' | 'warning' | 'info' | 'danger'
  isCandidate: boolean
  isManual: boolean
  isConfirmed: boolean
  isLowConfidence: boolean
  isStale: boolean
  isDeleted: boolean
  canEnterTrustedContext: boolean
  reasons: string[]
}

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const activeFilter = ref<MemoryFilter>('ALL')
const memories = ref<AgentMemoryVO[]>([])
const errorMessage = ref('')
const form = reactive({ memoryType: 'USER_NOTE', content: '' })

const memoryTypeOptions = [
  { label: '用户笔记', value: 'USER_NOTE' },
  { label: '能力弱项', value: 'SKILL_GAP' },
  { label: '求职偏好', value: 'JOB_SEARCH_PREFERENCE' },
  { label: '面试偏好', value: 'INTERVIEW_PREFERENCE' },
  { label: '职业目标', value: 'CAREER_GOAL' },
  { label: '复盘摘要', value: 'REVIEW_SUMMARY' }
]

const sourceTypeLabels: Record<string, string> = {
  MANUAL: '手动记录',
  USER_MANUAL: '手动记录',
  USER_NOTE: '手动记录',
  AGENT_REVIEW: '智能复盘沉淀',
  REVIEW: '智能复盘沉淀',
  AGENT_FEEDBACK: '反馈信号沉淀',
  JOB_EXPERIMENT: '求职实验沉淀',
  RESUME_JOB_MATCH: '简历匹配沉淀',
  AI_SUMMARY: 'AI 总结沉淀',
  SYSTEM: '系统沉淀'
}

const manualSourceTypes = new Set(['MANUAL', 'USER_MANUAL', 'USER_NOTE'])
const candidateStatusValues = new Set(['CANDIDATE', 'PENDING_CONFIRMATION', 'UNCONFIRMED'])
const lowConfidenceStatusValues = new Set(['LOW_CONFIDENCE', 'PARTIAL'])
const staleStatusValues = new Set(['STALE', 'EXPIRED'])
const deletedStatusValues = new Set(['DELETED', 'REMOVED'])

const normalizeStatus = (value?: string) => String(value || '').trim().toUpperCase()
const normalizeSourceType = (value?: string) => String(value || '').trim().toUpperCase()

const memoryTypeLabel = (value?: string) =>
  memoryTypeOptions.find((item) => item.value === value)?.label || '未分类记忆'

const sourceTypeLabel = (value?: string) => sourceTypeLabels[normalizeSourceType(value)] || '来源待确认'

const isStrictlyEnabled = (item: AgentMemoryVO) => {
  if (item.enabled === 0) return false
  return item.enabled === 1 || ['ENABLED', 'ACTIVE', 'CONFIRMED'].includes(normalizeStatus(item.memoryStatus))
}

const hasExplicitDisabledState = (item: AgentMemoryVO) =>
  item.enabled === 0 || ['DISABLED', 'DELETED', 'REMOVED'].includes(normalizeStatus(item.memoryStatus))

const enabledLabel = (item: AgentMemoryVO) => {
  if (isStrictlyEnabled(item)) return '已启用'
  if (hasExplicitDisabledState(item)) return '已停用'
  return '未返回启用状态'
}

const isExpired = (value?: string) => {
  if (!value) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp < Date.now()
}

const normalizedConfidence = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return null
  const normalized = value > 1 ? value / 100 : value
  return Math.max(0, Math.min(1, normalized))
}

const confidenceLabel = (value?: number) => {
  const normalized = normalizedConfidence(value)
  if (normalized === null) return '未评估'
  return `${Math.round(normalized * 100)}%`
}

const confidenceTagType = (value?: number) => {
  const normalized = normalizedConfidence(value)
  if (normalized === null) return 'info'
  if (normalized >= 0.8) return 'success'
  if (normalized >= 0.5) return 'warning'
  return 'danger'
}

const deriveMemoryViewState = (item: AgentMemoryVO): MemoryViewState => {
  const status = normalizeStatus(item.memoryStatus)
  const isManual = manualSourceTypes.has(normalizeSourceType(item.sourceType))
  const isConfirmed = Boolean(item.confirmedAt) || isManual
  const isCandidate = Boolean(item.pendingConfirmation) || candidateStatusValues.has(status) || !isConfirmed
  const confidence = normalizedConfidence(item.confidence)
  const isLowConfidence = Boolean(item.lowConfidence) || lowConfidenceStatusValues.has(status) || confidence === null || confidence < 0.6
  const isDeleted = Boolean(item.deletedAt) || deletedStatusValues.has(status)
  const isStale = Boolean(item.stale) || staleStatusValues.has(status) || isExpired(item.expiresAt)
  const enabled = isStrictlyEnabled(item)
  const canEnterTrustedContext = Boolean(item.canEnterAgentContext) && enabled && isConfirmed && !isCandidate && !isLowConfidence && !isStale && !isDeleted
  const reasons: string[] = []

  if (isDeleted) reasons.push('已删除或后端标记为移除，不能作为当前有效依据。')
  if (!enabled) reasons.push(item.enabled === 0 ? 'enabled=0，不会进入 Agent 上下文。' : '未确认启用状态，按保守策略降级。')
  if (isCandidate) reasons.push(isManual ? '等待明确状态返回前按候选处理。' : '非手动来源且没有确认时间，必须确认后才能成为可信输入。')
  if (isLowConfidence) reasons.push(confidence === null ? '缺少置信度字段，只能作为复核线索。' : '置信度低于强输入阈值，只能作为弱观察。')
  if (isStale) reasons.push('记忆可能过期，需要复核是否继续有效。')

  if (isDeleted) {
    return { item, lifecycle: 'deleted', statusLabel: '已删除隔离', statusTagType: 'danger', isCandidate, isManual, isConfirmed, isLowConfidence, isStale, isDeleted, canEnterTrustedContext, reasons }
  }
  if (!enabled) {
    return { item, lifecycle: 'disabled', statusLabel: isCandidate ? '候选待确认' : '已停用', statusTagType: isCandidate ? 'warning' : 'info', isCandidate, isManual, isConfirmed, isLowConfidence, isStale, isDeleted, canEnterTrustedContext, reasons }
  }
  if (isCandidate) {
    return { item, lifecycle: 'candidate', statusLabel: '候选待确认', statusTagType: 'warning', isCandidate, isManual, isConfirmed, isLowConfidence, isStale, isDeleted, canEnterTrustedContext, reasons }
  }
  if (isStale) {
    return { item, lifecycle: 'stale', statusLabel: '过期待复核', statusTagType: 'warning', isCandidate, isManual, isConfirmed, isLowConfidence, isStale, isDeleted, canEnterTrustedContext, reasons }
  }
  if (isLowConfidence) {
    return { item, lifecycle: 'low-confidence', statusLabel: '低置信复核', statusTagType: 'danger', isCandidate, isManual, isConfirmed, isLowConfidence, isStale, isDeleted, canEnterTrustedContext, reasons }
  }
  if (canEnterTrustedContext) {
    return { item, lifecycle: 'trusted', statusLabel: '可信输入', statusTagType: 'success', isCandidate, isManual, isConfirmed, isLowConfidence, isStale, isDeleted, canEnterTrustedContext, reasons }
  }
  return { item, lifecycle: 'partial', statusLabel: '部分可信', statusTagType: 'info', isCandidate, isManual, isConfirmed, isLowConfidence, isStale, isDeleted, canEnterTrustedContext, reasons }
}

const memoryViews = computed(() => memories.value.map(deriveMemoryViewState))

const filteredMemories = computed(() => {
  switch (activeFilter.value) {
    case 'TRUSTED':
      return memoryViews.value.filter((item) => item.canEnterTrustedContext)
    case 'CANDIDATE':
      return memoryViews.value.filter((item) => item.isCandidate)
    case 'GOVERNANCE':
      return memoryViews.value.filter((item) => !item.canEnterTrustedContext && (item.isCandidate || item.isLowConfidence || item.isStale || item.isDeleted))
    case 'DISABLED':
      return memoryViews.value.filter((item) => !isStrictlyEnabled(item.item))
    default:
      return memoryViews.value
  }
})

const summary = computed(() => ({
  total: memoryViews.value.length,
  trusted: memoryViews.value.filter((item) => item.canEnterTrustedContext).length,
  candidate: memoryViews.value.filter((item) => item.isCandidate).length,
  governance: memoryViews.value.filter((item) => !item.canEnterTrustedContext && (item.isCandidate || item.isLowConfidence || item.isStale || item.isDeleted)).length
}))

const governanceActions = computed(() => [
  {
    key: 'confirm-candidate',
    title: '确认候选记忆',
    description: 'Agent、复盘或 AI 总结沉淀的记忆需要用户确认后才可能进入可信输入。',
    count: memoryViews.value.filter((item) => item.isCandidate && !item.isDeleted).length
  },
  {
    key: 'review-low-confidence',
    title: '复核低置信记忆',
    description: '低置信或缺少置信度的记忆只作为治理线索，不能推动强推荐。',
    count: memoryViews.value.filter((item) => item.isLowConfidence && !item.isDeleted).length
  },
  {
    key: 'isolate-disabled',
    title: '隔离停用/删除记忆',
    description: '停用或删除后，后续计划、复盘和推荐不应主动引用这些记忆。',
    count: memoryViews.value.filter((item) => !isStrictlyEnabled(item.item) || item.isDeleted).length
  }
])

const sourceDetailLabel = (item: AgentMemoryVO) => {
  const label = sourceTypeLabel(item.sourceType)
  const sourceId = item.sourceId ? ` #${item.sourceId}` : ''
  return `${label}${sourceId}`
}

const confirmationLabel = (view: MemoryViewState) => {
  if (view.isManual) return '手动记录，视为用户确认'
  if (view.item.confirmedAt) return `已确认：${view.item.confirmedAt}`
  return '未确认'
}

const impactScopeLabel = (view: MemoryViewState) => {
  if (view.item.impactPreview?.contextEffect) return view.item.impactPreview.contextEffect
  if (view.canEnterTrustedContext) return '可影响今日计划、投递包取舍、面试训练和实验复盘，但只作为偏好/约束，不替代证据。'
  if (view.isDeleted) return '已隔离，后续推荐不应主动引用；历史快照仅作为历史记录。'
  if (!isStrictlyEnabled(view.item)) return '未启用或已停用，后续推荐不应主动引用。'
  if (view.isCandidate) return '候选待确认，只能生成确认/治理动作，不进入 Agent 强推荐上下文。'
  if (view.isLowConfidence) return '只作为弱观察或复核线索，不作为最高优先级依据。'
  if (view.isStale) return '需要复核时效性，确认前不作为强依据。'
  return '字段不足，按保守策略只作为观察信号。'
}

const buildActionPreview = (view: MemoryViewState, actionLabel: '确认' | '启用' | '停用' | '删除') => {
  const target = `${memoryTypeLabel(view.item.memoryType)}：${view.item.content || '长期记忆'}`
  if (actionLabel === '停用') {
    return {
      action: '停用这条长期记忆',
      target,
      impact: '停用后，这条记忆不会被后续计划、复盘或推荐主动引用，只保留为可追踪的历史记录。',
      rollback: '如果停用后发现仍然需要，可以重新启用；重新启用前仍会检查确认状态、置信度和过期状态。',
      tips: ['确认这条记忆暂时不适合继续影响推荐。', '停用不会删除记忆正文。']
    }
  }
  if (actionLabel === '删除') {
    return {
      action: '删除这条长期记忆',
      target,
      impact: '删除后，后续计划、复盘和推荐不再主动使用这条记忆；历史建议可能保留当时快照，但不能继续作为当前依据。',
      rollback: '系统不会自动恢复已删除记忆；如误删，需要重新手动记录或等待后续运行再次沉淀。',
      tips: ['确认这条记忆已经不准确、不应长期保存或不希望继续影响推荐。', '删除前请确认不需要保留为复核线索。']
    }
  }
  if (actionLabel === '确认') {
    return {
      action: '确认这条候选长期记忆',
      target,
      impact: '确认后，这条记忆仍需满足已启用、非低置信、非过期且未删除，才可能作为偏好或约束影响 Agent 今日计划、投递包取舍、面试训练和实验复盘。',
      rollback: '如果确认后发现不准确，可以立即停用或删除；停用/删除后 Agent 上下文会回退到任务、投递、实验和面试等证据源。',
      tips: ['确认它是稳定偏好、长期约束或可复用复盘结论。', '不要把候选记忆当作能力证据，能力仍需由项目、题目、投递和面试记录证明。']
    }
  }
  return {
    action: '启用这条长期记忆',
    target,
    impact: '启用后，这条记忆仍需通过确认状态、置信度和时效性检查，才可能影响后续计划、复盘和推荐；字段不足时页面会保守降级。',
    rollback: '如果启用后发现内容不准确，可以再次停用或删除。',
    tips: ['确认内容是稳定偏好、长期弱项或复盘结论。', '避免把临时情绪、敏感原文或未经确认的能力标签长期保存。']
  }
}

const fallbackMemoryImpactPreview = (
  view: MemoryViewState,
  fallbackReason?: string
): AgentContextImpactPreviewVO => ({
  sourceType: 'MEMORY',
  sourceId: view.item.id,
  sourceTitle: memoryTypeLabel(view.item.memoryType),
  referenceCount: 0,
  recentReferenceCount: 0,
  affectedModules: view.item.impactScopes || [],
  affectedConsumers: [],
  futureContextImpact: view.canEnterTrustedContext,
  historicalOnly: false,
  safeToDisable: !view.canEnterTrustedContext,
  warnings: [
    '后端引用预览不可用，当前仅展示本地估算降级。',
    ...(fallbackReason ? [fallbackReason] : [])
  ],
  previewSource: 'ESTIMATED',
  resultSource: 'ESTIMATED',
  fallbackReason
})

const loadMemoryImpactPreview = async (view: MemoryViewState) => {
  try {
    return await getAgentMemoryImpactPreviewApi(view.item.id)
  } catch (error) {
    if (isAuthOrForbiddenError(error)) throw error
    return fallbackMemoryImpactPreview(view, getErrorMessage(error, '记忆影响预览不可用'))
  }
}

const memoryImpactPreviewText = (preview: AgentContextImpactPreviewVO) => {
  const backend = preview.previewSource === 'BACKEND_REFERENCES' || preview.resultSource === 'BACKEND_REFERENCES'
  const source = backend
    ? '后端引用明细'
    : `本地估算降级${preview.fallbackReason ? `：${preview.fallbackReason}` : ''}`
  const modules = (preview.affectedModules || []).filter(Boolean).join(', ') || '无'
  const consumers = (preview.affectedConsumers || [])
    .slice(0, 3)
    .map((item) => `${item.consumerType || '消费者'}#${item.consumerId || '-'}:${item.usageScene || '使用场景'}`)
    .join('; ')
  const warnings = (preview.warnings || []).filter(Boolean).join('; ')
  return `${source}：历史引用总计 ${preview.referenceCount ?? 0} 条，近期 ${preview.recentReferenceCount ?? 0} 条；影响模块：${modules}；未来上下文影响：${preview.futureContextImpact ? '有' : '无'}；仅历史影响：${preview.historicalOnly ? '是' : '否'}；可安全停用：${preview.safeToDisable ? '是' : '否'}${consumers ? `；近期消费者：${consumers}` : ''}${warnings ? `；提醒：${warnings}` : ''}。`
}

const load = async () => {
  loading.value = true
  try {
    const page = await getAgentMemoriesApi({ pageNo: 1, pageSize: 50 })
    memories.value = page.records || []
    errorMessage.value = ''
  } catch (error) {
    memories.value = []
    errorMessage.value = getErrorMessage(error, '长期记忆暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const openCreate = (memoryType = 'USER_NOTE') => {
  form.memoryType = memoryType
  form.content = ''
  dialogVisible.value = true
}

const create = async () => {
  const content = form.content.trim()
  if (!content) {
    ElMessage.warning('请先填写记忆内容')
    return
  }
  const confirmed = await confirmDangerActionPreview({
    title: '新增长期记忆',
    action: '保存一条手动确认的长期记忆',
    target: `${memoryTypeLabel(form.memoryType)}：${content}`,
    impact: '保存后，智能教练后续生成今日计划、复盘、题目训练和面试建议时，可能把这条记忆作为偏好、弱项或项目背景依据。',
    rollback: '如内容不准确，可以在列表中停用或删除；删除后需要重新手动记录或等待后续运行再次沉淀。',
    audit: '新增记忆会按当前账号、记忆类型和创建时间记录。',
    tips: ['确认内容是稳定偏好、长期弱项或复盘结论。', '避免写入临时情绪、敏感原文或不希望长期影响推荐的信息。'],
    confirmButtonText: '确认保存'
  })
  if (!confirmed) return
  saving.value = true
  try {
    await createAgentMemoryApi({ memoryType: form.memoryType, content, sourceType: 'MANUAL' })
    dialogVisible.value = false
    form.content = ''
    ElMessage.success('记忆已保存')
    await load()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '记忆保存失败，请稍后重试。'))
  } finally {
    saving.value = false
  }
}

const toggle = async (view: MemoryViewState) => {
  const enabled = isStrictlyEnabled(view.item)
  const actionLabel = view.isCandidate ? '确认' : enabled ? '停用' : '启用'
  let impactPreview: AgentContextImpactPreviewVO
  try {
    impactPreview = await loadMemoryImpactPreview(view)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '无法读取记忆影响范围，已中止操作。'))
    return
  }
  const preview = buildActionPreview(view, actionLabel)
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}长期记忆`,
    action: preview.action,
    target: preview.target,
    impact: `${preview.impact} ${memoryImpactPreviewText(impactPreview)}`,
    rollback: preview.rollback,
    audit: `${actionLabel}操作会记录当前账号和这条记忆。`,
    tips: preview.tips,
    confirmButtonText: `确认${actionLabel}`
  })
  if (!confirmed) return
  try {
    if (view.isCandidate) {
      await confirmAgentMemoryApi(view.item.id)
    } else if (enabled) {
      await disableAgentMemoryApi(view.item.id, {
        confirmed: true,
        reason: `confirmed impact-preview before disabling memory ${view.item.id}`
      })
    } else {
      await enableAgentMemoryApi(view.item.id)
    }
    ElMessage.success(actionLabel === '确认' ? '候选记忆确认请求已提交' : (enabled ? '记忆已停用' : '启用请求已提交'))
    await load()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '记忆状态更新失败，请稍后重试。'))
  }
}

const remove = async (view: MemoryViewState) => {
  let impactPreview: AgentContextImpactPreviewVO
  try {
    impactPreview = await loadMemoryImpactPreview(view)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '无法读取记忆影响范围，已中止删除。'))
    return
  }
  const preview = buildActionPreview(view, '删除')
  const confirmed = await confirmDangerActionPreview({
    title: '删除长期记忆',
    action: preview.action,
    target: preview.target,
    impact: `${preview.impact} ${memoryImpactPreviewText(impactPreview)}`,
    rollback: preview.rollback,
    audit: '删除操作会记录当前账号和这条记忆。',
    tips: preview.tips,
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  try {
    await deleteAgentMemoryApi(view.item.id, {
      confirmed: true,
      reason: `confirmed impact-preview before deleting memory ${view.item.id}`
    })
    ElMessage.success('记忆已删除')
    await load()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '记忆删除失败，请稍后重试。'))
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.v4-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.58);
}

.v4-page-header h1,
.v4-governance-panel h2 {
  margin: 8px 0 0;
  font-size: 26px;
  letter-spacing: 0;
}

.v4-governance-panel h2 {
  font-size: 20px;
}

.v4-page-header p,
.v4-governance-panel p,
.v4-memory-controls__hint,
.v4-form-note,
.v4-memory-content,
.muted {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.v4-eyebrow {
  color: #5eead4;
  font-size: 13px;
  font-weight: 700;
}

.v4-actions,
.v4-row-actions,
.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.v4-memory-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.v4-summary-item {
  min-height: 76px;
  padding: 12px 14px;
  border-right: 1px solid var(--app-border);
  background: transparent;

  &:last-child {
    border-right: 0;
  }
}

.v4-summary-item__value,
.v4-summary-item__label {
  display: block;
}

.v4-summary-item__value {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.1;
}

.v4-summary-item__label {
  margin-top: 8px;
  color: var(--app-text-muted);
}

.v4-summary-item.is-trusted {
  border-color: rgba(34, 197, 94, 0.46);
}

.v4-summary-item.is-candidate {
  border-color: rgba(245, 158, 11, 0.48);
}

.v4-summary-item.is-risk {
  border-color: rgba(248, 113, 113, 0.48);
}

.v4-memory-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.v4-memory-controls__hint {
  max-width: 520px;
  margin: 0;
  font-size: 13px;
}

.v4-boundary-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(94, 234, 212, 0.28);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.4);
}

.v4-boundary-panel strong {
  display: block;
  margin-bottom: 6px;
}

.v4-boundary-panel p {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.7;
}

.v4-list {
  display: grid;
  gap: 8px;
}

.v4-row {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.v4-row--trusted {
  border-color: rgba(34, 197, 94, 0.42);
}

.v4-row--candidate,
.v4-row--stale {
  border-color: rgba(245, 158, 11, 0.44);
}

.v4-row--low-confidence,
.v4-row--deleted {
  border-color: rgba(248, 113, 113, 0.44);
}

.v4-row--disabled {
  border-style: dashed;
  background: rgba(15, 23, 42, 0.34);
}

.v4-row-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.v4-row-main {
  min-width: 0;
}

.v4-row-title {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.v4-row-title strong {
  line-height: 1.4;
}

.v4-memory-content {
  margin: 10px 0 0;
}

.v4-memory-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 8px 12px;
  margin-top: 10px;
}

.v4-memory-meta__item {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-width: 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.v4-memory-meta__item--wide {
  grid-column: 1 / -1;
}

.v4-memory-meta__label {
  color: var(--app-text);
  font-weight: 700;
}

.v4-memory-reasons {
  display: grid;
  gap: 6px;
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.v4-governance-panel {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: rgba(15, 23, 42, 0.42);
}

.v4-governance-list {
  display: grid;
  gap: 10px;
}

.v4-governance-item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.v4-governance-item p {
  margin: 4px 0 0;
  font-size: 13px;
}

.v4-governance-item > span {
  min-width: 28px;
  color: #fbbf24;
  font-weight: 800;
  text-align: right;
}

.v4-form-note {
  margin: 0;
  font-size: 13px;
}

@media (max-width: 900px) {
  .v4-page-header,
  .v4-row-head,
  .v4-memory-controls,
  .v4-governance-panel,
  .v4-boundary-panel {
    align-items: flex-start;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .v4-memory-summary,
  .v4-memory-meta {
    grid-template-columns: 1fr;
  }

  .v4-summary-item {
    border-right: 0;
    border-bottom: 1px solid var(--app-border);
  }

  .v4-summary-item:last-child {
    border-bottom: 0;
  }
}
</style>
