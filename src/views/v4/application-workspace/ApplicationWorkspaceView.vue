<template>
  <div class="page-shell application-workspace">
    <AppState
      v-if="pageError && !loading"
      type="error"
      title="机会工作区加载失败"
      :description="pageError"
    >
      <el-button type="primary" :loading="loading" @click="loadWorkspace">重新加载</el-button>
    </AppState>

    <template v-else>
      <header class="workspace-header">
        <div class="workspace-header__main">
          <el-button text :icon="ArrowLeft" title="返回投递管理" @click="router.push('/applications')">
            返回投递
          </el-button>
          <span class="workspace-eyebrow">机会工作区</span>
          <h1>{{ application.companyName || '未命名公司' }} · {{ application.jobTitle || '未命名岗位' }}</h1>
          <p>
            {{ application.source || '来源待确认' }}
            <span v-if="application.appliedAt"> · 投递于 {{ application.appliedAt }}</span>
            <span v-if="application.priorityLevel"> · 优先级 {{ application.priorityLevel }}</span>
          </p>
        </div>
        <div class="workspace-header__actions">
          <el-tag effect="plain" :type="statusTagType(application.status)">
            {{ statusLabel(application.status) }}
          </el-tag>
          <el-button type="primary" :loading="transitioning" @click="openStatusDialog">
            更新状态
          </el-button>
        </div>
      </header>

      <el-alert
        v-if="partialFailures.length"
        type="warning"
        show-icon
        :closable="false"
        title="工作区部分来源不可用"
        :description="`已加载可用事实；${partialFailures.map(sectionLabel).join('、')}暂时无法读取。`"
        data-testid="workspace-partial-failure"
      />
      <el-alert
        v-if="workspace.warnings?.length"
        type="info"
        show-icon
        :closable="false"
        title="当前机会有待确认信息"
        :description="workspace.warnings.join(' ')"
      />

      <el-skeleton v-if="loading" :rows="8" animated />

      <template v-else>
        <el-tabs v-model="activeTab" class="workspace-tabs" stretch>
          <el-tab-pane v-for="tab in tabs" :key="tab.key" :name="tab.key" :label="tab.label">
            <template v-if="activeTab === tab.key">
              <section v-if="tab.key === 'overview'" class="workspace-content">
                <div class="workspace-grid workspace-grid--overview">
                  <article class="workspace-section">
                    <header class="section-header"><h2>当前事实</h2><el-tag size="small" effect="plain">只读聚合</el-tag></header>
                    <dl class="fact-grid">
                      <div><dt>当前阶段</dt><dd>{{ statusLabel(application.status) }}</dd></div>
                      <div><dt>机会结果</dt><dd>{{ application.opportunityOutcome || '尚未记录' }}</dd></div>
                      <div><dt>下一次跟进</dt><dd>{{ application.nextFollowUpAt || '未设置' }}</dd></div>
                      <div><dt>简历版本</dt><dd>{{ application.resumeVersionName || (application.resumeVersionId ? `版本 #${application.resumeVersionId}` : '未关联') }}</dd></div>
                      <div><dt>匹配报告</dt><dd>{{ application.matchReportId ? `报告 #${application.matchReportId}` : '未关联' }}</dd></div>
                      <div><dt>所属周期</dt><dd>{{ workspace.campaign?.name || '尚未加入周期' }}</dd></div>
                    </dl>
                  </article>
                  <article class="workspace-section">
                    <header class="section-header"><h2>覆盖情况</h2><el-tag size="small" effect="plain">来源边界</el-tag></header>
                    <div class="coverage-list">
                      <div><span>已纳入来源</span><strong>{{ coverageSummary.included }}</strong></div>
                      <div><span>暂不可用来源</span><strong>{{ coverageSummary.unavailable }}</strong></div>
                      <div><span>读取失败来源</span><strong>{{ coverageSummary.failed }}</strong></div>
                    </div>
                    <p class="muted">工作区不会把缺失数据显示成成功，也不会替你推断招聘方意图。</p>
                  </article>
                </div>
                <article class="workspace-section">
                  <header class="section-header"><h2>机会摘要</h2></header>
                  <p class="workspace-note">{{ application.note || '还没有补充机会备注。可以先在投递管理里记录事实，再回到这里查看聚合结果。' }}</p>
                </article>
              </section>

              <section v-else-if="activeTab === 'timeline'" class="workspace-content">
                <WorkspaceList
                  title="事件时间线"
                  :items="timeline"
                  empty-title="还没有时间线事件"
                  empty-description="投递、跟进、面试和结果事件会按时间顺序显示在这里。"
                  :error="sectionErrors.timeline"
                >
                  <template #default="{ item }">
                    <div class="timeline-row">
                      <div class="timeline-marker" />
                      <div>
                        <strong>{{ item.title || eventTypeLabel(item.eventType) }}</strong>
                        <span>{{ item.eventTime || '时间待确认' }}</span>
                        <p>{{ item.summary || '暂无事件摘要' }}</p>
                      </div>
                    </div>
                  </template>
                </WorkspaceList>
              </section>

              <section v-else-if="activeTab === 'materials'" class="workspace-content">
                <WorkspaceList
                  title="材料与证据"
                  :items="materials"
                  empty-title="还没有关联材料"
                  empty-description="关联的简历版本、匹配报告和投递包会在这里集中展示。"
                  :error="sectionErrors.materials"
                >
                  <template #default="{ item }">
                    <div class="material-row">
                      <div>
                        <strong>{{ item.title || item.label || '未命名材料' }}</strong>
                        <span>{{ item.type || '材料' }} · {{ item.status || '状态待确认' }}</span>
                      </div>
                      <el-button v-if="item.href" link type="primary" @click="router.push(item.href)">查看</el-button>
                    </div>
                  </template>
                </WorkspaceList>
              </section>

              <section v-else-if="activeTab === 'next-steps'" class="workspace-content">
                <WorkspaceList
                  title="下一步"
                  :items="nextSteps"
                  empty-title="暂时没有下一步建议"
                  empty-description="记录新的事件或准备动作后，这里会出现可确认的下一步。"
                  :error="sectionErrors['next-steps']"
                >
                  <template #default="{ item }">
                    <div class="next-step-row">
                      <div>
                        <strong>{{ item.title || '待确认行动' }}</strong>
                        <p>{{ item.description || '暂无说明' }}</p>
                        <span>{{ item.dueAt || '日期待确认' }} · {{ item.source || '来源待确认' }}</span>
                      </div>
                      <el-tag size="small" effect="plain" :type="priorityType(item.priority)">
                        {{ priorityLabel(item.priority) }}
                      </el-tag>
                    </div>
                  </template>
                </WorkspaceList>
              </section>

              <section v-else-if="activeTab === 'interview'" class="workspace-content">
                <article class="workspace-section">
                  <header class="section-header"><h2>真实面试流程</h2><el-tag effect="plain">不混淆模拟面试</el-tag></header>
                  <el-alert v-if="sectionErrors.interview" type="warning" show-icon :closable="false" title="面试来源暂时不可用" :description="sectionErrors.interview" />
                  <div v-if="interviewProcess?.rounds?.length" class="round-list">
                    <article v-for="round in interviewProcess.rounds" :key="round.id" class="round-row">
                      <div>
                        <strong>{{ roundTypeLabel(round.roundType) }}</strong>
                        <span>{{ round.scheduledAt || '时间待确认' }} · {{ round.timezone || '时区待确认' }}</span>
                        <p>{{ round.location || '地点待确认' }} · {{ round.status || '状态待确认' }}</p>
                        <p v-if="round.reviewSummary">{{ round.reviewSummary }}</p>
                      </div>
                      <el-tag size="small" effect="plain">{{ round.status || '状态待确认' }}</el-tag>
                    </article>
                  </div>
                  <AppState v-else-if="!sectionErrors.interview" type="empty" title="还没有真实面试轮次" description="创建真实面试安排后，轮次、准备包和复盘会在这里关联。" />
                </article>
              </section>

              <section v-else-if="activeTab === 'offer'" class="workspace-content">
                <article class="workspace-section">
                  <header class="section-header"><h2>Offer 决策</h2><el-tag effect="plain">用户确认</el-tag></header>
                  <el-alert
                    v-for="warning in offerComparison.warnings"
                    :key="warning"
                    type="warning"
                    show-icon
                    :closable="false"
                    :title="warning"
                  />
                  <div v-if="offers.length" class="offer-list">
                    <article v-for="offer in offers" :key="offer.id" class="offer-row">
                      <div>
                        <strong>{{ offer.title || offer.companyName || `Offer #${offer.id}` }}</strong>
                        <span>{{ offer.status || '状态待确认' }} · 当前版本 {{ offer.currentVersion?.versionNo || '--' }}</span>
                        <p>
                          {{ offer.currentVersion?.currency || '币种待确认' }}
                          {{ offer.currentVersion?.totalCompensation ?? offer.currentVersion?.baseSalary ?? '金额待确认' }}
                          · 截止 {{ offer.currentVersion?.deadlineAt || '未设置' }}
                        </p>
                      </div>
                      <el-tag size="small" effect="plain" :type="offerStatusType(offer.status)">{{ offer.status || '状态待确认' }}</el-tag>
                    </article>
                  </div>
                  <AppState v-else type="empty" title="还没有 Offer" description="收到 Offer 后可记录版本、截止时间和最终决定。" />
                  <p class="muted offer-hint">比较只在同币种且金额足够时提供规则提示，不替你接受、拒绝或协商 Offer。</p>
                </article>
              </section>

              <section v-else-if="activeTab === 'contacts'" class="workspace-content">
                <el-alert
                  v-if="sectionErrors.contacts"
                  type="warning"
                  show-icon
                  :closable="false"
                  title="联系人或活动来源暂时不可用"
                  :description="sectionErrors.contacts"
                  data-testid="contacts-partial-failure"
                />
                <div class="workspace-grid">
                  <article class="workspace-section">
                    <header class="section-header"><h2>联系人</h2><el-tag effect="plain">隐私遮罩</el-tag></header>
                    <div v-if="contacts.length" class="contact-list">
                      <article v-for="contact in contacts" :key="contact.id" class="contact-row">
                        <div>
                          <strong>{{ contact.displayName || '未命名联系人' }}</strong>
                          <span>{{ contact.role || '角色待确认' }} · {{ contact.channelType || '渠道待确认' }}</span>
                          <p>{{ maskContactHint(contact.maskedContactHint) }}</p>
                          <small>{{ contact.relationshipSummary || '尚未记录关系摘要' }}</small>
                        </div>
                        <el-tag size="small" effect="plain">仅提示</el-tag>
                      </article>
                    </div>
                    <AppState v-else type="empty" title="还没有联系人" description="首期只保存显示名、角色、渠道和遮罩提示，不保存完整联系方式。" />
                  </article>
                  <article class="workspace-section">
                    <header class="section-header"><h2>活动台账</h2><el-tag effect="plain">只记录不发送</el-tag></header>
                    <div v-if="activities.length" class="activity-list">
                      <div v-for="activity in activities" :key="activity.id" class="activity-row">
                        <strong>{{ activity.type || '活动' }}</strong>
                        <span>{{ activity.happenedAt || '时间待确认' }} · {{ activity.status || '状态待确认' }}</span>
                        <p>{{ activity.summary || '暂无活动摘要' }}</p>
                      </div>
                    </div>
                    <AppState v-else type="empty" title="还没有活动记录" description="沟通草稿只能复制、编辑和记录，不提供发送接口。" />
                  </article>
                </div>
              </section>

              <section v-else-if="activeTab === 'research'" class="workspace-content">
                <article class="workspace-section">
                  <header class="section-header"><h2>研究证据</h2><el-tag effect="plain">来源可追踪</el-tag></header>
                  <el-alert
                    v-if="sectionErrors.research"
                    type="warning"
                    show-icon
                    :closable="false"
                    title="研究来源或快照暂时不可用"
                    :description="sectionErrors.research"
                    data-testid="research-partial-failure"
                  />
                  <div v-if="researchSources.length" class="source-list">
                    <article v-for="source in researchSources" :key="source.id" class="source-row">
                      <div>
                        <strong>{{ source.title || '未命名来源' }}</strong>
                        <span>{{ source.sourceType || '来源类型待确认' }} · {{ source.collectedAt || '采集时间待确认' }}</span>
                        <p>{{ source.active === false ? '已停用' : '当前有效来源版本' }} · {{ source.url || '未登记链接' }}</p>
                      </div>
                      <el-tag size="small" effect="plain" :type="source.active === false ? 'info' : 'success'">
                        {{ source.active === false ? '已停用' : '有效' }}
                      </el-tag>
                    </article>
                  </div>
                  <AppState v-else type="empty" title="还没有研究来源" description="可登记用户提供的 JD、官方链接或已有材料，不做无限制网页抓取。" />
                  <div v-if="researchSnapshot" class="research-snapshot">
                    <el-alert v-if="researchSnapshot.fallback" type="warning" show-icon :closable="false" title="本次研究使用规则降级结果" />
                    <div v-for="group in researchGroups" :key="group.label">
                      <h3>{{ group.label }}</h3>
                      <ul><li v-for="item in group.items" :key="item">{{ item }}</li></ul>
                    </div>
                  </div>
                </article>
              </section>
            </template>
          </el-tab-pane>
        </el-tabs>
      </template>
    </template>

    <el-dialog v-model="statusDialogVisible" title="确认机会状态变化" width="520px">
      <el-alert
        type="warning"
        show-icon
        :closable="false"
        title="状态变化会追加一条生命周期事件"
        description="系统只记录你的确认，不会自动联系招聘方，也不会替你接受或拒绝 Offer。"
      />
      <el-form label-position="top" class="status-form">
        <el-form-item label="下一状态">
          <el-select v-model="nextStatus" style="width: 100%">
            <el-option v-for="status in allowedStatuses" :key="status" :label="statusLabel(status)" :value="status" />
          </el-select>
        </el-form-item>
        <el-form-item label="确认备注">
          <el-input v-model="transitionReason" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="可补充这次状态变化的事实依据" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="transitioning" :disabled="!nextStatus" @click="confirmStatusTransition">
          确认状态变化
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

