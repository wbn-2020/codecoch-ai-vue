<template>
  <div class="wrong-question-page page-shell">
    <section class="hero-band">
      <div class="hero-copy">
        <p class="hero-kicker">
          <RotateCcw :size="16" />
          错题复盘
        </p>
        <h1>把答错的题练成下一轮的得分点</h1>
        <p>优先处理重复出错和高难度题，再回到训练页重组答案。</p>
        <div class="hero-actions">
          <el-button type="primary" @click="startWrongPractice">
            <PenLine :size="16" />
            进入复盘训练
          </el-button>
          <el-button @click="router.push('/questions/recommendations')">
            <Sparkles :size="16" />
            今日训练题组
          </el-button>
        </div>
      </div>
      <aside class="hero-panel">
        <div class="hero-panel__stat"><span>待优先复盘</span><strong>{{ todayReviewCount }}</strong></div>
        <div class="hero-panel__stat"><span>重复出错</span><strong>{{ repeatedWrongCount }}</strong></div>
        <p>本次已加载 {{ total || records.length }} 道错题。</p>
      </aside>
    </section>

    <section class="source-panel">
      <header class="panel-head">
        <div>
          <p class="section-kicker">复盘路线</p>
          <h2>从高频错题开始，逐题重练</h2>
          <p>筛选后进入详情完成答案复盘；“标记掌握”会降低后续优先级。</p>
        </div>
        <div class="panel-actions">
          <el-button :loading="loading" @click="fetchRecords">
            <RefreshCw :size="16" />
            刷新
          </el-button>
          <el-button @click="handleReset">清空筛选</el-button>
        </div>
      </header>

      <div class="filter-bar">
        <el-input
          v-model.trim="query.keyword"
          clearable
          placeholder="搜索题目标题"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <Search :size="16" />
          </template>
        </el-input>
        <el-select v-model="query.difficulty" clearable placeholder="难度" @change="handleSearch">
          <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>

      <div v-loading="loading" class="question-stream">
        <AppState
          v-if="loadError && !loading"
          type="error"
          title="错题复盘加载失败"
          :description="loadError"
        >
          <el-button type="primary" :loading="loading" @click="fetchRecords">
            <RefreshCw :size="16" />
            重新加载
          </el-button>
        </AppState>

        <AppState
          v-else-if="!records.length && !loading"
          type="empty"
          title="暂无错题记录"
          :description="wrongEmptyDescription"
        >
          <el-button v-if="hasFilters" @click="handleReset">清空筛选</el-button>
          <el-button v-else type="primary" @click="startWrongPractice">开始错题训练</el-button>
        </AppState>

        <article v-for="record in records" :key="record.wrongRecordId" class="question-card">
          <div class="question-main">
            <div class="question-head">
              <div>
                <span class="question-time">{{ formatDate(record.lastWrongAt) }}</span>
                <h3>{{ record.title || '待复习题目' }}</h3>
              </div>
              <StatusTag :status="record.masteryStatus" :map="masteryMap" />
            </div>

            <div class="tag-row">
              <span>{{ record.categoryName || '未分类' }}</span>
              <span>{{ getOptionLabel(difficultyOptions, record.difficulty) }}</span>
              <span>{{ record.wrongCount || 0 }} 次答错</span>
            </div>

            <div class="review-block">
              <strong>上次回答</strong>
              <p v-if="record.lastAnswer">{{ record.lastAnswer }}</p>
              <p v-else>暂无上次回答记录，可进入题目详情重新组织答案。</p>
            </div>
          </div>

          <aside class="question-side">
            <div class="side-summary">
              <span>复盘建议</span>
              <strong>{{ reviewHint(record) }}</strong>
              <small>{{ reviewStep(record) }}</small>
            </div>
            <div class="card-actions">
              <el-button type="primary" @click="router.push(`/questions/${record.questionId}`)">
                重练这题
                <ChevronRight :size="16" />
              </el-button>
              <el-button :loading="masteryChangingId === record.questionId" @click="markMastered(record)">标记掌握</el-button>
            </div>
          </aside>
        </article>
      </div>

      <div v-if="records.length || total > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[6, 10, 20, 50]"
          @change="fetchRecords"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronRight, PenLine, RefreshCw, RotateCcw, Search, Sparkles } from 'lucide-vue-next'

import { getWrongQuestionsApi, updateQuestionMasteryApi } from '@/api/question'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { difficultyOptions, MASTERY_STATUS } from '@/constants/enums'
import type { WrongQuestionQueryDTO, WrongQuestionVO } from '@/types/question'
import { getErrorMessage } from '@/utils/error'
import { getOptionLabel } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const masteryChangingId = ref<number | null>(null)
const records = ref<WrongQuestionVO[]>([])
const total = ref(0)
const loadError = ref('')

const query = reactive<WrongQuestionQueryDTO>({
  keyword: '',
  difficulty: '',
  pageNo: 1,
  pageSize: 6
})

const masteryMap: Record<string, string> = {
  MASTERED: '已掌握',
  VAGUE: '模糊',
  UNKNOWN: '未掌握'
}

const hasFilters = computed(() => Boolean(query.keyword || query.difficulty))
const repeatedWrongCount = computed(() => records.value.filter((record) => (record.wrongCount || 0) >= 2).length)
const todayReviewCount = computed(() => records.value.filter((record) => shouldReviewToday(record)).length)
const wrongEmptyDescription = computed(() =>
  hasFilters.value ? '没有匹配当前筛选条件的错题。' : '完成刷题练习后，答错的题会自动沉淀到这里。'
)

const normalizeMastery = (value?: string) => String(value || 'UNKNOWN').toUpperCase()

