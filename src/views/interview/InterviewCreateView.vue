<template>
  <div class="interview-create page-shell">
    <section class="create-hero">
      <div>
        <div class="eyebrow">
          <Sparkles :size="16" />
          创建面试
        </div>
        <h1>创建 AI 模拟面试</h1>
        <p>像准备真实面试一样选择训练场景、绑定简历和目标岗位，再进入可追问的面试房间。</p>
        <div class="hero-tags">
          <el-tag effect="plain">创建后直接开始</el-tag>
          <el-tag effect="plain" type="success">支持简历上下文</el-tag>
          <el-tag effect="plain" type="warning">行业场景可用</el-tag>
        </div>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/dashboard')">
          <LayoutDashboard :size="16" />
          返回今日计划
        </el-button>
        <el-button @click="router.push('/resumes')">
          <Files :size="16" />
          进入简历中心
        </el-button>
        <el-button type="primary" @click="router.push('/interviews/history')">
          <History :size="16" />
          面试历史
        </el-button>
      </div>
    </section>

    <section class="quick-start-panel">
      <div class="quick-start-panel__copy">
        <span class="quick-label">推荐开练</span>
        <h2>{{ quickInterviewTitle }}</h2>
        <p>{{ quickInterviewDesc }}</p>
        <div class="quick-context-grid">
          <article v-for="item in quickStartItems" :key="item.label">
            <component :is="item.icon" :size="17" />
            <div>
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </article>
        </div>
        <ul class="quick-reason-list">
          <li v-for="item in quickRecommendation.reasons" :key="item">{{ item }}</li>
        </ul>
      </div>
      <div class="quick-start-panel__actions">
        <el-alert v-if="quickStartNotice" :title="quickStartNotice" type="warning" :closable="false" show-icon />
        <el-alert v-if="routeContextNotice" :title="routeContextNotice" type="warning" :closable="false" show-icon />
        <el-button type="success" size="large" :loading="creating || resumeLoading || matchReportVerifyLoading" @click="handleQuickCreate">
          <Play :size="17" />
          一键开始推荐面试
        </el-button>
        <el-button size="large" :disabled="creating || resumeLoading || matchReportVerifyLoading" @click="applyQuickRecommendation">
          <Sparkles :size="17" />
          套用推荐配置
        </el-button>
        <el-button size="large" @click="scrollToConfig">
          <Settings2 :size="17" />
          调整配置
        </el-button>
      </div>
    </section>

    <div class="create-grid">
      <section ref="configPanelRef" class="config-panel">
        <div class="panel-head">
          <div>
            <h2>高级配置</h2>
            <p>推荐配置已经准备好；只有需要改场景、题量、行业模板或简历上下文时再展开。</p>
          </div>
          <el-button class="panel-head__action" type="primary" plain @click="toggleConfigExpanded">
            <Settings2 :size="16" />
            {{ configExpanded ? '收起配置' : '展开配置' }}
          </el-button>
        </div>

        <div v-if="!configExpanded" class="config-collapsed">
          <div class="config-collapsed__head">
            <span>推荐开练</span>
            <strong>{{ quickInterviewTitle }}</strong>
            <p>{{ quickInterviewDesc }}</p>
          </div>
          <div class="config-collapsed__grid">
            <article v-for="item in quickStartItems" :key="item.label" class="config-collapsed__item">
              <component :is="item.icon" :size="17" />
              <div>
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </article>
          </div>
          <div class="config-collapsed__actions">
            <el-button type="success" :loading="creating || resumeLoading || matchReportVerifyLoading" @click="handleQuickCreate">
              <Play :size="16" />
              一键开始推荐面试
            </el-button>
            <el-button type="primary" plain @click="toggleConfigExpanded">
              <Settings2 :size="16" />
              微调高级配置
            </el-button>
          </div>
        </div>

        <template v-else>
          <div class="mode-grid">
            <button
              v-for="item in modeCards"
              :key="item.key"
              class="mode-card"
              :class="{ active: selectedModeKey === item.key }"
              type="button"
              @click="selectMode(item)"
            >
              <component :is="item.icon" :size="20" />
              <strong>{{ item.title }}</strong>
              <span>{{ item.desc }}</span>
              <em>{{ item.badge }}</em>
            </button>
          </div>

          <el-form ref="formRef" class="config-form" :model="form" :rules="rules" label-position="top">
            <div class="form-section">
              <div class="section-title">
                <span>01</span>
                基础配置
              </div>
              <div class="form-grid">
                <el-form-item label="面试名称">
                  <el-input v-model.trim="form.interviewName" placeholder="可选，例如：Java 微服务中级模拟面试" />
                </el-form-item>
                <el-form-item label="目标岗位" prop="targetPosition">
                  <el-select v-model="form.targetPosition" style="width: 100%">
                    <el-option v-for="item in targetPositionOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
                <el-form-item label="经验年限" prop="experienceLevel">
                  <el-select v-model="form.experienceLevel" style="width: 100%">
                    <el-option v-for="item in experienceLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
                <el-form-item label="难度等级" prop="difficulty">
                  <el-select v-model="form.difficulty" style="width: 100%">
                    <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </div>
            </div>

            <div class="form-section">
              <div class="section-title">
                <span>02</span>
                训练范围
              </div>
              <div class="form-grid">
                <el-form-item label="行业方向" prop="industryDirection">
                  <el-select v-model="form.industryDirection" style="width: 100%">
                    <el-option v-for="item in industryDirectionOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
                <el-form-item label="面试官风格" prop="interviewerStyle">
                  <el-select v-model="form.interviewerStyle" style="width: 100%">
                    <el-option v-for="item in interviewerStyleOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
                <el-form-item label="面试模式">
                  <el-select v-model="form.practiceMode" style="width: 100%">
                    <el-option v-for="item in interviewPracticeModeOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                  <div class="field-hint">正式模式：面试结束后统一生成报告；练习模式：每题后可查看详细点评。</div>
                </el-form-item>
                <el-form-item label="题目数量">
                  <el-input-number v-model="form.questionCount" :min="1" :max="20" />
                </el-form-item>
              </div>
            </div>

            <div v-if="isIndustryMode" class="form-section">
              <div class="section-title">
                <span>03</span>
                行业模板
              </div>
              <el-form-item label="行业场景模板" prop="industryTemplateId">
                <el-select
                  v-model="form.industryTemplateId"
                  v-loading="industryTemplateLoading"
                  placeholder="请选择行业场景模板"
                  style="width: 100%"
                >
                  <el-option
                    v-for="template in industryTemplates"
                    :key="template.industryTemplateId"
                    :label="template.industryName"
                    :value="template.industryTemplateId"
                  />
                </el-select>
                <div v-if="industryTemplateError" class="field-empty">
                  {{ industryTemplateError }}
                </div>
                <div v-else-if="!industryTemplateLoading && !industryTemplates.length" class="field-empty">
                  暂无可用行业模板，可以先选择技术八股、项目深挖或综合模拟。
                </div>
              </el-form-item>

              <article v-if="selectedIndustryTemplate" class="template-preview">
                <div class="template-preview__head">
                  <div>
                    <strong>{{ selectedIndustryTemplate.industryName }}</strong>
                    <span>{{ selectedIndustryTemplate.description || '暂无行业说明' }}</span>
                  </div>
                  <el-tag effect="plain">{{ selectedIndustryTemplate.industryCode || '行业模板' }}</el-tag>
                </div>
                <div class="template-tags">
                  <span v-for="item in templateHighlights" :key="item">{{ item }}</span>
                </div>
              </article>
            </div>

            <div class="form-section">
              <div class="section-title">
                <span>{{ isIndustryMode ? '04' : '03' }}</span>
                简历上下文
              </div>
              <div class="resume-switch">
                <div>
                  <strong>基于简历生成追问</strong>
                  <p>项目深挖和综合模拟建议选择简历，方便围绕你的真实经历追问。</p>
                </div>
                <el-switch v-model="useResume" />
              </div>
              <el-form-item v-if="useResume || isJobTargetFlow" label="选择简历" prop="resumeId">
                <el-select
                  v-model="form.resumeId"
                  filterable
                  placeholder="请选择简历"
                  style="width: 100%"
                  v-loading="resumeLoading"
                >
                  <el-option
                    v-for="resume in resumes"
                    :key="resume.id"
                    :label="resume.isDefault === 1 ? `${resume.resumeName}（默认）` : resume.resumeName"
                    :value="resume.id"
                  />
                </el-select>
                <div v-if="resumeLoadError" class="field-error">
                  <span>{{ resumeLoadError }}</span>
                  <el-button link type="primary" :loading="resumeLoading" @click="fetchResumes">重试</el-button>
                </div>
                <div v-else-if="!resumeLoading && !resumes.length" class="field-empty">
                  暂无可选简历，请先进入简历中心创建后再开启简历上下文。
                </div>
              </el-form-item>
            </div>

            <el-alert
              v-if="resumeRequired || isJobTargetFlow"
              class="create-alert"
              type="warning"
              :closable="false"
              show-icon
              :title="isJobTargetFlow ? '目标岗位链路需要选择简历，并会使用目标岗位信息创建岗位面试。' : '当前面试模式建议选择简历，便于进行项目深挖和综合追问。'"
            />
            <el-alert
              v-if="routeContextNotice"
              class="create-alert"
              type="warning"
              :closable="false"
              show-icon
              :title="routeContextNotice"
            />
          </el-form>
        </template>
      </section>

      <aside class="preview-panel">
        <div class="panel-head">
          <div>
            <h2>本轮预览</h2>
            <p>提交前核对训练范围，确保面试问题围绕当前目标展开。</p>
          </div>
        </div>

        <div class="summary-card primary">
          <span>训练模式</span>
          <strong>{{ selectedModeTitle }}</strong>
          <p>{{ selectedModeDesc }}</p>
        </div>

        <div class="quick-create-card">
          <span>推荐一键开练</span>
          <strong>{{ quickInterviewTitle }}</strong>
          <p>{{ quickInterviewDesc }}</p>
          <ul class="quick-create-reasons">
            <li v-for="item in quickRecommendation.reasons" :key="item">{{ item }}</li>
          </ul>
          <el-button type="success" plain :loading="creating" @click="handleQuickCreate">
            <Play :size="16" />
            一键开始推荐面试
          </el-button>
        </div>

        <div class="context-trust-card">
          <div class="context-trust-card__head">
            <span>推荐依据与可信边界</span>
            <el-tag :type="quickRecommendationTrustType" effect="plain">{{ quickRecommendationTrustLabel }}</el-tag>
          </div>
          <p>{{ quickRecommendationBoundaryText }}</p>
          <div class="context-trust-list">
            <article v-for="item in quickContextTrustItems" :key="item.label" :class="{ 'is-missing': item.missing }">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
        </div>

        <div class="wizard-flow">
          <article v-for="(step, index) in wizardSteps" :key="step.title" :class="{ active: index === 0 }">
            <span>{{ index + 1 }}</span>
            <div>
              <strong>{{ step.title }}</strong>
              <p>{{ step.desc }}</p>
            </div>
          </article>
        </div>

        <div class="summary-list">
          <div>
            <span>目标岗位</span>
            <strong>{{ form.targetPosition || '-' }}</strong>
          </div>
          <div>
            <span>行业方向</span>
            <strong>{{ selectedIndustryTemplate?.industryName || optionLabel(industryDirectionOptions, form.industryDirection) }}</strong>
          </div>
          <div v-if="isIndustryMode">
            <span>行业模板</span>
            <strong>{{ selectedIndustryTemplate?.industryName || '未选择' }}</strong>
          </div>
          <div>
            <span>难度 / 题量</span>
            <strong>{{ optionLabel(difficultyOptions, form.difficulty) }} · {{ form.questionCount }} 题</strong>
          </div>
          <div>
            <span>简历上下文</span>
            <strong>{{ selectedResumeName }}</strong>
          </div>
        </div>

        <div class="pending-box">
          <Zap :size="17" />
          <div>
            <strong>本轮重点</strong>
            <p>{{ selectedModeTip }}</p>
          </div>
        </div>

        <div class="preview-actions">
          <el-button @click="router.push('/dashboard')">返回今日计划</el-button>
          <el-button type="primary" size="large" :loading="creating" @click="configExpanded ? handleCreate() : handleQuickCreate()">
            <Play :size="16" />
            {{ configExpanded ? '按当前配置开始' : '一键开始推荐面试' }}
          </el-button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { BrainCircuit, BriefcaseBusiness, Files, History, LayoutDashboard, Play, Settings2, Sparkles, Target, Zap } from 'lucide-vue-next'
