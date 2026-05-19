import request from '@/utils/request'

export interface DailyTaskVO {
  id: number
  title: string
  description?: string
  type: string
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED'
  relatedId?: number
  relatedType?: string
  planDate: string
  completedAt?: string
}

export interface DailyTaskListVO {
  date: string
  tasks: DailyTaskVO[]
  completedCount: number
  totalCount: number
  streak: number
  isCheckedIn: boolean
}

export interface CheckinVO {
  streak: number
  message: string
}

export const getDailyTasksApi = (planId: number, date?: string) => {
  return request.get<DailyTaskListVO, DailyTaskListVO>(`/study-plans/${planId}/daily-view`, {
    params: date ? { date } : undefined
  })
}

export const completeTaskApi = (taskId: number) => {
  return request.post<DailyTaskVO, DailyTaskVO>(`/study-tasks/${taskId}/complete`)
}

export const skipTaskApi = (taskId: number) => {
  return request.post<DailyTaskVO, DailyTaskVO>(`/study-tasks/${taskId}/skip`)
}

export const checkinApi = () => {
  return request.post<CheckinVO, CheckinVO>('/study-checkins')
}
