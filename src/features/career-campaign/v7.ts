import type {
  ApplicationWorkspaceVO,
  CareerOfferComparison,
  CareerOfferVO,
  CareerMemoryCandidateVO,
  V7Capability,
  V7SectionKey,
  WorkspaceCoverage
} from '@/types/v7/career'

export const BASE_WORKSPACE_TABS: Array<{ key: V7SectionKey; label: string }> = [
  { key: 'overview', label: '概览' },
  { key: 'timeline', label: '时间线' },
  { key: 'materials', label: '材料' },
  { key: 'next-steps', label: '下一步' }
]

export const OPTIONAL_WORKSPACE_TABS: Array<{
  key: V7SectionKey
  label: string
  capability: V7Capability
}> = [
  { key: 'interview', label: '面试', capability: 'REAL_INTERVIEW' },
  { key: 'offer', label: 'Offer', capability: 'OFFER' },
  { key: 'contacts', label: '联系人', capability: 'CONTACT_ACTIVITY' },
  { key: 'research', label: '研究', capability: 'RESEARCH' }
]

const normalizeCapability = (value: string) =>
  value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toUpperCase()

export const resolveV7Capabilities = (
  raw: ApplicationWorkspaceVO['capabilities']
): Set<string> => {
  if (Array.isArray(raw)) {
    return new Set(raw.map((item) => normalizeCapability(String(item))).filter(Boolean))
  }
  if (!raw || typeof raw !== 'object') return new Set()
  return new Set(
    Object.entries(raw)
      .filter(([, value]) => value === true || value === 'AVAILABLE' || value === 'ENABLED')
      .map(([key]) => normalizeCapability(key))
  )
}

export const getWorkspaceTabs = (rawCapabilities: ApplicationWorkspaceVO['capabilities']) => {
  if (rawCapabilities === undefined || rawCapabilities === null) {
    return [...BASE_WORKSPACE_TABS, ...OPTIONAL_WORKSPACE_TABS]
  }
  const capabilities = resolveV7Capabilities(rawCapabilities)
  return [
    ...BASE_WORKSPACE_TABS,
    ...OPTIONAL_WORKSPACE_TABS.filter((item) => capabilities.has(item.capability))
  ]
}

export const getWorkspacePartialFailures = (workspace?: ApplicationWorkspaceVO | null) => {
  const coverage = workspace?.coverage
  const legacyFailures = coverage && !Array.isArray(coverage) && !('failed' in coverage)
    ? Object.entries(coverage)
      .filter(([, item]) => item && typeof item === 'object' && item.available === false)
      .map(([key]) => key)
    : []
  const failures = new Set([
    ...legacyFailures,
    ...(('failed' in (coverage || {})) ? ((coverage as WorkspaceCoverage).failed || []) : []),
    ...(('unavailable' in (coverage || {})) ? ((coverage as WorkspaceCoverage).unavailable || []) : []),
    ...(workspace?.sections
      ? Object.entries(workspace.sections)
        .filter(([, section]) => Boolean(section?.error))
        .map(([key]) => key)
      : [])
  ])
  return Array.from(failures)
}

export type V7GetErrorKind = 'not-found' | 'forbidden' | 'network' | 'unknown'

export const classifyV7GetError = (error: unknown): V7GetErrorKind => {
  const payload = error && typeof error === 'object'
    ? error as {
        code?: unknown
        message?: unknown
        response?: { status?: unknown; data?: { code?: unknown } }
      }
    : {}
  const status = Number(payload.response?.status)
  const directCode = typeof payload.code === 'number' ? payload.code : undefined
  const responseCode = typeof payload.response?.data?.code === 'number'
    ? payload.response.data.code
    : undefined
  const code = directCode ?? responseCode
  if (status === 404 || code === 40400) return 'not-found'
  if (status === 403 || code === 41003) return 'forbidden'
  const message = String(payload.message || '')
  if (!status && (/network error|failed to fetch|timeout|超时|网络/i.test(message) || payload.code === 'ERR_NETWORK')) {
    return 'network'
  }
  return 'unknown'
}

export const canTransitionApplicationStatus = (
  currentStatus: string | undefined,
  nextStatus: string,
  allowedTransitions?: string[]
) => {
  const current = String(currentStatus || 'SAVED').toUpperCase()
  const next = String(nextStatus || '').toUpperCase()
  const allowed = getAllowedApplicationStatusTransitions(current, allowedTransitions)
  return Boolean(next && next !== current && allowed.includes(next))
}

export const getAllowedApplicationStatusTransitions = (
  _currentStatus?: string,
  backendAllowedTransitions?: string[]
) => {
  if (backendAllowedTransitions === undefined) return []
  return Array.from(new Set(
    backendAllowedTransitions
      .map((item) => String(item || '').trim().toUpperCase())
      .filter(Boolean)
  ))
}

export const canArchiveCareerCampaign = (status?: string, backendAllowedTransitions?: string[]) =>
  String(status || '').toUpperCase() === 'COMPLETED'
  && Array.isArray(backendAllowedTransitions)
  && backendAllowedTransitions
    .map((item) => String(item || '').trim().toUpperCase())
    .includes('ARCHIVED')

export const canAttachApplicationsToCareerCampaign = (status?: string) =>
  !['COMPLETED', 'ARCHIVED'].includes(String(status || '').toUpperCase())

export const maskContactHint = (value?: string | null) => {
  const text = String(value || '').trim()
  if (!text) return '未提供联系方式'
  if (text.includes('@')) {
    const [name, domain] = text.split('@')
    return `${name.slice(0, 1)}***@${domain}`
  }
  const digits = text.replace(/\D/g, '')
  if (digits.length >= 7) {
    return `${digits.slice(0, 3)}****${digits.slice(-2)}`
  }
  if (text.length > 4) return `${text.slice(0, 2)}***${text.slice(-1)}`
  return '已提供联系方式提示'
}

const numericValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

export const buildOfferComparison = (offers: CareerOfferVO[]): CareerOfferComparison => {
  const activeOffers = offers.filter((offer) => !['WITHDRAWN', 'EXPIRED'].includes(String(offer.status || '').toUpperCase()))
  const currencies = Array.from(new Set(
    activeOffers
      .map((offer) => offer.currentVersion?.currency?.trim().toUpperCase())
      .filter(Boolean)
  ))
  const missingValueOfferIds = activeOffers
    .filter((offer) => numericValue(offer.currentVersion?.totalCompensation ?? offer.currentVersion?.baseSalary) == null)
    .map((offer) => offer.id)
  const warnings: string[] = []
  if (currencies.length > 1) warnings.push('存在多个币种，首期不进行跨币种总分比较。')
  if (missingValueOfferIds.length) warnings.push('部分 Offer 缺少可比较金额，仅展示条款和截止时间。')
  return {
    currency: currencies.length === 1 ? currencies[0] : undefined,
    offers: activeOffers,
    warnings,
    comparable: currencies.length <= 1 && missingValueOfferIds.length < activeOffers.length,
    missingValueOfferIds
  }
}

export const canConfirmMemoryCandidate = (candidate?: CareerMemoryCandidateVO | null) =>
  Boolean(candidate?.id && String(candidate.status || 'CANDIDATE').toUpperCase() === 'CANDIDATE')
