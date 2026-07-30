<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><Megaphone :size="16" /><span>公告运营</span></div>
        <h1 class="admin-hero__title">公告管理</h1>
        <p class="admin-hero__desc">维护系统公告草稿、发布状态和可见范围，发布前必须完成风险预览确认。</p>
      </div>
      <div class="admin-hero__actions">
        <el-button
          v-permission="'admin:announcement:write'"
          type="primary"
          :disabled="isAdminMobileReadonly"
          :title="mobileReadonlyTitle()"
          @click="openDialog()"
        >新建公告</el-button>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>公告列表</h2>
          <p>按状态和关键词筛选公告，支持草稿编辑、发布、下线和删除。</p>
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

      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="标题 / 内容" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 140px">
              <el-option label="草稿" :value="0" />
              <el-option label="已发布" :value="1" />
              <el-option label="已下线" :value="2" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="announcements" row-key="id" :size="tableSize">
          <el-table-column v-if="isColumnVisible('id')" prop="id" label="公告编号" width="100" />
          <el-table-column v-if="isColumnVisible('title')" prop="title" label="标题" min-width="220" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('type')" label="类型" width="120">
            <template #default="{ row }">
              <el-tag effect="plain">{{ formatAnnouncementType(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="announcementStatusType(row.status)" effect="plain">
                {{ announcementStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('targetUsers')" prop="targetUsers" label="可见范围" min-width="160" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('content')" prop="content" label="内容" min-width="260" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('publishedAt')" label="发布时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.publishedAt) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('expiredAt')" label="过期时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.expiredAt) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('updatedAt')" label="更新时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button
                  v-permission="'admin:announcement:write'"
                  link
                  type="primary"
                  :disabled="isAdminMobileReadonly"
                  :title="mobileReadonlyTitle()"
                  @click="openDialog(row)"
                >编辑</el-button>
                <el-button
                  v-if="row.status !== 1"
                  v-permission="'admin:announcement:publish'"
                  link
                  type="success"
                  :loading="actionLoadingKey === `publish-${row.id}`"
                  :disabled="isAdminMobileReadonly"
                  :title="mobileReadonlyTitle()"
                  @click="handlePublish(row)"
                >发布</el-button>
                <el-button
                  v-else
                  v-permission="'admin:announcement:publish'"
                  link
                  type="warning"
                  :loading="actionLoadingKey === `offline-${row.id}`"
                  :disabled="isAdminMobileReadonly"
                  :title="mobileReadonlyTitle()"
                  @click="handleOffline(row)"
                >下线</el-button>
                <el-button
                  v-permission="'admin:announcement:write'"
                  link
                  type="danger"
                  :loading="actionLoadingKey === `delete-${row.id}`"
                  :disabled="isAdminMobileReadonly"
                  :title="mobileReadonlyTitle()"
                  @click="handleDelete(row)"
                >删除</el-button>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <AppState
              :type="announcementError ? 'error' : 'empty'"
              :title="announcementError ? '公告列表加载失败' : announcementEmptyTitle"
              :description="announcementError || announcementEmptyDescription"
            >
              <el-button type="primary" @click="announcementError ? fetchAnnouncements() : handleReset()">
                {{ announcementError ? '重新加载' : hasAnnouncementFilters ? '清空筛选' : '刷新列表' }}
              </el-button>
            </AppState>
          </template>
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
          @change="fetchAnnouncements"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑公告' : '新建公告'" width="680px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="标题" prop="title">
          <el-input v-model.trim="form.title" maxlength="80" show-word-limit />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="普通公告" value="NORMAL" />
            <el-option label="维护公告" value="MAINTENANCE" />
            <el-option label="活动公告" value="ACTIVITY" />
            <el-option label="安全公告" value="SECURITY" />
          </el-select>
        </el-form-item>
        <el-form-item label="可见范围">
          <el-input v-model.trim="form.targetUsers" placeholder="ALL 或用户编号列表，例如 1001,1002" />
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker
            v-model="form.expiredAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="不设置则长期有效"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="6" maxlength="2000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          v-permission="'admin:announcement:write'"
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
import { Megaphone } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  createAdminAnnouncementApi,
  deleteAdminAnnouncementApi,
  getAdminAnnouncementsApi,
  offlineAdminAnnouncementApi,
  publishAdminAnnouncementApi,
  updateAdminAnnouncementApi
} from '@/api/announcement'
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { AnnouncementQueryDTO, AnnouncementSaveDTO, AnnouncementVO } from '@/types/announcement'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'
import { createOperationIdempotencyKey } from '@/utils/idempotency'

type AnnouncementColumnKey =
  | 'id'
  | 'title'
  | 'type'
  | 'status'
  | 'targetUsers'
  | 'content'
  | 'publishedAt'
  | 'expiredAt'
  | 'updatedAt'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<AnnouncementColumnKey>('admin:announcement-manage', [
  { key: 'id', label: '公告编号', defaultVisible: false },
  { key: 'title', label: '标题', required: true },
  { key: 'type', label: '类型' },
  { key: 'status', label: '状态', required: true },
  { key: 'targetUsers', label: '可见范围' },
  { key: 'content', label: '内容', defaultVisible: false },
  { key: 'publishedAt', label: '发布时间' },
  { key: 'expiredAt', label: '过期时间' },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false }
])

const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()
const announcements = ref<AnnouncementVO[]>([])
const total = ref(0)
const announcementError = ref('')
const actionLoadingKey = ref('')

const query = reactive<AnnouncementQueryDTO>({
  keyword: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const createDefaultForm = (): AnnouncementSaveDTO => ({
  title: '',
  content: '',
  type: 'NORMAL',
  targetUsers: 'ALL',
  expiredAt: ''
})

const form = reactive<AnnouncementSaveDTO>(createDefaultForm())

const rules: FormRules<AnnouncementSaveDTO> = {
  title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }]
}

const hasAnnouncementFilters = computed(() => Boolean(query.keyword || query.status !== ''))
const announcementEmptyTitle = computed(() =>
  hasAnnouncementFilters.value ? '当前筛选没有公告记录' : '暂无公告记录'
)
const announcementEmptyDescription = computed(() =>
  hasAnnouncementFilters.value
    ? '公告列表已正常返回空结果。可以清空状态或关键词筛选后重新查看。'
    : '还没有公告草稿或发布记录，可以先新建公告并在确认后发布。'
)

const announcementStatusText = (status?: number) => {
  if (status === 1) return '已发布'
  if (status === 2) return '已下线'
  return '草稿'
}

const announcementStatusType = (status?: number) => {
  if (status === 1) return 'success'
  if (status === 2) return 'warning'
  return 'info'
}

const formatAnnouncementType = (type?: string) => {
  const map: Record<string, string> = {
    NORMAL: '普通公告',
    MAINTENANCE: '维护公告',
    ACTIVITY: '活动公告',
    SECURITY: '安全公告'
  }
  return map[type || 'NORMAL'] || type || '普通公告'
}

const fetchAnnouncements = async () => {
  loading.value = true
  announcementError.value = ''
  try {
    const result = await getAdminAnnouncementsApi(query)
    announcements.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    announcements.value = []
    total.value = 0
    announcementError.value = getErrorMessage(error, '公告列表暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, createDefaultForm())
}

const openDialog = (row?: AnnouncementVO) => {
  if (!guardAdminMobileWrite()) return
  editingId.value = row?.id || null
  Object.assign(form, {
    title: row?.title || '',
    content: row?.content || '',
    type: row?.type || 'NORMAL',
    targetUsers: row?.targetUsers || 'ALL',
    expiredAt: row?.expiredAt || ''
  })
  dialogVisible.value = true
}

const validateForm = async () => {
  if (!formRef.value) return false
  return formRef.value.validate().catch(() => false)
}

const handleSave = async () => {
  if (!guardAdminMobileWrite()) return
  const valid = await validateForm()
  if (!valid) return
  const actionLabel = editingId.value ? '编辑公告' : '新建公告'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}预览`,
    action: `${actionLabel}《${form.title}》`,
    target: `类型：${formatAnnouncementType(form.type)}；可见范围：${form.targetUsers || 'ALL'}；过期时间：${formatDateTime(form.expiredAt)}`,
    impact: '保存公告会影响后台公告草稿内容；发布后会进入用户端公告列表，影响所有符合范围的用户可见内容。',
    rollback: editingId.value
      ? '保存后不会自动保留旧正文；如需恢复，需要根据操作日志或备份重新编辑。'
      : '新建后默认为草稿，可在确认内容无误后再发布。',
    audit: '公告保存会记录操作人、公告编号、标题和时间，便于追踪内容变更。',
    tips: ['确认标题和正文不包含敏感信息。', '确认可见范围和过期时间符合运营预期。'],
    confirmButtonText: '确认保存'
  })
  if (!confirmed) return
  saving.value = true
  try {
    const payload = {
      ...form,
      confirm: true,
      dryRun: false,
      reason: editingId.value
        ? 'Admin confirmed announcement update from announcement management page.'
        : 'Admin confirmed announcement create from announcement management page.',
      idempotencyKey: createOperationIdempotencyKey(
        editingId.value ? `announcement-update-${editingId.value}` : 'announcement-create'
      )
    }
    if (editingId.value) {
      await updateAdminAnnouncementApi(editingId.value, payload)
    } else {
      await createAdminAnnouncementApi(payload)
    }
    ElMessage.success('公告已保存')
    dialogVisible.value = false
    resetForm()
    await fetchAnnouncements()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '公告保存失败，请检查内容后重试。'))
  } finally {
    saving.value = false
  }
}

const runRowAction = async (key: string, action: () => Promise<void>) => {
  actionLoadingKey.value = key
  try {
    await action()
    await fetchAnnouncements()
  } finally {
    actionLoadingKey.value = ''
  }
}

const handlePublish = async (row: AnnouncementVO) => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmDangerActionPreview({
    title: '发布公告预览',
    action: `发布公告《${row.title}》`,
    target: `公告编号：${row.id}；可见范围：${row.targetUsers || 'ALL'}；过期时间：${formatDateTime(row.expiredAt)}`,
    impact: '发布后公告会进入用户端公告列表，对可见范围内用户立即生效。',
    rollback: '如发布错误，可立即下线公告；已经被用户看到的内容无法自动撤回。',
    audit: '公告发布会记录操作人、公告编号和发布时间，便于审计。',
    tips: ['确认公告正文已经复核。', '确认当前不是测试或草稿内容。'],
    confirmButtonText: '确认发布'
  })
  if (!confirmed) return
  await runRowAction(`publish-${row.id}`, async () => {
    await publishAdminAnnouncementApi(row.id, {
      confirm: true,
      dryRun: false,
      reason: 'Admin confirmed announcement publish from announcement management page.',
      idempotencyKey: createOperationIdempotencyKey(`announcement-publish-${row.id}`)
    })
    ElMessage.success('公告已发布')
  })
}

const handleOffline = async (row: AnnouncementVO) => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmDangerActionPreview({
    title: '下线公告预览',
    action: `下线公告《${row.title}》`,
    target: `公告编号：${row.id}；当前状态：${announcementStatusText(row.status)}`,
    impact: '下线后公告会从用户端已发布公告列表移除，用户不再看到该公告。',
    rollback: '如需恢复展示，可重新发布该公告。',
    audit: '公告下线会记录操作人、公告编号和下线时间，便于审计。',
    tips: ['确认公告不再需要继续展示。', '确认没有依赖该公告的运营活动。'],
    confirmButtonText: '确认下线'
  })
  if (!confirmed) return
  await runRowAction(`offline-${row.id}`, async () => {
    await offlineAdminAnnouncementApi(row.id, {
      confirm: true,
      dryRun: false,
      reason: 'Admin confirmed announcement offline from announcement management page.',
      idempotencyKey: createOperationIdempotencyKey(`announcement-offline-${row.id}`)
    })
    ElMessage.success('公告已下线')
  })
}

const handleDelete = async (row: AnnouncementVO) => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmDangerActionPreview({
    title: '删除公告预览',
    action: `删除公告《${row.title}》`,
    target: `公告编号：${row.id}；当前状态：${announcementStatusText(row.status)}`,
    impact: '删除后公告会从后台列表移除，已发布公告也会失去展示来源。',
    rollback: '删除后无法直接恢复，需要重新创建公告并补齐内容。',
    audit: '公告删除会记录操作人、公告编号和删除时间，便于审计。',
    tips: ['确认不是只需要下线公告。', '确认公告内容已无保留需求。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  await runRowAction(`delete-${row.id}`, async () => {
    await deleteAdminAnnouncementApi(row.id, {
      confirm: true,
      dryRun: false,
      reason: 'Admin confirmed announcement delete from announcement management page.',
      idempotencyKey: createOperationIdempotencyKey(`announcement-delete-${row.id}`)
    })
    ElMessage.success('公告已删除')
  })
}

const handleSearch = () => {
  query.pageNo = 1
  fetchAnnouncements()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchAnnouncements()
}

onMounted(fetchAnnouncements)
</script>

<style scoped lang="scss">
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

.admin-row-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
</style>
