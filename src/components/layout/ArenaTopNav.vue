<template>
  <header class="arena-top-nav">
    <div class="arena-top-nav__inner">
      <button class="arena-top-nav__brand" type="button" aria-label="返回今天" @click="go('/dashboard')">
        <span class="arena-top-nav__mark">C</span>
        <strong>CodeCoachAI</strong>
      </button>

      <nav ref="desktopNavRoot" class="arena-top-nav__desktop-links" aria-label="用户端主导航">
        <div
          v-for="group in visibleNavigationGroups"
          :key="group.key"
          class="arena-top-nav__group"
          :class="{ 'arena-top-nav__group--compact-overflow': group.compactOverflow }"
        >
          <button
            class="arena-top-nav__link arena-top-nav__link--primary"
            :class="{ 'is-active': activeGroup?.key === group.key }"
            type="button"
            :aria-current="activeGroup?.key === group.key ? 'page' : undefined"
            @click="go(group.path)"
          >
            <span>{{ group.label }}</span>
          </button>
          <button
            class="arena-top-nav__link arena-top-nav__link--toggle"
            :class="{ 'is-active': activeGroup?.key === group.key }"
            type="button"
            :data-nav-trigger="group.key"
            :aria-label="`展开${group.label}菜单`"
            aria-haspopup="menu"
            :aria-expanded="openDesktopKey === group.key"
            :aria-controls="`arena-nav-menu-${group.key}`"
            @click="toggleDesktopMenu(group.key)"
            @keydown="handleDesktopTriggerKeydown($event, group.key)"
          >
            <ChevronDown :size="13" aria-hidden="true" />
          </button>

          <Transition name="arena-nav-menu">
            <section
              v-if="openDesktopKey === group.key"
              :id="`arena-nav-menu-${group.key}`"
              class="arena-top-nav__menu"
              role="menu"
              :aria-label="`${group.label}导航`"
              @keydown="handleMenuKeydown($event, group.key)"
            >
              <header class="arena-top-nav__menu-header">
                <strong>{{ group.label }}</strong>
                <span>{{ group.description }}</span>
              </header>
              <button
                v-for="item in group.items"
                :key="item.key"
                class="arena-top-nav__menu-item"
                :class="{ 'is-active': activeItem?.item.key === item.key }"
                type="button"
                role="menuitem"
                :data-nav-menu-item="group.key"
                :data-nav-path="item.path"
                :aria-current="activeItem?.item.key === item.key ? 'page' : undefined"
                @click="go(item.path)"
              >
                <component :is="item.icon" :size="17" aria-hidden="true" />
                <span>
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.description }}</small>
                </span>
              </button>
            </section>
          </Transition>
        </div>

        <div class="arena-top-nav__group arena-top-nav__overflow">
          <button
            class="arena-top-nav__link"
            :class="{ 'is-active': isOverflowActive }"
            type="button"
            data-nav-trigger="more"
            :aria-current="isOverflowActive ? 'page' : undefined"
            aria-haspopup="menu"
            :aria-expanded="openDesktopKey === 'more'"
            aria-controls="arena-nav-menu-more"
            @click="toggleDesktopMenu('more')"
            @keydown="handleDesktopTriggerKeydown($event, 'more')"
          >
            <MoreHorizontal :size="16" aria-hidden="true" />
            <span>更多</span>
          </button>

          <Transition name="arena-nav-menu">
            <section
              v-if="openDesktopKey === 'more'"
              id="arena-nav-menu-more"
              class="arena-top-nav__menu arena-top-nav__menu--overflow"
              role="menu"
              aria-label="更多导航"
              @keydown="handleMenuKeydown($event, 'more')"
            >
              <section
                v-for="group in overflowNavigationGroups"
                :key="group.key"
                class="arena-top-nav__overflow-group"
                :aria-labelledby="`arena-overflow-${group.key}`"
              >
                <header>
                  <strong :id="`arena-overflow-${group.key}`">{{ group.label }}</strong>
                  <span>{{ group.description }}</span>
                </header>
                <button
                  v-for="item in group.items"
                  :key="item.key"
                  class="arena-top-nav__menu-item"
                  :class="{ 'is-active': activeItem?.item.key === item.key }"
                  type="button"
                  role="menuitem"
                  data-nav-menu-item="more"
                  :data-nav-path="item.path"
                  :aria-current="activeItem?.item.key === item.key ? 'page' : undefined"
                  @click="go(item.path)"
                >
                  <component :is="item.icon" :size="17" aria-hidden="true" />
                  <span>
                    <strong>{{ item.label }}</strong>
                    <small>{{ item.description }}</small>
                  </span>
                </button>
              </section>
            </section>
          </Transition>
        </div>
      </nav>

      <div class="arena-top-nav__tablet">
        <span class="arena-top-nav__tablet-title" :title="currentLabel">{{ currentLabel }}</span>
        <button
          class="arena-top-nav__tablet-menu"
          type="button"
          aria-label="打开全部功能"
          aria-haspopup="dialog"
          :aria-expanded="mobileMoreOpen"
          aria-controls="arena-mobile-more-panel"
          @click="toggleMobileMore"
        >
          <Menu :size="17" aria-hidden="true" />
          <span>全部功能</span>
        </button>
      </div>

      <div class="arena-top-nav__desktop-actions">
        <button
          class="arena-top-nav__chip arena-top-nav__chip--streak"
          type="button"
          :title="`已连续完成 ${gameProfile.streakDays} 天学习任务`"
          aria-label="返回今天查看连续完成记录"
          @click="go('/dashboard')"
        >
          连续 {{ gameProfile.streakDays }} 天
        </button>
        <button
          class="arena-top-nav__chip arena-top-nav__chip--xp"
          type="button"
          :title="`当前成长经验 ${formattedXp}`"
          aria-label="返回今天查看成长经验"
          @click="go('/dashboard')"
        >
          经验 {{ formattedXp }}
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
              练习
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
              连续 {{ gameProfile.streakDays }} 天
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

  <Transition name="arena-mobile-more">
    <div
      v-if="mobileMoreOpen"
      class="arena-mobile-more"
      role="presentation"
      @click.self="closeMobileMore(true)"
    >
      <section
        id="arena-mobile-more-panel"
        ref="mobileMorePanel"
        class="arena-mobile-more__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arena-mobile-more-title"
        @click.stop
        @keydown="handleMobileMenuKeydown"
      >
        <header class="arena-mobile-more__header">
          <div>
            <strong id="arena-mobile-more-title">全部功能</strong>
            <span>按求职阶段快速进入</span>
          </div>
          <button type="button" aria-label="关闭全部功能" @click="closeMobileMore(true)">
            <X :size="19" aria-hidden="true" />
          </button>
        </header>

        <div class="arena-mobile-more__groups">
          <section v-for="group in visibleNavigationGroups" :key="group.key" class="arena-mobile-more__group">
            <button
              class="arena-mobile-more__group-link"
              :class="{ 'is-active': activeGroup?.key === group.key }"
              type="button"
              :data-mobile-nav-group="group.path"
              @click="go(group.path)"
            >
              <component :is="group.icon" :size="17" aria-hidden="true" />
              <span>{{ group.label }}</span>
              <ChevronRight :size="16" aria-hidden="true" />
            </button>
            <div>
              <button
                v-for="item in group.items"
                :key="item.key"
                class="arena-mobile-more__item"
                :class="{ 'is-active': activeItem?.item.key === item.key }"
                type="button"
                :data-mobile-nav-item="item.path"
                :title="item.label"
                :aria-current="activeItem?.item.key === item.key ? 'page' : undefined"
                @click="go(item.path)"
              >
                <component :is="item.icon" :size="17" aria-hidden="true" />
                <span>{{ item.label }}</span>
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  </Transition>

  <nav class="arena-bottom-nav" aria-label="手机主导航">
    <button
      v-for="group in mobilePrimaryGroups"
      :key="group.key"
      class="arena-bottom-nav__item"
      :class="{ 'is-active': activeGroup?.key === group.key }"
      type="button"
      :aria-label="group.label"
      :aria-current="activeGroup?.key === group.key ? 'page' : undefined"
      @click="go(group.path)"
    >
      <component :is="group.icon" :size="18" aria-hidden="true" />
      <span>{{ group.mobileLabel }}</span>
    </button>
    <button
      class="arena-bottom-nav__item"
      :class="{ 'is-active': isMobileMoreActive || mobileMoreOpen }"
      type="button"
      aria-label="打开全部功能"
      :aria-current="isMobileMoreActive ? 'page' : undefined"
      aria-haspopup="dialog"
      :aria-expanded="mobileMoreOpen"
      aria-controls="arena-mobile-more-panel"
      @click="toggleMobileMore"
    >
      <MoreHorizontal :size="18" aria-hidden="true" />
      <span>更多</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { ChevronDown, ChevronRight, Menu, MoreHorizontal, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  getVisibleUserNavigationGroups,
  mobilePrimaryNavigationKeys,
  resolveUserNavigationGroup,
  resolveUserNavigationItem,
  type UserNavigationGroupKey
} from '@/config/userNavigation'
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

