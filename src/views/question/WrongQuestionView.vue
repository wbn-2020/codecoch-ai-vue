<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">错题本</h1>
        <p class="page-subtitle">查看由刷题记录生成的错题，支持分页、筛选和标记掌握。</p>
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
        <el-table v-loading="loading" :data="records" row-key="wrongRecordId">
          <el-table-column prop="title" label="题目" min-width="220" show-overflow-tooltip />
          <el-table-column prop="categoryName" label="分类" width="130" />
          <el-table-column label="难度" width="100">
            <template #default="{ row }">{{ getOptionLabel(difficultyOptions, row.difficulty) }}</template>
          </el-table-column>
          <el-table-column prop="wrongCount" label="错题次数" width="100" />
          <el-table-column prop="lastWrongAt" label="最近错误" min-width="160" />
          <el-table-column label="掌握状态" width="120">
            <template #default="{ row }">
              <StatusTag :status="row.masteryStatus" :map="masteryMap" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="router.push(`/questions/${row.questionId}`)">详情</el-button>
              <el-button link :loading="masteryChangingId === row.questionId" @click="markMastered(row)">
                标记掌握
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
          @change="fetchRecords"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getWrongQuestionsApi, updateQuestionMasteryApi } from '@/api/question'
import StatusTag from '@/components/common/StatusTag.vue'
import { difficultyOptions, MASTERY_STATUS } from '@/constants/enums'
import type { WrongQuestionQueryDTO, WrongQuestionVO } from '@/types/question'
import { getOptionLabel } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const masteryChangingId = ref<number | null>(null)
const records = ref<WrongQuestionVO[]>([])
const total = ref(0)

const query = reactive<WrongQuestionQueryDTO>({
  keyword: '',
  difficulty: '',
  pageNo: 1,
  pageSize: 10
})

const masteryMap = {
  MASTERED: '已掌握',
  VAGUE: '模糊',
  UNKNOWN: '未掌握'
}

const fetchRecords = async () => {
  loading.value = true
  try {
    const result = await getWrongQuestionsApi(query)
    records.value = result.records || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchRecords()
}

const handleReset = () => {
  Object.assign(query, { keyword: '', difficulty: '', pageNo: 1, pageSize: 10 })
  fetchRecords()
}

const markMastered = async (row: WrongQuestionVO) => {
  masteryChangingId.value = row.questionId
  try {
    const result = await updateQuestionMasteryApi(row.questionId, {
      masteryStatus: MASTERY_STATUS.MASTERED
    })
    row.masteryStatus = result.masteryStatus
    ElMessage.success('已标记为掌握')
  } finally {
    masteryChangingId.value = null
  }
}

onMounted(fetchRecords)
</script>

<style scoped lang="scss">
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}
</style>
