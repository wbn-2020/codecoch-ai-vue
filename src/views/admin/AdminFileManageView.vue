<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <FolderSearch :size="16" />
          <span>文件治理</span>
        </div>
        <h1 class="admin-hero__title">文件治理</h1>
        <p class="admin-hero__desc">
          查看上传文件元数据、下载鉴权和简历解析联动状态。
        </p>
      </div>
    </section>

    <div class="admin-insight-grid">
      <article class="admin-insight-card">
        <span>文件总数</span>
        <strong>{{ total }}</strong>
        <small>当前文件总数</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页容量</span>
        <strong>{{ currentPageSize }}</strong>
        <small>仅统计当前页文件大小</small>
      </article>
      <article class="admin-insight-card">
        <span>关联功能</span>
        <strong>{{ bizTypeCount }}</strong>
        <small>按文件归属来源统计</small>
      </article>
      <article class="admin-insight-card">
        <span>存储状态</span>
        <strong>{{ availableCount }}</strong>
        <small>当前页可下载文件数量</small>
      </article>
    </div>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>文件列表</h2>
          <p>支持按用户、关联功能和状态筛选；可调整表格密度和列显隐，便于排查异常文件。</p>
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
          <el-form-item label="用户编号">
            <el-input-number v-model="query.userId" :min="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="关联功能">
            <el-select v-model="query.bizType" clearable filterable allow-create placeholder="全部类型" style="width: 160px">
              <el-option v-for="item in bizTypeOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable filterable allow-create placeholder="全部状态" style="width: 160px">
              <el-option label="可下载" value="AVAILABLE" />
            </el-select>
          </el-form-item>
          <el-form-item label="解析状态">
            <el-select v-model="query.parseStatus" clearable placeholder="全部解析状态" style="width: 160px">
              <el-option
                v-for="item in parseStatusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="files" row-key="id" :size="tableSize">
          <el-table-column v-if="isColumnVisible('id')" prop="id" label="文件编号" width="100" />
          <el-table-column v-if="isColumnVisible('filename')" prop="originalFilename" label="上传文件名" min-width="220" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('ext')" prop="fileExt" label="类型" width="90" />
          <el-table-column v-if="isColumnVisible('size')" label="大小" width="120">
            <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('bizType')" label="关联功能" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">{{ getBusinessType(row) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('parseStatus')" label="解析状态" width="130">
            <template #default="{ row }">
              <el-tag v-if="row.parseStatus" :type="getParseStatusType(row.parseStatus)" effect="plain">
                {{ getParseStatusLabel(row.parseStatus) }}
              </el-tag>
              <span v-else class="muted-value">无解析记录</span>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('resume')" label="关联简历" width="120">
            <template #default="{ row }">{{ formatIdLabel('简历', row.resumeId) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('analysisRecord')" label="解析记录" width="120">
            <template #default="{ row }">{{ formatIdLabel('记录', row.resumeAnalysisRecordId) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('parseError')" label="失败原因" min-width="180">
            <template #default="{ row }">
              <el-tooltip v-if="row.parseErrorMessage" :content="friendlyParseError(row.parseErrorMessage)" placement="top">
                <span class="parse-error-text">{{ friendlyParseError(row.parseErrorMessage) }}</span>
              </el-tooltip>
              <span v-else class="muted-value">-</span>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('userId')" prop="userId" label="用户编号" width="110" />
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="130">
            <template #default="{ row }">
              <el-tag :type="getFileStatusType(row.status)" effect="plain">
                {{ getFileStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('storage')" prop="storageProvider" label="存储" width="100" />
          <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="上传时间" min-width="170" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('updatedAt')" prop="updatedAt" label="更新时间" min-width="170" show-overflow-tooltip />
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
              <el-button
                link
                type="primary"
                :icon="Download"
                :loading="isDownloading(row.id)"
                :disabled="isAdminMobileReadonly || !canDownload(row)"
                :title="downloadReadonlyTitle(row)"
                @click="downloadFile(row)"
              >
                下载
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <AppState
              :type="loadError ? 'error' : 'empty'"
              :title="loadError ? '文件列表加载失败' : '暂无文件记录'"
              :description="loadError || fileEmptyDescription"
            >
              <el-button type="primary" @click="loadError ? fetchFiles() : handleReset()">
                {{ loadError ? '重新加载' : hasFileFilters ? '清空筛选' : '刷新列表' }}
              </el-button>
            </AppState>
          </template>
        </el-table>
      </div>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @change="fetchFiles"
        />
      </div>
    </section>

    <el-drawer v-model="drawerVisible" title="文件详情" size="640px">
      <div v-loading="detailLoading" class="file-detail">
        <AppState
          v-if="detailError"
          type="error"
          title="文件详情加载失败"
          :description="detailError"
        >
          <el-button type="primary" :loading="detailLoading" :disabled="!detailId" @click="retryOpenDetail">
            重新加载详情
          </el-button>
          <el-button :loading="loading" @click="fetchFiles">刷新文件列表</el-button>
        </AppState>
        <AppState
          v-else-if="!detail"
          type="empty"
          title="文件详情暂未加载"
          description="还没有可展示的文件详情。请从列表打开文件，或刷新列表后重新进入详情。"
        >
          <el-button type="primary" :loading="loading" @click="fetchFiles">刷新文件列表</el-button>
        </AppState>
        <template v-else>
          <div class="file-detail__actions">
            <el-button
              type="primary"
              :icon="Download"
              :loading="isDownloading(detail.id)"
              :disabled="isAdminMobileReadonly || !canDownload(detail)"
              :title="downloadReadonlyTitle(detail)"
              @click="downloadFile(detail)"
            >
              下载文件
            </el-button>
            <span v-if="!canDownload(detail)" class="muted-value">当前文件状态不可下载</span>
          </div>

          <el-descriptions :column="1" border>
            <el-descriptions-item label="文件编号">{{ detail.id }}</el-descriptions-item>
            <el-descriptions-item label="用户编号">{{ detail.userId }}</el-descriptions-item>
            <el-descriptions-item label="关联功能">{{ getBusinessType(detail) }}</el-descriptions-item>
            <el-descriptions-item label="上传文件名">{{ detail.originalFilename }}</el-descriptions-item>
            <el-descriptions-item label="存储文件名">{{ detail.storedFilename }}</el-descriptions-item>
            <el-descriptions-item label="文件类型">{{ detail.fileExt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="文件格式">{{ detail.mimeType || '-' }}</el-descriptions-item>
            <el-descriptions-item label="文件大小">{{ formatFileSize(detail.fileSize) }}</el-descriptions-item>
            <el-descriptions-item label="存储提供方">{{ detail.storageProvider || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="getFileStatusType(detail.status)" effect="plain">
                {{ getFileStatusLabel(detail.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ detail.createdAt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ detail.updatedAt || '-' }}</el-descriptions-item>
          </el-descriptions>

          <section class="parse-detail-panel">
            <div class="parse-detail-panel__header">
              <h3>简历解析状态</h3>
              <el-tag v-if="detail.parseStatus" :type="getParseStatusType(detail.parseStatus)" effect="plain">
                {{ getParseStatusLabel(detail.parseStatus) }}
              </el-tag>
            </div>
            <div v-if="!hasParseRecord(detail)" class="parse-empty">暂无关联解析记录</div>
            <el-descriptions v-else :column="1" border>
              <el-descriptions-item label="关联功能">{{ getBusinessType(detail) }}</el-descriptions-item>
              <el-descriptions-item label="关联记录">{{ formatNullable(detail.businessId) }}</el-descriptions-item>
              <el-descriptions-item label="关联简历">{{ formatIdLabel('简历', detail.resumeId) }}</el-descriptions-item>
              <el-descriptions-item label="解析记录">{{ formatIdLabel('记录', detail.resumeAnalysisRecordId) }}</el-descriptions-item>
              <el-descriptions-item label="解析状态">
                <el-tag v-if="detail.parseStatus" :type="getParseStatusType(detail.parseStatus)" effect="plain">
                  {{ getParseStatusLabel(detail.parseStatus) }}
                </el-tag>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="是否已确认">{{ formatConfirmed(detail.analysisConfirmed) }}</el-descriptions-item>
              <el-descriptions-item label="解析失败原因">
                <span class="parse-error-block">{{ friendlyParseError(detail.parseErrorMessage) || '-' }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="解析完成时间">{{ detail.parsedAt || '-' }}</el-descriptions-item>
              <el-descriptions-item label="确认时间">{{ detail.confirmedAt || '-' }}</el-descriptions-item>
            </el-descriptions>
          </section>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { Download, FolderSearch } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { downloadAdminFileApi, getAdminFileDetailApi, getAdminFilesApi } from '@/api/file'
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { AdminFileQueryDTO, FileInfoVO } from '@/types/file'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'

type FileColumnKey =
  | 'id'
  | 'filename'
  | 'ext'
  | 'size'
  | 'bizType'
  | 'parseStatus'
  | 'resume'
  | 'analysisRecord'
  | 'parseError'
  | 'userId'
  | 'status'
  | 'storage'
  | 'createdAt'
  | 'updatedAt'

const route = useRoute()
const { isAdminMobileReadonly } = useAdminMobileReadonly()
const loading = ref(false)
const detailLoading = ref(false)
const drawerVisible = ref(false)
const loadError = ref('')
const detailError = ref('')
const detailId = ref<number | null>(null)
const files = ref<FileInfoVO[]>([])
const detail = ref<FileInfoVO | null>(null)
const total = ref(0)
const downloadingIds = ref<Set<number>>(new Set())
const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<FileColumnKey>('admin:file-governance', [
  { key: 'id', label: '文件编号', required: true },
  { key: 'filename', label: '上传文件名', required: true },
  { key: 'ext', label: '类型' },
  { key: 'size', label: '大小' },
  { key: 'bizType', label: '关联功能' },
  { key: 'parseStatus', label: '解析状态' },
  { key: 'resume', label: '关联简历' },
  { key: 'analysisRecord', label: '解析记录', defaultVisible: false },
  { key: 'parseError', label: '失败原因' },
  { key: 'userId', label: '用户编号' },
  { key: 'status', label: '状态', required: true },
  { key: 'storage', label: '存储', defaultVisible: false },
  { key: 'createdAt', label: '上传时间' },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false }
])

const query = reactive<AdminFileQueryDTO>({
  userId: undefined,
  bizType: '',
  status: '',
  parseStatus: '',
  pageNo: 1,
  pageSize: 10
})

const bizTypeOptions = computed(() =>
  Array.from(new Set(files.value.map((item) => item.businessType || item.bizType).filter(Boolean))).sort()
)
const currentPageSize = computed(() => formatFileSize(files.value.reduce((sum, item) => sum + (item.fileSize || 0), 0)))
const bizTypeCount = computed(() => bizTypeOptions.value.length)
const availableCount = computed(() => files.value.filter((item) => item.status === 'AVAILABLE').length)
const hasFileFilters = computed(() =>
  Boolean(query.userId || query.bizType || query.status || query.parseStatus)
)
const fileEmptyDescription = computed(() =>
  hasFileFilters.value ? '没有匹配当前筛选条件的文件记录' : '当前暂无上传文件记录，可稍后刷新或从用户简历上传链路排查'
)

const parseStatusOptions = [
  { label: '失败', value: 'FAILED' },
  { label: '成功', value: 'SUCCESS' },
  { label: '解析中', value: 'PARSING' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '待解析', value: 'PENDING' },
  { label: '待确认', value: 'WAIT_CONFIRM' }
]

const parseStatusMap: Record<string, string> = {
  SUCCESS: '成功',
  FAILED: '失败',
  WAIT_CONFIRM: '待确认',
  PARSING: '解析中',
  PROCESSING: '解析中',
  PENDING: '待解析'
}

const fileStatusMap: Record<string, string> = {
  AVAILABLE: '可下载',
  UPLOADING: '上传中',
  PROCESSING: '处理中',
  PENDING: '待处理',
  FAILED: '失败',
  DELETED: '已移除',
  DISABLED: '已停用'
}

const getBusinessType = (row: FileInfoVO) => row.businessType || row.bizType || '-'

const hasDisplayValue = (value?: number | string | boolean | null) =>
  value !== undefined && value !== null && String(value).trim() !== ''

const formatNullable = (value?: number | string | boolean | null) => (hasDisplayValue(value) ? String(value) : '-')
const friendlyParseError = (value?: string) => toFriendlyMessage(value, '解析失败，请稍后重试。')

const formatIdLabel = (label: string, value?: number | string | null) =>
  hasDisplayValue(value) ? `${label}编号 ${value}` : '-'

const getParseStatusLabel = (status?: string) => {
  if (!status) return '-'
  return parseStatusMap[status] || '状态待确认'
}

const getParseStatusType = (status?: string) => {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  if (['WAIT_CONFIRM', 'PARSING', 'PROCESSING', 'PENDING'].includes(String(status))) return 'warning'
  return 'info'
}

const getFileStatusLabel = (status?: string | null) => {
  const value = String(status || '').trim().toUpperCase()
  if (!value) return '-'
  return fileStatusMap[value] || '状态待确认'
}

const getFileStatusType = (status?: string | null) => {
  const value = String(status || '').trim().toUpperCase()
  if (value === 'AVAILABLE') return 'success'
  if (['FAILED', 'DELETED', 'DISABLED'].includes(value)) return 'danger'
  if (['UPLOADING', 'PROCESSING', 'PENDING'].includes(value)) return 'warning'
  return 'info'
}

const formatConfirmed = (value?: boolean | null) => {
  if (value === true) return '已确认'
  if (value === false) return '未确认'
  return '-'
}

const hasParseRecord = (row: FileInfoVO) =>
  Boolean(row.resumeAnalysisRecordId || row.resumeId || row.parseStatus || row.parseErrorMessage)

const canDownload = (row?: FileInfoVO | null): row is FileInfoVO =>
  Boolean(row?.id && row.status === 'AVAILABLE')

const isDownloading = (id?: number) => Boolean(id && downloadingIds.value.has(id))
const adminMobileDownloadHint = '手机端仅用于只读巡检，文件下载请切到桌面端处理。'
const downloadReadonlyTitle = (row?: FileInfoVO | null) => {
  if (isAdminMobileReadonly.value) return adminMobileDownloadHint
  return canDownload(row) ? undefined : '当前文件状态不可下载'
}

const formatFileSize = (value?: number) => {
  const size = Number(value || 0)
  if (size <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let current = size
  let unitIndex = 0
  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024
    unitIndex += 1
  }
  return `${current.toFixed(current >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

const firstQueryString = (value: unknown) => {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value == null ? '' : String(value)
}

const applyRouteQuery = () => {
  const hasRouteFilter = ['userId', 'bizType', 'businessType', 'status', 'parseStatus'].some((key) =>
    firstQueryString(route.query[key])
  )
  if (!hasRouteFilter) return false
  const userId = Number(firstQueryString(route.query.userId))
  const bizType = firstQueryString(route.query.bizType || route.query.businessType)
  const status = firstQueryString(route.query.status)
  const parseStatus = firstQueryString(route.query.parseStatus)
  Object.assign(query, {
    userId: Number.isFinite(userId) && userId > 0 ? userId : undefined,
    bizType,
    status: status ? status.toUpperCase() : '',
    parseStatus: parseStatus ? parseStatus.toUpperCase() : '',
    pageNo: 1
  })
  return true
}

const toQueryParams = (): AdminFileQueryDTO => ({
  userId: query.userId,
  bizType: query.bizType || undefined,
  status: query.status || undefined,
  parseStatus: query.parseStatus || undefined,
  pageNo: query.pageNo,
  pageSize: query.pageSize
})

const fetchFiles = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const page = await getAdminFilesApi(toQueryParams())
    files.value = page.records
    total.value = page.total
  } catch (error) {
    files.value = []
    total.value = 0
    loadError.value = getErrorMessage(error, '文件列表加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchFiles()
}

const handleReset = () => {
  Object.assign(query, {
    userId: undefined,
    bizType: '',
    status: '',
    parseStatus: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchFiles()
}

const openDetail = async (id: number) => {
  drawerVisible.value = true
  detailId.value = id
  detail.value = null
  detailError.value = ''
  detailLoading.value = true
  try {
    detail.value = await getAdminFileDetailApi(id)
  } catch (error) {
    const message = getErrorMessage(error, '文件详情加载失败，请稍后重试。')
    detailError.value = message
    ElMessage.error(message)
  } finally {
    detailLoading.value = false
  }
}

const retryOpenDetail = () => {
  if (detailId.value === null) return
  openDetail(detailId.value)
}

const downloadFile = async (row?: FileInfoVO | null) => {
  if (isAdminMobileReadonly.value) {
    ElMessage.warning(adminMobileDownloadHint)
    return
  }
  if (!canDownload(row)) {
    ElMessage.warning('当前文件状态不可下载')
    return
  }
  downloadingIds.value = new Set(downloadingIds.value).add(row.id)
  try {
    const blob = await downloadAdminFileApi(row.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = row.originalFilename || `file_${row.id}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } finally {
    const next = new Set(downloadingIds.value)
    next.delete(row.id)
    downloadingIds.value = next
  }
}

watch(
  () => [route.query.userId, route.query.bizType, route.query.businessType, route.query.status, route.query.parseStatus],
  () => {
    if (applyRouteQuery()) {
      void fetchFiles()
    }
  }
)

onMounted(() => {
  applyRouteQuery()
  fetchFiles()
})
</script>

<style scoped lang="scss">
.file-error {
  margin-top: 14px;
  color: var(--cc-danger);
  font-size: 13px;
}

.file-detail {
  min-height: 240px;
}

.file-detail__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.muted-value {
  color: var(--cc-text-muted);
}

.parse-error-text {
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  color: var(--cc-danger);
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.parse-detail-panel {
  margin-top: 18px;
  padding: 16px;
  border: 1px solid var(--cc-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.64);
}

.parse-detail-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  h3 {
    margin: 0;
    color: var(--cc-text);
    font-size: 15px;
    font-weight: 700;
  }
}

.parse-empty {
  padding: 16px;
  border: 1px dashed var(--cc-border);
  border-radius: 8px;
  color: var(--cc-text-muted);
  text-align: center;
}

.parse-error-block {
  display: block;
  max-width: 100%;
  color: var(--cc-danger);
  line-height: 1.7;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
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
  }
}
</style>
