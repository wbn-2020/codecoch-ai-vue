<template>
  <div class="page-shell admin-console-page ai-ops-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Bot :size="16" />
          <span>AI 运营分析</span>
        </div>
        <h1 class="admin-hero__title">智能生成运营看板</h1>
        <p class="admin-hero__desc">聚合智能生成成功率、耗时、消耗统计和失败原因，支撑智能教练生成链路观测。</p>
      </div>
      <div class="admin-hero__actions">
        <el-segmented v-model="rangeDays" :options="rangeOptions" @change="loadPage" />
        <el-button
          v-permission="'admin:analytics:job:run'"
          type="primary"
          :disabled="pageActionDisabled"
          :title="pageActionDisabledTitle"
          @click="openManualRun"
        >
          运行每日计划
        </el-button>
        <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="AI 运营数据加载失败" :description="errorMessage">
      <el-button type="primary" @click="loadPage">重试</el-button>
    </AppState>

    <template v-else>
      <AppState
        v-if="partialErrors.length"
        class="admin-diagnostic-state"
        type="disabled"
        title="部分 AI 运营数据未返回"
        :description="partialErrorDescription"
      >
        <div class="diagnostic-actions">
          <el-button type="primary" @click="loadPage">重新加载</el-button>
          <el-button @click="$router.push('/admin/ai/logs')">查看智能生成记录</el-button>
          <el-button @click="$router.push('/admin/analytics/jobs')">查看聚合任务</el-button>
        </div>
      </AppState>

      <div class="admin-insight-grid" v-loading="loading">
        <article v-for="item in metrics" :key="item.key" class="admin-insight-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.hint }}</small>
        </article>
      </div>

      <div class="admin-dashboard-grid ai-ops-grid">
        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>运行结构</h2>
              <p>成功与失败运行占比。</p>
            </div>
            <el-tag type="success" effect="plain">运行记录</el-tag>
          </div>
          <div v-if="hasAiCallData" ref="successChartRef" class="analytics-chart"></div>
          <AppState
            v-else-if="!loading"
            class="admin-empty-wrap"
            type="empty"
            :title="aiCallStructureEmptyTitle"
            :description="aiCallStructureEmptyDescription"
          >
            <div class="diagnostic-actions">
              <el-button type="primary" @click="$router.push('/admin/ai/logs')">查看运行记录</el-button>
              <el-button @click="loadPage">重新加载</el-button>
            </div>
          </AppState>
        </section>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>失败原因 Top</h2>
              <p>按错误消息前缀聚合，便于定位提示词、模型或网络问题。</p>
            </div>
          </div>
          <div class="failure-list">
            <div v-for="item in failures" :key="item.name" class="failure-row">
              <span>{{ translateFailureReason(item.name) }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <AppState
              v-if="!failures.length && !loading"
              type="empty"
              :title="failureEmptyTitle"
              :description="failureEmptyDescription"
            >
              <div class="diagnostic-actions">
                <el-button type="primary" @click="$router.push('/admin/ai/logs?status=FAILED')">查看失败日志</el-button>
                <el-button @click="loadPage">重新加载</el-button>
              </div>
            </AppState>
          </div>
        </section>
      </div>

      <div class="admin-dashboard-grid ai-ops-grid">
        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>智能教练反馈</h2>
              <p>采用、忽略、点赞和点踩反馈聚合。</p>
            </div>
            <el-tag effect="plain">反馈采纳</el-tag>
          </div>
          <div class="feedback-grid">
            <article v-for="item in feedbackMetrics" :key="item.key" class="feedback-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
          <div class="failure-list">
            <div v-for="item in feedbackTypes" :key="item.name" class="failure-row">
              <span>{{ translateFeedbackType(item.name) }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <AppState
              v-if="!feedbackTypes.length && !loading"
              type="empty"
              :title="feedbackEmptyTitle"
              :description="feedbackEmptyDescription"
            >
              <div class="diagnostic-actions">
                <el-button type="primary" @click="$router.push('/admin/agent/tasks')">查看智能任务</el-button>
                <el-button @click="loadPage">重新加载</el-button>
              </div>
            </AppState>
          </div>
        </section>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>AI 结果质量反馈</h2>
              <p>用户对简历匹配、面试报告等 AI 输出的可信度反馈。</p>
            </div>
            <el-tag effect="plain">可信度反馈</el-tag>
          </div>
          <div class="feedback-grid">
            <article v-for="item in qualityFeedbackMetrics" :key="item.key" class="feedback-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
          <div class="failure-list">
            <div v-for="item in qualityFeedbackTypes" :key="item.name" class="failure-row">
              <span>{{ translateFeedbackType(item.name) }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <AppState
              v-if="!qualityFeedbackTypes.length && !loading"
              type="empty"
              :title="qualityFeedbackEmptyTitle"
              :description="qualityFeedbackEmptyDescription"
            >
              <div class="diagnostic-actions">
                <el-button type="primary" @click="$router.push('/admin/ai/logs')">查看运行记录</el-button>
                <el-button @click="loadPage">重新加载</el-button>
              </div>
            </AppState>
          </div>
        </section>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>训练快照</h2>
              <p>任务训练统计与智能教练趋势摘要。</p>
            </div>
            <el-tag effect="plain">训练趋势</el-tag>
          </div>
          <div class="feedback-grid">
            <article v-for="item in trainingMetrics" :key="item.key" class="feedback-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
          <div class="trend-list">
            <div v-for="item in trainingTrend" :key="item.date" class="trend-row">
              <span>{{ item.date || '--' }}</span>
              <strong>{{ item.runCount ?? 0 }}</strong>
              <small>成功 {{ item.successRunCount ?? 0 }} / 失败 {{ item.failedRunCount ?? 0 }}</small>
            </div>
            <AppState
              v-if="!trainingTrend.length && !loading"
              type="empty"
              :title="trainingTrendEmptyTitle"
              :description="trainingTrendEmptyDescription"
            >
              <div class="diagnostic-actions">
                <el-button type="primary" @click="$router.push('/admin/analytics/jobs')">查看聚合任务</el-button>
                <el-button @click="loadPage">重新加载</el-button>
              </div>
            </AppState>
          </div>
        </section>
      </div>

      <div class="admin-dashboard-grid ai-ops-grid">
        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>指标字典</h2>
              <p>展示运营指标定义，完整编辑入口在指标字典页面。</p>
            </div>
            <div class="panel-actions">
              <el-button link type="primary" @click="$router.push('/admin/analytics/metrics')">打开</el-button>
              <div class="table-view-tools">
                <el-segmented v-model="metricTableSize" :options="metricTableSizeOptions" />
                <el-dropdown trigger="click" :hide-on-click="false">
                  <el-button plain>列配置</el-button>
                  <template #dropdown>
                    <el-dropdown-menu class="column-config-menu">
                      <el-dropdown-item v-for="item in metricColumnOptions" :key="item.key">
                        <el-checkbox v-model="metricVisibleColumns[item.key]" :disabled="item.required">
                          {{ item.label }}
                        </el-checkbox>
                      </el-dropdown-item>
                      <el-dropdown-item divided>
                        <el-button link type="primary" @click.stop="resetMetricTableView">恢复默认视图</el-button>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
          <el-table :data="metricDefs" row-key="id" :size="metricTableSize">
            <el-table-column v-if="isMetricColumnVisible('metricCode')" prop="metricCode" label="指标编码" min-width="180" show-overflow-tooltip />
            <el-table-column v-if="isMetricColumnVisible('metricName')" label="指标名称" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ translateMetricName(row.metricName) }}</template>
            </el-table-column>
            <el-table-column v-if="isMetricColumnVisible('category')" label="分类" width="120">
              <template #default="{ row }">{{ translateMetricCategory(row.category) }}</template>
            </el-table-column>
            <el-table-column v-if="isMetricColumnVisible('enabled')" label="启用状态" width="100">
              <template #default="{ row }"><StatusTag :status="row.enabled" /></template>
            </el-table-column>
            <template #empty>
              <AppState :type="metricEmptyType" :title="metricEmptyTitle" :description="metricEmptyDescription">
                <div class="diagnostic-actions">
                  <el-button type="primary" @click="$router.push('/admin/analytics/metrics')">打开指标字典</el-button>
                  <el-button @click="loadPage">重新加载</el-button>
                </div>
              </AppState>
            </template>
          </el-table>
        </section>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>最近聚合任务</h2>
              <p>最近聚合任务，支持重跑单条日志。</p>
            </div>
            <div class="panel-actions">
              <el-button link type="primary" @click="$router.push('/admin/analytics/jobs')">打开</el-button>
              <div class="table-view-tools">
                <el-segmented v-model="jobTableSize" :options="jobTableSizeOptions" />
                <el-dropdown trigger="click" :hide-on-click="false">
                  <el-button plain>列配置</el-button>
                  <template #dropdown>
                    <el-dropdown-menu class="column-config-menu">
                      <el-dropdown-item v-for="item in jobColumnOptions" :key="item.key">
                        <el-checkbox v-model="jobVisibleColumns[item.key]" :disabled="item.required">
                          {{ item.label }}
                        </el-checkbox>
                      </el-dropdown-item>
                      <el-dropdown-item divided>
                        <el-button link type="primary" @click.stop="resetJobTableView">恢复默认视图</el-button>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
          <el-table :data="jobs" row-key="id" :size="jobTableSize">
            <el-table-column v-if="isJobColumnVisible('jobCode')" prop="jobCode" label="任务编码" min-width="160" show-overflow-tooltip />
            <el-table-column v-if="isJobColumnVisible('jobName')" label="任务名称" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ translateJobName(row.jobName || row.jobCode) }}</template>
            </el-table-column>
            <el-table-column v-if="isJobColumnVisible('status')" label="状态" width="110">
              <template #default="{ row }"><StatusTag :status="row.status" /></template>
            </el-table-column>
            <el-table-column v-if="isJobColumnVisible('statDate')" prop="statDate" label="统计日期" width="120" />
            <el-table-column v-if="isJobColumnVisible('operation')" label="操作" width="100">
              <template #default="{ row }">
                <el-button
                  v-permission="'admin:analytics:job:run'"
                  link
                  type="primary"
                  :loading="rerunningId === row.id"
                  :disabled="pageActionDisabled"
                  :title="pageActionDisabledTitle"
                  @click="rerunJob(row)"
                >
                  重跑
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <AppState :type="jobEmptyType" :title="jobEmptyTitle" :description="jobEmptyDescription">
                <div class="diagnostic-actions">
                  <el-button
                    v-permission="'admin:analytics:job:run'"
                    type="primary"
                    :disabled="pageActionDisabled"
                    :title="pageActionDisabledTitle"
                    @click="openManualRun"
                  >
                    运行每日计划
                  </el-button>
                  <el-button @click="$router.push('/admin/analytics/jobs')">打开聚合任务</el-button>
                </div>
              </AppState>
            </template>
          </el-table>
        </section>

        <section class="admin-panel vector-job-panel">
          <div class="admin-panel__header">
            <div>
              <h2>语义索引任务历史</h2>
              <p>题库、知识库和删除补偿的最近索引维护任务。</p>
            </div>
            <div class="panel-actions panel-actions--stacked">
              <div class="vector-job-tools">
                <el-select v-model="vectorJobType" style="width: 150px" @change="loadVectorJobs">
                  <el-option v-for="item in vectorJobTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
                <el-select v-model="vectorJobStatus" style="width: 108px" @change="loadVectorJobs">
                  <el-option v-for="item in vectorJobStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
                <el-button :icon="RefreshCw" :loading="vectorJobLoading" @click="loadVectorJobs">刷新</el-button>
              </div>
              <div class="table-view-tools">
                <el-segmented v-model="vectorTableSize" :options="vectorTableSizeOptions" />
                <el-dropdown trigger="click" :hide-on-click="false">
                  <el-button plain>列配置</el-button>
                  <template #dropdown>
                    <el-dropdown-menu class="column-config-menu">
                      <el-dropdown-item v-for="item in vectorColumnOptions" :key="item.key">
                        <el-checkbox v-model="vectorVisibleColumns[item.key]" :disabled="item.required">
                          {{ item.label }}
                        </el-checkbox>
                      </el-dropdown-item>
                      <el-dropdown-item divided>
                        <el-button link type="primary" @click.stop="resetVectorTableView">恢复默认视图</el-button>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
          <el-alert
            v-if="highlightedVectorJobId"
            class="vector-job-alert"
            type="info"
            :closable="false"
            show-icon
            :title="`正在定位索引任务编号 ${highlightedVectorJobId}`"
          />
          <el-table
            v-loading="vectorJobLoading"
            :data="vectorJobs"
            row-key="id"
            :size="vectorTableSize"
            :row-class-name="vectorJobRowClassName"
          >
            <el-table-column v-if="isVectorColumnVisible('task')" label="任务" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="vector-job-main">
                  <strong>{{ vectorJobTypeLabel(row.jobType) }}</strong>
                  <small>{{ row.jobNo || `任务编号 ${row.id || '-'}` }}</small>
                </div>
              </template>
            </el-table-column>
            <el-table-column v-if="isVectorColumnVisible('scope')" label="范围" min-width="130">
              <template #default="{ row }">{{ row.scopeType || '-' }}{{ row.scopeId ? ` / ${row.scopeId}` : '' }}</template>
            </el-table-column>
            <el-table-column v-if="isVectorColumnVisible('status')" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="vectorJobStatusTagType(row.status)" effect="plain">{{ vectorJobStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column v-if="isVectorColumnVisible('counts')" label="数量" min-width="150">
              <template #default="{ row }">{{ row.successCount || 0 }}/{{ row.totalCount || 0 }} 成功 · 失败 {{ row.failedCount || 0 }}</template>
            </el-table-column>
            <el-table-column v-if="isVectorColumnVisible('vector')" label="索引变更" min-width="130">
              <template #default="{ row }">写入 {{ row.vectorUpdated || 0 }} / 删除 {{ row.vectorDeleted || 0 }}</template>
            </el-table-column>
            <el-table-column v-if="isVectorColumnVisible('time')" label="时间" min-width="150">
              <template #default="{ row }">{{ formatDateTime(row.finishedAt || row.startedAt || row.createdAt) }}</template>
            </el-table-column>
            <el-table-column v-if="isVectorColumnVisible('lastError')" prop="lastError" label="错误" min-width="180" show-overflow-tooltip />
            <template #empty>
              <AppState :type="vectorJobEmptyType" :title="vectorJobEmptyTitle" :description="vectorJobEmptyDescription">
                <div class="diagnostic-actions">
                  <el-button type="primary" @click="loadVectorJobs">刷新索引任务</el-button>
                  <el-button @click="$router.push('/admin/async-tasks')">查看任务中心</el-button>
                </div>
              </AppState>
            </template>
          </el-table>
        </section>
      </div>
    </template>

    <el-dialog v-model="manualDialogVisible" title="运行每日计划聚合" width="620px">
      <el-form :model="manualForm" label-position="top">
        <div class="manual-grid">
          <el-form-item label="统计日期">
            <el-date-picker v-model="manualForm.statDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
          </el-form-item>
          <el-form-item label="目标岗位编号">
            <el-input-number v-model="manualForm.targetJobId" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="任务数量">
            <el-input-number v-model="manualForm.taskCount" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="最大总分钟数">
            <el-input-number v-model="manualForm.maxTotalMinutes" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="用户编号">
          <el-input v-model.trim="manualUserIds" placeholder="多个用户编号用英文逗号分隔，可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="manualDialogVisible = false">取消</el-button>
        <el-button
          v-permission="'admin:analytics:job:run'"
          type="primary"
          :loading="manualRunning"
          :disabled="pageActionDisabled"
          :title="pageActionDisabledTitle"
          @click="runDailyPlan"
        >
          运行
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Bot, RefreshCw } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  getAdminAiFailuresApi,
  getAdminAiOverviewApi,
  getAdminAgentFeedbackApi,
  getAdminAnalyticsJobsApi,
  getAdminAnalyticsMetricsApi,
  getAdminAnalyticsOverviewApi,
  getAdminAnalyticsTrainingApi,
  getAdminVectorIndexJobsApi,
  rerunAdminAnalyticsJobApi,
  runAdminAnalyticsDailyPlanApi
} from '@/api/analytics'
import { getAdminAiResultFeedbackStatsApi } from '@/api/aiFeedback'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { PageResult } from '@/types/api'
import type { AiResultFeedbackStatsVO } from '@/types/aiFeedback'
import type {
  AdminAiOverviewVO,
  AdminAnalyticsOverviewVO,
  AdminAnalyticsJobLogVO,
  AdminAnalyticsMetricDefinitionVO,
  AdminAnalyticsTrainingVO,
  AgentFeedbackStatsVO,
  MetricPointVO,
  TrendPointVO,
  VectorIndexJobVO
} from '@/types/analytics'
import { useRoute } from 'vue-router'
import {
  translateFailureReason,
  translateFeedbackType,
  translateJobName,
  translateMetricCategory,
  translateMetricName
} from '@/utils/adminDisplay'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import type { ECharts } from '@/utils/echarts'
import { toFriendlyMessage } from '@/utils/error'

