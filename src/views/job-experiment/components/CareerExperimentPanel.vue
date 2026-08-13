<template>
  <section class="career-experiment-panel">
    <div class="section-head">
      <div>
        <p class="section-kicker">实验设置</p>
        <h2>实验设置与归因</h2>
      </div>
      <el-button :loading="loading" @click="load">刷新</el-button>
    </div>

    <el-alert
      v-if="!hypothesisId"
      type="info"
      show-icon
      :closable="false"
      title="当前实验还没有关联实验方案"
      description="请从新版实验创建页建立实验方案；系统会使用后端持久关联自动加载。"
    />

    <el-alert
      v-else-if="errorMessage"
      type="error"
      show-icon
      :closable="false"
      title="实验设置加载失败"
      :description="errorMessage"
    />

    <template v-if="hypothesis">
      <div class="hypothesis-summary">
        <div>
          <strong>{{ hypothesis.name }}</strong>
          <p>{{ hypothesis.statement }}</p>
        </div>
        <div class="summary-tags">
          <el-tag effect="plain">{{ metricLabel(hypothesis.primaryMetric) }}</el-tag>
          <el-tag effect="plain">观察窗口 {{ hypothesis.attributionWindowDays }} 天</el-tag>
          <el-tag effect="plain">每组至少 {{ hypothesis.minSamplePerVariant }} 条</el-tag>
        </div>
      </div>

      <el-tabs v-model="activePanel">
        <el-tab-pane label="实验方案" name="settings">
          <div class="panel-content">
            <div class="variant-grid">
              <article v-for="variant in hypothesis.variants" :key="variant.id" class="variant-item">
                <div class="variant-head">
                  <el-tag :type="variant.control ? 'info' : 'primary'" effect="plain">
                    {{ variant.control ? '对照组' : '实验组' }}
                  </el-tag>
                  <strong>{{ variant.name }}</strong>
                </div>
                <p>{{ variant.description || '未填写变体说明' }}</p>
                <span>分配权重 {{ variant.allocationWeight }} · {{ variant.variantCode }}</span>
              </article>
            </div>

            <div v-if="mode === 'detail'" class="operation-block">
              <div class="block-head">
                <div>
                  <strong>投递分组</strong>
                  <p>从已有投递记录中选择，自动分组或指定实验组。</p>
                </div>
                <el-tag effect="plain">{{ assignments.length }} 条</el-tag>
              </div>
              <div class="inline-form">
                <el-select
                  v-model="assignmentForm.applicationId"
                  filterable
                  placeholder="选择投递记录"
                  class="wide-control"
                >
                  <el-option
                    v-for="application in applications"
                    :key="application.id"
                    :label="applicationLabel(application)"
                    :value="application.id"
                    :disabled="assignedApplicationIds.has(application.id)"
                  />
                </el-select>
                <el-select v-model="assignmentForm.variantId" clearable placeholder="自动分组">
                  <el-option
                    v-for="variant in hypothesis.variants"
                    :key="variant.id"
                    :label="variant.name"
                    :value="variant.id"
                  />
                </el-select>
                <el-button type="primary" :loading="assigning" @click="assignApplication">加入实验</el-button>
              </div>
              <p v-if="!applications.length && !loading" class="empty-note">暂无投递记录，请先在投递管理中创建真实业务记录。</p>
              <el-table v-if="assignments.length" :data="assignments" size="small">
                <el-table-column label="投递" min-width="210">
                  <template #default="{ row }">{{ assignmentApplicationLabel(row.applicationId) }}</template>
                </el-table-column>
                <el-table-column prop="variantCode" label="实验组" width="120" />
                <el-table-column prop="assignmentMethod" label="分配方式" width="120" />
                <el-table-column prop="jobFamily" label="岗位族" width="140" />
                <el-table-column prop="channel" label="渠道" width="120" />
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="归因结果" name="attribution">
          <div class="panel-content">
            <div class="block-head">
              <div>
                <strong>对比样本组</strong>
                <p>固定岗位族、渠道和时间窗口，减少样本结构变化带来的误判。</p>
              </div>
              <el-button type="primary" plain @click="cohortDialogVisible = true">新建样本组</el-button>
            </div>
            <div class="attribution-controls">
              <el-select v-model="selectedCohortId" placeholder="选择样本组" class="cohort-select">
                <el-option
                  v-for="cohort in cohorts"
                  :key="cohort.id"
                  :label="cohortLabel(cohort)"
                  :value="cohort.id"
                />
              </el-select>
              <el-button
                type="primary"
                :loading="calculating"
                :disabled="!selectedCohortId"
                @click="calculateAttribution"
              >
                计算对比结果
              </el-button>
            </div>

            <el-alert
              v-if="!cohorts.length"
              type="info"
              :closable="false"
              title="暂无对比样本组"
              description="先创建样本组，再计算可比较的结果。计算快照会保存在后端，刷新后仍可查看。"
            />

            <template v-if="attribution">
              <div class="attribution-summary" :class="`is-${presentation.level.toLowerCase()}`">
                <div>
                  <strong>{{ presentation.title }}</strong>
                  <p>{{ presentation.summary }}</p>
                </div>
                <el-tag :type="attribution.comparable ? 'warning' : 'info'" effect="plain">
                  {{ attribution.comparable ? '弱观察' : '暂不可比较' }}
                </el-tag>
              </div>
              <ul class="fact-list">
                <li v-for="fact in presentation.facts" :key="fact">{{ fact }}</li>
              </ul>
              <el-alert
                v-for="caution in presentation.cautions"
                :key="caution"
                class="caution-alert"
                type="warning"
                :closable="false"
                :title="caution"
              />
              <el-table :data="attribution.variants" size="small">
                <el-table-column prop="variantCode" label="实验组" min-width="110" />
                <el-table-column label="角色" width="90">
                  <template #default="{ row }">{{ row.control ? '对照组' : '实验组' }}</template>
                </el-table-column>
                <el-table-column prop="assignedCount" label="分配" width="76" />
                <el-table-column prop="matureCount" label="成熟" width="76" />
                <el-table-column prop="outcomeCount" label="目标结果" width="90" />
                <el-table-column label="原始率" width="90">
                  <template #default="{ row }">{{ rateText(row.rawRate) }}</template>
                </el-table-column>
                <el-table-column label="校正率" width="90">
                  <template #default="{ row }">{{ rateText(row.adjustedRate) }}</template>
                </el-table-column>
                <el-table-column label="相对对照" min-width="100">
                  <template #default="{ row }">{{ liftText(row.adjustedLiftVsControl) }}</template>
                </el-table-column>
              </el-table>
            </template>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>

    <el-dialog v-model="cohortDialogVisible" title="新建对比样本组" width="620px">
      <el-form label-position="top">
        <el-form-item label="名称">
          <el-input v-model.trim="cohortForm.name" maxlength="80" />
        </el-form-item>
        <div class="two-column">
          <el-form-item label="岗位族">
            <el-input v-model.trim="cohortForm.jobFamily" placeholder="例如 Java 后端" />
          </el-form-item>
          <el-form-item label="渠道">
            <el-input v-model.trim="cohortForm.channel" placeholder="例如 BOSS / 内推" />
          </el-form-item>
        </div>
        <div class="two-column">
          <el-form-item label="窗口开始">
            <el-date-picker v-model="cohortForm.windowStart" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" />
          </el-form-item>
          <el-form-item label="窗口结束">
            <el-date-picker v-model="cohortForm.windowEnd" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" />
          </el-form-item>
        </div>
        <div class="two-column">
          <el-form-item label="目标结果">
            <el-select v-model="cohortForm.outcomeType">
              <el-option label="收到正向回复" value="POSITIVE_RESPONSE" />
              <el-option label="面试邀约" value="INTERVIEW" />
              <el-option label="Offer" value="OFFER" />
            </el-select>
          </el-form-item>
          <el-form-item label="每组最小样本">
            <el-input-number v-model="cohortForm.minSamplePerVariant" :min="2" :max="100" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="cohortDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creatingCohort" @click="createCohort">创建</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

