<template>
  <el-form class="filter-form" :model="model" inline>
    <el-form-item label="关键词">
      <el-input v-model.trim="model.keyword" clearable placeholder="题目标题关键字" />
    </el-form-item>
    <el-form-item label="分类">
      <el-select v-model="model.categoryId" clearable placeholder="全部分类" style="width: 160px">
        <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
    </el-form-item>
    <el-form-item label="标签">
      <el-select
        v-model="model.tagIds"
        multiple
        collapse-tags
        clearable
        placeholder="全部标签"
        style="width: 220px"
      >
        <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
    </el-form-item>
    <el-form-item label="难度">
      <el-select v-model="model.difficulty" clearable placeholder="全部" style="width: 120px">
        <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="$emit('search')">查询</el-button>
      <el-button @click="$emit('reset')">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { difficultyOptions } from '@/constants/enums'
import type { QuestionCategoryVO, QuestionQueryDTO, QuestionTagVO } from '@/types/question'

defineEmits<{
  search: []
  reset: []
}>()

defineProps<{
  model: QuestionQueryDTO
  categories: QuestionCategoryVO[]
  tags: QuestionTagVO[]
}>()
</script>
