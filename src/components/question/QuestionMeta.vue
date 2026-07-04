<template>
  <div class="question-meta">
    <el-tag class="meta-tag" type="info" effect="plain">{{ categoryName || '通用训练' }}</el-tag>
    <el-tag class="meta-tag" effect="plain">{{ difficultyLabel }}</el-tag>
    <el-tag v-if="questionTypeLabel" class="meta-tag" type="warning" effect="plain">{{ questionTypeLabel }}</el-tag>
    <el-tag
      v-for="tag in visibleTags"
      :key="`${tag.id}-${tag.name || tag.tagName}`"
      class="meta-tag"
      type="success"
      effect="plain"
    >
      {{ tag.name || tag.tagName }}
    </el-tag>
    <el-tag v-if="hiddenTagCount > 0" class="meta-tag" type="success" effect="plain">
      +{{ hiddenTagCount }} 个标签
    </el-tag>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { difficultyOptions } from '@/constants/enums'
import type { QuestionDifficulty, QuestionTagVO } from '@/types/question'
import { getOptionLabel } from '@/utils/format'

const props = defineProps<{
  categoryName?: string
  difficulty?: QuestionDifficulty
  questionType?: string
  tags?: QuestionTagVO[]
}>()

const difficultyLabel = computed(() => getOptionLabel(difficultyOptions, props.difficulty))
const visibleTags = computed(() => (props.tags || []).filter((tag) => tag?.name || tag?.tagName).slice(0, 4))
const hiddenTagCount = computed(() => Math.max((props.tags || []).length - visibleTags.value.length, 0))
const questionTypeLabel = computed(() => {
  const map: Record<string, string> = {
    SHORT_ANSWER: '表达题',
    SCENARIO: '场景拆解',
    CODING: '代码思路'
  }
  return props.questionType ? map[props.questionType] || '题型待确认' : ''
})
</script>

<style scoped lang="scss">
.question-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.meta-tag {
  max-width: 180px;
}

.meta-tag :deep(.el-tag__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