type MetricColumnKey = 'metricCode' | 'metricName' | 'category' | 'enabled'
type JobColumnKey = 'jobCode' | 'jobName' | 'status' | 'statDate' | 'operation'
type VectorColumnKey = 'task' | 'scope' | 'status' | 'counts' | 'vector' | 'time' | 'lastError'

const {
  tableSize: metricTableSize,
  tableSizeOptions: metricTableSizeOptions,
  columnOptions: metricColumnOptions,
  visibleColumns: metricVisibleColumns,
  isColumnVisible: isMetricColumnVisible,
  resetTableView: resetMetricTableView
} = useAdminTableView<MetricColumnKey>('admin:ai-ops:metrics', [
  { key: 'metricCode', label: '指标编码', required: true },
  { key: 'metricName', label: '指标名称', required: true },
  { key: 'category', label: '分类' },
  { key: 'enabled', label: '启用状态' }
])

const {
  tableSize: jobTableSize,
  tableSizeOptions: jobTableSizeOptions,
  columnOptions: jobColumnOptions,
  visibleColumns: jobVisibleColumns,
  isColumnVisible: isJobColumnVisible,
  resetTableView: resetJobTableView
} = useAdminTableView<JobColumnKey>('admin:ai-ops:jobs', [
  { key: 'jobCode', label: '任务编码', required: true },
  { key: 'jobName', label: '任务名称', required: true },
  { key: 'status', label: '状态', required: true },
  { key: 'statDate', label: '统计日期' },
  { key: 'operation', label: '操作', required: true }
])

