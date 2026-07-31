import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  generateAgentWeeklyReportApi,
  getAgentWeeklyReportDetailApi,
  getAgentWeeklyReportsApi,
  getCurrentAgentWeeklyReportApi,
  refreshAgentWeeklyReportApi
} from '@/api/agentWeeklyReport'
import { getJobTargetsApi } from '@/api/jobTarget'
import type { AgentWeeklyReport } from '@/types/agentWeeklyReport'
import AgentWeeklyReportView from '@/views/v4/AgentWeeklyReportView.vue'

vi.mock('@/api/agentWeeklyReport', () => ({
  generateAgentWeeklyReportApi: vi.fn(),
  getAgentWeeklyReportDetailApi: vi.fn(),
  getAgentWeeklyReportsApi: vi.fn(),
  getCurrentAgentWeeklyReportApi: vi.fn(),
  refreshAgentWeeklyReportApi: vi.fn()
}))

vi.mock('@/api/jobTarget', () => ({
  getJobTargetsApi: vi.fn()
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn()
    }
  }
})

const completeCoverage = {
  includedCounts: { JOB_APPLICATION: 4 },
  excludedCounts: {},
  unavailableCounts: { INTERVIEW_REPORT: 1 },
  sources: [
    {
      sourceType: 'INTERVIEW_REPORT',
      inclusionStatus: 'UNAVAILABLE',
      excludeReason: '面试证据服务超时',
      metadata: {}
    }
  ],
  truncated: false,
  warnings: ['面试来源暂不可用'],
  consistencyLevel: 'PARTIAL'
}

const weeklyReport = (overrides: Partial<AgentWeeklyReport> = {}): AgentWeeklyReport => ({
  id: 71,
  snapshotId: 91,
  targetJobId: 9701301,
  targetScopeKey: 'TARGET_JOB:9701301',
  weekStartDate: '2026-07-13',
  weekEndDate: '2026-07-19',
  timezone: 'Asia/Shanghai',
  reportStatus: 'IN_PROGRESS',
  snapshotVersion: 2,
  summary: '本周记录了 4 条投递活动，当前只支持事实汇总。',
  confidenceLevel: 'FACT_ONLY',
  fallback: true,
  fallbackReason: 'AI_TIMEOUT',
  resultSource: 'FALLBACK',
  range: {
    weekStartDate: '2026-07-13',
    weekEndDate: '2026-07-19',
    sourceCutoffAt: '2026-07-18T18:30:00',
    timezone: 'Asia/Shanghai',
    windowStatus: 'IN_PROGRESS'
  },
  coverage: completeCoverage,
  facts: [
    {
      factId: 'application.activity.count',
      label: '本周投递活动数',
      value: 4,
      unit: '条',
      sourceRefs: ['JOB_APPLICATION:1']
    }
  ],
  signals: [
    {
      signalId: 'blocked-signal',
      title: '不应在 FACT_ONLY 下展示',
      metric: {},
      sampleBoundary: {},
      sourceRefs: [],
      blockedConclusions: []
    }
  ],
  hypotheses: [
    {
      hypothesisId: 'blocked-hypothesis',
      statement: '不应在 FACT_ONLY 下展示的假设',
      fixedVariables: [],
      basedOnSignalIds: [],
      sourceRefs: [],
      status: 'TO_VALIDATE'
    }
  ],
  experimentSuggestions: [],
  planDraft: {
    available: false,
    targetWeekStart: '2026-07-20',
    unavailableReason: '阶段五当前契约不兼容周报草案',
    items: [
      {
        semanticKey: 'sample-more',
        targetDate: '2026-07-21',
        title: '补齐同岗位投递样本',
        description: '固定岗位和简历版本，继续记录投递与反馈。',
        conflictCheckRequired: true,
        requiresUserConfirmation: true
      }
    ]
  },
  snapshotHistory: [],
  sourceCutoffAt: '2026-07-18T18:30:00',
  ...overrides
})

