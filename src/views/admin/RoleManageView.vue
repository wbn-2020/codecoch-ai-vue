<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">角色管理</h1>
        <p class="page-subtitle">对接 `/admin/roles`，V1 仅只读展示 USER 和 ADMIN 等基础角色。</p>
      </div>
    </div>

    <section class="content-card">
      <div class="table-card">
        <el-table v-loading="loading" :data="roles" row-key="roleId">
          <el-table-column prop="roleCode" label="角色编码" min-width="160" />
          <el-table-column prop="roleName" label="角色名称" min-width="160" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">
                {{ row.status === 1 ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { getAdminRolesApi } from '@/api/user'
import type { RoleVO } from '@/types/user'

const loading = ref(false)
const roles = ref<RoleVO[]>([])

const fetchRoles = async () => {
  loading.value = true
  try {
    roles.value = await getAdminRolesApi()
  } finally {
    loading.value = false
  }
}

onMounted(fetchRoles)
</script>
