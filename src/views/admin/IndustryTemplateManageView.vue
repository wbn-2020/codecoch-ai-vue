<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">行业模板维护</h1>
        <p class="page-subtitle">维护行业场景面试使用的模板，不影响用户端创建面试的基础流程。</p>
      </div>
      <el-button
        v-permission="'admin:industry-template:write'"
        type="primary"
        :disabled="isAdminMobileReadonly"
        :title="mobileReadonlyTitle()"
        @click="openDialog()"
      >新增模板</el-button>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <el-form class="filter-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="行业编码 / 名称 / 描述" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.enabled" clearable placeholder="全部" style="width: 120px">
              <el-option label="启用" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="fetchTemplates">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card">
        <div class="table-card__header">
          <div>
            <h2>模板列表</h2>
            <p>按行业编码、名称和状态筛选；可调整表格密度和列显隐，展开行查看行业配置详情。</p>
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

        <el-table v-loading="loading" :data="templates" row-key="industryTemplateId" :size="tableSize">
          <template #empty>
            <AppState
              :type="loadError ? 'error' : 'empty'"
              :title="templateEmptyTitle"
              :description="loadError || templateEmptyDescription"
            >
              <el-button type="primary" @click="loadError ? fetchTemplates() : hasTemplateFilters ? handleReset() : fetchTemplates()">
                {{ loadError ? '重新加载' : hasTemplateFilters ? '清空筛选' : '刷新列表' }}
              </el-button>
            </AppState>
          </template>
          <el-table-column v-if="isColumnVisible('detail')" type="expand">
            <template #default="{ row }">
              <div class="template-detail">
                <div>
                  <span>适用岗位</span>
                  <p>{{ row.targetPositions || '-' }}</p>
                </div>
                <div>
                  <span>核心业务场景</span>
                  <pre>{{ row.coreBusinessScenarios || '-' }}</pre>
                </div>
                <div>
                  <span>关键技术点</span>
                  <pre>{{ row.keyTechnicalPoints || '-' }}</pre>
                </div>
                <div>
                  <span>常见追问方向</span>
                  <pre>{{ row.commonQuestionDirections || '-' }}</pre>
                </div>
                <div>
                  <span>风险点</span>
                  <pre>{{ row.riskPoints || '-' }}</pre>
                </div>
                <div class="template-detail__wide">
                  <span>面试上下文</span>
                  <p>{{ row.promptContext || '-' }}</p>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('industryCode')" prop="industryCode" label="编码" min-width="150" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('industryName')" prop="industryName" label="行业名称" min-width="140" />
          <el-table-column v-if="isColumnVisible('description')" prop="description" label="说明" min-width="240" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('targetPositions')" prop="targetPositions" label="适用岗位" min-width="180" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('enabled')" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.enabled === 1 ? 'success' : 'info'" effect="plain">
                {{ row.enabled === 1 ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('sortOrder')" prop="sortOrder" label="排序" width="90" />
          <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('updatedAt')" prop="updatedAt" label="更新时间" min-width="170" show-overflow-tooltip />
          <el-table-column label="操作" width="260" fixed="right">
            <template #default="{ row }">
              <el-button
                v-permission="'admin:industry-template:write'"
                link
                type="primary"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="openDialog(row)"
              >编辑</el-button>
              <el-button
                v-permission="'admin:industry-template:write'"
                link
                :type="row.enabled === 1 ? 'warning' : 'success'"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="handleToggle(row)"
              >
                {{ row.enabled === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button
                v-permission="'admin:industry-template:write'"
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
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑行业模板' : '新增行业模板'" width="860px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="150px">
        <div class="form-grid">
          <el-form-item label="行业编码" prop="industryCode">
            <el-input v-model.trim="form.industryCode" placeholder="例如 ECOMMERCE" />
          </el-form-item>
          <el-form-item label="行业名称" prop="industryName">
            <el-input v-model.trim="form.industryName" placeholder="例如 电商" />
          </el-form-item>
          <el-form-item label="状态">
            <el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="form.sortOrder" :min="0" :step="10" />
          </el-form-item>
        </div>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="适用岗位">
          <el-input v-model="form.targetPositions" placeholder="逗号分隔，例如 Java 后端,电商后端" />
        </el-form-item>
        <el-form-item label="核心业务场景" prop="coreBusinessScenarios">
          <el-input v-model="form.coreBusinessScenarios" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="关键技术点" prop="keyTechnicalPoints">
          <el-input v-model="form.keyTechnicalPoints" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="追问方向" prop="commonQuestionDirections">
          <el-input v-model="form.commonQuestionDirections" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="风险点" prop="riskPoints">
          <el-input v-model="form.riskPoints" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="面试上下文">
          <el-input v-model="form.promptContext" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          v-permission="'admin:industry-template:write'"
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
  createAdminIndustryTemplateApi,
  deleteAdminIndustryTemplateApi,
  disableAdminIndustryTemplateApi,
  enableAdminIndustryTemplateApi,
  getAdminIndustryTemplatesApi,
  updateAdminIndustryTemplateApi
} from '@/api/industryTemplate'
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type {
  AdminIndustryTemplateQuery,
  CreateIndustryTemplateDTO,
  IndustryTemplateVO
} from '@/types/industryTemplate'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

type JsonArrayField =
  | 'coreBusinessScenarios'
  | 'keyTechnicalPoints'
  | 'commonQuestionDirections'
  | 'riskPoints'

const jsonArrayFields: JsonArrayField[] = [
  'coreBusinessScenarios',
  'keyTechnicalPoints',
  'commonQuestionDirections',
  'riskPoints'
]

type TemplateColumnKey =
  | 'detail'
  | 'industryCode'
  | 'industryName'
  | 'description'
  | 'targetPositions'
  | 'enabled'
  | 'sortOrder'
  | 'createdAt'
  | 'updatedAt'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<TemplateColumnKey>('admin:industry-template', [
  { key: 'detail', label: '配置详情', defaultVisible: true },
  { key: 'industryCode', label: '编码', required: true },
  { key: 'industryName', label: '行业名称', required: true },
  { key: 'description', label: '说明' },
  { key: 'targetPositions', label: '适用岗位', defaultVisible: false },
  { key: 'enabled', label: '状态', required: true },
  { key: 'sortOrder', label: '排序' },
  { key: 'createdAt', label: '创建时间', defaultVisible: false },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false }
])
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const templates = ref<IndustryTemplateVO[]>([])
const loadError = ref('')

const query = reactive<AdminIndustryTemplateQuery>({
  keyword: '',
  enabled: ''
})

const form = reactive<CreateIndustryTemplateDTO>({
  industryCode: '',
  industryName: '',
  description: '',
  targetPositions: '',
  coreBusinessScenarios: '',
  keyTechnicalPoints: '',
  commonQuestionDirections: '',
  riskPoints: '',
  promptContext: '',
  enabled: 1,
  sortOrder: 0
})

const hasTemplateFilters = computed(() => Boolean(query.keyword || query.enabled !== ''))

const templateEmptyTitle = computed(() => {
  if (loadError.value) return '行业模板加载失败'
  if (hasTemplateFilters.value) return '没有匹配的行业模板'
  return '暂无行业模板'
})

const templateEmptyDescription = computed(() => {
  if (hasTemplateFilters.value) return '当前关键词或状态筛选没有命中模板，可清空筛选后重新查看。'
  return '行业模板用于补充不同行业的面试上下文，新增前可先确认是否已有相近行业可复用。'
})

const validateJsonArray = (_rule: unknown, value: string | undefined, callback: (error?: Error) => void) => {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    callback()
    return
  }
  try {
    if (!Array.isArray(JSON.parse(trimmed))) {
      callback(new Error('请输入数组格式内容，例如 ["支付链路", "订单履约"]'))
      return
    }
    callback()
  } catch {
    callback(new Error('请输入数组格式内容，例如 ["支付链路", "订单履约"]'))
  }
}

const rules: FormRules<CreateIndustryTemplateDTO> = {
  industryCode: [{ required: true, message: '请输入行业编码', trigger: 'blur' }],
  industryName: [{ required: true, message: '请输入行业名称', trigger: 'blur' }],
  coreBusinessScenarios: [{ validator: validateJsonArray, trigger: 'blur' }],
  keyTechnicalPoints: [{ validator: validateJsonArray, trigger: 'blur' }],
  commonQuestionDirections: [{ validator: validateJsonArray, trigger: 'blur' }],
  riskPoints: [{ validator: validateJsonArray, trigger: 'blur' }]
}

const fetchTemplates = async () => {
  loading.value = true
  loadError.value = ''
  try {
    templates.value = await getAdminIndustryTemplatesApi({
      keyword: query.keyword || undefined,
      enabled: query.enabled
    })
  } catch (error) {
    templates.value = []
    loadError.value = getErrorMessage(error, '行业模板列表加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const resetForm = (row?: IndustryTemplateVO) => {
  Object.assign(form, {
    industryCode: row?.industryCode || '',
    industryName: row?.industryName || '',
    description: row?.description || '',
    targetPositions: row?.targetPositions || '',
    coreBusinessScenarios: row?.coreBusinessScenarios || '',
    keyTechnicalPoints: row?.keyTechnicalPoints || '',
    commonQuestionDirections: row?.commonQuestionDirections || '',
    riskPoints: row?.riskPoints || '',
    promptContext: row?.promptContext || '',
    enabled: row?.enabled ?? 1,
    sortOrder: row?.sortOrder ?? 0
  })
}

const openDialog = (row?: IndustryTemplateVO) => {
  if (!guardAdminMobileWrite()) return
  editingId.value = row?.industryTemplateId || null
  resetForm(row)
  dialogVisible.value = true
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    enabled: ''
  })
  fetchTemplates()
}

const toPayload = (): CreateIndustryTemplateDTO => {
  const payload: CreateIndustryTemplateDTO = {
    industryCode: form.industryCode,
    industryName: form.industryName,
    description: form.description,
    targetPositions: form.targetPositions,
    promptContext: form.promptContext,
    enabled: form.enabled,
    sortOrder: form.sortOrder
  }
  jsonArrayFields.forEach((field) => {
    payload[field] = (form[field] || '').trim()
  })
  return payload
}

const handleSave = async () => {
  if (!guardAdminMobileWrite()) return
  if (!formRef.value) return
  await formRef.value.validate()
  const payload = toPayload()
  const actionLabel = editingId.value ? '更新行业模板' : '新增行业模板'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}预览`,
    action: `${actionLabel}「${payload.industryName}」`,
    target: `行业编码：${payload.industryCode || '-'}；目标岗位：${payload.targetPositions || '-'}；状态：${payload.enabled === 1 ? '启用' : '停用'}`,
    impact: '行业模板保存后会影响岗位描述解析、岗位画像、推荐提示和行业上下文匹配。',
    rollback: editingId.value
      ? '可再次编辑行业模板；已产生的 AI 输出、岗位画像和推荐结果不会自动回到修改前。'
      : '如新增错误，可在确认没有业务依赖后停用或删除该模板。',
    audit: '行业模板保存会记录操作人、行业编码、模板名称和时间，便于审计配置变更。',
    tips: ['确认关键技能、面试重点、风险点和提示上下文已复核。', '确认目标岗位范围不会误导岗位描述解析或推荐。'],
    confirmButtonText: '确认保存'
  })
  if (!confirmed) return
  saving.value = true
  try {
    if (editingId.value) {
      await updateAdminIndustryTemplateApi(editingId.value, payload)
    } else {
      await createAdminIndustryTemplateApi(payload)
    }
    ElMessage.success('行业模板已保存')
    dialogVisible.value = false
    await fetchTemplates()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '行业模板保存失败，请检查内容后重试。'))
  } finally {
    saving.value = false
  }
}

const handleToggle = async (row: IndustryTemplateVO) => {
  if (!guardAdminMobileWrite()) return
  const nextEnabled = row.enabled === 1 ? 0 : 1
  const actionLabel = nextEnabled === 1 ? '启用' : '禁用'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}行业模板预览`,
    action: `${actionLabel}行业模板「${row.industryName}」`,
    target: `模板编号：${row.industryTemplateId}；行业编码：${row.industryCode || '-'}；目标岗位：${row.targetPositions || '-'}`,
    impact:
      nextEnabled === 1
        ? '该模板会重新进入行业上下文候选范围，后续岗位描述解析、岗位画像和推荐提示可能使用该行业配置。'
        : '该模板会退出可用范围，依赖该行业配置的岗位画像、岗位描述解析提示和推荐上下文可能改用通用配置或暂时不可用。',
    rollback: `可在行业模板页再次${nextEnabled === 1 ? '禁用' : '启用'}该模板；已产生的 AI 输出和推荐结果不会自动回到变更前。`,
    audit: '行业模板启停会记录操作人、模板编号、行业编码、目标状态和时间，便于审计配置变更。',
    tips: ['确认该行业模板不是当前主推岗位方向唯一可用模板。', '确认模板启停不会影响正在排查的岗位描述解析或推荐异常。'],
    confirmButtonText: `确认${actionLabel}`
  })
  if (!confirmed) return
  try {
    if (nextEnabled === 0) {
      await disableAdminIndustryTemplateApi(row.industryTemplateId)
      ElMessage.success('行业模板已禁用')
    } else {
      await enableAdminIndustryTemplateApi(row.industryTemplateId)
      ElMessage.success('行业模板已启用')
    }
    await fetchTemplates()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, `${actionLabel}行业模板失败，请稍后重试。`))
  }
}

