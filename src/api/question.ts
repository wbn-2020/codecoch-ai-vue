import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type { QuestionQuery, QuestionSummaryVO } from '@/types/question'

// V1 stage 1 keeps question pages as placeholders. These wrappers are reserved
// for later integration and are not called by current placeholder pages.
export const getQuestionsApi = (params: QuestionQuery) => {
  return request.get<PageResult<QuestionSummaryVO>, PageResult<QuestionSummaryVO>>('/questions', {
    params
  })
}
