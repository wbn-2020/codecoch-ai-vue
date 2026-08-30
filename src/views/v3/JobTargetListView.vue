<template>
  <main class="job-target-page cc-module-page">
    <PageHeader
      eyebrow="岗位匹配"
      :icon="Crosshair"
      title="目标岗位"
      description="维护目标岗位和岗位描述，让简历匹配、题库训练和模拟面试围绕同一条求职路线展开。"
    >
      <template #actions>
        <el-button @click="router.push('/resume-match')">
          <GitCompareArrows :size="16" />
          发起简历匹配
        </el-button>
        <el-button type="primary" @click="router.push('/job-targets/create')">
          <Plus :size="16" />
          新增目标岗位
        </el-button>
      </template>
    </PageHeader>

    <ModuleTabs :items="moduleTabs" />

    <section class="target-summary">
      <div class="target-summary__copy">
        <span>当前主目标</span>
        <template v-if="currentTarget">
          <h2>{{ currentTarget.jobTitle }}</h2>
          <p>{{ currentTarget.companyName || '公司信息待补充' }} · {{ currentTarget.jobLevel || '级别待补充' }}</p>
          <JobTargetStatusTag :status="currentTarget.parseStatus" />
        </template>
        <template v-else>
          <h2>还没有设置当前主目标</h2>
          <p>先挑一条最想拿到的岗位，后续训练和简历匹配才会更聚焦。</p>
        </template>
      </div>
      <div class="target-summary__actions">
        <el-button text :loading="loading" @click="fetchAll">
          <RefreshCw :size="16" />
          刷新数据
        </el-button>
        <el-button v-if="currentTarget" type="primary" plain @click="router.push(`/job-targets/${currentTarget.id}/analysis`)">
          <ScanSearch :size="16" />
          查看分析
        </el-button>
      </div>
    </section>

    <section class="cc-metric-grid">
      <MetricCard label="目标岗位总数" :value="targets.length" detail="当前正在准备的岗位数量。" />
      <MetricCard label="已解析岗位" :value="parsedCount" detail="已提取岗位要求和训练关注点。" tone="success" />
      <MetricCard label="解析失败" :value="failedCount" detail="需要补充岗位描述后重新解析。" :tone="failedCount ? 'warning' : 'default'" />
      <MetricCard label="最近更新时间" :value="latestUpdatedAt" detail="帮助判断是否该重新整理岗位信息。" />
    </section>

    <DataTableFrame
      title="目标岗位列表"
      description="筛选并推进最需要跟进的岗位目标。"
    >
      <template #header>
        <el-button text :loading="loading" @click="fetchAll">
          <RefreshCw :size="15" />
          同步最新
        </el-button>
      </template>

      <template #filters>
        <FilterBar>
          <el-input
            v-model.trim="query.keyword"
            class="target-filter-keyword"
            clearable
            placeholder="搜索岗位、公司或级别"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <Search :size="15" />
            </template>
          </el-input>
          <el-select v-model="query.status" clearable placeholder="状态">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
          <el-select v-model="query.current" clearable placeholder="主目标">
            <el-option label="当前主目标" :value="true" />
            <el-option label="非主目标" :value="false" />
          </el-select>
          <template #actions>
            <el-button type="primary" :loading="loading" @click="handleSearch">筛选</el-button>
            <el-button :disabled="loading" @click="handleReset">重置</el-button>
          </template>
        </FilterBar>
      </template>

      <div class="target-list" v-loading="loading">
        <el-alert
          v-if="partialLoadWarning"
          class="target-warning"
          type="warning"
          show-icon
          :closable="false"
          title="部分岗位数据暂时不可用"
          :description="partialLoadWarning"
        />

        <AppState
          v-if="loadError && !loading"
          type="error"
          title="目标岗位加载失败"
          :description="loadError"
        >
          <el-button type="primary" @click="fetchAll">重新加载</el-button>
        </AppState>

        <EmptyState
          v-else-if="!loading && targets.length === 0"
          title="暂无目标岗位"
          description="创建第一个目标岗位后，可以解析岗位描述、提取训练关注点并串联到简历匹配。"
        >
          <template #icon>
            <Crosshair :size="20" />
          </template>
          <template #actions>
            <el-button type="primary" @click="router.push('/job-targets/create')">新增目标岗位</el-button>
          </template>
        </EmptyState>

        <div v-else class="target-card-list">
          <article
            v-for="row in targets"
            :key="row.id"
            class="target-row"
            :class="{ 'is-current': row.currentFlag === 1 }"
          >
            <div class="target-row__primary">
              <div class="target-row__tags">
                <StatusChip v-if="row.currentFlag === 1" label="当前主目标" tone="success" dot />
                <JobTargetStatusTag :status="row.status" />
                <JobTargetStatusTag :status="row.parseStatus" />
              </div>
              <h3>{{ row.jobTitle || '未命名岗位' }}</h3>
              <p>{{ row.companyName || '公司待补充' }} · {{ row.jobLevel || '级别待补充' }}</p>
              <p class="target-row__summary">{{ targetSummary(row) }}</p>
            </div>
            <div class="target-row__meta">
              <span>最近更新</span>
              <strong>{{ formatDateTime(row.updatedAt || row.createdAt) }}</strong>
            </div>
            <div class="target-row__actions">
              <el-button type="primary" plain @click="router.push(`/job-targets/${row.id}/analysis`)">
                <ScanSearch :size="15" />
                {{ analysisActionLabel(row) }}
              </el-button>
              <el-dropdown trigger="click" @command="(command: string) => handleRowCommand(row, command)">
                <el-button :icon="MoreHorizontal" circle title="更多岗位操作" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">
                      <Pencil :size="15" />
                      编辑岗位描述
                    </el-dropdown-item>
                    <el-dropdown-item :disabled="parsingId !== null" command="parse">
                      <Sparkles :size="15" />
                      {{ row.parseStatus === 'PARSED' ? '重新解析' : '解析岗位描述' }}
                    </el-dropdown-item>
                    <el-dropdown-item :disabled="row.currentFlag === 1 || settingCurrentId !== null" command="current">
                      <CircleDot :size="15" />
                      设为当前
                    </el-dropdown-item>
                    <el-dropdown-item :disabled="deletingId !== null" divided command="delete">
                      <Trash2 :size="15" />
                      删除岗位
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </article>
        </div>
      </div>
    </DataTableFrame>
  </main>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  CircleDot,
  Crosshair,
  GitCompareArrows,
  MoreHorizontal,
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
import DataTableFrame from '@/components/user-ui/DataTableFrame.vue'
import EmptyState from '@/components/user-ui/EmptyState.vue'
import FilterBar from '@/components/user-ui/FilterBar.vue'
import MetricCard from '@/components/user-ui/MetricCard.vue'
import ModuleTabs from '@/components/user-ui/ModuleTabs.vue'
import PageHeader from '@/components/user-ui/PageHeader.vue'
import StatusChip from '@/components/user-ui/StatusChip.vue'
import { useUserModuleTabs } from '@/composables/useUserModuleTabs'
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

