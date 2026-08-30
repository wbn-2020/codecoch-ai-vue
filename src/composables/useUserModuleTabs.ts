import { computed } from 'vue'

import type { ModuleTabItem } from '@/components/user-ui/ModuleTabs.vue'
import {
  getVisibleUserNavigationGroups,
  type UserNavigationGroupKey
} from '@/config/userNavigation'

export const useUserModuleTabs = (groupKey: UserNavigationGroupKey) => computed<ModuleTabItem[]>(() => {
  const group = getVisibleUserNavigationGroups().find((item) => item.key === groupKey)
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
