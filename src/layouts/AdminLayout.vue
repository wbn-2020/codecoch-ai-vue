<template>
  <el-container class="app-layout admin-layout" :class="{ 'is-collapsed': appStore.sidebarCollapsed }">
    <el-aside class="app-layout__aside">
      <div class="app-layout__brand">
        <div class="brand-mark">A</div>
        <div v-show="!appStore.sidebarCollapsed" class="brand-text">
          <strong>CodeCoachAI</strong>
          <span>AI 内容治理中心</span>
        </div>
      </div>
      <AdminSidebar :collapsed="appStore.sidebarCollapsed" />
    </el-aside>

    <el-container class="app-layout__content">
      <el-header class="app-layout__header">
        <div class="header-left">
          <button class="icon-button" type="button" aria-label="切换侧边栏" @click="appStore.toggleSidebar()">
            <PanelLeftOpen v-if="appStore.sidebarCollapsed" :size="18" />
            <PanelLeftClose v-else :size="18" />
          </button>
          <AppBreadcrumb />
        </div>

        <div class="app-layout__header-actions">
          <button class="command-search" type="button" aria-label="打开命令面板" @click="commandPaletteOpen = true">
            <Search :size="15" />
            <span>搜索管理后台</span>
          </button>
          <el-tooltip v-if="canOpenAdminLink(['admin:notice:list'])" content="通知管理" placement="bottom">
            <button class="icon-button icon-button--ghost" type="button" aria-label="通知管理" @click="router.push('/admin/notices')">
              <Bell :size="16" />
            </button>
          </el-tooltip>
          <el-button class="user-entry" text @click="router.push('/dashboard')">
            <MonitorUp :size="15" />
            用户端
          </el-button>
          <el-dropdown trigger="click" @command="handleCommand">
            <button class="user-trigger" type="button">
              <el-avatar :size="30" :src="authStore.userInfo?.avatarUrl || ''">
                {{ avatarText }}
              </el-avatar>
              <span>{{ displayName }}</span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人资料</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <div class="admin-health-strip">
        <button class="admin-health-strip__status" type="button" @click="router.push('/admin/dashboard')">
          <span class="health-dot" :class="`is-${healthTone}`"></span>
          <strong>{{ healthLabel }}</strong>
          <small>{{ healthDetail }}</small>
        </button>
        <div class="admin-health-strip__item">
          <span>当前账号</span>
          <strong>{{ displayName }}</strong>
        </div>
        <div class="admin-health-strip__item">
          <span>角色</span>
          <strong>{{ roleSummary }}</strong>
        </div>
        <div class="admin-health-strip__item">
          <span>权限</span>
          <strong>{{ authStore.permissions.length }} 个</strong>
        </div>
        <div class="admin-health-strip__item">
          <span>登录凭证</span>
          <strong>{{ authStore.tokenVerified ? '已恢复' : '待校验' }}</strong>
        </div>
        <div class="admin-health-strip__item admin-health-strip__item--mobile-readonly">
          <span>手机模式</span>
          <strong>只读巡检</strong>
        </div>
        <button
          class="admin-health-strip__diagnostic"
          :class="{ 'has-error': latestError }"
          type="button"
          @click="diagnosticVisible = true"
        >
          <AlertTriangle :size="15" />
          <span>{{ latestError ? '查看最近异常' : '诊断中心' }}</span>
          <small>{{ latestError ? (latestError.traceId ? '追踪号已生成' : latestError.code || '有异常待处理') : '暂无异常' }}</small>
        </button>
      </div>

      <CommandPalette v-if="commandPaletteOpen" v-model="commandPaletteOpen" scope="admin" />

      <TagsView scope="admin" />

      <el-main class="app-layout__main">
        <div v-if="appConfig.demoReadOnly" class="demo-readonly-banner">
          当前为体验模式，后台页面可浏览，暂不保存新增、修改、删除或重跑等更改。
        </div>
        <div class="mobile-readonly-banner">
          <strong>移动巡检模式</strong>
          <span>{{ mobileReadonlyHint }}</span>
          <div>
            <el-button
              v-for="item in mobileReadonlyLinks"
              :key="item.path"
              size="small"
              plain
              @click="router.push(item.path)"
            >
              {{ item.label }}
            </el-button>
          </div>
        </div>
        <RouteErrorBoundary fallback-path="/admin">
          <RouterView />
        </RouteErrorBoundary>
      </el-main>
    </el-container>
  </el-container>

  <el-drawer v-model="diagnosticVisible" title="错误诊断中心" size="460px" class="admin-diagnostic-drawer">
    <div class="diagnostic-overview">
      <div>
        <span>账号</span>
        <strong>{{ displayName }}</strong>
      </div>
      <div>
        <span>角色 / 权限</span>
        <strong>{{ roleSummary }} / {{ authStore.permissions.length }} 个</strong>
      </div>
      <div>
        <span>登录凭证状态</span>
        <strong>{{ authStore.tokenVerified ? '已恢复当前用户' : '等待路由校验' }}</strong>
      </div>
      <div>
        <span>服务状态</span>
        <strong>{{ healthLabel }}</strong>
      </div>
    </div>

    <AppState
      v-if="!requestErrors.length"
      type="empty"
      title="当前会话没有请求错误"
      description="如果页面出现空表或权限异常，可以先刷新相关页面；新的请求失败会记录在这里，便于复制追踪号定位。"
    >
      <el-button type="primary" @click="router.push('/admin/dashboard')">查看运营首页</el-button>
    </AppState>

    <div v-else class="diagnostic-list">
      <article v-for="item in requestErrors" :key="item.id" class="diagnostic-card">
        <div class="diagnostic-card__head">
          <strong>{{ item.message }}</strong>
          <small>{{ formatTime(item.occurredAt) }}</small>
        </div>
        <dl>
          <div>
            <dt>请求地址</dt>
            <dd>{{ item.method || '-' }} {{ item.url || '-' }}</dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd>{{ requestDiagnosticStatusLabel(item.status) }} / {{ item.code || '-' }}</dd>
          </div>
          <div>
            <dt>追踪号</dt>
            <dd>{{ item.traceId ? '已生成，可复制反馈信息' : '-' }}</dd>
          </div>
        </dl>
        <div class="diagnostic-card__actions">
          <el-button size="small" plain @click="reloadCurrentPage">重新加载当前页</el-button>
          <el-button
            v-if="item.traceId && canOpenAdminLink(['admin:task:list'])"
            size="small"
            plain
            @click="openTraceDiagnostic('/admin/async-tasks', item.traceId)"
          >
            查任务
          </el-button>
          <el-button
            v-if="item.traceId && canOpenAdminLink(['admin:ai:log:list'])"
            size="small"
            plain
            @click="openTraceDiagnostic('/admin/ai/logs', item.traceId)"
          >
            查生成记录
          </el-button>
          <el-button
            v-if="item.traceId && canOpenAdminLink(['admin:audit:operation-log'])"
            size="small"
            plain
            @click="openTraceDiagnostic('/admin/operation-logs', item.traceId)"
          >
            查审计记录
          </el-button>
          <el-button size="small" plain @click="copyDiagnostic(item)">复制反馈信息</el-button>
        </div>
      </article>
    </div>

    <template #footer>
      <el-button @click="clearRequestErrors">清空记录</el-button>
      <el-button @click="reloadCurrentPage">重新加载当前页</el-button>
      <el-button type="primary" @click="router.push('/admin/dashboard')">查看运营首页</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { AlertTriangle, Bell, MonitorUp, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-vue-next'
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getAdminDashboardOverviewApi } from '@/api/dashboard'
import { appConfig } from '@/config'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import AppState from '@/components/common/AppState.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import RouteErrorBoundary from '@/components/common/RouteErrorBoundary.vue'
import TagsView from '@/components/layout/TagsView.vue'
import { canAccessAdminPermissions } from '@/router/adminAccess'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useTagsViewStore } from '@/stores/tagsView'
import type { AdminDashboardOverviewVO, DashboardStatus } from '@/types/dashboard'
import { REQUEST_ERROR_EVENT, type RequestErrorDiagnostic } from '@/utils/errorEvents'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()
const tagsStore = useTagsViewStore()
const CommandPalette = defineAsyncComponent(() => import('@/components/layout/CommandPalette.vue'))
const commandPaletteOpen = ref(false)
const diagnosticVisible = ref(false)
const requestErrors = ref<RequestErrorDiagnostic[]>([])
const dashboardOverview = ref<AdminDashboardOverviewVO | null>(null)
const dashboardHealthError = ref(false)

