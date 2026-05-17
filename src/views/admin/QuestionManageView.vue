<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <BookOpenCheck :size="16" />
          <span>Java Question Governance</span>
        </div>
        <h1 class="admin-hero__title">题库治理</h1>
        <p class="admin-hero__desc">
          维护 Java 面试题库的分类、标签、题组、难度和上下架状态。AI 生成题目审核属于后续能力，
          当前不伪造审核结果或生成数据。
        </p>
      </div>
      <el-button type="primary" @click="openDialog()">
        <Plus :size="16" />
        新增题目
      </el-button>
    </section>

    <div class="admin-insight-grid">
      <article class="admin-insight-card">
        <span>题目总数</span>
        <strong>{{ total }}</strong>
        <small>来自题目列表接口 total</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页分类</span>
        <strong>{{ categoryCount }}</strong>
        <small>仅统计当前页记录</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页高频题</span>
        <strong>{{ highFrequencyCount }}</strong>
        <small>仅统计当前页记录</small>
      </article>
      <article class="admin-insight-card">
        <span>AI 生成审核</span>
        <strong>{{ reviewTotal }}</strong>
        <small>来自审核池真实接口</small>
      </article>
    </div>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>题目列表</h2>
          <p>搜索、分页、新增、编辑、删除、启禁用保留现有后台 CRUD 链路。</p>
        </div>
      </div>

      <div class="admin-filter-bar">
        <el-form class="filter-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="题目标题" />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="query.categoryId" clearable placeholder="全部分类" style="width: 150px">
              <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="标签">
            <el-select v-model="query.tagId" clearable placeholder="全部标签" style="width: 150px">
              <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="难度">
            <el-select v-model="query.difficulty" clearable placeholder="全部" style="width: 120px">
              <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
              <el-option label="启用" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="question-distribution">
        <span>当前页难度分布</span>
        <el-tag type="success" effect="plain">简单 {{ difficultyStats.EASY }}</el-tag>
        <el-tag type="warning" effect="plain">中等 {{ difficultyStats.MEDIUM }}</el-tag>
        <el-tag type="danger" effect="plain">困难 {{ difficultyStats.HARD }}</el-tag>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="questions" row-key="id">
          <el-table-column prop="title" label="题目标题" min-width="220" show-overflow-tooltip />
          <el-table-column label="分类" min-width="130">
            <template #default="{ row }">
              <el-tag v-if="row.categoryName" type="info" effect="plain">{{ row.categoryName }}</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="题组" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ row.groupTitle || getGroupNameById(row.groupId) }}</template>
          </el-table-column>
          <el-table-column label="难度" width="110">
            <template #default="{ row }">
              <el-tag :type="getDifficultyTagType(row.difficulty)" effect="plain">
                {{ getDifficultyLabel(row.difficulty) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="标签" min-width="220">
            <template #default="{ row }">
              <el-space wrap>
                <el-tag v-for="(tag, index) in getDisplayTags(row)" :key="`${row.id}-${index}`" class="tag-item" size="small" effect="plain">
                  {{ tag }}
                </el-tag>
                <span v-if="getDisplayTags(row).length === 0">-</span>
              </el-space>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
              <el-button link type="warning" @click="handleStatus(row)">
                {{ row.status === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @change="fetchQuestions"
        />
      </div>
    </section>

    <section class="admin-panel governance-panel">
      <div class="admin-panel__header">
        <div>
          <h2>AI 题目审核 / 去重</h2>
          <p>接入后端真实审核池与重复题审核接口，不展示 Mock 结果。</p>
        </div>
        <el-button :loading="generating" @click="handleGenerateReviews">触发 AI 生成</el-button>
      </div>

      <el-tabs v-model="governanceTab" class="governance-tabs">
        <el-tab-pane label="审核池" name="reviews">
          <div class="admin-filter-bar governance-filter">
            <el-form :model="reviewQuery" inline>
              <el-form-item label="关键词">
                <el-input v-model.trim="reviewQuery.keyword" clearable placeholder="标题 / 题干 / 知识点" />
              </el-form-item>
              <el-form-item label="状态">
                <el-select v-model="reviewQuery.reviewStatus" clearable placeholder="全部" style="width: 130px">
                  <el-option label="待审核" value="PENDING" />
                  <el-option label="已通过" value="APPROVED" />
                  <el-option label="已驳回" value="REJECTED" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="fetchReviews">查询</el-button>
                <el-button @click="resetReviewQuery">重置</el-button>
              </el-form-item>
            </el-form>
          </div>
          <div class="table-card admin-table-card">
            <el-table v-loading="reviewLoading" :data="reviews" row-key="id">
              <el-table-column prop="questionTitle" label="题目" min-width="240" show-overflow-tooltip />
              <el-table-column prop="knowledgePoint" label="知识点" min-width="140" show-overflow-tooltip />
              <el-table-column prop="difficulty" label="难度" width="110" />
              <el-table-column label="状态" width="110">
                <template #default="{ row }">
                  <el-tag :type="getReviewStatusType(row.reviewStatus)" effect="plain">
                    {{ getReviewStatusLabel(row.reviewStatus) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createdAt" label="生成时间" min-width="170" />
              <el-table-column label="操作" width="190" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" :disabled="row.reviewStatus !== 'PENDING'" @click="handleApproveReview(row.id)">
                    通过
                  </el-button>
                  <el-button link type="danger" :disabled="row.reviewStatus !== 'PENDING'" @click="handleRejectReview(row.id)">
                    驳回
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="reviewQuery.pageNo"
              v-model:page-size="reviewQuery.pageSize"
              background
              layout="total, sizes, prev, pager, next"
              :total="reviewTotal"
              :page-sizes="[10, 20, 50]"
              @change="fetchReviews"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="重复题审核" name="duplicates">
          <div class="admin-filter-bar governance-filter">
            <el-form :model="duplicateQuery" inline>
              <el-form-item label="关键词">
                <el-input v-model.trim="duplicateQuery.keyword" clearable placeholder="源题 / 目标题" />
              </el-form-item>
              <el-form-item label="状态">
                <el-select v-model="duplicateQuery.reviewStatus" clearable placeholder="全部" style="width: 130px">
                  <el-option label="待处理" value="PENDING" />
                  <el-option label="已合并" value="CONFIRMED" />
                  <el-option label="已忽略" value="IGNORED" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="fetchDuplicates">查询</el-button>
                <el-button @click="resetDuplicateQuery">重置</el-button>
                <el-button :loading="duplicateChecking" @click="handleCheckDuplicates">检测当前页</el-button>
              </el-form-item>
            </el-form>
          </div>
          <div class="table-card admin-table-card">
            <el-table v-loading="duplicateLoading" :data="duplicates" row-key="id">
              <el-table-column prop="sourceTitle" label="源题" min-width="220" show-overflow-tooltip />
              <el-table-column prop="targetTitle" label="疑似重复题" min-width="220" show-overflow-tooltip />
              <el-table-column prop="matchType" label="匹配类型" min-width="150" />
              <el-table-column label="相似度" width="100">
                <template #default="{ row }">{{ formatSimilarity(row.similarityScore) }}</template>
              </el-table-column>
              <el-table-column label="状态" width="110">
                <template #default="{ row }">
                  <el-tag :type="getDuplicateStatusType(row.reviewStatus)" effect="plain">
                    {{ getDuplicateStatusLabel(row.reviewStatus) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="190" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" :disabled="row.reviewStatus !== 'PENDING'" @click="handleMergeDuplicate(row.id)">
                    合并
                  </el-button>
                  <el-button link type="warning" :disabled="row.reviewStatus !== 'PENDING'" @click="handleIgnoreDuplicate(row.id)">
                    忽略
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="duplicateQuery.pageNo"
              v-model:page-size="duplicateQuery.pageSize"
              background
              layout="total, sizes, prev, pager, next"
              :total="duplicateTotal"
              :page-sizes="[10, 20, 50]"
              @change="fetchDuplicates"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑题目' : '新增题目'" width="760px">
      <el-alert
        v-if="editingId"
        class="dialog-alert"
        type="info"
        :closable="false"
        show-icon
        title="若后端列表未返回题干、参考答案或解析，请在编辑保存前补全这些字段。"
      />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
        <el-form-item label="题目标题" prop="title">
          <el-input v-model.trim="form.title" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="题组" prop="groupId">
          <el-select v-model="form.groupId" filterable placeholder="请选择题组" style="width: 100%">
            <el-option v-for="item in groups" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="form.tagIds" multiple filterable collapse-tags placeholder="请选择标签" style="width: 100%">
            <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="难度" prop="difficulty">
          <el-select v-model="form.difficulty" style="width: 100%">
            <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="题型" prop="questionType">
          <el-select v-model="form.questionType" style="width: 100%">
            <el-option v-for="item in questionTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="经验年限">
          <el-select v-model="form.experienceLevel" clearable placeholder="请选择经验年限" style="width: 100%">
            <el-option v-for="item in experienceLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="高频题">
          <el-switch v-model="form.isHighFrequency" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="题干" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="5" />
        </el-form-item>
        <el-form-item label="参考答案" prop="referenceAnswer">
          <el-input v-model="form.referenceAnswer" type="textarea" :rows="5" />
        </el-form-item>
        <el-form-item label="解析">
          <el-input v-model="form.analysis" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { BookOpenCheck, Plus } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  approveQuestionReviewApi,
  checkQuestionDuplicateApi,
  createAdminQuestionApi,
  deleteAdminQuestionApi,
  generateAiQuestionsApi,
  getAdminQuestionsApi,
  getQuestionDuplicateReviewsApi,
  getQuestionReviewsApi,
  ignoreQuestionDuplicateReviewApi,
  mergeQuestionDuplicateReviewApi,
  rejectQuestionReviewApi,
  updateAdminQuestionApi,
  updateAdminQuestionStatusApi
} from '@/api/question'
import { getQuestionCategoriesApi } from '@/api/questionCategory'
import { getQuestionGroupsApi } from '@/api/questionGroup'
import { getQuestionTagsApi } from '@/api/questionTag'
import StatusTag from '@/components/common/StatusTag.vue'
import {
  difficultyOptions,
  experienceLevelOptions,
  QUESTION_DIFFICULTY,
  QUESTION_TYPE,
  questionTypeOptions
} from '@/constants/enums'
import type {
  AdminQuestionQueryDTO,
  AdminQuestionVO,
  QuestionDuplicateReviewListVO,
  QuestionDuplicateReviewQueryDTO,
  QuestionCategoryVO,
  QuestionCreateDTO,
  QuestionDifficulty,
  QuestionGroupVO,
  QuestionReviewListVO,
  QuestionReviewQueryDTO,
  QuestionTagVO
} from '@/types/question'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const questions = ref<AdminQuestionVO[]>([])
const categories = ref<QuestionCategoryVO[]>([])
const tags = ref<QuestionTagVO[]>([])
const groups = ref<QuestionGroupVO[]>([])
const total = ref(0)
const governanceTab = ref('reviews')
const reviewLoading = ref(false)
const duplicateLoading = ref(false)
const generating = ref(false)
const duplicateChecking = ref(false)
const reviews = ref<QuestionReviewListVO[]>([])
const duplicates = ref<QuestionDuplicateReviewListVO[]>([])
const reviewTotal = ref(0)
const duplicateTotal = ref(0)

const query = reactive<AdminQuestionQueryDTO>({
  keyword: '',
  categoryId: undefined,
  tagId: undefined,
  difficulty: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const form = reactive<QuestionCreateDTO>({
  title: '',
  content: '',
  referenceAnswer: '',
  analysis: '',
  categoryId: undefined,
  groupId: undefined,
  difficulty: QUESTION_DIFFICULTY.MEDIUM,
  questionType: QUESTION_TYPE.SHORT_ANSWER,
  experienceLevel: '',
  isHighFrequency: 0,
  tagIds: [],
  status: 1
})

const reviewQuery = reactive<QuestionReviewQueryDTO>({
  keyword: '',
  reviewStatus: 'PENDING',
  pageNo: 1,
  pageSize: 10
})

const duplicateQuery = reactive<QuestionDuplicateReviewQueryDTO>({
  keyword: '',
  reviewStatus: 'PENDING',
  pageNo: 1,
  pageSize: 10
})

const rules: FormRules<QuestionCreateDTO> = {
  title: [{ required: true, message: '请输入题目标题', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  groupId: [{ required: true, message: '请选择题组', trigger: 'change' }],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  questionType: [{ required: true, message: '请选择题型', trigger: 'change' }],
  content: [{ required: true, message: '请输入题干', trigger: 'blur' }],
  referenceAnswer: [{ required: true, message: '请输入参考答案', trigger: 'blur' }]
}

const categoryCount = computed(() => new Set(questions.value.map((item) => item.categoryId || item.categoryName).filter(Boolean)).size)
const highFrequencyCount = computed(() => questions.value.filter((item) => item.isHighFrequency === true || item.isHighFrequency === 1).length)
const difficultyStats = computed(() => ({
  EASY: questions.value.filter((item) => item.difficulty === QUESTION_DIFFICULTY.EASY).length,
  MEDIUM: questions.value.filter((item) => item.difficulty === QUESTION_DIFFICULTY.MEDIUM).length,
  HARD: questions.value.filter((item) => item.difficulty === QUESTION_DIFFICULTY.HARD).length
}))

const getDifficultyLabel = (value?: QuestionDifficulty) => {
  if (value === QUESTION_DIFFICULTY.EASY) return '简单'
  if (value === QUESTION_DIFFICULTY.MEDIUM) return '中等'
  if (value === QUESTION_DIFFICULTY.HARD) return '困难'
  return value || '-'
}

const getDifficultyTagType = (value?: QuestionDifficulty) => {
  if (value === QUESTION_DIFFICULTY.EASY) return 'success'
  if (value === QUESTION_DIFFICULTY.HARD) return 'danger'
  return 'warning'
}

const getGroupNameById = (groupId?: number) => {
  if (!groupId) return '-'
  return groups.value.find((item) => item.id === groupId)?.name || String(groupId)
}

const getDisplayTags = (row: AdminQuestionVO) => {
  return (row.tags || [])
    .map((tag) => (typeof tag === 'string' ? tag : tag?.name || ''))
    .filter((name) => Boolean(name))
}

const getReviewStatusLabel = (status?: string) => {
  if (status === 'PENDING') return '待审核'
  if (status === 'APPROVED') return '已通过'
  if (status === 'REJECTED') return '已驳回'
  return status || '-'
}

const getReviewStatusType = (status?: string) => {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  return 'warning'
}

const getDuplicateStatusLabel = (status?: string) => {
  if (status === 'PENDING') return '待处理'
  if (status === 'CONFIRMED') return '已合并'
  if (status === 'IGNORED') return '已忽略'
  return status || '-'
}

const getDuplicateStatusType = (status?: string) => {
  if (status === 'CONFIRMED') return 'success'
  if (status === 'IGNORED') return 'info'
  return 'warning'
}

const formatSimilarity = (value?: number) => {
  if (value === undefined || value === null) return '-'
  return `${Math.round(Number(value) * 100)}%`
}

const resolveTagIdsFromRow = (row?: AdminQuestionVO): number[] => {
  if (!row?.tags?.length) return []

  return row.tags
    .map((tag) => {
      if (typeof tag === 'string') {
        return tags.value.find((item) => item.name === tag)?.id
      }
      return tag?.id
    })
    .filter((id): id is number => Number.isFinite(Number(id)) && Number(id) > 0)
}

const fetchOptions = async () => {
  const [categoryResult, tagResult, groupResult] = await Promise.all([
    getQuestionCategoriesApi(),
    getQuestionTagsApi(),
    getQuestionGroupsApi({ status: 1 })
  ])
  categories.value = categoryResult
  tags.value = tagResult
  groups.value = groupResult
}

const fetchQuestions = async () => {
  loading.value = true
  try {
    const result = await getAdminQuestionsApi(query)
    questions.value = result.records || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

const fetchReviews = async () => {
  reviewLoading.value = true
  try {
    const result = await getQuestionReviewsApi(reviewQuery)
    reviews.value = result.records || []
    reviewTotal.value = result.total || 0
  } finally {
    reviewLoading.value = false
  }
}

const fetchDuplicates = async () => {
  duplicateLoading.value = true
  try {
    const result = await getQuestionDuplicateReviewsApi(duplicateQuery)
    duplicates.value = result.records || []
    duplicateTotal.value = result.total || 0
  } finally {
    duplicateLoading.value = false
  }
}

const openDialog = (row?: AdminQuestionVO) => {
  editingId.value = row?.id || null
  Object.assign(form, {
    title: row?.title || '',
    content: row?.content || '',
    referenceAnswer: row?.referenceAnswer || '',
    analysis: row?.analysis || '',
    categoryId: row?.categoryId,
    groupId: row?.groupId,
    difficulty: row?.difficulty || QUESTION_DIFFICULTY.MEDIUM,
    questionType: row?.questionType || QUESTION_TYPE.SHORT_ANSWER,
    experienceLevel: row?.experienceLevel || '',
    isHighFrequency: row?.isHighFrequency ?? 0,
    tagIds: resolveTagIdsFromRow(row),
    status: row?.status ?? 1
  })
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (editingId.value) {
      await updateAdminQuestionApi(editingId.value, form)
    } else {
      await createAdminQuestionApi(form)
    }
    ElMessage.success('题目已保存')
    dialogVisible.value = false
    await fetchQuestions()
  } finally {
    saving.value = false
  }
}

const handleStatus = async (row: AdminQuestionVO) => {
  const nextStatus = row.status === 1 ? 0 : 1
  await updateAdminQuestionStatusApi(row.id, nextStatus)
  ElMessage.success(nextStatus === 1 ? '题目已启用' : '题目已禁用')
  await fetchQuestions()
}

const handleDelete = async (row: AdminQuestionVO) => {
  await ElMessageBox.confirm(`确认删除题目 ${row.title}？`, '删除确认', { type: 'warning' })
  await deleteAdminQuestionApi(row.id)
  ElMessage.success('题目已删除')
  await fetchQuestions()
}

const handleSearch = () => {
  query.pageNo = 1
  fetchQuestions()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    categoryId: undefined,
    tagId: undefined,
    difficulty: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchQuestions()
}

const resetReviewQuery = () => {
  Object.assign(reviewQuery, {
    keyword: '',
    reviewStatus: 'PENDING',
    pageNo: 1,
    pageSize: 10
  })
  fetchReviews()
}

const resetDuplicateQuery = () => {
  Object.assign(duplicateQuery, {
    keyword: '',
    reviewStatus: 'PENDING',
    pageNo: 1,
    pageSize: 10
  })
  fetchDuplicates()
}

const handleGenerateReviews = async () => {
  const { value } = await ElMessageBox.prompt('请输入生成主题或知识点', '触发 AI 生成题目', {
    inputPlaceholder: '例如：JVM 垃圾回收',
    inputValidator: (value) => Boolean(value?.trim()) || '请输入知识点'
  })
  generating.value = true
  try {
    const result = await generateAiQuestionsApi({
      knowledgePoint: value.trim(),
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      questionType: QUESTION_TYPE.SHORT_ANSWER,
      count: 5,
      generateReferenceAnswer: true,
      generateFollowUps: true,
      generateTagSuggestions: true,
      generateCategorySuggestion: true
    })
    ElMessage.success(`已生成 ${result.generatedCount || result.reviewIds?.length || 0} 条待审核题目`)
    await fetchReviews()
  } finally {
    generating.value = false
  }
}

const handleApproveReview = async (id: number) => {
  await ElMessageBox.confirm('确认通过该 AI 题目并写入正式题库？', '审核通过', { type: 'warning' })
  await approveQuestionReviewApi(id)
  ElMessage.success('题目已通过审核')
  await Promise.all([fetchReviews(), fetchQuestions(), fetchDuplicates()])
}

const handleRejectReview = async (id: number) => {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回题目', {
    inputType: 'textarea',
    inputValidator: (value) => Boolean(value?.trim()) || '请输入驳回原因'
  })
  await rejectQuestionReviewApi(id, { rejectReason: value.trim() })
  ElMessage.success('题目已驳回')
  await fetchReviews()
}

const handleCheckDuplicates = async () => {
  const questionIds = questions.value.map((item) => item.id).filter(Boolean)
  if (!questionIds.length) {
    ElMessage.warning('当前页没有可检测题目')
    return
  }
  duplicateChecking.value = true
  try {
    const result = await checkQuestionDuplicateApi({ questionIds })
    ElMessage.success(`已检测 ${result.checkedCount || questionIds.length} 道题，新增 ${result.createdCount || 0} 条候选`)
    await fetchDuplicates()
  } finally {
    duplicateChecking.value = false
  }
}

const handleMergeDuplicate = async (id: number) => {
  const { value } = await ElMessageBox.prompt('请输入合并原因', '合并重复题', {
    inputType: 'textarea',
    inputPlaceholder: '例如：语义重复，保留主问题并建立重复关系'
  })
  await mergeQuestionDuplicateReviewApi(id, {
    relationType: 'DUPLICATE',
    reason: value?.trim() || '确认重复'
  })
  ElMessage.success('重复题已合并')
  await fetchDuplicates()
}

const handleIgnoreDuplicate = async (id: number) => {
  const { value } = await ElMessageBox.prompt('请输入忽略原因', '忽略重复候选', {
    inputType: 'textarea',
    inputPlaceholder: '例如：考察角度不同'
  })
  await ignoreQuestionDuplicateReviewApi(id, {
    ignoredReason: value?.trim() || '确认不是重复题'
  })
  ElMessage.success('重复候选已忽略')
  await fetchDuplicates()
}

onMounted(async () => {
  await fetchOptions()
  await Promise.all([fetchQuestions(), fetchReviews(), fetchDuplicates()])
})
</script>

<style scoped lang="scss">
.filter-form {
  width: 100%;
}

.tag-item {
  margin-right: 6px;
}

.dialog-alert {
  margin-bottom: 16px;
}

.question-distribution {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 0 20px 16px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

.governance-panel {
  margin-top: 18px;
}

.governance-tabs {
  padding: 0 20px 20px;
}

.governance-filter {
  padding: 0 0 16px;
}
</style>
