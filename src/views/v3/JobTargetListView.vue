<template>
  <div class="job-target-page page-shell">
    <section class="page-hero">
      <div class="hero-copy">
        <p class="hero-kicker">
          <Crosshair :size="16" />
          目标岗位
        </p>
        <h1>把岗位目标和训练动作连起来</h1>
        <p>围绕一个目标岗位管理岗位描述、分析结果和当前主目标，让简历匹配、题库训练和模拟面试都围绕同一条求职路线展开。</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="router.push('/job-targets/create')">
            <Plus :size="17" />
            新增目标岗位
          </el-button>
          <el-button size="large" @click="router.push('/resume-match')">
            <GitCompareArrows :size="17" />
            发起简历匹配
          </el-button>
          <el-button size="large" text :loading="loading" @click="fetchAll">
            <RefreshCw :size="17" />
            刷新
          </el-button>
        </div>
      </div>

      <div class="hero-panel" v-loading="loading">
        <span>当前主目标</span>
        <template v-if="currentTarget">
          <strong>{{ currentTarget.jobTitle }}</strong>
          <p>{{ currentTarget.companyName || '公司信息待补充' }} · {{ currentTarget.jobLevel || '级别待补充' }}</p>
          <JobTargetStatusTag :status="currentTarget.parseStatus" />
        </template>
        <template v-else>
          <strong>还没有设置当前主目标</strong>
          <p>先挑一条最想拿到的岗位，后续训练才会更聚焦。</p>
        </template>
      </div>
    </section>

    <section class="metric-grid">
      <article class="metric-card">
        <span>目标岗位总数</span>
        <strong>{{ targets.length }}</strong>
        <p>你当前正在准备的岗位数量。</p>
      </article>
      <article class="metric-card">
        <span>已解析岗位</span>
        <strong>{{ parsedCount }}</strong>
        <p>已经提取出岗位要求和训练关注点的目标。</p>
      </article>
      <article class="metric-card">
        <span>解析失败</span>
        <strong>{{ failedCount }}</strong>
        <p>需要回到编辑页补充岗位描述的目标。</p>
      </article>
      <article class="metric-card">
        <span>最近更新时间</span>
        <strong class="metric-date">{{ latestUpdatedAt }}</strong>
        <p>帮助判断是否该重新整理岗位信息。</p>
      </article>
    </section>

    <section class="content-card">
      <div class="content-card__body">
        <el-alert
          v-if="partialLoadWarning"
          class="target-warning"
          type="warning"
          show-icon
          :closable="false"
          title="部分岗位数据暂时不可用"
          :description="partialLoadWarning"
        />

        <div class="section-head">
          <div>
            <p class="section-kicker">岗位筛选</p>
            <h2>从岗位清单里找到今天最该推进的那个</h2>
          </div>
          <el-button text :loading="loading" @click="fetchAll">同步最新</el-button>
        </div>

        <el-form class="filter-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input
              v-model.trim="query.keyword"
              clearable
              placeholder="岗位 / 公司 / 级别"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <Search :size="15" />
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 110px">
              <el-option label="启用" :value="1" />
              <el-option label="停用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item label="当前主目标">
            <el-select v-model="query.current" clearable placeholder="全部" style="width: 140px">
              <el-option label="是" :value="true" />
              <el-option label="否" :value="false" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleSearch">开始筛选</el-button>
            <el-button :disabled="loading" @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="target-list" v-loading="loading">
        <AppState
          v-if="loadError && !loading"
          type="error"
          title="目标岗位加载失败"
          :description="loadError"
        >
          <el-button type="primary" @click="fetchAll">重新加载</el-button>
        </AppState>

        <AppState
          v-else-if="!loading && targets.length === 0"
          type="empty"
          title="暂无目标岗位"
          description="创建第一个目标岗位后，可以解析岗位描述、提取训练关注点并串联到简历匹配。"
        >
          <el-button type="primary" @click="router.push('/job-targets/create')">新增目标岗位</el-button>
        </AppState>

        <div v-else class="target-card-list">
          <article
            v-for="row in targets"
            :key="row.id"
            class="target-card"
            :class="{ 'is-current': row.currentFlag === 1 }"
          >
            <div class="target-card__head">
              <div class="target-card__title">
                <div class="target-card__tags">
                  <el-tag v-if="row.currentFlag === 1" type="success" effect="dark">当前主目标</el-tag>
                  <JobTargetStatusTag :status="row.status" />
                  <JobTargetStatusTag :status="row.parseStatus" />
                </div>
                <h3>{{ row.jobTitle || '未命名岗位' }}</h3>
                <p>{{ row.companyName || '公司待补充' }} · {{ row.jobLevel || '级别待补充' }}</p>
              </div>
              <div class="target-card__updated">
                <span>更新时间</span>
                <strong>{{ formatDateTime(row.updatedAt || row.createdAt) }}</strong>
              </div>
            </div>

            <p class="target-card__summary">
              {{ targetSummary(row) }}
            </p>

            <div class="target-actions">
              <el-button type="primary" @click="router.push(`/job-targets/${row.id}/analysis`)">
                <ScanSearch :size="15" />
                {{ analysisActionLabel(row) }}
              </el-button>
              <el-button plain @click="router.push(`/job-targets/${row.id}/edit`)">
                <Pencil :size="15" />
                编辑岗位描述
              </el-button>
              <el-button
                plain
                :loading="parsingId === row.id"
                :disabled="parsingId !== null"
                @click="handleRowCommand(row, 'parse')"
              >
                <Sparkles :size="15" />
                {{ row.parseStatus === 'PARSED' ? '重新解析' : '解析岗位描述' }}
              </el-button>
              <el-button
                plain
                :loading="settingCurrentId === row.id"
                :disabled="row.currentFlag === 1 || settingCurrentId !== null"
                @click="handleRowCommand(row, 'current')"
              >
                <CircleDot :size="15" />
                设为当前
              </el-button>
              <el-button
                type="danger"
                plain
                :loading="deletingId === row.id"
                :disabled="deletingId !== null"
                @click="handleRowCommand(row, 'delete')"
              >
                <Trash2 :size="15" />
                删除
              </el-button>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  CircleDot,
  Crosshair,
  GitCompareArrows,
  Pencil,
  Plus,
  RefreshCw,
  ScanSearch,
  Search,
  Sparkles,
  Trash2
} from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  deleteJobTargetApi,
  getCurrentJobTargetApi,
  getJobTargetsApi,
  submitJobDescriptionParseTaskApi,
  setCurrentJobTargetApi
} from '@/api/jobTarget'
import AppState from '@/components/common/AppState.vue'
import JobTargetStatusTag from './components/JobTargetStatusTag.vue'
import type { TargetJobQueryDTO, TargetJobVO } from '@/types/jobTarget'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const partialLoadWarning = ref('')
const targets = ref<TargetJobVO[]>([])
const currentTarget = ref<TargetJobVO | null>(null)
const parsingId = ref<number | null>(null)
const settingCurrentId = ref<number | null>(null)
const deletingId = ref<number | null>(null)

