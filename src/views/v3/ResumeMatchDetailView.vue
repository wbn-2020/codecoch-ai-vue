<template>
  <div class="arena arena-match-detail v3-page">
    <section class="page-hero">
      <div>
        <div class="hero-kicker"><FileChartColumn :size="16" /> 匹配报告</div>
        <h1>{{ report?.jobTitle || '匹配报告详情' }}</h1>
        <p>{{ report ? reportSubtitle : '读取匹配报告、失败原因与短板建议。' }}</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push({ path: '/resume-match', query: returnMatchQuery })"><ArrowLeft :size="16" /> 返回实验台</el-button>
        <el-button :loading="loading" @click="loadReport"><RefreshCw :size="16" /> 刷新</el-button>
      </div>
    </section>

    <section v-if="loading" class="content-panel"><AppState type="loading" title="正在读取报告" description="正在同步匹配报告详情。" /></section>
    <section v-else-if="loadError" class="content-panel">
      <AppState type="error" title="报告加载失败" :description="loadError"><el-button type="primary" @click="loadReport">重新加载</el-button></AppState>
    </section>
    <section v-else-if="!report" class="content-panel">
      <AppState
        type="empty"
        title="没有可验证的 JD 匹配报告"
        description="当前路由没有读到可展示的报告，页面不会补造匹配度、优势或差距。请回到实验台选择简历和 JD 后重新生成，或到任务中心查看是否仍在处理。"
      >
        <el-button type="primary" @click="router.push({ path: '/resume-match', query: returnMatchQuery })">回实验台生成报告</el-button>
        <el-button @click="goMatchTaskCenter">查看任务中心</el-button>
        <el-button plain @click="router.push('/questions/recommendations')">先练今日题组</el-button>
      </AppState>
    </section>

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
        <div class="repair-actions">
          <article v-for="item in failureRepairActions" :key="item.key">
            <strong>{{ item.title }}</strong>
            <p>{{ item.desc }}</p>
            <el-button size="small" :type="item.primary ? 'primary' : ''" :plain="!item.primary" :loading="item.key === 'regenerate' && regenerating" @click="runFailureRepairAction(item.key)">
              {{ item.action }}
            </el-button>
          </article>
        </div>
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

      <section v-if="isSuccessReport && report" class="arena-match-settlement">
        <header class="arena-match-settlement__head">
          <div>
            <span class="arena-match-settlement__kicker">第 3 关 · JD 匹配结算</span>
            <h2>{{ gapDetailCount ? `对账完成：还有 ${gapDetailCount} 个待补维度` : overviewConclusion.title }}</h2>
          </div>
          <span class="arena-match-settlement__status">{{ scoreEvidenceText }}</span>
        </header>

        <div class="arena-match-settlement__summary">
          <div
            class="arena-ring arena-match-settlement__ring"
            :style="{
              background: `conic-gradient(var(--arena-grn) 0 ${overallScorePercent}%, var(--arena-line) ${overallScorePercent}% 100%)`
            }"
          >
            <div class="arena-ring__hole">
              <b>{{ overallScoreText }}</b>
              <span>JD 覆盖率</span>
            </div>
          </div>

          <div class="arena-match-settlement__copy">
            <h3>{{ report.companyName || '目标岗位' }} · {{ report.jobTitle || '岗位待确认' }}</h3>
            <p>{{ overviewConclusion.desc }}</p>
            <small>{{ report.resumeTitle || '已绑定简历' }} · {{ reportResumeVersionLabel || '当前版本' }}</small>
            <div class="arena-match-settlement__trust">
              <el-tag v-for="tag in reportTrustTags.slice(0, 3)" :key="tag.label" :type="tag.type" effect="plain">
                {{ tag.label }}
              </el-tag>
            </div>
          </div>

          <aside class="arena-match-settlement__action">
            <span>推荐下一步</span>
            <strong>{{ primaryNextAction.title }}</strong>
            <p>{{ primaryNextAction.desc }}</p>
            <el-button
              type="primary"
              :disabled="primaryNextAction.disabled"
              :loading="primaryNextAction.key === 'profile' && profileGenerating"
              @click="runPrimaryNextAction"
            >
              {{ primaryNextAction.action }}
            </el-button>
            <el-button plain :disabled="!gapDetailCount || !isTrustedSuccessReport" @click="goGapQuestionGroup">
              补齐待补题组
            </el-button>
          </aside>
        </div>

        <div v-if="report.details?.length" class="arena-match-settlement__keywords">
          <section>
            <span>已形成匹配证据</span>
            <div>
              <el-tag v-for="item in coverageDetails.covered" :key="item.id" type="success" effect="plain">
                {{ detailKeywordLabel(item) }}
              </el-tag>
              <small v-if="!coverageDetails.covered.length">暂无可确认的高覆盖维度</small>
            </div>
          </section>
          <section>
            <span>待补维度</span>
            <div>
              <el-tag v-for="item in coverageDetails.gaps" :key="item.id" type="warning" effect="plain">
                {{ detailKeywordLabel(item) }}
              </el-tag>
              <small v-if="!coverageDetails.gaps.length">当前明细未标记待补维度</small>
            </div>
          </section>
        </div>
      </section>

      <section v-if="showReportOverview" class="report-overview">
        <article class="overview-main content-panel">
          <div class="overview-score">
            <span>综合匹配度</span>
            <strong>{{ overallScoreText }}</strong>
            <small>{{ scoreEvidenceText }}</small>
          </div>
          <div class="overview-conclusion">
            <el-tag :type="overviewConclusion.type" effect="plain">{{ overviewConclusion.label }}</el-tag>
            <h2>{{ overviewConclusion.title }}</h2>
            <p>{{ overviewConclusion.desc }}</p>
          </div>
        </article>

        <article class="overview-action content-panel">
          <span>下一步主行动</span>
          <h2>{{ primaryNextAction.title }}</h2>
          <p>{{ primaryNextAction.desc }}</p>
          <div class="overview-action__buttons">
            <el-button
              type="primary"
              :disabled="primaryNextAction.disabled"
              :loading="primaryNextAction.key === 'profile' && profileGenerating"
              @click="runPrimaryNextAction"
            >
              {{ primaryNextAction.action }}
            </el-button>
            <el-button plain :loading="regenerating" @click="regenerateReport">重新生成报告</el-button>
          </div>
        </article>

        <article v-for="item in reportInsightCards" :key="item.key" class="insight-card content-panel" :class="`insight-card--${item.tone}`">
          <span>{{ item.label }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </article>
      </section>

      <section v-if="isSuccessReport && hasAnyDimensionScore" class="score-grid">
        <article v-for="item in scoreCards" :key="item.label" class="score-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value ?? '--' }}</strong>
          <el-progress :percentage="Number(item.value || 0)" :stroke-width="8" :show-text="false" />
        </article>
      </section>

      <section v-if="isSuccessReport" class="content-panel trust-panel">
        <div>
          <h2>AI 推荐来源</h2>
          <p>{{ trustPanelDescription }}</p>
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
          <el-button :disabled="!isTrustedSuccessReport" @click="router.push({ path: '/skill-profile', query: { matchReportId: report.reportId, targetJobId: report.targetJobId, resumeId: report.resumeId, ...(report.resumeVersionId ? { resumeVersionId: report.resumeVersionId } : {}) } })">
            查看能力画像
          </el-button>
          <el-button :disabled="!canAccessResumeVersionPreview || !report.resumeId" @click="goReportResumeVersions">
            查看简历版本
          </el-button>
          <el-button
            :disabled="!isSuccessReport || !canAccessResumeVersionPreview || !report.resumeId"
            :loading="versionSaving"
            @click="saveReportAsResumeVersion"
          >
            <FileText :size="16" />
            保存报告建议为版本
          </el-button>
          <el-button
            :disabled="!isSuccessReport || !canAccessApplicationPreview || !report.targetJobId"
            :loading="applicationCreating"
            @click="createApplicationFromReport"
          >
            记录为投递进度
          </el-button>
          <el-button :disabled="!report.targetJobId" @click="goApplicationPackage">
            <PackageCheck :size="16" />
            查看岗位投递包
          </el-button>
          <el-button :disabled="!isTrustedSuccessReport" @click="router.push({ path: '/study-plans/from-gap', query: { matchReportId: report.reportId, targetJobId: report.targetJobId, resumeId: report.resumeId, ...(report.resumeVersionId ? { resumeVersionId: report.resumeVersionId } : {}) } })">
            <RouteIcon :size="16" /> 差距学习计划
          </el-button>
          <el-button :disabled="!isTrustedSuccessReport" @click="goGapQuestionGroup">
            练差距题组
          </el-button>
          <el-button :disabled="!isTrustedSuccessReport" @click="router.push({ path: '/interviews/create', query: { source: 'job-target', targetJobId: report.targetJobId, resumeId: report.resumeId, matchReportId: report.reportId, ...(report.resumeVersionId ? { resumeVersionId: report.resumeVersionId } : {}) } })">
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
        <div class="section-head">
          <div><h2>维度诊断</h2><p>按技能维度看风险、证据和下一步动作。</p></div>
        </div>
        <div v-if="report.details?.length" class="dimension-card-grid">
          <article v-for="item in report.details" :key="item.id" class="dimension-card">
            <div class="dimension-card__head">
              <div>
                <span>{{ item.dimension || '综合维度' }}</span>
                <h3>{{ item.skillName || '待确认技能' }}</h3>
              </div>
              <el-tag :type="dimensionTone(item.score)" effect="plain">{{ dimensionScoreText(item.score) }}</el-tag>
            </div>
            <p v-if="item.evidence" class="dimension-card__evidence">{{ item.evidence }}</p>
            <dl>
              <div>
                <dt>差距</dt>
                <dd>{{ item.gapDescription || '当前报告没有拆分出明确差距。' }}</dd>
              </div>
              <div>
                <dt>建议动作</dt>
                <dd>{{ item.suggestion || '结合报告摘要和推荐训练继续补充证据。' }}</dd>
              </div>
            </dl>
          </article>
        </div>
        <AppState v-else type="empty" title="暂无维度明细" description="当前报告暂无维度明细。" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ArrowLeft, FileChartColumn, FileText, PackageCheck, Radar, RefreshCw, Route as RouteIcon } from 'lucide-vue-next'
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getResumeJobMatchReportDetailApi, regenerateResumeJobMatchReportApi } from '@/api/resumeJobMatch'
import { generateSkillProfileApi } from '@/api/skillProfile'
import { createApplicationApi, createResumeVersionApi, getApplicationsApi } from '@/api/v4'
import AppState from '@/components/common/AppState.vue'
import AiResultFeedback from '@/components/feedback/AiResultFeedback.vue'
import { appConfig } from '@/config'
import { useGameProfileStore } from '@/features/game-profile'
import type { ResumeJobMatchDetailItemVO, ResumeJobMatchReportDetailVO } from '@/types/resumeJobMatch'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'
import { redactSensitiveText } from '@/utils/sensitiveText'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const profileGenerating = ref(false)
const regenerating = ref(false)
const versionSaving = ref(false)
const applicationCreating = ref(false)
const loadError = ref('')
const report = ref<ResumeJobMatchReportDetailVO | null>(null)
const gameProfile = useGameProfileStore()
let reportPollTimer: ReturnType<typeof setTimeout> | undefined
let reportPollRetryCount = 0
let reportPollFailureNoticeShown = false
const RESUME_JOB_MATCH_TASK_BIZ_TYPE = 'resume-job-match.analyze'
const REPORT_POLL_INTERVAL_MS = 2500
const REPORT_POLL_MAX_RETRY_DELAY_MS = 10000

