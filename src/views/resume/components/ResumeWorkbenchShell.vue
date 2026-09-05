<template>
  <div
    :class="[
      'resume-workbench-layout',
      `is-mobile-${mobileTab}`,
      {
        'is-rail-collapsed': railCollapsed,
        'is-editor-collapsed': editorCollapsed,
        'is-preview-focus': previewFocus
      }
    ]"
    :style="workbenchStyle"
  >
    <slot name="rail" />
    <button
      v-if="!railCollapsed && !previewFocus"
      class="resume-workbench-layout__resizer resume-workbench-layout__resizer--rail"
      type="button"
      aria-label="调整模块导航宽度"
      title="拖动调整模块导航宽度，双击重置"
      @pointerdown="startResize('rail', $event)"
      @dblclick="resetWidth('rail')"
    />
    <slot name="preview" />
    <button
      v-if="!editorCollapsed && !previewFocus"
      class="resume-workbench-layout__resizer resume-workbench-layout__resizer--editor"
      type="button"
      aria-label="调整编辑器宽度"
      title="拖动调整编辑器宽度，双击重置"
      @pointerdown="startResize('editor', $event)"
      @dblclick="resetWidth('editor')"
    />
    <slot name="editor" />
    <slot name="inspector" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

withDefaults(defineProps<{
  mobileTab?: 'edit' | 'review' | 'ai' | 'preview'
  railCollapsed?: boolean
  editorCollapsed?: boolean
  previewFocus?: boolean
}>(), {
  mobileTab: 'edit',
  railCollapsed: false,
  editorCollapsed: false,
  previewFocus: false
})

const defaultRailWidth = 220
const defaultEditorWidth = 420
const railWidth = ref(defaultRailWidth)
const editorWidth = ref(defaultEditorWidth)
const workbenchStyle = computed(() => ({
  '--workbench-rail-width': `${railWidth.value}px`,
  '--workbench-editor-width': `${editorWidth.value}px`
}))

let activeResize: 'rail' | 'editor' | null = null
let resizeStartX = 0
let resizeStartWidth = 0
let previousBodyCursor = ''

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const stopResize = () => {
  activeResize = null
  document.body.style.cursor = previousBodyCursor
  document.removeEventListener('pointermove', resize)
  document.removeEventListener('pointerup', stopResize)
}

const resize = (event: PointerEvent) => {
  if (!activeResize) return
  const delta = event.clientX - resizeStartX
  if (activeResize === 'rail') {
    railWidth.value = clamp(resizeStartWidth + delta, 176, 300)
    return
  }
  // v22 列序后，editor 在 col2；向右拖拽编辑器右沿的拉分位 = 加宽编辑器
  editorWidth.value = clamp(resizeStartWidth + delta, 340, 560)
}

const startResize = (target: 'rail' | 'editor', event: PointerEvent) => {
  if (window.matchMedia('(max-width: 1260px)').matches) return
  activeResize = target
  resizeStartX = event.clientX
  resizeStartWidth = target === 'rail' ? railWidth.value : editorWidth.value
  previousBodyCursor = document.body.style.cursor
  document.body.style.cursor = 'col-resize'
  document.addEventListener('pointermove', resize)
  document.addEventListener('pointerup', stopResize, { once: true })
}

const resetWidth = (target: 'rail' | 'editor') => {
  if (target === 'rail') {
    railWidth.value = defaultRailWidth
    return
  }
  editorWidth.value = defaultEditorWidth
}

onBeforeUnmount(stopResize)
</script>

<style scoped lang="scss">
.resume-workbench-layout {
  --workbench-rail-width: 220px;
  --workbench-editor-width: 420px;
  display: grid;
  position: relative;
  flex: 1 1 auto;
  /* v22 三栏版式：rail | editor（中央，按板块编辑） | preview（右侧，实时预览） */
  grid-template-columns:
    var(--workbench-rail-width)
    minmax(0, var(--workbench-editor-width))
    minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #F6F6F4;
}

.resume-workbench-layout__resizer {
  position: absolute;
  z-index: 3;
  top: 0;
  bottom: 0;
  width: 9px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: col-resize;

  &::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 4px;
    width: 1px;
    background: transparent;
    content: '';
    transition: background 0.18s ease;
  }

  &:hover::before,
  &:focus-visible::before {
    background: var(--resume-workbench-accent, var(--user-primary));
  }

  &:focus-visible {
    outline: 2px solid var(--resume-workbench-accent, var(--user-primary));
    outline-offset: -2px;
  }
}

.resume-workbench-layout__resizer--rail {
  left: calc(var(--workbench-rail-width) - 4px);
}

.resume-workbench-layout__resizer--editor {
  /* v22 列序后，editor 在 col2；编辑器与预览的拉分位需计入 rail 宽度 */
  left: calc(var(--workbench-rail-width) + var(--workbench-editor-width) - 4px);
}