const query = reactive<TargetJobQueryDTO>({
  keyword: '',
  status: undefined,
  current: undefined
})

const parsedCount = computed(() => targets.value.filter((item) => item.parseStatus === 'PARSED').length)
const failedCount = computed(() => targets.value.filter((item) => item.parseStatus === 'FAILED').length)

const friendlyJobParseError = (message?: string) =>
  toFriendlyMessage(message, '岗位描述解析没有成功，请补充岗位描述内容或稍后重试。')

const latestUpdatedAt = computed(() => {
  const sortedDates = targets.value
    .map((item) => item.updatedAt || item.createdAt)
    .filter(Boolean)
    .sort()
  const latest = sortedDates[sortedDates.length - 1]
  return latest ? formatDateTime(latest) : '--'
})

const normalizeParseStatus = (status?: string) => String(status || '').toUpperCase()
const isParseInProgress = (status?: string) => normalizeParseStatus(status) === 'PARSING'
const isParseFailed = (status?: string) => normalizeParseStatus(status) === 'FAILED'

const targetSummary = (row: TargetJobVO) => {
  if (row.analysisSummary) return row.analysisSummary
  if (isParseInProgress(row.parseStatus)) return '岗位描述正在分析中，可以进入分析页查看进度、任务中心入口和稍后恢复线索。'
  if (isParseFailed(row.parseStatus)) {
    return row.parseErrorMessage
      ? `解析失败：${friendlyJobParseError(row.parseErrorMessage)}`
      : '岗位描述解析失败，可以进入分析页查看失败原因并重新提交解析任务。'
  }
  return '暂无解析摘要，完成岗位描述解析后会显示岗位要求和训练关注点。'
}