type OverviewTone = 'success' | 'warning' | 'info' | 'danger'
type PrimaryActionKey = 'regenerate' | 'study-plan' | 'project-evidence' | 'interview' | 'profile'

function firstReadableSnippet(value: unknown, fallback = ''): string {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = firstReadableSnippet(item)
      if (text) return text
    }
    return fallback
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const direct = firstReadableSnippet(
      record.title
        || record.summary
        || record.description
        || record.gapDescription
        || record.suggestion
        || record.evidence
        || record.reason
        || record.action
        || record.topic
        || record.skillName
    )
    if (direct) return direct
    for (const item of Object.values(record)) {
      const text = firstReadableSnippet(item)
      if (text) return text
    }
  }
  return fallback
}

const hasUsableScore = (value: unknown) => {
  const score = Number(value)
  return Number.isFinite(score) && score > 0
}

const dimensionScoreText = (value?: number) => hasUsableScore(value) ? `${value} 分` : '待确认'
const dimensionTone = (value?: number) => {
  if (!hasUsableScore(value)) return 'info'
  if (Number(value) >= 80) return 'success'
  if (Number(value) >= 60) return 'warning'
  return 'danger'
}

const reportId = computed(() => Number(route.params.id) || 0)
const isTrackingReport = computed(() => {
  const status = report.value?.status
  return status === 'PENDING' || status === 'PROCESSING'
})
const isSuccessReport = computed(() => report.value?.status === 'SUCCESS')
const isUnscorableReport = computed(() => {
  const status = String(report.value?.status || '').toUpperCase()
  return status === 'UNSCORABLE' || status === 'NO_SCORE'
})
const isTrustedSuccessReport = computed(() =>
  isSuccessReport.value
  && !report.value?.fallback
  && String(report.value?.trustStatus || '').toUpperCase() === 'VERIFIED'
  && !schemaWarningItems.value.length
)
const canAccessResumeVersionPreview = computed(() => appConfig.enableV4ExperimentalRoutes)
const canAccessApplicationPreview = computed(() => appConfig.enableV4ExperimentalRoutes)
const actionPanelHint = computed(() => {
  if (!isSuccessReport.value) return '报告成功后才会开放能力画像、学习计划和岗位面试。'
  if (!isTrustedSuccessReport.value) return '当前报告只适合查看和确认；建议重新生成可直接使用的报告后再继续训练。'
  return '基于该报告继续生成能力画像或差距学习计划。'
})
const returnMatchQuery = computed(() => {
  const current = report.value
  if (current) {
    return compactQuery({
      resumeId: current.resumeId ? String(current.resumeId) : undefined,
      targetJobId: current.targetJobId ? String(current.targetJobId) : undefined,
      resumeVersionId: current.resumeVersionId ? String(current.resumeVersionId) : undefined
    })
  }
  return compactQuery({
    resumeId: typeof route.query.resumeId === 'string' ? route.query.resumeId : undefined,
    targetJobId: typeof route.query.targetJobId === 'string' ? route.query.targetJobId : undefined,
    resumeVersionId: typeof route.query.resumeVersionId === 'string' ? route.query.resumeVersionId : undefined
  })
})
const reportResumeVersionLabel = computed(() => {
  const current = report.value
  if (!current?.resumeVersionId) return ''
  return current.resumeVersionName
    || (current.resumeVersionNo ? `V${current.resumeVersionNo}` : `版本 ${current.resumeVersionId}`)
})
const reportSubtitle = computed(() => {
  if (!report.value) return ''
  return [
    report.value.resumeTitle || '已绑定简历',
    reportResumeVersionLabel.value,
    report.value.companyName || '--'
  ].filter(Boolean).join(' · ')
})
const trustPanelDescription = computed(() =>
  report.value?.resumeVersionId
    ? '这份匹配报告已绑定简历版本快照、目标岗位描述和岗位分析结果；如果来源或明细不完整，后续建议会先标记为待复核。'
    : '这份匹配报告基于当前简历、目标岗位描述和岗位分析结果生成；如果来源或明细不完整，后续建议会先标记为待复核。'
)
const showReportOverview = computed(() => Boolean(report.value && (isSuccessReport.value || isUnscorableReport.value)))
const overallScoreText = computed(() => {
  const score = report.value?.overallScore
  return hasUsableScore(score) ? `${score}` : '未形成评分'
})
const overallScorePercent = computed(() => {
  const score = Number(report.value?.overallScore)
  return Number.isFinite(score) && score > 0 ? Math.min(100, Math.max(0, score)) : 0
})
const detailKeywordLabel = (item: ResumeJobMatchDetailItemVO) =>
  item.skillName || item.dimension || '待确认维度'
