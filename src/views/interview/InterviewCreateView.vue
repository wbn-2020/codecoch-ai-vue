<template>
  <div class="interview-create page-shell">
    <section class="create-hero">
      <div>
        <div class="eyebrow">
          <Sparkles :size="16" />
          AI 面试配置
        </div>
        <h1>创建 AI 模拟面试</h1>
        <p>基于简历、岗位方向和技术栈生成 Java 面试训练，创建后可直接进入面试房间。</p>
        <div class="hero-tags">
          <el-tag effect="plain">创建后直接开始</el-tag>
          <el-tag effect="plain" type="success">支持简历上下文</el-tag>
          <el-tag effect="plain" type="warning">行业场景可用</el-tag>
        </div>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/dashboard')">
          <LayoutDashboard :size="16" />
          返回工作台
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

    <div class="create-grid">
      <section class="config-panel">
        <div class="panel-head">
          <div>
            <h2>面试类型</h2>
            <p>选择本次训练的重点，系统会按配置生成更贴近目标岗位的追问。</p>
          </div>
        </div>

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
                <el-tag effect="plain">{{ selectedIndustryTemplate.industryCode || 'INDUSTRY' }}</el-tag>
              </div>
              <div class="template-tags">
                <span v-for="item in templateHighlights" :key="item">{{ item }}</span>
              </div>
            </article>
          </div>

          <div class="form-section">
            <div class="section-title">
              <span>{{ isIndustryMode ? '04' : '03' }}</span>
              训练上下文
            </div>
            <div class="form-grid">
              <el-form-item label="训练场景">
                <el-select v-model="form.trainingScene" clearable style="width: 100%" @change="handleTrainingSceneChange">
                  <el-option label="Java 专项训练" value="JAVA_SPECIALTY" />
                  <el-option label="项目深挖训练" value="PROJECT_DEEP_DIVE" />
                </el-select>
              </el-form-item>
              <el-form-item label="追问强度">
                <el-select v-model="form.followUpIntensity" style="width: 100%">
                  <el-option label="标准" value="NORMAL" />
                  <el-option label="轻追问" value="LIGHT" />
                  <el-option label="强追问" value="DEEP" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="isJavaSpecialtyTraining" label="能力域">
                <el-select v-model="form.targetSkillDomain" v-loading="abilityMapLoading" clearable style="width: 100%">
                  <el-option
                    v-for="domain in abilityDomains"
                    :key="domain.domainCode"
                    :label="domain.domainName"
                    :value="domain.domainCode"
                  />
                </el-select>
              </el-form-item>
              <el-form-item v-if="isJavaSpecialtyTraining" label="能力点">
                <el-select v-model="form.targetSkillCodes" multiple collapse-tags collapse-tags-tooltip clearable style="width: 100%">
                  <el-option
                    v-for="skill in targetSkillOptions"
                    :key="skill.code"
                    :label="skill.name"
                    :value="skill.code"
                  />
                </el-select>
              </el-form-item>
              <el-form-item v-if="isJavaSpecialtyTraining" label="目标水平">
                <el-select v-model="form.targetLevel" style="width: 100%">
                  <el-option label="基础" value="BASIC" />
                  <el-option label="合格" value="COMPETENT" />
                  <el-option label="强项" value="STRONG" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="isProjectDeepDiveTraining" label="项目素材">
                <el-select
                  v-model="form.projectEvidenceIds"
                  v-loading="projectEvidenceLoading"
                  multiple
                  collapse-tags
                  collapse-tags-tooltip
                  clearable
                  style="width: 100%"
                >
                  <el-option
                    v-for="project in projectEvidences"
                    :key="project.id"
                    :label="project.title"
                    :value="project.id"
                  />
                </el-select>
                <div v-if="projectEvidenceError" class="field-error">
                  <span>{{ projectEvidenceError }}</span>
                  <el-button link type="primary" :loading="projectEvidenceLoading" @click="fetchProjectEvidences">重试</el-button>
                </div>
                <div v-else-if="!projectEvidenceLoading && !projectEvidences.length" class="field-empty">
                  暂无项目素材，可先使用简历上下文或进入项目素材补充。
                </div>
              </el-form-item>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">
              <span>{{ isIndustryMode ? '05' : '04' }}</span>
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
            :title="isJobTargetFlow ? '目标岗位链路需要选择简历，并会使用 targetJobId 创建岗位面试。' : '当前面试模式建议选择简历，便于进行项目深挖和综合追问。'"
          />
        </el-form>
      </section>

      <aside class="preview-panel">
        <div class="panel-head">
          <div>
            <h2>配置预览</h2>
            <p>提交前核对训练范围，确保面试问题围绕当前目标展开。</p>
          </div>
        </div>

        <div class="summary-card primary">
          <span>训练模式</span>
          <strong>{{ selectedModeTitle }}</strong>
          <p>{{ selectedModeDesc }}</p>
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
          <div>
            <span>训练场景</span>
            <strong>{{ selectedTrainingSceneName }}</strong>
          </div>
          <div v-if="isJavaSpecialtyTraining">
            <span>能力目标</span>
            <strong>{{ selectedSkillSummary }}</strong>
          </div>
          <div v-if="isProjectDeepDiveTraining">
            <span>项目素材</span>
            <strong>{{ selectedProjectEvidenceSummary }}</strong>
          </div>
        </div>

        <div class="pending-box">
          <Zap :size="17" />
          <div>
            <strong>行业场景</strong>
            <p>选择行业模板后，面试会更关注该场景下的业务理解、技术取舍和项目表达。</p>
          </div>
        </div>

        <div class="preview-actions">
          <el-button @click="router.push('/dashboard')">返回工作台</el-button>
          <el-button type="primary" size="large" :loading="creating" @click="handleCreate">
            <Play :size="16" />
            开始面试
          </el-button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { BrainCircuit, BriefcaseBusiness, Files, History, LayoutDashboard, Play, Sparkles, Target, Zap } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getAbilityMapApi } from '@/api/abilityMap'
