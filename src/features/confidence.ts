// Shared confidence-level label. Several evidence/experiment/campaign surfaces render the same
// HIGH/MEDIUM/LOW confidence badge with an identical "置信度待确认" fallback, so keep one source of
// truth here rather than re-declaring the map per view.
//
// Note: interview-report has an intentionally different fallback (it echoes unknown raw codes), so
// it is NOT consolidated here.
export const confidenceLabel = (confidence?: string) => {
  const value = String(confidence || '').trim().toUpperCase()
  if (value === 'HIGH') return '高置信度'
  if (value === 'MEDIUM') return '中置信度'
  if (value === 'LOW') return '低置信度'
  return '置信度待确认'
}
