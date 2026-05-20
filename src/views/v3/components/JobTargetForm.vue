<template>
  <el-form
    ref="formRef"
    class="job-target-form"
    :model="form"
    :rules="rules"
    label-position="top"
    :disabled="submitting"
  >
    <div class="form-grid">
      <el-form-item label="岗位名称 / 目标岗位" prop="jobTitle">
        <el-input v-model.trim="form.jobTitle" maxlength="128" show-word-limit placeholder="例如：Java 后端开发工程师" />
      </el-form-item>
      <el-form-item label="公司名称" prop="companyName">
        <el-input v-model.trim="form.companyName" maxlength="128" show-word-limit placeholder="后端支持，可选" />
      </el-form-item>
      <el-form-item label="岗位级别 / 经验要求" prop="jobLevel">
        <el-input v-model.trim="form.jobLevel" maxlength="64" show-word-limit placeholder="例如：3-5 年 / 中级 / 高级" />
      </el-form-item>
      <el-form-item label="JD 来源" prop="jdSource">
        <el-input v-model.trim="form.jdSource" maxlength="64" show-word-limit placeholder="例如：BOSS 直聘 / 官网 / 猎聘" />
      </el-form-item>
    </div>

    <el-form-item label="JD 原文 / 岗位描述" prop="jdText">
      <el-input
        v-model="form.jdText"
        type="textarea"
        :rows="14"
        maxlength="20000"
        show-word-limit
        placeholder="粘贴真实 JD 原文。前端会原样提交给后端，不生成示例 JD。"
      />
    </el-form-item>

    <el-alert
      class="field-note"
      type="info"
      :closable="false"
      show-icon
      title="字段已按后端 TargetJobSaveDTO 对齐：本轮不提交城市、薪资范围、技能关键词等后端尚未支持字段。"
    />

    <div class="form-actions">
      <el-button :disabled="submitting" @click="$emit('cancel')">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">
        保存岗位目标
      </el-button>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { reactive, ref, watch } from 'vue'

import type { TargetJobSaveDTO } from '@/types/jobTarget'

const props = defineProps<{
  modelValue: TargetJobSaveDTO
  submitting?: boolean
}>()

const emit = defineEmits<{
  submit: [value: TargetJobSaveDTO]
  cancel: []
}>()

const formRef = ref<FormInstance>()
const form = reactive<TargetJobSaveDTO>({
  jobTitle: '',
  companyName: '',
  jobLevel: '',
  jdText: '',
  jdSource: ''
})

const rules: FormRules<TargetJobSaveDTO> = {
  jobTitle: [
    { required: true, message: '请输入岗位名称', trigger: 'blur' },
    { max: 128, message: '岗位名称不能超过 128 个字符', trigger: 'blur' }
  ],
  companyName: [{ max: 128, message: '公司名称不能超过 128 个字符', trigger: 'blur' }],
  jobLevel: [{ max: 64, message: '岗位级别不能超过 64 个字符', trigger: 'blur' }],
  jdSource: [{ max: 64, message: 'JD 来源不能超过 64 个字符', trigger: 'blur' }],
  jdText: [{ max: 20000, message: 'JD 原文不能超过 20000 个字符', trigger: 'blur' }]
}

watch(
  () => props.modelValue,
  (value) => {
    Object.assign(form, {
      jobTitle: value.jobTitle || '',
      companyName: value.companyName || '',
      jobLevel: value.jobLevel || '',
      jdText: value.jdText || '',
      jdSource: value.jdSource || ''
    })
  },
  { immediate: true, deep: true }
)

const submit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', { ...form })
}
</script>

<style scoped lang="scss">
.job-target-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 18px;
}

.field-note {
  margin-top: 4px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    justify-content: flex-start;
  }
}
</style>
