import type { SelectOption } from '@/types/common'

export const USER_STATUS = {
  DISABLED: 0,
  ENABLED: 1
} as const

export const QUESTION_DIFFICULTY = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD'
} as const

export const QUESTION_TYPE = {
  SHORT_ANSWER: 'SHORT_ANSWER',
  SCENARIO: 'SCENARIO',
  CODING: 'CODING'
} as const

export const MASTERY_STATUS = {
  MASTERED: 'MASTERED',
  VAGUE: 'VAGUE',
  UNKNOWN: 'UNKNOWN'
} as const

export const ANSWER_RESULT = {
  CORRECT: 'CORRECT',
  PARTIAL_CORRECT: 'PARTIAL_CORRECT',
  WRONG: 'WRONG'
} as const

export const INTERVIEW_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
  FAILED: 'FAILED'
} as const

export const REPORT_STATUS = {
  NOT_GENERATED: 'NOT_GENERATED',
  GENERATING: 'GENERATING',
  GENERATED: 'GENERATED',
  FAILED: 'FAILED'
} as const

export const NEXT_ACTION = {
  FOLLOW_UP: 'FOLLOW_UP',
  NEXT_QUESTION: 'NEXT_QUESTION',
  NEXT_STAGE: 'NEXT_STAGE',
  FINISH: 'FINISH'
} as const

export const INTERVIEW_MODE = {
  TECHNICAL_BASIC: 'TECHNICAL_BASIC',
  PROJECT_DEEP_DIVE: 'PROJECT_DEEP_DIVE',
  COMPREHENSIVE: 'COMPREHENSIVE'
} as const

export const AI_SCENE = {
  INTERVIEW_QUESTION_GENERATE: 'INTERVIEW_QUESTION_GENERATE',
  PROJECT_DEEP_DIVE_QUESTION: 'PROJECT_DEEP_DIVE_QUESTION',
  ANSWER_EVALUATE: 'ANSWER_EVALUATE',
  INTERVIEW_FOLLOW_UP_GENERATE: 'INTERVIEW_FOLLOW_UP_GENERATE',
  INTERVIEW_REPORT_GENERATE: 'INTERVIEW_REPORT_GENERATE'
} as const

export const CONFIG_TYPE = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  JSON: 'JSON'
} as const

export const difficultyOptions: SelectOption[] = [
  { label: '简单', value: QUESTION_DIFFICULTY.EASY },
  { label: '中等', value: QUESTION_DIFFICULTY.MEDIUM },
  { label: '困难', value: QUESTION_DIFFICULTY.HARD }
]

export const questionTypeOptions: SelectOption[] = [
  { label: '简答题', value: QUESTION_TYPE.SHORT_ANSWER },
  { label: '场景题', value: QUESTION_TYPE.SCENARIO },
  { label: '编码题', value: QUESTION_TYPE.CODING }
]

export const masteryOptions: SelectOption[] = [
  { label: '已掌握', value: MASTERY_STATUS.MASTERED },
  { label: '模糊', value: MASTERY_STATUS.VAGUE },
  { label: '未掌握', value: MASTERY_STATUS.UNKNOWN }
]

export const answerResultOptions: SelectOption[] = [
  { label: '正确', value: ANSWER_RESULT.CORRECT },
  { label: '部分正确', value: ANSWER_RESULT.PARTIAL_CORRECT },
  { label: '错误', value: ANSWER_RESULT.WRONG }
]

export const interviewModeOptions: SelectOption[] = [
  { label: '技术基础', value: INTERVIEW_MODE.TECHNICAL_BASIC },
  { label: '项目深挖', value: INTERVIEW_MODE.PROJECT_DEEP_DIVE },
  { label: '综合模拟', value: INTERVIEW_MODE.COMPREHENSIVE }
]

export const targetPositionOptions: SelectOption[] = [
  { label: 'Java 后端开发', value: 'Java 后端开发' },
  { label: 'Java 全栈开发', value: 'Java 全栈开发' },
  { label: 'Java 微服务开发', value: 'Java 微服务开发' }
]

export const experienceLevelOptions: SelectOption[] = [
  { label: '1 年', value: '1_YEAR' },
  { label: '3 年', value: '3_YEARS' },
  { label: '5 年', value: '5_YEARS' }
]

export const industryDirectionOptions: SelectOption[] = [
  { label: '通用业务', value: 'GENERAL' },
  { label: '电商', value: 'ECOMMERCE' },
  { label: '金融支付', value: 'FINANCE_PAYMENT' },
  { label: '在线教育', value: 'ONLINE_EDUCATION' },
  { label: 'SaaS', value: 'SAAS' }
]

export const interviewerStyleOptions: SelectOption[] = [
  { label: '普通', value: 'NORMAL' },
  { label: '严厉', value: 'STRICT' },
  { label: '项目深挖', value: 'PROJECT_DEEP_DIVE' }
]

export const promptTypeOptions: SelectOption[] = [
  { label: '八股文提问模板', value: AI_SCENE.INTERVIEW_QUESTION_GENERATE },
  { label: '项目深挖提问模板', value: AI_SCENE.PROJECT_DEEP_DIVE_QUESTION },
  { label: '回答评分模板', value: AI_SCENE.ANSWER_EVALUATE },
  { label: '动态追问模板', value: AI_SCENE.INTERVIEW_FOLLOW_UP_GENERATE },
  { label: '面试报告生成模板', value: AI_SCENE.INTERVIEW_REPORT_GENERATE }
]
