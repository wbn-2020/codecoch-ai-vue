<template>
  <div class="notification-page page-shell">
    <section class="notification-hero cc-glass--ai">
      <div class="hero-copy">
        <div class="eyebrow">
          <Bell :size="16" />
          通知中心
        </div>
        <h1>通知中心</h1>
        <p>查看系统通知、报告完成提醒、任务提醒和公告。</p>
      </div>
      <div class="hero-actions">
        <el-button :loading="markingAll" @click="handleMarkAllRead">
          <CheckCheck :size="16" />
          全部已读
        </el-button>
        <el-button @click="router.push('/dashboard')">
          <LayoutDashboard :size="16" />
          工作台
        </el-button>
      </div>
    </section>

    <section class="content-card cc-glass">
      <div class="content-card__body notification-toolbar">
        <el-radio-group v-model="query.isRead" @change="handleFilter">
          <el-radio-button :value="''">全部</el-radio-button>
          <el-radio-button :value="0">未读 <span v-if="unreadCount" class="unread-badge">{{ unreadCount }}</span></el-radio-button>
          <el-radio-button :value="1">已读</el-radio-button>
        </el-radio-group>
        <el-select v-model="query.type" clearable placeholder="通知类型" style="width: 160px" @change="handleFilter">
          <el-option
            v-for="option in notificationTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>

      <div class="notification-overview">
        <div class="overview-item">
          <span>未读通知</span>
          <strong>{{ unreadCount }}</strong>
        </div>
        <div class="overview-item">
          <span>当前页可行动</span>
          <strong>{{ currentPageActionableCount }}</strong>
        </div>
        <div class="overview-note">
          今日行动完整排序以 Dashboard 为准；这里仅统计当前已加载通知中的可行动项。
        </div>
      </div>

      <div v-if="errorMessage && !loading" class="notification-error">
        <AppState
          type="error"
          title="通知接口请求失败"
          :description="errorMessage"
        />
      </div>

      <div class="notification-list" v-loading="loading">
        <div v-if="!loading && !errorMessage && !notifications.length" class="empty-state">
          <BellOff :size="32" />
          <p>暂无通知</p>
        </div>

        <article
          v-for="item in notifications"
          :key="item.id"
          class="notification-item"
          :class="{ unread: item.isRead === 0 }"
          @click="handleClickNotification(item)"
        >
          <div class="notification-dot" v-if="item.isRead === 0"></div>
          <div class="notification-body">
            <div class="notification-head">
              <strong>{{ item.title }}</strong>
              <el-tag size="small" effect="plain">{{ displayNotification(item).typeLabel }}</el-tag>
              <el-tag v-if="displayNotification(item).actionable" size="small" type="success" effect="plain">
                {{ displayNotification(item).actionLabel }}
              </el-tag>
              <el-tag v-if="isResolvedNotification(item)" size="small" type="info" effect="plain">
                已处理
              </el-tag>
            </div>
            <p v-if="item.content">{{ item.content }}</p>
            <span class="notification-time">{{ formatDateTime(item.createdAt) }}</span>
          </div>
          <el-button class="notification-detail-button" text @click.stop="openNotificationDetail(item)">
            详情
          </el-button>
          <div class="notification-action">
            <ExternalLink v-if="displayNotification(item).actionable" :size="16" />
          </div>
        </article>
      </div>

      <div v-if="total > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, prev, pager, next"
          :total="total"
          @change="fetchNotifications"
        />
      </div>
    </section>

    <el-dialog
      v-model="detailVisible"
      class="notification-dialog"
      width="560px"
      :title="selectedNotification?.title || '通知详情'"
    >
      <div v-if="selectedNotification" class="notification-detail">
        <div class="detail-meta">
          <el-tag effect="plain">{{ displayNotification(selectedNotification).typeLabel }}</el-tag>
          <el-tag v-if="isResolvedNotification(selectedNotification)" type="success" effect="plain">业务已处理</el-tag>
          <span>{{ formatDateTime(selectedNotification.createdAt) }}</span>
        </div>
        <p class="detail-content">{{ selectedNotification.content || '这条通知暂无正文内容。' }}</p>
        <p v-if="isResolvedNotification(selectedNotification)" class="resolved-note">
          {{ resolvedDescription(selectedNotification) }}
        </p>
        <el-alert
          v-if="notificationTarget"
          type="info"
          :closable="false"
          show-icon
          :title="`关联业务：${notificationTarget.label}`"
        />
        <el-alert
          v-else
          type="warning"
          :closable="false"
          show-icon
          title="这条通知没有配置可跳转的业务页面，可以仅查看并关闭。"
        />
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">仅查看，不跳转</el-button>
        <el-button
          v-if="notificationTarget"
          type="primary"
          @click="jumpToNotificationTarget"
        >
          <ExternalLink :size="16" />
          跳转查看
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Bell, BellOff, CheckCheck, ExternalLink, LayoutDashboard } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getNotificationsApi,
  getUnreadCountApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  type NotificationQueryDTO,
  type NotificationVO
} from '@/api/notification'
import AppState from '@/components/common/AppState.vue'
import {
  getNotificationDisplay,
  isActionableNotification,
  isResolvedNotification,
  resolveNotificationAction
} from '@/features/notifications'
import { formatDateTime, formatNotificationType, notificationTypeLabels } from '@/utils/format'
import { notifyUnreadChanged } from '@/utils/notificationEvents'

