<template>
  <div class="resume-job-hub">
    <section class="hub-hero">
      <div class="hero-copy hero-card">
        <div class="hero-kicker">
          <FileText :size="16" />
          简历实验室
        </div>
        <h1>把简历、JD 和项目证据放在一张实验台上</h1>
        <p>
          先确认当前简历和目标岗位，再根据真实匹配报告、关键词覆盖和项目经历，决定下一步该补证据、改表达，还是进入训练。
        </p>
        <div class="hero-actions">
          <el-button class="primary-action" type="primary" size="large" @click="goPrimaryAction">
            <Sparkles :size="17" />
            {{ primaryAction.label }}
          </el-button>
          <el-button size="large" @click="router.push('/resume-match')">
            <GitCompareArrows :size="17" />
            JD 匹配实验台
          </el-button>
          <el-button size="large" text :loading="loading || secondaryLoading" @click="loadAll">
            <RefreshCw :size="17" />
            刷新
          </el-button>
        </div>
      </div>

      <div class="experiment-stack">
        <article class="experiment-card">
          <div class="card-topline">
            <span>当前主简历</span>
            <el-tag :type="defaultResume ? 'success' : 'warning'" effect="plain">
              {{ defaultResume ? '已接入' : '待创建' }}
            </el-tag>
          </div>
          <h2>{{ defaultResumeTitle }}</h2>
          <p>{{ resumeSummary }}</p>
          <button type="button" @click="goResumeAction">
            {{ defaultResume ? '进入简历工作台' : '创建第一份简历' }}
            <ArrowRight :size="14" />
          </button>
        </article>

        <article class="experiment-card">
          <div class="card-topline">
            <span>目标岗位</span>
            <el-tag :type="parseStatusType(currentTarget?.parseStatus)" effect="plain">
              {{ parseStatusLabel(currentTarget?.parseStatus) }}
            </el-tag>
          </div>
          <h2>{{ currentTarget?.jobTitle || '还没有目标岗位' }}</h2>
          <p>{{ targetSummary }}</p>
          <button type="button" @click="goTargetAction">
            {{ currentTarget ? '查看岗位分析' : '添加目标岗位' }}
            <ArrowRight :size="14" />
          </button>
        </article>
      </div>

      <aside class="next-action-card">
        <div class="next-action-head">
          <span>下一步行动</span>
          <ListChecks :size="18" />
        </div>
        <h2>{{ nextStep.title }}</h2>
        <p>{{ nextStep.desc }}</p>
        <el-button type="primary" size="large" @click="router.push(nextStep.path)">
          {{ nextStep.cta }}
          <ArrowRight :size="15" />
        </el-button>

        <div class="readiness-meter">
          <div>
            <span>实验资料完整度</span>
            <strong>{{ readinessScore }}</strong>
          </div>
          <el-progress :percentage="readinessScore" :show-text="false" />
          <p>{{ readinessHint }}</p>
        </div>
      </aside>
    </section>

    <section v-if="loadError" class="hub-panel">
      <AppState type="error" title="简历实验室加载失败" :description="loadError">
        <el-button type="primary" @click="loadAll">重新加载</el-button>
      </AppState>
    </section>
    <section v-else-if="secondaryLoading" class="hub-panel hub-warning">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="正在补齐匹配报告和项目证据"
        description="基础入口已可使用，最近匹配、项目证据和能力画像会继续加载。"
      />
    </section>
    <section v-else-if="partialLoadWarning" class="hub-panel hub-warning">
      <el-alert
        type="warning"
        show-icon
        :closable="false"
        title="部分数据暂时不可用"
        :description="partialLoadWarning"
      />
    </section>

    <section class="lab-overview" v-loading="loading">
      <article class="report-card">
        <div class="section-kicker">
          <GitCompareArrows :size="15" />
          JD 匹配状态
        </div>
        <div class="report-score">
          <strong>{{ matchScoreText }}</strong>
          <span>{{ hasSuccessfulMatch ? '匹配结果' : matchStatusLabel(latestMatch?.status) || (canMatch ? '等待生成报告' : '资料未齐') }}</span>
        </div>
        <p>{{ matchSummary }}</p>
        <div class="summary-pills">
          <span>{{ canMatch ? '简历和岗位已可用于实验' : '需要简历和岗位' }}</span>
          <span>{{ latestMatch ? matchStatusLabel(latestMatch.status) || '报告处理中' : '暂无最近报告' }}</span>
        </div>
        <div class="summary-actions">
          <el-button type="primary" text :disabled="!canMatch" @click="goMatchAction">
            {{ latestMatch ? '查看 JD 匹配报告' : '生成 JD 匹配报告' }}
            <ArrowRight :size="14" />
          </el-button>
          <el-button text @click="router.push('/resumes/manage')">简历资产</el-button>
        </div>
      </article>

      <article class="issue-card">
        <div class="section-kicker">
          <CircleAlert :size="15" />
          当前最该处理
        </div>
        <h2>{{ riskItems[0]?.title || nextStep.title }}</h2>
        <p>{{ riskItems[0]?.desc || nextStep.desc }}</p>
        <el-button text @click="router.push(riskItems[0]?.path || nextStep.path)">
          {{ riskItems[0]?.cta || nextStep.cta }}
          <ArrowRight :size="14" />
        </el-button>
      </article>
    </section>

    <section class="hub-path">
      <div class="section-head">
        <div>
          <p class="section-kicker">投前准备链路</p>
          <h2>从简历到 JD，再回流到项目证据和训练</h2>
        </div>
        <el-button text @click="router.push('/dashboard')">回到 Offer 工作台</el-button>
      </div>
      <div class="path-steps">
        <button
          v-for="step in journeySteps"
          :key="step.title"
          class="path-step"
          type="button"
          @click="router.push(step.path)"
        >
          <span :class="['step-status', step.done ? 'is-done' : '']">
            <CheckCircle2 v-if="step.done" :size="15" />
            <CircleAlert v-else :size="15" />
          </span>
          <strong>{{ step.title }}</strong>
          <small>{{ step.desc }}</small>
        </button>
      </div>
    </section>

    <div class="content-grid">
      <section class="hub-panel">
        <div class="section-head">
          <div>
            <p class="section-kicker">岗位关键词覆盖</p>
            <h2>哪些岗位要求已经有真实证据</h2>
          </div>
          <el-button text :disabled="!latestMatch" @click="goMatchAction">报告详情</el-button>
        </div>

        <div v-if="keywordCoverage.length" class="keyword-list">
          <article v-for="item in keywordCoverage" :key="item.name" class="keyword-item">
            <div>
              <div class="keyword-title-row">
                <strong>{{ item.name }}</strong>
                <el-tag :type="coverageTag(item.status)" effect="plain">{{ coverageLabel(item.status) }}</el-tag>
              </div>
              <p>{{ item.evidence }}</p>
            </div>
            <div class="keyword-score">
              <b>{{ item.scoreText }}</b>
            </div>
          </article>
        </div>
        <AppState
          v-else
          type="empty"
          title="还没有岗位关键词覆盖结果"
          description="完成岗位分析和简历匹配后，这里会显示已覆盖、部分覆盖和缺失关键词。"
        >
          <el-button type="primary" :disabled="!canMatch" @click="goMatchAction">去生成匹配报告</el-button>
        </AppState>
      </section>

      <section class="hub-panel">
        <div class="section-head">
          <div>
            <p class="section-kicker">项目证据</p>
            <h2>把项目经历改成可证明材料</h2>
          </div>
          <el-button text :disabled="!defaultResume" @click="goResumeAction">维护项目</el-button>
        </div>

        <div v-if="projectCards.length" class="project-list">
          <article v-for="project in projectCards" :key="project.key" class="project-card">
            <div class="project-card-head">
              <strong>{{ project.name }}</strong>
              <button type="button" @click="router.push('/interviews/create')">
                用这个项目做模拟追问
                <ArrowRight :size="14" />
              </button>
            </div>
            <p>{{ project.summary }}</p>
            <div class="project-meta">
              <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
            </div>
          </article>
        </div>
        <AppState
          v-else
          type="empty"
          title="还没有可用于追问的项目"
          description="在简历中补充项目背景、技术决策和结果指标后，面试房间和题目训练才能引用真实证据。"
        >
          <el-button type="primary" :disabled="!defaultResume" @click="goResumeAction">补充项目经历</el-button>
        </AppState>
      </section>
    </div>

    <section class="hub-panel">
      <div class="section-head">
        <div>
          <p class="section-kicker">风险与训练入口</p>
          <h2>把岗位缺口变成下一步练习</h2>
        </div>
        <el-button text @click="router.push('/questions/recommendations')">查看推荐题</el-button>
      </div>

      <div class="risk-grid">
        <article v-for="risk in riskItems" :key="risk.title" class="risk-card">
          <span>{{ risk.source }}</span>
          <strong>{{ risk.title }}</strong>
          <p>{{ risk.desc }}</p>
          <el-button text @click="router.push(risk.path)">
            {{ risk.cta }}
            <ArrowRight :size="14" />
          </el-button>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, CheckCircle2, CircleAlert, FileText, GitCompareArrows, ListChecks, RefreshCw, Sparkles } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getCurrentJobTargetApi, getJobTargetsApi } from '@/api/jobTarget'
