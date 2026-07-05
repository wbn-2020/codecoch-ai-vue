<template>
  <header class="jobcoach-top-nav">
    <div class="topnav-inner">
      <button class="brand" type="button" @click="go('/dashboard')">
        <span class="brand-mark">C</span>
        <span class="brand-copy">
          <strong>CodeCoachAI</strong>
          <span>智能求职教练</span>
        </span>
      </button>

      <span class="mobile-current-section">{{ currentMobileNavLabel }}</span>

      <nav class="desktop-nav" aria-label="用户端主导航">
        <button
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ 'is-active': isActive(item) }"
          type="button"
          :aria-current="isActive(item) ? 'page' : undefined"
          :title="item.label"
          @click="go(item.path)"
        >
          <component :is="item.icon" :size="16" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="topnav-actions">
        <button class="command-button" type="button" aria-label="打开命令面板" @click="$emit('open-command')">
          <Search :size="15" />
          <span>搜索</span>
        </button>

        <el-dropdown class="desktop-more" trigger="click" @command="handleMoreCommand">
          <button class="more-button" type="button" aria-label="打开更多入口">
            <MoreHorizontal :size="17" />
            <span>更多</span>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="link in secondaryLinks" :key="link.path" :command="link.path">
                {{ link.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-tooltip :content="notificationTooltip" placement="bottom">
          <button class="icon-button" type="button" aria-label="通知中心" @click="go('/notifications')">
            <Bell :size="17" />
            <span v-if="unreadAvailable && unreadCount > 0" class="notification-badge">
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </button>
        </el-tooltip>

        <button v-if="canAccessAdmin" class="admin-button" type="button" @click="$emit('go-admin')">
          <Shield :size="15" />
          <span>管理端</span>
        </button>

        <el-dropdown trigger="click" @command="handleUserCommand">
          <button class="user-trigger" type="button">
            <el-avatar :size="30" :src="avatarUrl || ''">
              {{ avatarText }}
            </el-avatar>
            <span>{{ displayName }}</span>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人资料</el-dropdown-item>
              <el-dropdown-item command="password">修改密码</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <button
          class="mobile-toggle"
          type="button"
          :aria-label="mobileOpen ? '关闭导航' : '打开导航'"
          :aria-expanded="mobileOpen"
          aria-controls="user-mobile-panel"
          @click="mobileOpen = !mobileOpen"
        >
          <X v-if="mobileOpen" :size="19" />
          <Menu v-else :size="19" />
        </button>
      </div>
    </div>

    <Transition name="mobile-nav">
      <div v-if="mobileOpen" id="user-mobile-panel" class="mobile-panel">
        <button
          v-for="item in navItems"
          :key="item.key"
          class="mobile-nav-item"
          :class="{ 'is-active': isActive(item) }"
          type="button"
          @click="go(item.path)"
        >
          <span class="mobile-nav-item__main">
            <component :is="item.icon" :size="17" />
            <strong>{{ item.label }}</strong>
          </span>
          <small>{{ item.desc }}</small>
        </button>

        <div class="mobile-secondary">
          <button v-for="link in secondaryLinks" :key="link.path" type="button" @click="go(link.path)">
            {{ link.label }}
          </button>
        </div>
      </div>
    </Transition>

    <nav class="mobile-bottom-nav" aria-label="手机主导航">
      <button
        v-for="item in mobilePrimaryItems"
        :key="item.key"
        class="mobile-bottom-nav__item"
        :class="{ 'is-active': isActive(item) }"
        type="button"
        :aria-label="item.label"
        :aria-current="isActive(item) ? 'page' : undefined"
        :title="item.label"
        @click="go(item.path)"
      >
        <component :is="item.icon" :size="18" />
        <span>{{ item.mobileLabel }}</span>
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import {
  Bell,
  BookOpenCheck,
  FileText,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Search,
  Shield,
  Sparkles,
  Target,
  X
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineProps<{
  displayName: string
  avatarText: string
  avatarUrl?: string
  unreadCount: number
  unreadAvailable: boolean
  notificationTooltip: string
  canAccessAdmin: boolean
}>()

const emit = defineEmits<{
  'open-command': []
  'go-admin': []
  'user-command': [command: string]
}>()

interface NavItem {
  key: string
  label: string
  mobileLabel: string
  desc: string
  path: string
  icon: Component
  matches: string[]
}

const router = useRouter()
const route = useRoute()
const mobileOpen = ref(false)

const navItems: NavItem[] = [
  {
    key: 'dashboard',
    label: '工作台',
    mobileLabel: '工作台',
    desc: 'Offer 冲刺驾驶舱、今日行动和 AI 推荐依据',
    path: '/dashboard',
    icon: Target,
    matches: ['/dashboard', '/dashboard/v3', '/onboarding', '/agent/today', '/agent/tasks']
  },
  {
    key: 'questions',
    label: '题库',
    mobileLabel: '题库',
    desc: '推荐题、专项练习、错题和收藏',
    path: '/questions/recommendations',
    icon: BookOpenCheck,
    matches: ['/questions']
  },
  {
    key: 'interviews',
    label: '模拟面试',
    mobileLabel: '面试',
    desc: '推荐开练、训练房间、复盘记录和报告',
    path: '/interviews/create',
    icon: MessageSquare,
    matches: ['/interviews']
  },
  {
    key: 'resume',
    label: '简历实验',
    mobileLabel: '简历',
    desc: '简历、岗位目标、匹配分析和项目证据',
    path: '/resumes',
    icon: FileText,
    matches: ['/resumes', '/job-targets', '/resume-match', '/project-evidence', '/projects']
  },
  {
    key: 'ability',
    label: '能力图谱',
    mobileLabel: '能力',
    desc: '能力图谱、成长趋势、能力画像和个人分析',
    path: '/ability-map',
    icon: Sparkles,
    matches: ['/ability-map', '/growth', '/skill-profile', '/analytics/personal']
  }
]

const mobilePrimaryItems = navItems
const currentMobileNavLabel = computed(() => navItems.find((item) => isActive(item))?.label || '工作台')

const secondaryLinks = [
  { label: '今日任务', path: '/agent/today' },
  { label: 'AI 任务中心', path: '/agent/tasks' },
  { label: '记录与工具', path: '/tools' },
  { label: '求职实验台', path: '/job-experiments' },
  { label: '投递管理', path: '/applications' },
  { label: '个人知识库', path: '/knowledge' },
  { label: '新手引导', path: '/onboarding' },
  { label: '专项训练房间', path: '/questions/practice' },
  { label: '面试复盘记录', path: '/interviews/history' }
]

const isActive = (item: NavItem) => {
  return item.matches.some((prefix) => route.path.startsWith(prefix))
}

const go = async (path: string) => {
  mobileOpen.value = false
  await router.push(path)
}

const handleUserCommand = (command: string) => {
  emit('user-command', command)
}

const handleMoreCommand = async (path: string) => {
  await go(path)
}

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  }
)
</script>

<style scoped lang="scss">
.jobcoach-top-nav {
  position: sticky;
  top: 0;
  z-index: 40;
  min-height: var(--user-mobile-top-height, 68px);
  overflow-x: clip;
  border-bottom: 1px solid rgba(0, 242, 254, 0.14);
  background:
    linear-gradient(180deg, rgba(7, 17, 31, 0.94), rgba(7, 17, 31, 0.8)),
    rgba(7, 17, 31, 0.86);
  color: var(--user-text);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(18px);
}

.topnav-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  width: min(100%, 1240px);
  min-height: 68px;
  margin: 0 auto;
  padding: 0 24px;
}

