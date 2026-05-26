<template>
  <div class="page-shell v4-version-page">
    <section class="v4-page-header">
      <div>
        <div class="v4-eyebrow">V4 简历版本</div>
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
                  <strong>V{{ item.versionNo ?? '--' }} · {{ item.versionName || `版本 #${item.id}` }}</strong>
                  <p class="muted">{{ item.sourceType || '--' }} · {{ item.createdAt || '--' }}</p>
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
            <el-empty v-if="!versions.length && !loading" description="暂无版本，请输入简历 ID 后创建快照。" />
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
          <strong>{{ field.field }}</strong>
          <span>{{ formatValue(field.sourceValue ?? field.currentValue) }}</span>
          <span>{{ formatValue(field.targetValue ?? field.versionValue) }}</span>
        </div>
        <el-empty v-if="!(diff?.fields || []).length" description="暂无差异字段" />
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
        <el-form-item label="优化记录 ID">
          <el-input-number v-model="suggestionForm.optimizeRecordId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="建议类型">
          <el-input v-model.trim="suggestionForm.suggestionType" placeholder="PROJECT_DEPTH / KEYWORD / CUSTOM" />
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

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

const route = useRoute()
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

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '接口请求失败')
  }
  return '接口请求失败'
}

const versionLabel = (item: ResumeVersionVO) =>
  `V${item.versionNo ?? '--'} · ${item.versionName || `#${item.id}`}`

const resumeLabel = (item: ResumeVO) =>
  `${item.resumeName || item.title || `简历 #${item.id}`}${item.targetPosition ? ` / ${item.targetPosition}` : ''}`

const formatValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '--'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
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
  saving.value = true
  try {
    await createResumeVersionApi(resumeId.value as number, { versionName: `V${versions.value.length + 1}` })
    ElMessage.success('版本已创建')
    await load()
  } finally {
    saving.value = false
  }
}

const openCopy = (item: ResumeVersionVO) => {
  copySource.value = item
  copyName.value = `${item.versionName || `V${item.versionNo ?? item.id}`} 副本`
  copyVisible.value = true
}

const copyVersion = async () => {
  if (!copySource.value) return
  saving.value = true
  try {
    await copyResumeVersionApi(resumeId.value as number, copySource.value.id, { versionName: copyName.value || undefined })
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
  await ElMessageBox.confirm('确认回滚到该版本？', '回滚确认', { type: 'warning' })
  if (!(await ensureResumeId())) return
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
  if (!suggestionVersion.value) return
  saving.value = true
  try {
    await applyResumeVersionSuggestionApi(suggestionVersion.value.id, {
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
    errorMessage.value = '请先创建一份简历，再使用简历版本功能'
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
