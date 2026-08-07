<template>
  <div class="v3-page">
    <section class="page-hero">
      <div>
        <div class="hero-kicker"><Network :size="16" /> 能力画像</div>
        <h1>{{ overview?.profileName || detail?.profileName || '能力画像' }}</h1>
        <p>{{ overview?.summary || detail?.summary || '基于匹配报告和目标岗位展示技能节点、短板与下一步动作。' }}</p>
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
          <div class="section-head"><div><h2>技能节点</h2><p>按能力域查看已评估、可提升和待补齐的节点，避免用单一图表掩盖具体动作。</p></div><span class="skill-count">{{ skillTreeItems.length }} 个节点</span></div>
          <div v-if="skillDomains.length" class="skill-domain-grid">
            <section v-for="domain in skillDomains" :key="domain.name" class="skill-domain">
              <div class="skill-domain__head">
                <div>
                  <strong>{{ domain.name }}</strong>
                  <small>{{ domain.assessedCount }}/{{ domain.items.length }} 已评估</small>
                </div>
                <el-tag effect="plain">{{ domain.items.length }} 项</el-tag>
              </div>
              <div class="skill-node-grid">
                <article
                  v-for="(item, index) in domain.items"
                  :key="`${item.skillName}-${item.category}-${index}`"
                  class="skill-node"
                  :class="`is-${skillNodeStatus(item)}`"
                >
                  <span class="skill-node__icon">
                    <CircleCheck v-if="skillNodeStatus(item) === 'assessed'" :size="15" />
                    <TrendingUp v-else-if="skillNodeStatus(item) === 'improvable'" :size="15" />
                    <LockKeyhole v-else :size="15" />
                  </span>
                  <div class="skill-node__body">
                    <strong>{{ skillDisplayName(item, index) }}</strong>
                    <small>{{ skillNodeStatusLabel(item) }} · 当前 {{ item.currentLevel ?? 0 }} / 目标 {{ item.targetLevel ?? 0 }}</small>
                    <el-progress :percentage="toPercent(item.currentLevel)" :stroke-width="6" :show-text="false" :status="skillNodeStatus(item) === 'assessed' ? 'success' : undefined" />
                  </div>
                </article>
              </div>
            </section>
          </div>
          <AppState v-else type="empty" title="暂无技能节点" description="当前画像暂无可视化技能节点。">
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
        <div v-if="gapItems.length" class="gap-card-grid">
          <article
            v-for="(item, index) in gapItems"
            :key="`${item.skillName}-${item.category}-${index}`"
            class="gap-card"
          >
            <div class="gap-card__head">
              <div>
                <strong>{{ item.skillName || item.category || `能力项 ${index + 1}` }}</strong>
                <span>{{ item.category || '未分类' }}</span>
              </div>
              <em :class="`severity-${String(item.severity || 'NORMAL').toLowerCase()}`">
                {{ severityLabel(item.severity) }}
              </em>
            </div>
            <p>{{ item.gapDescription || '暂无差距说明，可刷新画像后补全。' }}</p>
            <div class="gap-card__foot">
              <span>当前 <b>{{ item.currentLevel ?? '--' }}</b></span>
              <span>目标 <b>{{ item.targetLevel ?? '--' }}</b></span>
              <span class="gap-card__source">{{ gapEvidenceText(item) }}</span>
            </div>
          </article>
        </div>
        <AppState v-else type="empty" title="暂无短板项" description="当前画像暂未识别出能力短板。">
          <el-button type="primary" :disabled="!profileId" @click="router.push({ path: '/study-plans/from-gap', query: buildContextQuery({ profileId, targetJobId, matchReportId, resumeId }) })">生成学习计划</el-button>
        </AppState>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { CircleCheck, ListChecks, LockKeyhole, Network, RefreshCw, Route as RouteIcon, Sparkles, TrendingUp } from 'lucide-vue-next'
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getResumeJobMatchReportDetailApi } from '@/api/resumeJobMatch'
import { generateSkillProfileApi, getSkillProfileByIdApi, getSkillProfileByJobTargetApi, getSkillProfileOverviewApi, refreshSkillProfileApi } from '@/api/skillProfile'
import AppState from '@/components/common/AppState.vue'
import type { ResumeJobMatchReportDetailVO } from '@/types/resumeJobMatch'
import type { SkillGapItemVO, SkillProfileDetailVO, SkillProfileOverviewVO } from '@/types/skillProfile'
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
type SkillTreeItem = Pick<SkillGapItemVO, 'skillName' | 'category' | 'targetLevel' | 'currentLevel' | 'gapLevel' | 'severity'>

