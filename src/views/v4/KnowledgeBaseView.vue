<template>
  <div class="page-shell v4-knowledge-page">
    <section class="v4-page-header">
      <div>
        <div class="v4-eyebrow">V4 Knowledge</div>
        <h1>Personal knowledge base</h1>
        <p>Manage indexed personal documents and search real knowledge chunks from the V4 knowledge APIs.</p>
      </div>
      <div class="v4-actions">
        <el-button :loading="loading" @click="loadDocuments">Refresh</el-button>
        <el-button type="primary" @click="openCreate">New document</el-button>
      </div>
    </section>

    <section class="content-card">
      <div class="content-card__body">
        <el-form class="knowledge-search" inline @submit.prevent>
          <el-form-item label="Keyword">
            <el-input v-model.trim="keyword" clearable placeholder="Search indexed chunks" style="width: 260px" />
          </el-form-item>
          <el-form-item label="Limit">
            <el-input-number v-model="limit" :min="1" :max="50" controls-position="right" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="searching" @click="handleSearch">Search</el-button>
          </el-form-item>
        </el-form>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="Knowledge data failed to load" :description="errorMessage">
      <el-button type="primary" @click="loadDocuments">Retry</el-button>
    </AppState>

    <template v-else>
      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">Documents</p>
              <h2>Indexed documents</h2>
            </div>
          </div>
            <el-table v-loading="loading" :data="documents" row-key="id">
            <el-table-column prop="title" label="Title" min-width="220" show-overflow-tooltip />
            <el-table-column label="Source" width="140">
              <template #default="{ row }">{{ row.documentType || '--' }}</template>
            </el-table-column>
            <el-table-column prop="chunkCount" label="Chunks" width="110" />
            <el-table-column prop="status" label="Status" width="120" />
            <el-table-column label="Updated" width="180">
              <template #default="{ row }">{{ row.updatedAt || '--' }}</template>
            </el-table-column>
            <template #empty>
              <el-empty description="No knowledge documents" />
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
              <h2>Search results</h2>
            </div>
          </div>
          <div class="result-list" v-loading="searching">
            <article v-for="item in searchResults" :key="`${item.documentId}-${item.chunkId || 'doc'}`" class="result-row">
              <div>
                <strong>{{ item.title || `Document #${item.documentId || '--'}` }}</strong>
                <p>{{ item.snippet || '--' }}</p>
              </div>
              <el-tag effect="plain">{{ item.sourceRef || item.documentType || '--' }}</el-tag>
            </article>
            <el-empty v-if="!searchResults.length && !searching" description="No search results" />
          </div>
        </div>
      </section>
    </template>

    <el-dialog v-model="dialogVisible" title="New knowledge document" width="620px">
      <el-form label-position="top">
        <el-form-item label="Title" required>
          <el-input v-model.trim="form.title" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="Source type">
          <el-input v-model.trim="form.documentType" placeholder="NOTE" />
        </el-form-item>
        <el-form-item label="Content" required>
          <el-input v-model="form.content" type="textarea" :rows="8" maxlength="10000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="createDocument">Save</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import {
  createKnowledgeDocumentApi,
  getKnowledgeDocumentsApi,
  searchKnowledgeApi,
  type KnowledgeDocumentVO,
  type KnowledgeSearchResultVO
} from '@/api/v4'
import AppState from '@/components/common/AppState.vue'

const loading = ref(false)
const searching = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const allDocuments = ref<KnowledgeDocumentVO[]>([])
const documents = ref<KnowledgeDocumentVO[]>([])
const searchResults = ref<KnowledgeSearchResultVO[]>([])
const total = ref(0)
const keyword = ref('')
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

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'API request failed')
  }
  return 'API request failed'
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
    ElMessage.warning('Title and content are required')
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
    ElMessage.success('Document indexed')
    await loadDocuments()
  } finally {
    saving.value = false
  }
}

onMounted(loadDocuments)
</script>

<style scoped lang="scss">
.v4-page-header,
.section-head,
.v4-actions {
  display: flex;
  gap: 16px;
}

.v4-page-header {
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(34, 197, 94, 0.08)), var(--app-surface);
  box-shadow: var(--app-shadow);
}

.v4-eyebrow,
.section-kicker {
  color: #67e8f9;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.v4-page-header h1,
.section-head h2 {
  margin: 0;
}

.v4-page-header h1 {
  margin-top: 8px;
  font-size: 28px;
}

.v4-page-header p,
.result-row p {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.v4-actions {
  flex-wrap: wrap;
  align-items: center;
}

.knowledge-search {
  row-gap: 8px;
}

.section-head {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-kicker {
  margin: 0 0 6px;
}

.result-list {
  display: grid;
  gap: 12px;
}

.result-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: flex-start;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.58);
}

.result-row strong,
.result-row p {
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-row p {
  display: -webkit-box;
  margin: 6px 0 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

@media (max-width: 900px) {
  .v4-page-header,
  .section-head,
  .result-row {
    align-items: flex-start;
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>