const router = useRouter()
const route = useRoute()
const gameProfile = useGameProfileStore()
const desktopNavRoot = ref<HTMLElement | null>(null)
const mobileMorePanel = ref<HTMLElement | null>(null)
const lastMobileMoreTrigger = ref<HTMLButtonElement | null>(null)
const openDesktopKey = ref<UserNavigationGroupKey | 'more' | null>(null)
const mobileMoreOpen = ref(false)
let previousBodyOverflow = ''

const visibleNavigationGroups = computed(() => getVisibleUserNavigationGroups())
const currentRoute = computed(() => ({
  name: route.name,
  path: route.path
}))
const activeItem = computed(() =>
  resolveUserNavigationItem(currentRoute.value, visibleNavigationGroups.value)
)
const activeGroup = computed(() =>
  resolveUserNavigationGroup(currentRoute.value, visibleNavigationGroups.value)
)
const overflowNavigationGroups = computed(() =>
  visibleNavigationGroups.value.filter((group) => group.compactOverflow)
)
const mobilePrimaryGroups = computed(() =>
  mobilePrimaryNavigationKeys
    .map((key) => visibleNavigationGroups.value.find((group) => group.key === key))
    .filter((group): group is NonNullable<typeof group> => Boolean(group))
)
const formattedXp = computed(() => gameProfile.xp.toLocaleString('zh-CN'))
const isOverflowActive = computed(() => Boolean(activeGroup.value?.compactOverflow))
const isMobileMoreActive = computed(() =>
  Boolean(activeGroup.value && !mobilePrimaryNavigationKeys.includes(activeGroup.value.key))
)
const currentLabel = computed(() => {
  return activeItem.value?.item.label
    || String(route.meta?.title || activeGroup.value?.label || '今日')
})

