export interface RequestErrorDiagnostic {
  id: string
  method?: string
  url?: string
  status?: number
  code?: number
  message: string
  traceId?: string
  occurredAt: string
}

export const REQUEST_ERROR_EVENT = 'codecoachai:request-error'

export const emitRequestError = (payload: Omit<RequestErrorDiagnostic, 'id' | 'occurredAt'>) => {
  const detail: RequestErrorDiagnostic = {
    ...payload,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: new Date().toISOString()
  }
  window.dispatchEvent(new CustomEvent<RequestErrorDiagnostic>(REQUEST_ERROR_EVENT, { detail }))
}
