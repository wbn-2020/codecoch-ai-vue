<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">角色管理</h1>
        <p class="page-subtitle">维护后台角色的基础信息和启用状态，角色权限菜单可在“菜单权限”中配置。</p>
      </div>
      <el-button v-permission="'admin:role:write'" type="primary" @click="openDialog()">新增角色</el-button>
    </div>

    <section class="content-card">
      <div class="table-card">
        <el-table v-loading="loading" :data="roles" row-key="roleId">
          <template #empty>
            <AppState
              v-if="errorMessage"
              type="error"
              title="角色列表加载失败"
              :description="errorMessage"
            >
              <el-button type="primary" :loading="loading" @click="fetchRoles">重新加载</el-button>
            </AppState>
            <el-empty v-else description="暂无角色数据">
              <el-button v-permission="'admin:role:write'" type="primary" @click="openDialog()">新增角色</el-button>
            </el-empty>
          </template>
          <el-table-column prop="roleCode" label="角色编码" min-width="160" />
          <el-table-column prop="roleName" label="角色名称" min-width="160" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">
                {{ row.status === 1 ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button v-permission="'admin:role:write'" link type="primary" @click="openDialog(row)">编辑</el-button>
                <span class="admin-row-actions__risk">
                  <el-button v-permission="'admin:role:write'" link type="warning" @click="handleToggleStatus(row)">
                    {{ row.status === 1 ? '禁用角色' : '启用角色' }}
                  </el-button>
                  <el-button v-permission="'admin:role:write'" link type="danger" @click="handleDelete(row)">删除角色</el-button>
                </span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingRoleId ? '编辑角色' : '新增角色'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="角色编码" prop="roleCode">
          <el-input v-model.trim="form.roleCode" :disabled="Boolean(editingRoleId)" maxlength="50" />
        </el-form-item>
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model.trim="form.roleName" maxlength="50" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model.trim="form.description" type="textarea" :rows="3" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-permission="'admin:role:write'" type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import {
  createAdminRoleApi,
  deleteAdminRoleApi,
  getAdminRolesApi,
  updateAdminRoleApi,
  updateAdminRoleStatusApi
} from '@/api/user'
import AppState from '@/components/common/AppState.vue'
import type { RoleSaveDTO, RoleVO } from '@/types/user'
import { getErrorMessage } from '@/utils/error'

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const dialogVisible = ref(false)
const editingRoleId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const roles = ref<RoleVO[]>([])

const form = reactive<RoleSaveDTO>({
  roleCode: '',
  roleName: '',
  description: ''
})

const rules: FormRules<RoleSaveDTO> = {
  roleCode: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }]
}

const fetchRoles = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    roles.value = await getAdminRolesApi()
  } catch (error) {
    roles.value = []
    errorMessage.value = getErrorMessage(error, '角色列表暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const openDialog = (row?: RoleVO) => {
  editingRoleId.value = row?.roleId || null
  Object.assign(form, {
    roleCode: row?.roleCode || '',
    roleName: row?.roleName || '',
    description: ''
  })
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()

  saving.value = true
  try {
    if (editingRoleId.value) {
      await updateAdminRoleApi(editingRoleId.value, form)
      ElMessage.success('角色信息已更新')
    } else {
      await createAdminRoleApi(form)
      ElMessage.success('角色已创建')
    }
    dialogVisible.value = false
    await fetchRoles()
  } finally {
    saving.value = false
  }
}

const handleToggleStatus = async (row: RoleVO) => {
  const nextStatus = row.status === 1 ? 0 : 1
  const actionLabel = nextStatus === 1 ? '启用' : '禁用'
  const impactText =
    nextStatus === 1
      ? '启用后，拥有该角色的用户可重新获得对应授权。'
      : '禁用后，拥有该角色的用户可能无法继续访问对应后台功能。'

  try {
    await ElMessageBox.confirm(`确认${actionLabel}角色「${row.roleName || row.roleCode}」？${impactText}`, `${actionLabel}角色高风险确认`, {
      type: 'warning',
      confirmButtonText: `确认${actionLabel}`,
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  await updateAdminRoleStatusApi(row.roleId, { status: nextStatus })
  ElMessage.success(`角色已${actionLabel}`)
  await fetchRoles()
}

const handleDelete = async (row: RoleVO) => {
  try {
    await ElMessageBox.confirm(
      `确认删除角色「${row.roleName || row.roleCode}」？删除后，该角色与用户的关联会被移除，相关人员可能失去对应后台入口。`,
      '删除角色高风险确认',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }
  await deleteAdminRoleApi(row.roleId)
  ElMessage.success('角色已删除')
  await fetchRoles()
}

onMounted(fetchRoles)
</script>

<style scoped lang="scss">
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

.risk-operation-trigger {
  font-weight: 600;
}
</style>
