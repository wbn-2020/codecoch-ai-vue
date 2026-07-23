<template>
  <section v-if="enabled" class="campaign-panel" data-testid="v7-campaign-panel">
    <header class="campaign-panel__header">
      <div>
        <span class="campaign-panel__eyebrow">求职周期</span>
        <h2>周期管理</h2>
        <p>把投递、面试和结果放进同一个可回看的周期，不会自动替你投递或发送消息。</p>
      </div>
      <el-button :loading="loading" @click="loadCampaigns">刷新</el-button>
    </header>

    <el-alert
      v-if="errorMessage"
      type="warning"
      show-icon
      :closable="false"
      title="周期来源暂时不可用"
      :description="errorMessage"
    />

    <div class="campaign-create">
      <el-input
        v-model="campaignName"
        placeholder="例如：2026 秋招后端岗位"
        maxlength="80"
        clearable
        @keyup.enter="createCampaign"
      />
      <el-button type="primary" :loading="saving" :disabled="!campaignName.trim()" @click="createCampaign">
        新建周期
      </el-button>
    </div>

    <div class="campaign-application-picker">
      <el-select
        v-model="selectedApplicationId"
        filterable
        clearable
        :loading="applicationsLoading"
        placeholder="选择要关联的机会"
        style="width: 100%"
      >
        <el-option
          v-for="application in applications"
          :key="application.id"
          :label="applicationLabel(application)"
          :value="application.id"
        />
      </el-select>
      <span v-if="selectedApplication">
        当前关联：{{ currentCampaignName || '未加入周期' }}
      </span>
    </div>
    <el-alert
      v-if="applicationErrorMessage"
      type="warning"
      show-icon
      :closable="false"
      title="机会列表暂时不可用"
      :description="applicationErrorMessage"
    />

    <div v-loading="loading" class="campaign-list">
      <article v-for="campaign in campaigns" :key="campaign.id" class="campaign-row">
        <div class="campaign-row__main">
          <strong>{{ campaign.name || `求职周期 #${campaign.id}` }}</strong>
          <span>{{ campaignStatusLabel(campaign.status) }} · {{ campaign.applicationCount || 0 }} 条机会</span>
          <small v-if="campaign.startedAt || campaign.completedAt">
            {{ campaign.startedAt || '未设置开始时间' }} 至 {{ campaign.completedAt || '未设置结束时间' }}
          </small>
        </div>
        <div class="campaign-row__actions">
          <el-tag size="small" effect="plain" :type="campaignStatusType(campaign.status)">
            {{ campaignStatusLabel(campaign.status) }}
          </el-tag>
          <el-button
            v-if="isCampaignStatus(campaign, 'DRAFT')"
            link
            type="primary"
            :loading="actionId === campaign.id"
            :disabled="!campaignCommandLockVersion(campaign)"
            @click="activate(campaign)"
          >
            开始周期
          </el-button>
          <el-button
            v-if="isCampaignStatus(campaign, 'ACTIVE')"
            link
            type="warning"
            :loading="actionId === campaign.id"
            :disabled="!campaignCommandLockVersion(campaign)"
            @click="complete(campaign)"
          >
            完成周期
          </el-button>
          <el-button
            v-if="isCampaignStatus(campaign, 'COMPLETED') && reviewEnabled"
            link
            type="primary"
            :loading="reviewLoading && reviewCampaignId === campaign.id"
            @click="openReview(campaign.id)"
          >
            周期复盘
          </el-button>
          <el-button
            v-if="cockpitEnabled && ['ACTIVE', 'PAUSED', 'COMPLETED'].includes(String(campaign.status || '').toUpperCase())"
            link
            type="primary"
            @click="goCockpit(campaign.id)"
          >
            驾驶舱
          </el-button>
          <el-button
            v-if="canArchiveCareerCampaign(campaign.status, campaign.allowedTransitions)"
            link
            type="info"
            :loading="actionId === campaign.id"
            :disabled="!campaignCommandLockVersion(campaign)"
            @click="archive(campaign)"
          >
            归档
          </el-button>
          <el-button
            v-if="selectedApplication?.campaignId === campaign.id"
            link
            type="danger"
            :loading="applicationActionId === `detach:${campaign.id}`"
            @click="detachApplication(campaign)"
          >
            移出选中机会
          </el-button>
          <el-button
            v-else-if="selectedApplication && !selectedApplication.campaignId && canAttachApplicationsToCareerCampaign(campaign.status)"
            link
            type="primary"
            :loading="applicationActionId === `attach:${campaign.id}`"
            @click="attachApplication(campaign)"
          >
            关联选中机会
          </el-button>
        </div>
      </article>
      <AppState
        v-if="!campaigns.length && !loading && !errorMessage"
        type="empty"
        title="还没有求职周期"
        description="先创建一个周期，再把具体机会加入工作区管理。"
      />
    </div>

    <el-dialog v-model="reviewVisible" title="周期复盘与记忆候选" width="720px">
      <el-alert
        v-if="reviewError"
        type="warning"
        show-icon
        :closable="false"
        title="周期复盘暂时不可用"
        :description="reviewError"
      />
      <el-button
        v-if="reviewError && reviewCampaignId"
        link
        type="primary"
        :loading="reviewLoading"
        data-testid="retry-campaign-review"
        @click="openReview(reviewCampaignId)"
      >
        重试周期复盘
      </el-button>
      <el-alert
        v-if="review?.fallback"
        type="warning"
        show-icon
        :closable="false"
        title="本次复盘使用基础事实汇总"
        description="AI 生成不可用时，只展示已记录事实和流程建议，不生成因果结论。"
      />
      <el-skeleton v-if="reviewLoading" :rows="6" animated />
      <template v-else-if="review">
        <div class="review-summary">
          <el-tag effect="plain">{{ confidenceLabel(review.confidenceLevel) }}</el-tag>
          <span v-if="review.dataCutoffAt">数据截点：{{ review.dataCutoffAt }}</span>
          <p>{{ review.summary || '本周期已完成事实汇总。' }}</p>
        </div>
        <dl class="review-facts">
          <div v-for="fact in review.facts || []" :key="fact.key || fact.label">
            <dt>{{ fact.label || '事实' }}</dt>
            <dd>{{ formatReviewFact(fact.value) }}</dd>
          </div>
          <div v-for="limit in review.limits || []" :key="`limit-${limit}`"><dt>限制</dt><dd>{{ limit }}</dd></div>
        </dl>
        <section class="memory-candidates">
          <div class="memory-candidates__head">
            <h3>记忆候选</h3>
            <el-button
              v-if="evidenceLearningEnabled && reviewCampaignId"
              link
              type="primary"
              data-testid="campaign-evidence-candidates"
              @click="goEvidenceCandidates"
            >
              查看证据学习候选
            </el-button>
          </div>
          <p class="muted">候选在你确认前不会进入 Agent 上下文。</p>
            <article v-for="candidate in review.memoryCandidates || []" :key="candidate.candidateId || candidate.id" class="memory-row">
            <div>
              <strong>{{ candidate.title || '待确认候选' }}</strong>
              <p>{{ candidate.content || '--' }}</p>
              <small>{{ candidate.sourceSummary || '来源待补充' }} · {{ confidenceLabel(candidate.confidenceLevel) }}</small>
            </div>
            <el-button
              v-if="canConfirmCampaignCandidate(candidate.status)"
              type="primary"
              size="small"
              :loading="confirmingCandidateId === (candidate.candidateId || candidate.id)"
              @click="confirmCandidate(candidate.candidateId || candidate.id)"
            >
              确认候选
            </el-button>
            <el-tag
              v-else
              size="small"
              effect="plain"
              :type="campaignCandidateStatusType(candidate.status)"
            >
              {{ campaignCandidateStatusLabel(candidate.status) }}
            </el-tag>
          </article>
          <p v-if="!review.memoryCandidates?.length" class="muted">本次没有可确认的记忆候选。</p>
        </section>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { appConfig } from '@/config'
