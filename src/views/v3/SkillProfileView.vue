<template>
  <div class="v3-page">
    <section class="page-hero">
      <div>
        <div class="hero-kicker"><Radar :size="16" /> 能力画像</div>
        <h1>{{ overview?.profileName || detail?.profileName || '能力画像' }}</h1>
        <p>{{ overview?.summary || detail?.summary || '基于匹配报告和目标岗位展示技能雷达、短板与下一步动作。' }}</p>
      </div>
      <div class="hero-actions">
        <el-button :loading="loading" @click="loadAll"><RefreshCw :size="16" /> 刷新</el-button>
        <el-button type="primary" :loading="generating || matchReportVerifyLoading" :disabled="!canGenerateFromReport" @click="generateFromReport">
          <Sparkles :size="16" /> 从报告生成
        </el-button>
      </div>
    </section>

    <el-alert
      v-if="matchReportVerifyMessage"
      type="warning"
      show-icon
      :closable="false"
      title="匹配报告暂不能作为画像证据"
      :description="matchReportVerifyMessage"
    />
    <el-alert
      v-if="partialLoadWarning && !loading && !loadError"
      type="warning"
      show-icon
      :closable="false"
      title="部分画像数据暂时不可用"
      :description="partialLoadWarning"
    />

    <section v-if="loading" class="content-panel"><AppState type="loading" title="正在读取能力画像" /></section>
    <section v-else-if="loadError" class="content-panel">
      <AppState type="error" title="能力画像加载失败" :description="loadError"><el-button type="primary" @click="loadAll">重新加载</el-button></AppState>
    </section>
    <section v-else-if="isEmpty" class="content-panel">
      <AppState type="empty" title="暂无能力画像" description="请先生成一份成功的简历匹配报告，再从报告详情生成能力画像。">
        <el-button type="primary" :loading="generating || matchReportVerifyLoading" :disabled="!canGenerateFromReport" @click="generateFromReport">生成画像</el-button>
        <el-button @click="router.push('/resume-match')">去简历匹配</el-button>
      </AppState>
    </section>

    <template v-else>
      <section class="content-panel evidence-panel">
        <div>
          <span>画像依据与可信边界</span>
          <strong>{{ profileEvidenceTitle }}</strong>
          <p>{{ profileEvidenceText }}</p>
        </div>
        <div class="evidence-tags">
          <el-tag :type="profileEvidenceTag" effect="plain">{{ profileTrustText }}</el-tag>
          <el-tag v-if="matchReportId" effect="plain">匹配报告已绑定</el-tag>
          <el-tag v-if="targetJobId" effect="plain">目标岗位已绑定</el-tag>
        </div>
      </section>

      <section class="metric-grid">
        <article class="metric-card"><span>综合水平</span><strong>{{ overview?.overallLevel ?? detail?.overallLevel ?? '--' }}</strong></article>
        <article class="metric-card"><span>画像评分</span><strong>{{ overview?.overallScore ?? detail?.overallScore ?? '--' }}</strong></article>
        <article class="metric-card"><span>短板数量</span><strong>{{ overview?.gapCount ?? detail?.gapCount ?? gapItems.length }}</strong></article>
        <article class="metric-card"><span>状态</span><strong class="status">{{ profileStatusLabel(overview?.status || detail?.status) }}</strong></article>
      </section>

      <section class="profile-grid">
        <div class="content-panel">
          <div class="section-head"><div><h2>技能雷达</h2><p>按当前水平和目标水平对比，帮助你快速定位优先补强项。</p></div></div>
          <div v-if="radarItems.length" class="radar-visual-grid">
            <div ref="radarChartRef" class="radar-chart" />
            <div class="radar-list">
            <article v-for="(item, index) in radarItems" :key="`${item.skillName}-${item.category}-${index}`" class="radar-row">
              <div>
                <strong>{{ skillDisplayName(item, index) }}</strong>
                <small>{{ item.category || '--' }} · {{ severityLabel(item.severity) }}</small>
              </div>
              <div class="bars">
                <span>当前 {{ item.currentLevel ?? 0 }}</span>
                <el-progress :percentage="toPercent(item.currentLevel)" :stroke-width="8" :show-text="false" />
                <span>目标 {{ item.targetLevel ?? 0 }}</span>
                <el-progress :percentage="toPercent(item.targetLevel)" :stroke-width="8" status="success" :show-text="false" />
              </div>
            </article>
            </div>
          </div>
          <AppState v-else type="empty" title="暂无雷达数据" description="当前画像暂无可视化雷达数据。">
            <el-button :loading="loading" @click="loadAll">刷新画像</el-button>
          </AppState>
        </div>

        <aside class="content-panel action-panel">
          <h2>下一步动作</h2>
          <ActionList :value="overview?.nextActions" />
          <el-button type="primary" :disabled="!profileId" @click="router.push({ path: '/study-plans/from-gap', query: buildContextQuery({ profileId, targetJobId, matchReportId, resumeId }) })">
            <RouteIcon :size="16" /> 生成差距学习计划
          </el-button>
          <el-button :disabled="!profileId" @click="router.push({ path: '/questions/recommendations', query: buildContextQuery({ skillProfileId: profileId, targetJobId, matchReportId, resumeId }) })">
            <ListChecks :size="16" /> 查看推荐题
          </el-button>
        </aside>
      </section>

      <section class="content-panel">
        <div class="section-head"><div><h2>能力短板</h2><p>优先展示最影响目标岗位匹配度的技能差距。</p></div></div>
        <el-table v-if="gapItems.length" :data="gapItems">
          <el-table-column prop="skillName" label="技能" min-width="150" />
          <el-table-column prop="category" label="分类" min-width="120" />
          <el-table-column label="严重度" width="110">
            <template #default="{ row }">{{ severityLabel(row.severity) }}</template>
          </el-table-column>
          <el-table-column prop="currentLevel" label="当前" width="90" />
          <el-table-column prop="targetLevel" label="目标" width="90" />
          <el-table-column prop="gapDescription" label="差距说明" min-width="240" show-overflow-tooltip />
          <el-table-column label="证据来源" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ gapEvidenceText(row) }}</template>
          </el-table-column>
        </el-table>
        <AppState v-else type="empty" title="暂无短板项" description="当前画像暂未识别出能力短板。">
          <el-button type="primary" :disabled="!profileId" @click="router.push({ path: '/study-plans/from-gap', query: buildContextQuery({ profileId, targetJobId, matchReportId, resumeId }) })">生成学习计划</el-button>
        </AppState>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ListChecks, Radar, RefreshCw, Route as RouteIcon, Sparkles } from 'lucide-vue-next'
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getResumeJobMatchReportDetailApi } from '@/api/resumeJobMatch'
import { generateSkillProfileApi, getSkillProfileByIdApi, getSkillProfileByJobTargetApi, getSkillProfileOverviewApi, refreshSkillProfileApi } from '@/api/skillProfile'
import AppState from '@/components/common/AppState.vue'
import type { ResumeJobMatchReportDetailVO } from '@/types/resumeJobMatch'
import type { SkillGapItemVO, SkillProfileDetailVO, SkillProfileOverviewVO } from '@/types/skillProfile'
import type { ECharts } from '@/utils/echarts'
import { getErrorMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const generating = ref(false)
const loadError = ref('')
const partialLoadWarning = ref('')
const overview = ref<SkillProfileOverviewVO | null>(null)
const detail = ref<SkillProfileDetailVO | null>(null)
const matchReportVerifyLoading = ref(false)
const matchReportVerifyMessage = ref('')
const verifiedRouteMatchReport = ref<ResumeJobMatchReportDetailVO | null>(null)
const radarChartRef = ref<HTMLDivElement>()
let radarChart: ECharts | null = null
let profileMounted = false
let radarRenderSeq = 0
let echartsModulePromise: Promise<typeof import('@/utils/echarts')> | null = null

const routeMatchReportId = computed(() => Number(route.query.matchReportId) || undefined)
const matchReportId = computed(() =>
  routeMatchReportId.value
    ? verifiedRouteMatchReport.value?.reportId
    : detail.value?.matchReportId || undefined
)
const targetJobId = computed(() => Number(route.query.targetJobId) || overview.value?.targetJobId || detail.value?.targetJobId || undefined)
const profileId = computed(() => Number(route.query.profileId) || overview.value?.profileId || detail.value?.profileId || undefined)
const resumeId = computed(() => Number(route.query.resumeId) || undefined)
const canGenerateFromReport = computed(() => Boolean(matchReportId.value && !matchReportVerifyLoading.value && !matchReportVerifyMessage.value))
const buildContextQuery = (extra: Record<string, unknown>) => Object.fromEntries(
  Object.entries(extra)
    .map(([key, value]) => [
      key,
      typeof value === 'object' && value && 'value' in value
        ? (value as { value?: unknown }).value
        : value
    ])
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
)
type SkillRadarItem = Pick<SkillGapItemVO, 'skillName' | 'category' | 'targetLevel' | 'currentLevel' | 'gapLevel' | 'severity'>

const radarItems = computed<SkillRadarItem[]>(() => Array.isArray(overview.value?.radarData) ? overview.value.radarData : [])
const gapItems = computed<SkillGapItemVO[]>(() => {
  const topGaps = Array.isArray(overview.value?.topGaps) ? overview.value.topGaps : []
  const detailGaps = Array.isArray(detail.value?.gapItems) ? detail.value.gapItems : []
  return topGaps.length ? topGaps : detailGaps
})
const isEmpty = computed(() => overview.value?.empty || (!overview.value && !detail.value))
const radarMaxLevel = computed(() => {
  const values = radarItems.value.flatMap((item) => [Number(item.currentLevel || 0), Number(item.targetLevel || 0)])
  return values.some((value) => value > 5) ? 100 : 5
})
const profileSourceType = computed(() => String(detail.value?.sourceType || gapItems.value[0]?.sourceType || '').toUpperCase())
const profileSourceBizId = computed(() => detail.value?.sourceBizId || gapItems.value[0]?.sourceBizId || matchReportId.value)
const profileStatus = computed(() => String(overview.value?.status || detail.value?.status || '').toUpperCase())
const profileEvidenceTitle = computed(() => {
  if (matchReportId.value) return '来自成功简历匹配报告'
  if (profileSourceType.value === 'RESUME_JOB_MATCH' && profileSourceBizId.value) return '来自已核验的简历匹配证据'
  if (targetJobId.value) return '来自当前目标岗位的能力差距'
  return '画像来源待确认'
})
const profileTrustText = computed(() => {
  if (profileStatus.value === 'SUCCESS' || profileStatus.value === 'ACTIVE' || profileStatus.value === 'READY') return '画像已生成'
  if (profileStatus.value === 'FAILED') return '画像生成失败'
  if (profileStatus.value === 'PROCESSING' || profileStatus.value === 'PENDING') return '画像生成中'
  return '来源待确认'
})
const profileEvidenceTag = computed(() => {
  if (profileStatus.value === 'FAILED') return 'danger'
  if (profileStatus.value === 'PROCESSING' || profileStatus.value === 'PENDING') return 'warning'
  if (matchReportId.value || profileSourceBizId.value) return 'success'
  return 'info'
})
const profileEvidenceText = computed(() => {
  if (matchReportVerifyMessage.value) return matchReportVerifyMessage.value
  if (matchReportId.value) return '能力画像会优先承接已完成的简历匹配报告；报告准备好后，短板分析会更完整。'
  if (targetJobId.value) return '当前画像先按目标岗位和已有画像数据展示；从匹配报告进入时会获得更完整的分析。'
  return '当前画像缺少明确来源，请刷新或重新从匹配报告生成后再用于学习计划和推荐题。'
})

const ActionList = defineComponent({
  props: { value: { type: null, required: false } },
  setup(props) {
    return () => {
      const raw = props.value
      const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split('\n').filter(Boolean) : []
      return items.length
        ? h('ul', { class: 'action-list' }, items.map((item) => h('li', String(item))))
        : h(AppState, { type: 'empty', title: '暂无下一步动作', description: '生成或刷新能力画像后，这里会展示下一步训练建议。' })
    }
  }
})

const toPercent = (level?: number) => {
  const value = Math.max(0, Number(level || 0))
  return Math.min(100, radarMaxLevel.value === 100 ? value : value * 20)
}

const severityLabel = (severity?: string | null) => {
  const map: Record<string, string> = {
    CRITICAL: '严重',
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低',
    NORMAL: '正常'
  }
  return map[String(severity || '').toUpperCase()] || '待确认'
}

const stringifyEvidence = (value: unknown) => {
  if (!value) return ''
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean).join('、')
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map((item) => String(item)).filter(Boolean).join('、')
  return String(value)
}

