<template>
  <aside class="magic-side" aria-label="简历布局设置">
    <div class="magic-side__inner">
      <!-- 布局 -->
      <section class="magic-card">
        <header class="magic-card__head">
          <LayoutList :size="16" class="magic-card__icon" />
          <span>布局</span>
        </header>
        <div class="magic-card__body">
          <div class="magic-modules">
            <div
              v-for="(module, index) in modules"
              :key="module.id"
              class="magic-module"
              :class="{
                'is-active': module.id === activeId,
                'is-basic': module.isBasic,
                'is-drag-over': dragOverIndex === index && dragFromIndex !== index
              }"
              :draggable="!module.isBasic"
              @click="emit('select', module.id)"
              @dragstart="handleDragStart(index, $event)"
              @dragover.prevent="dragOverIndex = index"
              @dragleave="dragOverIndex = null"
              @drop.prevent="handleDrop(index)"
              @dragend="resetDrag"
            >
              <span v-if="!module.isBasic" class="magic-module__grip">
                <GripVertical :size="15" />
              </span>
              <span v-else class="magic-module__grip magic-module__grip--spacer" />
              <span class="magic-module__icon">{{ module.icon }}</span>
              <span class="magic-module__title">{{ module.title }}</span>
              <button
                v-if="!module.isBasic"
                type="button"
                class="magic-module__btn"
                :aria-label="isHidden(module.id) ? '显示模块' : '隐藏模块'"
                @click.stop="emit('toggle-visibility', module.id, isHidden(module.id))"
              >
                <Eye v-if="!isHidden(module.id)" :size="15" class="is-on" />
                <EyeOff v-else :size="15" />
              </button>
              <button
                v-if="!module.isBasic"
                type="button"
                class="magic-module__btn magic-module__btn--danger"
                aria-label="删除模块"
                @click.stop="handleRemove(module)"
              >
                <Trash2 :size="15" />
              </button>
            </div>
          </div>

          <el-popover trigger="click" placement="bottom" :width="208">
            <template #reference>
              <button type="button" class="magic-add">
                <Plus :size="15" />
                添加模块
              </button>
            </template>
            <div class="magic-add__menu">
              <button type="button" @click.stop="emit('add-section', 'text')">
                <span class="magic-add__emoji">💬</span>
                自我评价
              </button>
              <button type="button" @click.stop="emit('add-section', 'entry')">
                <span class="magic-add__emoji">➕</span>
                自定义板块
              </button>
              <button type="button" @click.stop="emit('add-section', 'certificates')">
                <span class="magic-add__emoji">🏆</span>
                证书
              </button>
            </div>
          </el-popover>
        </div>
      </section>

      <!-- 主题色 -->
      <section class="magic-card">
        <header class="magic-card__head">
          <Palette :size="16" class="magic-card__icon" />
          <span>主题色</span>
          <el-popover trigger="click" :width="260" placement="bottom-end">
            <template #reference>
              <button type="button" class="magic-side__custom-pill" title="自定义主题色">
                <Palette :size="12" />
                自定义
                <i
                  v-if="!(themeHexes as readonly string[]).includes(currentHex)"
                  class="magic-side__custom-dot"
                  :style="{ background: currentHex }"
                />
              </button>
            </template>
            <div class="magic-side__picker">
              <el-color-picker
                :model-value="currentHex"
                :predefine="themeHexes"
                @update:model-value="handleCustomColor"
              />
              <span>挑选接近的主题色，将映射到内置强调色。</span>
            </div>
          </el-popover>
        </header>
        <div class="magic-card__body">
          <div class="magic-swatches">
            <button
              v-for="swatch in swatches"
              :key="swatch.hex"
              type="button"
              class="magic-swatch"
              :class="{ 'is-active': swatch.hex === currentHex }"
              :style="{ background: swatch.hex }"
              :title="swatch.label"
              :aria-label="`主题色 ${swatch.label}`"
              @click="emit('setting-change', 'accentColor', swatch.value)"
            />
          </div>
        </div>
      </section>

      <!-- 排版 -->
      <section class="magic-card">
        <header class="magic-card__head">
          <Type :size="16" class="magic-card__icon" />
          <span>排版</span>
        </header>
        <div class="magic-card__body magic-stack">
          <label class="magic-row">
            <span class="magic-row__label">字体</span>
            <select
              class="magic-select"
              :value="settings.fontFamily"
              aria-label="字体"
              @change="handleFontChange"
            >
              <option v-for="opt in fontOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </label>
          <div class="magic-row">
            <span class="magic-row__label">行高</span>
            <el-slider
              class="magic-row__slider"
              :model-value="settings.lineHeight"
              :min="1"
              :max="2"
              :step="0.1"
              @update:model-value="(v: number | number[]) => emitNumber('lineHeight', v)"
            />
            <span class="magic-row__value">{{ settings.lineHeight }}</span>
          </div>
          <div class="magic-row">
            <span class="magic-row__label">基础字号</span>
            <el-slider
              class="magic-row__slider"
              :model-value="settings.fontScale"
              :min="0.8"
              :max="1.4"
              :step="0.05"
              @update:model-value="(v: number | number[]) => emitNumber('fontScale', v)"
            />
            <span class="magic-row__value">{{ Math.round(settings.fontScale * 100) }}%</span>
          </div>
        </div>
      </section>

      <!-- 间距 -->
      <section class="magic-card">
        <header class="magic-card__head">
          <StretchHorizontal :size="16" class="magic-card__icon" />
          <span>间距</span>
        </header>
        <div class="magic-card__body magic-stack">
          <div class="magic-row">
            <span class="magic-row__label">页边距</span>
            <el-slider
              class="magic-row__slider"
              :model-value="settings.pageMarginPt"
              :min="24"
              :max="72"
              :step="2"
              @update:model-value="(v: number | number[]) => emitNumber('pageMarginPt', v)"
            />
            <span class="magic-row__value">{{ settings.pageMarginPt }}pt</span>
          </div>
          <div class="magic-row">
            <span class="magic-row__label">板块间距</span>
            <el-slider
              class="magic-row__slider"
              :model-value="settings.sectionSpacing"
              :min="1"
              :max="40"
              :step="1"
              @update:model-value="(v: number | number[]) => emitNumber('sectionSpacing', v)"
            />
            <span class="magic-row__value">{{ settings.sectionSpacing }}px</span>
          </div>
        </div>
      </section>

      <!-- 模式 -->
      <section class="magic-card">
        <header class="magic-card__head">
          <Zap :size="16" class="magic-card__icon" />
          <span>模式</span>
        </header>
        <div class="magic-card__body magic-stack">
          <div class="magic-switch-row">
            <span>图标模式</span>
            <button
              type="button"
              class="magic-switch"
              :class="{ 'is-on': settings.iconMode === 'ICON' }"
              :aria-pressed="settings.iconMode === 'ICON'"
              aria-label="图标模式"
              @click="emit('setting-toggle', 'iconMode')"
            ><i /></button>
          </div>
          <div class="magic-switch-row">
            <span>自动一页</span>
            <button
              type="button"
              class="magic-switch"
              :class="{ 'is-on': settings.autoOnePage === true }"
              :aria-pressed="settings.autoOnePage === true"
              aria-label="自动一页"
              @click="emit('setting-toggle', 'autoOnePage')"
            ><i /></button>
          </div>
        </div>
      </section>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import {
  Eye,
  EyeOff,
  GripVertical,
  LayoutList,
  Palette,
  Plus,
  StretchHorizontal,
  Trash2,
  Type,
  Zap
} from 'lucide-vue-next'
import { resolveAccentHex } from '@/features/resume-document'

