<template>
  <div class="v3-page">
    <section class="page-hero">
      <div>
        <div class="hero-kicker"><GitCompareArrows :size="16" /> Resume Match</div>
        <h1>简历岗位匹配</h1>
        <p>选择真实简历和目标岗位，提交后端匹配报告生成任务。页面只展示接口返回的数据，不填充演示分数。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/resumes')"><FileText :size="16" /> 简历中心</el-button>
        <el-button type="primary" @click="router.push('/job-targets')"><Crosshair :size="16" /> 岗位目标</el-button>
      </div>
    </section>

    <section v-if="loadError" class="content-panel">
      <AppState type="error" title="基础数据加载失败" :description="loadError">
        <el-button type="primary" @click="loadInitial">重新加载</el-button>
      </AppState>
    </section>

    <section class="match-layout">
      <div class="content-panel form-panel" v-loading="loading">
        <div class="section-head">
          <div>
            <h2>发起匹配分析</h2>
            <p>默认带入当前主目标岗位和默认简历，可手动切换。</p>
          </div>
          <el-tag v-if="currentTarget" type="success" effect="plain">当前岗位已读取</el-tag>
        </div>

        <el-form label-position="top">
          <el-form-item label="简历">
            <el-select v-model="form.resumeId" filterable placeholder="选择简历" class="full">
              <el-option
                v-for="resume in resumes"
                :key="resume.id"
                :label="`${resume.resumeName || resume.title || `简历 #${resume.id}`}${resume.isDefault === 1 ? ' · 默认' : ''}`"
                :value="resume.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="目标岗位">
            <el-select v-model="form.targetJobId" filterable placeholder="选择岗位目标" class="full">
              <el-option
                v-for="target in targets"
                :key="target.id"
                :label="`${target.jobTitle || `岗位 #${target.id}`} · ${target.companyName || '--'}`"
                :value="target.id"
              />
            </el-select>
          </el-form-item>
          <el-checkbox v-model="form.forceRefresh">强制重新生成报告</el-checkbox>
          <div class="submit-row">
            <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submitMatch">
              <Sparkles :size="16" /> 提交匹配报告
            </el-button>
            <el-button :loading="loading" @click="loadInitial"><RefreshCw :size="16" /> 刷新数据</el-button>
          </div>
        </el-form>

        <AppState
          v-if="!loading && (!resumes.length || !targets.length)"
          type="empty"
          title="缺少匹配输入"
          :description="!resumes.length ? '还没有可用简历，请先创建或上传简历。' : '还没有目标岗位，请先创建岗位目标。'"
        />
      </div>

      <div class="content-panel">
        <div class="section-head">
          <div>
            <h2>最近报告</h2>
            <p>来自 GET /resume-job-match/reports。</p>
          </div>
          <el-button text :loading="reportsLoading" @click="loadReports">刷新</el-button>
        </div>
        <div v-loading="reportsLoading" class="report-list">
          <AppState v-if="reportsError" type="error" title="报告列表加载失败" :description="reportsError">
            <el-button type="primary" @click="loadReports">重试</el-button>
          </AppState>
          <AppState v-else-if="!reports.length" type="empty" title="暂无匹配报告" description="提交一次真实匹配后，这里会显示最新报告。" />
          <button v-for="report in reports" v-else :key="report.reportId" class="report-card" type="button" @click="router.push({ path: `/resume-match/${report.reportId}`, query: { resumeId: report.resumeId, targetJobId: report.targetJobId } })">
            <span>
              <strong>{{ report.jobTitle || `岗位 #${report.targetJobId}` }}</strong>
              <small>{{ report.resumeTitle || `简历 #${report.resumeId}` }} · {{ formatDateTime(report.updatedAt || report.createdAt) }}</small>
            </span>
            <el-tag :type="statusTag(report.status)">{{ report.status || '--' }}</el-tag>
            <b>{{ report.overallScore ?? '--' }}</b>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Crosshair, FileText, GitCompareArrows, RefreshCw, Sparkles } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getCurrentJobTargetApi, getJobTargetsApi } from '@/api/jobTarget'
