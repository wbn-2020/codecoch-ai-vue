<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">标签管理</h1>
        <p class="page-subtitle">维护题目标签，用于筛选和知识点标记。</p>
      </div>
      <el-button
        v-permission="'admin:question:tag'"
        type="primary"
        :disabled="isAdminMobileReadonly"
        :title="mobileReadonlyTitle()"
        @click="openDialog()"
      >新增标签</el-button>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form class="filter-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="标签名称" />
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
            <h2>标签列表</h2>
            <p>标签用于题目筛选、练习入口和知识点标记，可按治理场景调整显示列。</p>
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

        <el-table v-loading="loading" :data="pagedTags" row-key="id" :size="tableSize">
          <template #empty>
            <AppState
              v-if="errorMessage"
              type="error"
              title="标签列表加载失败"
              :description="errorMessage"
            >
              <el-button type="primary" :loading="loading" @click="fetchTags">重新加载</el-button>
            </AppState>
            <AppState v-else type="empty" :title="tagEmptyTitle" :description="tagEmptyDescription">
              <el-button v-if="hasFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button
                v-else
                v-permission="'admin:question:tag'"
                type="primary"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="openDialog()"
              >新增标签</el-button>
            </AppState>
          </template>
          <el-table-column v-if="isColumnVisible('name')" prop="name" label="标签名称" min-width="180" />
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
                v-permission="'admin:question:tag'"
                link
                type="primary"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="openDialog(row)"
              >编辑</el-button>
              <el-button
                v-permission="'admin:question:tag'"
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
          :total="filteredTags.length"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑标签' : '新增标签'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="名称" prop="name"><el-input v-model.trim="form.name" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          v-permission="'admin:question:tag'"
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
  createQuestionTagApi,
  deleteQuestionTagApi,
  getQuestionTagsApi,
  updateQuestionTagApi
} from '@/api/questionTag'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { QuestionTagDTO, QuestionTagVO } from '@/types/question'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

type TagColumnKey = 'name' | 'status' | 'description' | 'createdAt' | 'updatedAt'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<TagColumnKey>('admin:question-tag', [
  { key: 'name', label: '标签名称', required: true },
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
const tags = ref<QuestionTagVO[]>([])

const query = reactive({
  keyword: '',
  status: '' as number | '',
  pageNo: 1,
  pageSize: 10
})

const form = reactive<QuestionTagDTO>({
  name: '',
  code: '',
  status: 1,
  description: ''
})

const rules: FormRules<QuestionTagDTO> = {
  name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }]
}

const hasFilters = computed(() => Boolean(query.keyword || query.status !== ''))
const tagEmptyTitle = computed(() => (hasFilters.value ? '没有匹配当前筛选的标签' : '暂无题目标签'))
const tagEmptyDescription = computed(() =>
  hasFilters.value
    ? '当前筛选条件下没有题目标签。清空筛选后可确认是否真的没有标签。'
    : '题目标签为空时，题库筛选、练习入口、推荐策略和知识点标记都会缺少标签上下文。建议先创建基础标签。'
)

const filteredTags = computed(() => {
  const keyword = query.keyword.trim().toLowerCase()
  return tags.value.filter((item) => {
    const matchKeyword = !keyword || item.name.toLowerCase().includes(keyword)
    const matchStatus = query.status === '' || item.status === query.status
    return matchKeyword && matchStatus
  })
})

const pagedTags = computed(() => {
  const start = (query.pageNo - 1) * query.pageSize
  return filteredTags.value.slice(start, start + query.pageSize)
})

const fetchTags = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    tags.value = await getQuestionTagsApi()
  } catch (error) {
    tags.value = []
    errorMessage.value = getErrorMessage(error, '标签列表暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const openDialog = (row?: QuestionTagVO) => {
  if (!guardAdminMobileWrite()) return
  editingId.value = row?.id || null
  Object.assign(form, {
    name: row?.name || '',
    code: row?.code || row?.tagCode || '',
    status: row?.status ?? 1,
    description: row?.description || row?.remark || ''
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
  const actionLabel = editingId.value ? '更新题目标签' : '新增题目标签'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}预览`,
    action: `${actionLabel}「${form.name}」`,
    target: `编码：${form.code || '-'}；状态：${form.status}`,
    impact: '标签保存后会影响题库筛选、练习入口、推荐策略和知识点标记。',
    rollback: editingId.value
      ? '可再次编辑标签信息；已关联题目的标签口径不会自动生成复核记录。'
      : '如新增错误，可在确认没有题目引用后删除该标签。',
    audit: '标签保存会记录操作人、标签名称、编码和时间，便于追踪题库治理变更。',
    tips: ['确认标签名称和编码不会与现有标签混淆。', '确认该标签适合进入用户练习和推荐筛选。'],
    confirmButtonText: '确认保存'
  })
  if (!confirmed) return
  saving.value = true
  try {
    if (editingId.value) {
      await updateQuestionTagApi(editingId.value, form)
    } else {
      await createQuestionTagApi(form)
    }
    ElMessage.success('标签已保存')
    dialogVisible.value = false
    await fetchTags()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: QuestionTagVO) => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmDangerActionPreview({
    title: '删除题目标签预览',
    action: `删除标签「${row.name}」`,
    target: `标签编号：${row.id}；编码：${row.code || row.tagCode || '-'}；状态：${row.status}`,
    impact: '依赖该标签的题目筛选、推荐策略、用户练习入口和后台统计可能受到影响。',
    rollback: '删除后无法直接恢复该标签；误删后需要重新创建标签并修正题目标签关系。',
    audit: '删除标签会记录操作人、标签编号、名称和时间，便于审计。',
    tips: ['确认没有正式题目仍依赖该标签。', '确认不是只需要禁用标签。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  await deleteQuestionTagApi(row.id)
  ElMessage.success('标签已删除')
  await fetchTags()
}

onMounted(fetchTags)
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