const formatDate = (value?: string) => {
  if (!value) return '最近错误时间未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const reviewHint = (record: WrongQuestionVO) => {
  if (normalizeMastery(record.masteryStatus) === 'MASTERED') return '已掌握，可低频回看'
  if ((record.wrongCount || 0) >= 3) return '高频错题，建议今天重练'
  if (String(record.difficulty || '').toUpperCase() === 'HARD') return '先拆概念，再练表达'
  return '适合作为热身复盘'
}

const shouldReviewToday = (record: WrongQuestionVO) => {
  if (normalizeMastery(record.masteryStatus) === 'MASTERED') return false
  return (record.wrongCount || 0) >= 2 || String(record.difficulty || '').toUpperCase() === 'HARD'
}

const startWrongPractice = () => {
  router.push({
    path: '/questions/practice',
    query: { mode: 'wrong' }
  })
}

const reviewStep = (record: WrongQuestionVO) => {
  if (normalizeMastery(record.masteryStatus) === 'MASTERED') return '确认是否需要降频，避免重复占用精力。'
  if ((record.wrongCount || 0) >= 3) return '先回看题干，再口述一版思路，最后补一遍答案结构。'
  return '进入训练页，用 1 分钟重写结论，再对照答案修正。'
}

const fetchRecords = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const result = await getWrongQuestionsApi(query)
    records.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    records.value = []
    total.value = 0
    loadError.value = getErrorMessage(error, '错题复盘暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchRecords()
}

const handleReset = () => {
  Object.assign(query, { keyword: '', difficulty: '', pageNo: 1, pageSize: 6 })
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
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '掌握状态暂时更新失败，请稍后重试。'))
  } finally {
    masteryChangingId.value = null
  }
}

onMounted(fetchRecords)
</script>

<style scoped lang="scss">
.wrong-question-page {
  display: grid;
  min-width: 0;
  gap: 22px;
}

.hero-band {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(204px, 236px);
  gap: 22px;
  padding: 22px 24px;
  border: 1.5px solid var(--user-primary-border);
  border-radius: 20px;
  background: var(--user-surface-tint);
  box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
}

.hero-kicker,
.hero-actions,
.panel-actions,
.question-head,
.card-actions,
.side-summary,
.hero-panel__stat {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-kicker,
.section-kicker {
  margin: 0;
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.hero-copy h1,
.panel-head h2,
.question-card h3 {
  margin: 0;
  color: var(--user-text);
}

.hero-copy h1 {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 900;
  line-height: 1.3;
}

.hero-copy p,
.hero-panel p,
.panel-head p,
.insight-card p,
.review-block p,
.side-summary span,
.side-summary small {
  color: var(--user-text-secondary);
}

.hero-copy p {
  max-width: 640px;
  margin: 8px 0 0;
  font-size: 13.5px;
  line-height: 1.6;
}

.hero-actions {
  flex-wrap: wrap;
  margin-top: 14px;
}

.hero-panel {
  display: grid;
  gap: 11px;
  align-content: center;
  padding-left: 24px;
  border-left: 1.5px solid var(--user-primary-border);
}

.hero-panel__stat {
  align-items: baseline;
  justify-content: flex-start;
  gap: 10px;
}

.hero-panel__stat span {
  color: var(--user-text-muted);
  font-size: 12px;
}

.hero-panel__stat strong {
  color: var(--user-text);
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
}

.question-card {
  border: 1px solid var(--user-border);
  border-radius: 16px;
  background: var(--user-surface);
  box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
}

.source-panel {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 0;
}

.panel-head h2 {
  margin: 0;
  margin-top: 5px;
  font-size: 19px;
  font-weight: 900;
  line-height: 1.35;
}

.panel-head p {
  margin: 6px 0 0;
  max-width: 620px;
  font-size: 13.5px;
  line-height: 1.6;
}

.panel-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.filter-bar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(140px, 180px);
  gap: 10px;
  align-items: center;
  padding: 0;
}

.question-stream {
  min-height: 0;
  padding: 0;
}

.question-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(184px, 204px);
  gap: 18px;
  padding: 16px 18px;
}

.question-card + .question-card {
  margin-top: 12px;
}

.question-time {
  display: block;
  margin-bottom: 6px;
  color: var(--user-text-subtle);
  font-size: 12px;
  font-weight: 600;
}

.question-card h3 {
  font-size: 17px;
  font-weight: 900;
  line-height: 1.35;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.tag-row span {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--user-control-bg-muted);
  color: var(--user-text-secondary);
  font-size: 12px;
}

.review-block {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--user-border);
}

.review-block strong {
  display: block;
  margin-bottom: 6px;
  color: var(--user-text);
}

.review-block p,
.side-summary small {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.question-side {
  display: grid;
  align-content: start;
  gap: 12px;
  padding-left: 20px;
  border-left: 1px dashed var(--user-border-strong);
}

.side-summary strong {
  display: block;
  margin: 6px 0 8px;
  color: var(--user-text);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.4;
}

.card-actions {
  flex-wrap: wrap;
}

.card-actions :deep(.el-button),
.panel-actions :deep(.el-button),
.hero-actions :deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 0;
}

@media (max-width: 980px) {
  .hero-band,
  .question-card {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    grid-template-columns: 1fr;
  }

  .panel-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .hero-band {
    gap: 18px;
    padding: 20px 18px;
  }

  .hero-panel {
    padding: 16px 0 0;
    border-top: 1.5px solid var(--user-primary-border);
    border-left: 0;
  }

  .hero-copy h1 {
    font-size: 23px;
  }

  .card-actions {
    flex-direction: column;
  }

  .question-side {
    padding: 14px 0 0;
    border-top: 1px dashed var(--user-border-strong);
    border-left: 0;
  }

  .card-actions :deep(.el-button),
  .panel-actions :deep(.el-button),
  .hero-actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }

  .pagination-wrap {
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