const gapEvidenceText = (item: SkillGapItemVO) => {
  const explicit = stringifyEvidence(item.evidenceSources)
  if (explicit) return explicit
  if (item.sourceType || item.sourceBizId) return `来自 ${sourceTypeLabel(item.sourceType)}${item.sourceBizId ? '（处理线索已记录）' : ''}`
  if (matchReportId.value) return '来自匹配报告'
  return '来源待确认'
}

const skillDisplayName = (item: SkillRadarItem, index: number) =>
  item.skillName || item.category || `能力项 ${index + 1}`

const sourceTypeLabel = (value?: string | null) => {
  const map: Record<string, string> = {
    RESUME_JOB_MATCH: '简历匹配报告',
    MATCH_REPORT: '匹配报告',
    JOB_TARGET: '目标岗位',
    JD_GAP: '岗位差距',
    MANUAL: '手动补充'
  }
  return map[String(value || '').toUpperCase()] || '画像来源'
}

const profileStatusLabel = (status?: string | null) => {
  const map: Record<string, string> = {
    SUCCESS: '已生成',
    ACTIVE: '已生成',
    READY: '已生成',
    FAILED: '生成失败',
    PROCESSING: '生成中',
    PENDING: '排队中',
    EMPTY: '待生成'
  }
  return map[String(status || '').toUpperCase()] || '待生成'
}

