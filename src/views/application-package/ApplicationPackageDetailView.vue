<template>
  <div class="application-package-page">
    <section class="package-hero">
      <div>
        <div class="hero-kicker">
          <PackageCheck :size="16" />
          投前准备台
        </div>
        <h1>{{ packageTitle }}</h1>
        <p>{{ packageSubtitle }}</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push(backTarget)">
          <ArrowLeft :size="16" />
          返回来源
        </el-button>
        <el-button :loading="loading" @click="handleRefresh">
          <RefreshCw :size="16" />
          刷新
        </el-button>
        <el-button
          v-if="appConfig.enableV9EvidenceLearning && currentPackage?.currentSnapshotId"
          data-testid="application-package-usages"
          @click="openEvidenceUsages"
        >
          <ClipboardCheck :size="16" />
          查看本次使用快照
        </el-button>
        <el-button
          v-if="appConfig.enableV9EvidenceLearning && currentPackage?.currentSnapshotId && currentPackage?.jobApplicationId"
          data-testid="record-application-package-usage"
          :loading="recordingEvidenceUsage"
          @click="recordCurrentPackageUsage"
        >
          <ClipboardCheck :size="16" />
          记录本次使用
        </el-button>
        <el-button
          type="primary"
          :loading="applicationCreating"
          :disabled="loading || !currentPackage"
          @click="handleApplicationEntry"
        >
          <Briefcase :size="16" />
          {{ applicationEntryLabel }}
        </el-button>
      </div>
    </section>

    <section v-if="loading && !currentPackage" class="content-panel">
      <AppState type="loading" title="正在生成投递包预览" description="正在聚合岗位描述、简历版本、匹配报告和项目证据。" />
    </section>

    <section v-else-if="loadError && !currentPackage" class="content-panel">
      <AppState
        type="error"
        title="投递包详情暂时无法读取"
        :description="loadError"
      >
        <el-button type="primary" :loading="loading" @click="loadPackage">重试</el-button>
        <el-button @click="router.push('/application-packages/preview')">返回预览</el-button>
      </AppState>
    </section>

    <section v-else-if="emptyStateVisible" class="content-panel">
      <AppState
        type="empty"
        title="还没有可生成投递包的岗位上下文"
        description="请先从目标岗位分析页或岗位匹配报告进入。页面不会在缺少岗位描述、简历或证据时补造结论。"
      >
        <el-button type="primary" @click="router.push('/job-targets')">选择目标岗位</el-button>
        <el-button @click="router.push('/resume-match')">进入岗位匹配实验台</el-button>
      </AppState>
    </section>

    <template v-else-if="currentPackage">
      <section v-if="loadError" class="content-panel degraded-panel">
        <el-alert
          type="warning"
          show-icon
          :closable="false"
          title="投递包接口暂不可用，已展示降级预览"
          :description="loadError"
        />
        <p>降级预览只展示已知上下文和补齐动作，不会给出直接投递建议，也不会自动创建投递记录。</p>
      </section>

      <section v-if="versionNoticeVisible" class="content-panel version-panel">
        <el-alert
          :type="currentPackage.latestContextPackage ? 'success' : 'warning'"
          show-icon
          :closable="false"
          :title="versionNoticeTitle"
          :description="versionNoticeDescription"
        />
        <el-button
          v-if="!currentPackage.latestContextPackage && currentPackage.latestContextPackageId"
          type="primary"
          plain
          @click="router.push(`/application-packages/${encodeURIComponent(String(currentPackage?.latestContextPackageId))}`)"
        >
          查看最新版本
        </el-button>
      </section>

      <section class="readiness-workbench">
        <article class="content-panel readiness-card" :class="`readiness-card--${readinessTone}`">
          <span>投递就绪状态</span>
          <strong>{{ readinessLabel }}</strong>
          <p>{{ currentPackage.readinessReason || '投递准备状态正在汇总，请结合关键缺口确认下一步。' }}</p>
          <div class="meta-tags">
            <el-tag v-if="currentPackage.fallback || currentPackage.degraded" type="warning" effect="plain">降级结果</el-tag>
            <el-tag v-if="currentPackage.resultSource" effect="plain">{{ resultSourceLabel }}</el-tag>
          </div>
        </article>

        <article class="content-panel gaps-card">
          <div class="section-head">
            <div>
              <h2>关键缺口</h2>
              <p>{{ checklistBlockedCount ? `当前有 ${checklistBlockedCount} 项需要处理` : '当前没有明确阻塞项' }}</p>
            </div>
          </div>
          <div v-if="criticalGaps.length" class="critical-gaps">
            <article v-for="item in criticalGaps" :key="item.key || item.title">
              <span :class="`check-dot check-dot--${statusTone(item.status)}`" />
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.description || checklistDefaultDescription(item.status) }}</p>
              </div>
              <el-button v-if="item.actionPath" text type="primary" @click="pushSafeAppPath(item.actionPath)">
                {{ item.actionLabel || '去处理' }}
              </el-button>
            </article>
          </div>
          <p v-else class="gaps-empty">可继续在下方确认完整检查清单与材料细节。</p>
          <div class="primary-action">
            <p>{{ primaryActionDescription }}</p>
            <el-button
              type="primary"
              :loading="primaryActionLoading"
              @click="handlePrimaryAction"
            >
              {{ primaryActionLabel }}
            </el-button>
          </div>
        </article>
      </section>

      <section class="detail-tabs" aria-label="投前准备详情">
        <el-tabs v-model="activeDetailTab">
          <el-tab-pane name="checklist">
            <template #label>完整检查清单</template>
            <div class="tab-grid tab-grid--checklist">
              <article class="content-panel checklist-panel">
                <div class="section-head">
                  <div>
                    <h2>投递前检查清单</h2>
                    <p>未满足项会明确暴露缺口，不替用户作出投递决定。</p>
                  </div>
                  <el-tag :type="checklistBlockedCount ? 'warning' : 'success'" effect="plain">
                    {{ checklistBlockedCount ? `${checklistBlockedCount} 项待处理` : '检查通过' }}
                  </el-tag>
                </div>
                <div class="checklist">
                  <article v-for="item in checklistItems" :key="item.key || item.title" class="checklist-item">
                    <span :class="`check-dot check-dot--${statusTone(item.status)}`" />
                    <div>
                      <strong>{{ item.title }}</strong>
                      <p>{{ item.description || checklistDefaultDescription(item.status) }}</p>
                    </div>
                    <el-button v-if="item.actionPath" text type="primary" @click="pushSafeAppPath(item.actionPath)">
                      {{ item.actionLabel || '去处理' }}
                    </el-button>
                  </article>
                </div>
              </article>

              <aside class="content-panel action-panel">
                <h2>后续行动</h2>
                <p>行动只进入准备、记录或训练流程，不会自动投递、发送消息或共享数据。</p>
                <div v-if="nextActions.length" class="next-actions">
                  <article v-for="action in nextActions" :key="String(action.id || action.title)">
                    <strong>{{ action.title }}</strong>
                    <p>{{ action.description || '根据当前投递包上下文生成的待确认行动。' }}</p>
                    <el-button
                      v-if="action.actionUrl || action.actionPath || action.actionCode || action.actionType || action.id"
                      size="small"
                      :loading="executingActionKey === actionExecutionKey(action)"
                      @click="handleActionClick(action)"
                    >
                      {{ actionButtonLabel(action) }}
                    </el-button>
                  </article>
                </div>
                <AppState
                  v-else
                  type="empty"
                  title="暂无待执行行动"
                  description="请结合检查清单确认是否需要补齐岗位、简历或证据。"
                />
              </aside>
            </div>
          </el-tab-pane>

          <el-tab-pane name="materials">
            <template #label>材料与匹配</template>
            <div class="tab-stack">
              <article class="content-panel context-card">
                <div class="section-head">
                  <div>
                    <h2>岗位与简历</h2>
                    <p>{{ currentPackage.job?.jdSummary || '投递材料将围绕当前岗位上下文组织。' }}</p>
                  </div>
                  <el-tag type="info" effect="plain">{{ jobSourceLabel }}</el-tag>
                </div>
                <dl class="compact-facts compact-facts--overview">
                  <div>
                    <dt>公司</dt>
                    <dd>{{ currentPackage.companyName || currentPackage.job?.companyName || '--' }}</dd>
                  </div>
                  <div>
                    <dt>岗位</dt>
                    <dd>{{ currentPackage.jobTitle || currentPackage.job?.jobTitle || '--' }}</dd>
                  </div>
                  <div>
                    <dt>推荐简历</dt>
                    <dd>{{ resumeVersionLabel }}</dd>
                  </div>
                  <div>
                    <dt>匹配情况</dt>
                    <dd>{{ matchScoreText }}</dd>
                  </div>
                </dl>
              </article>

              <ResumeArtifactDeliveryPanel
                :resume-version-id="interviewContext.resumeVersionId"
                :application-package-id="isPersistedPackageRoute ? packageId : undefined"
              />
              <article class="content-panel">
                <div class="section-head">
                  <div>
                    <h2>推荐简历与匹配结果</h2>
                    <p>推荐理由来自简历版本、岗位匹配报告或明确的降级说明。</p>
                  </div>
                  <el-tag :type="matchTrustTag.type" effect="plain">{{ matchTrustTag.label }}</el-tag>
                </div>
                <div class="resume-match-grid">
                  <div>
                    <span>推荐简历</span>
                    <strong>{{ resumeVersionLabel }}</strong>
                    <p>{{ currentPackage.recommendedResume?.reason || '暂无可解释推荐理由，请先补齐简历版本或重新生成匹配报告。' }}</p>
                  </div>
                  <div>
                    <span>匹配报告</span>
                    <strong>{{ matchScoreText }}</strong>
                    <p>{{ matchSummaryText }}</p>
                  </div>
                </div>
                <div class="link-actions">
                  <el-button
                    :disabled="!currentPackage.matchReportId"
                    @click="router.push(`/resume-match/${currentPackage.matchReportId}`)"
                  >
                    查看匹配报告
                  </el-button>
                  <el-button
                    :disabled="!currentPackage.recommendedResumeVersionId"
                    @click="goResumeVersion"
                  >
                    查看简历版本
                  </el-button>
                </div>
              </article>
            </div>
          </el-tab-pane>

          <el-tab-pane name="evidence">
            <template #label>证据覆盖</template>
            <article class="content-panel">
              <div class="section-head">
                <div>
                  <h2>项目证据覆盖</h2>
                  <p>展示已有支撑、证据不足项与建议补充内容。</p>
                </div>
                <el-tag effect="plain">{{ evidenceCoverageText }}</el-tag>
              </div>
              <div v-if="evidenceCoverageItems.length" class="coverage-list">
                <article v-for="item in evidenceCoverageItems" :key="item.requirement || item.gap">
                  <div class="coverage-head">
                    <strong>{{ item.requirement || '岗位要求' }}</strong>
                    <el-tag :type="statusTagType(item.status)" effect="plain">{{ statusLabel(item.status) }}</el-tag>
                  </div>
                  <p>{{ item.coverageSummary || item.gap || '当前要求还没有形成明确证据覆盖。' }}</p>
                  <small v-if="item.suggestedSupplement">建议补充：{{ item.suggestedSupplement }}</small>
                </article>
              </div>
              <AppState
                v-else
                type="empty"
                title="暂无项目证据覆盖"
                description="还没有可展示的证据覆盖结果。建议先补项目证据或等待投递包接口返回。"
              >
                <el-button @click="router.push('/project-evidence')">去项目证据库</el-button>
              </AppState>
            </article>
          </el-tab-pane>

          <el-tab-pane name="trust">
            <template #label>风险与依据</template>
            <div class="tab-grid">
              <article class="content-panel">
                <div class="section-head">
                  <div>
                    <h2>风险与可信边界</h2>
                    <p>低证据、降级结果或样本不足会在这里明确标出。</p>
                  </div>
                </div>
                <div v-if="riskSignals.length" class="risk-list">
                  <article v-for="risk in riskSignals" :key="risk.key || risk.title" :class="`risk-card risk-card--${riskTone(risk.level)}`">
                    <strong>{{ risk.title }}</strong>
                    <p>{{ risk.description || '该风险需要人工复核。' }}</p>
                    <small v-if="risk.mitigation">处理建议：{{ risk.mitigation }}</small>
                  </article>
                </div>
                <AppState
                  v-else
                  type="empty"
                  title="暂无明确风险提示"
                  description="仍请结合材料与岗位要求进行人工确认。"
                />
              </article>

              <article class="content-panel">
                <div class="section-head">
                  <div>
                    <h2>建议依据与链路标识</h2>
                    <p>关键建议会展示置信程度、降级状态与可追溯标识。</p>
                  </div>
                </div>
                <div v-if="currentPackage.trace?.traceId" class="trace-row">
                  <span>投递包链路标识</span>
                  <code>{{ currentPackage.trace.traceId }}</code>
                </div>
                <div v-if="suggestions.length" class="suggestion-list">
                  <article v-for="suggestion in suggestions" :key="suggestion.id" class="suggestion-card">
                    <div>
                      <strong>{{ suggestion.title || suggestion.content || '待确认建议' }}</strong>
                      <p>{{ suggestion.reason || suggestion.content || '当前建议缺少详细说明，请结合证据来源复核。' }}</p>
                    </div>
                    <div class="meta-tags">
                      <el-tag effect="plain">{{ confidenceLabel(suggestion.confidenceLevel || suggestion.confidence) }}</el-tag>
                      <el-tag v-if="suggestion.fallback || suggestion.degraded || suggestion.mock" type="warning" effect="plain">降级或模拟结果</el-tag>
                      <el-tag v-if="suggestion.trace?.traceId" type="info" effect="plain">链路标识 {{ suggestion.trace.traceId }}</el-tag>
                    </div>
                  </article>
                </div>
                <AppState
                  v-else
                  type="empty"
                  title="暂无明确建议"
                  description="当前没有足够证据生成明确建议。请先补齐岗位描述分析、简历匹配或项目证据。"
                />
              </article>
            </div>
          </el-tab-pane>

          <el-tab-pane name="interview">
            <template #label>面试准备</template>
            <article class="content-panel interview-panel">
              <div class="section-head">
                <div>
                  <h2>面试上下文</h2>
                  <p>可使用当前岗位、简历、匹配和项目证据创建带上下文的文字模拟面试。</p>
                </div>
              </div>
              <dl class="compact-facts">
                <div>
                  <dt>目标岗位编号</dt>
                  <dd>{{ interviewContext.targetJobId || '--' }}</dd>
                </div>
                <div>
                  <dt>简历版本编号</dt>
                  <dd>{{ interviewContext.resumeVersionId || '--' }}</dd>
                </div>
                <div>
                  <dt>匹配报告编号</dt>
                  <dd>{{ interviewContext.matchReportId || '--' }}</dd>
                </div>
                <div>
                  <dt>项目证据</dt>
                  <dd>{{ interviewContext.projectEvidenceIds?.length || 0 }} 项</dd>
                </div>
              </dl>
              <div class="link-actions">
                <el-button type="primary" :disabled="!interviewContext.targetJobId" @click="goInterviewCreate">
                  创建岗位面试
                </el-button>
                <el-button @click="router.push('/interviews/history')">查看面试记录</el-button>
              </div>
            </article>
          </el-tab-pane>
        </el-tabs>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ArrowLeft, Briefcase, ClipboardCheck, PackageCheck, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  createApplicationPackageApi,
  executeApplicationPackageActionApi,
  getApplicationPackageApi,
  refreshApplicationPackageApi,
  previewApplicationPackageApi
} from '@/api/applicationPackage'
import { createEvidenceUsageApi } from '@/api/evidenceAsset'
import AppState from '@/components/common/AppState.vue'
import { appConfig } from '@/config'
import ResumeArtifactDeliveryPanel from '@/views/resume/components/ResumeArtifactDeliveryPanel.vue'
import type {
  ApplicationPackageChecklistItemVO,
  ApplicationPackageEvidenceCoverageItemVO,
  ApplicationPackagePreviewParams,
  ApplicationPackageProjectEvidenceSummaryVO,
  CareerActionItemVO,
  CareerRiskSignalVO,
  JobApplicationPackageVO
} from '@/types/applicationPackage'
import type { ExplainableSuggestionVO } from '@/types/suggestion'
import { defaultUserKnownPaths, resolveAppRoutePath } from '@/features/route-safety'
import { getErrorMessage } from '@/utils/error'
import { createStableOperationIdempotencyKey } from '@/utils/idempotency'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const applicationCreating = ref(false)
const recordingEvidenceUsage = ref(false)
const executingActionKey = ref('')
const loadError = ref('')
const currentPackage = ref<JobApplicationPackageVO | null>(null)
const activeDetailTab = ref('checklist')
let packageRequestId = 0

