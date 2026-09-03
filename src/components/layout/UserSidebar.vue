<template>
  <nav class="user-sidebar-nav" :class="{ 'is-collapsed': sidebarProps.collapsed }" aria-label="用户端主导航">
    <template v-for="row in visibleRows" :key="row.key">
      <p v-if="row.section && !sidebarProps.collapsed" class="user-sidebar-nav__section">{{ row.section }}</p>
      <section
        class="user-sidebar-nav__group"
        :class="{ 'is-first-in-section': Boolean(row.section), 'is-open': !sidebarProps.collapsed && isOpen(row.group.key) }"
      >
        <RouterLink
          class="user-sidebar-nav__group-link"
          :class="{ 'is-active': activeGroup?.key === row.group.key }"
          :to="row.group.path"
          :title="sidebarProps.collapsed ? row.group.label : undefined"
          :aria-current="activeGroup?.key === row.group.key ? 'page' : undefined"
          :aria-expanded="!sidebarProps.collapsed && row.group.items.length ? isOpen(row.group.key) : undefined"
        >
          <component :is="row.group.icon" :size="18" aria-hidden="true" />
          <span>{{ row.group.label }}</span>
          <small v-if="badgeOf(row.group) && !sidebarProps.collapsed" class="user-sidebar-nav__badge">{{ badgeOf(row.group) }}</small>
          <ChevronDown
            v-if="!sidebarProps.collapsed && row.group.items.length"
            class="user-sidebar-nav__chevron"
            :size="15"
            aria-hidden="true"
          />
        </RouterLink>
        <div v-if="!sidebarProps.collapsed && isOpen(row.group.key)" class="user-sidebar-nav__items">
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
import { ChevronDown } from 'lucide-vue-next'
import { computed } from 'vue'
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
// 先按子项匹配；组落地页（如 /resumes 本身）不属于任何子项，按组路径前缀兜底，
// 保证 accordion 的展开组始终跟随当前路由。
const activeGroup = computed(() => {
  const fromItem = resolveUserNavigationGroup(routeContext.value, visibleGroups.value)
  if (fromItem) return fromItem
  const routePath = routeContext.value.path
  return (
    visibleGroups.value.find((group) => {
      const basePath = String(group.path || '').split(/[?#]/, 1)[0]
      return Boolean(basePath) && (routePath === basePath || routePath.startsWith(`${basePath}/`))
    }) ?? null
  )
})

// v21 原型侧边栏是 accordion：只有当前所在模块展开子菜单。
// 点击分组行即导航，展开状态完全跟随路由，不需要单独的折叠小按钮。
const isOpen = (key: string) => activeGroup.value?.key === key

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
  position: relative;
  flex: 1 1 auto;
  gap: 10px;
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--user-radius-md, 10px);
  font-size: 13px;
  font-weight: 600;
}

.user-sidebar-nav__group-link:hover,
.user-sidebar-nav__group-link:focus-visible,
.user-sidebar-nav__item:hover,
.user-sidebar-nav__item:focus-visible {
  background: var(--user-surface-muted, #f0efeb);
  color: var(--user-text, #1a1917);
}

.user-sidebar-nav__group-link:focus-visible,
.user-sidebar-nav__item:focus-visible {
  outline: 0;
}

// v21 侧栏 active 态：tint 底 + 主色文字 + 1px 内描边 + 左侧色条（忠于原型 .sb-item.active::before）
.user-sidebar-nav__group-link.is-active {
  background: var(--user-primary-soft, #eaf2ef);
  border-color: var(--user-primary-border, rgba(31, 111, 92, 0.28));
  color: var(--user-primary, #1f6f5c);
}

// 左侧色条：对照原型 .sb-item.active::before（3px 主色条，top/bottom 内缩 8px 避让圆角）。
.user-sidebar-nav__group-link.is-active::before {
  content: "";
  position: absolute;
  left: -3px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background: var(--user-primary, #1f6f5c);
  border-radius: 2px;
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
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--user-danger-soft, #fbeeee);
  color: var(--user-danger, #b03a3a);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}

.user-sidebar-nav__chevron {
  flex: none;
  color: var(--user-text-subtle, #a8a29a);
  transform: rotate(-90deg);
  transition: transform 180ms ease, color 150ms ease;
}

.user-sidebar-nav__group.is-open .user-sidebar-nav__chevron {
  transform: rotate(0deg);
}

.user-sidebar-nav__group-link.is-active .user-sidebar-nav__chevron {
  color: var(--user-primary, #1f6f5c);
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
.user-sidebar-nav.is-collapsed .user-sidebar-nav__chevron,
.user-sidebar-nav.is-collapsed .user-sidebar-nav__items {
  display: none;
}

// 折叠态仅保留 tint 底区分 active，隐藏左侧色条（图标居中时色条会脱离视觉锚点）。
.user-sidebar-nav.is-collapsed .user-sidebar-nav__group-link.is-active::before {
  display: none;
}

@media (max-width: 1023px) {
  .user-sidebar-nav {
    padding-inline: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .user-sidebar-nav__group-link,
  .user-sidebar-nav__item,
  .user-sidebar-nav__chevron {
    transition: none;
  }
}
</style>
