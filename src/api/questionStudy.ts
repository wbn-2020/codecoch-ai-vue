import request from '@/utils/request'

export interface WeakCategoryVO {
  categoryId: number
  categoryName?: string
  totalCount: number
  wrongCount: number
  wrongRate: number
}

export interface WeaknessAnalysisVO {
  totalAnswered: number
  correctRate: number
  weakCategories: WeakCategoryVO[]
  weakDifficulties: string[]
}

export const getWeaknessAnalysisApi = () => {
  return request
    .get<WeaknessAnalysisVO, WeaknessAnalysisVO>('/questions/weakness-analysis')
    .then((result) => ({
      totalAnswered: result.totalAnswered || 0,
      correctRate: result.correctRate || 0,
      weakCategories: result.weakCategories || [],
      weakDifficulties: result.weakDifficulties || []
    }))
}
