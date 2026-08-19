export interface ReliableDownloadOptions {
  filename: string
  allowedExtensions: string[]
  allowedMimeTypes: string[]
  minBytes?: number
  maxBytes?: number
}

export interface DownloadReceipt {
  filename: string
  mimeType: string
  size: number
}

const normalizeExtension = (value: string) => value.trim().toLowerCase().replace(/^\./, '')
const normalizeMimeType = (value: string) => value.split(';', 1)[0].trim().toLowerCase()

const sanitizeFilename = (value: string) => {
  const leaf = value.split(/[\\/]/).pop()?.trim() || 'download'
  const sanitized = leaf
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_')
    .replace(/[. ]+$/g, '')
    .slice(0, 180)
  return sanitized || 'download'
}

const filenameExtension = (value: string) => normalizeExtension(value.split('.').pop() || '')

export const validateDownloadBlob = (
  blob: Blob,
  options: ReliableDownloadOptions
): DownloadReceipt => {
  if (!(blob instanceof Blob)) {
    throw new Error('下载响应不是有效文件。')
  }

  const minBytes = options.minBytes ?? 1
  if (blob.size < minBytes) {
    throw new Error('下载文件为空或内容不完整。')
  }
  if (options.maxBytes != null && blob.size > options.maxBytes) {
    throw new Error('下载文件大小超过允许范围。')
  }

  const allowedExtensions = options.allowedExtensions.map(normalizeExtension).filter(Boolean)
  const allowedMimeTypes = options.allowedMimeTypes.map(normalizeMimeType).filter(Boolean)
  const mimeType = normalizeMimeType(blob.type)
  if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
    throw new Error(`下载文件类型异常：${mimeType || '未提供 MIME'}。`)
  }

  let filename = sanitizeFilename(options.filename)
  let extension = filenameExtension(filename)
  if (!allowedExtensions.includes(extension)) {
    if (extension) {
      throw new Error(`下载文件扩展名不受支持：.${extension}。`)
    }
    extension = allowedExtensions[0] || ''
    if (extension) filename = `${filename}.${extension}`
  }

  return { filename, mimeType, size: blob.size }
}

export const downloadBlobReliably = (
  blob: Blob,
  options: ReliableDownloadOptions
): DownloadReceipt => {
  const receipt = validateDownloadBlob(blob, options)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  try {
    anchor.href = url
    anchor.download = receipt.filename
    anchor.rel = 'noopener'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    return receipt
  } finally {
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}

export const extensionFromFilename = (filename: string) => filenameExtension(filename)

const MIME_TYPES_BY_EXTENSION: Record<string, string[]> = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  zip: ['application/zip', 'application/x-zip-compressed'],
  json: ['application/json', 'text/json'],
  md: ['text/markdown', 'text/plain'],
  csv: ['text/csv', 'application/csv', 'application/vnd.ms-excel'],
  ics: ['text/calendar']
}

export const reliableDownloadOptionsForFile = (
  filename: string,
  declaredMimeType?: string | null,
  maxBytes = 200 * 1024 * 1024
): ReliableDownloadOptions => {
  const extension = filenameExtension(filename)
  const declared = normalizeMimeType(declaredMimeType || '')
  const allowedMimeTypes = Array.from(new Set([
    ...(MIME_TYPES_BY_EXTENSION[extension] || []),
    ...(declared ? [declared] : [])
  ]))
  if (!extension || !allowedMimeTypes.length) {
    throw new Error('无法确认下载文件的扩展名或 MIME 类型。')
  }
  return {
    filename,
    allowedExtensions: [extension],
    allowedMimeTypes,
    maxBytes
  }
}