export interface MagicSideModule {
  id: string
  title: string
  icon: string
  isBasic?: boolean
  isCustom?: boolean
}

export interface MagicSideSettings {
  accentColor: string
  fontFamily: string
  lineHeight: number
  fontScale: number
  sectionSpacing: number
  pageMarginPt: number
  iconMode: 'ICON' | 'TEXT' | 'HIDDEN'
  autoOnePage?: boolean
}

const props = defineProps<{
  modules: MagicSideModule[]
  activeId: string
  hiddenIds?: string[]
  settings: MagicSideSettings
}>()

const emit = defineEmits<{
  select: [id: string]
  'toggle-visibility': [id: string, currentlyHidden: boolean]
  'remove-section': [id: string]
  'add-section': [variant: 'text' | 'entry' | 'certificates']
  'reorder': [id: string, targetIndex: number]
  'setting-change': [key: 'accentColor' | 'fontFamily' | 'lineHeight' | 'fontScale' | 'sectionSpacing' | 'pageMarginPt', value: string | number]
  'setting-toggle': [key: 'iconMode' | 'autoOnePage']
}>()

const themeHexes = [
  '#000000', '#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999',
  '#0047AB', '#8B0000', '#FF4500', '#4B0082', '#2E8B57'
] as const

/** 与 magic-resume THEME_COLORS 一致的官方色盘，点击直接写入 hex 主题色。 */
const swatches: Array<{ hex: string; label: string; value: string }> = [
  { hex: '#000000', label: '纯黑', value: '#000000' },
  { hex: '#1A1A1A', label: '墨黑', value: '#1A1A1A' },
  { hex: '#333333', label: '碳灰', value: '#333333' },
  { hex: '#4D4D4D', label: '深灰', value: '#4D4D4D' },
  { hex: '#666666', label: '中灰', value: '#666666' },
  { hex: '#808080', label: '石灰', value: '#808080' },
  { hex: '#999999', label: '银灰', value: '#999999' },
  { hex: '#0047AB', label: '钴蓝', value: '#0047AB' },
  { hex: '#8B0000', label: '深红', value: '#8B0000' },
  { hex: '#FF4500', label: '橙红', value: '#FF4500' },
  { hex: '#4B0082', label: '靛紫', value: '#4B0082' },
  { hex: '#2E8B57', label: '海绿', value: '#2E8B57' }
]

