<template>
  <div class="interview-create page-shell">
    <section class="create-hero">
      <div>
        <div class="eyebrow">
          <Sparkles :size="16" />
          推荐开练
        </div>
        <h1>先做一场最值得练的面试</h1>
        <p>系统会基于当前简历、目标岗位和已核验资料给出推荐；缺少资料时会明确提示，并退回轻量技术面。</p>
        <div class="hero-tags">
          <el-tag effect="plain">创建后直接开始</el-tag>
          <el-tag effect="plain" type="info">支持简历上下文</el-tag>
          <el-tag effect="plain" type="warning">行业场景可用</el-tag>
          <el-tag :type="voicePreflightReady ? 'success' : 'info'" effect="plain">
            {{ voicePreflightReady ? '语音设备已预检' : '语音可选' }}
          </el-tag>
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
        <div class="quick-start-panel__head">
          <div>
            <span class="quick-label">推荐面试计划</span>
            <h2>{{ quickInterviewTitle }}</h2>
            <p>{{ quickInterviewDesc }}</p>
          </div>
          <el-tag :type="quickRecommendationTrustType" effect="plain">{{ quickRecommendationTrustLabel }}</el-tag>
        </div>
        <div class="recommended-plan-grid">
          <article v-for="item in quickPlanItems" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.desc }}</p>
          </article>
        </div>
        <div class="quick-context-grid">
          <article v-for="item in quickStartItems" :key="item.label">
            <component :is="item.icon" :size="17" />
            <div>
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </article>
        </div>
        <div v-if="isApplicationContextFlow || applicationPackageContext" class="application-context-card">
          <div class="application-context-card__head">
            <div>
              <span>{{ applicationContextTitle }}</span>
              <strong>{{ jdContextText }}</strong>
            </div>
            <el-tag effect="plain" :type="applicationPackageContext?.readinessLevel === 'READY' ? 'success' : 'warning'">
              {{ applicationPackageReadinessText }}
            </el-tag>
          </div>
          <p>
            文本模拟面试是本次主链路；语音只作为后续可降级预览，不会阻塞当前创建。
          </p>
          <div class="application-context-grid">
            <article v-for="item in applicationContextItems" :key="item.label" :class="{ 'is-missing': item.missing }">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
        </div>
        <ul class="quick-reason-list">
          <li v-for="item in quickRecommendation.reasons" :key="item">{{ item }}</li>
        </ul>
        <details class="quick-trust-card">
          <summary>推荐依据与可信边界</summary>
          <p>{{ quickRecommendationBoundaryText }}</p>
          <div class="context-trust-list">
            <article v-for="item in quickContextTrustItems" :key="item.label" :class="{ 'is-missing': item.missing }">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
        </details>
      </div>
      <div class="quick-start-panel__actions">
        <el-alert v-if="quickStartNotice" :title="quickStartNotice" type="warning" :closable="false" show-icon />
        <el-alert v-if="routeContextNotice" :title="routeContextNotice" type="warning" :closable="false" show-icon />
        <el-button
          type="primary"
          size="large"
          class="quick-primary-cta"
          :loading="creating || resumeLoading || matchReportVerifyLoading"
          @click="handleQuickCreate"
        >
          <Play :size="17" />
          开始推荐面试
        </el-button>
        <el-button size="large" :disabled="creating || resumeLoading || matchReportVerifyLoading" @click="applyQuickRecommendation">
          <Sparkles :size="17" />
          使用推荐并微调
        </el-button>
        <el-button size="large" @click="scrollToConfig">
          <Settings2 :size="17" />
          查看可选微调
        </el-button>
        <el-button size="large" @click="voiceDeviceCheckVisible = true">
          <Mic :size="17" />
          语音设备预检
        </el-button>
      </div>
    </section>

    <div class="create-grid">
      <section ref="configPanelRef" class="config-panel">
        <div class="panel-head">
          <div>
            <h2>可选微调</h2>
            <p>默认按上方推荐计划开始；只有想换场景、题量、行业模板或简历上下文时再展开。</p>
          </div>
          <el-button class="panel-head__action" type="primary" plain @click="toggleConfigExpanded">
            <Settings2 :size="16" />
            {{ configExpanded ? '收起微调' : '展开微调' }}
          </el-button>
        </div>

        <div v-if="!configExpanded" class="config-collapsed">
          <div class="config-collapsed__head">
            <span>已准备好本轮计划</span>
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
            <el-button :disabled="creating || resumeLoading || matchReportVerifyLoading" @click="applyQuickRecommendation">
              <Sparkles :size="16" />
              使用推荐并微调
            </el-button>
            <el-button type="primary" plain @click="toggleConfigExpanded">
              <Settings2 :size="16" />
              微调计划
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
                面试目标
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
                训练节奏
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
              v-if="resumeRequired"
              class="create-alert"
              type="warning"
              :closable="false"
              show-icon
              title="当前面试模式建议选择简历，便于进行项目深挖和综合追问。"
            />
            <el-alert
              v-if="isJobTargetFlow && !quickResumeId"
              class="create-alert"
              type="warning"
              :closable="false"
              show-icon
              title="目标岗位推荐缺少可用简历时会先降级为轻量技术面；也可以先进入简历中心创建简历后再回来。"
            />
            <el-alert
              v-if="routeContextNotice"
              class="create-alert"
              type="warning"
              :closable="false"
              show-icon
              :title="routeContextNotice"
            />
            <div class="config-form-actions">
              <el-button type="primary" size="large" :loading="creating" @click="handleCreate">
                <Play :size="16" />
                按当前计划开始
              </el-button>
              <el-button size="large" :disabled="creating" @click="applyQuickRecommendation">
                <Sparkles :size="16" />
                恢复推荐计划
              </el-button>
            </div>
          </el-form>
        </template>

        <div class="form-section scenario-selector-shell">
          <InterviewScenarioSelector
            v-model="selectedScenario"
            :mode-key="selectedModeKey"
          />
        </div>
      </section>

      <aside class="preview-panel">
        <div class="panel-head">
          <div>
            <h2>本轮面试计划</h2>
            <p>按推荐计划可直接开始，也可以展开左侧做少量微调。</p>
          </div>
        </div>

        <div class="summary-card primary">
          <span>训练模式</span>
          <strong>{{ selectedModeTitle }}</strong>
          <p>{{ selectedModeDesc }}</p>
        </div>

        <div class="quick-create-card">
          <span>推荐计划</span>
          <strong>{{ quickInterviewTitle }}</strong>
          <p>{{ quickInterviewDesc }}</p>
          <ul class="quick-create-reasons">
            <li v-for="item in quickRecommendation.reasons" :key="item">{{ item }}</li>
          </ul>
          <el-button plain @click="scrollToConfig">
            <Settings2 :size="16" />
            查看可选微调
          </el-button>
        </div>

        <details class="context-trust-card">
          <summary class="context-trust-card__head">
            <span>推荐依据与可信边界</span>
            <el-tag :type="quickRecommendationTrustType" effect="plain">{{ quickRecommendationTrustLabel }}</el-tag>
          </summary>
          <p>{{ quickRecommendationBoundaryText }}</p>
          <div class="context-trust-list">
            <article v-for="item in quickContextTrustItems" :key="item.label" :class="{ 'is-missing': item.missing }">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
        </details>

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
          <el-button v-if="configExpanded" plain size="large" @click="toggleConfigExpanded">
            <Settings2 :size="16" />
            收起微调
          </el-button>
          <el-button v-else type="primary" plain size="large" @click="toggleConfigExpanded">
            <Settings2 :size="16" />
            展开微调
          </el-button>
        </div>
      </aside>
    </div>

    <InterviewVoiceDeviceCheck
      v-model="voiceDeviceCheckVisible"
      @ready="handleVoicePreflightReady"
      @fallback="handleVoiceTextFallback"
    />
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { BrainCircuit, BriefcaseBusiness, Files, History, LayoutDashboard, Mic, Play, Settings2, Sparkles, Target, Zap } from 'lucide-vue-next'
import { computed, nextTick, onMounted, reactive, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getApplicationPackageApi, previewApplicationPackageApi } from '@/api/applicationPackage'
import { createInterviewApi, createInterviewByJobTargetApi, getIndustryTemplatesApi } from '@/api/interview'
import {
  bindInterviewScenarioApi,
  createInterviewByJobTargetWithScenarioApi,
  createInterviewWithScenarioApi
} from '@/api/interviewVoiceProduct'
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
import { buildInterviewCreatePayload } from '@/features/interview-create'
import { saveInterviewVoiceProductContext } from '@/features/interview-voice-product'
import type {
  InterviewScenarioBindingVO,
  InterviewScenarioSummary
} from '@/types/interviewVoiceProduct'
import InterviewScenarioSelector from '@/views/interview/components/InterviewScenarioSelector.vue'
import InterviewVoiceDeviceCheck from '@/views/interview/components/InterviewVoiceDeviceCheck.vue'
import type { JobApplicationPackageVO } from '@/types/applicationPackage'
import type {
  IndustryTemplateVO,
  InterviewCreateByJobTargetDTO,
  InterviewCreateDTO
} from '@/types/interview'
import type { ResumeJobMatchReportDetailVO } from '@/types/resumeJobMatch'
import type { ResumeVO } from '@/types/resume'
import type { SelectOption } from '@/types/common'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const route = useRoute()
const formRef = ref<FormInstance>()
const configPanelRef = ref<HTMLElement>()
const configExpanded = ref(false)
const voiceDeviceCheckVisible = ref(false)
const voicePreflightReady = ref(false)
const selectedScenario = ref<InterviewScenarioSummary | null>(null)
const creating = ref(false)
const resumeLoading = ref(false)
const resumeLoadError = ref('')
const matchReportVerifyLoading = ref(false)
const matchReportVerifyMessage = ref('')
const routeContextWarning = ref('')
const applicationPackageLoading = ref(false)
const applicationPackageWarning = ref('')
const applicationPackageContext = ref<JobApplicationPackageVO | null>(null)
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
  applicationId: undefined,
  applicationPackageId: undefined,
  targetJobId: undefined,
  jdAnalysisId: undefined,
  resumeVersionId: undefined,
  matchReportId: undefined,
  projectEvidenceIds: undefined,
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
  resumeId: resumeRequired.value || useResume.value ? [{ required: true, message: '请选择简历', trigger: 'change' }] : []
}))