import {
  activateCareerCampaignV7Api,
  attachApplicationToCampaignV7Api,
  archiveCareerCampaignV7Api,
  completeCareerCampaignV7Api,
  confirmCareerMemoryCandidateV7Api,
  createCareerCampaignV7Api,
  detachApplicationFromCampaignV7Api,
  generateCareerCampaignReviewV7Api,
  getCareerCampaignApplicationsV7Api,
  getCareerCampaignReviewV7Api,
  getCareerCampaignsV7Api
} from '@/api/v7Career'
import AppState from '@/components/common/AppState.vue'
import {
  canArchiveCareerCampaign,
  canAttachApplicationsToCareerCampaign,
  classifyV7GetError
} from '@/features/career-campaign/v7'
import type {
  CareerCampaignApplicationVO,
  CareerCampaignReviewVO,
  CareerCampaignVO
} from '@/types/v7/career'
import { getErrorMessage } from '@/utils/error'
import { createOperationIdempotencyKey } from '@/utils/idempotency'

const enabled = computed(() => appConfig.enableV7CampaignWorkspace)
const cockpitEnabled = computed(() => appConfig.enableV8CampaignCockpit)
const router = useRouter()
const campaigns = ref<CareerCampaignVO[]>([])
const applications = ref<CareerCampaignApplicationVO[]>([])
const campaignName = ref('')
const loading = ref(false)
const applicationsLoading = ref(false)
const saving = ref(false)
const actionId = ref<number>()
const applicationActionId = ref<string>()
const errorMessage = ref('')
const applicationErrorMessage = ref('')
const selectedApplicationId = ref<number>()
const reviewVisible = ref(false)
const review = ref<CareerCampaignReviewVO | null>(null)
const reviewLoading = ref(false)
const reviewError = ref('')
const reviewCampaignId = ref<number>()
const confirmingCandidateId = ref<number>()

