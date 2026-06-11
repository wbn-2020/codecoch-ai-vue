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
          <el-table-column v-if="isColumnVisible('email')" prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
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
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <div class="risk-action-cell">
                <el-button
                  v-if="canToggleStatus(row)"
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
                <el-tag v-else type="info" effect="plain">当前账号</el-tag>
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
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import { getAdminUsersApi, updateAdminUserStatusApi } from '@/api/user'
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import { useAuthStore } from '@/stores/auth'
import type { AdminUserQuery, AdminUserVO } from '@/types/user'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

const loading = ref(false)
const statusChangingId = ref<number | null>(null)
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
const canToggleStatus = (row: AdminUserVO) => {
  if (currentUserId.value && row.id === currentUserId.value) return false
  if (currentUsername.value && row.username === currentUsername.value) return false
  return true
}

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

const handleToggleStatus = async (row: AdminUserVO) => {
  if (!guardAdminMobileWrite()) return
  const nextStatus = row.status === 1 ? 0 : 1
  const actionLabel = nextStatus === 1 ? '启用' : '禁用'
  const targetName = row.nickname ? `${row.username}（${row.nickname}）` : row.username
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}用户预览`,
    action: `${actionLabel}用户「${targetName}」`,
    target: `用户编号：${row.id}；角色：${(row.roles || []).join('、') || '-'}；邮箱：${row.email || '-'}`,
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
    await updateAdminUserStatusApi(row.id, { status: nextStatus })
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

.risk-action-cell {
  display: inline-flex;
  align-items: center;
  padding-left: 10px;
  border-left: 1px solid rgba(148, 163, 184, 0.24);
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
