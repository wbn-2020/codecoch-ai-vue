<template>
  <div class="page-shell v4-memory-page">
    <section class="v4-page-header">
      <div>
        <div class="v4-eyebrow">长期记忆</div>
        <h1>长期记忆管理</h1>
        <p>查看、添加、停用或删除智能教练记住的偏好与弱项。</p>
      </div>
      <div class="v4-actions">
        <el-button type="primary" @click="openCreate()">新增记忆</el-button>
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </section>

    <section class="content-card">
      <div class="content-card__body v4-list" v-loading="loading">
        <article v-for="item in memories" :key="item.id" class="v4-row">
          <div class="v4-row-head">
            <div>
              <strong>{{ memoryTypeLabel(item.memoryType) }}</strong>
              <p class="muted">{{ item.content }}</p>
              <small class="muted">
                {{ sourceTypeLabel(item.sourceType) }} · 可信度 {{ confidenceLabel(item.confidence) }}
              </small>
            </div>
            <div class="v4-actions">
              <el-tag :type="item.enabled ? 'success' : 'info'">{{ item.enabled ? '启用' : '停用' }}</el-tag>
              <el-button link type="primary" @click="toggle(item)">{{ item.enabled ? '停用' : '启用' }}</el-button>
              <el-button link type="danger" @click="remove(item)">删除</el-button>
            </div>
          </div>
        </article>
        <AppState
          v-if="errorMessage && !loading"
          type="error"
          title="长期记忆加载失败"
          :description="errorMessage"
        >
          <div class="empty-actions">
            <el-button type="primary" :loading="loading" @click="load">重新加载</el-button>
          </div>
        </AppState>
        <AppState
          v-else-if="!memories.length && !loading"
          type="empty"
          title="还没有长期记忆"
          description="可以先手动记录一个偏好、弱项或面试复盘结论；后续智能教练生成运行也可以沉淀可追踪记忆。"
        >
          <div class="empty-actions">
            <el-button type="primary" @click="openCreate('WEAKNESS')">记录一个弱项</el-button>
            <el-button @click="openCreate('PREFERENCE')">记录偏好</el-button>
          </div>
        </AppState>
      </div>
    </section>

    <el-dialog v-model="dialogVisible" title="新增记忆" width="520px">
      <el-form label-position="top">
        <el-form-item label="类型">
          <el-select v-model="form.memoryType" allow-create filterable style="width: 100%" placeholder="选择记忆类型">
            <el-option v-for="item in memoryTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="!form.content.trim()" @click="create">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import {
  createAgentMemoryApi,
  deleteAgentMemoryApi,
  disableAgentMemoryApi,
  enableAgentMemoryApi,
  getAgentMemoriesApi,
  type AgentMemoryVO
} from '@/api/v4'
import AppState from '@/components/common/AppState.vue'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const memories = ref<AgentMemoryVO[]>([])
const errorMessage = ref('')
const form = reactive({ memoryType: 'USER_NOTE', content: '' })

const memoryTypeOptions = [
  { label: '用户笔记', value: 'USER_NOTE' },
  { label: '薄弱项', value: 'WEAKNESS' },
  { label: '学习偏好', value: 'PREFERENCE' },
  { label: '面试复盘', value: 'INTERVIEW_REVIEW' },
  { label: '项目经验', value: 'PROJECT_EXPERIENCE' }
]

const sourceTypeLabels: Record<string, string> = {
  MANUAL: '手动记录',
  AGENT_RUN: '智能教练沉淀',
  INTERVIEW: '面试复盘沉淀',
  STUDY_TASK: '训练任务沉淀',
  RESUME: '简历资料沉淀'
}

const memoryTypeLabel = (value?: string) =>
  memoryTypeOptions.find((item) => item.value === value)?.label || '未分类记忆'

const sourceTypeLabel = (value?: string) => sourceTypeLabels[String(value || 'MANUAL').toUpperCase()] || '来源待确认'

const confidenceLabel = (value?: number) => {
  if (value === undefined || value === null) return '未评估'
  const normalized = value > 1 ? value : value * 100
  return `${Math.round(normalized)}%`
}