const analysisActionLabel = (row: TargetJobVO) => {
  if (isParseInProgress(row.parseStatus)) return '查看解析进度'
  if (isParseFailed(row.parseStatus)) return '查看失败原因'
  return '查看分析'
}

const buildQuery = (): TargetJobQueryDTO => ({
  keyword: query.keyword || undefined,
  status: query.status,
  current: query.current
})

const fetchAll = async () => {
  loading.value = true
  loadError.value = ''
  partialLoadWarning.value = ''
  try {
    const [listResult, currentResult] = await Promise.allSettled([getJobTargetsApi(buildQuery()), getCurrentJobTargetApi()])
    if (listResult.status === 'rejected') {
      targets.value = []
      currentTarget.value = null
      loadError.value = getErrorMessage(listResult.reason, '目标岗位加载失败，请确认登录状态后重试。')
      return
    }

    targets.value = listResult.value || []
    if (currentResult.status === 'fulfilled') {
      currentTarget.value = currentResult.value || targets.value.find((item) => item.currentFlag === 1) || null
    } else {
      currentTarget.value = targets.value.find((item) => item.currentFlag === 1) || null
      partialLoadWarning.value = getErrorMessage(currentResult.reason, '当前主目标读取失败，已先使用岗位列表中的主目标标记。')
    }
  } catch (error) {
    loadError.value = getErrorMessage(error, '目标岗位加载失败，请确认登录状态后重试。')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  fetchAll()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    status: undefined,
    current: undefined
  })
  fetchAll()
}

const handleRowCommand = (row: TargetJobVO, command: string) => {
  if (command === 'edit') {
    router.push(`/job-targets/${row.id}/edit`)
    return
  }
  if (command === 'parse') {
    void handleParse(row)
    return
  }
  if (command === 'current') {
    void handleSetCurrent(row)
    return
  }
  if (command === 'delete') {
    void handleDelete(row)
  }
}

const jobTargetDisplayName = (row: TargetJobVO) =>
  row.jobTitle || row.companyName || '当前岗位目标'

const handleSetCurrent = async (row: TargetJobVO) => {
  const confirmed = await confirmDangerActionPreview({
    title: '设置当前目标',
    action: '将该岗位设为当前主目标',
    target: jobTargetDisplayName(row),
    impact: '今日计划、推荐题、简历匹配和面试推荐会优先参考这个岗位方向，原主目标会被替换。',
    rollback: '可以随时在岗位目标列表中切换回其他岗位。',
    audit: '主目标切换会写入当前账号的操作记录。',
    tips: ['确认这是当前最想投递或训练的岗位。', '确认岗位描述已经尽量补全。'],
    confirmButtonText: '设置为主目标'
  })
  if (!confirmed) return

  settingCurrentId.value = row.id
  try {
    await setCurrentJobTargetApi(row.id)
    ElMessage.success('当前主目标已更新')
    await fetchAll()
  } finally {
    settingCurrentId.value = null
  }
}

const handleParse = async (row: TargetJobVO) => {
  if (!row.jdText) {
    ElMessage.warning('该岗位还没有岗位描述，请先编辑补充。')
    return
  }
  if (row.parseStatus === 'PARSED') {
    const confirmed = await confirmDangerActionPreview({
      title: '重新解析岗位描述',
      action: '重新解析当前岗位描述',
      target: jobTargetDisplayName(row),
      impact: '会刷新该岗位的分析结果，后续能力画像、推荐题、简历匹配和今日计划可能跟随新的分析结果变化。',
      rollback: '旧分析结果不会自动恢复；如新结果不合适，可以再次编辑岗位描述后重新解析。',
      audit: '分析任务会记录必要处理线索，便于在任务中心追踪。',
      tips: ['确认岗位描述已经更新到最新版本。', '确认可以接受基于新分析结果刷新后续推荐。'],
      confirmButtonText: '重新解析'
    })
    if (!confirmed) return
  }

  parsingId.value = row.id
  try {
    const result = await submitJobDescriptionParseTaskApi(row.id, { forceRefresh: row.parseStatus === 'PARSED' })
    ElMessage.success(result.asyncMessageId || result.parseStatus === 'PARSING'
      ? '岗位描述解析任务已提交，可以在任务中心查看进度'
      : '岗位描述解析已完成')
    await fetchAll()
    await router.push(`/job-targets/${row.id}/analysis`)
  } finally {
    parsingId.value = null
  }
}