const selectedResumeName = computed(() => {
  if (!useResume.value) return '不使用简历'
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
  const applicationContext = applicationContextSnapshot.value
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
    isApplicationContextFlow.value ? `${applicationContextTitle.value}：文本模拟面试是本次主链路，语音仅作为后续可降级预览` : '文本模拟面试为主链路',
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
      applicationId: applicationContext.applicationId,
      applicationPackageId: applicationContext.applicationPackageId,
      targetJobId: applicationContext.targetJobId,
      jdAnalysisId: applicationContext.jdAnalysisId,
      resumeVersionId: applicationContext.resumeVersionId,
      matchReportId: applicationContext.matchReportId,
      projectEvidenceIds: applicationContext.projectEvidenceIds,
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
  { label: '进入来源', value: isApplicationContextFlow.value ? applicationContextTitle.value : '面试中心', icon: BriefcaseBusiness },
  { label: '面试强度', value: `${selectedModeTitleForPayload(quickRecommendation.value.payload)} · ${quickRecommendation.value.payload.questionCount} 题`, icon: Zap }
])
const quickPlanItems = computed(() => {
  const payload = quickRecommendation.value.payload
  return [
    {
      label: '训练目标',
      value: selectedModeTitleForPayload(payload),
      desc: payload.resumeId ? '围绕真实经历和目标岗位追问' : '先用通用技术面保持练习节奏'
    },
    {
      label: '节奏安排',
      value: `${payload.questionCount} 题 · ${optionLabel(difficultyOptions, payload.difficulty)}`,
      desc: payload.practiceMode === 'PRACTICE' ? '练习模式，便于及时复盘' : '正式模式，结束后统一生成报告'
    },
    {
      label: '依据边界',
      value: quickRecommendationTrustLabel.value,
      desc: payload.recommendationSource === 'MATCH_REPORT' ? '使用已核验报告，不混入失败证据' : '资料不足处会降级为基础推荐'
    }
  ]
})
const quickStartNotice = computed(() => {
  if (resumeLoadError.value) return '简历列表暂时不可用，可先进入轻量技术面试。'
  if (isJobTargetFlow.value && !quickTargetJobId.value && !quickResumeId.value) return '简历和目标岗位资料暂时不足，本轮会降级为轻量技术面；可补全简历和岗位目标后再重试。'
  if (isJobTargetFlow.value && !quickTargetJobId.value) return '目标岗位暂时不可用，本轮会降级为普通面试；可稍后到岗位目标页补全后再重试。'
  if (!quickResumeId.value) return '还没有可用简历，系统会先创建轻量技术面试。'
  return ''
})
const routeContextNotice = computed(() =>
  routeContextWarning.value || applicationPackageWarning.value || (!matchReportVerifyLoading.value ? matchReportVerifyMessage.value : '')
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

const getQueryNumberList = (name: string) => {
  const value = getQueryString(name)
  if (!value) return []
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
}

const isPersistedApplicationPackageId = (value?: string | number | null) => {
  const id = String(value || '').trim()
  return Boolean(id && !id.startsWith('preview:') && id !== 'preview-degraded')
}

const applicationSource = computed(() => getQueryString('source')?.toLowerCase() || '')
const isApplicationContextFlow = computed(() =>
  ['application-package', 'application'].includes(applicationSource.value)
)
const routeProjectEvidenceIds = computed(() => getQueryNumberList('projectEvidenceIds'))
const contextProjectEvidenceIds = computed(() => {
  const pack = applicationPackageContext.value
  const ids =
    pack?.interviewContext?.projectEvidenceIds ||
    pack?.interviewPreparation?.projectEvidenceIds ||
    pack?.projectEvidenceIds ||
    routeProjectEvidenceIds.value
  return Array.from(new Set((ids || []).filter((item) => Number.isFinite(Number(item)) && Number(item) > 0).map(Number)))
})
const applicationContextSnapshot = computed(() => {
  const pack = applicationPackageContext.value
  const rawQueryApplicationPackageId = getQueryString('applicationPackageId')
  const queryApplicationPackageId = rawQueryApplicationPackageId == null ? undefined : String(rawQueryApplicationPackageId)
  const packApplicationPackageId = pack?.id == null ? undefined : String(pack.id)
  return {
    source: applicationSource.value,
    applicationId: getQueryNumber('applicationId') || pack?.jobApplicationId,
    applicationPackageId: isPersistedApplicationPackageId(queryApplicationPackageId)
      ? queryApplicationPackageId
      : isPersistedApplicationPackageId(packApplicationPackageId)
        ? packApplicationPackageId
        : undefined,
    targetJobId: pack?.interviewContext?.targetJobId || pack?.interviewPreparation?.targetJobId || getQueryNumber('targetJobId') || pack?.targetJobId,
    jdAnalysisId: getQueryNumber('jdAnalysisId') || pack?.jdAnalysisId || pack?.job?.jdAnalysisId,
    resumeVersionId:
      pack?.interviewContext?.resumeVersionId ||
      pack?.interviewPreparation?.resumeVersionId ||
      getQueryNumber('resumeVersionId') ||
      pack?.recommendedResumeVersionId ||
      pack?.recommendedResume?.resumeVersionId,
    matchReportId:
      pack?.interviewContext?.matchReportId ||
      pack?.interviewPreparation?.matchReportId ||
      getQueryNumber('matchReportId') ||
      pack?.matchReportId ||
      pack?.matchResult?.matchReportId ||
      pack?.matchSummary?.matchReportId,
    projectEvidenceIds: contextProjectEvidenceIds.value
  }
})
const applicationContextTitle = computed(() => {
  const source = applicationContextSnapshot.value.source
  if (source === 'application-package') return '投递包上下文'
  if (source === 'application') return '投递记录上下文'
  return '岗位上下文'
})
const readinessLabelMap: Record<string, string> = {
  READY: '已准备好',
  NEEDS_RESUME: '待补简历',
  NEEDS_EVIDENCE: '待补项目证据',
  NEEDS_TRAINING: '建议先练面试',
  BLOCKED: '暂不可投递'
}
const applicationPackageReadinessText = computed(() => {
  if (applicationPackageLoading.value) return '正在读取投递包准备度'
  const level = String(applicationPackageContext.value?.readinessLevel || '').toUpperCase()
  if (!level) return '未取得准备度，按已知岗位字段创建'
  return readinessLabelMap[level] || level
})
const recommendedResumeContextText = computed(() => {
  const resume = applicationPackageContext.value?.recommendedResume
  if (resume?.resumeTitle || resume?.resumeVersionName || resume?.versionName) {
    return [resume.resumeTitle, resume.resumeVersionName || resume.versionName].filter(Boolean).join(' · ')
  }
  const resumeVersionId = applicationContextSnapshot.value.resumeVersionId
  return resumeVersionId ? `推荐简历版本 #${resumeVersionId}` : '缺少推荐简历，创建时使用默认简历或降级轻量技术面'
})
const projectEvidenceGapText = computed(() => {
  const coverage = applicationPackageContext.value?.projectEvidenceCoverage
  const insufficientCount = coverage?.insufficientRequirements?.length || 0
  const suggestedCount = coverage?.suggestedFields?.length || 0
  if (insufficientCount) return `${insufficientCount} 个 JD 要求项目证据不足`
  if (suggestedCount) return `${suggestedCount} 个证据字段建议补充`
  if (contextProjectEvidenceIds.value.length) return `已带入 ${contextProjectEvidenceIds.value.length} 项项目证据`
  return '未带入项目证据，面试会先按岗位/JD 和简历追问'
})
const jdContextText = computed(() => {
  const pack = applicationPackageContext.value
  const jobTitle = pack?.job?.jobTitle || pack?.jobTitle || form.targetPosition
  const companyName = pack?.job?.companyName || pack?.companyName
  const jdAnalysisId = applicationContextSnapshot.value.jdAnalysisId
  const title = [companyName, jobTitle].filter(Boolean).join(' · ')
  return title || (jdAnalysisId ? `岗位描述分析 #${jdAnalysisId}` : '未取得岗位描述详情，按目标岗位名称降级')
})
const applicationContextItems = computed(() => {
  const context = applicationContextSnapshot.value
  return [
    { label: '岗位/JD', value: jdContextText.value, missing: !context.targetJobId && !context.jdAnalysisId },
    { label: '投递包 readiness', value: applicationPackageReadinessText.value, missing: !applicationPackageContext.value?.readinessLevel },
    { label: '推荐简历', value: recommendedResumeContextText.value, missing: !context.resumeVersionId },
    { label: '项目证据缺口', value: projectEvidenceGapText.value, missing: !context.projectEvidenceIds.length }
  ]
})

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

const loadLatestVerifiedMatchReportId = async (resumeId: number, targetJobId: number, resumeVersionId?: number) => {
  try {
    const latestMatch = await getLatestResumeJobMatchReportApi(resumeId, targetJobId, resumeVersionId)
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
    if (!form.resumeId && !resumeRequired.value) {
      useResume.value = false
    }
  } catch (error) {
    resumes.value = []
    form.resumeId = undefined
    if (!resumeRequired.value) {
      useResume.value = false
    }
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

const loadApplicationPackageContext = async () => {
  const applicationPackageId = getQueryString('applicationPackageId')
  const params = {
    targetJobId: getQueryNumber('targetJobId'),
    jdAnalysisId: getQueryNumber('jdAnalysisId'),
    resumeVersionId: getQueryNumber('resumeVersionId'),
    matchReportId: getQueryNumber('matchReportId'),
    projectEvidenceIds: routeProjectEvidenceIds.value
  }
  const shouldPreview =
    isPersistedApplicationPackageId(applicationPackageId) ||
    isApplicationContextFlow.value ||
    Boolean(
      params.targetJobId ||
      params.jdAnalysisId ||
      params.resumeVersionId ||
      params.matchReportId ||
      params.projectEvidenceIds.length
    )
  if (!shouldPreview) return

  applicationPackageLoading.value = true
  applicationPackageWarning.value = ''
  try {
    applicationPackageContext.value = isPersistedApplicationPackageId(applicationPackageId)
      ? await getApplicationPackageApi(applicationPackageId as string)
      : await previewApplicationPackageApi(params)
  } catch (error) {
    applicationPackageContext.value = null
    applicationPackageWarning.value = getErrorMessage(error, '投递包上下文暂时无法读取，本轮会用路由中可确认的岗位/JD、简历和匹配报告字段降级创建文本面试。')
  } finally {
    applicationPackageLoading.value = false
  }
}

const applyRouteContext = async () => {
  const source = getQueryString('source')?.toLowerCase()
  const isV3Source = source === 'job-target' || source === 'v3'
  const hasApplicationSource = source === 'application-package' || source === 'application'
  const context = applicationContextSnapshot.value
  let targetJobId = context.targetJobId
  const resumeId = getQueryNumber('resumeId')
  const skillProfileId = getQueryNumber('skillProfileId')
  const matchReportId = context.matchReportId

  form.applicationId = context.applicationId
  form.applicationPackageId = context.applicationPackageId
  form.targetJobId = context.targetJobId
  form.jdAnalysisId = context.jdAnalysisId
  form.resumeVersionId = context.resumeVersionId
  form.matchReportId = context.matchReportId
  form.projectEvidenceIds = context.projectEvidenceIds

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

  if (isV3Source || hasApplicationSource || source === 'job-target') {
    const resumeMode = modeCards.find((item) => item.key === 'resume')
    if (resumeMode) {
      selectMode(resumeMode)
    } else {
      selectedModeKey.value = 'resume'
      form.interviewMode = INTERVIEW_MODE.PROJECT_DEEP_DIVE
    }
  }
  if (isV3Source || hasApplicationSource || context.targetJobId) {
    sourceTargetJobId.value = targetJobId
  }

  if (targetJobId) {
    try {
      const targetJob = await getJobTargetDetailApi(targetJobId)
      form.targetPosition = applicationPackageContext.value?.job?.jobTitle || applicationPackageContext.value?.jobTitle || targetJob.jobTitle || form.targetPosition
      form.interviewName =
        form.interviewName || `${form.targetPosition || targetJob.jobTitle || '目标岗位'}文本模拟面试`
    } catch (error) {
      ElMessage.warning(getErrorMessage(error, '目标岗位信息加载失败，将使用当前面试配置创建。'))
    }
  }

  if (!targetJobId && (applicationPackageContext.value?.job?.jobTitle || applicationPackageContext.value?.jobTitle)) {
    form.targetPosition = applicationPackageContext.value?.job?.jobTitle || applicationPackageContext.value?.jobTitle || form.targetPosition
  }

  if (skillProfileId || matchReportId || hasApplicationSource) {
    form.interviewName = form.interviewName || '目标岗位文本模拟面试'
  }
}

const createStandardInterview = (payload: InterviewCreateDTO) => {
  const scenarioVersionId = selectedScenario.value?.scenarioVersionId
  return scenarioVersionId
    ? createInterviewWithScenarioApi({ ...payload, scenarioVersionId })
    : createInterviewApi(payload)
}

const createJobTargetInterview = (
  payload: InterviewCreateByJobTargetDTO
) => {
  const scenarioVersionId = selectedScenario.value?.scenarioVersionId
  return scenarioVersionId
    ? createInterviewByJobTargetWithScenarioApi({ ...payload, scenarioVersionId })
    : createInterviewByJobTargetApi(payload)
}

const createInterviewWithRouteContext = async (payload: InterviewCreateDTO) => {
  const context = applicationContextSnapshot.value
  const targetJobId = sourceTargetJobId.value || context.targetJobId || getQueryNumber('targetJobId') || fallbackTargetJobId.value
  const source = getQueryString('source')?.toLowerCase()
  const hasJobTargetIntent =
    source === 'job-target' ||
    source === 'v3' ||
    source === 'application-package' ||
    source === 'application' ||
    Boolean(sourceTargetJobId.value || context.targetJobId || getQueryNumber('targetJobId'))
  const contextualPayload: InterviewCreateDTO = {
    ...payload,
    applicationId: context.applicationId ?? payload.applicationId,
    applicationPackageId: context.applicationPackageId ?? payload.applicationPackageId,
    targetJobId: targetJobId ?? payload.targetJobId,
    jdAnalysisId: context.jdAnalysisId ?? payload.jdAnalysisId,
    resumeVersionId: context.resumeVersionId ?? payload.resumeVersionId,
    matchReportId: context.matchReportId ?? payload.matchReportId,
    projectEvidenceIds: context.projectEvidenceIds.length ? context.projectEvidenceIds : payload.projectEvidenceIds
  }

  if (!contextualPayload.resumeId) {
    if (hasJobTargetIntent) {
      routeContextWarning.value = '当前没有可用简历，已改用轻量技术面创建；可先创建简历后再使用岗位推荐面试。'
    }
    return createStandardInterview(contextualPayload)
  }

  if (!targetJobId) {
    if (hasJobTargetIntent) {
      routeContextWarning.value = '目标岗位信息暂时不可用，已改用普通面试创建；可稍后到岗位目标页补全后再重试。'
    }
    return createStandardInterview(contextualPayload)
  }

  let resumeId = contextualPayload.resumeId
  if (!resumeId) {
    resumeId = resumes.value.find((item) => item.isDefault === 1)?.id || resumes.value[0]?.id
  }

  let matchReportId = matchReportEvidence.value.verified ? matchReportEvidence.value.reportId : undefined
  if (!matchReportId && resumeId && targetJobId) {
    matchReportId = await loadLatestVerifiedMatchReportId(resumeId, targetJobId, contextualPayload.resumeVersionId)
  }

  if (!resumeId || !targetJobId) {
    return createStandardInterview({
      ...contextualPayload,
      resumeId: undefined,
      basedOnResume: false
    })
  }

  return createJobTargetInterview({
    ...contextualPayload,
    resumeId,
    targetJobId,
    skillProfileId: getQueryNumber('skillProfileId'),
    matchReportId
  })
}

const resolveCreatedInterviewId = (result: unknown) => {
  const session = result as { interviewId?: number | string; id?: number | string; sessionId?: number | string }
  const value = Number(session?.interviewId || session?.id || session?.sessionId || 0)
  return Number.isFinite(value) && value > 0 ? value : 0
}

const bindSelectedScenario = async (sessionId: number, result: unknown) => {
  const scenario = selectedScenario.value
  let binding: InterviewScenarioBindingVO | undefined
  let bindingStatus: 'BOUND' | 'PENDING' | 'NONE' = scenario ? 'PENDING' : 'NONE'
  let bindingMessage = scenario
    ? '已保存所选剧本上下文，等待服务端绑定确认。'
    : '本轮未选择版本化剧本。'
  const created = result as {
    scenarioVersionId?: number | string
    rubricVersionId?: number | string
    scenarioCode?: string
  }
  const createdScenarioVersionId = Number(created.scenarioVersionId || 0)
  const createdRubricVersionId = Number(created.rubricVersionId || scenario?.rubricVersionId || 0)

  if (createdScenarioVersionId > 0) {
    binding = {
      bindingId: 0,
      sessionId,
      scenarioVersionId: createdScenarioVersionId,
      rubricVersionId: createdRubricVersionId,
      bindingSource: 'CREATE_TRANSACTION'
    }
    bindingStatus = 'BOUND'
    bindingMessage = `主创建事务已锁定剧本 ${created.scenarioCode || `#${createdScenarioVersionId}`} 与量表版本 #${createdRubricVersionId}。`
  } else if (scenario) {
    try {
      binding = await bindInterviewScenarioApi(sessionId, {
        scenarioVersionId: scenario.scenarioVersionId,
        bindingSource: 'USER_SELECTED'
      }, {
        silentError: true
      })
      bindingStatus = 'BOUND'
      bindingMessage = `已绑定剧本 v${scenario.versionNo} 与量表版本 #${binding.rubricVersionId}。`
    } catch (error) {
      bindingMessage = getErrorMessage(
        error,
        '面试已创建，但剧本绑定接口暂时不可用。房间会保留“待绑定”状态，不会把本地选择显示为已绑定。'
      )
      ElMessage.warning(bindingMessage)
    }
  }

  saveInterviewVoiceProductContext({
    sessionId,
    voicePreflightReady: voicePreflightReady.value,
    scenario: scenario || undefined,
    scenarioBindingStatus: bindingStatus,
    scenarioBinding: binding,
    bindingMessage,
    savedAt: new Date().toISOString()
  })

  return {
    bindingStatus,
    binding
  }
}

const enterCreatedInterviewRoom = async (result: unknown) => {
  const createdInterviewId = resolveCreatedInterviewId(result)
  if (!createdInterviewId) {
    throw new Error('面试已创建，但没有返回可进入的面试房间编号。请从面试历史进入最近一次面试。')
  }
  const scenarioResult = await bindSelectedScenario(createdInterviewId, result)
  const query: Record<string, string> = {}
  if (selectedScenario.value) {
    query.scenarioVersionId = String(selectedScenario.value.scenarioVersionId)
    query.scenarioBinding = scenarioResult.bindingStatus.toLowerCase()
  }
  if (voicePreflightReady.value) {
    query.voicePreflight = 'ready'
  }
  await router.push({
    path: `/interviews/room/${createdInterviewId}`,
    query
  })
  return scenarioResult.bindingStatus
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
  if ((resumeRequired.value || useResume.value) && !form.resumeId) {
    ElMessage.warning(useResume.value
      ? '请先选择简历；也可以关闭简历上下文后改用轻量技术面。'
      : '项目深挖或综合模拟面试需要先选择简历。')
    return
  }

  creating.value = true
  try {
    const payload = buildInterviewCreatePayload({
      form,
      isIndustryMode: isIndustryMode.value,
      useResume: useResume.value && Boolean(form.resumeId),
      isJobTargetFlow: isJobTargetFlow.value,
      selectedIndustryTemplate: selectedIndustryTemplate.value
    })
    const result = await createInterviewWithRouteContext(payload)
    const scenarioBindingStatus = await enterCreatedInterviewRoom(result)
    ElMessage.success(
      scenarioBindingStatus === 'BOUND'
        ? '面试与版本化剧本已绑定，正在进入 AI 面试训练室'
        : scenarioBindingStatus === 'PENDING'
          ? '面试已创建，剧本绑定状态待确认'
          : '面试已创建，正在进入 AI 面试训练室'
    )
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '面试创建失败。请重试，或关闭简历上下文后先创建轻量技术面。'))
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
  ElMessage.success('已使用推荐计划，可直接开始或继续微调')
  void scrollToConfig()
}

const handleQuickCreate = async () => {
  if (resumeLoading.value || matchReportVerifyLoading.value) return
  creating.value = true
  try {
    const payload = buildQuickPayload()

    const result = await createInterviewWithRouteContext(payload)
    const scenarioBindingStatus = await enterCreatedInterviewRoom(result)
    ElMessage.success(
      scenarioBindingStatus === 'BOUND'
        ? '已创建推荐面试并锁定剧本版本，正在进入训练室'
        : payload.resumeId
          ? '已创建推荐面试，正在进入训练室'
          : '已创建轻量技术面，正在进入训练室'
    )
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '推荐面试创建失败。请重试、先创建简历，或展开微调后改用轻量技术面。'))
  } finally {
    creating.value = false
  }
}

