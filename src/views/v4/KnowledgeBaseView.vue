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
        <el-upload
          class="knowledge-upload"
          accept=".txt,.md,.markdown,.pdf,.doc,.docx"
          :show-file-list="false"
          :auto-upload="false"
          :on-change="handleKnowledgeFileChange"
        >
          <el-button :icon="Files" :loading="uploading">上传资料</el-button>
        </el-upload>
        <el-button :icon="Refresh" :loading="rebuilding" @click="handleRebuildVectors">重建向量</el-button>
      </div>
    </section>

    <section class="summary-grid">
      <article class="summary-item">
        <span>文档</span>
        <strong>{{ documentTotal }}</strong>
      </article>
      <article class="summary-item">
        <span>片段</span>
        <strong>{{ chunkTotal }}</strong>
      </article>
      <article class="summary-item">
        <span>重复片段</span>
        <strong>{{ duplicateChunkTotal }}</strong>
      </article>
      <article class="summary-item">
        <span>{{ retrievalModeLabel }}</span>
        <strong>{{ chunkStrategyLabel }}</strong>
      </article>
    </section>

    <section class="config-strip">
      <article>
        <span>Vector DB</span>
        <strong>{{ knowledgeConfig?.vectorEnabled ? 'Qdrant' : 'Keyword' }}</strong>
        <small>{{ knowledgeConfig?.vectorCollection || '--' }}</small>
      </article>
      <article>
        <span>Chunk</span>
        <strong>{{ chunkConfigLabel }}</strong>
        <small>{{ knowledgeConfig?.chunkStrategy || '--' }}</small>
      </article>
      <article>
        <span>Near Duplicate</span>
        <strong>{{ nearDuplicateThresholdLabel }}</strong>
        <small>{{ nearDuplicateActionLabel }}</small>
      </article>
      <article>
        <span>Upload</span>
        <strong>{{ uploadLimitLabel }}</strong>
        <small>{{ uploadExtensionsLabel }}</small>
      </article>
    </section>

    <section class="duplicate-review-strip">
      <div>
        <p class="section-kicker">Dedup Review</p>
        <strong>{{ duplicateReviewSummary }}</strong>
        <small>threshold {{ nearDuplicateThresholdLabel }} · scanned {{ duplicateReview?.scannedChunkCount || 0 }}</small>
      </div>
      <el-button :icon="Search" :loading="duplicateReviewLoading" @click="loadDuplicateReview">扫描近重复</el-button>
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
                  <el-tag :type="statusType(row.status)" effect="light">{{ statusLabel(row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="更新时间" width="180">
                <template #default="{ row }">{{ row.updatedAt || '--' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button
                    link
                    type="primary"
                    :icon="Files"
                    :loading="chunksLoading && selectedDocument?.id === row.id"
                    @click="openChunksDrawer(row)"
                  >
                    片段
                  </el-button>
                  <el-button
                    link
                    type="primary"
                    :icon="Plus"
                    :loading="editingLoadingId === row.id"
                    @click="openEdit(row)"
                  >
                    编辑
                  </el-button>
                  <el-button
                    link
                    type="primary"
                    :icon="Files"
                    :loading="versionsLoadingId === row.id"
                    @click="openVersionsDrawer(row)"
                  >
                    历史
                  </el-button>
                  <el-button
                    link
                    type="primary"
                    :icon="Refresh"
                    :loading="rebuilding"
                    @click="handleRebuildVectors(row.id, row.title)"
                  >
                    重建
                  </el-button>
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
                  <p v-html="highlightSnippet(item)"></p>
                  <div v-if="item.matchedTerms?.length" class="matched-terms">
                    <el-tag v-for="term in item.matchedTerms" :key="term" size="small" effect="plain">{{ term }}</el-tag>
                  </div>
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

    <el-dialog v-model="dialogVisible" :title="editingDocumentId ? '编辑知识资料' : '新增知识资料'" width="640px">
      <el-form label-position="top">
        <el-form-item label="标题" required>
          <el-input v-model.trim="form.title" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="资料类型">
          <el-input v-model.trim="form.documentType" placeholder="NOTE" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="form.content" type="textarea" :rows="10" maxlength="10000" show-word-limit />
          <small class="form-help">保存后会优先按标题、段落和代码块切成语义片段，再写入个人向量索引。</small>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveDocument">保存并索引</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rebuildDialogVisible" title="知识库向量重建结果" width="640px">
      <div v-if="rebuildResult" class="rebuild-result">
        <p class="rebuild-tip">重建范围：{{ rebuildTargetLabel }}</p>
        <div class="rebuild-grid">
          <article class="rebuild-stat">
            <span>向量库</span>
            <strong>{{ rebuildResult.vectorEnabled ? '已启用' : '未启用' }}</strong>
          </article>
          <article class="rebuild-stat">
            <span>文档</span>
            <strong>{{ rebuildResult.documentCount || 0 }}</strong>
          </article>
          <article class="rebuild-stat">
            <span>片段</span>
            <strong>{{ rebuildResult.chunkCount || 0 }}</strong>
          </article>
          <article class="rebuild-stat">
            <span>向量</span>
            <strong>{{ rebuildResult.vectorUpdated || 0 }}</strong>
          </article>
          <article class="rebuild-stat">
            <span>重复片段</span>
            <strong>{{ rebuildResult.duplicateChunkCount || 0 }}</strong>
          </article>
        </div>
        <p class="rebuild-tip">失败文档：{{ rebuildResult.failedDocuments?.length || 0 }}</p>
        <p class="rebuild-tip" v-if="rebuildResult.failedDocuments?.length">
          文档 ID：{{ rebuildResult.failedDocuments.join(', ') }}
        </p>
        <div v-if="rebuildResult.errors?.length" class="rebuild-errors">
          <strong>错误详情</strong>
          <ul>
            <li v-for="(item, index) in rebuildResult.errors.slice(0, 8)" :key="index">{{ item }}</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button @click="rebuildDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="duplicateReviewVisible" size="760px" title="近重复片段审查">
      <div class="duplicate-review-drawer" v-loading="duplicateReviewLoading">
        <div class="chunk-summary">
          <article>
            <span>候选</span>
            <strong>{{ duplicateReview?.candidateCount || 0 }}</strong>
          </article>
          <article>
            <span>扫描</span>
            <strong>{{ duplicateReview?.scannedChunkCount || 0 }}</strong>
          </article>
          <article>
            <span>阈值</span>
            <strong>{{ duplicateReviewThresholdLabel }}</strong>
          </article>
        </div>
        <div class="duplicate-review-list">
          <article v-for="item in duplicateReviewItems" :key="`dup-${item.chunkId}`" class="duplicate-review-row">
            <div class="duplicate-review-row__head">
              <strong>{{ item.title || `资料 #${item.documentId || '--'}` }}</strong>
              <el-tag size="small" type="warning" effect="light">{{ scoreLabel(item.topScore) }}</el-tag>
              <small>#{{ (item.chunkIndex ?? 0) + 1 }} · {{ item.sourceRef || item.documentType || '--' }}</small>
            </div>
            <p>{{ item.snippet || '--' }}</p>
            <div class="similar-list">
              <article v-for="match in item.matches || []" :key="`dup-${item.chunkId}-${resultKey(match)}`">
                <strong>{{ match.title || `资料 #${match.documentId || '--'}` }}</strong>
                <span>{{ scoreLabel(match.score) }} · {{ match.sourceRef || match.documentType || '--' }}</span>
                <p>{{ match.snippet || '--' }}</p>
              </article>
            </div>
          </article>
          <el-empty v-if="!duplicateReviewItems.length && !duplicateReviewLoading" description="暂无近重复候选" />
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="chunksDrawerVisible" size="720px" :title="selectedDocument?.title || '资料片段'">
      <div class="chunk-drawer" v-loading="chunksLoading">
        <div class="chunk-summary">
          <article>
            <span>片段</span>
            <strong>{{ documentChunks.length }}</strong>
          </article>
          <article>
            <span>重复</span>
            <strong>{{ selectedDuplicateChunkCount }}</strong>
          </article>
          <article>
            <span>类型</span>
            <strong>{{ selectedDocument?.documentType || 'NOTE' }}</strong>
          </article>
        </div>
        <div class="chunk-list">
          <article v-for="chunk in documentChunks" :key="chunk.id" class="chunk-row">
            <div class="chunk-row__head">
              <strong>#{{ (chunk.chunkIndex ?? 0) + 1 }}</strong>
              <el-tag v-if="chunk.duplicateInDocument" size="small" type="warning" effect="light">重复</el-tag>
              <span>{{ chunk.sourceRef || '--' }}</span>
              <el-button
                link
                size="small"
                type="primary"
                :loading="similarLoadingId === chunk.id"
                @click="loadSimilarChunks(chunk)"
              >
                相似
              </el-button>
              <el-button
                link
                size="small"
                type="danger"
                :loading="deletingChunkId === chunk.id"
                @click="handleDeleteChunk(chunk)"
              >
                删除
              </el-button>
            </div>
            <p>{{ chunk.content || '--' }}</p>
            <small>{{ shortHash(chunk.chunkHash) }}</small>
            <div v-if="similarChunkMap[chunk.id]?.length" class="similar-list">
              <article v-for="item in similarChunkMap[chunk.id]" :key="`${chunk.id}-${resultKey(item)}`">
                <strong>{{ item.title || `资料 #${item.documentId || '--'}` }}</strong>
                <span>{{ scoreLabel(item.score) }} · {{ item.sourceRef || item.documentType || '--' }}</span>
                <p>{{ item.snippet || '--' }}</p>
              </article>
            </div>
          </article>
          <el-empty v-if="!documentChunks.length && !chunksLoading" description="暂无片段" />
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="versionsDrawerVisible" size="760px" :title="versionDocument?.title || '版本历史'">
      <div class="version-drawer" v-loading="versionsLoadingId === versionDocument?.id">
        <div class="version-list">
          <article v-for="item in documentVersions" :key="item.id" class="version-row">
            <div class="version-row__head">
              <strong>v{{ item.versionNo || 0 }}</strong>
              <el-tag size="small" effect="plain">{{ item.documentType || 'NOTE' }}</el-tag>
              <small>{{ item.createdAt || '--' }} · {{ item.chunkCount || 0 }} chunks</small>
              <el-button
                link
                size="small"
                type="primary"
                :loading="restoringVersionId === item.id"
                @click="handleRestoreVersion(item)"
              >
                恢复
              </el-button>
            </div>
            <div class="version-row__title">{{ item.title || '--' }}</div>
            <p>{{ item.content || '--' }}</p>
            <small>{{ shortHash(item.contentHash) }}</small>
          </article>
          <el-empty v-if="!documentVersions.length && versionsLoadingId !== versionDocument?.id" description="暂无历史版本" />
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ChatDotRound, Delete, Files, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type UploadFile } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  askKnowledgeApi,
  createKnowledgeDocumentApi,
  deleteKnowledgeChunkApi,
  deleteKnowledgeDocumentApi,
  getKnowledgeConfigApi,
  getKnowledgeDuplicateReviewApi,
  getKnowledgeDocumentChunksApi,
  getKnowledgeDocumentDetailApi,
  getKnowledgeDocumentVersionsApi,
  getKnowledgeDocumentsApi,
  getKnowledgeSimilarChunksApi,
  getKnowledgeStatsApi,
  rebuildKnowledgeVectorsApi,
  restoreKnowledgeDocumentVersionApi,
  searchKnowledgeApi,
  updateKnowledgeDocumentApi,
  uploadKnowledgeDocumentApi,
  type KnowledgeChunkVO,
  type KnowledgeConfigVO,
  type KnowledgeDocumentVO,
  type KnowledgeDocumentVersionVO,
  type KnowledgeDuplicateReviewItemVO,
  type KnowledgeDuplicateReviewVO,
  type KnowledgeStatsVO,
  type KnowledgeVectorRebuildVO,
  type KnowledgeSearchResultVO
} from '@/api/v4'
import AppState from '@/components/common/AppState.vue'

const loading = ref(false)
const searching = ref(false)
const asking = ref(false)
const saving = ref(false)
const uploading = ref(false)
const rebuilding = ref(false)
const chunksLoading = ref(false)
const duplicateReviewLoading = ref(false)
const editingLoadingId = ref<number | null>(null)
const versionsLoadingId = ref<number | null>(null)
const restoringVersionId = ref<number | null>(null)
const similarLoadingId = ref<number | null>(null)
const deletingChunkId = ref<number | null>(null)
const deletingId = ref<number | null>(null)
const errorMessage = ref('')
const allDocuments = ref<KnowledgeDocumentVO[]>([])
const documents = ref<KnowledgeDocumentVO[]>([])
const searchResults = ref<KnowledgeSearchResultVO[]>([])
const askReferences = ref<KnowledgeSearchResultVO[]>([])
const selectedDocument = ref<KnowledgeDocumentVO | null>(null)
const versionDocument = ref<KnowledgeDocumentVO | null>(null)
const documentChunks = ref<KnowledgeChunkVO[]>([])
const documentVersions = ref<KnowledgeDocumentVersionVO[]>([])
const similarChunkMap = ref<Record<number, KnowledgeSearchResultVO[]>>({})
const knowledgeStats = ref<KnowledgeStatsVO | null>(null)
const knowledgeConfig = ref<KnowledgeConfigVO | null>(null)
const duplicateReview = ref<KnowledgeDuplicateReviewVO | null>(null)
const answer = ref('')
const total = ref(0)
const keyword = ref('')
const question = ref('')
const limit = ref(10)
const dialogVisible = ref(false)
const rebuildDialogVisible = ref(false)
const chunksDrawerVisible = ref(false)
const duplicateReviewVisible = ref(false)
const versionsDrawerVisible = ref(false)
const editingDocumentId = ref<number | null>(null)
const rebuildResult = ref<KnowledgeVectorRebuildVO | null>(null)
const rebuildTargetLabel = ref('全部资料')

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
  knowledgeStats.value?.chunkCount ?? allDocuments.value.reduce((sum, item) => sum + (Number(item.chunkCount) || 0), 0)
)