const mobileStatusKind = computed<'streak' | 'completion' | 'avatar' | 'reward' | 'ability' | 'match' | 'report'>(() => {
  if (route.path.startsWith('/resumes/') && !route.path.endsWith('/manage')) return 'completion'
  if (route.path.startsWith('/questions/practice')) return 'reward'
  if (route.path.startsWith('/resume-match')) return 'match'
  if (/^\/interviews\/\d+\/report$/.test(route.path)) return 'report'
  if (route.path.startsWith('/ability-map')) return 'ability'
  if (isMobileMoreActive.value) return 'avatar'
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
  return `返回今天查看连续完成 ${gameProfile.streakDays} 天的记录`
})

async function go(path: string) {
  closeDesktopMenu()
  closeMobileMore()
  await router.push(path)
}

function toggleDesktopMenu(key: UserNavigationGroupKey | 'more') {
  closeMobileMore()
  openDesktopKey.value = openDesktopKey.value === key ? null : key
}

function closeDesktopMenu(restoreFocus = false) {
  const previousKey = openDesktopKey.value
  if (!previousKey) return
  openDesktopKey.value = null

  if (restoreFocus) {
    void nextTick(() => {
      desktopNavRoot.value
        ?.querySelector<HTMLButtonElement>(`[data-nav-trigger="${previousKey}"]`)
        ?.focus()
    })
  }
}

