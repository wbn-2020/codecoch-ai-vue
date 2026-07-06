<template>
  <div class="project-evidence-list page-shell">
    <section class="evidence-hero">
      <div class="hero-copy">
        <p class="hero-kicker">
          <Target :size="16" />
          项目证据库
        </p>
        <h1>把项目经历整理成可证明的 Offer 证据</h1>
        <p>
          每个项目都要回答：能证明什么能力、还缺哪类证据、能否支撑简历表达、JD 匹配和面试追问。
        </p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="router.push('/project-evidence/create')">
            <Plus :size="17" />
            新建项目证据
          </el-button>
          <el-button size="large" @click="router.push('/resumes')">
            <FileText :size="17" />
            去简历实验室
          </el-button>
        </div>
      </div>

      <div class="hero-panel">
        <div>
          <span>证据总量</span>
          <strong>{{ totalEvidenceCount }}</strong>
          <p>来自当前查询结果，不额外推断项目数量</p>
        </div>
        <div>
          <span>本页可追问</span>
          <strong>{{ readyEvidenceCount }}</strong>
          <p>完整度达到可复用状态的项目</p>
        </div>
        <div>
          <span>本页待补证据</span>
          <strong>{{ gapEvidenceCount }}</strong>
          <p>仍缺背景、贡献、结果或能力证据</p>
        </div>
      </div>
    </section>

    <section class="content-card evidence-toolbar">
      <div>
        <p class="section-kicker">证据筛选</p>
        <h2>先找到最需要补强的项目</h2>
      </div>
      <div class="toolbar-controls">
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
        <el-button type="primary" plain @click="handleSearch">筛选证据</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </section>

    <section class="content-card evidence-section" v-loading="loading">
      <div class="evidence-grid" v-if="items.length">
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

          <div class="connection-strip">
            <span>
              <FileText :size="14" />
              简历表达
            </span>
            <span>
              <Target :size="14" />
              JD 匹配
            </span>
            <span>
              <MessagesSquare :size="14" />
              面试追问
            </span>
          </div>

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

      <AppState
        v-else
        type="empty"
        title="还没有可复用的项目证据"
        description="先沉淀一个真实项目，补齐背景、个人贡献、技术难点和量化结果，后续才能支撑简历、JD 匹配和面试追问。"
      >
        <div class="state-actions">
          <el-button type="primary" @click="router.push('/project-evidence/create')">新建项目证据</el-button>
          <el-button @click="router.push('/resumes')">去简历实验室</el-button>
        </div>
      </AppState>

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
  </div>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Link2,
  MessagesSquare,
  Plus,
  Search,
  Target
} from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getProjectEvidenceListApi } from '@/api/projectEvidence'
import AppState from '@/components/common/AppState.vue'
import { getCompletenessTone, normalizeMissingFields, summarizeSourceState } from '@/features/project-evidence'
import type { ProjectEvidenceListVO, ProjectEvidenceQueryDTO } from '@/types/projectEvidence'

const router = useRouter()
const loading = ref(false)
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
  try {
    const page = await getProjectEvidenceListApi(query)
    items.value = page.records || []
    pagination.total = page.total || 0
    pagination.pageSize = page.pageSize || query.pageSize || 8
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
  gap: 18px;
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
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  padding: 28px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: var(--cc-radius-xl);
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.76)),
    radial-gradient(circle at top right, rgba(34, 211, 238, 0.16), transparent 34%);
}

.hero-kicker {
  gap: 8px;
  margin: 0;
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.hero-copy {
  min-width: 0;

  h1 {
    max-width: 760px;
    margin: 12px 0 0;
    color: #f8fafc;
    font-size: 34px;
    line-height: 1.2;
  }

  p:not(.hero-kicker) {
    max-width: 760px;
    margin: 12px 0 0;
    color: #cbd5e1;
    line-height: 1.8;
  }
}

.hero-actions {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.hero-panel {
  display: grid;
  gap: 12px;

  div {
    min-width: 0;
    padding: 14px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 12px;
    background: rgba(2, 6, 23, 0.28);
  }

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 4px;
    color: #f8fafc;
    font-size: 24px;
  }

  p {
    margin: 4px 0 0;
    color: var(--app-text-muted);
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
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
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
  min-height: 360px;
  padding: 18px;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.evidence-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  min-height: 430px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.66);
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease;

  &:hover {
    border-color: rgba(34, 211, 238, 0.36);
    background: rgba(15, 23, 42, 0.82);
    transform: translateY(-2px);
  }
}

.evidence-card__top {
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.evidence-title {
  min-width: 0;
  gap: 12px;

  h2 {
    margin: 0;
    overflow: hidden;
    color: #f8fafc;
    font-size: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
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
  border: 1px solid rgba(34, 211, 238, 0.24);
  border-radius: 12px;
  background: rgba(8, 47, 73, 0.28);
  color: #67e8f9;
}

.proof-panel,
.gap-panel,
.evidence-signal-grid > div {
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.28);
}

.proof-panel {
  padding: 14px;

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: #dbeafe;
    font-size: 15px;
    line-height: 1.6;
  }

  p {
    display: -webkit-box;
    margin: 8px 0 0;
    overflow: hidden;
    color: #cbd5e1;
    font-size: 13px;
    line-height: 1.7;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
}

.evidence-signal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  > div {
    padding: 12px;
    color: #cbd5e1;

    svg {
      color: #67e8f9;
    }
  }

  span,
  strong {
    display: block;
  }

  span {
    margin-top: 8px;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 4px;
    overflow: hidden;
    color: #f8fafc;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.gap-panel {
  padding: 12px;

  &.clear {
    border-color: rgba(34, 197, 94, 0.24);
    background: rgba(20, 83, 45, 0.16);
  }

  p {
    margin: 8px 0 0;
    color: #bbf7d0;
    font-size: 12px;
    line-height: 1.6;
  }
}

.gap-panel__head {
  gap: 8px;
  color: #fde68a;
  font-size: 13px;
  font-weight: 700;
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
    border: 1px solid rgba(129, 140, 248, 0.18);
    border-radius: 999px;
    background: rgba(30, 41, 59, 0.46);
    color: #cbd5e1;
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
  .evidence-hero {
    padding: 22px;
  }

  .hero-copy h1 {
    font-size: 28px;
  }

  .hero-panel,
  .evidence-signal-grid {
    grid-template-columns: 1fr;
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
