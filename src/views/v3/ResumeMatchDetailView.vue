<template>
  <div class="v3-page">
    <section class="page-hero">
      <div>
        <div class="hero-kicker"><FileChartColumn :size="16" /> 匹配报告</div>
        <h1>{{ report?.jobTitle || '匹配报告详情' }}</h1>
        <p>{{ report ? `${report.resumeTitle || '已绑定简历'} · ${report.companyName || '--'}` : '读取匹配报告、失败原因与短板建议。' }}</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/resume-match')"><ArrowLeft :size="16" /> 返回匹配</el-button>
        <el-button :loading="loading" @click="loadReport"><RefreshCw :size="16" /> 刷新</el-button>
      </div>
    </section>

    <section v-if="loading" class="content-panel"><AppState type="loading" title="正在读取报告" description="正在同步匹配报告详情。" /></section>
    <section v-else-if="loadError" class="content-panel">
      <AppState type="error" title="报告加载失败" :description="loadError"><el-button type="primary" @click="loadReport">重新加载</el-button></AppState>
    </section>
    <section v-else-if="!report" class="content-panel"><AppState type="empty" title="报告不存在" description="当前路由没有可展示的匹配报告。" /></section>

    <template v-else>
      <section v-if="report.status === 'FAILED'" class="content-panel failure-panel">
        <el-alert type="error" show-icon :closable="false" title="报告暂不适合继续训练" :description="toFriendlyMessage(report.errorMessage, '本次生成没有形成可直接使用的匹配报告，请查看处理线索后重新生成。')" />
        <div class="failure-actions">
          <div>
            <h2>可从当前简历和岗位重新生成</h2>
            <p>系统已保留本次报告记录和处理线索，重新生成会继续使用当前简历与目标岗位。</p>
          </div>
          <div class="failure-buttons">
            <el-button type="primary" :loading="regenerating" @click="regenerateReport">
              <RefreshCw :size="16" /> 重新生成匹配报告
            </el-button>
            <el-button plain @click="copyDiagnostic">
              复制处理线索
            </el-button>
            <el-button plain @click="goMatchTaskCenter">
              查看任务中心
            </el-button>
          </div>
        </div>
        <dl class="diagnostic-list">
          <div v-for="item in diagnosticItems" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
      </section>
      <section v-else-if="isTrackingReport" class="content-panel report-tracker">
        <div>
          <span class="cc-badge cc-badge--streaming">
            <i class="cc-badge__dot" />
            {{ statusLabel(report.status) }}
          </span>
          <h2>匹配报告生成中</h2>
          <p>报告正在生成，页面会自动追踪状态并刷新详情；也可以离开页面，到任务中心继续查看进度和失败原因。</p>
        </div>
        <div class="tracker-actions">
          <el-button :loading="loading" @click="loadReport">立即刷新</el-button>
          <el-button type="primary" plain @click="goMatchTaskCenter">查看任务中心</el-button>
        </div>
      </section>

      <section v-if="isSuccessReport" class="score-grid">
        <article v-for="item in scoreCards" :key="item.label" class="score-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value ?? '--' }}</strong>
          <el-progress :percentage="Number(item.value || 0)" :stroke-width="8" :show-text="false" />
        </article>
      </section>

      <section v-if="isSuccessReport" class="content-panel trust-panel">
        <div>
          <h2>AI 推荐来源</h2>
          <p>这份匹配报告基于当前简历、目标岗位描述和岗位分析结果生成；如果来源或明细不完整，后续建议会先标记为待复核。</p>
        </div>
        <div class="trust-tags">
          <el-tag v-for="tag in reportTrustTags" :key="tag.label" :type="tag.type" effect="plain">{{ tag.label }}</el-tag>
        </div>
      </section>

      <section v-if="schemaWarningItems.length" class="content-panel schema-warning-panel">
        <div class="section-head">
          <div>
            <h2>内容待确认</h2>
            <p>部分内容来源不完整，建议重新生成或人工确认后再继续生成训练建议。</p>
          </div>
          <el-tag type="warning" effect="plain">部分内容待复核</el-tag>
        </div>
        <ul class="schema-warning-list">
          <li v-for="item in schemaWarningItems" :key="item.key">
            <strong>{{ item.field }}</strong>
            <span>{{ item.message }}</span>
          </li>
        </ul>
      </section>

      <section v-if="isSuccessReport" class="detail-grid">
        <div class="content-panel">
          <div class="section-head">
            <div><h2>报告摘要</h2><p>{{ report.summary || '暂无摘要。' }}</p></div>
            <div class="section-actions">
              <el-tag :type="statusTag(report.status)">{{ statusLabel(report.status) }}</el-tag>
              <AiResultFeedback
                v-if="report.status === 'SUCCESS'"
                scene="RESUME_MATCH"
                biz-type="RESUME_MATCH_REPORT"
                :biz-id="report.reportId"
                :ai-call-log-id="report.aiCallLogId"
                label="反馈报告"
                compact
              />
            </div>
          </div>
          <div class="json-sections">
            <DataBlock title="优势" :value="report.strengths" />
            <DataBlock title="短板" :value="report.gaps" />
            <DataBlock title="简历风险" :value="report.resumeRisks" />
            <DataBlock title="优化建议" :value="report.optimizationSuggestions" />
            <DataBlock title="推荐学习主题" :value="report.recommendedLearningTopics" />
            <DataBlock title="推荐面试主题" :value="report.recommendedInterviewTopics" />
          </div>
        </div>

        <aside class="content-panel action-panel">
          <h2>{{ isTrustedSuccessReport ? '下一步' : '先恢复报告' }}</h2>
          <p>{{ actionPanelHint }}</p>
          <el-button type="primary" :loading="profileGenerating" :disabled="!isTrustedSuccessReport" @click="generateProfile">
            <Radar :size="16" /> 生成/刷新能力画像
          </el-button>
          <el-button :disabled="!isTrustedSuccessReport" @click="router.push({ path: '/skill-profile', query: { matchReportId: report.reportId, targetJobId: report.targetJobId, resumeId: report.resumeId } })">
            查看能力画像
          </el-button>
          <el-button :disabled="!isTrustedSuccessReport" @click="router.push({ path: '/study-plans/from-gap', query: { matchReportId: report.reportId, targetJobId: report.targetJobId, resumeId: report.resumeId } })">
            <RouteIcon :size="16" /> 差距学习计划
          </el-button>
          <el-button :disabled="!isTrustedSuccessReport" @click="router.push({ path: '/interviews/create', query: { source: 'job-target', targetJobId: report.targetJobId, resumeId: report.resumeId, matchReportId: report.reportId } })">
            创建岗位面试
          </el-button>
          <template v-if="!isTrustedSuccessReport">
            <el-button type="primary" plain :loading="regenerating" @click="regenerateReport">
              <RefreshCw :size="16" /> 重新生成匹配报告
            </el-button>
            <el-button plain @click="goMatchTaskCenter">
              查看任务中心
            </el-button>
          </template>
          <el-alert
            v-if="isSuccessReport && !isTrustedSuccessReport"
            type="warning"
            show-icon
            :closable="false"
            title="当前报告来源不完整"
            description="请先重新生成匹配报告，或补齐简历项目经历和岗位描述后再继续生成能力画像、学习计划和岗位面试。"
          />
        </aside>
      </section>

      <section v-if="isSuccessReport" class="content-panel">
        <div class="section-head"><div><h2>维度明细</h2><p>按技能维度展示分数、差距和建议。</p></div></div>
        <el-table v-if="report.details?.length" :data="report.details">
          <el-table-column prop="dimension" label="维度" min-width="120" />
          <el-table-column prop="skillName" label="技能" min-width="140" />
          <el-table-column prop="score" label="分数" width="90" />
          <el-table-column prop="gapDescription" label="差距" min-width="220" show-overflow-tooltip />
          <el-table-column prop="suggestion" label="建议" min-width="220" show-overflow-tooltip />
        </el-table>
        <AppState v-else type="empty" title="暂无维度明细" description="当前报告暂无维度明细。" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ArrowLeft, FileChartColumn, Radar, RefreshCw, Route as RouteIcon } from 'lucide-vue-next'
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getResumeJobMatchReportDetailApi, regenerateResumeJobMatchReportApi } from '@/api/resumeJobMatch'
import { generateSkillProfileApi } from '@/api/skillProfile'
import AppState from '@/components/common/AppState.vue'
import AiResultFeedback from '@/components/feedback/AiResultFeedback.vue'
import type { ResumeJobMatchReportDetailVO } from '@/types/resumeJobMatch'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const profileGenerating = ref(false)
const regenerating = ref(false)
const loadError = ref('')
const report = ref<ResumeJobMatchReportDetailVO | null>(null)
let reportPollTimer: ReturnType<typeof setTimeout> | undefined
const RESUME_JOB_MATCH_TASK_BIZ_TYPE = 'resume-job-match.analyze'