const router = useRouter()
const loading = ref(false)
const markingAll = ref(false)
const notifications = ref<NotificationVO[]>([])
const total = ref(0)
const unreadCount = ref(0)
const errorMessage = ref('')
const detailVisible = ref(false)
const selectedNotification = ref<NotificationVO>()

const query = reactive<NotificationQueryDTO>({
  pageNo: 1,
  pageSize: 20,
  isRead: '',
  type: ''
})

const notificationTypeOptions = Object.entries(notificationTypeLabels).map(([value, label]) => ({ value, label }))
notificationTypeOptions.push(
  { value: 'AGENT_REMINDER', label: 'Agent 提醒' },
  { value: 'APPLICATION_FOLLOW_UP_REMINDER', label: '投递跟进' },
  { value: 'INTERVIEW_REPORT_READY', label: '面试/报告' }
)

const resolveActionPath = (item?: NotificationVO) => {
  if (!item) return ''
  const action = resolveNotificationAction(item)
  return action.kind === 'route' ? action.path : ''
}

const displayNotification = (item: NotificationVO) => {
  const display = getNotificationDisplay(item)
  const path = resolveActionPath(item)
  return {
    ...display,
    typeLabel: display.label || formatNotificationType(item.type),
    actionLabel: display.actionLabel || item.fallbackLabel || '前往处理',
    actionable: !isResolvedNotification(item) && Boolean(display.actionable || path)
  }
}

const resolvedDescription = (item: NotificationVO) => {
  const parts = ['业务已处理']
  if (item.resolvedAt) parts.push(formatDateTime(item.resolvedAt))
  if (item.resolvedReason) parts.push(item.resolvedReason)
  return parts.join(' · ')
}

const resolveActionLabel = (item?: NotificationVO) => {
  if (!item) return ''
  const action = resolveNotificationAction(item)
  return action.label || displayNotification(item).actionLabel
}

const currentPageActionableCount = computed(() =>
  notifications.value.filter((item) => isActionableNotification(item)).length
)

const notificationTarget = computed(() => {
  const item = selectedNotification.value
  if (!item) return null
  const resolvedPath = resolveActionPath(item)
  if (resolvedPath) {
    return { label: resolveActionLabel(item) || '关联业务', path: resolvedPath }
  }
  return null
})

const fetchNotifications = async () => {
  loading.value = true
  try {
    const params = { ...query }
    if (params.isRead === '') delete (params as Record<string, unknown>).isRead
    if (!params.type) delete (params as Record<string, unknown>).type
    const result = await getNotificationsApi(params as NotificationQueryDTO)
    notifications.value = result.records || []
    total.value = result.total || 0
    errorMessage.value = ''
  } catch {
    notifications.value = []
    total.value = 0
    errorMessage.value = '通知中心接口未联调或暂时不可用，当前页面不会将失败请求伪装成空列表。'
  } finally {
    loading.value = false
  }
}