import { createInterviewApi, createInterviewByJobTargetApi, getIndustryTemplatesApi } from '@/api/interview'
import { getCurrentJobTargetApi, getJobTargetDetailApi } from '@/api/jobTarget'
import { getProjectEvidenceListApi } from '@/api/projectEvidence'
import { getLatestResumeJobMatchReportApi } from '@/api/resumeJobMatch'
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
import type { AbilityDomainVO, AbilitySkillNodeVO } from '@/types/abilityMap'
import type { IndustryTemplateVO, InterviewCreateDTO } from '@/types/interview'
import type { ProjectEvidenceListVO } from '@/types/projectEvidence'
import type { ResumeVO } from '@/types/resume'
import type { SelectOption } from '@/types/common'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const route = useRoute()
const formRef = ref<FormInstance>()
const creating = ref(false)
const resumeLoading = ref(false)
const resumeLoadError = ref('')
const industryTemplateLoading = ref(false)
const industryTemplateError = ref('')
const abilityMapLoading = ref(false)
const projectEvidenceLoading = ref(false)
const projectEvidenceError = ref('')
const useResume = ref(true)
const resumes = ref<ResumeVO[]>([])
const industryTemplates = ref<IndustryTemplateVO[]>([])
const abilityDomains = ref<AbilityDomainVO[]>([])
const projectEvidences = ref<ProjectEvidenceListVO[]>([])
const selectedModeKey = ref('technical')
const sourceTargetJobId = ref<number>()
const fallbackTargetJobId = ref<number>()

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
  questionCount: 8,
  trainingScene: 'JAVA_SPECIALTY',
  targetSkillDomain: undefined,
  targetSkillCodes: [],
  targetLevel: 'COMPETENT',
  projectEvidenceIds: [],
  followUpIntensity: 'NORMAL'
})