const openEvidenceUsages = () => {
  const snapshotId = currentPackage.value?.currentSnapshotId
  if (!snapshotId) return
  void router.push({
    path: '/evidence-assets',
    query: {
      tab: 'usages',
      assetType: 'APPLICATION_PACKAGE_SNAPSHOT',
      packageSnapshotId: String(snapshotId)
    }
  })
}

const recordCurrentPackageUsage = async () => {
  const pack = currentPackage.value
  const applicationId = pack?.jobApplicationId
  const snapshotId = toPositiveNumber(pack?.currentSnapshotId)
  const snapshotVersion = toPositiveNumber(pack?.snapshotVersion)
  if (!applicationId || !snapshotId || !snapshotVersion || recordingEvidenceUsage.value) return
  recordingEvidenceUsage.value = true
  try {
    await createEvidenceUsageApi(applicationId, {
      assetType: 'APPLICATION_PACKAGE_SNAPSHOT',
      assetId: snapshotId,
      assetVersion: String(snapshotVersion),
      packageSnapshotId: snapshotId,
      usageScene: 'APPLICATION_SUBMISSION',
      idempotencyKey: createStableOperationIdempotencyKey(
        `evidence-usage:package:${applicationId}:${snapshotId}:APPLICATION_SUBMISSION`,
        snapshotVersion
      )
    })
    ElMessage.success('本次投递包使用已记录；重复点击会返回同一条记录。')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '本次使用暂未记录，请确认投递包快照仍然有效。'))
  } finally {
    recordingEvidenceUsage.value = false
  }
}