const handleVoicePreflightReady = () => {
  voicePreflightReady.value = true
  ElMessage.success('语音设备预检通过，进入房间后仍可随时切换文本回答。')
}

const handleVoiceTextFallback = () => {
  voicePreflightReady.value = false
  ElMessage.info('已保留文本回答模式，语音能力不会阻塞本轮面试。')
}

onMounted(async () => {
  await fetchResumes()
  await loadApplicationPackageContext()
  await applyRouteContext()
  await verifyRouteMatchReport()
})
</script>

<style scoped lang="scss">
.interview-create {
  color: var(--user-text);
}

.create-hero,
.config-panel,
.preview-panel {
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;
}

.create-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;

  h1 {
    margin: 10px 0 10px;
    font-size: 26px;
    line-height: 1.2;
  }

  p {
    max-width: 720px;
    margin: 0;
    color: var(--user-text-muted);
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
  color: var(--user-primary);
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
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  width: 100%;
  margin: 14px auto 0;
  padding: 18px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-surface-tint);
  box-shadow: none;
}

.quick-start-panel__copy {
  min-width: 0;

  h2 {
    margin: 6px 0 8px;
    color: var(--user-text);
    font-size: 24px;
    line-height: 1.28;
  }

  p {
    max-width: 720px;
    margin: 0;
    color: var(--user-text-muted);
    line-height: 1.7;
  }
}

