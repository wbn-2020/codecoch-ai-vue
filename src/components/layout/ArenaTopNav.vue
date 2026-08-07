<template>
  <header class="arena-top-nav">
    <div class="arena-top-nav__inner">
      <button class="arena-top-nav__brand" type="button" aria-label="返回今天" @click="go('/dashboard')">
        <span class="arena-top-nav__mark">C</span>
        <strong>CodeCoachAI</strong>
      </button>

      <nav class="arena-top-nav__desktop-links" aria-label="用户端主导航">
        <button
          v-for="item in primaryItems"
          :key="item.key"
          class="arena-top-nav__link"
          :class="{ 'is-active': isActive(item) }"
          type="button"
          :aria-current="isActive(item) ? 'page' : undefined"
          @click="go(item.path)"
        >
          {{ item.label }}
        </button>
      </nav>

      <div class="arena-top-nav__desktop-actions">
        <button
          class="arena-top-nav__chip arena-top-nav__chip--streak"
          type="button"
          :title="`连胜 ${gameProfile.streakDays} 天`"
          aria-label="返回今天查看连胜"
          @click="go('/dashboard')"
        >
          <span aria-hidden="true">🔥</span>
          {{ gameProfile.streakDays }}
        </button>
        <button
          class="arena-top-nav__chip arena-top-nav__chip--xp"
          type="button"
          :title="`LV.${gameProfile.levelInfo.level} ${gameProfile.levelInfo.title}，${formattedXp} 经验`"
          aria-label="返回今天查看经验"
          @click="go('/dashboard')"
        >
          <span aria-hidden="true">◆</span>
          {{ formattedXp }}
        </button>
        <button
          class="arena-top-nav__tools"
          :class="{ 'is-active': isToolsActive }"
          type="button"
          aria-label="前往记录与工具"
          @click="go('/tools')"
        >
          工具
        </button>
        <el-dropdown trigger="click" @command="handleUserCommand">
          <button class="arena-top-nav__avatar-button" type="button" :aria-label="`打开 ${displayName} 的账户菜单`">
            <el-avatar :size="32" :src="avatarUrl || ''">
              {{ avatarText }}
            </el-avatar>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人资料</el-dropdown-item>
              <el-dropdown-item command="password">修改密码</el-dropdown-item>
              <el-dropdown-item v-if="canAccessAdmin" command="admin">管理端</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <div class="arena-top-nav__mobile">
        <span class="arena-top-nav__mobile-title">{{ currentLabel }}</span>
        <div class="arena-top-nav__mobile-actions">
          <button
            v-if="mobileStatusKind !== 'avatar'"
            class="arena-top-nav__mobile-status"
            type="button"
            :aria-label="mobileStatusAriaLabel"
            @click="go(mobileStatusPath)"
          >
            <template v-if="mobileStatusKind === 'completion'">
              {{ completionLabel }}
            </template>
            <template v-else-if="mobileStatusKind === 'reward'">
              +18 / 题
            </template>
            <template v-else-if="mobileStatusKind === 'ability'">
              技能树
            </template>
            <template v-else-if="mobileStatusKind === 'match'">
              JD
            </template>
            <template v-else-if="mobileStatusKind === 'report'">
              报告
            </template>
            <template v-else>
              🔥 {{ gameProfile.streakDays }}
            </template>
          </button>
          <el-dropdown trigger="click" @command="handleUserCommand">
            <button
              class="arena-top-nav__mobile-avatar"
              type="button"
              :aria-label="`打开 ${displayName} 的账户菜单`"
            >
              <el-avatar :size="30" :src="avatarUrl || ''">
                {{ avatarText }}
              </el-avatar>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人资料</el-dropdown-item>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item v-if="canAccessAdmin" command="admin">管理端</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

  </header>

  <nav class="arena-bottom-nav" aria-label="手机主导航">
    <button
      v-for="item in primaryItems"
      :key="item.key"
      class="arena-bottom-nav__item"
      :class="{ 'is-active': isActive(item) }"
      type="button"
      :aria-current="isActive(item) ? 'page' : undefined"
      @click="go(item.path)"
    >
      <component :is="item.icon" :size="18" aria-hidden="true" />
      <span>{{ item.label }}</span>
    </button>
    <button
      class="arena-bottom-nav__item"
      :class="{ 'is-active': isBottomToolsActive }"
      type="button"
      :aria-current="isBottomToolsActive ? 'page' : undefined"
      @click="go('/tools')"
    >
      <Wrench :size="18" aria-hidden="true" />
      <span>工具</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import {
  BookOpenCheck,
  FileText,
  MessageSquare,
  Target,
  Wrench
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useGameProfileStore } from '@/features/game-profile'

const props = defineProps<{
  displayName: string
  avatarText: string
  avatarUrl?: string
  canAccessAdmin: boolean
}>()

const emit = defineEmits<{
  'go-admin': []
  'user-command': [command: string]
}>()

