<template>
  <div class="question-meta">
    <el-tag type="info" effect="plain">{{ categoryName || '未分类' }}</el-tag>
    <el-tag effect="plain">{{ difficultyLabel }}</el-tag>
    <el-tag v-if="questionType" type="warning" effect="plain">{{ questionType }}</el-tag>
    <el-tag v-for="tag in tags" :key="tag.id" type="success" effect="plain">{{ tag.name }}</el-tag>
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
</script>

<style scoped lang="scss">
.question-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