.quick-start-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  > div {
    min-width: 0;
  }

  :deep(.el-tag) {
    flex: 0 0 auto;
    white-space: normal;
  }
}

.quick-label {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.recommended-plan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;

  article {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--user-primary-border);
    border-radius: 8px;
    background: var(--user-surface-muted);
  }

  span,
  strong,
  p {
    display: block;
  }

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 6px;
    color: var(--user-text);
    font-size: 15px;
    line-height: 1.35;
  }

  p {
    margin: 7px 0 0;
    color: var(--user-text-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

.quick-context-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 16px;

  article {
    display: flex;
    min-width: 0;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--user-primary-soft);
    border-radius: 8px;
    background: var(--user-surface-raised);
  }

  svg {
    flex: 0 0 auto;
    color: var(--user-primary);
  }

  span,
  strong {
    display: block;
  }

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  strong {
    overflow: hidden;
    margin-top: 4px;
    color: var(--user-text);
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
    color: var(--user-text-secondary);
    font-size: 12px;
    line-height: 1.55;

    &::before {
      position: absolute;
      top: 0.62em;
      left: 0;
      width: 5px;
      height: 5px;
      border-radius: 999px;
      background: var(--user-primary);
      content: '';
    }
  }
}

.quick-create-reasons {
  margin-top: 8px;

  li {
    color: var(--user-text-muted);
  }
}

