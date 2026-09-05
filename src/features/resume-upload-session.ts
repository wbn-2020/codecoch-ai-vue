import type { ResumeParseStatusVO } from '@/types/resume'

export const MAX_RESUME_UPLOAD_BYTES = 20 * 1024 * 1024
export const RESUME_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000
export const RESUME_UPLOAD_EXTENSIONS = ['pdf', 'doc', 'docx', 'md', 'txt'] as const

interface ResumeUploadFileCandidate {
  name: string
  size: number
}

export interface ResumeUploadValidationResult {
  valid: boolean
  message: string
}

export interface ResumeUploadDescriptor {
  name: string
  size: number
  type: string
  fingerprint: string
  startedAt: string
}

export interface ResumeUploadReceipt {
  descriptor: ResumeUploadDescriptor
  task: ResumeParseStatusVO
  updatedAt: string
}

interface ResumeUploadErrorCandidate {
  code?: unknown
  message?: unknown
}

const ACTIVE_UPLOAD_KEY = 'codecoachai:resume-upload:active'
const RECEIPTS_KEY = 'codecoachai:resume-upload:receipts'
const MAX_RECEIPTS = 20

const readJson = <T>(storage: Storage, key: string, fallback: T): T => {
  try {
    return JSON.parse(storage.getItem(key) || '') as T
  } catch {
    return fallback
  }
}

const fallbackContentHash = (bytes: Uint8Array) => {
  let hash = 2166136261
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const formatFileSizeMb = (size: number) => {
  const sizeMb = size / (1024 * 1024)
  return (Math.ceil(sizeMb * 100) / 100).toFixed(2)
}

export const validateResumeUploadFile = (
  file: ResumeUploadFileCandidate
): ResumeUploadValidationResult => {
  if (file.size <= 0) {
    return {
      valid: false,
      message: `文件“${file.name || '未命名文件'}”为空，请重新导出为包含内容的 PDF、DOC、DOCX、MD 或 TXT 后上传。`
    }
  }

  const normalizedName = String(file.name || '').replace(/\\/g, '/')
  const simpleName = normalizedName.slice(normalizedName.lastIndexOf('/') + 1)
  const extensionIndex = simpleName.lastIndexOf('.')
  const extension = extensionIndex >= 0
    ? simpleName.slice(extensionIndex + 1).toLowerCase()
    : ''
  if (
    !simpleName
    || simpleName.includes('..')
    || !RESUME_UPLOAD_EXTENSIONS.includes(extension as typeof RESUME_UPLOAD_EXTENSIONS[number])
  ) {
    return {
      valid: false,
      message: `文件“${file.name || '未命名文件'}”格式不支持，请选择 PDF、DOC、DOCX、MD 或 TXT 文件。`
    }
  }

  if (file.size > MAX_RESUME_UPLOAD_BYTES) {
    return {
      valid: false,
      message: `文件“${file.name}”超过 20 MB（当前 ${formatFileSizeMb(file.size)} MB），请压缩或拆分后重试。`
    }
  }

  return { valid: true, message: '' }
}

export const isResumeUploadTimeoutError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false
  const candidate = error as ResumeUploadErrorCandidate
  const code = String(candidate.code || '').trim().toUpperCase()
  const message = String(candidate.message || '')
  return code === 'ECONNABORTED'
    || code === 'ETIMEDOUT'
    || /timeout|timed out|超时/i.test(message)
}

export const fingerprintResumeFile = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const subtle = globalThis.crypto?.subtle
  if (subtle) {
    const digest = await subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
  }
  return `fnv1a-${fallbackContentHash(bytes)}-${bytes.length}`
}

export const createResumeUploadDescriptor = async (file: File): Promise<ResumeUploadDescriptor> => ({
  name: file.name,
  size: file.size,
  type: file.type,
  fingerprint: await fingerprintResumeFile(file),
  startedAt: new Date().toISOString()
})

export const matchesResumeUploadDescriptor = (
  descriptor: ResumeUploadDescriptor | null | undefined,
  candidate: ResumeUploadDescriptor | null | undefined
) => Boolean(
  descriptor
  && candidate
  && descriptor.fingerprint
  && descriptor.fingerprint === candidate.fingerprint
)

export const saveActiveResumeUpload = (descriptor: ResumeUploadDescriptor) => {
  localStorage.setItem(ACTIVE_UPLOAD_KEY, JSON.stringify(descriptor))
}

export const readActiveResumeUpload = () =>
  readJson<ResumeUploadDescriptor | null>(localStorage, ACTIVE_UPLOAD_KEY, null)

export const clearActiveResumeUpload = () => localStorage.removeItem(ACTIVE_UPLOAD_KEY)

export const readResumeUploadReceipts = () =>
  readJson<ResumeUploadReceipt[]>(localStorage, RECEIPTS_KEY, [])
    .filter((item) => Boolean(item?.descriptor?.fingerprint && item?.task?.analysisRecordId))

export const findResumeUploadReceipt = (fingerprint: string) =>
  readResumeUploadReceipts().find((item) => item.descriptor.fingerprint === fingerprint)

export const saveResumeUploadReceipt = (
  descriptor: ResumeUploadDescriptor,
  task: ResumeParseStatusVO
) => {
  const receipt: ResumeUploadReceipt = {
    descriptor,
    task,
    updatedAt: new Date().toISOString()
  }
  const receipts = [
    receipt,
    ...readResumeUploadReceipts().filter((item) => item.descriptor.fingerprint !== descriptor.fingerprint)
  ].slice(0, MAX_RECEIPTS)
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts))
  clearActiveResumeUpload()
  return receipt
}

export const latestResumeUploadReceipt = () =>
  readResumeUploadReceipts()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
