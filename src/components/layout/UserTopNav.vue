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
        <button
          class="game-chip game-chip--streak"
          type="button"
          :title="`连胜 ${gameProfile.streakDays} 天，今天也要完成一关`"
          aria-label="查看连胜"
          @click="go('/dashboard')"
        >
          🔥 <span>{{ gameProfile.streakDays }}</span>
        </button>
        <button
          class="game-chip game-chip--xp"
          type="button"
          :title="`LV.${gameProfile.levelInfo.level} ${gameProfile.levelInfo.title} · ${formattedXp} 经验`"
          aria-label="查看我的经验"
          @click="go('/dashboard')"
        >
          ◆ <span>{{ formattedXp }}</span>
        </button>
        <button class="command-button" type="button" aria-label="打开命令面板" @click="$emit('open-command')">
          <Search :size="15" />
          <span>搜索</span>
        </button>

        <div ref="moreRoot" class="desktop-more">
          <button
            ref="moreTrigger"
            class="more-button"
            :class="{ 'is-active': moreOpen }"
            type="button"
            aria-label="打开全部功能导航"
            aria-haspopup="true"
            :aria-expanded="moreOpen"
            aria-controls="user-feature-nav-panel"
            @click="toggleMore"
          >
            <Wrench :size="17" />
            <span>工具</span>
          </button>

          <Transition name="feature-nav">
            <section
              v-if="moreOpen"
              id="user-feature-nav-panel"
              class="feature-nav-panel"
              role="navigation"
              aria-label="工具导航"
            >
              <div class="feature-nav-panel__head">
                <strong>工具</strong>
                <button class="feature-nav-close" type="button" aria-label="关闭全部功能导航" @click="closeMore(true)">
                  <X :size="17" />
                </button>
              </div>

              <div class="feature-nav-grid">
                <section
                  v-for="group in navigationGroups"
                  :key="group.key"
                  class="feature-nav-group"
                  :aria-labelledby="`feature-nav-${group.key}`"
                >
                  <h2 :id="`feature-nav-${group.key}`" class="feature-nav-group__title">{{ group.label }}</h2>
                  <div class="feature-nav-group__items">
                    <button
                      v-for="link in group.links"
                      :key="link.path"
                      class="feature-nav-item"
                      :class="{ 'is-active': isLinkActive(link) }"
                      type="button"
                      :data-nav-path="link.path"
                      :aria-current="isLinkActive(link) ? 'page' : undefined"
                      @click="go(link.path)"
                    >
                      <span class="feature-nav-item__icon">
                        <component :is="link.icon" :size="17" />
                      </span>
                      <span class="feature-nav-item__copy">
                        <strong class="feature-nav-item__title">{{ link.label }}</strong>
                        <small class="feature-nav-item__desc">{{ link.desc }}</small>
                      </span>
                    </button>
                  </div>
                </section>
              </div>
            </section>
          </Transition>
        </div>

        <el-tooltip :content="notificationTooltip" placement="bottom">
          <button class="icon-button" type="button" aria-label="通知中心" @click="go('/notifications')">
            <Bell :size="17" />
            <span v-if="unreadAvailable && unreadCount > 0" class="notification-badge">
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </button>
        </el-tooltip>

        <el-dropdown trigger="click" @command="handleUserCommand">
          <button class="user-trigger" type="button" :aria-label="`打开 ${displayName} 的账户菜单`">
            <el-avatar :size="30" :src="avatarUrl || ''">
              {{ avatarText }}
            </el-avatar>
            <span class="user-trigger__name">{{ displayName }}</span>
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

        <button
          ref="mobileTrigger"
          class="mobile-toggle"
          type="button"
          :aria-label="mobileOpen ? '关闭全部功能' : '打开全部功能'"
          aria-haspopup="dialog"
          :aria-expanded="mobileOpen"
          aria-controls="user-mobile-panel"
          @click="toggleMobile"
        >
          <X v-if="mobileOpen" :size="19" />
          <Menu v-else :size="19" />
        </button>
      </div>
    </div>

    <Transition name="mobile-nav">
      <div
        v-if="mobileOpen"
        class="mobile-nav-modal"
        role="presentation"
        @click.self="closeMobile(true)"
      >
        <section
          id="user-mobile-panel"
          ref="mobilePanel"
          class="mobile-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-mobile-panel-title"
          @click.stop
        >
          <header class="mobile-panel__header">
            <strong id="user-mobile-panel-title">工具</strong>
            <button
              class="mobile-modal-close"
              type="button"
              aria-label="关闭全部功能"
              @click="closeMobile(true)"
            >
              <X :size="20" />
            </button>
          </header>

          <nav class="mobile-primary-nav" aria-label="全部功能主入口">
            <button
              v-for="item in navItems"
              :key="item.key"
              class="mobile-nav-item"
              :class="{ 'is-active': isActive(item) }"
              type="button"
              :aria-current="isActive(item) ? 'page' : undefined"
              @click="go(item.path)"
            >
              <span class="mobile-nav-item__main">
                <component :is="item.icon" :size="17" />
                <strong>{{ item.label }}</strong>
              </span>
              <small>{{ item.desc }}</small>
            </button>
          </nav>

          <div class="mobile-feature-groups" aria-label="全部功能">
          <section v-for="group in navigationGroups" :key="group.key" class="mobile-feature-group">
            <h2 class="mobile-feature-group__title">{{ group.label }}</h2>
            <div class="mobile-feature-group__items">
              <button
                v-for="link in group.links"
                :key="link.path"
                class="feature-nav-item"
                :class="{ 'is-active': isLinkActive(link) }"
                type="button"
                :data-nav-path="link.path"
                :aria-current="isLinkActive(link) ? 'page' : undefined"
                @click="go(link.path)"
              >
                <span class="feature-nav-item__icon">
                  <component :is="link.icon" :size="17" />
                </span>
                <span class="feature-nav-item__copy">
                  <strong class="feature-nav-item__title">{{ link.label }}</strong>
                  <small class="feature-nav-item__desc">{{ link.desc }}</small>
                </span>
              </button>
            </div>
          </section>
          </div>
        </section>
        </div>
    </Transition>

    <nav
      class="mobile-bottom-nav"
      aria-label="手机主导航"
      :aria-hidden="mobileOpen || undefined"
      :inert="mobileOpen"
      :class="{ 'is-modal-open': mobileOpen }"
    >
      <button
        v-for="item in mobilePrimaryItems"
        :key="item.key"
        class="mobile-bottom-nav__item"
        :class="{ 'is-active': isActive(item) }"
        type="button"
        :aria-label="item.label"
        :aria-current="isActive(item) ? 'page' : undefined"
        :title="item.label"
        @click="goFromBottom(item.path)"
      >
        <component :is="item.icon" :size="18" />
        <span>{{ item.mobileLabel }}</span>
      </button>
      <button
        class="mobile-bottom-nav__item"
        :class="{ 'is-active': mobileOpen }"
        type="button"
        aria-label="打开工具面板"
        :aria-expanded="mobileOpen"
        aria-controls="user-mobile-panel"
        title="工具"
        @click="toggleMobile"
      >
        <Wrench :size="18" />
        <span>工具</span>
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import {
  Activity,
  Bell,
  BookOpenCheck,
  Brain,
  BriefcaseBusiness,
  CalendarCheck2,
  ChartNoAxesCombined,
  ClipboardCheck,
  Compass,
  FileText,
  Files,
  FlaskConical,
  FolderKanban,
  GraduationCap,
  History,
  Library,
  Menu,
  MessageSquare,
  PackageCheck,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  Wrench,
  X
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { appConfig } from '@/config'
import { useGameProfileStore } from '@/features/game-profile'
import { isV4PreviewAccessEnabled } from '@/features/route-safety'
import { useAuthStore } from '@/stores/auth'

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

interface FeatureLink {
  label: string
  desc: string
  path: string
  icon: Component
  matches?: string[]
  previewOnly?: boolean
  featureFlag?: 'v4Preview' | 'v4Growth' | 'v4Knowledge' | 'v6WeeklyReport' | 'v9EvidenceLearning'
}

interface FeatureGroup {
  key: string
  label: string
  links: FeatureLink[]
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const gameProfile = useGameProfileStore()
const mobileOpen = ref(false)
const mobileTrigger = ref<HTMLButtonElement>()
const mobilePanel = ref<HTMLElement>()
const moreOpen = ref(false)
const moreRoot = ref<HTMLElement | null>(null)
const moreTrigger = ref<HTMLButtonElement | null>(null)
let previousBodyOverflow = ''

const navItems: NavItem[] = [
  {
    key: 'today',
    label: '今天',
    mobileLabel: '今天',
    desc: '今日闯关、连胜和战力进度',
    path: '/dashboard',
    icon: Target,
    matches: ['/dashboard', '/onboarding', '/agent']
  },
  {
    key: 'prepare',
    label: '准备',
    mobileLabel: '准备',
    desc: '简历、目标岗位、JD 匹配和项目证据',
    path: '/resumes',
    icon: FileText,
    matches: ['/resumes', '/job-targets', '/resume-match', '/project-evidence', '/evidence-assets', '/projects', '/application-packages']
  },
  {
    key: 'train',
    label: '训练',
    mobileLabel: '训练',
    desc: '推荐题组、专项练习、错题和收藏',
    path: '/questions/recommendations',
    icon: BookOpenCheck,
    matches: ['/questions', '/study-plans']
  },
  {
    key: 'interview',
    label: '面试',
    mobileLabel: '面试',
    desc: '推荐开练、面试房间、复盘记录和报告',
    path: '/interviews/create',
    icon: MessageSquare,
    matches: ['/interviews']
  }
]

const mobilePrimaryItems = navItems

const baseNavigationGroups: FeatureGroup[] = [
  {
    key: 'today',
    label: '今日推进',
    links: [
      {
        label: '今日任务',
        desc: '查看优先级、提醒和下一步行动',
        path: '/agent/today',
        icon: CalendarCheck2,
        matches: ['/agent/today', '/agent/runs']
      },
      {
        label: 'AI 任务中心',
        desc: '跟踪待办、执行状态和反馈',
        path: '/agent/tasks',
        icon: ClipboardCheck
      },
      {
        label: '投递管理',
        desc: '维护投递阶段、跟进时间和归因',
        path: '/applications',
        icon: BriefcaseBusiness
      },
      {
        label: '求职日历',
        desc: '查看跨投递的安排、提醒和事件准备',
        path: '/career-calendar',
        icon: CalendarCheck2
      },
      {
        label: '求职实验台',
        desc: '管理实验分组、策略和复盘结果',
        path: '/job-experiments',
        icon: FlaskConical
      }
    ]
  },
  {
    key: 'assets',
    label: '求职资产',
    links: [
      {
        label: '岗位目标',
        desc: '维护目标岗位和 JD 要求',
        path: '/job-targets',
        icon: Target
      },
      {
        label: '简历管理',
        desc: '创建、编辑和管理简历版本',
        path: '/resumes/manage',
        icon: Files
      },
      {
        label: '项目证据',
        desc: '沉淀项目素材和能力证据',
        path: '/project-evidence',
        icon: FolderKanban
      },
      {
        label: '证据使用',
        desc: '回看实际使用、结果反馈和待确认观察',
        path: '/evidence-assets',
        icon: ClipboardCheck,
        featureFlag: 'v9EvidenceLearning'
      },
      {
        label: 'JD 匹配',
        desc: '比较岗位要求与简历证据',
        path: '/resume-match',
        icon: Search
      },
      {
        label: '投递包',
        desc: '组合简历、材料和导出文件',
        path: '/application-packages',
        icon: PackageCheck
      },
      {
        label: '个人知识库',
        desc: '管理可供 AI 使用的个人资料',
        path: '/knowledge',
        icon: Library,
        featureFlag: 'v4Knowledge'
      }
    ]
  },
  {
    key: 'training',
    label: '训练复盘',
    links: [
      {
        label: '专项训练房间',
        desc: '按主题连续练习并即时复盘',
        path: '/questions/practice',
        icon: BookOpenCheck
      },
      {
        label: '错题复盘',
        desc: '集中回顾薄弱题目和错误原因',
        path: '/questions/wrong-records',
        icon: RotateCcw
      },
      {
        label: '收藏复习',
        desc: '快速返回已收藏的重点题目',
        path: '/questions/favorites',
        icon: Star
      },
      {
        label: '面试复盘记录',
        desc: '查看面试报告、复练和多轮比较',
        path: '/interviews/history',
        icon: History
      },
      {
        label: '训练分析',
        desc: '查看训练效果和个人趋势',
        path: '/analytics/personal',
        icon: ChartNoAxesCombined
      },
      {
        label: '学习计划',
        desc: '安排短板学习与阶段性任务',
        path: '/study-plans',
        icon: GraduationCap
      }
    ]
  },
  {
    key: 'arena',
    label: '竞技场',
    links: [
      {
        label: '排行榜',
        desc: '经验与连胜排名，看看谁最能打',
        path: '/arena/leaderboard',
        icon: Trophy,
        matches: ['/arena/leaderboard']
      },
      {
        label: '多人竞技',
        desc: '1v1 答题对战，冲击段位',
        path: '/arena/battle',
        icon: Swords,
        matches: ['/arena/battle']
      }
    ]
  },
  {
    key: 'growth',
    label: '成长与支持',
    links: [
      {
        label: '求职周报',
        desc: '查看本周事实、变化和下一步行动',
        path: '/agent/weekly-reports',
        icon: ChartNoAxesCombined,
        featureFlag: 'v6WeeklyReport'
      },
      {
        label: '成长档案',
        desc: '查看能力、就绪度和长期趋势',
        path: '/growth/profile',
        icon: TrendingUp,
        featureFlag: 'v4Growth'
      },
      {
        label: '每日复盘',
        desc: '回顾行动完成情况和关键反馈',
        path: '/agent/reviews',
        icon: ClipboardCheck,
        featureFlag: 'v4Growth'
      },
      {
        label: '长期记忆',
        desc: '管理 Agent 使用的长期上下文',
        path: '/agent/memory',
        icon: Brain,
        featureFlag: 'v4Growth'
      },
      {
        label: '薄弱点分析',
        desc: '定位知识和训练中的能力缺口',
        path: '/weakness-analysis',
        icon: Activity
      },
      {
        label: '记录与工具',
        desc: '集中查看记录和常用求职工具',
        path: '/tools',
        icon: Wrench
      },
      {
        label: '作品集演示',
        desc: '整理可展示的项目与成果',
        path: '/portfolio-demo',
        icon: Sparkles
      },
      {
        label: '新手引导',
        desc: '补充基础资料并完成首次设置',
        path: '/onboarding',
        icon: Compass
      }
    ]
  }
]

const isFeatureLinkVisible = (link: FeatureLink) => {
  if (link.previewOnly && !isV4PreviewAccessEnabled()) return false
  if (link.featureFlag === 'v4Preview') return isV4PreviewAccessEnabled()
  if (link.featureFlag === 'v4Growth') return appConfig.enableV4GrowthPreview
  if (link.featureFlag === 'v4Knowledge') return appConfig.enableV4KnowledgePreview
  if (link.featureFlag === 'v6WeeklyReport') return appConfig.enableV6WeeklyReport
  if (link.featureFlag === 'v9EvidenceLearning') return appConfig.enableV9EvidenceLearning
  return true
}

const navigationGroups = computed<FeatureGroup[]>(() =>
  baseNavigationGroups
    .map((group) => ({
      ...group,
      links: group.links.filter(isFeatureLinkVisible)
    }))
    .filter((group) => group.links.length > 0)
)

const currentMobileNavLabel = computed(() => {
  const activeFeature = navigationGroups.value
    .flatMap((group) => group.links)
    .find((link) => isLinkActive(link))
  return activeFeature?.label
    || navItems.find((item) => isActive(item))?.label
    || String(route.meta?.title || '今天')
})

const isActive = (item: NavItem) => {
  return item.matches.some((prefix) => route.path.startsWith(prefix))
}

const formattedXp = computed(() => gameProfile.xp.toLocaleString('zh-CN'))

const isLinkActive = (link: FeatureLink) => {
  const prefixes = link.matches || [link.path]
  return prefixes.some((prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`))
}

const go = async (path: string) => {
  mobileOpen.value = false
  moreOpen.value = false
  await router.push(path)
}

const goFromBottom = (path: string) => {
  if (mobileOpen.value) return
  void go(path)
}

const handleUserCommand = (command: string) => {
  emit('user-command', command)
}

const toggleMore = () => {
  mobileOpen.value = false
  moreOpen.value = !moreOpen.value
}

const closeMore = (restoreFocus = false) => {
  if (!moreOpen.value) return
  moreOpen.value = false
  if (restoreFocus) {
    void nextTick(() => moreTrigger.value?.focus())
  }
}

const toggleMobile = () => {
  moreOpen.value = false
  if (mobileOpen.value) {
    closeMobile(true)
    return
  }
  mobileOpen.value = true
  void nextTick(() => {
    mobilePanel.value?.querySelector<HTMLButtonElement>('.mobile-modal-close')?.focus()
  })
}

const closeMobile = (restoreFocus = false) => {
  if (!mobileOpen.value) return
  mobileOpen.value = false
  if (restoreFocus) {
    void nextTick(() => mobileTrigger.value?.focus())
  }
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  const target = event.target
  if (moreOpen.value && target instanceof Node && !moreRoot.value?.contains(target)) {
    moreOpen.value = false
  }
}

const handleDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Tab' && mobileOpen.value && mobilePanel.value) {
    const focusable = Array.from(
      mobilePanel.value.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
      )
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (first && last && event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (first && last && !event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
    return
  }
  if (event.key !== 'Escape') return
  if (moreOpen.value) {
    event.preventDefault()
    closeMore(true)
    return
  }
  if (mobileOpen.value) {
    event.preventDefault()
    closeMobile(true)
  }
}

watch(mobileOpen, (open) => {
  if (open) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }
  document.body.style.overflow = previousBodyOverflow
})

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
    moreOpen.value = false
  }
)

watch(
  () => authStore.userInfo?.id,
  (userId) => {
    if (userId == null) {
      gameProfile.resetSession()
      return
    }
    gameProfile.hydrate(userId)
  },
  { immediate: true }
)

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<style scoped lang="scss">
.jobcoach-top-nav {
  position: sticky;
  top: 0;
  z-index: 40;
  min-height: var(--user-mobile-top-height, 64px);
  overflow: visible;
  border-bottom: 1px solid var(--user-border);
  background: var(--user-bg-panel);
  color: var(--user-text);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.22);
}

.topnav-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(100%, 1440px);
  min-height: 64px;
  margin: 0 auto;
  padding: 0 24px;
}

.brand,
.nav-item,
.priority-link,
.command-button,
.more-button,
.feature-nav-close,
.mobile-modal-close,
.feature-nav-item,
.icon-button,
.admin-button,
.user-trigger,
.mobile-toggle,
.mobile-nav-item {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.brand,
.nav-item,
.priority-link,
.command-button,
.more-button,
.feature-nav-close,
.mobile-modal-close,
.feature-nav-item,
.icon-button,
.admin-button,
.user-trigger,
.mobile-toggle,
.mobile-nav-item,
.mobile-bottom-nav__item {
  &:focus-visible {
    outline: 2px solid var(--user-primary);
    outline-offset: 2px;
  }
}

.brand {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  min-width: 168px;
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
  background: var(--user-primary);
  color: var(--user-primary-contrast);
  font-weight: 800;
  box-shadow: none;
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
  gap: 2px;
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
  padding: 0 9px;
  border-radius: 8px;
  color: var(--user-text-secondary);
  font-size: 14px;
  transition:
    background 0.16s ease,
    color 0.16s ease,
    box-shadow 0.16s ease;

  span {
    overflow-wrap: anywhere;
  }

  &:hover {
    background: rgba(110, 168, 254, 0.09);
    color: var(--user-primary);
  }

  &.is-active {
    background: var(--user-primary-soft);
    color: var(--user-text);
    font-weight: 700;
    box-shadow: inset 0 0 0 1px var(--user-primary-border);
  }
}

.priority-nav {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  padding-left: 8px;
  border-left: 1px solid var(--user-border);
}

.priority-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 9px;
  border-radius: 8px;
  color: var(--user-text-secondary);
  font-size: 13px;
  white-space: nowrap;
  transition:
    background 0.16s ease,
    color 0.16s ease;

  &:hover,
  &.is-active {
    background: var(--user-primary-soft);
    color: var(--user-primary);
  }

  &.is-active {
    box-shadow: inset 0 0 0 1px var(--user-primary-border);
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

  &:hover {
    border-color: var(--user-primary-border);
    background: rgba(110, 168, 254, 0.09);
    color: var(--user-primary);
  }
}

.more-button.is-active {
  border-color: var(--user-primary-border);
  background: var(--user-primary-soft);
  color: var(--user-primary);
}

.desktop-more {
  position: relative;
  display: inline-flex;
}

.feature-nav-panel {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 70;
  width: min(900px, calc(100vw - 32px));
  max-height: calc(100vh - 86px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-bg-panel);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.32);
}

.feature-nav-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 14px 0 18px;
  border-bottom: 1px solid var(--user-border);

  strong {
    color: var(--user-text);
    font-size: 14px;
  }
}

.feature-nav-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  color: var(--user-text-muted);

  &:hover {
    background: var(--user-primary-faint);
    color: var(--user-primary);
  }
}

.feature-nav-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  padding: 14px 10px 16px;
}

.feature-nav-group {
  min-width: 0;
  padding: 0 8px;

  & + & {
    border-left: 1px solid var(--user-border);
  }
}

.feature-nav-group__title,
.mobile-feature-group__title {
  margin: 0;
  color: var(--user-text-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.feature-nav-group__title {
  padding: 2px 8px 8px;
}

.feature-nav-group__items {
  display: grid;
  gap: 2px;
}

.feature-nav-item {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 9px;
  width: 100%;
  min-width: 0;
  min-height: 54px;
  padding: 7px 8px;
  border-radius: 8px;
  text-align: left;
  transition:
    background 0.16s ease,
    color 0.16s ease;

  &:hover {
    background: var(--user-primary-faint);
  }

  &.is-active {
    background: var(--user-primary-soft);

    .feature-nav-item__icon,
    .feature-nav-item__title {
      color: var(--user-primary);
    }
  }
}

.feature-nav-item__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--user-surface-raised);
  color: var(--user-text-muted);
}

.feature-nav-item__copy {
  display: grid;
  align-content: center;
  gap: 2px;
  min-width: 0;
}

.feature-nav-item__title,
.feature-nav-item__desc {
  min-width: 0;
  overflow-wrap: anywhere;
}

.feature-nav-item__title {
  color: var(--user-text-secondary);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}

.feature-nav-item__desc {
  color: var(--user-text-muted);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.4;
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

  &:hover {
    border-color: var(--user-primary-border);
    background: rgba(110, 168, 254, 0.09);
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
  border: 1px solid rgba(148, 203, 255, 0.16);
  border-radius: 999px;
  background: rgba(7, 17, 31, 0.54);
  color: var(--user-text-secondary);

  span {
    min-width: 0;
    color: var(--user-text-secondary);
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  &:hover {
    border-color: var(--user-primary-border);
    background: rgba(110, 168, 254, 0.09);
    color: var(--user-primary);
  }
}

.mobile-toggle,
.mobile-panel,
.mobile-nav-modal,
.mobile-bottom-nav {
  display: none;
}

.feature-nav-enter-active,
.feature-nav-leave-active,
.mobile-nav-enter-active,
.mobile-nav-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.feature-nav-enter-from,
.feature-nav-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.mobile-nav-enter-from,
.mobile-nav-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 1360px) and (min-width: 1181px) {
  .priority-link,
  .command-button,
  .admin-button {
    width: 36px;
    padding: 0;

    span {
      display: none;
    }
  }
}

@media (max-width: 1260px) and (min-width: 1181px) {
  .brand {
    min-width: 40px;
  }

  .brand-copy,
  .user-trigger__name {
    display: none;
  }

  .user-trigger {
    width: 36px;
    padding: 2px;
  }
}

@media (max-width: 1180px) {
  .desktop-nav,
  .priority-nav,
  .desktop-more {
    display: none;
  }

  .topnav-inner {
    justify-content: space-between;
  }

  .mobile-toggle {
    display: inline-flex;
  }

  .mobile-nav-modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    justify-content: flex-end;
    background: rgba(4, 8, 14, 0.72);
  }

  .mobile-panel {
    display: grid;
    width: min(720px, 100%);
    height: 100%;
    align-content: start;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    border-left: 1px solid var(--user-border);
    background: var(--user-bg-panel);
    box-shadow: -8px 0 16px rgba(0, 0, 0, 0.34);
  }

  .mobile-panel__header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    min-height: 58px;
    align-items: center;
    justify-content: space-between;
    padding: 0 18px;
    border-bottom: 1px solid var(--user-border);
    background: var(--user-bg-panel);

    strong {
      color: var(--user-text);
      font-size: 16px;
    }
  }

  .mobile-modal-close {
    display: inline-flex;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(148, 203, 255, 0.16);
    border-radius: 8px;
    background: rgba(7, 17, 31, 0.54);
    color: var(--user-text-secondary);

    &:hover {
      border-color: var(--user-primary-border);
      background: var(--user-primary-faint);
      color: var(--user-primary);
    }
  }

  .mobile-primary-nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding: 16px 24px 10px;
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
      background: rgba(110, 168, 254, 0.1);
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

  .mobile-feature-groups {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0;
    min-width: 0;
    margin: 6px 24px 18px;
    padding-top: 10px;
    border-top: 1px solid var(--user-border);
  }

  .mobile-feature-group {
    min-width: 0;
    padding: 12px 10px;

    &:nth-child(even) {
      border-left: 1px solid var(--user-border);
    }
  }

  .mobile-feature-group__title {
    padding: 0 8px 8px;
  }

  .mobile-feature-group__items {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2px;
  }
}

@media (max-width: 720px) {
  .jobcoach-top-nav {
    min-height: 58px;
  }

  .topnav-inner {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 8px;
    min-height: 58px;
    padding: 0 14px;
  }

  .brand {
    width: 44px;
    min-width: 0;
    min-height: 44px;
  }

  .brand-copy,
  .command-button,
  .desktop-more,
  .admin-button,
  .user-trigger__name {
    display: none;
  }

  .topnav-actions {
    gap: 6px;
    min-width: 0;
  }

  .icon-button,
  .mobile-toggle,
  .user-trigger {
    width: 44px;
    height: 44px;
    min-height: 44px;
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
    border: 1px solid var(--user-primary-border);
    border-radius: 8px;
    background: rgba(110, 168, 254, 0.1);
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .mobile-panel {
    width: 100%;
    border-left: 0;
  }

  .mobile-primary-nav {
    grid-template-columns: minmax(0, 1fr);
    padding: 14px;
  }

  .mobile-feature-groups {
    grid-template-columns: minmax(0, 1fr);
    margin: 6px 14px calc(14px + env(safe-area-inset-bottom, 0px));
  }

  .mobile-feature-group {
    padding: 12px 0;

    & + &,
    &:nth-child(even) {
      border-top: 1px solid var(--user-border);
      border-left: 0;
    }
  }

  .mobile-feature-group__items {
    grid-template-columns: minmax(0, 1fr);
  }

  .feature-nav-item {
    min-height: 52px;
    padding: 7px 8px;
  }

  .mobile-bottom-nav {
    position: fixed;
    box-sizing: border-box;
    right: 10px;
    bottom: calc(var(--user-mobile-nav-gap, 8px) + env(safe-area-inset-bottom, 0px));
    left: 10px;
    z-index: 55;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
    height: var(--user-mobile-nav-height, 60px);
    padding: 5px;
    overflow: hidden;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-bg-panel);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);

    &.is-modal-open {
      visibility: hidden;
      pointer-events: none;
    }
  }

  .mobile-bottom-nav__item {
    display: grid;
    place-items: center;
    gap: 3px;
    min-width: 0;
    min-height: 44px;
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
      display: block;
      max-width: 100%;
      overflow-wrap: anywhere;
      line-height: 1.15;
      text-align: center;
    }

    &.is-active {
      background: var(--user-primary-soft);
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

@media (prefers-reduced-motion: reduce) {
  .feature-nav-enter-active,
  .feature-nav-leave-active,
  .mobile-nav-enter-active,
  .mobile-nav-leave-active {
    transition: opacity 0.01ms linear;
  }

  .feature-nav-enter-from,
  .feature-nav-leave-to,
  .mobile-nav-enter-from,
  .mobile-nav-leave-to {
    transform: none;
  }
}

/* ============================================================
   Arena 浅色化覆写 · 方向 D 霓虹竞技场 Phase V1
   仅覆写顶栏/面板/底栏外观色，不改变布局与交互。
   存量暗色变量规则保留在前，同特异性下本块后定义胜出。
   ============================================================ */
.jobcoach-top-nav {
  border-bottom: 1.5px solid #e4eae5;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px);
  color: #15211b;
  box-shadow: 0 1px 3px rgba(21, 33, 27, 0.05);
}

.brand-mark {
  border-radius: 10px;
  background: linear-gradient(135deg, #17b26a, #a3e635);
  color: #fff;
  box-shadow: 0 3px 0 #0e9f5d;
}

.brand-copy strong {
  color: #15211b;
}
.brand-copy span {
  color: #9aa79f;
}

.nav-item {
  border-radius: 11px;
  color: #5f6e66;
  font-weight: 700;

  &:hover {
    background: rgba(23, 178, 106, 0.08);
    color: #0e9f5d;
  }

  &.is-active {
    background: rgba(23, 178, 106, 0.13);
    color: #0e9f5d;
    font-weight: 800;
    box-shadow: none;
  }
}

.game-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 30px;
  padding: 0 11px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.12s ease;

  &:hover {
    transform: translateY(-1px);
  }
}
.game-chip--streak {
  background: rgba(247, 144, 9, 0.13);
  color: #f79009;
}
.game-chip--xp {
  background: rgba(23, 178, 106, 0.13);
  color: #0e9f5d;
}

.command-button,
.more-button,
.icon-button,
.mobile-toggle,
.user-trigger {
  border: 1px solid #e4eae5;
  background: #fff;
  color: #5f6e66;

  &:hover {
    border-color: #17b26a;
    background: rgba(23, 178, 106, 0.06);
    color: #0e9f5d;
  }
}

.user-trigger span {
  color: #15211b;
}

.feature-nav-panel {
  border: 1.5px solid #e4eae5;
  border-radius: 16px;
  background: #fff;
  color: #15211b;
  box-shadow: 0 16px 40px rgba(21, 33, 27, 0.12);
}

.feature-nav-group__title {
  color: #9aa79f;
}

.feature-nav-item {
  border-radius: 12px;

  &:hover {
    background: rgba(23, 178, 106, 0.07);
  }

  &.is-active {
    background: rgba(23, 178, 106, 0.13);
  }
}

.feature-nav-item__title {
  color: #15211b;
}
.feature-nav-item__desc {
  color: #9aa79f;
}

.mobile-panel {
  background: #f5f7f4;
  color: #15211b;
}

.mobile-nav-modal {
  background: rgba(21, 33, 27, 0.42);
}

.mobile-current-section {
  border-color: rgba(23, 178, 106, 0.35);
  background: rgba(23, 178, 106, 0.13);
  color: #0e9f5d;
}

@media (max-width: 1180px) {
  .mobile-panel {
    border-left: 1px solid #e4eae5;
    background: #f5f7f4;
    box-shadow: -8px 0 16px rgba(21, 33, 27, 0.12);
  }
}

@media (max-width: 720px) {
  .mobile-bottom-nav {
    border-top: 1.5px solid #e4eae5;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(8px);
  }

  .mobile-bottom-nav__item {
    color: #9aa79f;

    &.is-active {
      color: #0e9f5d;
    }
  }

  .mobile-current-section {
    border-color: rgba(23, 178, 106, 0.35);
    background: rgba(23, 178, 106, 0.13);
    color: #0e9f5d;
  }
}
</style>