const modeCards = [
  {
    key: 'technical',
    title: '技术八股',
    desc: '围绕 Java 基础、JVM、并发、Spring 体系展开。',
    badge: '已接入',
    value: INTERVIEW_MODE.TECHNICAL_BASIC,
    trainingScene: 'JAVA_SPECIALTY',
    icon: BrainCircuit
  },
  {
    key: 'project',
    title: '项目深挖',
    desc: '结合简历项目经历，追问架构设计、难点和优化。',
    badge: '已接入',
    value: INTERVIEW_MODE.PROJECT_DEEP_DIVE,
    trainingScene: 'PROJECT_DEEP_DIVE',
    icon: BriefcaseBusiness
  },
  {
    key: 'comprehensive',
    title: '综合模拟',
    desc: '按面试节奏综合考察技术、项目与表达。',
    badge: '已接入',
    value: INTERVIEW_MODE.COMPREHENSIVE,
    icon: Target
  },
  {
    key: 'industry',
    title: '行业场景',
    desc: '选择行业模板，生成更贴近业务场景的追问。',
    badge: '场景模板',
    value: INTERVIEW_MODE.COMPREHENSIVE,
    industry: true,
    icon: Sparkles
  }
]

const isIndustryMode = computed(() => selectedModeKey.value === 'industry')
const isJavaSpecialtyTraining = computed(() => form.trainingScene === 'JAVA_SPECIALTY')
const isProjectDeepDiveTraining = computed(() => form.trainingScene === 'PROJECT_DEEP_DIVE')
const hasSelectedProjectEvidence = computed(() => Boolean(form.projectEvidenceIds?.length))

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

const resumeRequired = computed(
  () =>
    !isJavaSpecialtyTraining.value &&
    !(isProjectDeepDiveTraining.value && hasSelectedProjectEvidence.value) &&
    (form.interviewMode === INTERVIEW_MODE.PROJECT_DEEP_DIVE ||
      form.interviewMode === INTERVIEW_MODE.COMPREHENSIVE)
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
const selectedTrainingSceneName = computed(() => {
  if (isJavaSpecialtyTraining.value) return 'Java 专项训练'
  if (isProjectDeepDiveTraining.value) return '项目深挖训练'
  return '常规模拟'
})
const targetSkillOptions = computed<AbilitySkillNodeVO[]>(() => {
  const domain = abilityDomains.value.find((item) => item.domainCode === form.targetSkillDomain)
  return domain?.skills || abilityDomains.value.flatMap((item) => item.skills)
})
const selectedSkillSummary = computed(() => {
  const selectedCodes = new Set(form.targetSkillCodes || [])
  if (!selectedCodes.size) {
    return abilityDomains.value.find((item) => item.domainCode === form.targetSkillDomain)?.domainName || '未指定'
  }
  return targetSkillOptions.value
    .filter((skill) => selectedCodes.has(skill.code))
    .map((skill) => skill.name)
    .join('、') || '未指定'
})
const selectedProjectEvidenceSummary = computed(() => {
  const selectedIds = new Set(form.projectEvidenceIds || [])
  if (!selectedIds.size) return '未选择'
  const names = projectEvidences.value
    .filter((item) => selectedIds.has(item.id))
    .map((item) => item.title)
  return names.length ? names.join('、') : `${selectedIds.size} 个项目素材`
})

const optionLabel = (options: SelectOption[], value?: string) => {
  return options.find((item) => item.value === value)?.label || value || '-'
}

const getQueryString = (name: string) => {
  const value = route.query[name]
  return Array.isArray(value) ? value[0] : value
}

const getQueryNumber = (name: string) => {
  const value = Number(getQueryString(name))
  return Number.isFinite(value) && value > 0 ? value : undefined
}

const getQueryStringList = (name: string) => {
  const value = route.query[name]
  const values = Array.isArray(value) ? value : value ? [value] : []
  return values
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean)
}

const getQueryNumberList = (name: string) => {
  return getQueryStringList(name)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
}

