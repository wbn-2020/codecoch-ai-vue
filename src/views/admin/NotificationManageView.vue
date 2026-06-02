<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><Bell :size="16" /><span>通知运营</span></div>
        <h1 class="admin-hero__title">通知管理</h1>
        <p class="admin-hero__desc">查询系统通知，支持定向发送、全站广播和删除。</p>
      </div>
      <div class="admin-hero__actions"><el-button type="primary" @click="openDialog()">发送通知</el-button></div>
    </section>

    <section class="admin-panel">
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
          <el-form-item><el-button type="primary" @click="handleSearch">查询</el-button><el-button @click="handleReset">重置</el-button></el-form-item>
        </el-form>
      </div>
      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="notices" row-key="id">
          <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
          <el-table-column label="类型" width="130">
            <template #default="{ row }">
              <el-tag effect="plain">{{ formatNotificationType(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="目标" width="140"><template #default="{ row }">{{ row.targetType || 'ALL' }}{{ row.targetUserId ? ` #${row.targetUserId}` : '' }}</template></el-table-column>
          <el-table-column prop="content" label="内容" min-width="280" show-overflow-tooltip />
          <el-table-column label="创建时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="110" fixed="right"><template #default="{ row }"><el-button link type="danger" @click="handleDelete(row)">删除</el-button></template></el-table-column>
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
        <el-form-item v-if="form.targetType === 'USER'" label="用户 ID" prop="targetUserId"><el-input-number v-model="form.targetUserId" :min="1" controls-position="right" /></el-form-item>
        <el-form-item label="内容" prop="content"><el-input v-model="form.content" type="textarea" :rows="5" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="handleSend">发送</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'

import { broadcastAdminNotificationApi, deleteAdminNotificationApi, getAdminNotificationsApi, sendAdminNotificationApi } from '@/api/adminGovernance'
import type { AdminListQuery, AdminNotificationVO, NotificationSendDTO } from '@/types/adminGovernance'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime, formatNotificationType, notificationTypeLabels } from '@/utils/format'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const notices = ref<AdminNotificationVO[]>([])
const total = ref(0)
const notificationTypeOptions = Object.entries(notificationTypeLabels).map(([value, label]) => ({ value, label }))
const query = reactive<AdminListQuery>({ keyword: '', type: '', pageNo: 1, pageSize: 10 })
const form = reactive<NotificationSendDTO>({ title: '', content: '', type: 'SYSTEM', targetType: 'ALL', targetUserId: undefined })
const rules: FormRules<NotificationSendDTO> = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
  type: [{ required: true, message: '请输入类型', trigger: 'blur' }]
}

const fetchNotices = async () => {
  loading.value = true
  try {
    const result = await getAdminNotificationsApi(query)
    notices.value = result.records || []
    total.value = result.total || 0
  } catch { notices.value = []; total.value = 0 } finally { loading.value = false }
}
const openDialog = () => { Object.assign(form, { title: '', content: '', type: 'SYSTEM', targetType: 'ALL', targetUserId: undefined }); dialogVisible.value = true }
const validateNoticeForm = async () => {
  if (!formRef.value) return false
  return formRef.value.validate().catch(() => false)
}
const handleSend = async () => {
  const valid = await validateNoticeForm()
  if (!valid) return
  if (form.targetType === 'USER' && !form.targetUserId) {
    ElMessage.warning('Please select a target user before sending.')
    return
  }
  saving.value = true
  try {
    if (form.targetType === 'ALL') await broadcastAdminNotificationApi(form)
    else await sendAdminNotificationApi(form)
    ElMessage.success('通知已发送')
    dialogVisible.value = false
    await fetchNotices()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, 'Notification send failed. Please try again.'))
  } finally { saving.value = false }
}
const handleDelete = async (row: AdminNotificationVO) => {
  await ElMessageBox.confirm(`确认删除通知「${row.title}」？`, '删除确认', { type: 'warning' })
  await deleteAdminNotificationApi(row.id)
  ElMessage.success('通知已删除')
  await fetchNotices()
}
const handleSearch = () => { query.pageNo = 1; fetchNotices() }
const handleReset = () => { Object.assign(query, { keyword: '', type: '', pageNo: 1, pageSize: 10 }); fetchNotices() }
onMounted(fetchNotices)
</script>

<style scoped lang="scss">
.pagination-wrap { display: flex; justify-content: flex-end; padding: 16px 20px 20px; }
</style>
