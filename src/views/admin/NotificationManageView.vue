<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><Bell :size="16" /><span>通知运营</span></div>
        <h1 class="admin-hero__title">通知管理</h1>
        <p class="admin-hero__desc">查询系统通知，支持定向发送、全站广播和删除。</p>
      </div>
      <div class="admin-hero__actions"><el-button v-permission="'admin:notice:write'" type="primary" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="openDialog()">发送通知</el-button></div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>通知列表</h2>
          <p>支持按类型、发送状态和关键词筛选；可调整表格密度和列显隐，便于排查失败通知和长正文。</p>
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
          <el-form-item label="关键词"><el-input v-model.trim="query.keyword" clearable placeholder="标题 / 内容" /></el-form-item>
          <el-form-item label="类型">
            <el-select v-model="query.type" clearable filterable placeholder="全部类型" style="width: 180px">
              <el-option
                v-for="option in notificationTypeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="发送状态">
            <el-select v-model="query.sendStatus" clearable placeholder="全部状态" style="width: 140px">
              <el-option label="成功" value="SUCCESS" />
              <el-option label="失败" value="FAILED" />
              <el-option label="状态待确认" value="UNKNOWN" />
            </el-select>
          </el-form-item>
          <el-form-item><el-button type="primary" @click="handleSearch">查询</el-button><el-button @click="handleReset">重置</el-button></el-form-item>
        </el-form>
      </div>
      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="notices" row-key="id" :size="tableSize">
          <el-table-column v-if="isColumnVisible('id')" prop="id" label="通知编号" width="100" />
          <el-table-column v-if="isColumnVisible('title')" prop="title" label="标题" min-width="200" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('type')" label="类型" width="130">
            <template #default="{ row }">
              <el-tag effect="plain">{{ formatNotificationType(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('target')" label="目标" width="140"><template #default="{ row }">{{ formatNoticeTarget(row) }}</template></el-table-column>
          <el-table-column v-if="isColumnVisible('content')" prop="content" label="内容" min-width="280" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('sendStatus')" label="发送状态" width="130">
            <template #default="{ row }">
              <el-tooltip v-if="row.sendError" :content="row.sendError" placement="top">
                <el-tag :type="sendStatusType(row.sendStatus)">{{ sendStatusText(row.sendStatus) }}</el-tag>
              </el-tooltip>
              <el-tag v-else :type="sendStatusType(row.sendStatus)">{{ sendStatusText(row.sendStatus) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('sendError')" prop="sendError" label="失败原因" min-width="220" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('sentAt')" label="发送时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.sentAt) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('createdAt')" label="创建时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="110" fixed="right"><template #default="{ row }"><el-button v-permission="'admin:notice:write'" link type="danger" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="handleDelete(row)">删除</el-button></template></el-table-column>
          <template #empty>
            <AppState
              :type="noticeError ? 'error' : 'empty'"
              :title="noticeError ? '通知列表加载失败' : noticeEmptyTitle"
              :description="noticeError || noticeEmptyDescription"
            >
              <el-button type="primary" @click="noticeError ? fetchNotices() : handleReset()">
                {{ noticeError ? '重新加载' : hasNoticeFilters ? '清空筛选' : '刷新列表' }}
              </el-button>
            </AppState>
          </template>
        </el-table>
      </div>
      <div class="pagination-wrap">
        <el-pagination v-model:current-page="query.pageNo" v-model:page-size="query.pageSize" background layout="total, sizes, prev, pager, next" :total="total" :page-sizes="[10, 20, 50]" @change="fetchNotices" />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" title="发送通知" width="620px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="标题" prop="title"><el-input v-model.trim="form.title" /></el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" filterable placeholder="请选择通知类型" style="width: 100%">
            <el-option
              v-for="option in notificationTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标" prop="targetType">
          <el-radio-group v-model="form.targetType"><el-radio-button label="ALL">全员广播</el-radio-button><el-radio-button label="USER">指定用户</el-radio-button></el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.targetType === 'USER'" label="用户编号" prop="targetUserId"><el-input-number v-model="form.targetUserId" :min="1" controls-position="right" /></el-form-item>
        <el-form-item label="内容" prop="content"><el-input v-model="form.content" type="textarea" :rows="5" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button v-permission="'admin:notice:write'" type="primary" :loading="saving" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="handleSend">发送</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Bell } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { broadcastAdminNotificationApi, deleteAdminNotificationApi, getAdminNotificationsApi, sendAdminNotificationApi } from '@/api/adminGovernance'
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { AdminListQuery, AdminNotificationVO, NotificationSendDTO } from '@/types/adminGovernance'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime, formatNotificationType, notificationTypeLabels } from '@/utils/format'

type NotificationColumnKey =
  | 'id'
  | 'title'
  | 'type'
  | 'target'
  | 'content'
  | 'sendStatus'
  | 'sendError'
  | 'sentAt'
  | 'createdAt'

const route = useRoute()
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const notices = ref<AdminNotificationVO[]>([])
const total = ref(0)
const noticeError = ref('')
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()
const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<NotificationColumnKey>('admin:notification-manage', [
  { key: 'id', label: '通知编号', defaultVisible: false },
  { key: 'title', label: '标题', required: true },
  { key: 'type', label: '类型' },
  { key: 'target', label: '目标' },
  { key: 'content', label: '内容', defaultVisible: false },
  { key: 'sendStatus', label: '发送状态', required: true },
  { key: 'sendError', label: '失败原因' },
  { key: 'sentAt', label: '发送时间' },
  { key: 'createdAt', label: '创建时间', defaultVisible: false }
])
const notificationTypeOptions = Object.entries(notificationTypeLabels).map(([value, label]) => ({ value, label }))
const query = reactive<AdminListQuery>({ keyword: '', type: '', sendStatus: '', pageNo: 1, pageSize: 10 })
const form = reactive<NotificationSendDTO>({ title: '', content: '', type: 'SYSTEM', targetType: 'ALL', targetUserId: undefined })
const rules: FormRules<NotificationSendDTO> = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
  type: [{ required: true, message: '请输入类型', trigger: 'blur' }]
}

const hasNoticeFilters = computed(() =>
  Boolean(query.keyword || query.type || query.sendStatus)
)
const noticeEmptyDescription = computed(() =>
  hasNoticeFilters.value
    ? '通知列表已正常返回空结果。可以清空类型、发送状态或关键词筛选后重新查看。'
    : '当前暂无通知记录，可发送通知或稍后刷新列表。'
)
const noticeEmptyTitle = computed(() =>
  hasNoticeFilters.value ? '当前筛选没有通知记录' : '暂无通知记录'
)

const formatNoticeTarget = (row: AdminNotificationVO) => {
  const targetType = String(row.targetType || 'ALL').toUpperCase()
  if (targetType === 'USER') return row.targetUserId ? `指定用户编号 ${row.targetUserId}` : '指定用户'
  return '全员广播'
}

const fetchNotices = async () => {
  loading.value = true
  noticeError.value = ''
  try {
    const result = await getAdminNotificationsApi(query)
    notices.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    notices.value = []
    total.value = 0
    noticeError.value = getErrorMessage(error, '通知列表暂时加载失败，请稍后重试。')
  } finally { loading.value = false }
}

const firstQueryString = (value: unknown) => {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value == null ? '' : String(value)
}

const applyRouteQuery = () => {
  const hasRouteFilter = ['type', 'keyword', 'sendStatus'].some((key) => firstQueryString(route.query[key]))
  if (!hasRouteFilter) return false
  const type = firstQueryString(route.query.type)
  const keyword = firstQueryString(route.query.keyword)
  const sendStatus = firstQueryString(route.query.sendStatus)
  Object.assign(query, {
    type,
    keyword,
    sendStatus: sendStatus ? sendStatus.toUpperCase() : '',
    pageNo: 1
  })
  return true
}

const sendStatusText = (status?: string) => {
  const value = String(status || 'SUCCESS').toUpperCase()
  const map: Record<string, string> = {
    SUCCESS: '成功',
    FAILED: '失败',
    UNKNOWN: '状态待确认'
  }
  return map[value] || '状态待确认'
}

const sendStatusType = (status?: string) => {
  const value = String(status || 'SUCCESS').toUpperCase()
  if (value === 'FAILED') return 'danger'
  if (value === 'UNKNOWN') return 'warning'
  return 'success'
}
const openDialog = () => { Object.assign(form, { title: '', content: '', type: 'SYSTEM', targetType: 'ALL', targetUserId: undefined }); dialogVisible.value = true }
const validateNoticeForm = async () => {
  if (!formRef.value) return false
  return formRef.value.validate().catch(() => false)
}
const handleSend = async () => {
  if (!guardAdminMobileWrite()) return
  const valid = await validateNoticeForm()
  if (!valid) return
  if (form.targetType === 'USER' && !form.targetUserId) {
    ElMessage.warning('请先选择目标用户')
    return
  }
  const isBroadcast = form.targetType === 'ALL'
  const confirmed = await confirmDangerActionPreview({
    title: isBroadcast ? '全员广播预览' : '指定用户通知预览',
    action: `${isBroadcast ? '广播' : '发送'}通知「${form.title}」`,
    target: isBroadcast
      ? `所有用户；通知类型：${formatNotificationType(form.type)}`
      : `用户编号：${form.targetUserId}；通知类型：${formatNotificationType(form.type)}`,
    impact: isBroadcast
      ? '通知会进入所有用户的消息中心，已送达或已读的消息不能静默撤回。'
      : '通知会进入指定用户的消息中心，可能触发用户对系统状态、账号或任务结果的判断。',
    rollback: isBroadcast
      ? '如内容错误，需要重新发布更正通知，或由后台结合通知记录执行人工清理。'
      : '如发错用户或内容错误，需要发送更正通知，已读消息无法静默撤回。',
    audit: '通知发送操作会记录操作人、通知标题、类型、目标范围和时间，便于后续追踪。',
    tips: isBroadcast
      ? ['确认标题和正文没有占位符、测试文案或敏感信息。', '确认这是全员通知，而不是指定用户通知。']
      : ['确认用户编号与工单、反馈或运营名单一致。', '确认正文没有泄露其他用户信息或内部排障细节。'],
    confirmButtonText: isBroadcast ? '确认全员广播' : '确认发送通知',
    cancelButtonText: '取消发送'
  })
  if (!confirmed) return
  saving.value = true
  try {
    if (form.targetType === 'ALL') await broadcastAdminNotificationApi(form)
    else await sendAdminNotificationApi(form)
    ElMessage.success('通知已发送')
    dialogVisible.value = false
    await fetchNotices()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '通知发送失败，请稍后重试。'))
  } finally { saving.value = false }
}
const handleDelete = async (row: AdminNotificationVO) => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmDangerActionPreview({
    title: '删除通知预览',
    action: `删除通知「${row.title}」`,
    target: `通知编号：${row.id}；目标：${row.targetType || 'ALL'}${row.targetUserId ? `；用户编号：${row.targetUserId}` : ''}`,
    impact: '该通知会从管理端列表移除，用户端历史消息是否同步消失取决于消息删除策略。',
    rollback: '删除后不能在页面直接恢复；误删后需要重新发送一条更正通知或通过数据备份恢复。',
    audit: '删除操作会记录操作人、通知编号、标题和时间。',
    tips: ['确认不是仅想筛选或隐藏通知。', '确认删除后不会影响正在排查的用户消息证据。'],
    confirmButtonText: '确认删除通知'
  })
  if (!confirmed) return
  try {
    await deleteAdminNotificationApi(row.id)
    ElMessage.success('通知已删除')
    await fetchNotices()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '通知删除失败，请确认权限或稍后重试。'))
  }
}
const handleSearch = () => { query.pageNo = 1; fetchNotices() }
const handleReset = () => { Object.assign(query, { keyword: '', type: '', sendStatus: '', pageNo: 1, pageSize: 10 }); fetchNotices() }

watch(
  () => [route.query.type, route.query.keyword, route.query.sendStatus],
  () => {
    if (applyRouteQuery()) {
      void fetchNotices()
    }
  }
)

onMounted(() => {
  applyRouteQuery()
  fetchNotices()
})
</script>

<style scoped lang="scss">
.pagination-wrap { display: flex; justify-content: flex-end; padding: 16px 20px 20px; }

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
  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
