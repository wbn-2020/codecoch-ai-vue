<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-subtitle">查看后台账号、角色和启用状态，必要时停用异常账号。</p>
      </div>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <div class="toolbar">
          <el-form class="filter-form" :model="query" inline>
            <el-form-item label="关键词">
              <el-input v-model.trim="query.keyword" clearable placeholder="用户名 / 昵称 / 邮箱" />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
                <el-option label="启用" :value="1" />
                <el-option label="禁用" :value="0" />
              </el-select>
            </el-form-item>
            <el-form-item label="角色">
              <el-select v-model="query.roleCode" clearable placeholder="全部" style="width: 130px">
                <el-option label="USER" value="USER" />
                <el-option label="ADMIN" value="ADMIN" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">查询</el-button>
              <el-button @click="handleReset">重置</el-button>
            </el-form-item>
          </el-form>
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
      </div>

      <div class="table-card">
        <el-table v-loading="loading" :data="users" row-key="id" :size="tableSize">
          <template #empty>
            <AppState
              v-if="errorMessage"
              type="error"
              title="用户列表加载失败"
              :description="errorMessage"
            >
              <el-button type="primary" :loading="loading" @click="fetchUsers">重新加载</el-button>
            </AppState>
            <AppState v-else type="empty" :title="userEmptyTitle" :description="userEmptyDescription">
              <el-button v-if="hasFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button v-else :loading="loading" @click="fetchUsers">重新加载</el-button>
            </AppState>
          </template>
          <el-table-column v-if="isColumnVisible('username')" prop="username" label="用户名" min-width="140" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('nickname')" prop="nickname" label="昵称" min-width="140" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('email')" label="邮箱" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ displayEmail(row) }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('roles')" label="角色" min-width="150">
            <template #default="{ row }">
              <div class="role-cell">
                <el-tag v-for="role in row.roles" :key="role" class="role-tag" size="small" effect="plain">
                  {{ role }}
                </el-tag>
                <span v-if="!row.roles?.length" class="muted-cell">未分配</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">
                {{ row.statusName || (row.status === 1 ? '启用' : '禁用') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column label="操作" width="300" fixed="right">
            <template #default="{ row }">
              <div v-if="canOperateAccount(row)" class="admin-row-actions">
                <el-button
                  v-permission="'admin:role:assign'"
                  link
                  type="primary"
                  :disabled="withMobileReadonlyDisabled(roleAssignLoading || roleAssignSaving)"
                  :loading="roleAssignTarget?.id === row.id && (roleAssignLoading || roleAssignSaving)"
                  :title="mobileReadonlyTitle('调整该用户的后台角色授权')"
                  @click="openAssignRoles(row)"
                >
                  分配角色
                </el-button>
                <span class="admin-row-actions__risk">
                  <el-button
                    v-permission="'admin:user:password:reset'"
                    link
                    type="danger"
                    :disabled="withMobileReadonlyDisabled(passwordResettingId === row.id)"
                    :loading="passwordResettingId === row.id"
                    :title="mobileReadonlyTitle('重置后只展示一次临时密码，请确认交接渠道。')"
                    @click="handleResetPassword(row)"
                  >
                    重置密码
                  </el-button>
                  <el-button
                    v-permission="'admin:user:write'"
                    link
                    :type="row.status === 1 ? 'danger' : 'warning'"
                    :disabled="withMobileReadonlyDisabled(statusChangingId === row.id)"
                    :loading="statusChangingId === row.id"
                    :title="mobileReadonlyTitle()"
                    @click="handleToggleStatus(row)"
                  >
                    {{ row.status === 1 ? '禁用账号' : '启用账号' }}
                  </el-button>
                </span>
              </div>
              <div v-else class="admin-row-actions">
                <el-tag type="info" effect="plain">当前账号</el-tag>
              </div>
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
          @change="fetchUsers"
        />
      </div>
    </section>

    <el-dialog
      v-model="roleAssignDialogVisible"
      :title="roleAssignDialogTitle"
      width="560px"
      destroy-on-close
      @closed="resetRoleAssignDialog"
    >
      <div class="role-assign-dialog" v-loading="roleAssignLoading">
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          title="角色变更会影响后台菜单、按钮权限和管理员登录态恢复结果，保存前请核对目标账号。"
        />
        <AppState v-if="roleAssignError" type="error" title="角色授权加载失败" :description="roleAssignError">
          <el-button type="primary" :loading="roleAssignLoading" @click="loadRoleAssignOptions">重新加载</el-button>
        </AppState>
        <template v-else>
          <div class="role-assign-summary">
            <span>当前选择</span>
            <strong>{{ selectedRoleSummary }}</strong>
          </div>
          <el-checkbox-group v-if="availableRoles.length" v-model="selectedRoleIds" class="role-option-list">
            <el-checkbox
              v-for="role in availableRoles"
              :key="role.roleId"
              :label="role.roleId"
              border
              class="role-option"
            >
              <span class="role-option__name">{{ displayRoleName(role) }}</span>
              <span class="role-option__code">{{ role.roleCode }}</span>
              <el-tag v-if="role.status === 0" size="small" type="info" effect="plain">已禁用</el-tag>
            </el-checkbox>
          </el-checkbox-group>
          <AppState
            v-else-if="!roleAssignLoading"
            type="empty"
            title="暂无可分配角色"
            description="角色列表为空时无法完成用户授权。请先确认角色种子、角色管理权限和角色列表接口。"
          />
        </template>
      </div>
      <template #footer>
        <el-button @click="roleAssignDialogVisible = false">取消</el-button>
        <el-button
          v-permission="'admin:role:assign'"
          type="primary"
          :loading="roleAssignSaving"
          :disabled="roleAssignSaveDisabled"
          :title="mobileReadonlyTitle(roleAssignSaveTitle)"
          @click="handleAssignRoles"
        >
          保存角色
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="resetPasswordDialogVisible"
      title="重置密码结果"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
      @closed="clearResetPasswordResult"
    >
      <div class="reset-password-result">
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          title="临时密码仅在当前窗口展示一次，关闭后页面会立即清除。"
        />
        <div class="reset-password-result__target">
          <span>目标账号</span>
          <strong>{{ resetPasswordTargetName }}</strong>
        </div>
        <el-input
          class="reset-password-result__value"
          :model-value="resetPasswordValue"
          readonly
          aria-label="重置后的临时密码"
        />
        <p class="dialog-helper">
          请通过已确认的安全渠道交接给本人，并提醒用户首次登录后立即修改密码；不要截图、转存或长时间停留在共享屏幕上。
        </p>
      </div>
      <template #footer>
        <el-button type="primary" @click="resetPasswordDialogVisible = false">我已安全交接并清除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  assignAdminUserRolesApi,
  getAdminRolesApi,
  getAdminUserRolesApi,
  getAdminUsersApi,
  resetAdminUserPasswordApi,
  updateAdminUserStatusApi
} from '@/api/user'
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import { useAuthStore } from '@/stores/auth'
import type { AdminUserQuery, AdminUserVO, RoleVO } from '@/types/user'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'
import { createOperationIdempotencyKey } from '@/utils/idempotency'

const loading = ref(false)
const statusChangingId = ref<number | null>(null)
const passwordResettingId = ref<number | null>(null)
const resetPasswordDialogVisible = ref(false)
const resetPasswordValue = ref('')
const resetPasswordTargetName = ref('')
const roleAssignDialogVisible = ref(false)
const roleAssignLoading = ref(false)
const roleAssignSaving = ref(false)
const roleAssignError = ref('')
const roleAssignTarget = ref<AdminUserVO | null>(null)
const availableRoles = ref<RoleVO[]>([])
const originalRoleIds = ref<number[]>([])
const selectedRoleIds = ref<number[]>([])
const errorMessage = ref('')
const users = ref<AdminUserVO[]>([])
const total = ref(0)
const authStore = useAuthStore()
const { guardAdminMobileWrite, mobileReadonlyTitle, withMobileReadonlyDisabled } = useAdminMobileReadonly()

type UserColumnKey = 'username' | 'nickname' | 'email' | 'roles' | 'status' | 'createdAt'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<UserColumnKey>('admin:user-manage', [
  { key: 'username', label: '用户名', required: true },
  { key: 'nickname', label: '昵称' },
  { key: 'email', label: '邮箱' },
  { key: 'roles', label: '角色', required: true },
  { key: 'status', label: '状态', required: true },
  { key: 'createdAt', label: '创建时间' }
])

const query = reactive<AdminUserQuery>({
  keyword: '',
  status: '',
  roleCode: '',
  pageNo: 1,
  pageSize: 10
})

const hasFilters = computed(() => Boolean(query.keyword || query.status !== '' || query.roleCode))
const userEmptyTitle = computed(() =>
  hasFilters.value ? '当前筛选没有用户' : '暂无用户数据'
)
const userEmptyDescription = computed(() =>
  hasFilters.value
    ? '当前筛选条件下没有账号记录。可以清空关键词、状态或角色筛选后重新查看，避免把筛选空误判为账号丢失。'
    : '用户列表来自账号与角色授权数据。当前为空通常代表权限范围内暂无账号，或初始化数据尚未导入。'
)
const currentUserId = computed(() => authStore.userInfo?.userId || authStore.userInfo?.id)
const currentUsername = computed(() => authStore.userInfo?.username)
const isCurrentAccount = (row: AdminUserVO) => {
  if (currentUserId.value && row.id === currentUserId.value) return true
  if (currentUsername.value && row.username === currentUsername.value) return true
  return false
}
const canOperateAccount = (row: AdminUserVO) => !isCurrentAccount(row)

const roleAssignDialogTitle = computed(() => {
  const targetName = roleAssignTarget.value ? formatUserName(roleAssignTarget.value) : '用户'
  return `分配角色：${targetName}`
})
const roleAssignSaveDisabled = computed(() =>
  roleAssignLoading.value ||
  roleAssignSaving.value ||
  Boolean(roleAssignError.value) ||
  !roleAssignTarget.value ||
  !selectedRoleIds.value.length
)
const roleAssignSaveTitle = computed(() => {
  if (!selectedRoleIds.value.length) return '至少保留一个角色，避免账号失去基础权限。'
  return '保存该用户的角色授权'
})
const selectedRoleSummary = computed(() => {
  if (!selectedRoleIds.value.length) return '未选择角色'
  return selectedRoleIds.value.map((roleId) => roleNameById(roleId)).join('、')
})

const roleNameById = (roleId: number) => {
  const role = availableRoles.value.find((item) => item.roleId === roleId)
  return role ? displayRoleName(role) : `角色 ${roleId}`
}

const displayRoleName = (role: RoleVO) => {
  if (!role.roleName) return role.roleCode
  if (!role.roleCode || role.roleCode === role.roleName) return role.roleName
  return `${role.roleName}（${role.roleCode}）`
}

const formatUserName = (row: AdminUserVO) => (row.nickname ? `${row.username}（${row.nickname}）` : row.username)

const maskEmail = (email?: string | null) => {
  if (!email) return '-'
  const atIndex = email.indexOf('@')
  if (atIndex <= 0) return '******'
  const local = email.slice(0, atIndex)
  const domain = email.slice(atIndex)
  if (local.length <= 2) return `${local.slice(0, 1)}***${domain}`
  return `${local.slice(0, 2)}***${domain}`
}

const displayEmail = (row: AdminUserVO) => row.emailMasked || maskEmail(row.email)

const fetchUsers = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await getAdminUsersApi(query)
    users.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    users.value = []
    total.value = 0
    errorMessage.value = getErrorMessage(error, '用户列表暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchUsers()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    status: '',
    roleCode: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchUsers()
}

const handleResetPassword = async (row: AdminUserVO) => {
  if (!guardAdminMobileWrite()) return
  if (isCurrentAccount(row)) {
    ElMessage.warning('不能在用户管理页重置当前登录账号的密码。')
    return
  }
  const targetName = formatUserName(row)
  const confirmed = await confirmDangerActionPreview({
    title: '重置用户密码预览',
    action: `重置用户「${targetName}」的登录密码`,
    target: `用户编号：${row.id}；角色：${(row.roles || []).join('、') || '-'}；邮箱：${displayEmail(row)}`,
    impact: '系统会生成一个新的临时密码，旧密码立即失效。用户需要使用临时密码登录后尽快修改密码。',
    rollback: '无法恢复旧密码；如交接失败，只能再次重置并生成新的临时密码。',
    audit: '密码重置会记录操作人、目标用户和时间，但不会记录明文密码。',
    tips: ['确认目标账号不是当前操作账号。', '确认已有安全交接渠道，关闭结果窗口后页面不会保留临时密码。'],
    confirmButtonText: '确认重置'
  })
  if (!confirmed) return

  passwordResettingId.value = row.id
  try {
    const newPassword = await resetAdminUserPasswordApi(row.id, {
      confirm: true,
      dryRun: false,
      reason: `重置用户密码；userId=${row.id}；username=${row.username}`,
      idempotencyKey: createOperationIdempotencyKey(`admin-user-reset-password-${row.id}`)
    })
    resetPasswordTargetName.value = targetName
    resetPasswordValue.value = newPassword || ''
    resetPasswordDialogVisible.value = true
    ElMessage.success('临时密码已生成，请在一次性窗口中完成安全交接。')
  } finally {
    passwordResettingId.value = null
  }
}

const clearResetPasswordResult = () => {
  resetPasswordValue.value = ''
  resetPasswordTargetName.value = ''
}

const openAssignRoles = async (row: AdminUserVO) => {
  if (!guardAdminMobileWrite()) return
  if (isCurrentAccount(row)) {
    ElMessage.warning('不能在用户管理页调整当前登录账号的角色。')
    return
  }
  roleAssignTarget.value = row
  roleAssignDialogVisible.value = true
  await loadRoleAssignOptions()
}

const loadRoleAssignOptions = async () => {
  if (!roleAssignTarget.value) return
  roleAssignLoading.value = true
  roleAssignError.value = ''
  try {
    const [roles, userRoles] = await Promise.all([
      getAdminRolesApi(),
      getAdminUserRolesApi(roleAssignTarget.value.id)
    ])
    availableRoles.value = roles
    originalRoleIds.value = userRoles.map((role) => role.roleId).filter(Boolean)
    selectedRoleIds.value = [...originalRoleIds.value]
  } catch (error) {
    availableRoles.value = []
    originalRoleIds.value = []
    selectedRoleIds.value = []
    roleAssignError.value = getErrorMessage(error, '用户角色授权暂时加载失败，请确认角色列表权限和用户角色接口。')
  } finally {
    roleAssignLoading.value = false
  }
}

const resetRoleAssignDialog = () => {
  roleAssignTarget.value = null
  roleAssignError.value = ''
  availableRoles.value = []
  originalRoleIds.value = []
  selectedRoleIds.value = []
}

const hasRoleAssignChanged = () => {
  const before = [...originalRoleIds.value].sort((a, b) => a - b).join(',')
  const after = [...selectedRoleIds.value].sort((a, b) => a - b).join(',')
  return before !== after
}

const handleAssignRoles = async () => {
  if (!guardAdminMobileWrite()) return
  if (!roleAssignTarget.value) return
  if (!selectedRoleIds.value.length) {
    ElMessage.warning('至少选择一个角色，避免账号失去基础权限。')
    return
  }
  if (!hasRoleAssignChanged()) {
    ElMessage.info('角色授权没有变化，无需保存。')
    roleAssignDialogVisible.value = false
    return
  }

  const target = roleAssignTarget.value
  const beforeText = originalRoleIds.value.length
    ? originalRoleIds.value.map((roleId) => roleNameById(roleId)).join('、')
    : '未分配'
  const afterText = selectedRoleSummary.value
  const confirmed = await confirmDangerActionPreview({
    title: '分配用户角色预览',
    action: `调整用户「${formatUserName(target)}」的角色`,
    target: `用户编号：${target.id}；调整前：${beforeText}；调整后：${afterText}`,
    impact: '保存后会改变该用户的后台菜单、按钮权限和管理员登录态恢复结果。',
    rollback: '可再次进入分配角色窗口恢复原角色组合；如误操作，需要结合操作日志确认变更时间。',
    audit: '用户角色分配会记录操作人、目标用户、目标角色集合和时间，便于追踪权限治理行为。',
    tips: ['确认没有移除唯一可用管理员账号的关键角色。', '确认目标用户已知晓权限范围变化。'],
    confirmButtonText: '确认保存角色'
  })
  if (!confirmed) return

  roleAssignSaving.value = true
  try {
    await assignAdminUserRolesApi(target.id, {
      roleIds: selectedRoleIds.value,
      confirm: true,
      dryRun: false,
      reason: `分配用户角色；userId=${target.id}；username=${target.username}；roles=${selectedRoleIds.value.join(',')}`,
      idempotencyKey: createOperationIdempotencyKey(`admin-user-assign-roles-${target.id}`)
    })
    ElMessage.success('用户角色已更新')
    roleAssignDialogVisible.value = false
    await fetchUsers()
  } finally {
    roleAssignSaving.value = false
  }
}

const handleToggleStatus = async (row: AdminUserVO) => {
  if (!guardAdminMobileWrite()) return
  const nextStatus = row.status === 1 ? 0 : 1
  const actionLabel = nextStatus === 1 ? '启用' : '禁用'
  const targetName = formatUserName(row)
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}用户预览`,
    action: `${actionLabel}用户「${targetName}」`,
    target: `用户编号：${row.id}；角色：${(row.roles || []).join('、') || '-'}；邮箱：${displayEmail(row)}`,
    impact:
      nextStatus === 1
        ? '该用户将恢复登录和使用已授权业务功能的能力。'
        : '该用户将无法登录或继续使用需要账号正常状态的业务功能，已登录会话可能在刷新或鉴权时失效。',
    rollback: `可在用户管理页再次${nextStatus === 1 ? '禁用' : '启用'}该账号；如影响业务，需要结合登录日志和操作日志确认时间窗口。`,
    audit: '用户状态变更会记录操作人、目标用户、目标状态和时间，便于追踪账号治理行为。',
    tips: ['确认目标账号不是当前操作账号。', '确认禁用不会误伤正在排查或正常使用的管理员账号。'],
    confirmButtonText: `确认${actionLabel}`
  })
  if (!confirmed) return

  statusChangingId.value = row.id
  try {
    await updateAdminUserStatusApi(row.id, {
      status: nextStatus,
      confirm: true,
      dryRun: false,
      reason: `${actionLabel}用户；userId=${row.id}；username=${row.username}`,
      idempotencyKey: createOperationIdempotencyKey(`admin-user-status-${row.id}`)
    })
    ElMessage.success('用户状态已更新')
    await fetchUsers()
  } finally {
    statusChangingId.value = null
  }
}

onMounted(fetchUsers)
</script>

<style scoped lang="scss">
.filter-form {
  width: 100%;
}

.toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar .filter-form {
  flex: 1 1 520px;
}

.table-view-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex: 0 0 auto;
  flex-wrap: wrap;
}

:global(.column-config-menu) {
  min-width: 168px;
  padding: 6px;
}

:global(.column-config-menu .el-checkbox) {
  width: 100%;
}

.role-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.role-tag {
  margin-right: 0;
}

.muted-cell {
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

.admin-row-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.admin-row-actions__risk {
  display: inline-flex;
  align-items: center;
  padding-left: 10px;
  border-left: 1px solid rgba(148, 163, 184, 0.24);
}

.role-option-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.role-option {
  width: 100%;
  height: auto;
  min-height: 44px;
  margin: 0;
  padding: 10px 12px;
}

.role-option__name {
  font-weight: 600;
}

.role-option__code {
  margin-left: 8px;
  color: var(--app-text-muted, #64748b);
  font-size: 12px;
}

.role-assign-dialog,
.reset-password-result {
  display: grid;
  gap: 14px;
}

.role-assign-summary,
.reset-password-result__target {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--app-surface-soft);
}

.role-assign-summary span,
.reset-password-result__target span {
  color: var(--app-text-muted, #64748b);
  font-size: 13px;
}

.reset-password-result__value {
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace;
}

.dialog-helper {
  margin: 0;
  color: var(--app-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.7;
}

.risk-operation-trigger {
  font-weight: 600;
}

@media (max-width: 768px) {
  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