const reportId = computed(() => Number(route.params.id) || 0)
const isTrackingReport = computed(() => {
  const status = report.value?.status
  return status === 'PENDING' || status === 'PROCESSING'
})
const isSuccessReport = computed(() => report.value?.status === 'SUCCESS')
const isTrustedSuccessReport = computed(() =>
  isSuccessReport.value
  && !report.value?.fallback
  && String(report.value?.trustStatus || '').toUpperCase() === 'VERIFIED'
  && !schemaWarningItems.value.length
)
const actionPanelHint = computed(() => {
  if (!isSuccessReport.value) return '报告成功后才会开放能力画像、学习计划和岗位面试。'
  if (!isTrustedSuccessReport.value) return '当前报告只适合查看和确认；建议重新生成可直接使用的报告后再继续训练。'
  return '基于该报告继续生成能力画像或差距学习计划。'
})
const diagnosticItems = computed(() => {
  if (!report.value) return []
  return [
    { label: '报告记录', value: report.value.reportId ? '已记录' : '--' },
    { label: '任务关联', value: report.value.asyncBizId || report.value.reportId ? '已保存' : '--' },
    { label: '处理进度', value: report.value.asyncMessageId ? '已提交' : '--' },
    { label: '处理线索', value: report.value.asyncTraceId ? '已记录' : '--' },
    { label: '推荐来源', value: sourceTypeLabel(report.value.sourceType) },
    { label: '来源状态', value: trustStatusLabel(report.value.trustStatus, report.value.fallback) },
    { label: '来源说明', value: report.value.evidenceSummary || '--' },
    { label: '报告处理', value: report.value.aiCallLogId ? '已保存' : '--' },
    { label: '关联简历', value: report.value.resumeId ? '已绑定' : '--' },
    { label: '目标岗位', value: report.value.targetJobId ? '已绑定' : '--' },
    { label: '更新时间', value: report.value.updatedAt ? formatDateTime(report.value.updatedAt) : '--' }
  ]
})
const scoreCards = computed(() => [
  { label: '综合匹配', value: report.value?.overallScore },
  { label: '技术栈', value: report.value?.techStackScore },
  { label: '项目经验', value: report.value?.projectExperienceScore },
  { label: '业务契合', value: report.value?.businessFitScore },
  { label: '沟通表达', value: report.value?.communicationScore }
])
const reportTrustTags = computed(() => {
  if (!report.value) return []
  const hasScore = Number.isFinite(Number(report.value.overallScore)) && Number(report.value.overallScore) > 0
  return [
    {
      label: report.value.evidenceSummary || '推荐来源待确认',
      type: trustStatusType(report.value.trustStatus, report.value.fallback ? 'warning' : 'info')
    },
    {
      label: report.value.resumeId ? '来自已绑定简历' : '尚未绑定简历',
      type: report.value.resumeId ? 'success' : 'warning'
    },
    {
      label: report.value.targetJobId ? '来自已绑定目标岗位' : '尚未绑定目标岗位',
      type: report.value.targetJobId ? 'success' : 'warning'
    },
    {
      label: report.value.jdAnalysisId ? '岗位分析已绑定' : '未绑定岗位分析记录',
      type: report.value.jdAnalysisId ? 'success' : 'info'
    },
    {
      label: report.value.aiCallLogId ? '处理记录已保存' : '处理记录待补充',
      type: report.value.aiCallLogId ? 'success' : 'warning'
    },
    {
      label: hasScore ? '评分可用' : '评分待确认',
      type: hasScore ? 'success' : 'warning'
    }
  ] as Array<{ label: string; type: 'success' | 'warning' | 'info' }>
})
const schemaWarningItems = computed(() => {
  const warnings = Array.isArray(report.value?.schemaWarnings) ? report.value.schemaWarnings : []
  return warnings.map((item, index) => {
    const warning = asRecord(item)
    const field = schemaWarningFieldLabel(String(warning?.field || ''), index)
    const message = schemaWarningMessage(String(warning?.message || '证据不足，建议复核。'))
    return {
      key: `${field}:${index}`,
      field,
      message
    }
  })
})
const matchTaskCenterQuery = computed(() => {
  if (!report.value) return {}
  return compactQuery({
    messageId: report.value.asyncMessageId || undefined,
    traceId: report.value.asyncTraceId || undefined,
    bizType: report.value.asyncBizType || RESUME_JOB_MATCH_TASK_BIZ_TYPE,
    bizId: report.value.asyncBizId || String(report.value.reportId || '')
  })
})
const diagnosticCopyText = computed(() => {
  if (!report.value) return ''
  const taskQuery = matchTaskCenterQuery.value
  const clue = report.value.asyncTraceId
    || report.value.asyncMessageId
    || report.value.asyncBizId
    || String(report.value.reportId || '')
  return [
    `报告状态：${statusLabel(report.value.status)}`,
    `处理线索：${clue || '--'}`,
    `任务入口：/agent/tasks?${new URLSearchParams(taskQuery).toString()}`,
    `失败原因：${toFriendlyMessage(report.value.errorMessage, '本次生成没有形成可直接使用的匹配报告，请重新生成。')}`,
    `来源状态：${trustStatusLabel(report.value.trustStatus, report.value.fallback)}`
  ].join('\n')
})

