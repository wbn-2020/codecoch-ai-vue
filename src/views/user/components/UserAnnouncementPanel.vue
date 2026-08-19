<template>
  <section class="announcement-panel content-card cc-glass" aria-labelledby="announcement-panel-title">
    <header class="announcement-panel__header">
      <div>
        <div class="announcement-panel__title-row">
          <Megaphone :size="18" />
          <h2 id="announcement-panel-title">系统公告</h2>
        </div>
        <p>当前账号可见公告 · 阅读状态保存在本机</p>
      </div>
      <div class="announcement-summary" aria-live="polite">
        <strong>{{ unreadCount }}</strong>
        <span>条未读</span>
      </div>
    </header>

    <div class="announcement-toolbar" aria-label="公告阅读状态筛选">
      <button
        v-for="option in readFilterOptions"
        :key="option.value"
        type="button"
        class="announcement-filter"
        :class="{ 'is-active': readFilter === option.value }"
        :aria-pressed="readFilter === option.value"
        @click="readFilter = option.value"
      >
        {{ option.label }}
        <span v-if="option.value === 'unread' && unreadCount > 0">{{ unreadCount }}</span>
      </button>
    </div>

    <div v-if="errorMessage && !loading" class="announcement-state">
      <AppState type="error" title="公告加载失败" :description="errorMessage">
        <el-button type="primary" :loading="loading" @click="fetchAnnouncements">
          <RefreshCw :size="16" />
          重新加载
        </el-button>
      </AppState>
    </div>

    <div class="announcement-list" v-loading="loading">
      <div v-if="!loading && !errorMessage && !filteredAnnouncements.length" class="announcement-empty">
        <MegaphoneOff :size="30" />
        <strong>{{ emptyTitle }}</strong>
        <span>{{ emptyDescription }}</span>
      </div>

      <button
        v-for="item in filteredAnnouncements"
        :key="item.id"
        type="button"
        class="announcement-item"
        :class="{ 'is-unread': !isAnnouncementRead(item.id) }"
        :data-announcement-id="item.id"
        @click="openAnnouncement(item)"
      >
        <span class="announcement-item__marker" aria-hidden="true"></span>
        <span class="announcement-item__body">
          <span class="announcement-item__head">
            <strong>{{ item.title }}</strong>
            <span class="announcement-item__badges">
              <el-tag size="small" effect="plain">{{ announcementTypeText(item.type) }}</el-tag>
              <span class="announcement-read-state">
                {{ isAnnouncementRead(item.id) ? '本机已读' : '未读' }}
              </span>
            </span>
          </span>
          <span class="announcement-item__content">{{ item.content || '这条公告暂无正文内容。' }}</span>
          <span class="announcement-item__meta">
            <time>{{ formatAnnouncementTime(item) }}</time>
            <span class="announcement-detail-link">
              查看详情
              <ChevronRight :size="15" />
            </span>
          </span>
        </span>
      </button>
    </div>

    <el-dialog
      v-model="detailVisible"
      class="announcement-dialog"
      width="600px"
      :title="selectedAnnouncement?.title || '公告详情'"
    >
      <article v-if="selectedAnnouncement" class="announcement-detail">
        <div class="announcement-detail__meta">
          <el-tag effect="plain">{{ announcementTypeText(selectedAnnouncement.type) }}</el-tag>
          <time>{{ formatAnnouncementTime(selectedAnnouncement) }}</time>
          <span>本机已读</span>
        </div>
        <p>{{ selectedAnnouncement.content || '这条公告暂无正文内容。' }}</p>
      </article>
      <template #footer>
        <el-button type="primary" @click="detailVisible = false">我知道了</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { ChevronRight, Megaphone, MegaphoneOff, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'

import { getPublishedAnnouncementsApi } from '@/api/announcement'
import AppState from '@/components/common/AppState.vue'
import { useAuthStore } from '@/stores/auth'
import type { AnnouncementVO } from '@/types/announcement'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

type ReadFilter = 'all' | 'unread' | 'read'

const READ_STORAGE_PREFIX = 'codecoachai:user-announcements:read:v1'
const MAX_STORED_READ_IDS = 500

const authStore = useAuthStore()
const announcements = ref<AnnouncementVO[]>([])
const readIds = ref<Set<string>>(new Set())
const readFilter = ref<ReadFilter>('all')
const loading = ref(false)
const errorMessage = ref('')
const detailVisible = ref(false)
const selectedAnnouncement = ref<AnnouncementVO>()

const readFilterOptions: Array<{ label: string; value: ReadFilter }> = [
  { label: '全部', value: 'all' },
  { label: '未读', value: 'unread' },
  { label: '已读', value: 'read' }
]

const accountKey = computed(() => {
  const user = authStore.userInfo
  const value = user?.id ?? user?.userId ?? user?.username
  return value == null || String(value).trim() === '' ? null : String(value)
})

const readStorageKey = computed(() =>
  accountKey.value ? `${READ_STORAGE_PREFIX}:${encodeURIComponent(accountKey.value)}` : null
)

const isAnnouncementRead = (id: string) => readIds.value.has(String(id))

const unreadCount = computed(() =>
  announcements.value.reduce((count, item) => count + (isAnnouncementRead(item.id) ? 0 : 1), 0)
)

const filteredAnnouncements = computed(() => {
  if (readFilter.value === 'unread') {
    return announcements.value.filter((item) => !isAnnouncementRead(item.id))
  }
  if (readFilter.value === 'read') {
    return announcements.value.filter((item) => isAnnouncementRead(item.id))
  }
  return announcements.value
})

const emptyTitle = computed(() => {
  if (!announcements.value.length) return '暂无可见公告'
  return readFilter.value === 'unread' ? '没有未读公告' : '没有已读公告'
})

const emptyDescription = computed(() => {
  if (!announcements.value.length) return '当前账号暂时没有服务端返回的公告。'
  return readFilter.value === 'unread'
    ? '当前列表中的公告均已在本机阅读。'
    : '打开公告详情后会记录为本机已读。'
})

const announcementTypeText = (type?: string) => {
  const labels: Record<string, string> = {
    NORMAL: '普通公告',
    MAINTENANCE: '维护公告',
    ACTIVITY: '活动公告',
    SECURITY: '安全公告'
  }
  const token = String(type || 'NORMAL').trim().toUpperCase()
  return labels[token] || type || '普通公告'
}

const formatAnnouncementTime = (item: AnnouncementVO) =>
  formatDateTime(item.publishedAt || item.createdAt)

const loadReadIds = () => {
  const key = readStorageKey.value
  if (!key) {
    readIds.value = new Set()
    return
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(key) || '[]')
    readIds.value = new Set(
      Array.isArray(stored)
        ? stored.map((id) => String(id)).filter(Boolean)
        : []
    )
  } catch {
    readIds.value = new Set()
  }
}

