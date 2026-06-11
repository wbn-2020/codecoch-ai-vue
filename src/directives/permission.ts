import type { Directive, DirectiveBinding } from 'vue'
import { ElMessage } from 'element-plus'

import { useAuthStore } from '@/stores/auth'

/**
 * v-permission
 *
 * Keeps protected actions visible but disabled when the current account lacks
 * the required role or permission code. This helps admins understand whether a
 * button is unavailable because of permissions instead of mistaking it for a
 * broken page.
 */
export const permission: Directive<HTMLElement, string | string[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    checkPermission(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    checkPermission(el, binding)
  },
  unmounted(el: HTMLElement) {
    const state = permissionState.get(el)
    if (state) {
      el.removeEventListener('click', state.clickBlocker, true)
      el.removeEventListener('keydown', state.keyBlocker, true)
      permissionState.delete(el)
    }
  }
}

interface PermissionElementState {
  clickBlocker: (event: Event) => void
  keyBlocker: (event: KeyboardEvent) => void
  missingHint: string
  wasDisabled: boolean
  originalTitle: string | null
  originalAriaLabel: string | null
}

const permissionState = new WeakMap<HTMLElement, PermissionElementState>()

const permissionLabelMap: Record<string, string> = {
  ADMIN: '管理员角色',
  'admin:system:overview': '运营首页查看',
  'admin:user:list': '用户管理查看',
  'admin:user:write': '用户管理维护',
  'admin:role:list': '角色管理查看',
  'admin:role:write': '角色管理维护',
  'admin:role:assign': '角色授权',
  'admin:menu:list': '菜单权限查看',
  'admin:question:list': '题目管理查看',
  'admin:question:write': '题目维护',
  'admin:question:import': '题目导入',
  'admin:question:export': '题目导出',
  'admin:question:generate': 'AI 题目生成',
  'admin:question:review': '题目审核',
  'admin:question:dedupe': '重复题治理',
  'admin:question:relation': '题目关系维护',
  'admin:question:category': '题目分类维护',
  'admin:question:tag': '题目标签维护',
  'admin:question:group': '题组维护',
  'admin:question:embedding:rebuild': '题库语义索引重建',
  'admin:industry-template:list': '行业模板查看',
  'admin:industry-template:write': '行业模板维护',
  'admin:file:list': '文件治理查看',
  'admin:ai:prompt:list': '提示词模板查看',
  'admin:ai:prompt:write': '提示词模板维护',
  'admin:ai:prompt:test': '提示词测试',
  'admin:ai:prompt:publish': '提示词发布',
  'admin:ai:log:list': 'AI 运行记录查看',
  'admin:ai:log:raw:view': 'AI 原文诊断查看',
  'admin:ai:model:list': 'AI 模型配置查看',
  'admin:ai:model:write': 'AI 模型配置维护',
  'admin:analytics:ai': 'AI 运营看板查看',
  'admin:analytics:agent': '生成效果分析查看',
  'admin:analytics:job:run': '聚合任务运行',
  'admin:analytics:metric:write': '指标字典维护',
  'admin:agent:prompt-regression:list': '提示词回归查看',
  'admin:agent:prompt-regression:write': '提示词回归维护',
  'admin:agent:prompt-regression:run': '提示词回归运行',
  'admin:agent:run:list': '生成运行记录查看',
  'admin:agent:task:list': '生成任务处理查看',
  'admin:task:list': '任务中心查看',
  'admin:task:retry': '任务重试',
  'admin:notice:list': '通知管理查看',
  'admin:system:config:list': '系统配置查看',
  'admin:system:config:write': '系统配置维护',
  'admin:audit:operation-log': '操作日志查看',
  'admin:audit:login-log': '登录日志查看',
  'admin:audit:slow-sql-log': '慢 SQL 查看',
  'admin:interview:list': '面试记录查看',
  'admin:interview:report': '面试报告查看'
}

