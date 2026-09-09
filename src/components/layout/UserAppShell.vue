<template>
  <div class="user-app-shell" :class="{ 'is-sidebar-collapsed': isSidebarCollapsed }">
    <aside
      ref="sidebarRef"
      class="user-app-shell__sidebar"
      :class="{ 'is-mobile-open': mobileOpen }"
      :role="mobileOpen ? 'dialog' : undefined"
      :aria-modal="mobileOpen ? 'true' : undefined"
      :inert="isMobileViewport && !mobileOpen ? true : undefined"
      aria-label="导航菜单"
      tabindex="-1"
      @keydown="trapSidebarTabFocus"
    >
      <div class="user-app-shell__brand-row">
        <button class="user-app-shell__brand" type="button" aria-label="返回今日总览" @click="go('/dashboard')">
          <span class="user-app-shell__brand-mark">C</span>
          <span class="user-app-shell__brand-copy">
            <strong>CodeCoachAI</strong>
            <small>求职训练工作台</small>
          </span>
        </button>
        <button
          class="user-app-shell__collapse"
          type="button"
          :aria-label="isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
          :title="isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="toggleSidebar"
        >
          <PanelLeftClose v-if="!isSidebarCollapsed" :size="17" aria-hidden="true" />
          <PanelLeftOpen v-else :size="17" aria-hidden="true" />
        </button>
      </div>

      <UserSidebar :collapsed="isSidebarCollapsed" :badges="sidebarBadges" />

      <div class="user-app-shell__account">
        <el-avatar :size="34" :src="props.avatarUrl || ''">{{ props.avatarText }}</el-avatar>
        <span class="user-app-shell__account-copy">
          <strong>{{ props.displayName }}</strong>
          <small>个人求职空间</small>
        </span>
        <button
          class="user-app-shell__account-menu"
          type="button"
          aria-label="打开账户菜单"
          title="账户菜单"
          @click="emit('user-command', 'profile')"
        >
          <MoreVertical :size="17" aria-hidden="true" />
        </button>
      </div>
    </aside>

    <button
      v-if="mobileOpen"
      class="user-app-shell__mobile-backdrop"
      type="button"
      aria-label="关闭导航"
      @click="closeMobileNav"
    />

    <div class="user-app-shell__content" :inert="mobileOpen">
      <header class="user-app-shell__topbar">
        <div class="user-app-shell__topbar-left">
          <button
            class="user-app-shell__menu-trigger"
            type="button"
            aria-label="打开导航"
            title="打开导航"
            @click="mobileOpen = true"
          >
            <Menu :size="19" aria-hidden="true" />
          </button>
          <div class="user-app-shell__breadcrumb" aria-label="当前位置">
            <span>{{ activeGroup?.label || '工作台' }}</span>
            <ChevronRight :size="14" aria-hidden="true" />
            <strong>{{ activeItem?.item.label || currentTitle }}</strong>
          </div>
        </div>

        <div class="user-app-shell__topbar-actions">
          <button
            class="user-app-shell__search"
            type="button"
            aria-label="打开命令面板"
            title="搜索任务、岗位、训练题"
            @click="emit('open-command')"
          >
            <Search :size="16" aria-hidden="true" />
            <span>搜索任务、岗位、训练题...</span>
            <kbd>⌘K</kbd>
          </button>
          <button
            class="user-app-shell__icon-button"
            type="button"
            :aria-label="unreadCount > 0 ? `打开通知中心（${unreadCount} 条未读）` : '打开通知中心'"
            title="通知"
            @click="go('/notifications')"
          >
            <Bell :size="18" aria-hidden="true" />
            <span v-if="unreadCount > 0" class="user-app-shell__icon-button-dot" aria-hidden="true" />
          </button>
          <span class="user-app-shell__stat" title="连续完成天数">
            <Flame :size="17" aria-hidden="true" />
            <b>{{ gameProfile.streakDays }}</b>
          </span>
          <span class="user-app-shell__stat" title="经验值">
            <Zap :size="17" aria-hidden="true" />
            <b>{{ gameProfile.xp }}</b>
          </span>
          <button
            class="user-app-shell__icon-button user-app-shell__icon-button--help"
            type="button"
            aria-label="打开通知中心"
            title="通知中心"
            @click="go('/notifications')"
          >
            <CircleHelp :size="18" aria-hidden="true" />
          </button>
          <ThemeSwitcher />
          <el-dropdown trigger="click" @command="handleUserCommand">
            <button class="user-app-shell__avatar" type="button" :aria-label="`打开 ${props.displayName} 的账户菜单`">
              <el-avatar :size="32" :src="props.avatarUrl || ''">{{ props.avatarText }}</el-avatar>
              <span class="user-app-shell__avatar-name">{{ props.displayName }}</span>
              <ChevronDown :size="14" aria-hidden="true" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人资料</el-dropdown-item>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item v-if="props.canAccessAdmin" command="admin">管理端</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Flame,
  Menu,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Zap
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  getVisibleUserNavigationGroups,
  resolveUserNavigationGroup,
  resolveUserNavigationItem
} from '@/config/userNavigation'
import { useGameProfileStore } from '@/features/game-profile'
import UserSidebar from '@/components/layout/UserSidebar.vue'
import ThemeSwitcher from '@/components/layout/ThemeSwitcher.vue'
import { fetchCachedTodayAgentTasks } from '@/composables/useUserHomeDataCache'
import { useDocumentScrollLock } from '@/composables/useDocumentScrollLock'
import { getUnreadCountApi } from '@/api/notification'
import { formatDateInTimezone } from '@/utils/format'