.brand,
.nav-item,
.command-button,
.more-button,
.icon-button,
.admin-button,
.user-trigger,
.mobile-toggle,
.mobile-nav-item,
.mobile-secondary button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.brand {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  min-width: 178px;
  padding: 0;
  text-align: left;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--cc-cyan), var(--cc-blue));
  color: #04111f;
  font-weight: 800;
  box-shadow: 0 0 18px rgba(0, 242, 254, 0.28);
}

.brand-copy {
  display: grid;
  gap: 2px;
  min-width: 0;

  strong {
    font-size: 15px;
    line-height: 1.1;
  }

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }
}

.desktop-nav {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: 4px;
  overflow: hidden;
}

.mobile-current-section {
  display: none;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  min-height: 38px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--user-text-secondary);
  font-size: 14px;
  white-space: nowrap;
  transition:
    background 0.16s ease,
    color 0.16s ease,
    box-shadow 0.16s ease;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:hover {
    background: rgba(0, 242, 254, 0.09);
    color: var(--user-primary);
  }

  &.is-active {
    background: linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(79, 172, 254, 0.16));
    color: var(--user-text);
    font-weight: 700;
    box-shadow: inset 0 0 0 1px rgba(0, 242, 254, 0.28), 0 0 18px rgba(0, 242, 254, 0.14);
  }
}

.topnav-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.command-button,
.more-button,
.admin-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid rgba(148, 203, 255, 0.16);
  border-radius: 8px;
  background: rgba(7, 17, 31, 0.54);
  color: var(--user-text-secondary);
  font-size: 13px;
  backdrop-filter: blur(10px);

  &:hover {
    border-color: var(--user-primary-border);
    background: rgba(0, 242, 254, 0.09);
    color: var(--user-primary);
  }
}

.desktop-more {
  display: inline-flex;
}

.icon-button,
.mobile-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(148, 203, 255, 0.16);
  border-radius: 8px;
  background: rgba(7, 17, 31, 0.54);
  color: var(--user-text-secondary);
  backdrop-filter: blur(10px);

  &:hover {
    border-color: var(--user-primary-border);
    background: rgba(0, 242, 254, 0.09);
    color: var(--user-primary);
  }
}

.notification-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border: 2px solid rgba(7, 17, 31, 0.96);
  border-radius: 999px;
  background: rgba(251, 113, 133, 0.95);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}

