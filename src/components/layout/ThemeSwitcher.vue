<template>
  <div ref="rootRef" class="theme-switcher">
    <button
      class="theme-switcher__trigger"
      type="button"
      :aria-expanded="open"
      aria-label="切换主题皮肤"
      title="主题皮肤"
      @click="open = !open"
    >
      <Palette :size="18" aria-hidden="true" />
    </button>

    <Transition name="theme-pop">
      <div v-if="open" class="theme-switcher__panel" role="menu" aria-label="主题皮肤">
        <div class="theme-switcher__head">
          <strong>主题皮肤</strong>
          <small>配色、圆角与阴影会一起切换，并自动记住你的选择</small>
        </div>

        <div class="theme-switcher__grid">
          <button
            v-for="preset in presets"
            :key="preset.id"
            type="button"
            class="theme-switcher__card"
            :class="{ 'is-active': preset.id === themeId }"
            role="menuitemradio"
            :aria-checked="preset.id === themeId"
            @click="selectTheme(preset.id)"
          >
            <span class="theme-switcher__preview">
              <i v-for="(color, index) in preset.swatch" :key="index" :style="{ background: color }" />
            </span>
            <span class="theme-switcher__meta">
              <b>{{ preset.label }}</b>
              <small>{{ preset.hint }}</small>
            </span>
            <span v-if="preset.scheme === 'dark'" class="theme-switcher__tag">深色</span>
            <Check v-if="preset.id === themeId" :size="16" class="theme-switcher__check" aria-hidden="true" />
          </button>
        </div>

        <div class="theme-switcher__foot">
          <span>当前：{{ currentTheme.label }}</span>
          <button type="button" @click="selectTheme(defaultThemePresetId)">恢复默认</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { Check, Palette } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { defaultThemePresetId } from '@/features/theme/presets'
import { useTheme } from '@/features/theme/useTheme'

const { presets, themeId, currentTheme, setTheme } = useTheme()
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const selectTheme = (id: string) => {
  setTheme(id)
  // 保留面板打开，方便连续对比不同皮肤
}

const handleOutsideClick = (event: MouseEvent) => {
  if (!open.value) return
  const target = event.target as Node | null
  if (target && rootRef.value?.contains(target)) return
  open.value = false
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped lang="scss">
.theme-switcher {
  position: relative;
  display: inline-flex;
}

.theme-switcher__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--user-text-secondary);
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;

  &:hover,
  &:focus-visible {
    background: var(--user-primary-soft);
    color: var(--user-primary);
    outline: 0;
  }
}

.theme-switcher__panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 60;
  width: min(340px, calc(100vw - 32px));
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-lg, 16px);
  background: var(--user-surface);
  box-shadow: var(--user-shadow-md);
}

.theme-switcher__head {
  display: grid;
  gap: 4px;
  margin-bottom: 12px;

  strong {
    color: var(--user-text);
    font-size: 14px;
  }

  small {
    color: var(--user-text-muted);
    font-size: 11.5px;
    line-height: 1.5;
  }
}

.theme-switcher__grid {
  display: grid;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.theme-switcher__card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 9px 10px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-md, 12px);
  background: var(--user-surface);
  color: var(--user-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;

  &:hover {
    border-color: var(--user-primary-border);
    background: var(--user-primary-faint);
  }

  &:focus-visible {
    outline: 2px solid var(--user-primary);
    outline-offset: 1px;
  }

  &.is-active {
    border-color: var(--user-primary);
    background: var(--user-primary-soft);
  }
}

.theme-switcher__preview {
  display: flex;
  flex: 0 0 auto;
  overflow: hidden;
  width: 40px;
  height: 28px;
  border: 1px solid var(--user-border);
  border-radius: 8px;

  i {
    flex: 1 1 0;
  }
}

.theme-switcher__meta {
  display: grid;
  min-width: 0;
  gap: 2px;

  b {
    font-size: 13px;
    font-weight: 600;
  }

  small {
    overflow: hidden;
    color: var(--user-text-muted);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.theme-switcher__tag {
  flex: 0 0 auto;
  margin-left: auto;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--user-surface-muted);
  color: var(--user-text-muted);
  font-size: 10px;
  font-weight: 600;
}

.theme-switcher__check {
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--user-primary);
}

.theme-switcher__card .theme-switcher__tag + .theme-switcher__check {
  margin-left: 4px;
}

.theme-switcher__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--user-border);

  span {
    color: var(--user-text-muted);
    font-size: 11.5px;
  }

  button {
    border: 1px solid var(--user-border);
    border-radius: 999px;
    background: transparent;
    color: var(--user-text-secondary);
    cursor: pointer;
    font: inherit;
    font-size: 11.5px;
    padding: 4px 10px;

    &:hover {
      border-color: var(--user-primary);
      color: var(--user-primary);
    }
  }
}

.theme-pop-enter-active,
.theme-pop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.theme-pop-enter-from,
.theme-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .theme-pop-enter-active,
  .theme-pop-leave-active {
    transition: none;
  }
}
</style>
