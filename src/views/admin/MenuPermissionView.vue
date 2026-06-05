<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><ShieldCheck :size="16" /><span>RBAC</span></div>
        <h1 class="admin-hero__title">菜单权限</h1>
        <p class="admin-hero__desc">查看后台菜单树，并为角色分配可访问菜单。</p>
      </div>
      <div class="admin-hero__actions">
        <el-button :disabled="!hasUnsavedChanges" @click="cancelUnsavedChanges">取消更改</el-button>
        <el-button :disabled="!selectedRoleId || !currentGrantMenuIds.length" @click="resetDraftGrant">清空草稿</el-button>
        <el-button type="primary" :loading="saving" :disabled="!selectedRoleId || !hasUnsavedChanges" @click="handleSave">保存授权</el-button>
      </div>
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
        <div class="admin-panel__header"><div><h2>菜单树</h2><p>勾选后提交到角色菜单授权接口</p></div><el-tag v-if="selectedRoleId" :type="hasUnsavedChanges ? 'warning' : 'success'" effect="plain">{{ selectedRoleLabel }}{{ hasUnsavedChanges ? ' · 未保存' : '' }}</el-tag></div>
        <div class="tree-wrap" v-loading="menuLoading">
          <el-tree ref="treeRef" :data="menus" node-key="id" show-checkbox default-expand-all :props="{ label: 'menuName', children: 'children' }" @check="syncCheckedState">
            <template #default="{ data }">
              <div class="menu-node">
                <span>{{ displayMenuName(data) }}</span>
                <small>{{ menuMetaText(data) }}</small>
              </div>
            </template>
          </el-tree>
        </div>
        <div class="change-preview">
          <div class="change-preview__head">
            <strong>变更预览</strong>
            <span>{{ changeSummary }}</span>
          </div>
          <div class="change-preview__grid">
            <section>
              <h3>新增授权</h3>
              <el-tag v-for="item in addedMenus" :key="`add-${item.id}`" type="success" effect="plain">{{ displayMenuName(item) }}</el-tag>
              <el-empty v-if="!addedMenus.length" description="暂无新增" :image-size="48" />
            </section>
            <section>
              <h3>移除授权</h3>
              <el-tag v-for="item in removedMenus" :key="`remove-${item.id}`" type="danger" effect="plain">{{ displayMenuName(item) }}</el-tag>
              <el-empty v-if="!removedMenus.length" description="暂无移除" :image-size="48" />
            </section>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ElTree } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
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
const originalGrantMenuIds = ref<number[]>([])
const currentGrantMenuIds = ref<number[]>([])

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
  '/admin/dashboard': '管理首页',
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

const flatMenus = computed(() => flattenMenus(menus.value))
const menuById = computed(() => new Map(flatMenus.value.map((item) => [item.id, item])))
const addedMenuIds = computed(() => diffIds(currentGrantMenuIds.value, originalGrantMenuIds.value))
const removedMenuIds = computed(() => diffIds(originalGrantMenuIds.value, currentGrantMenuIds.value))
const addedMenus = computed(() => addedMenuIds.value.map((id) => menuById.value.get(id)).filter(Boolean) as MenuVO[])
const removedMenus = computed(() => removedMenuIds.value.map((id) => menuById.value.get(id)).filter(Boolean) as MenuVO[])
const hasUnsavedChanges = computed(() => addedMenuIds.value.length > 0 || removedMenuIds.value.length > 0)
const changeSummary = computed(() =>
  hasUnsavedChanges.value
    ? `新增 ${addedMenuIds.value.length} 项，移除 ${removedMenuIds.value.length} 项`
    : '当前授权与已保存状态一致'
)

const normalizeIds = (ids: Array<string | number>) =>
  Array.from(new Set(ids.map(Number).filter((id) => Number.isFinite(id) && id > 0))).sort((a, b) => a - b)

const diffIds = (source: number[], target: number[]) => {
  const targetSet = new Set(target)
  return source.filter((id) => !targetSet.has(id))
}

const flattenMenus = (items: MenuVO[]): MenuVO[] =>
  items.flatMap((item) => [item, ...flattenMenus(item.children || [])])

const getGrantMenuIdsFromTree = () => {
  const checked = treeRef.value?.getCheckedKeys(false) || []
  const halfChecked = treeRef.value?.getHalfCheckedKeys() || []
  return normalizeIds([...checked, ...halfChecked])
}

const syncCheckedState = () => {
  currentGrantMenuIds.value = getGrantMenuIdsFromTree()
}

const applyCheckedKeys = async (menuIds: number[]) => {
  await nextTick()
  treeRef.value?.setCheckedKeys(menuIds, false)
  await nextTick()
  syncCheckedState()
}

const displayRoleName = (role: RoleVO) => {
  const roleCode = String(role.roleCode || '').toUpperCase()
  return roleNameMap[roleCode] || role.roleName || role.roleCode
}

const displayMenuName = (menu: MenuVO) => {
  const rawName = menu.menuName || menu.name || ''
  const rawLabel = menuNameMap[rawName] || rawName
  if (String(menu.type || '').toUpperCase() === 'BUTTON') {
    return rawLabel || menu.permission || menu.permissionCode || `操作权限 #${menu.id}`
  }
  const pathLabel = menu.path ? menuPathMap[menu.path] : ''
  return pathLabel || rawLabel || menu.permission || menu.permissionCode || `菜单 #${menu.id}`
}

const menuMetaText = (menu: MenuVO) => {
  const permission = menu.permission || menu.permissionCode
  if (String(menu.type || '').toUpperCase() === 'BUTTON') {
    return permission || menu.path || '操作权限'
  }
  return menu.path || permission || menu.type || '菜单'
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
    await applyCheckedKeys(menuIds)
    originalGrantMenuIds.value = [...currentGrantMenuIds.value]
  } catch {
    await applyCheckedKeys([])
    originalGrantMenuIds.value = []
  }
}

const cancelUnsavedChanges = async () => {
  await applyCheckedKeys(originalGrantMenuIds.value)
}

const resetDraftGrant = async () => {
  await applyCheckedKeys([])
}

const handleSave = async () => {
  if (!selectedRoleId.value) return
  syncCheckedState()
  try {
    await ElMessageBox.confirm(
      `确认保存「${selectedRoleLabel.value}」的菜单授权变更？${changeSummary.value}，保存后会立即影响该角色的后台可访问范围。`,
      '保存菜单授权',
      {
        type: 'warning',
        confirmButtonText: '确认保存',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }
  saving.value = true
  try {
    await grantAdminRoleMenusApi(selectedRoleId.value, { menuIds: currentGrantMenuIds.value })
    originalGrantMenuIds.value = [...currentGrantMenuIds.value]
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
.change-preview { padding: 0 20px 20px; }
.change-preview__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; border-top: 1px solid rgba(148, 163, 184, .14); }
.change-preview__head strong { color: var(--app-text); }
.change-preview__head span { color: var(--app-text-muted); font-size: 13px; }
.change-preview__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
.change-preview__grid section { display: flex; flex-wrap: wrap; align-content: flex-start; gap: 8px; min-height: 92px; padding: 12px; border: 1px solid rgba(148, 163, 184, .14); border-radius: 8px; background: rgba(15, 23, 42, .38); }
.change-preview__grid h3 { flex-basis: 100%; margin: 0 0 4px; color: var(--app-text); font-size: 14px; font-weight: 600; }
@media (max-width: 860px) { .permission-grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .change-preview__grid { grid-template-columns: 1fr; } }
</style>
