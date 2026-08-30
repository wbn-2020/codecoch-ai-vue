<template>
  <main class="project-evidence-list page-shell cc-module-page">
    <PageHeader
      eyebrow="求职资料"
      :icon="Target"
      title="项目证据库"
      description="将真实项目沉淀为可用于简历表达、JD 匹配和面试追问的证据。"
    >
      <template #actions>
        <el-button @click="router.push('/resumes')">
          <FileText :size="16" />
          简历准备
        </el-button>
        <el-button type="primary" @click="router.push('/project-evidence/create')">
          <Plus :size="16" />
          新建项目证据
        </el-button>
      </template>
    </PageHeader>

    <ModuleTabs :items="moduleTabs" />

    <section class="cc-metric-grid">
      <MetricCard label="证据总量" :value="totalEvidenceCount" detail="来自当前查询结果，不额外推断项目数量。" />
      <MetricCard label="可用于追问" :value="readyEvidenceCount" detail="完整度达到可复用状态的项目。" tone="success" />
      <MetricCard label="待补充证据" :value="gapEvidenceCount" detail="仍缺背景、贡献、结果或能力证据。" :tone="gapEvidenceCount ? 'warning' : 'default'" />
    </section>

    <DataTableFrame
      title="项目证据"
      description="先找到最需要补强的项目，再进入详情完善证据。"
    >
      <template #filters>
        <FilterBar>
        <el-input v-model.trim="query.keyword" clearable placeholder="搜索项目名称、技术栈或职责" @keyup.enter="handleSearch">
          <template #prefix>
            <Search :size="15" />
          </template>
        </el-input>
        <el-select v-model="query.completenessStatus" clearable placeholder="证据状态">
          <el-option label="可用于面试追问" value="READY" />
          <el-option label="还需要补证据" value="NEEDS_IMPROVEMENT" />
          <el-option label="暂不足以支撑表达" value="INCOMPLETE" />
        </el-select>
          <template #actions>
            <el-button type="primary" @click="handleSearch">筛选</el-button>
            <el-button @click="handleReset">重置</el-button>
          </template>
        </FilterBar>
      </template>

      <section class="evidence-section" v-loading="loading">
      <AppState
        v-if="loadError"
        type="error"
        title="项目证据加载失败"
        :description="loadError"
      >
        <div class="state-actions">
          <el-button type="primary" @click="fetchList">重新加载</el-button>
          <el-button @click="router.push('/resumes')">返回准备</el-button>
        </div>
      </AppState>

      <div v-else-if="items.length" class="evidence-grid">
        <article v-for="item in items" :key="item.id" class="evidence-card">
          <div class="evidence-card__top">
            <div class="evidence-title">
              <span class="evidence-icon">
                <BriefcaseBusiness :size="20" />
              </span>
              <div>
                <h2>{{ item.title || '未命名项目' }}</h2>
                <p>{{ item.role || '未填写项目角色' }}</p>
              </div>
            </div>
            <el-tag :type="getCompletenessTone(item.completenessStatus)" effect="plain">
              {{ completenessLabel(item) }}
            </el-tag>
          </div>

          <div class="proof-panel">
            <span>这个项目目前能证明</span>
            <strong>{{ proofSummary(item) }}</strong>
            <p>{{ item.techStack || '技术栈还未补齐，暂不能判断它能支撑哪些技术关键词。' }}</p>
          </div>

          <div class="evidence-signal-grid">
            <div>
              <CheckCircle2 :size="16" />
              <span>能力证据</span>
              <strong>{{ evidenceCountText(item) }}</strong>
            </div>
            <div>
              <Link2 :size="16" />
              <span>来源可信度</span>
              <strong>{{ summarizeSourceState(item) }}</strong>
            </div>
          </div>

          <div class="gap-panel" :class="{ clear: !missingFields(item).length }">
            <div class="gap-panel__head">
              <AlertTriangle :size="16" />
              <span>{{ missingFields(item).length ? '证据缺口' : '证据缺口已较少' }}</span>
            </div>
            <div v-if="missingFields(item).length" class="missing">
              <el-tag v-for="field in missingFields(item)" :key="field" size="small" type="warning" effect="plain">
                {{ field }}
              </el-tag>
            </div>
            <p v-else>当前列表字段没有返回明显缺口，可进入详情复核能力证据和 JD 覆盖。</p>
          </div>

          <p class="connection-strip">
            可用于简历表达、JD 匹配和面试追问
          </p>

          <div class="card-actions">
            <el-button @click="router.push(`/project-evidence/${item.id}`)">
              查看证据
            </el-button>
            <el-button type="primary" plain @click="router.push(`/project-evidence/${item.id}/edit`)">
              补齐证据
              <ArrowRight :size="15" />
            </el-button>
          </div>
        </article>
      </div>

      <EmptyState
        v-else
        title="还没有可复用的项目证据"
        description="先沉淀一个真实项目，补齐背景、个人贡献、技术难点和量化结果，后续才能支撑简历、JD 匹配和面试追问。"
      >
        <template #icon>
          <BriefcaseBusiness :size="20" />
        </template>
        <template #actions>
          <el-button type="primary" @click="router.push('/project-evidence/create')">新建项目证据</el-button>
          <el-button @click="router.push('/resumes')">回到简历工作台</el-button>
        </template>
      </EmptyState>

      <div v-if="pagination.total > pagination.pageSize" class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="pagination.total"
          :page-sizes="[8, 12, 20]"
          @change="fetchList"
        />
      </div>
      </section>
    </DataTableFrame>
  </main>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Link2,
  Plus,
  Search,
  Target
} from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getProjectEvidenceListApi } from '@/api/projectEvidence'
import AppState from '@/components/common/AppState.vue'
import DataTableFrame from '@/components/user-ui/DataTableFrame.vue'
import EmptyState from '@/components/user-ui/EmptyState.vue'
import FilterBar from '@/components/user-ui/FilterBar.vue'
import MetricCard from '@/components/user-ui/MetricCard.vue'
import ModuleTabs from '@/components/user-ui/ModuleTabs.vue'
import PageHeader from '@/components/user-ui/PageHeader.vue'
import { useUserModuleTabs } from '@/composables/useUserModuleTabs'
import { getCompletenessTone, normalizeMissingFields, summarizeSourceState } from '@/features/project-evidence'
import type { ProjectEvidenceListVO, ProjectEvidenceQueryDTO } from '@/types/projectEvidence'
import { toFriendlyMessage } from '@/utils/error'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const items = ref<ProjectEvidenceListVO[]>([])
const query = reactive<ProjectEvidenceQueryDTO>({
  pageNo: 1,
  pageSize: 8,
  keyword: '',
  completenessStatus: undefined
})
const pagination = reactive({
  total: 0,
  pageSize: 8
})
const moduleTabs = useUserModuleTabs('resources')