const persistReadIds = () => {
  const key = readStorageKey.value
  if (!key) return
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(Array.from(readIds.value).slice(-MAX_STORED_READ_IDS))
    )
  } catch {
    // Storage may be unavailable in privacy mode; the in-memory state still remains useful.
  }
}

const markAnnouncementRead = (id: string) => {
  const normalizedId = String(id)
  if (readIds.value.has(normalizedId)) return
  readIds.value = new Set([...readIds.value, normalizedId])
  persistReadIds()
}

const openAnnouncement = (item: AnnouncementVO) => {
  markAnnouncementRead(item.id)
  selectedAnnouncement.value = item
  detailVisible.value = true
}

const fetchAnnouncements = async () => {
  loading.value = true
  try {
    const result = await getPublishedAnnouncementsApi()
    announcements.value = Array.isArray(result) ? result : []
    errorMessage.value = ''
  } catch (error) {
    announcements.value = []
    errorMessage.value = getErrorMessage(error, '公告暂时无法加载，请稍后重试。')
  } finally {
    loading.value = false
  }
}

watch(readStorageKey, loadReadIds, { immediate: true })

onMounted(fetchAnnouncements)
</script>

<style scoped lang="scss">
.announcement-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--user-border);
  border-radius: 12px;
  background: var(--user-surface);
}

