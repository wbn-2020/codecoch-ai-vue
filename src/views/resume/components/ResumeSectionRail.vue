<template>
  <aside class="resume-section-rail" :class="{ 'is-collapsed': collapsed }" aria-label="简历板块">
    <!-- v22 原型：板块管理卡片（每行 drag/eye/up/down/delete） -->
    <section class="wb-card" aria-labelledby="wb-sections-h">
      <header class="wb-card-h">
        <span id="wb-sections-h">板块管理</span>
        <span class="wb-card-sub">拖拽排序 · 显隐 · 自定义</span>
      </header>
      <nav class="wb-sec-list" aria-label="板块列表">
        <button
          v-for="(item, index) in items"
          :key="item.id"
          type="button"
          :class="{
            'wb-sec-item': true,
            'wb-sec-item--active': item.id === activeId,
            'wb-sec-item--off': isHidden(item.id),
            'wb-sec-item--invalid': Boolean(item.invalid)
          }"
          :data-sec="item.id"
          :title="item.label"
          :aria-invalid="item.invalid || undefined"
          :aria-current="item.id === activeId ? 'true' : undefined"
          @click="emit('select', item.id)"
        >
          <span class="wb-sec-ic" aria-hidden="true">
            <component :is="sectionIcon(item.id)" :size="14" />
          </span>
          <span class="wb-sec-name">{{ item.label }}</span>
          <span class="wb-sec-ctrl">
            <span
              class="wb-sec-status"
              :title="item.invalid ? '需修正' : item.done ? '已完善' : '待完善'"
            >
              <AlertCircle v-if="item.invalid" :size="13" aria-label="需修正" />
              <CheckCircle2 v-else-if="item.done" :size="13" aria-label="已完善" />
              <Circle v-else :size="13" aria-label="待完善" />
            </span>
            <button
              type="button"
              class="wb-mini-btn"
              :aria-label="`显隐 ${item.label}`"
              :title="canHide(item.id) ? (isHidden(item.id) ? `显示 ${item.label}` : `隐藏 ${item.label}`) : `${item.label} 不可隐藏`"
              :disabled="!canHide(item.id)"
              @click.stop="emit('toggle-visibility', item.id, isHidden(item.id))"
            >
              <EyeOff v-if="isHidden(item.id)" :size="13" />
              <Eye v-else :size="13" />
            </button>
            <button
              v-if="item.id !== 'resume-basic'"
              type="button"
              class="wb-mini-btn"
              :aria-label="`上移 ${item.label}`"
              title="上移"
              :disabled="!canMoveUp(item, index)"
              @click.stop="emit('move', item.id, -1)"
            >
              <ChevronUp :size="13" />
            </button>
            <button
              v-if="item.id !== 'resume-basic'"
              type="button"
              class="wb-mini-btn"
              :aria-label="`下移 ${item.label}`"
              title="下移"
              :disabled="!canMoveDown(item, index)"
              @click.stop="emit('move', item.id, 1)"
            >
              <ChevronDown :size="13" />
            </button>
            <button
              v-if="item.id.startsWith('custom')"
              type="button"
              class="wb-mini-btn wb-mini-btn--del"
              :aria-label="`删除 ${item.label}`"
              title="删除"
              @click.stop="emit('remove-section', item.id)"
            >
              <X :size="13" />
            </button>
          </span>
        </button>
      </nav>
      <div v-if="customSectionQuota && customSectionQuota > 0" class="wb-add-area">
        <div class="wb-add-title">添加板块</div>
        <div class="wb-add-grid">
          <button type="button" class="wb-add-btn" @click="emit('add-section', 'text')">
            <Plus :size="13" /> 自我评价
          </button>
          <button type="button" class="wb-add-btn wb-add-btn--custom" @click="emit('add-section', 'entry')">
            <Plus :size="13" /> 添加自定义板块
          </button>
        </div>
      </div>
    </section>

    <!-- v22 原型：主题色 · 绑定 presentationConfig.accentColor（预设强调色名） -->
    <section class="wb-card" aria-labelledby="wb-theme-h">
      <header class="wb-card-h">
        <span id="wb-theme-h">主题色</span>
      </header>
      <div class="wb-swatches">
        <button
          v-for="sw in themeSwatches"
          :key="sw.value"
          type="button"
          class="wb-sw"
          :class="{ 'is-active': globalSettings.accentColor === sw.value }"
          :style="{ background: sw.hex }"
          :aria-label="`选择主题色 ${sw.label}`"
          :title="`选择主题色 ${sw.label}`"
          @click="emit('setting-change', 'accentColor', sw.value)"
        />
      </div>
    </section>

    <section class="wb-card" aria-labelledby="wb-type-h">
      <header class="wb-card-h"><span id="wb-type-h">排版</span></header>
      <label class="wb-inline">
        <span>字体</span>
        <select
          :value="globalSettings.fontFamily"
          aria-label="字体"
          @change="onSelectChange"
        >
          <option v-for="opt in fontOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
      <label class="wb-inline">
        <span>行高</span>
        <input
          type="range"
          min="1"
          max="2"
          step="0.1"
          :value="globalSettings.lineHeight"
          aria-label="行高"
          @input="onRange('lineHeight')"
        />
        <b>{{ globalSettings.lineHeight }}</b>
      </label>
      <label class="wb-inline">
        <span>基础字号</span>
        <input
          type="range"
          min="0.8"
          max="1.4"
          step="0.05"
          :value="globalSettings.fontScale"
          aria-label="基础字号缩放"
          @input="onRange('fontScale')"
        />
        <b>{{ globalSettings.fontScale }}</b>
      </label>
    </section>

    <section class="wb-card" aria-labelledby="wb-spacing-h">
      <header class="wb-card-h"><span id="wb-spacing-h">间距</span></header>
      <label class="wb-inline">
        <span>页边距</span>
        <input
          type="range"
          min="24"
          max="72"
          step="2"
          :value="globalSettings.pageMarginPt"
          aria-label="页边距"
          @input="onRange('pageMarginPt')"
        />
        <b>{{ globalSettings.pageMarginPt }}pt</b>
      </label>
      <label class="wb-inline">
        <span>板块间距</span>
        <input
          type="range"
          min="1"
          max="40"
          step="1"
          :value="globalSettings.sectionSpacing"
          aria-label="板块间距"
          @input="onRange('sectionSpacing')"
        />
        <b>{{ globalSettings.sectionSpacing }}</b>
      </label>
    </section>

    <section class="wb-card" aria-labelledby="wb-mode-h">
      <header class="wb-card-h"><span id="wb-mode-h">模式</span></header>
      <label class="wb-inline wb-switch">
        <span>图标模式</span>
        <button
          type="button"
          class="wb-toggle"
          :class="{ 'is-on': globalSettings.iconMode === 'ICON' }"
          :aria-pressed="globalSettings.iconMode === 'ICON'"
          aria-label="图标模式"
          @click="emit('setting-toggle', 'iconMode')"
        ><i /></button>
      </label>
      <label class="wb-inline wb-switch">
        <span>自动一页</span>
        <button
          type="button"
          class="wb-toggle"
          :class="{ 'is-on': globalSettings.autoOnePage === true }"
          :aria-pressed="globalSettings.autoOnePage === true"
          aria-label="自动一页"
          title="内容略超一页时自动压缩排版；超出一页较多时会提示精简内容"
          @click="emit('setting-toggle', 'autoOnePage')"
        ><i /></button>
      </label>
    </section>

    <!-- 兼容既有事件流：保留旧 rail 收尾的「下一步：检查」入口 -->
    <section v-if="!collapsed" class="resume-section-rail__legacy">
      <strong>下一步：检查</strong>
      <span v-if="hasStarted">{{ exportReadyCount }}/{{ exportTotal }} 项通过</span>
      <span v-else>填写后检查完整度</span>
      <button type="button" @click="emit('review')">
        <ClipboardCheck :size="14" aria-hidden="true" />
        开始检查
      </button>
    </section>
  </aside>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardCheck,
  Code2,
  Eye,
  EyeOff,
  FolderKanban,
  Plus,
  Target,
  UserRound,
  X
} from 'lucide-vue-next'