import { computed, nextTick, onMounted, reactive, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { createInterviewApi, createInterviewByJobTargetApi, getIndustryTemplatesApi } from '@/api/interview'
import { getCurrentJobTargetApi, getJobTargetDetailApi } from '@/api/jobTarget'
import { getLatestResumeJobMatchReportApi, getResumeJobMatchReportDetailApi } from '@/api/resumeJobMatch'
import { getResumesApi } from '@/api/resume'
import {
  difficultyOptions,
  experienceLevelOptions,
  industryDirectionOptions,
  INTERVIEW_MODE,
  interviewerStyleOptions,
  interviewPracticeModeOptions,
  targetPositionOptions
} from '@/constants/enums'
import type { IndustryTemplateVO, InterviewCreateDTO } from '@/types/interview'
import type { ResumeJobMatchReportDetailVO } from '@/types/resumeJobMatch'
import type { ResumeVO } from '@/types/resume'
import type { SelectOption } from '@/types/common'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const route = useRoute()
const formRef = ref<FormInstance>()
const configPanelRef = ref<HTMLElement>()
const configExpanded = ref(false)
const creating = ref(false)
const resumeLoading = ref(false)
const resumeLoadError = ref('')
const matchReportVerifyLoading = ref(false)
const matchReportVerifyMessage = ref('')
const routeContextWarning = ref('')
const industryTemplateLoading = ref(false)
const industryTemplateError = ref('')
const useResume = ref(true)
const resumes = ref<ResumeVO[]>([])
const industryTemplates = ref<IndustryTemplateVO[]>([])
const selectedModeKey = ref('technical')
const sourceTargetJobId = ref<number>()
const fallbackTargetJobId = ref<number>()
const verifiedMatchReport = ref<ResumeJobMatchReportDetailVO | null>(null)
let industryTemplatesPromise: Promise<void> | null = null

interface ModeCard {
  key: string
  title: string
  desc: string
  badge: string
  value: string
  icon: Component
  industry?: boolean
  forceResume?: boolean
  defaults?: Partial<InterviewCreateDTO>
}

const form = reactive<InterviewCreateDTO>({
  interviewName: '',
  interviewMode: INTERVIEW_MODE.TECHNICAL_BASIC,
  targetPosition: 'Java 后端开发',
  experienceLevel: '3_YEARS',
  industryTemplateId: undefined,
  industryDirection: 'GENERAL',
  difficulty: 'MEDIUM',
  interviewerStyle: 'NORMAL',
  practiceMode: 'FORMAL',
  resumeId: undefined,
  questionCount: 8
})

const modeCards: ModeCard[] = [
  {
    key: 'resume',
    title: '简历押题',
    desc: '先围绕简历和岗位描述生成最可能被问到的问题。',
    badge: '推荐',
    value: INTERVIEW_MODE.PROJECT_DEEP_DIVE,
    icon: Files,
    forceResume: true,
    defaults: {
      interviewerStyle: 'PROJECT_DEEP_DIVE',
      questionCount: 6
    }
  },
  {
    key: 'project',
    title: '项目深挖',
    desc: '追问项目背景、难点、取舍、指标和事故复盘。',
    badge: '项目',
    value: INTERVIEW_MODE.PROJECT_DEEP_DIVE,
    icon: BriefcaseBusiness,
    forceResume: true,
    defaults: {
      interviewerStyle: 'PROJECT_DEEP_DIVE',
      questionCount: 6
    }
  },
  {
    key: 'technical',
    title: '技术面',
    desc: '围绕 Java 基础、JVM、并发、Spring 体系展开。',
    badge: '基础盘',
    value: INTERVIEW_MODE.TECHNICAL_BASIC,
    icon: BrainCircuit,
    defaults: {
      interviewerStyle: 'NORMAL',
      questionCount: 8
    }
  },
  {
    key: 'system',
    title: '系统设计',
    desc: '训练限流、缓存、库存、搜索、链路治理等方案设计。',
    badge: '方案',
    value: INTERVIEW_MODE.COMPREHENSIVE,
    icon: Target,
    forceResume: true,
    defaults: {
      difficulty: 'HARD',
      interviewerStyle: 'ARCHITECTURE',
      questionCount: 5
    }
  },
  {
    key: 'hr',
    title: 'HR 行为面',
    desc: '练自我介绍、动机、冲突处理、离职原因和职业规划。',
    badge: '表达',
    value: INTERVIEW_MODE.COMPREHENSIVE,
    icon: Sparkles,
    defaults: {
      difficulty: 'MEDIUM',
      interviewerStyle: 'GUIDING',
      questionCount: 6
    }
  },
  {
    key: 'pressure',
    title: '压力追问',
    desc: '模拟连续追问和质疑，训练边界澄清与稳定表达。',
    badge: '压测',
    value: INTERVIEW_MODE.COMPREHENSIVE,
    icon: Zap,
    forceResume: true,
    defaults: {
      difficulty: 'HARD',
      interviewerStyle: 'STRICT',
      practiceMode: 'PRACTICE',
      questionCount: 6
    }
  },
  {
    key: 'industry',
    title: '行业场景',
    desc: '选择行业模板，生成更贴近业务场景的追问。',
    badge: '场景模板',
    value: INTERVIEW_MODE.COMPREHENSIVE,
    industry: true,
    icon: BriefcaseBusiness,
    forceResume: true,
    defaults: {
      interviewerStyle: 'PROJECT_DEEP_DIVE',
      questionCount: 8
    }
  }
]

const isIndustryMode = computed(() => selectedModeKey.value === 'industry')

const selectedIndustryTemplate = computed(() =>
  industryTemplates.value.find((item) => item.industryTemplateId === form.industryTemplateId)
)

const templateHighlights = computed(() => {
  const template = selectedIndustryTemplate.value
  if (!template) return []
  return [
    ...parseTemplateItems(template.targetPositions),
    ...parseTemplateItems(template.coreBusinessScenarios),
    ...parseTemplateItems(template.keyTechnicalPoints)
  ].slice(0, 8)
})

const resumeRequired = computed(() =>
  ['resume', 'project', 'system', 'pressure', 'industry'].includes(selectedModeKey.value)
)

const isJobTargetFlow = computed(() => {
  const source = getQueryString('source')?.toLowerCase()
  return Boolean(
    sourceTargetJobId.value ||
    fallbackTargetJobId.value ||
    getQueryNumber('targetJobId') ||
    source === 'job-target' ||
    source === 'v3'
  )
})

const rules = computed<FormRules<InterviewCreateDTO>>(() => ({
  interviewMode: [{ required: true, message: '请选择面试模式', trigger: 'change' }],
  targetPosition: [{ required: true, message: '请选择目标岗位', trigger: 'change' }],
  experienceLevel: [{ required: true, message: '请选择经验年限', trigger: 'change' }],
  industryDirection: [{ required: true, message: '请选择行业方向', trigger: 'change' }],
  industryTemplateId: isIndustryMode.value ? [{ required: true, message: '请选择行业模板', trigger: 'change' }] : [],
  difficulty: [{ required: true, message: '请选择难度等级', trigger: 'change' }],
  interviewerStyle: [{ required: true, message: '请选择面试官风格', trigger: 'change' }],
  resumeId: resumeRequired.value || useResume.value || isJobTargetFlow.value ? [{ required: true, message: '请选择简历', trigger: 'change' }] : []
}))

const selectedResumeName = computed(() => {
  if (!useResume.value && !isJobTargetFlow.value) return '不使用简历'
  return resumes.value.find((item) => item.id === form.resumeId)?.resumeName || '未选择'
})

const selectedModeDesc = computed(() => modeCards.find((item) => item.key === selectedModeKey.value)?.desc || '当前模式')
const selectedModeTitle = computed(() => modeCards.find((item) => item.key === selectedModeKey.value)?.title || '当前模式')
const defaultResumeId = computed(() =>
  form.resumeId ||
  resumes.value.find((item) => item.isDefault === 1)?.id ||
  resumes.value[0]?.id
)
const quickResumeId = computed(() => {
  const resumeId = defaultResumeId.value
  if (!resumeId || resumeLoadError.value) return undefined
  return resumes.value.some((item) => Number(item.id) === Number(resumeId)) ? resumeId : undefined
})
const quickResumeName = computed(() => {
  const resumeId = quickResumeId.value
  if (!resumeId) return '无简历，轻量技术面'
  return resumes.value.find((item) => item.id === resumeId)?.resumeName || '已选择简历'
})
const interviewModeTitleMap: Record<string, string> = {
  [INTERVIEW_MODE.TECHNICAL_BASIC]: '技术基础',
  [INTERVIEW_MODE.PROJECT_DEEP_DIVE]: '项目深挖',
  [INTERVIEW_MODE.COMPREHENSIVE]: '综合模拟'
}
const selectedModeTitleForPayload = (payload: Pick<InterviewCreateDTO, 'interviewMode'>) =>
  interviewModeTitleMap[payload.interviewMode || ''] || '推荐面试'
const quickTargetJobId = computed(() =>
  sourceTargetJobId.value ||
  getQueryNumber('targetJobId') ||
  fallbackTargetJobId.value
)
const quickMatchReportId = computed(() => getQueryNumber('matchReportId'))
const isTrustedMatchReport = (report?: ResumeJobMatchReportDetailVO | null) => {
  const hasSchemaWarningCount = report?.schemaWarningCount != null
  const warningCount = Number(report?.schemaWarningCount ?? 0)
  const hasSchemaWarnings =
    warningCount > 0 ||
    (Array.isArray(report?.schemaWarnings) && report.schemaWarnings.length > 0)
  return String(report?.status || '').toUpperCase() === 'SUCCESS' &&
    !report?.fallback &&
    String(report?.trustStatus || '').toUpperCase() === 'VERIFIED' &&
    hasSchemaWarningCount &&
    !hasSchemaWarnings
}
const matchReportEvidence = computed(() => {
  const matchReportId = quickMatchReportId.value
  if (!matchReportId) {
    return {
      verified: false,
      reportId: undefined,
      reason: '匹配报告不足：不会引用失败或缺失报告作证据',
      value: '未使用失败/缺失报告',
      boundary: '没有可信匹配报告时，不会把失败、缺失或待复核报告当成押题依据。'
    }
  }
  if (matchReportVerifyLoading.value) {
    return {
      verified: false,
      reportId: matchReportId,
      reason: '正在核验匹配报告，核验完成前不会作为面试推荐依据使用',
      value: '匹配报告正在核验',
      boundary: '匹配报告正在核验中，系统会先按已有资料生成普通推荐，避免误用失败报告。'
    }
  }
  if (matchReportVerifyMessage.value) {
    return {
      verified: false,
      reportId: matchReportId,
      reason: matchReportVerifyMessage.value,
      value: '匹配报告未通过核验',
      boundary: '当前匹配报告没有通过成功状态或上下文核验，不会进入本轮推荐依据。'
    }
  }
  const report = verifiedMatchReport.value
  if (!report || String(report.status || '').toUpperCase() !== 'SUCCESS') {
    return {
      verified: false,
      reportId: matchReportId,
      reason: '匹配报告尚未确认成功，不会作为押题依据',
      value: '匹配报告未确认成功',
      boundary: '只有生成成功、证据已核验且属于当前简历和岗位的匹配报告，才会作为推荐面试的可信依据。'
    }
  }
  if (!isTrustedMatchReport(report)) {
    return {
      verified: false,
      reportId: matchReportId,
      reason: '匹配报告已生成但证据待复核，不会作为推荐面试依据',
      value: '匹配报告证据待复核',
      boundary: '只有证据已核验、没有资料依据不足或内容待复核提示的匹配报告，才会作为推荐面试依据。'
    }
  }
  const resumeId = defaultResumeId.value
  const targetJobId = quickTargetJobId.value
  if (!resumeId || !targetJobId) {
    return {
      verified: false,
      reportId: matchReportId,
      reason: '匹配报告已成功，但当前简历或目标岗位资料不足，暂不作为面试推荐依据',
      value: '可信报告待绑定上下文',
      boundary: '可信报告还需要和当前简历、目标岗位对齐后才会作为押题依据。'
    }
  }
  if (Number(report.resumeId) !== Number(resumeId) || Number(report.targetJobId) !== Number(targetJobId)) {
    return {
      verified: false,
      reportId: matchReportId,
      reason: '匹配报告与当前简历或目标岗位不一致，本轮按普通推荐处理',
      value: '匹配报告上下文不一致',
      boundary: '匹配报告和当前简历/岗位不一致时，不会把它混入本轮面试证据。'
    }
  }
  return {
    verified: true,
    reportId: report.reportId || matchReportId,
    reason: '来自可信匹配报告',
    value: '可信匹配报告已绑定',
    boundary: '将使用可信匹配报告、当前简历和目标岗位作为追问依据；提交前请确认岗位描述仍是本轮目标。'
  }
})
const quickRecommendation = computed(() => {
  const resumeId = quickResumeId.value
  const targetJobId = quickTargetJobId.value
  const matchReport = matchReportEvidence.value
  const hasJobContext = Boolean(targetJobId)
  const hasMatchContext = matchReport.verified
  const mode = resumeId ? INTERVIEW_MODE.PROJECT_DEEP_DIVE : INTERVIEW_MODE.TECHNICAL_BASIC
  const questionCount = hasMatchContext ? 8 : resumeId ? 6 : 5
  const difficulty = hasMatchContext ? 'HARD' : resumeId ? 'MEDIUM' : 'EASY'
  const interviewerStyle = hasMatchContext ? 'STRICT' : resumeId ? 'PROJECT_DEEP_DIVE' : 'NORMAL'
  const title = hasMatchContext
    ? '岗位匹配押题 8 题'
    : resumeId
      ? '简历押题 6 题'
      : '轻量技术面 5 题'
  const desc = hasMatchContext
    ? '将使用当前岗位、默认简历和可信匹配报告，优先追问高风险短板。'
    : resumeId && hasJobContext
      ? '将使用当前简历和目标岗位，直接进入项目深挖面试。'
      : resumeId
        ? '将使用默认简历，先围绕项目经历做一轮高命中追问。'
        : '暂时没有简历也能开始，先用 Java 技术基础题保持训练节奏。'
  const reasons = [
    resumeId ? `来自简历：${quickResumeName.value}` : '资料不足：未绑定简历，本轮使用通用练习配置',
    hasJobContext ? `来自目标岗位：${form.targetPosition || '当前目标岗位'}` : '目标岗位不足：按 Java 后端通用方向开练',
    matchReport.reason,
    `推荐强度：${optionLabel(difficultyOptions, difficulty)} · ${questionCount} 题 · ${optionLabel(interviewerStyleOptions, interviewerStyle)}`
  ]
  return {
    title,
    desc,
    reasons,
    payload: {
      interviewName: hasMatchContext ? '一键推荐岗位匹配押题面试' : resumeId ? '一键推荐简历押题面试' : '一键轻量技术面试',
      interviewMode: mode,
      targetPosition: form.targetPosition || 'Java 后端开发',
      experienceLevel: form.experienceLevel || '3_YEARS',
      industryDirection: form.industryDirection || 'GENERAL',
      difficulty,
      interviewerStyle,
      practiceMode: 'PRACTICE',
      questionCount,
      resumeId,
      basedOnResume: Boolean(resumeId),
      recommendationSource: hasMatchContext ? 'MATCH_REPORT' : resumeId ? 'DEFAULT_RESUME' : 'LIGHTWEIGHT',
      recommendationReason: reasons.join('；')
    } as InterviewCreateDTO
  }
})
const quickInterviewTitle = computed(() => quickRecommendation.value.title)
const quickInterviewDesc = computed(() => quickRecommendation.value.desc)
const quickRecommendationTrustLabel = computed(() => {
  if (quickRecommendation.value.payload.recommendationSource === 'MATCH_REPORT') return '可信依据'
  if (quickRecommendation.value.payload.recommendationSource === 'DEFAULT_RESUME') return '依据较完整'
  return '基础推荐'
})
const quickRecommendationTrustType = computed<'success' | 'warning' | 'info'>(() => {
  if (quickRecommendation.value.payload.recommendationSource === 'MATCH_REPORT') return 'success'
  if (quickRecommendation.value.payload.recommendationSource === 'DEFAULT_RESUME') return 'info'
  return 'warning'
})
const quickRecommendationBoundaryText = computed(() => {
  if (quickRecommendation.value.payload.recommendationSource === 'MATCH_REPORT') {
    return matchReportEvidence.value.boundary
  }
  if (quickRecommendation.value.payload.recommendationSource === 'DEFAULT_RESUME') {
    return matchReportEvidence.value.boundary
  }
  return '当前资料不足，只生成轻量技术面；不会把不确定资料当作简历、岗位或匹配报告证据。'
})
const quickContextTrustItems = computed(() => {
  const payload = quickRecommendation.value.payload
  return [
    {
      label: '简历证据',
      value: payload.resumeId ? quickResumeName.value : '未绑定，使用通用练习配置',
      missing: !payload.resumeId
    },
    {
      label: '目标岗位',
      value: quickTargetJobId.value ? form.targetPosition || '当前目标岗位' : '通用 Java 后端方向',
      missing: !quickTargetJobId.value
    },
    {
      label: '匹配报告',
      value: matchReportEvidence.value.value,
      missing: payload.recommendationSource !== 'MATCH_REPORT'
    }
  ]
})
const quickStartItems = computed(() => [
  { label: '简历上下文', value: quickResumeName.value, icon: Files },
  { label: '目标岗位', value: form.targetPosition || 'Java 后端开发', icon: Target },
  { label: '面试强度', value: `${selectedModeTitleForPayload(quickRecommendation.value.payload)} · ${quickRecommendation.value.payload.questionCount} 题`, icon: Zap }
])
const quickStartNotice = computed(() => {
  if (resumeLoadError.value) return '简历列表暂时不可用，可先进入轻量技术面试。'
  if (!quickResumeId.value) return '还没有可用简历，系统会先创建轻量技术面试。'
  return ''
})
const routeContextNotice = computed(() =>
  routeContextWarning.value || (!matchReportVerifyLoading.value ? matchReportVerifyMessage.value : '')
)
const buildQuickPayload = (): InterviewCreateDTO => ({ ...quickRecommendation.value.payload })
const selectedModeTip = computed(() => {
  const map: Record<string, string> = {
    resume: '适合面试前 1-2 天，用简历和目标岗位描述做一次高命中押题。',
    project: '回答时必须补业务背景、个人职责、指标、取舍和复盘，不只讲技术名词。',
    technical: '适合日常基本功训练，答完后重点复盘不会展开的知识点。',
    system: '适合中高级岗位，重点看方案边界、容量估算、降级和可观测性。',
    hr: '适合终面或主管面前准备，把经历讲得稳定、具体、可信。',
    pressure: '适合模拟连续质疑，训练先澄清问题边界再回答。',
    industry: '选择行业模板后，会更关注该场景下的业务理解、技术取舍和项目表达。'
  }
  return map[selectedModeKey.value] || selectedModeDesc.value
})
const wizardSteps = computed(() => [
  { title: '选择场景', desc: selectedModeTitle.value },
  { title: '绑定简历', desc: selectedResumeName.value },
  { title: '对齐岗位', desc: form.targetPosition || '未选择目标岗位' },
  { title: '设置强度', desc: `${optionLabel(difficultyOptions, form.difficulty)} · ${form.questionCount} 题` },
  { title: '开始训练', desc: '创建后直接进入面试房间' }
])

const optionLabel = (options: SelectOption[], value?: string) => {
  return options.find((item) => item.value === value)?.label || (value ? '选项待确认' : '-')
}

const getQueryString = (name: string) => {
  const value = route.query[name]
  return Array.isArray(value) ? value[0] : value
}

const getQueryNumber = (name: string) => {
  const value = Number(getQueryString(name))
  return Number.isFinite(value) && value > 0 ? value : undefined
}

const loadCurrentTargetForInterview = async (failureMessage: string) => {
  try {
    const currentTarget = await getCurrentJobTargetApi()
    routeContextWarning.value = ''
    return currentTarget
  } catch (error) {
    routeContextWarning.value = getErrorMessage(error, failureMessage)
    return null
  }
}

const loadLatestVerifiedMatchReportId = async (resumeId: number, targetJobId: number) => {
  try {
    const latestMatch = await getLatestResumeJobMatchReportApi(resumeId, targetJobId)
    if (isTrustedMatchReport(latestMatch)) {
      return latestMatch?.reportId
    }
    if (latestMatch?.reportId) {
      const status = String(latestMatch.status || '').toUpperCase()
      routeContextWarning.value = status === 'SUCCESS'
        ? '最近匹配报告证据待复核，不会作为本轮面试推荐依据。'
        : '最近匹配报告尚未成功生成，不会作为本轮面试推荐依据。'
    }
    return undefined
  } catch (error) {
    routeContextWarning.value = getErrorMessage(error, '最新简历匹配报告暂时无法读取，本轮面试会继续创建，但不会附带不可核验的匹配报告证据。')
    return undefined
  }
}

const verifyRouteMatchReport = async () => {
  const matchReportId = quickMatchReportId.value
  verifiedMatchReport.value = null
  matchReportVerifyMessage.value = ''
  if (!matchReportId) return

  matchReportVerifyLoading.value = true
  try {
    const report = await getResumeJobMatchReportDetailApi(matchReportId)
    const status = String(report.status || '').toUpperCase()
    if (status !== 'SUCCESS') {
      matchReportVerifyMessage.value = status === 'FAILED'
        ? '匹配报告生成失败，不会作为推荐面试依据'
        : '匹配报告尚未成功生成，不会作为推荐面试依据'
      return
    }
    if (!isTrustedMatchReport(report)) {
      matchReportVerifyMessage.value = '匹配报告已生成但证据待复核，不会作为推荐面试依据'
      return
    }
    verifiedMatchReport.value = report
  } catch (error) {
    matchReportVerifyMessage.value = getErrorMessage(error, '匹配报告暂时无法核验，推荐面试不会把它作为可信依据。')
  } finally {
    matchReportVerifyLoading.value = false
  }
}

const parseTemplateItems = (value?: string) => {
  if (!value) return []
  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean)
    }
  } catch {
    // fall back to plain text splitting below
  }
  return trimmed
    .split(/[,\n;；、，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const applyIndustryTemplate = (template?: IndustryTemplateVO) => {
  if (!template) return
  form.industryTemplateId = template.industryTemplateId
  form.industryDirection = template.industryCode || template.industryName || form.industryDirection
}

const selectMode = (item: ModeCard) => {
  selectedModeKey.value = item.key
  form.interviewMode = item.value
  if (item.defaults) {
    Object.assign(form, item.defaults)
  }
  if (item.forceResume) {
    useResume.value = true
  }
  if ('industry' in item && item.industry) {
    if (!industryTemplates.value.length) {
      void fetchIndustryTemplates()
    } else {
      applyIndustryTemplate(selectedIndustryTemplate.value || industryTemplates.value[0])
    }
    return
  }
  form.industryTemplateId = undefined
}

const scrollToConfig = async () => {
  configExpanded.value = true
  await nextTick()
  configPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const toggleConfigExpanded = () => {
  configExpanded.value = !configExpanded.value
  if (configExpanded.value) {
    void scrollToConfig()
  }
}

watch(
  resumeRequired,
  (required) => {
    if (required) {
      useResume.value = true
    }
  },
  { immediate: true }
)

watch(useResume, (enabled) => {
  if (!enabled) {
    form.resumeId = undefined
  } else if (!form.resumeId) {
    form.resumeId = resumes.value.find((item) => item.isDefault === 1)?.id || resumes.value[0]?.id
  }
})

watch(
  () => form.industryTemplateId,
  (id) => {
    if (!isIndustryMode.value || !id) return
    const template = selectedIndustryTemplate.value
    if (template) {
      form.industryDirection = template.industryCode || template.industryName || form.industryDirection
    }
  }
)

const fetchResumes = async () => {
  resumeLoading.value = true
  resumeLoadError.value = ''
  try {
    const result = await getResumesApi({ pageNo: 1, pageSize: 50 })
    resumes.value = result.records || []
    const queryResumeId = getQueryNumber('resumeId')
    form.resumeId =
      (queryResumeId && resumes.value.some((item) => item.id === queryResumeId) ? queryResumeId : undefined) ||
      resumes.value.find((item) => item.isDefault === 1)?.id ||
      resumes.value[0]?.id
  } catch (error) {
    resumes.value = []
    form.resumeId = undefined
    resumeLoadError.value = getErrorMessage(error, '简历列表暂时加载失败，请重试后再选择简历上下文。')
  } finally {
    resumeLoading.value = false
  }
}

const fetchIndustryTemplates = (force = false) => {
  if (!force && industryTemplates.value.length) return Promise.resolve()
  if (!force && industryTemplatesPromise) return industryTemplatesPromise

  industryTemplateLoading.value = true
  industryTemplateError.value = ''

  industryTemplatesPromise = getIndustryTemplatesApi()
    .then((result) => {
      industryTemplates.value = result || []
      if (isIndustryMode.value && !form.industryTemplateId) {
        applyIndustryTemplate(industryTemplates.value[0])
      }
    })
    .catch(() => {
      industryTemplates.value = []
      industryTemplateError.value = '行业模板暂时加载失败，可以先使用其他面试模式。'
    })
    .finally(() => {
      industryTemplateLoading.value = false
      industryTemplatesPromise = null
    })

  return industryTemplatesPromise
}

const applyRouteContext = async () => {
  const source = getQueryString('source')?.toLowerCase()
  const isV3Source = source === 'job-target' || source === 'v3'
  let targetJobId = getQueryNumber('targetJobId')
  const resumeId = getQueryNumber('resumeId')
  const skillProfileId = getQueryNumber('skillProfileId')
  const matchReportId = getQueryNumber('matchReportId')

  if (resumeId) {
    useResume.value = true
    form.resumeId = resumeId
  }

  if (!targetJobId) {
    const currentTarget = await loadCurrentTargetForInterview('当前主目标岗位暂时无法读取，可继续手动配置面试；系统不会把缺失岗位当成推荐依据。')
    targetJobId = currentTarget?.id
    if (targetJobId) fallbackTargetJobId.value = targetJobId
  }
  if (!targetJobId) return

  if (isV3Source || source === 'job-target') {
    const resumeMode = modeCards.find((item) => item.key === 'resume')
    if (resumeMode) {
      selectMode(resumeMode)
    } else {
      selectedModeKey.value = 'resume'
      form.interviewMode = INTERVIEW_MODE.PROJECT_DEEP_DIVE
    }
  }
  if (isV3Source || getQueryNumber('targetJobId')) {
    sourceTargetJobId.value = targetJobId
  }

  if (targetJobId) {
    try {
      const targetJob = await getJobTargetDetailApi(targetJobId)
      form.targetPosition = targetJob.jobTitle || form.targetPosition
      form.interviewName =
        form.interviewName || `${targetJob.jobTitle || '目标岗位'}模拟面试`
    } catch (error) {
      ElMessage.warning(getErrorMessage(error, '目标岗位信息加载失败，将使用当前面试配置创建。'))
    }
  }

  if (skillProfileId || matchReportId) {
    form.interviewName = form.interviewName || '目标岗位模拟面试'
  }
}

const createInterviewWithRouteContext = async (payload: InterviewCreateDTO) => {
  let targetJobId = sourceTargetJobId.value || getQueryNumber('targetJobId') || fallbackTargetJobId.value
  const source = getQueryString('source')?.toLowerCase()
  const shouldUseJobTargetApi = Boolean((targetJobId && payload.resumeId) || source === 'job-target' || source === 'v3')

  if (!shouldUseJobTargetApi) {
    return createInterviewApi(payload)
  }

  if (!targetJobId) {
    const currentTarget = await loadCurrentTargetForInterview('当前主目标岗位暂时无法读取，目标岗位链路将要求你手动选择简历和岗位后再创建。')
    targetJobId = currentTarget?.id
  }

  let resumeId = payload.resumeId
  if (!resumeId) {
    resumeId = resumes.value.find((item) => item.isDefault === 1)?.id || resumes.value[0]?.id
  }

  let matchReportId = matchReportEvidence.value.verified ? matchReportEvidence.value.reportId : undefined
  if (!matchReportId && resumeId && targetJobId) {
    matchReportId = await loadLatestVerifiedMatchReportId(resumeId, targetJobId)
  }

  if (!resumeId || !targetJobId) {
    ElMessage.warning('目标岗位链路创建面试需要有效的简历和目标岗位信息')
    throw new Error('目标岗位链路创建面试需要有效的简历和目标岗位信息。')
  }

  return createInterviewByJobTargetApi({
    ...payload,
    resumeId,
    targetJobId,
    skillProfileId: getQueryNumber('skillProfileId'),
    matchReportId
  })
}

const handleCreate = async () => {
  if (!formRef.value) return
  if (isIndustryMode.value && !industryTemplates.value.length && !industryTemplateLoading.value) {
    await fetchIndustryTemplates()
  }
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (isIndustryMode.value && !form.industryTemplateId) {
    ElMessage.warning('请选择行业模板后再开始面试')
    return
  }
  if ((resumeRequired.value || isJobTargetFlow.value) && !form.resumeId) {
    ElMessage.warning(isJobTargetFlow.value ? '目标岗位链路创建面试需要先选择简历' : '项目深挖或综合模拟面试需要先选择简历')
    return
  }

  creating.value = true
  try {
    const template = selectedIndustryTemplate.value
    const payload: InterviewCreateDTO = {
      ...form,
      interviewMode: isIndustryMode.value ? INTERVIEW_MODE.COMPREHENSIVE : form.interviewMode,
      practiceMode: form.practiceMode,
      industryTemplateId: isIndustryMode.value ? form.industryTemplateId : undefined,
      industryDirection: isIndustryMode.value
        ? template?.industryCode || template?.industryName || form.industryDirection
        : form.industryDirection,
      resumeId: useResume.value || isJobTargetFlow.value ? form.resumeId : undefined
    }
    const result = await createInterviewWithRouteContext(payload)
    ElMessage.success('面试已创建')
    await router.push(`/interviews/room/${result.interviewId}`)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '面试创建失败，请检查配置后稍后重试。'))
  } finally {
    creating.value = false
  }
}

const applyQuickRecommendation = () => {
  const payload = buildQuickPayload()
  const mode = modeCards.find((item) => item.value === payload.interviewMode && item.forceResume === Boolean(payload.resumeId))
    || modeCards.find((item) => item.value === payload.interviewMode)
  if (mode) {
    selectedModeKey.value = mode.key
  }
  form.interviewName = payload.interviewName
  form.interviewMode = payload.interviewMode
  form.targetPosition = payload.targetPosition
  form.experienceLevel = payload.experienceLevel
  form.industryDirection = payload.industryDirection
  form.difficulty = payload.difficulty
  form.interviewerStyle = payload.interviewerStyle
  form.practiceMode = payload.practiceMode
  form.questionCount = payload.questionCount
  form.resumeId = payload.resumeId
  useResume.value = Boolean(payload.resumeId)
  ElMessage.success('已套用推荐配置，可直接开始或继续微调')
  void scrollToConfig()
}

const handleQuickCreate = async () => {
  if (resumeLoading.value || matchReportVerifyLoading.value) return
  creating.value = true
  try {
    const payload = buildQuickPayload()

    const result = payload.resumeId
      ? await createInterviewWithRouteContext(payload)
      : await createInterviewApi(payload)
    ElMessage.success(payload.resumeId ? '已创建推荐面试' : '已创建轻量技术面')
    await router.push(`/interviews/room/${result.interviewId}`)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '推荐面试创建失败，请稍后重试或先调整配置。'))
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await fetchResumes()
  await applyRouteContext()
  await verifyRouteMatchReport()
})
</script>

