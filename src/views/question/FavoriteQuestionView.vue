<template>
  <div class="favorite-question-page page-shell">
    <PageHeader
      class="favorite-question-page__head"
      title="把高价值题目沉淀成复习路线"
      description="从收藏里挑一组重点题，集中练习并保留真正有用的内容。"
    >
      <template #eyebrow>
        <BookmarkCheck :size="13" aria-hidden="true" />
        收藏复习
      </template>
      <template #actions>
        <el-button type="primary" @click="startFavoritePractice">
          <BookmarkCheck :size="16" />
          进入收藏训练
        </el-button>
        <el-button @click="router.push('/questions/recommendations')">
          <Sparkles :size="16" />
          今日推荐
        </el-button>
      </template>
    </PageHeader>

    <ModuleTabs :items="moduleTabs" />

    <section class="favorite-metrics">
      <StatCard label="本页可复习" :value="favorites.length" />
      <StatCard label="困难题" :value="hardFavoriteCount" />
      <p class="favorite-metrics__note">累计收藏 {{ total || favorites.length }} 道题。</p>
    </section>

    <section class="source-panel">
      <header class="panel-head">
        <div>
          <p class="section-kicker">复习路线</p>
          <h2>按收藏路线继续训练</h2>
          <p>先筛选，再练习；不再需要的题目可随时移出收藏。</p>
        </div>
        <div class="panel-actions">
          <el-button :loading="loading" @click="fetchFavorites">
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
          <el-button v-else type="primary" @click="router.push('/questions/recommendations')">去今日题组找题</el-button>
        </AppState>

        <article v-for="item in favorites" :key="getQuestionId(item)" class="question-card">
          <div class="question-main">
            <div class="question-head">
              <div>
                <span class="question-time">{{ formatDate(item.createdAt) }}</span>
                <h3>{{ item.title || '收藏复习题' }}</h3>
              </div>
              <el-tag effect="plain">{{ getOptionLabel(difficultyOptions, item.difficulty) }}</el-tag>
            </div>

            <div class="tag-row">
              <span>{{ item.categoryName || '未分类' }}</span>
              <span>{{ getOptionLabel(difficultyOptions, item.difficulty) }}</span>
              <span v-if="normalizeTags(item.tags).length">{{ normalizeTags(item.tags).slice(0, 2).join(' / ') }}</span>
            </div>

            <div class="review-block">
              <strong>复习价值</strong>
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
                复习这题
                <ChevronRight :size="16" />
              </el-button>
              <el-button plain :loading="removingId === getQuestionId(item)" @click="removeFavorite(item)">
                移出收藏
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
import ModuleTabs from '@/components/user-ui/ModuleTabs.vue'
import PageHeader from '@/components/user-ui/PageHeader.vue'
import StatCard from '@/components/user-ui/StatCard.vue'
import { difficultyOptions } from '@/constants/enums'
import { useUserModuleTabs } from '@/composables/useUserModuleTabs'
import type { FavoriteQuestionVO, QuestionQueryDTO } from '@/types/question'
import { getErrorMessage } from '@/utils/error'
import { getOptionLabel } from '@/utils/format'

const router = useRouter()
const moduleTabs = useUserModuleTabs('train')
const loading = ref(false)
const removingId = ref<number | null>(null)
const favorites = ref<FavoriteQuestionVO[]>([])
const total = ref(0)
const loadError = ref('')
const FAVORITE_LOAD_TIMEOUT_MS = 15000

const withFavoriteLoadTimeout = <T>(promise: Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('收藏题读取超时，请稍后重试。'))
    }, FAVORITE_LOAD_TIMEOUT_MS)
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      }
    )
  })

const query = reactive<QuestionQueryDTO>({
  keyword: '',
  difficulty: '',
  pageNo: 1,
  pageSize: 6
})

const hasFilters = computed(() => Boolean(query.keyword || query.difficulty))
const hardFavoriteCount = computed(() => favorites.value.filter((item) => String(item.difficulty || '').toUpperCase() === 'HARD').length)
const favoriteEmptyDescription = computed(() =>
  hasFilters.value ? '没有匹配当前筛选条件的收藏题。' : '收藏高价值题目后，这里会形成你的面试复习路线。'
)

const fetchFavorites = async () => {
  loading.value = true
  try {
    const result = await withFavoriteLoadTimeout(getFavoriteQuestionsApi(query))
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
  return '暂未关联分类或标签，可直接进入训练页继续练习。'
}

const actionHint = (item: FavoriteQuestionVO) => {
  if (String(item.difficulty || '').toUpperCase() === 'HARD') return '先写答题骨架'
  if (String(item.difficulty || '').toUpperCase() === 'MEDIUM') return '练项目结合表达'
  return '适合快速热身'
}

const nextStepHint = (item: FavoriteQuestionVO) => {
  const tags = normalizeTags(item.tags)
  if (tags.length) return '先看标签，再进训练页补齐知识点。'
  if (item.categoryName) return '和同分类题目串起来练，效果更稳。'
  return '直接进入训练页，边看边练。'
}

const startFavoritePractice = () => {
  router.push({
    path: '/questions/practice',
    query: { mode: 'favorite' }
  })
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
  min-width: 0;
  gap: 18px;
}

// PageHeader 自带 margin-bottom，交给 grid gap 统一控制节奏
.favorite-question-page__head {
  margin-bottom: 0;
}

.favorite-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  align-items: start;
  min-width: 0;
}

.favorite-metrics__note {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--user-text-muted);
  font-size: var(--user-text-body-sm, 13px);
  line-height: 1.6;
}

.panel-actions,
.question-head,
.card-actions,
.side-summary {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-kicker {
  margin: 0;
  color: var(--user-primary);
  font-size: var(--user-text-overline, 11px);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.panel-head h2,
.question-card h3 {
  margin: 0;
  color: var(--user-text);
}

.panel-head p,
.review-block p,
.side-summary span,
.side-summary small {
  color: var(--user-text-secondary);
}

.question-card {
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-lg, 14px);
  background: var(--user-surface);
  box-shadow: var(--user-shadow-xs);
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
  margin-top: 5px;
  font-size: var(--user-text-h3, 17px);
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.panel-head p {
  margin: 6px 0 0;
  max-width: 620px;
  font-size: var(--user-text-body-sm, 13px);
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
  font-size: var(--user-text-caption, 12px);
  font-weight: 500;
}

.question-card h3 {
  font-size: var(--user-text-h3, 17px);
  font-weight: 600;
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
  border-radius: var(--user-radius-full, 999px);
  background: var(--user-control-bg-muted);
  color: var(--user-text-secondary);
  font-size: var(--user-text-caption, 12px);
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
  font-weight: 600;
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
  font-size: var(--user-text-h4, 15px);
  font-weight: 600;
  line-height: 1.4;
}

.card-actions {
  flex-wrap: wrap;
}

.card-actions :deep(.el-button),
.panel-actions :deep(.el-button) {
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
  .card-actions {
    flex-direction: column;
  }

  .question-side {
    padding: 14px 0 0;
    border-top: 1px dashed var(--user-border-strong);
    border-left: 0;
  }

  .card-actions :deep(.el-button),
  .panel-actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }

  .pagination-wrap {
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