const coverageDetails = computed(() => {
  const details = report.value?.details || []
  return {
    covered: details
      .filter((item) => hasUsableScore(item.score) && Number(item.score) >= 75)
      .slice(0, 6),
    gaps: details
      .filter((item) => Boolean(item.gapDescription?.trim()) || (hasUsableScore(item.score) && Number(item.score) < 75))
      .slice(0, 6)
  }
})
const gapDetailCount = computed(() => (report.value?.details || []).filter(
  (item) => Boolean(item.gapDescription?.trim()) || (hasUsableScore(item.score) && Number(item.score) < 75)
).length)
const scoreEvidenceText = computed(() => {
  if (isUnscorableReport.value) return '本次报告未形成可信评分，页面不会补造分数。'
  if (!isSuccessReport.value) return '报告生成完成后才会显示评分。'
  if (!hasUsableScore(report.value?.overallScore)) return '后端未返回可信综合分，页面不会补造分数。'
  return trustStatusLabel(report.value?.trustStatus, report.value?.fallback)
})
const overviewConclusion = computed((): { label: string; title: string; desc: string; type: OverviewTone } => {
  if (isUnscorableReport.value) {
    return {
      label: '不可评分',
      title: '本次报告没有形成可信匹配分',
      desc: '可以先查看已返回的线索；若要进入训练闭环，建议补齐简历项目或岗位 JD 后重新生成。',
      type: 'warning'
    }
  }
  if (!isSuccessReport.value) {
    return {
      label: statusLabel(report.value?.status),
      title: '报告还不能给出匹配结论',
      desc: '等待报告生成完成，或根据失败原因重新生成。',
      type: 'info'
    }
  }
  if (!isTrustedSuccessReport.value) {
    return {
      label: '需要复核',
      title: '先不要把这份报告当作投递结论',
      desc: '当前报告来源不完整或存在待确认内容，适合查看线索，但不建议直接进入投递或训练闭环。',
      type: 'warning'
    }
  }
  const summary = firstReadableSnippet(report.value?.summary)
  return {
    label: '可用于决策',
    title: hasUsableScore(report.value?.overallScore) ? '这份报告已形成综合匹配判断' : '这份报告已完成，但未返回综合评分',
    desc: summary || '后端未返回一句话总结，请继续查看优势、差距、风险和维度明细。',
    type: hasUsableScore(report.value?.overallScore) ? 'success' : 'info'
  }
})
const primaryNextAction = computed((): {
  key: PrimaryActionKey
  title: string
  desc: string
  action: string
  disabled: boolean
} => {
  if (!isSuccessReport.value || !isTrustedSuccessReport.value) {
    return {
      key: 'regenerate',
      title: '先恢复一份可信报告',
      desc: '当前报告还不适合继续生成能力画像、面试或学习计划。',
      action: '重新生成报告',
      disabled: false
    }
  }
  if (firstReadableSnippet(report.value?.gaps)) {
    return {
      key: 'study-plan',
      title: '把差距转成学习计划',
      desc: '报告已经拆分出差距项，适合进入差距学习计划。',
      action: '生成学习计划',
      disabled: false
    }
  }
  if (firstReadableSnippet(report.value?.resumeRisks)) {
    return {
      key: 'project-evidence',
      title: '先补项目证据',
      desc: '报告识别到简历风险，建议先补项目证据再继续投递。',
      action: '补项目证据',
      disabled: false
    }
  }
  if (report.value?.targetJobId && report.value?.resumeId) {
    return {
      key: 'interview',
      title: '进入岗位面试验证',
      desc: '报告没有拆分出明确差距或风险时，可以用一次岗位面试验证表达和追问准备度。',
      action: '创建岗位面试',
      disabled: false
    }
  }
  return {
    key: 'profile',
    title: '沉淀能力画像',
    desc: '当前报告可以先沉淀为能力画像，作为后续训练依据。',
    action: '生成能力画像',
    disabled: !isTrustedSuccessReport.value
  }
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
    { label: '简历版本', value: reportResumeVersionLabel.value || '--' },
    { label: '目标岗位', value: report.value.targetJobId ? '已绑定' : '--' },
    { label: '更新时间', value: report.value.updatedAt ? formatDateTime(report.value.updatedAt) : '--' }
  ]
})
const failureRepairActions = computed(() => {
  if (!report.value) return []
  const hasResume = Boolean(report.value.resumeId)
  const hasTarget = Boolean(report.value.targetJobId)
  return [
    {
      key: 'project',
      title: '补项目证据',
      desc: hasResume
        ? '补齐项目背景、个人职责、技术难点和量化结果，再重新生成匹配报告。'
        : '当前报告没有绑定简历，请先回到简历中心确认使用的简历。',
      action: hasResume ? '去补项目经历' : '查看简历中心',
      primary: false
    },
    {
      key: 'job-analysis',
      title: '复核岗位分析',
      desc: hasTarget
        ? '确认岗位描述已结构化分析，避免岗位字段缺失导致匹配被拦截。'
        : '当前报告没有绑定目标岗位，请先维护岗位目标。',
      action: hasTarget ? '查看岗位分析' : '查看岗位目标',
      primary: false
    },
    {
      key: 'regenerate',
      title: '重新生成报告',
      desc: '资料补齐后再生成一次，系统会继续保留处理记录和失败原因。',
      action: '重新生成',
      primary: true
    },
    {
      key: 'task',
      title: '查看处理进度',
      desc: '如果刚刚重新提交，可到任务中心查看排队、失败原因和关联记录。',
      action: '任务中心',
      primary: false
    }
  ] as Array<{ key: string; title: string; desc: string; action: string; primary: boolean }>
})
const scoreCards = computed(() => [
  { label: '综合匹配', value: report.value?.overallScore },
  { label: '技术栈', value: report.value?.techStackScore },
  { label: '项目经验', value: report.value?.projectExperienceScore },
  { label: '业务契合', value: report.value?.businessFitScore },
  { label: '沟通表达', value: report.value?.communicationScore }
])
const hasAnyDimensionScore = computed(() => scoreCards.value.some((item) => hasUsableScore(item.value)))
const reportInsightCards = computed(() => [
  {
    key: 'strength',
    label: '优势',
    title: firstReadableSnippet(report.value?.strengths, '报告未拆分出明确优势'),
    desc: firstReadableSnippet(report.value?.strengths)
      ? '来自报告的优势字段，建议在简历和面试开场中优先表达。'
      : '可以继续查看维度明细，或重新生成一份结构更完整的报告。',
    tone: firstReadableSnippet(report.value?.strengths) ? 'success' : 'neutral'
  },
  {
    key: 'gap',
    label: '差距',
    title: firstReadableSnippet(report.value?.gaps, '报告未拆分出明确差距'),
    desc: firstReadableSnippet(report.value?.gaps)
      ? '来自报告的差距字段，可转入学习计划或题库训练。'
      : '没有后端字段时不补造差距结论。',
    tone: firstReadableSnippet(report.value?.gaps) ? 'warning' : 'neutral'
  },
  {
    key: 'risk',
    label: '风险',
    title: firstReadableSnippet(report.value?.resumeRisks, '报告未拆分出简历风险'),
    desc: firstReadableSnippet(report.value?.resumeRisks)
      ? '来自报告的风险字段，建议先补项目证据或简历表达。'
      : '没有风险字段时不默认判定为可投递。',
    tone: firstReadableSnippet(report.value?.resumeRisks) ? 'danger' : 'neutral'
  }
] as Array<{ key: string; label: string; title: string; desc: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }>)
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
    ...(report.value.resumeVersionId
      ? [{
          label: `基于${reportResumeVersionLabel.value || '简历版本'}`,
          type: 'success'
        }]
      : []),
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
    `失败原因：${redactSensitiveText(toFriendlyMessage(report.value.errorMessage, '本次生成没有形成可直接使用的匹配报告，请重新生成。'), 160)}`,
    `来源状态：${trustStatusLabel(report.value.trustStatus, report.value.fallback)}`
  ].join('\n')
})

