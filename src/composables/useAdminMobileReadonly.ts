import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import {
  ADMIN_MOBILE_READONLY_HINT,
  ADMIN_MOBILE_READONLY_QUERY
} from '@/utils/adminMobileReadonly'

export const useAdminMobileReadonly = () => {
  const route = useRoute()
  const isNarrowScreen = ref(false)
  let mediaQuery: MediaQueryList | null = null

  const syncViewport = () => {
    isNarrowScreen.value = Boolean(mediaQuery?.matches)
  }

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mediaQuery = window.matchMedia(ADMIN_MOBILE_READONLY_QUERY)
    syncViewport()
    mediaQuery.addEventListener?.('change', syncViewport)
  })

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener?.('change', syncViewport)
  })

  const isAdminMobileReadonly = computed(() => route.path.startsWith('/admin') && isNarrowScreen.value)
  const mobileReadonlyHint = computed(() => (isAdminMobileReadonly.value ? ADMIN_MOBILE_READONLY_HINT : undefined))

  const mobileReadonlyTitle = (fallback?: string) => mobileReadonlyHint.value || fallback

  const withMobileReadonlyDisabled = (disabled = false) => disabled || isAdminMobileReadonly.value

  const guardAdminMobileWrite = () => {
    if (!isAdminMobileReadonly.value) return true
    ElMessage.warning(ADMIN_MOBILE_READONLY_HINT)
    return false
  }

  return {
    guardAdminMobileWrite,
    isAdminMobileReadonly,
    mobileReadonlyHint,
    mobileReadonlyTitle,
    withMobileReadonlyDisabled
  }
}
