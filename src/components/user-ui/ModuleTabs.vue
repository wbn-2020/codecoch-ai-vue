<template>
  <nav v-if="items.length" class="cc-module-tabs" :aria-label="ariaLabel">
      <RouterLink
      v-for="item in items"
      :key="item.key || item.to || item.label"
      class="cc-module-tabs__item"
      :class="{ 'is-active': isActive(item), 'is-disabled': item.disabled }"
      :to="item.disabled ? currentRoute.fullPath : item.to"
      :aria-current="isActive(item) ? 'page' : undefined"
      :aria-disabled="item.disabled || undefined"
      @click="handleClick(item, $event)"
    >
      <span>{{ item.label }}</span>
      <small v-if="item.badge !== undefined">{{ item.badge }}</small>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'

export interface ModuleTabItem {
  label: string
  to: string
  key?: string
  badge?: string | number
  disabled?: boolean
  exact?: boolean
  exactPaths?: string[]
  prefixes?: string[]
  routeNames?: string[]
}

const props = withDefaults(defineProps<{
  items: ModuleTabItem[]
  ariaLabel?: string
}>(), {
  ariaLabel: '模块导航'
})

const instance = getCurrentInstance()
const currentRoute = computed(() => instance?.proxy?.$route || { path: '', fullPath: '', name: undefined })
const routePath = computed(() => currentRoute.value.path)
const routeName = computed(() => String(currentRoute.value.name || ''))

const matchesPrefix = (path: string, prefix: string) =>
  path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)

const getMatchScore = (item: ModuleTabItem) => {
  if (item.routeNames?.includes(routeName.value)) return 30_000

  const exactPaths = [...new Set([item.to, ...(item.exactPaths || [])])]
  const exactPath = exactPaths.find((path) => routePath.value === path)
  if (exactPath) return 20_000 + exactPath.length

  const prefix = (item.prefixes || [])
    .filter((candidate) => matchesPrefix(routePath.value, candidate))
    .sort((left, right) => right.length - left.length)[0]
  if (prefix) return 10_000 + prefix.length

  if (!item.exact && matchesPrefix(routePath.value, item.to)) return item.to.length
  return 0
}

const isActive = (item: ModuleTabItem) => {
  const itemScore = getMatchScore(item)
  if (!itemScore) return false

  return itemScore === Math.max(...props.items.map(getMatchScore))
}

const handleClick = (item: ModuleTabItem, event: MouseEvent) => {
  if (item.disabled) event.preventDefault()
}
</script>

<style scoped lang="scss">
// v21 · 原型式 segmented 子导航：容器 hairline + sunken 底，active 白底浮起
.cc-module-tabs {
  display: inline-flex;
  gap: 2px;
  max-width: 100%;
  padding: 4px;
  overflow-x: auto;
  border: 1px solid var(--user-border, #e3e0da);
  border-radius: var(--user-radius-md, 10px);
  background: var(--user-surface-muted, #f0efeb);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.cc-module-tabs__item {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 14px;
  border-radius: 7px;
  color: var(--user-text-muted, #6e6963);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.cc-module-tabs__item:hover {
  color: var(--user-text, #1a1917);
  background: var(--user-primary-faint, rgba(31, 111, 92, 0.08));
}

.cc-module-tabs__item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--user-accent-ring, rgba(31, 111, 92, 0.22));
}

.cc-module-tabs__item.is-active {
  background: var(--user-surface, #ffffff);
  color: var(--user-primary, #1f6f5c);
  font-weight: 600;
  box-shadow: var(--user-shadow-sm, 0 2px 4px rgba(26, 25, 23, 0.04));
}

.cc-module-tabs__item.is-active::after {
  content: '';
  position: absolute;
  right: 14px;
  bottom: 5px;
  left: 14px;
  height: 2px;
  border-radius: 2px;
  background: var(--user-primary, #1f6f5c);
  opacity: 0.9;
}

.cc-module-tabs__item.is-disabled {
  color: var(--user-disabled, #a8a29a);
  cursor: not-allowed;
}

small {
  display: inline-grid;
  min-width: 18px;
  height: 18px;
  place-items: center;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--user-primary-soft, #eaf2ef);
  color: var(--user-primary, #1f6f5c);
  font-size: 11px;
  line-height: 1;
}
</style>