.announcement-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--user-border);

  p {
    margin: 6px 0 0;
    color: var(--user-text-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

.announcement-panel__title-row {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--user-primary);

  h2 {
    margin: 0;
    color: var(--user-text);
    font-size: 18px;
    line-height: 1.35;
  }
}

.announcement-summary {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  flex: 0 0 auto;
  color: var(--user-text-muted);
  font-size: 12px;

  strong {
    color: var(--user-primary);
    font-size: 20px;
  }
}

.announcement-toolbar {
  display: flex;
  gap: 6px;
  padding: 14px 22px;
  border-bottom: 1px solid var(--user-border);
}

.announcement-filter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--user-text-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;

  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--user-surface-raised);
    font-size: 11px;
  }

  &:hover {
    background: var(--user-primary-faint);
    color: var(--user-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--user-primary);
    outline-offset: 2px;
  }

  &.is-active {
    border-color: var(--user-primary-border);
    background: var(--user-primary-soft);
    color: var(--user-primary);
    font-weight: 700;
  }
}

.announcement-list {
  min-height: 180px;
  padding: 0 22px 18px;
}

.announcement-state {
  padding: 20px 22px 0;
}

.announcement-empty {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--user-text-muted);
  text-align: center;

  strong {
    color: var(--user-text-secondary);
    font-size: 14px;
  }

  span {
    max-width: 420px;
    font-size: 12px;
    line-height: 1.6;
  }
}

.announcement-item {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  padding: 16px 2px;
  border: 0;
  border-bottom: 1px solid var(--user-border);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--user-primary-faint);
  }

  &:focus-visible {
    outline: 2px solid var(--user-primary);
    outline-offset: -2px;
  }

  &:last-child {
    border-bottom: 0;
  }
}

.announcement-item__marker {
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--user-border-strong);
}

.announcement-item.is-unread {
  .announcement-item__marker {
    background: var(--user-primary);
  }

  .announcement-item__head > strong {
    font-weight: 800;
  }

  .announcement-read-state {
    color: var(--user-primary);
  }
}

.announcement-item__body {
  display: grid;
  min-width: 0;
  gap: 7px;
}

.announcement-item__head,
.announcement-item__badges,
.announcement-item__meta,
.announcement-detail__meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.announcement-item__head {
  justify-content: space-between;

  > strong {
    min-width: 0;
    color: var(--user-text);
    font-size: 15px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
}

.announcement-item__badges {
  flex: 0 0 auto;
}

.announcement-read-state {
  color: var(--user-text-muted);
  font-size: 12px;
}

.announcement-item__content {
  display: -webkit-box;
  overflow: hidden;
  color: var(--user-text-secondary);
  font-size: 13px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.announcement-item__meta {
  justify-content: space-between;
  color: var(--user-text-muted);
  font-size: 12px;
}

.announcement-detail-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--user-primary);
  font-weight: 700;
}

.announcement-detail {
  display: grid;
  gap: 18px;

  p {
    margin: 0;
    color: var(--user-text);
    line-height: 1.8;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
}

.announcement-detail__meta {
  flex-wrap: wrap;
  color: var(--user-text-muted);
  font-size: 12px;
}

@media (max-width: 720px) {
  .announcement-panel__header {
    align-items: flex-start;
    padding: 18px;
  }

  .announcement-toolbar,
  .announcement-list {
    padding-right: 18px;
    padding-left: 18px;
  }

  .announcement-toolbar {
    overflow-x: auto;
  }

  .announcement-item__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .announcement-item__meta {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}

:global(.announcement-dialog) {
  width: min(600px, calc(100vw - 28px)) !important;
  margin: 7vh auto;
}
</style>
