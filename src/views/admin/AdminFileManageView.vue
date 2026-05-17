<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <FolderSearch :size="16" />
          <span>File Governance</span>
        </div>
        <h1 class="admin-hero__title">文件治理</h1>
        <p class="admin-hero__desc">
          基于真实 /admin/files 接口查看上传文件元数据。当前后端仅提供列表和详情，删除、下载、重试解析入口不在本页伪造。
        </p>
      </div>
    </section>

    <div class="admin-insight-grid">
      <article class="admin-insight-card">
        <span>文件总数</span>
        <strong>{{ total }}</strong>
        <small>来自文件分页接口 total</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页容量</span>
        <strong>{{ currentPageSize }}</strong>
        <small>仅统计当前页文件大小</small>
      </article>
      <article class="admin-insight-card">
        <span>业务类型</span>
        <strong>{{ bizTypeCount }}</strong>
        <small>仅统计当前页 bizType</small>
      </article>
      <article class="admin-insight-card">
        <span>存储状态</span>
        <strong>{{ availableCount }}</strong>
        <small>当前页 AVAILABLE 数量</small>
      </article>
    </div>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>文件列表</h2>
          <p>支持按用户、业务类型和状态筛选；后端未提供文件名关键词查询。</p>
        </div>
      </div>

      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="用户 ID">
            <el-input-number v-model="query.userId" :min="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="业务类型">
            <el-select v-model="query.bizType" clearable filterable allow-create placeholder="全部类型" style="width: 160px">
              <el-option v-for="item in bizTypeOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable filterable allow-create placeholder="全部状态" style="width: 160px">
              <el-option label="AVAILABLE" value="AVAILABLE" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="files" row-key="id">
          <el-table-column prop="id" label="文件 ID" width="100" />
          <el-table-column prop="originalFilename" label="原始文件名" min-width="220" show-overflow-tooltip />
          <el-table-column prop="fileExt" label="类型" width="90" />
          <el-table-column label="大小" width="120">
            <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
          </el-table-column>
          <el-table-column prop="bizType" label="业务类型" min-width="120" show-overflow-tooltip />
          <el-table-column prop="userId" label="用户 ID" width="110" />
          <el-table-column label="状态" width="130">
            <template #default="{ row }">
              <el-tag :type="row.status === 'AVAILABLE' ? 'success' : 'info'" effect="plain">
                {{ row.status || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="storageProvider" label="存储" width="100" />
          <el-table-column prop="createdAt" label="上传时间" min-width="170" show-overflow-tooltip />
          <el-table-column prop="updatedAt" label="更新时间" min-width="170" show-overflow-tooltip />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="loadError" class="file-error">
        {{ loadError }}
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
        <el-empty v-if="!detail" description="暂无文件详情" />
        <el-descriptions v-else :column="1" border>
          <el-descriptions-item label="文件 ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="用户 ID">{{ detail.userId }}</el-descriptions-item>
          <el-descriptions-item label="业务类型">{{ detail.bizType }}</el-descriptions-item>
          <el-descriptions-item label="原始文件名">{{ detail.originalFilename }}</el-descriptions-item>
          <el-descriptions-item label="存储文件名">{{ detail.storedFilename }}</el-descriptions-item>
          <el-descriptions-item label="文件类型">{{ detail.fileExt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="MIME">{{ detail.mimeType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatFileSize(detail.fileSize) }}</el-descriptions-item>
          <el-descriptions-item label="存储提供方">{{ detail.storageProvider || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detail.status === 'AVAILABLE' ? 'success' : 'info'" effect="plain">
              {{ detail.status || '-' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detail.createdAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ detail.updatedAt || '-' }}</el-descriptions-item>
        </el-descriptions>
        <p class="pending-note">
          后端 admin 文件接口未返回 storagePath，也未提供 admin 下载、删除或重试解析接口。
        </p>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { FolderSearch } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import { getAdminFileDetailApi, getAdminFilesApi } from '@/api/file'
import type { AdminFileQueryDTO, FileInfoVO } from '@/types/file'

const loading = ref(false)
const detailLoading = ref(false)
const drawerVisible = ref(false)
const loadError = ref('')
const files = ref<FileInfoVO[]>([])
const detail = ref<FileInfoVO | null>(null)
const total = ref(0)

const query = reactive<AdminFileQueryDTO>({
  userId: undefined,
  bizType: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const bizTypeOptions = computed(() =>
  Array.from(new Set(files.value.map((item) => item.bizType).filter(Boolean))).sort()
)
const currentPageSize = computed(() => formatFileSize(files.value.reduce((sum, item) => sum + (item.fileSize || 0), 0)))
const bizTypeCount = computed(() => bizTypeOptions.value.length)
const availableCount = computed(() => files.value.filter((item) => item.status === 'AVAILABLE').length)

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

const toQueryParams = (): AdminFileQueryDTO => ({
  userId: query.userId,
  bizType: query.bizType || undefined,
  status: query.status || undefined,
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
    loadError.value = error instanceof Error ? error.message : '文件列表加载失败'
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
    pageNo: 1,
    pageSize: 10
  })
  fetchFiles()
}

const openDetail = async (id: number) => {
  drawerVisible.value = true
  detail.value = null
  detailLoading.value = true
  try {
    detail.value = await getAdminFileDetailApi(id)
  } finally {
    detailLoading.value = false
  }
}

onMounted(fetchFiles)
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

.pending-note {
  margin: 16px 0 0;
  padding: 12px 14px;
  border: 1px solid var(--cc-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.64);
  color: var(--cc-text-muted);
  line-height: 1.7;
}
</style>