import {
  getApplicationWorkspaceV7Api,
  getActivitiesV7Api,
  getContactsV7Api,
  getInterviewProcessV7Api,
  getLatestResearchSnapshotV7Api,
  getOffersV7Api,
  getResearchSourcesV7Api,
  transitionApplicationStatusV7Api
} from '@/api/v7Career'
import AppState from '@/components/common/AppState.vue'
import { appConfig } from '@/config'
import {
  buildOfferComparison,
  getAllowedApplicationStatusTransitions,
  getWorkspacePartialFailures,
  getWorkspaceTabs,
  maskContactHint
} from '@/features/career-campaign/v7'
import type {
  ApplicationWorkspaceApplication,
  ApplicationWorkspaceVO,
  CareerActivityVO,
  CareerContactVO,
  CareerOfferVO,
  CareerResearchSnapshotVO,
  CareerResearchSourceVO,
  InterviewProcessVO,
  WorkspaceMaterial,
  WorkspaceNextStep,
  WorkspaceTimelineEvent,
  V7SectionKey
} from '@/types/v7/career'
import { getErrorMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()
const applicationId = computed(() => Number(route.params.id))
const workspace = ref<ApplicationWorkspaceVO>({})
const loading = ref(false)
const pageError = ref('')
const activeTab = ref<V7SectionKey>('overview')
const sectionErrors = reactive<Partial<Record<V7SectionKey, string>>>({})
const interviewProcess = ref<InterviewProcessVO | null>(null)
const offers = ref<CareerOfferVO[]>([])
const contacts = ref<CareerContactVO[]>([])
const activities = ref<CareerActivityVO[]>([])
const researchSources = ref<CareerResearchSourceVO[]>([])
const researchSnapshot = ref<CareerResearchSnapshotVO | null>(null)
const statusDialogVisible = ref(false)
const transitioning = ref(false)
const nextStatus = ref('')
const transitionReason = ref('')
const loadedTabs = new Set<V7SectionKey>()

const application = computed<ApplicationWorkspaceApplication>(() => workspace.value.application || { id: applicationId.value })
const backendTabs = computed(() => getWorkspaceTabs(workspace.value.capabilities))
const tabs = computed(() => backendTabs.value.filter((tab) => {
  if (tab.key === 'interview') return appConfig.enableV7RealInterview
  if (tab.key === 'offer') return appConfig.enableV7Offer
  if (tab.key === 'contacts') return appConfig.enableV7ContactActivity
  if (tab.key === 'research') return appConfig.enableV7Research
  return true
}))
const partialFailures = computed(() => getWorkspacePartialFailures(workspace.value))
const coverageSummary = computed(() => {
  const coverage = workspace.value.coverage
  if (!coverage) return { included: 0, unavailable: 0, failed: 0 }
  if ('included' in coverage || 'unavailable' in coverage || 'failed' in coverage) {
    return {
      included: Array.isArray(coverage.included) ? coverage.included.length : 0,
      unavailable: Array.isArray(coverage.unavailable) ? coverage.unavailable.length : 0,
      failed: Array.isArray(coverage.failed) ? coverage.failed.length : 0
    }
  }
  const entries = Object.values(coverage)
  return {
    included: entries.filter((item) => item?.available !== false).length,
    unavailable: entries.filter((item) => item?.available === false).length,
    failed: 0
  }
})
const timeline = computed<WorkspaceTimelineEvent[]>(() => listFromSection('timeline'))
const materials = computed<WorkspaceMaterial[]>(() => listFromSection('materials'))
const nextSteps = computed<WorkspaceNextStep[]>(() => listFromSection('next-steps'))
const offerComparison = computed(() => buildOfferComparison(offers.value))
const allowedStatuses = computed(() => getAllowedApplicationStatusTransitions(application.value.status))
const researchGroups = computed(() => [
  { label: '已确认事实', items: researchSnapshot.value?.facts || [] },
  { label: '未知项', items: researchSnapshot.value?.unknowns || [] },
  { label: '待确认问题', items: researchSnapshot.value?.questionsToVerify || [] },
  { label: '来源限制', items: researchSnapshot.value?.sourceLimits || [] }
].filter((group) => group.items.length))

const listFromSection = <T>(key: V7SectionKey): T[] => {
  const source = workspace.value.sections?.[key]?.data
  if (Array.isArray(source)) return source as T[]
  if (key === 'next-steps' && Array.isArray((workspace.value as { nextSteps?: unknown }).nextSteps)) {
    return (workspace.value as { nextSteps: T[] }).nextSteps
  }
  const direct = (workspace.value as unknown as Record<string, unknown>)[key]
  return Array.isArray(direct) ? direct as T[] : []
}

const loadWorkspace = async () => {
  if (!Number.isSafeInteger(applicationId.value) || applicationId.value <= 0) {
    pageError.value = '机会编号无效。'
    return
  }
  loading.value = true
  pageError.value = ''
  try {
    workspace.value = await getApplicationWorkspaceV7Api(applicationId.value)
    loadedTabs.clear()
    loadedTabs.add('overview')
    if (!activeTabAllowed(activeTab.value)) activeTab.value = 'overview'
    await loadTabData(activeTab.value)
  } catch (error) {
    workspace.value = {}
    pageError.value = getErrorMessage(error, '机会工作区暂时不可用，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const activeTabAllowed = (key: V7SectionKey) => tabs.value.some((tab) => tab.key === key)

const loadTabData = async (key: V7SectionKey) => {
  if (loadedTabs.has(key) || key === 'overview') return
  loadedTabs.add(key)
  if (key === 'interview') {
    await loadOptional(key, async () => { interviewProcess.value = await getInterviewProcessV7Api(applicationId.value) })
  } else if (key === 'offer') {
    await loadOptional(key, async () => { offers.value = await getOffersV7Api(applicationId.value) })
  } else if (key === 'contacts') {
    await loadOptional(key, async () => {
      const result = await Promise.allSettled([getContactsV7Api(applicationId.value), getActivitiesV7Api(applicationId.value)])
      contacts.value = result[0].status === 'fulfilled' ? result[0].value : []
      activities.value = result[1].status === 'fulfilled' ? result[1].value : []
      const failed = result.filter((item) => item.status === 'rejected').length
      if (failed) throw new Error('联系人或活动来源部分不可用。')
    })
  } else if (key === 'research') {
    await loadOptional(key, async () => {
      const result = await Promise.allSettled([getResearchSourcesV7Api(applicationId.value), getLatestResearchSnapshotV7Api(applicationId.value)])
      researchSources.value = result[0].status === 'fulfilled' ? result[0].value : []
      researchSnapshot.value = result[1].status === 'fulfilled' ? result[1].value : null
      const failed = result.filter((item) => item.status === 'rejected').length
      if (failed) throw new Error('研究来源或快照部分不可用。')
    })
  }
}

const loadOptional = async (key: V7SectionKey, task: () => Promise<void>) => {
  try {
    await task()
  } catch (error) {
    sectionErrors[key] = getErrorMessage(error, `${sectionLabel(key)}暂时不可用，请稍后重试。`)
  }
}

const openStatusDialog = () => {
  nextStatus.value = allowedStatuses.value[0] || ''
  transitionReason.value = ''
  statusDialogVisible.value = true
}

const confirmStatusTransition = async () => {
  if (!nextStatus.value || transitioning.value) return
  try {
    await ElMessageBox.confirm(
      `确认将机会状态改为“${statusLabel(nextStatus.value)}”？这会追加生命周期事件。`,
      '确认状态变化',
      { type: 'warning', confirmButtonText: '确认变化', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  transitioning.value = true
  try {
    const result = await transitionApplicationStatusV7Api(applicationId.value, {
      targetStatus: nextStatus.value,
      expectedLockVersion: application.value.lockVersion || workspace.value.lockVersion,
      idempotencyKey: `application-status:${applicationId.value}:${application.value.lockVersion || workspace.value.lockVersion || 0}:${nextStatus.value}`
    })
    workspace.value = {
      ...workspace.value,
      application: { ...application.value, ...result }
    }
    statusDialogVisible.value = false
    ElMessage.success('机会状态已更新。')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '状态变化失败，原状态未被自动覆盖。'))
  } finally {
    transitioning.value = false
  }
}

const statusLabel = (value?: string) => ({
  SAVED: '已保存',
  PREPARING: '准备中',
  APPLIED: '已投递',
  INTERVIEWING: '面试中',
  OFFER: '收到 Offer',
  ACCEPTED: '已接受',
  REJECTED: '已拒绝',
  CLOSED: '已关闭'
}[String(value || '').toUpperCase()] || '状态待确认')

const statusTagType = (value?: string) => ({
  ACCEPTED: 'success',
  OFFER: 'warning',
  REJECTED: 'danger',
  CLOSED: 'info'
}[String(value || '').toUpperCase()] || 'primary') as 'success' | 'warning' | 'danger' | 'info' | 'primary'

const priorityLabel = (value?: string) => ({
  HIGH: '高优先级',
  MEDIUM: '中优先级',
  LOW: '低优先级'
}[String(value || '').toUpperCase()] || '优先级待确认')

const priorityType = (value?: string) => ({
  HIGH: 'danger',
  MEDIUM: 'warning'
}[String(value || '').toUpperCase()] || 'info') as 'danger' | 'warning' | 'info'

const eventTypeLabel = (value?: string) => ({
  APPLIED: '已投递',
  FOLLOW_UP: '跟进',
  INTERVIEW: '面试',
  OFFER: 'Offer',
  REJECTION: '拒信',
  REVIEW: '复盘',
  CLOSED: '关闭'
}[String(value || '').toUpperCase()] || '机会事件')

const roundTypeLabel = (value?: string) => ({
  PHONE_SCREEN: '电话沟通',
  TECHNICAL_INTERVIEW: '技术面试',
  HR_INTERVIEW: 'HR 面试',
  FINAL_INTERVIEW: '终面'
}[String(value || '').toUpperCase()] || '面试轮次')

const offerStatusType = (value?: string) => ({
  ACCEPTED: 'success',
  DECLINED: 'danger',
  EXPIRED: 'info'
}[String(value || '').toUpperCase()] || 'warning') as 'success' | 'danger' | 'info' | 'warning'

const sectionLabel = (key: string) => ({
  interview: '面试',
  offer: 'Offer',
  contacts: '联系人',
  research: '研究',
  timeline: '时间线',
  materials: '材料',
  'next-steps': '下一步'
}[key] || key)

const WorkspaceList = defineComponent({
  props: {
    title: { type: String, required: true },
    items: { type: Array, default: () => [] },
    emptyTitle: { type: String, required: true },
    emptyDescription: { type: String, required: true },
    error: { type: String, default: '' }
  },
  setup(props, { slots }) {
    return () => h('article', { class: 'workspace-section' }, [
      h('header', { class: 'section-header' }, [h('h2', props.title)]),
      props.error ? h('div', { class: 'inline-warning', 'data-testid': 'workspace-section-error' }, props.error) : null,
      props.items.length
        ? h('div', { class: 'workspace-list' }, props.items.map((item, index) => slots.default?.({ item, index })))
        : h(AppState, { type: 'empty', title: props.emptyTitle, description: props.emptyDescription })
    ])
  }
})

watch(activeTab, (value) => { void loadTabData(value) })
onMounted(() => { void loadWorkspace() })
</script>

<style scoped lang="scss">
.application-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  width: 100%;
  min-width: 0;
}

.application-workspace > *,
.workspace-tabs,
.workspace-header,
.workspace-header__main,
.workspace-header__actions,
.workspace-content,
.workspace-section {
  min-width: 0;
}

.application-workspace :deep(.el-alert__content) {
  min-width: 0;
}

.application-workspace :deep(.el-alert__description) {
  overflow-wrap: anywhere;
  white-space: normal;
}

.workspace-header,
.workspace-header__actions,
.section-header,
.timeline-row,
.material-row,
.next-step-row,
.round-row,
.offer-row,
.contact-row,
.activity-row,
.source-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.workspace-header {
  align-items: flex-end;
  padding: 16px 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.48);
}

.workspace-header__main > .el-button {
  padding: 0;
  margin-bottom: 10px;
}

.workspace-eyebrow {
  display: block;
  color: #93c5fd;
  font-size: 12px;
  font-weight: 700;
}

.workspace-header h1,
.workspace-header p {
  margin: 0;
}

.workspace-header h1 {
  margin-top: 5px;
  font-size: 24px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.workspace-header p {
  margin-top: 6px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.workspace-header__actions {
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.workspace-tabs :deep(.el-tabs__nav-wrap) {
  overflow-x: auto;
}

.workspace-tabs :deep(.el-tabs__nav) {
  min-width: max-content;
}

.workspace-content {
  display: grid;
  gap: 14px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.workspace-grid--overview {
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.6fr);
}

.workspace-section {
  min-width: 0;
  padding: 16px 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.34);
}

.section-header {
  align-items: center;
  margin-bottom: 13px;
}

.section-header h2 {
  margin: 0;
  font-size: 16px;
}

.fact-grid,
.review-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.fact-grid div {
  min-width: 0;
  padding: 10px;
  border-radius: 6px;
  background: rgba(2, 6, 23, 0.28);
}

dt,
dd {
  margin: 0;
  line-height: 1.5;
}

dt {
  color: var(--app-text-muted);
  font-size: 11px;
}

dd {
  margin-top: 4px;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.coverage-list {
  display: grid;
  gap: 8px;
}

.coverage-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--app-border);
}

.coverage-list span,
.muted,
.timeline-row span,
.material-row span,
.next-step-row span,
.round-row span,
.offer-row span,
.contact-row span,
.contact-row small,
.activity-row span,
.source-row span {
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.workspace-note,
.timeline-row p,
.next-step-row p,
.round-row p,
.offer-row p,
.contact-row p,
.activity-row p,
.source-row p {
  margin: 0;
  color: var(--app-text-secondary, var(--app-text-muted));
  line-height: 1.65;
}

.workspace-list,
.round-list,
.offer-list,
.contact-list,
.activity-list,
.source-list {
  display: grid;
}

.timeline-row,
.material-row,
.next-step-row,
.round-row,
.offer-row,
.contact-row,
.activity-row,
.source-row {
  padding: 12px 0;
  border-top: 1px solid var(--app-border);
}

.timeline-row > div:last-child,
.material-row > div:first-child,
.next-step-row > div:first-child,
.round-row > div:first-child,
.offer-row > div:first-child,
.contact-row > div:first-child,
.activity-row,
.source-row > div:first-child {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.timeline-marker {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--el-color-primary);
}

.inline-warning {
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 6px;
  color: #fcd34d;
  font-size: 12px;
  line-height: 1.55;
}

.offer-hint {
  margin: 13px 0 0;
}

.research-snapshot {
  display: grid;
  gap: 12px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--app-border);
}

.research-snapshot h3 {
  margin: 0 0 5px;
  font-size: 13px;
}

.research-snapshot ul {
  display: grid;
  gap: 5px;
  margin: 0;
  padding-left: 20px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.status-form {
  margin-top: 16px;
}

@media (max-width: 780px) {
  .workspace-header,
  .workspace-header__actions,
  .timeline-row,
  .material-row,
  .next-step-row,
  .round-row,
  .offer-row,
  .contact-row,
  .source-row {
    align-items: stretch;
    flex-direction: column;
  }

  .workspace-header__actions {
    justify-content: flex-start;
  }

  .workspace-grid,
  .workspace-grid--overview,
  .fact-grid {
    grid-template-columns: 1fr;
  }
}
</style>
