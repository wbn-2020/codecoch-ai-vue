<template>
  <div class="page-shell campaign-cockpit">
    <AppState
      v-if="pageError && !loading"
      type="error"
      title="周期驾驶舱加载失败"
      :description="pageError"
    >
      <el-button type="primary" :loading="loading" @click="loadCockpit">重新加载</el-button>
    </AppState>

    <template v-else>
      <header class="cockpit-header">
        <div class="cockpit-header__main">
          <el-button text :icon="ArrowLeft" title="返回投递管理" @click="router.push('/applications')">
            返回投递管理
          </el-button>
          <span class="cockpit-header__eyebrow">V8 周期经营</span>
          <h1>{{ cockpit?.campaign?.name || `求职周期 #${campaignId}` }}</h1>
          <p>只汇总本周期已记录事实、行动候选和容量边界，不替你投递、发消息或改变机会状态。</p>
        </div>
        <div class="cockpit-header__actions">
          <el-tag v-if="cockpit?.campaign" effect="plain" :type="campaignStatus.type">
            {{ campaignStatus.label }}
          </el-tag>
          <el-button :icon="RefreshCw" :loading="loading" @click="loadCockpit">刷新</el-button>
        </div>
      </header>

      <el-skeleton v-if="loading" :rows="8" animated />

      <template v-else-if="cockpit">
        <CampaignCockpitSummary :campaign="cockpit.campaign" :cockpit="cockpit" />

        <el-tabs v-model="activeSection" class="cockpit-tabs" stretch>
          <el-tab-pane name="overview" label="概览">
            <div class="cockpit-stack">
              <CampaignOperatingProfileForm
                :model-value="profile"
                :saving="profileSaving"
                :error="profileError"
                @save="saveProfile"
              />
              <section class="cockpit-section cockpit-overview">
                <header class="cockpit-section__header">
                  <div>
                    <span class="section-kicker">覆盖与分布</span>
                    <h2>当前机会组合</h2>
                  </div>
                  <span class="muted">数据截点：{{ cockpit.dataCutoffAt || '待确认' }}</span>
                </header>
                <div class="overview-grid">
                  <div class="coverage-summary">
                    <span>已纳入来源</span><strong>{{ coverage.included }}</strong>
                    <span>暂不可用来源</span><strong>{{ coverage.unavailable }}</strong>
                    <span>读取失败来源</span><strong>{{ coverage.failed }}</strong>
                  </div>
                  <dl class="stage-distribution">
                    <div v-for="(count, stage) in cockpit.stageDistribution || {}" :key="stage">
                      <dt>{{ stage }}</dt><dd>{{ count }}</dd>
                    </div>
                    <p v-if="!Object.keys(cockpit.stageDistribution || {}).length" class="muted">暂无阶段分布。</p>
                  </dl>
                </div>
                <div class="application-list">
                  <article v-for="application in cockpit.applications || []" :key="application.id" class="application-row">
                    <div>
                      <strong>{{ application.companyName || '未命名公司' }} · {{ application.jobTitle || '未命名岗位' }}</strong>
                      <span>{{ application.status || '状态待确认' }} · {{ application.nextFollowUpAt || '未设置下一次跟进' }}</span>
                      <p>{{ application.lastEventSummary || '暂无最近事件摘要。' }}</p>
                    </div>
                    <el-button
                      v-if="application.actionUrl"
                      link
                      type="primary"
                      @click="router.push(application.actionUrl)"
                    >
                      查看机会
                    </el-button>
                  </article>
                  <AppState
                    v-if="!cockpit.applications?.length"
                    type="empty"
                    title="还没有周期机会"
                    description="先在投递管理的周期面板中关联机会，再回到这里查看组合。"
                  />
                </div>
              </section>
            </div>
          </el-tab-pane>

          <el-tab-pane name="actions" label="行动队列">
            <CampaignActionQueue
              :actions="cockpit.actionQueue"
              :error="actionError"
              :disabled="actionSaving"
              @decide="decideAction"
              @open="openAction"
            />
          </el-tab-pane>

          <el-tab-pane v-if="appConfig.enableV8CampaignPulse" name="pulse" label="周期脉搏">
            <CampaignPulseSection
              :pulse="pulse || cockpit.pulseSummary"
              :history="pulseHistory"
              :loading="pulseLoading"
              :error="pulseError"
              :disabled="pulseLoading"
              @refresh="refreshPulse"
              @select-history="pulse = $event"
            />
            <ExternalPlanPreviewEntry
              v-if="appConfig.enableV8CampaignPlan"
              class="cockpit-plan-entry"
              source-type="CAMPAIGN_PULSE"
              :source-id="pulse?.snapshotId"
              :source-version="pulse?.snapshotVersion"
              :source-context-hash="pulse?.inputHash"
              :intents="pulsePlanIntents"
              :create-preview="createPulsePlanPreview"
              :capability-available="Boolean(pulse?.snapshotId && pulsePlanIntents.length)"
              unavailable-reason="当前脉搏还没有可进入计划预览的行动"
              button-label="进入计划差异预览"
            />
          </el-tab-pane>

          <el-tab-pane v-if="appConfig.enableV8CampaignPortfolio" name="portfolio" label="机会组合">
            <CampaignScenarioPreview
              :preview="scenarioPreview"
              :loading="scenarioLoading"
              :error="scenarioError"
              :disabled="scenarioLoading"
              @preview="previewScenario"
            />
          </el-tab-pane>

          <el-tab-pane v-if="appConfig.enableV8CampaignExport" name="export" label="档案导出">
            <CampaignArchiveExport
              :exports="archiveExports"
              :loading="archiveLoading"
              :creating="archiveCreating"
              :error="archiveError"
              :disabled="archiveCreating"
              @create="createArchiveExport"
              @retry="retryArchiveExport"
              @download="downloadArchiveExport"
            />
          </el-tab-pane>
        </el-tabs>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  createCampaignArchiveExportV8Api,
  createCampaignPulsePlanPreviewV8Api,
  downloadCampaignArchiveExportV8Api,
  generateCampaignPulseV8Api,
  getCampaignArchiveExportsV8Api,
  getCampaignCockpitV8Api,
  getCampaignOperatingProfileV8Api,
  getCampaignPulseHistoryV8Api,
  getCampaignPulseV8Api,
  previewCampaignScenarioV8Api,
  saveCampaignActionDecisionV8Api,
  updateCampaignOperatingProfileV8Api
} from '@/api/v8Campaign'
import AppState from '@/components/common/AppState.vue'
import ExternalPlanPreviewEntry from '@/components/v7/ExternalPlanPreviewEntry.vue'
import CampaignActionQueue from '@/components/v8/campaign-cockpit/CampaignActionQueue.vue'
import CampaignArchiveExport from '@/components/v8/campaign-cockpit/CampaignArchiveExport.vue'
import CampaignCockpitSummary from '@/components/v8/campaign-cockpit/CampaignCockpitSummary.vue'
import CampaignOperatingProfileForm from '@/components/v8/campaign-cockpit/CampaignOperatingProfileForm.vue'
import CampaignPulseSection from '@/components/v8/campaign-cockpit/CampaignPulseSection.vue'
import CampaignScenarioPreview from '@/components/v8/campaign-cockpit/CampaignScenarioPreview.vue'
import { getCampaignCoverageLabels, getCampaignStatusPresentation, normalizeOperatingProfile } from '@/features/campaign-cockpit'
import { buildCampaignActionDecisionDTO } from '@/features/campaign-cockpit/action-decisions'
import type {
  CampaignActionDecision,
  CampaignActionDecisionStatus,
  CampaignArchiveExportVO,
  CampaignCockpitVO,
  CampaignOperatingProfile,
  CampaignOperatingProfileUpdateDTO,
  CampaignPulseSnapshot,
  CampaignScenarioPreviewDTO,
  CampaignScenarioPreviewVO
} from '@/types/v8/campaign'
import type { V7ExternalPlanIntent } from '@/types/v7/career'
import { appConfig } from '@/config'
import { getErrorMessage } from '@/utils/error'
import { createOperationIdempotencyKey } from '@/utils/idempotency'