import { getResumesApi } from '@/api/resume'
import { createResumeJobMatchReportApi, getResumeJobMatchReportsApi } from '@/api/resumeJobMatch'
import AppState from '@/components/common/AppState.vue'
import type { TargetJobVO } from '@/types/jobTarget'
import type { ResumeVO } from '@/types/resume'
import type { ResumeJobMatchReportListVO } from '@/types/resumeJobMatch'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const reportsLoading = ref(false)
const loadError = ref('')
const reportsError = ref('')
const resumes = ref<ResumeVO[]>([])
const targets = ref<TargetJobVO[]>([])
const currentTarget = ref<TargetJobVO | null>(null)
const reports = ref<ResumeJobMatchReportListVO[]>([])

const form = reactive({
  resumeId: undefined as number | undefined,
  targetJobId: undefined as number | undefined,
  forceRefresh: false
})

const canSubmit = computed(() => Boolean(form.resumeId && form.targetJobId && !submitting.value))

const statusTag = (status?: string) => {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'PROCESSING' || status === 'PENDING') return 'warning'
  return 'info'
}

const loadInitial = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const [resumePage, targetList, current] = await Promise.all([
      getResumesApi({ pageNo: 1, pageSize: 50 }),
      getJobTargetsApi({ pageNo: 1, pageSize: 50 }),
      getCurrentJobTargetApi()
    ])
    resumes.value = resumePage.records || []
    targets.value = targetList || []
    currentTarget.value = current || null
    form.resumeId = Number(route.query.resumeId) || resumes.value.find((item) => item.isDefault === 1)?.id || resumes.value[0]?.id
    form.targetJobId = Number(route.query.targetJobId) || current?.id || targets.value[0]?.id
  } catch (error) {
    loadError.value = getErrorMessage(error, '读取简历或岗位目标失败，请确认后端服务和登录态。')
  } finally {
    loading.value = false
  }
}

const loadReports = async () => {
  reportsLoading.value = true
  reportsError.value = ''
  try {
    const page = await getResumeJobMatchReportsApi({ pageNo: 1, pageSize: 8 })
    reports.value = page.records || []
  } catch (error) {
    reportsError.value = getErrorMessage(error, '读取匹配报告列表失败。')
  } finally {
    reportsLoading.value = false
  }
}

const submitMatch = async () => {
  if (!form.resumeId || !form.targetJobId) return
  submitting.value = true
  try {
    const result = await createResumeJobMatchReportApi({
      resumeId: form.resumeId,
      targetJobId: form.targetJobId,
      forceRefresh: form.forceRefresh
    })
    ElMessage.success(result.status === 'FAILED' ? '报告生成返回失败状态，请查看详情' : '匹配报告已提交')
    await router.push({ path: `/resume-match/${result.reportId}`, query: { resumeId: form.resumeId, targetJobId: form.targetJobId } })
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadInitial(), loadReports()])
})
</script>

<style scoped lang="scss">
.v3-page { display: flex; flex-direction: column; gap: 18px; }
.page-hero, .content-panel { border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-card-bg); box-shadow: var(--app-shadow); }
.page-hero { display: flex; justify-content: space-between; gap: 18px; padding: 24px; }
.hero-kicker, .hero-actions, .submit-row, .section-head { display: flex; align-items: center; gap: 10px; }
.hero-kicker { color: var(--app-primary); font-size: 12px; font-weight: 700; text-transform: uppercase; }
h1, h2, p { margin: 0; }
h1 { margin-top: 10px; font-size: 30px; }
p { margin-top: 8px; color: var(--app-text-muted); line-height: 1.7; }
.match-layout { display: grid; grid-template-columns: minmax(360px, 0.9fr) minmax(0, 1.1fr); gap: 18px; }
.content-panel { padding: 20px; min-width: 0; }
.section-head { justify-content: space-between; margin-bottom: 18px; }
.full { width: 100%; }
.submit-row { flex-wrap: wrap; margin-top: 18px; }
.report-list { min-height: 220px; display: grid; gap: 12px; }
.report-card { display: grid; grid-template-columns: minmax(0, 1fr) auto 54px; gap: 12px; align-items: center; width: 100%; padding: 14px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.34); color: var(--app-text); text-align: left; cursor: pointer; }
.report-card strong, .report-card small { display: block; overflow-wrap: anywhere; }
.report-card small { margin-top: 5px; color: var(--app-text-muted); }
.report-card b { text-align: right; font-size: 22px; }
@media (max-width: 960px) { .page-hero, .match-layout { grid-template-columns: 1fr; flex-direction: column; } .hero-actions { flex-wrap: wrap; } }
</style>