import {
  assignCareerApplicationApi,
  calculateCareerAttributionApi,
  createCareerCohortApi,
  getCareerAssignmentsApi,
  getCareerCohortsApi,
  getCareerHypothesisByLegacyExperimentApi,
  getCareerHypothesisApi,
  getLatestCareerAttributionApi
} from '@/api/careerGrowth'
import { getApplicationsApi, type JobApplicationVO } from '@/api/v4'
import {
  buildAttributionPresentation,
  resolveRouteHypothesisId,
  resolveStoredExperimentHypothesisId
} from '@/features/career-growth'
import type {
  CareerExperimentAssignmentVO,
  CareerExperimentAttributionVO,
  CareerExperimentCohortCreate,
  CareerExperimentCohortVO,
  CareerExperimentHypothesisVO
} from '@/types/careerGrowth'

const props = defineProps<{
  legacyExperimentId: number
  mode?: 'detail' | 'review'
}>()

const route = useRoute()
const loading = ref(false)
const assigning = ref(false)
const calculating = ref(false)
const creatingCohort = ref(false)
const errorMessage = ref('')
const activePanel = ref('settings')
const hypothesisId = ref<number>()
const hypothesis = ref<CareerExperimentHypothesisVO>()
const assignments = ref<CareerExperimentAssignmentVO[]>([])
const cohorts = ref<CareerExperimentCohortVO[]>([])
const attribution = ref<CareerExperimentAttributionVO>()
const applications = ref<JobApplicationVO[]>([])
const selectedCohortId = ref<number>()
const cohortDialogVisible = ref(false)