const displayName = computed(
  () => authStore.userInfo?.nickname || authStore.userInfo?.username || '管理员'
)
const avatarText = computed(() => displayName.value.slice(0, 1).toUpperCase())
const roleSummary = computed(() => authStore.roles.length ? authStore.roles.join('、') : '角色待确认')
const latestError = computed(() => requestErrors.value[0])
const adminPermissionDrift = computed(() => authStore.isAdmin && authStore.permissions.length === 0)
const canOpenAdminLink = (permissions: string[]) => canAccessAdminPermissions(permissions, authStore)
const mobileReadonlyDefinitions = [
  { label: '运营首页', path: '/admin/dashboard', permissions: ['admin:system:overview'] },
  { label: '失败任务', path: '/admin/async-tasks?status=FAILED', permissions: ['admin:task:list'] },
  { label: 'AI 异常', path: '/admin/ai/logs?status=FAILED', permissions: ['admin:ai:log:list'] },
  { label: '简历解析失败', path: '/admin/files?parseStatus=FAILED', permissions: ['admin:file:list'] },
  { label: '慢 SQL', path: '/admin/slow-sql-logs', permissions: ['admin:audit:slow-sql-log'] },
  { label: '通知失败', path: '/admin/notices?sendStatus=FAILED', permissions: ['admin:notice:list'] }
]
const mobileReadonlyLinks = computed(() =>
  mobileReadonlyDefinitions.filter((item) => canOpenAdminLink(item.permissions))
)
const mobileReadonlyHint = computed(() =>
  mobileReadonlyLinks.value.length > 1
    ? '手机端仅用于查看告警、失败任务、AI 异常和发送失败；写入操作请切换到桌面端处理。'
    : '手机端保留运营首页和诊断入口；更多后台功能需等待权限恢复或切换桌面端处理。'
)
const healthStatus = computed<DashboardStatus>(() => dashboardOverview.value?.systemStatus?.status || 'UNKNOWN')
const healthTone = computed(() => {
  if (dashboardHealthError.value) return 'danger'
  const status = String(healthStatus.value).toUpperCase()
  if (status === 'HEALTHY' || status === 'SUPPORTED') return 'healthy'
  if (status === 'DEGRADED' || status === 'UNKNOWN') return 'warning'
  return 'danger'
})
const healthLabel = computed(() => {
  if (adminPermissionDrift.value) return '权限待恢复'
  if (dashboardHealthError.value) return '状态加载失败'
  const status = String(healthStatus.value).toUpperCase()
  const map: Record<string, string> = {
    HEALTHY: '服务正常',
    DEGRADED: '服务能力受限',
    DOWN: '服务异常',
    UNKNOWN: '状态待确认',
    SUPPORTED: '已接入'
  }
  return map[status] || '状态待确认'
})
const healthDetail = computed(() => {
  if (adminPermissionDrift.value) return '后台权限配置未完成，请检查角色权限初始化'
  if (dashboardHealthError.value) return latestError.value?.traceId ? '最近异常已记录，可打开诊断中心' : '可打开运营首页重试'
  const services = dashboardOverview.value?.systemStatus?.services || []
  const generatedAt = dashboardOverview.value?.generatedAt || dashboardOverview.value?.systemStatus?.generatedAt
  if (!services.length) return generatedAt ? `更新时间 ${formatTime(generatedAt)}` : '运营首页状态未加载'
  const downCount = services.filter((item) => ['DOWN', 'ERROR'].includes(String(item.status || '').toUpperCase())).length
  const warningCount = services.filter((item) => ['DEGRADED', 'UNKNOWN'].includes(String(item.status || '').toUpperCase())).length
  if (downCount) return `${downCount} 个服务异常`
  if (warningCount) return `${warningCount} 个服务需关注`
  return `${services.length} 个服务已汇总`
})

