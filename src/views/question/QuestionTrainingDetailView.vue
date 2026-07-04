<template>
  <div class="question-detail-page page-shell">
    <section class="detail-hero">
      <div>
        <div class="eyebrow">
          <MessageSquareText :size="16" />
          题目训练工作区
        </div>
        <h1>{{ detail?.title || '题目训练' }}</h1>
        <p>先用自己的语言回答，再用 AI 点评、参考答案和追问清单修正面试表达。</p>
        <div class="hero-rhythm" aria-label="训练节奏">
          <span>1 读题</span>
          <span>2 作答</span>
          <span>3 点评</span>
          <span>4 复盘</span>
        </div>
      </div>
      <div class="hero-actions">
        <el-button @click="router.back()">返回</el-button>
        <el-button type="primary" :disabled="!detail" @click="startPractice">
          <Play :size="16" />
          练这一题
        </el-button>
        <el-button :disabled="!detail" @click="router.push('/interviews/create')">
          <MessageSquare :size="16" />
          模拟面试
        </el-button>
      </div>
    </section>

    <section class="workspace-grid">
      <main class="content-card question-workspace" v-loading="loading">
        <div v-if="detail" class="content-card__body question-card">
          <div class="question-meta">
            <QuestionMeta
              :category-name="detail.category?.name || detail.categoryName"
              :difficulty="detail.difficulty"
              :question-type="detail.questionType"
              :tags="displayTags"
            />
          </div>

          <div v-if="recommendationContext.hasContext" class="recommendation-callout">
            <div>
              <span>{{ recommendationContext.sourceLabel }}</span>
              <strong>{{ recommendationContext.skillName || '岗位短板训练' }}</strong>
            </div>
            <el-tag :type="recommendationContext.trustType" effect="plain">{{ recommendationContext.trustLabel }}</el-tag>
            <p>这道题来自当前训练上下文，用于补齐面试风险点；如果来源不足，请按通用训练处理。</p>
            <small v-if="recommendationContext.boundary">{{ recommendationContext.boundary }}</small>
            <el-tag v-if="recommendationContext.gapSeverity" :type="severityTag(recommendationContext.gapSeverity)" effect="plain">
              {{ severityLabel(recommendationContext.gapSeverity) }}
            </el-tag>
          </div>

          <section class="question-content">
            <div class="section-title">
              <span>当前题目</span>
              <h2>先读题，再组织自己的回答</h2>
            </div>
            <MarkdownPreview :content="detail.content || '暂无题干内容'" />
          </section>

          <div class="answer-frame">
            <span>面试表达结构</span>
            <div class="answer-steps">
              <em>场景边界</em>
              <em>核心机制</em>
              <em>取舍风险</em>
              <em>项目证据</em>
            </div>
          </div>
        </div>
        <AppState v-else-if="!loading && loadError" type="error" title="题目加载失败" :description="loadError">
          <el-button type="primary" @click="fetchDetail">重试</el-button>
        </AppState>
        <AppState v-else-if="!loading" type="empty" title="题目不存在" description="该题可能已下线或暂不可访问。" />
      </main>

      <aside v-if="detail" class="answer-workspace">
        <QuestionAnswerReviewPanel :question="detail" />
      </aside>
    </section>

    <section v-if="detail" class="review-layout">
      <main class="content-card review-card">
        <div class="content-card__body">
          <div class="section-title">
            <span>提交后复盘</span>
            <h2>把这道题转成下一轮可用表达</h2>
          </div>
          <el-tabs v-model="activeTab">
            <el-tab-pane label="参考答案" name="answer">
              <div class="tab-section">
                <section>
                  <h2>参考答案</h2>
                  <MarkdownPreview :content="detail.referenceAnswer || '暂无参考答案。请先提交自己的回答，后续有数据时再对照修正。'" />
                </section>
                <section>
                  <h2>答案解析</h2>
                  <MarkdownPreview :content="detail.analysis || '暂无解析。可以先按回答结构自查：概念、机制、风险、项目证据是否完整。'" />
                </section>
              </div>
            </el-tab-pane>
            <el-tab-pane label="面试官追问" name="followups">
              <div class="followup-grid">
                <article v-for="item in followUpQuestions" :key="item">
                  <span>追问</span>
                  <p>{{ item }}</p>
                </article>
              </div>
            </el-tab-pane>
            <el-tab-pane label="项目结合说法" name="project">
              <div class="project-template">
                <article v-for="item in projectTemplates" :key="item.title">
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.content }}</p>
                </article>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </main>

      <aside class="side-stack">
        <section class="content-card">
          <div class="content-card__body">
            <div class="side-title">
              <Bookmark :size="17" />
              <h2>题目状态</h2>
            </div>
            <el-button
              class="side-button"
              :type="detail.favorite ? 'warning' : 'primary'"
              :loading="favoriteLoading"
              @click="toggleFavorite"
            >
              {{ detail.favorite ? '取消收藏' : '收藏题目' }}
            </el-button>
            <div class="side-divider" />
            <div class="side-label">掌握状态</div>
            <el-radio-group v-model="masteryStatus" class="mastery-group">
              <el-radio-button v-for="item in masteryOptions" :key="item.value" :label="item.value">
                {{ item.label }}
              </el-radio-button>
            </el-radio-group>
            <el-button class="side-button" :loading="masteryLoading" @click="handleUpdateMastery">保存状态</el-button>
          </div>
        </section>

        <section class="content-card">
          <div class="content-card__body">
            <div class="side-title">
              <History :size="17" />
              <h2>最近作答</h2>
            </div>
            <p class="side-muted">{{ detail.lastAnswer || '暂无最近答案' }}</p>
            <StatusTag :status="detail.lastAnswerResult" />
          </div>
        </section>

        <section class="content-card">
          <div class="content-card__body">
            <div class="side-title">
              <Route :size="17" />
              <h2>下一步</h2>
            </div>
            <div class="next-actions">
              <button type="button" @click="startPractice">
                <Play :size="16" />
                <span>继续练这一组</span>
              </button>
              <button type="button" @click="router.push('/questions/recommendations')">
                <BookOpenCheck :size="16" />
                <span>回推荐题</span>
              </button>
              <button type="button" @click="router.push('/questions/wrong-records')">
                <History :size="16" />
                <span>错题复盘</span>
              </button>
              <button type="button" @click="router.push('/questions/favorites')">
                <Bookmark :size="16" />
                <span>收藏复习</span>
              </button>
              <button type="button" @click="router.push('/interviews/create')">
                <MessageSquare :size="16" />
                <span>带入模拟面试</span>
              </button>
            </div>
          </div>
        </section>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  BookOpenCheck,
  Bookmark,
  History,
  MessageSquare,
  MessageSquareText,
  Play,
  Route
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import type { LocationQueryRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import {
  favoriteQuestionApi,
  getQuestionDetailApi,
  unfavoriteQuestionApi,
  updateQuestionMasteryApi
} from '@/api/question'
import AppState from '@/components/common/AppState.vue'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import QuestionAnswerReviewPanel from '@/components/question/QuestionAnswerReviewPanel.vue'
import QuestionMeta from '@/components/question/QuestionMeta.vue'
import { MASTERY_STATUS, masteryOptions } from '@/constants/enums'
import type { MasteryStatus, QuestionDetailVO, QuestionTagVO } from '@/types/question'
import { getErrorMessage } from '@/utils/error'
import { getRouteNumberParam } from '@/utils/route'

type RouterQueryValue = string | number | boolean | null | undefined

const route = useRoute()
const router = useRouter()
const questionId = getRouteNumberParam(route.params.id as string)

const loading = ref(false)
const loadError = ref('')
const favoriteLoading = ref(false)
const masteryLoading = ref(false)
const detail = ref<QuestionDetailVO | null>(null)
const masteryStatus = ref<MasteryStatus>(MASTERY_STATUS.UNKNOWN)
const activeTab = ref('answer')

const queryString = (name: string) => {
  const value = route.query[name]
  const raw = Array.isArray(value) ? value[0] : value
  return raw ? String(raw) : ''
}

const displayTags = computed<QuestionTagVO[]>(() => {
  const tags = detail.value?.tags || []
  return tags
    .map((tag) => {
      if (!tag) return null
      if (typeof tag === 'string') {
        return { id: 0, name: tag, status: 1 } as QuestionTagVO
      }
      const id = Number(tag.id || 0)
      const name = tag.name || tag.tagName || ''
      if (!Number.isFinite(id) || !name) return null
      return { ...tag, id, name, status: tag.status ?? 1 } as QuestionTagVO
    })
    .filter((item): item is QuestionTagVO => Boolean(item))
})

const tagNames = computed(() => displayTags.value.map((tag) => tag.name).filter(Boolean))
const recommendationContext = computed(() => {
  const skillName = queryString('skillName')
  const gapSeverity = queryString('gapSeverity')
  const sourceType = queryString('sourceType')
  const sourceId = queryString('sourceId')
  const trustStatus = queryString('trustStatus')
  const fallback = queryString('fallback') === 'true'
  return {
    skillName,
    gapSeverity,
    sourceType,
    sourceId,
    trustStatus,
    fallback,
    sourceLabel: sourceLabel(sourceType, sourceId),
    trustLabel: trustLabel(trustStatus, fallback),
    trustType: trustType(trustStatus, fallback),
    boundary: trustBoundary(trustStatus, fallback, sourceType),
    hasContext: Boolean(skillName || gapSeverity || sourceType || queryString('recommendationItemId'))
  }
})

const mainSkillName = computed(() =>
  recommendationContext.value.skillName ||
  tagNames.value[0] ||
  detail.value?.category?.name ||
  detail.value?.categoryName ||
  '这个知识点'
)

const followUpQuestions = computed(() => [
  `${mainSkillName.value} 在真实项目里最容易踩的边界是什么？`,
  `如果面试官要求你给出线上指标，你会补充哪些数据？`,
  `这个方案失败时，你会用什么降级或兜底策略？`,
  `把这个问题和你的简历项目结合，能讲出哪一个具体模块？`
])

const projectTemplates = computed(() => [
  {
    title: '业务场景',
    content: `先说明你在哪个项目里遇到过 ${mainSkillName.value} 相关问题，以及它影响了哪个核心链路。`
  },
  {
    title: '方案落地',
    content: '讲清楚你负责的模块、使用的技术方案，以及为什么没有选择另一个方案。'
  },
  {
    title: '验证指标',
    content: '补充 QPS、P95、错误率、命中率、慢 SQL 数量或故障恢复时间等可验证指标。'
  },
  {
    title: '追问准备',
    content: '准备一个失败案例或权衡点，证明你不是只会背标准答案。'
  }
])

const severityLabel = (value?: string | null) => {
  const map: Record<string, string> = {
    CRITICAL: '关键短板',
    HIGH: '高风险',
    MEDIUM: '中风险',
    LOW: '轻量补强',
    NORMAL: '常规训练'
  }
  return value ? map[value] || '风险待确认' : '常规训练'
}

const severityTag = (value?: string | null) => {
  if (value === 'CRITICAL' || value === 'HIGH') return 'danger'
  if (value === 'MEDIUM') return 'warning'
  return 'info'
}

const sourceLabel = (sourceType?: string, sourceId?: string) => {
  const labels: Record<string, string> = {
    RESUME_JOB_MATCH: '来自匹配报告',
    SKILL_PROFILE: '来自能力画像',
    STUDY_PLAN: '来自学习计划',
    FALLBACK: '通用练习'
  }
  const label = labels[sourceType || ''] || '推荐来源'
  return sourceId ? `${label}已绑定` : label
}

const trustLabel = (value?: string, fallback = false) => {
  if (fallback || value === 'FALLBACK') return '推荐依据不足'
  if (value === 'VERIFIED') return '推荐来源已记录'
  if (value === 'PARTIAL') return '部分上下文'
  return '来源待确认'
}

const trustType = (value?: string, fallback = false): 'success' | 'warning' | 'info' => {
  if (fallback || value === 'FALLBACK') return 'warning'
  if (value === 'VERIFIED') return 'success'
  return 'info'
}

const trustBoundary = (value?: string, fallback = false, sourceType?: string) => {
  if (fallback || value === 'FALLBACK' || sourceType === 'FALLBACK') return '当前为通用训练，暂未绑定具体简历、岗位描述或匹配报告。'
  if (value === 'PARTIAL') return '这道题只接入了部分上下文，建议结合题目详情和个人项目一起判断。'
  if (value === 'VERIFIED') return '这道题已记录推荐来源，回答时仍建议结合自己的项目经历。'
  return '来源信息不足时，请把它当作训练建议，而不是强结论。'
}

const compactRouterQuery = (params: Record<string, RouterQueryValue>) => {
  const result: LocationQueryRaw = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    result[key] = String(value)
  })
  return result
}