const fetchUnreadCount = async () => {
  try {
    const result = await getUnreadCountApi()
    unreadCount.value = result.unreadCount ?? result.total ?? 0
  } catch {
    // 未读数失败时不伪装成 0，由列表错误态提示。
  }
}

const handleFilter = () => {
  query.pageNo = 1
  fetchNotifications()
}

const markReadIfNeeded = async (item: NotificationVO) => {
  if (item.isRead === 0) {
    try {
      await markNotificationReadApi(item.id)
      item.isRead = 1
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      notifyUnreadChanged()
    } catch {
      // silent
    }
  }
}

const openNotificationDetail = async (item: NotificationVO) => {
  await markReadIfNeeded(item)
  selectedNotification.value = item
  detailVisible.value = true
}

const handleClickNotification = async (item: NotificationVO) => {
  await markReadIfNeeded(item)
  if (isActionableNotification(item)) {
    const path = resolveActionPath(item)
    await router.push(path)
    return
  }
  selectedNotification.value = item
  detailVisible.value = true
}

const jumpToNotificationTarget = async () => {
  if (!notificationTarget.value) return
  detailVisible.value = false
  await router.push(notificationTarget.value.path)
}

const handleMarkAllRead = async () => {
  markingAll.value = true
  try {
    await markAllNotificationsReadApi()
    unreadCount.value = 0
    notifyUnreadChanged()
    if (query.isRead === 0) {
      await fetchNotifications()
    } else {
      notifications.value.forEach((item) => { item.isRead = 1 })
    }
    ElMessage.success('已全部标记为已读')
  } catch {
    ElMessage.error('操作失败')
  } finally {
    markingAll.value = false
  }
}

onMounted(() => {
  fetchNotifications()
  fetchUnreadCount()
})
</script>

<style scoped lang="scss">
.notification-page {
  gap: 20px;
}

.notification-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  border-radius: var(--cc-radius-xl);
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.hero-copy {
  h1 {
    margin: 14px 0 0;
    font-size: 30px;
  }

  p {
    margin: 10px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.hero-actions {
  display: flex;
  gap: 10px;
}

.notification-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 180px)) minmax(0, 1fr);
  gap: 12px;
  padding: 0 20px 20px;
}

.overview-item,
.overview-note {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.overview-item {
  display: grid;
  gap: 6px;
  padding: 12px;

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    color: #f8fafc;
    font-size: 22px;
  }
}

.overview-note {
  display: flex;
  align-items: center;
  padding: 12px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin-left: 4px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--el-color-danger);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.notification-list {
  min-height: 200px;
  padding: 0 20px 20px;
  border-top: 1px solid var(--app-border);
}

.notification-error {
  padding: 0 20px 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 200px;
  color: var(--app-text-muted);
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(99, 102, 241, 0.04);
  }

  &.unread {
    .notification-body strong {
      color: #f8fafc;
    }
  }
}

.notification-detail-button {
  flex: 0 0 auto;
}

.notification-action {
  display: inline-flex;
  flex: 0 0 24px;
  justify-content: flex-end;
  margin-top: 3px;
  color: var(--cc-ai-cyan);
}

.notification-dot {
  flex: 0 0 8px;
  width: 8px;
  height: 8px;
  margin-top: 8px;
  border-radius: 50%;
  background: var(--cc-primary);
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-head {
  display: flex;
  align-items: center;
  gap: 10px;

  strong {
    color: var(--app-text-muted);
    font-size: 14px;
  }
}

.notification-body p {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.notification-time {
  display: block;
  margin-top: 6px;
  color: var(--app-text-muted);
  font-size: 12px;
  opacity: 0.7;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 0 20px 20px;
}

.notification-detail {
  display: grid;
  gap: 16px;
}

.detail-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.detail-content {
  margin: 0;
  color: var(--app-text);
  line-height: 1.8;
  white-space: pre-wrap;
}

.resolved-note {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 760px) {
  .notification-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .notification-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .notification-overview {
    grid-template-columns: 1fr;
  }
}
</style>