const reviewEnabled = computed(() => enabled.value && appConfig.enableV7CampaignReview)
const evidenceLearningEnabled = computed(() => appConfig.enableV9EvidenceLearning)
const selectedApplication = computed(() =>
  applications.value.find((item) => item.id === selectedApplicationId.value)
)
const currentCampaignName = computed(() => {
  const campaignId = selectedApplication.value?.campaignId
  return campaigns.value.find((campaign) => campaign.id === campaignId)?.name
})

const goCockpit = (id: number) => {
  void router.push({ name: 'CampaignCockpit', params: { id } })
}

const goEvidenceCandidates = () => {
  if (!reviewCampaignId.value) return
  reviewVisible.value = false
  void router.push({
    path: '/evidence-assets',
    query: {
      tab: 'candidates',
      campaignId: String(reviewCampaignId.value)
    }
  })
}

const getGetErrorMessage = (error: unknown, fallback: string) => {
  const kind = classifyV7GetError(error)
  if (kind === 'not-found') return '周期或机会不存在，可能已被删除。'
  if (kind === 'forbidden') return '当前账号无权读取这项周期数据。'
  if (kind === 'network') return '暂时无法连接周期服务，请检查网络后重试。'
  return getErrorMessage(error, fallback)
}

const loadCampaigns = async () => {
  if (!enabled.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    campaigns.value = await getCareerCampaignsV7Api()
  } catch (error) {
    errorMessage.value = getGetErrorMessage(error, '周期列表暂时不可用，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const loadApplications = async () => {
  if (!enabled.value) return
  applicationsLoading.value = true
  applicationErrorMessage.value = ''
  try {
    applications.value = await getCareerCampaignApplicationsV7Api()
    if (selectedApplicationId.value && !selectedApplication.value) {
      selectedApplicationId.value = undefined
    }
  } catch (error) {
    applicationErrorMessage.value = getGetErrorMessage(error, '机会列表暂时不可用，请稍后重试。')
  } finally {
    applicationsLoading.value = false
  }
}

const refreshPanel = async () => {
  await Promise.all([loadCampaigns(), loadApplications()])
}

const createCampaign = async () => {
  if (!campaignName.value.trim() || saving.value) return
  saving.value = true
  try {
    await createCareerCampaignV7Api({ name: campaignName.value.trim() })
    campaignName.value = ''
    ElMessage.success('求职周期已创建。')
    await loadCampaigns()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '周期创建失败，请稍后重试。'))
  } finally {
    saving.value = false
  }
}

const runAction = async (id: number, action: () => Promise<unknown>, success: string) => {
  if (actionId.value) return
  actionId.value = id
  try {
    await action()
    ElMessage.success(success)
    await refreshPanel()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '周期操作失败，当前记录未被改变。'))
  } finally {
    actionId.value = undefined
  }
}

const campaignCommandLockVersion = (campaign: CareerCampaignVO) => {
  const value = campaign.lockVersion
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : undefined
}

const campaignActionKey = (operation: string, id: number, lockVersion: number) =>
  `campaign:${operation}:${id}:${lockVersion}`

const activate = (campaign: CareerCampaignVO) => {
  const lockVersion = campaignCommandLockVersion(campaign)
  if (!lockVersion) {
    ElMessage.warning('周期版本信息缺失，请刷新后重试。')
    return
  }
  return runAction(
    campaign.id,
    () => activateCareerCampaignV7Api(campaign.id, {
      expectedLockVersion: lockVersion,
      idempotencyKey: campaignActionKey('activate', campaign.id, lockVersion)
    }),
    '周期已开始。'
  )
}

