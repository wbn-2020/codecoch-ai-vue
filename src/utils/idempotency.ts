export const createOperationIdempotencyKey = (prefix: string) => {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}:${random}`.replace(/[^A-Za-z0-9:_-]/g, '-')
}
