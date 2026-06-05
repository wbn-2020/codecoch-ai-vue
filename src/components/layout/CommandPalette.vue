<template>
  <Teleport to="body">
    <Transition name="command-palette">
      <div v-if="modelValue" class="command-palette" @keydown="handleKeydown">
        <button class="command-palette__overlay" type="button" aria-label="Close command palette" @click="close" />
        <section
          class="command-palette__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <div class="command-palette__search">
            <Search :size="18" />
            <input
              ref="inputRef"
              v-model="keyword"
              type="text"
              placeholder="Search pages or commands"
              aria-label="Search commands"
              autocomplete="off"
            >
            <kbd>Esc</kbd>
          </div>

          <div class="command-palette__body">
            <button
              v-for="(command, index) in filteredCommands"
              :key="command.path"
              class="command-palette__item"
              :class="{ 'is-active': index === activeIndex }"
              type="button"
              @mouseenter="activeIndex = index"
              @click="selectCommand(command)"
            >
              <span class="command-palette__item-icon">
                <Command :size="16" />
              </span>
              <span class="command-palette__item-copy">
                <strong>{{ command.title }}</strong>
                <small>{{ command.group }}</small>
              </span>
              <span class="command-palette__item-path">{{ command.path }}</span>
            </button>

            <div v-if="!filteredCommands.length" class="command-palette__empty">
              没有匹配的命令
            </div>
          </div>

          <div class="command-palette__footer">
            <span><kbd>Up</kbd><kbd>Down</kbd> Select</span>
            <span><kbd>Enter</kbd> Open</span>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Command, Search } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter, type RouteRecordRaw } from 'vue-router'

import { routes } from '@/router/routes'
import { useAuthStore } from '@/stores/auth'

type PaletteScope = 'user' | 'admin'

interface CommandItem {
  title: string
  group: string
  path: string
  searchText: string
}

const props = defineProps<{
  modelValue: boolean
  scope: PaletteScope
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const router = useRouter()
const authStore = useAuthStore()

const keyword = ref('')
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const close = () => {
  emit('update:modelValue', false)
}

const normalizePath = (parentPath: string, childPath: string) => {
  if (!childPath) return parentPath || '/'
  if (childPath.startsWith('/')) return childPath
  const base = parentPath === '/' ? '' : parentPath
  return `${base}/${childPath}`.replace(/\/+/g, '/')
}

const hasDynamicSegment = (path: string) => path.split('/').some((segment) => segment.startsWith(':'))

const hasAdminPermission = (route: RouteRecordRaw) => {
  const permissions = route.meta?.requiredPermissions as string[] | string | undefined
  if (!permissions) return true
  if (Array.isArray(permissions)) {
    return authStore.hasAnyPermission(permissions.map(String))
  }
  return authStore.hasPermission(String(permissions))
}

const makeCommand = (route: RouteRecordRaw, parentPath: string, group: string): CommandItem | null => {
  if (route.redirect || route.meta?.hidden || !route.meta?.title) return null

  const path = normalizePath(parentPath, route.path)
  if (hasDynamicSegment(path)) return null

  const title = String(route.meta.title)
  return {
    title,
    group,
    path,
    searchText: `${title} ${group} ${path}`.toLowerCase()
  }
}

const userCommands = computed(() => {
  const userRoot = routes.find((route) => route.path === '/')
  return (userRoot?.children || [])
    .map((route) => makeCommand(route, '/', 'User'))
    .filter((command): command is CommandItem => Boolean(command))
})

const adminCommands = computed(() => {
  const adminRoot = routes.find((route) => route.path === '/admin')
  if (!authStore.canAccessAdmin) return []

  return (adminRoot?.children || [])
    .filter(hasAdminPermission)
    .map((route) => makeCommand(route, '/admin', 'Admin'))
    .filter((command): command is CommandItem => Boolean(command))
})

const commands = computed(() => props.scope === 'admin' ? adminCommands.value : userCommands.value)

const filteredCommands = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return commands.value
  return commands.value.filter((command) => command.searchText.includes(query))
})

watch(filteredCommands, () => {
  activeIndex.value = 0
})

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      keyword.value = ''
      activeIndex.value = 0
      return
    }

    await nextTick()
    inputRef.value?.focus()
  }
)

const selectCommand = async (command?: CommandItem) => {
  if (!command) return
  close()
  await router.push(command.path)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!filteredCommands.value.length) return
    activeIndex.value = (activeIndex.value + 1) % filteredCommands.value.length
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!filteredCommands.value.length) return
    activeIndex.value = (activeIndex.value - 1 + filteredCommands.value.length) % filteredCommands.value.length
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    selectCommand(filteredCommands.value[activeIndex.value])
  }
}

const handleGlobalKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    emit('update:modelValue', !props.modelValue)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped lang="scss">
.command-palette {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  justify-content: center;
  padding-top: min(12vh, 104px);
}

.command-palette__overlay {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(2, 6, 23, 0.64);
  backdrop-filter: blur(8px);
  cursor: default;
}

.command-palette__panel {
  position: relative;
  width: min(640px, calc(100vw - 48px));
  max-height: min(640px, calc(100vh - 120px));
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  background: #0f172a;
  box-shadow: 0 28px 80px rgba(2, 6, 23, 0.48);
  color: #e5e7eb;
}

.command-palette__search {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  color: #94a3b8;

  input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    color: #f8fafc;
    font-size: 15px;
  }

  input::placeholder {
    color: #64748b;
  }
}

.command-palette__body {
  max-height: min(456px, calc(100vh - 240px));
  overflow-y: auto;
  padding: 8px;
}

.command-palette__item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 54px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;

  &.is-active,
  &:hover {
    border-color: rgba(99, 102, 241, 0.36);
    background: rgba(99, 102, 241, 0.14);
  }
}

.command-palette__item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.9);
  color: #a5b4fc;
}

.command-palette__item-copy {
  min-width: 0;

  strong,
  small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #f8fafc;
    font-size: 14px;
    font-weight: 650;
  }

  small {
    margin-top: 3px;
    color: #94a3b8;
    font-size: 12px;
  }
}

.command-palette__item-path {
  max-width: 220px;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-palette__empty {
  padding: 32px 12px;
  color: #94a3b8;
  text-align: center;
}

.command-palette__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 10px 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  color: #94a3b8;
  font-size: 12px;
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  margin: 0 2px;
  padding: 0 6px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.9);
  color: #cbd5e1;
  font-family: inherit;
  font-size: 11px;
}

.command-palette-enter-active,
.command-palette-leave-active {
  transition: opacity 0.14s ease;

  .command-palette__panel {
    transition:
      opacity 0.14s ease,
      transform 0.14s ease;
  }
}

.command-palette-enter-from,
.command-palette-leave-to {
  opacity: 0;

  .command-palette__panel {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
}
</style>
