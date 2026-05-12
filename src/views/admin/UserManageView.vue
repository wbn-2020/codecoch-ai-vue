<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-subtitle">对接 `/admin/users` 和 `/admin/users/{id}/status`，保留分页与基础筛选结构。</p>
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
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button
                link
                :type="row.status === 1 ? 'danger' : 'primary'"
                :loading="statusChangingId === row.id"
                @click="handleToggleStatus(row)"
              >
                {{ row.status === 1 ? '禁用' : '启用' }}
              </el-button>
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
import { onMounted, reactive, ref } from 'vue'

import { getAdminUsersApi, updateAdminUserStatusApi } from '@/api/user'
import type { AdminUserQuery, AdminUserVO } from '@/types/user'

const loading = ref(false)
const statusChangingId = ref<number | null>(null)
const users = ref<AdminUserVO[]>([])
const total = ref(0)

const query = reactive<AdminUserQuery>({
  keyword: '',
  status: '',
  roleCode: '',
  pageNo: 1,
  pageSize: 10
})

const fetchUsers = async () => {
  loading.value = true
  try {
    const result = await getAdminUsersApi(query)
    users.value = result.records || []
    total.value = result.total || 0
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
  await ElMessageBox.confirm(`确认${nextStatus === 1 ? '启用' : '禁用'}用户 ${row.username}？`, '操作确认', {
    type: 'warning'
  })

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
</style>
