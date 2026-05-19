import type { Directive, DirectiveBinding } from 'vue'

import { useAuthStore } from '@/stores/auth'
import type { RoleCode } from '@/types/common'

/**
 * v-permission 指令
 *
 * 根据当前用户角色控制元素可见性。
 * 如果用户不具备指定角色，元素会被从 DOM 中移除。
 *
 * 用法：
 * ```html
 * <!-- 单角色 -->
 * <el-button v-permission="'ADMIN'">管理操作</el-button>
 *
 * <!-- 多角色（满足其一即可） -->
 * <el-button v-permission="['ADMIN', 'SUPER_ADMIN']">高级操作</el-button>
 * ```
 */
export const permission: Directive<HTMLElement, RoleCode | RoleCode[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<RoleCode | RoleCode[]>) {
    checkPermission(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding<RoleCode | RoleCode[]>) {
    checkPermission(el, binding)
  }
}

function checkPermission(el: HTMLElement, binding: DirectiveBinding<RoleCode | RoleCode[]>) {
  const { value } = binding
  if (!value) return

  const authStore = useAuthStore()
  const requiredRoles = Array.isArray(value) ? value : [value]

  const hasPermission = requiredRoles.some((role) => authStore.roles.includes(role))

  if (!hasPermission) {
    // 从 DOM 中移除元素
    el.parentNode?.removeChild(el)
  }
}

export default permission
