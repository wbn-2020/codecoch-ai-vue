<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><MessagesSquare :size="16" /><span>面试运营</span></div>
        <h1 class="admin-hero__title">面试记录管理</h1>
        <p class="admin-hero__desc">只读查看后台面试记录，便于排查状态、用户和报告生成情况。</p>
      </div>
    </section>
    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>面试列表</h2>
          <p>支持按用户、岗位和状态筛选；可调整表格密度和列显隐，便于排查报告生成链路。</p>
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
          <el-form-item label="关键词"><el-input v-model.trim="query.keyword" clearable placeholder="标题 / 用户 / 岗位" /></el-form-item>
          <el-form-item label="用户编号"><el-input-number v-model="query.userId" :min="1" controls-position="right" /></el-form-item>
          <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部" style="width: 160px"><el-option label="进行中" value="IN_PROGRESS" /><el-option label="已完成" value="COMPLETED" /><el-option label="失败" value="FAILED" /></el-select></el-form-item>
          <el-form-item><el-button type="primary" @click="handleSearch">查询</el-button><el-button @click="handleReset">重置</el-button></el-form-item>
        </el-form>
      </div>
      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="interviews" row-key="interviewId" :size="tableSize">
          <template #empty>
            <AppState v-if="interviewError" type="error" title="面试记录加载失败" :description="interviewError">
              <el-button type="primary" :loading="loading" @click="fetchInterviews">重新加载</el-button>
            </AppState>
            <AppState v-else type="empty" :title="interviewEmptyTitle" :description="interviewEmptyDescription">
              <el-button v-if="hasInterviewFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button v-else :loading="loading" @click="fetchInterviews">重新加载</el-button>
            </AppState>
          </template>
          <el-table-column v-if="isColumnVisible('interviewId')" prop="interviewId" label="面试编号" width="100" />
          <el-table-column v-if="isColumnVisible('interviewName')" prop="interviewName" label="面试" min-width="190" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('user')" label="用户" min-width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ row.username || formatIdLabel('用户', row.userId) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('targetPosition')" prop="targetPosition" label="目标岗位" min-width="150" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('mode')" label="模式" width="110"><template #default="{ row }">{{ interviewModeLabel(row.interviewMode) }}</template></el-table-column>
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="130"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ interviewStatusLabel(row.status) }}</el-tag></template></el-table-column>
          <el-table-column v-if="isColumnVisible('reportStatus')" label="报告" width="140"><template #default="{ row }"><el-tag :type="statusType(row.reportStatus)">{{ reportStatusLabel(row.reportStatus) }}</el-tag></template></el-table-column>
          <el-table-column v-if="isColumnVisible('questionCount')" label="题目数" width="100"><template #default="{ row }">{{ row.questionCount ?? '-' }}</template></el-table-column>
          <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column v-if="isColumnVisible('finishedAt')" prop="finishedAt" label="完成时间" min-width="170" />
          <el-table-column label="操作" width="100" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">详情</el-button></template></el-table-column>
        </el-table>
      </div>
      <div class="pagination-wrap"><el-pagination v-model:current-page="query.pageNo" v-model:page-size="query.pageSize" background layout="total, sizes, prev, pager, next" :total="total" :page-sizes="[10, 20, 50]" @change="fetchInterviews" /></div>
    </section>
    <el-dialog v-model="drawerVisible" title="面试详情" width="min(920px, calc(100vw - 32px))" class="admin-detail-dialog" align-center>
      <div v-loading="detailLoading" class="admin-detail-dialog__body">
        <AppState v-if="detailError" type="error" title="面试详情加载失败" :description="detailError">
          <el-button type="primary" :loading="detailLoading" @click="retryOpenDetail">重新加载</el-button>
        </AppState>
        <el-descriptions v-else-if="detail" :column="1" border>
          <el-descriptions-item label="面试编号">{{ detail.interviewId }}</el-descriptions-item>
          <el-descriptions-item label="标题">{{ detail.interviewName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ detail.username || detail.userId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="目标岗位">{{ detail.targetPosition || '-' }}</el-descriptions-item>
          <el-descriptions-item label="模式">{{ interviewModeLabel(detail.interviewMode) }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ interviewStatusLabel(detail.status) }}</el-descriptions-item>
          <el-descriptions-item label="报告状态">{{ reportStatusLabel(detail.reportStatus) }}</el-descriptions-item>
          <el-descriptions-item label="题目数">{{ detail.questionCount ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="时间">{{ detail.startedAt || '-' }} - {{ detail.finishedAt || '-' }}</el-descriptions-item>
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
import { MessagesSquare } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import { getAdminInterviewDetailApi, getAdminInterviewsApi } from '@/api/adminGovernance'
import AppState from '@/components/common/AppState.vue'
import { useAdminTableView } from '@/composables/useAdminTableView'
import { interviewModeOptions, interviewStatusMap, reportStatusMap } from '@/constants/enums'
import type { AdminInterviewVO, AdminListQuery } from '@/types/adminGovernance'
import { getErrorMessage } from '@/utils/error'

type InterviewColumnKey =
  | 'interviewId'
  | 'interviewName'
  | 'user'
  | 'targetPosition'
  | 'mode'
  | 'status'
  | 'reportStatus'
  | 'questionCount'
  | 'createdAt'
  | 'finishedAt'

const loading = ref(false)
const drawerVisible = ref(false)
const interviews = ref<AdminInterviewVO[]>([])
const detail = ref<AdminInterviewVO | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
const currentDetailId = ref<number | null>(null)
const total = ref(0)
const interviewError = ref('')
const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<InterviewColumnKey>('admin:interview-manage', [
  { key: 'interviewId', label: '面试编号', required: true },
  { key: 'interviewName', label: '面试', required: true },
  { key: 'user', label: '用户' },
  { key: 'targetPosition', label: '目标岗位' },
  { key: 'mode', label: '模式', defaultVisible: false },
  { key: 'status', label: '状态', required: true },
  { key: 'reportStatus', label: '报告', required: true },
  { key: 'questionCount', label: '题目数', defaultVisible: false },
  { key: 'createdAt', label: '创建时间' },
  { key: 'finishedAt', label: '完成时间', defaultVisible: false }
])
const query = reactive<AdminListQuery>({ keyword: '', userId: undefined, status: '', pageNo: 1, pageSize: 10 })
const hasInterviewFilters = computed(() => Boolean(query.keyword || query.userId || query.status))
const interviewEmptyTitle = computed(() =>
  hasInterviewFilters.value ? '当前筛选没有面试记录' : '暂无面试记录'
)
const interviewEmptyDescription = computed(() =>
  hasInterviewFilters.value
    ? '当前筛选条件下没有面试记录。可以清空关键词、用户编号或状态筛选后重新查看，避免把筛选空误判为数据丢失。'
    : '面试记录来自用户创建并进入模拟面试后的会话。当前为空通常代表权限范围内还没有面试，或用户尚未开始模拟面试。'
)
const statusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (['COMPLETED', 'GENERATED', 'SUCCESS'].includes(value)) return 'success'
  if (['FAILED', 'CANCELED'].includes(value)) return 'danger'
  if (['IN_PROGRESS', 'GENERATING', 'WAITING_ANSWER'].includes(value)) return 'warning'
  return 'info'
}
const interviewModeLabel = (value?: string | null) =>
  interviewModeOptions.find((item) => item.value === value)?.label || (value ? '模式待确认' : '-')
const interviewStatusLabel = (value?: string | null) => {
  const status = String(value || '').trim().toUpperCase()
  if (!status) return '-'
  return interviewStatusMap[status] || '状态待确认'
}
const reportStatusLabel = (value?: string | null) => {
  const status = String(value || '').trim().toUpperCase()
  if (!status) return '-'
  return reportStatusMap[status] || '状态待确认'
}
const formatIdLabel = (label: string, value?: number | string | null) => value ? `${label}编号 ${value}` : '-'
const fetchInterviews = async () => {
  loading.value = true
  interviewError.value = ''
  try {
    const result = await getAdminInterviewsApi(query)
    interviews.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    interviews.value = []
    total.value = 0
    interviewError.value = getErrorMessage(error, '面试记录暂时加载失败，请稍后重试。')
  } finally { loading.value = false }
}
const openDetail = async (row: AdminInterviewVO) => {
  const interviewId = row.interviewId
  currentDetailId.value = interviewId
  drawerVisible.value = true
  detail.value = null
  detailError.value = ''
  detailLoading.value = true
  try {
    detail.value = await getAdminInterviewDetailApi(interviewId)
  } catch (error) {
    detailError.value = getErrorMessage(error, '面试详情暂时加载失败，请稍后重试。')
  } finally {
    detailLoading.value = false
  }
}
const retryOpenDetail = () => {
  if (currentDetailId.value == null) return
  openDetail({ interviewId: currentDetailId.value } as AdminInterviewVO)
}
const handleSearch = () => { query.pageNo = 1; fetchInterviews() }
const handleReset = () => { Object.assign(query, { keyword: '', userId: undefined, status: '', pageNo: 1, pageSize: 10 }); fetchInterviews() }
onMounted(fetchInterviews)
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
