<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">创建模拟面试</h1>
        <p class="page-subtitle">配置面试模式、岗位、经验和简历上下文。AI 能力由 interview-service 间接调用，前端不直连 AI 接口。</p>
      </div>
      <el-button @click="router.push('/interviews/history')">面试历史</el-button>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="122px">
          <el-form-item label="面试名称">
            <el-input v-model.trim="form.interviewName" placeholder="可选，例如：Java 微服务中级模拟面试" />
          </el-form-item>
          <el-form-item label="面试模式" prop="interviewMode">
            <el-radio-group v-model="form.interviewMode">
              <el-radio-button v-for="item in interviewModeOptions" :key="item.value" :label="item.value">
                {{ item.label }}
              </el-radio-button>
            </el-radio-group>
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
          <el-form-item label="行业方向" prop="industryDirection">
            <el-select v-model="form.industryDirection" style="width: 100%">
              <el-option v-for="item in industryDirectionOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="难度等级" prop="difficulty">
            <el-select v-model="form.difficulty" style="width: 100%">
              <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="面试官风格" prop="interviewerStyle">
            <el-select v-model="form.interviewerStyle" style="width: 100%">
              <el-option v-for="item in interviewerStyleOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="基于简历">
            <el-switch v-model="useResume" />
            <span class="form-tip">项目深挖和综合模拟建议选择简历。</span>
          </el-form-item>
          <el-form-item v-if="useResume" label="选择简历" prop="resumeId">
            <el-select v-model="form.resumeId" filterable placeholder="请选择简历" style="width: 100%" v-loading="resumeLoading">
              <el-option
                v-for="resume in resumes"
                :key="resume.id"
                :label="resume.isDefault === 1 ? `${resume.resumeName}（默认）` : resume.resumeName"
                :value="resume.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="题目数量">
            <el-input-number v-model="form.questionCount" :min="1" :max="20" />
          </el-form-item>

          <el-alert
            v-if="resumeRequired"
            type="warning"
            :closable="false"
            show-icon
            title="当前面试模式建议选择简历，便于进行项目深挖和综合追问。"
          />

          <div class="form-actions">
            <el-button @click="router.push('/dashboard')">取消</el-button>
            <el-button type="primary" :loading="creating" @click="handleCreate">创建并进入房间</el-button>
          </div>
        </el-form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
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

watch(
  resumeRequired,
  (required) => {
    if (required) {
      useResume.value = true
    }
  },
  { immediate: true }
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
.form-tip {
  margin-left: 10px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
</style>
