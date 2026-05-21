<template>
  <div class="v3-page">
    <section class="page-hero">
      <div>
        <div class="hero-kicker"><Radar :size="16" /> Skill Profile</div>
        <h1>{{ overview?.profileName || detail?.profileName || '能力画像' }}</h1>
        <p>{{ overview?.summary || detail?.summary || '基于匹配报告和目标岗位展示技能雷达、短板与下一步动作。' }}</p>
      </div>
      <div class="hero-actions">
        <el-button :loading="loading" @click="loadAll"><RefreshCw :size="16" /> 刷新</el-button>
        <el-button type="primary" :loading="generating" :disabled="!matchReportId" @click="generateFromReport">
          <Sparkles :size="16" /> 从报告生成
        </el-button>
      </div>
    </section>

    <section v-if="loading" class="content-panel"><AppState type="loading" title="正在读取能力画像" /></section>
    <section v-else-if="loadError" class="content-panel">
      <AppState type="error" title="能力画像加载失败" :description="loadError"><el-button type="primary" @click="loadAll">重新加载</el-button></AppState>
    </section>
    <section v-else-if="isEmpty" class="content-panel">
      <AppState type="empty" title="暂无能力画像" description="可以从匹配报告详情页进入，或在 URL 带上 matchReportId 后生成画像。">
        <el-button @click="router.push('/resume-match')">去简历匹配</el-button>
      </AppState>
    </section>

    <template v-else>
      <section class="metric-grid">
        <article class="metric-card"><span>综合水平</span><strong>{{ overview?.overallLevel ?? detail?.overallLevel ?? '--' }}</strong></article>
        <article class="metric-card"><span>画像评分</span><strong>{{ overview?.overallScore ?? detail?.overallScore ?? '--' }}</strong></article>
        <article class="metric-card"><span>短板数量</span><strong>{{ overview?.gapCount ?? detail?.gapCount ?? gapItems.length }}</strong></article>
        <article class="metric-card"><span>状态</span><strong class="status">{{ overview?.status || detail?.status || '--' }}</strong></article>
      </section>

      <section class="profile-grid">
        <div class="content-panel">
          <div class="section-head"><div><h2>技能雷达</h2><p>来自 overview.radarData，按当前水平和目标水平对比。</p></div></div>
          <div v-if="radarItems.length" class="radar-visual-grid">
            <div ref="radarChartRef" class="radar-chart" />
            <div class="radar-list">
            <article v-for="item in radarItems" :key="`${item.skillName}-${item.category}`" class="radar-row">
              <div>
                <strong>{{ item.skillName || item.category || '未命名技能' }}</strong>
                <small>{{ item.category || '--' }} · {{ item.severity || 'NORMAL' }}</small>
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
          <AppState v-else type="empty" title="暂无雷达数据" description="后端 overview 暂未返回 radarData。" />
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
        <div class="section-head"><div><h2>能力短板</h2><p>优先展示 overview.topGaps，其次展示 by-job-target 的 gapItems。</p></div></div>
        <el-table v-if="gapItems.length" :data="gapItems">
          <el-table-column prop="skillName" label="技能" min-width="150" />
          <el-table-column prop="category" label="分类" min-width="120" />
          <el-table-column prop="severity" label="严重度" width="110" />
          <el-table-column prop="currentLevel" label="当前" width="90" />
          <el-table-column prop="targetLevel" label="目标" width="90" />
          <el-table-column prop="gapDescription" label="差距说明" min-width="240" show-overflow-tooltip />
        </el-table>
        <AppState v-else type="empty" title="暂无短板项" description="当前画像没有返回 gapItems/topGaps。" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { ListChecks, Radar, RefreshCw, Route as RouteIcon, Sparkles } from 'lucide-vue-next'
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { generateSkillProfileApi, getSkillProfileByJobTargetApi, getSkillProfileOverviewApi, refreshSkillProfileApi } from '@/api/skillProfile'
import AppState from '@/components/common/AppState.vue'
import type { SkillGapItemVO, SkillProfileDetailVO, SkillProfileOverviewVO } from '@/types/skillProfile'
import { getErrorMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const generating = ref(false)
const loadError = ref('')
const overview = ref<SkillProfileOverviewVO | null>(null)
const detail = ref<SkillProfileDetailVO | null>(null)
const radarChartRef = ref<HTMLDivElement>()
let radarChart: echarts.ECharts | null = null

const matchReportId = computed(() => Number(route.query.matchReportId) || detail.value?.matchReportId || undefined)
const targetJobId = computed(() => Number(route.query.targetJobId) || overview.value?.targetJobId || detail.value?.targetJobId || undefined)
const profileId = computed(() => Number(route.query.profileId) || overview.value?.profileId || detail.value?.profileId || undefined)
const resumeId = computed(() => Number(route.query.resumeId) || undefined)
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
const radarItems = computed(() => overview.value?.radarData || [])
const gapItems = computed<SkillGapItemVO[]>(() => overview.value?.topGaps?.length ? overview.value.topGaps : detail.value?.gapItems || [])
const isEmpty = computed(() => overview.value?.empty || (!overview.value && !detail.value))
const radarMaxLevel = computed(() => {
  const values = radarItems.value.flatMap((item) => [Number(item.currentLevel || 0), Number(item.targetLevel || 0)])
  return values.some((value) => value > 5) ? 100 : 5
})

const ActionList = defineComponent({
  props: { value: { type: null, required: false } },
  setup(props) {
    return () => {
      const raw = props.value
      const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split('\n').filter(Boolean) : []
      return items.length
        ? h('ul', { class: 'action-list' }, items.map((item) => h('li', String(item))))
        : h(AppState, { type: 'empty', title: '暂无下一步动作', description: 'overview.nextActions 为空。' })
    }
  }
})

const toPercent = (level?: number) => Math.min(100, Math.max(0, Number(level || 0) * 20))

const renderRadarChart = async () => {
  await nextTick()
  if (!radarChartRef.value || !radarItems.value.length) {
    radarChart?.clear()
    return
  }

  if (!radarChart) {
    radarChart = echarts.init(radarChartRef.value)
  }

  const max = radarMaxLevel.value
  const indicator = radarItems.value.map((item, index) => ({
    name: item.skillName || item.category || `Skill ${index + 1}`,
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
            name: 'Current',
            areaStyle: { color: 'rgba(56, 189, 248, 0.18)' },
            lineStyle: { width: 2 }
          },
          {
            value: targetValues,
            name: 'Target',
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
  try {
    overview.value = await getSkillProfileOverviewApi(targetJobId.value)
    if (targetJobId.value) {
      try {
        detail.value = await getSkillProfileByJobTargetApi(targetJobId.value)
      } catch {
        detail.value = null
      }
    }
  } catch (error) {
    overview.value = null
    detail.value = null
    loadError.value = getErrorMessage(error, '读取能力画像失败。')
  } finally {
    loading.value = false
  }
}

const generateFromReport = async () => {
  if (!matchReportId.value) return
  generating.value = true
  try {
    const result = profileId.value
      ? await refreshSkillProfileApi({ profileId: profileId.value, matchReportId: matchReportId.value })
      : await generateSkillProfileApi({ matchReportId: matchReportId.value })
    ElMessage.success(result.status === 'FAILED' ? '能力画像生成返回失败状态' : '能力画像已提交生成')
    await router.replace({ path: '/skill-profile', query: { ...route.query, profileId: result.profileId, targetJobId: result.targetJobId || targetJobId.value } })
    await loadAll()
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  loadAll()
  window.addEventListener('resize', resizeRadarChart)
})

watch(radarItems, renderRadarChart, { deep: true })

onBeforeUnmount(() => {
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
@media (max-width: 900px) { .page-hero, .profile-grid, .metric-grid { grid-template-columns: 1fr; flex-direction: column; } .radar-row { grid-template-columns: 1fr; } .hero-actions { flex-wrap: wrap; } }
</style>