const assignmentForm = reactive<{ applicationId?: number; variantId?: number }>({})
const cohortForm = reactive<CareerExperimentCohortCreate>({
  name: '',
  jobFamily: '',
  channel: '',
  windowStart: '',
  windowEnd: '',
  outcomeType: 'INTERVIEW',
  minSamplePerVariant: 10
})

const mode = computed(() => props.mode || 'detail')
const assignedApplicationIds = computed(() =>
  new Set(assignments.value.map((item) => item.applicationId))
)
const presentation = computed(() => buildAttributionPresentation(attribution.value))

const applicationLabel = (item: JobApplicationVO) =>
  `${item.companyName || '未填写公司'} · ${item.jobTitle || '未填写岗位'} · ${item.source || '未知渠道'}`

const assignmentApplicationLabel = (applicationId: number) => {
  const application = applications.value.find((item) => item.id === applicationId)
  return application ? applicationLabel(application) : `投递记录 #${applicationId}`
}

const metricLabel = (metric?: string) => ({
  POSITIVE_RESPONSE: '目标：收到正向回复',
  INTERVIEW: '目标：面试邀约',
  OFFER: '目标：Offer'
}[String(metric || '').toUpperCase()] || `目标：${metric || '未设置'}`)

const cohortLabel = (cohort: CareerExperimentCohortVO) => {
  const strata = [cohort.jobFamily, cohort.channel].filter(Boolean).join(' / ')
  return `${cohort.name}${strata ? ` · ${strata}` : ''}`
}

const rateText = (value?: number) =>
  value == null ? '--' : `${(value * 100).toFixed(1)}%`

