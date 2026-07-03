import { ElMessage } from 'element-plus'

const FRIENDLY_MESSAGE_MAP: Record<string, string> = {
  AGENT_TARGET_JOB_REQUIRED: '还没有当前目标岗位。请先创建或设置一个目标岗位，再生成今日计划。',
  AGENT_RESUME_REQUIRED: '还没有可用简历。请先创建或上传简历，再生成今日计划。',
  AGENT_SKILL_PROFILE_REQUIRED: '还没有能力画像。请先完成简历匹配并生成能力画像，再生成今日计划。',
  AGENT_CONTEXT_REQUIRED: '训练上下文还不完整。请先补齐目标岗位、简历或能力画像后重试。',
  AGENT_AI_CALL_FAILED: 'AI 生成暂时失败，请稍后重试。',
  AGENT_OUTPUT_INVALID: 'AI 返回内容暂时不可用，请重新生成。',
  AI_CALL_FAILED: 'AI 服务暂时不可用，请稍后重试。',
  AI_OUTPUT_PARSE_FAILED: 'AI 返回内容暂时不可用，请重新生成。',
  NO_RESUME_PARSE_RECORD_FOUND: '还没有简历解析记录。请先上传或保存简历，并完成解析。',
  NO_INTERVIEW_FOUND: '还没有面试记录。完成一次模拟面试后这里会展示报告。'
}

const RAW_MESSAGE_MAP: Record<string, string> = {
  'No resume parse record found': FRIENDLY_MESSAGE_MAP.NO_RESUME_PARSE_RECORD_FOUND,
  'No interview found': FRIENDLY_MESSAGE_MAP.NO_INTERVIEW_FOUND,
  'Learning plan response missing stages': '学习计划生成结果缺少阶段任务，请稍后重试或返回报告页重新生成。',
  'Learning plan response missing tasks': '学习计划生成结果缺少可执行任务，请稍后重试或返回报告页重新生成。',
  'Current browser does not support fetch SSE streaming': '当前浏览器暂不支持流式进度，已尝试切换为普通生成。',
  'SSE stream error': '生成进度暂时不可用，请稍后刷新查看结果。',
  '[fallback]': 'AI 结果暂未生成，请稍后重试。',
  fallback: 'AI 结果暂未生成，请稍后重试。'
}

export const toFriendlyMessage = (message?: unknown, fallback = '请求失败，请稍后重试'): string => {
  const raw = typeof message === 'string' ? message.trim() : ''
  if (!raw) return fallback

  const exact = RAW_MESSAGE_MAP[raw] || FRIENDLY_MESSAGE_MAP[raw] || FRIENDLY_MESSAGE_MAP[raw.toUpperCase()]
  if (exact) return exact

  const withoutInternalIds = raw
    .replace(/\[?fallback\]?/gi, '')
    .replace(/\baiCallLogId\s*[:=]\s*\d+\b/gi, '')
    .replace(/\breportId\s*[:=]\s*\d+\b/gi, '')
    .trim()

  if (!withoutInternalIds) return fallback

  const normalizedCode = withoutInternalIds.replace(/[\s-]+/g, '_').toUpperCase()
  if (FRIENDLY_MESSAGE_MAP[normalizedCode]) {
    return FRIENDLY_MESSAGE_MAP[normalizedCode]
  }

  if (/^[A-Z][A-Z0-9_]+$/.test(withoutInternalIds)) {
    return fallback
  }

  if (/\b(DTO|GET\s+\/|POST\s+\/|PUT\s+\/|DELETE\s+\/|DeepSeek|Task completed|Calling)\b/i.test(withoutInternalIds)) {
    return fallback
  }

  if (/\b(SSE request failed|Feign|Exception|stack|response missing|parse failed|schema|unsupported fact)\b/i.test(withoutInternalIds)) {
    return fallback
  }

  if (!/[\u4e00-\u9fff]/.test(withoutInternalIds) && /[a-z]/i.test(withoutInternalIds)) {
    return fallback
  }

  return withoutInternalIds
}

export const getErrorMessage = (error: unknown, fallback = '请求失败，请稍后重试'): string => {
  if (error instanceof Error && error.message) {
    return toFriendlyMessage(error.message, fallback)
  }

  if (typeof error === 'string') {
    return toFriendlyMessage(error, fallback)
  }

  if (error && typeof error === 'object') {
    const payload = error as {
      message?: unknown
      response?: {
        data?: {
          message?: unknown
          msg?: unknown
        }
      }
    }

    const responseMessage = payload.response?.data?.message || payload.response?.data?.msg
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return toFriendlyMessage(responseMessage, fallback)
    }

    if (typeof payload.message === 'string' && payload.message.trim()) {
      return toFriendlyMessage(payload.message, fallback)
    }
  }

  return fallback
}

export const showErrorMessage = (message?: string): void => {
  ElMessage.error(toFriendlyMessage(message, '请求失败，请稍后重试'))
}
