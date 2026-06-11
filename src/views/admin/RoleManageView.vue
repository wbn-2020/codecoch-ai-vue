<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">角色管理</h1>
        <p class="page-subtitle">维护后台角色的基础信息和启用状态，角色权限菜单可在“菜单权限”中配置。</p>
      </div>
      <el-button v-permission="'admin:role:write'" type="primary" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="openDialog()">新增角色</el-button>
    </div>

    <section class="content-card">
      <div class="table-card">
        <div class="table-card__header">
          <div>
            <h2>角色列表</h2>
            <p>角色状态会影响后台菜单、按钮权限和管理员登录态恢复结果，可按排障场景调整诊断列。</p>
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

        <el-table v-loading="loading" :data="roles" row-key="roleId" :size="tableSize">
          <template #empty>
            <AppState
              v-if="errorMessage"
              type="error"
              title="角色列表加载失败"
              :description="errorMessage"
            >
              <el-button type="primary" :loading="loading" @click="fetchRoles">重新加载</el-button>
            </AppState>
            <AppState
              v-else
              type="empty"
              title="暂无后台角色"
              description="当前没有可用于授权的后台角色。没有角色时，菜单授权、按钮权限和管理员恢复链路都无法形成稳定权限来源。"
            >
              <el-button v-permission="'admin:role:write'" type="primary" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="openDialog()">新增角色</el-button>
            </AppState>
          </template>
          <el-table-column v-if="isColumnVisible('roleCode')" prop="roleCode" label="角色编码" min-width="160" />
          <el-table-column v-if="isColumnVisible('roleName')" prop="roleName" label="角色名称" min-width="160" />
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">
                {{ row.status === 1 ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('description')" prop="description" label="说明" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.description || '--' }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('updatedAt')" prop="updatedAt" label="更新时间" min-width="170" show-overflow-tooltip />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button v-permission="'admin:role:write'" link type="primary" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="openDialog(row)">编辑</el-button>
                <span class="admin-row-actions__risk">
                  <el-button
                    v-permission="'admin:role:write'"
                    link
                    type="warning"
                    :disabled="withMobileReadonlyDisabled(isProtectedRole(row) && row.status === 1)"
                    :title="mobileReadonlyTitle(roleStatusDisabledTitle(row))"
                    @click="handleToggleStatus(row)"
                  >
                    {{ row.status === 1 ? '禁用角色' : '启用角色' }}
                  </el-button>
                  <el-button
                    v-permission="'admin:role:write'"
                    link
                    type="danger"
                    :disabled="withMobileReadonlyDisabled(isProtectedRole(row))"
                    :title="mobileReadonlyTitle(roleDeleteDisabledTitle(row))"
                    @click="handleDelete(row)"
                  >
                    删除角色
                  </el-button>
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
        <el-button v-permission="'admin:role:write'" type="primary" :loading="saving" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import {
  createAdminRoleApi,
  deleteAdminRoleApi,
  getAdminRolesApi,
  updateAdminRoleApi,
  updateAdminRoleStatusApi
} from '@/api/user'
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import type { RoleSaveDTO, RoleVO } from '@/types/user'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

type RoleColumnKey = 'roleCode' | 'roleName' | 'status' | 'description' | 'createdAt' | 'updatedAt'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<RoleColumnKey>('admin:role-manage', [
  { key: 'roleCode', label: '角色编码', required: true },
  { key: 'roleName', label: '角色名称', required: true },
  { key: 'status', label: '状态', required: true },
  { key: 'description', label: '说明' },
  { key: 'createdAt', label: '创建时间', defaultVisible: false },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false }
])

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const dialogVisible = ref(false)
const editingRoleId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const roles = ref<RoleVO[]>([])
const {
  guardAdminMobileWrite,
  isAdminMobileReadonly,
  mobileReadonlyTitle,
  withMobileReadonlyDisabled
} = useAdminMobileReadonly()

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
    description: row?.description || ''
  })
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!guardAdminMobileWrite()) return
  if (!formRef.value) return
  await formRef.value.validate()
  const actionLabel = editingRoleId.value ? '更新角色' : '新增角色'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}预览`,
    action: `${actionLabel}「${form.roleName || form.roleCode}」`,
    target: `角色编码：${form.roleCode || '-'}；角色名称：${form.roleName || '-'}`,
    impact: '角色保存后会影响后台权限治理、用户角色识别和后续菜单授权范围。',
    rollback: editingRoleId.value
      ? '可再次编辑角色信息；如角色编码已被权限判断依赖，需要同步核对相关用户和菜单授权。'
      : '如新增错误，可在确认没有用户依赖后删除该角色。',
    audit: '角色保存会记录操作人、角色编码、角色名称和时间，便于追踪权限治理变更。',
    tips: ['确认角色编码不会与已有角色或后端权限判断冲突。', '新增角色后还需要单独配置菜单授权。'],
    confirmButtonText: '确认保存'
  })
  if (!confirmed) return

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
  if (!guardAdminMobileWrite()) return
  const nextStatus = row.status === 1 ? 0 : 1
  const actionLabel = nextStatus === 1 ? '启用' : '禁用'
  const roleName = row.roleName || row.roleCode
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}角色预览`,
    action: `${actionLabel}角色「${roleName}」`,
    target: `角色编号：${row.roleId}；角色编码：${row.roleCode || '-'}`,
    impact:
      nextStatus === 1
        ? '拥有该角色的用户可重新获得对应授权，后台菜单和按钮访问会随角色状态恢复。'
        : '拥有该角色的用户可能无法继续访问对应后台功能，刷新页面或重新鉴权后影响会更明显。',
    rollback: `可在角色管理页再次${nextStatus === 1 ? '禁用' : '启用'}该角色；如误操作，需要结合用户角色关系和菜单授权记录排查影响范围。`,
    audit: '角色状态变更会记录操作人、角色编号、目标状态和时间，便于追踪权限治理行为。',
    tips: ['确认没有把唯一管理员角色禁用。', '确认相关用户已经知晓权限变化。'],
    confirmButtonText: `确认${actionLabel}`
  })
  if (!confirmed) return
  await updateAdminRoleStatusApi(row.roleId, { status: nextStatus })
  ElMessage.success(`角色已${actionLabel}`)
  await fetchRoles()
}