const totalEvidenceCount = computed(() => pagination.total || items.value.length)
const readyEvidenceCount = computed(() => items.value.filter((item) => item.completenessStatus === 'READY').length)
const gapEvidenceCount = computed(() => items.value.filter((item) => missingFields(item).length > 0).length)

const missingFields = (item: ProjectEvidenceListVO) => normalizeMissingFields(item.missingFields)

const completenessLabel = (item: ProjectEvidenceListVO) => {
  const hasScore = item.completenessScore !== null && item.completenessScore !== undefined
  const score = item.completenessScore
  if (!hasScore) {
    if (item.completenessStatus === 'READY') return '可追问'
    if (item.completenessStatus === 'NEEDS_IMPROVEMENT') return '待补强'
    if (item.completenessStatus === 'INCOMPLETE') return '证据不足'
    return '完整度待确认'
  }
  if (item.completenessStatus === 'READY') return `${score}% 可追问`
  if (item.completenessStatus === 'NEEDS_IMPROVEMENT') return `${score}% 待补强`
  if (item.completenessStatus === 'INCOMPLETE') return `${score}% 证据不足`
  return `${score}% 待复核`
}

const evidenceCountText = (item: ProjectEvidenceListVO) => {
  const count = item.skillEvidenceCount || 0
  return count > 0 ? `${count} 条已记录` : '暂未记录'
}

const proofSummary = (item: ProjectEvidenceListVO) => {
  if (item.skillEvidenceCount && item.role) return `${item.role}中的真实贡献与能力证据`
  if (item.role) return `${item.role}职责，需要继续补能力证据`
  if (item.skillEvidenceCount) return '已有能力证据，但项目角色仍需补齐'
  return '项目价值待补齐，暂不能包装成强证明'
}

const fetchList = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const page = await getProjectEvidenceListApi(query)
    items.value = page.records || []
    pagination.total = page.total || 0
    pagination.pageSize = page.pageSize || query.pageSize || 8
  } catch (error) {
    items.value = []
    pagination.total = 0
    loadError.value = toFriendlyMessage(error, '暂时无法读取项目证据，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchList()
}

const handleReset = () => {
  Object.assign(query, {
    pageNo: 1,
    pageSize: 8,
    keyword: '',
    completenessStatus: undefined
  })
  fetchList()
}

onMounted(fetchList)
</script>

<style scoped lang="scss">
.project-evidence-list {
  display: grid;
  gap: 16px;
  min-width: 0;
  color: var(--user-text);
}

.cc-metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.evidence-hero,
.hero-actions,
.evidence-toolbar,
.toolbar-controls,
.evidence-card__top,
.evidence-title,
.gap-panel__head,
.connection-strip,
.connection-strip span,
.card-actions,
.state-actions {
  display: flex;
  align-items: center;
}

.evidence-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  padding: 22px 24px;
  overflow: hidden;
  border: 1.5px solid var(--user-primary-border);
  border-radius: var(--arena-radius-card);
  background: var(--user-surface-tint);
  box-shadow: var(--arena-shadow-card);
}