const componentStubs = {
  AppState: {
    props: ['title', 'description'],
    template: '<section class="app-state-stub"><h2>{{ title }}</h2><p>{{ description }}</p><slot /></section>'
  },
  'el-alert': {
    props: ['title', 'description'],
    template: '<div class="el-alert-stub"><strong>{{ title }}</strong><p>{{ description }}</p></div>'
  },
  'el-button': {
    props: ['disabled', 'loading'],
    emits: ['click'],
    template: '<button class="el-button-stub" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-date-picker': {
    props: ['modelValue'],
    template: '<div class="el-date-picker-stub">{{ modelValue }}</div>'
  },
  'el-select': {
    props: ['modelValue'],
    template: '<div class="el-select-stub"><slot /></div>'
  },
  'el-option': {
    props: ['label'],
    template: '<span class="el-option-stub">{{ label }}</span>'
  },
  'el-tag': {
    template: '<span class="el-tag-stub"><slot /></span>'
  },
  'el-drawer': {
    template: '<aside class="el-drawer-stub"><slot /></aside>'
  }
}

const mountView = () =>
  mount(AgentWeeklyReportView, {
    global: {
      stubs: componentStubs,
      directives: {
        loading: () => undefined
      }
    }
  })

describe('AgentWeeklyReportView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-18T04:00:00.000Z'))
    vi.mocked(getJobTargetsApi).mockResolvedValue([
      {
        id: 9701301,
        jobTitle: '高级后端工程师',
        companyName: '示例科技'
      }
    ])
    vi.mocked(getAgentWeeklyReportsApi).mockResolvedValue([])
    vi.mocked(getAgentWeeklyReportDetailApi).mockResolvedValue(weeklyReport())
    vi.mocked(refreshAgentWeeklyReportApi).mockResolvedValue(weeklyReport())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders fact-only, source-gap and fallback states with stable Chinese copy', async () => {
    vi.mocked(getCurrentAgentWeeklyReportApi).mockResolvedValue(weeklyReport())

    const wrapper = mountView()
    await flushPromises()
    const text = wrapper.text()

    expect(text).toContain('事实')
    expect(text).toContain('变化信号')
    expect(text).toContain('待验证假设与策略实验')
    expect(text).toContain('下一周计划草案')
    expect(text).toContain('仅展示事实')
    expect(text).toContain('当前仅展示事实')
    expect(text).toContain('基础汇总')
    expect(text).toContain('面试证据服务超时')
    expect(text).toContain('中国标准时间（UTC+8）')
    expect(text).toContain('2026-07-18 18:30:00')
    expect(text).toContain('下一周计划预览暂不可用')
    expect(text).toContain('当前仅支持查看行动建议')
    expect(text).toContain('补齐同岗位投递样本')
    expect(text).not.toContain('不应在 FACT_ONLY 下展示')
    expect(text).not.toContain('查看阶段五预览')
    expect(text).not.toContain('确认应用')
    ;[
      'FACT_ONLY',
      'AI_TIMEOUT',
      'TARGET_JOB:9701301',
      'JOB_APPLICATION:1',
      'Asia/Shanghai',
      '规则降级',
      '阶段五',
      'GET',
      '接口',
      '契约',
      '数据库'
    ].forEach((internalText) => expect(text).not.toContain(internalText))
  })

  it('maps known and unknown report enums without exposing technical references', async () => {
    const base = weeklyReport()
    vi.mocked(getCurrentAgentWeeklyReportApi).mockResolvedValue(weeklyReport({
      reportStatus: 'GENERATED',
      confidenceLevel: 'LOW',
      fallback: false,
      fallbackReason: undefined,
      resultSource: 'AI',
      range: {
        ...base.range,
        windowStatus: 'COMPLETED'
      },
      signals: [
        {
          signalId: 'weekly:71:signal:channel',
          signalType: 'CHANNEL_RESPONSE_DIRECTION',
          direction: 'UP',
          title: '渠道反馈出现变化',
          description: '当前记录支持继续观察。',
          metric: {
            verifiedResponseRate: 0.25,
            resultStatus: 'UNRECOGNIZED_VALUE'
          },
          sampleBoundary: {
            minimumSample: 5
          },
          sourceRefs: ['JOB_APPLICATION:1'],
          blockedConclusions: ['当前记录不能证明渠道优劣。']
        }
      ],
      hypotheses: [
        {
          hypothesisId: 'weekly:71:hypothesis:channel',
          statement: '固定岗位和简历版本，继续观察渠道反馈。',
          primaryVariable: 'CHANNEL',
          fixedVariables: ['TARGET_JOB', 'RESUME_VERSION'],
          successMetric: 'VERIFIED_RESPONSE_RATE',
          minimumSample: 5,
          observationDays: 7,
          basedOnSignalIds: ['weekly:71:signal:channel'],
          sourceRefs: ['JOB_APPLICATION:1'],
          status: 'TO_VALIDATE'
        },
        {
          hypothesisId: 'weekly:71:hypothesis:unknown',
          statement: '继续补充可比较记录。',
          primaryVariable: 'UNRECOGNIZED_VARIABLE',
          fixedVariables: ['UNRECOGNIZED_FIXED'],
          successMetric: 'UNRECOGNIZED_METRIC',
          basedOnSignalIds: [],
          sourceRefs: [],
          status: 'UNRECOGNIZED_STATUS'
        }
      ],
      experimentSuggestions: [
        {
          suggestionId: 'weekly:71:experiment:channel',
          title: '补齐同岗位渠道样本',
          hypothesis: '固定其他条件，继续记录反馈。',
          primaryVariable: 'CHANNEL',
          fixedVariables: ['TARGET_JOB', 'RESUME_VERSION'],
          eligibleSegments: [],
          successMetric: 'VERIFIED_RESPONSE_RATE',
          targetSample: 10,
          observationDays: 7,
          confidenceLevel: 'LOW',
          basedOnSignalIds: [],
          sourceRefs: [],
          status: 'TO_VALIDATE',
          metadata: {}
        }
      ],
      planDraft: {
        available: false,
        targetWeekStart: '2026-07-20',
        unavailableReason: '阶段五当前契约不兼容周报草案',
        items: [
          {
            semanticKey: 'sample-more',
            targetDate: '2026-07-21',
            actionType: 'COLLECT_APPLICATION_SAMPLE',
            title: '补齐同岗位投递样本',
            reason: '来自周报假设 weekly:71:hypothesis:channel',
            sourceHypothesisId: 'weekly:71:hypothesis:channel',
            priority: 'MEDIUM',
            conflictCheckRequired: true,
            requiresUserConfirmation: true
          },
          {
            semanticKey: 'unknown-action',
            targetDate: '2026-07-22',
            actionType: 'UNRECOGNIZED_ACTION',
            title: '继续整理下一步',
            priority: 'UNRECOGNIZED_PRIORITY',
            conflictCheckRequired: true,
            requiresUserConfirmation: true
          }
        ]
      }
    }))

    const wrapper = mountView()
    await flushPromises()
    const text = wrapper.text()

    expect(text).toContain('渠道反馈变化')
    expect(text).toContain('上升')
    expect(text).toContain('投递渠道')
    expect(text).toContain('目标岗位、简历版本')
    expect(text).toContain('已记录反馈率')
    expect(text).toContain('待验证')
    expect(text).toContain('补充投递样本')
    expect(text).toContain('中优先级')
    expect(text).toContain('待明确变量')
    expect(text).toContain('可比较结果')
    expect(text).toContain('状态待确认')
    expect(text).toContain('其他手动行动')
    expect(text).toContain('优先级待确认')
    expect(text).toContain('基于本周可核验事实与待验证方向提出')
    ;[
      'CHANNEL_RESPONSE_DIRECTION',
      'COLLECT_APPLICATION_SAMPLE',
      'CHANNEL',
      'TARGET_JOB',
      'RESUME_VERSION',
      'VERIFIED_RESPONSE_RATE',
      'TO_VALIDATE',
      'MEDIUM',
      'UNRECOGNIZED_VALUE',
      'UNRECOGNIZED_VARIABLE',
      'UNRECOGNIZED_FIXED',
      'UNRECOGNIZED_METRIC',
      'UNRECOGNIZED_STATUS',
      'UNRECOGNIZED_ACTION',
      'UNRECOGNIZED_PRIORITY',
      'weekly:71:',
      'JOB_APPLICATION:1',
      '阶段五',
      '契约'
    ].forEach((internalText) => expect(text).not.toContain(internalText))
  })

  it('keeps the empty state free of request and storage implementation copy', async () => {
    vi.mocked(getCurrentAgentWeeklyReportApi).mockResolvedValue(null)

    const wrapper = mountView()
    await flushPromises()
    const text = wrapper.text()

    expect(text).toContain('先选择报告周和目标范围，再生成本周周报')
    ;['GET', 'POST', '接口', '契约', '数据库'].forEach((internalText) => {
      expect(text).not.toContain(internalText)
    })
  })

  it('deduplicates repeated generate clicks with one stable request', async () => {
    vi.mocked(getCurrentAgentWeeklyReportApi).mockResolvedValue(null)
    let resolveGenerate: ((value: AgentWeeklyReport) => void) | undefined
    vi.mocked(generateAgentWeeklyReportApi).mockImplementation(() =>
      new Promise<AgentWeeklyReport>((resolve) => {
        resolveGenerate = resolve
      })
    )

    const wrapper = mountView()
    await flushPromises()
    const generateButton = wrapper.findAll('button').find((button) => button.text() === '生成周报')

    expect(generateButton).toBeTruthy()
    await generateButton!.trigger('click')
    await generateButton!.trigger('click')

    expect(generateAgentWeeklyReportApi).toHaveBeenCalledTimes(1)
    expect(generateAgentWeeklyReportApi).toHaveBeenCalledWith(
      expect.objectContaining({
        weekStartDate: '2026-07-13',
        targetJobId: undefined,
        idempotencyKey: expect.stringContaining('weekly-report:generate')
      })
    )

    resolveGenerate?.(weeklyReport())
    await flushPromises()
  })

  it('loads report detail from the history list', async () => {
    const historyItem = weeklyReport({ id: 88, snapshotId: 99, summary: '历史摘要' })
    vi.mocked(getCurrentAgentWeeklyReportApi).mockResolvedValue(weeklyReport())
    vi.mocked(getAgentWeeklyReportsApi).mockResolvedValue([historyItem])
    vi.mocked(getAgentWeeklyReportDetailApi).mockResolvedValue(historyItem)

    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('.history-row').trigger('click')
    await flushPromises()

    expect(getAgentWeeklyReportDetailApi).toHaveBeenCalledWith(88)
  })
})
