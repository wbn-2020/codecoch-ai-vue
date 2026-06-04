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
        </div>
      </div>

      <div class="table-card">
        <el-table v-loading="loading" :data="users" row-key="id">
          <template #empty>
            <AppState
              v-if="errorMessage"
              type="error"
              title="用户列表加载失败"
              :description="errorMessage"
            >
              <el-button type="primary" :loading="loading" @click="fetchUsers">重新加载</el-button>
            </AppState>
            <el-empty v-else :description="userEmptyDescription">
              <el-button v-if="hasFilters" @click="handleReset">清空筛选</el-button>
            </el-empty>
          </template>
          <el-table-column prop="username" label="用户名" min-width="140" />
          <el-table-column prop="nickname" label="昵称" min-width="140" />
          <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
          <el-table-column label="角色" min-width="150">
            <template #default="{ row }">
              <el-tag v-for="role in row.roles" :key="role" class="role-tag" size="small" effect="plain">
                {{ role }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">
                {{ row.statusName || (row.status === 1 ? '启用' : '禁用') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <div class="risk-action-cell">
                <el-button
                  v-if="canToggleStatus(row)"
                  v-permission="'ADMIN'"
                  link
                  :type="row.status === 1 ? 'danger' : 'warning'"
                  :disabled="statusChangingId === row.id"
                  :loading="statusChangingId === row.id"
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import { getAdminUsersApi, updateAdminUserStatusApi } from '@/api/user'
import AppState from '@/components/common/AppState.vue'
import { useAuthStore } from '@/stores/auth'
import type { AdminUserQuery, AdminUserVO } from '@/types/user'
import { getErrorMessage } from '@/utils/error'

const loading = ref(false)
const statusChangingId = ref<number | null>(null)
const errorMessage = ref('')
const users = ref<AdminUserVO[]>([])
const total = ref(0)
const authStore = useAuthStore()

const query = reactive<AdminUserQuery>({
  keyword: '',
  status: '',
  roleCode: '',
  pageNo: 1,
  pageSize: 10
})

const hasFilters = computed(() => Boolean(query.keyword || query.status !== '' || query.roleCode))
const userEmptyDescription = computed(() =>
  hasFilters.value ? '没有匹配当前筛选条件的用户' : '暂无用户数据'
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
  const nextStatus = row.status === 1 ? 0 : 1
  const actionLabel = nextStatus === 1 ? '启用' : '禁用'
  const targetName = row.nickname ? `${row.username}（${row.nickname}）` : row.username
  const impactText =
    nextStatus === 1
      ? '影响范围：该用户将恢复登录和使用已授权业务功能的能力。'
      : '影响范围：该用户将无法登录或继续使用需要账号正常状态的业务功能。'

  try {
    await ElMessageBox.confirm(`确认${actionLabel}用户「${targetName}」？${impactText}`, `${actionLabel}用户高风险确认`, {
      type: 'warning',
      confirmButtonText: `确认${actionLabel}`,
      cancelButtonText: '取消'
    })
  } catch {
    return
  }

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

.role-tag {
  margin-right: 6px;
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
</style>
