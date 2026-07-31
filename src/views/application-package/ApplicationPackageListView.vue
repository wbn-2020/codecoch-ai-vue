<template>
  <div class="page-shell application-package-list">
    <section class="list-header">
      <div>
        <p class="eyebrow">岗位投递包</p>
        <h1>投递包列表</h1>
        <p>查看已持久化的投递包快照、就绪状态和最近刷新记录。</p>
      </div>
      <div class="list-actions">
        <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/application-packages/preview')">创建预览</el-button>
      </div>
    </section>

    <section class="list-toolbar">
      <el-input
        v-model="query.keyword"
        class="keyword-input"
        clearable
        placeholder="搜索公司、岗位或投递包编号"
        :prefix-icon="Search"
        @keyup.enter="search"
        @clear="search"
      />
      <el-select v-model="query.status" clearable placeholder="全部状态" class="status-select" @change="search">
        <el-option label="全部状态" value="" />
        <el-option label="就绪" value="READY" />
        <el-option label="已投递" value="APPLIED" />
        <el-option label="已归档" value="ARCHIVED" />
        <el-option label="草稿" value="DRAFT" />
      </el-select>
      <el-button :icon="Search" @click="search">筛选</el-button>
    </section>

    <AppState
      v-if="errorMessage"
      type="error"
      title="投递包列表暂时无法读取"
      :description="errorMessage"
    >
      <el-button type="primary" @click="load">重试</el-button>
    </AppState>

    <section v-else class="list-surface" v-loading="loading">
      <el-table
        v-if="page.records.length"
        :data="page.records"
        row-key="id"
        class="package-table"
        @row-click="openDetail"
      >
        <el-table-column label="投递包" min-width="220">
          <template #default="{ row }">
            <div class="package-title">
              <strong>{{ row.jobTitle || '未命名岗位' }}</strong>
              <span>{{ row.companyName || '未填写公司' }}</span>
              <small>{{ row.packageNo || `#${row.id}` }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="就绪度" width="150">
          <template #default="{ row }">
            <el-tag :type="readinessTagType(row.readinessLevel)" effect="light">
              {{ row.readinessLevel || 'UNKNOWN' }}
            </el-tag>
            <span v-if="row.readinessScore !== undefined" class="score">{{ row.readinessScore }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="130">
          <template #default="{ row }">
            <el-tag :type="packageStatusTagType(row.packageStatus)" effect="plain">
              {{ packageStatusLabel(row.packageStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="版本" width="150">
          <template #default="{ row }">
            <div class="version-cell">
              <span>{{ packageContextVersionLabel(row) }}</span>
              <el-tag
                v-if="(row.contextPackageCount || 0) > 1"
                :type="row.latestContextPackage ? 'success' : 'info'"
                effect="plain"
                size="small"
              >
                {{ row.latestContextPackage ? '最新' : '历史' }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="刷新时间" width="190">
          <template #default="{ row }">{{ formatDateTime(row.refreshedAt || row.updatedAt || row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button :icon="View" link type="primary" @click.stop="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <AppState
        v-else
        type="empty"
        title="还没有持久化投递包"
        description="可以从岗位、匹配报告或投递包预览入口保存第一份投递包。"
      >
        <el-button type="primary" :icon="Plus" @click="router.push('/application-packages/preview')">创建预览</el-button>
      </AppState>

      <el-pagination
        v-if="page.total > page.pageSize"
        v-model:current-page="query.pageNo"
        v-model:page-size="query.pageSize"
        class="package-pagination"
        background
        layout="total, prev, pager, next, sizes"
        :total="page.total"
        :page-sizes="[10, 20, 50]"
        @current-change="load"
        @size-change="search"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { Plus, Refresh, Search, View } from '@element-plus/icons-vue'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getApplicationPackagesApi } from '@/api/applicationPackage'
import AppState from '@/components/common/AppState.vue'
import type { PageResult } from '@/types/api'
import type { ApplicationPackageStatus, JobApplicationPackageListItemVO } from '@/types/applicationPackage'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')

interface PackageListQuery {
  pageNo: number
  pageSize: number
  status: ApplicationPackageStatus | ''
  keyword: string
}

const query = reactive<PackageListQuery>({
  pageNo: 1,
  pageSize: 10,
  status: '',
  keyword: ''
})
const page = ref<PageResult<JobApplicationPackageListItemVO>>({
  records: [],
  total: 0,
  pageNo: 1,
  pageNum: 1,
  pageSize: 10,
  pages: 1
})

const readinessTagType = (level?: string) => {
  const value = String(level || '').toUpperCase()
  if (value === 'READY') return 'success'
  if (value === 'BLOCKED') return 'danger'
  if (value.startsWith('NEEDS_')) return 'warning'
  return 'info'
}

const packageStatusTagType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (value === 'READY') return 'success'
  if (value === 'APPLIED') return 'primary'
  if (value === 'ARCHIVED') return 'info'
  if (value === 'DRAFT') return 'warning'
  return 'info'
}

const packageStatusLabel = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (value === 'READY') return '就绪'
  if (value === 'APPLIED') return '已投递'
  if (value === 'ARCHIVED') return '已归档'
  if (value === 'DRAFT') return '草稿'
  return '未标记'
}

const packageContextVersionLabel = (row: JobApplicationPackageListItemVO) => {
  const versionNo = row.contextVersionNo || row.snapshotVersion || 1
  const count = row.contextPackageCount || 1
  return count > 1 ? `第 ${versionNo}/${count} 版` : `v${row.snapshotVersion || 1}`
}

const load = async () => {
  loading.value = true
  try {
    page.value = await getApplicationPackagesApi({
      pageNo: query.pageNo,
      pageSize: query.pageSize,
      status: query.status || undefined,
      keyword: query.keyword || undefined
    })
    errorMessage.value = ''
  } catch (error) {
    page.value = { ...page.value, records: [], total: 0 }
    errorMessage.value = getErrorMessage(error, '投递包列表加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const search = () => {
  query.pageNo = 1
  load()
}

const openDetail = (row: JobApplicationPackageListItemVO) => {
  if (!row?.id) return
  router.push(`/application-packages/${encodeURIComponent(String(row.id))}`)
}

onMounted(load)
</script>

<style scoped>
.application-package-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  color: var(--user-text);
}

.list-header,
.list-toolbar,
.list-surface {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.list-header h1 {
  margin: 4px 0 8px;
  color: var(--user-text);
  font-size: 26px;
}

.list-header p {
  margin: 0;
  color: var(--user-text-muted);
}

.eyebrow {
  margin: 0;
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 700;
}

.list-actions,
.list-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.list-toolbar {
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-md);
  background: var(--user-surface);
}

.keyword-input {
  max-width: 320px;
}

.status-select {
  width: 150px;
}

.list-surface {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-md);
  background: var(--user-surface);
}

.package-table {
  width: 100%;
  --el-table-bg-color: var(--user-surface);
  --el-table-border-color: var(--user-border);
  --el-table-header-bg-color: var(--user-surface-muted);
  --el-table-header-text-color: var(--user-text-secondary);
  --el-table-row-hover-bg-color: var(--user-surface-raised);
  --el-table-text-color: var(--user-text);
  --el-table-tr-bg-color: var(--user-surface);
}

.package-title {
  display: grid;
  gap: 3px;
}

.package-title span,
.package-title small {
  color: var(--user-text-muted);
}

.score {
  margin-left: 8px;
  color: var(--user-text-muted);
  font-size: 13px;
}

.version-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.package-pagination {
  margin-top: 0;
  padding: 12px;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
  }

  .list-actions,
  .list-toolbar,
  .keyword-input,
  .status-select {
    width: 100%;
  }

  .list-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