const route = useRoute()
const router = useRouter()
const campaignId = computed(() => Number(route.params.id))
const loading = ref(false)
const pageError = ref('')
const cockpit = ref<CampaignCockpitVO | null>(null)
const profile = ref<CampaignOperatingProfile>(normalizeOperatingProfile(campaignId.value))
const profileError = ref('')
const profileSaving = ref(false)
const activeSection = ref('overview')
const actionError = ref('')
const actionSaving = ref(false)
const pulse = ref<CampaignPulseSnapshot | null>(null)
const pulseHistory = ref<CampaignPulseSnapshot[]>([])
const pulseLoading = ref(false)
const pulseError = ref('')
const scenarioPreview = ref<CampaignScenarioPreviewVO | null>(null)
const scenarioLoading = ref(false)
const scenarioError = ref('')
const archiveExports = ref<CampaignArchiveExportVO[]>([])
const archiveLoading = ref(false)
const archiveCreating = ref(false)
const archiveError = ref('')

const campaignStatus = computed(() => getCampaignStatusPresentation(cockpit.value?.campaign?.status))
const coverage = computed(() => getCampaignCoverageLabels(cockpit.value?.coverage))
const selectedActions = computed(() => cockpit.value?.actionQueue || [])
const pulsePlanIntents = computed<V7ExternalPlanIntent[]>(() =>
  (pulse.value?.actionSeeds || []).map((item) => ({
    sourceItemKey: item.semanticKey,
    title: item.title,
    description: item.description,
    estimatedMinutes: item.estimatedMinutes,
    priority: item.priority,
    confidenceLevel: item.confidenceLevel,
    fallback: item.fallback
  }))
)