const documentTotal = computed(() => knowledgeStats.value?.documentCount ?? total.value)

const duplicateChunkTotal = computed(() => knowledgeStats.value?.duplicateChunkCount ?? 0)

const retrievalModeLabel = computed(() => {
  const mode = knowledgeStats.value?.retrievalMode
  if (mode === 'VECTOR_FIRST') return '向量优先'
  if (mode === 'KEYWORD_FALLBACK') return '关键词兜底'
  return knowledgeStats.value?.vectorEnabled ? '向量优先' : '关键词兜底'
})

const chunkStrategyLabel = computed(() => {
  const strategy = knowledgeStats.value?.chunkStrategy
  if (strategy === 'SEMANTIC_BLOCK_800_OVERLAP_80') return '语义分块 800/80'
  return strategy || '语义分块'
})

const chunkConfigLabel = computed(() => {
  const size = knowledgeConfig.value?.chunkSize
  const overlap = knowledgeConfig.value?.chunkOverlap
  const min = knowledgeConfig.value?.minChunkSize
  return size ? `${size}/${overlap || 0}/${min || 0}` : '--'
})

const nearDuplicateThresholdLabel = computed(() => {
  const threshold = knowledgeConfig.value?.nearDuplicateThreshold
  return typeof threshold === 'number' ? `${Math.round(threshold * 100)}%` : '--'
})