const currentHex = computed(() => resolveAccentHex(props.settings.accentColor))

const handleCustomColor = (value: string | null) => {
  if (!value) return
  emit('setting-change', 'accentColor', value.toUpperCase())
}

const fontOptions = [
  { value: 'Arial', label: '默认字体' },
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'Noto Sans SC', label: '思源黑体' },
  { value: 'Source Han Sans SC', label: '思源宋体' }
]

const isHidden = (id: string) => props.hiddenIds?.includes(id) === true

const handleFontChange = (event: Event) => {
  emit('setting-change', 'fontFamily', (event.target as HTMLSelectElement).value)
}

const emitNumber = (
  key: 'lineHeight' | 'fontScale' | 'sectionSpacing' | 'pageMarginPt',
  value: number | number[]
) => {
  const numeric = Array.isArray(value) ? value[0] : value
  if (typeof numeric === 'number' && Number.isFinite(numeric)) {
    emit('setting-change', key, numeric)
  }
}

const handleRemove = (module: MagicSideModule) => {
  if (module.isCustom) {
    emit('remove-section', module.id)
    return
  }
  void ElMessageBox.confirm(
    '内置模块不能删除，确认后将从简历中隐藏，可随时用眼睛图标恢复。',
    `隐藏 ${module.title}`,
    { confirmButtonText: '隐藏', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    if (!isHidden(module.id)) emit('toggle-visibility', module.id, false)
  }).catch(() => undefined)
}

let dragFromIndex: number | null = null
const dragOverIndex = ref<number | null>(null)

