export type RequestErrorCategory =
  | 'authentication'
  | 'permission'
  | 'validation'
  | 'conflict'
  | 'not-found'
  | 'rate-limit'
  | 'timeout'
  | 'network'
  | 'server'
  | 'business'
  | 'unknown'

export interface RequestErrorDiagnostic {
  id: string
  method?: string
  url?: string
  status?: number
  code?: number
  message: string
  category: RequestErrorCategory
  categoryLabel: string
  retryable: boolean
  nextAction: string
  traceId?: string
  routePath?: string
  module?: string
  requestKey?: string
  occurredAt: string
}

export type RequestErrorDiagnosticInput = Omit<
  RequestErrorDiagnostic,
  'id' | 'occurredAt' | 'category' | 'categoryLabel' | 'retryable' | 'nextAction'
> & Partial<Pick<
  RequestErrorDiagnostic,
  'category' | 'categoryLabel' | 'retryable' | 'nextAction'
>>

export const REQUEST_ERROR_EVENT = 'codecoachai:request-error'

const duplicateWindowMs = 1500
const recentlyEmitted = new Map<string, number>()

const includesAny = (message: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(message))

export const resolveRequestErrorGuidance = (
  payload: Pick<RequestErrorDiagnosticInput, 'status' | 'code' | 'message'>
): Pick<RequestErrorDiagnostic, 'category' | 'categoryLabel' | 'retryable' | 'nextAction'> => {
  const status = Number(payload.status || 0)
  const message = String(payload.message || '').trim()

  if (status === 401 || includesAny(message, [/登录.*失效/, /未登录/, /token.*(?:失效|过期)/i])) {
    return {
      category: 'authentication',
      categoryLabel: '登录状态',
      retryable: false,
      nextAction: '重新登录后再执行该操作。'
    }
  }
  if (status === 403 || includesAny(message, [/无权/, /无权限/, /禁止访问/, /forbidden/i])) {
    return {
      category: 'permission',
      categoryLabel: '权限限制',
      retryable: false,
      nextAction: '确认当前账号权限；如权限应已开通，请将错误编号交给管理员核查。'
    }
  }
  if (status === 404) {
    return {
      category: 'not-found',
      categoryLabel: '资源不存在',
      retryable: false,
      nextAction: '返回列表确认该数据是否已被删除或归档。'
    }
  }
  if (
    status === 409
    || includesAny(message, [/冲突/, /重复/, /已存在/, /当前状态.*(?:不允许|不能)/])
  ) {
    return {
      category: 'conflict',
      categoryLabel: '数据冲突',
      retryable: false,
      nextAction: '刷新当前数据，确认最新状态后再提交。'
    }
  }
  if (
    status === 400
    || status === 422
    || includesAny(message, [/参数/, /格式/, /必填/, /校验/, /不能为空/, /不合法/])
  ) {
    return {
      category: 'validation',
      categoryLabel: '输入校验',
      retryable: false,
      nextAction: '检查页面中标记的必填项和格式后重新提交。'
    }
  }
  if (status === 429 || includesAny(message, [/请求过于频繁/, /限流/, /rate limit/i])) {
    return {
      category: 'rate-limit',
      categoryLabel: '请求频率限制',
      retryable: true,
      nextAction: '等待片刻后重试，避免连续重复提交。'
    }
  }
  if (
    status === 408
    || includesAny(message, [/超时/, /timeout/i, /timed out/i])
  ) {
    return {
      category: 'timeout',
      categoryLabel: '请求超时',
      retryable: true,
      nextAction: '确认网络稳定后重试；涉及生成任务时先检查任务中心，避免重复提交。'
    }
  }
  if (
    status === 0
    && includesAny(message, [/网络/, /network/i, /连接失败/, /ERR_NETWORK/i])
  ) {
    return {
      category: 'network',
      categoryLabel: '网络连接',
      retryable: true,
      nextAction: '检查本机网络后重试；若持续失败，请保留错误编号。'
    }
  }
  if (status >= 500) {
    return {
      category: 'server',
      categoryLabel: '服务异常',
      retryable: true,
      nextAction: '稍后重试；如有错误编号，请将其提供给管理员定位服务日志。'
    }
  }
  if (payload.code !== undefined) {
    return {
      category: 'business',
      categoryLabel: '业务处理',
      retryable: false,
      nextAction: '根据错误原因调整当前操作；如无法处理，请保留错误编号反馈。'
    }
  }
  return {
    category: 'unknown',
    categoryLabel: '未知异常',
    retryable: true,
    nextAction: '重试一次；若仍失败，请保留错误编号和当前操作步骤。'
  }
}

export const enrichRequestErrorDiagnostic = (
  payload: RequestErrorDiagnosticInput
): Omit<RequestErrorDiagnostic, 'id' | 'occurredAt'> => ({
  ...payload,
  ...resolveRequestErrorGuidance(payload),
  category: payload.category ?? resolveRequestErrorGuidance(payload).category,
  categoryLabel: payload.categoryLabel ?? resolveRequestErrorGuidance(payload).categoryLabel,
  retryable: payload.retryable ?? resolveRequestErrorGuidance(payload).retryable,
  nextAction: payload.nextAction ?? resolveRequestErrorGuidance(payload).nextAction
})

export const formatRequestErrorNotice = (
  payload: Pick<RequestErrorDiagnostic, 'message' | 'nextAction' | 'traceId'>
) => {
  const parts = [payload.message, payload.nextAction]
  if (payload.traceId) parts.push(`错误编号：${payload.traceId}`)
  return parts.filter(Boolean).join(' ')
}

const diagnosticKey = (payload: Omit<RequestErrorDiagnostic, 'id' | 'occurredAt'>) =>
  payload.requestKey
  || [
    payload.routePath,
    payload.module,
    payload.method,
    payload.url,
    payload.status,
    payload.code,
    payload.message,
    payload.traceId
  ].map((value) => String(value || '').trim()).join('|')

export const emitRequestError = (
  payload: RequestErrorDiagnosticInput
) => {
  const enrichedPayload = enrichRequestErrorDiagnostic(payload)
  const now = Date.now()
  const key = diagnosticKey(enrichedPayload)
  const previous = recentlyEmitted.get(key)
  if (previous !== undefined && now - previous < duplicateWindowMs) {
    return false
  }

  recentlyEmitted.set(key, now)
  if (recentlyEmitted.size > 80) {
    Array.from(recentlyEmitted.entries())
      .filter(([, emittedAt]) => now - emittedAt >= duplicateWindowMs)
      .forEach(([staleKey]) => recentlyEmitted.delete(staleKey))
  }

  const detail: RequestErrorDiagnostic = {
    ...enrichedPayload,
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: new Date().toISOString()
  }
  window.dispatchEvent(new CustomEvent<RequestErrorDiagnostic>(REQUEST_ERROR_EVENT, { detail }))
  return true
}

export const resetRequestErrorDiagnosticsForTest = () => {
  recentlyEmitted.clear()
}
