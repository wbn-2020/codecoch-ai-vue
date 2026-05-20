<template>
  <div class="v3-page">
    <section class="page-hero">
      <div>
        <div class="hero-kicker"><ListChecks :size="16" /> Question Recommendations</div>
        <h1>推荐题目</h1>
        <p>按能力画像、匹配报告或学习计划读取推荐批次；缺少 URL 参数时自动使用最近上下文。</p>
      </div>
      <div class="hero-actions">
        <el-button :loading="loading" @click="loadRecommendations"><RefreshCw :size="16" /> 刷新</el-button>
        <el-button type="primary" :loading="generating" :disabled="!canGenerate" @click="generateRecommendations">
          <Sparkles :size="16" /> 生成推荐
        </el-button>
      </div>
    </section>

    <section class="content-panel">
      <el-form class="filter-form" :model="query" inline>
        <el-form-item label="来源">
          <el-segmented v-model="query.source" :options="sourceOptions" />
        </el-form-item>
        <el-form-item label="业务 ID">
          <el-input-number v-model="query.sourceId" :min="1" disabled />
          <div class="field-hint">由上游 URL 或最近上下文自动填充，无需手动输入。</div>
        </el-form-item>
        <el-form-item label="题目数量">
          <el-input-number v-model="query.questionCount" :min="3" :max="50" />
        </el-form-item>
      </el-form>
    </section>

    <section class="content-panel" v-loading="loading">
      <AppState v-if="loadError" type="error" title="推荐题加载失败" :description="loadError"><el-button type="primary" @click="loadRecommendations">重试</el-button></AppState>
      <AppState v-else-if="!items.length" type="empty" title="暂无推荐题" description="当前来源还没有推荐题，可以先生成推荐批次。" />
      <div v-else class="question-list">
        <button v-for="item in items" :key="item.id" class="question-card" type="button" @click="openQuestion(item)">
          <span class="question-main">
            <strong>{{ item.questionTitle || `题目 #${item.questionId || item.id}` }}</strong>
            <small>{{ item.skillName || item.skillCode || '--' }} · {{ item.difficulty || '--' }} · {{ item.questionType || '--' }}</small>
            <em>{{ item.recommendReason || item.questionContent || '暂无推荐理由' }}</em>
          </span>
          <el-tag :type="severityTag(item.gapSeverity)">{{ item.gapSeverity || 'NORMAL' }}</el-tag>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ListChecks, RefreshCw, Sparkles } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getResumeJobMatchReportsApi } from '@/api/resumeJobMatch'
import {
  generateQuestionRecommendationsFromGapApi,
  generateQuestionRecommendationsFromMatchReportApi,
  generateQuestionRecommendationsFromStudyPlanApi,
  getQuestionRecommendationItemsFromGapBatchApi,
  getQuestionRecommendationItemsFromMatchReportBatchApi,
  getQuestionRecommendationItemsFromStudyPlanBatchApi
} from '@/api/questionRecommendation'
import { getSkillProfileOverviewApi } from '@/api/skillProfile'
import { getStudyPlansApi } from '@/api/studyPlan'
import AppState from '@/components/common/AppState.vue'
import type { QuestionRecommendationItemVO } from '@/types/questionRecommendation'
import { getErrorMessage } from '@/utils/error'

type Source = 'gap' | 'matchReport' | 'studyPlan'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const generating = ref(false)
const loadError = ref('')
const items = ref<QuestionRecommendationItemVO[]>([])

const initialSource = (route.query.studyPlanId ? 'studyPlan' : route.query.matchReportId ? 'matchReport' : 'gap') as Source
const initialSourceId = Number(
  initialSource === 'studyPlan'
    ? route.query.studyPlanId
    : initialSource === 'matchReport'
      ? route.query.matchReportId
      : route.query.skillProfileId || route.query.profileId
)

const query = reactive({
  source: initialSource,
  sourceId: (Number.isFinite(initialSourceId) && initialSourceId > 0 ? initialSourceId : undefined) as number | undefined,
  questionCount: 10
})

const sourceOptions = [
  { label: '能力短板', value: 'gap' },
  { label: '匹配报告', value: 'matchReport' },
  { label: '学习计划', value: 'studyPlan' }
]
const canGenerate = computed(() => !generating.value)

const getQueryNumber = (name: string) => {
  const value = route.query[name]
  const raw = Array.isArray(value) ? value[0] : value
  const numberValue = Number(raw)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
}

const severityTag = (severity?: string) => severity === 'HIGH' || severity === 'CRITICAL' ? 'danger' : severity === 'MEDIUM' ? 'warning' : 'info'

