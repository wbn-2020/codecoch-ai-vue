<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Activity :size="16" />
          <span>AI Observability</span>
        </div>
        <h1 class="admin-hero__title">AI 调用日志</h1>
        <p class="admin-hero__desc">
          查询 AI 调用场景、模型、Token、耗时、状态和失败原因。聚合指标仅基于真实列表字段展示，
          没有聚合接口时不写死调用趋势。
        </p>
      </div>
    </section>

    <div class="admin-insight-grid">
      <article class="admin-insight-card">
        <span>日志总数</span>
        <strong>{{ total }}</strong>
        <small>来自 AI 日志列表 total</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页失败</span>
        <strong>{{ failedCount }}</strong>
        <small>仅统计当前页记录</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页 Token</span>
        <strong>{{ tokenTotal }}</strong>
        <small>仅统计返回了 totalTokens 的记录</small>
      </article>
      <article class="admin-insight-card">
        <span>模型类型</span>
        <strong>{{ modelCount }}</strong>
        <small>仅统计当前页 modelName</small>
      </article>
    </div>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>调用明细</h2>
          <p>筛选条件和详情抽屉沿用现有 AI 日志接口。</p>
        </div>
      </div>

      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="用户 ID">
            <el-input-number v-model="query.userId" :min="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="场景">
            <el-select v-model="query.scene" clearable placeholder="全部场景" style="width: 220px">
              <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="业务 ID">
            <el-input v-model.trim="query.businessId" clearable placeholder="businessId" />
          </el-form-item>
          <el-form-item label="模型">
            <el-input v-model.trim="query.modelName" clearable placeholder="模型名称" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
              <el-option label="成功" :value="1" />
              <el-option label="失败" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="logs" row-key="id">
          <el-table-column prop="createdAt" label="调用时间" min-width="170" />
          <el-table-column prop="modelName" label="模型" min-width="140" show-overflow-tooltip />
          <el-table-column label="场景 / 类型" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ getSceneLabel(row.scene || row.callType) }}</template>
          </el-table-column>
          <el-table-column label="Token" width="110">
            <template #default="{ row }">{{ row.totalTokens ?? '-' }}</template>
          </el-table-column>
          <el-table-column label="耗时" width="110">
            <template #default="{ row }">{{ row.elapsedMs ?? row.latencyMs ?? '-' }} ms</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column label="失败原因" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.failReason || row.errorMessage || '-' }}</template>
          </el-table-column>
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
          <el-descriptions-item label="调用场景">{{ getSceneLabel(detail.scene || detail.callType) }}</el-descriptions-item>
          <el-descriptions-item label="状态"><StatusTag :status="detail.status" /></el-descriptions-item>
          <el-descriptions-item label="模型">{{ detail.modelName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="业务 ID">{{ detail.businessId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Token">{{ detail.totalTokens ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ detail.elapsedMs ?? detail.latencyMs ?? '-' }} ms</el-descriptions-item>
          <el-descriptions-item label="失败原因">{{ detail.failReason || detail.errorMessage || '-' }}</el-descriptions-item>
        </el-descriptions>

        <h3>请求 Prompt</h3>
        <pre>{{ detail.requestPrompt || detail.promptContent || detail.requestParams || '-' }}</pre>
        <h3>Prompt 内容</h3>
        <pre>{{ detail.promptContent || '-' }}</pre>
        <h3>响应内容</h3>
        <pre>{{ detail.responseContent || '-' }}</pre>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { Activity } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import { getAdminAiLogDetailApi, getAdminAiLogsApi } from '@/api/aiAdmin'
import StatusTag from '@/components/common/StatusTag.vue'
import { AI_SCENE } from '@/constants/enums'
import type { AiCallLogQueryDTO, AiCallLogVO, AiScene } from '@/types/ai'

const sceneOptions = [
  { label: '八股文提问', value: AI_SCENE.INTERVIEW_QUESTION_GENERATE },
  { label: '项目深挖提问', value: AI_SCENE.PROJECT_DEEP_DIVE_QUESTION },
  { label: '回答评分', value: AI_SCENE.INTERVIEW_ANSWER_EVALUATE },
  { label: '动态追问', value: AI_SCENE.INTERVIEW_FOLLOW_UP_GENERATE },
  { label: '面试报告生成', value: AI_SCENE.INTERVIEW_REPORT_GENERATE }
]

const loading = ref(false)
const drawerVisible = ref(false)
const logs = ref<AiCallLogVO[]>([])
const detail = ref<AiCallLogVO | null>(null)
const total = ref(0)

const query = reactive<AiCallLogQueryDTO>({
  userId: undefined,
  scene: '',
  businessId: '',
  modelName: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const failedCount = computed(() =>
  logs.value.filter((item) => String(item.status) === 'FAILED' || String(item.status) === '0').length
)
const tokenTotal = computed(() => logs.value.reduce((sum, item) => sum + (item.totalTokens || 0), 0))
const modelCount = computed(() => new Set(logs.value.map((item) => item.modelName).filter(Boolean)).size)

const getSceneLabel = (value?: AiScene | '') => sceneOptions.find((item) => item.value === value)?.label || value || '-'

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
    scene: '',
    businessId: '',
    modelName: '',
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
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 8px;
    background: #0f172a;
    color: #e5e7eb;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