watch(
  () => route.fullPath,
  () => tagsStore.addVisitedView(route),
  { immediate: true }
)

const handleCommand = async (command: string) => {
  if (command === 'profile') {
    await router.push('/profile')
    return
  }

  if (command === 'logout') {
    tagsStore.clearVisitedViews()
    await authStore.logout()
    await router.push('/login')
  }
}

const formatTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const fetchDashboardHealth = async () => {
  dashboardHealthError.value = false
  try {
    dashboardOverview.value = await getAdminDashboardOverviewApi({ silentError: true })
  } catch {
    dashboardOverview.value = null
    dashboardHealthError.value = true
  }
}

const handleRequestError = (event: Event) => {
  const detail = (event as CustomEvent<RequestErrorDiagnostic>).detail
  if (!detail) return
  requestErrors.value = [detail, ...requestErrors.value].slice(0, 8)
}

const clearRequestErrors = () => {
  requestErrors.value = []
}

const reloadCurrentPage = () => {
  diagnosticVisible.value = false
  router.go(0)
}

const openTraceDiagnostic = async (path: string, traceId?: string) => {
  const value = String(traceId || '').trim()
  if (!value) {
    ElMessage.warning('本条异常没有追踪号，请复制反馈信息后按请求地址排查。')
    return
  }
  diagnosticVisible.value = false
  await router.push({ path, query: { traceId: value, source: 'request-error' } })
}