const sourceItems = computed<SkillTreeItem[]>(() => Array.isArray(overview.value?.radarData) ? overview.value.radarData : [])
const gapItems = computed<SkillGapItemVO[]>(() => {
  const topGaps = Array.isArray(overview.value?.topGaps) ? overview.value.topGaps : []
  const detailGaps = Array.isArray(detail.value?.gapItems) ? detail.value.gapItems : []
  return topGaps.length ? topGaps : detailGaps
})
const isEmpty = computed(() => overview.value?.empty || (!overview.value && !detail.value))
const levelMax = computed(() => {
  const values = sourceItems.value.flatMap((item) => [Number(item.currentLevel || 0), Number(item.targetLevel || 0)])
  return values.some((value) => value > 5) ? 100 : 5
})
const skillTreeItems = computed<SkillTreeItem[]>(() => {
  const source = sourceItems.value.length ? sourceItems.value : gapItems.value
  const seen = new Set<string>()
  return source.filter((item, index) => {
    const key = `${item.skillName || item.category || 'skill'}-${item.category || 'domain'}-${index}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})
const skillDomains = computed(() => {
  const groups = new Map<string, SkillTreeItem[]>()
  skillTreeItems.value.forEach((item) => {
    const name = item.category || '核心能力'
    const items = groups.get(name) || []
    items.push(item)
    groups.set(name, items)
  })
  return Array.from(groups, ([name, items]) => ({
    name,
    items,
    assessedCount: items.filter((item) => Number(item.currentLevel) > 0).length
  }))
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
  return Math.min(100, levelMax.value === 100 ? value : value * 20)
}

const skillNodeStatus = (item: SkillTreeItem) => {
  const current = Number(item.currentLevel || 0)
  const target = Number(item.targetLevel || 0)
  if (current <= 0 && target > 0) return 'locked'
  if (target > current) return 'improvable'
  return 'assessed'
}

const skillNodeStatusLabel = (item: SkillTreeItem) => {
  const status = skillNodeStatus(item)
  if (status === 'locked') return '待评估'
  if (status === 'improvable') return '可提升'
  return '已评估'
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

const skillDisplayName = (item: SkillTreeItem, index: number) =>
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

onMounted(loadAll)
watch(() => route.query.matchReportId, verifyRouteMatchReport)
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

.content-panel {
  padding: 20px;
}

.evidence-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 5px;
    color: var(--user-text);
    font-size: 17px;
    line-height: 1.45;
  }

  p {
    overflow-wrap: anywhere;
  }
}

.evidence-tags {
  display: flex;
  flex: 0 1 260px;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-md);
  background: var(--user-surface);
}

.metric-card {
  min-width: 0;
  padding: 16px 18px;
  border-right: 1px solid var(--user-border);
  background: var(--user-surface);

  &:last-child {
    border-right: 0;
  }

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 7px;
    overflow-wrap: anywhere;
    color: var(--user-text);
    font-size: 23px;
    line-height: 1.2;
  }

  .status {
    color: var(--user-primary);
    font-size: 17px;
  }
}

.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(252px, 292px);
  align-items: start;
  gap: 20px;
}

.section-head {
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.skill-count {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--user-surface-muted);
  color: var(--user-text-muted);
  font-size: 12px;
}

.skill-domain-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.skill-domain {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface-muted);
}

.skill-domain__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;

  strong,
  small {
    display: block;
  }

  strong {
    color: var(--user-text);
    font-size: 14px;
  }

  small {
    margin-top: 3px;
    color: var(--user-text-muted);
    font-size: 12px;
  }
}

.skill-node-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.skill-node {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--user-border);
  border-radius: 10px;
  background: var(--user-surface);
}

.skill-node__icon {
  display: inline-grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 50%;
  background: var(--user-control-bg);
  color: var(--user-text-muted);
}

.skill-node.is-assessed .skill-node__icon {
  background: var(--user-primary-soft);
  color: var(--user-primary);
}

.skill-node.is-improvable .skill-node__icon {
  background: var(--user-warning-soft);
  color: var(--user-warning);
}

.skill-node__body {
  min-width: 0;

  strong,
  small {
    display: block;
    overflow-wrap: anywhere;
  }

  strong {
    color: var(--user-text);
    font-size: 13px;
    line-height: 1.4;
  }

  small {
    margin-top: 3px;
    color: var(--user-text-muted);
    font-size: 11px;
    line-height: 1.35;
  }

  :deep(.el-progress) {
    margin-top: 7px;
  }
}

.action-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-self: start;
}

:deep(.action-list) {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
  color: var(--user-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.gap-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.gap-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 156px;
  padding: 15px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface-muted);
}

.gap-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  strong,
  span {
    display: block;
    overflow-wrap: anywhere;
  }

  strong {
    color: var(--user-text);
    font-size: 15px;
    line-height: 1.45;
  }

  span {
    margin-top: 3px;
    color: var(--user-text-muted);
    font-size: 12px;
  }

  em {
    flex: 0 0 auto;
    padding: 3px 7px;
    border-radius: 999px;
    background: var(--user-control-bg);
    color: var(--user-text-secondary);
    font-size: 12px;
    font-style: normal;
    white-space: nowrap;
  }

  .severity-critical,
  .severity-high {
    background: var(--user-danger-soft);
    color: var(--user-danger);
  }

  .severity-medium {
    background: var(--user-warning-soft);
    color: #8c4709;
  }
}

.gap-card > p {
  display: -webkit-box;
  margin-top: 10px;
  overflow: hidden;
  color: var(--user-text-secondary);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.gap-card__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 12px;
  margin-top: auto;
  padding-top: 11px;
  border-top: 1px solid var(--user-border);
  color: var(--user-text-muted);
  font-size: 12px;
  line-height: 1.45;

  b {
    color: var(--user-text-secondary);
    font-weight: 700;
  }
}

.gap-card__source {
  flex-basis: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .skill-domain-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 900px) {
  .page-hero,
  .profile-grid,
  .evidence-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-actions,
  .evidence-tags {
    justify-content: flex-start;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-card:nth-child(2) {
    border-right: 0;
  }

  .metric-card:nth-child(-n + 2) {
    border-bottom: 1px solid var(--user-border);
  }
}

@media (max-width: 640px) {
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

  .metric-grid,
  .gap-card-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .metric-card {
    border-right: 0;
    border-bottom: 1px solid var(--user-border);

    &:last-child {
      border-bottom: 0;
    }
  }

  .skill-node-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
