<template>
  <div class="project-evidence-list page-shell">
    <section class="page-hero">
      <div>
        <p class="hero-kicker">Project Evidence</p>
        <h1>项目素材</h1>
        <p>沉淀可复用的项目事实、能力证据和面试讲述素材，不影响原简历项目经历。</p>
      </div>
      <el-button type="primary" @click="router.push('/project-evidence/create')">
        <Plus :size="16" />
        新建素材
      </el-button>
    </section>

    <section class="content-card evidence-toolbar">
      <el-input v-model.trim="query.keyword" clearable placeholder="搜索项目名称、技术栈或职责" @keyup.enter="handleSearch" />
      <el-select v-model="query.completenessStatus" clearable placeholder="完整度状态">
        <el-option label="可用于面试" value="READY" />
        <el-option label="需要补充" value="NEEDS_IMPROVEMENT" />
        <el-option label="信息不足" value="INCOMPLETE" />
      </el-select>
      <el-button @click="handleSearch">筛选</el-button>
      <el-button @click="handleReset">重置</el-button>
    </section>

    <section class="content-card evidence-section" v-loading="loading">
      <div class="evidence-grid" v-if="items.length">
        <article v-for="item in items" :key="item.id" class="evidence-card">
          <div class="card-head">
            <div>
              <h2>{{ item.title }}</h2>
              <p>{{ item.role || '未填写项目角色' }}</p>
            </div>
            <el-tag :type="getCompletenessTone(item.completenessStatus)" effect="dark">
              {{ item.completenessScore || 0 }}%
            </el-tag>
          </div>
          <p class="tech">{{ item.techStack || '未填写技术栈' }}</p>
          <div class="card-meta">
            <span>{{ item.skillEvidenceCount || 0 }} 条能力证据</span>
            <span>{{ summarizeSourceState(item) }}</span>
          </div>
          <div class="missing" v-if="normalizeMissingFields(item.missingFields).length">
            <el-tag v-for="field in normalizeMissingFields(item.missingFields)" :key="field" size="small" type="warning" effect="plain">
              {{ field }}
            </el-tag>
          </div>
          <div class="card-actions">
            <el-button @click="router.push(`/project-evidence/${item.id}`)">查看</el-button>
            <el-button type="primary" plain @click="router.push(`/project-evidence/${item.id}/edit`)">补充素材</el-button>
          </div>
        </article>
      </div>
      <AppState
        v-else
        type="empty"
        title="暂无项目素材"
        description="可以手动创建，也可以从简历项目经历沉淀一份独立素材。"
      >
        <div class="state-actions">
          <el-button type="primary" @click="router.push('/project-evidence/create')">新建素材</el-button>
          <el-button @click="router.push('/resumes')">去简历中心</el-button>
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
import { Plus } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'
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

.page-hero,
.evidence-toolbar,
.card-head,
.card-meta,
.card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-hero {
  justify-content: space-between;
  padding: 26px;
  border: 1px solid var(--app-border);
  border-radius: var(--cc-radius-xl);
  background: rgba(15, 23, 42, 0.72);

  h1 {
    margin: 6px 0 0;
    font-size: 30px;
  }

  p:last-child {
    margin: 8px 0 0;
    color: var(--app-text-muted);
  }
}

.hero-kicker {
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.evidence-toolbar {
  padding: 16px;

  .el-input {
    max-width: 420px;
  }

  .el-select {
    width: 180px;
  }
}

.evidence-section {
  padding: 18px;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.evidence-card {
  display: flex;
  flex-direction: column;
  min-height: 246px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.card-head {
  align-items: flex-start;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

.tech {
  min-height: 42px;
  margin: 14px 0 0;
  color: #cbd5e1;
  line-height: 1.6;
}

.card-meta {
  flex-wrap: wrap;
  margin-top: 12px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.missing {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.card-actions {
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 16px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.state-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

@media (max-width: 760px) {
  .page-hero,
  .evidence-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .evidence-toolbar .el-input,
  .evidence-toolbar .el-select {
    width: 100%;
    max-width: none;
  }
}
</style>