const moduleTabs = useUserModuleTabs('matching')

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
  display: grid;
  gap: 16px;
}

.cc-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.target-summary {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 16px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-primary-faint);
}

.target-summary__copy {
  min-width: 0;
}

.target-summary__copy > span,
.target-row__meta > span {
  color: var(--user-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.target-summary h2,
.target-row h3 {
  margin: 5px 0 0;
  color: var(--user-text);
  font-size: 18px;
  line-height: 1.35;
}

.target-summary p,
.target-row p {
  margin: 5px 0 0;
  color: var(--user-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.target-summary :deep(.el-tag) {
  margin-top: 10px;
}

.target-summary__actions {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 6px;
}

.target-filter-keyword {
  width: min(280px, 100%);
}

.target-list {
  min-height: 240px;
  padding: 14px;
}

.target-warning {
  margin-bottom: 12px;
}

.target-card-list {
  display: grid;
  gap: 8px;
}

.target-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(130px, 158px) auto;
  gap: 16px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
}

.target-row.is-current {
  border-color: var(--user-primary-border);
  background: var(--user-primary-faint);
}

.target-row__primary {
  min-width: 0;
}

.target-row__tags,
.target-row__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.target-row__summary {
  max-width: 78ch;
}

.target-row__meta {
  min-width: 0;
  text-align: right;
}

.target-row__meta strong {
  display: block;
  margin-top: 4px;
  color: var(--user-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 1180px) {
  .cc-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .target-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .target-row__meta {
    grid-column: 1;
    text-align: left;
  }

  .target-row__actions {
    grid-row: 1 / span 2;
    grid-column: 2;
    align-self: center;
  }
}

@media (max-width: 760px) {
  .cc-metric-grid {
    grid-template-columns: 1fr;
  }

  .target-summary {
    flex-direction: column;
  }

  .target-summary__actions {
    justify-content: flex-start;
  }

  .target-filter-keyword,
  :deep(.el-select) {
    width: 100%;
  }

  .target-list {
    padding: 12px;
  }

  .target-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .target-row__meta,
  .target-row__actions {
    grid-column: auto;
    grid-row: auto;
    text-align: left;
  }
}
</style>