const complete = async (campaign: CareerCampaignVO) => {
  const lockVersion = campaignCommandLockVersion(campaign)
  if (!lockVersion) {
    ElMessage.warning('周期版本信息缺失，请刷新后重试。')
    return
  }
  try {
    await ElMessageBox.confirm(
      '只有机会关闭约束满足后才能完成周期。确认后系统会冻结本周期事实截点。',
      '完成求职周期',
      { type: 'warning', confirmButtonText: '确认完成', cancelButtonText: '取消' }
    )
    await runAction(campaign.id, () => completeCareerCampaignV7Api(campaign.id, {
      expectedLockVersion: lockVersion,
      idempotencyKey: campaignActionKey('complete', campaign.id, lockVersion)
    }), '周期已完成。')
  } catch {
    // User cancelled the confirmation.
  }
}

const archive = async (campaign: CareerCampaignVO) => {
  const lockVersion = campaignCommandLockVersion(campaign)
  if (!lockVersion) {
    ElMessage.warning('周期版本信息缺失，请刷新后重试。')
    return
  }
  try {
    await ElMessageBox.confirm(
      '归档只会改变周期状态，不会删除投递、面试或复盘历史。',
      '归档求职周期',
      { type: 'warning', confirmButtonText: '确认归档', cancelButtonText: '取消' }
    )
    await runAction(campaign.id, () => archiveCareerCampaignV7Api(campaign.id, {
      expectedLockVersion: lockVersion,
      idempotencyKey: campaignActionKey('archive', campaign.id, lockVersion)
    }), '周期已归档。')
  } catch {
    // User cancelled the confirmation.
  }
}

const attachApplication = async (campaign: CareerCampaignVO) => {
  const campaignId = campaign.id
  const applicationId = selectedApplicationId.value
  if (!applicationId || applicationActionId.value) return
  if (selectedApplication.value?.campaignId && selectedApplication.value.campaignId !== campaignId) {
    ElMessage.warning('请先从当前周期移出该机会，再关联到其他周期。')
    return
  }
  applicationActionId.value = `attach:${campaignId}`
  try {
    await attachApplicationToCampaignV7Api(
      campaignId,
      applicationId,
      createOperationIdempotencyKey(`campaign:attach:${campaignId}:${applicationId}`)
    )
    ElMessage.success('机会已加入周期。')
    await refreshPanel()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '机会关联失败，当前关联未被改变。'))
  } finally {
    applicationActionId.value = undefined
  }
}

const detachApplication = async (campaign: CareerCampaignVO) => {
  const campaignId = campaign.id
  const applicationId = selectedApplicationId.value
  if (!applicationId || applicationActionId.value) return
  try {
    await ElMessageBox.confirm(
      '只会解除周期与机会的关联，不会删除机会或历史记录。',
      '移出周期',
      { type: 'warning', confirmButtonText: '确认移出', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  applicationActionId.value = `detach:${campaignId}`
  try {
    await detachApplicationFromCampaignV7Api(
      campaignId,
      applicationId,
      createOperationIdempotencyKey(`campaign:detach:${campaignId}:${applicationId}`)
    )
    ElMessage.success('机会已移出周期。')
    await refreshPanel()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '机会移出失败，当前关联未被改变。'))
  } finally {
    applicationActionId.value = undefined
  }
}

const openReview = async (id: number) => {
  if (!reviewEnabled.value) return
  reviewVisible.value = true
  reviewCampaignId.value = id
  reviewLoading.value = true
  review.value = null
  reviewError.value = ''
  try {
    review.value = await getCareerCampaignReviewV7Api(id)
  } catch (error) {
    if (classifyV7GetError(error) !== 'not-found') {
      reviewError.value = getGetErrorMessage(error, '周期复盘暂时不可用，请稍后重试。')
    } else {
      try {
        review.value = await generateCareerCampaignReviewV7Api({
          campaignId: id,
          idempotencyKey: `campaign-review:${id}:${new Date().toISOString().slice(0, 10)}`
        })
      } catch (generateError) {
        reviewError.value = getGetErrorMessage(generateError, '周期复盘暂时不可用，请稍后重试。')
      }
    }
  } finally {
    reviewLoading.value = false
  }
}

const confirmCandidate = async (candidateId?: number) => {
  if (!candidateId) return
  if (!reviewCampaignId.value || confirmingCandidateId.value) return
  confirmingCandidateId.value = candidateId
  try {
    review.value = await confirmCareerMemoryCandidateV7Api(candidateId, {
      idempotencyKey: `campaign-memory:${candidateId}:confirm`
    })
    ElMessage.success('候选已确认；长期记忆仍需单独预览、确认和启用。')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '记忆候选确认失败，未进入 Agent 上下文。'))
  } finally {
    confirmingCandidateId.value = undefined
  }
}

