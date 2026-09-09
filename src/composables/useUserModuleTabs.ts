import { computed } from 'vue'

import type { ModuleTabItem } from '@/components/user-ui/ModuleTabs.vue'
import {
  getAllUserNavigationGroups,
  type UserNavigationGroupKey
} from '@/config/userNavigation'

export const useUserModuleTabs = (groupKey: UserNavigationGroupKey) => computed<ModuleTabItem[]>(() => {
  // 页内 module tabs 服务所有逻辑组（含 P0 收敛后不再进主导航的 prepare/matching），
  // 因此读全量组而非仅 primary 组。
  const group = getAllUserNavigationGroups().find((item) => item.key === groupKey)
  return (group?.items || []).map((item) => ({
    key: item.key,
    label: item.label,
    to: item.path,
    exact: !item.prefixes?.length,
    exactPaths: item.exactPaths,
    prefixes: item.prefixes,
    routeNames: item.routeNames
  }))
})