interface SectionItem {
  id: string
  label: string
  done: boolean
  invalid?: boolean
  movableUp?: boolean
  movableDown?: boolean
}

interface GlobalSettings {
  accentColor: string
  fontFamily: string
  lineHeight: number
  fontScale: number
  sectionSpacing: number
  pageMarginPt: number
  iconMode: 'ICON' | 'TEXT' | 'HIDDEN'
  autoOnePage?: boolean
}

const props = withDefaults(defineProps<{
  items: SectionItem[]
  activeId: string
  collapsed?: boolean
  completion: number
  hasStarted: boolean
  exportReadyCount: number
  exportTotal: number
  hiddenIds?: string[]
  customSectionQuota?: number
  globalSettings: GlobalSettings
}>(), {
  globalSettings: () => ({
    accentColor: 'green',
    fontFamily: "'PingFang SC', sans-serif",
    lineHeight: 1.62,
    fontScale: 1,
    sectionSpacing: 18,
    pageMarginPt: 48,
    iconMode: 'ICON'
  })
})

const emit = defineEmits<{
  select: [id: string]
  review: []
  move: [id: string, delta: -1 | 1]
  reorder: [id: string, targetIndex: number]
  'toggle-visibility': [id: string, currentlyHidden: boolean]
  'add-section': [variant: 'text' | 'entry']
  'remove-section': [id: string]
  'setting-change': [key: Exclude<keyof GlobalSettings, 'iconMode' | 'autoOnePage'>, value: string | number]
  'setting-toggle': [key: 'iconMode' | 'autoOnePage']
}>()