const toPositiveNumber = (value: unknown): number | undefined => {
  const raw = Array.isArray(value) ? value[0] : value
  const numberValue = Number(raw)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
}

const queryText = (key: string) => {
  const value = route.query[key]
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined
}

const packageId = computed(() => {
  const raw = route.params.id
  const id = Array.isArray(raw) ? raw[0] : raw
  return typeof id === 'string' && id.trim() ? id.trim() : ''
})

const isPersistedPackageRoute = computed(() => Boolean(packageId.value))

const previewParams = computed<ApplicationPackagePreviewParams>(() => ({
  targetJobId: toPositiveNumber(route.query.targetJobId),
  jdAnalysisId: toPositiveNumber(route.query.jdAnalysisId),
  resumeVersionId: toPositiveNumber(route.query.resumeVersionId),
  matchReportId: toPositiveNumber(route.query.matchReportId)
}))

const hasPreviewContext = computed(() =>
  Boolean(
    packageId.value ||
    previewParams.value.targetJobId ||
    previewParams.value.jdAnalysisId ||
    previewParams.value.resumeVersionId ||
    previewParams.value.matchReportId
  )
)

const hasLoadContext = computed(() => isPersistedPackageRoute.value || hasPreviewContext.value)

const buildFallbackPackage = (): JobApplicationPackageVO => {
  const params = previewParams.value
  const jobTitle = queryText('jobTitle') || '目标岗位待确认'
  const companyName = queryText('companyName') || ''
  const resumeVersionId = params.resumeVersionId
  const matchReportId = params.matchReportId
  const targetJobId = params.targetJobId
  const jdAnalysisId = params.jdAnalysisId

  return {
    id: packageId.value || 'preview-degraded',
    targetJobId,
    jdAnalysisId,
    recommendedResumeVersionId: resumeVersionId,
    matchReportId,
    projectEvidenceIds: [],
    readinessLevel: 'BLOCKED',
    readinessReason: '投递包聚合接口暂不可用或上下文不足，当前只展示待补齐项，不生成直接投递建议。',
    resultSource: 'DEGRADED_PREVIEW',
    fallback: true,
    degraded: true,
    degradedReason: loadError.value || '投递包预览已降级。',
    job: {
      targetJobId,
      jdAnalysisId,
      companyName,
      jobTitle,
      jdSource: queryText('jdSource') || '路由上下文',
      jdSummary: '请确认岗位描述分析、简历版本、项目证据和匹配报告后再创建投递记录。'
    },
    recommendedResume: {
      resumeVersionId,
      reason: resumeVersionId ? '路由已携带简历版本，但仍需投递包接口确认推荐理由。' : '缺少可推荐的简历版本。'
    },
    matchResult: {
      matchReportId,
      trustStatus: 'FALLBACK',
      fallback: true,
      degraded: true,
      summary: matchReportId ? '路由已携带匹配报告，详情需要进入报告页确认。' : '缺少匹配报告，无法判断简历与岗位描述匹配度。'
    },
    checklist: [
      {
        key: 'jd-analysis',
        title: '岗位描述已解析',
        status: jdAnalysisId || targetJobId ? 'WARN' : 'BLOCKED',
        description: jdAnalysisId ? '已携带岗位描述分析编号，仍需接口确认结构化结果。' : '请先完成岗位描述分析。',
        actionLabel: '查看岗位分析',
        actionPath: targetJobId ? `/job-targets/${targetJobId}/analysis` : '/job-targets'
      },
      {
        key: 'resume-version',
        title: '有可用简历版本',
        status: resumeVersionId ? 'WARN' : 'BLOCKED',
        description: resumeVersionId ? '已携带简历版本，仍需确认是否适配当前岗位描述。' : '请先选择或生成简历版本。',
        actionLabel: '查看简历版本',
        actionPath: '/resume-versions'
      },
      {
        key: 'match-report',
        title: '简历与岗位描述匹配报告可用',
        status: matchReportId ? 'WARN' : 'BLOCKED',
        description: matchReportId ? '已携带匹配报告，请进入报告页确认可信状态。' : '建议先生成匹配报告。',
        actionLabel: matchReportId ? '查看报告' : '去匹配实验台',
        actionPath: matchReportId ? `/resume-match/${matchReportId}` : '/resume-match'
      },
      {
        key: 'project-evidence',
        title: '核心技能有项目证据支撑',
        status: 'PENDING',
        description: '降级预览无法判断证据覆盖，请进入项目证据库补齐或等待接口返回覆盖结果。',
        actionLabel: '补项目证据',
        actionPath: '/project-evidence'
      },
      {
        key: 'interview-context',
        title: '已预留面试准备上下文',
        status: targetJobId ? 'WARN' : 'PENDING',
        description: '可从投递包进入文本模拟面试；语音面试仍属于后续阶段预留。'
      }
    ],
    riskSignals: [
      {
        key: 'degraded-preview',
        title: '当前是降级预览',
        level: 'HIGH',
        description: '缺少后端聚合结果时，不输出“可以投”的强结论。',
        mitigation: '补齐岗位描述、简历、匹配报告和项目证据后刷新投递包。'
      }
    ],
    actions: [
      {
        id: 'review-context',
        actionType: 'UPDATE_RESUME_VERSION',
        title: '先补齐投递包上下文',
        description: '确认岗位描述分析、推荐简历、匹配报告和项目证据后，再创建投递记录。',
        priority: 'HIGH',
        actionUrl: targetJobId ? `/job-targets/${targetJobId}/analysis` : '/job-targets'
      }
    ],
    evidenceCoverage: [],
    suggestions: [],
    evidenceSources: [],
    interviewContext: {
      targetJobId,
      resumeVersionId,
      matchReportId,
      projectEvidenceIds: []
    }
  }
}

