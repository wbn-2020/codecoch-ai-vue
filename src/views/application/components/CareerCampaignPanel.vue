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
            v-if="campaign.status === 'DRAFT'"
            link
            type="primary"
            :loading="actionId === campaign.id"
            @click="activate(campaign.id)"
          >
            开始周期
          </el-button>
          <el-button
            v-if="campaign.status === 'ACTIVE'"
            link
            type="warning"
            :loading="actionId === campaign.id"
            @click="complete(campaign.id)"
          >
            完成周期
          </el-button>
          <el-button
            v-if="campaign.status === 'COMPLETED'"
            link
            type="primary"
            :loading="reviewLoading && reviewCampaignId === campaign.id"
            @click="openReview(campaign.id)"
          >
            周期复盘
          </el-button>
          <el-button
            v-if="campaign.status !== 'ARCHIVED'"
            link
            type="info"
            :loading="actionId === campaign.id"
            @click="archive(campaign.id)"
          >
            归档
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
          <h3>记忆候选</h3>
          <p class="muted">候选在你确认前不会进入 Agent 上下文。</p>
            <article v-for="candidate in review.memoryCandidates || []" :key="candidate.candidateId || candidate.id" class="memory-row">
            <div>
              <strong>{{ candidate.title || '待确认候选' }}</strong>
              <p>{{ candidate.content || '--' }}</p>
              <small>{{ candidate.sourceSummary || '来源待补充' }} · {{ confidenceLabel(candidate.confidenceLevel) }}</small>
            </div>
            <el-button
              v-if="candidate.status === 'PENDING' || candidate.status === 'PENDING_CONFIRMATION' || candidate.status === 'CANDIDATE' || !candidate.status"
              type="primary"
              size="small"
              :loading="confirmingCandidateId === (candidate.candidateId || candidate.id)"
              @click="confirmCandidate(candidate.candidateId || candidate.id)"
            >
              确认记忆
            </el-button>
            <el-tag v-else size="small" effect="plain" type="success">已确认</el-tag>
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

import { appConfig } from '@/config'
import {
  activateCareerCampaignV7Api,
  archiveCareerCampaignV7Api,
  completeCareerCampaignV7Api,
  confirmCareerMemoryCandidateV7Api,
  createCareerCampaignV7Api,
  generateCareerCampaignReviewV7Api,
  getCareerCampaignReviewV7Api,
  getCareerCampaignsV7Api
} from '@/api/v7Career'
import AppState from '@/components/common/AppState.vue'
import type { CareerCampaignReviewVO, CareerCampaignVO } from '@/types/v7/career'
import { getErrorMessage } from '@/utils/error'

const enabled = computed(() => appConfig.enableV7CampaignWorkspace)
const campaigns = ref<CareerCampaignVO[]>([])
const campaignName = ref('')
const loading = ref(false)
const saving = ref(false)
const actionId = ref<number>()
const errorMessage = ref('')
const reviewVisible = ref(false)
const review = ref<CareerCampaignReviewVO | null>(null)
const reviewLoading = ref(false)
const reviewCampaignId = ref<number>()
const confirmingCandidateId = ref<number>()

const loadCampaigns = async () => {
  if (!enabled.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    campaigns.value = await getCareerCampaignsV7Api()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '周期列表暂时不可用，请稍后重试。')
  } finally {
    loading.value = false
  }
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
    await loadCampaigns()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '周期操作失败，当前记录未被改变。'))
  } finally {
    actionId.value = undefined
  }
}

const activate = (id: number) => runAction(id, () => activateCareerCampaignV7Api(id), '周期已开始。')

const complete = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      '只有机会关闭约束满足后才能完成周期。确认后系统会冻结本周期事实截点。',
      '完成求职周期',
      { type: 'warning', confirmButtonText: '确认完成', cancelButtonText: '取消' }
    )
    await runAction(id, () => completeCareerCampaignV7Api(id), '周期已完成。')
  } catch {
    // User cancelled the confirmation.
  }
}

const archive = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      '归档只会改变周期状态，不会删除投递、面试或复盘历史。',
      '归档求职周期',
      { type: 'warning', confirmButtonText: '确认归档', cancelButtonText: '取消' }
    )
    await runAction(id, () => archiveCareerCampaignV7Api(id), '周期已归档。')
  } catch {
    // User cancelled the confirmation.
  }
}

const openReview = async (id: number) => {
  reviewVisible.value = true
  reviewCampaignId.value = id
  reviewLoading.value = true
  review.value = null
  try {
    review.value = await getCareerCampaignReviewV7Api(id)
  } catch {
    try {
      review.value = await generateCareerCampaignReviewV7Api({
        campaignId: id,
        campaignStatus: 'COMPLETED',
        completed: true,
        allOpportunitiesClosed: true,
        dataCutoffAt: new Date().toISOString(),
        idempotencyKey: `campaign-review:${id}:${new Date().toISOString().slice(0, 10)}`
      })
    } catch (error) {
      ElMessage.error(getErrorMessage(error, '周期复盘暂时不可用，请稍后重试。'))
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
    ElMessage.success('记忆候选已确认。')
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
  void loadCampaigns()
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
