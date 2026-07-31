<template>
  <div class="v3-page">
    <section class="page-hero">
      <div>
        <div class="hero-kicker"><RouteIcon :size="16" /> 短板学习计划</div>
        <h1>差距学习计划</h1>
        <p>从能力画像中选择短板项，配置周期和每日时长后生成学习计划。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/skill-profile')"><Radar :size="16" /> 能力画像</el-button>
        <el-button type="primary" @click="router.push('/study-plans')"><BookOpenCheck :size="16" /> 学习计划</el-button>
      </div>
    </section>

    <section class="plan-grid">
      <div class="content-panel" v-loading="loading">
        <div class="section-head">
          <div><h2>选择短板</h2><p>优先使用当前能力画像，也可以从岗位目标自动匹配。</p></div>
          <el-button text :loading="loading" @click="loadProfile">刷新</el-button>
        </div>
        <el-alert
          v-if="contextWarning && !loadError"
          class="context-alert"
          type="warning"
          :title="contextWarning"
          :closable="false"
          show-icon
        />
        <AppState v-if="loadError" type="error" title="短板加载失败" :description="loadError"><el-button type="primary" @click="loadProfile">重试</el-button></AppState>
        <AppState v-else-if="!gapItems.length" type="empty" title="暂无可选短板" description="请先生成能力画像，或刷新后再试。" />
        <el-checkbox-group v-else v-model="form.gapItemIds" class="gap-list">
          <label v-for="gap in gapItems" :key="gap.id" class="gap-card">
            <el-checkbox :value="gap.id" />
            <span>
              <strong>
                {{ gapTitle(gap) }}
                <el-tag v-if="isEvidenceFeedbackGap(gap)" size="small" type="warning" effect="plain">证据反馈</el-tag>
              </strong>
              <small>{{ gapMeta(gap) }}</small>
              <em>{{ gapDescription(gap) }}</em>
            </span>
          </label>
        </el-checkbox-group>
      </div>

      <aside class="content-panel form-panel">
        <h2>生成参数</h2>
        <el-form label-position="top">
          <el-form-item label="计划标题">
            <el-input v-model.trim="form.planTitle" placeholder="例如：Java 面试短板冲刺计划" />
          </el-form-item>
          <el-form-item label="学习天数">
            <el-input-number v-model="form.days" :min="3" :max="60" class="full" />
          </el-form-item>
          <el-form-item label="每日分钟数">
            <el-input-number v-model="form.dailyMinutes" :min="20" :max="360" :step="10" class="full" />
          </el-form-item>
          <el-form-item label="开始日期">
            <el-date-picker v-model="form.startDate" value-format="YYYY-MM-DD" type="date" class="full" placeholder="默认今天" />
          </el-form-item>
        </el-form>
        <el-alert v-if="profileId" type="info" :closable="false" show-icon title="已关联能力画像" />
        <el-button type="primary" :loading="generating" :disabled="!canGenerate" @click="generatePlan">
          <Sparkles :size="16" /> 生成学习计划
        </el-button>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { BookOpenCheck, Radar, Route as RouteIcon, Sparkles } from 'lucide-vue-next'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { LocationQueryRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import { getCurrentJobTargetApi } from '@/api/jobTarget'
import { getSkillProfileByIdApi, getSkillProfileByJobTargetApi, getSkillProfileOverviewApi } from '@/api/skillProfile'
import { generateStudyPlanFromGapApi } from '@/api/studyPlan'
import AppState from '@/components/common/AppState.vue'
import type { SkillGapItemVO } from '@/types/skillProfile'
import type { StudyPlanGenerateVO } from '@/types/studyPlan'
import { getErrorMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const generating = ref(false)
const loadError = ref('')
const contextWarning = ref('')
const loadedProfileId = ref<number | undefined>()
const loadedTargetJobId = ref<number | undefined>()
const loadedMatchReportId = ref<number | undefined>()
const gapItems = ref<SkillGapItemVO[]>([])
const STUDY_PLAN_TASK_BIZ_TYPE = 'study-plan.generate'
let profileRequestSeq = 0
let submitSeq = 0
let viewDisposed = false

const positiveRouteNumber = (value: unknown) => {
  const candidate = Array.isArray(value) ? value[0] : value
  const normalized = Number(candidate)
  return Number.isFinite(normalized) && normalized > 0 ? normalized : undefined
}

const routeContext = computed(() => ({
  profileId: positiveRouteNumber(route.query.profileId),
  targetJobId: positiveRouteNumber(route.query.targetJobId),
  resumeId: positiveRouteNumber(route.query.resumeId)
}))
const profileId = computed(() => loadedProfileId.value)
const canGenerate = computed(() => Boolean(profileId.value && form.gapItemIds.length && !generating.value))
const buildContextQuery = (extra: Record<string, unknown>): LocationQueryRaw => {
  const query: LocationQueryRaw = {}
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query[key] = String(value)
    }
  })
  return query
}