.resume-workbench-layout > :slotted(.resume-workbench-pane--preview),
.resume-workbench-layout > :slotted(.resume-workbench-pane--editor),
.resume-workbench-layout > :slotted(.resume-workbench-pane--inspector) {
  position: static;
  align-self: stretch;
  min-width: 0;
  min-height: 0;
  height: 100%;
  margin: 0;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.resume-workbench-layout > :slotted(.resume-section-rail) {
  grid-column: 1;
  grid-row: 1;
}

.resume-workbench-layout > :slotted(.resume-workbench-pane--preview) {
  grid-column: 3;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: hidden;
  /* v22 原型：右栏暖灰点阵画布，衬托 A4 简历纸 */
  background-color: #F6F6F4;
  background-image: radial-gradient(rgba(26, 25, 23, 0.08) 1px, transparent 1px);
  background-size: 18px 18px;
  background-position: -9px -9px;
}

.resume-workbench-layout > :slotted(.resume-workbench-pane--editor),
.resume-workbench-layout > :slotted(.resume-workbench-pane--inspector) {
  grid-column: 2;
  grid-row: 1;
  align-content: start;
  max-height: 100%;
  padding: 0;
  overflow: auto;
  border-left: 1px solid var(--resume-workbench-line, #e5e7eb);
  border-right: 1px solid var(--resume-workbench-line, #e5e7eb);
  background: #f7f8fa;
  scrollbar-gutter: stable;
}

.resume-workbench-layout > :slotted(.resume-workbench-pane--editor) {
  display: flex;
  flex-direction: column;
}

.resume-workbench-layout > :slotted(.resume-workbench-pane--inspector) {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.resume-workbench-layout.is-rail-collapsed {
  --workbench-rail-width: 58px;
}

.resume-workbench-layout.is-editor-collapsed {
  --workbench-editor-width: 58px;
}

.resume-workbench-layout.is-rail-collapsed.is-editor-collapsed,
.resume-workbench-layout.is-preview-focus {
  --workbench-rail-width: 58px;
  --workbench-editor-width: 58px;
}

.resume-workbench-layout.is-editor-collapsed > :slotted(.resume-workbench-pane--editor),
.resume-workbench-layout.is-editor-collapsed > :slotted(.resume-workbench-pane--inspector),
.resume-workbench-layout.is-preview-focus > :slotted(.resume-workbench-pane--editor),
.resume-workbench-layout.is-preview-focus > :slotted(.resume-workbench-pane--inspector) {
  overflow: hidden;
}

.resume-workbench-layout.is-editor-collapsed > :slotted(.resume-workbench-pane--editor) > *,
.resume-workbench-layout.is-editor-collapsed > :slotted(.resume-workbench-pane--inspector) > *,
.resume-workbench-layout.is-preview-focus > :slotted(.resume-workbench-pane--editor) > *,
.resume-workbench-layout.is-preview-focus > :slotted(.resume-workbench-pane--inspector) > * {
  visibility: hidden;
}

@media (max-width: 1380px) and (min-width: 1261px) {
  .resume-workbench-layout {
    --workbench-rail-width: 190px;
    --workbench-editor-width: 390px;
  }
}

@media (max-width: 1260px) {
  .resume-workbench-layout {
    display: block;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  .resume-workbench-layout > :slotted(.resume-section-rail) {
    display: none;
  }

  .resume-workbench-layout__resizer {
    display: none;
  }

  .resume-workbench-layout > :slotted(.mobile-pane-editor),
  .resume-workbench-layout > :slotted(.mobile-pane-inspector),
  .resume-workbench-layout > :slotted(.mobile-pane-preview) {
    display: none;
  }

  .resume-workbench-layout.is-mobile-edit > :slotted(.mobile-pane-editor) {
    display: flex;
  }

  .resume-workbench-layout.is-mobile-review > :slotted(.mobile-pane-inspector),
  .resume-workbench-layout.is-mobile-ai > :slotted(.mobile-pane-inspector) {
    display: flex;
  }

  .resume-workbench-layout.is-mobile-preview > :slotted(.mobile-pane-preview) {
    display: flex;
  }

  .resume-workbench-layout > :slotted(.resume-workbench-pane--editor),
  .resume-workbench-layout > :slotted(.resume-workbench-pane--inspector),
  .resume-workbench-layout > :slotted(.resume-workbench-pane--preview) {
    position: static;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    height: min(780px, calc(100dvh - 194px));
    max-height: min(780px, calc(100dvh - 194px));
    overflow: auto;
    border-left: 0;
  }

  .resume-workbench-layout > :slotted(.resume-workbench-pane--editor) > *,
  .resume-workbench-layout > :slotted(.resume-workbench-pane--inspector) > * {
    visibility: visible;
  }
}

@media (max-width: 720px) {
  .resume-workbench-layout > :slotted(.resume-workbench-pane--editor),
  .resume-workbench-layout > :slotted(.resume-workbench-pane--inspector),
  .resume-workbench-layout > :slotted(.resume-workbench-pane--preview) {
    height: auto;
    min-height: calc(100dvh - 158px);
    max-height: none;
  }
}
</style>
