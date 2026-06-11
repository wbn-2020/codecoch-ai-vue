<template>
  <div class="page-shell v4-version-page">
    <section class="v4-page-header">
      <div>
        <div class="v4-eyebrow">简历版本管理</div>
        <h1>简历版本</h1>
        <p>创建快照、复制版本、对比版本差异、回滚版本，并记录 AI 优化建议采纳情况。</p>
      </div>
      <div class="v4-actions">
        <el-select
          v-model="resumeId"
          filterable
          clearable
          placeholder="选择简历"
          style="width: 260px"
          :loading="resumeLoading"
          @change="load"
        >
          <el-option
            v-for="item in resumes"
            :key="item.id"
            :label="resumeLabel(item)"
            :value="item.id"
          />
        </el-select>
        <el-button :loading="loading || resumeLoading" @click="load">加载</el-button>
        <el-button type="primary" :disabled="!resumeId" :loading="saving" @click="create">创建版本</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="简历版本加载失败" :description="errorMessage">
      <el-button type="primary" @click="load">重试</el-button>
    </AppState>

    <template v-else>
      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">版本</p>
              <h2>版本列表</h2>
            </div>
          </div>
          <div class="v4-list" v-loading="loading">
            <article v-for="item in versions" :key="item.id" class="v4-row">
              <div class="v4-row-head">
                <div>
                  <strong>V{{ item.versionNo ?? '--' }} · {{ item.versionName || '简历版本' }}</strong>
                  <p class="muted">{{ sourceTypeLabel(item.sourceType) }} · {{ item.createdAt || '--' }}</p>
                </div>
                <div class="v4-actions">
                  <el-tag v-if="item.currentFlag" type="success">当前版本</el-tag>
                  <el-button link type="primary" @click="showCurrentDiff(item.id)">对比当前</el-button>
                  <el-button link type="primary" @click="openCopy(item)">复制</el-button>
                  <el-button link type="success" @click="openSuggestion(item)">应用建议</el-button>
                  <el-button link type="warning" @click="rollback(item.id)">回滚</el-button>
                </div>
              </div>
            </article>
            <AppState
              v-if="!versions.length && !loading"
              type="empty"
              :title="versionEmptyTitle"
              :description="versionEmptyDescription"
            >
              <div class="empty-actions">
                <el-button v-if="!resumeId && !resumes.length" type="primary" @click="goCreateResume">新建简历</el-button>
                <el-button v-else-if="resumeId" type="primary" :loading="saving" @click="create">创建首个版本</el-button>
                <el-button v-else type="primary" @click="selectDefaultResume">选择默认简历</el-button>
                <el-button @click="goResumeHub">返回简历中心</el-button>
              </div>
            </AppState>
          </div>
        </div>
      </section>

      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">双版本对比</p>
              <h2>对比两个版本</h2>
            </div>
          </div>
          <div class="pair-diff-bar">
            <el-select v-model="sourceVersionId" clearable placeholder="来源版本" style="width: 220px">
              <el-option v-for="item in versions" :key="item.id" :label="versionLabel(item)" :value="item.id" />
            </el-select>
            <el-select v-model="targetVersionId" clearable placeholder="目标版本" style="width: 220px">
              <el-option v-for="item in versions" :key="item.id" :label="versionLabel(item)" :value="item.id" />
            </el-select>
            <el-button type="primary" :disabled="!sourceVersionId || !targetVersionId" @click="showPairDiff">对比</el-button>
          </div>
        </div>
      </section>
    </template>

    <el-dialog v-model="diffVisible" title="版本差异" width="820px">
      <div class="diff-grid">
        <div class="diff-row diff-row--head">
          <strong>字段</strong>
          <strong>{{ diff?.sourceLabel || '当前/来源' }}</strong>
          <strong>{{ diff?.targetLabel || '版本/目标' }}</strong>
        </div>
        <div v-for="field in diff?.fields || []" :key="field.field" class="diff-row" :class="{ changed: field.changed }">
          <strong>{{ formatFieldLabel(field.field) }}</strong>
          <span>{{ formatValue(field.sourceValue ?? field.currentValue) }}</span>
          <span>{{ formatValue(field.targetValue ?? field.versionValue) }}</span>
        </div>
        <AppState
          v-if="!(diff?.fields || []).length"
          type="empty"
          title="没有可展示的差异字段"
          description="两个版本可能内容一致，或本次对比暂未返回字段明细。可以换一组版本对比，或回到版本列表确认版本号。"
        >
          <el-button type="primary" plain @click="diffVisible = false">返回版本列表</el-button>
        </AppState>
      </div>
    </el-dialog>

    <el-dialog v-model="copyVisible" title="复制版本" width="460px">
      <el-form label-position="top">
        <el-form-item label="版本名称">
          <el-input v-model.trim="copyName" maxlength="80" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="copyVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="copyVersion">复制</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="suggestionVisible" title="应用 AI 建议" width="520px">
      <el-form label-position="top">
        <el-form-item label="关联优化记录">
          <el-input-number v-model="suggestionForm.optimizeRecordId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="建议类型">
          <el-select v-model="suggestionForm.suggestionType" clearable allow-create filterable placeholder="选择或输入建议类型" style="width: 100%">
            <el-option v-for="item in suggestionTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="suggestionForm.status" style="width: 100%">
            <el-option label="已采纳" value="APPLIED" />
            <el-option label="已拒绝" value="REJECTED" />
            <el-option label="部分采纳" value="PARTIAL" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="suggestionForm.note" type="textarea" :rows="3" maxlength="300" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="suggestionVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="applySuggestion">应用</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getResumesApi } from '@/api/resume'
