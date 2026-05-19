import request from '@/utils/request'
import type { PageResult } from '@/types/api'

export interface NotificationVO {
  id: number
  title: string
  content?: string
  type: string
  isRead: number
  readStatus?: number | string
  createdAt: string
  relatedId?: number
  relatedType?: string
  bizId?: number
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
}

type BackendNotificationVO = NotificationVO & {
  readStatus?: number | string
  bizId?: number
  bizType?: string
}

const normalizeReadFlag = (value: unknown) => {
  if (value === 1 || value === '1' || value === true || value === 'READ') return 1
  return 0
}

const normalizeNotification = (item: BackendNotificationVO): NotificationVO => ({
  ...item,
  type: item.type || item.bizType || 'SYSTEM',
  isRead: item.isRead ?? normalizeReadFlag(item.readStatus),
  relatedId: item.relatedId ?? item.bizId,
  relatedType: item.relatedType ?? item.bizType
})

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
    .then((result) => typeof result === 'number' ? { total: result } : result)
}

export const markNotificationReadApi = (id: number) => {
  return request.post<null, null>(`/notifications/${id}/read`)
}

export const markAllNotificationsReadApi = () => {
  return request.post<null, null>('/notifications/read-all')
}