const statusTag = (status?: string) => status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'danger' : 'warning'
const statusLabel = (status?: string) => {
  const map: Record<string, string> = {
    SUCCESS: '已完成',
    FAILED: '生成失败',
    PROCESSING: '生成中',
    PENDING: '排队中'
  }
  return map[String(status || '').toUpperCase()] || '状态待确认'
}
const trustStatusType = (
  value?: string | null,
  fallback: 'success' | 'warning' | 'info' = 'info'
): 'success' | 'warning' | 'info' => {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'VERIFIED') return 'success'
  if (normalized === 'FALLBACK') return 'warning'
  if (normalized === 'PARTIAL') return 'info'
  return fallback
}
const trustStatusLabel = (value?: string | null, fallback?: boolean) => {
  const normalized = String(value || '').toUpperCase()
  const labels: Record<string, string> = {
    VERIFIED: '来源已记录',
    PARTIAL: '部分内容待复核',
    FALLBACK: '资料不完整'
  }
  if (normalized && labels[normalized]) return labels[normalized]
  return fallback ? '资料不完整' : '来源待确认'
}
const sourceTypeLabel = (value?: string | null) => {
  const normalized = String(value || '').toUpperCase()
  const labels: Record<string, string> = {
    RESUME_JOB_MATCH: '简历岗位匹配',
    JD_GAP: '岗位要求 / 能力短板',
    STUDY_PLAN: '学习计划',
    FALLBACK: '通用生成'
  }
  return labels[normalized] || '匹配报告'
}
const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const compactQuery = (query: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => Boolean(value))) as Record<string, string>
const schemaWarningMessage = (message: string) => {
  const map: Record<string, string> = {
    'missing summary filled': '报告摘要不完整，系统已先按可用内容整理成保守摘要。',
    'missing title filled': '报告标题不完整，系统已补成待确认标题。',
    'missing evidence marked for review': '来源依据不完整，已提醒人工复核。',
    'empty strength item skipped': '一条优势内容没有有效信息，已自动忽略。',
    'empty gap item skipped': '一条短板内容没有有效信息，已自动忽略。',
    'missing skillName filled': '技能名称不完整，系统已先标记为待确认技能。',
    'missing description filled': '说明内容不完整，系统已补充待复核说明。',
    'missing detail evidence fallback detail generated': '维度明细依据不足，系统已生成待确认项。',
    'generation failed before trusted match result': '本次没有形成可直接使用的匹配结果，请结合处理记录和处理线索处理。'
  }
  return map[message] || '报告中有部分内容需要复核，请结合摘要、维度明细和处理记录确认。'
}
const schemaWarningFieldLabel = (field: string, index: number) => {
  const normalized = field.trim()
  const labels: Record<string, string> = {
    summary: '报告摘要',
    title: '报告标题',
    strengths: '优势亮点',
    gaps: '短板差距',
    resumeRisks: '简历风险提示',
    optimizationSuggestions: '优化建议',
    recommendedLearningTopics: '学习建议',
    recommendedInterviewTopics: '面试重点',
    dimensionScores: '维度评分',
    evidence: '来源说明',
    trustStatus: '来源状态'
  }
  return labels[normalized] || `内容 ${index + 1}`
}

