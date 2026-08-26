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
  >
    <slot name="rail" />
    <slot name="preview" />
    <slot name="editor" />
    <slot name="inspector" />
  </div>
</template>

<script setup lang="ts">
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
</script>

<style scoped lang="scss">
.resume-workbench-layout {
  --workbench-rail-width: 220px;
  --workbench-editor-width: 420px;
  display: grid;
  flex: 1 1 auto;
  grid-template-columns:
    var(--workbench-rail-width)
    minmax(0, 1fr)
    minmax(0, var(--workbench-editor-width));
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--resume-workbench-bg, var(--user-bg-panel));
}

.resume-workbench-layout > :deep(.resume-workbench-pane--preview),
.resume-workbench-layout > :deep(.resume-workbench-pane--editor),
.resume-workbench-layout > :deep(.resume-workbench-pane--inspector) {
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

.resume-workbench-layout > :deep(.resume-section-rail) {
  grid-column: 1;
  grid-row: 1;
}

.resume-workbench-layout > :deep(.resume-workbench-pane--preview) {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: hidden;
  background: var(--resume-workbench-bg, var(--user-bg-panel));
}

.resume-workbench-layout > :deep(.resume-workbench-pane--editor),
.resume-workbench-layout > :deep(.resume-workbench-pane--inspector) {
  grid-column: 3;
  grid-row: 1;
  align-content: start;
  max-height: 100%;
  padding: 0;
  overflow: auto;
  border-left: 1px solid var(--resume-workbench-line, var(--user-border));
  background: var(--resume-workbench-surface, var(--user-surface));
  scrollbar-gutter: stable;
}

.resume-workbench-layout > :deep(.resume-workbench-pane--editor) {
  display: flex;
  flex-direction: column;
}

.resume-workbench-layout > :deep(.resume-workbench-pane--inspector) {
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

.resume-workbench-layout.is-editor-collapsed > :deep(.resume-workbench-pane--editor),
.resume-workbench-layout.is-editor-collapsed > :deep(.resume-workbench-pane--inspector),
.resume-workbench-layout.is-preview-focus > :deep(.resume-workbench-pane--editor),
.resume-workbench-layout.is-preview-focus > :deep(.resume-workbench-pane--inspector) {
  overflow: hidden;
}

.resume-workbench-layout.is-editor-collapsed > :deep(.resume-workbench-pane--editor > *),
.resume-workbench-layout.is-editor-collapsed > :deep(.resume-workbench-pane--inspector > *),
.resume-workbench-layout.is-preview-focus > :deep(.resume-workbench-pane--editor > *),
.resume-workbench-layout.is-preview-focus > :deep(.resume-workbench-pane--inspector > *) {
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

  .resume-workbench-layout > :deep(.resume-section-rail) {
    display: none;
  }

  .resume-workbench-layout > :deep(.mobile-pane-editor),
  .resume-workbench-layout > :deep(.mobile-pane-inspector),
  .resume-workbench-layout > :deep(.mobile-pane-preview) {
    display: none;
  }

  .resume-workbench-layout.is-mobile-edit > :deep(.mobile-pane-editor) {
    display: flex;
  }

  .resume-workbench-layout.is-mobile-review > :deep(.mobile-pane-inspector),
  .resume-workbench-layout.is-mobile-ai > :deep(.mobile-pane-inspector) {
    display: flex;
  }

  .resume-workbench-layout.is-mobile-preview > :deep(.mobile-pane-preview) {
    display: flex;
  }

  .resume-workbench-layout > :deep(.resume-workbench-pane--editor),
  .resume-workbench-layout > :deep(.resume-workbench-pane--inspector),
  .resume-workbench-layout > :deep(.resume-workbench-pane--preview) {
    position: static;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    height: min(780px, calc(100dvh - 194px));
    max-height: min(780px, calc(100dvh - 194px));
    overflow: auto;
    border-left: 0;
  }

  .resume-workbench-layout > :deep(.resume-workbench-pane--editor > *),
  .resume-workbench-layout > :deep(.resume-workbench-pane--inspector > *) {
    visibility: visible;
  }
}

@media (max-width: 720px) {
  .resume-workbench-layout > :deep(.resume-workbench-pane--editor),
  .resume-workbench-layout > :deep(.resume-workbench-pane--inspector),
  .resume-workbench-layout > :deep(.resume-workbench-pane--preview) {
    height: auto;
    min-height: calc(100dvh - 158px);
    max-height: none;
  }
}
</style>