interface ArenaNavItem {
  key: 'today' | 'prepare' | 'train' | 'interview'
  label: string
  path: string
  matches: string[]
  icon: Component
}

const router = useRouter()
const route = useRoute()
const gameProfile = useGameProfileStore()

const primaryItems: ArenaNavItem[] = [
  {
    key: 'today',
    label: '今天',
    path: '/dashboard',
    matches: [
      '/dashboard',
      '/agent/today',
      '/agent/tasks'
    ],
    icon: Target
  },
  {
    key: 'prepare',
    label: '准备',
    path: '/resumes',
    matches: [
      '/resumes',
      '/job-targets',
      '/resume-match'
    ],
    icon: FileText
  },
  {
    key: 'train',
    label: '训练',
    path: '/questions/recommendations',
    matches: ['/questions', '/study-plans'],
    icon: BookOpenCheck
  },
  {
    key: 'interview',
    label: '面试',
    path: '/interviews/create',
    matches: ['/interviews'],
    icon: MessageSquare
  }
]

const formattedXp = computed(() => gameProfile.xp.toLocaleString('zh-CN'))
const toolRoutePrefixes = [
  '/tools',
  '/applications',
  '/career-calendar',
  '/project-evidence',
  '/application-packages',
  '/knowledge',
  '/ability-map',
  '/agent/weekly-reports',
  '/analytics/personal',
  '/agent/reviews',
  '/agent/memory',
  '/growth/profile',
  '/growth/skills',
  '/growth/readiness',
  '/weakness-analysis',
  '/job-experiments',
  '/portfolio-demo',
  '/onboarding',
  '/evidence-assets'
]
const isToolsActive = computed(() => toolRoutePrefixes.some((prefix) => matchesPath(prefix)))
const isBottomToolsActive = computed(() => isToolsActive.value)
const activePrimaryItem = computed(() => primaryItems.find((item) => isActive(item)))
const currentLabel = computed(() => {
  if (route.path === '/tools') return '工具'
  if (route.path === '/ability-map') return '能力图谱'
  if (isToolsActive.value) return String(route.meta?.title || '工具')
  if (route.path.startsWith('/resume-match')) return 'JD 匹配'
  if (/^\/interviews\/\d+\/report$/.test(route.path)) return '面试报告'
  return activePrimaryItem.value?.label || String(route.meta?.title || '今天')
})

const mobileStatusKind = computed<'streak' | 'completion' | 'avatar' | 'reward' | 'ability' | 'match' | 'report'>(() => {
  if (route.path.startsWith('/resumes/') && !route.path.endsWith('/manage')) return 'completion'
  if (route.path.startsWith('/questions/practice')) return 'reward'
  if (route.path.startsWith('/resume-match')) return 'match'
  if (/^\/interviews\/\d+\/report$/.test(route.path)) return 'report'
  if (route.path.startsWith('/ability-map')) return 'ability'
  if (isToolsActive.value) return 'avatar'
  return 'streak'
})

const completionLabel = computed(() => route.path.startsWith('/resumes/') ? '简历' : '进行中')
const mobileStatusPath = computed(() => {
  if (mobileStatusKind.value === 'avatar') return '/profile'
  if (mobileStatusKind.value === 'ability') return '/ability-map'
  if (mobileStatusKind.value === 'match') return '/resume-match'
  if (mobileStatusKind.value === 'report') return '/interviews/history'
  return '/dashboard'
})
const mobileStatusAriaLabel = computed(() => {
  if (mobileStatusKind.value === 'completion') return '返回今天查看当前进度'
  if (mobileStatusKind.value === 'avatar') return `打开 ${props.displayName} 的个人资料`
  if (mobileStatusKind.value === 'reward') return '返回今天查看训练进度'
  if (mobileStatusKind.value === 'ability') return '查看技能树状态'
  if (mobileStatusKind.value === 'match') return '查看 JD 匹配'
  if (mobileStatusKind.value === 'report') return '返回面试复盘记录'
  return `返回今天查看连胜 ${gameProfile.streakDays} 天`
})

function isActive(item: ArenaNavItem) {
  if (isToolsActive.value) return false
  return item.matches.some((prefix) => matchesPath(prefix))
}

function matchesPath(prefix: string) {
  return route.path === prefix || route.path.startsWith(`${prefix}/`)
}

async function go(path: string) {
  await router.push(path)
}

function handleUserCommand(command: string) {
  if (command === 'admin') {
    emit('go-admin')
    return
  }
  emit('user-command', command)
}
</script>

<style scoped lang="scss">
.arena-top-nav {
  position: sticky;
  top: 0;
  z-index: 40;
  min-height: 62px;
  border-bottom: 1.5px solid var(--arena-line);
  background: rgba(255, 255, 255, 0.78);
  color: var(--arena-ink);
  backdrop-filter: blur(6px);
}

.arena-top-nav__inner {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 62px;
  margin: 0 auto;
  padding: 0 30px;
}