const {
  tableSize: vectorTableSize,
  tableSizeOptions: vectorTableSizeOptions,
  columnOptions: vectorColumnOptions,
  visibleColumns: vectorVisibleColumns,
  isColumnVisible: isVectorColumnVisible,
  resetTableView: resetVectorTableView
} = useAdminTableView<VectorColumnKey>('admin:ai-ops:vector-jobs', [
  { key: 'task', label: '任务', required: true },
  { key: 'scope', label: '范围', defaultVisible: false },
  { key: 'status', label: '状态', required: true },
  { key: 'counts', label: '数量', required: true },
  { key: 'vector', label: '索引写入/删除' },
  { key: 'time', label: '时间' },
  { key: 'lastError', label: '错误', defaultVisible: false }
])

const loading = ref(false)
const vectorJobLoading = ref(false)
const errorMessage = ref('')
const partialErrors = ref<string[]>([])
const rangeDays = ref(7)
const route = useRoute()
const overview = ref<AdminAiOverviewVO>()
const feedback = ref<AgentFeedbackStatsVO>()
const aiResultFeedback = ref<AiResultFeedbackStatsVO>()
const trainingTaskStats = ref({ totalAgentTasks: 0, doneTaskCount: 0, skippedTaskCount: 0, taskCompletionRate: 0 })
const trainingTrend = ref<TrendPointVO[]>([])
const failures = ref<MetricPointVO[]>([])
const metricDefs = ref<AdminAnalyticsMetricDefinitionVO[]>([])
const jobs = ref<AdminAnalyticsJobLogVO[]>([])
const vectorJobs = ref<VectorIndexJobVO[]>([])
const vectorJobStatus = ref<'ALL' | 'RUNNING' | 'SUCCESS' | 'FAILED'>('ALL')
const vectorJobType = ref('')
const vectorScopeType = ref('')
const rerunningId = ref<number>()
const manualDialogVisible = ref(false)
const manualRunning = ref(false)
const manualUserIds = ref('')
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()
const successChartRef = ref<HTMLElement>()
let successChart: ECharts | null = null
let aiOpsMounted = false
let chartRenderSeq = 0
let echartsModulePromise: Promise<typeof import('@/utils/echarts')> | null = null

const rangeOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 }
]

const vectorJobStatusOptions: Array<{ label: string; value: 'ALL' | 'RUNNING' | 'SUCCESS' | 'FAILED' }> = [
  { label: '全部', value: 'ALL' },
  { label: '运行中', value: 'RUNNING' },
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' }
]

const vectorJobTypeOptions = [
  { label: '全部任务', value: '' },
  { label: '题目语义索引重建', value: 'QUESTION_REBUILD' },
  { label: '题目失败重试', value: 'QUESTION_RETRY' },
  { label: '知识库语义索引重建', value: 'KNOWLEDGE_REBUILD' },
  { label: '知识库失败重试', value: 'KNOWLEDGE_RETRY' },
  { label: '索引删除补偿', value: 'DELETE_OUTBOX_RETRY' }
]

const dataSourceLabels = {
  aiOverview: '智能生成概览',
  failures: '失败原因',
  opsOverview: '运营聚合概览',
  training: '训练快照',
  feedback: '智能教练反馈',
  aiResultFeedback: 'AI 结果反馈',
  metrics: '指标字典',
  jobs: '聚合任务',
  vectorJobs: '语义索引任务'
} as const

const sourceFailed = (label: string) => partialErrors.value.includes(label)
const markSourceFailed = (label: string) => {
  if (!partialErrors.value.includes(label)) {
    partialErrors.value = [...partialErrors.value, label]
  }
}

const clearSourceFailed = (label: string) => {
  partialErrors.value = partialErrors.value.filter((item) => item !== label)
}