const practiceQuery = computed(() => {
  const currentQuestionIds = queryString('questionIds') || String(detail.value?.id || '')
  return compactRouterQuery({
    mode: 'recommended',
    questionIds: currentQuestionIds,
    skillName: mainSkillName.value,
    sourceType: queryString('sourceType'),
    sourceId: queryString('sourceId'),
    trustStatus: queryString('trustStatus'),
    fallback: queryString('fallback')
  })
})

const fetchDetail = async () => {
  if (!questionId) return
  loading.value = true
  loadError.value = ''
  try {
    detail.value = await getQuestionDetailApi(questionId)
    masteryStatus.value = detail.value.masteryStatus || MASTERY_STATUS.UNKNOWN
  } catch (error) {
    detail.value = null
    loadError.value = getErrorMessage(error, '读取题目失败')
  } finally {
    loading.value = false
  }
}

const toggleFavorite = async () => {
  if (!detail.value) return
  favoriteLoading.value = true
  try {
    if (detail.value.favorite) {
      await unfavoriteQuestionApi(detail.value.id)
      detail.value.favorite = false
      ElMessage.success('已取消收藏')
    } else {
      await favoriteQuestionApi(detail.value.id)
      detail.value.favorite = true
      ElMessage.success('已收藏')
    }
  } finally {
    favoriteLoading.value = false
  }
}