const statusTag = (status?: string) => status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'danger' : 'warning'
const statusLabel = (status?: string) => {
  const map: Record<string, string> = {
    SUCCESS: '已完成',
    FAILED: '生成失败',
    PROCESSING: '生成中',
    PENDING: '排队中',
    UNSCORABLE: '不可评分',
    NO_SCORE: '未形成评分'
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
      props.value
        ? h('details', { class: 'data-block__details' }, [
            h('summary', '查看技术明细'),
            h('pre', stringify(props.value))
          ])
        : h(AppState, { type: 'empty', title: `暂无${props.title}`, description: '当前报告没有拆分出这一项，建议先查看报告摘要、维度诊断，或重新生成报告。' })
    ])
  }
})

const grantTrustedReportXp = () => {
  const current = report.value
  if (!current?.reportId || !isTrustedSuccessReport.value) return
  gameProfile.grantXpOnce('jd_cover_boost', `resume-match-report:${current.reportId}:jd-cover-boost`)
}

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
    grantTrustedReportXp()
    reportPollRetryCount = 0
    reportPollFailureNoticeShown = false
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
    } else if (isTrackingReport.value) {
      reportPollRetryCount += 1
      if (!reportPollFailureNoticeShown) {
        reportPollFailureNoticeShown = true
        ElMessage.warning('报告生成进度暂时中断，正在继续重试。')
      }
      scheduleReportPoll(nextReportPollDelay())
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

const nextReportPollDelay = () =>
  Math.min(REPORT_POLL_MAX_RETRY_DELAY_MS, REPORT_POLL_INTERVAL_MS * Math.max(1, reportPollRetryCount))

const scheduleReportPoll = (delay = REPORT_POLL_INTERVAL_MS) => {
  stopReportPoll()
  reportPollTimer = setTimeout(() => {
    void loadReport(true)
  }, delay)
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
    await router.push({
      path: '/skill-profile',
      query: {
        profileId: result.profileId,
        matchReportId: report.value.reportId,
        targetJobId: report.value.targetJobId,
        resumeId: report.value.resumeId,
        ...(report.value.resumeVersionId ? { resumeVersionId: report.value.resumeVersionId } : {})
      }
    })
  } finally {
    profileGenerating.value = false
  }
}

