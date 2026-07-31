import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'

import {
  createInterviewRemediationApi,
  createInterviewReplayApi,
  getInterviewReplayOptionsApi
} from '@/api/interviewAdvanced'
import { getInterviewReportApi } from '@/api/interview'
import { getJobRequirementMatrixApi } from '@/api/jobRequirement'
import { generateStudyPlanApi } from '@/api/studyPlan'
import InterviewReportView from '@/views/interview/InterviewReportView.vue'

const routerPush = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn())
const routeState = vi.hoisted(() => ({ current: null as any }))
const messageMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState.current,
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/api/agent', () => ({
  recordAgentMetricEventApi: vi.fn().mockResolvedValue({ accepted: true })
}))

vi.mock('@/api/interview', () => ({
  exportInterviewReportApi: vi.fn(),
  getInterviewReportApi: vi.fn(),
  retryInterviewReportApi: vi.fn()
}))

vi.mock('@/api/studyPlan', () => ({
  generateStudyPlanApi: vi.fn()
}))

vi.mock('@/api/jobRequirement', () => ({
  getJobRequirementMatrixApi: vi.fn()
}))

vi.mock('@/api/interviewAdvanced', () => ({
  createInterviewRemediationApi: vi.fn(),
  createInterviewReplayApi: vi.fn(),
  getInterviewReplayOptionsApi: vi.fn()
}))

vi.mock('element-plus', () => ({
  ElMessage: messageMocks,
  ElMessageBox: {
    confirm: confirmMock
  }
}))

const componentStubs = {
  AiResultFeedback: true,
  AppState: { template: '<div class="app-state-stub"><slot /></div>' },
  MarkdownPreview: true,
  ReportChart: true,
  StatusTag: true,
  'el-alert': { template: '<div class="el-alert-stub"></div>' },
  'el-button': {
    template: '<button class="el-button-stub" v-bind="$attrs"><slot /></button>'
  },
  'el-dropdown': { template: '<div class="el-dropdown-stub"><slot /><slot name="dropdown" /></div>' },
  'el-dropdown-item': { template: '<button class="el-dropdown-item-stub"><slot /></button>' },
  'el-dropdown-menu': { template: '<div class="el-dropdown-menu-stub"><slot /></div>' },
  'el-icon': { template: '<i class="el-icon-stub"><slot /></i>' },
  'el-progress': { template: '<div class="el-progress-stub"></div>' },
  'el-skeleton': { template: '<div class="el-skeleton-stub"></div>' },
  'el-tag': { template: '<span class="el-tag-stub"><slot /></span>' },
  'el-tooltip': { template: '<span class="el-tooltip-stub"><slot /></span>' }
}

const mountReport = async () => {
  const wrapper = mount(InterviewReportView, {
    global: { stubs: componentStubs }
  })
  await flushPromises()
  return wrapper
}

const generatedReport = (
  replayEligibility?: unknown,
  overrides: Record<string, unknown> = {}
) => ({
  id: 100,
  reportId: 100,
  interviewId: 42,
  reportStatus: 'GENERATED',
  totalScore: 80,
  replayEligibility,
  ...overrides
})

const findReplayButton = (wrapper: Awaited<ReturnType<typeof mountReport>>) =>
  wrapper
    .findAll('.report-actions .el-button-stub')
    .find((button) => button.text().includes('同配置再练'))

const findRemediationButton = (wrapper: Awaited<ReturnType<typeof mountReport>>) =>
  wrapper
    .findAll('.report-actions .el-button-stub')
    .find((button) => button.text().includes('复练'))

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

