<template>
  <div class="job-experiment-create page-shell">
    <section class="content-card form-card">
      <div class="card-title">
        <h1>{{ isEdit ? '编辑求职实验' : '新建求职实验' }}</h1>
        <el-tag type="info" effect="plain">3A</el-tag>
      </div>
      <el-form label-position="top">
        <el-form-item label="实验名称">
          <el-input v-model="form.title" maxlength="128" show-word-limit />
        </el-form-item>
        <el-form-item label="实验目标">
          <el-input v-model="form.goal" type="textarea" :rows="3" maxlength="512" show-word-limit />
        </el-form-item>
        <el-form-item label="目标方向">
          <el-input v-model="form.targetDirection" placeholder="Java 后端 / Redis / 高并发" />
        </el-form-item>
        <div class="date-row">
          <el-form-item label="开始日期">
            <el-date-picker v-model="form.startDate" value-format="YYYY-MM-DD" type="date" />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker v-model="form.endDate" value-format="YYYY-MM-DD" type="date" />
          </el-form-item>
        </div>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="进行中" value="RUNNING" />
            <el-option label="已复盘" value="REVIEWED" />
            <el-option label="已归档" value="ARCHIVED" />
          </el-select>
        </el-form-item>
      </el-form>
      <div class="actions">
        <el-button @click="router.push('/job-experiments')">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { createJobExperimentApi, getJobExperimentDetailApi, updateJobExperimentApi } from '@/api/jobExperiment'
import type { JobSearchExperimentSaveDTO } from '@/types/jobExperiment'

const route = useRoute()
const router = useRouter()
const saving = ref(false)
const experimentId = computed(() => Number(route.params.id || 0))
const isEdit = computed(() => experimentId.value > 0)
const form = reactive<JobSearchExperimentSaveDTO>({
  title: '',
  goal: '',
  targetDirection: '',
  status: 'RUNNING'
})

const load = async () => {
  if (!isEdit.value) return
  const detail = await getJobExperimentDetailApi(experimentId.value)
  Object.assign(form, {
    title: detail.title,
    goal: detail.goal,
    targetDirection: detail.targetDirection,
    startDate: detail.startDate,
    endDate: detail.endDate,
    status: detail.status
  })
}

const save = async () => {
  if (!form.title?.trim()) {
    ElMessage.warning('请填写实验名称')
    return
  }
  saving.value = true
  try {
    const detail = isEdit.value
      ? await updateJobExperimentApi(experimentId.value, form)
      : await createJobExperimentApi(form)
    router.push(`/job-experiments/${detail.id}`)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.form-card {
  max-width: 820px;
  padding: 22px;
}

.card-title,
.date-row,
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-title {
  justify-content: space-between;
  margin-bottom: 18px;
}

.date-row {
  align-items: flex-start;
}

.actions {
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