<style scoped lang="scss">
.interview-create {
  color: var(--app-text);
}

.create-hero,
.config-panel,
.preview-panel {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.1), transparent 38%),
    #ffffff;
  box-shadow: var(--app-shadow);
}

.create-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 26px;

  h1 {
    margin: 10px 0 10px;
    font-size: 30px;
    line-height: 1.2;
  }

  p {
    max-width: 720px;
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.eyebrow,
.hero-actions,
.hero-tags,
.preview-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.hero-tags {
  margin-top: 18px;
}

.hero-actions {
  justify-content: flex-end;
  align-content: flex-start;
}

.quick-start-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
  margin-top: 18px;
  padding: 22px;
  border: 1px solid rgba(22, 163, 74, 0.26);
  border-radius: 8px;
  background: linear-gradient(135deg, #f0fdf4, #eff6ff);
  box-shadow: var(--app-shadow);
}

.quick-start-panel__copy {
  min-width: 0;

  h2 {
    margin: 6px 0 8px;
    color: #14532d;
    font-size: 24px;
    line-height: 1.28;
  }

  p {
    max-width: 720px;
    margin: 0;
    color: #475569;
    line-height: 1.7;
  }
}

.quick-label {
  color: #166534;
  font-size: 12px;
  font-weight: 800;
}

.quick-context-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;

  article {
    display: flex;
    min-width: 0;
    gap: 10px;
    padding: 12px;
    border: 1px solid rgba(22, 163, 74, 0.18);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.72);
  }

  svg {
    flex: 0 0 auto;
    color: #16a34a;
  }

  span,
  strong {
    display: block;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }

  strong {
    overflow: hidden;
    margin-top: 4px;
    color: #0f172a;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.quick-reason-list,
.quick-create-reasons {
  display: grid;
  gap: 7px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;

  li {
    position: relative;
    padding-left: 14px;
    color: #334155;
    font-size: 12px;
    line-height: 1.55;

    &::before {
      position: absolute;
      top: 0.62em;
      left: 0;
      width: 5px;
      height: 5px;
      border-radius: 999px;
      background: #16a34a;
      content: '';
    }
  }
}

.quick-create-reasons {
  margin-top: 8px;

  li {
    color: #475569;
  }
}

.context-trust-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fbff;

  p {
    margin: 0;
    color: #475569;
    font-size: 13px;
    line-height: 1.6;
  }
}