const requestDiagnosticStatusLabel = (status?: string | number) => {
  const value = String(status || '').toUpperCase()
  if (!value) return '-'
  if (value === 'SUCCESS' || value === 'OK') return '成功'
  if (value === 'FAILED' || value === 'ERROR') return '失败'
  if (value === 'TIMEOUT') return '超时'
  if (/^\d+$/.test(value)) return value
  return '状态待确认'
}

const copyDiagnostic = async (item: RequestErrorDiagnostic) => {
  const text = [
    `时间：${formatTime(item.occurredAt)}`,
    `请求地址：${item.method || '-'} ${item.url || '-'}`,
    `状态：${requestDiagnosticStatusLabel(item.status)} / ${item.code || '-'}`,
    `追踪号：${item.traceId || '-'}`,
    `当前页面：${route.fullPath}`,
    '建议动作：可先重新加载当前页；如有追踪号，可按追踪号查询任务、生成记录或审计记录。',
    `错误：${item.message}`
  ].join('\n')
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('反馈信息已复制')
  } catch {
    ElMessage.warning('复制失败，请手动选择反馈信息')
  }
}

onMounted(() => {
  fetchDashboardHealth()
  window.addEventListener(REQUEST_ERROR_EVENT, handleRequestError)
})

onBeforeUnmount(() => {
  window.removeEventListener(REQUEST_ERROR_EVENT, handleRequestError)
})
</script>

<style scoped lang="scss">
.app-layout {
  min-height: 100vh;
  background:
    linear-gradient(135deg, rgba(6, 182, 212, 0.08), transparent 26rem),
    linear-gradient(180deg, rgba(15, 23, 42, 0.7), rgba(2, 6, 23, 0.98));
}

.app-layout__aside {
  position: sticky;
  top: 0;
  width: var(--app-sidebar-width);
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  border-right: 1px solid var(--app-border);
  background: rgba(2, 6, 23, 0.9);
  transition: width 0.2s ease;
  scrollbar-width: thin;
}

.admin-layout.is-collapsed {
  .app-layout__aside {
    width: 72px;
  }

  .app-layout__brand {
    justify-content: center;
    padding-inline: 0;
  }
}

.app-layout__content {
  min-width: 0;
}

.app-layout__brand {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  height: var(--app-header-height);
  padding: 0 16px;
  border-bottom: 1px solid var(--app-border);
  white-space: nowrap;

  span {
    display: block;
    margin-top: 2px;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.brand-mark {
  display: inline-flex;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--cc-ai-cyan), var(--cc-ai-blue));
  color: #fff;
  font-weight: 700;
}

.brand-text {
  min-width: 0;
}

.app-layout__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--app-header-height);
  border-bottom: 1px solid var(--app-border);
  background: rgba(2, 6, 23, 0.78);
  backdrop-filter: blur(18px);
}

.admin-health-strip {
  display: flex;
  align-items: stretch;
  gap: 10px;
  min-height: 44px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--app-border);
  background: rgba(2, 6, 23, 0.62);
  backdrop-filter: blur(14px);
}

.admin-health-strip__status,
.admin-health-strip__diagnostic,
.admin-health-strip__item {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.58);
  color: var(--app-text);
  font-size: 12px;
}

.admin-health-strip__status,
.admin-health-strip__diagnostic {
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  &:hover {
    border-color: rgba(6, 182, 212, 0.45);
    background: rgba(6, 182, 212, 0.1);
  }
}

.admin-health-strip__status {
  flex: 1 1 240px;
  justify-content: flex-start;
}