const loadPackage = async () => {
  const requestId = ++packageRequestId
  const requestPath = route.fullPath
  const isCurrentRequest = () => requestId === packageRequestId && route.fullPath === requestPath

  if (!hasLoadContext.value) {
    if (isCurrentRequest()) {
      currentPackage.value = null
      loadError.value = ''
      loading.value = false
    }
    return
  }

  loading.value = true
  loadError.value = ''
  currentPackage.value = null
  try {
    const nextPackage = isPersistedPackageRoute.value
      ? await getApplicationPackageApi(packageId.value)
      : await previewApplicationPackageApi(previewParams.value)
    if (!isCurrentRequest()) return

    currentPackage.value = nextPackage
  } catch (error) {
    if (!isCurrentRequest()) return

    loadError.value = getErrorMessage(error, '投递包接口暂不可用，已切换为降级预览。')
    currentPackage.value = isPersistedPackageRoute.value ? null : buildFallbackPackage()
  } finally {
    if (isCurrentRequest()) {
      loading.value = false
    }
  }
}

const handleRefresh = async () => {
  if (!isPersistedPackageRoute.value) {
    await loadPackage()
    return
  }

  const requestId = ++packageRequestId
  const requestPath = route.fullPath
  const targetPackageId = packageId.value
  const isCurrentRequest = () =>
    requestId === packageRequestId &&
    route.fullPath === requestPath &&
    packageId.value === targetPackageId

  loading.value = true
  loadError.value = ''
  try {
    const nextPackage = await refreshApplicationPackageApi(targetPackageId)
    if (!isCurrentRequest()) return

    currentPackage.value = nextPackage
    ElMessage.success('投递包已刷新。')
  } catch (error) {
    if (!isCurrentRequest()) return

    loadError.value = getErrorMessage(error, '投递包刷新失败，已保留当前详情。')
    ElMessage.error(loadError.value)
  } finally {
    if (isCurrentRequest()) {
      loading.value = false
    }
  }
}