const hasPageError = computed(() => Boolean(errorMessage.value))
const pageActionDisabled = computed(() => hasPageError.value || isAdminMobileReadonly.value)
const pageActionDisabledTitle = computed(() =>
  mobileReadonlyTitle(hasPageError.value ? '当前 AI 运营数据加载失败，请先重新加载或进入生成监控确认任务状态后再执行运行或重跑。' : undefined)
)

const highlightedVectorJobId = computed(() => {
  const raw = Array.isArray(route.query.vectorJobId) ? route.query.vectorJobId[0] : route.query.vectorJobId
  const id = Number(raw || 0)
  return Number.isFinite(id) && id > 0 ? id : undefined
})

const metrics = computed(() => [
  { key: 'calls', label: '智能生成总数', value: overview.value?.totalAiCalls || 0, hint: `成功 ${overview.value?.successAiCalls || 0} / 失败 ${overview.value?.failedAiCalls || 0}` },
  { key: 'rate', label: '生成成功率', value: `${overview.value?.aiSuccessRate || 0}%`, hint: `平均耗时 ${overview.value?.avgElapsedMs || 0}ms` },
  { key: 'input', label: '输入消耗', value: overview.value?.totalInputTokens || 0, hint: '提示词消耗' },
  { key: 'output', label: '输出消耗', value: overview.value?.totalOutputTokens || 0, hint: `总计 ${overview.value?.totalTokens || 0}` }
])

const partialErrorDescription = computed(() =>
  `以下数据源暂未返回：${partialErrors.value.join('、')}。页面保留已加载数据，建议重新加载，或进入生成监控/任务处理记录查看详情。`
)

const hasAiCallData = computed(() =>
  Boolean((overview.value?.successAiCalls || 0) || (overview.value?.failedAiCalls || 0) || (overview.value?.totalAiCalls || 0))
)

const feedbackMetrics = computed(() => [
  { key: 'total', label: '反馈总数', value: feedback.value?.totalFeedbackCount ?? '--' },
  { key: 'adopted', label: '已采纳', value: feedback.value?.adoptedCount ?? '--' },
  { key: 'ignored', label: '已忽略', value: feedback.value?.ignoredCount ?? '--' },
  { key: 'rate', label: '采纳率', value: feedback.value?.adoptionRate == null ? '--' : `${feedback.value.adoptionRate}%` }
])

const feedbackTypes = computed(() =>
  (feedback.value?.typeDistribution || []).map((item) => ({
    name: translateFeedbackType(item.feedbackType),
    value: Number(item.count || 0)
  }))
)

const formatRatio = (value?: number) => value == null ? '--' : `${Math.round(value * 1000) / 10}%`

const qualityFeedbackMetrics = computed(() => [
  { key: 'total', label: '结果反馈数', value: aiResultFeedback.value?.totalFeedbackCount ?? '--' },
  { key: 'negative', label: '负向反馈', value: aiResultFeedback.value?.negativeFeedbackCount ?? '--' },
  { key: 'hallucination', label: '疑似幻觉', value: aiResultFeedback.value?.hallucinationCount ?? '--' },
  { key: 'negativeRate', label: '负向反馈率', value: formatRatio(aiResultFeedback.value?.negativeFeedbackRate) }
])

const qualityFeedbackTypes = computed(() =>
  (aiResultFeedback.value?.typeDistribution || []).map((item) => ({
    name: translateFeedbackType(item.feedbackType),
    value: Number(item.count || 0)
  }))
)

const aiCallStructureEmptyTitle = computed(() =>
  sourceFailed(dataSourceLabels.aiOverview) && sourceFailed(dataSourceLabels.opsOverview) ? '生成结构加载失败' : '暂无智能生成结构'
)

const aiCallStructureEmptyDescription = computed(() => {
  if (sourceFailed(dataSourceLabels.aiOverview) && sourceFailed(dataSourceLabels.opsOverview)) {
    return '智能生成概览和运营聚合概览都未返回，当前无法判断是无生成记录还是数据加载失败；请重新加载或进入生成监控查看详情。'
  }
  return `近 ${rangeDays.value} 天暂无智能生成记录。触发题目推荐、简历匹配、面试报告或今日计划后，这里会展示成功/失败占比。`
})

const failureEmptyTitle = computed(() =>
  sourceFailed(dataSourceLabels.failures) ? '失败原因加载失败' : '暂无失败调用'
)

const failureEmptyDescription = computed(() =>
  sourceFailed(dataSourceLabels.failures)
    ? '失败原因聚合数据暂未返回；可以进入生成监控按失败状态查看完整错误。'
    : `近 ${rangeDays.value} 天没有失败运行，这是健康状态；如怀疑漏数，可进入生成监控核对失败状态。`
)

const feedbackEmptyTitle = computed(() =>
  sourceFailed(dataSourceLabels.feedback) && sourceFailed(dataSourceLabels.opsOverview) ? '智能教练反馈加载失败' : '暂无智能教练反馈'
)

const feedbackEmptyDescription = computed(() =>
  sourceFailed(dataSourceLabels.feedback) && sourceFailed(dataSourceLabels.opsOverview)
    ? '智能教练反馈数据和聚合概览都未返回，暂时无法判断用户是否反馈；请重新加载或查看智能任务。'
    : '用户采纳、忽略、点赞或点踩智能任务后，这里会展示反馈结构。'
)

const qualityFeedbackEmptyTitle = computed(() =>
  sourceFailed(dataSourceLabels.aiResultFeedback) ? 'AI 结果反馈加载失败' : '暂无 AI 结果反馈'
)

