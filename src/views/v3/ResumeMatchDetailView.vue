<template>
  <div class="v3-page">
    <section class="page-hero">
      <div>
        <div class="hero-kicker"><FileChartColumn :size="16" /> Match Report</div>
        <h1>{{ report?.jobTitle || '匹配报告详情' }}</h1>
        <p>{{ report ? `${report.resumeTitle || `简历 #${report.resumeId}`} · ${report.companyName || '--'}` : '读取真实匹配报告、失败原因与短板建议。' }}</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/resume-match')"><ArrowLeft :size="16" /> 返回匹配</el-button>
        <el-button :loading="loading" @click="loadReport"><RefreshCw :size="16" /> 刷新</el-button>
      </div>
    </section>

    <section v-if="loading" class="content-panel"><AppState type="loading" title="正在读取报告" description="正在同步匹配报告详情。" /></section>
    <section v-else-if="loadError" class="content-panel">
      <AppState type="error" title="报告加载失败" :description="loadError"><el-button type="primary" @click="loadReport">重新加载</el-button></AppState>
    </section>
    <section v-else-if="!report" class="content-panel"><AppState type="empty" title="报告不存在" description="当前路由没有可展示的匹配报告。" /></section>

    <template v-else>
      <section v-if="report.status === 'FAILED'" class="content-panel">
        <el-alert type="error" show-icon :closable="false" title="报告生成失败" :description="toFriendlyMessage(report.errorMessage, '报告生成失败，请稍后重试。')" />
      </section>
      <section v-else-if="isTrackingReport" class="content-panel report-tracker">
        <div>
          <span class="cc-badge cc-badge--streaming">
            <i class="cc-badge__dot" />
            {{ report.status }}
          </span>
          <h2>匹配报告生成中</h2>
          <p>报告正在生成，页面会自动追踪状态并刷新详情。</p>
        </div>
        <el-button :loading="loading" @click="loadReport">立即刷新</el-button>
      </section>

      <section class="score-grid">
        <article v-for="item in scoreCards" :key="item.label" class="score-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value ?? '--' }}</strong>
          <el-progress :percentage="Number(item.value || 0)" :stroke-width="8" :show-text="false" />
        </article>
      </section>

      <section class="detail-grid">
        <div class="content-panel">
          <div class="section-head">
            <div><h2>报告摘要</h2><p>{{ report.summary || '暂无摘要。' }}</p></div>
            <div class="section-actions">
              <el-tag :type="statusTag(report.status)">{{ report.status }}</el-tag>
              <AiResultFeedback
                v-if="report.status === 'SUCCESS'"
                scene="RESUME_MATCH"
                biz-type="RESUME_MATCH_REPORT"
                :biz-id="report.reportId"
                :ai-call-log-id="report.aiCallLogId"
                label="反馈报告"
                compact
              />
            </div>
          </div>
          <div class="json-sections">
            <DataBlock title="优势" :value="report.strengths" />
            <DataBlock title="短板" :value="report.gaps" />
            <DataBlock title="简历风险" :value="report.resumeRisks" />
            <DataBlock title="优化建议" :value="report.optimizationSuggestions" />
          </div>
        </div>

        <aside class="content-panel action-panel">
          <h2>下一步</h2>
          <p>基于该报告继续生成能力画像或差距学习计划。</p>
          <el-button type="primary" :loading="profileGenerating" :disabled="report.status !== 'SUCCESS'" @click="generateProfile">
            <Radar :size="16" /> 生成/刷新能力画像
          </el-button>
          <el-button :disabled="report.status !== 'SUCCESS'" @click="router.push({ path: '/skill-profile', query: { matchReportId: report.reportId, targetJobId: report.targetJobId, resumeId: report.resumeId } })">
            查看能力画像
          </el-button>
          <el-button :disabled="report.status !== 'SUCCESS'" @click="router.push({ path: '/study-plans/from-gap', query: { matchReportId: report.reportId, targetJobId: report.targetJobId, resumeId: report.resumeId } })">
            <RouteIcon :size="16" /> 差距学习计划
          </el-button>
          <el-button :disabled="report.status !== 'SUCCESS'" @click="router.push({ path: '/interviews/create', query: { source: 'job-target', targetJobId: report.targetJobId, resumeId: report.resumeId, matchReportId: report.reportId } })">
            创建岗位面试
          </el-button>
        </aside>
      </section>

      <section class="content-panel">
        <div class="section-head"><div><h2>维度明细</h2><p>按技能维度展示分数、差距和建议。</p></div></div>
        <el-table v-if="report.details?.length" :data="report.details">
          <el-table-column prop="dimension" label="维度" min-width="120" />
          <el-table-column prop="skillName" label="技能" min-width="140" />
          <el-table-column prop="score" label="分数" width="90" />
          <el-table-column prop="gapDescription" label="差距" min-width="220" show-overflow-tooltip />
          <el-table-column prop="suggestion" label="建议" min-width="220" show-overflow-tooltip />
        </el-table>
        <AppState v-else type="empty" title="暂无维度明细" description="当前报告暂无维度明细。" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ArrowLeft, FileChartColumn, Radar, RefreshCw, Route as RouteIcon } from 'lucide-vue-next'
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getResumeJobMatchReportDetailApi } from '@/api/resumeJobMatch'
import { generateSkillProfileApi } from '@/api/skillProfile'
import AppState from '@/components/common/AppState.vue'
import AiResultFeedback from '@/components/feedback/AiResultFeedback.vue'
import type { ResumeJobMatchReportDetailVO } from '@/types/resumeJobMatch'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const profileGenerating = ref(false)
const loadError = ref('')
const report = ref<ResumeJobMatchReportDetailVO | null>(null)
let reportPollTimer: ReturnType<typeof setTimeout> | undefined

