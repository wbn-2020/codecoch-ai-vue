<template>
  <div class="job-target-page page-shell">
    <section class="job-hero">
      <div class="hero-copy">
        <div class="hero-kicker">
          <Crosshair :size="16" />
          V3 Job Target
        </div>
        <h1>岗位目标 / JD 管理</h1>
        <p>围绕一个真实目标岗位管理 JD、解析状态和当前主目标，为后续简历匹配、能力画像和训练计划提供入口。</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="router.push('/job-targets/create')">
            <Plus :size="17" />
            新增岗位目标
          </el-button>
          <el-button size="large" :loading="loading" @click="fetchAll">
            <RefreshCw :size="17" />
            刷新
          </el-button>
        </div>
      </div>

      <div class="current-panel">
        <span>当前主目标</span>
        <template v-if="currentTarget">
          <strong>{{ currentTarget.jobTitle }}</strong>
          <p>{{ currentTarget.companyName || '--' }} · {{ currentTarget.jobLevel || '--' }}</p>
          <JobTargetStatusTag :status="currentTarget.parseStatus" />
        </template>
        <template v-else>
          <strong>--</strong>
          <p>还没有设置当前主目标。</p>
        </template>
      </div>
    </section>

    <section class="metric-grid">
      <article class="metric-card">
        <div class="metric-card__label">岗位目标总数</div>
        <div class="metric-card__value">{{ targets.length }}</div>
        <p>用于简历匹配、能力画像和训练计划的岗位目标。</p>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">已解析 JD</div>
        <div class="metric-card__value">{{ parsedCount }}</div>
        <p>已完成岗位要求、技能重点和面试关注点提取。</p>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">解析失败</div>
        <div class="metric-card__value">{{ failedCount }}</div>
        <p>可进入编辑页补充 JD 后重新解析。</p>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">最近更新时间</div>
        <div class="metric-card__value is-date">{{ latestUpdatedAt }}</div>
        <p>帮助判断当前岗位目标是否需要刷新。</p>
      </article>
    </section>

    <section class="content-card">
      <div class="content-card__body toolbar target-toolbar">
        <div>
          <h2>岗位目标列表</h2>
          <p>管理你正在准备的目标岗位，优先把最重要的岗位设为当前主目标。</p>
        </div>
        <el-form class="filter-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input
              v-model.trim="query.keyword"
              clearable
              placeholder="岗位 / 公司"
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
          <el-form-item label="当前目标">
            <el-select v-model="query.current" clearable placeholder="全部" style="width: 120px">
              <el-option label="是" :value="true" />
              <el-option label="否" :value="false" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleSearch">查询</el-button>
            <el-button :disabled="loading" @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="target-list" v-loading="loading">
        <AppState
          v-if="loadError && !loading"
          type="error"
          title="岗位目标加载失败"
          :description="loadError"
        >
          <el-button type="primary" @click="fetchAll">重新加载</el-button>
        </AppState>

        <AppState
          v-else-if="!loading && targets.length === 0"
          type="empty"
          title="暂无岗位目标"
          description="创建第一个目标岗位后，可以粘贴 JD，系统会提取技能要求并串联简历匹配、刷题和今日计划。"
        >
          <el-button type="primary" @click="router.push('/job-targets/create')">新增岗位目标</el-button>
        </AppState>

        <el-table v-else :data="targets" class="target-table">
          <el-table-column label="岗位目标" min-width="260">
            <template #default="{ row }: { row: TargetJobVO }">
              <div class="job-title-cell">
                <div>
                  <strong>{{ row.jobTitle || '--' }}</strong>
                  <p>{{ row.companyName || '--' }} · {{ row.jobLevel || '--' }}</p>
                </div>
                <el-tag v-if="row.currentFlag === 1" type="success" effect="dark">当前</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }: { row: TargetJobVO }">
              <JobTargetStatusTag :status="row.status" />
            </template>
          </el-table-column>
          <el-table-column label="解析状态" width="130">
            <template #default="{ row }: { row: TargetJobVO }">
              <JobTargetStatusTag :status="row.parseStatus" />
            </template>
          </el-table-column>
          <el-table-column label="解析摘要" min-width="260">
            <template #default="{ row }: { row: TargetJobVO }">
              <span class="summary-text">{{ row.analysisSummary || row.parseErrorMessage || '--' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" width="180">
            <template #default="{ row }: { row: TargetJobVO }">
              {{ formatDateTime(row.updatedAt || row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }: { row: TargetJobVO }">
              <div class="row-actions">
                <el-button type="primary" text @click="router.push(`/job-targets/${row.id}/analysis`)">
                  <ScanSearch :size="15" />
                  分析
                </el-button>
                <el-dropdown trigger="click" @command="(command: string) => handleRowCommand(row, command)">
                  <el-button text :icon="MoreHorizontal" aria-label="更多操作" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="edit">
                        <Pencil :size="14" />
                        编辑
                      </el-dropdown-item>
                      <el-dropdown-item command="parse" :disabled="parsingId !== null">
                        <Sparkles :size="14" />
                        {{ row.parseStatus === 'PARSED' ? '重新解析' : '解析' }}
                      </el-dropdown-item>
                      <el-dropdown-item command="current" :disabled="row.currentFlag === 1 || settingCurrentId !== null">
                        <CircleDot :size="14" />
                        设为当前
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" divided :disabled="deletingId !== null">
                        <Trash2 :size="14" />
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { CircleDot, Crosshair, MoreHorizontal, Pencil, Plus, RefreshCw, ScanSearch, Search, Sparkles, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  deleteJobTargetApi,
  getCurrentJobTargetApi,
  getJobTargetsApi,
  parseJobDescriptionApi,
  setCurrentJobTargetApi
} from '@/api/jobTarget'
import AppState from '@/components/common/AppState.vue'
import type { TargetJobQueryDTO, TargetJobVO } from '@/types/jobTarget'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

import JobTargetStatusTag from './components/JobTargetStatusTag.vue'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
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

const latestUpdatedAt = computed(() => {
  const sortedDates = targets.value
    .map((item) => item.updatedAt || item.createdAt)
    .filter(Boolean)
    .sort()
  const latest = sortedDates[sortedDates.length - 1]
  return latest ? formatDateTime(latest) : '--'
})

const buildQuery = (): TargetJobQueryDTO => ({
  keyword: query.keyword || undefined,
  status: query.status,
  current: query.current
})

const fetchAll = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const [list, current] = await Promise.all([getJobTargetsApi(buildQuery()), getCurrentJobTargetApi()])
    targets.value = list || []
    currentTarget.value = current || null
  } catch (error) {
    loadError.value = getErrorMessage(error, '岗位目标加载失败，请确认登录状态后重试。')
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

const handleSetCurrent = async (row: TargetJobVO) => {
  try {
    await ElMessageBox.confirm(`确认将「${row.jobTitle}」设为当前主目标？`, '设置当前目标', {
      type: 'warning',
      confirmButtonText: '设置',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
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
    ElMessage.warning('该岗位还没有 JD 原文，请先编辑补充。')
    return
  }
  if (row.parseStatus === 'PARSED') {
    try {
      await ElMessageBox.confirm('重新解析会覆盖当前分析结果，确认继续？', '重新解析 JD', {
        type: 'warning',
        confirmButtonText: '重新解析',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
  }
  parsingId.value = row.id
  try {
    await parseJobDescriptionApi(row.id, { forceRefresh: row.parseStatus === 'PARSED' })
    ElMessage.success('JD 解析已完成')
    await fetchAll()
    await router.push(`/job-targets/${row.id}/analysis`)
  } finally {
    parsingId.value = null
  }
}

const handleDelete = async (row: TargetJobVO) => {
  try {
    await ElMessageBox.confirm(`确认删除岗位目标「${row.jobTitle}」？对应 JD 解析结果也会一并删除。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
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
  gap: 20px;
}

.job-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  padding: 28px;
  border: 1px solid rgba(129, 140, 248, 0.28);
  border-radius: var(--cc-radius-xl);
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.08)),
    rgba(15, 23, 42, 0.78);
  box-shadow: var(--app-shadow);
  backdrop-filter: blur(18px);
}

.hero-kicker,
.hero-actions,
.job-title-cell,
.row-actions {
  display: flex;
  align-items: center;
}

.hero-kicker {
  gap: 8px;
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.hero-copy {
  h1 {
    margin: 14px 0 0;
    font-size: 34px;
    line-height: 1.2;
  }

  p {
    max-width: 720px;
    margin: 12px 0 0;
    color: var(--app-text-muted);
    line-height: 1.8;
  }
}

.hero-actions {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.current-panel {
  align-self: stretch;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: rgba(2, 6, 23, 0.42);

  span {
    color: var(--app-text-muted);
    font-size: 13px;
  }

  strong {
    display: block;
    margin-top: 10px;
    color: #f8fafc;
    font-size: 20px;
  }

  p {
    margin: 8px 0 14px;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
}

.metric-card {
  p {
    margin: 10px 0 0;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.metric-card__value.is-date {
  font-size: 16px;
  line-height: 1.5;
}

.target-toolbar {
  align-items: flex-start;

  h2 {
    margin: 0;
    font-size: 20px;
  }

  p {
    margin: 8px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

.filter-form {
  display: flex;
  justify-content: flex-end;
}

.target-list {
  min-height: 320px;
  padding: 0 20px 20px;
  border-top: 1px solid var(--app-border);
}

.target-list > .app-state {
  margin-top: 20px;
}

.target-table {
  margin-top: 20px;
}

.job-title-cell {
  min-width: 0;
  justify-content: space-between;
  gap: 12px;

  strong {
    display: block;
    overflow: hidden;
    color: #f8fafc;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.summary-text {
  display: -webkit-box;
  overflow: hidden;
  color: #cbd5e1;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.row-actions {
  flex-wrap: wrap;
  gap: 2px;
}

.row-actions :deep(.el-button) {
  margin-left: 0;
}

@media (max-width: 1080px) {
  .job-hero {
    grid-template-columns: 1fr;
  }

  .target-toolbar {
    flex-direction: column;
  }

  .filter-form {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .job-hero {
    padding: 22px;
  }

  .hero-copy h1 {
    font-size: 28px;
  }
}
</style>
