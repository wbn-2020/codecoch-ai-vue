<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <MessageSquareCode :size="16" />
          <span>Prompt Engineering</span>
        </div>
        <h1 class="admin-hero__title">Prompt 模板治理</h1>
        <p class="admin-hero__desc">
          维护面试提问、答案评分、动态追问和报告生成模板。当前保留模板真实 CRUD，
          Prompt 内容变更已收敛到版本 API，版本管理与测试面板已接入。
        </p>
      </div>
      <el-button type="primary" @click="openDialog()">
        <Plus :size="16" />
        新增模板
      </el-button>
    </section>

    <div class="admin-insight-grid">
      <article class="admin-insight-card">
        <span>模板总数</span>
        <strong>{{ total }}</strong>
        <small>来自 Prompt 列表接口 total</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页启用</span>
        <strong>{{ enabledCount }}</strong>
        <small>仅统计当前页记录</small>
      </article>
      <article class="admin-insight-card">
        <span>场景类型</span>
        <strong>{{ sceneCount }}</strong>
        <small>仅统计当前页记录</small>
      </article>
      <article class="admin-insight-card">
        <span>版本治理</span>
        <strong>闭环已接入</strong>
        <small>版本列表、切换与测试均走真实接口</small>
      </article>
    </div>

    <section class="admin-panel">
      <div class="admin-panel__header admin-panel__header--toolbar">
        <div>
          <h2>模板列表</h2>
          <p>搜索、启停、新增、编辑、删除均复用现有 Prompt 管理接口。</p>
        </div>
      </div>

      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="名称 / 编码" />
          </el-form-item>
          <el-form-item label="场景类型">
            <el-select v-model="query.scene" clearable placeholder="全部类型" style="width: 220px">
              <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
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

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="prompts" row-key="id">
          <el-table-column prop="promptName" label="模板名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="templateCode" label="模板编码" min-width="220" show-overflow-tooltip />
          <el-table-column label="场景类型" min-width="210">
            <template #default="{ row }">
              <el-tag type="primary" effect="plain">{{ getSceneLabel(row.promptType || row.scene) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="版本" width="100">
            <template #default="{ row }">{{ row.version || 'V1' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="170">
            <template #default="{ row }">{{ row.updatedAt || row.updateTime || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="320" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openVersionDrawer(row)">版本管理</el-button>
              <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
              <el-button link type="primary" @click="openTemplateCallLogs(row)">调用记录</el-button>
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
          @change="fetchPrompts"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑 Prompt 模板' : '新增 Prompt 模板'" width="820px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="112px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model.trim="form.name" />
        </el-form-item>
        <el-form-item label="模板类型" prop="scene">
          <el-select v-model="form.scene" style="width: 100%">
            <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="9"
            :readonly="Boolean(editingId)"
            :placeholder="editingId ? 'Prompt 内容请通过版本管理新增版本修改' : '请输入模板内容'"
          />
          <div v-if="editingId" class="field-note">
            Prompt 内容请通过版本管理新增版本修改，本次保存只更新名称、类型、描述和状态。
          </div>
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
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="versionDrawerVisible" size="880px" destroy-on-close class="version-drawer">
      <template #header>
        <div class="drawer-head">
          <div>
            <p>Prompt Version Control</p>
            <h2>{{ currentPrompt?.promptName || currentPrompt?.name || '版本管理' }}</h2>
          </div>
          <el-tag effect="plain">{{ getSceneLabel(currentPrompt?.promptType || currentPrompt?.scene || '') }}</el-tag>
        </div>
      </template>

      <section class="version-create-panel">
        <div class="version-section-head">
          <div>
            <h3>创建新版本</h3>
            <p>Prompt 内容变更通过版本 API 提交，创建后可在下方激活为当前生效版本。</p>
          </div>
        </div>
        <el-form ref="versionFormRef" :model="versionForm" :rules="versionRules" label-position="top">
          <div class="version-form-grid">
            <el-form-item label="版本号" prop="versionCode">
              <el-input v-model.trim="versionForm.versionCode" placeholder="例如：v2" />
            </el-form-item>
            <el-form-item label="版本名称">
              <el-input v-model.trim="versionForm.versionName" placeholder="例如：强化项目追问" />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="versionForm.status" style="width: 100%">
                <el-option label="草稿" value="DRAFT" />
                <el-option label="停用" value="INACTIVE" />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item label="Prompt 内容" prop="content">
            <el-input v-model="versionForm.content" type="textarea" :rows="7" placeholder="请输入新版本 Prompt 内容" />
          </el-form-item>
          <el-form-item label="变更说明">
            <el-input v-model="versionForm.changeLog" type="textarea" :rows="2" placeholder="可选：说明本次版本调整原因" />
          </el-form-item>
          <div class="version-actions">
            <el-button @click="resetVersionForm">重置</el-button>
            <el-button type="primary" :loading="versionSaving" @click="handleCreateVersion">创建版本</el-button>
          </div>
        </el-form>
      </section>

      <section class="version-list-panel">
        <div class="version-section-head">
          <div>
            <h3>版本列表</h3>
            <p>展示后端返回版本状态，不伪造灰度、Diff 或测试结果。</p>
          </div>
          <div class="version-toolbar">
            <el-button v-if="currentPrompt" @click="openTemplateCallLogs(currentPrompt)">模板调用记录</el-button>
            <el-button :loading="versionLoading" @click="fetchVersions">刷新</el-button>
          </div>
        </div>

        <el-table v-loading="versionLoading" :data="versions" row-key="id">
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="version-content-preview">
                <strong>Prompt 内容预览</strong>
                <pre>{{ row.content || '暂无内容' }}</pre>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="versionCode" label="版本号" width="110" />
          <el-table-column prop="versionName" label="版本名称" min-width="140" show-overflow-tooltip />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="versionStatusType(row.status)" effect="plain">{{ versionStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Active" width="90">
            <template #default="{ row }">
              <el-tag v-if="row.isActive === 1" type="success" effect="plain">Active</el-tag>
              <span v-else class="muted-text">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="changeLog" label="变更说明" min-width="160" show-overflow-tooltip />
          <el-table-column label="更新时间" width="170">
            <template #default="{ row }">{{ row.updatedAt || row.createdAt || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="300" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openTestDialog(row)">测试</el-button>
              <el-button v-if="canActivateVersion(row)" link type="primary" @click="handleActivateVersion(row)">激活</el-button>
              <el-button v-if="canRollbackVersion(row)" link type="primary" @click="handleRollbackVersion(row)">回滚</el-button>
              <el-button v-else-if="isVersionActive(row)" link disabled title="当前已是激活版本">回滚</el-button>
              <el-button v-if="canDisableVersion(row)" link type="warning" @click="handleDisableVersion(row)">禁用</el-button>
              <el-button link type="primary" @click="openVersionCallLogs(row)">调用记录</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!versionLoading && !versions.length" description="暂无版本记录，请先创建新版本" />
        <div v-if="versionPagination.total > versionPagination.pageSize" class="pagination-wrap">
          <el-pagination
            v-model:current-page="versionQuery.pageNo"
            v-model:page-size="versionQuery.pageSize"
            background
            layout="total, prev, pager, next"
            :total="versionPagination.total"
            @change="fetchVersions"
          />
        </div>
      </section>
    </el-drawer>

    <el-dialog v-model="testDialogVisible" title="Prompt 版本测试" width="920px" destroy-on-close class="prompt-test-dialog">
      <section class="test-version-card">
        <div>
          <span>当前版本</span>
          <strong>{{ testingVersion?.versionCode || '-' }}</strong>
        </div>
        <div>
          <span>版本名称</span>
          <strong>{{ testingVersion?.versionName || '-' }}</strong>
        </div>
        <div>
          <span>状态</span>
          <el-tag v-if="testingVersion" :type="versionStatusType(testingVersion.status)" effect="plain">
            {{ versionStatusText(testingVersion.status) }}
          </el-tag>
          <strong v-else>-</strong>
        </div>
      </section>

      <el-alert
        class="test-mode-alert"
        type="warning"
        show-icon
        :closable="false"
        title="callAi=false 只渲染 Prompt；callAi=true 可能真实调用 AI 并写入 AI 调用日志。"
      />

      <el-form label-position="top">
        <el-form-item label="inputVariables JSON">
          <el-input v-model="testInputJson" type="textarea" :rows="8" placeholder='例如：{"position":"Java 后端工程师"}' />
        </el-form-item>
        <el-form-item label="是否调用 AI">
          <el-switch v-model="testCallAi" active-text="callAi=true" inactive-text="callAi=false" />
        </el-form-item>
      </el-form>

      <section v-if="testResult" class="test-result-panel">
        <div class="version-section-head">
          <div>
            <h3>测试结果</h3>
            <p>展示接口真实返回的渲染内容、AI 响应和调用日志信息。</p>
          </div>
        </div>
        <div class="test-result-grid">
          <article>
            <span>aiCallLogId</span>
            <strong>{{ testResult.aiCallLogId || '暂无调用日志' }}</strong>
          </article>
          <article>
            <span>mockMode</span>
            <strong>{{ formatNullableBoolean(testResult.mockMode) }}</strong>
          </article>
        </div>
        <div class="version-content-preview">
          <strong>renderedPrompt</strong>
          <pre>{{ testResult.renderedPrompt || '暂无渲染结果' }}</pre>
        </div>
        <div class="version-content-preview">
          <strong>aiResponse</strong>
          <pre>{{ testResult.aiResponse || '未调用 AI 或暂无 AI 响应' }}</pre>
        </div>
        <div class="version-content-preview">
          <strong>inputVariables</strong>
          <pre>{{ formatJson(testResult.inputVariables || {}) }}</pre>
        </div>
      </section>

      <template #footer>
        <el-button @click="testDialogVisible = false">关闭</el-button>
        <el-button type="primary" :loading="testLoading" @click="handleTestVersion">执行测试</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="callLogDrawerVisible" size="1080px" destroy-on-close class="call-log-drawer">
      <template #header>
        <div class="drawer-head">
          <div>
            <p>Prompt Call Logs</p>
            <h2>{{ callLogTitle }}</h2>
          </div>
          <el-tag effect="plain">{{ callLogScope === 'template' ? '模板' : '版本' }}</el-tag>
        </div>
      </template>

      <section class="version-list-panel">
        <div class="version-section-head">
          <div>
            <h3>调用记录</h3>
            <p>仅展示后端真实日志；历史日志可能未写入 Prompt 模板或版本字段。</p>
          </div>
        </div>
        <el-form :model="callLogQuery" inline class="call-log-filter">
          <el-form-item label="success">
            <el-select v-model="callLogQuery.success" clearable placeholder="全部" style="width: 130px">
              <el-option label="成功" :value="true" />
              <el-option label="失败" :value="false" />
            </el-select>
          </el-form-item>
          <el-form-item label="scene">
            <el-select v-model="callLogQuery.scene" clearable placeholder="全部场景" style="width: 240px">
              <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleCallLogSearch">查询</el-button>
            <el-button @click="handleCallLogReset">重置</el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="callLogLoading" :data="callLogs" row-key="id">
          <el-table-column prop="id" label="ID" width="90" />
          <el-table-column label="scene" min-width="190" show-overflow-tooltip>
            <template #default="{ row }">{{ row.scene || row.callType || '-' }}</template>
          </el-table-column>
          <el-table-column prop="businessId" label="businessId" min-width="150" show-overflow-tooltip />
          <el-table-column prop="modelName" label="modelName" min-width="150" show-overflow-tooltip />
          <el-table-column label="success" width="100">
            <template #default="{ row }">
              <el-tag :type="isCallLogSuccess(row) ? 'success' : 'danger'" effect="plain">
                {{ isCallLogSuccess(row) ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="promptVersion" label="promptVersion" min-width="130" show-overflow-tooltip />
          <el-table-column prop="promptTemplateId" label="templateId" width="120" />
          <el-table-column prop="promptTemplateVersionId" label="versionId" width="120" />
          <el-table-column label="tokens" min-width="170">
            <template #default="{ row }">{{ formatTokens(row) }}</template>
          </el-table-column>
          <el-table-column label="cost" width="110">
            <template #default="{ row }">{{ row.costTimeMs ?? row.duration ?? row.elapsedMs ?? row.latencyMs ?? '-' }}</template>
          </el-table-column>
          <el-table-column prop="errorMessage" label="errorMessage" min-width="180" show-overflow-tooltip />
          <el-table-column prop="createdAt" label="createdAt" min-width="170" show-overflow-tooltip />
        </el-table>
        <el-empty
          v-if="!callLogLoading && !callLogs.length"
          description="暂无调用记录，历史日志可能未写入 Prompt 版本字段"
        />
        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="callLogQuery.pageNo"
            v-model:page-size="callLogQuery.pageSize"
            background
            layout="total, sizes, prev, pager, next"
            :total="callLogTotal"
            :page-sizes="[10, 20, 50]"
            @change="fetchCallLogs"
          />
        </div>
      </section>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MessageSquareCode, Plus } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  activatePromptTemplateVersionApi,
  createAdminAiPromptApi,
  createPromptTemplateVersionApi,
  deleteAdminAiPromptApi,
  getAdminAiPromptsApi,
  getPromptTemplateCallLogsApi,
  getPromptTemplateVersionCallLogsApi,
  getPromptTemplateVersionsApi,
  disablePromptTemplateVersionApi,
  rollbackPromptTemplateVersionApi,
  testPromptTemplateVersionApi,
  updateAdminAiPromptApi,
  updateAdminAiPromptStatusApi
} from '@/api/aiAdmin'
import StatusTag from '@/components/common/StatusTag.vue'
import { AI_SCENE } from '@/constants/enums'
import type {
  AiScene,
  AiCallLogVO,
  CreatePromptTemplateVersionDTO,
  PromptCallLogQueryDTO,
  PromptTemplateDTO,
  PromptTemplateQueryDTO,
  PromptTemplateVersionQuery,
  PromptTemplateVersionVO,
  PromptTemplateVO,
  TestPromptTemplateVersionVO
} from '@/types/ai'

const sceneOptions = [
  { label: '八股文提问模板', value: AI_SCENE.INTERVIEW_QUESTION_GENERATE },
  { label: '项目深挖提问模板', value: AI_SCENE.PROJECT_DEEP_DIVE_QUESTION },
  { label: '回答评分模板', value: AI_SCENE.INTERVIEW_ANSWER_EVALUATE },
  { label: '动态追问模板', value: AI_SCENE.INTERVIEW_FOLLOW_UP_GENERATE },
  { label: '面试报告生成模板', value: AI_SCENE.INTERVIEW_REPORT_GENERATE }
]

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const prompts = ref<PromptTemplateVO[]>([])
const total = ref(0)
const versionDrawerVisible = ref(false)
const versionLoading = ref(false)
const versionSaving = ref(false)
const versionFormRef = ref<FormInstance>()
const currentPrompt = ref<PromptTemplateVO | null>(null)
const versions = ref<PromptTemplateVersionVO[]>([])
const testDialogVisible = ref(false)
const testLoading = ref(false)
const testingVersion = ref<PromptTemplateVersionVO | null>(null)
const testInputJson = ref('{}')
const testCallAi = ref(false)
const testResult = ref<TestPromptTemplateVersionVO | null>(null)
const callLogDrawerVisible = ref(false)
const callLogLoading = ref(false)
const callLogScope = ref<'template' | 'version'>('template')
const callLogTargetId = ref<number | null>(null)
const callLogTitle = ref('')
const callLogs = ref<AiCallLogVO[]>([])
const callLogTotal = ref(0)

const query = reactive<PromptTemplateQueryDTO>({
  keyword: '',
  scene: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const form = reactive<PromptTemplateDTO>({
  scene: AI_SCENE.INTERVIEW_QUESTION_GENERATE,
  name: '',
  content: '',
  status: 1,
  description: ''
})

const versionQuery = reactive<PromptTemplateVersionQuery>({
  status: '',
  isActive: '',
  pageNo: 1,
  pageSize: 10
})

const versionPagination = reactive({
  total: 0,
  pageSize: 10
})

const versionForm = reactive<CreatePromptTemplateVersionDTO>({
  versionCode: '',
  versionName: '',
  content: '',
  status: 'DRAFT',
  changeLog: ''
})

const callLogQuery = reactive<PromptCallLogQueryDTO>({
  success: '',
  scene: '',
  pageNo: 1,
  pageSize: 10
})

const rules = computed<FormRules<PromptTemplateDTO>>(() => ({
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  scene: [{ required: true, message: '请选择模板类型', trigger: 'change' }],
  content: editingId.value ? [] : [{ required: true, message: '请输入模板内容', trigger: 'blur' }]
}))

const versionRules: FormRules<CreatePromptTemplateVersionDTO> = {
  versionCode: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  content: [{ required: true, message: '请输入 Prompt 内容', trigger: 'blur' }]
}

const enabledCount = computed(() => prompts.value.filter((item) => item.status === 1).length)
const sceneCount = computed(() => new Set(prompts.value.map((item) => item.promptType || item.scene).filter(Boolean)).size)

const getSceneLabel = (value?: AiScene | '') => sceneOptions.find((item) => item.value === value)?.label || value || '-'

const fetchPrompts = async () => {
  loading.value = true
  try {
    const result = await getAdminAiPromptsApi(query)
    prompts.value = result.records || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

const resetVersionForm = () => {
  Object.assign(versionForm, {
    versionCode: '',
    versionName: '',
    content: '',
    status: 'DRAFT',
    changeLog: ''
  })
  versionFormRef.value?.clearValidate()
}

const fetchVersions = async () => {
  if (!currentPrompt.value?.id) return
  versionLoading.value = true
  try {
    const result = await getPromptTemplateVersionsApi(currentPrompt.value.id, versionQuery)
    versions.value = result.records || []
    versionPagination.total = result.total || 0
    versionPagination.pageSize = result.pageSize || versionQuery.pageSize || 10
  } finally {
    versionLoading.value = false
  }
}

const applyPrompt = (prompt?: PromptTemplateVO) => {
  Object.assign(form, {
    name: prompt?.promptName || prompt?.name || '',
    scene: prompt?.promptType || prompt?.scene || AI_SCENE.INTERVIEW_QUESTION_GENERATE,
    content: prompt?.templateContent || prompt?.content || '',
    status: prompt?.status ?? 1,
    description: prompt?.description || ''
  })
}

const openDialog = (row?: PromptTemplateVO) => {
  editingId.value = row?.id || null
  applyPrompt(row)
  dialogVisible.value = true
}

const openVersionDrawer = async (row: PromptTemplateVO) => {
  currentPrompt.value = row
  versionQuery.pageNo = 1
  resetVersionForm()
  versionDrawerVisible.value = true
  await fetchVersions()
}

const resetCallLogQuery = () => {
  Object.assign(callLogQuery, {
    success: '',
    scene: '',
    pageNo: 1,
    pageSize: 10
  })
}

const fetchCallLogs = async () => {
  if (!callLogTargetId.value) return
  callLogLoading.value = true
  try {
    const api =
      callLogScope.value === 'template'
        ? getPromptTemplateCallLogsApi
        : getPromptTemplateVersionCallLogsApi
    const result = await api(callLogTargetId.value, callLogQuery)
    callLogs.value = result.records || []
    callLogTotal.value = result.total || 0
  } catch {
    ElMessage.error('调用记录查询失败，不影响 Prompt 版本管理主功能')
  } finally {
    callLogLoading.value = false
  }
}

const openTemplateCallLogs = async (row: PromptTemplateVO) => {
  callLogScope.value = 'template'
  callLogTargetId.value = row.id
  callLogTitle.value = `${row.promptName || row.name || 'Prompt 模板'} 调用记录`
  resetCallLogQuery()
  callLogDrawerVisible.value = true
  await fetchCallLogs()
}

const openVersionCallLogs = async (row: PromptTemplateVersionVO) => {
  callLogScope.value = 'version'
  callLogTargetId.value = row.id
  callLogTitle.value = `${row.versionCode || row.id} 调用记录`
  resetCallLogQuery()
  callLogDrawerVisible.value = true
  await fetchCallLogs()
}

const handleCallLogSearch = () => {
  callLogQuery.pageNo = 1
  fetchCallLogs()
}

const handleCallLogReset = () => {
  resetCallLogQuery()
  fetchCallLogs()
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (editingId.value) {
      await updateAdminAiPromptApi(editingId.value, form)
    } else {
      await createAdminAiPromptApi(form)
    }
    ElMessage.success('Prompt 模板已保存')
    dialogVisible.value = false
    await fetchPrompts()
  } finally {
    saving.value = false
  }
}

const handleCreateVersion = async () => {
  if (!versionFormRef.value || !currentPrompt.value?.id) return
  await versionFormRef.value.validate()
  versionSaving.value = true
  try {
    await createPromptTemplateVersionApi(currentPrompt.value.id, {
      versionCode: versionForm.versionCode,
      versionName: versionForm.versionName || undefined,
      content: versionForm.content,
      status: versionForm.status || 'DRAFT',
      changeLog: versionForm.changeLog || undefined
    })
    ElMessage.success('Prompt 版本已创建')
    resetVersionForm()
    await fetchVersions()
  } finally {
    versionSaving.value = false
  }
}

const openTestDialog = (row: PromptTemplateVersionVO) => {
  testingVersion.value = row
  testInputJson.value = '{}'
  testCallAi.value = false
  testResult.value = null
  testDialogVisible.value = true
}

const parseInputVariables = () => {
  let parsed: unknown
  try {
    parsed = JSON.parse(testInputJson.value || '{}')
  } catch {
    ElMessage.error('inputVariables 必须是合法 JSON 对象')
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    ElMessage.error('inputVariables 只接受对象结构')
    return null
  }
  const entries = Object.entries(parsed)
  if (entries.some(([, value]) => typeof value !== 'string')) {
    ElMessage.error('inputVariables 的变量值必须是字符串')
    return null
  }
  return Object.fromEntries(entries) as Record<string, string>
}

const handleTestVersion = async () => {
  if (!testingVersion.value?.id) return
  const inputVariables = parseInputVariables()
  if (!inputVariables) return
  testLoading.value = true
  try {
    testResult.value = await testPromptTemplateVersionApi(testingVersion.value.id, {
      inputVariables,
      callAi: testCallAi.value
    })
    ElMessage.success('Prompt 版本测试完成')
  } catch {
    ElMessage.error('测试失败，请稍后重试')
  } finally {
    testLoading.value = false
  }
}

const isVersionActive = (row: PromptTemplateVersionVO) => row.isActive === 1 || row.status === 'ACTIVE'

const canActivateVersion = (row: PromptTemplateVersionVO) => !isVersionActive(row)

const canDisableVersion = (row: PromptTemplateVersionVO) => !isVersionActive(row) && row.status !== 'DISABLED'

const canRollbackVersion = (row: PromptTemplateVersionVO) => !isVersionActive(row) && row.status !== 'DISABLED'

const handleActivateVersion = async (row: PromptTemplateVersionVO) => {
  let changeLog: string | undefined
  try {
    const { value } = await ElMessageBox.prompt('可选：填写激活说明', `激活版本 ${row.versionCode}`, {
      confirmButtonText: '激活',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：上线优化后的 Prompt'
    })
    changeLog = value || undefined
  } catch {
    return
  }
  try {
    await activatePromptTemplateVersionApi(row.id, { changeLog })
    ElMessage.success('Prompt 版本已激活')
    await fetchVersions()
    await fetchPrompts()
  } catch {
    ElMessage.error('激活失败，请稍后重试')
  }
}

const handleRollbackVersion = async (row: PromptTemplateVersionVO) => {
  if (isVersionActive(row)) {
    ElMessage.warning('当前已是激活版本')
    return
  }
  if (row.status === 'DISABLED') {
    ElMessage.warning('已禁用版本不能回滚')
    return
  }
  let changeLog: string | undefined
  try {
    const { value } = await ElMessageBox.prompt(
      '回滚等价于激活该历史版本，会切换当前模板 activeVersion。可选填写回滚原因。',
      `回滚版本 ${row.versionCode}`,
      {
        confirmButtonText: '确认回滚',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：恢复线上稳定 Prompt'
      }
    )
    changeLog = value || undefined
  } catch {
    return
  }
  try {
    await rollbackPromptTemplateVersionApi(row.id, { changeLog })
    ElMessage.success('Prompt 版本已回滚')
    await fetchVersions()
    await fetchPrompts()
  } catch {
    ElMessage.error('回滚失败，请稍后重试')
  }
}

const handleDisableVersion = async (row: PromptTemplateVersionVO) => {
  if (isVersionActive(row)) {
    ElMessage.warning('当前激活版本不能直接禁用')
    return
  }
  let changeLog: string | undefined
  try {
    const { value } = await ElMessageBox.prompt('可选：填写禁用说明', `禁用版本 ${row.versionCode}`, {
      confirmButtonText: '禁用',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：版本内容过期'
    })
    changeLog = value || undefined
  } catch {
    return
  }
  try {
    await disablePromptTemplateVersionApi(row.id, { changeLog })
    ElMessage.success('Prompt 版本已禁用')
    await fetchVersions()
  } catch {
    ElMessage.error('禁用失败，请稍后重试')
  }
}

const handleStatus = async (row: PromptTemplateVO) => {
  const nextStatus = row.status === 1 ? 0 : 1
  await updateAdminAiPromptStatusApi(row.id, nextStatus)
  ElMessage.success(nextStatus === 1 ? 'Prompt 模板已启用' : 'Prompt 模板已禁用')
  await fetchPrompts()
}

const handleDelete = async (row: PromptTemplateVO) => {
  await ElMessageBox.confirm(`确认删除 Prompt 模板 ${row.promptName || row.name}？`, '删除确认', {
    type: 'warning'
  })
  await deleteAdminAiPromptApi(row.id)
  ElMessage.success('Prompt 模板已删除')
  await fetchPrompts()
}

const handleSearch = () => {
  query.pageNo = 1
  fetchPrompts()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    scene: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchPrompts()
}

const versionStatusText = (status?: string) => {
  const value = String(status || '').toUpperCase()
  const map: Record<string, string> = {
    DRAFT: '草稿',
    ACTIVE: '已激活',
    INACTIVE: '未激活',
    DISABLED: '已禁用'
  }
  return map[value] || status || '-'
}

const versionStatusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (value === 'ACTIVE') return 'success'
  if (value === 'DISABLED') return 'danger'
  if (value === 'DRAFT') return 'warning'
  return 'info'
}

const formatJson = (value: unknown) => JSON.stringify(value, null, 2)

const formatNullableBoolean = (value?: boolean) => {
  if (typeof value !== 'boolean') return '-'
  return value ? 'true' : 'false'
}

const isCallLogSuccess = (row: AiCallLogVO) => {
  if (typeof row.status === 'number') return row.status === 1
  return ['SUCCESS', 'SUCCEEDED', 'true', '1'].includes(String(row.status).toUpperCase())
}

const formatTokens = (row: AiCallLogVO) => {
  const prompt = row.promptTokens ?? row.inputTokens ?? '-'
  const completion = row.completionTokens ?? row.outputTokens ?? '-'
  const totalTokens = row.totalTokens ?? '-'
  return `${prompt} / ${completion} / ${totalTokens}`
}

onMounted(fetchPrompts)
</script>

<style scoped lang="scss">
.field-note {
  margin-top: 8px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  p {
    margin: 0 0 6px;
    color: var(--app-text-muted);
    font-size: 12px;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    color: var(--app-text-primary);
    font-size: 20px;
    font-weight: 700;
  }
}

.version-create-panel,
.version-list-panel,
.test-result-panel {
  margin-bottom: 18px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
}

.version-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;

  h3 {
    margin: 0 0 6px;
    color: var(--app-text-primary);
    font-size: 16px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.version-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.version-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.version-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.call-log-filter {
  margin-bottom: 16px;
}

.version-content-preview {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.68);

  strong {
    display: block;
    margin-bottom: 10px;
    color: var(--app-text-primary);
    font-size: 13px;
  }

  pre {
    max-height: 260px;
    margin: 0;
    overflow: auto;
    color: var(--app-text-secondary);
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    font-size: 12px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.muted-text {
  color: var(--app-text-muted);
  font-size: 12px;
}

.test-version-card,
.test-result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;

  div,
  article {
    padding: 14px;
    border: 1px solid var(--app-border);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.72);
  }

  span {
    display: block;
    margin-bottom: 6px;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    color: var(--app-text-primary);
    font-size: 14px;
  }
}

.test-result-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.test-mode-alert {
  margin-bottom: 16px;
}

@media (max-width: 760px) {
  .version-form-grid,
  .test-version-card,
  .test-result-grid {
    grid-template-columns: 1fr;
  }
}
</style>