.user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  max-width: 154px;
  padding: 2px 8px 2px 2px;
  overflow: hidden;
  border: 1px solid rgba(148, 203, 255, 0.16);
  border-radius: 999px;
  background: rgba(7, 17, 31, 0.54);
  color: var(--user-text-secondary);
  backdrop-filter: blur(10px);

  span {
    min-width: 0;
    overflow: hidden;
    color: var(--user-text-secondary);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    border-color: var(--user-primary-border);
    background: rgba(0, 242, 254, 0.09);
    color: var(--user-primary);
  }
}

.mobile-toggle,
.mobile-panel,
.mobile-bottom-nav {
  display: none;
}

.mobile-nav-enter-active,
.mobile-nav-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.mobile-nav-enter-from,
.mobile-nav-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 1180px) {
  .desktop-nav {
    display: none;
  }

  .topnav-inner {
    justify-content: space-between;
  }

  .mobile-toggle {
    display: inline-flex;
  }

  .mobile-panel {
    display: grid;
    gap: 8px;
    width: min(100%, 1240px);
    max-height: calc(100vh - var(--user-mobile-top-height, 68px));
    margin: 0 auto;
    padding: 0 24px 18px;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: rgba(7, 17, 31, 0.84);
    backdrop-filter: blur(16px);
  }

  .mobile-nav-item {
    display: grid;
    gap: 4px;
    min-width: 0;
    padding: 12px;
    overflow: hidden;
    border: 1px solid rgba(148, 203, 255, 0.16);
    border-radius: 8px;
    background: rgba(15, 27, 49, 0.78);
    text-align: left;

    &.is-active {
      border-color: var(--user-primary-border);
      background: rgba(0, 242, 254, 0.1);
    }

    small {
      min-width: 0;
      overflow-wrap: anywhere;
      color: var(--user-text-muted);
      font-size: 12px;
      line-height: 1.5;
    }
  }

  .mobile-nav-item__main {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
  }

  .mobile-secondary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
    padding-top: 4px;

    button {
      min-height: 32px;
      padding: 0 10px;
      border: 1px solid rgba(148, 203, 255, 0.16);
      border-radius: 8px;
      background: rgba(7, 17, 31, 0.62);
      color: var(--user-text-secondary);
      font-size: 13px;
    }
  }
}

@media (max-width: 720px) {
  .jobcoach-top-nav {
    min-height: 62px;
  }

  .topnav-inner {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 8px;
    min-height: 62px;
    padding: 0 14px;
  }

  .brand {
    width: 40px;
    min-width: 0;
  }

  .brand-copy,
  .command-button,
  .desktop-more,
  .admin-button,
  .user-trigger span {
    display: none;
  }

  .topnav-actions {
    gap: 6px;
    min-width: 0;
  }

  .icon-button,
  .mobile-toggle,
  .user-trigger {
    width: 40px;
    height: 40px;
    min-height: 40px;
  }

  .user-trigger {
    justify-content: center;
    padding: 0;
  }

  .brand-mark {
    width: 36px;
    height: 36px;
  }

  .mobile-current-section {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    max-width: 100%;
    min-height: 28px;
    padding: 0 9px;
    overflow: hidden;
    border: 1px solid var(--user-primary-border);
    border-radius: 8px;
    background: rgba(0, 242, 254, 0.1);
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-panel {
    max-height: calc(100vh - 62px - var(--user-mobile-nav-height, 72px) - var(--user-mobile-nav-gap, 12px) - env(safe-area-inset-bottom, 0px));
    padding: 0 14px calc(14px + env(safe-area-inset-bottom, 0px));
  }

  .mobile-bottom-nav {
    position: fixed;
    box-sizing: border-box;
    right: 10px;
    bottom: calc(var(--user-mobile-nav-gap, 10px) + env(safe-area-inset-bottom, 0px));
    left: 10px;
    z-index: 55;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
    height: var(--user-mobile-nav-height, 72px);
    padding: 6px;
    overflow: hidden;
    border: 1px solid rgba(0, 242, 254, 0.18);
    border-radius: 8px;
    background: rgba(7, 17, 31, 0.92);
    box-shadow: 0 16px 46px rgba(0, 0, 0, 0.42), 0 0 22px rgba(0, 242, 254, 0.1);
    backdrop-filter: blur(18px);
  }

  .mobile-bottom-nav__item {
    display: grid;
    place-items: center;
    gap: 3px;
    min-width: 0;
    min-height: 0;
    height: 100%;
    padding: 4px 2px;
    border-radius: 8px;
    color: var(--user-text-muted);
    font-size: 10px;
    font-weight: 800;
    line-height: 1.15;

    svg {
      flex: 0 0 auto;
    }

    span {
      display: -webkit-box;
      max-width: 100%;
      overflow: hidden;
      overflow-wrap: anywhere;
      text-align: center;
      text-overflow: ellipsis;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    &.is-active {
      background: linear-gradient(135deg, rgba(0, 242, 254, 0.18), rgba(79, 172, 254, 0.14));
      color: var(--user-primary);
    }
  }
}

@media (max-width: 374px) {
  .mobile-current-section {
    padding: 0 6px;
    font-size: 11px;
  }
}
</style>
