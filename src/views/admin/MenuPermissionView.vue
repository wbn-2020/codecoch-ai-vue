<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow"><ShieldCheck :size="16" /><span>RBAC</span></div>
        <h1 class="admin-hero__title">菜单权限</h1>
        <p class="admin-hero__desc">查看后台菜单树，并为角色分配可访问菜单。</p>
      </div>
      <div class="admin-hero__actions">
        <el-button :disabled="!canEditGrant || !hasUnsavedChanges || grantLoading" :title="mobileReadonlyTitle()" @click="cancelUnsavedChanges">取消更改</el-button>
        <el-button :disabled="!selectedRoleId || !currentGrantMenuIds.length || !canEditGrant" :title="mobileReadonlyTitle()" @click="resetDraftGrant">清空草稿</el-button>
        <el-button v-permission="'admin:role:assign'" type="primary" :loading="saving" :disabled="!canSaveGrant" :title="mobileReadonlyTitle()" @click="handleSave">保存授权</el-button>
      </div>
    </section>

    <div class="permission-grid">
      <section class="admin-panel">
        <div class="admin-panel__header"><div><h2>角色</h2><p>用于配置后台菜单和按钮授权</p></div></div>
        <div class="role-list" v-loading="roleLoading">
          <AppState v-if="roleError" type="error" title="角色列表加载失败" :description="roleError">
            <el-button type="primary" :loading="roleLoading" @click="fetchRoles">重新加载角色</el-button>
          </AppState>
          <template v-else>
            <button
              v-for="role in roles"
              :key="role.roleId"
              class="role-item"
              :class="{ active: selectedRoleId === role.roleId, 'is-error': failedGrantRoleId === role.roleId }"
              type="button"
              :disabled="grantLoading"
              @click="selectRole(role.roleId)"
            >
              <span>{{ displayRoleName(role) }}</span>
              <small>{{ failedGrantRoleId === role.roleId ? '授权加载失败，请重试' : role.roleCode }}</small>
            </button>
            <AppState
              v-if="!roles.length && !roleLoading"
              type="empty"
              title="暂无角色来源"
              description="当前没有可授权的角色。菜单授权必须先有角色来源，否则管理端菜单、按钮权限和管理员恢复链路都无法形成稳定权限边界。"
            >
              <el-button type="primary" :loading="roleLoading" @click="fetchRoles">重新加载角色</el-button>
            </AppState>
          </template>
        </div>
      </section>

      <section class="admin-panel">
        <div class="admin-panel__header"><div><h2>菜单树</h2><p>勾选后提交到角色菜单授权接口</p></div><el-tag v-if="selectedRoleId" :type="hasUnsavedChanges ? 'warning' : 'success'" effect="plain">{{ selectedRoleLabel }}{{ hasUnsavedChanges ? ' · 未保存' : '' }}</el-tag></div>
        <div class="tree-wrap" v-loading="menuLoading || grantLoading">
          <AppState v-if="menuError" type="error" title="菜单树加载失败" :description="menuError">
            <el-button type="primary" :loading="menuLoading" @click="fetchMenus">重新加载菜单</el-button>
          </AppState>
          <AppState v-else-if="grantError" type="error" title="角色授权加载失败" :description="grantError">
            <el-button type="primary" :loading="grantLoading" @click="retryGrantLoad">重新加载授权</el-button>
          </AppState>
          <AppState v-else-if="!selectedRoleId" type="disabled" title="请选择角色" description="先从左侧选择一个角色，再查看或调整对应菜单授权。" />
          <el-tree v-else-if="menus.length" ref="treeRef" :data="grantTreeData" node-key="id" show-checkbox default-expand-all :props="{ label: 'menuName', children: 'children', disabled: 'disabled' }" @check="syncCheckedState">
            <template #default="{ data }">
              <div class="menu-node">
                <span>{{ displayMenuName(data) }}</span>
                <small>{{ menuMetaText(data) }}</small>
              </div>
            </template>
          </el-tree>
          <AppState
            v-else-if="!menuLoading"
            type="empty"
            title="暂无菜单数据"
            description="当前没有可授权的菜单树。没有菜单数据时，角色无法获得管理端页面入口和按钮授权，请先确认菜单种子或菜单配置。"
          >
            <el-button type="primary" :loading="menuLoading" @click="fetchMenus">重新加载菜单</el-button>
          </AppState>
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
              <AppState
                v-if="!addedMenus.length"
                class="change-preview__empty"
                type="empty"
                title="暂无新增"
                description="本次草稿没有新增任何菜单或按钮授权。"
              />
            </section>
            <section>
              <h3>移除授权</h3>
              <el-tag v-for="item in removedMenus" :key="`remove-${item.id}`" type="danger" effect="plain">{{ displayMenuName(item) }}</el-tag>
              <AppState
                v-if="!removedMenus.length"
                class="change-preview__empty"
                type="empty"
                title="暂无移除"
                description="本次草稿没有移除任何已保存授权。"
              />
            </section>
          </div>
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
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import type { MenuVO } from '@/types/adminGovernance'
import type { RoleVO } from '@/types/user'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