const emptyStateVisible = computed(() => !loading.value && !currentPackage.value && !hasLoadContext.value)
const packageTitle = computed(() => {
  const job = currentPackage.value?.job
  return currentPackage.value?.jobTitle || job?.jobTitle || queryText('jobTitle') || '岗位投递包预览'
})
const packageSubtitle = computed(() => {
  const job = currentPackage.value?.job
  const company = currentPackage.value?.companyName || job?.companyName || queryText('companyName')
  const parts = [
    company,
    currentPackage.value?.recommendedResume?.resumeVersionName || currentPackage.value?.recommendedResume?.versionName,
    currentPackage.value?.matchReportId ? `匹配报告 #${currentPackage.value.matchReportId}` : ''
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : '围绕一个岗位描述汇总简历、证据、风险、检查清单和下一步行动。'
})
const jobSourceLabel = computed(() => {
  const source = String(currentPackage.value?.job?.jdSource || '').toUpperCase()
  const labels: Record<string, string> = {
    JOB_TARGET: '目标岗位',
    JD_ANALYSIS: '岗位描述分析',
    MANUAL: '手动录入'
  }
  return labels[source] || '目标岗位'
})
const resultSourceLabel = computed(() => {
  const source = String(currentPackage.value?.resultSource || '').toUpperCase()
  const labels: Record<string, string> = {
    DEGRADED_PREVIEW: '降级预览',
    APPLICATION_PACKAGE: '投递包结果',
    PREVIEW: '预览结果'
  }
  return `结果来源：${labels[source] || '已标记'}`
})

const versionNoticeVisible = computed(() => (currentPackage.value?.contextPackageCount || 0) > 1)
const versionNoticeTitle = computed(() => {
  const pack = currentPackage.value
  const versionNo = pack?.contextVersionNo || pack?.snapshotVersion || 1
  const count = pack?.contextPackageCount || 1
  return pack?.latestContextPackage ? `当前为最新投递包版本（第 ${versionNo}/${count} 版）` : `当前为历史投递包版本（第 ${versionNo}/${count} 版）`
})
const versionNoticeDescription = computed(() => {
  const pack = currentPackage.value
  if (!pack) return ''
  if (pack.latestContextPackage) {
    return '同一岗位、简历版本和匹配报告下允许保留多份快照，便于回看不同准备阶段。'
  }
  const latest = pack.latestContextPackageNo || (pack.latestContextPackageId ? `#${pack.latestContextPackageId}` : '最新版本')
  return `同一上下文下还有更新的投递包 ${latest}，本页保留历史快照和事件轨迹。`
})

const backTarget = computed(() => {
  const targetJobId = currentPackage.value?.targetJobId || previewParams.value.targetJobId
  const matchReportId = currentPackage.value?.matchReportId || previewParams.value.matchReportId
  if (matchReportId) return `/resume-match/${matchReportId}`
  if (targetJobId) return `/job-targets/${targetJobId}/analysis`
  return '/job-targets'
})

const readinessMap: Record<string, { label: string; tone: string }> = {
  READY: { label: '可以准备投递', tone: 'success' },
  NEEDS_RESUME: { label: '先改简历', tone: 'warning' },
  NEEDS_EVIDENCE: { label: '先补证据', tone: 'warning' },
  NEEDS_TRAINING: { label: '先练面试', tone: 'info' },
  BLOCKED: { label: '暂不建议继续', tone: 'danger' }
}

const readinessInfo = computed(() => {
  const key = String(currentPackage.value?.readinessLevel || '').toUpperCase()
  return readinessMap[key] || { label: '待判断', tone: 'info' }
})
const readinessLabel = computed(() => readinessInfo.value.label)
const readinessTone = computed(() => readinessInfo.value.tone)

const statusTone = (status?: string) => {
  const key = String(status || '').toUpperCase()
  if (key === 'PASS' || key === 'READY') return 'success'
  if (key === 'WARN' || key === 'PENDING') return 'warning'
  if (key === 'BLOCKED' || key === 'FAILED') return 'danger'
  return 'info'
}
const statusLabel = (status?: string) => {
  const key = String(status || '').toUpperCase()
  const map: Record<string, string> = {
    PASS: '已满足',
    WARN: '待复核',
    BLOCKED: '需补齐',
    PENDING: '待生成'
  }
  return map[key] || '待确认'
}
const statusTagType = (status?: string): 'success' | 'warning' | 'danger' | 'info' => {
  const tone = statusTone(status)
  if (tone === 'success') return 'success'
  if (tone === 'warning') return 'warning'
  if (tone === 'danger') return 'danger'
  return 'info'
}
const checklistDefaultDescription = (status?: string) => {
  const tone = statusTone(status)
  if (tone === 'success') return '当前检查项已满足。'
  if (tone === 'danger') return '该检查项缺失，建议先补齐。'
  return '该检查项需要人工复核。'
}

const checklistItems = computed<ApplicationPackageChecklistItemVO[]>(() =>
  (currentPackage.value?.checklist || []).map((item) => {
    const severity = String(item.severity || '').toUpperCase()
    const status = item.status || (item.passed ? 'PASS' : severity === 'HIGH' ? 'BLOCKED' : 'WARN')
    return {
      ...item,
      title: item.title || item.label || '待确认检查项',
      status,
      description: item.description || item.reason,
      actionPath: item.actionPath || item.actionUrl
    }
  })
)
const checklistBlockedCount = computed(() =>
  checklistItems.value.filter((item) => ['WARN', 'BLOCKED', 'PENDING'].includes(String(item.status || '').toUpperCase())).length
)
const criticalGaps = computed(() =>
  checklistItems.value
    .filter((item) => statusTone(item.status) !== 'success')
    .slice(0, 3)
)
const isDirectApplicationAction = (action?: CareerActionItemVO | null) =>
  ['CREATE_APPLICATION', 'CREATE_APPLICATION_RECORD', 'SET_FOLLOW_UP', 'SET_FOLLOW_UP_PLAN']
    .includes(String(action?.actionType || '').toUpperCase())
const nextActions = computed<CareerActionItemVO[]>(() => {
  const pack = currentPackage.value
  const actions = pack?.actions || []
  if (!pack?.fallback && !pack?.degraded && pack?.id !== 'preview-degraded') return actions
  return actions.filter((action) => !isDirectApplicationAction(action))
})
const actionButtonLabel = (action: CareerActionItemVO) =>
  String(action.actionType || '').toUpperCase() === 'PRACTICE_INTERVIEW' ? '开始准备' : '查看详情'
const primaryAction = computed(() => nextActions.value[0])
const primaryActionLabel = computed(() => primaryAction.value?.title || applicationEntryLabel.value)
const primaryActionDescription = computed(() =>
  primaryAction.value?.description ||
  (currentPackage.value?.jobApplicationId
    ? '查看当前投递记录和后续进展。'
    : '确认无误后创建投递记录；系统不会自动投递。')
)
const primaryActionLoading = computed(() =>
  primaryAction.value
    ? executingActionKey.value === actionExecutionKey(primaryAction.value)
    : applicationCreating.value
)
const handlePrimaryAction = async () => {
  if (primaryAction.value) {
    await handleActionClick(primaryAction.value)
    return
  }
  await handleApplicationEntry()
}
const evidenceSummaryToCoverage = (item: ApplicationPackageProjectEvidenceSummaryVO): ApplicationPackageEvidenceCoverageItemVO => ({
  requirement: item.title || `项目证据 #${item.id || ''}`,
  status: String(item.completenessStatus || '').toUpperCase() === 'COMPLETE' || Number(item.completenessScore || 0) >= 60 ? 'PASS' : 'WARN',
  evidenceIds: item.id ? [item.id] : [],
  evidenceTitles: item.title ? [item.title] : [],
  coverageSummary: [item.role, item.techStack, item.completenessScore != null ? `完整度 ${item.completenessScore}` : '']
    .filter(Boolean)
    .join(' / '),
  gap: item.missingFields?.length ? `缺少：${item.missingFields.join('、')}` : undefined
})
const evidenceCoverageItems = computed<ApplicationPackageEvidenceCoverageItemVO[]>(() => {
  const pack = currentPackage.value
  if (!pack) return []
  if (Array.isArray(pack.evidenceCoverage) && pack.evidenceCoverage.length) return pack.evidenceCoverage
  const coverage = pack.projectEvidenceCoverage
  if (!coverage) return []
  const covered = (coverage.coveredRequirements || []).map<ApplicationPackageEvidenceCoverageItemVO>((requirement) => ({
    requirement,
    status: 'PASS',
    coverageSummary: '已有项目证据支撑。'
  }))
  const insufficient = (coverage.insufficientRequirements || []).map<ApplicationPackageEvidenceCoverageItemVO>((requirement) => ({
    requirement,
    status: 'BLOCKED',
    gap: '当前证据不足。',
    suggestedSupplement: (coverage.suggestedFields || []).join('、')
  }))
  const selected = (coverage.selectedEvidence || []).map(evidenceSummaryToCoverage)
  return [...covered, ...insufficient, ...selected]
})
const riskSignals = computed<CareerRiskSignalVO[]>(() => currentPackage.value?.riskSignals || [])
const suggestions = computed<ExplainableSuggestionVO[]>(() => currentPackage.value?.suggestions || [])

const evidenceCoverageText = computed(() => {
  const covered = evidenceCoverageItems.value.filter((item) => statusTone(item.status) === 'success').length
  if (!evidenceCoverageItems.value.length) return '待覆盖'
  return `${covered}/${evidenceCoverageItems.value.length} 已覆盖`
})

const resumeVersionLabel = computed(() => {
  const resume = currentPackage.value?.recommendedResume
  if (resume?.resumeVersionName || resume?.versionName) return resume.resumeVersionName || resume.versionName
  if (resume?.resumeVersionNo || resume?.versionNo) return `第 ${resume.resumeVersionNo || resume.versionNo} 版`
  const versionId = currentPackage.value?.recommendedResumeVersionId || resume?.resumeVersionId
  return versionId ? `简历版本 #${versionId}` : '暂无推荐版本'
})

const matchSummary = computed(() => currentPackage.value?.matchResult || currentPackage.value?.matchSummary)

const matchScoreText = computed(() => {
  const score = matchSummary.value?.overallScore
  if (Number.isFinite(Number(score)) && Number(score) > 0) return `${score} 分`
  return currentPackage.value?.matchReportId ? `报告 #${currentPackage.value.matchReportId}` : '暂无匹配报告'
})

const matchSummaryText = computed(() =>
  matchSummary.value?.summary ||
  currentPackage.value?.recommendedResume?.evidenceSummary ||
  '暂无匹配摘要。'
)

const matchTrustTag = computed(() => {
  const match = matchSummary.value
  if (match?.fallback || match?.degraded || currentPackage.value?.fallback) return { label: '降级/待复核', type: 'warning' as const }
  const trust = String(match?.trustStatus || match?.status || '').toUpperCase()
  if (trust === 'VERIFIED' || trust === 'SUCCESS') return { label: '来源可信', type: 'success' as const }
  if (trust === 'WARNING' || trust === 'WARN') return { label: '需要复核', type: 'warning' as const }
  return { label: '待确认', type: 'info' as const }
})
const confidenceLabel = (value?: string | number | null) => {
  const confidence = String(value || '').toUpperCase()
  const labels: Record<string, string> = {
    HIGH: '置信程度高',
    MEDIUM: '置信程度中等',
    LOW: '置信程度低',
    UNKNOWN: '置信程度待确认'
  }
  return labels[confidence] || '置信程度待确认'
}

const riskTone = (level?: string) => {
  const key = String(level || '').toUpperCase()
  if (key === 'LOW') return 'low'
  if (key === 'MEDIUM') return 'medium'
  return 'high'
}

const pushSafeAppPath = async (rawPath?: string) => {
  const resolved = resolveAppRoutePath(rawPath, {
    fallbackPath: '/agent/today',
    knownPaths: defaultUserKnownPaths
  })
  if (resolved.unavailableReason) {
    ElMessage.warning(resolved.unavailableReason)
  }
  await router.push(resolved.path)
}

const isPersistablePreviewPackage = (pack?: JobApplicationPackageVO | null) =>
  Boolean(pack && !pack.fallback && !pack.degraded && pack.id !== 'preview-degraded')

const ensurePersistedPackage = async () => {
  const pack = currentPackage.value
  if (!pack) return null
  if (isPersistedPackageRoute.value) return pack
  if (!isPersistablePreviewPackage(pack)) return null

  const persisted = await createApplicationPackageApi({
    ...previewParams.value,
    targetJobId: pack.targetJobId || previewParams.value.targetJobId,
    jdAnalysisId: pack.jdAnalysisId || previewParams.value.jdAnalysisId,
    resumeVersionId: pack.recommendedResumeVersionId || previewParams.value.resumeVersionId,
    matchReportId: pack.matchReportId || previewParams.value.matchReportId,
    projectEvidenceIds: pack.projectEvidenceIds || []
  })
  currentPackage.value = persisted
  await router.replace(`/application-packages/${encodeURIComponent(String(persisted.id))}`)
  return persisted
}

const actionExecutionKey = (action: CareerActionItemVO) =>
  String(action.actionCode || action.id || action.actionType || action.actionUrl || action.title || '')

const actionCodeOf = (action: CareerActionItemVO) =>
  String(action.actionCode || action.id || action.actionType || '').trim()

const actionTargetPath = (result?: unknown, fallback?: string) => {
  const data = result as {
    targetPath?: string
    targetUrl?: string
    actionPath?: string
    actionUrl?: string
    applicationId?: string | number
  } | undefined
  if (data?.targetPath || data?.targetUrl || data?.actionPath || data?.actionUrl) {
    return data.targetPath || data.targetUrl || data.actionPath || data.actionUrl
  }
  if (data?.applicationId) return `/applications?applicationId=${data.applicationId}&openEvents=1`
  return fallback
}

const handleActionClick = async (action: CareerActionItemVO) => {
  const fallbackPath = action.actionPath || action.actionUrl
  if (currentPackage.value?.fallback || currentPackage.value?.degraded) {
    await pushSafeAppPath(fallbackPath)
    return
  }

  const actionCode = actionCodeOf(action)
  if (!actionCode) {
    await pushSafeAppPath(fallbackPath)
    return
  }

  const key = actionExecutionKey(action)
  executingActionKey.value = key
  try {
    const pack = await ensurePersistedPackage()
    if (!pack?.id) {
      await pushSafeAppPath(fallbackPath)
      return
    }
    const result = await executeApplicationPackageActionApi(pack.id, actionCode, {
      source: 'APPLICATION_PACKAGE_DETAIL',
      payload: {
        applicationId: pack.jobApplicationId,
        targetJobId: interviewContext.value.targetJobId,
        jdAnalysisId: interviewContext.value.jdAnalysisId,
        resumeVersionId: interviewContext.value.resumeVersionId,
        matchReportId: interviewContext.value.matchReportId,
        projectEvidenceIds: interviewContext.value.projectEvidenceIds
      }
    })
    if (result?.package) {
      currentPackage.value = result.package
    }
    if (result?.message) {
      ElMessage.success(result.message)
    }
    await pushSafeAppPath(actionTargetPath(result, fallbackPath))
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '投递包行动执行失败，已保留在当前页面。'))
  } finally {
    executingActionKey.value = ''
  }
}