const buildInterviewContextQuery = () => {
  const query: Record<string, string> = {}
  ;['source', 'applicationId', 'targetJobId', 'resumeId', 'resumeVersionId', 'matchReportId', 'skillProfileId'].forEach((key) => {
    const value = getQueryString(key)
    if (value) query[key] = String(value)
  })
  return query
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

const selectMode = (item: (typeof modeCards)[number]) => {
  selectedModeKey.value = item.key
  form.interviewMode = item.value
  form.trainingScene = 'trainingScene' in item ? item.trainingScene : undefined
  if (form.trainingScene === 'JAVA_SPECIALTY') {
    useResume.value = false
    form.projectEvidenceIds = []
  } else if (form.trainingScene === 'PROJECT_DEEP_DIVE') {
    form.targetSkillDomain = undefined
    form.targetSkillCodes = []
    if (!hasSelectedProjectEvidence.value) {
      useResume.value = true
    }
  } else {
    form.targetSkillDomain = undefined
    form.targetSkillCodes = []
    form.projectEvidenceIds = []
  }
  if ('industry' in item && item.industry) {
    applyIndustryTemplate(selectedIndustryTemplate.value || industryTemplates.value[0])
    return
  }
  form.industryTemplateId = undefined
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

watch(
  () => form.targetSkillDomain,
  () => {
    if (!form.targetSkillCodes?.length) return
    const available = new Set(targetSkillOptions.value.map((skill) => skill.code))
    form.targetSkillCodes = form.targetSkillCodes.filter((code) => available.has(code))
  }
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

const fetchIndustryTemplates = async () => {
  industryTemplateLoading.value = true
  industryTemplateError.value = ''
  try {
    const result = await getIndustryTemplatesApi()
    industryTemplates.value = result || []
    if (isIndustryMode.value && !form.industryTemplateId) {
      applyIndustryTemplate(industryTemplates.value[0])
    }
  } catch {
    industryTemplates.value = []
    industryTemplateError.value = '行业模板暂时加载失败，可以先使用其他面试模式。'
  } finally {
    industryTemplateLoading.value = false
  }
}

const fetchAbilityMap = async () => {
  abilityMapLoading.value = true
  try {
    const result = await getAbilityMapApi()
    abilityDomains.value = result.domains || []
  } catch {
    abilityDomains.value = []
  } finally {
    abilityMapLoading.value = false
  }
}

const fetchProjectEvidences = async () => {
  projectEvidenceLoading.value = true
  projectEvidenceError.value = ''
  try {
    const result = await getProjectEvidenceListApi({ pageNo: 1, pageSize: 50 })
    projectEvidences.value = result.records || []
  } catch (error) {
    projectEvidences.value = []
    projectEvidenceError.value = getErrorMessage(error, '项目素材暂时加载失败')
  } finally {
    projectEvidenceLoading.value = false
  }
}

const handleTrainingSceneChange = () => {
  if (isJavaSpecialtyTraining.value) {
    selectedModeKey.value = 'technical'
    form.interviewMode = INTERVIEW_MODE.TECHNICAL_BASIC
    form.projectEvidenceIds = []
    useResume.value = false
    return
  }
  if (isProjectDeepDiveTraining.value) {
    selectedModeKey.value = 'project'
    form.interviewMode = INTERVIEW_MODE.PROJECT_DEEP_DIVE
    form.targetSkillDomain = undefined
    form.targetSkillCodes = []
    if (!hasSelectedProjectEvidence.value) {
      useResume.value = true
    }
    return
  }
  form.targetSkillDomain = undefined
  form.targetSkillCodes = []
  form.projectEvidenceIds = []
}

const applyTrainingRouteContext = () => {
  const scene = getQueryString('trainingScene')
  if (scene === 'JAVA_SPECIALTY' || scene === 'PROJECT_DEEP_DIVE') {
    form.trainingScene = scene
    handleTrainingSceneChange()
  }
  const targetSkillDomain = getQueryString('targetSkillDomain')
  if (targetSkillDomain) {
    form.targetSkillDomain = targetSkillDomain
  }
  const targetSkillCodes = getQueryStringList('targetSkillCodes')
  if (targetSkillCodes.length) {
    form.targetSkillCodes = targetSkillCodes
  }
  const targetLevel = getQueryString('targetLevel')
  if (targetLevel) {
    form.targetLevel = targetLevel
  }
  const projectEvidenceIds = getQueryNumberList('projectEvidenceIds')
  if (projectEvidenceIds.length) {
    form.projectEvidenceIds = projectEvidenceIds
  }
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
    const currentTarget = await getCurrentJobTargetApi().catch(() => null)
    targetJobId = currentTarget?.id
    if (targetJobId) fallbackTargetJobId.value = targetJobId
  }
  if (!targetJobId) return

  if (isV3Source || source === 'job-target') {
    selectedModeKey.value = 'comprehensive'
    form.interviewMode = INTERVIEW_MODE.COMPREHENSIVE
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
    } catch {
      ElMessage.warning('目标岗位信息加载失败，将使用当前面试配置创建')
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
    const currentTarget = await getCurrentJobTargetApi().catch(() => null)
    targetJobId = currentTarget?.id
  }

  let resumeId = payload.resumeId
  if (!resumeId) {
    resumeId = resumes.value.find((item) => item.isDefault === 1)?.id || resumes.value[0]?.id
  }

  let matchReportId = getQueryNumber('matchReportId')
  if (!matchReportId && resumeId && targetJobId) {
    const latestMatch = await getLatestResumeJobMatchReportApi(
      resumeId,
      targetJobId,
      getQueryNumber('resumeVersionId')
    ).catch(() => null)
    matchReportId = latestMatch?.reportId
  }

  if (!resumeId || !targetJobId) {
    ElMessage.warning('目标岗位链路创建面试需要有效的 resumeId 和 targetJobId')
    throw new Error('Missing resumeId or targetJobId for job target interview creation')
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
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (isIndustryMode.value && !form.industryTemplateId) {
    ElMessage.warning('请选择行业模板后再开始面试')
    return
  }
  if (isProjectDeepDiveTraining.value && !form.resumeId && !hasSelectedProjectEvidence.value) {
    ElMessage.warning('项目深挖训练需要选择简历或项目素材')
    return
  }
  if ((resumeRequired.value || isJobTargetFlow.value) && !form.resumeId) {
    ElMessage.warning(isJobTargetFlow.value ? '目标岗位链路创建面试需要先选择简历' : '项目深挖或综合模拟面试需要先选择简历')
    return
  }

  creating.value = true
  try {
    const template = selectedIndustryTemplate.value
    const payload = buildInterviewCreatePayload({
      form,
      context: { applicationId: getQueryNumber('applicationId') },
      isIndustryMode: isIndustryMode.value,
      useResume: useResume.value,
      isJobTargetFlow: isJobTargetFlow.value,
      selectedIndustryTemplate: template
    })
    const result = await createInterviewWithRouteContext(payload)
    ElMessage.success('面试已创建')
    await router.push({
      path: `/interviews/room/${result.interviewId}`,
      query: buildInterviewContextQuery()
    })
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  applyTrainingRouteContext()
  await Promise.allSettled([fetchResumes(), fetchIndustryTemplates(), fetchAbilityMap(), fetchProjectEvidences()])
  await applyRouteContext()
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
  border-radius: var(--cc-radius-xl);
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.12), transparent 34%),
    rgba(15, 23, 42, 0.78);
  box-shadow: var(--app-shadow);
  backdrop-filter: blur(18px);
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
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.hero-tags {
  margin-top: 18px;
}

.hero-actions {
  justify-content: flex-end;
  align-content: flex-start;
}

.create-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
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

.mode-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.34);
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
    color: var(--cc-ai-cyan);
    font-size: 12px;
    font-style: normal;
  }

  &:hover:not(.disabled),
  &.active {
    border-color: rgba(129, 140, 248, 0.58);
    background: rgba(99, 102, 241, 0.16);
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
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.26);
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
    background: rgba(99, 102, 241, 0.2);
    color: #c4b5fd;
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
  color: #fca5a5;
  font-size: 12px;
}

.template-preview {
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.52);
}

.template-preview__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;

  strong {
    display: block;
    color: #f8fafc;
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
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 999px;
    background: rgba(2, 6, 23, 0.42);
    color: #cbd5e1;
    font-size: 12px;
  }
}

.create-alert {
  margin-top: 2px;
}

.summary-card,
.summary-list,
.pending-box {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.36);
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
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.08));
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
    color: var(--cc-warning);
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
  .mode-grid {
    grid-template-columns: 1fr 1fr;
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
  .form-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions,
  .preview-actions {
    justify-content: flex-start;
  }
}
</style>
