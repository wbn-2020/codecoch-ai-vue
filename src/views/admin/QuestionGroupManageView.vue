<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">问题组管理</h1>
        <p class="page-subtitle">维护同一考察意图下的问题组，用于题目治理、推荐排重和统计归类。</p>
      </div>
      <el-button
        v-permission="'admin:question:group'"
        type="primary"
        :disabled="isAdminMobileReadonly"
        :title="mobileReadonlyTitle()"
        @click="openDialog()"
      >新增问题组</el-button>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form class="filter-form" :model="filters" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="filters.keyword" clearable placeholder="名称 / 知识点" />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="filters.categoryId" clearable placeholder="全部分类" style="width: 160px">
              <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filters.status" clearable placeholder="全部" style="width: 120px">
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

      <div class="table-card">
        <div class="table-card__header">
          <div>
            <h2>问题组列表</h2>
            <p>问题组会影响同意图治理、推荐排重和统计归类，可按排障场景调整显示列。</p>
          </div>
          <div class="table-view-tools">
            <el-segmented v-model="tableSize" :options="tableSizeOptions" />
            <el-dropdown trigger="click" :hide-on-click="false">
              <el-button plain>列配置</el-button>
              <template #dropdown>
                <el-dropdown-menu class="column-config-menu">
                  <el-dropdown-item v-for="item in columnOptions" :key="item.key">
                    <el-checkbox v-model="visibleColumns[item.key]" :disabled="item.required">
                      {{ item.label }}
                    </el-checkbox>
                  </el-dropdown-item>
                  <el-dropdown-item divided>
                    <el-button link type="primary" @click.stop="resetTableView">恢复默认视图</el-button>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <el-table v-loading="loading" :data="pagedGroups" row-key="id" :size="tableSize">
          <template #empty>
            <AppState
              v-if="errorMessage"
              type="error"
              title="问题组列表加载失败"
              :description="errorMessage"
            >
              <el-button type="primary" :loading="loading" @click="fetchGroups">重新加载</el-button>
            </AppState>
            <AppState v-else type="empty" :title="groupEmptyTitle" :description="groupEmptyDescription">
              <el-button v-if="hasFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button
                v-else
                v-permission="'admin:question:group'"
                type="primary"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="openDialog()"
              >新增问题组</el-button>
            </AppState>
          </template>
          <el-table-column v-if="isColumnVisible('name')" prop="name" label="问题组名称" min-width="200" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('category')" label="分类" min-width="160">
            <template #default="{ row }">{{ getCategoryName(row.categoryId) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('questionCount')" label="题目数" width="100">
            <template #default="{ row }">{{ row.questionCount ?? '--' }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('knowledgePoint')" label="知识点" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.knowledgePoint || row.mainKnowledgePoint || '--' }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('description')" prop="description" label="描述" min-width="220" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('updatedAt')" prop="updatedAt" label="更新时间" min-width="170" show-overflow-tooltip />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button
                v-permission="'admin:question:group'"
                link
                type="primary"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="openDialog(row)"
              >编辑</el-button>
              <el-button
                v-permission="'admin:question:group'"
                link
                type="danger"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="handleDelete(row)"
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="filters.pageNo"
          v-model:page-size="filters.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="filteredGroups.length"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑问题组' : '新增问题组'" width="680px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
        <el-form-item label="名称" prop="name">
          <el-input v-model.trim="form.name" placeholder="例如：Spring 事务一致性" />
        </el-form-item>
        <el-form-item label="主分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          v-permission="'admin:question:group'"
          type="primary"
          :loading="saving"
          :disabled="isAdminMobileReadonly"
          :title="mobileReadonlyTitle()"
          @click="handleSave"
        >保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import { getQuestionCategoriesApi } from '@/api/questionCategory'
import {
  createQuestionGroupApi,
  deleteQuestionGroupApi,
  getQuestionGroupsApi,
  updateQuestionGroupApi
} from '@/api/questionGroup'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { QuestionCategoryVO, QuestionGroupDTO, QuestionGroupVO } from '@/types/question'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

type GroupColumnKey =
  | 'name'
  | 'category'
  | 'status'
  | 'questionCount'
  | 'knowledgePoint'
  | 'description'
  | 'updatedAt'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<GroupColumnKey>('admin:question-group', [
  { key: 'name', label: '问题组名称', required: true },
  { key: 'category', label: '分类', required: true },
  { key: 'status', label: '状态', required: true },
  { key: 'questionCount', label: '题目数' },
  { key: 'knowledgePoint', label: '知识点', defaultVisible: false },
  { key: 'description', label: '描述' },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false }
])
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const groups = ref<QuestionGroupVO[]>([])
const categories = ref<QuestionCategoryVO[]>([])

const filters = reactive({
  keyword: '',
  categoryId: undefined as number | undefined,
  status: '' as number | '',
  pageNo: 1,
  pageSize: 10
})

const form = reactive<QuestionGroupDTO>({
  name: '',
  categoryId: undefined,
  description: '',
  status: 1
})