import {
  applyResumeVersionSuggestionApi,
  copyResumeVersionApi,
  createResumeVersionApi,
  getResumeVersionDiffApi,
  getResumeVersionsApi,
  getResumeVersionsPairDiffApi,
  rollbackResumeVersionApi,
  type ResumeVersionDiffVO,
  type ResumeVersionVO
} from '@/api/v4'
import AppState from '@/components/common/AppState.vue'
import type { ResumeVO } from '@/types/resume'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { toFriendlyMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()
const initialResumeId = Number(route.params.id)
const resumeId = ref<number | undefined>(Number.isFinite(initialResumeId) && initialResumeId > 0 ? initialResumeId : undefined)
const resumes = ref<ResumeVO[]>([])
const loading = ref(false)
const resumeLoading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const versions = ref<ResumeVersionVO[]>([])
const diffVisible = ref(false)
const diff = ref<ResumeVersionDiffVO>()
const copyVisible = ref(false)
const copySource = ref<ResumeVersionVO>()
const copyName = ref('')
const suggestionVisible = ref(false)
const suggestionVersion = ref<ResumeVersionVO>()
const sourceVersionId = ref<number>()
const targetVersionId = ref<number>()

const suggestionForm = reactive({
  optimizeRecordId: undefined as number | undefined,
  suggestionType: '',
  status: 'APPLIED',
  note: ''
})

const suggestionTypeOptions = [
  { label: '项目深度', value: 'PROJECT_DEPTH' },
  { label: '关键词优化', value: 'KEYWORD' },
  { label: '自定义建议', value: 'CUSTOM' }
]

const suggestionStatusLabels: Record<string, string> = {
  APPLIED: '已采纳',
  REJECTED: '已拒绝',
  PARTIAL: '部分采纳'
}

const selectedResume = computed(() => resumes.value.find((item) => item.id === resumeId.value))
const selectedResumeLabel = computed(() => selectedResume.value ? resumeLabel(selectedResume.value) : '已选择简历')

const versionEmptyTitle = computed(() => {
  if (!resumeId.value) return '先选择一份简历'
  return '这份简历还没有版本'
})

const versionEmptyDescription = computed(() => {
  if (!resumeId.value && !resumes.value.length) {
    return '简历版本会围绕具体简历生成快照；先在简历中心创建或上传简历，再回来做版本对比。'
  }
  if (!resumeId.value) {
    return '选择上方简历后，可以创建首个快照，用来对比后续优化前后的变化。'
  }
  return `当前选择的是「${selectedResumeLabel.value}」，创建首个版本后才能复制、对比或回滚。`
})

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '简历版本暂时加载失败，请稍后重试。')
  }
  return '简历版本暂时加载失败，请稍后重试。'
}

