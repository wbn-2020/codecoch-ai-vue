<template>
  <div class="favorite-question-page page-shell">
    <section class="hero-band">
      <div class="hero-copy">
        <p class="hero-kicker">
          <BookmarkCheck :size="16" />
          收藏题清单
        </p>
        <h1>把高价值题目沉淀成复习路线</h1>
        <p>收藏题用于保存值得反复练的面试题。这里按题目卡片组织复习入口，支持继续训练和移出收藏。</p>
        <div class="hero-actions">
          <el-button @click="router.push('/questions/recommendations')">
            <Sparkles :size="16" />
            题库训练
          </el-button>
          <el-button type="primary" @click="router.push('/questions')">
            <Search :size="16" />
            去题库收藏
          </el-button>
        </div>
      </div>
      <aside class="hero-panel">
        <div class="hero-panel__stat"><span>收藏总数</span><strong>{{ total || favorites.length }}</strong></div>
        <div class="hero-panel__stat"><span>本页题目</span><strong>{{ favorites.length }}</strong></div>
        <div class="hero-panel__stat"><span>困难题</span><strong>{{ hardFavoriteCount }}</strong></div>
        <div class="hero-panel__stat"><span>覆盖分类</span><strong>{{ categoryCount || taggedCount }}</strong></div>
        <p>收藏清单只负责帮你挑出值得反复练的题，不会假装已经练完。</p>
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
          <p class="section-kicker">复习清单</p>
          <h2>按收藏继续训练</h2>
          <p>先按难度和标题筛一遍，再决定进入详情还是直接取消收藏。</p>
        </div>
        <div class="panel-actions">
          <el-button :loading="loading" @click="fetchFavorites">
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
          v-if="loadError && !loading"
          type="error"
          title="收藏题加载失败"
          :description="loadError"
        >
          <el-button type="primary" :loading="loading" @click="fetchFavorites">
            <RefreshCw :size="16" />
            重新加载
          </el-button>
        </AppState>

        <AppState
          v-else-if="!favorites.length && !loading"
          type="empty"
          title="还没有收藏题目"
          :description="favoriteEmptyDescription"
        >
          <el-button v-if="hasFilters" @click="handleReset">清空筛选</el-button>
          <el-button v-else type="primary" @click="router.push('/questions')">去题库收藏题目</el-button>
        </AppState>

        <article v-for="item in favorites" :key="getQuestionId(item)" class="question-card">
          <div class="question-main">
            <div class="question-head">
              <div>
                <span class="question-time">{{ formatDate(item.createdAt) }}</span>
                <h3>{{ item.title || '收藏题目' }}</h3>
              </div>
              <el-tag effect="plain">{{ getOptionLabel(difficultyOptions, item.difficulty) }}</el-tag>
            </div>

            <div class="tag-row">
              <span>{{ item.categoryName || '未分类' }}</span>
              <span>{{ getOptionLabel(difficultyOptions, item.difficulty) }}</span>
              <span>已加入复习清单</span>
              <span v-if="normalizeTags(item.tags).length">{{ normalizeTags(item.tags).slice(0, 2).join(' / ') }}</span>
            </div>

            <div class="review-block">
              <strong>收藏理由</strong>
              <p>{{ reviewReason(item) }}</p>
            </div>
          </div>

          <aside class="question-side">
            <div class="side-summary">
              <span>下一步</span>
              <strong>{{ actionHint(item) }}</strong>
              <small>{{ nextStepHint(item) }}</small>
            </div>
            <div class="card-actions">
              <el-button type="primary" @click="router.push(`/questions/${getQuestionId(item)}`)">
                练这题
                <ChevronRight :size="16" />
              </el-button>
              <el-button type="danger" plain :loading="removingId === getQuestionId(item)" @click="removeFavorite(item)">
                取消收藏
              </el-button>
            </div>
          </aside>
        </article>
      </div>

      <div v-if="favorites.length || total > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[6, 10, 20, 50]"
          @change="fetchFavorites"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BookmarkCheck, ChevronRight, RefreshCw, Search, Sparkles } from 'lucide-vue-next'