const liftText = (value?: number) => {
  if (value == null) return '--'
  const percent = value * 100
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const routeHypothesisId = resolveRouteHypothesisId(route.query.hypothesisId)
    const storedHypothesisId = resolveStoredExperimentHypothesisId(props.legacyExperimentId)
    const linkedHypothesis = routeHypothesisId
      ? await getCareerHypothesisApi(routeHypothesisId)
      : await getCareerHypothesisByLegacyExperimentApi(props.legacyExperimentId)
        .catch(async () => storedHypothesisId ? getCareerHypothesisApi(storedHypothesisId) : undefined)
    if (!linkedHypothesis) {
      hypothesisId.value = undefined
      hypothesis.value = undefined
      assignments.value = []
      cohorts.value = []
      attribution.value = undefined
      applications.value = await getApplicationsApi().catch(() => [])
      return
    }
    hypothesisId.value = linkedHypothesis.id
    const [hypothesisResult, assignmentResult, cohortResult, applicationResult] = await Promise.all([
      Promise.resolve(linkedHypothesis),
      getCareerAssignmentsApi(linkedHypothesis.id),
      getCareerCohortsApi(linkedHypothesis.id),
      getApplicationsApi()
    ])
    hypothesis.value = hypothesisResult
    assignments.value = assignmentResult
    cohorts.value = cohortResult
    applications.value = applicationResult || []
    if (!selectedCohortId.value && cohorts.value.length) {
      selectedCohortId.value = cohorts.value[0].id
    }
    attribution.value = selectedCohortId.value
      ? await getLatestCareerAttributionApi(selectedCohortId.value).catch(() => undefined)
      : undefined
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '实验 v2 数据加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

const assignApplication = async () => {
  if (!hypothesisId.value || !assignmentForm.applicationId || assigning.value) {
    if (!assignmentForm.applicationId) ElMessage.warning('请选择一条投递记录。')
    return
  }
  if (assignedApplicationIds.value.has(assignmentForm.applicationId)) {
    ElMessage.info('该投递已加入当前实验，无需重复操作。')
    return
  }
  const application = applications.value.find((item) => item.id === assignmentForm.applicationId)
  assigning.value = true
  try {
    await assignCareerApplicationApi(hypothesisId.value, {
      applicationId: assignmentForm.applicationId,
      variantId: assignmentForm.variantId,
      assignmentKey: `application:${assignmentForm.applicationId}`,
      jobFamily: application?.jobTitle,
      channel: application?.source
    })
    assignmentForm.applicationId = undefined
    assignmentForm.variantId = undefined
    assignments.value = await getCareerAssignmentsApi(hypothesisId.value)
    ElMessage.success('投递已加入实验分组。')
  } finally {
    assigning.value = false
  }
}

const createCohort = async () => {
  if (!hypothesisId.value || creatingCohort.value) return
  if (!cohortForm.name.trim() || !cohortForm.windowStart || !cohortForm.windowEnd) {
    ElMessage.warning('请填写 cohort 名称和完整时间窗口。')
    return
  }
  if (new Date(cohortForm.windowStart) >= new Date(cohortForm.windowEnd)) {
    ElMessage.warning('窗口结束时间必须晚于开始时间。')
    return
  }
  creatingCohort.value = true
  try {
    const created = await createCareerCohortApi(hypothesisId.value, {
      ...cohortForm,
      jobFamily: cohortForm.jobFamily?.trim() || undefined,
      channel: cohortForm.channel?.trim() || undefined
    })
    cohorts.value = await getCareerCohortsApi(hypothesisId.value)
    selectedCohortId.value = created.id
    cohortDialogVisible.value = false
    ElMessage.success('归因 cohort 已创建。')
  } finally {
    creatingCohort.value = false
  }
}

const calculateAttribution = async () => {
  if (!selectedCohortId.value || calculating.value) return
  calculating.value = true
  try {
    attribution.value = await calculateCareerAttributionApi(selectedCohortId.value)
  } finally {
    calculating.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.career-experiment-panel {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
}

.section-head,
.block-head,
.hypothesis-summary,
.attribution-summary,
.inline-form,
.inline-actions,
.summary-tags,
.variant-item > div {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-head,
.block-head,
.hypothesis-summary,
.attribution-summary {
  justify-content: space-between;
}

.section-head h2,
.section-head p,
.block-head p,
.hypothesis-summary p,
.attribution-summary p,
.variant-item p {
  margin: 0;
}

.section-kicker {
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.hypothesis-summary,
.attribution-summary,
.operation-block {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: var(--arena-radius-card, 16px);
}

.variant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.variant-item {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: var(--arena-radius-card, 16px);
  background: var(--app-surface-muted, rgba(15, 23, 42, 0.035));
}

.variant-item p,
.variant-item span,
.block-head p {
  color: var(--app-text-secondary);
  font-size: 13px;
}

.operation-band,
.attribution-band {
  display: grid;
  gap: 14px;
}

.inline-form {
  margin: 14px 0;
  flex-wrap: wrap;
}

.wide-control {
  min-width: min(360px, 100%);
  flex: 1;
}

.cohort-select {
  width: 280px;
}

.empty-note {
  color: var(--app-text-secondary);
}

.fact-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin: 0;
  padding-left: 20px;
}

.caution-alert + .caution-alert {
  margin-top: 8px;
}

.two-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 760px) {
  .section-head,
  .block-head,
  .hypothesis-summary,
  .attribution-summary,
  .inline-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .cohort-select,
  .wide-control {
    width: 100%;
    min-width: 0;
  }

  .two-column {
    grid-template-columns: 1fr;
  }
}
</style>