const nearDuplicateActionLabel = computed(() => {
  const action = knowledgeConfig.value?.nearDuplicateAction
  if (action === 'WARN_ONLY') return 'warn only'
  return action || '--'
})

const uploadLimitLabel = computed(() => {
  const bytes = knowledgeConfig.value?.uploadMaxBytes
  return bytes ? `${Math.round(bytes / 1024 / 1024)} MB` : '--'
})

const uploadExtensionsLabel = computed(() => knowledgeConfig.value?.uploadExtensions?.join(', ') || '--')

const duplicateReviewItems = computed<KnowledgeDuplicateReviewItemVO[]>(() => duplicateReview.value?.items || [])

const duplicateReviewSummary = computed(() => {
  if (!duplicateReview.value) return 'not scanned'
  if (!duplicateReview.value.vectorEnabled) return 'vector disabled'
  return `${duplicateReview.value.candidateCount || 0} candidates`
})

const duplicateReviewThresholdLabel = computed(() => {
  const threshold = duplicateReview.value?.threshold ?? knowledgeConfig.value?.nearDuplicateThreshold
  return typeof threshold === 'number' ? `${Math.round(threshold * 100)}%` : '--'
})

const selectedDuplicateChunkCount = computed(() =>
  documentChunks.value.filter((item) => item.duplicateInDocument).length
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
    const [page, stats, config] = await Promise.all([
      getKnowledgeDocumentsApi(query),
      getKnowledgeStatsApi(),
      getKnowledgeConfigApi()
    ])
    allDocuments.value = page.records || []
    knowledgeStats.value = stats || null
    knowledgeConfig.value = config || null
    applyDocumentPage()
  } catch (error) {
    allDocuments.value = []
    documents.value = []
    knowledgeStats.value = null
    knowledgeConfig.value = null
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

const openChunksDrawer = async (row: KnowledgeDocumentVO) => {
  selectedDocument.value = row
  chunksDrawerVisible.value = true
  chunksLoading.value = true
  similarChunkMap.value = {}
  try {
    documentChunks.value = await getKnowledgeDocumentChunksApi(row.id)
  } finally {
    chunksLoading.value = false
  }
}

const loadSimilarChunks = async (chunk: KnowledgeChunkVO) => {
  if (!chunk.id) return
  if (similarChunkMap.value[chunk.id]?.length) {
    similarChunkMap.value = { ...similarChunkMap.value, [chunk.id]: [] }
    return
  }
  similarLoadingId.value = chunk.id
  try {
    const result = await getKnowledgeSimilarChunksApi(chunk.id, 5)
    similarChunkMap.value = { ...similarChunkMap.value, [chunk.id]: result }
    if (!result.length) {
      ElMessage.info('暂未找到相似片段')
    }
  } finally {
    similarLoadingId.value = null
  }
}

const loadDuplicateReview = async () => {
  duplicateReviewVisible.value = true
  duplicateReviewLoading.value = true
  try {
    duplicateReview.value = await getKnowledgeDuplicateReviewApi(20)
    if (!duplicateReview.value?.vectorEnabled) {
      ElMessage.warning('向量库未启用，无法扫描近重复片段')
    } else if (!duplicateReview.value?.candidateCount) {
      ElMessage.success('暂未发现近重复候选')
    }
  } finally {
    duplicateReviewLoading.value = false
  }
}

const handleDeleteChunk = async (chunk: KnowledgeChunkVO) => {
  if (!chunk.id) return
  await ElMessageBox.confirm(
    `确认删除片段 #${(chunk.chunkIndex ?? 0) + 1}？删除后会同步清理对应向量索引。`,
    '删除知识片段',
    { type: 'warning' }
  )
  deletingChunkId.value = chunk.id
  try {
    await deleteKnowledgeChunkApi(chunk.id)
    ElMessage.success('片段已删除')
    similarChunkMap.value = {}
    if (selectedDocument.value?.id) {
      documentChunks.value = await getKnowledgeDocumentChunksApi(selectedDocument.value.id)
    }
    await loadDocuments()
  } finally {
    deletingChunkId.value = null
  }
}

const openCreate = () => {
  editingDocumentId.value = null
  Object.assign(form, {
    title: '',
    documentType: 'NOTE',
    content: ''
  })
  dialogVisible.value = true
}

const openEdit = async (row: KnowledgeDocumentVO) => {
  editingLoadingId.value = row.id
  try {
    const detail = await getKnowledgeDocumentDetailApi(row.id)
    editingDocumentId.value = row.id
    Object.assign(form, {
      title: detail.title || '',
      documentType: detail.documentType || 'NOTE',
      content: detail.content || ''
    })
    dialogVisible.value = true
  } finally {
    editingLoadingId.value = null
  }
}

const openVersionsDrawer = async (row: KnowledgeDocumentVO) => {
  versionDocument.value = row
  versionsDrawerVisible.value = true
  versionsLoadingId.value = row.id
  try {
    documentVersions.value = await getKnowledgeDocumentVersionsApi(row.id)
  } finally {
    versionsLoadingId.value = null
  }
}

const handleRestoreVersion = async (version: KnowledgeDocumentVersionVO) => {
  if (!versionDocument.value?.id || !version.id) return
  await ElMessageBox.confirm(
    `确认恢复到 v${version.versionNo || 0}？当前内容会先保存为新的历史版本，然后重建片段和向量索引。`,
    '恢复历史版本',
    { type: 'warning' }
  )
  restoringVersionId.value = version.id
  try {
    const result = await restoreKnowledgeDocumentVersionApi(versionDocument.value.id, version.id)
    ElMessage.success(`已恢复到 v${version.versionNo || 0}`)
    versionDocument.value = result
    documentVersions.value = await getKnowledgeDocumentVersionsApi(result.id)
    await loadDocuments()
  } finally {
    restoringVersionId.value = null
  }
}

const saveDocument = async () => {
  if (!form.title || !form.content) {
    ElMessage.warning('请填写标题和内容')
    return
  }
  saving.value = true
  try {
    const payload = {
      title: form.title,
      documentType: form.documentType || 'NOTE',
      content: form.content
    }
    const result = editingDocumentId.value
      ? await updateKnowledgeDocumentApi(editingDocumentId.value, payload)
      : await createKnowledgeDocumentApi(payload)
    dialogVisible.value = false
    showKnowledgeIndexResult(result, editingDocumentId.value ? '资料已更新' : '资料已索引')
    editingDocumentId.value = null
    await loadDocuments()
  } finally {
    saving.value = false
  }
}

const handleKnowledgeFileChange = async (uploadFile: UploadFile) => {
  const file = uploadFile.raw
  if (!file) return
  const lowerName = file.name.toLowerCase()
  const supported = ['.txt', '.md', '.markdown', '.pdf', '.doc', '.docx'].some((suffix) => lowerName.endsWith(suffix))
  if (!supported) {
    ElMessage.warning('仅支持 .txt / .md / .markdown / .pdf / .doc / .docx 文件')
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    ElMessage.warning('文件大小不能超过 8MB')
    return
  }
  uploading.value = true
  try {
    const result = await uploadKnowledgeDocumentApi(file, documentTypeFromFileName(lowerName))
    showKnowledgeIndexResult(result, '上传完成')
    await loadDocuments()
  } finally {
    uploading.value = false
  }
}

const documentTypeFromFileName = (lowerName: string) => {
  if (lowerName.endsWith('.pdf')) return 'PDF'
  if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) return 'WORD'
  if (lowerName.endsWith('.txt')) return 'TEXT'
  return 'MARKDOWN'
}