const interviewContext = computed(() => {
  const pack = currentPackage.value
  const createParams = pack?.interviewPreparation?.createParams || {}
  const paramNumber = (key: string) => {
    const value = createParams[key]
    const numberValue = Number(value)
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
  }
  return {
    applicationPackageId: isPersistedPackageRoute.value ? pack?.id : undefined,
    applicationId: pack?.jobApplicationId,
    targetJobId: pack?.interviewContext?.targetJobId || paramNumber('targetJobId') || pack?.targetJobId,
    jdAnalysisId: pack?.jdAnalysisId || pack?.job?.jdAnalysisId || paramNumber('jdAnalysisId'),
    resumeVersionId: pack?.interviewContext?.resumeVersionId || paramNumber('resumeVersionId') || pack?.recommendedResumeVersionId,
    matchReportId: pack?.interviewContext?.matchReportId || paramNumber('matchReportId') || pack?.matchReportId,
    projectEvidenceIds: pack?.interviewContext?.projectEvidenceIds || pack?.projectEvidenceIds || []
  }
})

const goResumeVersion = () => {
  const resumeId = currentPackage.value?.recommendedResume?.resumeId
  if (resumeId) {
    router.push(`/resumes/${resumeId}/versions`)
    return
  }
  router.push('/resume-versions')
}