const versionLabel = (item: ResumeVersionVO) =>
  `V${item.versionNo ?? '--'} · ${item.versionName || '简历版本'}`

const suggestionTypeLabel = (value?: string) =>
  suggestionTypeOptions.find((item) => item.value === value)?.label || value || '未选择建议类型'

const suggestionStatusLabel = (value?: string) =>
  suggestionStatusLabels[String(value || '').toUpperCase()] || value || '未选择状态'

const resumeLabel = (item: ResumeVO) =>
  `${item.resumeName || item.title || '简历'}${item.targetPosition ? ` / ${item.targetPosition}` : ''}`

const sourceTypeLabel = (value?: string | null) => {
  const type = String(value || '').toUpperCase()
  const map: Record<string, string> = {
    MANUAL: '手动创建',
    AI_OPTIMIZE: 'AI 优化记录',
    COPY: '复制版本',
    ROLLBACK: '回滚生成',
    UPLOAD: '上传简历'
  }
  return type ? map[type] || '来源待确认' : '--'
}

const diffFieldLabels: Record<string, string> = {
  resumeName: '简历名称',
  title: '标题',
  targetPosition: '目标岗位',
  summary: '摘要',
  education: '教育经历',
  workExperience: '工作经历',
  projectExperience: '项目经历',
  skills: '技能',
  skillTags: '技能标签',
  certificates: '证书',
  languages: '语言能力',
  advantages: '优势',
  selfEvaluation: '自我评价',
  expectedSalary: '期望薪资',
  city: '城市',
  content: '内容',
  description: '说明'
}

const formatFieldLabel = (field?: string | null) => {
  const value = String(field || '').trim()
  if (!value) return '字段'
  return diffFieldLabels[value] || value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim()
}

const isDiffRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const formatDiffStructuredValue = (value: unknown, depth = 0): string => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  const indent = '  '.repeat(depth)
  if (Array.isArray(value)) {
    if (!value.length) return ''
    return value
      .map((item, index) => {
        const formatted = formatDiffStructuredValue(item, depth + 1)
        if (!formatted) return ''
        return `${indent}${index + 1}. ${isDiffRecord(item) || Array.isArray(item) ? '\n' : ''}${formatted}`
      })
      .filter(Boolean)
      .join('\n')
  }

  if (isDiffRecord(value)) {
    return Object.entries(value)
      .map(([key, item]) => {
        const formatted = formatDiffStructuredValue(item, depth + 1)
        if (!formatted) return ''
        return `${indent}- ${formatFieldLabel(key)}：${isDiffRecord(item) || Array.isArray(item) ? '\n' : ''}${formatted}`
      })
      .filter(Boolean)
      .join('\n')
  }

  return String(value)
}

const formatValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '--'
  if (typeof value === 'string') return value
  return formatDiffStructuredValue(value) || '--'
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    if (!(await ensureResumeId())) {
      versions.value = []
      return
    }
    versions.value = await getResumeVersionsApi(resumeId.value as number)
  } catch (error) {
    versions.value = []
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const create = async () => {
  if (!(await ensureResumeId())) return
  const versionName = `V${versions.value.length + 1}`
  const confirmed = await confirmDangerActionPreview({
    title: '创建简历版本',
    action: '为当前简历创建一份可追溯快照',
    target: `${selectedResumeLabel.value} · ${versionName}`,
    impact: '新版本会进入版本列表，后续复制、对比、回滚、AI 优化建议采纳和面试/训练证据追踪都可能引用这份快照。',
    rollback: '创建快照不会覆盖当前简历；如版本名称或来源不符合预期，可以后续复制、对比或回滚到其它版本。',
    audit: '创建版本会记录当前简历、版本号和账号信息，便于追踪后续投递和训练依据。',
    tips: ['确认当前简历内容已经保存。', '确认这份快照适合作为后续优化前后的对比基准。'],
    confirmButtonText: '确认创建'
  })
  if (!confirmed) return
  saving.value = true
  try {
    await createResumeVersionApi(resumeId.value as number, { versionName })
    ElMessage.success('版本已创建')
    await load()
  } finally {
    saving.value = false
  }
}

const selectDefaultResume = async () => {
  if (!resumes.value.length) {
    await loadResumeOptions()
  }
  const defaultResume = resumes.value.find((item) => item.isDefault === 1) || resumes.value[0]
  if (!defaultResume?.id) {
    ElMessage.info('请先创建一份简历')
    return
  }
  resumeId.value = defaultResume.id
  await load()
}

const goCreateResume = () => router.push('/resumes/create')
const goResumeHub = () => router.push('/resumes')

const openCopy = (item: ResumeVersionVO) => {
  copySource.value = item
  copyName.value = `${item.versionName || `V${item.versionNo ?? item.id}`} 副本`
  copyVisible.value = true
}

const copyVersion = async () => {
  if (!copySource.value || saving.value) return
  if (!(await ensureResumeId())) return
  const source = copySource.value
  const versionName = copyName.value || `${source.versionName || `V${source.versionNo ?? source.id}`} 副本`
  const confirmed = await confirmDangerActionPreview({
    title: '复制简历版本预览',
    action: '复制一份历史版本作为新的可追溯快照',
    target: `${selectedResumeLabel.value} · ${versionLabel(source)}；复制为：${versionName}`,
    impact: '复制后会新增一条简历版本，后续对比、回滚、AI 优化建议采纳和面试/训练证据追踪都可能引用这份副本。',
    rollback: '复制不会覆盖当前简历正文；如副本名称或来源不合适，可以继续复制其他版本或回滚到合适版本。',
    audit: '复制操作会记录当前简历、来源版本和新版本名称。',
    tips: ['确认来源版本就是要保留的内容。', '建议使用能说明用途的版本名称，方便后续对比。'],
    confirmButtonText: '确认复制版本'
  })
  if (!confirmed) return
  saving.value = true
  try {
    await copyResumeVersionApi(resumeId.value as number, source.id, { versionName })
    copyVisible.value = false
    ElMessage.success('版本已复制')
    await load()
  } finally {
    saving.value = false
  }
}

const showCurrentDiff = async (versionId: number) => {
  if (!(await ensureResumeId())) return
  diff.value = await getResumeVersionDiffApi(resumeId.value as number, versionId)
  diffVisible.value = true
}

const showPairDiff = async () => {
  if (!sourceVersionId.value || !targetVersionId.value) return
  diff.value = await getResumeVersionsPairDiffApi(sourceVersionId.value, targetVersionId.value)
  diffVisible.value = true
}

const rollback = async (versionId: number) => {
  if (!(await ensureResumeId())) return
  const version = versions.value.find((item) => item.id === versionId)
  const confirmed = await confirmDangerActionPreview({
    title: '回滚简历版本',
    action: '将当前简历回滚到选中的历史版本',
    target: version?.versionName || '选中的简历版本',
    impact: '当前简历内容会按该版本恢复，后续简历匹配、面试追问和训练推荐可能使用回滚后的内容作为证据。',
    rollback: '如需恢复其他版本，需要再次从版本列表选择并回滚；页面不会自动保存本次回滚前的临时编辑内容。',
    audit: '回滚操作会记录当前简历和目标版本，便于后续追踪来源。',
    tips: ['确认当前简历没有未保存的编辑。', '确认该版本内容适合作为后续投递和训练依据。'],
    confirmButtonText: '确认回滚'
  })
  if (!confirmed) return
  await rollbackResumeVersionApi(resumeId.value as number, versionId)
  ElMessage.success('版本已回滚')
  await load()
}

const openSuggestion = (item: ResumeVersionVO) => {
  suggestionVersion.value = item
  Object.assign(suggestionForm, {
    optimizeRecordId: item.sourceType === 'AI_OPTIMIZE' ? item.sourceId : undefined,
    suggestionType: '',
    status: 'APPLIED',
    note: ''
  })
  suggestionVisible.value = true
}

const applySuggestion = async () => {
  if (!suggestionVersion.value || saving.value) return
  const version = suggestionVersion.value
  const confirmed = await confirmDangerActionPreview({
    title: '记录 AI 建议采纳预览',
    action: '保存这条简历版本的建议采纳状态',
    target: `${versionLabel(version)}；状态：${suggestionStatusLabel(suggestionForm.status)}`,
    impact: '保存后会形成一条 AI 优化建议采纳记录，后续简历版本复盘、优化证据和训练建议可能引用这次判断。',
    rollback: '该操作不会直接改写简历正文；如记录不准确，可以重新补充采纳状态或备注修正。',
    audit: `关联优化记录：${suggestionForm.optimizeRecordId || '未关联'}；建议类型：${suggestionTypeLabel(suggestionForm.suggestionType)}`,
    tips: [
      '确认采纳状态和备注能说明为什么采用或拒绝这条建议。',
      suggestionForm.note ? '备注会作为后续复盘线索，请避免填写无关隐私内容。' : '建议补充一句备注，方便之后回看。'
    ],
    confirmButtonText: '确认保存记录'
  })
  if (!confirmed) return
  saving.value = true
  try {
    await applyResumeVersionSuggestionApi(version.id, {
      optimizeRecordId: suggestionForm.optimizeRecordId,
      suggestionType: suggestionForm.suggestionType || undefined,
      status: suggestionForm.status,
      note: suggestionForm.note || undefined
    })
    suggestionVisible.value = false
    ElMessage.success('建议采纳记录已保存')
  } finally {
    saving.value = false
  }
}

const loadResumeOptions = async () => {
  resumeLoading.value = true
  try {
    const result = await getResumesApi({ pageNo: 1, pageSize: 100 })
    resumes.value = result.records || []
    if (!resumeId.value && resumes.value.length) {
      const defaultResume = resumes.value.find((item) => item.isDefault === 1) || resumes.value[0]
      resumeId.value = defaultResume.id
    }
  } finally {
    resumeLoading.value = false
  }
}

const ensureResumeId = async () => {
  if (resumeId.value) {
    return true
  }
  if (!resumes.value.length) {
    await loadResumeOptions()
  }
  if (!resumeId.value) {
    return false
  }
  return true
}

onMounted(async () => {
  await loadResumeOptions()
  await load()
})
</script>

<style scoped lang="scss">
.v4-page-header,
.v4-row-head,
.v4-actions,
.section-head,
.pair-diff-bar {
  display: flex;
  gap: 16px;
}

.v4-page-header {
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(34, 197, 94, 0.08)), var(--app-surface);
  box-shadow: var(--app-shadow);
}

.v4-page-header h1,
.section-head h2 {
  margin: 0;
}

.v4-page-header h1 {
  margin-top: 8px;
  font-size: 28px;
}

.v4-page-header p,
.muted {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.v4-eyebrow,
.section-kicker {
  color: #93c5fd;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.v4-actions,
.pair-diff-bar {
  flex-wrap: wrap;
  align-items: center;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.section-head {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-kicker {
  margin: 0 0 6px;
}

.v4-list {
  display: grid;
  gap: 12px;
}

.v4-row {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.58);
}

.v4-row-head {
  align-items: flex-start;
  justify-content: space-between;
}

.diff-grid {
  display: grid;
  gap: 8px;
}

.diff-row {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
}

.diff-row span {
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.diff-row--head,
.diff-row.changed {
  background: rgba(59, 130, 246, 0.1);
}

@media (max-width: 900px) {
  .v4-page-header,
  .v4-row-head,
  .diff-row {
    align-items: flex-start;
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>
