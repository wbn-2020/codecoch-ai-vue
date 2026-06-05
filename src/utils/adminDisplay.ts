const metricNameMap: Record<string, string> = {
  'Agent success rate': 'Agent 成功率',
  'Task adoption rate': '任务采纳率',
  'AI token cost': 'AI token 成本',
  'Prompt regression pass rate': 'Prompt 回归通过率'
}

const metricDefinitionMap: Record<string, string> = {
  'SUCCESS run / total run': '成功运行数 / 总运行数',
  'ADOPT feedback / generated task': '采纳反馈数 / 生成任务数',
  'Token usage and estimated cost': 'Token 用量与预估成本',
  'SUCCESS prompt regression result / total result': 'Prompt 回归成功数 / 总结果数'
}

const categoryMap: Record<string, string> = {
  AGENT: 'Agent',
  AI: 'AI',
  AI_OPS: 'AI Ops',
  TRAINING: '训练',
  GENERAL: '通用'
}

const frequencyMap: Record<string, string> = {
  REALTIME: '实时',
  DAILY: '每日',
  MANUAL: '手动',
  WEEKLY: '每周'
}

const jobNameMap: Record<string, string> = {
  'Agent daily plan batch': 'Agent 每日计划批处理',
  'Agent daily plan aggregation': 'Agent 每日计划聚合',
  'Agent 每日计划聚合': 'Agent 每日计划聚合'
}

const feedbackTypeMap: Record<string, string> = {
  ADOPTED: '已采纳',
  ADOPT: '采纳',
  IGNORED: '已忽略',
  IGNORE: '忽略',
  LIKE: '点赞',
  LIKED: '点赞',
  DISLIKE: '点踩',
  DISLIKED: '点踩',
  HELPFUL: '有帮助',
  NOT_HELPFUL: '没有帮助',
  INACCURATE: '内容不准确',
  NOT_MY_EXPERIENCE: '不是我的经历',
  HALLUCINATION: '疑似幻觉',
  IRRELEVANT: '不相关',
  OUTDATED: '已过时',
  OTHER: '其他',
  TOO_HARD: '太难',
  TOO_EASY: '太简单',
  UNKNOWN: '未知'
}

export const translateMetricName = (value?: string) => (value ? metricNameMap[value] || value : '--')

export const translateMetricDefinition = (value?: string) => (value ? metricDefinitionMap[value] || value : '--')

export const translateMetricCategory = (value?: string) => (value ? categoryMap[value] || value : '--')

export const translateRefreshFrequency = (value?: string) => (value ? frequencyMap[value] || value : '--')

export const translateJobName = (value?: string) => (value ? jobNameMap[value] || value : '--')

export const translateFeedbackType = (value?: string) => {
  const key = String(value || 'UNKNOWN').toUpperCase()
  return feedbackTypeMap[key] || value || '未知'
}

export const translateFailureReason = (value?: string | null) => {
  if (!value) return '-'
  return value
    .replace(/Provider api-key decrypt failed:\s*/gi, '供应商 api-key 解密失败：')
    .replace(/Provider not configured:\s*/gi, '供应商未配置：')
    .replace(/Provider request failed:\s*/gi, '供应商请求失败：')
    .replace(/AI provider response is empty/gi, 'AI 供应商响应为空')
    .replace(/AI base-url, api-key or model is not configured/gi, 'AI base-url、api-key 或模型未配置')
    .replace(/not logged in/gi, '未登录')
    .replace(/manual rerun recorded/gi, '已记录手动重跑')
}