const roleLoading = ref(false)
const menuLoading = ref(false)
const grantLoading = ref(false)
const saving = ref(false)
const roleError = ref('')
const menuError = ref('')
const grantError = ref('')
const failedGrantRoleId = ref<number>()
const roles = ref<RoleVO[]>([])
const menus = ref<MenuVO[]>([])
const selectedRoleId = ref<number>()
const treeRef = ref<InstanceType<typeof ElTree>>()
const originalGrantMenuIds = ref<number[]>([])
const currentGrantMenuIds = ref<number[]>([])
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()

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
  'Prompt Template': '提示词模板',
  'V4 Agent Analytics': '生成效果分析',
  'V4 AI Ops Analytics': 'AI 运营看板',
  'V4 Agent Runs': '生成运行记录',
  'V4 Agent Tasks': '生成任务处理',
  'V4 Analytics Metric Write': '指标字典',
  'V4 Analytics Job Run': '聚合任务',
  'V4 Prompt Regression List': '提示词回归列表',
  'V4 Prompt Regression Write': '提示词回归写入',
  'V4 Prompt Regression Run': '提示词回归运行'
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
  '/admin/ai/prompts': '提示词模板',
  '/admin/ai/logs': 'AI 运行记录',
  '/admin/ai/models': 'AI 模型配置',
  '/admin/ai/prompt-regression': '提示词回归',
  '/admin/ops/overview': '运维监控',
  '/admin/analytics/ai': 'AI 运营看板',
  '/admin/analytics/agent': '生成效果分析',
  '/admin/analytics/metrics': '指标字典',
  '/admin/analytics/jobs': '聚合任务',
  '/admin/async-tasks': '任务中心',
  '/admin/agent/runs': '生成运行记录',
  '/admin/agent/tasks': '生成任务处理',
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
  return role ? displayRoleName(role) : `角色编号 ${selectedRoleId.value}`
})

const flatMenus = computed(() => flattenMenus(menus.value))
const grantTreeData = computed(() => isAdminMobileReadonly.value ? toReadonlyMenuTree(menus.value) : menus.value)
const menuById = computed(() => new Map(flatMenus.value.map((item) => [item.id, item])))
const addedMenuIds = computed(() => diffIds(currentGrantMenuIds.value, originalGrantMenuIds.value))
const removedMenuIds = computed(() => diffIds(originalGrantMenuIds.value, currentGrantMenuIds.value))
const addedMenus = computed(() => addedMenuIds.value.map((id) => menuById.value.get(id)).filter(Boolean) as MenuVO[])
const removedMenus = computed(() => removedMenuIds.value.map((id) => menuById.value.get(id)).filter(Boolean) as MenuVO[])
const hasUnsavedChanges = computed(() => addedMenuIds.value.length > 0 || removedMenuIds.value.length > 0)
const canEditGrant = computed(() =>
  Boolean(selectedRoleId.value && !isAdminMobileReadonly.value && !menuError.value && !grantError.value && menus.value.length)
)
const canSaveGrant = computed(() => Boolean(canEditGrant.value && hasUnsavedChanges.value && !saving.value && !grantLoading.value))
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

const toReadonlyMenuTree = (items: MenuVO[]): Array<MenuVO & { disabled?: boolean }> =>
  items.map((item) => ({
    ...item,
    disabled: true,
    children: item.children?.length ? toReadonlyMenuTree(item.children) : item.children
  }))

const getGrantMenuIdsFromTree = () => {
  const checked = treeRef.value?.getCheckedKeys(false) || []
  const halfChecked = treeRef.value?.getHalfCheckedKeys() || []
  return normalizeIds([...checked, ...halfChecked])
}

