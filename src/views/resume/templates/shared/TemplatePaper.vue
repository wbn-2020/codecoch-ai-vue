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

import { alphaAccent, resolveAccentHex, shadeAccent } from '@/features/resume-document'
import type { ResumeRenderModel } from '@/features/resume-template/schema'

const props = withDefaults(defineProps<{
  model: ResumeRenderModel
  variant?: 'classic' | 'modern' | 'left-right'
  /**
   * 自动一页模式的实测压缩系数（1 = 不压缩）。
   * 只在预览画布传入；打印/导出路径保持默认，避免影响正式排版。
   */
  fitScale?: number
}>(), {
  variant: 'modern',
  fitScale: 1
})

/** 主题色为自由 hex（resolveAccentHex 迁移旧枚举）；strong/soft 由 hex 派生。 */

const pointsToPixels = (points: number) =>
  Math.round(points * (4 / 3) * 100) / 100

const accentHex = computed(() => resolveAccentHex(props.model.presentation.accentColor))

const paperStyle = computed(() => ({
  '--template-font-family': props.model.presentation.fontFamily,
  '--template-font-scale': String(
    props.model.presentation.fontScale
      * (props.model.density === 'compact' ? 0.92 : 1)
      * (props.model.presentation.autoOnePage ? 0.9 : 1)
      * props.fitScale
  ),
  '--template-line-height': String(props.model.presentation.lineHeight),
  '--template-section-gap': `${18
    * props.model.presentation.sectionSpacing
    * (props.model.density === 'compact' ? 0.86 : 1)
    * (props.model.presentation.autoOnePage ? 0.82 : 1)
    * props.fitScale}px`,
  '--template-page-margin': `${pointsToPixels(props.model.presentation.pageMarginPt)}px`,
  '--template-accent': accentHex.value,
  '--template-accent-strong': shadeAccent(accentHex.value, 0.22),
  '--template-accent-soft': alphaAccent(accentHex.value, 0.1)
}))
</script>

<style scoped>
.template-paper {
  --template-accent: #0047AB;
  --template-accent-strong: #003a8c;
  --template-accent-soft: rgba(0, 71, 171, 0.1);
  --template-ink: #1a1917;
  --template-body: #3a3630;
  --template-muted: #6e6963;
  container: template-paper / inline-size;
  box-sizing: border-box;
  width: 794px;
  max-width: none;
  /* 纸张随内容生长（magic-resume 式连续纸）：内容不足一页时由 min-height 撑出 A4 版面，
     超过一页时由预览画布叠加分页参考线，而不是把内容挤出纸外。 */
  min-height: 1123px;
  padding: var(--template-page-margin);
  border: 0;
  border-radius: 2px;
  background: #ffffff;
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.25);
  color: var(--template-ink);
  font-family: var(--template-font-family), Arial, "Microsoft YaHei", sans-serif;
  line-height: var(--template-line-height);
  overflow-wrap: anywhere;
}

.template-paper--left-right {
  display: grid;
  grid-template-columns: minmax(150px, 28%) minmax(0, 1fr);
  padding: 0;
}

.template-paper--empty {
  display: block;
}
</style>
