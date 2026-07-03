<template>
  <div class="page-shell admin-console-page audit-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <KeyRound :size="16" />
          <span>登录审计</span>
        </div>
        <h1 class="admin-hero__title">登录日志</h1>
        <p class="admin-hero__desc">追踪登录成功、失败、来源 IP、客户端信息和请求追踪号。</p>
      </div>
      <div class="admin-hero__actions">
        <el-button :icon="RefreshCw" :loading="loading || summaryLoading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <section class="audit-metrics">
      <article class="audit-metric">
        <span>登录日志总数</span>
        <strong>{{ summary?.totalLoginLogs ?? total }}</strong>
        <small>最近登录 {{ summary?.latestLoginAt || '--' }}</small>
      </article>
      <article class="audit-metric">
        <span>今日登录</span>
        <strong>{{ summary?.todayLoginLogs ?? 0 }}</strong>
        <small>按 loginTime 统计</small>
      </article>
      <article class="audit-metric audit-metric--danger">
        <span>失败登录</span>
        <strong>{{ summary?.failedLoginLogs ?? 0 }}</strong>
        <small>今日失败 {{ summary?.todayFailedLoginLogs ?? 0 }}</small>
      </article>
      <article class="audit-metric">
        <span>当前筛选结果</span>
        <strong>{{ total }}</strong>
        <small>当前筛选记录数</small>
      </article>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header login-log-table-header">
        <div>
          <h2>登录记录</h2>
          <p>支持按登录态排障场景调整密度和列显隐，便于复查刷新、深链和新标签登录恢复问题。</p>
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
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="用户名 / IP / 客户端" />
          </el-form-item>
          <el-form-item label="用户编号">
            <el-input-number v-model="query.userId" :min="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="追踪号">
            <el-input v-model.trim="query.traceId" clearable placeholder="输入追踪号" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
              <el-option label="成功" value="SUCCESS" />
              <el-option label="失败" value="FAILED" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="logs" row-key="id" :size="tableSize">
          <template #empty>
            <AppState v-if="logError" type="error" title="登录日志加载失败" :description="logError">
              <el-button type="primary" :loading="loading" @click="fetchLogs">重新加载</el-button>
            </AppState>
            <AppState v-else type="empty" :title="logEmptyTitle" :description="logEmptyDescription">
              <el-button v-if="hasLogFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button v-else :loading="loading" @click="fetchLogs">重新加载</el-button>
            </AppState>
          </template>
          <el-table-column v-if="isColumnVisible('loginTime')" prop="loginTime" label="登录时间" min-width="170" />
          <el-table-column v-if="isColumnVisible('username')" prop="username" label="用户" min-width="140" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('loginType')" prop="loginType" label="登录类型" min-width="120" />
          <el-table-column v-if="isColumnVisible('traceId')" label="追踪号" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ displayLoginTraceId(row) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('ip')" label="IP" min-width="130">
            <template #default="{ row }">{{ row.ipMasked || row.maskedIp || maskIp(row.ip) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="isSuccess(row.status) ? 'success' : 'danger'">
                {{ isSuccess(row.status) ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('message')" label="消息" min-width="180">
            <template #default="{ row }">
              <p :class="['login-log-text-preview', { 'login-log-text-preview--empty': !row.message && isSuccess(row.status) }]">
                {{ row.message || (isSuccess(row.status) ? '登录成功' : '-') }}
              </p>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('preview')" label="摘要 / 脱敏预览" min-width="280">
            <template #default="{ row }">
              <div class="log-preview">
                <strong>{{ displayLoginSummary(row) }}</strong>
                <small>{{ displayMaskedLoginPreview(row) }}</small>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('client')" label="客户端" min-width="260">
            <template #default="{ row }">
              <p :class="['login-log-text-preview', { 'login-log-text-preview--empty': !displayLoginClient(row) }]">
                {{ displayLoginClient(row) || '-' }}
              </p>
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
  </div>
</template>

<script setup lang="ts">
import { KeyRound, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import { getAdminLogSummaryApi, getAdminLoginLogsApi } from '@/api/adminGovernance'
import AppState from '@/components/common/AppState.vue'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { AdminListQuery, AdminLogSummaryVO, LoginLogVO } from '@/types/adminGovernance'
import { getErrorMessage } from '@/utils/error'

const loading = ref(false)
const summaryLoading = ref(false)
const logs = ref<LoginLogVO[]>([])
const summary = ref<AdminLogSummaryVO>()
const total = ref(0)
const logError = ref('')

type LoginLogColumnKey =
  | 'loginTime'
  | 'username'
  | 'loginType'
  | 'traceId'
  | 'ip'
  | 'status'
  | 'message'
  | 'preview'
  | 'client'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<LoginLogColumnKey>('admin:login-log', [
  { key: 'loginTime', label: '登录时间', required: true },
  { key: 'username', label: '用户', required: true },
  { key: 'loginType', label: '登录类型' },
  { key: 'traceId', label: '追踪号' },
  { key: 'ip', label: 'IP' },
  { key: 'status', label: '状态', required: true },
  { key: 'message', label: '消息' },
  { key: 'preview', label: '摘要 / 脱敏预览' },
  { key: 'client', label: '客户端' }
])

const query = reactive<AdminListQuery>({
  keyword: '',
  userId: undefined,
  traceId: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const isSuccess = (status?: string | number) => status === 1 || status === '1' || String(status).toUpperCase() === 'SUCCESS'
const hasLogFilters = computed(() => Boolean(query.keyword || query.userId || query.traceId || query.status))
const logEmptyTitle = computed(() =>
  hasLogFilters.value ? '当前筛选没有登录日志' : '暂无登录日志'
)
const logEmptyDescription = computed(() =>
  hasLogFilters.value
    ? '登录日志已正常返回空结果。可以清空用户、追踪号、状态或关键词筛选后重新查看。'
    : '登录日志为空通常代表当前权限范围内尚无登录记录，或登录审计写入尚未启用。'
)

const maskIp = (ip?: string) => {
  if (!ip) return '-'
  if (ip.includes(':')) return ip.replace(/:[\da-f]{1,4}$/i, ':****')
  return ip.replace(/(\d+\.\d+\.)\d+\.(\d+)/, '$1***.$2')
}

const compactText = (value?: string, maxLength = 96) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

const displayLoginSummary = (row: LoginLogVO) =>
  row.summary || row.loginSummary || row.message || (isSuccess(row.status) ? '登录成功' : '登录失败')

const displayLoginTraceId = (row: LoginLogVO) =>
  row.traceIdShort || row.shortTraceId || row.traceId || '-'

const displayLoginClient = (row: LoginLogVO) =>
  row.userAgentMasked || row.maskedUserAgent || row.userAgentSummary || row.userAgent || ''

const displayMaskedLoginPreview = (row: LoginLogVO) => {
  const preview = row.maskedPreview || row.preview
  if (preview) return compactText(preview)
  const ip = row.ipMasked || row.maskedIp || maskIp(row.ip)
  const client = displayLoginClient(row) || compactText(row.userAgent, 56)
  return compactText([ip, row.location, client].filter(Boolean).join(' · '))
}

const fetchSummary = async () => {
  summaryLoading.value = true
  try {
    summary.value = await getAdminLogSummaryApi()
  } finally {
    summaryLoading.value = false
  }
}

const fetchLogs = async () => {
  loading.value = true
  logError.value = ''
  try {
    const result = await getAdminLoginLogsApi(query)
    logs.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    logs.value = []
    total.value = 0
    logError.value = getErrorMessage(error, '登录日志暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const loadPage = () => {
  fetchSummary()
  fetchLogs()
}

const handleSearch = () => {
  query.pageNo = 1
  fetchLogs()
}

const handleReset = () => {
  Object.assign(query, { keyword: '', userId: undefined, traceId: '', status: '', pageNo: 1, pageSize: 10 })
  fetchLogs()
}

onMounted(loadPage)
</script>

<style scoped lang="scss">
.audit-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.audit-metric {
  min-height: 116px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
}

.audit-metric span,
.audit-metric small {
  display: block;
  color: var(--app-text-muted);
}

.audit-metric strong {
  display: block;
  margin: 8px 0;
  color: var(--app-text);
  font-size: 28px;
  line-height: 1;
}

.audit-metric--danger strong {
  color: #f87171;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

.login-log-table-header {
  margin-bottom: 14px;
}

.table-view-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

:global(.column-config-menu) {
  min-width: 168px;
  padding: 6px;
}

:global(.column-config-menu .el-checkbox) {
  width: 100%;
}

.login-log-text-preview {
  display: -webkit-box;
  max-height: 42px;
  margin: 0;
  overflow: hidden;
  color: var(--app-text, #1f2937);
  line-height: 1.5;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.login-log-text-preview--empty {
  color: var(--app-text-muted, #64748b);
}

.log-preview {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong,
  small {
    display: -webkit-box;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  strong {
    color: var(--app-text);
    font-weight: 600;
  }

  small {
    color: var(--app-text-muted);
  }
}

@media (max-width: 1080px) {
  .audit-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .login-log-table-header {
    align-items: flex-start;
  }

  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }
}

@media (max-width: 640px) {
  .audit-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