import { getResumeDetailApi, getResumesApi } from '@/api/resume'
import { getLatestResumeJobMatchReportApi } from '@/api/resumeJobMatch'
import { getSkillProfileOverviewApi } from '@/api/skillProfile'
import AppState from '@/components/common/AppState.vue'
import type { JobDescriptionAnalysisVO, TargetJobVO } from '@/types/jobTarget'
import type { ResumeDetailVO, ResumeVO } from '@/types/resume'
import type { ResumeJobMatchDetailItemVO, ResumeJobMatchReportDetailVO } from '@/types/resumeJobMatch'
import type { SkillProfileOverviewVO } from '@/types/skillProfile'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

type UnknownRecord = Record<string, unknown>

interface KeywordCoverageItem {
  name: string
  status: string
  evidence: string
  score?: number
  scoreText: string
}

interface ProjectCard {
  key: string
  name: string
  summary: string
  tags: string[]
}

const router = useRouter()
const loading = ref(false)
const secondaryLoading = ref(false)
const loadError = ref('')
const partialLoadWarning = ref('')
const resumes = ref<ResumeVO[]>([])
const targets = ref<TargetJobVO[]>([])
const defaultResume = ref<ResumeVO | null>(null)
const resumeDetail = ref<ResumeDetailVO | null>(null)
const currentTarget = ref<TargetJobVO | null>(null)
const latestMatch = ref<ResumeJobMatchReportDetailVO | null>(null)
const skillOverview = ref<SkillProfileOverviewVO | null>(null)

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (!text || !/^[\[{]/.test(text)) return value
  try {
    return JSON.parse(text) as unknown
  } catch {
    return value
  }
}

const pickText = (source: UnknownRecord, keys: string[], fallback = '') => {
  for (const key of keys) {
    const value = parseMaybeJson(source[key])
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return fallback
}

const toTextList = (value: unknown): string[] => {
  const parsed = parseMaybeJson(value)
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        if (item && typeof item === 'object') {
          const record = item as UnknownRecord
          return pickText(record, ['skillName', 'name', 'title', 'keyword', 'summary', 'description'])
        }
        return ''
      })
      .filter(Boolean)
  }
  if (parsed && typeof parsed === 'object') {
    return Object.values(parsed as UnknownRecord)
      .flatMap((item) => toTextList(item))
      .filter(Boolean)
  }
  if (typeof parsed === 'string') {
    return parsed
      .split(/\r?\n|[；;、,，]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

const firstItems = (value: unknown, count = 3) => toTextList(value).slice(0, count)

const canMatch = computed(() => Boolean(defaultResume.value?.id && currentTarget.value?.id))
const hasSuccessfulMatch = computed(() => latestMatch.value?.status === 'SUCCESS')
const evidenceLoading = computed(() => secondaryLoading.value && canMatch.value && !latestMatch.value)

const defaultResumeTitle = computed(() =>
  defaultResume.value?.resumeName || defaultResume.value?.title || '还没有可用简历'
)

const resumeSummary = computed(() => {
  if (!defaultResume.value) return '先创建或上传一份简历，后续匹配和今日计划才有真实依据。'
  const parts = [
    defaultResume.value.targetPosition || '目标岗位待补充',
    defaultResume.value.projectCount != null ? `${defaultResume.value.projectCount} 个项目` : '',
    defaultResume.value.updatedAt ? `更新于 ${formatDateTime(defaultResume.value.updatedAt)}` : ''
  ].filter(Boolean)
  return parts.join(' · ')
})

const targetSummary = computed(() => {
  if (!currentTarget.value) return '创建目标岗位并粘贴岗位描述后，系统才能提取关键词、风险和面试关注点。'
  return currentTarget.value.analysisSummary ||
    `${currentTarget.value.companyName || '目标公司待补充'} · ${currentTarget.value.jobLevel || '年限要求待补充'}`
})

const matchScoreText = computed(() => {
  if (evidenceLoading.value) return '读取中'
  if (!latestMatch.value) return canMatch.value ? '待匹配' : '缺资料'
  if (latestMatch.value.status === 'FAILED') return '生成失败'
  if (latestMatch.value.status !== 'SUCCESS') return matchStatusLabel(latestMatch.value.status) || '处理中'
  return latestMatch.value.overallScore != null ? `${latestMatch.value.overallScore}` : '已完成'
})

const summarizeRiskItems = (items: unknown, limit = 2) => toTextList(items).slice(0, limit)

const matchSummary = computed(() => {
  if (!canMatch.value) return '需要同时有简历和当前目标岗位描述，才能生成岗位匹配报告。'
  if (evidenceLoading.value) return '正在读取最近匹配报告和能力画像，基础入口已经可以继续使用。'
  if (!latestMatch.value) return '还没有最新匹配报告，建议先生成一次，再进入题库或模拟面试。'
  if (latestMatch.value.status === 'FAILED') {
    return friendlyMatchFailure(latestMatch.value.errorMessage)
  }
  if (!hasSuccessfulMatch.value) return '匹配报告还在生成中，请等待完成后再把结论用于训练。'
  const strengths = summarizeRiskItems(latestMatch.value.strengths, 2)
  const gaps = summarizeRiskItems(latestMatch.value.gaps, 2)
  const parts = [
    latestMatch.value.summary || latestMatch.value.errorMessage || '',
    strengths.length ? `优势：${strengths.join('、')}` : '',
    gaps.length ? `缺口：${gaps.join('、')}` : ''
  ].filter(Boolean)
  return parts.join(' · ') || '匹配报告已生成，可查看优势、风险和下一步训练。'
})

const friendlyMatchFailure = (message?: string | null) => {
  const text = `${message || ''}`.trim()
  if (!text) return '上次匹配报告没有成功生成，请进入详情重新生成后再继续训练。'
  if (/JD|JSON|schema|内容结构|格式|exception|error|failed|parse|deserialize|serialize/i.test(text)) {
    return '上次匹配报告没有形成可信结果，系统已保留处理线索。建议重新生成，或先补齐简历项目证据和岗位描述。'
  }
  if (/岗位|简历|资料|证据|描述/.test(text) && text.length <= 80) return text
  return '上次匹配报告没有成功生成，请进入详情查看处理建议并重新生成。'
}

const readinessScore = computed(() => {
  let score = 0
  if (defaultResume.value) score += 25
  if (resumeDetail.value?.projects?.length) score += 15
  if (currentTarget.value) score += 20
  if (currentTarget.value?.parseStatus === 'PARSED') score += 15
  if (hasSuccessfulMatch.value) score += 20
  if ((skillOverview.value?.topGaps || []).length) score += 5
  return Math.min(score, 100)
})

const readinessHint = computed(() => {
  if (!defaultResume.value) return '先补简历，避免后续页面展示缺少依据的匹配结果。'
  if (!currentTarget.value) return '再补一个目标岗位和岗位描述，推荐会更可信。'
  if (evidenceLoading.value) return '基础信息已加载，正在补齐最近匹配报告和项目证据。'
  if (!latestMatch.value) return '简历和岗位描述已具备，下一步生成匹配报告。'
  if (latestMatch.value.status === 'FAILED') return '上次匹配失败，建议先重新生成报告再进入训练。'
  if (hasSuccessfulMatch.value) return '已有可信匹配依据，可以进入推荐题或模拟面试。'
  return '匹配报告还未完成，先不要把训练结论当作可信依据。'
})

const primaryAction = computed(() => {
  if (!defaultResume.value) return { label: '创建第一份简历', path: '/resumes/create' }
  if (!currentTarget.value) return { label: '添加目标岗位', path: '/job-targets/create' }
  if (evidenceLoading.value) return { label: '查看匹配准备', path: '/resume-match' }
  if (!latestMatch.value) return { label: '生成 JD 匹配报告', path: '/resume-match' }
  if (latestMatch.value.status === 'FAILED') return { label: '重新生成 JD 匹配报告', path: `/resume-match/${latestMatch.value.reportId}` }
  if (hasSuccessfulMatch.value && !projectCards.value.length) {
    return {
      label: '补项目证据',
      path: defaultResume.value ? `/resumes/${defaultResume.value.id}/edit` : '/resumes/create'
    }
  }
  if (hasSuccessfulMatch.value) return { label: '进入模拟面试', path: '/interviews/create' }
  return { label: '查看匹配进度', path: `/resume-match/${latestMatch.value.reportId}` }
})

const nextStep = computed(() => {
  if (!defaultResume.value) {
    return {
      title: '先补简历',
      desc: '没有简历时不展示诊断分，也不会生成缺少依据的项目证据。',
      cta: '创建简历',
      path: '/resumes/create'
    }
  }
  if (!currentTarget.value) {
    return {
      title: '补目标岗位',
      desc: '目标岗位会决定关键词、追问深度和面试模式。',
      cta: '创建岗位目标',
      path: '/job-targets/create'
    }
  }
  if (evidenceLoading.value) {
    return {
      title: '读取最近报告',
      desc: '先把最近匹配、项目证据和能力画像补齐，避免误把旧状态当作训练依据。',
      cta: '进入匹配中心',
      path: '/resume-match'
    }
  }
  if (!latestMatch.value) {
    return {
      title: '生成匹配报告',
      desc: '把岗位风险、简历证据和能力缺口一次性对齐。',
      cta: '发起匹配',
      path: '/resume-match'
    }
  }
  if (latestMatch.value.status === 'FAILED') {
    return {
      title: '重新生成 JD 匹配报告',
      desc: '上次报告没有成功，先恢复匹配结果再进入推荐题和岗位面试。',
      cta: '查看失败原因',
      path: `/resume-match/${latestMatch.value.reportId}`
    }
  }
  if (!hasSuccessfulMatch.value) {
    return {
      title: '等待匹配完成',
      desc: '报告未成功前不把推荐题和面试训练标成已具备依据，避免误导训练方向。',
      cta: '查看匹配进度',
      path: `/resume-match/${latestMatch.value.reportId}`
    }
  }
  if (!projectCards.value.length) {
    return {
      title: '补项目证据',
      desc: '报告已经生成，但当前简历还缺少可复盘项目，建议先补项目背景、技术决策和结果指标。',
      cta: '补项目经历',
      path: defaultResume.value ? `/resumes/${defaultResume.value.id}/edit` : '/resumes/create'
    }
  }
  return {
    title: '进入模拟面试',
    desc: '用这份简历、目标岗位和项目证据进入岗位模拟面试，验证表达是否站得住。',
    cta: '开始模拟面试',
    path: '/interviews/create'
  }
})

const journeySteps = computed(() => [
  {
    title: '简历诊断',
    desc: defaultResume.value ? '已有可用简历' : '待创建或上传',
    path: defaultResume.value ? `/resumes/${defaultResume.value.id}/edit` : '/resumes/create',
    done: Boolean(defaultResume.value)
  },
  {
    title: '岗位分析',
    desc: currentTarget.value?.parseStatus === 'PARSED' ? '已分析目标岗位' : '待分析岗位要求',
    path: currentTarget.value ? `/job-targets/${currentTarget.value.id}/analysis` : '/job-targets/create',
    done: currentTarget.value?.parseStatus === 'PARSED'
  },
  {
    title: '岗位匹配',
    desc: latestMatch.value?.status === 'SUCCESS'
      ? '已有匹配报告'
      : latestMatch.value?.status === 'FAILED'
        ? '上次失败，可重新生成'
        : '待生成匹配报告',
    path: latestMatch.value ? `/resume-match/${latestMatch.value.reportId}` : '/resume-match',
    done: latestMatch.value?.status === 'SUCCESS'
  },
  {
    title: '项目证据',
    desc: projectCards.value.length ? `${projectCards.value.length} 个项目可复习` : '待补项目指标',
    path: defaultResume.value ? `/resumes/${defaultResume.value.id}/edit` : '/resumes/create',
    done: projectCards.value.length > 0
  },
  {
    title: '今日训练',
    desc: latestMatch.value?.status === 'SUCCESS' ? '可回流今日计划' : '需要先完成匹配',
    path: '/dashboard',
    done: latestMatch.value?.status === 'SUCCESS'
  }
])

const keywordCoverage = computed<KeywordCoverageItem[]>(() => {
  const details = hasSuccessfulMatch.value ? latestMatch.value?.details || [] : []
  if (details.length) return details.slice(0, 8).map(toKeywordCoverage)

  const analysis = currentTarget.value as TargetJobVO & Partial<JobDescriptionAnalysisVO>
  const fallbackKeywords = [
    ...firstItems(analysis.requiredSkills, 4),
    ...firstItems(analysis.interviewFocusPoints, 4)
  ]
  return [...new Set(fallbackKeywords)].slice(0, 6).map((name) => ({
    name,
    status: '待匹配',
    evidence: '已有岗位关键词，但还没有简历匹配证据。',
    scoreText: '--'
  }))
})

const projectCards = computed<ProjectCard[]>(() => {
  const projects = resumeDetail.value?.projects || []
  return projects.slice(0, 4).map((project, index) => {
    const tags = [
      ...toTextList(project.techStack).slice(0, 3),
      project.optimizationResult || project.optimizationResults ? '结果指标' : '',
      project.technicalChallenges || project.technicalDifficulties ? '技术难点' : ''
    ].filter(Boolean)

    return {
      key: String(project.projectId || project.id || index),
      name: project.projectName || `项目经历 ${index + 1}`,
      summary: project.technicalChallenges ||
        project.technicalDifficulties ||
        project.optimizationResult ||
        project.optimizationResults ||
        project.coreFeatures ||
        project.projectBackground ||
        project.description ||
        '建议补充业务背景、技术决策、结果指标和可复盘点。',
      tags: tags.length ? [...new Set(tags)].slice(0, 4) : ['待补技术栈']
    }
  })
})

const riskItems = computed(() => {
  const matchGaps = hasSuccessfulMatch.value ? summarizeRiskItems(latestMatch.value?.gaps, 2) : []
  const skillGaps = hasSuccessfulMatch.value ? (skillOverview.value?.topGaps || [])
    .map((gap) => gap.skillName || gap.gapDescription || '')
    .filter(Boolean)
    .slice(0, 2) : []
  const strengths = hasSuccessfulMatch.value ? summarizeRiskItems(latestMatch.value?.strengths, 2) : []
  const risks = [...matchGaps, ...skillGaps]

  if (risks.length || strengths.length) {
    return [
      {
        source: '优势',
        title: strengths[0] || '当前简历已有可用证据',
        desc: strengths[1] || '把现有强项先保住，再向缺口靠近。',
        cta: '强化优势',
        path: '/questions/recommendations'
      },
      {
        source: '风险',
        title: risks[0] || '还没有显式风险项',
        desc: risks[1] || '把岗位风险转成推荐题和模拟面试追问。',
        cta: '去训练',
        path: '/questions/recommendations'
      },
      {
        source: '缺口',
        title: skillGaps[0] || '完善技能画像',
        desc: skillGaps[1] || '补齐项目证据后，覆盖率会更真实。',
        cta: '补简历',
        path: defaultResume.value ? `/resumes/${defaultResume.value.id}/edit` : '/resumes/create'
      },
      {
        source: '下一步训练',
        title: currentTarget.value ? '用岗位要求牵引训练' : '先补目标岗位',
        desc: currentTarget.value ? '把风险项转成今天就能做的训练动作。' : '先选一个目标岗位，训练动作才有锚点。',
        cta: currentTarget.value ? '查看推荐题' : '创建岗位',
        path: currentTarget.value ? '/questions/recommendations' : '/job-targets/create'
      }
    ]
  }

  return [
    {
      source: '简历证据',
      title: defaultResume.value ? '补项目指标和技术决策' : '先创建可解析简历',
      desc: defaultResume.value ? '项目经历需要能回答“为什么这么做、结果如何证明”。' : '没有简历时，项目技能卡会先保持空白，补充资料后再生成。',
      cta: defaultResume.value ? '编辑简历' : '创建简历',
      path: defaultResume.value ? `/resumes/${defaultResume.value.id}/edit` : '/resumes/create'
    },
    {
      source: '岗位上下文',
      title: currentTarget.value ? '生成岗位匹配报告' : '补充目标岗位描述',
      desc: currentTarget.value ? '让系统从真实岗位描述中提取训练优先级。' : '岗位描述是推荐题和模拟面试模式的主要依据。',
      cta: currentTarget.value ? '发起匹配' : '创建岗位',
      path: currentTarget.value ? '/resume-match' : '/job-targets/create'
    },
    {
      source: '训练动作',
      title: hasSuccessfulMatch.value ? '把缺口转成训练计划' : '先生成岗位匹配报告',
      desc: hasSuccessfulMatch.value ? '优先处理最影响面试表达的短板。' : '报告成功后才会把风险、优势和下一步训练作为依据。',
      cta: hasSuccessfulMatch.value ? '去训练' : '去匹配',
      path: hasSuccessfulMatch.value ? '/questions/recommendations' : '/resume-match'
    },
    {
      source: '项目卡片',
      title: projectCards.value.length ? '复盘项目证据' : '补项目经历',
      desc: projectCards.value.length ? '把项目背景、技术决策和结果指标补齐。' : '项目卡会帮助你把简历改成可追问证据。',
      cta: defaultResume.value ? '维护项目' : '创建简历',
      path: defaultResume.value ? `/resumes/${defaultResume.value.id}/edit` : '/resumes/create'
    }
  ]
})

const toKeywordCoverage = (item: ResumeJobMatchDetailItemVO): KeywordCoverageItem => {
  const score = item.score
  const rawLevel = `${item.matchLevel || item.dimension || ''}`
  const status = rawLevel.includes('缺') || (score != null && score < 50)
    ? '缺失'
    : score != null && score < 75
      ? '部分覆盖'
      : '已覆盖'

  return {
    name: item.skillName || item.dimension || '能力关键词',
    status,
    evidence: item.evidence || item.gapDescription || item.suggestion || '暂无证据摘要',
    score,
    scoreText: score == null ? '--' : `${score}`
  }
}

const parseStatusLabel = (status?: string) => {
  if (status === 'PARSED') return '岗位已分析'
  if (status === 'PARSING') return '解析中'
  if (status === 'FAILED') return '解析失败'
  if (!currentTarget.value) return '缺岗位'
  return '待解析'
}

const parseStatusType = (status?: string) => {
  if (status === 'PARSED') return 'success'
  if (status === 'PARSING') return 'warning'
  if (status === 'FAILED') return 'danger'
  return 'info'
}

const matchStatusType = (status?: string) => {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'PROCESSING' || status === 'PENDING') return 'warning'
  return 'info'
}

const matchStatusLabel = (status?: string) => {
  if (status === 'SUCCESS') return '已完成'
  if (status === 'FAILED') return '生成失败'
  if (status === 'PROCESSING') return '生成中'
  if (status === 'PENDING') return '排队中'
  return ''
}

const coverageTag = (status: string) => {
  if (status === '已覆盖') return 'success'
  if (status === '部分覆盖') return 'warning'
  if (status === '缺失') return 'danger'
  return 'info'
}

const coverageLabel = (status?: string) => {
  if (status === '已覆盖' || status === '部分覆盖' || status === '缺失' || status === '待匹配') return status
  return '覆盖状态待确认'
}

const goPrimaryAction = () => {
  router.push(primaryAction.value.path)
}

const goResumeAction = () => {
  router.push(defaultResume.value ? `/resumes/${defaultResume.value.id}/edit` : '/resumes/create')
}

const goTargetAction = () => {
  router.push(currentTarget.value ? `/job-targets/${currentTarget.value.id}/analysis` : '/job-targets/create')
}

const goMatchAction = () => {
  if (latestMatch.value) {
    router.push({
      path: `/resume-match/${latestMatch.value.reportId}`,
      query: {
        resumeId: latestMatch.value.resumeId,
        targetJobId: latestMatch.value.targetJobId
      }
    })
    return
  }

  router.push({
    path: '/resume-match',
    query: {
      resumeId: defaultResume.value?.id,
      targetJobId: currentTarget.value?.id
    }
  })
}

const isFulfilled = <T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> =>
  result.status === 'fulfilled'

const isPositiveId = (value: unknown): value is number =>
  Number.isFinite(Number(value)) && Number(value) > 0

let loadRunId = 0
let evidenceLoadTimer: ReturnType<typeof window.setTimeout> | null = null

const clearEvidenceLoadTimer = () => {
  if (evidenceLoadTimer != null) {
    window.clearTimeout(evidenceLoadTimer)
    evidenceLoadTimer = null
  }
}

const loadEvidenceData = async (runId: number, baseWarnings: string[]) => {
  const warnings = [...baseWarnings]
  const resume = defaultResume.value
  const target = currentTarget.value

  try {
    const [detailResult, matchResult, overviewResult] = await Promise.allSettled([
      resume && isPositiveId(resume.id)
        ? getResumeDetailApi(resume.id)
        : Promise.resolve(null),
      resume && target && isPositiveId(resume.id) && isPositiveId(target.id)
        ? getLatestResumeJobMatchReportApi(resume.id, target.id)
        : Promise.resolve(null),
      target && isPositiveId(target.id)
        ? getSkillProfileOverviewApi(target.id)
        : Promise.resolve(null)
    ])

    if (runId !== loadRunId) return

    if (isFulfilled(detailResult)) {
      resumeDetail.value = detailResult.value
    } else {
      warnings.push(getErrorMessage(detailResult.reason, '简历详情读取失败，项目证据暂时不可用'))
    }

    if (isFulfilled(matchResult)) {
      latestMatch.value = matchResult.value
    } else {
      warnings.push(getErrorMessage(matchResult.reason, '最新匹配报告读取失败，暂不把匹配结果作为训练依据'))
    }

    if (isFulfilled(overviewResult)) {
      skillOverview.value = overviewResult.value
    } else {
      warnings.push(getErrorMessage(overviewResult.reason, '能力画像读取失败，训练缺口暂时不可用'))
    }
  } catch (error) {
    if (runId === loadRunId) {
      warnings.push(getErrorMessage(error, '匹配报告和项目证据暂时不可用，基础入口已保留。'))
    }
  } finally {
    if (runId === loadRunId) {
      secondaryLoading.value = false
      partialLoadWarning.value = warnings.filter(Boolean).join('；')
    }
  }
}

const deferEvidenceLoad = (runId: number, baseWarnings: string[]) => {
  clearEvidenceLoadTimer()
  if (!defaultResume.value && !currentTarget.value) {
    secondaryLoading.value = false
    partialLoadWarning.value = baseWarnings.filter(Boolean).join('；')
    return
  }
  secondaryLoading.value = true
  evidenceLoadTimer = window.setTimeout(() => {
    evidenceLoadTimer = null
    void loadEvidenceData(runId, baseWarnings)
  }, 160)
}

const loadAll = async () => {
  const runId = ++loadRunId
  clearEvidenceLoadTimer()
  loading.value = true
  secondaryLoading.value = false
  loadError.value = ''
  partialLoadWarning.value = ''
  latestMatch.value = null
  skillOverview.value = null
  resumeDetail.value = null

  let warnings: string[] = []
  try {
    const [resumeResult, targetResult, currentResult] = await Promise.allSettled([
      getResumesApi({ pageNo: 1, pageSize: 50 }),
      getJobTargetsApi({}),
      getCurrentJobTargetApi()
    ])

    if (isFulfilled(resumeResult)) {
      resumes.value = Array.isArray(resumeResult.value.records) ? resumeResult.value.records : []
    } else {
      resumes.value = []
      warnings.push(getErrorMessage(resumeResult.reason, '简历列表读取失败'))
    }

    if (isFulfilled(targetResult)) {
      targets.value = Array.isArray(targetResult.value) ? targetResult.value : []
    } else {
      targets.value = []
      warnings.push(getErrorMessage(targetResult.reason, '岗位目标读取失败'))
    }

    if (!isFulfilled(resumeResult) && !isFulfilled(targetResult)) {
      loadError.value = warnings.join('；') || '简历实验室数据暂时不可用。'
      return
    }

    defaultResume.value = resumes.value.find((item) => item.isDefault === 1) || resumes.value[0] || null
    if (!isFulfilled(currentResult)) {
      warnings.push(getErrorMessage(currentResult.reason, '当前岗位读取失败，已先使用岗位列表中的信息'))
    }
    currentTarget.value = (isFulfilled(currentResult) ? currentResult.value : null) ||
      targets.value.find((item) => item.currentFlag === 1) ||
      targets.value[0] ||
      null

    partialLoadWarning.value = warnings.filter(Boolean).join('；')
  } catch (error) {
    loadError.value = getErrorMessage(error, '简历实验室数据暂时不可用。')
  } finally {
    if (runId === loadRunId) {
      loading.value = false
      if (!loadError.value) {
        deferEvidenceLoad(runId, warnings)
      }
    }
  }
}

onMounted(loadAll)

onBeforeUnmount(() => {
  loadRunId += 1
  clearEvidenceLoadTimer()
})
</script>

<style scoped>
.resume-job-hub {
  min-height: 100%;
  padding: 24px;
  color: #101828;
  background:
    radial-gradient(circle at 8% 0%, rgba(37, 99, 235, 0.12), transparent 28%),
    radial-gradient(circle at 92% 6%, rgba(6, 182, 212, 0.12), transparent 26%),
    linear-gradient(180deg, #f6f8fc 0%, #eef4ff 48%, #f7f9fc 100%);
}

.hub-hero,
.hub-panel,
.hub-path,
.lab-overview {
  border: 1px solid rgba(207, 214, 228, 0.9);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
}

.hub-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.9fr) minmax(280px, 0.72fr);
  gap: 16px;
  align-items: stretch;
  padding: 16px;
}

