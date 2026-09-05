import type {
  ResumeAnalysisResultVO,
  ResumeImportQualityReportVO,
  ResumeImportWritePreviewVO
} from '@/types/resume'

export const RESUME_IMPORT_SCHEMA_VERSION = 'resume-import-v1'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const nonBlankText = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const textList = (value: unknown) =>
  Array.isArray(value)
    ? value.map(nonBlankText).filter(Boolean)
    : []

const writePreviewList = (value: unknown): ResumeImportWritePreviewVO[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter(isRecord)
    .map((item) => ({
      fieldKey: nonBlankText(item.fieldKey),
      label: nonBlankText(item.label),
      value: nonBlankText(item.value),
      status: nonBlankText(item.status)
    }))
    .filter((item) => item.fieldKey || item.label || item.value)
}

export const normalizeResumeImportQualityReport = (
  value: unknown
): ResumeImportQualityReportVO | null => {
  if (!isRecord(value)) return null

  return {
    schemaVersion: nonBlankText(value.schemaVersion),
    policyVersion: nonBlankText(value.policyVersion),
    validationStatus: nonBlankText(value.validationStatus),
    confirmable: value.confirmable === true,
    duplicateProjectsRemoved: Number.isFinite(Number(value.duplicateProjectsRemoved))
      ? Math.max(0, Number(value.duplicateProjectsRemoved))
      : 0,
    blockers: textList(value.blockers),
    warnings: textList(value.warnings),
    missingContacts: textList(value.missingContacts),
    writePreview: writePreviewList(value.writePreview)
  }
}

export const resumeImportWritePreviewStatusText = (status?: string) => {
  if (status === 'WILL_WRITE') return '将写入'
  if (status === 'MISSING') return '不写入'
  return '待核验'
}

export const getResumeImportConfirmBlockedReason = (
  result?: Pick<
    ResumeAnalysisResultVO,
    'parseStatus' | 'schemaVersion' | 'validationStatus' | 'qualityReport'
  > | null
) => {
  if (!result) return '解析结果尚未加载'
  if (result.parseStatus !== 'WAIT_CONFIRM') return '仅待确认的解析结果可生成简历'
  if (result.schemaVersion !== RESUME_IMPORT_SCHEMA_VERSION) return '解析结果版本不受支持，请重新解析'

  const qualityReport = normalizeResumeImportQualityReport(result.qualityReport)
  if (!qualityReport) return '缺少导入质量报告，请重新解析'
  if (qualityReport.schemaVersion !== RESUME_IMPORT_SCHEMA_VERSION) return '质量报告版本不受支持，请重新解析'
  if (result.validationStatus !== 'VALID' || qualityReport.validationStatus !== 'VALID') {
    return '解析结果未通过写入校验，请处理阻断项后重新解析'
  }
  if (qualityReport.blockers.length) return '解析结果存在阻断项，请处理后重新解析'
  if (!qualityReport.confirmable) return '解析结果尚不可确认，请重新解析'
  return ''
}

export const isResumeImportConfirmable = (
  result?: Pick<
    ResumeAnalysisResultVO,
    'parseStatus' | 'schemaVersion' | 'validationStatus' | 'qualityReport'
  > | null
) => !getResumeImportConfirmBlockedReason(result)
