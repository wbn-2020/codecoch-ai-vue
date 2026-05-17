<template>
  <div class="interview-create page-shell">
    <section class="create-hero">
      <div>
        <div class="eyebrow">
          <Sparkles :size="16" />
          AI Interview Configurator
        </div>
        <h1>创建 AI 模拟面试</h1>
        <p>基于简历、岗位方向、技术栈生成 Java 面试训练。当前仅提交后端已支持的面试配置字段。</p>
        <div class="hero-tags">
          <el-tag effect="plain">真实接口创建</el-tag>
          <el-tag effect="plain" type="success">支持简历上下文</el-tag>
          <el-tag effect="plain" type="warning">行业场景按现有字段提交</el-tag>
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
            <p>选择后端已支持的训练模式；行业场景会以综合模拟模式携带真实行业模板提交。</p>
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
                placeholder="请选择真实行业模板"
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
                暂无可用行业模板，请确认后端行业模板已初始化并启用。
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
              简历上下文
            </div>
            <div class="resume-switch">
              <div>
                <strong>基于简历生成追问</strong>
                <p>项目深挖和综合模拟建议选择简历；不会使用假简历或本地 Mock 数据。</p>
              </div>
              <el-switch v-model="useResume" />
            </div>
            <el-form-item v-if="useResume" label="选择简历" prop="resumeId">
              <el-select
                v-model="form.resumeId"
                filterable
                placeholder="请选择真实简历"
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
              <div v-if="!resumeLoading && !resumes.length" class="field-empty">
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
        </el-form>
      </section>

      <aside class="preview-panel">
        <div class="panel-head">
          <div>
            <h2>配置预览</h2>
            <p>仅展示当前真实选择，不展示任何假 AI 结果。</p>
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
        </div>

        <div class="pending-box">
          <Zap :size="17" />
          <div>
            <strong>真实行业模板</strong>
            <p>行业场景会读取后端模板，并以综合模拟模式提交行业模板 ID，不发送后端未支持的模式。</p>
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
import { useRouter } from 'vue-router'

import { createInterviewApi, getIndustryTemplatesApi } from '@/api/interview'
import { getResumesApi } from '@/api/resume'
import {
  difficultyOptions,
  experienceLevelOptions,
  industryDirectionOptions,
  INTERVIEW_MODE,
  interviewerStyleOptions,
  targetPositionOptions
} from '@/constants/enums'
import type { IndustryTemplateVO, InterviewCreateDTO } from '@/types/interview'
import type { ResumeVO } from '@/types/resume'
import type { SelectOption } from '@/types/common'

const router = useRouter()
const formRef = ref<FormInstance>()
const creating = ref(false)
const resumeLoading = ref(false)
const industryTemplateLoading = ref(false)
const industryTemplateError = ref('')
const useResume = ref(true)
const resumes = ref<ResumeVO[]>([])
const industryTemplates = ref<IndustryTemplateVO[]>([])
const selectedModeKey = ref('technical')

const form = reactive<InterviewCreateDTO>({
  interviewName: '',
  interviewMode: INTERVIEW_MODE.TECHNICAL_BASIC,
  targetPosition: 'Java 后端开发',
  experienceLevel: '3_YEARS',
  industryTemplateId: undefined,
  industryDirection: 'GENERAL',
  difficulty: 'MEDIUM',
  interviewerStyle: 'NORMAL',
  resumeId: undefined,
  questionCount: 8
})

const modeCards = [
  {
    key: 'technical',
    title: '技术八股',
    desc: '围绕 Java 基础、JVM、并发、Spring 体系展开。',
    badge: '已接入',
    value: INTERVIEW_MODE.TECHNICAL_BASIC,
    icon: BrainCircuit
  },
  {
    key: 'project',
    title: '项目深挖',
    desc: '结合简历项目经历，追问架构设计、难点和优化。',
    badge: '已接入',
    value: INTERVIEW_MODE.PROJECT_DEEP_DIVE,
    icon: BriefcaseBusiness
  },
  {
    key: 'comprehensive',
    title: '综合模拟',
    desc: '按真实面试节奏综合考察技术、项目与表达。',
    badge: '已接入',
    value: INTERVIEW_MODE.COMPREHENSIVE,
    icon: Target
  },
  {
    key: 'industry',
    title: '行业场景',
    desc: '读取真实行业模板，以综合模拟模式生成场景化追问。',
    badge: '真实模板',
    value: INTERVIEW_MODE.COMPREHENSIVE,
    industry: true,
    icon: Sparkles
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

const resumeRequired = computed(
  () =>
    form.interviewMode === INTERVIEW_MODE.PROJECT_DEEP_DIVE ||
    form.interviewMode === INTERVIEW_MODE.COMPREHENSIVE
)

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

const optionLabel = (options: SelectOption[], value?: string) => {
  return options.find((item) => item.value === value)?.label || value || '-'
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
  try {
    const result = await getResumesApi({ pageNo: 1, pageSize: 50 })
    resumes.value = result.records || []
    form.resumeId = resumes.value.find((item) => item.isDefault === 1)?.id || resumes.value[0]?.id
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
    industryTemplateError.value = '行业模板加载失败，请确认后端服务或权限状态。'
  } finally {
    industryTemplateLoading.value = false
  }
}

const handleCreate = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  if (isIndustryMode.value && !form.industryTemplateId) {
    ElMessage.warning('请选择真实行业模板后再开始面试')
    return
  }
  if (resumeRequired.value && !form.resumeId) {
    ElMessage.warning('项目深挖或综合模拟面试需要先选择简历')
    return
  }

  creating.value = true
  try {
    const template = selectedIndustryTemplate.value
    const payload: InterviewCreateDTO = {
      ...form,
      interviewMode: isIndustryMode.value ? INTERVIEW_MODE.COMPREHENSIVE : form.interviewMode,
      industryTemplateId: isIndustryMode.value ? form.industryTemplateId : undefined,
      industryDirection: isIndustryMode.value
        ? template?.industryCode || template?.industryName || form.industryDirection
        : form.industryDirection,
      resumeId: useResume.value ? form.resumeId : undefined
    }
    const result = await createInterviewApi(payload)
    ElMessage.success('面试已创建')
    await router.push(`/interviews/room/${result.interviewId}`)
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  fetchResumes()
  fetchIndustryTemplates()
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
