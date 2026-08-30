/**
 * 主题（皮肤）运行时。
 *
 * 采用「注入样式表」而非逐个 setProperty：
 *  - 注入的 <style> 位于 <head> 末尾，选择器与内置样式表一致但位置更靠后，
 *    因此能稳定覆盖内置的默认配色；
 *  - 切换主题只需替换一个节点的 textContent，无需遍历上百个变量。
 */

import { computed, ref } from 'vue'

import { buildThemeCss } from './themeCss'
import { defaultThemePresetId, findThemePreset, themePresets, type ThemePreset } from './presets'

const STORAGE_KEY = 'codecoachai:app-theme:v2'
const STYLE_ELEMENT_ID = 'app-skin-style'

const themeId = ref<string>(defaultThemePresetId)
let styleElement: HTMLStyleElement | null = null
let started = false

const readStoredThemeId = (): string => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultThemePresetId
    // 只接受存在的预设，避免旧数据指向已下线的皮肤
    return themePresets.some((preset) => preset.id === stored) ? stored : defaultThemePresetId
  } catch {
    return defaultThemePresetId
  }
}

const ensureStyleElement = (): HTMLStyleElement | null => {
  if (typeof document === 'undefined') return null
  if (styleElement && document.head.contains(styleElement)) return styleElement
  const existing = document.getElementById(STYLE_ELEMENT_ID)
  if (existing instanceof HTMLStyleElement) {
    styleElement = existing
    return styleElement
  }
  const element = document.createElement('style')
  element.id = STYLE_ELEMENT_ID
  element.setAttribute('data-generated-by', 'app-theme')
  document.head.appendChild(element)
  styleElement = element
  return element
}

export const applyTheme = (id: string) => {
  const preset = findThemePreset(id)
  themeId.value = preset.id

  const element = ensureStyleElement()
  if (element) element.textContent = buildThemeCss(preset)

  if (typeof document !== 'undefined') {
    document.body.dataset.appTheme = preset.id
    document.body.classList.toggle('app-skin-dark', preset.scheme === 'dark')
    document.documentElement.style.colorScheme = preset.scheme
  }

  try {
    localStorage.setItem(STORAGE_KEY, preset.id)
  } catch {
    // 隐私模式下写入失败可忽略，本次会话仍然生效
  }
}

/** 在应用启动时调用一次；重复调用安全。 */
export const initAppTheme = () => {
  if (started) return
  started = true
  applyTheme(readStoredThemeId())
}

export const useTheme = () => {
  const currentTheme = computed<ThemePreset>(() => findThemePreset(themeId.value))
  const setTheme = (id: string) => applyTheme(id)

  return {
    presets: themePresets,
    currentTheme,
    themeId: computed(() => themeId.value),
    setTheme,
    isDark: computed(() => currentTheme.value.scheme === 'dark')
  }
}