const reportId = computed(() => Number(route.params.id) || 0)
const isTrackingReport = computed(() => {
  const status = report.value?.status
  return status === 'PENDING' || status === 'PROCESSING'
})
const scoreCards = computed(() => [
  { label: '综合匹配', value: report.value?.overallScore },
  { label: '技术栈', value: report.value?.techStackScore },
  { label: '项目经验', value: report.value?.projectExperienceScore },
  { label: '业务契合', value: report.value?.businessFitScore },
  { label: '沟通表达', value: report.value?.communicationScore }
])

const statusTag = (status?: string) => status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'danger' : 'warning'
const stringify = (value: unknown) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).join('\n')
  return JSON.stringify(value, null, 2)
}

const DataBlock = defineComponent({
  props: { title: { type: String, required: true }, value: { type: null, required: false } },
  setup(props) {
    return () => h('article', { class: 'data-block' }, [
      h('h3', props.title),
      props.value ? h('pre', stringify(props.value)) : h(AppState, { type: 'empty', title: '暂无数据', description: '当前报告暂无该项内容。' })
    ])
  }
})

const loadReport = async (silent = false) => {
  if (!reportId.value) {
    loadError.value = '报告 ID 无效。'
    return
  }
  if (!silent) {
    loading.value = true
    loadError.value = ''
  }
  try {
    report.value = await getResumeJobMatchReportDetailApi(reportId.value)
    loadError.value = ''
    if (isTrackingReport.value) {
      scheduleReportPoll()
    } else {
      stopReportPoll()
    }
  } catch (error) {
    if (!silent) {
      report.value = null
      loadError.value = getErrorMessage(error, '读取匹配报告详情失败。')
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

const stopReportPoll = () => {
  if (reportPollTimer) {
    clearTimeout(reportPollTimer)
    reportPollTimer = undefined
  }
}

const scheduleReportPoll = () => {
  stopReportPoll()
  reportPollTimer = setTimeout(() => {
    void loadReport(true)
  }, 2500)
}

const generateProfile = async () => {
  if (!report.value) return
  profileGenerating.value = true
  try {
    const result = await generateSkillProfileApi({ matchReportId: report.value.reportId })
    ElMessage.success(result.status === 'FAILED' ? '能力画像生成返回失败状态' : '能力画像任务已提交')
    await router.push({ path: '/skill-profile', query: { profileId: result.profileId, matchReportId: report.value.reportId, targetJobId: report.value.targetJobId, resumeId: report.value.resumeId } })
  } finally {
    profileGenerating.value = false
  }
}

onMounted(loadReport)
onBeforeUnmount(stopReportPoll)
</script>

<style scoped lang="scss">
.v3-page { display: flex; flex-direction: column; gap: 18px; }
.page-hero, .content-panel, .score-card { border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-card-bg); box-shadow: var(--app-shadow); }
.page-hero { display: flex; justify-content: space-between; gap: 18px; padding: 24px; }
.hero-kicker, .hero-actions, .section-head, .section-actions { display: flex; align-items: center; gap: 10px; }
.hero-kicker { color: var(--app-primary); font-size: 12px; font-weight: 700; text-transform: uppercase; }
h1, h2, h3, p { margin: 0; }
h1 { margin-top: 10px; font-size: 30px; }
p { margin-top: 8px; color: var(--app-text-muted); line-height: 1.7; }
.content-panel { padding: 20px; min-width: 0; }
.report-tracker { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.report-tracker h2 { margin-top: 12px; font-size: 18px; }
.report-tracker p { max-width: 640px; font-size: 13px; }
.score-grid { display: grid; grid-template-columns: repeat(5, minmax(130px, 1fr)); gap: 14px; }
.score-card { padding: 16px; }
.score-card span { color: var(--app-text-muted); font-size: 13px; }
.score-card strong { display: block; margin: 8px 0 12px; font-size: 28px; }
.detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 18px; }
.section-head { justify-content: space-between; margin-bottom: 16px; }
.section-actions { flex-wrap: wrap; justify-content: flex-end; }
.json-sections { display: grid; gap: 14px; }
.data-block { padding: 14px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.28); }
.data-block h3 { font-size: 15px; }
.data-block pre { margin: 10px 0 0; white-space: pre-wrap; color: var(--app-text); line-height: 1.7; }
.action-panel { display: flex; flex-direction: column; gap: 12px; align-self: start; }
@media (max-width: 1080px) { .score-grid, .detail-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 760px) { .page-hero, .detail-grid, .score-grid { grid-template-columns: 1fr; flex-direction: column; } .hero-actions, .section-head { flex-wrap: wrap; } .section-actions { justify-content: flex-start; } .report-tracker { align-items: flex-start; flex-direction: column; } }
</style>