const iconBySection: Record<string, Component> = {
  'resume-basic': UserRound,
  'resume-target': Target,
  'resume-skills': Code2,
  'resume-projects': FolderKanban,
  'resume-experience': BriefcaseBusiness
}

const themeSwatches: { value: string; label: string; hex: string }[] = [
  { value: 'green', label: '墨绿', hex: '#1f6f5c' },
  { value: 'blue', label: '靛蓝', hex: '#3e6aae' },
  { value: 'purple', label: '丁香紫', hex: '#7e6cb0' },
  { value: 'orange', label: '暖橙', hex: '#f97316' },
  { value: 'red', label: '朱红', hex: '#ef4444' },
  { value: 'slate', label: '石板灰', hex: '#64748b' },
  { value: 'black', label: '墨黑', hex: '#1f2937' },
  { value: 'default', label: '经典蓝', hex: '#1779a7' }
]

const fontOptions: { value: string; label: string }[] = [
  { value: "'PingFang SC', sans-serif", label: '苹方' },
  { value: "'Microsoft YaHei', sans-serif", label: '微软雅黑' },
  { value: "'SimSun', serif", label: '宋体' },
  { value: "'KaiTi', serif", label: '楷体' },
  { value: "'Times New Roman', serif", label: 'Times' }
]

const sectionIcon = (id: string) => iconBySection[id] || Circle
const canMoveUp = (item: SectionItem, index: number) =>
  item.movableUp === undefined ? index > 0 : item.movableUp
const canMoveDown = (item: SectionItem, index: number) =>
  item.movableDown === undefined ? index < props.items.length - 1 : item.movableDown
const canHide = (id: string) => id !== 'resume-basic' && id !== 'resume-target'
const isHidden = (id: string) => props.hiddenIds?.includes(id) === true

const onSelectChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('setting-change', 'fontFamily', target.value)
}
const onRange = (key: 'lineHeight' | 'fontScale' | 'pageMarginPt' | 'sectionSpacing') =>
  (event: Event) => {
    const target = event.target as HTMLInputElement
    emit('setting-change', key, Number(target.value))
  }
</script>

<style scoped lang="scss">
/* ====================== v22 原型 · 板块管理 + 4 设置卡片 ====================== */
.resume-section-rail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  padding: 12px;
  overflow-y: auto;
  border-right: 1px solid var(--resume-workbench-line);
  background: var(--resume-workbench-surface);
  color: var(--resume-workbench-text);
}

.wb-card {
  border: 1px solid var(--resume-workbench-line);
  border-radius: 12px;
  background: var(--resume-workbench-surface);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wb-card-h {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: var(--resume-workbench-text);
  margin-bottom: 4px;
}

.wb-card-sub {
  font-size: 11px;
  color: var(--resume-workbench-muted);
  font-weight: 400;
}

.wb-sec-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wb-sec-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--resume-workbench-line);
  border-radius: 9px;
  background: var(--resume-workbench-surface-soft);
  color: var(--resume-workbench-text-soft);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
  border-color: var(--resume-workbench-accent);
  }

  &--active {
  border-color: var(--resume-workbench-accent);
  background: var(--resume-workbench-accent-soft);
  color: var(--resume-workbench-accent-strong);
  box-shadow: inset 0 0 0 1px var(--resume-workbench-accent);
  }

  &--off {
  opacity: 0.55;
  }
}

