<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">Prompt Regression</div>
        <h1 class="admin-hero__title">Prompt regression tests</h1>
        <p class="admin-hero__desc">Load fixed regression cases and results, then trigger a backend regression run for a case and prompt version.</p>
      </div>
      <div class="admin-hero__actions">
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
              <el-table-column prop="inputJson" label="Input" min-width="260" show-overflow-tooltip />
              <el-table-column prop="expectedSchemaJson" label="Expected schema" min-width="260" show-overflow-tooltip />
              <el-table-column label="Action" width="120" fixed="right">
                <template #default="{ row }">
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
              <el-table-column prop="errorMessage" label="Error" min-width="220" show-overflow-tooltip />
              <el-table-column prop="outputJson" label="Output" min-width="280" show-overflow-tooltip />
              <template #empty>
                <el-empty description="No regression results" />
              </template>
            </el-table>
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
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import {
  getPromptRegressionCasesApi,
  getPromptRegressionResultsApi,
  runPromptRegressionApi
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
const runDialogVisible = ref(false)

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
      getPromptRegressionResultsApi({ pageNo: 1, pageSize: 20, promptType: query.promptType })
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
</style>
