<template>
  <div class="job-target-edit page-shell">
    <section class="edit-hero">
      <div>
        <div class="hero-kicker">
          <FilePenLine :size="16" />
          Job Target Form
        </div>
        <h1>{{ pageTitle }}</h1>
        <p>表单字段严格按后端 `TargetJobSaveDTO` 提交，保存真实岗位目标与 JD 原文。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/job-targets')">
          <ArrowLeft :size="16" />
          返回列表
        </el-button>
        <el-button v-if="isEdit && targetId" type="primary" plain @click="router.push(`/job-targets/${targetId}/analysis`)">
          <ScanSearch :size="16" />
          查看分析
        </el-button>
      </div>
    </section>

    <section class="content-card">
      <div v-if="loading" class="state-wrap">
        <AppState type="loading" title="正在加载岗位详情" description="通过 GET /job-targets/{id} 读取真实数据。" />
      </div>

      <div v-else-if="loadError" class="state-wrap">
        <AppState type="error" title="岗位详情加载失败" :description="loadError">
          <el-button type="primary" @click="loadDetail">重新加载</el-button>
        </AppState>
      </div>

      <div v-else class="content-card__body edit-workspace">
        <div class="form-side">
          <h2>岗位信息</h2>
          <p>后端当前不支持城市、薪资、技能关键词独立字段，这些内容可保留在 JD 原文中。</p>
          <div class="contract-list">
            <div>
              <span>创建接口</span>
              <strong>POST /job-targets</strong>
            </div>
            <div>
              <span>编辑接口</span>
              <strong>PUT /job-targets/{id}</strong>
            </div>
            <div>
              <span>保存后</span>
              <strong>进入 JD 分析页</strong>
            </div>
          </div>
        </div>

        <JobTargetForm
          :model-value="form"
          :submitting="submitting"
          @submit="handleSubmit"
          @cancel="router.push('/job-targets')"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ArrowLeft, FilePenLine, ScanSearch } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { createJobTargetApi, getJobTargetDetailApi, updateJobTargetApi } from '@/api/jobTarget'
import AppState from '@/components/common/AppState.vue'
import type { TargetJobSaveDTO } from '@/types/jobTarget'

import JobTargetForm from './components/JobTargetForm.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const loadError = ref('')

const targetId = computed(() => {
  const raw = route.params.id
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(id) && id > 0 ? id : null
})
const isEdit = computed(() => Boolean(targetId.value))
const pageTitle = computed(() => (isEdit.value ? '编辑岗位目标' : '新增岗位目标'))

const form = reactive<TargetJobSaveDTO>({
  jobTitle: '',
  companyName: '',
  jobLevel: '',
  jdText: '',
  jdSource: ''
})

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return fallback
}

const loadDetail = async () => {
  if (!targetId.value) return
  loading.value = true
  loadError.value = ''
  try {
    const detail = await getJobTargetDetailApi(targetId.value)
    Object.assign(form, {
      jobTitle: detail.jobTitle || '',
      companyName: detail.companyName || '',
      jobLevel: detail.jobLevel || '',
      jdText: detail.jdText || '',
      jdSource: detail.jdSource || ''
    })
  } catch (error) {
    loadError.value = getErrorMessage(error, '目标岗位不存在或接口请求失败。')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async (value: TargetJobSaveDTO) => {
  submitting.value = true
  try {
    const saved = isEdit.value && targetId.value
      ? await updateJobTargetApi(targetId.value, value)
      : await createJobTargetApi(value)
    ElMessage.success(isEdit.value ? '岗位目标已更新' : '岗位目标已创建')
    await router.push(`/job-targets/${saved.id}/analysis`)
  } finally {
    submitting.value = false
  }
}

watch(
  () => route.params.id,
  () => {
    if (isEdit.value) {
      loadDetail()
    } else {
      Object.assign(form, {
        jobTitle: '',
        companyName: '',
        jobLevel: '',
        jdText: '',
        jdSource: ''
      })
      loadError.value = ''
    }
  }
)

onMounted(() => {
  if (isEdit.value) {
    loadDetail()
  }
})
</script>

<style scoped lang="scss">
.edit-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 26px;
  border: 1px solid rgba(129, 140, 248, 0.28);
  border-radius: var(--cc-radius-xl);
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(6, 182, 212, 0.07)),
    rgba(15, 23, 42, 0.78);
  box-shadow: var(--app-shadow);
}

.hero-kicker,
.hero-actions {
  display: flex;
  align-items: center;
}

.hero-kicker {
  gap: 8px;
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.edit-hero h1 {
  margin: 14px 0 0;
  font-size: 32px;
}

.edit-hero p {
  margin: 10px 0 0;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.hero-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.state-wrap {
  padding: 20px;
}

.edit-workspace {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 24px;
}

.form-side {
  padding-right: 24px;
  border-right: 1px solid rgba(148, 163, 184, 0.14);

  h2 {
    margin: 0;
    font-size: 20px;
  }

  p {
    margin: 10px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.contract-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;

  div {
    padding: 12px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 10px;
    background: rgba(2, 6, 23, 0.3);
  }

  span,
  strong {
    display: block;
  }

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 6px;
    color: #dbeafe;
    font-size: 13px;
  }
}

@media (max-width: 900px) {
  .edit-hero,
  .edit-workspace {
    grid-template-columns: 1fr;
  }

  .edit-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .form-side {
    padding-right: 0;
    border-right: 0;
  }
}
</style>
