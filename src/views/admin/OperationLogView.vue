<template>
  <div class="page-shell admin-console-page audit-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <ScrollText :size="16" />
          <span>操作审计</span>
        </div>
        <h1 class="admin-hero__title">操作日志</h1>
        <p class="admin-hero__desc">按用户、模块、动作、状态和 traceId 定位管理端与用户端操作。</p>
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
          <el-form-item label="traceId">
            <el-input v-model.trim="query.traceId" clearable placeholder="链路 ID" />
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
        <el-table v-loading="loading" :data="logs" row-key="id">
          <el-table-column prop="createdAt" label="时间" min-width="170" />
          <el-table-column prop="username" label="用户" min-width="120" show-overflow-tooltip />
          <el-table-column label="模块" min-width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ moduleLabel(row.module) }}</template>
          </el-table-column>
          <el-table-column label="菜单" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ menuLabel(row) }}</template>
          </el-table-column>
          <el-table-column label="动作" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ operationLabel(row.operation || row.action) }}</template>
          </el-table-column>
          <el-table-column prop="traceId" label="traceId" min-width="150" show-overflow-tooltip />
          <el-table-column prop="requestUri" label="请求路径" min-width="220" show-overflow-tooltip />
          <el-table-column label="耗时" width="100">
            <template #default="{ row }">{{ row.costTime ?? '-' }} ms</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="isSuccess(row.status) ? 'success' : 'danger'">
                {{ isSuccess(row.status) ? '成功' : '失败' }}
              </el-tag>
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
        <el-descriptions-item label="日志 ID">{{ currentLog.id }}</el-descriptions-item>
        <el-descriptions-item label="traceId">{{ currentLog.traceId || '-' }}</el-descriptions-item>
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
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw, ScrollText } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'

import { getAdminLogSummaryApi, getAdminOperationLogsApi } from '@/api/adminGovernance'
import type { AdminListQuery, AdminLogSummaryVO, OperationLogVO } from '@/types/adminGovernance'

const loading = ref(false)
const summaryLoading = ref(false)
const drawerVisible = ref(false)
const logs = ref<OperationLogVO[]>([])
const currentLog = ref<OperationLogVO>()
const summary = ref<AdminLogSummaryVO>()
const total = ref(0)

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
  { label: 'Agent', value: 'agent' },
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
  { pattern: /^\/admin\/ai\/logs\b/, label: 'AI 调用日志' },
  { pattern: /^\/admin\/ai\b/, label: 'Prompt 模板' },
  { pattern: /^\/admin\/agent-runs\b|^\/agent\/runs\b/, label: 'Agent 运行记录' },
  { pattern: /^\/admin\/files\b/, label: '文件管理' },
  { pattern: /^\/admin\/interview-reports\b/, label: '面试报告' },
  { pattern: /^\/admin\/interviews\b/, label: '面试管理' },
  { pattern: /^\/admin\/system-configs\b|^\/admin\/configs\b/, label: '系统配置' },
  { pattern: /^\/dashboard\/v3\b/, label: 'V3 驾驶舱' },
  { pattern: /^\/dashboard\b/, label: '工作台' },
  { pattern: /^\/agent\/today\b/, label: 'JobCoachAgent' },
  { pattern: /^\/agent\/tasks\b/, label: 'Agent 任务' },
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
const moduleLabel = (value?: string) => moduleOptions.find((item) => item.value === value)?.label || value || '-'
const operationLabel = (value?: string) => (value ? operationLabels[value] || value : '-')
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
  try {
    const result = await getAdminOperationLogsApi(query)
    logs.value = result.records || []
    total.value = result.total || 0
  } catch {
    logs.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const loadPage = () => {
  fetchSummary()
  fetchLogs()
}

const openDetail = (row: OperationLogVO) => {
  currentLog.value = row
  drawerVisible.value = true
}

const handleSearch = () => {
  query.pageNo = 1
  fetchLogs()
}

const handleReset = () => {
  Object.assign(query, { keyword: '', module: '', action: '', traceId: '', status: '', pageNo: 1, pageSize: 10 })
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

@media (max-width: 1080px) {
  .audit-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .audit-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
