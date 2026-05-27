<template>
  <div class="page-shell knowledge-page">
    <section class="knowledge-hero">
      <div>
        <p class="eyebrow">Personal RAG</p>
        <h1>个人知识库</h1>
        <p>维护你的学习资料、项目笔记和面试复盘，并用语义检索快速找到真正相关的片段。</p>
      </div>
      <div class="hero-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadDocuments">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增资料</el-button>
      </div>
    </section>

    <section class="summary-grid">
      <article class="summary-item">
        <span>文档</span>
        <strong>{{ total }}</strong>
      </article>
      <article class="summary-item">
        <span>片段</span>
        <strong>{{ chunkTotal }}</strong>
      </article>
      <article class="summary-item">
        <span>检索模式</span>
        <strong>向量优先</strong>
      </article>
    </section>

    <AppState v-if="errorMessage" type="error" title="知识库数据加载失败" :description="errorMessage">
      <el-button type="primary" @click="loadDocuments">重试</el-button>
    </AppState>

    <section v-else class="workspace-grid">
      <main class="main-stack">
        <section class="content-card">
          <div class="content-card__body">
            <div class="section-head">
              <div>
                <p class="section-kicker">Documents</p>
                <h2>已索引资料</h2>
              </div>
            </div>
            <el-table v-loading="loading" :data="documents" row-key="id">
              <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
              <el-table-column label="类型" width="130">
                <template #default="{ row }">
                  <el-tag effect="plain">{{ row.documentType || 'NOTE' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="chunkCount" label="片段" width="100" />
              <el-table-column label="状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="statusType(row.status)" effect="light">{{ row.status || 'INDEXED' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="更新时间" width="180">
                <template #default="{ row }">{{ row.updatedAt || '--' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button
                    link
                    type="danger"
                    :icon="Delete"
                    :loading="deletingId === row.id"
                    @click="handleDelete(row)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
              <template #empty>
                <el-empty description="暂无知识库资料" />
              </template>
            </el-table>
            <div class="pagination-wrap">
              <el-pagination
                v-model:current-page="query.pageNo"
                v-model:page-size="query.pageSize"
                background
                layout="total, sizes, prev, pager, next"
                :total="total"
                :page-sizes="[10, 20, 50]"
                @change="applyDocumentPage"
              />
            </div>
          </div>
        </section>

        <section class="content-card">
          <div class="content-card__body">
            <div class="section-head">
              <div>
                <p class="section-kicker">Search</p>
                <h2>语义搜索</h2>
              </div>
            </div>
            <el-form class="search-toolbar" inline @submit.prevent>
              <el-form-item label="关键词">
                <el-input
                  v-model.trim="keyword"
                  clearable
                  placeholder="例如：JVM 调优、项目亮点、线程池"
                  @keyup.enter="handleSearch"
                />
              </el-form-item>
              <el-form-item label="数量">
                <el-input-number v-model="limit" :min="1" :max="50" controls-position="right" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :icon="Search" :loading="searching" @click="handleSearch">搜索</el-button>
              </el-form-item>
            </el-form>
            <div class="result-list" v-loading="searching">
              <article v-for="item in searchResults" :key="resultKey(item)" class="result-row">
                <div>
                  <div class="result-title">
                    <strong>{{ item.title || `资料 #${item.documentId || '--'}` }}</strong>
                    <el-tag size="small" effect="plain">{{ matchLabel(item.matchType) }}</el-tag>
                  </div>
                  <p>{{ item.snippet || '--' }}</p>
                </div>
                <div class="result-meta">
                  <span>{{ scoreLabel(item.score) }}</span>
                  <small>{{ item.sourceRef || item.documentType || '--' }}</small>
                </div>
              </article>
              <el-empty v-if="!searchResults.length && !searching" description="输入关键词后检索知识片段" />
            </div>
          </div>
        </section>
      </main>

      <aside class="side-stack">
        <section class="content-card">
          <div class="content-card__body ask-panel">
            <div class="section-head compact">
              <div>
                <p class="section-kicker">Ask</p>
                <h2>知识库问答</h2>
              </div>
            </div>
            <el-input
              v-model="question"
              type="textarea"
              :rows="5"
              maxlength="1000"
              show-word-limit
              placeholder="问一个只依赖个人资料回答的问题"
            />
            <el-button class="ask-button" type="primary" :icon="ChatDotRound" :loading="asking" @click="handleAsk">
              生成回答
            </el-button>

            <div v-if="answer" class="answer-box">
              <span>回答</span>
              <p>{{ answer }}</p>
            </div>
          </div>
        </section>

        <section class="content-card">
          <div class="content-card__body">
            <div class="section-head compact">
              <div>
                <p class="section-kicker">References</p>
                <h2>回答引用</h2>
              </div>
            </div>
            <div class="reference-list">
              <article v-for="item in askReferences" :key="`ask-${resultKey(item)}`" class="reference-row">
                <strong>{{ item.title || `资料 #${item.documentId || '--'}` }}</strong>
                <p>{{ item.snippet || '--' }}</p>
                <small>{{ matchLabel(item.matchType) }} · {{ scoreLabel(item.score) }}</small>
              </article>
              <el-empty v-if="!askReferences.length" description="生成回答后显示引用片段" />
            </div>
          </div>
        </section>
      </aside>
    </section>

    <el-dialog v-model="dialogVisible" title="新增知识资料" width="640px">
      <el-form label-position="top">
        <el-form-item label="标题" required>
          <el-input v-model.trim="form.title" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="资料类型">
          <el-input v-model.trim="form.documentType" placeholder="NOTE" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="form.content" type="textarea" :rows="10" maxlength="10000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="createDocument">保存并索引</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ChatDotRound, Delete, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  askKnowledgeApi,
  createKnowledgeDocumentApi,
  deleteKnowledgeDocumentApi,
  getKnowledgeDocumentsApi,
  searchKnowledgeApi,
  type KnowledgeDocumentVO,
  type KnowledgeSearchResultVO
} from '@/api/v4'
import AppState from '@/components/common/AppState.vue'

const loading = ref(false)
const searching = ref(false)
const asking = ref(false)
const saving = ref(false)
const deletingId = ref<number | null>(null)
const errorMessage = ref('')
const allDocuments = ref<KnowledgeDocumentVO[]>([])
const documents = ref<KnowledgeDocumentVO[]>([])
const searchResults = ref<KnowledgeSearchResultVO[]>([])
const askReferences = ref<KnowledgeSearchResultVO[]>([])
const answer = ref('')
const total = ref(0)
const keyword = ref('')
const question = ref('')
const limit = ref(10)
const dialogVisible = ref(false)

const query = reactive({
  pageNo: 1,
  pageSize: 10
})

const form = reactive({
  title: '',
  documentType: 'NOTE',
  content: ''
})

const chunkTotal = computed(() =>
  allDocuments.value.reduce((sum, item) => sum + (Number(item.chunkCount) || 0), 0)
)

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '接口请求失败')
  }
  return '接口请求失败'
}