const matchDetailKeyLabels: Record<string, string> = {
  title: '标题',
  summary: '摘要',
  skillName: '技能',
  description: '说明',
  evidence: '来源说明',
  evidenceSummary: '来源摘要',
  reason: '原因',
  suggestion: '建议',
  action: '行动',
  priority: '优先级',
  score: '得分',
  overallScore: '综合得分',
  techStackScore: '技术匹配',
  projectExperienceScore: '项目经验',
  businessFitScore: '业务贴合',
  communicationScore: '表达准备',
  matchLevel: '匹配程度',
  dimension: '维度',
  risk: '风险',
  gap: '短板',
  gapDescription: '短板说明',
  strength: '优势',
  topic: '主题',
  createdAt: '创建时间',
  updatedAt: '更新时间'
}

const isStructuredMatchValue = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const matchDetailKeyLabel = (key: string) =>
  matchDetailKeyLabels[key] || '补充信息'

const stringify = (value: unknown, depth = 0): string => {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  const indent = '  '.repeat(depth)
  if (Array.isArray(value)) {
    if (!value.length) return ''
    return value
      .map((item, index) => `${indent}${index + 1}. ${isStructuredMatchValue(item) || Array.isArray(item) ? '\n' : ''}${stringify(item, depth + 1)}`)
      .filter(Boolean)
      .join('\n')
  }

  if (isStructuredMatchValue(value)) {
    return Object.entries(value)
      .map(([key, item]) => {
        const formatted = stringify(item, depth + 1)
        if (!formatted) return ''
        return `${indent}- ${matchDetailKeyLabel(key)}：${isStructuredMatchValue(item) || Array.isArray(item) ? '\n' : ''}${formatted}`
      })
      .filter(Boolean)
      .join('\n')
  }

  return String(value)
}

