<template>
  <el-form class="filter-form" :model="model" inline>
    <el-form-item label="训练关键词">
      <el-input v-model.trim="model.keyword" clearable placeholder="按题目、知识点或业务场景筛题">
        <template #prefix>
          <Search :size="15" />
        </template>
      </el-input>
    </el-form-item>
    <el-form-item label="分类">
      <el-select v-model="model.categoryId" clearable placeholder="全部分类" class="filter-select">
        <el-option v-for="item in validCategories" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
    </el-form-item>
    <el-form-item label="标签">
      <el-select
        v-model="model.tagId"
        clearable
        placeholder="全部标签"
        class="filter-select is-wide"
      >
        <el-option v-for="item in validTags" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
    </el-form-item>
    <el-form-item label="难度">
      <el-select v-model="model.difficulty" clearable placeholder="不限难度" class="filter-select is-narrow">
        <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
    </el-form-item>
    <el-form-item label="掌握状态">
      <el-select v-model="model.masteryStatus" clearable placeholder="全部状态" class="filter-select">
        <el-option label="已掌握" value="MASTERED" />
        <el-option label="模糊" value="VAGUE" />
        <el-option label="未掌握" value="UNKNOWN" />
      </el-select>
    </el-form-item>
    <el-form-item label="收藏">
      <el-switch v-model="model.favoriteOnly" active-text="只看收藏" inactive-text="全部题" />
    </el-form-item>
    <el-form-item class="filter-actions">
      <el-button type="primary" @click="$emit('search')">
        <SlidersHorizontal :size="15" />
        筛出训练题
      </el-button>
      <el-button @click="$emit('reset')">
        <RotateCcw :size="15" />
        清空
      </el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-vue-next'

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

<style scoped lang="scss">
.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px 12px;
}

.filter-form :deep(.el-form-item) {
  margin: 0;
}

.filter-select {
  width: 150px;
}

.filter-select.is-wide {
  width: 210px;
}

.filter-select.is-narrow {
  width: 130px;
}

.filter-actions :deep(.el-form-item__content),
.filter-actions :deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 720px) {
  .filter-form {
    display: grid;
    grid-template-columns: 1fr;
  }

  .filter-form :deep(.el-form-item),
  .filter-form :deep(.el-form-item__content),
  .filter-form :deep(.el-input),
  .filter-form :deep(.el-select),
  .filter-form :deep(.el-button) {
    width: 100%;
  }

  .filter-actions :deep(.el-form-item__content) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
}
</style>
