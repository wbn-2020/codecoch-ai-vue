<template>
  <div class="question-meta">
    <el-tag type="info" effect="plain">{{ categoryName || '未分类' }}</el-tag>
    <el-tag effect="plain">{{ difficultyLabel }}</el-tag>
    <el-tag v-if="questionTypeLabel" type="warning" effect="plain">{{ questionTypeLabel }}</el-tag>
    <el-tag v-for="tag in tags" :key="`${tag.id}-${tag.name || tag.tagName}`" type="success" effect="plain">
      {{ tag.name || tag.tagName }}
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
const questionTypeLabel = computed(() => {
  const map: Record<string, string> = {
    SHORT_ANSWER: '简答',
    SCENARIO: '场景题',
    CODING: '编程题'
  }
  return props.questionType ? map[props.questionType] || '题型待确认' : ''
})
</script>

<style scoped lang="scss">
.question-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