const hasAsyncStudyPlanReceipt = (result?: StudyPlanGenerateVO | null) =>
  Boolean(result?.asyncMessageId || result?.asyncTraceId || result?.asyncBizType)

const buildStudyPlanTaskCenterQuery = (result: StudyPlanGenerateVO) => buildContextQuery({
  messageId: result.asyncMessageId,
  traceId: result.asyncTraceId,
  bizType: result.asyncBizType || STUDY_PLAN_TASK_BIZ_TYPE,
  bizId: result.asyncBizId || result.planId
})

const form = reactive({
  gapItemIds: [] as number[],
  days: 21,
  dailyMinutes: 90,
  startDate: '',
  planTitle: ''
})

const severityLabels: Record<string, string> = {
  HIGH: '高优先级',
  MEDIUM: '中优先级',
  LOW: '低优先级',
  NORMAL: '普通'
}

const gapTitle = (gap: SkillGapItemVO) => gap.skillName || gap.category || '待补强能力项'

const gapMeta = (gap: SkillGapItemVO) => {
  const category = gap.category || '未分类'
  const severity = severityLabels[String(gap.severity || 'NORMAL').toUpperCase()] || gap.severity || '普通'
  const gapLevel = gap.gapLevel ?? '--'
  const current = gap.currentLevel ?? '--'
  const target = gap.targetLevel ?? '--'
  return `${category} · ${severity} · 当前 ${current} / 目标 ${target} · 差距 ${gapLevel}`
}

const gapDescription = (gap: SkillGapItemVO) =>
  gap.gapDescription || '暂无差距说明，可先生成或刷新能力画像补全短板描述。'

const isEvidenceFeedbackGap = (gap: SkillGapItemVO) =>
  String(gap.sourceType || '').startsWith('EVIDENCE_USAGE')

const isCurrentProfileRequest = (requestSeq: number) =>
  !viewDisposed && profileRequestSeq === requestSeq

const isCurrentSubmit = (requestSeq: number) =>
  !viewDisposed && submitSeq === requestSeq

const clearLoadedProfile = () => {
  loadedProfileId.value = undefined
  loadedTargetJobId.value = undefined
  loadedMatchReportId.value = undefined
  gapItems.value = []
  form.gapItemIds = []
  loadError.value = ''
  contextWarning.value = ''
}

const loadProfileForContext = async (context: {
  profileId?: number
  targetJobId?: number
  resumeId?: number
}, invalidateSubmit = false) => {
  const requestSeq = ++profileRequestSeq
  if (invalidateSubmit) {
    submitSeq += 1
    generating.value = false
  }
  clearLoadedProfile()
  loading.value = true
  try {
    let resolvedTargetJobId = context.targetJobId
    let nextWarning = ''
    if (!resolvedTargetJobId && !context.profileId) {
      try {
        const currentTarget = await getCurrentJobTargetApi()
        if (!isCurrentProfileRequest(requestSeq)) return
        resolvedTargetJobId = currentTarget?.id
      } catch (error) {
        if (!isCurrentProfileRequest(requestSeq)) return
        nextWarning = getErrorMessage(error, '当前主目标岗位暂时无法读取；如果没有带入能力画像，请先从能力画像页进入。')
      }
    }

    let nextProfileId: number | undefined
    let nextTargetJobId: number | undefined
    let nextMatchReportId: number | undefined
    let nextGapItems: SkillGapItemVO[] = []
    if (context.profileId) {
      const detail = await getSkillProfileByIdApi(context.profileId)
      if (!isCurrentProfileRequest(requestSeq)) return
      nextProfileId = detail?.profileId || context.profileId
      nextTargetJobId = detail?.targetJobId || resolvedTargetJobId
      nextMatchReportId = detail?.matchReportId
      nextGapItems = detail?.gapItems || []
    } else {
      const overview = await getSkillProfileOverviewApi(resolvedTargetJobId)
      if (!isCurrentProfileRequest(requestSeq)) return
      nextProfileId = overview.profileId
      nextTargetJobId = resolvedTargetJobId || overview.targetJobId
      nextGapItems = overview.topGaps || []
      if (nextTargetJobId) {
        try {
          const detail = await getSkillProfileByJobTargetApi(nextTargetJobId)
          if (!isCurrentProfileRequest(requestSeq)) return
          nextProfileId = detail?.profileId || nextProfileId
          nextTargetJobId = detail?.targetJobId || nextTargetJobId
          nextMatchReportId = detail?.matchReportId
          nextGapItems = detail?.gapItems?.length ? detail.gapItems : nextGapItems
        } catch {
          if (!isCurrentProfileRequest(requestSeq)) return
          nextMatchReportId = undefined
        }
      }
    }

    if (!isCurrentProfileRequest(requestSeq)) return
    loadedProfileId.value = nextProfileId
    loadedTargetJobId.value = nextTargetJobId
    loadedMatchReportId.value = nextMatchReportId
    gapItems.value = nextGapItems
    form.gapItemIds = nextGapItems.slice(0, 5).map((item) => item.id)
    contextWarning.value = nextWarning
  } catch (error) {
    if (!isCurrentProfileRequest(requestSeq)) return
    gapItems.value = []
    form.gapItemIds = []
    loadError.value = getErrorMessage(error, '读取能力画像短板失败。')
  } finally {
    if (isCurrentProfileRequest(requestSeq)) loading.value = false
  }
}