const verifyRouteMatchReport = async () => {
  const id = routeMatchReportId.value
  verifiedRouteMatchReport.value = null
  matchReportVerifyMessage.value = ''
  if (!id) return
  matchReportVerifyLoading.value = true
  try {
    const report = await getResumeJobMatchReportDetailApi(id)
    if (String(report.status || '').toUpperCase() !== 'SUCCESS') {
      matchReportVerifyMessage.value = report.status === 'FAILED'
        ? '当前匹配报告生成失败。请重新生成匹配报告，或从已有报告进入画像。'
        : '当前匹配报告尚未生成完成。可以稍后刷新，或到任务中心查看生成进度。'
      return
    }
    verifiedRouteMatchReport.value = report
  } catch (error) {
    matchReportVerifyMessage.value = getErrorMessage(error, '当前匹配报告暂时无法读取，能力画像先按已有资料展示。')
  } finally {
    matchReportVerifyLoading.value = false
  }
}

const loadEcharts = () => {
  if (!echartsModulePromise) {
    echartsModulePromise = import('@/utils/echarts')
  }
  return echartsModulePromise
}

const renderRadarChart = async () => {
  const renderSeq = ++radarRenderSeq
  await nextTick()
  if (!profileMounted) return
  if (!radarChartRef.value || !radarItems.value.length) {
    radarChart?.clear()
    return
  }

  const echarts = await loadEcharts()
  if (!profileMounted || renderSeq !== radarRenderSeq || !radarChartRef.value || !radarItems.value.length) {
    return
  }

  if (!radarChart) {
    radarChart = echarts.default.init(radarChartRef.value)
  }

  const max = radarMaxLevel.value
  const indicator = radarItems.value.map((item, index) => ({
    name: skillDisplayName(item, index),
    max
  }))
  const currentValues = radarItems.value.map((item) => Math.min(max, Math.max(0, Number(item.currentLevel || 0))))
  const targetValues = radarItems.value.map((item) => Math.min(max, Math.max(0, Number(item.targetLevel || 0))))

  radarChart.setOption({
    backgroundColor: 'transparent',
    color: ['#38bdf8', '#22c55e'],
    tooltip: { trigger: 'item' },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: '#94a3b8' }
    },
    radar: {
      indicator,
      radius: '62%',
      center: ['50%', '56%'],
      shape: 'polygon',
      axisName: {
        color: '#cbd5e1',
        fontSize: 11
      },
      splitNumber: max === 100 ? 4 : 5,
      splitArea: {
        areaStyle: {
          color: ['rgba(56, 189, 248, 0.04)', 'rgba(34, 197, 94, 0.06)']
        }
      },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } },
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } }
    },
    series: [
      {
        type: 'radar',
        symbolSize: 5,
        data: [
          {
            value: currentValues,
            name: '当前',
            areaStyle: { color: 'rgba(56, 189, 248, 0.18)' },
            lineStyle: { width: 2 }
          },
          {
            value: targetValues,
            name: '目标',
            areaStyle: { color: 'rgba(34, 197, 94, 0.1)' },
            lineStyle: { width: 2, type: 'dashed' }
          }
        ]
      }
    ]
  })
  radarChart.resize()
}