.arena-top-nav__brand,
.arena-top-nav__link,
.arena-top-nav__chip,
.arena-top-nav__tools,
.arena-top-nav__avatar-button,
.arena-top-nav__mobile-status,
.arena-bottom-nav__item {
  border: 0;
  font: inherit;
  cursor: pointer;
}

.arena-top-nav__brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0;
  background: transparent;
  color: var(--arena-ink);
  font-size: 15px;
  font-weight: 900;
}

.arena-top-nav__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--arena-grn), var(--arena-lime));
  box-shadow: 0 3px 0 var(--arena-grn-d);
  color: #ffffff;
  font-size: 15px;
  font-weight: 900;
}

.arena-top-nav__desktop-links {
  display: flex;
  gap: 4px;
  margin-left: 22px;
}

.arena-top-nav__link {
  min-height: 36px;
  padding: 8px 14px;
  border-radius: 11px;
  background: transparent;
  color: var(--arena-sub);
  font-size: 13.5px;
  font-weight: 700;

  &:hover,
  &:focus-visible {
    background: var(--arena-grn-soft);
    color: var(--arena-grn-d);
    outline: 0;
  }

  &.is-active {
    background: var(--arena-grn-soft);
    color: var(--arena-grn-d);
    font-weight: 800;
  }
}

.arena-top-nav__desktop-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.arena-top-nav__chip,
.arena-top-nav__tools {
  min-height: 32px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.arena-top-nav__chip {
  padding: 0 10px;
}

.arena-top-nav__chip--streak {
  background: var(--arena-amber-soft);
  color: var(--user-warning-text);
}

.arena-top-nav__chip--xp {
  background: var(--arena-grn-soft);
  color: var(--arena-action);
}

.arena-top-nav__tools {
  padding: 0 10px;
  background: transparent;
  color: var(--arena-sub);

  &:hover,
  &:focus-visible {
    background: var(--arena-line2);
    color: var(--arena-ink);
    outline: 0;
  }

  &.is-active {
    min-height: 36px;
    border-radius: 10px;
    padding-inline: 10px;
    background: var(--arena-grn-soft);
    color: var(--arena-grn-d);
  }
}

.arena-top-nav__avatar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  background: transparent;

  :deep(.el-avatar) {
    border: 2px solid #ffffff;
    background: linear-gradient(135deg, var(--arena-grn), var(--arena-lime));
    box-shadow: 0 0 0 2px var(--arena-grn-soft);
    color: #ffffff;
    font-size: 13px;
    font-weight: 900;
  }
}

.arena-top-nav__mobile,
.arena-bottom-nav {
  display: none;
}

@media (max-width: 720px) {
  .arena-top-nav {
    min-height: 54px;
    background: rgba(255, 255, 255, 0.82);
  }

  .arena-top-nav__inner {
    min-height: 54px;
    padding: 0 14px;
  }

  .arena-top-nav__desktop-links,
  .arena-top-nav__desktop-actions {
    display: none;
  }

  .arena-top-nav__brand {
    gap: 7px;
  }

  .arena-top-nav__brand strong {
    display: none;
  }

  .arena-top-nav__mark {
    width: 28px;
    height: 28px;
    border-radius: 9px;
    font-size: 14px;
  }

  .arena-top-nav__mobile {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1;
    min-width: 0;
    margin-left: 9px;
  }

  .arena-top-nav__mobile-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 10px;
  }

  .arena-top-nav__mobile-title {
    overflow: hidden;
    color: var(--arena-ink);
    font-size: 14px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .arena-top-nav__mobile-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    min-height: 34px;
    margin-left: 0;
    padding: 0 8px;
    border-radius: 999px;
    background: var(--arena-amber-soft);
    color: var(--user-warning-text);
    font-size: 12px;
    font-weight: 800;

    :deep(.el-avatar) {
      background: linear-gradient(135deg, var(--arena-grn), var(--arena-lime));
      color: #ffffff;
      font-size: 12px;
      font-weight: 900;
    }
  }

  .arena-top-nav__mobile-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;

    :deep(.el-avatar) {
      background: linear-gradient(135deg, var(--arena-grn), var(--arena-lime));
      box-shadow: 0 0 0 2px var(--arena-grn-soft);
      color: #ffffff;
      font-size: 12px;
      font-weight: 900;
    }

    &:focus-visible {
      outline: 2px solid var(--arena-grn);
      outline-offset: 2px;
    }
  }

  .arena-bottom-nav {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 50;
    display: flex;
    min-height: calc(60px + env(safe-area-inset-bottom));
    padding: 7px 6px calc(7px + env(safe-area-inset-bottom));
    border-top: 1.5px solid var(--arena-line);
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(8px);
  }

  .arena-bottom-nav__item {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: 0;
    min-height: 44px;
    padding: 3px 0;
    background: transparent;
    color: var(--arena-mut);
    font-size: 10.5px;
    font-weight: 700;

    &.is-active {
      color: var(--arena-grn-d);
    }

    &:focus-visible {
      outline: 2px solid var(--arena-grn);
      outline-offset: -2px;
    }
  }
}
</style>
