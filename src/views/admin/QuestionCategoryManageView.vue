<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">分类管理</h1>
        <p class="page-subtitle">维护题目分类，支持基础层级、状态管理和题库统计归类。</p>
      </div>
      <el-button
        v-permission="'admin:question:category'"
        type="primary"
        :disabled="isAdminMobileReadonly"
        :title="mobileReadonlyTitle()"
        @click="openDialog()"
      >新增分类</el-button>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form class="filter-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="分类名称" />
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

      <div class="table-card">
        <div class="table-card__header">
          <div>
            <h2>分类列表</h2>
            <p>分类会影响题库筛选、推荐策略和统计口径，可按治理场景调整显示列。</p>
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

        <el-table v-loading="loading" :data="pagedCategories" row-key="id" :size="tableSize">
          <template #empty>
            <AppState
              v-if="errorMessage"
              type="error"
              title="分类列表加载失败"
              :description="errorMessage"
            >
              <el-button type="primary" :loading="loading" @click="fetchCategories">重新加载</el-button>
            </AppState>
            <AppState v-else type="empty" :title="categoryEmptyTitle" :description="categoryEmptyDescription">
              <el-button v-if="hasFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button
                v-else
                v-permission="'admin:question:category'"
                type="primary"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="openDialog()"
              >新增分类</el-button>
            </AppState>
          </template>
          <el-table-column v-if="isColumnVisible('name')" prop="name" label="分类名称" min-width="180" />
          <el-table-column v-if="isColumnVisible('sort')" prop="sort" label="排序" width="90" />
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('description')" label="说明" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.description || row.remark || '--' }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('updatedAt')" prop="updatedAt" label="更新时间" min-width="170" show-overflow-tooltip />
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <el-button
                v-permission="'admin:question:category'"
                link
                type="primary"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="openDialog(row)"
              >编辑</el-button>
              <el-button
                v-permission="'admin:question:category'"
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
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="filteredCategories.length"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑分类' : '新增分类'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="名称" prop="name"><el-input v-model.trim="form.name" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          v-permission="'admin:question:category'"
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

import {
  createQuestionCategoryApi,
  deleteQuestionCategoryApi,
  getQuestionCategoriesApi,
  updateQuestionCategoryApi
} from '@/api/questionCategory'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { QuestionCategoryDTO, QuestionCategoryVO } from '@/types/question'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

type CategoryColumnKey = 'name' | 'sort' | 'status' | 'description' | 'createdAt' | 'updatedAt'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<CategoryColumnKey>('admin:question-category', [
  { key: 'name', label: '分类名称', required: true },
  { key: 'sort', label: '排序' },
  { key: 'status', label: '状态', required: true },
  { key: 'description', label: '说明', defaultVisible: false },
  { key: 'createdAt', label: '创建时间', defaultVisible: false },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false }
])
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const categories = ref<QuestionCategoryVO[]>([])

const query = reactive({
  keyword: '',
  status: '' as number | '',
  pageNo: 1,
  pageSize: 10
})

const form = reactive<QuestionCategoryDTO>({
  name: '',
  code: '',
  parentId: undefined,
  sort: 0,
  status: 1,
  description: ''
})

const rules: FormRules<QuestionCategoryDTO> = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }]
}

const filteredCategories = computed(() => {
  const keyword = query.keyword.trim().toLowerCase()
  return categories.value.filter((item) => {
    const matchKeyword = !keyword || item.name.toLowerCase().includes(keyword)
    const matchStatus = query.status === '' || item.status === query.status
    return matchKeyword && matchStatus
  })
})

const hasFilters = computed(() => Boolean(query.keyword || query.status !== ''))
const categoryEmptyTitle = computed(() => (hasFilters.value ? '没有匹配当前筛选的分类' : '暂无题目分类'))
const categoryEmptyDescription = computed(() =>
  hasFilters.value
    ? '当前筛选条件下没有题目分类。清空筛选后可确认是否真的没有分类。'
    : '题目分类为空时，题库筛选、推荐策略和后台统计都会缺少分类上下文。建议先创建基础分类。'
)

const pagedCategories = computed(() => {
  const start = (query.pageNo - 1) * query.pageSize
  return filteredCategories.value.slice(start, start + query.pageSize)
})

const fetchCategories = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    categories.value = await getQuestionCategoriesApi()
  } catch (error) {
    categories.value = []
    errorMessage.value = getErrorMessage(error, '分类列表暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const openDialog = (row?: QuestionCategoryVO) => {
  if (!guardAdminMobileWrite()) return
  editingId.value = row?.id || null
  Object.assign(form, {
    name: row?.name || '',
    code: row?.code || '',
    parentId: row?.parentId,
    sort: row?.sort || 0,
    status: row?.status ?? 1,
    description: row?.description || ''
  })
  dialogVisible.value = true
}

const handleSearch = () => {
  query.pageNo = 1
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
}

const handleSave = async () => {
  if (!guardAdminMobileWrite()) return
  if (!formRef.value) return
  await formRef.value.validate()
  const actionLabel = editingId.value ? '更新题目分类' : '新增题目分类'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}预览`,
    action: `${actionLabel}「${form.name}」`,
    target: `编码：${form.code || '-'}；排序：${form.sort ?? 0}；状态：${form.status}`,
    impact: '分类保存后会影响题目筛选、推荐策略、运营配置和后台统计口径。',
    rollback: editingId.value
      ? '可再次编辑分类信息；已被题目或配置引用的历史口径不会自动回到修改前。'
      : '如新增错误，可在确认没有题目引用后删除该分类。',
    audit: '分类保存会记录操作人、分类名称、编码和时间，便于追踪题库治理变更。',
    tips: ['确认分类名称和编码不会与现有分类混淆。', '确认状态设置符合当前题库运营范围。'],
    confirmButtonText: '确认保存'
  })
  if (!confirmed) return
  saving.value = true
  try {
    if (editingId.value) {
      await updateQuestionCategoryApi(editingId.value, form)
    } else {
      await createQuestionCategoryApi(form)
    }
    ElMessage.success('分类已保存')
    dialogVisible.value = false
    await fetchCategories()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: QuestionCategoryVO) => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmDangerActionPreview({
    title: '删除题目分类预览',
    action: `删除分类「${row.name}」`,
    target: `分类编号：${row.id}；编码：${row.code || row.categoryCode || '-'}；状态：${row.status}`,
    impact: '依赖该分类的题目筛选、推荐策略、运营配置和后台统计可能受到影响。',
    rollback: '删除后无法直接恢复该分类；误删后需要重新创建分类并修正相关题目或配置引用。',
    audit: '删除分类会记录操作人、分类编号、名称和时间，便于审计。',
    tips: ['确认没有正式题目仍依赖该分类。', '确认不是只需要禁用分类。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  await deleteQuestionCategoryApi(row.id)
  ElMessage.success('分类已删除')
  await fetchCategories()
}

onMounted(fetchCategories)
</script>

<style scoped lang="scss">
.filter-form {
  width: 100%;
}

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