const props = withDefaults(defineProps<{
  displayName: string
  avatarText: string
  avatarUrl?: string
  canAccessAdmin: boolean
}>(), {
  avatarUrl: ''
})

const emit = defineEmits<{
  'go-admin': []
  'user-command': [command: string]
  'open-command': []
}>()

const router = useRouter()
const route = useRoute()
const gameProfile = useGameProfileStore()
const collapsed = ref(false)
const mobileOpen = ref(false)
const todayTodoCount = ref<number | null>(null)
const unreadCount = ref(0)

// 顶栏通知角标：对照原型 topbar .icon-btn .dot，数据驱动未读指示。
const loadUnreadCount = async () => {
  try {
    const result = await getUnreadCountApi()
    unreadCount.value = Number(result.unreadCount ?? result.total ?? 0)
  } catch {
    unreadCount.value = 0
  }
}
const viewportWidth = ref(typeof window === 'undefined' ? 1440 : window.innerWidth)
const visibleGroups = computed(() => getVisibleUserNavigationGroups())

// 侧边栏徽标只挂真实业务数据：今日待办任务数（与今日任务页同一接口与缓存）。
const sidebarBadges = computed<Record<string, string | number>>(() => {
  const badges: Record<string, string | number> = {}
  if (todayTodoCount.value !== null) badges.today = todayTodoCount.value
  return badges
})
const routeContext = computed(() => ({
  name: route.name,
  path: String(route.path || route.fullPath || '/').split(/[?#]/, 1)[0] || '/'
}))
const activeItem = computed(() => resolveUserNavigationItem(routeContext.value, visibleGroups.value))
const activeGroup = computed(() => resolveUserNavigationGroup(routeContext.value, visibleGroups.value))
const currentTitle = computed(() => String(route.meta?.title || '工作台'))
const isMobileViewport = computed(() => viewportWidth.value <= 1023)
const isSidebarCollapsed = computed(
  () => !isMobileViewport.value && collapsed.value
)

const storageKey = 'codecoachai:user-sidebar-collapsed'

const readCollapsedPreference = (): boolean => {
  try {
    return localStorage.getItem(storageKey) === '1'
  } catch {
    return false
  }
}

const writeCollapsedPreference = (collapsed: boolean) => {
  try {
    localStorage.setItem(storageKey, collapsed ? '1' : '0')
  } catch {
    // 隐私模式或禁用存储时忽略，本次会话仍然生效
  }
}

useDocumentScrollLock(mobileOpen)

const go = async (path: string) => {
  closeMobileNav()
  await router.push(path)
}

const toggleSidebar = () => {
  collapsed.value = !collapsed.value
  writeCollapsedPreference(collapsed.value)
}

const closeMobileNav = () => {
  mobileOpen.value = false
}

// ---- 移动端抽屉的焦点管理（对话框语义：trap Tab + 关闭后焦点回归）----
const sidebarRef = ref<HTMLElement | null>(null)
let lastFocusedBeforeOpen: HTMLElement | null = null

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ')

const trapSidebarTabFocus = (event: KeyboardEvent) => {
  if (event.key !== 'Tab' || !mobileOpen.value || !sidebarRef.value) return
  const focusables = [...sidebarRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement
  const inside = Boolean(active && sidebarRef.value.contains(active))
  if (event.shiftKey) {
    if (!inside || active === first) {
      event.preventDefault()
      last.focus()
    }
    return
  }
  if (!inside || active === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(mobileOpen, (open) => {
  if (open) {
    lastFocusedBeforeOpen = document.activeElement instanceof HTMLElement ? document.activeElement : null
    void nextTick(() => sidebarRef.value?.focus())
    return
  }
  // 关闭时内容区的 inert 尚未解除（watcher 先于 DOM patch），等更新完成后再还焦点
  void nextTick(() => {
    if (lastFocusedBeforeOpen && document.contains(lastFocusedBeforeOpen)) {
      lastFocusedBeforeOpen.focus()
    }
    lastFocusedBeforeOpen = null
  })
})

const updateViewportWidth = () => {
  viewportWidth.value = window.innerWidth
  if (!isMobileViewport.value) closeMobileNav()
}

const handleUserCommand = (command: string) => {
  if (command === 'admin') {
    emit('go-admin')
    return
  }
  emit('user-command', command)
}

const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (event.key === '[' && !isTypingTarget(event.target)) {
    event.preventDefault()
    toggleSidebar()
    return
  }
  if (event.key === 'Escape') closeMobileNav()
}

const isTypingTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null
  return Boolean(element?.matches('input, textarea, select, [contenteditable="true"]'))
}

const loadTodayBadge = async () => {
  try {
    const date = formatDateInTimezone(new Date(), 'Asia/Shanghai')
    const snapshot = await fetchCachedTodayAgentTasks(date)
    todayTodoCount.value = typeof snapshot?.todoCount === 'number' ? snapshot.todoCount : null
  } catch {
    todayTodoCount.value = null
  }
}

watch(() => route.fullPath, closeMobileNav)

watch(
  () => route.name,
  (_, fromName) => {
    // 离开通知中心后刷新未读角标，使红点能及时消除。
    if (String(fromName) === 'Notifications') void loadUnreadCount()
  }
)

onMounted(() => {
  collapsed.value = readCollapsedPreference()
  document.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('resize', updateViewportWidth)
  void loadTodayBadge()
  void loadUnreadCount()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('resize', updateViewportWidth)
})
</script>

<style scoped lang="scss">
.user-app-shell {
  --user-sidebar-width: 248px;
  display: grid;
  grid-template-columns: var(--user-sidebar-width) minmax(0, 1fr);
  min-width: 0;
  min-height: 100dvh;
  background: var(--user-bg, #f7f8fa);
  color: var(--user-text, #1a1917);
  transition: grid-template-columns 180ms ease;

  &.is-sidebar-collapsed {
    --user-sidebar-width: 64px;
  }
}

.user-app-shell__sidebar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  width: var(--user-sidebar-width);
  height: 100dvh;
  overflow: hidden;
  border-right: 1px solid var(--user-border, #e3e0da);
  background: var(--user-sidebar-bg, #fafbfc);
  transition: width 180ms ease, transform 180ms ease;
}

// 容器仅作为程序化焦点落点（tabindex="-1"），不显示焦点环
.user-app-shell__sidebar:focus {
  outline: none;
}

.user-app-shell__brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 72px;
  padding: 16px;
  border-bottom: 1px solid var(--user-border, #e3e0da);
}

.user-app-shell__brand,
.user-app-shell__collapse,
.user-app-shell__account-menu,
.user-app-shell__menu-trigger,
.user-app-shell__icon-button,
.user-app-shell__avatar {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}

.user-app-shell__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 0;
  text-align: left;
}

.user-app-shell__brand-mark {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  // 主色微渐变（同色相，跟随主题 token，不硬编码色值）
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--user-primary, #1f6f5c) 84%, #ffffff) 0%,
    var(--user-primary, #1f6f5c) 55%,
    color-mix(in srgb, var(--user-primary, #1f6f5c) 90%, #000000) 100%
  );
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  box-shadow: var(--user-shadow-sm, 0 2px 4px rgba(26, 25, 23, 0.04));
}

.user-app-shell__brand-copy,
.user-app-shell__account-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.user-app-shell__brand-copy strong,
.user-app-shell__account-copy strong {
  overflow: hidden;
  color: var(--user-text, #1a1917);
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-app-shell__brand-copy small,
.user-app-shell__account-copy small {
  color: var(--user-text-muted, #6e6963);
  font-size: 11px;
  white-space: nowrap;
}

.user-app-shell__collapse {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--user-text-muted, #6e6963);
}

.user-app-shell__collapse:hover,
.user-app-shell__collapse:focus-visible,
.user-app-shell__account-menu:hover,
.user-app-shell__account-menu:focus-visible,
.user-app-shell__menu-trigger:hover,
.user-app-shell__menu-trigger:focus-visible,
.user-app-shell__icon-button:hover,
.user-app-shell__icon-button:focus-visible {
  background: var(--user-primary-soft, #eaf2ef);
  color: var(--user-primary, #1f6f5c);
  outline: 0;
}

.user-app-shell.is-sidebar-collapsed .user-app-shell__brand-row {
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  min-height: auto;
  padding: 14px 8px;
}

.user-app-shell.is-sidebar-collapsed .user-app-shell__brand-copy {
  display: none;
}

.user-app-shell.is-sidebar-collapsed .user-app-shell__brand {
  justify-content: center;
}

.user-app-shell.is-sidebar-collapsed .user-app-shell__collapse {
  width: 26px;
  height: 26px;
}

.user-app-shell__account {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  margin: auto 12px 16px;
  padding: 10px;
  border: 1px solid var(--user-border, #e3e0da);
  border-radius: 10px;
  background: var(--user-surface, #fff);
}

.user-app-shell__account-menu {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-left: auto;
  border-radius: 6px;
  color: var(--user-text-muted, #6e6963);
}

.user-app-shell.is-sidebar-collapsed .user-app-shell__account {
  justify-content: center;
  margin-inline: 8px;
  padding: 8px 4px;
}

.user-app-shell.is-sidebar-collapsed .user-app-shell__account-copy,
.user-app-shell.is-sidebar-collapsed .user-app-shell__account-menu {
  display: none;
}

.user-app-shell__content {
  display: flex;
  min-width: 0;
  min-height: 100dvh;
  flex-direction: column;
}

.user-app-shell__topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 56px;
  padding: 0 24px;
  border-bottom: 1px solid var(--user-border, #e3e0da);
  background: var(--user-surface, #ffffff);
}

.user-app-shell__topbar-left,
.user-app-shell__topbar-actions,
.user-app-shell__breadcrumb,
.user-app-shell__avatar {
  display: flex;
  align-items: center;
}

.user-app-shell__topbar-left,
.user-app-shell__topbar-actions {
  gap: 12px;
}

.user-app-shell__menu-trigger {
  display: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
}

.user-app-shell__breadcrumb {
  gap: 6px;
  min-width: 0;
  color: var(--user-text-muted, #6e6963);
  font-size: 13px;
}

.user-app-shell__breadcrumb strong {
  overflow: hidden;
  color: var(--user-text, #1a1917);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-app-shell__search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(360px, 32vw);
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--user-border, #e3e0da);
  border-radius: 8px;
  background: var(--user-surface, #fff);
  color: var(--user-text-muted, #6e6963);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  text-align: left;
}

.user-app-shell__search:hover,
.user-app-shell__search:focus-visible {
  border-color: var(--user-primary, #1f6f5c);
  outline: 0;
}

.user-app-shell__search span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-app-shell__search kbd {
  flex: 0 0 auto;
  padding: 2px 5px;
  border: 1px solid var(--user-border, #e3e0da);
  border-radius: 4px;
  background: var(--user-bg, #f7f8fa);
  font-size: 10px;
}

.user-app-shell__icon-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--user-text-secondary, #3a3630);
}

// 顶栏通知未读角标：对照原型 topbar .icon-btn .dot（红点 + 2px 画布描边环）。
.user-app-shell__icon-button-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 50%;
  background: var(--user-danger, #b03a3a);
  border: 2px solid var(--user-surface, #ffffff);
  pointer-events: none;
}

// 顶栏连胜 / 经验值胶囊（对照原型 topbar 右侧 icon 位）
.user-app-shell__stat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 10px;
  border-radius: var(--user-radius-md, 10px);
  background: var(--user-surface-muted, #f0efeb);
  color: var(--user-text-secondary, #57534e);
  font-size: 12px;
  white-space: nowrap;
}

.user-app-shell__stat b {
  color: var(--user-text, #1a1917);
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 1279px) {
  .user-app-shell__stat {
    display: none;
  }
}

.user-app-shell__avatar {
  gap: 4px;
  padding: 0 2px;
  color: var(--user-text-muted, #6e6963);
}

.user-app-shell__avatar-name {
  min-width: 0;
  max-width: 128px;
  overflow: hidden;
  color: var(--user-text, #1a1917);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-app-shell__mobile-backdrop {
  display: none;
}

@media (max-width: 1023px) {
  .user-app-shell {
    --user-sidebar-width: 248px;
  }

  .user-app-shell__sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
  }

  .user-app-shell__sidebar.is-mobile-open {
    transform: translateX(0);
    box-shadow: 8px 0 24px rgb(15 23 42 / 12%);
  }

  .user-app-shell__mobile-backdrop {
    position: fixed;
    inset: 0;
    z-index: 25;
    display: block;
    border: 0;
    background: rgb(15 23 42 / 28%);
  }

  .user-app-shell__menu-trigger {
    display: inline-flex;
  }

  .user-app-shell__topbar {
    padding-inline: 16px;
  }

}

@media (max-width: 720px) {
  .user-app-shell__topbar {
    min-height: 56px;
    padding-inline: 12px max(12px, env(safe-area-inset-right));
  }

  // 2026-09-09 测评整改：移动端触控热区从 32px 提升到 40px，
  // 并限制账户名宽度，避免顶栏头像/姓名被挤出可视区
  .user-app-shell__menu-trigger,
  .user-app-shell__icon-button {
    width: 40px;
    height: 40px;
  }

  .user-app-shell__avatar-name {
    max-width: 76px;
  }

  .user-app-shell__topbar-actions {
    gap: 4px;
  }

  .user-app-shell__search {
    width: 36px;
    min-height: 32px;
    justify-content: center;
    padding: 0;
  }

  .user-app-shell__search span,
  .user-app-shell__search kbd,
  .user-app-shell__icon-button--help {
    display: none;
  }

  .user-app-shell__breadcrumb {
    max-width: 46vw;
  }

  .user-app-shell__avatar-name {
    max-width: 72px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .user-app-shell,
  .user-app-shell__sidebar {
    transition: none;
  }
}
</style>