describe('InterviewReportView same-config replay', () => {
  beforeEach(() => {
    routeState.current = reactive({
      params: { id: '42' },
      query: {}
    })
    routerPush.mockReset()
    confirmMock.mockReset()
    Object.values(messageMocks).forEach((mock) => mock.mockReset())
    vi.mocked(getInterviewReportApi).mockReset()
    vi.mocked(createInterviewRemediationApi).mockReset()
    vi.mocked(createInterviewReplayApi).mockReset()
    vi.mocked(getInterviewReplayOptionsApi).mockReset()
    vi.mocked(getJobRequirementMatrixApi).mockReset()
    vi.mocked(generateStudyPlanApi).mockReset()
    vi.mocked(getInterviewReplayOptionsApi).mockRejectedValue(new Error('replay options unavailable'))
    routerPush.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps a missing replay contract UNKNOWN when the independent endpoint is unavailable', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue(
      generatedReport(undefined, { comparisonAvailable: true }) as never
    )

    const wrapper = await mountReport()
    const button = findReplayButton(wrapper)

    expect(button).toBeDefined()
    expect(button!.attributes('disabled')).toBeDefined()
    expect(button!.attributes('title')).toContain('当前无法确认同配置再练资格')
    expect(getInterviewReplayOptionsApi).toHaveBeenCalledWith(42)
  })

  it('uses the independent INELIGIBLE result over report-embedded fallback metadata', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue(
      generatedReport({ state: 'ELIGIBLE' }, { comparisonAvailable: true }) as never
    )
    vi.mocked(getInterviewReplayOptionsApi).mockResolvedValue({
        state: 'INELIGIBLE',
        reasonMessage: '报告样本尚未达到再练门槛',
        qualityGate: { actual: 2, required: 3 }
    })

    const wrapper = await mountReport()
    const button = findReplayButton(wrapper)

    expect(button).toBeDefined()
    expect(button!.attributes('disabled')).toBeDefined()
    expect(button!.attributes('title')).toContain('报告样本尚未达到再练门槛')
    expect(button!.attributes('title')).toContain('当前 2，要求 3')
  })

  it('enables replay from the independent endpoint when the report omits eligibility', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue(
      generatedReport(undefined, { comparisonAvailable: false }) as never
    )
    vi.mocked(getInterviewReplayOptionsApi).mockResolvedValue({
      state: 'ELIGIBLE',
      policyVersion: 'REPLAY_ELIGIBILITY_V2'
    })

    const wrapper = await mountReport()
    const button = findReplayButton(wrapper)

    expect(button).toBeDefined()
    expect(button!.attributes('disabled')).toBeUndefined()
  })

  it('loads replay eligibility after polling reaches a generated report', async () => {
    vi.useFakeTimers()
    vi.mocked(getInterviewReportApi)
      .mockResolvedValueOnce({
        interviewId: 42,
        reportStatus: 'GENERATING'
      } as never)
      .mockResolvedValueOnce(generatedReport() as never)
    vi.mocked(getInterviewReplayOptionsApi).mockResolvedValue({
      state: 'ELIGIBLE'
    })

    const wrapper = mount(InterviewReportView, {
      global: { stubs: componentStubs }
    })
    await flushPromises()
    expect(getInterviewReplayOptionsApi).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()

    expect(getInterviewReplayOptionsApi).toHaveBeenCalledWith(42)
    expect(findReplayButton(wrapper)?.attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('creates a replay after confirmation and navigates to the new room', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue(
      generatedReport({ state: 'ELIGIBLE' }, { comparisonAvailable: false }) as never
    )
    confirmMock.mockResolvedValue('confirm')
    vi.mocked(createInterviewReplayApi).mockResolvedValue({
      id: 600,
      sourceSessionId: 42,
      targetSessionId: 210,
      status: 'CREATED',
      idempotentReplay: false
    })

    const wrapper = await mountReport()
    const button = findReplayButton(wrapper)
    expect(button).toBeDefined()
    expect(button!.attributes('disabled')).toBeUndefined()

    await button!.trigger('click')
    await flushPromises()

    expect(createInterviewReplayApi).toHaveBeenCalledTimes(1)
    const [sessionId, payload] = vi.mocked(createInterviewReplayApi).mock.calls[0]
    expect(sessionId).toBe(42)
    expect(payload.idempotencyKey).toContain('interview-replay')
    expect(routerPush).toHaveBeenCalledWith('/interviews/room/210')
  })

  it('locks replay from the first click while confirmation is pending', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue(
      generatedReport({ state: 'ELIGIBLE' }) as never
    )
    const confirmation = deferred<unknown>()
    confirmMock.mockReturnValue(confirmation.promise)
    vi.mocked(createInterviewReplayApi).mockResolvedValue({
      id: 600,
      sourceSessionId: 42,
      targetSessionId: 210,
      status: 'CREATED',
      idempotentReplay: false
    })

    const wrapper = await mountReport()
    const button = findReplayButton(wrapper)!
    await Promise.all([button.trigger('click'), button.trigger('click')])

    expect(confirmMock).toHaveBeenCalledTimes(1)
    expect(createInterviewReplayApi).not.toHaveBeenCalled()

    confirmation.resolve('confirm')
    await flushPromises()

    expect(createInterviewReplayApi).toHaveBeenCalledTimes(1)
  })

  it('does not call the api when the confirmation dialog is cancelled', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue(
      generatedReport({ state: 'ELIGIBLE' }) as never
    )
    confirmMock.mockRejectedValue('cancel')

    const wrapper = await mountReport()
    const button = findReplayButton(wrapper)
    await button!.trigger('click')
    await flushPromises()

    expect(createInterviewReplayApi).not.toHaveBeenCalled()
    expect(routerPush).not.toHaveBeenCalled()
    expect(button!.attributes('disabled')).toBeUndefined()
  })

  it('reuses the same idempotency key after an API failure', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue(
      generatedReport({ state: 'ELIGIBLE' }) as never
    )
    confirmMock.mockResolvedValue('confirm')
    vi.mocked(createInterviewReplayApi)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        id: 600,
        sourceSessionId: 42,
        targetSessionId: 210,
        status: 'CREATED',
        idempotentReplay: true
      })

    const wrapper = await mountReport()
    const button = findReplayButton(wrapper)!
    await button.trigger('click')
    await flushPromises()
    await button.trigger('click')
    await flushPromises()

    const firstKey = vi.mocked(createInterviewReplayApi).mock.calls[0]?.[1].idempotencyKey
    const secondKey = vi.mocked(createInterviewReplayApi).mock.calls[1]?.[1].idempotencyKey
    expect(firstKey).toBeTruthy()
    expect(secondKey).toBe(firstKey)
  })

  it('keeps the idempotency key when navigation returns a failure', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue(
      generatedReport({ state: 'ELIGIBLE' }) as never
    )
    confirmMock.mockResolvedValue('confirm')
    vi.mocked(createInterviewReplayApi).mockResolvedValue({
      id: 600,
      sourceSessionId: 42,
      targetSessionId: 210,
      status: 'CREATED',
      idempotentReplay: true
    })
    routerPush
      .mockResolvedValueOnce({ type: 4 })
      .mockResolvedValueOnce(undefined)

    const wrapper = await mountReport()
    const button = findReplayButton(wrapper)!
    await button.trigger('click')
    await flushPromises()
    await button.trigger('click')
    await flushPromises()

    const firstKey = vi.mocked(createInterviewReplayApi).mock.calls[0]?.[1].idempotencyKey
    const secondKey = vi.mocked(createInterviewReplayApi).mock.calls[1]?.[1].idempotencyKey
    expect(secondKey).toBe(firstKey)
    expect(messageMocks.warning).toHaveBeenCalledWith(
      '再练场次已创建，但页面跳转未完成；重试将恢复同一场次。'
    )
  })

  it('keeps the idempotency key when navigation rejects', async () => {
    vi.mocked(getInterviewReportApi).mockResolvedValue(
      generatedReport({ state: 'ELIGIBLE' }) as never
    )
    confirmMock.mockResolvedValue('confirm')
    vi.mocked(createInterviewReplayApi).mockResolvedValue({
      id: 600,
      sourceSessionId: 42,
      targetSessionId: 210,
      status: 'CREATED',
      idempotentReplay: true
    })
    routerPush
      .mockRejectedValueOnce(new Error('navigation failed'))
      .mockResolvedValueOnce(undefined)

    const wrapper = await mountReport()
    const button = findReplayButton(wrapper)!
    await button.trigger('click')
    await flushPromises()
    await button.trigger('click')
    await flushPromises()

    const firstKey = vi.mocked(createInterviewReplayApi).mock.calls[0]?.[1].idempotencyKey
    const secondKey = vi.mocked(createInterviewReplayApi).mock.calls[1]?.[1].idempotencyKey
    expect(secondKey).toBe(firstKey)
    expect(messageMocks.warning).toHaveBeenCalledWith(
      '再练场次已创建，但页面跳转失败；重试将恢复同一场次。'
    )
  })

  it('ignores an old report response after the route is reused for another interview', async () => {
    const report42 = deferred<ReturnType<typeof generatedReport>>()
    const report43 = deferred<ReturnType<typeof generatedReport>>()
    vi.mocked(getInterviewReportApi).mockImplementation((id) => {
      return (id === 42 ? report42.promise : report43.promise) as never
    })

    const wrapper = mount(InterviewReportView, {
      global: { stubs: componentStubs }
    })
    await flushPromises()

    routeState.current.params.id = '43'
    await nextTick()
    expect(vi.mocked(getInterviewReportApi).mock.calls.map(([id]) => id)).toEqual([42, 43])

    report43.resolve(generatedReport({ state: 'ELIGIBLE' }, {
      id: 101,
      reportId: 101,
      interviewId: 43
    }))
    await flushPromises()
    expect(wrapper.findAll('.overview-card')[1]?.text()).toContain('43')

    report42.resolve(generatedReport({ state: 'ELIGIBLE' }, {
      id: 100,
      reportId: 100,
      interviewId: 42
    }))
    await flushPromises()
    expect(wrapper.findAll('.overview-card')[1]?.text()).toContain('43')
  })

  it('ignores an old replay-options response after the route is reused', async () => {
    const eligibility42 = deferred<{ state: 'INELIGIBLE'; reasonMessage: string }>()
    const eligibility43 = deferred<{ state: 'ELIGIBLE' }>()
    vi.mocked(getInterviewReportApi).mockImplementation((id) => Promise.resolve(
      generatedReport(undefined, {
        id: id === 42 ? 100 : 101,
        reportId: id === 42 ? 100 : 101,
        interviewId: id
      })
    ) as never)
    vi.mocked(getInterviewReplayOptionsApi).mockImplementation((id) => (
      id === 42 ? eligibility42.promise : eligibility43.promise
    ))

    const wrapper = mount(InterviewReportView, {
      global: { stubs: componentStubs }
    })
    await flushPromises()

    routeState.current.params.id = '43'
    await nextTick()
    await flushPromises()

    eligibility43.resolve({ state: 'ELIGIBLE' })
    await flushPromises()
    expect(findReplayButton(wrapper)?.attributes('disabled')).toBeUndefined()

    eligibility42.resolve({
      state: 'INELIGIBLE',
      reasonMessage: '旧场次不可再练'
    })
    await flushPromises()
    expect(findReplayButton(wrapper)?.attributes('disabled')).toBeUndefined()
  })

  it('drops a completed study-plan request after the report route changes', async () => {
    const generation = deferred<{ planId: number; planStatus: string }>()
    vi.mocked(getInterviewReportApi).mockImplementation((id) => Promise.resolve(
      generatedReport(undefined, {
        id: id === 42 ? 100 : 101,
        reportId: id === 42 ? 100 : 101,
        interviewId: id
      })
    ) as never)
    vi.mocked(generateStudyPlanApi).mockReturnValue(generation.promise as never)

    const wrapper = await mountReport()
    const studyPlanButton = wrapper
      .findAll('.action-buttons .el-button-stub')
      .find((button) => button.text().includes('生成学习计划'))
    expect(studyPlanButton).toBeDefined()
    await studyPlanButton!.trigger('click')

    routeState.current.params.id = '43'
    await nextTick()
    await flushPromises()

    generation.resolve({ planId: 700, planStatus: 'GENERATED' })
    await flushPromises()

    expect(generateStudyPlanApi).toHaveBeenCalledWith({ reportId: 100 })
    expect(routerPush).not.toHaveBeenCalled()
    expect(messageMocks.success).not.toHaveBeenCalled()
  })

  it('drops a remediation request when the report route changes during matrix lookup', async () => {
    const matrix42 = deferred<any>()
    vi.mocked(getInterviewReportApi).mockImplementation((id) => Promise.resolve(
      generatedReport(undefined, {
        id: id === 42 ? 100 : 101,
        reportId: id === 42 ? 100 : 101,
        interviewId: id,
        targetJobId: id === 42 ? 10 : 11,
        remediationAvailable: true,
        strongRemediationAvailable: id === 42,
        sourceRequirementIds: [],
        mainProblems: id === 42 ? '旧报告短板' : '新报告短板'
      })
    ) as never)
    vi.mocked(getJobRequirementMatrixApi).mockImplementation((targetJobId) => (
      targetJobId === 10 ? matrix42.promise : Promise.resolve({ requirements: [] })
    ) as never)

    const wrapper = await mountReport()
    const remediationButton = findRemediationButton(wrapper)
    expect(remediationButton).toBeDefined()
    await remediationButton!.trigger('click')
    expect(getJobRequirementMatrixApi).toHaveBeenCalledWith(10)

    routeState.current.params.id = '43'
    await nextTick()
    await flushPromises()
    matrix42.resolve({
      requirements: [{ id: 7, gapStatus: 'MISSING' }]
    })
    await flushPromises()

    expect(createInterviewRemediationApi).not.toHaveBeenCalled()
    expect(routerPush).not.toHaveBeenCalled()
    expect(messageMocks.warning).not.toHaveBeenCalled()
  })
})
