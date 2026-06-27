import type { PageQuery } from './api'

export interface AnnouncementQueryDTO extends PageQuery {
  keyword?: string
  status?: number | ''
}

export interface AnnouncementVO {
  id: number
  title: string
  content: string
  type?: string
  status?: number
  targetUsers?: string
  createdBy?: number
  publishedAt?: string
  expiredAt?: string
  deleted?: number
  createdAt?: string
  updatedAt?: string
}

export interface AnnouncementSaveDTO {
  title: string
  content: string
  type?: string
  targetUsers?: string
  expiredAt?: string
}
