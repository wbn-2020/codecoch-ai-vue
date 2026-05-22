<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">Prompt Regression</div>
        <h1 class="admin-hero__title">Prompt regression tests</h1>
        <p class="admin-hero__desc">Load fixed regression cases and results, then trigger a backend regression run for a case and prompt version.</p>
      </div>
      <div class="admin-hero__actions">
        <el-button v-permission="'admin:agent:prompt-regression:write'" type="primary" @click="openCaseDialog()">New case</el-button>
        <el-button v-permission="'admin:agent:prompt-regression:run'" type="primary" @click="runDialogVisible = true">Run case</el-button>
        <el-button :loading="loading" @click="loadPage">Refresh</el-button>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="Prompt type">
            <el-input v-model.trim="query.promptType" clearable placeholder="JOB_COACH_DAILY_PLAN" style="width: 240px" />
          </el-form-item>
          <el-form-item label="Enabled">
            <el-select v-model="query.enabled" clearable placeholder="All" style="width: 120px">
              <el-option label="Enabled" :value="1" />
              <el-option label="Disabled" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">Search</el-button>
            <el-button @click="handleReset">Reset</el-button>
          </el-form-item>
        </el-form>
      </div>

      <AppState v-if="errorMessage" type="error" title="Prompt regression data failed to load" :description="errorMessage">
        <el-button type="primary" @click="loadPage">Retry</el-button>
      </AppState>

      <el-tabs v-else v-model="activeTab" class="regression-tabs">
        <el-tab-pane label="Cases" name="cases">
          <div class="table-card admin-table-card">
            <el-table v-loading="loading" :data="cases" row-key="id">
              <el-table-column prop="caseName" label="Case" min-width="220" show-overflow-tooltip />
              <el-table-column prop="promptType" label="Prompt type" min-width="220" show-overflow-tooltip />
              <el-table-column label="Enabled" width="110">
                <template #default="{ row }"><StatusTag :status="row.enabled" /></template>
              </el-table-column>
              <el-table-column label="Input" min-width="180">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openJsonDetail('Input JSON', row.inputJson)">View</el-button>
                </template>
              </el-table-column>
              <el-table-column label="Expected schema" min-width="180">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openJsonDetail('Expected schema JSON', row.expectedSchemaJson)">View</el-button>
                </template>
              </el-table-column>
              <el-table-column label="Updated" width="180">
                <template #default="{ row }">{{ row.updatedAt || '--' }}</template>
              </el-table-column>
              <el-table-column label="Action" width="230" fixed="right">
                <template #default="{ row }">
                  <el-button v-permission="'admin:agent:prompt-regression:write'" link type="primary" @click="openCaseDialog(row)">Edit</el-button>
                  <el-button link type="primary" @click="viewCaseResults(row.id)">Results</el-button>
                  <el-button v-permission="'admin:agent:prompt-regression:run'" link type="primary" @click="openRun(row.id)">Run</el-button>
                </template>
              </el-table-column>
              <template #empty>
                <el-empty description="No regression cases" />
              </template>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="Results" name="results">
          <div class="table-card admin-table-card">
            <el-table v-loading="loading" :data="results" row-key="id">
              <el-table-column prop="caseId" label="Case ID" width="110" />
              <el-table-column prop="promptVersionId" label="Version ID" width="120" />
              <el-table-column label="Status" width="120">
                <template #default="{ row }"><StatusTag :status="row.status" /></template>
              </el-table-column>
              <el-table-column prop="score" label="Score" width="100" />
              <el-table-column prop="errorMessage" label="Error" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">{{ row.errorMessage || '--' }}</template>
              </el-table-column>
              <el-table-column label="Output" min-width="160">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openJsonDetail('Regression output JSON', row.outputJson)">View</el-button>
                </template>
              </el-table-column>
              <el-table-column prop="createdAt" label="Created" width="180" />
              <template #empty>
                <el-empty description="No regression results" />
              </template>
            </el-table>
          </div>
          <div v-if="resultCaseId" class="result-filter-note">
            Showing results for case #{{ resultCaseId }}
            <el-button link type="primary" @click="clearResultFilter">Show all</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>

    <el-dialog v-model="runDialogVisible" title="Run prompt regression" width="460px">
      <el-form label-position="top">
        <el-form-item label="Case ID">
          <el-input-number v-model="runForm.caseId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="Prompt version ID">
          <el-input-number v-model="runForm.promptVersionId" :min="1" controls-position="right" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="runDialogVisible = false">Cancel</el-button>
        <el-button v-permission="'admin:agent:prompt-regression:run'" type="primary" :loading="running" @click="runRegression">Run</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="caseDialogVisible" :title="caseForm.id ? 'Edit regression case' : 'New regression case'" width="760px">
      <el-form :model="caseForm" label-position="top">
        <div class="form-grid">
          <el-form-item label="Case name" required>
            <el-input v-model.trim="caseForm.caseName" placeholder="Daily plan schema check" />
          </el-form-item>
          <el-form-item label="Prompt type" required>
            <el-input v-model.trim="caseForm.promptType" placeholder="JOB_COACH_DAILY_PLAN" />
          </el-form-item>
        </div>
        <el-form-item label="Input JSON" required>
          <el-input v-model="caseForm.inputJson" type="textarea" :rows="8" placeholder="{...}" />
        </el-form-item>
        <el-form-item label="Expected schema JSON" required>
          <el-input v-model="caseForm.expectedSchemaJson" type="textarea" :rows="8" placeholder="{...}" />
        </el-form-item>
        <el-form-item label="Enabled">
          <el-switch v-model="caseEnabled" active-text="Enabled" inactive-text="Disabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="caseDialogVisible = false">Cancel</el-button>
        <el-button v-permission="'admin:agent:prompt-regression:write'" type="primary" :loading="savingCase" @click="saveCase">Save</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="jsonDialogVisible" :title="jsonDialogTitle" width="720px">
      <pre class="json-preview">{{ jsonDialogContent || '--' }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  createPromptRegressionCaseApi,
  getPromptRegressionCasesApi,
  getPromptRegressionResultsApi,
  runPromptRegressionApi,
  updatePromptRegressionCaseApi
} from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { PromptRegressionCaseVO, PromptRegressionQuery, PromptRegressionResultVO } from '@/types/analytics'