const resizeRadarChart = () => {
  radarChart?.resize()
}

const disposeRadarChart = () => {
  radarChart?.dispose()
  radarChart = null
}

const loadAll = async () => {
  loading.value = true
  loadError.value = ''
  partialLoadWarning.value = ''
  try {
    await verifyRouteMatchReport()
    const routeProfileId = Number(route.query.profileId) || undefined
    if (routeProfileId) {
      detail.value = await getSkillProfileByIdApi(routeProfileId)
      const overviewTargetJobId = targetJobId.value || detail.value?.targetJobId
      if (overviewTargetJobId) {
        try {
          overview.value = await getSkillProfileOverviewApi(overviewTargetJobId)
        } catch (error) {
          overview.value = null
          partialLoadWarning.value = `画像详情已加载，但画像概览暂时不可用：${getErrorMessage(error, '请稍后刷新。')}`
        }
      } else {
        overview.value = null
      }
      return
    }

    overview.value = await getSkillProfileOverviewApi(targetJobId.value)
    const overviewTargetJobId = targetJobId.value || overview.value?.targetJobId
    if (overviewTargetJobId) {
      try {
        detail.value = await getSkillProfileByJobTargetApi(overviewTargetJobId)
      } catch (error) {
        detail.value = null
        partialLoadWarning.value = `画像概览已加载，但短板详情暂时不可用：${getErrorMessage(error, '请稍后刷新。')}`
      }
    }
  } catch (error) {
    overview.value = null
    detail.value = null
    partialLoadWarning.value = ''
    loadError.value = getErrorMessage(error, '读取能力画像失败。')
  } finally {
    loading.value = false
  }
}