const qualityFeedbackEmptyDescription = computed(() =>
  sourceFailed(dataSourceLabels.aiResultFeedback)
    ? 'AI 结果反馈数据暂未返回，无法判断可信度反馈；可先查看生成监控和业务页面反馈入口。'
    : '用户对简历匹配、面试报告等 AI 输出提交可信度反馈后，这里会出现正负向与疑似幻觉统计。'
)

const trainingTrendEmptyTitle = computed(() =>
  sourceFailed(dataSourceLabels.training) ? '训练快照加载失败' : '暂无训练趋势'
)

const trainingTrendEmptyDescription = computed(() =>
  sourceFailed(dataSourceLabels.training)
    ? '训练快照数据暂未返回；可进入聚合任务页查看每日计划统计是否执行。'
    : `近 ${rangeDays.value} 天没有智能教练训练趋势；运行每日计划或等待聚合任务完成后，这里会展示任务趋势。`
)

const metricEmptyTitle = computed(() =>
  sourceFailed(dataSourceLabels.metrics) ? '指标字典加载失败' : '暂无指标定义'
)

const metricEmptyType = computed(() => sourceFailed(dataSourceLabels.metrics) ? 'error' : 'empty')

const metricEmptyDescription = computed(() =>
  sourceFailed(dataSourceLabels.metrics)
    ? '指标字典数据暂未返回；请打开指标字典页面或重新加载。'
    : '尚未配置运营指标定义；请到指标字典页面新增或启用指标。'
)

const jobEmptyTitle = computed(() =>
  sourceFailed(dataSourceLabels.jobs) ? '聚合任务加载失败' : '暂无聚合任务'
)

const jobEmptyType = computed(() => sourceFailed(dataSourceLabels.jobs) ? 'error' : 'empty')

const jobEmptyDescription = computed(() =>
  sourceFailed(dataSourceLabels.jobs)
    ? '最近聚合任务数据暂未返回；请打开聚合任务页或重新加载。'
    : '暂无聚合任务记录。可以手动运行每日计划，或等待定时聚合后在这里查看状态和输出。'
)

const vectorJobEmptyTitle = computed(() =>
  sourceFailed(dataSourceLabels.vectorJobs) ? '索引任务加载失败' : '暂无语义索引任务'
)

const vectorJobEmptyType = computed(() => sourceFailed(dataSourceLabels.vectorJobs) ? 'error' : 'empty')

const vectorJobEmptyDescription = computed(() => {
  if (sourceFailed(dataSourceLabels.vectorJobs)) {
    return '语义索引任务数据暂未返回；请重新加载，或到任务中心查看相关任务。'
  }
  if (highlightedVectorJobId.value) {
    return `未找到索引任务编号 ${highlightedVectorJobId.value}。请确认任务编号、类型和状态筛选是否匹配。`
  }
  if (vectorJobType.value || vectorJobStatus.value !== 'ALL') {
    return '当前类型或状态筛选下没有语义索引任务；可以切换筛选后刷新。'
  }
  return '暂无题库、知识库或删除补偿索引任务。触发重建或失败重试后，这里会展示最近任务。'
})

const trainingMetrics = computed(() => [
  { key: 'tasks', label: '智能任务', value: trainingTaskStats.value.totalAgentTasks || 0 },
  { key: 'done', label: '已完成', value: trainingTaskStats.value.doneTaskCount || 0 },
  { key: 'skipped', label: '已跳过', value: trainingTaskStats.value.skippedTaskCount || 0 },
  { key: 'rate', label: '完成率', value: `${trainingTaskStats.value.taskCompletionRate || 0}%` }
])

const manualForm = ref({
  statDate: '',
  targetJobId: undefined as number | undefined,
  taskCount: undefined as number | undefined,
  maxTotalMinutes: undefined as number | undefined
})

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002')
  }
  return '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
}

const getSettledValue = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
  result.status === 'fulfilled' ? result.value : fallback

const emptyPage = <T,>(pageNo = 1, pageSize = 6): PageResult<T> => ({
  records: [],
  total: 0,
  pageNo,
  pageSize,
  pages: 0
})

const firstQueryText = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
}

const applyVectorJobRouteQuery = () => {
  const routeJobType = firstQueryText(route.query.vectorJobType)
  const routeScopeType = firstQueryText(route.query.vectorScopeType)
  const routeStatus = firstQueryText(route.query.vectorJobStatus).toUpperCase()
  if (routeJobType) vectorJobType.value = routeJobType.toUpperCase()
  if (routeScopeType) vectorScopeType.value = routeScopeType.toUpperCase()
  if (['ALL', 'RUNNING', 'SUCCESS', 'FAILED'].includes(routeStatus)) {
    vectorJobStatus.value = routeStatus as 'ALL' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  }
}

const vectorJobQueryParams = () => ({
  jobId: highlightedVectorJobId.value,
  jobType: vectorJobType.value || undefined,
  scopeType: vectorScopeType.value || undefined,
  status: vectorJobStatus.value,
  pageNo: 1,
  pageSize: highlightedVectorJobId.value ? 20 : 8
})

const loadVectorJobs = async () => {
  vectorJobLoading.value = true
  try {
    const result = await getAdminVectorIndexJobsApi(vectorJobQueryParams())
    vectorJobs.value = result.records || []
    clearSourceFailed(dataSourceLabels.vectorJobs)
  } catch (error) {
    vectorJobs.value = []
    markSourceFailed(dataSourceLabels.vectorJobs)
    ElMessage.error(getErrorMessage(error))
  } finally {
    vectorJobLoading.value = false
  }
}

