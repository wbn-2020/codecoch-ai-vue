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
          <label
            v-for="gap in gapItems"
            :key="gap.id"
            class="gap-card"
            :class="{ 'is-selected': form.gapItemIds.includes(gap.id) }"
          >
            <el-checkbox :value="gap.id" />
            <span class="gap-card__body">
              <span class="gap-card__head">
                <strong>
                  {{ gapTitle(gap) }}
                  <el-tag v-if="isEvidenceFeedbackGap(gap)" size="small" type="warning" effect="plain">证据反馈</el-tag>
                </strong>
                <small>{{ gapMeta(gap) }}</small>
              </span>
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

const GAP_PROFILE_LOAD_TIMEOUT_MS = 15000

const withGapProfileTimeout = <T>(promise: Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('能力画像读取超时，请稍后重试。'))
    }, GAP_PROFILE_LOAD_TIMEOUT_MS)
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
        const currentTarget = await withGapProfileTimeout(getCurrentJobTargetApi())
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
      const detail = await withGapProfileTimeout(getSkillProfileByIdApi(context.profileId))
      if (!isCurrentProfileRequest(requestSeq)) return
      nextProfileId = detail?.profileId || context.profileId
      nextTargetJobId = detail?.targetJobId || resolvedTargetJobId
      nextMatchReportId = detail?.matchReportId
      nextGapItems = detail?.gapItems || []
    } else {
      const overview = await withGapProfileTimeout(getSkillProfileOverviewApi(resolvedTargetJobId))
      if (!isCurrentProfileRequest(requestSeq)) return
      nextProfileId = overview.profileId
      nextTargetJobId = resolvedTargetJobId || overview.targetJobId
      nextGapItems = overview.topGaps || []
      if (nextTargetJobId) {
        try {
          const detail = await withGapProfileTimeout(getSkillProfileByJobTargetApi(nextTargetJobId))
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
.v3-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--user-text);
}

.page-hero,
.content-panel {
  min-width: 0;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-md);
  background: var(--user-surface);
}

.page-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 24px;
}

.hero-kicker,
.hero-actions,
.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-kicker {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  margin-top: 7px;
  font-size: 24px;
  line-height: 1.3;
}

h2 {
  color: var(--user-text);
  font-size: 17px;
  line-height: 1.4;
}

p {
  max-width: 68ch;
  margin-top: 7px;
  color: var(--user-text-muted);
  font-size: 13px;
  line-height: 1.65;
}

.hero-actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.plan-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(276px, 304px);
  align-items: start;
  gap: 20px;
}

.content-panel {
  padding: 20px;
}

.section-head {
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.context-alert {
  margin-bottom: 14px;
}

.gap-list {
  display: grid;
  gap: 10px;
}

.gap-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface-muted);
  color: var(--user-text);
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease;

  &:hover {
    border-color: var(--user-primary-border);
    background: var(--user-surface);
  }

  &.is-selected {
    border-color: var(--user-primary);
    background: var(--user-primary-faint);
  }
}

.gap-card__body,
.gap-card__head,
.gap-card strong,
.gap-card small,
.gap-card em {
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
}

.gap-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.gap-card strong {
  color: var(--user-text);
  font-size: 15px;
  line-height: 1.45;
}

.gap-card small {
  flex: 0 0 auto;
  max-width: 58%;
  color: var(--user-text-muted);
  font-size: 12px;
  line-height: 1.45;
  text-align: right;
}

.gap-card em {
  margin-top: 8px;
  color: var(--user-text-secondary);
  font-size: 13px;
  font-style: normal;
  line-height: 1.6;
}

.form-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-self: start;

  :deep(.el-form-item) {
    margin-bottom: 14px;
  }
}

.full {
  width: 100%;
}

@media (max-width: 900px) {
  .page-hero,
  .plan-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 600px) {
  .page-hero,
  .content-panel {
    padding: 16px;
  }

  .hero-actions {
    width: 100%;

    :deep(.el-button) {
      flex: 1 1 0;
      min-width: 0;
    }
  }

  .gap-card__head {
    display: block;
  }

  .gap-card small {
    max-width: none;
    margin-top: 5px;
    text-align: left;
  }
}
</style>
