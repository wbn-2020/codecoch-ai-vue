<template>
  <el-form ref="formRef" class="project-evidence-form" :model="form" :rules="rules" label-position="top">
    <div class="form-grid">
      <el-form-item label="项目名称" prop="title">
        <el-input v-model.trim="form.title" placeholder="例如：订单中台查询优化" />
      </el-form-item>
      <el-form-item label="项目角色">
        <el-input v-model.trim="form.role" placeholder="例如：后端负责人 / 核心开发" />
      </el-form-item>
    </div>
    <div class="form-grid">
      <el-form-item label="开始时间">
        <el-input v-model.trim="form.startDate" placeholder="2025.01" />
      </el-form-item>
      <el-form-item label="结束时间">
        <el-input v-model.trim="form.endDate" placeholder="2025.06 / 至今" />
      </el-form-item>
    </div>
    <el-form-item label="技术栈">
      <el-input v-model.trim="form.techStack" placeholder="Java, Spring Boot, Redis, MySQL" />
    </el-form-item>
    <el-form-item label="业务背景">
      <el-input v-model="form.background" type="textarea" :rows="3" />
    </el-form-item>
    <el-form-item label="我的职责 / 个人贡献">
      <el-input v-model="form.responsibility" type="textarea" :rows="3" />
    </el-form-item>
    <el-form-item label="核心难点">
      <el-input v-model="form.difficulty" type="textarea" :rows="3" />
    </el-form-item>
    <el-form-item label="解决方案">
      <el-input v-model="form.solution" type="textarea" :rows="3" />
    </el-form-item>
    <el-form-item label="量化结果">
      <el-input v-model="form.result" type="textarea" :rows="3" />
    </el-form-item>
    <el-form-item label="复盘沉淀">
      <el-input v-model="form.reflection" type="textarea" :rows="3" />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { reactive, ref, watch } from 'vue'

import type { ProjectEvidenceDTO } from '@/types/projectEvidence'

const props = defineProps<{
  modelValue?: Partial<ProjectEvidenceDTO>
}>()

const formRef = ref<FormInstance>()
const form = reactive<ProjectEvidenceDTO>({
  title: '',
  role: '',
  startDate: '',
  endDate: '',
  background: '',
  responsibility: '',
  techStack: '',
  difficulty: '',
  solution: '',
  result: '',
  reflection: '',
  sourceResumeId: undefined,
  sourceResumeProjectId: undefined,
  targetJobId: undefined
})

const rules: FormRules = {
  title: [{ required: true, message: '请输入项目名称', trigger: 'blur' }]
}

watch(
  () => props.modelValue,
  (value) => {
    Object.assign(form, {
      title: value?.title || '',
      role: value?.role || '',
      startDate: value?.startDate || '',
      endDate: value?.endDate || '',
      background: value?.background || '',
      responsibility: value?.responsibility || '',
      techStack: value?.techStack || '',
      difficulty: value?.difficulty || '',
      solution: value?.solution || '',
      result: value?.result || '',
      reflection: value?.reflection || '',
      sourceResumeId: value?.sourceResumeId,
      sourceResumeProjectId: value?.sourceResumeProjectId,
      targetJobId: value?.targetJobId
    })
  },
  { immediate: true, deep: true }
)

defineExpose({
  validate: async () => {
    if (!formRef.value) return false
    const valid = await formRef.value.validate().catch(() => false)
    return valid ? { ...form } : false
  }
})
</script>

<style scoped lang="scss">
.project-evidence-form {
  display: grid;
  gap: 2px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
