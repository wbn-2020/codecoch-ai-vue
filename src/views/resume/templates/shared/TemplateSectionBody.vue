<template>
  <div class="template-section-body">
    <TemplateEntryList v-if="section.entries" :entries="section.entries" />
    <template v-else>
      <template v-for="(group, index) in groupedBlocks" :key="index">
        <ul v-if="group.kind === 'bullet'" class="template-section-body__list">
          <li v-for="text in group.texts" :key="text">{{ text }}</li>
        </ul>
        <ol v-else-if="group.kind === 'ordered'" class="template-section-body__list template-section-body__list--ordered">
          <li v-for="text in group.texts" :key="text">{{ text }}</li>
        </ol>
        <p v-for="text in group.kind === 'line' ? group.texts : []" :key="text" class="template-section-body__line">
          {{ text }}
        </p>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { ResumeBlock } from '@/features/resume-workbench/document'
import type { ResumeRenderSection } from '@/features/resume-template/schema'
import TemplateEntryList from '@/views/resume/templates/shared/TemplateEntryList.vue'

const props = defineProps<{ section: ResumeRenderSection }>()

interface BlockGroup {
  kind: ResumeBlock['kind']
  texts: string[]
}

/** 相邻同类块合并成列表，正文保持逐行段落。 */
const groupedBlocks = computed<BlockGroup[]>(() => {
  const groups: BlockGroup[] = []
  for (const block of props.section.blocks || []) {
    const text = block.text.trim()
    if (!text) continue
    const last = groups[groups.length - 1]
    if (last && last.kind === block.kind && block.kind !== 'line') {
      last.texts.push(text)
    } else {
      groups.push({ kind: block.kind, texts: [text] })
    }
  }
  return groups
})
</script>

<style scoped>
.template-section-body {
  display: grid;
  gap: 6px;
  color: var(--template-body, var(--paper-body, #303b47));
  font-size: calc(var(--template-body-size, var(--paper-body-size, 11px)) * var(--template-font-scale, var(--paper-font-scale, 1)));
  line-height: var(--template-line-height, var(--paper-line-height, 1.6));
}

.template-section-body__line {
  margin: 0;
}

.template-section-body__list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 16px;
}

.template-section-body__list li::marker {
  color: var(--template-accent, var(--paper-accent, #1779a7));
}
</style>