const handleUpdateMastery = async () => {
  if (!detail.value) return
  masteryLoading.value = true
  try {
    const result = await updateQuestionMasteryApi(detail.value.id, { masteryStatus: masteryStatus.value })
    detail.value.masteryStatus = result?.masteryStatus || masteryStatus.value
    ElMessage.success('掌握状态已更新')
  } finally {
    masteryLoading.value = false
  }
}

const startPractice = () => {
  if (!detail.value) return
  router.push({
    path: '/questions/practice',
    query: practiceQuery.value
  })
}

onMounted(fetchDetail)
</script>

<style scoped lang="scss">
.question-detail-page {
  gap: 18px;
}

.detail-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 18px;
  padding: 28px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(16, 185, 129, 0.08)),
    #ffffff;
  box-shadow: var(--app-shadow);

  h1,
  p {
    margin: 0;
  }

  h1 {
    margin-top: 12px;
    font-size: 30px;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  p {
    max-width: 680px;
    margin-top: 10px;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.detail-hero > div:first-child {
  min-width: 0;
}

.eyebrow,
.hero-actions,
.hero-rhythm,
.side-title,
.next-actions button {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.hero-actions {
  align-self: flex-start;
  flex-wrap: wrap;
  max-width: 360px;
  justify-content: flex-end;
}

.hero-rhythm {
  flex-wrap: wrap;
  margin-top: 16px;

  span {
    padding: 6px 10px;
    border: 1px solid #dbeafe;
    border-radius: 8px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 800;
  }
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 440px);
  gap: 18px;
  align-items: start;
}

.review-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 18px;
  align-items: start;
}

.answer-workspace,
.side-stack {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.question-card {
  display: grid;
  gap: 16px;
}

.question-workspace,
.answer-workspace,
.review-card {
  min-width: 0;
}

.recommendation-callout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px 14px;
  padding: 14px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 8px;
  background: #eff6ff;

  div {
    min-width: 0;
  }

  span,
  strong {
    display: block;
  }

  span {
    color: #2563eb;
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    margin-top: 4px;
    color: var(--app-text);
  }

  p {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }

  small {
    grid-column: 1 / -1;
    color: #475569;
    font-size: 12px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }
}

.section-title {
  margin-bottom: 12px;

  span {
    display: block;
    color: #2563eb;
    font-size: 12px;
    font-weight: 800;
  }

  h2 {
    margin: 5px 0 0;
    color: var(--app-text);
    font-size: 18px;
    line-height: 1.45;
  }
}

.question-content {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;

  :deep(.markdown-preview) {
    overflow-wrap: anywhere;
  }
}

.answer-frame {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;

  > span {
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

.answer-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  em {
    padding: 5px 10px;
    border-radius: 8px;
    background: #ffffff;
    color: #2563eb;
    font-style: normal;
    font-weight: 700;
  }
}

.answer-workspace {
  :deep(.answer-review-panel) {
    min-height: 100%;
  }
}

.tab-section {
  display: grid;
  gap: 16px;

  section {
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
  }

  h2 {
    margin: 0 0 10px;
    font-size: 17px;
  }
}

.followup-grid,
.project-template {
  display: grid;
  gap: 12px;
}

.followup-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));

  article {
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
  }

  span {
    color: #2563eb;
    font-size: 12px;
    font-weight: 700;
  }

  p {
    margin: 8px 0 0;
    color: var(--app-text);
    line-height: 1.7;
  }
}