const syncCheckedState = () => {
  if (isAdminMobileReadonly.value) return
  currentGrantMenuIds.value = getGrantMenuIdsFromTree()
}

const applyCheckedKeys = async (menuIds: number[]) => {
  await nextTick()
  if (!treeRef.value) {
    currentGrantMenuIds.value = normalizeIds(menuIds)
    return
  }
  treeRef.value.setCheckedKeys(menuIds, false)
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
    return rawLabel || menu.permission || menu.permissionCode || `操作权限编号 ${menu.id}`
  }
  const pathLabel = menu.path ? menuPathMap[menu.path] : ''
  return pathLabel || rawLabel || menu.permission || menu.permissionCode || `菜单编号 ${menu.id}`
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
  roleError.value = ''
  try {
    roles.value = await getAdminRolesApi()
    if (!selectedRoleId.value && roles.value[0]) await selectRole(roles.value[0].roleId)
  } catch (error) {
    roles.value = []
    roleError.value = getErrorMessage(error, '角色列表暂时加载失败，请稍后重试。')
  } finally { roleLoading.value = false }
}
const fetchMenus = async () => {
  menuLoading.value = true
  menuError.value = ''
  try {
    menus.value = await getAdminMenusApi()
    if (selectedRoleId.value && !grantError.value) await applyCheckedKeys(originalGrantMenuIds.value)
  } catch (error) {
    menus.value = []
    menuError.value = getErrorMessage(error, '菜单树暂时加载失败，请稍后重试。')
  } finally { menuLoading.value = false }
}
const selectRole = async (roleId: number) => {
  selectedRoleId.value = roleId
  grantLoading.value = true
  grantError.value = ''
  failedGrantRoleId.value = undefined
  await nextTick()
  try {
    const menuIds = await getAdminRoleMenusApi(roleId)
    await applyCheckedKeys(menuIds)
    originalGrantMenuIds.value = [...currentGrantMenuIds.value]
  } catch (error) {
    failedGrantRoleId.value = roleId
    grantError.value = getErrorMessage(error, '角色菜单授权暂时加载失败，已保留上一次可见授权，避免误判为空权限。')
    ElMessage.warning(grantError.value)
  } finally { grantLoading.value = false }
}

const retryGrantLoad = async () => {
  if (!selectedRoleId.value) return
  await selectRole(selectedRoleId.value)
}

const cancelUnsavedChanges = async () => {
  await applyCheckedKeys(originalGrantMenuIds.value)
}

const resetDraftGrant = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canEditGrant.value) return
  await applyCheckedKeys([])
}

const handleSave = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canSaveGrant.value) return
  syncCheckedState()
  const addedPreview = addedMenus.value.slice(0, 5).map(displayMenuName).join('、') || '无'
  const removedPreview = removedMenus.value.slice(0, 5).map(displayMenuName).join('、') || '无'
  const confirmed = await confirmDangerActionPreview({
    title: '菜单授权变更预览',
    action: `保存「${selectedRoleLabel.value}」菜单授权`,
    target: `角色编号：${selectedRoleId.value}；${changeSummary.value}`,
    impact: '保存后会立即影响该角色的后台菜单、按钮和页面可访问范围，相关用户刷新或重新鉴权后会感知变化。',
    rollback: '可重新勾选菜单并再次保存，但已发生的误授权访问需要结合操作日志人工排查。',
    audit: '授权保存会记录操作人、角色编号、菜单编号列表和时间，便于追踪权限变更。',
    tips: [`新增授权：${addedPreview}${addedMenus.value.length > 5 ? ' 等' : ''}`, `移除授权：${removedPreview}${removedMenus.value.length > 5 ? ' 等' : ''}`],
    confirmButtonText: '确认保存授权'
  })
  if (!confirmed) return
  const roleId = selectedRoleId.value
  if (!roleId) return
  saving.value = true
  try {
    await grantAdminRoleMenusApi(roleId, { menuIds: currentGrantMenuIds.value })
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
.role-item.is-error { border-color: rgba(248, 113, 113, .72); background: rgba(127, 29, 29, .24); }
.role-item:disabled { cursor: wait; opacity: .72; }
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
.change-preview__empty { flex-basis: 100%; padding: 12px; box-shadow: none; }
@media (max-width: 860px) { .permission-grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .change-preview__grid { grid-template-columns: 1fr; } }
</style>