.wb-sec-ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex: none;
  color: var(--resume-workbench-muted);
}

.wb-sec-item--active .wb-sec-ic {
  color: var(--resume-workbench-accent);
}

.wb-sec-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-sec-ctrl {
  display: flex;
  gap: 2px;
  align-items: center;
}

.wb-sec-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--resume-workbench-line-strong);
}

.wb-sec-item--active .wb-sec-status {
  color: var(--resume-workbench-success);
}

.wb-mini-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--resume-workbench-muted);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled),
  &:focus-visible {
  background: var(--resume-workbench-accent-soft);
  color: var(--resume-workbench-accent);
  outline: 0;
  }

  &:disabled {
  cursor: not-allowed;
  opacity: 0.3;
  }

  &--del:hover:not(:disabled),
  &--del:focus-visible {
  background: rgba(176, 58, 58, 0.1);
  color: var(--el-color-danger);
  }
}

.wb-add-area {
  margin-top: 6px;
  border-top: 1px dashed var(--resume-workbench-line);
  padding-top: 8px;
}

.wb-add-title {
  font-size: 11px;
  color: var(--resume-workbench-muted);
  margin-bottom: 6px;
}

.wb-add-grid {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.wb-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px dashed var(--resume-workbench-line-strong);
  border-radius: 8px;
  background: var(--resume-workbench-surface-soft);
  color: var(--resume-workbench-muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;

  &:hover,
  &:focus-visible {
  border-color: var(--resume-workbench-accent);
  border-style: solid;
  color: var(--resume-workbench-accent);
  outline: 0;
  }

  &--custom {
  color: var(--resume-workbench-accent);
  }
}

.wb-swatches {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.wb-sw {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  outline: 1px solid var(--resume-workbench-line);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
  transform: scale(1.08);
  }

  &.is-active {
  outline: 2px solid var(--resume-workbench-accent);
  outline-offset: 1px;
  border-color: transparent;
  }
}

.wb-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--resume-workbench-text-soft);
}

.wb-inline > span:first-child {
  flex: 0 0 auto;
  white-space: nowrap;
}

.wb-inline select {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--resume-workbench-line);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  background: var(--resume-workbench-surface);
  color: var(--resume-workbench-text);
}

.wb-inline input[type='color'] {
  width: 30px;
  height: 24px;
  border: 1px solid var(--resume-workbench-line);
  border-radius: 6px;
  background: none;
  cursor: pointer;
}

.wb-inline input[type='range'] {
  flex: 1;
  max-width: 110px;
  accent-color: var(--resume-workbench-accent);
}

.wb-inline b {
  flex: 0 0 auto;
  min-width: 32px;
  text-align: right;
  font-size: 11.5px;
  color: var(--resume-workbench-muted);
  font-variant-numeric: tabular-nums;
}

.wb-switch {
  cursor: pointer;
}

.wb-toggle {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 999px;
  border: 0;
  background: var(--resume-workbench-line);
  padding: 0;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.wb-toggle i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--resume-workbench-surface);
  box-shadow: 0 1px 2px rgba(26, 25, 23, 0.18);
  transition: left 0.15s ease;
}

.wb-toggle.is-on {
  background: var(--resume-workbench-accent);
  border-color: var(--resume-workbench-accent);
}

.wb-toggle.is-on i {
  left: 18px;
}

.resume-section-rail__legacy {
  display: grid;
  gap: 6px;
  margin-top: 6px;
  padding: 11px;
  border: 1px solid var(--resume-workbench-line);
  border-radius: 8px;
  background: var(--resume-workbench-surface-soft);
}

.resume-section-rail__legacy strong {
  font-size: 12.5px;
  color: var(--resume-workbench-text);
}

.resume-section-rail__legacy span {
  color: var(--resume-workbench-muted);
  font-size: 11px;
}

.resume-section-rail__legacy button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  border: 1px solid var(--resume-workbench-line-strong);
  border-radius: 6px;
  background: var(--resume-workbench-surface);
  color: var(--resume-workbench-text-soft);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;

  &:hover,
  &:focus-visible {
  border-color: var(--resume-workbench-accent);
  color: var(--resume-workbench-accent);
  outline: 0;
  }
}

.resume-section-rail.is-collapsed .wb-card,
.resume-section-rail.is-collapsed .resume-section-rail__legacy {
  display: none;
}
</style>