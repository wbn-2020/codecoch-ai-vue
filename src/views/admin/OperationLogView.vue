<template>
  <div class="page-shell admin-console-page audit-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <ScrollText :size="16" />
          <span>操作审计</span>
        </div>
        <h1 class="admin-hero__title">操作日志</h1>
        <p class="admin-hero__desc">按用户、模块、动作、状态和追踪号定位管理端与用户端操作。</p>
      </div>
      <div class="admin-hero__actions">
        <el-button :icon="RefreshCw" :loading="loading || summaryLoading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <section class="audit-metrics">
      <article class="audit-metric">
        <span>操作日志总数</span>
        <strong>{{ summary?.totalOperationLogs ?? total }}</strong>
        <small>最近记录 {{ summary?.latestOperationAt || '--' }}</small>
      </article>
      <article class="audit-metric">
        <span>今日操作</span>
        <strong>{{ summary?.todayOperationLogs ?? 0 }}</strong>
        <small>按 createdAt 统计</small>
      </article>
      <article class="audit-metric audit-metric--danger">
        <span>失败操作</span>
        <strong>{{ summary?.failedOperationLogs ?? 0 }}</strong>
        <small>今日失败 {{ summary?.todayFailedOperationLogs ?? 0 }}</small>
      </article>
      <article class="audit-metric">
        <span>当前筛选结果</span>
        <strong>{{ total }}</strong>
        <small>当前筛选记录数</small>
      </article>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header operation-table-header">
        <div>
          <h2>日志列表</h2>
          <p>支持按排障场景调整密度和列显隐；视图偏好会保存在当前浏览器。</p>
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
            <el-input v-model.trim="query.keyword" clearable placeholder="用户 / URI / 错误" />
          </el-form-item>
          <el-form-item label="模块">
            <el-select v-model="query.module" clearable placeholder="全部模块" style="width: 150px">
              <el-option v-for="item in moduleOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="动作">
            <el-input v-model.trim="query.action" clearable placeholder="如 UPDATE_CONFIG" />
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

      <el-alert
        v-if="directLogNotice"
        class="direct-log-alert"
        type="info"
        :title="directLogNotice"
        :closable="false"
        show-icon
      />

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="logs" row-key="id" :size="tableSize">
          <template #empty>
            <AppState v-if="logError" type="error" title="操作日志加载失败" :description="logError">
              <el-button type="primary" :loading="loading" @click="fetchLogs">重新加载</el-button>
            </AppState>
            <AppState v-else type="empty" :title="logEmptyTitle" :description="logEmptyDescription">
              <el-button v-if="hasLogFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button v-else :loading="loading" @click="fetchLogs">重新加载</el-button>
            </AppState>
          </template>
          <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="时间" min-width="170" />
          <el-table-column v-if="isColumnVisible('user')" prop="username" label="用户" min-width="120" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('module')" label="模块" min-width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ moduleLabel(row.module) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('menu')" label="菜单" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ menuLabel(row) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('operation')" label="动作" min-width="180">
            <template #default="{ row }">
              <p class="operation-text-preview">{{ operationLabel(row.operation || row.action) }}</p>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('traceId')" prop="traceId" label="追踪号" min-width="160" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('requestUri')" label="请求路径" min-width="240">
            <template #default="{ row }">
              <p :class="['operation-text-preview', { 'operation-text-preview--empty': !row.requestUri }]">
                {{ row.requestUri || '-' }}
              </p>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('costTime')" label="耗时" width="100">
            <template #default="{ row }">{{ row.costTime ?? '-' }} ms</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="isSuccess(row.status) ? 'success' : 'danger'">
                {{ isSuccess(row.status) ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('errorMessage')" label="错误信息" min-width="240">
            <template #default="{ row }">
              <p :class="['operation-text-preview', { 'operation-text-preview--empty': !row.errorMessage }]">
                {{ row.errorMessage || '-' }}
              </p>
            </template>
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

    <el-drawer v-model="drawerVisible" title="操作日志详情" size="720px">
      <el-descriptions v-if="currentLog" :column="1" border>
        <el-descriptions-item label="日志编号">{{ currentLog.id }}</el-descriptions-item>
        <el-descriptions-item label="追踪号">{{ currentLog.traceId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="菜单">{{ menuLabel(currentLog) }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ currentLog.username || currentLog.userId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="模块">{{ moduleLabel(currentLog.module) }}</el-descriptions-item>
        <el-descriptions-item label="动作">{{ operationLabel(currentLog.operation || currentLog.action) }}</el-descriptions-item>
        <el-descriptions-item label="方法">{{ currentLog.method || '-' }}</el-descriptions-item>
        <el-descriptions-item label="请求路径">{{ currentLog.requestUri || '-' }}</el-descriptions-item>
        <el-descriptions-item label="IP">{{ currentLog.ip || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="isSuccess(currentLog.status) ? 'success' : 'danger'">
            {{ isSuccess(currentLog.status) ? '成功' : '失败' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="错误">{{ currentLog.errorMessage || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-collapse v-if="currentLog" class="technical-collapse">
        <el-collapse-item title="技术诊断（请求参数 / 响应预览 / 内容指纹，按需展开）" name="operation-raw">
          <div class="technical-diagnostics">
            <span>请求参数预览：{{ currentLog.requestArgsPreview || '未记录请求参数预览' }}</span>
            <span>响应预览：{{ currentLog.responsePreview || '未记录响应预览' }}</span>
            <span>内容指纹：请求 {{ currentLog.requestArgsHash || '-' }} / 响应 {{ currentLog.responseHash || '-' }}</span>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw, ScrollText } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { getAdminLogSummaryApi, getAdminOperationLogsApi } from '@/api/adminGovernance'
import AppState from '@/components/common/AppState.vue'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { AdminListQuery, AdminLogSummaryVO, OperationLogVO } from '@/types/adminGovernance'
import { getErrorMessage } from '@/utils/error'

const loading = ref(false)
const summaryLoading = ref(false)
const drawerVisible = ref(false)
const logs = ref<OperationLogVO[]>([])
const currentLog = ref<OperationLogVO>()
const summary = ref<AdminLogSummaryVO>()
const total = ref(0)
const logError = ref('')
const directLogNotice = ref('')
const route = useRoute()

type OperationLogColumnKey =
  | 'createdAt'
  | 'user'
  | 'module'
  | 'menu'
  | 'operation'
  | 'traceId'
  | 'requestUri'
  | 'costTime'
  | 'status'
  | 'errorMessage'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<OperationLogColumnKey>('admin:operation-log', [
  { key: 'createdAt', label: '时间', required: true },
  { key: 'user', label: '用户' },
  { key: 'module', label: '模块' },
  { key: 'menu', label: '菜单' },
  { key: 'operation', label: '动作', required: true },
  { key: 'traceId', label: '追踪号' },
  { key: 'requestUri', label: '请求路径' },
  { key: 'costTime', label: '耗时' },
  { key: 'status', label: '状态', required: true },
  { key: 'errorMessage', label: '错误信息' }
])

const query = reactive<AdminListQuery>({
  keyword: '',
  module: '',
  action: '',
  traceId: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const moduleOptions = [
  { label: '其他管理端', value: 'admin' },
  { label: '系统管理', value: 'system' },
  { label: '登录认证', value: 'auth' },
  { label: '用户权限', value: 'user' },
  { label: '简历中心', value: 'resume' },
  { label: '岗位目标', value: 'job' },
  { label: '题库管理', value: 'question' },
  { label: '面试训练', value: 'interview' },
  { label: '学习计划', value: 'study' },
  { label: 'AI 管理', value: 'ai' },
  { label: '智能教练', value: 'agent' },
  { label: '文件知识库', value: 'file' },
  { label: '通知中心', value: 'notification' },
  { label: '数据分析', value: 'analytics' },
  { label: '任务中心', value: 'task' },
  { label: '搜索管理', value: 'search' }
]

const operationLabels: Record<string, string> = {
  QUERY_LOG_SUMMARY: '查询日志汇总',
  QUERY_LOGIN_LOG: '查询登录日志',
  QUERY_OPERATION_LOG: '查询操作日志',
  QUERY_DASHBOARD: '查询管理首页',
  QUERY_SYSTEM_OVERVIEW: '查询系统概览',
  QUERY_CONFIG: '查询系统配置',
  GET_CONFIG: '查看系统配置',
  CREATE_CONFIG: '新增系统配置',
  UPDATE_CONFIG: '编辑系统配置',
  UPDATE_CONFIG_STATUS: '切换配置状态',
  DELETE_CONFIG: '删除系统配置',
  QUERY: '查询',
  VIEW: '查看详情',
  CREATE_OR_EXECUTE: '新增/执行',
  UPDATE: '编辑',
  DELETE: '删除',
  QUERY_SLOW_SQL_LOG: '查询慢 SQL 日志'
}

const menuRules = [
  { pattern: /^\/admin\/logs\/slow-sql\b|^\/admin\/slow-sql-logs\b/, label: '慢 SQL 查询' },
  { pattern: /^\/admin\/operation-logs\b|^\/admin\/logs\/operations\b/, label: '操作日志' },
  { pattern: /^\/admin\/login-logs\b/, label: '登录日志' },
  { pattern: /^\/admin\/logs\/summary\b/, label: '日志总览' },
  { pattern: /^\/admin\/users\b/, label: '用户管理' },
  { pattern: /^\/admin\/roles\b/, label: '角色管理' },
  { pattern: /^\/admin\/menus\b/, label: '菜单权限' },
  { pattern: /^\/admin\/question-reviews\b/, label: '题目审核' },
  { pattern: /^\/admin\/question-duplicate-reviews\b|^\/admin\/questions\/check-duplicate\b/, label: '重复题审核' },
  { pattern: /^\/admin\/question-relations\b/, label: '题目关系' },
  { pattern: /^\/admin\/question-categories\b/, label: '分类管理' },
  { pattern: /^\/admin\/question-tags\b/, label: '标签管理' },
  { pattern: /^\/admin\/question-groups\b/, label: '问题组管理' },
  { pattern: /^\/admin\/questions\b/, label: '题目管理' },
  { pattern: /^\/admin\/industry-templates\b/, label: '行业模板' },
  { pattern: /^\/admin\/notifications\b/, label: '通知管理' },
  { pattern: /^\/admin\/tasks\b/, label: '异步任务' },
  { pattern: /^\/admin\/ai\/models\b/, label: 'AI 模型配置' },
  { pattern: /^\/admin\/ai\/logs\b/, label: 'AI 运行记录' },
  { pattern: /^\/admin\/ai\b/, label: '提示词模板' },
  { pattern: /^\/admin\/agent-runs\b|^\/agent\/runs\b/, label: '生成运行记录' },
  { pattern: /^\/admin\/files\b/, label: '文件管理' },
  { pattern: /^\/admin\/interview-reports\b/, label: '面试报告' },
  { pattern: /^\/admin\/interviews\b/, label: '面试管理' },
  { pattern: /^\/admin\/system-configs\b|^\/admin\/configs\b/, label: '系统配置' },
  { pattern: /^\/dashboard\/v3\b/, label: '求职闭环' },
  { pattern: /^\/dashboard\b/, label: '工作台' },
  { pattern: /^\/agent\/today\b/, label: '今日计划' },
  { pattern: /^\/agent\/tasks\b/, label: '任务中心' },
  { pattern: /^\/agent\/reviews\b/, label: '复盘中心' },
  { pattern: /^\/agent\/memory\b/, label: '长期记忆' },
  { pattern: /^\/analytics\/personal\b/, label: '个人分析' },
  { pattern: /^\/growth\//, label: '成长档案' },
  { pattern: /^\/resume-versions\b|^\/resumes\/\d+\/versions\b/, label: '简历版本' },
  { pattern: /^\/resumes\/\d+\/projects\b|^\/projects\b/, label: '项目经历' },
  { pattern: /^\/applications\b/, label: '求职进度' },
  { pattern: /^\/job-targets\b/, label: '岗位目标' },
  { pattern: /^\/resume-match\b/, label: '简历匹配' },
  { pattern: /^\/skill-profile\b|^\/skill-profiles\b/, label: '能力画像' },
  { pattern: /^\/resumes\b/, label: '简历' },
  { pattern: /^\/questions\/recommendations\b/, label: '推荐题目' },
  { pattern: /^\/questions\/wrong-records\b/, label: '错题本' },
  { pattern: /^\/questions\/favorites\b/, label: '收藏题目' },
  { pattern: /^\/questions\b/, label: '题库' },
  { pattern: /^\/interviews\/create\b/, label: '创建面试' },
  { pattern: /^\/interviews\/history\b/, label: '面试历史' },
  { pattern: /^\/interviews\b/, label: '面试训练' },
  { pattern: /^\/study-plans\/from-gap\b/, label: '差距学习计划' },
  { pattern: /^\/study-plans\b/, label: '学习计划' },
  { pattern: /^\/daily-tasks\b/, label: '每日任务' },
  { pattern: /^\/weakness-analysis\b/, label: '薄弱点分析' },
  { pattern: /^\/notifications\b/, label: '通知中心' },
  { pattern: /^\/knowledge\b/, label: '个人知识库' },
  { pattern: /^\/password\b/, label: '修改密码' },
  { pattern: /^\/profile\b/, label: '个人资料' }
]

const isSuccess = (status?: string | number) => status === 1 || status === '1' || String(status).toUpperCase() === 'SUCCESS'
const hasLogFilters = computed(() => Boolean(query.keyword || query.module || query.action || query.traceId || query.status))
const logEmptyTitle = computed(() =>
  hasLogFilters.value ? '当前筛选没有操作日志' : '暂无操作日志'
)
const logEmptyDescription = computed(() =>
  hasLogFilters.value
    ? '操作日志已正常返回空结果。可以清空模块、动作、追踪号、状态或关键词筛选后重新查看。'
    : '操作日志为空通常代表当前权限范围内还没有可审计操作，或审计写入尚未启用。'
)
const moduleLabel = (value?: string) => moduleOptions.find((item) => item.value === value)?.label || (value ? '模块待确认' : '-')
const operationLabel = (value?: string) => (value ? operationLabels[value] || '操作待确认' : '-')
const normalizePath = (value?: string) => (value || '').split('?')[0].replace(/^\/api(?=\/)/, '')
const menuLabel = (row?: OperationLogVO) => {
  if (!row) return '-'
  if (row.menuName) return row.menuName
  const path = normalizePath(row.requestUri)
  return menuRules.find((item) => item.pattern.test(path))?.label || '-'
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
    const result = await getAdminOperationLogsApi(query)
    logs.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    logs.value = []
    total.value = 0
    logError.value = getErrorMessage(error, '操作日志暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const firstQueryString = (value: unknown) => {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value == null ? '' : String(value)
}

const compactText = (value?: string, maxLength = 120) => {
  const text = String(value || '').trim()
  if (!text || text.length <= maxLength) return text
  return `${text.slice(0, Math.max(1, maxLength - 1))}…`
}

const applyRouteFilters = () => {
  const traceId = firstQueryString(route.query.traceId)
  const module = firstQueryString(route.query.module)
  const action = firstQueryString(route.query.action)
  const status = firstQueryString(route.query.status)
  const keyword = firstQueryString(route.query.keyword)
  const source = firstQueryString(route.query.source)
  if (!traceId && !module && !action && !status && !keyword) {
    directLogNotice.value = ''
    return false
  }
  Object.assign(query, {
    traceId,
    module,
    action,
    status,
    keyword,
    pageNo: 1
  })
  directLogNotice.value = ''
  if (source === 'async-task' && traceId) {
    directLogNotice.value = `已按异步任务追踪号 ${compactText(traceId, 18)} 筛选审计记录。`
  } else if (source === 'request-error' && traceId) {
    directLogNotice.value = `已按请求异常追踪号 ${compactText(traceId, 18)} 筛选审计记录。`
  }
  return true
}

const loadPage = () => {
  applyRouteFilters()
  fetchSummary()
  fetchLogs()
}

const openDetail = (row: OperationLogVO) => {
  currentLog.value = row
  drawerVisible.value = true
}

const handleSearch = () => {
  query.pageNo = 1
  directLogNotice.value = ''
  fetchLogs()
}

const handleReset = () => {
  Object.assign(query, { keyword: '', module: '', action: '', traceId: '', status: '', pageNo: 1, pageSize: 10 })
  directLogNotice.value = ''
  fetchLogs()
}

watch(
  () => [route.query.traceId, route.query.module, route.query.action, route.query.status, route.query.keyword, route.query.source],
  () => {
    if (applyRouteFilters()) {
      fetchLogs()
    }
  }
)

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

.operation-table-header {
  margin-bottom: 14px;
}

.direct-log-alert {
  margin: 0 0 14px;
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

.operation-text-preview {
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

.operation-text-preview--empty {
  color: var(--app-text-muted, #64748b);
}

.technical-collapse {
  margin-top: 14px;
}

.technical-diagnostics {
  display: grid;
  gap: 10px;
  padding: 4px 2px 0;
  color: var(--app-text-muted, #64748b);
  line-height: 1.7;

  span {
    padding: 10px 12px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.04);
    overflow-wrap: anywhere;
  }
}

@media (max-width: 1080px) {
  .audit-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .operation-table-header {
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
