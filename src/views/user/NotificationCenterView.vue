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
          <el-option label="报告完成" value="REPORT_DONE" />
          <el-option label="解析完成" value="PARSE_DONE" />
          <el-option label="任务提醒" value="TASK_REMIND" />
          <el-option label="系统公告" value="ANNOUNCEMENT" />
        </el-select>
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
              <el-tag size="small" effect="plain">{{ typeLabel(item.type) }}</el-tag>
            </div>
            <p v-if="item.content">{{ item.content }}</p>
            <span class="notification-time">{{ item.createdAt }}</span>
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
          <el-tag effect="plain">{{ typeLabel(selectedNotification.type) }}</el-tag>
          <span>{{ selectedNotification.createdAt || '--' }}</span>
        </div>
        <p class="detail-content">{{ selectedNotification.content || '这条通知暂无正文内容。' }}</p>
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

const typeLabels: Record<string, string> = {
  REPORT_DONE: '报告完成',
  PARSE_DONE: '解析完成',
  TASK_REMIND: '任务提醒',
  ANNOUNCEMENT: '系统公告',
  STUDY_PLAN: '学习计划',
  AI_REVIEW: 'AI 审核'
}

const typeLabel = (type: string) => typeLabels[type] || type || '通知'

const pickRelatedId = (item?: NotificationVO) => {
  const value = item?.relatedId ?? item?.bizId
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : undefined
}

const notificationTarget = computed(() => {
  const item = selectedNotification.value
  if (!item) return null
  const relatedType = (item.relatedType || item.bizType || item.type || '').toUpperCase()
  const id = pickRelatedId(item)

  if ((relatedType.includes('INTERVIEW') && relatedType.includes('REPORT')) || relatedType === 'REPORT_DONE') {
    return id ? { label: '面试报告', path: `/interviews/${id}/report` } : { label: '面试历史', path: '/interviews/history' }
  }
  if (relatedType.includes('INTERVIEW')) {
    return id ? { label: '面试详情', path: `/interviews/${id}` } : { label: '面试历史', path: '/interviews/history' }
  }
  if (relatedType.includes('RESUME') && relatedType.includes('MATCH')) {
    return id ? { label: '简历匹配详情', path: `/resume-match/${id}` } : { label: '简历匹配', path: '/resume-match' }
  }
  if (relatedType.includes('RESUME')) {
    return { label: '简历中心', path: '/resumes' }
  }
  if (relatedType.includes('STUDY') || relatedType.includes('PLAN')) {
    return { label: '学习计划', path: '/study-plans' }
  }
  if (relatedType.includes('QUESTION')) {
    return id ? { label: '题目详情', path: `/questions/${id}` } : { label: '题库', path: '/questions' }
  }
  if (relatedType.includes('AGENT_RUN')) {
    return id ? { label: 'Agent 运行详情', path: `/agent/runs/${id}` } : { label: 'Agent 任务', path: '/agent/tasks' }
  }
  if (relatedType.includes('TASK')) {
    return { label: '每日任务', path: '/daily-tasks' }
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

const handleClickNotification = async (item: NotificationVO) => {
  if (item.isRead === 0) {
    try {
      await markNotificationReadApi(item.id)
      item.isRead = 1
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch {
      // silent
    }
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
    notifications.value.forEach((item) => { item.isRead = 1 })
    unreadCount.value = 0
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

@media (max-width: 760px) {
  .notification-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .notification-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
