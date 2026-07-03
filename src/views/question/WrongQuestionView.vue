<template>
  <div class="wrong-question-page page-shell">
    <section class="hero-band">
      <div class="hero-copy">
        <p class="hero-kicker">
          <RotateCcw :size="16" />
          错题复盘
        </p>
        <h1>把答错的题变成下一轮训练重点</h1>
        <p>错题不再只是单独清单。这里按薄弱度、最近出错时间和掌握状态组织复盘入口，帮助你快速决定先重练哪一道。</p>
        <div class="hero-actions">
          <el-button @click="router.push('/questions/recommendations')">
            <Sparkles :size="16" />
            题库训练
          </el-button>
          <el-button type="primary" @click="router.push('/questions/practice')">
            <PenLine :size="16" />
            开始专项练习
          </el-button>
        </div>
      </div>
      <aside class="hero-panel">
        <div class="hero-panel__stat"><span>错题总数</span><strong>{{ total || records.length }}</strong></div>
        <div class="hero-panel__stat"><span>本页待复盘</span><strong>{{ unresolvedRecords.length }}</strong></div>
        <div class="hero-panel__stat"><span>重复出错</span><strong>{{ repeatedWrongCount }}</strong></div>
        <div class="hero-panel__stat"><span>困难题</span><strong>{{ hardWrongCount }}</strong></div>
        <p>先把重复出错的题挑出来，再去看答案和表达方式。</p>
      </aside>
    </section>

    <section class="insight-grid">
      <article v-for="item in insightCards" :key="item.label" class="insight-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.desc }}</p>
      </article>
    </section>

    <section class="source-panel">
      <header class="panel-head">
        <div>
          <p class="section-kicker">复盘路线</p>
          <h2>先看高频出错，再点进题目详情做一轮完整复盘。</h2>
          <p>先处理重复出错和困难题，再决定要不要直接重练。</p>
        </div>
        <div class="panel-actions">
          <el-button :loading="loading" @click="fetchRecords">
            <RefreshCw :size="16" />
            刷新
          </el-button>
          <el-button @click="handleReset">重置筛选</el-button>
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
          v-if="!records.length && !loading"
          type="empty"
          title="暂无错题记录"
          :description="wrongEmptyDescription"
        >
          <el-button v-if="hasFilters" @click="handleReset">清空筛选</el-button>
          <el-button v-else type="primary" @click="router.push('/questions/practice')">开始一次刷题</el-button>
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
              <span>{{ masteryMap[normalizeMastery(record.masteryStatus)] || '掌握状态待确认' }}</span>
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
  pageSize: 6
})

const masteryMap: Record<string, string> = {
  MASTERED: '已掌握',
  VAGUE: '模糊',
  UNKNOWN: '未掌握'
}

const hasFilters = computed(() => Boolean(query.keyword || query.difficulty))
const unresolvedRecords = computed(() => records.value.filter((record) => normalizeMastery(record.masteryStatus) !== 'MASTERED'))
const repeatedWrongCount = computed(() => records.value.reduce((sum, record) => sum + Math.max((record.wrongCount || 0) - 1, 0), 0))
const hardWrongCount = computed(() => records.value.filter((record) => String(record.difficulty || '').toUpperCase() === 'HARD').length)
const wrongEmptyDescription = computed(() =>
  hasFilters.value ? '没有匹配当前筛选条件的错题。' : '完成刷题练习后，答错的题会自动沉淀到这里。'
)

const insightCards = computed(() => [
  { label: '错题总数', value: total.value || records.value.length, desc: '你的累计错题记录' },
  { label: '本页待复盘', value: unresolvedRecords.value.length, desc: '未掌握或仍然模糊的题目' },
  { label: '重复出错', value: repeatedWrongCount.value, desc: '本页错题的额外出错次数' },
  { label: '困难题', value: hardWrongCount.value, desc: '建议优先拆成小步复盘' }
])

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

const reviewStep = (record: WrongQuestionVO) => {
  if (normalizeMastery(record.masteryStatus) === 'MASTERED') return '确认是否需要降频，避免重复占用精力。'
  if ((record.wrongCount || 0) >= 3) return '先回看题干，再口述一版思路，最后补一遍答案结构。'
  return '进入详情页，用 1 分钟重写结论，再对照答案修正。'
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
  } finally {
    masteryChangingId.value = null
  }
}

onMounted(fetchRecords)
</script>

<style scoped lang="scss">
.wrong-question-page {
  display: grid;
  gap: 22px;
}

.hero-band {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  padding: 28px;
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(20, 184, 166, 0.05)),
    var(--app-surface, #ffffff);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.07);
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
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.hero-copy h1,
.panel-head h2,
.question-card h3 {
  margin: 0;
  color: var(--app-text, #111827);
}

.hero-copy h1 {
  font-size: 32px;
  line-height: 1.18;
}

.hero-copy p,
.hero-panel p,
.panel-head p,
.insight-card p,
.review-block p,
.side-summary span,
.side-summary small {
  color: var(--app-text-muted, #64748b);
}

.hero-copy p {
  max-width: 740px;
  margin: 12px 0 0;
  line-height: 1.8;
}

.hero-actions {
  flex-wrap: wrap;
  margin-top: 22px;
}

.hero-panel {
  display: grid;
  gap: 12px;
  align-content: start;
  padding: 18px;
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.88);
}

.hero-panel__stat {
  justify-content: space-between;
}

.hero-panel__stat span {
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
}

.hero-panel__stat strong {
  color: var(--app-text, #111827);
  font-size: 18px;
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.insight-card,
.source-panel,
.question-card {
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 8px;
  background: var(--app-surface, #ffffff);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
}

.insight-card {
  padding: 18px;
}

.insight-card span,
.question-side span,
.question-time {
  color: var(--app-text-muted, #64748b);
  font-size: 13px;
}

.insight-card strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text, #111827);
  font-size: 26px;
  line-height: 1.1;
}

.source-panel {
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 18px 0;
}

.panel-head h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
}

.panel-head p {
  margin: 6px 0 0;
  font-size: 13px;
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
  padding: 18px;
}

.question-stream {
  min-height: 260px;
  padding: 0 18px 18px;
}

.question-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  gap: 20px;
  padding: 20px;
}

.question-card + .question-card {
  margin-top: 14px;
}

.question-time {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
}

.question-card h3 {
  font-size: 18px;
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
  background: #f1f5f9;
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
}

.review-block {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #dbe3ee;
}

.review-block strong {
  display: block;
  margin-bottom: 6px;
  color: var(--app-text, #111827);
}

.question-side {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.side-summary strong {
  display: block;
  margin: 6px 0 8px;
  color: var(--app-text, #111827);
  font-size: 16px;
  line-height: 1.4;
}

.card-actions {
  flex-wrap: wrap;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 0 18px 18px;
}

@media (max-width: 980px) {
  .hero-band,
  .question-card {
    grid-template-columns: 1fr;
  }

  .insight-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
    padding: 22px;
  }

  .hero-copy h1 {
    font-size: 28px;
  }

  .insight-grid {
    grid-template-columns: 1fr;
  }

  .card-actions {
    flex-direction: column;
  }
}
</style>
