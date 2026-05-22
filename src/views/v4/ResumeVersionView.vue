<template>
  <div class="page-shell v4-version-page">
    <section class="v4-page-header">
      <div>
        <div class="v4-eyebrow">V4 Resume Version</div>
        <h1>Resume versions</h1>
        <p>Create snapshots, copy versions, compare version pairs, roll back, and apply AI suggestions.</p>
      </div>
      <div class="v4-actions">
        <el-input-number v-model="resumeId" :min="1" controls-position="right" />
        <el-button :loading="loading" @click="load">Load</el-button>
        <el-button type="primary" :loading="saving" @click="create">Create version</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="Resume versions failed to load" :description="errorMessage">
      <el-button type="primary" @click="load">Retry</el-button>
    </AppState>

    <template v-else>
      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">Versions</p>
              <h2>Version list</h2>
            </div>
          </div>
          <div class="v4-list" v-loading="loading">
            <article v-for="item in versions" :key="item.id" class="v4-row">
              <div class="v4-row-head">
                <div>
                  <strong>V{{ item.versionNo ?? '--' }} · {{ item.versionName || `Version #${item.id}` }}</strong>
                  <p class="muted">{{ item.sourceType || '--' }} · {{ item.createdAt || '--' }}</p>
                </div>
                <div class="v4-actions">
                  <el-tag v-if="item.currentFlag" type="success">Current</el-tag>
                  <el-button link type="primary" @click="showCurrentDiff(item.id)">Diff current</el-button>
                  <el-button link type="primary" @click="openCopy(item)">Copy</el-button>
                  <el-button link type="success" @click="openSuggestion(item)">Apply suggestion</el-button>
                  <el-button link type="warning" @click="rollback(item.id)">Rollback</el-button>
                </div>
              </div>
            </article>
            <el-empty v-if="!versions.length && !loading" description="No versions. Enter a resume ID and create a snapshot." />
          </div>
        </div>
      </section>

      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">Pair diff</p>
              <h2>Compare two versions</h2>
            </div>
          </div>
          <div class="pair-diff-bar">
            <el-select v-model="sourceVersionId" clearable placeholder="Source version" style="width: 220px">
              <el-option v-for="item in versions" :key="item.id" :label="versionLabel(item)" :value="item.id" />
            </el-select>
            <el-select v-model="targetVersionId" clearable placeholder="Target version" style="width: 220px">
              <el-option v-for="item in versions" :key="item.id" :label="versionLabel(item)" :value="item.id" />
            </el-select>
            <el-button type="primary" :disabled="!sourceVersionId || !targetVersionId" @click="showPairDiff">Compare</el-button>
          </div>
        </div>
      </section>
    </template>

    <el-dialog v-model="diffVisible" title="Version diff" width="820px">
      <div class="diff-grid">
        <div class="diff-row diff-row--head">
          <strong>Field</strong>
          <strong>{{ diff?.sourceLabel || 'Current/source' }}</strong>
          <strong>{{ diff?.targetLabel || 'Version/target' }}</strong>
        </div>
        <div v-for="field in diff?.fields || []" :key="field.field" class="diff-row" :class="{ changed: field.changed }">
          <strong>{{ field.field }}</strong>
          <span>{{ formatValue(field.sourceValue ?? field.currentValue) }}</span>
          <span>{{ formatValue(field.targetValue ?? field.versionValue) }}</span>
        </div>
        <el-empty v-if="!(diff?.fields || []).length" description="No diff fields" />
      </div>
    </el-dialog>

    <el-dialog v-model="copyVisible" title="Copy version" width="460px">
      <el-form label-position="top">
        <el-form-item label="Version name">
          <el-input v-model.trim="copyName" maxlength="80" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="copyVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="copyVersion">Copy</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="suggestionVisible" title="Apply AI suggestion" width="520px">
      <el-form label-position="top">
        <el-form-item label="Optimize record ID">
          <el-input-number v-model="suggestionForm.optimizeRecordId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="Suggestion type">
          <el-input v-model.trim="suggestionForm.suggestionType" placeholder="PROJECT_DEPTH / KEYWORD / CUSTOM" />
        </el-form-item>
        <el-form-item label="Status">
          <el-select v-model="suggestionForm.status" style="width: 100%">
            <el-option label="APPLIED" value="APPLIED" />
            <el-option label="REJECTED" value="REJECTED" />
            <el-option label="PARTIAL" value="PARTIAL" />
          </el-select>
        </el-form-item>
        <el-form-item label="Note">
          <el-input v-model="suggestionForm.note" type="textarea" :rows="3" maxlength="300" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="suggestionVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="applySuggestion">Apply</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

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

const route = useRoute()
const initialResumeId = Number(route.params.id || 1)
const resumeId = ref<number>(Number.isFinite(initialResumeId) && initialResumeId > 0 ? initialResumeId : 1)
const loading = ref(false)
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
    return String((error as { message?: unknown }).message || 'API request failed')
  }
  return 'API request failed'
}

const versionLabel = (item: ResumeVersionVO) =>
  `V${item.versionNo ?? '--'} · ${item.versionName || `#${item.id}`}`

const formatValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '--'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    versions.value = await getResumeVersionsApi(resumeId.value)
  } catch (error) {
    versions.value = []
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const create = async () => {
  saving.value = true
  try {
    await createResumeVersionApi(resumeId.value, { versionName: `V${versions.value.length + 1}` })
    ElMessage.success('Version created')
    await load()
  } finally {
    saving.value = false
  }
}

const openCopy = (item: ResumeVersionVO) => {
  copySource.value = item
  copyName.value = `${item.versionName || `V${item.versionNo ?? item.id}`} copy`
  copyVisible.value = true
}

const copyVersion = async () => {
  if (!copySource.value) return
  saving.value = true
  try {
    await copyResumeVersionApi(resumeId.value, copySource.value.id, { versionName: copyName.value || undefined })
    copyVisible.value = false
    ElMessage.success('Version copied')
    await load()
  } finally {
    saving.value = false
  }
}

const showCurrentDiff = async (versionId: number) => {
  diff.value = await getResumeVersionDiffApi(resumeId.value, versionId)
  diffVisible.value = true
}

const showPairDiff = async () => {
  if (!sourceVersionId.value || !targetVersionId.value) return
  diff.value = await getResumeVersionsPairDiffApi(sourceVersionId.value, targetVersionId.value)
  diffVisible.value = true
}

const rollback = async (versionId: number) => {
  await ElMessageBox.confirm('Confirm rollback to this version?', 'Rollback confirmation', { type: 'warning' })
  await rollbackResumeVersionApi(resumeId.value, versionId)
  ElMessage.success('Version rolled back')
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
    ElMessage.success('Suggestion adoption saved')
  } finally {
    saving.value = false
  }
}

onMounted(load)
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