function checkPermission(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
  const requiredAuthorities = normalizeRequiredAuthorities(binding.value)
  const state = getPermissionElementState(el)

  if (!requiredAuthorities.length) {
    restorePermissionElement(el, state)
    return
  }

  const authStore = useAuthStore()
  const hasPermission = authStore.hasAnyAuthority(requiredAuthorities)
  const missingHint = buildMissingHint(requiredAuthorities)
  state.missingHint = missingHint

  el.style.display = ''
  el.setAttribute('aria-hidden', 'false')

  if (hasPermission) {
    restorePermissionElement(el, state)
    return
  }

  if (!state.wasDisabled) {
    state.originalTitle = el.getAttribute('title')
    state.originalAriaLabel = el.getAttribute('aria-label')
    state.wasDisabled = true
  }

  el.classList.add('is-permission-disabled')
  el.setAttribute('aria-disabled', 'true')
  el.setAttribute('aria-label', missingHint)
  el.setAttribute('data-permission-hint', missingHint)
  el.setAttribute('data-permission-short', buildMissingShortText(requiredAuthorities))
  el.setAttribute('data-permission-count', String(requiredAuthorities.length))
  el.setAttribute('title', missingHint)
}

function getPermissionElementState(el: HTMLElement) {
  let state = permissionState.get(el)
  if (state) return state

  state = {
    clickBlocker: (event: Event) => {
      blockPermissionEvent(el, event)
    },
    keyBlocker: (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      blockPermissionEvent(el, event)
    },
    missingHint: '',
    wasDisabled: false,
    originalTitle: null,
    originalAriaLabel: null
  }
  el.addEventListener('click', state.clickBlocker, true)
  el.addEventListener('keydown', state.keyBlocker, true)
  permissionState.set(el, state)
  return state
}

function blockPermissionEvent(el: HTMLElement, event: Event) {
  const current = permissionState.get(el)
  if (!current || !el.classList.contains('is-permission-disabled')) return
  event.preventDefault()
  event.stopImmediatePropagation()
  ElMessage.warning(current.missingHint || '当前账号缺少操作权限，操作未提交。')
}

function restorePermissionElement(el: HTMLElement, state: PermissionElementState) {
  el.classList.remove('is-permission-disabled')
  el.removeAttribute('aria-disabled')
  el.removeAttribute('data-permission-hint')
  el.removeAttribute('data-permission-short')
  el.removeAttribute('data-permission-count')

  if (!state.wasDisabled) return

  restoreNullableAttribute(el, 'title', state.originalTitle)
  restoreNullableAttribute(el, 'aria-label', state.originalAriaLabel)
  state.originalTitle = null
  state.originalAriaLabel = null
  state.wasDisabled = false
}

function restoreNullableAttribute(el: HTMLElement, name: string, value: string | null) {
  if (value) {
    el.setAttribute(name, value)
  } else {
    el.removeAttribute(name)
  }
}

function normalizeRequiredAuthorities(value: string | string[] | undefined) {
  const authorities = Array.isArray(value) ? value : [value]
  return authorities
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function buildMissingHint(requiredAuthorities: string[]) {
  const labels = requiredAuthorities.map(formatPermissionLabel)
  if (requiredAuthorities.length === 1) {
    return `当前账号缺少“${labels[0]}”权限，操作未提交。权限码：${requiredAuthorities[0]}。`
  }
  return `当前账号需要具备以下任一权限：${labels.map((label) => `“${label}”`).join('、')}；当前账号未具备，操作未提交。权限码：${requiredAuthorities.join('、')}。`
}

function buildMissingShortText(requiredAuthorities: string[]) {
  const labels = requiredAuthorities.map(formatPermissionLabel)
  if (requiredAuthorities.length === 1) return `缺少 ${labels[0]}`
  return `缺少 ${requiredAuthorities.length} 项权限`
}

function formatPermissionLabel(authority: string) {
  return permissionLabelMap[authority] || authority
}

export default permission