const handleDelete = async (row: IndustryTemplateVO) => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmDangerActionPreview({
    title: '删除行业模板预览',
    action: `删除行业模板「${row.industryName}」`,
    target: `模板编号：${row.industryTemplateId}；行业编码：${row.industryCode || '-'}；目标岗位：${row.targetPositions || '-'}`,
    impact: '该模板会从行业模板列表移除，依赖该行业配置的岗位画像、岗位描述解析提示和推荐上下文可能受到影响。',
    rollback: '删除后无法直接恢复该行业模板；误删后需要重新创建行业模板并补齐行业配置。',
    audit: '删除行业模板会记录操作人、模板编号、行业编码和时间，便于审计。',
    tips: ['确认不是只需要禁用模板。', '确认已备份行业关键技能、面试重点和风险点配置。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  try {
    await deleteAdminIndustryTemplateApi(row.industryTemplateId)
    ElMessage.success('行业模板已删除')
    await fetchTemplates()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '行业模板删除失败，请稍后重试。'))
  }
}

onMounted(fetchTemplates)
</script>

<style scoped lang="scss">
.filter-form {
  width: 100%;
}

.table-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 8px;

  h2 {
    margin: 0 0 6px;
    color: var(--cc-text);
    font-size: 18px;
  }

  p {
    margin: 0;
    color: var(--cc-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.table-view-tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

:global(.column-config-menu) {
  min-width: 168px;
}

:global(.column-config-menu .el-dropdown-menu__item) {
  min-width: 148px;
}

.template-detail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 16px 48px;

  span {
    display: block;
    margin-bottom: 6px;
    color: var(--cc-text-muted);
    font-size: 13px;
  }

  p,
  pre {
    min-height: 42px;
    margin: 0;
    padding: 10px 12px;
    border: 1px solid var(--cc-border);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.62);
    color: var(--cc-text);
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.template-detail__wide {
  grid-column: 1 / -1;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

@media (max-width: 768px) {
  .table-card__header {
    flex-direction: column;
  }

  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }

  .template-detail,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