.context-trust-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  > span {
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 800;
  }

  :deep(.el-tag) {
    flex: 0 1 auto;
    max-width: 100%;
    white-space: normal;
  }
}

.context-trust-list {
  display: grid;
  gap: 8px;

  article {
    display: grid;
    gap: 3px;
    padding: 9px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;

    span {
      color: #64748b;
      font-size: 12px;
    }

    strong {
      min-width: 0;
      overflow: hidden;
      color: #0f172a;
      font-size: 13px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &.is-missing {
      border-color: #fed7aa;
      background: #fff7ed;

      strong {
        color: #9a3412;
      }
    }
  }
}

.quick-start-panel__actions {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: 10px;

  :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}

.create-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  margin-top: 18px;
}

.config-panel,
.preview-panel {
  padding: 22px;
}

.preview-panel {
  position: sticky;
  top: 18px;
  align-self: start;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;

  h2 {
    margin: 0;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.panel-head__action {
  flex: 0 0 auto;
}

.config-collapsed {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(22, 163, 74, 0.08), transparent 42%),
    #f8fafc;
}

.config-collapsed__head {
  span {
    color: #16a34a;
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: var(--app-text);
    font-size: 18px;
  }

  p {
    margin: 8px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.7;
  }
}

.config-collapsed__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.config-collapsed__item {
  display: flex;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;

  svg {
    flex: 0 0 auto;
    color: #2563eb;
  }

  div {
    min-width: 0;
  }

  span,
  strong {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 4px;
    color: var(--app-text);
    font-size: 13px;
  }
}

.config-collapsed__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 22px;
}

