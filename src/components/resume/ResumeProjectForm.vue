<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
    <el-form-item label="项目名称" prop="projectName">
      <el-input v-model.trim="form.projectName" />
    </el-form-item>
    <el-form-item label="项目时间">
      <el-input v-model.trim="form.projectTime" placeholder="例如：2024.03 - 2024.08" />
    </el-form-item>
    <el-form-item label="技术栈">
      <el-input v-model.trim="form.techStack" />
    </el-form-item>
    <el-form-item label="项目背景">
      <el-input v-model="form.projectBackground" type="textarea" :rows="3" />
    </el-form-item>
    <el-form-item label="个人职责">
      <el-input v-model="form.responsibility" type="textarea" :rows="3" />
    </el-form-item>
    <el-form-item label="核心功能">
      <el-input v-model="form.coreFeatures" type="textarea" :rows="3" />
    </el-form-item>
    <el-form-item label="项目难点">
      <el-input v-model="form.technicalChallenges" type="textarea" :rows="3" />
    </el-form-item>
    <el-form-item label="优化成果">
      <el-input v-model="form.optimizationResult" type="textarea" :rows="2" />
    </el-form-item>
    <el-form-item label="补充说明">
      <el-input v-model="form.extraInfo" type="textarea" :rows="2" />
    </el-form-item>
    <el-form-item label="排序">
      <el-input-number v-model="form.sort" :min="0" />
    </el-form-item>
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
      projectTime: value?.projectTime || '',
      projectBackground: value?.projectBackground || '',
      techStack: value?.techStack || '',
      responsibility: value?.responsibility || '',
      coreFeatures: value?.coreFeatures || '',
      technicalChallenges: value?.technicalChallenges || '',
      optimizationResult: value?.optimizationResult || '',
      extraInfo: value?.extraInfo || '',
      sort: value?.sort || 0
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
