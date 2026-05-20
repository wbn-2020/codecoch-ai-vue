<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><ShieldCheck :size="16" /><span>RBAC</span></div>
        <h1 class="admin-hero__title">菜单权限</h1>
        <p class="admin-hero__desc">查看后台菜单树，并为角色分配可访问菜单。</p>
      </div>
      <div class="admin-hero__actions"><el-button type="primary" :loading="saving" :disabled="!selectedRoleId" @click="handleSave">保存授权</el-button></div>
    </section>

    <div class="permission-grid">
      <section class="admin-panel">
        <div class="admin-panel__header"><div><h2>角色</h2><p>来自 `/admin/roles`</p></div></div>
        <div class="role-list" v-loading="roleLoading">
          <button v-for="role in roles" :key="role.roleId" class="role-item" :class="{ active: selectedRoleId === role.roleId }" type="button" @click="selectRole(role.roleId)">
            <span>{{ role.roleName || role.roleCode }}</span><small>{{ role.roleCode }}</small>
          </button>
          <el-empty v-if="!roles.length && !roleLoading" description="暂无角色" />
        </div>
      </section>

      <section class="admin-panel">
        <div class="admin-panel__header"><div><h2>菜单树</h2><p>勾选后提交到角色菜单授权接口</p></div><el-tag v-if="selectedRoleId" type="success" effect="plain">Role #{{ selectedRoleId }}</el-tag></div>
        <div class="tree-wrap" v-loading="menuLoading">
          <el-tree ref="treeRef" :data="menus" node-key="id" show-checkbox default-expand-all :props="{ label: 'menuName', children: 'children' }">
            <template #default="{ data }">
              <div class="menu-node">
                <span>{{ data.menuName }}</span>
                <small>{{ data.path || data.permission || data.type }}</small>
              </div>
            </template>
          </el-tree>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ElTree } from 'element-plus'
import { ElMessage } from 'element-plus'
import { ShieldCheck } from 'lucide-vue-next'
import { nextTick, onMounted, ref } from 'vue'

import { getAdminMenusApi, getAdminRoleMenusApi, grantAdminRoleMenusApi } from '@/api/adminGovernance'
import { getAdminRolesApi } from '@/api/user'
import type { MenuVO } from '@/types/adminGovernance'
import type { RoleVO } from '@/types/user'

const roleLoading = ref(false)
const menuLoading = ref(false)
const saving = ref(false)
const roles = ref<RoleVO[]>([])
const menus = ref<MenuVO[]>([])
const selectedRoleId = ref<number>()
const treeRef = ref<InstanceType<typeof ElTree>>()

const fetchRoles = async () => {
  roleLoading.value = true
  try {
    roles.value = await getAdminRolesApi()
    if (!selectedRoleId.value && roles.value[0]) await selectRole(roles.value[0].roleId)
  } finally { roleLoading.value = false }
}
const fetchMenus = async () => {
  menuLoading.value = true
  try { menus.value = await getAdminMenusApi() } finally { menuLoading.value = false }
}
const selectRole = async (roleId: number) => {
  selectedRoleId.value = roleId
  await nextTick()
  try {
    const menuIds = await getAdminRoleMenusApi(roleId)
    treeRef.value?.setCheckedKeys(menuIds, false)
  } catch {
    treeRef.value?.setCheckedKeys([], false)
  }
}
const handleSave = async () => {
  if (!selectedRoleId.value) return
  saving.value = true
  try {
    const checked = treeRef.value?.getCheckedKeys(false) || []
    const halfChecked = treeRef.value?.getHalfCheckedKeys() || []
    await grantAdminRoleMenusApi(selectedRoleId.value, { menuIds: [...checked, ...halfChecked].map(Number) })
    ElMessage.success('角色菜单授权已保存')
  } finally { saving.value = false }
}
onMounted(async () => { await fetchMenus(); await fetchRoles() })
</script>

<style scoped lang="scss">
.permission-grid { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 16px; }
.role-list { display: grid; gap: 10px; padding: 16px; }
.role-item { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 12px 14px; border: 1px solid rgba(148, 163, 184, .16); border-radius: 8px; background: rgba(15, 23, 42, .45); color: var(--app-text); cursor: pointer; }
.role-item.active { border-color: #60a5fa; background: rgba(37, 99, 235, .18); }
.role-item small, .menu-node small { color: var(--app-text-muted); }
.tree-wrap { padding: 16px 20px 20px; }
.menu-node { display: inline-flex; align-items: center; gap: 10px; min-width: 0; }
@media (max-width: 860px) { .permission-grid { grid-template-columns: 1fr; } }
</style>
