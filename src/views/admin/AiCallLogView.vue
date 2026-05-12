<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">AI 调用日志</h1>
        <p class="page-subtitle">查询 AI 调用场景、状态、耗时和失败原因，不提供重新调用或任务中心。</p>
      </div>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form :model="query" inline>
          <el-form-item label="用户 ID">
            <el-input-number v-model="query.userId" :min="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="面试 ID">
            <el-input-number v-model="query.interviewId" :min="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="场景">
            <el-select v-model="query.callType" clearable placeholder="全部场景" style="width: 220px">
              <el-option v-for="item in promptTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
              <el-option label="SUCCESS" value="SUCCESS" />
              <el-option label="FAILED" value="FAILED" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card">
        <el-table v-loading="loading" :data="logs" row-key="id">
          <el-table-column prop="id" label="日志 ID" width="100" />
          <el-table-column prop="userId" label="用户 ID" width="100" />
          <el-table-column prop="interviewId" label="面试 ID" width="110" />
          <el-table-column label="场景" min-width="210">
            <template #default="{ row }">{{ getOptionLabel(promptTypeOptions, row.callType) }}</template>
          </el-table-column>
          <el-table-column prop="modelName" label="模型" min-width="140" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column prop="latencyMs" label="耗时(ms)" width="110" />
          <el-table-column prop="createdAt" label="调用时间" min-width="170" />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            </template>
          </el-table-column>
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
          @change="fetchLogs"
        />
      </div>
    </section>

    <el-drawer v-model="drawerVisible" title="AI 调用日志详情" size="720px">
      <div v-if="detail" class="log-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="日志 ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="调用场景">{{ getOptionLabel(promptTypeOptions, detail.callType) }}</el-descriptions-item>
          <el-descriptions-item label="状态"><StatusTag :status="detail.status" /></el-descriptions-item>
          <el-descriptions-item label="模型">{{ detail.modelName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ detail.latencyMs ?? '-' }} ms</el-descriptions-item>
          <el-descriptions-item label="失败原因">{{ detail.errorMessage || '-' }}</el-descriptions-item>
        </el-descriptions>

        <h3>请求参数</h3>
        <pre>{{ detail.requestParams || '-' }}</pre>
        <h3>Prompt 内容</h3>
        <pre>{{ detail.promptContent || '-' }}</pre>
        <h3>响应内容</h3>
        <pre>{{ detail.responseContent || '-' }}</pre>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { getAdminAiLogDetailApi, getAdminAiLogsApi } from '@/api/aiAdmin'
import StatusTag from '@/components/common/StatusTag.vue'
import { promptTypeOptions } from '@/constants/enums'
import type { AiCallLogQueryDTO, AiCallLogVO } from '@/types/ai'
import { getOptionLabel } from '@/utils/format'

const loading = ref(false)
const drawerVisible = ref(false)
const logs = ref<AiCallLogVO[]>([])
const detail = ref<AiCallLogVO | null>(null)
const total = ref(0)

const query = reactive<AiCallLogQueryDTO>({
  userId: undefined,
  interviewId: undefined,
  callType: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const fetchLogs = async () => {
  loading.value = true
  try {
    const result = await getAdminAiLogsApi(query)
    logs.value = result.records || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

const openDetail = async (row: AiCallLogVO) => {
  detail.value = await getAdminAiLogDetailApi(row.id)
  drawerVisible.value = true
}

const handleSearch = () => {
  query.pageNo = 1
  fetchLogs()
}

const handleReset = () => {
  Object.assign(query, {
    userId: undefined,
    interviewId: undefined,
    callType: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchLogs()
}

onMounted(fetchLogs)
</script>

<style scoped lang="scss">
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

.log-detail {
  h3 {
    margin: 20px 0 10px;
    font-size: 16px;
  }

  pre {
    overflow: auto;
    max-height: 260px;
    margin: 0;
    padding: 12px;
    border-radius: 8px;
    background: #0f172a;
    color: #e5e7eb;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