.admin-health-strip__diagnostic {
  flex: 0 1 190px;
  justify-content: center;

  &.has-error {
    border-color: rgba(248, 113, 113, 0.36);
    background: rgba(127, 29, 29, 0.25);
    color: #fecaca;
  }
}

.admin-health-strip__item {
  flex: 0 0 auto;
}

.admin-health-strip__item--mobile-readonly {
  display: none;
}

.admin-health-strip span,
.admin-health-strip small {
  color: var(--app-text-muted);
}

.admin-health-strip strong,
.admin-health-strip small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.health-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: #94a3b8;
  box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.12);

  &.is-healthy {
    background: #22c55e;
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.14);
  }

  &.is-warning {
    background: #f59e0b;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.16);
  }

  &.is-danger {
    background: #ef4444;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.16);
  }
}

.header-left {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.icon-button,
.user-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  color: var(--app-text);
  cursor: pointer;
}

.icon-button {
  width: 36px;
  height: 36px;
  border-color: var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.72);
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  &:hover {
    border-color: rgba(6, 182, 212, 0.5);
    background: rgba(6, 182, 212, 0.12);
  }

  &--ghost {
    background: transparent;
    color: var(--app-text-muted);
  }

}

.app-layout__header-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
}

.command-search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 210px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.62);
  color: var(--app-text-muted);
  cursor: pointer;
  font-size: 12px;

  &:hover {
    border-color: rgba(6, 182, 212, 0.5);
    background: rgba(6, 182, 212, 0.12);
    color: var(--app-text);
  }
}

.user-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.user-trigger {
  gap: 8px;
  padding: 4px 8px;
  border-radius: 999px;

  &:hover {
    background: rgba(6, 182, 212, 0.12);
  }
}

.app-layout__main {
  min-width: 0;
  min-height: calc(100vh - var(--app-header-height) - 38px);
  padding: 24px;
  overflow: auto;
}

.demo-readonly-banner {
  margin-bottom: 16px;
  border: 1px solid rgba(245, 158, 11, 0.34);
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  color: #fde68a;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.6;
}

.mobile-readonly-banner {
  display: none;
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid rgba(59, 130, 246, 0.32);
  border-radius: 8px;
  background: rgba(30, 64, 175, 0.18);
  color: #bfdbfe;
  line-height: 1.6;

  strong,
  span {
    display: block;
  }

  span {
    margin-top: 4px;
    color: #dbeafe;
    font-size: 13px;
  }

  div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
}

.diagnostic-overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;

  div {
    min-width: 0;
    padding: 12px;
    border: 1px solid var(--app-border);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.5);
  }

  span {
    display: block;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 6px;
    overflow-wrap: anywhere;
  }
}

.diagnostic-list {
  display: grid;
  gap: 12px;
}

.diagnostic-card {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.62);
}

.diagnostic-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  strong {
    overflow-wrap: anywhere;
  }

  small {
    flex: 0 0 auto;
    color: var(--app-text-muted);
  }
}

.diagnostic-card dl {
  display: grid;
  gap: 8px;
  margin: 12px 0;
}

.diagnostic-card dt {
  color: var(--app-text-muted);
  font-size: 12px;
}

.diagnostic-card dd {
  margin: 3px 0 0;
  overflow-wrap: anywhere;
}

.diagnostic-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  :deep(.el-button) {
    margin-left: 0;
  }
}

:deep(.layout-menu) {
  border-right: 0;
}

@media (max-width: 760px) {
  .app-layout {
    display: block;
  }

  .app-layout__aside,
  .admin-layout.is-collapsed .app-layout__aside {
    width: 100%;
    border-right: 0;
  }

  :deep(.layout-menu) {
    display: flex;
    overflow-x: auto;
  }

  :deep(.el-menu-item) {
    flex: 0 0 auto;
  }

  .app-layout__main {
    padding: 16px;
  }

  .mobile-readonly-banner {
    display: block;
  }

  .admin-health-strip {
    overflow-x: auto;
  }

  .admin-health-strip__item {
    display: none;
  }

  .admin-health-strip__item--mobile-readonly {
    display: inline-flex;
    flex: 0 0 auto;
  }

  .admin-health-strip__status,
  .admin-health-strip__diagnostic {
    flex: 0 0 auto;
  }

  .command-search {
    display: none;
  }
}
</style>
