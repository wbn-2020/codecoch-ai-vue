<template>
  <el-form ref="formRef" class="project-evidence-form" :model="form" :rules="rules" label-position="top">
    <section class="evidence-group">
      <header>
        <span>事实</span>
        <h3>先记录可核验的项目背景</h3>
      </header>
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
        <el-input v-model="form.background" type="textarea" :rows="3" placeholder="说明业务目标、用户或系统规模，以及当时面临的问题。" />
      </el-form-item>
    </section>

    <section class="evidence-group">
      <header>
        <span>过程</span>
        <h3>明确个人贡献与解决路径</h3>
      </header>
      <el-form-item label="我的职责 / 个人贡献">
        <el-input v-model="form.responsibility" type="textarea" :rows="3" placeholder="只写自己负责、主导或直接交付的部分。" />
      </el-form-item>
      <el-form-item label="核心难点">
        <el-input v-model="form.difficulty" type="textarea" :rows="3" placeholder="说明约束、风险和最难判断的技术问题。" />
      </el-form-item>
      <el-form-item label="解决方案">
        <el-input v-model="form.solution" type="textarea" :rows="3" placeholder="写清方案、关键取舍、落地步骤和验证方式。" />
      </el-form-item>
    </section>

    <section class="evidence-group">
      <header>
        <span>结果</span>
        <h3>用结果和复盘收束证据</h3>
      </header>
      <el-form-item label="量化结果">
        <el-input v-model="form.result" type="textarea" :rows="3" placeholder="优先填写性能、稳定性、效率、成本或业务指标。" />
      </el-form-item>
      <el-form-item label="复盘沉淀">
        <el-input v-model="form.reflection" type="textarea" :rows="3" placeholder="说明后续沉淀、可复用方法和下一次会如何改进。" />
      </el-form-item>
    </section>

    <details class="advanced-settings">
      <summary>高级设置</summary>
      <p>默认沿用当前关联岗位；仅在需要修正内部关联时调整数字 ID。</p>
      <div class="form-grid">
        <el-form-item label="目标岗位 ID">
          <el-input-number v-model="form.targetJobId" :min="1" :controls="false" />
        </el-form-item>
        <el-form-item label="来源简历 ID">
          <el-input-number v-model="form.sourceResumeId" :min="1" :controls="false" />
        </el-form-item>
      </div>
      <el-form-item label="来源简历项目 ID">
        <el-input-number v-model="form.sourceResumeProjectId" :min="1" :controls="false" />
      </el-form-item>
    </details>
  </el-form>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import type { ProjectEvidenceDTO } from '@/types/projectEvidence'

const props = defineProps<{
  modelValue?: Partial<ProjectEvidenceDTO>
}>()

const route = useRoute()
const routeTargetJobId = computed(() => {
  const value = Number(route.query.targetJobId)
  return Number.isFinite(value) && value > 0 ? value : undefined
})
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
      targetJobId: value?.targetJobId ?? routeTargetJobId.value
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
  gap: 18px;
}

.evidence-group {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);

  header {
    margin-bottom: 14px;
  }

  header span {
    color: var(--app-primary);
    font-size: 12px;
    font-weight: 600;
  }

  h3 {
    margin: 4px 0 0;
    color: var(--app-text);
    font-size: 16px;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.advanced-settings {
  padding: 14px 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--user-surface-muted, var(--app-surface-raised));

  summary {
    color: var(--app-text);
    cursor: pointer;
    font-weight: 600;
  }

  > p {
    margin: 10px 0 14px;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.6;
  }

  :deep(.el-input-number) {
    width: 100%;
  }
}

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