.project-template {
  article {
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
  }

  h3,
  p {
    margin: 0;
  }

  h3 {
    font-size: 16px;
  }

  p {
    margin-top: 8px;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.side-title {
  margin-bottom: 12px;

  h2 {
    margin: 0;
    font-size: 17px;
  }
}

.side-button {
  width: 100%;
}

.side-divider {
  height: 1px;
  margin: 14px 0;
  background: #e2e8f0;
}

.side-label {
  margin-bottom: 10px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.mastery-group {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 12px;

  :deep(.el-radio-button__inner) {
    width: 100%;
    border-left: 1px solid var(--el-border-color);
    background: #ffffff;
    color: var(--app-text);
    box-shadow: none;
  }

  :deep(.el-radio-button__inner:hover) {
    color: #1d4ed8;
  }

  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    border-color: #bfdbfe;
    background: #eff6ff;
    color: #1d4ed8;
    box-shadow: none;
  }
}

.side-muted {
  margin: 0 0 10px;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.next-actions {
  display: grid;
  gap: 10px;

  button {
    width: 100%;
    min-height: 42px;
    padding: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
    color: var(--app-text);
    cursor: pointer;
    text-align: left;

    &:first-child {
      border-color: rgba(37, 99, 235, 0.28);
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 800;
    }
  }
}

:deep(.app-state) {
  background: #f8fafc;
}

@media (max-width: 960px) {
  .detail-hero,
  .workspace-grid,
  .review-layout {
    grid-template-columns: 1fr;
  }

  .detail-hero {
    flex-direction: column;
  }

  .hero-actions {
    justify-content: flex-start;
    max-width: 100%;
  }

  .review-layout {
    display: flex;
    flex-direction: column;
  }

  .side-stack {
    order: 2;
  }
}

@media (max-width: 640px) {
  .detail-hero {
    padding: 20px;
  }

  .recommendation-callout {
    grid-template-columns: 1fr;

    :deep(.el-tag) {
      width: fit-content;
      max-width: 100%;
      white-space: normal;
    }
  }

  .followup-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button),
  .next-actions button {
    width: 100%;
    justify-content: center;
  }

  .answer-steps {
    width: 100%;

    em {
      max-width: 100%;
      overflow-wrap: anywhere;
    }
  }
}
</style>