const load = async () => {
  loading.value = true
  try {
    const page = await getAgentMemoriesApi({ pageNo: 1, pageSize: 50 })
    memories.value = page.records || []
    errorMessage.value = ''
  } catch (error) {
    memories.value = []
    errorMessage.value = getErrorMessage(error, '长期记忆暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const openCreate = (memoryType = 'USER_NOTE') => {
  form.memoryType = memoryType
  form.content = ''
  dialogVisible.value = true
}

const create = async () => {
  const content = form.content.trim()
  if (!content) {
    ElMessage.warning('请先填写记忆内容')
    return
  }
  const confirmed = await confirmDangerActionPreview({
    title: '新增长期记忆',
    action: '保存一条会影响智能教练推荐的长期记忆',
    target: `${memoryTypeLabel(form.memoryType)}：${content}`,
    impact: '保存后，智能教练后续生成今日计划、复盘、题库训练和面试建议时，可能把这条记忆作为偏好、弱项或项目背景依据。',
    rollback: '如内容不准确，可以在列表中停用或删除；删除后需要重新手动记录或等待后续运行再次沉淀。',
    audit: '新增记忆会按当前账号、记忆类型和创建时间记录。',
    tips: ['确认内容是真实偏好、弱项或复盘结论。', '避免写入不希望长期影响推荐的临时想法或敏感信息。'],
    confirmButtonText: '确认保存'
  })
  if (!confirmed) return
  saving.value = true
  try {
    await createAgentMemoryApi({ memoryType: form.memoryType, content })
    dialogVisible.value = false
    form.content = ''
    ElMessage.success('记忆已保存')
    await load()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '记忆保存失败，请稍后重试。'))
  } finally {
    saving.value = false
  }
}

const toggle = async (item: AgentMemoryVO) => {
  const actionLabel = item.enabled ? '停用' : '启用'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}长期记忆`,
    action: `${actionLabel}这条智能教练长期记忆`,
    target: `${memoryTypeLabel(item.memoryType)}：${item.content || '长期记忆'}`,
    impact: item.enabled
      ? '停用后，智能教练后续生成计划、复盘和推荐时不会主动使用这条记忆。'
      : '启用后，智能教练后续生成计划、复盘和推荐时可以继续使用这条记忆作为依据。',
    rollback: item.enabled
      ? '如停用后发现仍需要这条记忆，可以重新启用。'
      : '如启用后发现内容不准确，可以再次停用或删除。',
    audit: `${actionLabel}操作会记录当前账号和这条记忆。`,
    tips: [
      item.enabled ? '确认这条记忆暂时不适合继续影响推荐。' : '确认这条记忆内容仍然准确。',
      '该操作不会删除记忆正文。'
    ],
    confirmButtonText: `确认${actionLabel}`
  })
  if (!confirmed) return
  try {
    item.enabled ? await disableAgentMemoryApi(item.id) : await enableAgentMemoryApi(item.id)
    ElMessage.success(item.enabled ? '记忆已停用' : '记忆已启用')
    await load()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '记忆状态更新失败，请稍后重试。'))
  }
}

const remove = async (item: AgentMemoryVO) => {
  const confirmed = await confirmDangerActionPreview({
    title: '删除长期记忆',
    action: '删除这条智能教练长期记忆',
    target: `${memoryTypeLabel(item.memoryType)}：${item.content || '长期记忆'}`,
    impact: '删除后，智能教练后续生成计划、复盘和推荐时将不再主动使用这条偏好或弱项作为依据。',
    rollback: '系统不会自动恢复已删除记忆；如误删，需要重新手动记录或等待后续运行再次沉淀。',
    audit: '删除操作会记录当前账号和这条记忆。',
    tips: ['确认这条记忆已经不再准确或不希望继续影响推荐。', '确认删除后不会影响你正在进行的今日任务。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  try {
    await deleteAgentMemoryApi(item.id)
    ElMessage.success('记忆已删除')
    await load()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '记忆删除失败，请稍后重试。'))
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.v4-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(34, 197, 94, 0.08)), var(--app-surface);
  box-shadow: var(--app-shadow);
}

.v4-page-header h1 {
  margin: 8px 0 0;
  font-size: 28px;
}

.v4-page-header p,
.muted {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.v4-eyebrow {
  color: #93c5fd;
  font-size: 13px;
  font-weight: 700;
}

.v4-list {
  display: grid;
  gap: 12px;
}

.v4-row {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.52);
}

.v4-row-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.v4-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

@media (max-width: 900px) {
  .v4-page-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
