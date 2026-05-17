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
  businessType?: string
  businessId?: number | string
  originalFilename: string
  storedFilename: string
  fileExt: string
  mimeType?: string
  fileSize: number
  storageProvider: string
  status: string
  resumeId?: number | string
  resumeAnalysisRecordId?: number | string
  parseStatus?: string
  parseErrorMessage?: string
  analysisConfirmed?: boolean | null
  parsedAt?: string
  confirmedAt?: string
  createdAt?: string
  updatedAt?: string
}
