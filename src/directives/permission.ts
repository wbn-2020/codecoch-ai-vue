import type { Directive, DirectiveBinding } from 'vue'

import { useAuthStore } from '@/stores/auth'
/**
 * v-permission 指令
 *
 * 根据当前用户角色或 permission code 控制元素可见性。
 * ADMIN 角色保留兼容；细粒度账号按后端返回的权限码判断。
 *
 * 用法：
 * ```html
 * <!-- 单角色 -->
 * <el-button v-permission="'ADMIN'">管理操作</el-button>
 *
 * <!-- 单权限码 -->
 * <el-button v-permission="'admin:question:generate'">生成题目</el-button>
 *
 * <!-- 多权限码或角色（满足其一即可） -->
 * <el-button v-permission="['ADMIN', 'admin:menu:list']">高级操作</el-button>
 * ```
 */
export const permission: Directive<HTMLElement, string | string[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    checkPermission(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    checkPermission(el, binding)
  }
}

function checkPermission(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
  const { value } = binding
  if (!value) return

  const authStore = useAuthStore()
  const requiredAuthorities = Array.isArray(value) ? value : [value]

  const hasPermission = authStore.hasAnyAuthority(requiredAuthorities)
  el.style.display = hasPermission ? '' : 'none'
  el.setAttribute('aria-hidden', String(!hasPermission))
}

export default permission
