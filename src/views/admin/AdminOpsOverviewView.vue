<template>
  <div class="page-shell admin-console-page ops-page">
    <section class="admin-hero ops-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Monitor :size="16" />
          <span>运维观测中心</span>
        </div>
        <h1 class="admin-hero__title">运维监控</h1>
        <p class="admin-hero__desc">
          聚合 AI 调用、Agent 运行、系统状态和失败分布。已接入服务健康探测；QPS、TPS、CPU、内存和缓存命中率等待后端指标采集后自动替换。
        </p>
      </div>
      <div class="admin-hero__actions">
        <el-segmented v-model="rangeDays" :options="rangeOptions" @change="loadPage" />
        <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="运维数据加载失败" :description="errorMessage">
      <el-button type="primary" @click="loadPage">重试</el-button>
    </AppState>

    <template v-else>
      <section class="ops-card-grid" v-loading="loading">
        <article v-for="group in metricGroups" :key="group.key" class="ops-card">
          <div class="ops-card__head">
            <span class="ops-card__icon" :class="group.tone">
              <component :is="group.icon" :size="22" />
            </span>
            <div>
              <h2>{{ group.title }}</h2>
              <p>{{ group.subtitle }}</p>
            </div>
          </div>
          <div class="ops-mini-grid">
            <div v-for="metric in group.metrics" :key="metric.label" class="ops-mini">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <small>{{ metric.hint }}</small>
            </div>
          </div>
        </article>
      </section>

      <section class="ops-main-grid">
        <article class="ops-panel ops-panel--wide">
          <div class="ops-panel__head">
            <div>
              <h2>QPS / RPM / TPM 趋势</h2>
              <p>按天聚合 AI 调用、失败和 Agent 运行数据</p>
            </div>
            <el-tag effect="plain">近 {{ rangeDays }} 天</el-tag>
          </div>
          <div ref="trendChartRef" class="ops-chart" />
          <el-empty v-if="!trendPoints.length && !loading" description="暂无趋势数据" />
        </article>

        <article class="ops-panel">
          <div class="ops-panel__head">
            <div>
              <h2>模型 / 失败统计</h2>
              <p>当前后端返回失败原因聚合</p>
            </div>
          </div>
          <div class="ops-model-list">
            <div v-for="item in failurePoints" :key="item.name" class="ops-model-row">
              <div>
                <strong>{{ translateFailureReason(item.name) }}</strong>
                <span>{{ item.value }} 次失败</span>
              </div>
              <el-progress :percentage="failurePercent(item.value)" :stroke-width="8" :show-text="false" />
            </div>
            <el-empty v-if="!failurePoints.length && !loading" description="暂无失败原因聚合" />
          </div>
        </article>
      </section>

      <section class="ops-main-grid">
        <article class="ops-panel">
          <div class="ops-panel__head">
            <div>
              <h2>服务健康</h2>
              <p>来自管理驾驶舱系统状态</p>
            </div>
          </div>
          <div class="ops-service-list">
            <div v-for="item in services" :key="item.serviceName" class="ops-service-row">
              <span :class="`ops-dot ops-dot--${statusTone(item.status)}`"></span>
              <div>
                <strong>{{ serviceLabel(item.serviceName) }}</strong>
                <small>{{ serviceReasonLabel(item) }}</small>
              </div>
              <em :class="`status-${statusTone(item.status)}`">{{ statusText(item.status) }}</em>
            </div>
            <div v-for="item in vectorCollections" :key="item.collectionName" class="ops-service-row">
              <span :class="`ops-dot ops-dot--${vectorTone(item)}`"></span>
              <div>
                <strong>{{ vectorCollectionLabel(item.collectionName) }}</strong>
                <small>{{ vectorCollectionHint(item) }}</small>
              </div>
              <em :class="`status-${vectorTone(item)}`">{{ vectorCollectionStatus(item) }}</em>
            </div>
            <div class="ops-service-row">
              <span :class="`ops-dot ops-dot--${vectorDeleteOutboxTone}`"></span>
              <div>
                <strong>向量删除补偿</strong>
                <small>{{ vectorDeleteOutboxHint }}</small>
              </div>
              <em :class="`status-${vectorDeleteOutboxTone}`">{{ vectorDeleteOutboxStatus }}</em>
            </div>
            <el-empty v-if="!services.length && !loading" description="暂无服务状态" />
          </div>
        </article>

        <article class="ops-panel">
          <div class="ops-panel__head">
            <div>
              <h2>最近聚合任务</h2>
              <p>聚合任务最近执行情况</p>
            </div>
          </div>
          <div class="ops-job-list">
            <div v-for="job in jobs" :key="job.id" class="ops-job-row">
              <div>
                <strong>{{ translateJobName(job.jobName || job.jobCode || `Job #${job.id}`) }}</strong>
                <small>{{ job.statDate || job.createdAt || '--' }}</small>
              </div>
              <el-tag :type="job.status === 'SUCCESS' ? 'success' : job.status === 'FAILED' ? 'danger' : 'warning'" effect="plain">
                {{ jobStatusLabel(job.status) }}
              </el-tag>
            </div>
            <el-empty v-if="!jobs.length && !loading" description="暂无聚合任务" />
          </div>
        </article>
      </section>


      <section class="ops-main-grid vector-admin-grid">
        <article class="ops-panel ops-panel--wide vector-admin-panel">
          <div class="ops-panel__head">
            <div>
              <h2>Vector Index Console</h2>
              <p>Qdrant collections and MySQL index-state counters for question dedupe and personal RAG.</p>
            </div>
            <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">Refresh</el-button>
          </div>
          <div class="vector-index-grid">
            <div v-for="item in mysqlIndexCards" :key="item.key" class="vector-index-card">
              <div class="vector-index-card__head">
                <span>{{ item.title }}</span>
                <strong>{{ item.total }}</strong>
              </div>
              <small>{{ item.subtitle }}</small>
              <div class="vector-status-list">
                <span v-for="status in item.statusCounts" :key="`${item.key}-${status.status}`">
                  {{ status.status || 'UNKNOWN' }} {{ status.count || 0 }}
                </span>
              </div>
              <em v-if="item.errorMessage">{{ item.errorMessage }}</em>
            </div>
          </div>
          <div class="vector-runtime-grid">
            <div class="vector-index-card">
              <div class="vector-index-card__head">
                <span>Runtime Config</span>
                <strong>{{ vectorRuntimeLabel }}</strong>
              </div>
              <small>{{ vectorRuntimeHint }}</small>
              <div class="vector-status-list">
                <span>limit {{ vectorHealth?.config?.defaultLimit || '--' }}</span>
                <span>ask {{ formatThreshold(vectorHealth?.config?.knowledgeAskMinScore) }}</span>
                <span>near {{ formatThreshold(vectorHealth?.config?.knowledgeNearDuplicateThreshold) }}</span>
              </div>
            </div>
            <div class="vector-index-card">
              <div class="vector-index-card__head">
                <span>Embedding Metrics</span>
                <strong>{{ compact(vectorHealth?.embeddingMetrics?.callCount) }}</strong>
              </div>
              <small>{{ embeddingMetricHint }}</small>
              <div class="vector-status-list">
                <span>fail {{ vectorHealth?.embeddingMetrics?.failedCount || 0 }}</span>
                <span>avg {{ formatMs(vectorHealth?.embeddingMetrics?.averageElapsedMs) }}</span>
                <span>tokens {{ compact(vectorHealth?.embeddingMetrics?.totalTokens) }}</span>
              </div>
              <em v-if="vectorHealth?.embeddingMetrics?.errorMessage">{{ vectorHealth.embeddingMetrics.errorMessage }}</em>
            </div>
          </div>
          <el-alert
            class="vector-state-alert"
            :type="vectorStateBanner.type"
            :closable="false"
            show-icon
          >
            <template #title>{{ vectorStateBanner.title }}</template>
            <template #default>
              <div>{{ vectorStateBanner.description }}</div>
            </template>
          </el-alert>
        </article>

        <article class="ops-panel vector-admin-panel">
          <div class="ops-panel__head">
            <div>
              <h2>Index Actions</h2>
              <p>High-cost rebuild and retry jobs stay separate from ordinary refresh.</p>
            </div>
          </div>
          <div class="vector-action-list">
            <div class="vector-action-group">
              <span class="vector-action-group__label">Question vectors</span>
              <el-button type="warning" plain :icon="RefreshCw" :loading="rebuildingQuestionVectors" @click="handleRebuildQuestionVectors">
                Rebuild Questions
              </el-button>
              <el-button type="warning" plain :icon="RefreshCw" :loading="retryingQuestionVectors" @click="handleRetryQuestionVectors">
                Retry Question Failures
              </el-button>
            </div>
            <div class="vector-action-group vector-action-group--risk">
              <span class="vector-action-group__label">Knowledge + compensation</span>
              <el-button type="warning" plain :icon="RefreshCw" :loading="rebuildingKnowledgeVectors" @click="handleRebuildKnowledgeVectors">
                Rebuild Knowledge
              </el-button>
              <el-button type="warning" plain :icon="RefreshCw" :loading="retryingKnowledgeVectors" @click="handleRetryKnowledgeVectors">
                Retry Knowledge Failures
              </el-button>
              <el-button type="danger" plain :icon="RefreshCw" :loading="retryingVectorDeletes" @click="handleRetryVectorDeletes">
                Retry Vector Deletes
              </el-button>
            </div>
          </div>
          <div v-if="lastVectorAction" class="vector-action-result">
            <strong>{{ lastVectorAction.title }}</strong>
            <span>{{ lastVectorAction.summary }}</span>
            <small v-if="lastVectorAction.detail">{{ lastVectorAction.detail }}</small>
          </div>
        </article>
      </section>

      <section class="ops-main-grid vector-failure-grid">
        <article class="ops-panel ops-panel--wide vector-failure-panel">
          <div class="ops-panel__head vector-failure-head">
            <div>
              <h2>Vector Failure Details</h2>
              <p>Recent Qdrant index and delete-outbox failures for question dedupe and personal RAG.</p>
            </div>
            <div class="vector-failure-tools">
              <el-segmented v-model="vectorFailureStatus" :options="vectorFailureStatusOptions" @change="loadVectorFailures" />
              <el-select v-model="vectorFailureLimit" style="width: 108px" @change="loadVectorFailures">
                <el-option :value="25" label="25 条" />
                <el-option :value="50" label="50 条" />
                <el-option :value="100" label="100 条" />
              </el-select>
              <el-button :icon="RefreshCw" :loading="vectorFailureLoading" @click="loadVectorFailures">刷新明细</el-button>
            </div>
          </div>

          <div class="vector-failure-summary">
            <div class="vector-failure-summary__item">
              <span>题目失败</span>
              <strong>{{ vectorFailureCounts.question }}</strong>
            </div>
            <div class="vector-failure-summary__item">
              <span>知识库失败</span>
              <strong>{{ vectorFailureCounts.knowledge }}</strong>
            </div>
            <div class="vector-failure-summary__item">
              <span>删除补偿</span>
              <strong>{{ vectorFailureCounts.deleteOutbox }}</strong>
            </div>
            <div class="vector-failure-summary__item">
              <span>生成时间</span>
              <strong>{{ vectorFailures?.generatedAt || '--' }}</strong>
            </div>
          </div>

          <el-alert
            v-if="vectorFailures?.errors?.length"
            class="vector-failure-alert"
            type="warning"
            :closable="false"
            show-icon
          >
            <template #title>
              {{ vectorFailures.errors.slice(0, 3).join('；') }}
            </template>
          </el-alert>

          <el-tabs v-model="vectorFailureTab" class="vector-failure-tabs" v-loading="vectorFailureLoading">
            <el-tab-pane :label="`题目向量 ${vectorFailureCounts.question}`" name="question">
              <el-table :data="vectorFailures?.questionFailures || []" class="ops-table" size="small" empty-text="暂无题目向量失败记录">
                <el-table-column label="Question ID" prop="questionId" min-width="110" />
                <el-table-column label="状态" min-width="96">
                  <template #default="{ row }">
                    <el-tag :type="vectorFailureStatusType(row.indexStatus)" effect="plain">{{ row.indexStatus || 'PENDING' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="模型 / 维度" min-width="160">
                  <template #default="{ row }">
                    <span>{{ vectorModelHint(row.embeddingModel, row.embeddingDimension) }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="更新时间" prop="updatedAt" min-width="170" />
                <el-table-column label="错误" min-width="260">
                  <template #default="{ row }">
                    <el-tooltip v-if="row.lastError" :content="row.lastError" placement="top" :show-after="300">
                      <span class="vector-error-text">{{ row.lastError }}</span>
                    </el-tooltip>
                    <span v-else class="vector-empty-text">--</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="132" fixed="right">
                  <template #default="{ row }">
                    <div class="vector-row-actions">
                      <el-tooltip content="查看题目" placement="top">
                        <el-button link type="primary" :icon="ExternalLink" @click="openQuestionFailure(row.questionId)" />
                      </el-tooltip>
                      <el-tooltip content="复制错误" placement="top">
                        <el-button link type="info" :icon="Copy" :disabled="!row.lastError" @click="copyVectorText(row.lastError, '错误已复制')" />
                      </el-tooltip>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <el-tab-pane :label="`知识库 Chunk ${vectorFailureCounts.knowledge}`" name="knowledge">
              <el-table :data="vectorFailures?.knowledgeFailures || []" class="ops-table" size="small" empty-text="暂无知识库向量失败记录">
                <el-table-column label="Chunk ID" prop="chunkId" min-width="100" />
                <el-table-column label="User / Doc" min-width="150">
                  <template #default="{ row }">
                    <span>{{ row.userId || '--' }} / {{ row.documentId || '--' }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="Index" prop="chunkIndex" min-width="80" />
                <el-table-column label="状态" min-width="96">
                  <template #default="{ row }">
                    <el-tag :type="vectorFailureStatusType(row.indexStatus)" effect="plain">{{ row.indexStatus || 'PENDING' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="模型 / 维度" min-width="160">
                  <template #default="{ row }">
                    <span>{{ vectorModelHint(row.embeddingModel, row.embeddingDimension) }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="更新时间" prop="updatedAt" min-width="170" />
                <el-table-column label="错误" min-width="260">
                  <template #default="{ row }">
                    <el-tooltip v-if="row.lastError" :content="row.lastError" placement="top" :show-after="300">
                      <span class="vector-error-text">{{ row.lastError }}</span>
                    </el-tooltip>
                    <span v-else class="vector-empty-text">--</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="132" fixed="right">
                  <template #default="{ row }">
                    <div class="vector-row-actions">
                      <el-tooltip content="查看片段" placement="top">
                        <el-button link type="primary" :icon="ExternalLink" @click="openKnowledgeFailure(row.documentId, row.chunkId)" />
                      </el-tooltip>
                      <el-tooltip content="复制错误" placement="top">
                        <el-button link type="info" :icon="Copy" :disabled="!row.lastError" @click="copyVectorText(row.lastError, '错误已复制')" />
                      </el-tooltip>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <el-tab-pane :label="`删除补偿 ${vectorFailureCounts.deleteOutbox}`" name="deleteOutbox">
              <el-table :data="vectorFailures?.deleteOutboxFailures || []" class="ops-table" size="small" empty-text="暂无向量删除补偿失败记录">
                <el-table-column label="Collection" prop="collectionName" min-width="180" />
                <el-table-column label="Point ID" min-width="220">
                  <template #default="{ row }">
                    <span class="vector-point-text">{{ row.pointId || '--' }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="业务" prop="bizType" min-width="120" />
                <el-table-column label="状态" min-width="96">
                  <template #default="{ row }">
                    <el-tag :type="vectorFailureStatusType(row.status)" effect="plain">{{ row.status || 'PENDING' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="重试" prop="retryCount" min-width="80" />
                <el-table-column label="更新时间" prop="updatedAt" min-width="170" />
                <el-table-column label="错误" min-width="260">
                  <template #default="{ row }">
                    <el-tooltip v-if="row.lastError" :content="row.lastError" placement="top" :show-after="300">
                      <span class="vector-error-text">{{ row.lastError }}</span>
                    </el-tooltip>
                    <span v-else class="vector-empty-text">--</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="96" fixed="right">
                  <template #default="{ row }">
                    <div class="vector-row-actions">
                      <el-tooltip content="复制 Point ID" placement="top">
                        <el-button link type="info" :icon="Copy" :disabled="!row.pointId" @click="copyVectorText(row.pointId, 'Point ID 已复制')" />
                      </el-tooltip>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </article>
      </section>

      <section class="ops-main-grid vector-job-grid">
        <article class="ops-panel ops-panel--wide vector-job-panel">
          <div class="ops-panel__head vector-failure-head">
            <div>
              <h2>Vector Job History</h2>
              <p>Recent rebuild, retry, and delete-outbox compensation runs.</p>
            </div>
            <div class="vector-failure-tools">
              <el-select v-model="vectorJobStatus" style="width: 128px" @change="loadVectorJobs">
                <el-option label="全部" value="ALL" />
                <el-option label="运行中" value="RUNNING" />
                <el-option label="成功" value="SUCCESS" />
                <el-option label="失败" value="FAILED" />
              </el-select>
              <el-button :icon="RefreshCw" :loading="vectorJobLoading" @click="loadVectorJobs">刷新任务</el-button>
            </div>
          </div>
          <el-table :data="vectorJobs" class="ops-table vector-job-table" size="small" empty-text="暂无向量索引任务">
            <el-table-column label="任务" min-width="220">
              <template #default="{ row }">
                <div class="vector-job-main">
                  <strong>{{ vectorJobTypeLabel(row.jobType) }}</strong>
                  <small>{{ row.jobNo || `#${row.id || '-'}` }}</small>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="范围" min-width="140">
              <template #default="{ row }">{{ row.scopeType || '-' }}{{ row.scopeId ? ` / ${row.scopeId}` : '' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="vectorJobStatusType(row.status)" effect="plain">{{ vectorJobStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="数量" min-width="170">
              <template #default="{ row }">
                {{ row.successCount || 0 }}/{{ row.totalCount || 0 }} ok · fail {{ row.failedCount || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="向量" min-width="150">
              <template #default="{ row }">up {{ row.vectorUpdated || 0 }} / del {{ row.vectorDeleted || 0 }}</template>
            </el-table-column>
            <el-table-column label="耗时" width="110">
              <template #default="{ row }">{{ formatDuration(row.durationMs) }}</template>
            </el-table-column>
            <el-table-column label="完成时间" prop="finishedAt" min-width="170" />
            <el-table-column label="错误" min-width="240">
              <template #default="{ row }">
                <el-tooltip v-if="row.lastError || row.errorMessage" :content="row.lastError || row.errorMessage" placement="top" :show-after="300">
                  <span class="vector-error-text">{{ row.lastError || row.errorMessage }}</span>
                </el-tooltip>
                <span v-else class="vector-empty-text">--</span>
              </template>
            </el-table-column>
          </el-table>
        </article>
      </section>

      <section class="ops-main-grid">
        <article class="ops-panel ops-panel--wide">
          <div class="ops-panel__head">
            <div>
              <h2>题目去重参数</h2>
              <p>当前生效的规则阈值、语义检索和候选池规模</p>
            </div>
          </div>
          <div class="ops-config-grid">
            <div v-for="item in duplicateConfigItems" :key="item.label" class="ops-config-item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.hint }}</small>
            </div>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Activity, Copy, ExternalLink, Gauge, Monitor, RefreshCw, Server, ShieldCheck } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getAdminAgentOverviewApi,
  getAdminAgentTrendApi,
  getAdminAiFailuresApi,
  getAdminAiOverviewApi,
  getAdminAnalyticsJobsApi,
  getAdminVectorIndexJobsApi,
  getAdminVectorStoreFailuresApi,
  getAdminVectorStoreHealthApi,
  rebuildAdminKnowledgeVectorsApi,
  retryAdminKnowledgeVectorsApi,
  getQuestionDuplicateConfigApi,
  retryAdminVectorDeletesApi
} from '@/api/analytics'
import { rebuildQuestionEmbeddingApi, retryFailedQuestionEmbeddingApi, type QuestionEmbeddingRebuildResult } from '@/api/question'
import type { KnowledgeVectorRebuildVO } from '@/api/v4'
import { getAdminDashboardOverviewApi } from '@/api/dashboard'
import AppState from '@/components/common/AppState.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { AdminAgentOverviewVO, AdminAiOverviewVO, AdminAnalyticsJobLogVO, MetricPointVO, QuestionDuplicateConfigVO, TrendPointVO, VectorCollectionInfoVO, VectorFailureDetailsVO, VectorIndexJobVO, VectorStoreHealthVO } from '@/types/analytics'
import type { AdminDashboardOverviewVO, DashboardStatus } from '@/types/dashboard'
import { translateFailureReason, translateJobName } from '@/utils/adminDisplay'
import echarts, { type ECharts } from '@/utils/echarts'

const loading = ref(false)
const router = useRouter()
const retryingVectorDeletes = ref(false)
const rebuildingQuestionVectors = ref(false)
const retryingQuestionVectors = ref(false)
const rebuildingKnowledgeVectors = ref(false)
const retryingKnowledgeVectors = ref(false)
const vectorFailureLoading = ref(false)
const vectorJobLoading = ref(false)
const vectorFailureStatus = ref<'ALL' | 'FAILED' | 'PENDING'>('ALL')
const vectorJobStatus = ref<'ALL' | 'RUNNING' | 'SUCCESS' | 'FAILED'>('ALL')
const vectorFailureLimit = ref(50)
const vectorFailureTab = ref<'question' | 'knowledge' | 'deleteOutbox'>('question')
const lastVectorAction = ref<{ title: string; summary: string; detail?: string } | null>(null)
const errorMessage = ref('')
const rangeDays = ref(7)
const aiOverview = ref<AdminAiOverviewVO>()
const agentOverview = ref<AdminAgentOverviewVO>()
const dashboard = ref<AdminDashboardOverviewVO>()
const vectorHealth = ref<VectorStoreHealthVO>()
const vectorFailures = ref<VectorFailureDetailsVO>()
const vectorJobs = ref<VectorIndexJobVO[]>([])
const duplicateConfig = ref<QuestionDuplicateConfigVO>()
const trendPoints = ref<TrendPointVO[]>([])
const failurePoints = ref<MetricPointVO[]>([])
const jobs = ref<AdminAnalyticsJobLogVO[]>([])
const trendChartRef = ref<HTMLElement>()
let trendChart: ECharts | null = null

const rangeOptions = [
  { label: '7 天', value: 7 },
  { label: '30 天', value: 30 },
  { label: '90 天', value: 90 }
]

const vectorFailureStatusOptions = [
  { label: '全部', value: 'ALL' },
  { label: '失败', value: 'FAILED' },
  { label: '待处理', value: 'PENDING' }
]

const services = computed(() => dashboard.value?.systemStatus?.services || [])
const vectorCollections = computed(() => vectorHealth.value?.collections || [])
const vectorDeleteOutbox = computed(() => vectorHealth.value?.deleteOutbox)
const opsMetrics = computed(() => dashboard.value?.systemStatus?.opsMetrics)
const totalFailures = computed(() => Math.max(...failurePoints.value.map((item) => item.value || 0), 1))
const vectorFailureCounts = computed(() => ({
  question: vectorFailures.value?.questionFailures?.length || 0,
  knowledge: vectorFailures.value?.knowledgeFailures?.length || 0,
  deleteOutbox: vectorFailures.value?.deleteOutboxFailures?.length || 0
}))
const vectorStateBanner = computed(() => {
  const health = vectorHealth.value
  if (!health) {
    return {
      type: 'warning' as const,
      title: 'Qdrant state uncertain',
      description: 'Vector health has not returned yet; no collection rebuild or delete compensation is run automatically.'
    }
  }
  if (!health.enabled) {
    return {
      type: 'warning' as const,
      title: 'Qdrant disabled',
      description: 'Vector features are disabled in runtime config. Collection rows are informational only and no repair is attempted.'
    }
  }
  const collections = health.collections || []
  if (!collections.length) {
    return {
      type: 'warning' as const,
      title: 'Qdrant collections unknown',
      description: 'The health API did not return collection records. Treat the state as uncertain until a manual refresh succeeds.'
    }
  }
  const errored = collections.filter((item) => item.errorMessage || String(item.status || '').toUpperCase() === 'ERROR')
  if (errored.length) {
    return {
      type: 'error' as const,
      title: 'Qdrant collection error',
      description: `${errored.map((item) => vectorCollectionLabel(item.collectionName)).join(', ')} returned an error. Use the details below before running any retry job.`
    }
  }
  const missing = collections.filter((item) => !item.exists)
  if (missing.length) {
    return {
      type: 'warning' as const,
      title: 'Qdrant collection missing',
      description: `${missing.map((item) => vectorCollectionLabel(item.collectionName)).join(', ')} is missing. The page does not silently repair it; rebuild actions require confirmation.`
    }
  }
  return {
    type: 'success' as const,
    title: 'Qdrant collections available',
    description: 'Configured collections are present. Rebuild and retry actions still require explicit confirmation.'
  }
})

const formatPercent = (value?: number) => `${Number(value || 0).toFixed(2)}%`
const formatMs = (value?: number) => `${Math.round(Number(value || 0))}ms`
const formatMetric = (value?: number, digits = 2) => Number(value ?? 0).toFixed(digits)
const formatMb = (value?: number) => `${Math.round(Number(value || 0))} MB`
const compact = (value?: number) => {
  const num = Number(value || 0)
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return String(num)
}

const errorRate = computed(() => {
  const total = aiOverview.value?.totalAiCalls || 0
  if (!total) return 0
  return ((aiOverview.value?.failedAiCalls || 0) / total) * 100
})

const metricGroups = computed(() => [
  {
    key: 'usage',
    title: '使用统计',
    subtitle: '请求、Token 与调用',
    icon: Activity,
    tone: 'tone-blue',
    metrics: [
      { label: 'AI 调用', value: compact(aiOverview.value?.totalAiCalls), hint: `失败 ${aiOverview.value?.failedAiCalls || 0}` },
      { label: '总 Token', value: compact(aiOverview.value?.totalTokens), hint: `输入 ${compact(aiOverview.value?.totalInputTokens)}` },
      { label: 'Agent 运行', value: compact(agentOverview.value?.totalAgentRuns), hint: `成功 ${agentOverview.value?.successAgentRuns || 0}` },
      { label: 'Agent 任务', value: compact(agentOverview.value?.totalAgentTasks), hint: `完成 ${agentOverview.value?.doneTaskCount || 0}` }
    ]
  },
  {
    key: 'ops',
    title: '系统运维',
    subtitle: '实时吞吐和限流',
    icon: Gauge,
    tone: 'tone-cyan',
    metrics: [
      { label: 'QPS', value: formatMetric(opsMetrics.value?.qps), hint: '最近 1 分钟请求均值' },
      { label: 'TPS', value: formatMetric(opsMetrics.value?.tps), hint: '最近 1 分钟业务写入均值' },
      { label: 'RPM', value: compact(opsMetrics.value?.rpm || aiOverview.value?.totalAiCalls), hint: '最近 1 分钟请求数' },
      { label: 'TPM', value: compact(opsMetrics.value?.tpm || aiOverview.value?.totalTokens), hint: '最近 1 分钟 Token' }
    ]
  },
  {
    key: 'load',
    title: '系统负载',
    subtitle: '进程与主机资源',
    icon: Server,
    tone: 'tone-violet',
    metrics: [
      { label: 'CPU', value: formatPercent(opsMetrics.value?.processCpuUsage), hint: `系统 ${formatPercent(opsMetrics.value?.systemCpuUsage)}` },
      { label: '内存', value: formatMb(opsMetrics.value?.heapUsedMb), hint: `JVM ${formatPercent(opsMetrics.value?.heapUsage)} / ${formatMb(opsMetrics.value?.heapMaxMb)}` },
      { label: '服务数', value: services.value.length, hint: '来自管理驾驶舱' },
      { label: '数据库', value: statusText(services.value.find((item) => item.serviceName === 'database')?.status), hint: 'SELECT 1' }
    ]
  },
  {
    key: 'health',
    title: '缓存 + 健康',
    subtitle: '命中率、延迟和错误率',
    icon: ShieldCheck,
    tone: 'tone-green',
    metrics: [
      { label: 'AI 成功率', value: formatPercent(aiOverview.value?.aiSuccessRate), hint: `平均 ${formatMs(aiOverview.value?.avgElapsedMs)}` },
      { label: 'Agent 成功率', value: formatPercent(agentOverview.value?.agentSuccessRate), hint: `平均 ${formatMs(agentOverview.value?.avgDurationMs)}` },
      { label: '缓存命中', value: formatPercent(opsMetrics.value?.redisHitRate), hint: `hits ${compact(opsMetrics.value?.redisKeyspaceHits)} / misses ${compact(opsMetrics.value?.redisKeyspaceMisses)}` },
      { label: '错误率', value: formatPercent(errorRate.value), hint: `失败 ${aiOverview.value?.failedAiCalls || 0}` }
    ]
  }
])

const failurePercent = (value?: number) => Math.min(100, Math.max(4, ((value || 0) / totalFailures.value) * 100))

const formatThreshold = (value?: number) => Number(value ?? 0).toFixed(2)

const formatDuration = (value?: number) => {
  const ms = Number(value || 0)
  if (!ms) return '--'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}s`
}

const mysqlIndexCards = computed(() => {
  const indexes = vectorHealth.value?.mysqlIndexes || {}
  const cards = [
    {
      key: 'questionEmbedding',
      title: 'Question Embeddings',
      subtitle: 'question_embedding source-state table',
      data: indexes.questionEmbedding
    },
    {
      key: 'personalKnowledgeChunk',
      title: 'Knowledge Chunks',
      subtitle: 'personal_knowledge_chunk source-state table',
      data: indexes.personalKnowledgeChunk
    }
  ]
  return cards.map((item) => ({
    key: item.key,
    title: item.title,
    subtitle: item.data?.lastIndexedAt ? `${item.subtitle} · last ${item.data.lastIndexedAt}` : item.subtitle,
    total: compact(item.data?.total),
    statusCounts: item.data?.statusCounts || [],
    errorMessage: item.data?.errorMessage
  }))
})
const duplicateConfigItems = computed(() => {
  const config = duplicateConfig.value
  if (!config) return []
  return [
    { label: '语义兼容阈值', value: formatThreshold(config.semanticSimilarityThreshold), hint: '旧版语义阈值配置，未配置分层阈值时作为回退' },
    { label: '语义审核阈值', value: formatThreshold(config.semanticReviewThreshold), hint: '向量召回和最终分进入人工审核的最低分' },
    { label: '强命中阈值', value: formatThreshold(config.semanticStrongThreshold), hint: '最终分达到后标记为高置信语义重复' },
    { label: '标题 Jaccard', value: formatThreshold(config.titleJaccardThreshold), hint: '标题词集合相似度门槛' },
    { label: '标题编辑距离', value: formatThreshold(config.titleLevenshteinThreshold), hint: '标题 Levenshtein 相似度门槛' },
    { label: '正文相似度', value: formatThreshold(config.contentSimilarityThreshold), hint: '正文文本规则命中门槛' },
    { label: '向量 / 文本权重', value: `${formatThreshold(config.semanticVectorWeight)} / ${formatThreshold(config.semanticTextWeight)}`, hint: '语义综合分权重' },
    { label: '元数据 / 标签权重', value: `${formatThreshold(config.semanticMetadataWeight)} / ${formatThreshold(config.semanticTagWeight)}`, hint: '分类、题型、难度和标签修正权重' },
    { label: '向量召回数', value: config.vectorSearchLimit, hint: '每题从向量库召回的候选数' },
    { label: '候选池规模', value: config.maxRuleCandidateCount, hint: '规则侧最多比较候选数' },
    { label: '批量检测上限', value: config.maxBatchCheckCount, hint: '单次管理端检测题目数' },
    { label: 'Embedding 批量', value: config.embeddingBatchSize, hint: '批量生成向量的请求大小' }
  ]
})

const vectorRuntimeLabel = computed(() => {
  const config = vectorHealth.value?.config
  if (!config) return '--'
  return `${config.provider || 'qdrant'} ${config.enabled ? 'enabled' : 'disabled'}`
})

const vectorRuntimeHint = computed(() => {
  const config = vectorHealth.value?.config
  if (!config) return 'runtime vector configuration not loaded'
  return `${config.baseUrl || '--'} / ${config.knowledgeCollection || '--'} / chunk ${config.knowledgeChunkSize || '--'}/${config.knowledgeChunkOverlap || 0}`
})

const embeddingMetricHint = computed(() => {
  const metrics = vectorHealth.value?.embeddingMetrics
  if (!metrics) return 'recent embedding calls are not loaded'
  const model = metrics.modelCounts?.[0]?.model || 'UNKNOWN'
  return `last ${metrics.windowDays || 7} days / ${model} / fail ${formatPercent(metrics.failureRate)}`
})

const statusText = (status?: DashboardStatus) => {
  const value = String(status || 'UNKNOWN').toUpperCase()
  const map: Record<string, string> = {
    HEALTHY: '正常',
    SUPPORTED: '正常',
    DEGRADED: '降级',
    DOWN: '不可用',
    UNKNOWN: '未探测到',
    UNSUPPORTED: '未接入探测'
  }
  return map[value] || String(status || '未探测到')
}

const statusTone = (status?: DashboardStatus) => {
  const value = String(status || '').toUpperCase()
  if (value === 'HEALTHY' || value === 'SUPPORTED') return 'healthy'
  if (value === 'DEGRADED') return 'degraded'
  if (value === 'DOWN' || value === 'ERROR') return 'down'
  return 'unknown'
}

const serviceLabel = (value: string) => {
  const map: Record<string, string> = {
    overview: '概览接口',
    database: '数据库',
    'codecoachai-gateway': 'Gateway',
    'codecoachai-auth': 'Auth 服务',
    'codecoachai-user': 'User 服务',
    'codecoachai-resume': 'Resume 服务',
    'codecoachai-interview': 'Interview 服务',
    'codecoachai-question': 'Question 服务',
    'codecoachai-ai': 'AI 服务',
    'codecoachai-task': 'Task 服务',
    'codecoachai-file': 'File 服务'
  }
  return map[value] || value
}

const serviceReasonLabel = (item: { status?: DashboardStatus; reason?: string; source?: string }) => {
  if (item.reason) return item.reason
  if (item.source) return item.source
  const value = String(item.status || '').toUpperCase()
  if (value === 'UNKNOWN') return '本次健康探测未返回可用状态'
  if (value === 'UNSUPPORTED') return '该服务暂未接入运行态探测'
  return '来自管理驾驶舱'
}

const vectorCollectionLabel = (value: string) => {
  const map: Record<string, string> = {
    question_embedding: '题目向量索引',
    personal_knowledge_chunk: '个人知识库向量'
  }
  return map[value] || value
}

const vectorTone = (item: VectorCollectionInfoVO) => {
  if (!vectorHealth.value) return 'unknown'
  if (!vectorHealth.value.enabled) return 'unknown'
  if (item.exists && String(item.status || '').toUpperCase() !== 'ERROR') return 'healthy'
  if (String(item.status || '').toUpperCase() === 'ERROR') return 'down'
  if (!item.exists) return 'down'
  return 'unknown'
}

const vectorCollectionStatus = (item: VectorCollectionInfoVO) => {
  if (!vectorHealth.value) return '未确认'
  if (!vectorHealth.value.enabled) return '未启用'
  if (String(item.status || '').toUpperCase() === 'ERROR') return '异常'
  if (!item.exists) return '缺失'
  return '可用'
}

const vectorCollectionHint = (item: VectorCollectionInfoVO) => {
  if (item.errorMessage) return item.errorMessage
  if (!vectorHealth.value) return 'Qdrant 状态未返回，本页不会自动修复'
  if (!vectorHealth.value?.enabled) return '向量库配置未启用'
  if (!item.exists) return 'Collection 缺失；需人工确认后执行重建，本页不会静默修复'
  return `${item.pointCount || 0} points / ${item.vectorSize || '--'} dims / ${item.distance || '--'}`
}

const vectorDeleteOutboxTone = computed(() => {
  if (!vectorDeleteOutbox.value) return 'unknown'
  if (vectorDeleteOutbox.value?.errorMessage) return 'down'
  if ((vectorDeleteOutbox.value?.failed || 0) > 0) return 'down'
  if ((vectorDeleteOutbox.value?.pending || 0) > 0) return 'degraded'
  return 'healthy'
})

const vectorDeleteOutboxStatus = computed(() => {
  if (!vectorDeleteOutbox.value) return '未确认'
  if (vectorDeleteOutbox.value?.errorMessage) return '异常'
  if ((vectorDeleteOutbox.value?.failed || 0) > 0) return '失败'
  if ((vectorDeleteOutbox.value?.pending || 0) > 0) return '待重试'
  return '清爽'
})

const vectorDeleteOutboxHint = computed(() => {
  const outbox = vectorDeleteOutbox.value
  if (!outbox) return '等待向量健康接口返回补偿队列状态，未自动执行补偿'
  if (outbox.errorMessage) return outbox.errorMessage
  return `待处理 ${outbox.pending || 0} / 失败 ${outbox.failed || 0} / 已完成 ${outbox.done || 0}`
})

const vectorFailureStatusType = (status?: string) => {
  const value = String(status || 'PENDING').toUpperCase()
  if (value === 'FAILED') return 'danger'
  if (value === 'PENDING') return 'warning'
  if (value === 'SUCCESS' || value === 'DONE' || value === 'INDEXED') return 'success'
  return 'info'
}

const vectorJobStatusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (value === 'FAILED') return 'danger'
  if (value === 'SUCCESS') return 'success'
  if (value === 'RUNNING') return 'warning'
  return 'info'
}

const vectorJobStatusLabel = (status?: string) => {
  const value = String(status || 'UNKNOWN').toUpperCase()
  const map: Record<string, string> = {
    RUNNING: '运行中',
    SUCCESS: '成功',
    FAILED: '失败',
    UNKNOWN: '未知'
  }
  return map[value] || value
}

const vectorJobTypeLabel = (type?: string) => {
  const value = String(type || 'UNKNOWN').toUpperCase()
  const map: Record<string, string> = {
    QUESTION_REBUILD: '题目向量重建',
    QUESTION_RETRY: '题目失败重试',
    KNOWLEDGE_REBUILD: '知识库向量重建',
    KNOWLEDGE_RETRY: '知识库失败重试',
    DELETE_OUTBOX_RETRY: '向量删除补偿'
  }
  return map[value] || value
}

const vectorModelHint = (model?: string, dimension?: number) => {
  const modelText = model || 'UNKNOWN'
  return `${modelText} / ${dimension || '--'} dims`
}

const copyVectorText = async (value?: string, message = '已复制') => {
  if (!value) return
  await navigator.clipboard.writeText(value)
  ElMessage.success(message)
}

const openQuestionFailure = (questionId?: number) => {
  if (!questionId) return
  router.push({ path: '/admin/questions', query: { questionId: String(questionId) } })
}

const openKnowledgeFailure = (documentId?: number, chunkId?: number) => {
  if (!documentId && !chunkId) return
  router.push({
    path: '/knowledge',
    query: {
      ...(documentId ? { documentId: String(documentId) } : {}),
      ...(chunkId ? { chunkId: String(chunkId) } : {})
    }
  })
}

const jobStatusLabel = (status?: string) => {
  const map: Record<string, string> = {
    PENDING: '待执行',
    RUNNING: '执行中',
    SUCCESS: '成功',
    FAILED: '失败',
    CANCELED: '已取消'
  }
  return map[String(status || 'UNKNOWN').toUpperCase()] || '未知'
}

const disposeChart = () => {
  trendChart?.dispose()
  trendChart = null
}

const renderChart = async () => {
  await nextTick()
  disposeChart()
  if (!trendChartRef.value || !trendPoints.value.length) return
  trendChart = echarts.init(trendChartRef.value)
  trendChart.setOption({
    backgroundColor: 'transparent',
    color: ['#60a5fa', '#22d3ee', '#a78bfa'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      borderColor: 'rgba(148, 163, 184, 0.28)',
      textStyle: { color: '#e5edf7' }
    },
    legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
    grid: { left: 42, right: 18, top: 28, bottom: 44 },
    xAxis: {
      type: 'category',
      data: trendPoints.value.map((item) => item.date),
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.28)' } },
      axisLabel: { color: '#94a3b8' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.16)', type: 'dashed' } }
    },
    series: [
      { name: '运行数', type: 'line', smooth: true, data: trendPoints.value.map((item) => item.runCount || 0) },
      { name: '成功数', type: 'line', smooth: true, data: trendPoints.value.map((item) => item.successRunCount || 0) },
      { name: '失败数', type: 'line', smooth: true, data: trendPoints.value.map((item) => item.failedRunCount || 0) }
    ]
  })
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = { days: rangeDays.value }
    const [aiData, agentData, trendData, failureData, dashboardData, jobsPage, vectorData, vectorFailureData, vectorJobsPage, duplicateConfigData] = await Promise.all([
      getAdminAiOverviewApi(params),
      getAdminAgentOverviewApi(params),
      getAdminAgentTrendApi(params),
      getAdminAiFailuresApi(params),
      getAdminDashboardOverviewApi(),
      getAdminAnalyticsJobsApi({ pageNo: 1, pageSize: 6 }),
      getAdminVectorStoreHealthApi(),
      getAdminVectorStoreFailuresApi({
        type: 'all',
        status: vectorFailureStatus.value,
        limit: vectorFailureLimit.value
      }),
      getAdminVectorIndexJobsApi({
        status: vectorJobStatus.value,
        pageNo: 1,
        pageSize: 8
      }),
      getQuestionDuplicateConfigApi()
    ])
    aiOverview.value = aiData
    agentOverview.value = agentData
    trendPoints.value = trendData
    failurePoints.value = failureData
    dashboard.value = dashboardData
    jobs.value = jobsPage.records || []
    vectorHealth.value = vectorData
    vectorFailures.value = vectorFailureData
    vectorJobs.value = vectorJobsPage.records || []
    duplicateConfig.value = duplicateConfigData
    await renderChart()
  } catch (error) {
    errorMessage.value = error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message || '接口请求失败')
      : '接口请求失败'
  } finally {
    loading.value = false
  }
}

const loadVectorFailures = async () => {
  vectorFailureLoading.value = true
  try {
    vectorFailures.value = await getAdminVectorStoreFailuresApi({
      type: 'all',
      status: vectorFailureStatus.value,
      limit: vectorFailureLimit.value
    })
  } finally {
    vectorFailureLoading.value = false
  }
}

const loadVectorJobs = async () => {
  vectorJobLoading.value = true
  try {
    const result = await getAdminVectorIndexJobsApi({
      status: vectorJobStatus.value,
      pageNo: 1,
      pageSize: 8
    })
    vectorJobs.value = result.records || []
  } finally {
    vectorJobLoading.value = false
  }
}

const questionVectorSummary = (result: QuestionEmbeddingRebuildResult) => {
  const errors = result.errors?.length ? `, errors ${result.errors.length}` : ''
  return `updated ${result.updated || 0}, vectors ${result.vectorUpdated || 0}, deleted ${result.vectorDeleted || 0}${errors}`
}

const knowledgeVectorSummary = (result: KnowledgeVectorRebuildVO) => {
  const errors = result.errors?.length ? `, errors ${result.errors.length}` : ''
  return `docs ${result.documentCount || 0}, chunks ${result.chunkCount || 0}, vectors ${result.vectorUpdated || 0}, deleted ${result.vectorDeleted || 0}${errors}`
}

const recordQuestionVectorAction = (title: string, result: QuestionEmbeddingRebuildResult) => {
  lastVectorAction.value = {
    title,
    summary: questionVectorSummary(result),
    detail: result.vectorEnabled === false ? 'Vector store is disabled; only metadata was updated.' : undefined
  }
}

const recordKnowledgeVectorAction = (title: string, result: KnowledgeVectorRebuildVO) => {
  lastVectorAction.value = {
    title,
    summary: knowledgeVectorSummary(result),
    detail: result.vectorEnabled === false ? 'Vector store is disabled; only chunk states were inspected.' : undefined
  }
}

const confirmVectorAction = async (message: string, title: string) => {
  try {
    await ElMessageBox.confirm(message, title, {
      type: 'warning',
      confirmButtonText: 'Confirm run',
      cancelButtonText: 'Cancel'
    })
    return true
  } catch {
    return false
  }
}

const handleRebuildQuestionVectors = async () => {
  const confirmed = await confirmVectorAction(
    'Rebuild up to 5000 question embeddings and Qdrant points. This may call the embedding provider and will not run as an automatic repair.',
    'Rebuild question vectors'
  )
  if (!confirmed) return
  rebuildingQuestionVectors.value = true
  try {
    const result = await rebuildQuestionEmbeddingApi(5000)
    const summary = questionVectorSummary(result)
    recordQuestionVectorAction('Question vector rebuild', result)
    ElMessage.success(summary)
    await loadVectorJobs()
    await loadPage()
  } finally {
    rebuildingQuestionVectors.value = false
  }
}

const handleRetryQuestionVectors = async () => {
  const confirmed = await confirmVectorAction(
    'Retry up to 1000 failed or stale pending question embeddings. This may create or replace Qdrant points.',
    'Retry question vectors'
  )
  if (!confirmed) return
  retryingQuestionVectors.value = true
  try {
    const result = await retryFailedQuestionEmbeddingApi(1000)
    const summary = questionVectorSummary(result)
    recordQuestionVectorAction('Question vector retry', result)
    ElMessage.success(summary)
    await loadVectorJobs()
    await loadPage()
  } finally {
    retryingQuestionVectors.value = false
  }
}

const handleRebuildKnowledgeVectors = async () => {
  const confirmed = await confirmVectorAction(
    'Rebuild up to 5000 personal knowledge documents across users. This is a high-cost maintenance action and requires manual confirmation.',
    'Rebuild knowledge vectors'
  )
  if (!confirmed) return
  rebuildingKnowledgeVectors.value = true
  try {
    const result = await rebuildAdminKnowledgeVectorsApi(5000)
    const summary = knowledgeVectorSummary(result)
    recordKnowledgeVectorAction('Knowledge vector rebuild', result)
    ElMessage.success(summary)
    await loadVectorJobs()
    await loadPage()
  } finally {
    rebuildingKnowledgeVectors.value = false
  }
}

const handleRetryKnowledgeVectors = async () => {
  const confirmed = await confirmVectorAction(
    'Retry up to 1000 failed or stale pending knowledge chunks. Review the failure details first if Qdrant state is missing or uncertain.',
    'Retry knowledge vectors'
  )
  if (!confirmed) return
  retryingKnowledgeVectors.value = true
  try {
    const result = await retryAdminKnowledgeVectorsApi(1000)
    const summary = knowledgeVectorSummary(result)
    recordKnowledgeVectorAction('Knowledge vector retry', result)
    ElMessage.success(summary)
    await loadVectorJobs()
    await loadPage()
  } finally {
    retryingKnowledgeVectors.value = false
  }
}
const handleRetryVectorDeletes = async () => {
  const retryable = vectorDeleteOutbox.value?.retryable || 0
  const confirmed = await confirmVectorAction(
    `Retry up to 500 Qdrant delete-outbox records. Current retryable pending/failed records: ${retryable}. This page will not silently repair missing collections.`,
    'Retry vector delete compensation'
  )
  if (!confirmed) return
  retryingVectorDeletes.value = true
  try {
    const result = await retryAdminVectorDeletesApi(500)
    const summary = `补偿完成：匹配 ${result.matched || 0} 条，删除 ${result.deleted || 0} 条，失败 ${result.failed || 0} 条`
    if ((result.errors || []).length || result.failed) {
      await ElMessageBox.alert(
        [summary, ...(result.errors || []).slice(0, 8).map((item, index) => `${index + 1}. ${item}`)].join('\n'),
        '向量删除补偿结果',
        { type: 'warning' }
      )
    } else {
      ElMessage.success(summary)
    }
    await loadVectorJobs()
    await loadPage()
  } finally {
    retryingVectorDeletes.value = false
  }
}

const resizeChart = () => trendChart?.resize()

onMounted(async () => {
  await loadPage()
  window.addEventListener('resize', resizeChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  disposeChart()
})
</script>

<style scoped lang="scss">
.ops-page {
  .ops-hero {
    background:
      linear-gradient(135deg, rgba(79, 70, 229, 0.24), rgba(14, 165, 233, 0.16)),
      rgba(15, 23, 42, 0.76);
    color: var(--app-text);
  }

  .admin-hero__desc,
  .admin-eyebrow {
    color: var(--app-text-muted);
  }

  :deep(.el-segmented) {
    --el-segmented-bg-color: rgba(15, 23, 42, 0.76);
    --el-segmented-item-selected-bg-color: rgba(99, 102, 241, 0.9);
    --el-segmented-item-selected-color: #ffffff;
    --el-border-radius-base: 8px;
    border: 1px solid rgba(148, 163, 184, 0.18);
  }

  :deep(.el-button) {
    border-color: rgba(148, 163, 184, 0.22);
    background: rgba(15, 23, 42, 0.72);
    color: var(--app-text);
  }
}

.ops-card-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.ops-card,
.ops-panel {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.74);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.18);
}

.ops-card {
  padding: 22px;
  backdrop-filter: blur(14px);
}

.ops-card__head,
.ops-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.ops-card__head {
  justify-content: flex-start;
  margin-bottom: 18px;
}

.ops-card__icon {
  display: inline-flex;
  flex: 0 0 50px;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 8px;
  background: rgba(96, 165, 250, 0.16);
  color: #93c5fd;
}

.tone-cyan {
  background: rgba(34, 211, 238, 0.14);
  color: #67e8f9;
}

.tone-violet {
  background: rgba(167, 139, 250, 0.15);
  color: #c4b5fd;
}

.tone-green {
  background: rgba(16, 185, 129, 0.14);
  color: #6ee7b7;
}

.ops-card h2,
.ops-panel h2 {
  margin: 0;
  color: var(--app-text);
  font-size: 20px;
}

.ops-card p,
.ops-panel p {
  margin: 6px 0 0;
  color: var(--app-text-muted);
}

.ops-mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.ops-mini {
  min-height: 82px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.26);
}

.ops-mini span,
.ops-mini small {
  display: block;
  color: var(--app-text-muted);
}

.ops-mini strong {
  display: block;
  margin: 6px 0;
  color: var(--app-text);
  font-size: 24px;
  line-height: 1.1;
}

.ops-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(360px, 1fr);
  gap: 16px;
}

.ops-panel {
  min-width: 0;
  padding: 22px;
}

.ops-chart {
  width: 100%;
  height: 360px;
  margin-top: 18px;
}

.ops-model-list,
.ops-service-list,
.ops-job-list {
  display: grid;
  gap: 12px;
  max-height: 360px;
  margin-top: 18px;
  overflow: auto;
  padding-right: 4px;
  scrollbar-width: thin;
}

.ops-config-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.ops-config-item {
  min-height: 92px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.ops-config-item span,
.ops-config-item small {
  display: block;
  color: var(--app-text-muted);
}

.ops-config-item strong {
  display: block;
  margin: 8px 0 6px;
  color: var(--app-text);
  font-size: 22px;
  line-height: 1.1;
}

.ops-model-row,
.ops-service-row,
.ops-job-row {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.ops-model-row {
  padding: 14px;
}

.ops-model-row > div,
.ops-service-row,
.ops-job-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ops-model-row strong,
.ops-service-row strong,
.ops-job-row strong {
  color: var(--app-text);
}

.ops-model-row span,
.ops-service-row small,
.ops-job-row small {
  display: block;
  margin-top: 4px;
  color: var(--app-text-muted);
}

.ops-service-row,
.ops-job-row {
  padding: 12px;
}

.ops-service-row em {
  flex: 0 0 auto;
  font-style: normal;
  font-weight: 700;
}

.ops-dot {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #facc15;
}

.ops-dot--healthy {
  background: #22c55e;
}

.ops-dot--down {
  background: #ef4444;
}

.ops-dot--degraded,
.ops-dot--unknown {
  background: #facc15;
}

.status-healthy {
  color: #4ade80;
}

.status-degraded,
.status-unknown {
  color: #facc15;
}

.status-down {
  color: #f87171;
}

.vector-index-grid,
.vector-runtime-grid,
.vector-action-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.vector-index-grid,
.vector-runtime-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.vector-index-card,
.vector-action-result {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.vector-index-card {
  min-height: 132px;
  padding: 14px;
}

.vector-index-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.vector-index-card__head span,
.vector-index-card small,
.vector-index-card em,
.vector-action-result small {
  color: var(--app-text-muted);
}

.vector-index-card__head strong {
  color: var(--app-text);
  font-size: 24px;
  line-height: 1.1;
}

.vector-status-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.vector-status-list span {
  padding: 4px 8px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  color: var(--app-text);
  background: rgba(15, 23, 42, 0.42);
  font-size: 12px;
}

.vector-state-alert {
  margin-top: 14px;
}

.vector-action-group {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.24);
}

.vector-action-group--risk {
  border-color: rgba(245, 158, 11, 0.22);
  background: rgba(120, 53, 15, 0.14);
}

.vector-action-group__label {
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.vector-action-list :deep(.el-button) {
  justify-content: flex-start;
  width: 100%;
  margin-left: 0;
}

.vector-action-result {
  display: grid;
  gap: 6px;
  margin-top: 14px;
  padding: 14px;
}

.vector-action-result strong,
.vector-action-result span {
  color: var(--app-text);
}

.vector-failure-grid {
  grid-template-columns: 1fr;
}

.vector-job-grid {
  grid-template-columns: 1fr;
}

.vector-failure-head {
  align-items: center;
}

.vector-failure-tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.vector-failure-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.vector-failure-summary__item {
  min-height: 76px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.vector-failure-summary__item span {
  display: block;
  color: var(--app-text-muted);
}

.vector-failure-summary__item strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 20px;
  line-height: 1.2;
  word-break: break-word;
}

.vector-failure-alert,
.vector-failure-tabs {
  margin-top: 16px;
}

.ops-table {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.ops-table :deep(.el-table__inner-wrapper),
.ops-table :deep(.el-table__body-wrapper),
.ops-table :deep(.el-table__header-wrapper) {
  background: rgba(2, 6, 23, 0.3);
}

.ops-table :deep(.el-table__cell) {
  background: rgba(2, 6, 23, 0.22);
  color: var(--app-text);
  border-bottom-color: rgba(148, 163, 184, 0.12);
}

.ops-table :deep(th.el-table__cell) {
  background: rgba(15, 23, 42, 0.82);
  color: var(--app-text-muted);
}

.ops-table :deep(.el-table__empty-text) {
  color: var(--app-text-muted);
}

.vector-error-text,
.vector-point-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  color: var(--app-text);
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.vector-error-text {
  color: #fca5a5;
}

.vector-empty-text {
  color: var(--app-text-muted);
}

.vector-job-table {
  margin-top: 16px;
}

.vector-job-main strong,
.vector-job-main small {
  display: block;
}

.vector-job-main strong {
  color: var(--app-text);
}

.vector-job-main small {
  margin-top: 3px;
  overflow: hidden;
  color: var(--app-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vector-row-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
@media (max-width: 1280px) {
  .ops-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ops-config-grid,
  .vector-failure-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .ops-card-grid,
  .ops-main-grid {
    grid-template-columns: 1fr;
  }

  .ops-config-grid,
  .vector-index-grid,
  .vector-runtime-grid,
  .vector-failure-summary {
    grid-template-columns: 1fr;
  }

  .vector-failure-head,
  .vector-failure-tools {
    align-items: stretch;
    flex-direction: column;
  }

  .vector-failure-tools :deep(.el-button),
  .vector-failure-tools :deep(.el-select) {
    width: 100% !important;
  }
}
</style>