const handleDelete = async (row: TargetJobVO) => {
  const confirmed = await confirmDangerActionPreview({
    title: '删除岗位目标',
    action: '删除该岗位目标和对应岗位分析',
    target: jobTargetDisplayName(row),
    impact: '岗位目标会从列表移除，对应岗位分析结果也会一并删除；如果它是当前主目标，今日计划和推荐依据可能需要重新选择岗位。',
    rollback: '系统不会自动恢复已删除岗位；如误删，需要重新创建岗位目标并重新解析岗位描述。',
    audit: '删除操作会写入当前账号的操作记录。',
    tips: ['确认这不是当前正在投递或训练的岗位。', '确认不再需要基于该岗位描述查看匹配报告或推荐题。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return

  deletingId.value = row.id
  try {
    await deleteJobTargetApi(row.id)
    ElMessage.success('岗位目标已删除')
    await fetchAll()
  } finally {
    deletingId.value = null
  }
}

onMounted(fetchAll)
</script>

<style scoped lang="scss">
.job-target-page {
  gap: 18px;
}

.page-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  padding: 28px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(16, 185, 129, 0.05)),
    #ffffff;
  box-shadow: var(--app-shadow);
}

.hero-kicker,
.hero-actions,
.section-head,
.target-card__head,
.target-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-kicker,
.section-kicker {
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 800;
}

.hero-copy h1,
.section-head h2,
.target-card h3 {
  margin: 0;
}

.hero-copy h1 {
  color: var(--app-text);
  font-size: 32px;
  line-height: 1.18;
}

.hero-copy p,
.hero-panel p,
.metric-card p,
.target-card p,
.target-card__updated span,
.target-card__title p {
  color: var(--app-text-muted);
}

.hero-copy p {
  max-width: 720px;
  margin: 12px 0 0;
  line-height: 1.8;
}

.hero-actions {
  flex-wrap: wrap;
  margin-top: 22px;
}

.hero-panel {
  align-self: stretch;
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #f8fafc;
}

.hero-panel span,
.metric-card span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.hero-panel strong {
  color: var(--app-text);
  font-size: 18px;
  line-height: 1.4;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
}

.metric-card strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text);
  font-size: 26px;
}

.metric-date {
  font-size: 16px !important;
  line-height: 1.5;
}

.metric-card p {
  margin: 8px 0 0;
  line-height: 1.65;
}

.section-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-head h2 {
  font-size: 20px;
}

.filter-form {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.target-list {
  min-height: 320px;
  padding: 0 20px 20px;
  border-top: 1px solid var(--app-border);
}

.target-list > .app-state {
  margin-top: 20px;
}

.target-card-list {
  display: grid;
  gap: 14px;
  padding-top: 20px;
}

.target-card {
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
}

.target-card.is-current {
  border-color: rgba(34, 197, 94, 0.35);
  box-shadow: 0 12px 28px rgba(34, 197, 94, 0.08);
}

.target-card__head {
  justify-content: space-between;
  align-items: flex-start;
}

.target-card__title {
  min-width: 0;
}

.target-card__title h3 {
  color: var(--app-text);
  font-size: 18px;
  line-height: 1.35;
}

.target-card__title p {
  margin: 6px 0 0;
  font-size: 13px;
}

.target-card__tags,
.target-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.target-card__updated {
  min-width: 150px;
  text-align: right;
}

.target-card__updated span {
  font-size: 12px;
}

.target-card__updated strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text);
  font-size: 13px;
  line-height: 1.5;
}

.target-card__summary {
  margin: 14px 0 0;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  line-height: 1.7;
}

.target-actions {
  margin-top: 14px;
}

.target-actions :deep(.el-button) {
  margin-left: 0;
}

@media (max-width: 1080px) {
  .page-hero,
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-form {
    width: 100%;
    justify-content: flex-start;
  }

  .target-card__head {
    flex-direction: column;
  }

  .target-card__updated {
    text-align: left;
  }
}

@media (max-width: 720px) {
  .page-hero {
    padding: 22px;
  }

  .hero-copy h1 {
    font-size: 28px;
  }

  .hero-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions :deep(.el-button) {
    width: 100%;
  }

  .target-list {
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
