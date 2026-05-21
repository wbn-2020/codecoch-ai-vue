import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type { AxiosError } from 'axios'

export interface NotificationVO {
  id: number
  title: string
  content?: string
  type: string
  isRead: number
  readStatus?: number | string
  createdAt: string
  relatedId?: number | string
  relatedType?: string
  bizId?: number | string
  bizType?: string
}

export interface NotificationQueryDTO {
  pageNo: number
  pageSize: number
  isRead?: number | ''
  type?: string
}

export interface UnreadCountVO {
  total: number
  unreadCount?: number
}

type BackendNotificationVO = NotificationVO & {
  readStatus?: number | string
  bizId?: number | string
  bizType?: string
}

const normalizeReadFlag = (value: unknown) => {
  if (value === 1 || value === '1' || value === true || value === 'READ') return 1
  return 0
}

const normalizeRelatedType = (value?: string) => {
  if (!value) return undefined
  const token = value.replace(/[.-]/g, '_').toUpperCase()
  if (token.includes('INTERVIEW') && token.includes('REPORT')) return 'INTERVIEW_REPORT'
  if (token.includes('RESUME') && token.includes('PARSE')) return 'RESUME_PARSE'
  if (token.includes('STUDY') && token.includes('PLAN')) return 'STUDY_PLAN'
  return token
}

const normalizeNotification = (item: BackendNotificationVO): NotificationVO => ({
  ...item,
  type: item.type || item.bizType || 'SYSTEM',
  isRead: item.isRead ?? normalizeReadFlag(item.readStatus),
  relatedId: item.relatedId ?? item.bizId,
  relatedType: normalizeRelatedType(item.relatedType ?? item.bizType)
})

const normalizeUnreadCount = (result: UnreadCountVO | number) => {
  if (typeof result === 'number') {
    return { total: result, unreadCount: result }
  }

  const total = result.total ?? result.unreadCount ?? 0
  return {
    ...result,
    total,
    unreadCount: result.unreadCount ?? total
  }
}

export const getNotificationsApi = (params: NotificationQueryDTO) => {
  const query: Record<string, unknown> = { ...params }
  if (params.isRead !== undefined && params.isRead !== '') {
    query.readStatus = params.isRead
  }
  delete query.isRead

  return request
    .get<PageResult<BackendNotificationVO>, PageResult<BackendNotificationVO>>('/notifications', { params: query })
    .then((result) => ({
      ...result,
      records: (result.records || []).map(normalizeNotification)
    }))
}

export const getUnreadCountApi = () => {
  return request.get<UnreadCountVO | number, UnreadCountVO | number>('/notifications/unread-count')
    .then(normalizeUnreadCount)
}

export const markNotificationReadApi = (id: number) => {
  return request.put<null, null>(`/notifications/${id}/read`).catch((error: AxiosError) => {
    const status = error.response?.status
    if (status === 404 || status === 405) {
      return request.post<null, null>(`/notifications/${id}/read`)
    }
    throw error
  })
}

export const markAllNotificationsReadApi = () => {
  return request.post<null, null>('/notifications/read-all')
}