const generateFromReport = async () => {
  if (!canGenerateFromReport.value || !matchReportId.value) {
    ElMessage.warning(matchReportVerifyMessage.value || '请先选择一份成功的简历匹配报告')
    return
  }
  generating.value = true
  try {
    const result = profileId.value
      ? await refreshSkillProfileApi({ profileId: profileId.value, matchReportId: matchReportId.value })
      : await generateSkillProfileApi({ matchReportId: matchReportId.value })
    if (String(result.status || '').toUpperCase() === 'FAILED') {
      ElMessage.error(result.errorMessage || '能力画像生成失败，请稍后重试。')
      return
    }
    ElMessage.success('能力画像已提交生成')
    await router.replace({
      path: '/skill-profile',
      query: buildContextQuery({
        ...route.query,
        profileId: result.profileId || profileId.value,
        targetJobId: result.targetJobId || targetJobId.value,
        resumeId: resumeId.value,
        matchReportId: matchReportId.value
      })
    })
    await loadAll()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '能力画像生成失败，请稍后重试。'))
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  profileMounted = true
  loadAll()
  window.addEventListener('resize', resizeRadarChart)
})

watch(radarItems, renderRadarChart, { deep: true })
watch(() => route.query.matchReportId, verifyRouteMatchReport)

onBeforeUnmount(() => {
  profileMounted = false
  radarRenderSeq += 1
  window.removeEventListener('resize', resizeRadarChart)
  disposeRadarChart()
})
</script>

<style scoped lang="scss">
.v3-page { display: flex; flex-direction: column; gap: 18px; }
.page-hero, .content-panel, .metric-card { border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-card-bg); box-shadow: var(--app-shadow); }
.page-hero { display: flex; justify-content: space-between; gap: 18px; padding: 24px; }
.hero-kicker, .hero-actions, .section-head { display: flex; align-items: center; gap: 10px; }
.hero-kicker { color: var(--app-primary); font-size: 12px; font-weight: 700; text-transform: uppercase; }
h1, h2, p { margin: 0; }
h1 { margin-top: 10px; font-size: 30px; }
p { margin-top: 8px; color: var(--app-text-muted); line-height: 1.7; }
.content-panel { padding: 20px; min-width: 0; }
.evidence-panel { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.evidence-panel span { color: var(--app-text-muted); font-size: 12px; }
.evidence-panel strong { display: block; margin-top: 6px; font-size: 18px; }
.evidence-panel p { overflow-wrap: anywhere; }
.evidence-tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; min-width: 220px; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(130px, 1fr)); gap: 14px; }
.metric-card { padding: 16px; }
.metric-card span { color: var(--app-text-muted); }
.metric-card strong { display: block; margin-top: 8px; font-size: 28px; }
.metric-card .status { font-size: 20px; }
.profile-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 18px; }
.section-head { justify-content: space-between; margin-bottom: 16px; }
.radar-visual-grid { display: grid; grid-template-columns: minmax(280px, 0.95fr) minmax(0, 1.05fr); gap: 16px; align-items: stretch; }
.radar-chart { width: 100%; min-height: 360px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.28); }
.radar-list { display: grid; gap: 12px; }
.radar-row { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 16px; padding: 14px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.28); }
.radar-row small, .bars span { display: block; color: var(--app-text-muted); font-size: 12px; }
.bars { display: grid; grid-template-columns: 64px 1fr; gap: 8px 10px; align-items: center; }
.action-panel { display: flex; flex-direction: column; gap: 12px; align-self: start; }
:deep(.action-list) { margin: 0; padding-left: 18px; color: var(--app-text); line-height: 1.8; }
@media (max-width: 1100px) { .radar-visual-grid { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .page-hero, .profile-grid, .metric-grid, .evidence-panel { grid-template-columns: 1fr; flex-direction: column; } .radar-row { grid-template-columns: 1fr; } .hero-actions, .evidence-tags { flex-wrap: wrap; justify-content: flex-start; } }
</style>