function focusDesktopMenuItem(key: UserNavigationGroupKey | 'more', position: 'first' | 'last') {
  void nextTick(() => {
    const items = Array.from(
      desktopNavRoot.value?.querySelectorAll<HTMLButtonElement>(`[data-nav-menu-item="${key}"]`) || []
    )
    const target = position === 'first' ? items[0] : items[items.length - 1]
    target?.focus()
  })
}

function handleDesktopTriggerKeydown(
  event: KeyboardEvent,
  key: UserNavigationGroupKey | 'more'
) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    openDesktopKey.value = key
    focusDesktopMenuItem(key, event.key === 'ArrowDown' ? 'first' : 'last')
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    closeDesktopMenu(true)
  }
}

function handleMenuKeydown(
  event: KeyboardEvent,
  key: UserNavigationGroupKey | 'more'
) {
  const items = Array.from(
    desktopNavRoot.value?.querySelectorAll<HTMLButtonElement>(`[data-nav-menu-item="${key}"]`) || []
  )
  const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)

  if (event.key === 'Escape') {
    event.preventDefault()
    closeDesktopMenu(true)
    return
  }

  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || items.length === 0) return

  event.preventDefault()
  if (event.key === 'Home') {
    items[0]?.focus()
    return
  }
  if (event.key === 'End') {
    items[items.length - 1]?.focus()
    return
  }

  const direction = event.key === 'ArrowDown' ? 1 : -1
  const nextIndex = currentIndex < 0
    ? direction > 0 ? 0 : items.length - 1
    : (currentIndex + direction + items.length) % items.length
  items[nextIndex]?.focus()
}

function toggleMobileMore(event: MouseEvent) {
  lastMobileMoreTrigger.value = event.currentTarget as HTMLButtonElement

  if (mobileMoreOpen.value) {
    closeMobileMore(true)
    return
  }

  closeDesktopMenu()
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  mobileMoreOpen.value = true
  void nextTick(() => {
    mobileMorePanel.value?.querySelector<HTMLButtonElement>('[data-mobile-nav-item]')?.focus()
  })
}

function closeMobileMore(restoreFocus = false) {
  if (!mobileMoreOpen.value) return
  mobileMoreOpen.value = false
  document.body.style.overflow = previousBodyOverflow

  if (restoreFocus) {
    void nextTick(() => {
      lastMobileMoreTrigger.value?.focus()
    })
  }
}

function handleMobileMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMobileMore(true)
    return
  }

  if (event.key !== 'Tab') return

  const focusable = Array.from(
    mobileMorePanel.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []
  )
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
    return
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!openDesktopKey.value) return
  if (desktopNavRoot.value?.contains(event.target as Node)) return
  closeDesktopMenu()
}

function handleUserCommand(command: string) {
  if (command === 'admin') {
    emit('go-admin')
    return
  }
  emit('user-command', command)
}

watch(
  () => route.fullPath,
  () => {
    closeDesktopMenu()
    closeMobileMore()
  }
)

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
  if (mobileMoreOpen.value) {
    document.body.style.overflow = previousBodyOverflow
  }
})

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (mobileMoreOpen.value) {
    closeMobileMore(true)
    return
  }
  closeDesktopMenu(true)
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
.arena-top-nav__avatar-button,
.arena-top-nav__mobile-status,
.arena-bottom-nav__item,
.arena-top-nav__menu-item,
.arena-mobile-more button {
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
  align-items: center;
  gap: 4px;
  margin-left: 22px;
}

.arena-top-nav__group {
  position: relative;
  display: flex;
  align-items: center;
}

.arena-top-nav__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 36px;
  padding: 8px 11px;
  border-radius: 11px;
  background: transparent;
  color: var(--arena-sub);
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;

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

.arena-top-nav__link--primary {
  border-radius: 11px 6px 6px 11px;
  padding-right: 8px;
}

.arena-top-nav__link--toggle {
  width: 24px;
  padding: 0;
  border-radius: 6px 11px 11px 6px;
}

