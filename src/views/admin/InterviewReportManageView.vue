<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><FileText :size="16" /><span>报告运营</span></div>
        <h1 class="admin-hero__title">面试报告管理</h1>
        <p class="admin-hero__desc">只读查看报告状态、分数、摘要和失败原因。</p>
      </div>
    </section>
    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>报告列表</h2>
          <p>支持按用户、面试和生成状态筛选；可调整表格密度和列显隐，优先查看失败原因和摘要。</p>
        </div>
        <div class="table-view-tools">
          <el-segmented v-model="tableSize" :options="tableSizeOptions" />
          <el-dropdown trigger="click" :hide-on-click="false">
            <el-button plain>列配置</el-button>
            <template #dropdown>
              <el-dropdown-menu class="column-config-menu">
                <el-dropdown-item v-for="item in columnOptions" :key="item.key">
                  <el-checkbox v-model="visibleColumns[item.key]" :disabled="item.required">
                    {{ item.label }}
                  </el-checkbox>
                </el-dropdown-item>
                <el-dropdown-item divided>
                  <el-button link type="primary" @click.stop="resetTableView">恢复默认视图</el-button>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="关键词"><el-input v-model.trim="query.keyword" clearable placeholder="面试 / 用户 / 摘要" /></el-form-item>
          <el-form-item label="用户编号"><el-input-number v-model="query.userId" :min="1" controls-position="right" /></el-form-item>
          <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部" style="width: 150px"><el-option label="生成中" value="GENERATING" /><el-option label="已生成" value="GENERATED" /><el-option label="失败" value="FAILED" /></el-select></el-form-item>
          <el-form-item><el-button type="primary" @click="handleSearch">查询</el-button><el-button @click="handleReset">重置</el-button></el-form-item>
        </el-form>
      </div>
      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="reports" row-key="reportId" :size="tableSize">
          <template #empty>
            <AppState v-if="reportError" type="error" title="面试报告加载失败" :description="reportError">
              <el-button type="primary" :loading="loading" @click="fetchReports">重新加载</el-button>
            </AppState>
            <AppState v-else type="empty" :title="reportEmptyTitle" :description="reportEmptyDescription">
              <el-button v-if="hasReportFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button v-else :loading="loading" @click="fetchReports">重新加载</el-button>
            </AppState>
          </template>
          <el-table-column v-if="isColumnVisible('reportId')" prop="reportId" label="报告编号" width="100" />
          <el-table-column v-if="isColumnVisible('interviewId')" prop="interviewId" label="面试编号" width="100" />
          <el-table-column v-if="isColumnVisible('interviewName')" prop="interviewName" label="面试" min-width="190" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('user')" label="用户" min-width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ row.username || formatIdLabel('用户', row.userId) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('reportStatus')" label="状态" width="120"><template #default="{ row }"><el-tag :type="statusType(row.reportStatus)">{{ reportStatusLabel(row.reportStatus) }}</el-tag></template></el-table-column>
          <el-table-column v-if="isColumnVisible('score')" label="分数" width="100"><template #default="{ row }">{{ displayReportScore(row) }}</template></el-table-column>
          <el-table-column v-if="isColumnVisible('summary')" prop="summary" label="摘要" min-width="280" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('failedReason')" prop="failedReason" label="失败原因" min-width="200" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('generatedAt')" prop="generatedAt" label="生成时间" min-width="170" />
          <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column label="操作" width="100" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">详情</el-button></template></el-table-column>
        </el-table>
      </div>
      <div class="pagination-wrap"><el-pagination v-model:current-page="query.pageNo" v-model:page-size="query.pageSize" background layout="total, sizes, prev, pager, next" :total="total" :page-sizes="[10, 20, 50]" @change="fetchReports" /></div>
    </section>
    <el-dialog v-model="drawerVisible" title="报告详情" width="min(920px, calc(100vw - 32px))" class="admin-detail-dialog" align-center>
      <div v-loading="detailLoading" class="admin-detail-dialog__body">
        <AppState v-if="detailError" type="error" title="报告详情加载失败" :description="detailError">
          <el-button type="primary" :loading="detailLoading" @click="retryOpenDetail">重新加载</el-button>
        </AppState>
        <el-descriptions v-else-if="detail" :column="1" border>
          <el-descriptions-item label="报告编号">{{ detail.reportId || detail.id }}</el-descriptions-item>
          <el-descriptions-item label="面试编号">{{ detail.interviewId }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ detail.username || detail.userId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ reportStatusLabel(detail.reportStatus) }}</el-descriptions-item>
          <el-descriptions-item label="总分">{{ displayReportScore(detail) }}</el-descriptions-item>
          <el-descriptions-item label="摘要"><pre>{{ detail.summary || '-' }}</pre></el-descriptions-item>
          <el-descriptions-item label="失败原因">{{ detail.failedReason || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <div class="admin-detail-dialog__footer">
          <el-button @click="drawerVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { FileText } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import { getAdminInterviewReportDetailApi, getAdminInterviewReportsApi } from '@/api/adminGovernance'
import AppState from '@/components/common/AppState.vue'
import { useAdminTableView } from '@/composables/useAdminTableView'
import { reportStatusMap } from '@/constants/enums'
import type { AdminInterviewReportVO, AdminListQuery } from '@/types/adminGovernance'
import { getErrorMessage } from '@/utils/error'

type InterviewReportColumnKey =
  | 'reportId'
  | 'interviewId'
  | 'interviewName'
  | 'user'
  | 'reportStatus'
  | 'score'
  | 'summary'
  | 'failedReason'
  | 'generatedAt'
  | 'createdAt'

const loading = ref(false)
const drawerVisible = ref(false)
const reports = ref<AdminInterviewReportVO[]>([])
const detail = ref<AdminInterviewReportVO | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
const currentDetailId = ref<number | null>(null)
const total = ref(0)
const reportError = ref('')
const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<InterviewReportColumnKey>('admin:interview-report-manage', [
  { key: 'reportId', label: '报告编号', required: true },
  { key: 'interviewId', label: '面试编号', defaultVisible: false },
  { key: 'interviewName', label: '面试', required: true },
  { key: 'user', label: '用户' },
  { key: 'reportStatus', label: '状态', required: true },
  { key: 'score', label: '分数' },
  { key: 'summary', label: '摘要' },
  { key: 'failedReason', label: '失败原因' },
  { key: 'generatedAt', label: '生成时间' },
  { key: 'createdAt', label: '创建时间', defaultVisible: false }
])
const query = reactive<AdminListQuery>({ keyword: '', userId: undefined, status: '', pageNo: 1, pageSize: 10 })
const hasReportFilters = computed(() => Boolean(query.keyword || query.userId || query.status))
const reportEmptyTitle = computed(() =>
  hasReportFilters.value ? '当前筛选没有面试报告' : '暂无面试报告'
)
const reportEmptyDescription = computed(() =>
  hasReportFilters.value
    ? '当前筛选条件下没有面试报告。可以清空关键词、用户编号或状态筛选后重新查看，避免把筛选空误判为报告链路异常。'
    : '面试报告来自用户完成模拟面试后的生成任务。当前为空通常代表还没有完成面试，或报告生成链路尚未产出记录。'
)
const statusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (['GENERATED', 'SUCCESS'].includes(value)) return 'success'
  if (['FAILED', 'ERROR'].includes(value)) return 'danger'
  if (['GENERATING', 'PENDING'].includes(value)) return 'warning'
  return 'info'
}
const reportStatusLabel = (status?: string | null) => {
  const value = String(status || '').trim().toUpperCase()
  if (!value) return '-'
  return reportStatusMap[value] || '状态待确认'
}
const isReportSuccess = (status?: string) => ['GENERATED', 'COMPLETED', 'SUCCESS'].includes(String(status || '').toUpperCase())
const displayReportScore = (row?: AdminInterviewReportVO | null) => {
  if (!row || !isReportSuccess(row.reportStatus)) return '-'
  const score = Number(row.totalScore)
  return Number.isFinite(score) && score > 0 ? score : '-'
}
const formatIdLabel = (label: string, value?: number | string | null) => value ? `${label}编号 ${value}` : '-'
const fetchReports = async () => {
  loading.value = true
  reportError.value = ''
  try {
    const result = await getAdminInterviewReportsApi(query)
    reports.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    reports.value = []
    total.value = 0
    reportError.value = getErrorMessage(error, '面试报告暂时加载失败，请稍后重试。')
  } finally { loading.value = false }
}
const openDetail = async (row: AdminInterviewReportVO) => {
  const reportId = row.reportId || row.id || row.interviewId
  currentDetailId.value = reportId
  drawerVisible.value = true
  detail.value = null
  detailError.value = ''
  detailLoading.value = true
  try {
    detail.value = await getAdminInterviewReportDetailApi(reportId)
  } catch (error) {
    detailError.value = getErrorMessage(error, '报告详情暂时加载失败，请稍后重试。')
  } finally {
    detailLoading.value = false
  }
}
const retryOpenDetail = () => {
  if (currentDetailId.value == null) return
  openDetail({ reportId: currentDetailId.value } as AdminInterviewReportVO)
}
const handleSearch = () => { query.pageNo = 1; fetchReports() }
const handleReset = () => { Object.assign(query, { keyword: '', userId: undefined, status: '', pageNo: 1, pageSize: 10 }); fetchReports() }
onMounted(fetchReports)
</script>

<style scoped lang="scss">
.pagination-wrap { display: flex; justify-content: flex-end; padding: 16px 20px 20px; }

.admin-detail-dialog__body {
  overflow: auto;
  max-height: min(72vh, 720px);
  padding-right: 2px;
}

.admin-detail-dialog__footer {
  display: flex;
  justify-content: flex-end;
}

pre { margin: 0; white-space: pre-wrap; word-break: break-word; }

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

@media (max-width: 900px) {
  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
