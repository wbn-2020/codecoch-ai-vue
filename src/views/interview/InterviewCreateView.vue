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
            <p>选择后端已支持的训练模式；待接入能力不会进入提交参数。</p>
          </div>
        </div>

        <div class="mode-grid">
          <button
            v-for="item in modeCards"
            :key="item.key"
            class="mode-card"
            :class="{ active: item.value && form.interviewMode === item.value, disabled: item.disabled }"
            type="button"
            :disabled="item.disabled"
            @click="selectMode(item.value)"
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

          <div class="form-section">
            <div class="section-title">
              <span>03</span>
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
          <strong>{{ optionLabel(interviewModeOptions, form.interviewMode) }}</strong>
          <p>{{ selectedModeDesc }}</p>
        </div>

        <div class="summary-list">
          <div>
            <span>目标岗位</span>
            <strong>{{ form.targetPosition || '-' }}</strong>
          </div>
          <div>
            <span>行业方向</span>
            <strong>{{ optionLabel(industryDirectionOptions, form.industryDirection) }}</strong>
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
            <strong>V2 入口标注</strong>
            <p>行业场景独立模板、学习计划和代码练习将在后续版本接入，本页不会提交未支持字段。</p>
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

import { createInterviewApi } from '@/api/interview'
import { getResumesApi } from '@/api/resume'
import {
  difficultyOptions,
  experienceLevelOptions,
  industryDirectionOptions,
  INTERVIEW_MODE,
  interviewModeOptions,
  interviewerStyleOptions,
  targetPositionOptions
} from '@/constants/enums'
import type { InterviewCreateDTO } from '@/types/interview'
import type { ResumeVO } from '@/types/resume'
import type { SelectOption } from '@/types/common'

const router = useRouter()
const formRef = ref<FormInstance>()
const creating = ref(false)
const resumeLoading = ref(false)
const useResume = ref(true)
const resumes = ref<ResumeVO[]>([])

const form = reactive<InterviewCreateDTO>({
  interviewName: '',
  interviewMode: INTERVIEW_MODE.TECHNICAL_BASIC,
  targetPosition: 'Java 后端开发',
  experienceLevel: '3_YEARS',
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
    desc: '电商、金融支付、SaaS 等行业模板入口。',
    badge: '待接入',
    value: '',
    disabled: true,
    icon: Sparkles
  }
]

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
  difficulty: [{ required: true, message: '请选择难度等级', trigger: 'change' }],
  interviewerStyle: [{ required: true, message: '请选择面试官风格', trigger: 'change' }],
  resumeId: resumeRequired.value || useResume.value ? [{ required: true, message: '请选择简历', trigger: 'change' }] : []
}))

const selectedResumeName = computed(() => {
  if (!useResume.value) return '不使用简历'
  return resumes.value.find((item) => item.id === form.resumeId)?.resumeName || '未选择'
})

const selectedModeDesc = computed(() => modeCards.find((item) => item.value === form.interviewMode)?.desc || '当前模式')

const optionLabel = (options: SelectOption[], value?: string) => {
  return options.find((item) => item.value === value)?.label || value || '-'
}

const selectMode = (value?: string) => {
  if (!value) return
  form.interviewMode = value
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

const handleCreate = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  if (resumeRequired.value && !form.resumeId) {
    ElMessage.warning('项目深挖或综合模拟面试需要先选择简历')
    return
  }

  creating.value = true
  try {
    const payload: InterviewCreateDTO = {
      ...form,
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