const goInterviewCreate = async () => {
  if (!isPersistedPackageRoute.value && isPersistablePreviewPackage(currentPackage.value)) {
    try {
      await ensurePersistedPackage()
    } catch (error) {
      ElMessage.error(getErrorMessage(error, '投递包保存失败，暂时无法携带投递包编号创建面试。'))
      return
    }
  }
  const context = interviewContext.value
  router.push({
    path: '/interviews/create',
    query: {
      source: 'application-package',
      applicationPackageId: context.applicationPackageId,
      applicationId: context.applicationId,
      targetJobId: context.targetJobId,
      jdAnalysisId: context.jdAnalysisId,
      resumeVersionId: context.resumeVersionId,
      matchReportId: context.matchReportId,
      projectEvidenceIds: context.projectEvidenceIds?.join(',')
    }
  })
}

const applicationEntryLabel = computed(() =>
  currentPackage.value?.jobApplicationId ? '查看投递记录' : '创建投递记录'
)

const handleApplicationEntry = async () => {
  const pack = currentPackage.value
  if (!pack) return
  if (pack.jobApplicationId) {
    await router.push({
      path: '/applications',
      query: { applicationId: String(pack.jobApplicationId), openEvents: '1' }
    })
    return
  }
  if (pack.fallback || pack.degraded || pack.id === 'preview-degraded') {
    ElMessage.info('当前是降级预览，请在投递漏斗中手动创建记录。')
    await router.push('/applications')
    return
  }

  applicationCreating.value = true
  try {
    const persistedPack = await ensurePersistedPackage()
    if (persistedPack?.id) {
      const result = await executeApplicationPackageActionApi(persistedPack.id, 'create-application', {
        source: 'APPLICATION_PACKAGE_DETAIL',
        payload: {
          applicationId: persistedPack.jobApplicationId,
          targetJobId: interviewContext.value.targetJobId,
          jdAnalysisId: interviewContext.value.jdAnalysisId,
          resumeVersionId: interviewContext.value.resumeVersionId,
          matchReportId: interviewContext.value.matchReportId,
          projectEvidenceIds: interviewContext.value.projectEvidenceIds
        }
      })
      if (result?.package) {
        currentPackage.value = result.package
      }
      const applicationId = result?.applicationId || result?.package?.jobApplicationId
      ElMessage.success(result?.message || '已提交投递包创建投递记录动作。')
      await pushSafeAppPath(actionTargetPath(result, applicationId ? `/applications?applicationId=${applicationId}&openEvents=1` : '/applications'))
      return
    }

    ElMessage.warning('投递包尚未持久化，无法执行正式创建投递记录动作，请在投递漏斗中手动创建。')
    await router.push('/applications')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '创建投递记录失败，请稍后重试或到投递漏斗手动创建。'))
  } finally {
    applicationCreating.value = false
  }
}

watch(
  () => [route.params.id, route.query.targetJobId, route.query.jdAnalysisId, route.query.resumeVersionId, route.query.matchReportId],
  () => {
    void loadPackage()
  }
)

onMounted(loadPackage)
</script>

<style scoped lang="scss">
.application-package-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
  overflow-x: hidden;
  color: var(--user-text);
}

.package-hero,
.content-panel {
  border: 1.5px solid var(--user-border);
  border-radius: var(--arena-radius-card);
  background: var(--user-surface);
  box-shadow: var(--user-shadow-sm);
}