const showKnowledgeIndexResult = (result: KnowledgeDocumentVO, actionLabel: string) => {
  if (result.duplicateDocument) {
    ElMessage.warning(`资料已存在：复用资料 #${result.duplicateDocumentId || result.id}`)
    return
  }
  const parts = [`${actionLabel}：生成 ${result.chunkCount || 0} 个片段`]
  if (result.duplicateChunkCount) {
    parts.push(`跳过 ${result.duplicateChunkCount} 个完全重复片段`)
  }
  if (result.nearDuplicateChunkCount) {
    parts.push(`${result.nearDuplicateChunkCount} 个片段疑似语义重复`)
  }
  const message = parts.join('，')
  if (result.nearDuplicateChunkCount) {
    ElMessage.warning(message)
    return
  }
  ElMessage.success(message)
}

const handleRebuildVectors = async (documentId?: number, documentTitle?: string) => {
  rebuilding.value = true
  rebuildTargetLabel.value = documentTitle ? `资料「${documentTitle}」` : '全部资料'
  try {
    const result = await rebuildKnowledgeVectorsApi(documentId)
    rebuildResult.value = result
    const duplicateSummary = result.duplicateChunkCount ? `，重复片段 ${result.duplicateChunkCount || 0} 个` : ''
    const summary = `重建完成：文档 ${result.documentCount || 0} 篇，片段 ${result.chunkCount || 0} 个，向量 ${result.vectorUpdated || 0} 条${duplicateSummary}`
    rebuildDialogVisible.value = true
    if ((result.errors || []).length || (result.failedDocuments || []).length) {
      ElMessage.warning(summary)
      return
    }
    ElMessage.success(summary)
  } finally {
    rebuilding.value = false
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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const highlightSnippet = (item: KnowledgeSearchResultVO) => {
  const value = item.highlightedSnippet || item.snippet || '--'
  return escapeHtml(value)
    .replace(/\[\[H\]\]/g, '<mark>')
    .replace(/\[\[\/H\]\]/g, '</mark>')
}

const shortHash = (hash?: string) => {
  if (!hash) return '--'
  return hash.length > 16 ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash
}

const statusType = (status?: string) => {
  if (status === 'INDEXED') return 'success'
  if (status?.includes('FAIL')) return 'danger'
  return 'info'
}

const statusLabel = (status?: string) => {
  const value = status || 'INDEXED'
  const map: Record<string, string> = {
    INDEXED: '已索引'
  }
  return map[value] || value
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

.knowledge-upload {
  display: inline-flex;
}

.rebuild-result {
  display: grid;
  gap: 14px;
}

.rebuild-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.rebuild-stat {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.rebuild-stat span,
.rebuild-tip,
.rebuild-errors li {
  color: var(--app-text-muted);
}

.rebuild-stat strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 20px;
}

.rebuild-errors {
  padding: 14px;
  border: 1px solid rgba(248, 113, 113, 0.28);
  border-radius: 8px;
  background: rgba(127, 29, 29, 0.16);
}

.rebuild-errors strong {
  color: var(--app-text);
}

.rebuild-errors ul {
  margin: 10px 0 0;
  padding-left: 18px;
}

.chunk-drawer,
.chunk-list,
.duplicate-review-drawer,
.duplicate-review-list,
.version-drawer,
.version-list {
  display: grid;
  gap: 14px;
}

.chunk-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.chunk-summary article,
.chunk-row,
.duplicate-review-row,
.version-row {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.chunk-summary article {
  padding: 14px;
}

.chunk-summary span,
.chunk-row small,
.duplicate-review-row small,
.version-row small,
.chunk-row__head span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.chunk-summary strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 18px;
}

.chunk-row,
.duplicate-review-row,
.version-row {
  padding: 14px;
}

.chunk-row__head,
.duplicate-review-row__head,
.version-row__head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.chunk-row__head strong,
.duplicate-review-row__head strong,
.version-row__head strong,
.version-row__title {
  color: var(--app-text);
}

.chunk-row p,
.duplicate-review-row p,
.version-row p {
  margin: 10px 0 8px;
  color: var(--app-text-muted);
  line-height: 1.7;
  white-space: pre-wrap;
}

.version-row__title {
  margin-top: 10px;
  font-weight: 700;
}

.version-row p {
  max-height: 180px;
  overflow: auto;
}

.similar-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.similar-list article {
  padding: 10px;
  border: 1px solid rgba(34, 197, 94, 0.22);
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.08);
}

.similar-list strong,
.similar-list span {
  display: block;
}

.similar-list strong {
  color: var(--app-text);
}

.similar-list span {
  margin-top: 4px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.similar-list p {
  margin-bottom: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.config-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.32);
}

.config-strip article {
  min-width: 0;
}

.config-strip span,
.config-strip small {
  display: block;
  color: var(--app-text-muted);
  font-size: 12px;
}

.config-strip strong {
  display: block;
  margin: 5px 0;
  color: var(--app-text);
  font-size: 15px;
}

.config-strip small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.duplicate-review-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid rgba(245, 158, 11, 0.28);
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.08);
}

.duplicate-review-strip strong,
.duplicate-review-strip small {
  display: block;
}

.duplicate-review-strip strong {
  color: var(--app-text);
}

.duplicate-review-strip small {
  margin-top: 5px;
  color: var(--app-text-muted);
  font-size: 12px;
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
.answer-box span,
.form-help {
  color: var(--app-text-muted);
  font-size: 13px;
}

.form-help {
  display: block;
  margin-top: 8px;
  line-height: 1.6;
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

.result-row p :deep(mark) {
  padding: 0 3px;
  border-radius: 4px;
  color: #fef3c7;
  background: rgba(245, 158, 11, 0.28);
}

.matched-terms {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
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

  .summary-grid,
  .config-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rebuild-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .knowledge-hero,
  .duplicate-review-strip,
  .result-row {
    align-items: flex-start;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .summary-grid,
  .config-strip {
    grid-template-columns: 1fr;
  }

  .result-meta {
    align-items: flex-start;
  }
}
</style>