.hero-card,
.experiment-card,
.next-action-card {
  min-width: 0;
  border-radius: 8px;
}

.hero-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 22px;
  color: #ffffff;
  background:
    linear-gradient(135deg, rgba(16, 24, 40, 0.96), rgba(30, 64, 175, 0.92)),
    #101828;
}

.hero-copy h1 {
  max-width: 680px;
  margin: 14px 0 12px;
  font-size: 34px;
  line-height: 1.18;
  letter-spacing: 0;
}

.hero-copy p {
  max-width: 720px;
  margin: 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: 15px;
  line-height: 1.8;
}

.hero-kicker,
.section-kicker {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.hero-kicker {
  color: #bfdbfe;
}

.section-kicker {
  color: #2563eb;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
}

.hero-actions :deep(.el-button),
.summary-actions :deep(.el-button),
.section-head :deep(.el-button),
.risk-card :deep(.el-button),
.next-action-card :deep(.el-button),
.issue-card :deep(.el-button) {
  display: inline-flex;
  min-width: 0;
  gap: 6px;
  align-items: center;
  white-space: normal;
}

.hero-actions :deep(.el-button:not(.primary-action)) {
  border-color: rgba(255, 255, 255, 0.38);
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.experiment-stack {
  display: grid;
  min-width: 0;
  gap: 12px;
}

.experiment-card {
  display: flex;
  flex-direction: column;
  min-height: 176px;
  padding: 18px;
  border: 1px solid #e4e7ec;
  background: #ffffff;
}

.card-topline,
.next-action-head,
.readiness-meter > div {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.card-topline span,
.next-action-head span,
.readiness-meter span,
.risk-card span {
  color: #667085;
  font-size: 13px;
}

.experiment-card h2,
.next-action-card h2,
.report-card h2,
.issue-card h2 {
  margin: 12px 0 8px;
  color: #101828;
  font-size: 20px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.experiment-card p,
.next-action-card p,
.report-card p,
.issue-card p,
.keyword-item p,
.project-card p,
.risk-card p {
  margin: 0;
  color: #667085;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.experiment-card button,
.project-card button {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  align-self: flex-start;
  margin-top: auto;
  padding: 0;
  border: 0;
  color: #2563eb;
  font-weight: 700;
  line-height: 1.5;
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.next-action-card {
  display: flex;
  flex-direction: column;
  padding: 20px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  background: linear-gradient(180deg, #eff6ff, #ffffff 58%);
}

.next-action-card :deep(.el-button) {
  width: 100%;
  justify-content: center;
  margin-top: 18px;
}

.readiness-meter {
  margin-top: auto;
  padding-top: 18px;
  border-top: 1px solid #dbe7ff;
}

.readiness-meter strong {
  color: #2563eb;
  font-size: 32px;
  line-height: 1;
}

.readiness-meter p {
  margin-top: 10px;
  font-size: 13px;
}

.hub-path,
.hub-panel,
.lab-overview {
  margin-top: 18px;
  padding: 22px;
}

.lab-overview {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 16px;
}

.report-card,
.issue-card {
  min-width: 0;
  padding: 18px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #ffffff;
}

.issue-card {
  border-color: #fed7aa;
  background: #fff7ed;
}

.report-score {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: baseline;
  margin: 12px 0;
}

.report-score strong {
  color: #101828;
  font-size: 42px;
  line-height: 1;
}

.report-score span {
  color: #667085;
  font-size: 13px;
}

.summary-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.summary-pills span,
.project-meta span {
  padding: 4px 8px;
  border-radius: 999px;
  color: #344054;
  font-size: 12px;
  background: #eef2f7;
}

.summary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
}

.section-head {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}

.section-head h2 {
  margin: 4px 0 0;
  color: #101828;
  font-size: 22px;
  line-height: 1.35;
}

.path-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.path-step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px 10px;
  min-height: 96px;
  padding: 14px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  color: inherit;
  text-align: left;
  background: #fbfcff;
  cursor: pointer;
}

.path-step strong {
  align-self: center;
  overflow-wrap: anywhere;
}

.path-step small {
  grid-column: 2;
  color: #667085;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.step-status {
  display: inline-flex;
  width: 26px;
  height: 26px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #b45309;
  background: #fffbeb;
}

.step-status.is-done {
  color: #15803d;
  background: #dcfce7;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  gap: 18px;
}

.keyword-list,
.project-list,
.risk-grid {
  display: grid;
  gap: 12px;
}

.keyword-item,
.project-card,
.risk-card {
  min-width: 0;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #fbfcff;
}

.keyword-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 14px;
}

.keyword-title-row,
.project-card-head {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
}

.keyword-title-row {
  align-items: center;
}

.keyword-item strong,
.project-card strong,
.risk-card strong {
  display: block;
  color: #101828;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.keyword-score {
  display: flex;
  gap: 10px;
  align-items: center;
  white-space: nowrap;
}

.keyword-score b {
  font-size: 20px;
}

.project-card,
.risk-card {
  padding: 16px;
}

.project-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.risk-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.risk-card {
  min-height: 182px;
}

.risk-card :deep(.el-button) {
  margin-top: 10px;
}

@media (max-width: 1180px) {
  .hub-hero {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 0.86fr);
  }

  .next-action-card {
    grid-column: 1 / -1;
  }

  .path-steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .risk-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .resume-job-hub {
    padding: 16px;
  }

  .hub-hero,
  .lab-overview,
  .content-grid,
  .path-steps,
  .risk-grid {
    grid-template-columns: 1fr;
  }

  .next-action-card {
    grid-column: auto;
  }

  .section-head,
  .keyword-item {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}

@media (max-width: 560px) {
  .resume-job-hub {
    padding: 12px;
  }

  .hub-hero,
  .hub-panel,
  .hub-path,
  .lab-overview,
  .hero-card,
  .experiment-card,
  .next-action-card,
  .report-card,
  .issue-card {
    padding: 16px;
  }

  .hero-copy h1 {
    font-size: 28px;
  }

  .hero-actions,
  .summary-actions,
  .project-card-head {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions :deep(.el-button),
  .summary-actions :deep(.el-button),
  .project-card button {
    width: 100%;
    justify-content: center;
  }

  .keyword-item {
    gap: 10px;
  }

  .keyword-score {
    justify-content: flex-start;
    white-space: normal;
  }

  .report-score strong {
    font-size: 34px;
  }
}
</style>