const handleDragStart = (index: number, event: DragEvent) => {
  dragFromIndex = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const handleDrop = (index: number) => {
  const from = dragFromIndex
  resetDrag()
  if (from === null || from === index) return
  emit('reorder', props.modules[from].id, index)
}

const resetDrag = () => {
  dragFromIndex = null
  dragOverIndex.value = null
}
</script>

<style scoped lang="scss">
.magic-side {
  height: 100%;
  overflow-y: auto;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  scrollbar-gutter: stable;
}

.magic-side__inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.magic-card {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.magic-card__head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 14px;
  color: #111827;
  font-size: 14.5px;
  font-weight: 500;
  white-space: nowrap;
}

.magic-card__icon {
  color: #6b7280;
}

.magic-card__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.magic-stack {
  gap: 18px;
}

/* ---- 模块列表 ---- */
.magic-modules {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.magic-module {
  position: relative;
  display: flex;
  align-items: center;
  padding: 9px 6px 9px 4px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;

  &:hover {
    border-color: rgba(0, 71, 171, 0.55);
  }

  &.is-active {
    border-color: var(--el-color-primary, #0047ab);
    box-shadow: 0 0 0 1px var(--el-color-primary, #0047ab);

    .magic-module__title,
    .magic-module__icon {
      color: var(--el-color-primary, #0047ab);
    }
  }

  &.is-drag-over {
    box-shadow: 0 -2px 0 0 var(--el-color-primary, #0047ab) inset;
    border-top: 2px solid var(--el-color-primary, #0047ab);
  }
}

.magic-module__grip {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 22px;
  color: #9ca3af;
  cursor: grab;

  &:active { cursor: grabbing; }

  &--spacer { cursor: default; }
}

.magic-module__icon {
  flex: 0 0 auto;
  margin-right: 7px;
  font-size: 15px;
  color: #374151;
}

.magic-module__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #111827;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.magic-module__btn {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding: 5px;
  margin-left: 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;

  &:hover { background: #f3f4f6; color: #111827; }

  .is-on { color: var(--el-color-primary, #0047ab); }

  &--danger {
    color: #f87171;

    &:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  }
}

.magic-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  margin-top: 4px;
  padding: 9px 12px;
  border: 1px dashed rgba(0, 71, 171, 0.35);
  border-radius: 10px;
  background: rgba(0, 71, 171, 0.05);
  color: var(--el-color-primary, #0047ab);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.18s ease;

  &:hover { background: rgba(0, 71, 171, 0.1); }
}

.magic-add__menu {
  display: flex;
  flex-direction: column;
  gap: 2px;

  button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #374151;
    cursor: pointer;
    font-size: 13px;
    text-align: left;

    &:hover { background: #f3f4f6; }
  }
}

.magic-add__emoji {
  font-size: 15px;
}

/* ---- 主题色 ---- */
.magic-side__custom-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 3px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;

  &:hover {
    border-color: rgba(0, 71, 171, 0.4);
    color: var(--el-color-primary, #0047ab);
  }
}

.magic-side__picker {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #9ca3af;
  font-size: 12px;

  :deep(.el-color-picker__trigger) {
    width: 40px;
    height: 32px;
  }
}

.magic-side__custom-dot {
  width: 9px;
  height: 9px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 999px;
}

.magic-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 2px;
}

.magic-swatch {
  position: relative;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);

  &:hover { transform: scale(1.12); }

  &.is-active {
    box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px var(--el-color-primary, #0047ab);
  }
}

/* ---- 滑杆行 ---- */
.magic-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.magic-row__label {
  flex: 0 0 58px;
  color: #6b7280;
  font-size: 13px;
}

.magic-row__slider {
  flex: 1;
  margin: 0 2px;
}

.magic-row__value {
  flex: 0 0 44px;
  color: #6b7280;
  font-size: 12.5px;
  text-align: right;
}

.magic-select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  font-size: 13px;
  outline: none;

  &:focus { border-color: var(--el-color-primary, #0047ab); }
}

/* ---- 开关 ---- */
.magic-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #6b7280;
  font-size: 13px;
}

.magic-switch {
  position: relative;
  width: 36px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #d1d5db;
  cursor: pointer;
  transition: background 0.18s ease;

  i {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    transition: transform 0.18s ease;
  }

  &.is-on {
    background: var(--el-color-primary, #0047ab);

    i { transform: translateX(16px); }
  }
}
</style>