const campaignStatusLabel = (status?: string) => ({
  DRAFT: '草稿',
  ACTIVE: '进行中',
  COMPLETED: '已完成',
  ARCHIVED: '已归档'
}[String(status || '').toUpperCase()] || '状态待确认')

const isCampaignStatus = (campaign: CareerCampaignVO, status: string) =>
  String(campaign.status || '').toUpperCase() === status

const applicationLabel = (application: CareerCampaignApplicationVO) =>
  `${application.companyName || '未命名公司'} · ${application.jobTitle || `机会 #${application.id}`}`

const campaignStatusType = (status?: string) => ({
  ACTIVE: 'success',
  COMPLETED: 'info',
  ARCHIVED: 'info'
}[String(status || '').toUpperCase()] || 'warning') as 'success' | 'info' | 'warning'

const confidenceLabel = (value?: string) => ({
  HIGH: '高置信度',
  MEDIUM: '中置信度',
  LOW: '低置信度'
}[String(value || '').toUpperCase()] || '置信度待确认')

const canConfirmCampaignCandidate = (status?: string) =>
  ['PENDING', 'PENDING_CONFIRMATION', 'CANDIDATE'].includes(
    String(status || '').toUpperCase()
  )

const campaignCandidateStatusLabel = (status?: string) => ({
  CONFIRMED: '已确认',
  CONFIRMED_BY_USER: '已确认',
  REJECTED: '已拒绝',
  EXPIRED: '已过期',
  WEAK_OBSERVATION: '弱观察'
}[String(status || '').toUpperCase()] || '状态待确认')

const campaignCandidateStatusType = (status?: string) => {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'CONFIRMED' || normalized === 'CONFIRMED_BY_USER') return 'success'
  if (normalized === 'EXPIRED' || normalized === 'WEAK_OBSERVATION') return 'warning'
  return 'info'
}

const formatReviewFact = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '暂无记录'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return '事实格式不可读'
  }
}

onMounted(() => {
  void refreshPanel()
})
</script>

<style scoped lang="scss">
.campaign-panel {
  display: grid;
  gap: 14px;
  margin: 16px 0;
  padding: 16px 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.36);
}

.campaign-panel__header,
.campaign-row,
.campaign-create,
.memory-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.campaign-panel__eyebrow {
  color: #93c5fd;
  font-size: 12px;
  font-weight: 700;
}

.campaign-panel h2,
.campaign-panel p {
  margin: 0;
}

.campaign-panel h2 {
  margin-top: 5px;
  font-size: 18px;
}

.campaign-panel__header p {
  margin-top: 6px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.campaign-create {
  align-items: center;
}

.campaign-create .el-input {
  max-width: 420px;
}

.campaign-list {
  display: grid;
  gap: 8px;
}

.campaign-row {
  padding: 12px 0;
  border-top: 1px solid var(--app-border);
}

.campaign-row__main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.campaign-row__main span,
.campaign-row__main small,
.muted {
  color: var(--app-text-muted);
  font-size: 12px;
}

.campaign-row__main strong,
.campaign-row__main span,
.campaign-row__main small {
  overflow-wrap: anywhere;
}

.campaign-row__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.review-summary {
  display: grid;
  gap: 9px;
  margin: 14px 0;
}

.review-summary p {
  margin: 0;
  line-height: 1.6;
}

.review-facts {
  display: grid;
  gap: 7px;
  margin: 0;
}

.review-facts div {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 8px;
}

.review-facts dt,
.review-facts dd {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
}

.review-facts dt {
  color: var(--app-text-muted);
}

.memory-candidates {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--app-border);
}

.memory-candidates h3 {
  margin: 0;
  font-size: 15px;
}

.memory-candidates__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.memory-candidates > p {
  margin: 5px 0 10px;
}

.memory-row {
  align-items: center;
  padding: 11px 0;
  border-top: 1px solid var(--app-border);
}

.memory-row > div {
  min-width: 0;
}

.memory-row p,
.memory-row small {
  display: block;
  margin: 4px 0 0;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.55;
}

@media (max-width: 700px) {
  .campaign-panel__header,
  .campaign-create,
  .campaign-row,
  .memory-row {
    flex-direction: column;
  }

  .campaign-create .el-input {
    max-width: none;
  }

  .campaign-row__actions {
    justify-content: flex-start;
  }
}
</style>
