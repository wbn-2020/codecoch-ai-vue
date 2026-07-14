<template>
  <div class="job-experiment-create page-shell">
    <section class="form-section">
      <div class="card-title">
        <div>
          <p class="section-kicker">JOB SEARCH EXPERIMENT</p>
          <h1>{{ isEdit ? '编辑求职实验' : '新建求职实验' }}</h1>
        </div>
        <el-tag type="info" effect="plain">证据化实验 v2</el-tag>
      </div>

      <el-alert
        v-if="isEdit && linkedHypothesis"
        type="info"
        show-icon
        :closable="false"
        title="已关联 v2 hypothesis"
        description="本页会更新旧实验基础信息；假设、变体和样本门槛请在实验详情页按生命周期调整。"
      />

      <el-form label-position="top">
        <div class="two-column">
          <el-form-item label="实验名称">
            <el-input v-model.trim="form.title" maxlength="128" show-word-limit />
          </el-form-item>
          <el-form-item label="目标方向">
            <el-input v-model.trim="form.targetDirection" placeholder="例如 Java 后端 / AI 应用工程" />
          </el-form-item>
        </div>
        <el-form-item label="实验目标">
          <el-input v-model.trim="form.goal" type="textarea" :rows="3" maxlength="512" show-word-limit />
        </el-form-item>
        <div class="three-column">
          <el-form-item label="开始日期">
            <el-date-picker v-model="form.startDate" value-format="YYYY-MM-DD" type="date" />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker v-model="form.endDate" value-format="YYYY-MM-DD" type="date" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="form.status">
              <el-option label="草稿" value="DRAFT" />
              <el-option label="进行中" value="RUNNING" />
              <el-option label="已复盘" value="REVIEWED" />
              <el-option label="已归档" value="ARCHIVED" />
            </el-select>
          </el-form-item>
        </div>
      </el-form>
    </section>

    <section class="form-section" :class="{ 'is-readonly': isEdit && Boolean(linkedHypothesis) }">
      <div class="section-head">
        <div>
          <p class="section-kicker">HYPOTHESIS</p>
          <h2>可证伪假设与评价边界</h2>
        </div>
        <el-tag effect="plain">不宣称因果</el-tag>
      </div>

      <el-form label-position="top" :disabled="isEdit && Boolean(linkedHypothesis)">
        <el-form-item label="假设陈述">
          <el-input
            v-model.trim="hypothesisForm.statement"
            type="textarea"
            :rows="3"
            maxlength="600"
            show-word-limit
            placeholder="例如：在同岗位族、同渠道和相近时间窗口内，突出性能优化证据的简历可能提高面试邀约率。"
          />
        </el-form-item>
        <div class="three-column">
          <el-form-item label="目标指标">
            <el-select v-model="hypothesisForm.primaryMetric">
              <el-option label="收到正向回复" value="POSITIVE_RESPONSE" />
              <el-option label="面试邀约" value="INTERVIEW" />
              <el-option label="Offer" value="OFFER" />
            </el-select>
          </el-form-item>
          <el-form-item label="归因窗口（天）">
            <el-input-number v-model="hypothesisForm.attributionWindowDays" :min="1" :max="90" />
          </el-form-item>
          <el-form-item label="每个变体最小样本">
            <el-input-number v-model="hypothesisForm.minSamplePerVariant" :min="2" :max="100" />
          </el-form-item>
        </div>
        <el-form-item label="控制变量">
          <el-input
            v-model="controlVariablesText"
            type="textarea"
            :rows="3"
            placeholder="每行一个，例如：岗位族一致、渠道一致、投递周次相近、工作年限区间一致"
          />
        </el-form-item>
      </el-form>
    </section>

    <section class="form-section" :class="{ 'is-readonly': isEdit && Boolean(linkedHypothesis) }">
      <div class="section-head">
        <div>
          <p class="section-kicker">BUSINESS OBJECTS</p>
          <h2>选择实验上下文</h2>
        </div>
        <el-tag effect="plain">使用已有业务对象</el-tag>
      </div>

      <div class="two-column">
        <el-form label-position="top" :disabled="isEdit && Boolean(linkedHypothesis)">
          <el-form-item label="目标岗位">
            <el-select v-model="selectedTargetJobIds" multiple filterable placeholder="选择目标岗位">
              <el-option
                v-for="target in targetJobs"
                :key="target.id"
                :value="target.id"
                :label="`${target.companyName || '未填写公司'} · ${target.jobTitle}`"
              />
            </el-select>
          </el-form-item>
        </el-form>
        <el-form label-position="top" :disabled="isEdit && Boolean(linkedHypothesis)">
          <el-form-item label="候选简历">
            <el-select v-model="selectedResumeIds" multiple filterable placeholder="选择简历">
              <el-option
                v-for="resume in resumes"
                :key="resume.id"
                :value="resume.id"
                :label="`${resume.resumeName} · ${resume.targetPosition || '未填写方向'}`"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <el-form label-position="top" :disabled="isEdit && Boolean(linkedHypothesis)">
        <el-form-item label="首批投递样本">
          <el-select v-model="selectedApplicationIds" multiple filterable placeholder="可选，创建后立即稳定分组">
            <el-option
              v-for="application in applications"
              :key="application.id"
              :value="application.id"
              :label="applicationLabel(application)"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <el-alert
        v-if="!loadingOptions && (!targetJobs.length || !resumes.length || !applications.length)"
        type="info"
        :closable="false"
        title="部分业务对象为空"
        description="可以先保存实验；缺失的岗位、简历或投递记录后续可在对应页面补齐。"
      />
    </section>

    <section class="form-section" :class="{ 'is-readonly': isEdit && Boolean(linkedHypothesis) }">
      <div class="section-head">
        <div>
          <p class="section-kicker">VARIANTS</p>
          <h2>对照组与实验组</h2>
        </div>
        <el-button
          :disabled="isEdit && Boolean(linkedHypothesis)"
          @click="addVariant"
        >
          添加变体
        </el-button>
      </div>

      <div class="variant-list">
        <article v-for="(variant, index) in variants" :key="variant.localKey" class="variant-row">
          <div class="variant-head">
            <el-radio v-model="controlVariantIndex" :label="index" :disabled="isEdit && Boolean(linkedHypothesis)">
              设为对照组
            </el-radio>
            <el-button
              link
              type="danger"
              :disabled="variants.length <= 2 || isEdit && Boolean(linkedHypothesis)"
              @click="removeVariant(index)"
            >
              删除
            </el-button>
          </div>
          <div class="three-column">
            <el-form label-position="top" :disabled="isEdit && Boolean(linkedHypothesis)">
              <el-form-item label="变体名称">
                <el-input v-model.trim="variant.name" maxlength="80" />
              </el-form-item>
            </el-form>
            <el-form label-position="top" :disabled="isEdit && Boolean(linkedHypothesis)">
              <el-form-item label="变体代码">
                <el-input v-model.trim="variant.variantCode" maxlength="32" />
              </el-form-item>
            </el-form>
            <el-form label-position="top" :disabled="isEdit && Boolean(linkedHypothesis)">
              <el-form-item label="分配权重">
                <el-input-number v-model="variant.allocationWeight" :min="1" :max="1000" />
              </el-form-item>
            </el-form>
          </div>
          <el-form label-position="top" :disabled="isEdit && Boolean(linkedHypothesis)">
            <el-form-item label="处理差异">
              <el-input
                v-model.trim="variant.description"
                type="textarea"
                :rows="2"
                maxlength="300"
                show-word-limit
                placeholder="只描述这一组相对对照组改变了什么。"
              />
            </el-form-item>
          </el-form>
        </article>
      </div>
    </section>

    <div class="actions">
      <el-button @click="router.push('/job-experiments')">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">
        {{ isEdit ? '保存基础信息' : '创建实验' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import {
  assignCareerApplicationApi,
  createCareerHypothesisApi,
  getCareerHypothesisByLegacyExperimentApi,
  getCareerHypothesisApi
} from '@/api/careerGrowth'
import { createJobExperimentApi, getJobExperimentDetailApi, updateJobExperimentApi } from '@/api/jobExperiment'
import { getJobTargetsApi } from '@/api/jobTarget'
import { getResumesApi } from '@/api/resume'
import { getApplicationsApi, type JobApplicationVO } from '@/api/v4'
import {
  resolveRouteHypothesisId,
  resolveStoredExperimentHypothesisId,
  saveExperimentHypothesisLink
} from '@/features/career-growth'
import type {
  CareerExperimentHypothesisVO,
  ExperimentPrimaryMetric
} from '@/types/careerGrowth'
import type { JobSearchExperimentSaveDTO } from '@/types/jobExperiment'
import type { TargetJobVO } from '@/types/jobTarget'
import type { ResumeVO } from '@/types/resume'

interface EditableVariant {
  localKey: string
  variantCode: string
  name: string
  description: string
  allocationWeight: number
}

const route = useRoute()
const router = useRouter()
const saving = ref(false)
const loadingOptions = ref(false)
const experimentId = computed(() => Number(route.params.id || 0))
const isEdit = computed(() => experimentId.value > 0)
const linkedHypothesis = ref<CareerExperimentHypothesisVO>()
const controlVariablesText = ref('岗位族一致\n渠道一致\n投递时间窗口相近')
const selectedTargetJobIds = ref<number[]>([])
const selectedResumeIds = ref<number[]>([])
const selectedApplicationIds = ref<number[]>([])
const targetJobs = ref<TargetJobVO[]>([])
const resumes = ref<ResumeVO[]>([])
const applications = ref<JobApplicationVO[]>([])
const controlVariantIndex = ref(0)
const variants = ref<EditableVariant[]>([
  {
    localKey: 'control',
    variantCode: 'CONTROL',
    name: '当前策略',
    description: '保持当前简历与投递策略，作为对照基线。',
    allocationWeight: 1
  },
  {
    localKey: 'treatment-a',
    variantCode: 'TREATMENT_A',
    name: '证据增强策略',
    description: '只改变目标证据的表达方式，其他控制变量保持一致。',
    allocationWeight: 1
  }
])

const form = reactive<JobSearchExperimentSaveDTO>({
  title: '',
  goal: '',
  targetDirection: '',
  status: 'RUNNING'
})

const hypothesisForm = reactive<{
  statement: string
  primaryMetric: ExperimentPrimaryMetric
  attributionWindowDays: number
  minSamplePerVariant: number
}>({
  statement: '',
  primaryMetric: 'INTERVIEW',
  attributionWindowDays: 14,
  minSamplePerVariant: 10
})

const applicationLabel = (item: JobApplicationVO) =>
  `${item.companyName || '未填写公司'} · ${item.jobTitle || '未填写岗位'} · ${item.source || '未知渠道'}`

const addVariant = () => {
  const suffix = variants.value.length + 1
  variants.value.push({
    localKey: `variant-${Date.now()}-${suffix}`,
    variantCode: `TREATMENT_${suffix}`,
    name: `实验组 ${suffix}`,
    description: '',
    allocationWeight: 1
  })
}

const removeVariant = (index: number) => {
  variants.value.splice(index, 1)
  if (controlVariantIndex.value === index) controlVariantIndex.value = 0
  if (controlVariantIndex.value > index) controlVariantIndex.value -= 1
}

const loadOptions = async () => {
  loadingOptions.value = true
  const [targetsResult, resumesResult, applicationsResult] = await Promise.allSettled([
    getJobTargetsApi({ pageSize: 200 }),
    getResumesApi({ pageSize: 200 }),
    getApplicationsApi()
  ])
  targetJobs.value = targetsResult.status === 'fulfilled' ? targetsResult.value : []
  resumes.value = resumesResult.status === 'fulfilled' ? resumesResult.value.records : []
  applications.value = applicationsResult.status === 'fulfilled' ? applicationsResult.value : []
  loadingOptions.value = false
}

const load = async () => {
  await loadOptions()
  if (!isEdit.value) return
  try {
    const detail = await getJobExperimentDetailApi(experimentId.value)
    Object.assign(form, {
      title: detail.title,
      goal: detail.goal,
      targetDirection: detail.targetDirection,
      startDate: detail.startDate,
      endDate: detail.endDate,
      status: detail.status
    })
    const routeHypothesisId = resolveRouteHypothesisId(route.query.hypothesisId)
    const storedHypothesisId = resolveStoredExperimentHypothesisId(experimentId.value)
    const loadedHypothesis = routeHypothesisId
      ? await getCareerHypothesisApi(routeHypothesisId)
      : await getCareerHypothesisByLegacyExperimentApi(experimentId.value)
        .catch(async (error) => {
          if (storedHypothesisId) return getCareerHypothesisApi(storedHypothesisId)
          throw error
        })
    if (loadedHypothesis) {
      linkedHypothesis.value = loadedHypothesis
      Object.assign(hypothesisForm, {
        statement: linkedHypothesis.value.statement,
        primaryMetric: linkedHypothesis.value.primaryMetric,
        attributionWindowDays: linkedHypothesis.value.attributionWindowDays,
        minSamplePerVariant: linkedHypothesis.value.minSamplePerVariant
      })
      variants.value = linkedHypothesis.value.variants.map((variant) => ({
        localKey: `persisted-${variant.id}`,
        variantCode: variant.variantCode,
        name: variant.name,
        description: variant.description || '',
        allocationWeight: variant.allocationWeight
      }))
      controlVariantIndex.value = Math.max(0, linkedHypothesis.value.variants.findIndex((item) => item.control))
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '求职实验加载失败，请返回列表后重试。')
  }
}

const validate = () => {
  if (!form.title?.trim()) return '请填写实验名称。'
  if (isEdit.value && linkedHypothesis.value) return ''
  if (!hypothesisForm.statement.trim()) return '请填写可证伪的假设陈述。'
  if (variants.value.length < 2) return '至少需要一个对照组和一个实验组。'
  if (variants.value.some((item) => !item.name.trim() || !item.variantCode.trim())) {
    return '请补齐所有变体名称和代码。'
  }
  const codes = variants.value.map((item) => item.variantCode.trim().toUpperCase())
  if (new Set(codes).size !== codes.length) return '变体代码不能重复。'
  return ''
}

const save = async () => {
  if (saving.value) return
  const validationMessage = validate()
  if (validationMessage) {
    ElMessage.warning(validationMessage)
    return
  }
  saving.value = true
  try {
    const detail = isEdit.value
      ? await updateJobExperimentApi(experimentId.value, form)
      : await createJobExperimentApi(form)
    if (linkedHypothesis.value) {
      ElMessage.success('基础信息已更新；v2 hypothesis 保持不变。')
      await router.push(`/job-experiments/${detail.id}`)
      return
    }

    let hypothesis: CareerExperimentHypothesisVO
    try {
      const controlVariables = controlVariablesText.value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
      hypothesis = await createCareerHypothesisApi({
        name: form.title.trim(),
        statement: hypothesisForm.statement.trim(),
        primaryMetric: hypothesisForm.primaryMetric,
        legacyExperimentId: detail.id,
        attributionWindowDays: hypothesisForm.attributionWindowDays,
        minSamplePerVariant: hypothesisForm.minSamplePerVariant,
        variants: variants.value.map((variant, index) => ({
          variantCode: variant.variantCode.trim().toUpperCase(),
          name: variant.name.trim(),
          description: variant.description.trim() || undefined,
          allocationWeight: variant.allocationWeight,
          control: index === controlVariantIndex.value,
          treatment: {
            controlVariables,
            targetJobIds: selectedTargetJobIds.value,
            resumeIds: selectedResumeIds.value
          }
        }))
      })
    } catch (error) {
      ElMessage.warning(
        `基础实验已${isEdit.value ? '更新' : '创建'}，但 v2 hypothesis 保存失败。`
        + '请稍后从实验详情重试或联系后端补充关联能力。'
      )
      await router.push(`/job-experiments/${detail.id}`)
      return
    }

    saveExperimentHypothesisLink(detail.id, hypothesis.id)
    const assignmentResults = await Promise.allSettled(
      selectedApplicationIds.value.map((applicationId) => {
        const application = applications.value.find((item) => item.id === applicationId)
        return assignCareerApplicationApi(hypothesis.id, {
          applicationId,
          assignmentKey: `application:${applicationId}`,
          jobFamily: application?.jobTitle,
          channel: application?.source
        })
      })
    )
    const failedAssignments = assignmentResults.filter((item) => item.status === 'rejected').length
    if (failedAssignments) {
      ElMessage.warning(`实验已创建，${failedAssignments} 条首批投递分组失败，可在详情页重试。`)
    } else {
      ElMessage.success('实验、假设和首批分组已创建。')
    }
    await router.push({
      path: `/job-experiments/${detail.id}`,
      query: { hypothesisId: String(hypothesis.id) }
    })
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '求职实验保存失败，请稍后重试。')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.job-experiment-create {
  display: grid;
  gap: 14px;
  max-width: none;
}

.form-section {
  padding: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
}

.form-section.is-readonly {
  background: var(--app-surface-muted, rgba(15, 23, 42, 0.035));
}

.card-title,
.section-head,
.actions,
.variant-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-title,
.section-head {
  margin-bottom: 18px;
}

.card-title h1,
.section-head h2,
.card-title p,
.section-head p {
  margin: 0;
}

.section-kicker {
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.two-column,
.three-column {
  display: grid;
  gap: 16px;
}

.two-column {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.three-column {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.variant-list {
  display: grid;
  gap: 14px;
}

.variant-row {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
}

.actions {
  justify-content: flex-end;
  padding-bottom: 24px;
}

:deep(.el-select),
:deep(.el-date-editor) {
  width: 100%;
}

@media (max-width: 760px) {
  .two-column,
  .three-column {
    grid-template-columns: 1fr;
  }

  .card-title,
  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