const hydrateContext = async () => {
  const routeSourceId =
    query.source === 'studyPlan'
      ? getQueryNumber('studyPlanId')
      : query.source === 'matchReport'
        ? getQueryNumber('matchReportId')
        : getQueryNumber('skillProfileId') || getQueryNumber('profileId')
  if (routeSourceId) {
    query.sourceId = routeSourceId
    return
  }

  if (query.source === 'gap') {
    const overview = await getSkillProfileOverviewApi(getQueryNumber('targetJobId'))
    query.sourceId = overview.profileId
    return
  }

  if (query.source === 'matchReport') {
    const page = await getResumeJobMatchReportsApi({
      pageNo: 1,
      pageSize: 1,
      targetJobId: getQueryNumber('targetJobId'),
      resumeId: getQueryNumber('resumeId'),
      status: 'SUCCESS'
    })
    query.sourceId = page.records?.[0]?.reportId
    return
  }

  const plans = await getStudyPlansApi({
    pageNo: 1,
    pageSize: 1,
    planStatus: 'ACTIVE',
    targetJobId: getQueryNumber('targetJobId'),
    matchReportId: getQueryNumber('matchReportId'),
    skillProfileId: getQueryNumber('skillProfileId') || getQueryNumber('profileId')
  })
  query.sourceId = plans.records?.[0]?.id || plans.records?.[0]?.reportId
}

const loadRecommendations = async () => {
  loading.value = true
  loadError.value = ''
  try {
    if (!query.sourceId) {
      await hydrateContext()
    }
    if (!query.sourceId) {
      items.value = []
      return
    }
    if (query.source === 'gap') {
      items.value = await getQuestionRecommendationItemsFromGapBatchApi({ skillProfileId: query.sourceId })
    } else if (query.source === 'matchReport') {
      items.value = await getQuestionRecommendationItemsFromMatchReportBatchApi(query.sourceId)
    } else {
      items.value = await getQuestionRecommendationItemsFromStudyPlanBatchApi(query.sourceId)
    }
  } catch (error) {
    items.value = []
    loadError.value = getErrorMessage(error, '读取推荐题失败。')
  } finally {
    loading.value = false
  }
}

const generateRecommendations = async () => {
  generating.value = true
  try {
    if (!query.sourceId) {
      await hydrateContext()
    }
    if (!query.sourceId) {
      ElMessage.warning('未找到可用上下文，无法生成推荐题')
      return
    }
    if (query.source === 'gap') {
      await generateQuestionRecommendationsFromGapApi({ skillProfileId: query.sourceId, questionCount: query.questionCount })
    } else if (query.source === 'matchReport') {
      await generateQuestionRecommendationsFromMatchReportApi({ matchReportId: query.sourceId, questionCount: query.questionCount })
    } else {
      await generateQuestionRecommendationsFromStudyPlanApi({ studyPlanId: query.sourceId, questionCount: query.questionCount })
    }
    ElMessage.success('推荐题生成任务已提交')
    await loadRecommendations()
  } finally {
    generating.value = false
  }
}

const openQuestion = (item: QuestionRecommendationItemVO) => {
  const id = item.questionId || item.id
  if (id) router.push(`/questions/${id}`)
}

onMounted(loadRecommendations)
</script>

<style scoped lang="scss">
.v3-page { display: flex; flex-direction: column; gap: 18px; }
.page-hero, .content-panel { border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-card-bg); box-shadow: var(--app-shadow); }
.page-hero { display: flex; justify-content: space-between; gap: 18px; padding: 24px; }
.hero-kicker, .hero-actions { display: flex; align-items: center; gap: 10px; }
.hero-kicker { color: var(--app-primary); font-size: 12px; font-weight: 700; text-transform: uppercase; }
h1, p { margin: 0; }
h1 { margin-top: 10px; font-size: 30px; }
p { margin-top: 8px; color: var(--app-text-muted); line-height: 1.7; }
.content-panel { padding: 20px; min-width: 0; }
.filter-form { display: flex; flex-wrap: wrap; gap: 8px; }
.field-hint { margin-top: 6px; color: var(--app-text-muted); font-size: 12px; }
.question-list { display: grid; gap: 12px; }
.question-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; width: 100%; padding: 16px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.28); color: var(--app-text); text-align: left; cursor: pointer; }
.question-main strong, .question-main small, .question-main em { display: block; overflow-wrap: anywhere; }
.question-main small { margin-top: 5px; color: var(--app-text-muted); }
.question-main em { margin-top: 8px; font-style: normal; line-height: 1.6; }
@media (max-width: 760px) { .page-hero { flex-direction: column; } .hero-actions { flex-wrap: wrap; } .question-card { grid-template-columns: 1fr; } }
</style>