const normalizeRoleCode = (roleCode?: string) => String(roleCode || '').trim().replace(/^ROLE_/i, '').toUpperCase()
const isProtectedRole = (row: RoleVO) => ['ADMIN', 'USER'].includes(normalizeRoleCode(row.roleCode))
const roleStatusDisabledTitle = (row: RoleVO) =>
  isProtectedRole(row) && row.status === 1 ? '系统内置角色不能禁用，避免破坏登录、注册和后台权限恢复链路。' : undefined
const roleDeleteDisabledTitle = (row: RoleVO) =>
  isProtectedRole(row) ? '系统内置角色不能在页面删除，避免破坏登录、注册和后台权限恢复链路。' : undefined

const handleDelete = async (row: RoleVO) => {
  if (!guardAdminMobileWrite()) return
  if (isProtectedRole(row)) {
    ElMessage.warning(roleDeleteDisabledTitle(row) || '系统内置角色不能在页面删除。')
    return
  }
  const roleName = row.roleName || row.roleCode
  const confirmed = await confirmDangerActionPreview({
    title: '删除角色预览',
    action: `删除角色「${roleName}」`,
    target: `角色编号：${row.roleId}；角色编码：${row.roleCode || '-'}`,
    impact: '删除后，该角色与用户、菜单权限的关联可能被移除，相关人员可能失去对应后台入口。',
    rollback: '删除后无法直接恢复该角色；误删后需要重新创建角色、重新分配用户和菜单权限。',
    audit: '删除角色会记录操作人、角色编号、角色编码和时间，便于审计权限变更。',
    tips: ['确认该角色不是线上账号依赖的核心角色。', '确认已记录当前角色菜单授权和用户关联。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  try {
    await deleteAdminRoleApi(row.roleId)
    ElMessage.success('角色已删除')
    await fetchRoles()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '角色删除被拦截，请先确认该角色没有用户或关键权限依赖。'))
  }
}

onMounted(fetchRoles)
</script>

<style scoped lang="scss">
.table-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 12px;
}

.table-card__header h2 {
  margin: 0;
  color: var(--app-text);
  font-size: 18px;
}

.table-card__header p {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

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

@media (max-width: 900px) {
  .table-card__header {
    flex-direction: column;
  }

  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
