<template>
  <nav class="user-sidebar-nav" :class="{ 'is-collapsed': sidebarProps.collapsed }" aria-label="用户端主导航">
    <template v-for="row in visibleRows" :key="row.key">
      <p v-if="row.section && !sidebarProps.collapsed" class="user-sidebar-nav__section">{{ row.section }}</p>
      <section
        class="user-sidebar-nav__group"
        :class="{ 'is-first-in-section': Boolean(row.section) }"
      >
        <div
          class="user-sidebar-nav__group-row"
          :class="{ 'is-active': activeGroup?.key === row.group.key }"
        >
          <RouterLink
            class="user-sidebar-nav__group-link"
            :to="row.group.path"
            :title="collapsed ? row.group.label : undefined"
            :aria-current="activeGroup?.key === row.group.key ? 'page' : undefined"
          >
            <component :is="row.group.icon" :size="18" aria-hidden="true" />
            <span>{{ row.group.label }}</span>
            <small v-if="badgeOf(row.group) && !sidebarProps.collapsed" class="user-sidebar-nav__badge">{{ badgeOf(row.group) }}</small>
          </RouterLink>
          <button
            v-if="!sidebarProps.collapsed && row.group.items.length"
            type="button"
            class="user-sidebar-nav__toggle"
            :aria-expanded="isExpanded(row.group.key)"
            :aria-label="`切换「${row.group.label}」子菜单`"
            @click="toggleGroup(row.group.key)"
          >
            <ChevronDown v-if="isExpanded(row.group.key)" :size="14" aria-hidden="true" />
            <ChevronRight v-else :size="14" aria-hidden="true" />
          </button>
        </div>
        <div v-if="!collapsed && isExpanded(row.group.key)" class="user-sidebar-nav__items">
          <RouterLink
            v-for="item in row.group.items"
            :key="item.key"
            class="user-sidebar-nav__item"
            :class="{ 'is-active': activeItem?.item.key === item.key }"
            :to="item.path"
            :aria-current="activeItem?.item.key === item.key ? 'page' : undefined"
          >
            <component :is="item.icon" :size="15" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </div>
      </section>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  getVisibleUserNavigationGroups,
  resolveUserNavigationGroup,
  resolveUserNavigationItem,
  type UserNavigationGroup
} from '@/config/userNavigation'

const sidebarProps = withDefaults(defineProps<{
  collapsed?: boolean
  /** 组 key → 徽标数（仅展示真实业务数据，无数据的组不显示） */
  badges?: Record<string, string | number>
}>(), { collapsed: false, badges: () => ({}) })

const route = useRoute()
const visibleGroups = computed(() => getVisibleUserNavigationGroups())
const routeContext = computed(() => ({
  name: route.name,
  path: String(route.path || route.fullPath || '/').split(/[?#]/, 1)[0] || '/'
}))
const activeItem = computed(() => resolveUserNavigationItem(routeContext.value, visibleGroups.value))
const activeGroup = computed(() => resolveUserNavigationGroup(routeContext.value, visibleGroups.value))

// v21 原型侧边栏的两级分组标题（文档相关/原型/dashboard-redesign.html）
const SECTION_BY_GROUP: Partial<Record<UserNavigationGroup['key'], string>> = {
  today: '主流程',
  prepare: '求职准备'
}

interface SidebarRow {
  key: string
  group: UserNavigationGroup
  section?: string
}

const visibleRows = computed<SidebarRow[]>(() => {
  const rows: SidebarRow[] = []
  let lastSection: string | undefined
  for (const group of visibleGroups.value) {
    const section = SECTION_BY_GROUP[group.key]
    rows.push({ key: group.key, group, section: section && section !== lastSection ? section : undefined })
    lastSection = section ?? lastSection
  }
  return rows
})

const badgeOf = (group: UserNavigationGroup) => {
  const value = sidebarProps.badges?.[group.key]
  return value === undefined || value === '' || value === 0 ? undefined : value
}

const EXPANDED_KEY = 'codecoachai:user-sidebar-expanded-groups'

const readExpandedGroups = (): Set<string> | null => {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as unknown
    const keys = Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : []
    return new Set(keys)
  } catch {
    return null
  }
}

// 在 setup 阶段同步恢复展开状态，先于下方 immediate watcher 运行；
// 否则 watcher 会先把（空的）集合持久化，导致“首次访问展开全部”永远不生效。
// 区分“从未持久化（默认展开全部）”与“用户主动全部收起（尊重空集合）”。
const persistedGroups = readExpandedGroups()
const expandedGroups = ref<Set<string>>(
  persistedGroups ?? new Set(visibleGroups.value.map((group) => group.key))
)

const saveExpandedGroups = () => {
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...expandedGroups.value]))
  } catch {
    // ignore storage errors
  }
}