.quick-trust-card {
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--user-primary-soft);
  border-radius: 8px;
  background: var(--user-surface-raised);

  summary {
    color: var(--user-primary);
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }

  p {
    margin: 10px 0;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.application-context-card {
  display: grid;
  gap: 12px;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-surface-muted);

  p {
    margin: 0;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.application-context-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  span,
  strong {
    display: block;
  }

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    margin-top: 5px;
    color: var(--user-text);
    line-height: 1.35;
  }
}

.application-context-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  article {
    min-width: 0;
    padding: 10px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface);

    &.is-missing {
      border-color: var(--user-warning);
      background: var(--user-warning-soft);
    }
  }

  span,
  strong {
    display: block;
  }

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  strong {
    overflow: hidden;
    margin-top: 4px;
    color: var(--user-text);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.context-trust-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-surface-muted);

  &[open] {
    background: var(--user-surface);
  }

  p {
    margin: 0;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.context-trust-card__head {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }

  &::after {
    flex: 0 0 auto;
    color: var(--user-text-muted);
    font-size: 12px;
    content: '展开';
  }

  .context-trust-card[open] &::after {
    content: '收起';
  }

  > span {
    color: var(--user-primary);
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
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface);

    span {
      color: var(--user-text-muted);
      font-size: 12px;
    }

    strong {
      min-width: 0;
      overflow: hidden;
      color: var(--user-text);
      font-size: 13px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &.is-missing {
      border-color: var(--user-warning);
      background: var(--user-warning-soft);

      strong {
        color: var(--user-warning);
      }
    }
  }
}