const DataBlock = defineComponent({
  props: { title: { type: String, required: true }, value: { type: null, required: false } },
  setup(props) {
    return () => h('article', { class: 'data-block' }, [
      h('h3', props.title),
      props.value ? h('pre', stringify(props.value)) : h(AppState, { type: 'empty', title: `暂无${props.title}`, description: '当前报告没有拆分出这一项，建议先查看报告摘要、维度明细，或重新生成报告。' })
    ])
  }
})

const loadReport = async (silent = false) => {
  if (!reportId.value) {
    loadError.value = '报告记录无效。'
    return
  }
  if (!silent) {
    loading.value = true
    loadError.value = ''
  }
  try {
    report.value = await getResumeJobMatchReportDetailApi(reportId.value)
    loadError.value = ''
    if (isTrackingReport.value) {
      scheduleReportPoll()
    } else {
      stopReportPoll()
    }
  } catch (error) {
    if (!silent) {
      report.value = null
      loadError.value = getErrorMessage(error, '读取匹配报告详情失败。')
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

const stopReportPoll = () => {
  if (reportPollTimer) {
    clearTimeout(reportPollTimer)
    reportPollTimer = undefined
  }
}

const scheduleReportPoll = () => {
  stopReportPoll()
  reportPollTimer = setTimeout(() => {
    void loadReport(true)
  }, 2500)
}

const generateProfile = async () => {
  if (!report.value) return
  if (!isTrustedSuccessReport.value) {
    ElMessage.warning('当前报告来源不完整或内容待复核，请先重新生成可直接使用的匹配报告。')
    return
  }
  profileGenerating.value = true
  try {
    const result = await generateSkillProfileApi({ matchReportId: report.value.reportId })
    ElMessage.success(result.status === 'FAILED' ? '能力画像生成返回失败状态' : '能力画像任务已提交')
    await router.push({ path: '/skill-profile', query: { profileId: result.profileId, matchReportId: report.value.reportId, targetJobId: report.value.targetJobId, resumeId: report.value.resumeId } })
  } finally {
    profileGenerating.value = false
  }
}

const regenerateReport = async () => {
  if (!report.value?.reportId) return
  regenerating.value = true
  try {
    const sourceReport = report.value
    const result = await regenerateResumeJobMatchReportApi(sourceReport.reportId)
    ElMessage.success(result.status === 'FAILED' ? '重新生成暂未形成可直接使用的报告，请查看详情' : '已重新提交匹配报告')
    if (result.reportId && result.reportId !== sourceReport.reportId) {
      await router.push({
        path: `/resume-match/${result.reportId}`,
        query: {
          resumeId: result.resumeId || sourceReport.resumeId,
          targetJobId: result.targetJobId || sourceReport.targetJobId
        }
      })
      return
    }
    await loadReport()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '重新生成匹配报告失败。'))
  } finally {
    regenerating.value = false
  }
}

const copyDiagnostic = async () => {
  if (!diagnosticCopyText.value) return
  try {
    await navigator.clipboard.writeText(diagnosticCopyText.value)
    ElMessage.success('处理线索已复制')
  } catch {
    ElMessage.warning('复制失败，可以从任务中心继续查看处理进度。')
  }
}

const goMatchTaskCenter = () => {
  router.push({
    path: '/agent/tasks',
    query: matchTaskCenterQuery.value
  })
}

onMounted(loadReport)
onBeforeUnmount(stopReportPoll)
</script>

<style scoped lang="scss">
.v3-page { display: flex; flex-direction: column; gap: 18px; }
.page-hero, .content-panel, .score-card { border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-card-bg); box-shadow: var(--app-shadow); }
.page-hero { display: flex; justify-content: space-between; gap: 18px; padding: 24px; }
.hero-kicker, .hero-actions, .section-head, .section-actions { display: flex; align-items: center; gap: 10px; }
.hero-kicker { color: var(--app-primary); font-size: 12px; font-weight: 700; text-transform: uppercase; }
h1, h2, h3, p { margin: 0; }
h1 { margin-top: 10px; font-size: 30px; }
p { margin-top: 8px; color: var(--app-text-muted); line-height: 1.7; }
.content-panel { padding: 20px; min-width: 0; }
.report-tracker { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.report-tracker h2 { margin-top: 12px; font-size: 18px; }
.report-tracker p { max-width: 640px; font-size: 13px; }
.tracker-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
.failure-panel { display: grid; gap: 16px; }
.failure-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.failure-actions h2 { font-size: 18px; }
.failure-buttons { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.diagnostic-list { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)); gap: 10px; margin: 0; }
.diagnostic-list div { min-width: 0; padding: 10px 12px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.22); }
.diagnostic-list dt { color: var(--app-text-muted); font-size: 12px; }
.diagnostic-list dd { margin: 6px 0 0; color: var(--app-text); overflow-wrap: anywhere; }
.score-grid { display: grid; grid-template-columns: repeat(5, minmax(130px, 1fr)); gap: 14px; }
.score-card { padding: 16px; }
.score-card span { color: var(--app-text-muted); font-size: 13px; }
.score-card strong { display: block; margin: 8px 0 12px; font-size: 28px; }
.trust-panel { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.trust-tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.schema-warning-panel { display: grid; gap: 14px; }
.schema-warning-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.schema-warning-list li { display: grid; grid-template-columns: minmax(120px, 220px) minmax(0, 1fr); gap: 12px; padding: 10px 12px; border: 1px solid var(--el-color-warning-light-5); border-radius: 8px; background: var(--el-color-warning-light-9); }
.schema-warning-list strong { color: var(--app-text); overflow-wrap: anywhere; }
.schema-warning-list span { color: var(--app-text-muted); line-height: 1.6; }
.detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 18px; }
.section-head { justify-content: space-between; margin-bottom: 16px; }
.section-actions { flex-wrap: wrap; justify-content: flex-end; }
.json-sections { display: grid; gap: 14px; }
.data-block { padding: 14px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.28); }
.data-block h3 { font-size: 15px; }
.data-block pre { margin: 10px 0 0; white-space: pre-wrap; color: var(--app-text); line-height: 1.7; }
.action-panel { display: flex; flex-direction: column; gap: 12px; align-self: start; }
@media (max-width: 1080px) { .score-grid, .detail-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 760px) {
  .page-hero,
  .detail-grid,
  .score-grid,
  .diagnostic-list,
  .schema-warning-list li {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .page-hero,
  .report-tracker,
  .failure-actions,
  .trust-panel {
    align-items: stretch;
  }

  .content-panel {
    padding: 16px;
  }

  .hero-actions,
  .section-head,
  .failure-buttons,
  .tracker-actions {
    display: grid;
    grid-template-columns: 1fr;
    justify-content: stretch;
  }

  .section-actions {
    justify-content: flex-start;
  }

  .hero-actions :deep(.el-button),
  .failure-buttons :deep(.el-button),
  .tracker-actions :deep(.el-button),
  .action-panel :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }

  .report-tracker,
  .failure-actions,
  .trust-panel {
    flex-direction: column;
  }

  .trust-tags {
    justify-content: flex-start;
  }
}
</style>