const isExpanded = (key: string) => expandedGroups.value.has(key)

const toggleGroup = (key: string) => {
  if (isExpanded(key)) {
    expandedGroups.value.delete(key)
  } else {
    expandedGroups.value.add(key)
  }
  saveExpandedGroups()
}

// Auto-expand the active group so users always see where they are
watch(
  activeGroup,
  (group) => {
    if (group && !isExpanded(group.key)) {
      expandedGroups.value.add(group.key)
      saveExpandedGroups()
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.user-sidebar-nav {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 6px;
  overflow: auto;
  padding: 14px 10px;
  scrollbar-width: thin;
}

.user-sidebar-nav__section {
  margin: 6px 0 0;
  padding: 0 10px;
  color: var(--user-text-subtle, #a8a29a);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.user-sidebar-nav__group {
  min-width: 0;
}

.user-sidebar-nav__group.is-first-in-section {
  margin-top: 4px;
}

.user-sidebar-nav__group-row {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 40px;
  padding-right: 6px;
  border: 1px solid transparent;
  border-radius: var(--user-radius-md, 10px);
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
}

// 链接热区铺满整行（保留旧「点任意位置即导航」交互），toggle 在其上独立可点
.user-sidebar-nav__group-link::after {
  content: '';
  position: absolute;
  inset: 0;
}

.user-sidebar-nav__group-link,
.user-sidebar-nav__item {
  display: flex;
  align-items: center;
  min-width: 0;
  color: var(--user-text-secondary, #57534e);
  text-decoration: none;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
}

.user-sidebar-nav__group-link {
  flex: 1 1 auto;
  gap: 10px;
  min-height: 38px;
  padding: 0 4px 0 10px;
  border-radius: var(--user-radius-md, 10px);
  font-size: 13px;
  font-weight: 600;
}

.user-sidebar-nav__group-row:hover,
.user-sidebar-nav__group-row:focus-within {
  background: var(--user-surface-muted, #f0efeb);
}

.user-sidebar-nav__group-row:hover .user-sidebar-nav__group-link,
.user-sidebar-nav__item:hover,
.user-sidebar-nav__item:focus-visible {
  color: var(--user-text, #1a1917);
}

.user-sidebar-nav__group-link:focus-visible,
.user-sidebar-nav__item:focus-visible {
  outline: 0;
}

// v21 侧栏 active 态：tint 底 + 主色文字 + 1px 内描边（不做左侧色条）
.user-sidebar-nav__group-row.is-active {
  background: var(--user-primary-soft, #eaf2ef);
  border-color: var(--user-primary-border, rgba(31, 111, 92, 0.28));
}

.user-sidebar-nav__group-row.is-active .user-sidebar-nav__group-link {
  color: var(--user-primary, #1f6f5c);
}

.user-sidebar-nav__group-link span,
.user-sidebar-nav__item span {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-sidebar-nav__badge {
  flex: none;
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--user-danger-soft, #fbeeee);
  color: var(--user-danger, #b03a3a);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}

.user-sidebar-nav__items {
  display: grid;
  gap: 2px;
  margin: 2px 0 6px 28px;
}

.user-sidebar-nav__item {
  gap: 8px;
  min-height: 32px;
  padding: 0 10px;
  border-radius: var(--user-radius-sm, 6px);
  color: var(--user-text-muted, #6e6963);
  font-size: 12px;
}

.user-sidebar-nav__item.is-active {
  background: var(--user-primary-soft, #eaf2ef);
  color: var(--user-primary, #1f6f5c);
  font-weight: 600;
}

.user-sidebar-nav__toggle {
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--user-text-subtle, #a8a29a);
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
}

.user-sidebar-nav__toggle:hover,
.user-sidebar-nav__toggle:focus-visible {
  background: var(--user-surface-muted, #f0efeb);
  color: var(--user-primary, #1f6f5c);
  outline: 0;
}

// ---- Collapsed (icon rail) state ----
.user-sidebar-nav.is-collapsed .user-sidebar-nav__section {
  display: none;
}

.user-sidebar-nav.is-collapsed .user-sidebar-nav__group-link {
  justify-content: center;
  gap: 0;
  padding: 0;
}

.user-sidebar-nav.is-collapsed .user-sidebar-nav__group-link span,
.user-sidebar-nav.is-collapsed .user-sidebar-nav__badge,
.user-sidebar-nav.is-collapsed .user-sidebar-nav__toggle,
.user-sidebar-nav.is-collapsed .user-sidebar-nav__items {
  display: none;
}

@media (max-width: 1023px) {
  .user-sidebar-nav {
    padding-inline: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .user-sidebar-nav__group-link,
  .user-sidebar-nav__item {
    transition: none;
  }
}
</style>