const rules: FormRules<QuestionGroupDTO> = {
  name: [{ required: true, message: '请输入问题组名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择主分类', trigger: 'change' }]
}

const hasFilters = computed(() => Boolean(filters.keyword || filters.categoryId || filters.status !== ''))
const groupEmptyTitle = computed(() => (hasFilters.value ? '没有匹配当前筛选的问题组' : '暂无问题组'))
const groupEmptyDescription = computed(() =>
  hasFilters.value
    ? '当前筛选条件下没有问题组。清空筛选后可确认是否真的没有题组。'
    : '问题组为空时，同意图题目治理、推荐排重和后台统计会缺少归类依据。建议先创建基础问题组。'
)

const fetchOptions = async () => {
  categories.value = await getQuestionCategoriesApi()
}

const filteredGroups = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  return groups.value.filter((item) => {
    const matchKeyword =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      (item.description || '').toLowerCase().includes(keyword) ||
      (item.knowledgePoint || '').toLowerCase().includes(keyword)
    const matchCategory = !filters.categoryId || item.categoryId === filters.categoryId
    const matchStatus = filters.status === '' || item.status === filters.status
    return matchKeyword && matchCategory && matchStatus
  })
})

const pagedGroups = computed(() => {
  const start = (filters.pageNo - 1) * filters.pageSize
  return filteredGroups.value.slice(start, start + filters.pageSize)
})

const fetchGroups = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    groups.value = await getQuestionGroupsApi()
  } catch (error) {
    groups.value = []
    errorMessage.value = getErrorMessage(error, '问题组列表暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const getCategoryName = (categoryId?: number) => {
  if (!categoryId) return '-'
  return categories.value.find((item) => item.id === categoryId)?.name || String(categoryId)
}

const openDialog = (row?: QuestionGroupVO) => {
  if (!guardAdminMobileWrite()) return
  editingId.value = row?.id || null
  Object.assign(form, {
    name: row?.name || '',
    categoryId: row?.categoryId,
    description: row?.description || '',
    status: row?.status ?? 1
  })
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!guardAdminMobileWrite()) return
  if (!formRef.value) return
  await formRef.value.validate()
  const payload: QuestionGroupDTO = {
    name: form.name,
    categoryId: form.categoryId,
    description: form.description,
    status: form.status
  }
  const actionLabel = editingId.value ? '更新题组' : '新增题组'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}预览`,
    action: `${actionLabel}「${payload.name}」`,
    target: `分类：${payload.categoryId || '-'}；状态：${payload.status}`,
    impact: '题组保存后会影响正式题目归属、同意图治理、推荐排重和后台统计。',
    rollback: editingId.value
      ? '可再次编辑题组信息；已归属题目的治理口径需要人工复核。'
      : '如新增错误，可在确认没有题目挂载后删除该题组。',
    audit: '题组保存会记录操作人、题组名称、分类和时间，便于追踪题库治理变更。',
    tips: ['确认题组名称能清楚表达题目范围。', '确认分类选择正确，避免后续推荐和统计偏移。'],
    confirmButtonText: '确认保存'
  })
  if (!confirmed) return
  saving.value = true
  try {
    if (editingId.value) {
      await updateQuestionGroupApi(editingId.value, payload)
    } else {
      await createQuestionGroupApi(payload)
    }
    ElMessage.success('问题组已保存')
    dialogVisible.value = false
    await fetchGroups()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: QuestionGroupVO) => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmDangerActionPreview({
    title: '删除题组预览',
    action: `删除题组「${row.name}」`,
    target: `题组编号：${row.id}；分类：${row.categoryId || '-'}；题目数：${row.questionCount ?? '-'}`,
    impact: '依赖该题组的正式题目、同意图治理、推荐排重和后台统计可能受到影响。',
    rollback: '删除后无法直接恢复该题组；误删后需要重新创建题组并修正题目归属。',
    audit: '删除题组会记录操作人、题组编号、名称和时间，便于审计。',
    tips: ['确认没有正式题目仍挂在该题组。', '确认不是只需要禁用题组。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  await deleteQuestionGroupApi(row.id)
  ElMessage.success('问题组已删除')
  await fetchGroups()
}

const handleReset = () => {
  Object.assign(filters, {
    keyword: '',
    categoryId: undefined,
    status: '',
    pageNo: 1,
    pageSize: 10
  })
}

const handleSearch = () => {
  filters.pageNo = 1
}

onMounted(async () => {
  await fetchOptions()
  await fetchGroups()
})
</script>

<style scoped lang="scss">
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

.table-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 12px;
}

.table-card__header h2 {
  margin: 0;
  color: var(--app-text);
  font-size: 18px;
}

.table-card__header p {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

.table-view-tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

:global(.column-config-menu) {
  min-width: 180px;
  padding: 8px;
}

:global(.column-config-menu .el-checkbox) {
  width: 100%;
}

@media (max-width: 900px) {
  .table-card__header {
    flex-direction: column;
  }

  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