.arena-top-nav__link--primary + .arena-top-nav__link--toggle {
  margin-left: -3px;
}

.arena-top-nav__overflow {
  display: none;
}

.arena-top-nav__menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  z-index: 60;
  display: grid;
  width: 310px;
  max-height: min(68vh, 560px);
  gap: 4px;
  padding: 8px;
  overflow-y: auto;
  border: 1px solid var(--arena-line);
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 8px 14px rgba(21, 33, 27, 0.12);
}

.arena-top-nav__menu::before {
  position: absolute;
  top: -10px;
  right: 0;
  left: 0;
  height: 10px;
  content: '';
}

.arena-top-nav__menu-header,
.arena-top-nav__overflow-group > header {
  display: grid;
  gap: 2px;
  padding: 7px 9px 8px;

  strong {
    color: var(--arena-ink);
    font-size: 13px;
    font-weight: 850;
  }

  span {
    color: var(--arena-mut);
    font-size: 11px;
    line-height: 1.45;
  }
}

.arena-top-nav__menu-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 8px 9px;
  border-radius: 8px;
  background: transparent;
  color: var(--arena-sub);
  text-align: left;

  > svg {
    margin-top: 2px;
    color: var(--arena-mut);
  }

  > span {
    display: grid;
    min-width: 0;
    gap: 2px;
  }

  strong {
    color: inherit;
    font-size: 12.5px;
    font-weight: 800;
  }

  small {
    color: var(--arena-mut);
    font-size: 10.5px;
    line-height: 1.4;
  }

  &:hover,
  &:focus-visible,
  &.is-active {
    background: var(--arena-grn-soft);
    color: var(--arena-grn-d);
    outline: 0;

    > svg,
    small {
      color: var(--arena-action);
    }
  }

  &:focus-visible {
    box-shadow: inset 0 0 0 2px var(--arena-grn);
  }
}

.arena-top-nav__menu--overflow {
  position: fixed;
  top: 70px;
  right: 0;
  left: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: min(760px, calc(100vw - 40px));
  max-height: min(72vh, 610px);
  margin-inline: auto;
  gap: 8px;
}

.arena-top-nav__overflow-group {
  min-width: 0;
}

.arena-nav-menu-enter-active,
.arena-nav-menu-leave-active {
  transition:
    opacity 160ms ease,
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.arena-nav-menu-enter-from,
.arena-nav-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.arena-top-nav__desktop-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.arena-top-nav__chip {
  min-height: 32px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
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

.arena-top-nav__tablet,
.arena-top-nav__mobile,
.arena-bottom-nav,
.arena-mobile-more {
  display: none;
}

@media (max-width: 1280px) and (min-width: 721px) {
  .arena-top-nav__group--compact-overflow {
    display: none;
  }

  .arena-top-nav__overflow {
    display: block;
  }
}

@media (max-width: 900px) {
  .arena-mobile-more {
    position: fixed;
    inset: 0;
    z-index: 55;
    display: flex;
    background: rgba(21, 33, 27, 0.32);
  }

  .arena-mobile-more__panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    width: min(100%, 520px);
    max-height: min(78vh, 680px);
    overflow: hidden;
    border: 1px solid var(--arena-line);
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 8px 14px rgba(21, 33, 27, 0.14);
  }

  .arena-mobile-more__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 13px 14px;
    border-bottom: 1px solid var(--arena-line);

    > div {
      display: grid;
      gap: 2px;
    }

    strong {
      color: var(--arena-ink);
      font-size: 14px;
      font-weight: 850;
    }

    span {
      color: var(--arena-mut);
      font-size: 11px;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: transparent;
      color: var(--arena-sub);

      &:hover,
      &:focus-visible {
        background: var(--arena-line2);
        color: var(--arena-ink);
        outline: 0;
      }
    }
  }

  .arena-mobile-more__groups {
    display: grid;
    gap: 14px;
    padding: 12px;
    overflow-y: auto;
  }

  .arena-mobile-more__group {
    display: grid;
    gap: 6px;

    > div {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }
  }

  .arena-mobile-more__group-link,
  .arena-mobile-more__item {
    min-width: 0;
    border-radius: 8px;
    color: var(--arena-sub);
    text-align: left;

    span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &.is-active,
    &:hover,
    &:focus-visible {
      background: var(--arena-grn-soft);
      color: var(--arena-grn-d);
      outline: 0;
    }

    &:focus-visible {
      box-shadow: inset 0 0 0 2px var(--arena-grn);
    }
  }

  .arena-mobile-more__group-link {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) 18px;
    align-items: center;
    gap: 7px;
    min-height: 38px;
    padding: 7px 9px;
    background: transparent;
    font-size: 12px;
    font-weight: 850;
  }

  .arena-mobile-more__item {
    display: flex;
    align-items: center;
    gap: 7px;
    min-height: 42px;
    padding: 8px 9px;
    background: var(--arena-line2);

    span {
      font-size: 11.5px;
      font-weight: 750;
    }
  }

  .arena-mobile-more-enter-active,
  .arena-mobile-more-leave-active {
    transition: opacity 160ms ease;
  }

  .arena-mobile-more-enter-active .arena-mobile-more__panel,
  .arena-mobile-more-leave-active .arena-mobile-more__panel {
    transition: transform 190ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .arena-mobile-more-enter-from,
  .arena-mobile-more-leave-to {
    opacity: 0;
  }
}