.package-hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 24px;
  border-color: var(--user-primary-border);
  background: var(--user-surface-tint);
}

.hero-kicker,
.hero-actions,
.section-head,
.meta-tags,
.link-actions,
.coverage-head,
.primary-action,
.trace-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-kicker {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.package-hero h1,
.content-panel h2,
.content-panel p,
.content-panel dl {
  margin: 0;
}

.package-hero h1 {
  margin-top: 10px;
  color: var(--user-text);
  font-size: 26px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.package-hero p,
.content-panel p,
.content-panel small {
  color: var(--user-text-muted);
  line-height: 1.65;
}

.content-panel {
  min-width: 0;
  padding: 18px;
}

.degraded-panel {
  display: grid;
  gap: 10px;
}

.readiness-workbench,
.tab-grid,
.resume-match-grid {
  display: grid;
  gap: 14px;
}

.readiness-workbench {
  grid-template-columns: minmax(240px, 0.72fr) minmax(0, 1.28fr);
  align-items: stretch;
}

.tab-grid {
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.58fr);
}

.tab-grid--checklist {
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.42fr);
}

.tab-stack {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.detail-tabs {
  min-width: 0;
  padding: 0 2px;

  :deep(.el-tabs__header) {
    margin: 0 0 14px;
  }

  :deep(.el-tabs__nav-wrap) {
    min-width: 0;
  }

  :deep(.el-tabs__item) {
    height: 40px;
    padding: 0 14px;
    font-size: 14px;
  }

  :deep(.el-tabs__content) {
    overflow: visible;
  }
}

.context-card,
.readiness-card,
.gaps-card {
  display: grid;
  gap: 10px;
  align-content: start;
}

.gaps-card {
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.context-card .section-head,
.gaps-card .section-head {
  margin-bottom: 0;
}

.readiness-card {
  span {
    color: var(--user-text-muted);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    font-size: 28px;
    line-height: 1.15;
  }
}

.readiness-card--success {
  border-color: var(--user-success-border);
  background: var(--user-success-soft);
}

.readiness-card--warning {
  border-color: var(--user-warning);
  background: var(--user-warning-soft);
}

.readiness-card--danger {
  border-color: var(--user-danger-border);
  background: var(--user-danger-soft);
}

.section-head {
  justify-content: space-between;
  margin-bottom: 16px;

  h2 {
    font-size: 19px;
  }

  p {
    margin-top: 6px;
    font-size: 13px;
  }
}

.compact-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-md);

  div {
    min-width: 0;
    padding: 10px 12px;
    background: var(--user-control-bg);

    &:nth-child(even) {
      border-left: 1px solid var(--user-border);
    }

    &:nth-child(n + 3) {
      border-top: 1px solid var(--user-border);
    }
  }

  dt {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  dd {
    margin: 5px 0 0;
    overflow-wrap: anywhere;
  }
}

.compact-facts--overview dd {
  font-weight: 700;
}

.version-panel {
  display: flex;
  align-items: center;
  gap: 12px;

  .el-alert {
    flex: 1;
  }
}

.checklist,
.critical-gaps,
.next-actions,
.coverage-list,
.risk-list,
.suggestion-list {
  display: grid;
  gap: 10px;
}

.critical-gaps article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 9px 0;
  border-top: 1px solid var(--user-border);

  strong,
  p {
    overflow-wrap: anywhere;
  }

  p {
    margin-top: 3px;
    font-size: 12px;
  }
}

.gaps-empty {
  align-self: center;
  font-size: 13px;
}

.primary-action {
  justify-content: space-between;
  min-width: 0;
  padding-top: 12px;
  border-top: 1px solid var(--user-border);

  p {
    min-width: 0;
    font-size: 12px;
  }

  :deep(.el-button) {
    flex: 0 0 auto;
    max-width: 100%;
    white-space: normal;
  }
}

.checklist-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid var(--user-border);
  background: transparent;

  strong,
  p {
    overflow-wrap: anywhere;
  }

  p {
    margin-top: 4px;
    font-size: 13px;
  }
}

.check-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--user-text-subtle);
}

.check-dot--success {
  background: var(--user-success);
}

.check-dot--warning {
  background: var(--user-warning);
}

.check-dot--danger {
  background: var(--user-danger);
}

.action-panel,
.next-actions article,
.coverage-list article,
.risk-card,
.suggestion-card {
  display: grid;
  gap: 8px;
}

.next-actions article,
.coverage-list article,
.risk-card,
.suggestion-card {
  padding: 12px 0;
  border-top: 1px solid var(--user-border);
  background: transparent;
}

.resume-match-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-md);

  div {
    min-width: 0;
    padding: 14px;
    background: var(--user-control-bg);

    & + div {
      border-left: 1px solid var(--user-border);
    }
  }

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 6px;
    font-size: 18px;
    overflow-wrap: anywhere;
  }
}

.link-actions {
  flex-wrap: wrap;
  margin-top: 14px;
}

.coverage-head {
  justify-content: space-between;
}

.coverage-list small,
.risk-card small {
  color: var(--user-text-muted);
  line-height: 1.6;
}

.risk-card--low {
  border-color: var(--user-success-border);
}

.risk-card--medium {
  border-color: var(--user-warning);
}

.risk-card--high {
  border-color: var(--user-danger-border);
}

.suggestion-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.trace-row {
  justify-content: space-between;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-md);
  background: var(--user-control-bg);
  color: var(--user-text-muted);
  font-size: 13px;

  code {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--user-text);
    font-family: inherit;
    text-align: right;
  }
}

.meta-tags {
  flex-wrap: wrap;
}

@media (max-width: 900px) {
  .package-hero,
  .readiness-workbench,
  .tab-grid,
  .resume-match-grid,
  .compact-facts,
  .suggestion-card {
    grid-template-columns: 1fr;
  }

  .package-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-actions,
  .section-head,
  .checklist-item,
  .critical-gaps article,
  .primary-action,
  .trace-row {
    align-items: stretch;
    flex-direction: column;
  }

  .compact-facts div:nth-child(even),
  .resume-match-grid div + div {
    border-left: 0;
  }

  .compact-facts div + div,
  .resume-match-grid div + div {
    border-top: 1px solid var(--user-border);
  }

  .hero-actions,
  .checklist-item,
  .critical-gaps article {
    display: grid;
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button),
  .checklist-item :deep(.el-button),
  .critical-gaps :deep(.el-button),
  .link-actions :deep(.el-button),
  .action-panel :deep(.el-button),
  .primary-action :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }

  .detail-tabs {
    padding: 0;

    :deep(.el-tabs__item) {
      padding: 0 12px;
    }
  }

  .trace-row code {
    text-align: left;
  }
}
</style>
