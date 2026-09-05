export type JobApplicationAttachmentType =
  | 'RESUME'
  | 'COVER_LETTER'
  | 'PORTFOLIO'
  | 'CERTIFICATE'
  | 'OTHER'
  | string

export interface JobApplicationAttachmentVO {
  id: number
  packageId?: number | null
  applicationId?: number | null
  fileId: number
  attachmentType?: JobApplicationAttachmentType
  displayName?: string
  originalFilename?: string
  mimeType?: string
  fileSize?: number
  sortOrder?: number
  downloadUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface JobApplicationAttachmentUploadOptions {
  attachmentType?: JobApplicationAttachmentType
  displayName?: string
}