const applyDocumentPage = () => {
  const pageNo = query.pageNo || 1
  const pageSize = query.pageSize || 10
  const start = (pageNo - 1) * pageSize
  documents.value = allDocuments.value.slice(start, start + pageSize)
  total.value = allDocuments.value.length
}

const loadDocuments = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await getKnowledgeDocumentsApi(query)
    allDocuments.value = page.records || []
    applyDocumentPage()
  } catch (error) {
    allDocuments.value = []
    documents.value = []
    total.value = 0
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  if (!keyword.value) {
    searchResults.value = []
    return
  }
  searching.value = true
  try {
    searchResults.value = await searchKnowledgeApi({ keyword: keyword.value, limit: limit.value })
  } finally {
    searching.value = false
  }
}

const handleAsk = async () => {
  if (!question.value.trim()) {
    ElMessage.warning('请先输入问题')
    return
  }
  asking.value = true
  answer.value = ''
  askReferences.value = []
  try {
    const result = await askKnowledgeApi({ question: question.value.trim(), limit: Math.min(limit.value || 5, 10) })
    answer.value = result.answer || ''
    askReferences.value = result.references || []
  } finally {
    asking.value = false
  }
}

const openCreate = () => {
  Object.assign(form, {
    title: '',
    documentType: 'NOTE',
    content: ''
  })
  dialogVisible.value = true
}

