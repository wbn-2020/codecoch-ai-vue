<template>
  <el-form class="filter-form" :model="model" inline>
    <el-form-item label="关键词">
      <el-input v-model.trim="model.keyword" clearable placeholder="题目、知识点或业务场景" />
    </el-form-item>
    <el-form-item label="分类">
      <el-select v-model="model.categoryId" clearable placeholder="全部分类" style="width: 160px">
        <el-option v-for="item in validCategories" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
    </el-form-item>
    <el-form-item label="标签">
      <el-select
        v-model="model.tagId"
        clearable
        placeholder="全部标签"
        style="width: 220px"
      >
        <el-option v-for="item in validTags" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
    </el-form-item>
    <el-form-item label="难度">
      <el-select v-model="model.difficulty" clearable placeholder="全部" style="width: 120px">
        <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
    </el-form-item>
    <el-form-item label="掌握状态">
      <el-select v-model="model.masteryStatus" clearable placeholder="全部状态" style="width: 130px">
        <el-option label="已掌握" value="MASTERED" />
        <el-option label="模糊" value="VAGUE" />
        <el-option label="未掌握" value="UNKNOWN" />
      </el-select>
    </el-form-item>
    <el-form-item label="收藏">
      <el-switch v-model="model.favoriteOnly" active-text="仅收藏" inactive-text="全部" />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="$emit('search')">开始筛选</el-button>
      <el-button @click="$emit('reset')">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { difficultyOptions } from '@/constants/enums'
import type { QuestionCategoryVO, QuestionQueryDTO, QuestionTagVO } from '@/types/question'

defineEmits<{
  search: []
  reset: []
}>()

const props = defineProps<{
  model: QuestionQueryDTO
  categories: QuestionCategoryVO[]
  tags: QuestionTagVO[]
}>()

const validCategories = computed(() =>
  (props.categories || []).filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name)
)

const validTags = computed(() =>
  (props.tags || []).filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name)
)
</script>