const loadCockpit = async () => {
  if (!Number.isSafeInteger(campaignId.value) || campaignId.value <= 0) {
    pageError.value = '周期编号无效。'
    return
  }
  loading.value = true
  pageError.value = ''
  try {
    const [cockpitResult, profileResult] = await Promise.allSettled([
      getCampaignCockpitV8Api(campaignId.value),
      getCampaignOperatingProfileV8Api(campaignId.value)
    ])
    if (cockpitResult.status === 'rejected') {
      throw cockpitResult.reason
    }
    cockpit.value = cockpitResult.value
    profileError.value = profileResult.status === 'rejected'
      ? getErrorMessage(profileResult.reason, '经营配置暂时不可用，请稍后重试。')
      : ''
    profile.value = normalizeOperatingProfile(
      campaignId.value,
      profileResult.status === 'fulfilled'
        ? profileResult.value
        : cockpit.value.operatingProfile
    )
    actionError.value = ''
  } catch (error) {
    cockpit.value = null
    pageError.value = getErrorMessage(error, '周期驾驶舱暂时不可用，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const loadPulse = async () => {
  if (!appConfig.enableV8CampaignPulse) return
  pulseLoading.value = true
  pulseError.value = ''
  try {
    const [latest, history] = await Promise.allSettled([
      getCampaignPulseV8Api(campaignId.value),
      getCampaignPulseHistoryV8Api(campaignId.value)
    ])
    if (latest.status === 'rejected' && history.status === 'rejected') {
      throw latest.reason
    }
    pulse.value = latest.status === 'fulfilled' ? latest.value : pulse.value
    pulseHistory.value = history.status === 'fulfilled' ? history.value : []
    if (latest.status === 'rejected' || history.status === 'rejected') {
      pulseError.value = '部分脉搏来源不可用，已保留可读取的快照。'
    }
  } catch (error) {
    pulseError.value = getErrorMessage(error, '周期脉搏暂时不可用，请稍后重试。')
  } finally {
    pulseLoading.value = false
  }
}

const loadExports = async () => {
  if (!appConfig.enableV8CampaignExport) return
  archiveLoading.value = true
  archiveError.value = ''
  try {
    archiveExports.value = await getCampaignArchiveExportsV8Api(campaignId.value)
  } catch (error) {
    archiveError.value = getErrorMessage(error, '档案导出记录暂时不可用，请稍后重试。')
  } finally {
    archiveLoading.value = false
  }
}

const saveProfile = async (value: CampaignOperatingProfileUpdateDTO) => {
  profileSaving.value = true
  profileError.value = ''
  try {
    profile.value = await updateCampaignOperatingProfileV8Api(campaignId.value, value)
    await loadCockpit()
    ElMessage.success('周期经营配置已保存。')
  } catch (error) {
    profileError.value = getErrorMessage(error, '经营配置保存失败，原配置未被改变。')
  } finally {
    profileSaving.value = false
  }
}

const decideAction = async (payload: { action: CampaignActionDecision; status: CampaignActionDecisionStatus }) => {
  if (actionSaving.value) return
  try {
    await ElMessageBox.confirm(
      payload.status === 'DISMISSED'
        ? '忽略只针对当前事实版本；来源变化后该行动仍可能重新出现。'
        : '确认记录这次行动决定吗？它不会创建 Agent 任务或改变机会状态。',
      payload.status === 'DISMISSED' ? '忽略当前事实' : '记录行动决定',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  actionSaving.value = true
  actionError.value = ''
  try {
    const data = buildCampaignActionDecisionDTO(
      payload.action,
      payload.status,
      createOperationIdempotencyKey(`campaign-action:${campaignId.value}:${payload.action.semanticKey}`)
      ,
      payload.status === 'SNOOZED'
        ? { snoozedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
        : undefined
    )
    await saveCampaignActionDecisionV8Api(campaignId.value, data)
    await loadCockpit()
    ElMessage.success('行动决定已记录。')
  } catch (error) {
    actionError.value = getErrorMessage(error, '行动决定保存失败，当前队列未被改变。')
  } finally {
    actionSaving.value = false
  }
}

const openAction = (action: CampaignActionDecision) => {
  if (action.actionUrl) void router.push(action.actionUrl)
}

const createPulsePlanPreview = (idempotencyKey: string) => {
  if (!pulse.value?.snapshotId) {
    return Promise.reject(new Error('周期脉搏快照尚未准备完成。'))
  }
  return createCampaignPulsePlanPreviewV8Api(pulse.value.snapshotId, {
    idempotencyKey,
    maxTotalMinutes: profile.value.weeklyTimeBudgetMinutes,
    selectedSemanticKeys: (pulse.value.actionSeeds || []).map((item) => item.semanticKey)
  })
}

const refreshPulse = async () => {
  pulseLoading.value = true
  pulseError.value = ''
  try {
    await generateCampaignPulseV8Api({
      campaignId: campaignId.value,
      idempotencyKey: createOperationIdempotencyKey(`campaign-pulse:${campaignId.value}`)
    })
    await loadPulse()
    ElMessage.success('周期脉搏已刷新。')
  } catch (error) {
    pulseError.value = getErrorMessage(error, '周期脉搏生成失败，请稍后重试。')
    pulseLoading.value = false
  }
}

const previewScenario = async (value: CampaignScenarioPreviewDTO) => {
  scenarioLoading.value = true
  scenarioError.value = ''
  try {
    scenarioPreview.value = await previewCampaignScenarioV8Api(campaignId.value, value)
  } catch (error) {
    scenarioError.value = getErrorMessage(error, '情景预览失败，请稍后重试。')
  } finally {
    scenarioLoading.value = false
  }
}

const createArchiveExport = async () => {
  archiveCreating.value = true
  archiveError.value = ''
  try {
    await createCampaignArchiveExportV8Api(campaignId.value, {
      exportFormat: 'ZIP',
      dataCutoffAt: cockpit.value?.dataCutoffAt,
      idempotencyKey: createOperationIdempotencyKey(`campaign-archive:${campaignId.value}`)
    })
    await loadExports()
    ElMessage.success('档案导出请求已提交。')
  } catch (error) {
    archiveError.value = getErrorMessage(error, '档案导出失败，请稍后重试。')
  } finally {
    archiveCreating.value = false
  }
}

const retryArchiveExport = async (item: CampaignArchiveExportVO) => {
  archiveCreating.value = true
  try {
    await createCampaignArchiveExportV8Api(campaignId.value, {
      exportFormat: item.exportFormat || 'ZIP',
      dataCutoffAt: item.dataCutoffAt,
      retryFailed: true,
      idempotencyKey: createOperationIdempotencyKey(`campaign-archive-retry:${campaignId.value}:${item.id}`)
    })
    await loadExports()
  } catch (error) {
    archiveError.value = getErrorMessage(error, '档案导出重试失败，请稍后重试。')
  } finally {
    archiveCreating.value = false
  }
}

const downloadArchiveExport = async (item: CampaignArchiveExportVO) => {
  try {
    const blob = await downloadCampaignArchiveExportV8Api(item.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `career-campaign-${campaignId.value}-${item.id}.zip`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    archiveError.value = getErrorMessage(error, '档案下载失败，请稍后重试。')
  }
}

watch(activeSection, (value) => {
  if (value === 'pulse') void loadPulse()
  if (value === 'export') void loadExports()
})

watch(campaignId, () => {
  activeSection.value = 'overview'
  pulse.value = null
  pulseHistory.value = []
  pulseError.value = ''
  scenarioPreview.value = null
  scenarioError.value = ''
  archiveExports.value = []
  archiveError.value = ''
  actionError.value = ''
  void loadCockpit()
})

onMounted(() => {
  void loadCockpit()
})
</script>

<style scoped lang="scss">
.campaign-cockpit {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
}

.cockpit-header,
.cockpit-header__actions,
.cockpit-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.cockpit-header__main {
  min-width: 0;
}

.cockpit-header__eyebrow,
.section-kicker {
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.cockpit-header h1 {
  margin: 8px 0 0;
  color: var(--app-text);
  font-size: 28px;
  line-height: 1.2;
  text-wrap: balance;
}

.cockpit-header p {
  max-width: 72ch;
  margin: 8px 0 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.cockpit-tabs {
  min-width: 0;
}

.cockpit-stack {
  display: grid;
  gap: 16px;
}

.cockpit-section {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface, #151c27);
}

.section-kicker {
  display: block;
}

.cockpit-section__header h2 {
  margin: 4px 0 0;
  color: var(--app-text);
  font-size: 18px;
}

.muted {
  color: var(--app-text-muted);
  font-size: 12px;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(180px, 0.35fr) minmax(0, 1fr);
  gap: 18px;
}

.coverage-summary {
  display: grid;
  grid-template-columns: 1fr auto;
  align-content: start;
  gap: 9px 14px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.coverage-summary strong {
  color: var(--app-text);
  font-size: 17px;
}

.stage-distribution {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 10px;
  margin: 0;
}

.stage-distribution div {
  display: grid;
  gap: 4px;
  border-top: 1px solid var(--app-border);
  padding-top: 9px;
}

.stage-distribution dt {
  color: var(--app-text-muted);
  font-size: 12px;
}

.stage-distribution dd {
  margin: 0;
  color: var(--app-text);
  font-size: 18px;
  font-weight: 700;
}

.application-list {
  display: grid;
  gap: 10px;
}

.application-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  border-top: 1px solid var(--app-border);
  padding-top: 12px;
}

.application-row > div {
  min-width: 0;
}

.application-row strong,
.application-row span,
.application-row p {
  display: block;
}

.application-row strong {
  color: var(--app-text);
}

.application-row span,
.application-row p {
  margin: 5px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

.application-row p {
  line-height: 1.5;
}

@media (max-width: 760px) {
  .cockpit-header,
  .cockpit-header__actions,
  .cockpit-section__header,
  .application-row {
    flex-direction: column;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
