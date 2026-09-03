<template>
  <article
    class="template-paper resume-document"
    :class="[
      `template-paper--${variant}`,
      `template-paper--identity-${model.basicLayout.toLowerCase()}`,
      { 'template-paper--empty': !model.hasContent }
    ]"
    :style="paperStyle"
  >
    <slot />
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { ResumeRenderModel } from '@/features/resume-template/schema'

const props = withDefaults(defineProps<{
  model: ResumeRenderModel
  variant?: 'classic' | 'modern' | 'left-right'
}>(), {
  variant: 'modern'
})

const accentColors = {
  default: { accent: '#1b1b18', strong: '#11110f', soft: '#f1f0ee' },
  blue: { accent: '#3E6AAE', strong: '#2A4E86', soft: '#eef2fb' },
  green: { accent: '#1f6f5c', strong: '#17493d', soft: '#eaf2ef' },
  purple: { accent: '#7E6CB0', strong: '#5A4D8A', soft: '#f4f1fb' },
  orange: { accent: '#f97316', strong: '#c2410c', soft: '#fff7ed' },
  red: { accent: '#ef4444', strong: '#b91c1c', soft: '#fef2f2' },
  slate: { accent: '#57534e', strong: '#3a3630', soft: '#f0efeb' },
  black: { accent: '#000000', strong: '#000000', soft: '#f5f5f5' }
} as const

const pointsToPixels = (points: number) =>
  Math.round(points * (4 / 3) * 100) / 100

const paperStyle = computed(() => ({
  '--template-font-family': props.model.presentation.fontFamily,
  '--template-font-scale': String(
    props.model.presentation.fontScale
      * (props.model.density === 'compact' ? 0.92 : 1)
      * (props.model.presentation.autoOnePage ? 0.9 : 1)
  ),
  '--template-line-height': String(props.model.presentation.lineHeight),
  '--template-section-gap': `${18
    * props.model.presentation.sectionSpacing
    * (props.model.density === 'compact' ? 0.86 : 1)
    * (props.model.presentation.autoOnePage ? 0.82 : 1)}px`,
  '--template-page-margin': `${pointsToPixels(props.model.presentation.pageMarginPt)}px`,
  '--template-accent': accentColors[props.model.presentation.accentColor].accent,
  '--template-accent-strong': accentColors[props.model.presentation.accentColor].strong,
  '--template-accent-soft': accentColors[props.model.presentation.accentColor].soft
}))
</script>

<style scoped>
.template-paper {
  --template-accent: #176b87;
  --template-accent-strong: #124f66;
  --template-accent-soft: #e8f2f4;
  --template-ink: #1a1917;
  --template-body: #3a3630;
  --template-muted: #6e6963;
  container: template-paper / inline-size;
  box-sizing: border-box;
  width: 794px;
  max-width: none;
  min-height: 1123px;
  aspect-ratio: 210 / 297;
  padding: var(--template-page-margin);
  border: 1px solid #d8d4cc;
  background: #ffffff;
  color: var(--template-ink);
  font-family: var(--template-font-family), Arial, "Microsoft YaHei", sans-serif;
  line-height: var(--template-line-height);
  overflow-wrap: anywhere;
}

.template-paper--classic {
  --template-accent: #166b75;
  --template-accent-strong: #0e4d55;
  --template-accent-soft: #e9f4f3;
}

.template-paper--left-right {
  --template-accent: #304b63;
  --template-accent-strong: #20394e;
  --template-accent-soft: #edf2f5;
  display: grid;
  grid-template-columns: minmax(150px, 28%) minmax(0, 1fr);
  padding: 0;
}

.template-paper--empty {
  display: block;
}
</style>