const runPrimaryNextAction = () => {
  if (!report.value) return
  const action = primaryNextAction.value
  if (action.key === 'regenerate') {
    void regenerateReport()
    return
  }
  if (action.key === 'study-plan') {
    router.push({
      path: '/study-plans/from-gap',
      query: {
        matchReportId: report.value.reportId,
        targetJobId: report.value.targetJobId,
        resumeId: report.value.resumeId,
        ...(report.value.resumeVersionId ? { resumeVersionId: report.value.resumeVersionId } : {})
      }
    })
    return
  }
  if (action.key === 'project-evidence') {
    router.push({
      path: '/project-evidence',
      query: {
        resumeId: report.value.resumeId,
        matchReportId: report.value.reportId,
        ...(report.value.resumeVersionId ? { resumeVersionId: report.value.resumeVersionId } : {})
      }
    })
    return
  }
  if (action.key === 'interview') {
    router.push({
      path: '/interviews/create',
      query: {
        source: 'job-target',
        targetJobId: report.value.targetJobId,
        resumeId: report.value.resumeId,
        matchReportId: report.value.reportId,
        ...(report.value.resumeVersionId ? { resumeVersionId: report.value.resumeVersionId } : {})
      }
    })
    return
  }
  void generateProfile()
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
          targetJobId: result.targetJobId || sourceReport.targetJobId,
          ...(result.resumeVersionId || sourceReport.resumeVersionId
            ? { resumeVersionId: result.resumeVersionId || sourceReport.resumeVersionId }
            : {})
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

const goGapQuestionGroup = () => {
  if (!report.value) return
  router.push({
    path: '/questions/recommendations',
    query: compactQuery({
      source: 'resumeMatchReport',
      matchReportId: report.value.reportId ? String(report.value.reportId) : undefined,
      targetJobId: report.value.targetJobId ? String(report.value.targetJobId) : undefined,
      resumeId: report.value.resumeId ? String(report.value.resumeId) : undefined,
      resumeVersionId: report.value.resumeVersionId ? String(report.value.resumeVersionId) : undefined
    })
  })
}

const goApplicationPackage = () => {
  if (!report.value?.targetJobId) return
  router.push({
    path: '/application-packages/preview',
    query: compactQuery({
      targetJobId: report.value.targetJobId ? String(report.value.targetJobId) : undefined,
      jdAnalysisId: report.value.jdAnalysisId ? String(report.value.jdAnalysisId) : undefined,
      resumeVersionId: report.value.resumeVersionId ? String(report.value.resumeVersionId) : undefined,
      matchReportId: report.value.reportId ? String(report.value.reportId) : undefined,
      jobTitle: report.value.jobTitle || undefined,
      companyName: report.value.companyName || undefined,
      jdSource: 'JD 匹配报告'
    })
  })
}

const goReportResumeVersions = () => {
  if (!report.value?.resumeId) return
  router.push(`/resumes/${report.value.resumeId}/versions`)
}

const saveReportAsResumeVersion = async () => {
  if (!report.value?.resumeId || !report.value?.reportId) return
  if (!isSuccessReport.value) {
    ElMessage.warning('报告成功后才能沉淀为简历版本。')
    return
  }
  versionSaving.value = true
  try {
    const versionName = `匹配报告 ${report.value.reportId} 建议快照`
    await createResumeVersionApi(report.value.resumeId, {
      versionName,
      sourceType: 'RESUME_JOB_MATCH',
      sourceId: report.value.reportId
    })
    ElMessage.success('已保存为简历版本，可继续对比、复制或应用。')
    await router.push(`/resumes/${report.value.resumeId}/versions`)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '保存简历版本失败，请稍后重试。'))
  } finally {
    versionSaving.value = false
  }
}

