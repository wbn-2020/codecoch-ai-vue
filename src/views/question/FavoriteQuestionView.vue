<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">收藏题目</h1>
        <p class="page-subtitle">集中查看已收藏题目，支持取消收藏并跳转详情继续练习。</p>
      </div>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="题目标题" />
          </el-form-item>
          <el-form-item label="难度">
            <el-select v-model="query.difficulty" clearable placeholder="全部" style="width: 120px">
              <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card">
        <el-table v-loading="loading" :data="favorites" :row-key="getQuestionId">
          <el-table-column prop="title" label="题目" min-width="240" show-overflow-tooltip />
          <el-table-column prop="categoryName" label="分类" width="140" />
          <el-table-column label="难度" width="100">
            <template #default="{ row }">{{ getOptionLabel(difficultyOptions, row.difficulty) }}</template>
          </el-table-column>
          <el-table-column prop="createdAt" label="收藏时间" min-width="170" />
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="router.push(`/questions/${getQuestionId(row)}`)">详情</el-button>
              <el-button link type="danger" :loading="removingId === getQuestionId(row)" @click="removeFavorite(row)">
                取消收藏
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @change="fetchFavorites"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getFavoriteQuestionsApi, unfavoriteQuestionApi } from '@/api/question'
import { difficultyOptions } from '@/constants/enums'
import type { FavoriteQuestionVO, QuestionQueryDTO } from '@/types/question'
import { getOptionLabel } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const removingId = ref<number | null>(null)
const favorites = ref<FavoriteQuestionVO[]>([])
const total = ref(0)

const query = reactive<QuestionQueryDTO>({
  keyword: '',
  difficulty: '',
  pageNo: 1,
  pageSize: 10
})

const fetchFavorites = async () => {
  loading.value = true
  try {
    const result = await getFavoriteQuestionsApi(query)
    favorites.value = result.records || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchFavorites()
}

const handleReset = () => {
  Object.assign(query, { keyword: '', difficulty: '', pageNo: 1, pageSize: 10 })
  fetchFavorites()
}

const getQuestionId = (row: FavoriteQuestionVO) => row.questionId || row.id || row.favoriteId || 0

const removeFavorite = async (row: FavoriteQuestionVO) => {
  const questionId = getQuestionId(row)
  if (!questionId) return
  removingId.value = questionId
  try {
    await unfavoriteQuestionApi(questionId)
    ElMessage.success('已取消收藏')
    await fetchFavorites()
  } finally {
    removingId.value = null
  }
}

onMounted(fetchFavorites)
</script>

<style scoped lang="scss">
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}
</style>
