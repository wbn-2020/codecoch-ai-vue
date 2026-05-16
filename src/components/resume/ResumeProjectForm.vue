<template>
  <el-form ref="formRef" class="resume-project-form" :model="form" :rules="rules" label-position="top">
    <div class="project-form-grid">
      <el-form-item label="项目名称" prop="projectName">
        <el-input v-model.trim="form.projectName" placeholder="例如：在线学习平台 / 订单中台" />
      </el-form-item>
      <el-form-item label="项目时间">
        <el-input v-model.trim="form.projectTime" placeholder="例如：2024.03 - 2024.08" />
      </el-form-item>
    </div>

    <el-form-item label="技术栈">
      <el-input v-model.trim="form.techStack" placeholder="Spring Boot、MySQL、Redis、MQ..." />
    </el-form-item>
    <el-form-item label="项目背景">
      <el-input v-model="form.projectBackground" type="textarea" :rows="3" placeholder="说明业务场景、用户规模、系统边界" />
    </el-form-item>
    <el-form-item label="个人职责">
      <el-input v-model="form.responsibility" type="textarea" :rows="3" placeholder="说明你负责的模块、协作方式和交付内容" />
    </el-form-item>
    <el-form-item label="核心功能">
      <el-input v-model="form.coreFeatures" type="textarea" :rows="3" placeholder="列出核心业务功能和关键流程" />
    </el-form-item>
    <el-form-item label="技术难点">
      <el-input v-model="form.technicalChallenges" type="textarea" :rows="3" placeholder="说明性能、并发、数据一致性或工程治理问题" />
    </el-form-item>
    <el-form-item label="优化结果">
      <el-input v-model="form.optimizationResult" type="textarea" :rows="2" placeholder="填写真实优化结果，不填写无法解释的数据" />
    </el-form-item>
    <div class="project-form-grid">
      <el-form-item label="补充说明">
        <el-input v-model="form.extraInfo" type="textarea" :rows="2" placeholder="其他可用于面试展开的信息" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" />
      </el-form-item>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { reactive, ref, watch } from 'vue'

import type { ResumeProjectDTO, ResumeProjectVO } from '@/types/resume'

const props = defineProps<{
  modelValue?: Partial<ResumeProjectVO>
}>()

const formRef = ref<FormInstance>()
const form = reactive<ResumeProjectDTO>({
  projectName: '',
  projectTime: '',
  projectBackground: '',
  techStack: '',
  responsibility: '',
  coreFeatures: '',
  technicalChallenges: '',
  optimizationResult: '',
  extraInfo: '',
  sort: 0
})

const rules: FormRules<ResumeProjectDTO> = {
  projectName: [{ required: true, message: '请输入项目名称', trigger: 'blur' }]
}

watch(
  () => props.modelValue,
  (value) => {
    Object.assign(form, {
      projectName: value?.projectName || '',
      projectTime: value?.projectTime || value?.projectPeriod || '',
      projectBackground: value?.projectBackground || value?.description || '',
      techStack: value?.techStack || '',
      responsibility: value?.responsibility || value?.role || '',
      coreFeatures: value?.coreFeatures || '',
      technicalChallenges: value?.technicalChallenges || value?.technicalDifficulties || '',
      optimizationResult: value?.optimizationResult || value?.optimizationResults || '',
      extraInfo: value?.extraInfo || '',
      sort: value?.sort || value?.sortOrder || 0
    })
  },
  { immediate: true }
)

defineExpose({
  validate: async () => {
    if (!formRef.value) return false
    await formRef.value.validate()
    return { ...form }
  }
})
</script>

<style scoped lang="scss">
.resume-project-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }
}

.project-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 720px) {
  .project-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
