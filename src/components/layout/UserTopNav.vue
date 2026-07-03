<template>
  <header class="jobcoach-top-nav">
    <div class="topnav-inner">
      <button class="brand" type="button" @click="go('/dashboard')">
        <span class="brand-mark">C</span>
        <span class="brand-copy">
          <strong>CodeCoachAI</strong>
          <span>智能教练</span>
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
        :aria-current="isActive(item) ? 'page' : undefined"
        :title="item.label"
        @click="go(item.path)"
      >
        <component :is="item.icon" :size="18" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import {
  Bell,
  BookOpenCheck,
  FileText,
  History,
  Menu,
  MessageSquare,
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
    key: 'today',
    label: '今日计划',
    desc: '今天先练什么、为什么练、下一步去哪',
    path: '/dashboard',
    icon: Target,
    matches: ['/dashboard']
  },
  {
    key: 'resume',
    label: '简历与岗位',
    desc: '简历诊断、岗位目标、岗位匹配和项目证据',
    path: '/resumes',
    icon: FileText,
    matches: ['/resumes', '/job-targets', '/resume-match', '/projects', '/skill-profile']
  },
  {
    key: 'questions',
    label: '题库训练',
    desc: '推荐题、专项练习、错题和收藏',
    path: '/questions/recommendations',
    icon: BookOpenCheck,
    matches: ['/questions']
  },
  {
    key: 'interviews',
    label: '模拟面试',
    desc: '创建面试、训练房间、历史记录和报告',
    path: '/interviews/create',
    icon: MessageSquare,
    matches: ['/interviews']
  },
  {
    key: 'coach',
    label: 'AI 教练',
    desc: '今日任务、任务中心、长任务恢复和生成详情',
    path: '/agent/today',
    icon: Sparkles,
    matches: ['/agent']
  },
  {
    key: 'records',
    label: '记录与工具',
    desc: '历史记录、训练分析、通知、学习计划和面试工具',
    path: '/tools',
    icon: History,
    matches: ['/tools', '/analytics', '/notifications', '/study-plans', '/daily-tasks', '/weakness-analysis']
  }
]

const mobilePrimaryKeys = new Set(['today', 'resume', 'questions', 'interviews', 'coach'])
const mobilePrimaryItems = navItems.filter((item) => mobilePrimaryKeys.has(item.key))
const currentMobileNavLabel = computed(() => navItems.find((item) => isActive(item))?.label || '今日计划')

const secondaryLinks = [
  { label: '新手引导', path: '/onboarding' },
  { label: '简历与岗位', path: '/resumes' },
  { label: '任务中心', path: '/agent/tasks' },
  { label: '专项练习', path: '/questions/practice' },
  { label: '面试历史', path: '/interviews/history' }
]

const isActive = (item: NavItem) => {
  if (item.key === 'today') {
    return route.path === '/dashboard' || route.path === '/dashboard/v3' || route.path.startsWith('/onboarding')
  }
  return item.matches.some((prefix) => route.path.startsWith(prefix))
}

const go = async (path: string) => {
  mobileOpen.value = false
  await router.push(path)
}

const handleUserCommand = (command: string) => {
  emit('user-command', command)
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
  min-height: 68px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.88);
  color: #172033;
  backdrop-filter: blur(18px);
}

.topnav-inner {
  display: flex;
  align-items: center;
  gap: 18px;
  width: min(100%, 1240px);
  min-height: 68px;
  margin: 0 auto;
  padding: 0 24px;
}

.brand,
.nav-item,
.command-button,
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
  background: #2563eb;
  color: #fff;
  font-weight: 800;
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
    color: #64748b;
    font-size: 12px;
  }
}

.desktop-nav {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.mobile-current-section {
  display: none;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 11px;
  border-radius: 8px;
  color: #475569;
  font-size: 14px;
  white-space: nowrap;
  transition:
    background 0.16s ease,
    color 0.16s ease;

  &:hover {
    background: #eff6ff;
    color: #1d4ed8;
  }

  &.is-active {
    background: #dbeafe;
    color: #1d4ed8;
    font-weight: 700;
  }
}

.topnav-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.command-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: #64748b;
  font-size: 13px;
}

.icon-button,
.mobile-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: #475569;

  &:hover {
    border-color: #bfdbfe;
    color: #1d4ed8;
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
  border: 2px solid #fff;
  border-radius: 999px;
  background: #d94c36;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}

.admin-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: #475569;
  font-size: 13px;

  &:hover {
    border-color: #bfdbfe;
    color: #1d4ed8;
  }
}

.user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  max-width: 154px;
  padding: 2px 8px 2px 2px;
  border: 1px solid transparent;
  border-radius: 999px;

  span {
    min-width: 0;
    overflow: hidden;
    color: #334155;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    border-color: #dbe3ef;
    background: #fff;
  }
}

.mobile-toggle {
  display: none;
}

.mobile-panel {
  display: none;
}

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

@media (max-width: 1100px) {
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
    max-height: calc(100vh - 68px);
    margin: 0 auto;
    padding: 0 24px 18px;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .mobile-nav-item {
    display: grid;
    gap: 4px;
    padding: 12px;
    border: 1px solid #e5eaf2;
    border-radius: 8px;
    background: #fff;
    text-align: left;

    &.is-active {
      border-color: #bfdbfe;
      background: #eff6ff;
    }

    small {
      color: #64748b;
      font-size: 12px;
      line-height: 1.5;
    }
  }

  .mobile-nav-item__main {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .mobile-secondary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 4px;

    button {
      min-height: 32px;
      padding: 0 10px;
      border: 1px solid #e5eaf2;
      border-radius: 8px;
      background: #f8fafc;
      color: #475569;
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

  .brand-copy {
    display: none;
  }

  .command-button,
  .admin-button,
  .user-trigger span {
    display: none;
  }

  .topnav-actions {
    gap: 6px;
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
    border-color: #dbe3ef;
    background: #fff;
  }

  .brand-mark {
    width: 36px;
    height: 36px;
  }

  .mobile-panel {
    max-height: calc(100vh - 62px - var(--user-mobile-nav-height, 72px) - var(--user-mobile-nav-gap, 12px) - env(safe-area-inset-bottom, 0px));
    padding: 0 14px calc(14px + env(safe-area-inset-bottom, 0px));
  }

  .mobile-bottom-nav {
    position: fixed;
    right: 10px;
    bottom: calc(var(--user-mobile-nav-gap, 10px) + env(safe-area-inset-bottom, 0px));
    left: 10px;
    z-index: 55;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
    min-height: 60px;
    padding: 6px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 14px 38px rgba(15, 23, 42, 0.16);
    backdrop-filter: blur(18px);
  }

  .mobile-bottom-nav__item {
    display: grid;
    place-items: center;
    gap: 3px;
    min-width: 0;
    min-height: 48px;
    padding: 4px 2px;
    border-radius: 8px;
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
    line-height: 1.15;

    svg {
      flex: 0 0 auto;
    }

    span {
      max-width: 100%;
      overflow: hidden;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &.is-active {
      background: #dbeafe;
      color: #1d4ed8;
    }
  }

  .mobile-current-section {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    max-width: 100%;
    min-height: 28px;
    padding: 0 9px;
    overflow: hidden;
    border: 1px solid #dbeafe;
    border-radius: 8px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (max-width: 374px) {
  .mobile-current-section {
    min-width: 0;
    padding: 0 6px;
    font-size: 11px;
  }
}
</style>