.hero-kicker {
  gap: 8px;
  margin: 0;
  color: var(--arena-grn-d);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.hero-copy {
  min-width: 0;

  h1 {
    max-width: 760px;
    margin: 12px 0 0;
    color: var(--arena-ink);
    font-size: 28px;
    line-height: 1.2;
  }

  p:not(.hero-kicker) {
    max-width: 760px;
    margin: 12px 0 0;
    color: var(--arena-sub);
    line-height: 1.65;
  }
}

.hero-actions {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.hero-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  overflow: hidden;
  border: 1.5px solid var(--arena-line);
  border-radius: 14px;
  background: var(--user-surface);

  div {
    min-width: 0;
    padding: 12px;

    & + div {
      border-left: 1px solid var(--arena-line);
    }
  }

  span {
    color: var(--arena-sub);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 4px;
    color: var(--arena-ink);
    font-size: 24px;
  }

  p {
    margin: 4px 0 0;
    color: var(--arena-sub);
    font-size: 12px;
    line-height: 1.6;
  }
}

.evidence-toolbar {
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;

  h2 {
    margin: 4px 0 0;
    font-size: 20px;
  }
}

.section-kicker {
  margin: 0;
  color: var(--arena-grn-d);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.toolbar-controls {
  flex: 1;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;

  .el-input {
    max-width: 360px;
  }

  .el-select {
    width: 190px;
  }
}

.evidence-section {
  padding: 16px;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.evidence-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  min-height: 0;
  padding: 16px;
  border: 1.5px solid var(--arena-line);
  border-radius: var(--arena-radius-card);
  background: var(--arena-card);
  box-shadow: var(--arena-shadow-card);
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  &:hover {
    border-color: var(--user-primary-border);
    background: var(--user-surface);
    box-shadow: var(--arena-shadow-hover);
  }
}

.evidence-card__top {
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.evidence-title {
  flex: 1 1 auto;
  min-width: 0;
  gap: 12px;

  > div {
    min-width: 0;
  }

  h2 {
    margin: 0;
    overflow: hidden;
    color: var(--arena-ink);
    font-size: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 6px 0 0;
    color: var(--arena-sub);
    font-size: 13px;
  }
}

.evidence-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 12px;
  background: var(--arena-vio-soft);
  color: var(--arena-vio);
}

.proof-panel,
.gap-panel {
  min-width: 0;
}

.proof-panel {
  padding: 2px 0 12px;
  border-bottom: 1px solid var(--arena-line);

  span {
    color: var(--arena-sub);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: var(--arena-ink);
    font-size: 15px;
    line-height: 1.6;
  }

  p {
    display: -webkit-box;
    margin: 8px 0 0;
    overflow: hidden;
    color: var(--arena-sub);
    font-size: 13px;
    line-height: 1.7;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
}

.evidence-signal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--arena-line);
  border-radius: 12px;

  > div {
    padding: 12px;
    background: var(--user-surface-muted);
    color: var(--arena-sub);

    & + div {
      border-left: 1px solid var(--arena-line);
    }

    svg {
      color: var(--arena-grn-d);
    }
  }

  span,
  strong {
    display: block;
  }

  span {
    margin-top: 8px;
    color: var(--arena-sub);
    font-size: 12px;
  }

  strong {
    margin-top: 4px;
    overflow: hidden;
    color: var(--arena-ink);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.gap-panel {
  padding: 12px;
  border: 1px solid var(--user-warning-soft);
  border-radius: 12px;
  background: var(--arena-amber-soft);

  &.clear {
    border-color: var(--user-success-border);
    background: var(--user-success-soft);
  }

  p {
    margin: 8px 0 0;
    color: var(--arena-sub);
    font-size: 12px;
    line-height: 1.6;
  }
}

.gap-panel__head {
  gap: 8px;
  color: var(--user-warning-text);
  font-size: 13px;
  font-weight: 600;
}

.missing {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.connection-strip {
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;

  span {
    gap: 6px;
    padding: 6px 9px;
    border: 1px solid var(--arena-line);
    border-radius: 999px;
    background: var(--user-surface-muted);
    color: var(--arena-sub);
    font-size: 12px;
  }
}

.card-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 2px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.state-actions {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

@media (max-width: 1080px) {
  .cc-metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .evidence-hero {
    grid-template-columns: 1fr;
  }

  .hero-panel {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .evidence-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-controls {
    justify-content: flex-start;
    width: 100%;
  }
}

@media (max-width: 760px) {
  .cc-metric-grid {
    grid-template-columns: 1fr;
  }

  .evidence-hero {
    padding: 16px;
  }

  .hero-copy h1 {
    font-size: 24px;
  }

  .hero-panel,
  .evidence-signal-grid {
    grid-template-columns: 1fr;
  }

  .hero-panel div + div,
  .evidence-signal-grid > div + div {
    border-top: 1px solid var(--arena-line);
    border-left: 0;
  }

  .toolbar-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar-controls .el-input,
  .toolbar-controls .el-select {
    width: 100%;
    max-width: none;
  }

  .evidence-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .evidence-card {
    min-height: 0;
  }

  .evidence-card__top,
  .card-actions {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