const existingApplicationForReport = async (matchReportId: number) => {
  try {
    const applications = await getApplicationsApi()
    return applications.find((item) => item.matchReportId === matchReportId)
  } catch {
    return undefined
  }
}

const createApplicationFromReport = async () => {
  if (!report.value?.reportId || !report.value?.targetJobId) return
  applicationCreating.value = true
  try {
    const existingApplication = await existingApplicationForReport(report.value.reportId)
    if (existingApplication) {
      ElMessage.success('该匹配报告已有投递进度，已为你打开进度列表。')
      await router.push('/applications')
      return
    }
    const application = await createApplicationApi({
      targetJobId: report.value.targetJobId,
      resumeVersionId: report.value.resumeVersionId,
      matchReportId: report.value.reportId,
      companyName: report.value.companyName,
      jobTitle: report.value.jobTitle || 'Untitled Job',
      source: 'RESUME_JOB_MATCH',
      status: 'SAVED',
      note: `来自匹配报告 ${report.value.reportId}`
    })
    ElMessage.success(application?.id ? '已记录到投递进度' : '已打开投递进度')
    await router.push('/applications')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '记录投递进度失败。'))
  } finally {
    applicationCreating.value = false
  }
}

const runFailureRepairAction = (key: string) => {
  if (!report.value) return
  if (key === 'project') {
    router.push(report.value.resumeId
      ? {
          path: '/project-evidence',
          query: {
            resumeId: report.value.resumeId,
            matchReportId: report.value.reportId,
            ...(report.value.resumeVersionId ? { resumeVersionId: report.value.resumeVersionId } : {})
          }
        }
      : { path: '/resumes' }
    )
    return
  }
  if (key === 'job-analysis') {
    router.push(report.value.targetJobId ? `/job-targets/${report.value.targetJobId}/analysis` : '/job-targets')
    return
  }
  if (key === 'regenerate') {
    void regenerateReport()
    return
  }
  goMatchTaskCenter()
}

onMounted(loadReport)
onBeforeUnmount(stopReportPoll)
</script>

