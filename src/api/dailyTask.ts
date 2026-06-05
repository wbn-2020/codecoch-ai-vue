import request from '@/utils/request'
import type { StudyPlanDailyViewVO, StudyTaskVO } from '@/types/studyPlan'

export type DailyTaskVO = StudyTaskVO
export type DailyTaskListVO = StudyPlanDailyViewVO

export interface CheckinVO {
  streak: number
  message: string
  planId?: number
  studyMinutes?: number
  note?: string
}

export const getDailyTasksApi = (planId: number, date?: string) => {
  return request.get<DailyTaskListVO, DailyTaskListVO>(`/study-plans/${planId}/daily-view`, {
    params: date ? { date } : undefined
  })
}

export const completeTaskApi = (taskId: number) => {
  return request.post<StudyTaskVO, StudyTaskVO>(`/study-tasks/${taskId}/complete`)
}

export const skipTaskApi = (taskId: number) => {
  return request.post<StudyTaskVO, StudyTaskVO>(`/study-tasks/${taskId}/skip`)
}

export const checkinApi = (data?: { planId?: number; studyMinutes?: number; note?: string }) => {
  return request.post<CheckinVO, CheckinVO>('/study-checkins', data || {})
}
