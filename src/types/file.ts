import type { PageQuery } from '@/types/api'

export interface AdminFileQueryDTO extends PageQuery {
  userId?: number
  bizType?: string
  status?: string
}

export interface FileInfoVO {
  id: number
  userId: number
  bizType: string
  originalFilename: string
  storedFilename: string
  fileExt: string
  mimeType?: string
  fileSize: number
  storageProvider: string
  status: string
  createdAt?: string
  updatedAt?: string
}
