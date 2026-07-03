const JSON_SECRET = /("(?:api[-_]?key|authorization|bearer|token|password|secret|cookie)"\s*:\s*")[^"]+(")/gi
const JSON_LONG_TEXT = /("(?:resumeContent|jobDescription|jd|prompt|renderedPrompt|aiResponse|rawOutputText|rawPrompt|rawResponse|answerText|evidenceSummary|recommendReason)"\s*:\s*")[^"]+(")/gi
const KV_SECRET = /\b(api[-_ ]?key|authorization|bearer|token|password|secret|cookie)\b\s*[:=]\s*([^\s,;&]+)/gi
const QUERY_SECRET = /([?&](?:api[-_]?key|authorization|bearer|token|password|secret|cookie|prompt|response|resume|jd|raw|answer)[^=]*=)[^&\s]+/gi
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const CHINA_MOBILE = /\b1[3-9]\d{9}\b/g
const ID_CARD = /\b\d{6}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g

export const redactSensitiveText = (value: unknown, maxLength = 240) => {
  const text = String(value || '').trim()
  if (!text) return ''

  const masked = text
    .replace(QUERY_SECRET, '$1******')
    .replace(JSON_SECRET, '$1******$2')
    .replace(JSON_LONG_TEXT, '$1******$2')
    .replace(KV_SECRET, '$1=******')
    .replace(EMAIL, '***@***')
    .replace(CHINA_MOBILE, '1**********')
    .replace(ID_CARD, '******************')
    .replace(/\s+/g, ' ')
    .trim()

  return masked.length > maxLength ? `${masked.slice(0, maxLength)}...` : masked
}
