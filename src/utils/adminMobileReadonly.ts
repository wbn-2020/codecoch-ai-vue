export const ADMIN_MOBILE_READONLY_QUERY = '(max-width: 760px)'

export const ADMIN_MOBILE_READONLY_HINT = '手机端仅用于只读巡检，写操作请切到桌面端处理。'

export const ADMIN_MOBILE_READONLY_BLOCK_MESSAGE =
  '移动巡检模式已拦截本次写入，数据不会变更。请在运营首页只读排查，或切换到桌面端处理。'

export const isAdminMobileReadonlyViewport = () => {
  if (typeof window === 'undefined') return false
  if (!window.location.pathname.startsWith('/admin')) return false
  return Boolean(window.matchMedia?.(ADMIN_MOBILE_READONLY_QUERY).matches)
}