@media (max-width: 900px) and (min-width: 721px) {
  .arena-top-nav__inner {
    padding-inline: 18px;
  }

  .arena-top-nav__brand strong {
    display: none;
  }

  .arena-top-nav__desktop-links {
    display: none;
  }

  .arena-top-nav__tablet {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 12px;
    min-width: 0;
    margin-left: 12px;
  }

  .arena-top-nav__tablet-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--arena-ink);
    font-size: 14px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .arena-top-nav__tablet-menu {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 40px;
    padding: 0 12px;
    border-radius: 8px;
    background: var(--arena-line2);
    color: var(--arena-sub);
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;

    &:hover,
    &:focus-visible,
    &[aria-expanded='true'] {
      background: var(--arena-grn-soft);
      color: var(--arena-grn-d);
      outline: 0;
    }

    &:focus-visible {
      box-shadow: inset 0 0 0 2px var(--arena-grn);
    }
  }

  .arena-top-nav__desktop-actions {
    gap: 0;
    margin-left: 8px;
  }

  .arena-top-nav__chip--streak,
  .arena-top-nav__chip--xp {
    display: none;
  }

  .arena-top-nav__avatar-button {
    width: 40px;
    height: 40px;
  }

  .arena-mobile-more {
    align-items: stretch;
    justify-content: flex-end;
    padding-top: 62px;
  }

  .arena-mobile-more__panel {
    width: min(420px, 100vw);
    height: calc(100vh - 62px);
    max-height: none;
    border-top: 0;
    border-right: 0;
    border-bottom: 0;
    border-radius: 0;
  }

  .arena-mobile-more__groups {
    padding: 16px;
  }

  .arena-mobile-more-enter-from .arena-mobile-more__panel,
  .arena-mobile-more-leave-to .arena-mobile-more__panel {
    transform: translateX(12px);
  }
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

  .arena-mobile-more {
    align-items: flex-end;
    justify-content: center;
    padding: 54px 8px calc(68px + env(safe-area-inset-bottom));
  }

  .arena-mobile-more__panel {
    width: min(100%, 520px);
    max-height: min(78vh, 680px);
    border-radius: 12px;
  }

  .arena-mobile-more-enter-from .arena-mobile-more__panel,
  .arena-mobile-more-leave-to .arena-mobile-more__panel {
    transform: translateY(10px);
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

@media (prefers-reduced-motion: reduce) {
  .arena-nav-menu-enter-active,
  .arena-nav-menu-leave-active,
  .arena-mobile-more-enter-active,
  .arena-mobile-more-leave-active,
  .arena-mobile-more-enter-active .arena-mobile-more__panel,
  .arena-mobile-more-leave-active .arena-mobile-more__panel {
    transition-duration: 0.01ms;
  }
}
</style>