import { getFavoriteQuestionsApi, unfavoriteQuestionApi } from '@/api/question'
import AppState from '@/components/common/AppState.vue'
import { difficultyOptions } from '@/constants/enums'
import type { FavoriteQuestionVO, QuestionQueryDTO } from '@/types/question'
import { getErrorMessage } from '@/utils/error'
import { getOptionLabel } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const removingId = ref<number | null>(null)
const favorites = ref<FavoriteQuestionVO[]>([])
const total = ref(0)
const loadError = ref('')

const query = reactive<QuestionQueryDTO>({
  keyword: '',
  difficulty: '',
  pageNo: 1,
  pageSize: 6
})

const hasFilters = computed(() => Boolean(query.keyword || query.difficulty))
const hardFavoriteCount = computed(() => favorites.value.filter((item) => String(item.difficulty || '').toUpperCase() === 'HARD').length)
const categoryCount = computed(() => new Set(favorites.value.map((item) => item.categoryName).filter(Boolean)).size)
const taggedCount = computed(() => favorites.value.filter((item) => normalizeTags(item.tags).length > 0).length)
const favoriteEmptyDescription = computed(() =>
  hasFilters.value ? '没有匹配当前筛选条件的收藏题。' : '收藏高价值题目后，这里会形成你的面试复习清单。'
)

const insightCards = computed(() => [
  { label: '收藏总数', value: total.value || favorites.value.length, desc: '你的累计收藏题' },
  { label: '本页题目', value: favorites.value.length, desc: '当前筛选结果中的可练题' },
  { label: '困难题', value: hardFavoriteCount.value, desc: '适合安排到专项训练' },
  { label: '覆盖分类', value: categoryCount.value || taggedCount.value, desc: categoryCount.value ? '本页题目涉及的分类数' : '本页带标签题目数量' }
])

const fetchFavorites = async () => {
  loading.value = true
  try {
    const result = await getFavoriteQuestionsApi(query)
    favorites.value = result.records || []
    total.value = result.total || 0
    loadError.value = ''
  } catch (error) {
    favorites.value = []
    total.value = 0
    loadError.value = getErrorMessage(error, '收藏题暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchFavorites()
}

const handleReset = () => {
  Object.assign(query, { keyword: '', difficulty: '', pageNo: 1, pageSize: 6 })
  fetchFavorites()
}

const getQuestionId = (row: FavoriteQuestionVO) => row.questionId || row.id || row.favoriteId || 0

const normalizeTags = (tags?: FavoriteQuestionVO['tags']) => {
  if (!Array.isArray(tags)) return []
  return tags
    .map((tag) => (typeof tag === 'string' ? tag : tag.name || tag.tagName || tag.code || ''))
    .filter(Boolean)
}

const formatDate = (value?: string) => {
  if (!value) return '收藏时间未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const reviewReason = (item: FavoriteQuestionVO) => {
  const tags = normalizeTags(item.tags)
  if (tags.length) return `已关联 ${tags.slice(0, 3).join('、')}，适合复习时补充项目表达。`
  if (item.categoryName) return `收藏在「${item.categoryName}」分类下，建议和同类题一起训练。`
  return '暂未关联分类或标签，可直接进入题目详情继续练习。'
}

const actionHint = (item: FavoriteQuestionVO) => {
  if (String(item.difficulty || '').toUpperCase() === 'HARD') return '先写答题骨架'
  if (String(item.difficulty || '').toUpperCase() === 'MEDIUM') return '练项目结合表达'
  return '适合快速热身'
}

const nextStepHint = (item: FavoriteQuestionVO) => {
  const tags = normalizeTags(item.tags)
  if (tags.length) return '先看标签，再进详情页补齐知识点。'
  if (item.categoryName) return '和同分类题目串起来练，效果更稳。'
  return '直接点进题目详情，边看边练。'
}

const removeFavorite = async (row: FavoriteQuestionVO) => {
  const questionId = getQuestionId(row)
  if (!questionId) return
  removingId.value = questionId
  try {
    await unfavoriteQuestionApi(questionId)
    ElMessage.success('已取消收藏')
    await fetchFavorites()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '取消收藏失败，请稍后重试。'))
  } finally {
    removingId.value = null
  }
}

onMounted(fetchFavorites)
</script>

<style scoped lang="scss">
.favorite-question-page {
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
