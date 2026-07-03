import request from '@/utils/request'
import { normalizeAbilityMap } from '@/features/ability-map'
import type { AbilityMapVO } from '@/types/abilityMap'

export const getAbilityMapApi = () => {
  return request
    .get<AbilityMapVO, AbilityMapVO>('/ability-map')
    .then(normalizeAbilityMap)
}