const vectorJobStatusLabel = (status?: string) => {
  const value = String(status || 'UNKNOWN').toUpperCase()
  const map: Record<string, string> = {
    RUNNING: '运行中',
    SUCCESS: '成功',
    FAILED: '失败',
    UNKNOWN: '状态待确认'
  }
  return map[value] || '状态待确认'
}

const vectorJobStatusTagType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (value === 'SUCCESS') return 'success'
  if (value === 'FAILED') return 'danger'
  if (value === 'RUNNING') return 'warning'
  return 'info'
}

const vectorJobTypeLabel = (type?: string) => {
  const value = String(type || 'UNKNOWN').toUpperCase()
  const found = vectorJobTypeOptions.find((item) => item.value === value)
  return found?.label || '语义索引任务'
}

const vectorJobRowClassName = ({ row }: { row: VectorIndexJobVO }) =>
  highlightedVectorJobId.value && row.id === highlightedVectorJobId.value ? 'vector-job-row--highlighted' : ''

const formatDateTime = (value?: string) => value ? value.replace('T', ' ').slice(0, 19) : '--'

const disposeChart = () => {
  successChart?.dispose()
  successChart = null
}

const loadEcharts = () => {
  if (!echartsModulePromise) {
    echartsModulePromise = import('@/utils/echarts')
  }
  return echartsModulePromise
}

const renderChart = async () => {
  const renderSeq = ++chartRenderSeq
  await nextTick()
  disposeChart()
  if (!aiOpsMounted) return
  if (!successChartRef.value || !overview.value || !hasAiCallData.value) return
  const echarts = await loadEcharts()
  if (!aiOpsMounted || renderSeq !== chartRenderSeq || !successChartRef.value || !overview.value || !hasAiCallData.value) {
    return
  }
  successChart = echarts.default.init(successChartRef.value)
  successChart.setOption({
    color: ['#34d399', '#f87171'],
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
    series: [
      {
        name: '智能生成',
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '43%'],
        data: [
          { name: '成功', value: overview.value.successAiCalls || 0 },
          { name: '失败', value: overview.value.failedAiCalls || 0 }
        ]
      }
    ]
  })
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  partialErrors.value = []
  const params = { days: rangeDays.value }
  const emptyOverview: AdminAiOverviewVO = {
    totalAiCalls: 0,
    successAiCalls: 0,
    failedAiCalls: 0,
    aiSuccessRate: 0,
    avgElapsedMs: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0
  }
  try {
    const [overviewResult, failureResult, opsResult, trainingResult, feedbackResult, aiResultFeedbackResult, metricsResult, jobsResult, vectorJobsResult] = await Promise.allSettled([
      getAdminAiOverviewApi(params),
      getAdminAiFailuresApi(params),
      getAdminAnalyticsOverviewApi(params),
      getAdminAnalyticsTrainingApi(params),
      getAdminAgentFeedbackApi(params),
      getAdminAiResultFeedbackStatsApi(params),
      getAdminAnalyticsMetricsApi({ pageNo: 1, pageSize: 6 }),
      getAdminAnalyticsJobsApi({ pageNo: 1, pageSize: 6 }),
      getAdminVectorIndexJobsApi(vectorJobQueryParams())
    ])
    const sourceResults = [
      { label: dataSourceLabels.aiOverview, result: overviewResult },
      { label: dataSourceLabels.failures, result: failureResult },
      { label: dataSourceLabels.opsOverview, result: opsResult },
      { label: dataSourceLabels.training, result: trainingResult },
      { label: dataSourceLabels.feedback, result: feedbackResult },
      { label: dataSourceLabels.aiResultFeedback, result: aiResultFeedbackResult },
      { label: dataSourceLabels.metrics, result: metricsResult },
      { label: dataSourceLabels.jobs, result: jobsResult },
      { label: dataSourceLabels.vectorJobs, result: vectorJobsResult }
    ]
    const overviewData = getSettledValue(overviewResult, emptyOverview)
    const failureData = getSettledValue(failureResult, [])
    const opsOverview = getSettledValue(opsResult, {} as AdminAnalyticsOverviewVO)
    const trainingData = getSettledValue(trainingResult, {} as AdminAnalyticsTrainingVO)
    const feedbackData = getSettledValue(feedbackResult, undefined)
    const aiResultFeedbackData = getSettledValue(aiResultFeedbackResult, undefined)
    const metricsPage = getSettledValue(metricsResult, emptyPage<AdminAnalyticsMetricDefinitionVO>())
    const jobsPage = getSettledValue(jobsResult, emptyPage<AdminAnalyticsJobLogVO>())
    const vectorJobsPage = getSettledValue(vectorJobsResult, emptyPage<VectorIndexJobVO>(1, vectorJobQueryParams().pageSize))
    overview.value = opsOverview.ai || overviewData
    feedback.value = opsOverview.feedback || feedbackData
    aiResultFeedback.value = aiResultFeedbackData
    trainingTaskStats.value = {
      totalAgentTasks: trainingData.taskStats?.totalAgentTasks || 0,
      doneTaskCount: trainingData.taskStats?.doneTaskCount || 0,
      skippedTaskCount: trainingData.taskStats?.skippedTaskCount || 0,
      taskCompletionRate: trainingData.taskStats?.taskCompletionRate || 0
    }
    trainingTrend.value = trainingData.agentTrend || []
    failures.value = failureData
    metricDefs.value = metricsPage.records || []
    jobs.value = jobsPage.records || []
    vectorJobs.value = vectorJobsPage.records || []
    const failed = sourceResults.filter((item) => item.result.status === 'rejected')
    if (failed.length === sourceResults.length) {
      errorMessage.value = getErrorMessage((failed[0].result as PromiseRejectedResult).reason)
      disposeChart()
      return
    }
    partialErrors.value = failed.map((item) => item.label)
    await renderChart()
  } finally {
    loading.value = false
  }
}