const createDocument = async () => {
  if (!form.title || !form.content) {
    ElMessage.warning('请填写标题和内容')
    return
  }
  saving.value = true
  try {
    await createKnowledgeDocumentApi({
      title: form.title,
      documentType: form.documentType || 'NOTE',
      content: form.content
    })
    dialogVisible.value = false
    ElMessage.success('资料已索引')
    await loadDocuments()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: KnowledgeDocumentVO) => {
  await ElMessageBox.confirm(
    `确认删除资料「${row.title || `#${row.id}`}」？删除后会同步清理对应向量索引。`,
    '删除知识资料',
    { type: 'warning' }
  )
  deletingId.value = row.id
  try {
    await deleteKnowledgeDocumentApi(row.id)
    ElMessage.success('资料已删除')
    searchResults.value = []
    askReferences.value = []
    answer.value = ''
    await loadDocuments()
  } finally {
    deletingId.value = null
  }
}

const resultKey = (item: KnowledgeSearchResultVO) =>
  `${item.documentId || 'doc'}-${item.chunkId || 'whole'}-${item.matchType || 'match'}`

const matchLabel = (value?: string) => {
  if (value === 'VECTOR') return '语义匹配'
  if (value === 'KEYWORD_CHUNK') return '片段命中'
  if (value === 'KEYWORD_DOCUMENT') return '文档命中'
  return '匹配'
}

const scoreLabel = (score?: number) => {
  if (score === undefined || score === null) return '--'
  return `${Math.round(score * 100)}%`
}

const statusType = (status?: string) => {
  if (status === 'INDEXED') return 'success'
  if (status?.includes('FAIL')) return 'danger'
  return 'info'
}

onMounted(loadDocuments)
</script>

<style scoped lang="scss">
.knowledge-hero,
.summary-grid,
.workspace-grid,
.section-head,
.hero-actions,
.result-title,
.result-meta {
  display: flex;
  gap: 16px;
}

.knowledge-hero {
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(34, 197, 94, 0.08)), var(--app-surface);
  box-shadow: var(--app-shadow);
}

.knowledge-hero h1,
.section-head h2 {
  margin: 0;
}

.knowledge-hero h1 {
  margin-top: 8px;
  font-size: 28px;
}

.knowledge-hero p,
.result-row p,
.reference-row p,
.answer-box p {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.eyebrow,
.section-kicker {
  margin: 0;
  color: #67e8f9;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.hero-actions {
  flex-wrap: wrap;
  align-items: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.summary-item {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.summary-item span,
.reference-row small,
.result-meta small,
.answer-box span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.summary-item strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 22px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.75fr);
  align-items: flex-start;
}

.main-stack,
.side-stack {
  display: grid;
  gap: 16px;
}

.section-head {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-head.compact {
  margin-bottom: 12px;
}

.section-kicker {
  margin-bottom: 6px;
}

.search-toolbar {
  row-gap: 8px;
}

.search-toolbar :deep(.el-input) {
  width: 320px;
  max-width: 100%;
}

.result-list,
.reference-list {
  display: grid;
  gap: 12px;
}

.result-row,
.reference-row,
.answer-box {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
}

.result-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: flex-start;
  padding: 14px;
}

.result-title {
  align-items: center;
  flex-wrap: wrap;
}

.result-title strong,
.reference-row strong {
  color: var(--app-text);
}

.result-row p,
.reference-row p {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.result-meta {
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 86px;
}

.result-meta span {
  color: var(--app-text);
  font-weight: 700;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.ask-panel {
  display: grid;
  gap: 12px;
}

.ask-button {
  width: 100%;
}

.answer-box,
.reference-row {
  padding: 14px;
}

.answer-box p {
  margin: 8px 0 0;
  white-space: pre-wrap;
}

.reference-row small {
  display: block;
  margin-top: 8px;
}

@media (max-width: 1120px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .knowledge-hero,
  .result-row {
    align-items: flex-start;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .result-meta {
    align-items: flex-start;
  }
}
</style>