.mode-card {
  display: flex;
  min-height: 150px;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;

  span {
    flex: 1;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.55;
  }

  em {
    color: #2563eb;
    font-size: 12px;
    font-style: normal;
    font-weight: 700;
  }

  &:hover:not(.disabled),
  &.active {
    border-color: rgba(37, 99, 235, 0.42);
    background: #eff6ff;
    transform: translateY(-2px);
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-section {
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #f8fafc;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-weight: 700;

  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #dbeafe;
    color: #1d4ed8;
    font-size: 12px;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 16px;
}

.resume-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

.field-empty {
  margin-top: 8px;
  color: var(--cc-warning);
  font-size: 12px;
}

.field-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: #dc2626;
  font-size: 12px;
}

.template-preview {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
}

.template-preview__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;

  strong {
    display: block;
    color: var(--app-text);
  }

  span {
    display: block;
    margin-top: 6px;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;

  span {
    padding: 5px 8px;
    border: 1px solid #dbeafe;
    border-radius: 999px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 12px;
  }
}

.create-alert {
  margin-top: 2px;
}

.summary-card,
.quick-create-card,
.summary-list,
.pending-box,
.wizard-flow {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #f8fafc;
}

.summary-card {
  padding: 18px;

  span,
  p {
    color: var(--app-text-muted);
  }

  strong {
    display: block;
    margin: 8px 0;
    font-size: 24px;
  }

  p {
    margin: 0;
    line-height: 1.6;
  }

  &.primary {
    background: linear-gradient(135deg, #eff6ff, #f0fdf4);
  }
}

.quick-create-card {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 16px;
  border-color: rgba(22, 163, 74, 0.24);
  background: #f0fdf4;

  span,
  p {
    color: var(--app-text-muted);
  }

  strong {
    color: #166534;
    font-size: 18px;
  }

  p {
    margin: 0;
    line-height: 1.6;
  }

  .el-button {
    margin-top: 4px;
    width: 100%;
  }
}

.wizard-flow {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding: 12px;

  article {
    display: flex;
    gap: 10px;
    padding: 10px;
    border-radius: 8px;

    &.active {
      background: #ffffff;
    }
  }

  article > span {
    display: inline-flex;
    flex: 0 0 26px;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: #dbeafe;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 800;
  }

  strong,
  p {
    display: block;
    margin: 0;
  }

  p {
    margin-top: 4px;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

.summary-list {
  margin-top: 14px;
  overflow: hidden;

  div {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--app-border);

    &:last-child {
      border-bottom: 0;
    }
  }

  span {
    color: var(--app-text-muted);
    font-size: 13px;
  }

  strong {
    text-align: right;
  }
}

.pending-box {
  display: flex;
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
  color: var(--app-text-muted);

  svg {
    flex: 0 0 auto;
    color: #f59e0b;
  }

  strong {
    color: var(--app-text);
  }

  p {
    margin: 6px 0 0;
    font-size: 13px;
    line-height: 1.6;
  }
}

.preview-actions {
  justify-content: flex-end;
  margin-top: 18px;
}

@media (max-width: 1180px) {
  .create-grid,
  .mode-grid,
  .quick-start-panel {
    grid-template-columns: 1fr 1fr;
  }

  .quick-context-grid {
    grid-template-columns: 1fr;
  }

  .preview-panel {
    position: static;
  }
}

@media (max-width: 760px) {
  .create-hero {
    flex-direction: column;
  }

  .create-grid,
  .mode-grid,
  .config-collapsed__grid,
  .form-grid,
  .quick-start-panel {
    grid-template-columns: 1fr;
  }

  .quick-start-panel {
    padding: 18px;
  }

  .hero-actions,
  .preview-actions {
    display: grid;
    grid-template-columns: 1fr;
    justify-content: stretch;
  }

  .hero-actions :deep(.el-button),
  .preview-actions :deep(.el-button),
  .config-collapsed__actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }

  .context-trust-card__head {
    align-items: flex-start;
    flex-direction: column;
  }
}


@media (max-width: 720px) {
  .page-hero,
  .history-hero,
  .detail-hero,
  .report-top,
  .room-topbar,
  .notification-hero,
  .create-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions,
  .report-actions,
  .topbar-actions,
  .card-actions,
  .filter-bar,
  .notification-toolbar {
    justify-content: flex-start;
  }
}
</style>
