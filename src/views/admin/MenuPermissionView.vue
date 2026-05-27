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
            <span>{{ displayRoleName(role) }}</span><small>{{ role.roleCode }}</small>
          </button>
          <el-empty v-if="!roles.length && !roleLoading" description="暂无角色" />
        </div>
      </section>

      <section class="admin-panel">
        <div class="admin-panel__header"><div><h2>菜单树</h2><p>勾选后提交到角色菜单授权接口</p></div><el-tag v-if="selectedRoleId" type="success" effect="plain">{{ selectedRoleLabel }}</el-tag></div>
        <div class="tree-wrap" v-loading="menuLoading">
          <el-tree ref="treeRef" :data="menus" node-key="id" show-checkbox default-expand-all :props="{ label: 'menuName', children: 'children' }">
            <template #default="{ data }">
              <div class="menu-node">
                <span>{{ displayMenuName(data) }}</span>
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
import { computed, nextTick, onMounted, ref } from 'vue'

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

const roleNameMap: Record<string, string> = {
  USER: '普通用户',
  ADMIN: '管理员',
  SUPER_ADMIN: '超级管理员'
}

const menuNameMap: Record<string, string> = {
  'V3 Governance': 'V3 管理后台',
  'AI Models': 'AI 模型配置',
  Menus: '菜单权限',
  Interviews: '面试记录',
  'Prompt Template': 'Prompt 模板',
  'V4 Agent Analytics': 'Agent 效果分析',
  'V4 AI Ops Analytics': 'AI Ops 看板',
  'V4 Agent Runs': 'Agent 运行',
  'V4 Agent Tasks': 'Agent 任务',
  'V4 Analytics Metric Write': '指标字典',
  'V4 Analytics Job Run': '聚合任务',
  'V4 Prompt Regression List': 'Prompt 回归列表',
  'V4 Prompt Regression Write': 'Prompt 回归写入',
  'V4 Prompt Regression Run': 'Prompt 回归运行'
}

const menuPathMap: Record<string, string> = {
  '/admin': '管理首页',
  '/admin/v3': 'V3 管理后台',
  '/admin/users': '用户管理',
  '/admin/roles': '角色管理',
  '/admin/menus': '菜单权限',
  '/admin/files': '文件治理',
  '/admin/questions': '题目管理',
  '/admin/ai/questions/generate': 'AI 题目生成',
  '/admin/question-reviews': '题目审核',
  '/admin/question-duplicate-reviews': '题目去重审核',
  '/admin/question-relations': '题目关系',
  '/admin/question-categories': '分类管理',
  '/admin/question-tags': '标签管理',
  '/admin/question-groups': '题组管理',
  '/admin/industry-templates': '行业模板',
  '/admin/ai/prompts': 'Prompt 模板',
  '/admin/ai/logs': 'AI 调用日志',
  '/admin/ai/models': 'AI 模型配置',
  '/admin/ai/prompt-regression': 'Prompt 回归',
  '/admin/ops/overview': '运维监控',
  '/admin/analytics/ai': 'AI Ops 看板',
  '/admin/analytics/agent': 'Agent 效果分析',
  '/admin/analytics/metrics': '指标字典',
  '/admin/analytics/jobs': '聚合任务',
  '/admin/async-tasks': '任务中心',
  '/admin/agent/runs': 'Agent 运行',
  '/admin/agent/tasks': 'Agent 任务',
  '/admin/interviews': '面试记录',
  '/admin/interview-reports': '面试报告',
  '/admin/notices': '通知管理',
  '/admin/operation-logs': '操作日志',
  '/admin/login-logs': '登录日志',
  '/admin/slow-sql-logs': '慢 SQL 查询',
  '/admin/system/configs': '系统配置'
}

const selectedRoleLabel = computed(() => {
  const role = roles.value.find((item) => item.roleId === selectedRoleId.value)
  return role ? displayRoleName(role) : `角色 #${selectedRoleId.value}`
})

const displayRoleName = (role: RoleVO) => {
  const roleCode = String(role.roleCode || '').toUpperCase()
  return roleNameMap[roleCode] || role.roleName || role.roleCode
}

const displayMenuName = (menu: MenuVO) => {
  const pathLabel = menu.path ? menuPathMap[menu.path] : ''
  const rawName = menu.menuName || menu.name || ''
  return pathLabel || menuNameMap[rawName] || rawName || menu.permission || `菜单 #${menu.id}`
}

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
