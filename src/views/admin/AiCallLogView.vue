<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Activity :size="16" />
          <span>AI 可观测</span>
        </div>
        <h1 class="admin-hero__title">AI 调用日志</h1>
        <p class="admin-hero__desc">
          查询 AI 调用场景、模型、Token、耗时、状态、失败原因和 traceId，便于把一次后台操作和对应 AI 调用串起来排查。
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
          <p>支持按用户、场景、模型、状态和 traceId 定位 AI 调用。</p>
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
            <el-input v-model.trim="query.businessId" clearable placeholder="输入业务 ID" />
          </el-form-item>
          <el-form-item label="模型">
            <el-input v-model.trim="query.modelName" clearable placeholder="模型名称" />
          </el-form-item>
          <el-form-item label="traceId">
            <el-input v-model.trim="query.traceId" clearable placeholder="链路 ID" />
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
          <el-table-column label="traceId" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ displayAiTraceId(row) }}</template>
          </el-table-column>
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
            <template #default="{ row }">{{ translateFailureReason(row.failReason || row.errorMessage) }}</template>
          </el-table-column>
          <el-table-column label="摘要 / 脱敏预览" min-width="320" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="log-preview">
                <strong>{{ displayAiSummary(row) }}</strong>
                <small>{{ displayAiMaskedPreview(row) }}</small>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <AppState
              :type="logError ? 'error' : 'empty'"
              :title="logError ? 'AI 日志加载失败' : '暂无 AI 调用日志'"
              :description="logError || '当前筛选条件下没有日志记录。'"
            >
              <el-button type="primary" @click="logError ? fetchLogs() : handleReset()">{{ logError ? '重新加载' : '清空筛选' }}</el-button>
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
          @change="fetchLogs"
        />
      </div>
    </section>

    <el-dialog v-model="drawerVisible" title="AI 调用日志详情" width="min(920px, calc(100vw - 32px))" class="admin-detail-dialog" align-center>
      <div v-if="detail" class="admin-detail-dialog__body log-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="日志 ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="traceId">{{ detail.traceId || displayAiTraceId(detail) }}</el-descriptions-item>
          <el-descriptions-item label="调用场景">{{ getSceneLabel(detail.scene || detail.callType) }}</el-descriptions-item>
          <el-descriptions-item label="状态"><StatusTag :status="detail.status" /></el-descriptions-item>
          <el-descriptions-item label="模型">{{ detail.modelName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="业务 ID">{{ detail.businessId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Token">{{ detail.totalTokens ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ detail.elapsedMs ?? detail.latencyMs ?? '-' }} ms</el-descriptions-item>
          <el-descriptions-item label="失败原因">{{ translateFailureReason(detail.failReason || detail.errorMessage) }}</el-descriptions-item>
          <el-descriptions-item label="摘要">{{ displayAiSummary(detail) }}</el-descriptions-item>
          <el-descriptions-item label="脱敏预览">{{ displayAiMaskedPreview(detail) }}</el-descriptions-item>
          <el-descriptions-item label="原文字段">
            <span>{{ detail.rawFieldsAvailable ? '已记录，可按权限申请查看' : '未记录原文字段' }}</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.requestPromptHash || detail.responseContentHash" label="内容指纹">
            请求 {{ detail.requestPromptHash || detail.requestBodyHash || '-' }} / 响应 {{ detail.responseContentHash || detail.responseBodyHash || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <el-alert
          class="sensitive-detail-alert"
          type="warning"
          show-icon
          :closable="false"
          title="原始 Prompt 和响应可能包含简历、面试回答或调试变量，默认隐藏。"
        />
        <div class="raw-detail-toggle">
          <span>原始内容</span>
          <div class="raw-detail-actions">
            <el-button
              v-if="!rawDetailVisible"
              type="warning"
              plain
              :loading="rawDetailLoading"
              :disabled="!canViewRawLog || !detail.rawFieldsAvailable"
              @click="loadRawDetail"
            >
              查看原文
            </el-button>
            <el-button v-else @click="rawDetailVisible = false">隐藏原文</el-button>
          </div>
        </div>
        <p v-if="!canViewRawLog && detail.rawFieldsAvailable" class="raw-detail-hint">当前账号没有 AI 日志原文查看权限。</p>
        <template v-if="rawDetailVisible">
          <h3>原始请求 Prompt</h3>
          <pre>{{ detail.requestPrompt || detail.promptContent || detail.requestParams || '-' }}</pre>
          <h3>原始变量 / 请求体</h3>
          <pre>{{ detail.inputVariablesJson || detail.requestBody || '-' }}</pre>
          <h3>原始响应内容</h3>
          <pre>{{ detail.responseContent || detail.responseBody || '-' }}</pre>
        </template>
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
import { ElMessage } from 'element-plus'
import { Activity } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import { getAdminAiLogDetailApi, getAdminAiLogRawApi, getAdminAiLogsApi } from '@/api/aiAdmin'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { AI_SCENE } from '@/constants/enums'
import { useAuthStore } from '@/stores/auth'
import type { AiCallLogQueryDTO, AiCallLogVO, AiScene } from '@/types/ai'
import { translateFailureReason } from '@/utils/adminDisplay'

const sceneOptions = [
  { label: 'AI 题目生成', value: 'AI_QUESTION_GENERATE' },
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
const rawDetailVisible = ref(false)
const rawDetailLoading = ref(false)
const logError = ref('')
const authStore = useAuthStore()

const query = reactive<AiCallLogQueryDTO>({
  userId: undefined,
  scene: '',
  businessId: '',
  modelName: '',
  traceId: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const failedCount = computed(() =>
  logs.value.filter((item) => String(item.status) === 'FAILED' || String(item.status) === '0').length
)
const tokenTotal = computed(() => logs.value.reduce((sum, item) => sum + (item.totalTokens || 0), 0))
const modelCount = computed(() => new Set(logs.value.map((item) => item.modelName).filter(Boolean)).size)
const canViewRawLog = computed(() => authStore.hasPermission('admin:ai:log:raw:view'))

const getSceneLabel = (value?: AiScene | '') => sceneOptions.find((item) => item.value === value)?.label || value || '-'

const compactText = (value?: string, maxLength = 120) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

const maskSensitiveText = (value?: string) =>
  compactText(value)
    .replace(/([\w.+-]{2})[\w.+-]*@([\w-]+\.[\w.-]+)/g, '$1***@$2')
    .replace(/(1[3-9]\d)\d{4}(\d{4})/g, '$1****$2')
    .replace(/(api[_-]?key|token|password|secret)["'=:\s]+([^,\s}"']+)/gi, '$1=***')

const displayAiSummary = (row: AiCallLogVO) =>
  row.summary ||
  row.callSummary ||
  `${getSceneLabel(row.scene || row.callType)} · ${row.businessId ? `业务 ${row.businessId}` : displayAiTraceId(row)}`

const displayAiTraceId = (row: AiCallLogVO) =>
  row.traceIdShort || row.shortTraceId || compactText(row.traceId, 12) || '-'

const displayAiMaskedPreview = (row: AiCallLogVO) => {
  const preview =
  row.maskedPreview ||
  row.inputVariablesPreview ||
  row.requestBodyHash ||
  row.requestPromptHash ||
  row.responseContentHash ||
  row.responseBodyHash
  return preview ? maskSensitiveText(preview) : '原始 Prompt 和响应默认隐藏'
}

const fetchLogs = async () => {
  loading.value = true
  logError.value = ''
  try {
    const result = await getAdminAiLogsApi(query)
    logs.value = result.records || []
    total.value = result.total || 0
  } catch {
    logs.value = []
    total.value = 0
    logError.value = '暂时无法获取 AI 调用日志，请稍后重试或检查服务状态。'
  } finally {
    loading.value = false
  }
}

const openDetail = async (row: AiCallLogVO) => {
  try {
    rawDetailVisible.value = false
    detail.value = await getAdminAiLogDetailApi(row.id)
    drawerVisible.value = true
  } catch {
    ElMessage.error('AI 调用日志详情加载失败')
  }
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
    traceId: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchLogs()
}

const loadRawDetail = async () => {
  if (!detail.value?.id || !canViewRawLog.value) return
  rawDetailLoading.value = true
  try {
    detail.value = await getAdminAiLogRawApi(detail.value.id)
    rawDetailVisible.value = true
  } catch {
    rawDetailVisible.value = false
    ElMessage.error('没有权限或原文加载失败')
  } finally {
    rawDetailLoading.value = false
  }
}

onMounted(fetchLogs)
</script>

<style scoped lang="scss">
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

.log-preview {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: var(--app-text);
    font-weight: 600;
  }

  small {
    color: var(--app-text-muted);
  }
}

.admin-detail-dialog__body {
  overflow: auto;
  max-height: min(72vh, 720px);
  padding-right: 2px;
}

.admin-detail-dialog__footer {
  display: flex;
  justify-content: flex-end;
}

.sensitive-detail-alert {
  margin-top: 18px;
}

.raw-detail-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 14px 0 0;
  padding: 12px;
  border: 1px solid rgba(245, 158, 11, 0.22);
  border-radius: 8px;
  background: rgba(120, 53, 15, 0.16);
}

.raw-detail-toggle span {
  color: var(--app-text);
  font-weight: 600;
}

.raw-detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.raw-detail-hint {
  margin: 8px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
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