const openManualRun = () => {
  manualForm.value = {
    statDate: '',
    targetJobId: undefined,
    taskCount: undefined,
    maxTotalMinutes: undefined
  }
  manualUserIds.value = ''
  manualDialogVisible.value = true
}

const parseUserIds = () =>
  manualUserIds.value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)

const runDailyPlan = async () => {
  if (!guardAdminMobileWrite()) return
  const userIds = parseUserIds()
  const confirmed = await confirmDangerActionPreview({
    title: '运行每日计划高风险确认',
    action: '手动运行每日计划聚合',
    target: userIds.length ? `指定用户 ${userIds.length} 人：${userIds.join(', ')}` : '未指定用户，按任务规则筛选可生成计划的用户',
    impact: '可能为多个用户生成或刷新今日训练计划，并产生智能生成记录、任务处理记录和统计记录。',
    rollback: '已生成的计划无法自动撤销；如误执行，需要通过任务处理记录和业务记录人工处理。',
    audit: '系统会记录聚合任务处理记录，执行人、时间、任务参数可用于追踪。',
    tips: ['确认统计日期、目标岗位和任务数量参数正确。', '确认当前不是演示只读模式或共享演示环境。'],
    confirmButtonText: '确认运行'
  })
  if (!confirmed) return
  manualRunning.value = true
  try {
    await runAdminAnalyticsDailyPlanApi({
      jobCode: 'AGENT_DAILY_PLAN',
      jobName: '每日计划聚合',
      statDate: manualForm.value.statDate || undefined,
      userIds,
      targetJobId: manualForm.value.targetJobId,
      taskCount: manualForm.value.taskCount,
      maxTotalMinutes: manualForm.value.maxTotalMinutes
    })
    ElMessage.success('每日计划聚合任务已提交')
    manualDialogVisible.value = false
    await loadPage()
  } finally {
    manualRunning.value = false
  }
}

const rerunJob = async (row: AdminAnalyticsJobLogVO) => {
  if (!guardAdminMobileWrite()) return
  const id = row.id
  const confirmed = await confirmDangerActionPreview({
    title: '重跑聚合任务高风险确认',
    action: `重跑聚合任务 ${translateJobName(row.jobName || row.jobCode)}`,
    target: `任务编号：${id}；统计日期：${row.statDate || '未提供'}`,
    impact: '会重新提交该任务，可能覆盖或追加统计结果，并产生新的任务执行记录。',
    rollback: '任务提交后不能直接撤销；如结果异常，需要依据任务输出和操作日志人工修正。',
    audit: '重跑请求会进入聚合任务处理记录，可通过任务编号和操作时间追踪。',
    tips: ['优先确认原任务失败原因已处理。', '避免对运行中任务重复提交。'],
    confirmButtonText: '确认重跑'
  })
  if (!confirmed) return
  rerunningId.value = id
  try {
    await rerunAdminAnalyticsJobApi(id)
    ElMessage.success('重跑请求已提交')
    await loadPage()
  } finally {
    rerunningId.value = undefined
  }
}

const resizeChart = () => successChart?.resize()

onMounted(async () => {
  aiOpsMounted = true
  applyVectorJobRouteQuery()
  window.addEventListener('resize', resizeChart)
  await loadPage()
})

onBeforeUnmount(() => {
  aiOpsMounted = false
  chartRenderSeq += 1
  window.removeEventListener('resize', resizeChart)
  disposeChart()
})
</script>

<style scoped lang="scss">
.ai-ops-grid {
  grid-template-columns: minmax(320px, 0.8fr) minmax(0, 1.2fr);
}

.analytics-chart {
  width: 100%;
  height: 320px;
  padding: 0 20px 20px;
}

.admin-diagnostic-state {
  margin-bottom: 18px;
}

.admin-empty-wrap {
  margin: 0 20px 20px;
}

.panel-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.panel-actions--stacked {
  align-items: flex-end;
  flex-direction: column;
}

.table-view-tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

:global(.column-config-menu) {
  min-width: 180px;
  padding: 8px;
}

:global(.column-config-menu .el-checkbox) {
  width: 100%;
}

.diagnostic-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.failure-list {
  display: grid;
  gap: 10px;
  padding: 18px 20px 20px;
}

.failure-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 70px;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.56);
}

.failure-row span {
  overflow: hidden;
  color: var(--app-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.failure-row strong {
  text-align: right;
}

.feedback-grid,
.manual-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 18px 20px 0;
}

.feedback-card {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
}

.feedback-card span,
.trend-row small {
  color: var(--app-text-muted);
  font-size: 12px;
}

.feedback-card strong {
  font-size: 22px;
}

.trend-list {
  display: grid;
  gap: 10px;
  padding: 18px 20px 20px;
}

.trend-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px minmax(120px, 1fr);
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
}

.vector-job-panel {
  grid-column: 1 / -1;
}

.vector-job-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.vector-job-alert {
  margin: 0 20px 12px;
}

.vector-job-main {
  display: grid;
  gap: 3px;
}

.vector-job-main small {
  color: var(--app-text-muted);
}

:deep(.vector-job-row--highlighted) {
  --el-table-tr-bg-color: rgba(59, 130, 246, 0.12);
}

@media (max-width: 900px) {
  .ai-ops-grid {
    grid-template-columns: 1fr;
  }

  .panel-actions,
  .panel-actions--stacked,
  .table-view-tools {
    align-items: flex-start;
    justify-content: flex-start;
    width: 100%;
  }

  .feedback-grid,
  .manual-grid,
  .vector-job-tools,
  .trend-row {
    grid-template-columns: 1fr;
  }
}
</style>