.quick-start-panel__actions {
  display: flex;
  min-width: 0;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 10px;

  :deep(.el-button) {
    width: auto;
    margin-left: 0;
  }
}

.quick-primary-cta {
  min-height: 44px;
  font-weight: 700;
}

.create-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 340px);
  gap: 14px;
  margin-top: 14px;
}

.config-panel,
.preview-panel {
  padding: 16px;
  background: var(--user-surface);
}

.config-panel,
.preview-panel,
.quick-start-panel {
  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper),
  :deep(.el-input-number .el-input__wrapper),
  :deep(.el-textarea__inner) {
    background-color: var(--user-control-bg);
    box-shadow: 0 0 0 1px var(--user-border) inset;
  }

  :deep(.el-button:not(.el-button--primary):not(.el-button--success):not(.el-button--warning):not(.el-button--danger)) {
    background-color: var(--user-control-bg);
    color: var(--user-text-secondary);
  }
}

.preview-panel {
  position: sticky;
  top: 82px;
  align-self: start;
  max-height: calc(100vh - 104px);
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.config-form-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;
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
    color: var(--user-text-muted);
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
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-success-soft);
}

.config-collapsed__head {
  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: var(--user-text);
    font-size: 18px;
  }

  p {
    margin: 8px 0 0;
    color: var(--user-text-muted);
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
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);

  svg {
    flex: 0 0 auto;
    color: var(--user-primary);
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
    color: var(--user-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 4px;
    color: var(--user-text);
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
  min-height: 112px;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  color: var(--user-text);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;

  span {
    flex: 1;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.55;
  }

  em {
    color: var(--user-primary);
    font-size: 12px;
    font-style: normal;
    font-weight: 700;
  }

  &:hover:not(.disabled),
  &.active {
    border-color: var(--user-primary-border);
    background: var(--user-primary-soft);
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
  gap: 14px;
}

.form-section {
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.scenario-selector-shell {
  margin-top: 18px;
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
    background: var(--user-primary-border);
    color: var(--user-primary);
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
    color: var(--user-text-muted);
    font-size: 13px;
  }
}

.field-empty {
  margin-top: 8px;
  color: var(--user-warning);
  font-size: 12px;
}

.field-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: var(--user-danger);
  font-size: 12px;
}

.template-preview {
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
}

.template-preview__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;

  strong {
    display: block;
    color: var(--user-text);
  }

  span {
    display: block;
    margin-top: 6px;
    color: var(--user-text-muted);
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
    border: 1px solid var(--user-primary-border);
    border-radius: 999px;
    background: var(--user-primary-soft);
    color: var(--user-primary);
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
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.summary-card {
  padding: 18px;

  span,
  p {
    color: var(--user-text-muted);
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
    background: var(--user-primary-soft);
  }
}

.quick-create-card {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 14px;
  border-color: var(--user-primary-border);
  background: var(--user-surface-muted);

  span,
  p {
    color: var(--user-text-muted);
  }

  strong {
    color: var(--user-primary);
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
      background: var(--user-surface);
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
    background: var(--user-primary-border);
    color: var(--user-primary);
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
    color: var(--user-text-muted);
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
    border-bottom: 1px solid var(--user-border);

    &:last-child {
      border-bottom: 0;
    }
  }

  span {
    color: var(--user-text-muted);
    font-size: 13px;
  }

  strong {
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: right;
  }
}

.pending-box {
  display: flex;
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
  color: var(--user-text-muted);

  svg {
    flex: 0 0 auto;
    color: var(--user-warning);
  }

  strong {
    color: var(--user-text);
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
  .recommended-plan-grid {
    grid-template-columns: 1fr 1fr;
  }

  .quick-context-grid {
    grid-template-columns: 1fr;
  }

  .preview-panel {
    position: static;
    max-height: none;
    overflow: visible;
  }
}

@media (max-height: 760px) and (min-width: 1181px) {
  .create-hero,
  .quick-start-panel {
    padding: 18px;
  }

  .preview-panel {
    top: 68px;
    max-height: calc(100vh - 82px);
  }

  .wizard-flow article {
    padding: 9px 10px;
  }
}

@media (max-width: 760px) {
  .create-hero {
    flex-direction: column;
  }

  .create-grid,
  .mode-grid,
  .recommended-plan-grid,
  .application-context-grid,
  .config-collapsed__grid,
  .form-grid,
  .quick-start-panel {
    grid-template-columns: 1fr;
  }

  .quick-start-panel {
    padding: 18px;
  }

  .quick-start-panel__head {
    flex-direction: column;
  }

  .hero-actions,
  .preview-actions {
    display: grid;
    grid-template-columns: 1fr;
    justify-content: stretch;
  }

  .hero-actions :deep(.el-button),
  .preview-actions :deep(.el-button),
  .config-collapsed__actions :deep(.el-button),
  .config-form-actions :deep(.el-button),
  .quick-start-panel__actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }

  .config-form-actions,
  .config-collapsed__actions {
    display: grid;
    grid-template-columns: 1fr;
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

/* Compact interview workspace */
.interview-create {
  min-width: 0;
  color: var(--user-text);
}

.create-hero {
  align-items: flex-start;
  padding: 16px 18px;

  h1 {
    margin: 6px 0;
    font-size: 24px;
  }

  p {
    max-width: 68ch;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.55;
  }
}

.hero-tags {
  margin-top: 10px;
}

.hero-actions {
  max-width: 460px;
  justify-content: flex-end;
}

.quick-start-panel {
  gap: 12px;
  margin-top: 0;
  padding: 16px 18px;
  background: var(--user-surface);
}

.quick-start-panel__copy {
  h2 {
    margin: 4px 0;
    font-size: 20px;
  }

  p {
    font-size: 13px;
    line-height: 1.55;
  }
}

.recommended-plan-grid,
.quick-context-grid {
  gap: 0;
  margin-top: 12px;
  border-top: 1px solid var(--user-border);
  border-bottom: 1px solid var(--user-border);
}

.recommended-plan-grid article,
.quick-context-grid article {
  min-height: 0;
  padding: 10px 12px;
  border: 0;
  border-right: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;
}

.recommended-plan-grid article:last-child,
.quick-context-grid article:last-child {
  border-right: 0;
}

.recommended-plan-grid strong,
.quick-context-grid strong {
  white-space: normal;
  overflow-wrap: anywhere;
}

.quick-reason-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 16px;
  margin-top: 10px;
}

.quick-trust-card,
.application-context-card,
.context-trust-card {
  margin-top: 10px;
  padding: 10px 12px;
  border-color: var(--user-border);
  background: var(--user-surface-muted);
}

.quick-start-panel__actions {
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--user-border);

  :deep(.el-alert) {
    flex: 1 1 100%;
  }

  :deep(.el-button) {
    flex: 0 0 auto;
  }
}

.quick-primary-cta {
  order: -1;
}

.create-grid {
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  margin-top: 0;
}

.config-panel,
.preview-panel {
  min-width: 0;
  padding: 14px;
}

.panel-head {
  margin-bottom: 12px;

  p {
    margin-top: 4px;
    color: var(--user-text-muted);
    line-height: 1.5;
  }
}

.config-collapsed,
.form-section,
.template-preview,
.summary-card,
.quick-create-card,
.summary-list,
.pending-box,
.wizard-flow {
  border-color: var(--user-border);
  background: var(--user-surface-muted);
}

.config-collapsed {
  gap: 12px;
  padding: 14px;
}

.config-collapsed__grid {
  gap: 0;
  border-top: 1px solid var(--user-border);
  border-bottom: 1px solid var(--user-border);
}

.config-collapsed__item {
  padding: 10px;
  border: 0;
  border-right: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;
}

.config-collapsed__item:last-child {
  border-right: 0;
}

.mode-grid {
  gap: 8px;
  margin-bottom: 14px;
}

.mode-card {
  min-height: 0;
  gap: 6px;
  padding: 12px;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease;

  &:hover:not(.disabled),
  &.active {
    border-color: var(--user-primary-border);
    background: var(--user-primary-soft);
    transform: none;
  }
}

.config-form {
  gap: 10px;
}

.form-section {
  padding: 12px;
}

.scenario-selector-shell {
  margin-top: 12px;
}

.section-title {
  margin-bottom: 10px;
}

.resume-switch {
  margin-bottom: 10px;
}

.preview-panel {
  top: 72px;
  max-height: calc(100dvh - 88px);
}

.summary-card,
.quick-create-card,
.wizard-flow,
.summary-list,
.pending-box {
  margin-top: 10px;
}

.summary-card {
  padding: 12px;

  strong {
    margin: 4px 0;
    font-size: 18px;
  }
}

.quick-create-card {
  padding: 12px;
}

.wizard-flow {
  gap: 2px;
  padding: 6px;
}

.summary-list div {
  padding: 9px 10px;
}

.pending-box {
  padding: 10px;
}

.preview-actions {
  margin-top: 12px;
}

@media (max-width: 1180px) {
  .create-grid {
    grid-template-columns: 1fr;
  }

  .preview-panel {
    position: static;
    max-height: none;
  }
}

@media (max-width: 760px) {
  .create-hero,
  .quick-start-panel {
    padding: 14px;
  }

  .hero-actions {
    max-width: none;
  }

  .recommended-plan-grid,
  .quick-context-grid,
  .config-collapsed__grid {
    border: 1px solid var(--user-border);
  }

  .recommended-plan-grid article,
  .quick-context-grid article,
  .config-collapsed__item {
    border-right: 0;
    border-bottom: 1px solid var(--user-border);
  }

  .recommended-plan-grid article:last-child,
  .quick-context-grid article:last-child,
  .config-collapsed__item:last-child {
    border-bottom: 0;
  }

  .quick-reason-list {
    grid-template-columns: 1fr;
  }

  .quick-start-panel__actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .quick-start-panel__actions :deep(.el-button) {
    width: 100%;
  }
}
</style>