const loading = ref(false)
const running = ref(false)
const errorMessage = ref('')
const activeTab = ref('cases')
const cases = ref<PromptRegressionCaseVO[]>([])
const results = ref<PromptRegressionResultVO[]>([])
const resultCaseId = ref<number>()
const runDialogVisible = ref(false)
const caseDialogVisible = ref(false)
const savingCase = ref(false)
const jsonDialogVisible = ref(false)
const jsonDialogTitle = ref('')
const jsonDialogContent = ref('')

const query = reactive<PromptRegressionQuery>({
  pageNo: 1,
  pageSize: 20,
  promptType: '',
  enabled: ''
})

const runForm = reactive({
  caseId: undefined as number | undefined,
  promptVersionId: undefined as number | undefined
})

const caseForm = reactive({
  id: undefined as number | undefined,
  caseName: '',
  promptType: '',
  inputJson: '',
  expectedSchemaJson: '',
  enabled: 1
})

const caseEnabled = computed({
  get: () => caseForm.enabled === 1,
  set: (value: boolean) => {
    caseForm.enabled = value ? 1 : 0
  }
})

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'API request failed')
  }
  return 'API request failed'
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const [casePage, resultPage] = await Promise.all([
      getPromptRegressionCasesApi(query),
      getPromptRegressionResultsApi({ pageNo: 1, pageSize: 20, caseId: resultCaseId.value })
    ])
    cases.value = casePage.records || []
    results.value = resultPage.records || []
  } catch (error) {
    cases.value = []
    results.value = []
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  loadPage()
}

const handleReset = () => {
  Object.assign(query, {
    pageNo: 1,
    pageSize: 20,
    promptType: '',
    enabled: ''
  })
  loadPage()
}

const openRun = (caseId: number) => {
  runForm.caseId = caseId
  runForm.promptVersionId = undefined
  runDialogVisible.value = true
}

const viewCaseResults = async (caseId: number) => {
  resultCaseId.value = caseId
  activeTab.value = 'results'
  await loadPage()
}

const clearResultFilter = async () => {
  resultCaseId.value = undefined
  await loadPage()
}

const openCaseDialog = (row?: PromptRegressionCaseVO) => {
  Object.assign(caseForm, {
    id: row?.id,
    caseName: row?.caseName || '',
    promptType: row?.promptType || '',
    inputJson: row?.inputJson || '',
    expectedSchemaJson: row?.expectedSchemaJson || '',
    enabled: row?.enabled ?? 1
  })
  caseDialogVisible.value = true
}

const openJsonDetail = (title: string, content?: string) => {
  jsonDialogTitle.value = title
  jsonDialogContent.value = content || ''
  jsonDialogVisible.value = true
}

const validateJson = (value: string, label: string) => {
  if (!value.trim()) {
    ElMessage.warning(`${label} is required`)
    return false
  }
  try {
    JSON.parse(value)
    return true
  } catch {
    ElMessage.warning(`${label} must be valid JSON`)
    return false
  }
}

const saveCase = async () => {
  if (!caseForm.caseName.trim() || !caseForm.promptType.trim()) {
    ElMessage.warning('Case name and prompt type are required')
    return
  }
  if (!validateJson(caseForm.inputJson, 'Input JSON') || !validateJson(caseForm.expectedSchemaJson, 'Expected schema JSON')) {
    return
  }
  savingCase.value = true
  try {
    const payload = {
      caseName: caseForm.caseName.trim(),
      promptType: caseForm.promptType.trim(),
      inputJson: caseForm.inputJson,
      expectedSchemaJson: caseForm.expectedSchemaJson,
      enabled: caseForm.enabled
    }
    if (caseForm.id) {
      await updatePromptRegressionCaseApi(caseForm.id, payload)
    } else {
      await createPromptRegressionCaseApi(payload)
    }
    ElMessage.success('Regression case saved')
    caseDialogVisible.value = false
    await loadPage()
  } finally {
    savingCase.value = false
  }
}

const runRegression = async () => {
  if (!runForm.caseId || !runForm.promptVersionId) {
    ElMessage.warning('Case ID and prompt version ID are required')
    return
  }
  running.value = true
  try {
    await runPromptRegressionApi({
      caseId: runForm.caseId,
      promptVersionId: runForm.promptVersionId
    })
    runDialogVisible.value = false
    ElMessage.success('Regression run requested')
    activeTab.value = 'results'
    await loadPage()
  } finally {
    running.value = false
  }
}

onMounted(loadPage)
</script>

<style scoped lang="scss">
.regression-tabs {
  padding: 0 20px 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.json-preview {
  max-height: 520px;
  overflow: auto;
  margin: 0;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  color: #dbeafe;
  font-size: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.result-filter-note {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