const loadProfile = () => {
  void loadProfileForContext({ ...routeContext.value })
}

const generatePlan = async () => {
  const currentProfileId = loadedProfileId.value
  if (!currentProfileId || generating.value) return
  const snapshot = {
    profileId: currentProfileId,
    targetJobId: loadedTargetJobId.value,
    matchReportId: loadedMatchReportId.value,
    resumeId: routeContext.value.resumeId,
    gapItemIds: [...form.gapItemIds],
    days: form.days,
    dailyMinutes: form.dailyMinutes,
    startDate: form.startDate || undefined,
    planTitle: form.planTitle || undefined
  }
  const requestSeq = ++submitSeq
  generating.value = true
  try {
    const result = await generateStudyPlanFromGapApi({
      profileId: snapshot.profileId,
      gapItemIds: snapshot.gapItemIds,
      days: snapshot.days,
      dailyMinutes: snapshot.dailyMinutes,
      startDate: snapshot.startDate,
      planTitle: snapshot.planTitle
    })
    if (!isCurrentSubmit(requestSeq)) return
    if (result.planStatus === 'FAILED') {
      ElMessage.error(getErrorMessage({ message: result.failureReason }, '学习计划生成失败，请稍后重试。'))
      return
    }
    if (hasAsyncStudyPlanReceipt(result)) {
      ElMessage.success('学习计划已提交，可在任务中心查看进度')
      await router.push({
        path: '/agent/tasks',
        query: buildStudyPlanTaskCenterQuery(result)
      })
      return
    }
    if (!result.planId) {
      ElMessage.error('学习计划生成失败：系统没有返回可查看的计划编号，请稍后重试。')
      return
    }
    ElMessage.success('学习计划已生成')
    await router.push({
      path: '/study-plans',
      query: buildContextQuery({
        planId: result.planId,
        skillProfileId: snapshot.profileId,
        targetJobId: snapshot.targetJobId,
        matchReportId: snapshot.matchReportId,
        resumeId: snapshot.resumeId
      })
    })
  } catch (error) {
    if (isCurrentSubmit(requestSeq)) {
      ElMessage.error(getErrorMessage(error, '学习计划生成失败，请稍后重试。'))
    }
  } finally {
    if (isCurrentSubmit(requestSeq)) generating.value = false
  }
}

watch(routeContext, (context) => {
  void loadProfileForContext({ ...context }, true)
}, { immediate: true })

onBeforeUnmount(() => {
  viewDisposed = true
  profileRequestSeq += 1
  submitSeq += 1
})
</script>

<style scoped lang="scss">
.v3-page { display: flex; flex-direction: column; gap: 16px; }
.page-hero, .content-panel { border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.58); }
.page-hero { display: flex; justify-content: space-between; gap: 16px; padding: 16px; }
.hero-kicker, .hero-actions, .section-head { display: flex; align-items: center; gap: 10px; }
.hero-kicker { color: var(--app-primary); font-size: 12px; font-weight: 700; text-transform: uppercase; }
h1, h2, p { margin: 0; }
h1 { margin-top: 8px; font-size: 26px; }
p { margin-top: 8px; color: var(--app-text-muted); line-height: 1.7; }
.plan-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 300px); gap: 16px; }
.content-panel { padding: 16px; min-width: 0; }
.section-head { justify-content: space-between; margin-bottom: 12px; }
.context-alert { margin-bottom: 14px; }
.gap-list { display: grid; gap: 12px; }
.gap-card { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; padding: 14px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.28); color: var(--app-text); cursor: pointer; }
.gap-card strong, .gap-card small, .gap-card em { display: block; overflow-wrap: anywhere; }
.gap-card strong { color: var(--app-text); font-size: 15px; line-height: 1.45; }
.gap-card small { margin-top: 4px; color: var(--app-text-muted); }
.gap-card em { margin-top: 8px; color: var(--app-text); font-style: normal; line-height: 1.6; }
.form-panel { display: flex; flex-direction: column; gap: 14px; align-self: start; }
.full { width: 100%; }
@media (max-width: 900px) { .page-hero, .plan-grid { grid-template-columns: 1fr; flex-direction: column; } .hero-actions { flex-wrap: wrap; } }
</style>