<style scoped lang="scss">
.v3-page { display: flex; flex-direction: column; gap: 16px; }
.page-hero, .content-panel { border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.58); }
.page-hero { display: flex; justify-content: space-between; gap: 16px; padding: 16px; }
.hero-kicker, .hero-actions, .section-head, .section-actions { display: flex; align-items: center; gap: 10px; }
.hero-kicker { color: var(--app-primary); font-size: 12px; font-weight: 700; text-transform: uppercase; }
h1, h2, h3, p { margin: 0; }
h1 { margin-top: 8px; font-size: 26px; }
p { margin-top: 8px; color: var(--app-text-muted); line-height: 1.7; }
.content-panel { padding: 16px; min-width: 0; }
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
.repair-actions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.repair-actions article { display: grid; gap: 8px; align-content: start; padding: 12px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.24); }
.repair-actions strong { font-size: 14px; }
.repair-actions p { margin: 0; font-size: 12px; line-height: 1.6; }
.report-overview { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr); gap: 14px; align-items: stretch; }
.overview-main { display: grid; grid-template-columns: minmax(150px, 0.34fr) minmax(0, 0.66fr); gap: 16px; align-items: center; background: rgba(30, 64, 175, 0.12); }
.overview-score { display: grid; gap: 6px; padding: 18px; border: 1px solid rgba(37, 99, 235, 0.28); border-radius: 8px; background: rgba(15, 23, 42, 0.24); }
.overview-score span, .overview-score small, .overview-action span, .insight-card span { color: var(--app-text-muted); font-size: 12px; }
.overview-score strong { font-size: 34px; line-height: 1.05; overflow-wrap: anywhere; }
.overview-score small { line-height: 1.5; }
.overview-conclusion { min-width: 0; }
.overview-conclusion h2 { margin-top: 10px; font-size: 22px; line-height: 1.3; overflow-wrap: anywhere; }
.overview-conclusion p, .overview-action p, .insight-card p { overflow-wrap: anywhere; }
.overview-action { display: grid; gap: 10px; align-content: center; background: rgba(22, 163, 74, 0.08); }
.overview-action h2 { font-size: 19px; line-height: 1.35; overflow-wrap: anywhere; }
.overview-action__buttons { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
.overview-action__buttons :deep(.el-button) { margin-left: 0; }
.insight-card { display: grid; gap: 8px; align-content: start; box-shadow: none; }
.insight-card h3 { font-size: 16px; line-height: 1.4; overflow-wrap: anywhere; }
.insight-card--success { border-color: rgba(22, 163, 74, 0.34); background: rgba(22, 163, 74, 0.07); }
.insight-card--warning { border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.08); }
.insight-card--danger { border-color: rgba(239, 68, 68, 0.34); background: rgba(239, 68, 68, 0.07); }
.insight-card--neutral { background: rgba(15, 23, 42, 0.2); }
.score-grid { display: grid; grid-template-columns: repeat(5, minmax(130px, 1fr)); overflow: hidden; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.42); }
.score-card { padding: 12px 14px; border-right: 1px solid var(--app-border); background: transparent; box-shadow: none; }
.score-card:last-child { border-right: 0; }
.score-card span { color: var(--app-text-muted); font-size: 13px; }
.score-card strong { display: block; margin: 6px 0 10px; font-size: 24px; }
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
.data-block__details { margin-top: 10px; }
.data-block__details summary { cursor: pointer; color: var(--app-primary); font-size: 13px; font-weight: 700; }
.data-block pre { margin: 10px 0 0; white-space: pre-wrap; color: var(--app-text); line-height: 1.7; }
.dimension-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.dimension-card { min-width: 0; padding: 16px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.22); }
.dimension-card__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.dimension-card__head span { color: var(--app-text-muted); font-size: 12px; }
.dimension-card__head h3 { margin-top: 4px; font-size: 16px; line-height: 1.35; overflow-wrap: anywhere; }
.dimension-card__evidence { margin-top: 12px; padding: 10px 12px; border-radius: 8px; background: rgba(37, 99, 235, 0.08); font-size: 13px; }
.dimension-card dl { display: grid; gap: 10px; margin: 12px 0 0; }
.dimension-card dt { color: var(--app-text-muted); font-size: 12px; }
.dimension-card dd { margin: 4px 0 0; color: var(--app-text); line-height: 1.65; overflow-wrap: anywhere; }
.action-panel { display: flex; flex-direction: column; gap: 12px; align-self: start; }
@media (max-width: 1080px) { .score-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .score-card:nth-child(3) { border-right: 0; } .score-card:nth-child(-n + 3) { border-bottom: 1px solid var(--app-border); } .detail-grid, .report-overview { grid-template-columns: 1fr 1fr; } .overview-main { grid-column: 1 / -1; } }
@media (max-width: 760px) {
  .page-hero,
  .detail-grid,
  .score-grid,
  .report-overview,
  .overview-main,
  .dimension-card-grid,
  .diagnostic-list,
  .repair-actions,
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

  .score-card,
  .score-card:nth-child(3) {
    border-right: 0;
    border-bottom: 1px solid var(--app-border);
  }

  .score-card:last-child {
    border-bottom: 0;
  }

  .hero-actions,
  .section-head,
  .failure-buttons,
  .tracker-actions,
  .overview-action__buttons {
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
  .overview-action__buttons :deep(.el-button),
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

// 方向 D · JD 匹配结算详情。保留报告证据、重跑和训练动作，只统一视觉层级。
.arena-match-detail {
  width: min(1060px, 100%);
  margin: 0 auto;
  padding: 28px 24px 46px;
  gap: 16px;

  .page-hero,
  .content-panel,
  .report-tracker,
  .report-overview > *,
  .score-card,
  .dimension-card,
  .insight-card,
  .data-block,
  .action-panel,
  .failure-panel {
    border-color: var(--arena-line);
    border-radius: var(--arena-radius-card);
    background: #ffffff;
    box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
  }

  .arena-match-settlement {
    display: grid;
    gap: 18px;
    padding: 22px;
    border: 1.5px solid #b9e7cd;
    border-radius: var(--arena-radius-card);
    background: linear-gradient(135deg, #f0fbf4, #ffffff 76%);
    box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
  }

  .arena-match-settlement__head,
  .arena-match-settlement__summary,
  .arena-match-settlement__keywords,
  .arena-match-settlement__keywords section,
  .arena-match-settlement__trust {
    display: flex;
  }

  .arena-match-settlement__head {
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;

    h2 {
      margin: 5px 0 0;
      color: var(--arena-ink);
      font-size: 22px;
      font-weight: 900;
      line-height: 1.3;
    }
  }

  .arena-match-settlement__kicker {
    color: var(--arena-grn-d);
    font-size: 12px;
    font-weight: 800;
  }

  .arena-match-settlement__status {
    flex: none;
    max-width: 280px;
    color: var(--arena-sub);
    font-size: 12px;
    line-height: 1.55;
    text-align: right;
  }

  .arena-match-settlement__summary {
    align-items: center;
    gap: 18px;
    padding: 18px;
    border: 1.5px solid var(--arena-line);
    border-radius: 16px;
    background: #ffffff;
  }

  .arena-match-settlement__ring {
    flex: none;
    width: 116px;
    height: 116px;

    .arena-ring__hole {
      width: 88px;
      height: 88px;

      b {
        font-size: 28px;
      }

      span {
        color: var(--arena-sub);
        font-size: 10px;
        font-weight: 800;
      }
    }
  }

  .arena-match-settlement__copy {
    display: grid;
    flex: 1 1 auto;
    gap: 7px;
    min-width: 0;

    h3 {
      margin: 0;
      color: var(--arena-ink);
      font-size: 16px;
      font-weight: 900;
    }

    p,
    small {
      margin: 0;
      color: var(--arena-sub);
      line-height: 1.55;
    }

    p {
      font-size: 13px;
    }

    small {
      font-size: 11px;
    }
  }

  .arena-match-settlement__trust {
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
  }

  .arena-match-settlement__action {
    display: grid;
    flex: 0 0 230px;
    gap: 8px;
    padding: 14px;
    border: 1.5px solid #b9e7cd;
    border-radius: 14px;
    background: #f5fcf7;

    > span {
      color: var(--arena-grn-d);
      font-size: 11px;
      font-weight: 800;
    }

    strong {
      color: var(--arena-ink);
      font-size: 14px;
    }

    p {
      margin: 0;
      color: var(--arena-sub);
      font-size: 12px;
      line-height: 1.55;
    }

    :deep(.el-button) {
      width: 100%;
      margin-left: 0;
    }
  }

  .arena-match-settlement__keywords {
    gap: 12px;

    section {
      flex: 1 1 0;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
      padding: 13px 14px;
      border: 1.5px solid var(--arena-line);
      border-radius: 14px;
      background: #ffffff;

      > span {
        color: var(--arena-sub);
        font-size: 11px;
        font-weight: 800;
      }

      > div {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      small {
        color: var(--arena-mut);
        font-size: 11px;
      }
    }
  }

  .page-hero {
    border: 1.5px solid #b9e7cd;
    background: linear-gradient(135deg, #f0fbf4, #ffffff 72%);
  }

  h1,
  h2,
  h3,
  strong {
    color: var(--arena-ink);
  }

  h1 {
    font-size: 28px;
    font-weight: 900;
  }

  p,
  .hero-kicker,
  .score-card span,
  .dimension-card__head span,
  .report-tracker p,
  .overview-score span,
  .overview-score small,
  .overview-action span,
  .insight-card span,
  .schema-warning-list span,
  .dimension-card dt {
    color: var(--arena-sub);
  }

  .hero-kicker {
    color: var(--arena-grn-d);
    font-weight: 800;
  }

  .overview-main,
  .overview-score {
    border-color: #b9e7cd;
    background: linear-gradient(135deg, #f0fbf4, #ffffff 72%);
  }

  .overview-score strong {
    color: var(--arena-grn-d);
  }

  .overview-action,
  .insight-card--success {
    border-color: #b9e7cd;
    background: #f5fcf7;
  }

  .insight-card--warning,
  .failure-panel {
    border-color: #f3ddc0;
    background: #fffaf2;
  }

  .insight-card--danger {
    border-color: #f4c3c5;
    background: #fff6f6;
  }

  .insight-card--neutral,
  .data-block,
  .dimension-card,
  .repair-actions article {
    background: #f8faf8;
  }

  .score-grid {
    border-color: var(--arena-line);
    border-radius: 14px;
    background: #ffffff;
  }

  .score-card {
    background: transparent;

    strong {
      color: var(--arena-grn-d);
    }
  }

  .dimension-card__evidence {
    background: var(--arena-grn-soft);
  }

  :deep(.el-button--primary) {
    border-color: var(--arena-grn);
    background: var(--arena-grn);
    box-shadow: 0 4px 0 var(--arena-grn-d);
    font-weight: 800;
  }
}

@media (max-width: 760px) {
  .arena-match-detail {
    padding: 16px 14px calc(28px + var(--user-mobile-nav-height, 0px));

    .arena-match-settlement__head,
    .arena-match-settlement__summary {
      align-items: stretch;
      flex-direction: column;
    }

    .arena-match-settlement__status {
      max-width: none;
      text-align: left;
    }

    .arena-match-settlement__ring {
      align-self: center;
    }

    .arena-match-settlement__action {
      flex-basis: auto;
    }

    .arena-match-settlement__keywords {
      flex-direction: column;
    }
  }
}
</style>
