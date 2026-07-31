import { flushPromises, mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineComponent, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getInterviewsApi } from '@/api/interview'
import {
  createInterviewComparisonApi,
  getInterviewAdvancedReportApi
} from '@/api/interviewAdvanced'
import { createOperationIdempotencyKey } from '@/utils/idempotency'
import type { InterviewListVO } from '@/types/interview'
import type {
  InterviewComparisonVO,
  InterviewReportAdvancedMeta
} from '@/types/interviewAdvanced'
import InterviewHistoryView from '@/views/interview/InterviewHistoryView.vue'

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/api/interview', () => ({
  getInterviewsApi: vi.fn()
}))

vi.mock('@/api/interviewAdvanced', () => ({
  createInterviewComparisonApi: vi.fn(),
  getInterviewAdvancedReportApi: vi.fn()
}))

vi.mock('@/utils/idempotency', () => ({
  createOperationIdempotencyKey: vi.fn(() => 'interview-compare-test-key')
}))

const CheckboxStub = defineComponent({
  name: 'ElCheckbox',
  props: {
    disabled: Boolean,
    modelValue: Boolean
  },
  emits: ['change'],
  template: `
    <button
      type="button"
      class="el-checkbox-stub"
      :disabled="disabled"
      :data-checked="String(modelValue)"
      @click="$emit('change', !modelValue)"
    >
      <slot />
    </button>
  `
})

const ButtonStub = defineComponent({
  name: 'ElButton',
  props: {
    disabled: Boolean,
    loading: Boolean
  },
  emits: ['click'],
  template: `
    <button
      type="button"
      class="el-button-stub"
      :disabled="disabled || loading"
      @click="$emit('click', $event)"
    >
      <slot />
    </button>
  `
})

const componentStubs = {
  AppState: true,
  StatusTag: true,
  'el-alert': true,
  'el-button': ButtonStub,
  'el-checkbox': CheckboxStub,
  'el-input': true,
  'el-option': true,
  'el-pagination': true,
  'el-select': true,
  'el-tooltip': {
    template: '<span class="el-tooltip-stub"><slot /></span>'
  }
}

const interviewRows: Array<InterviewListVO & { targetJobId: number }> = [
  {
    interviewId: 1,
    interviewName: 'A',
    interviewMode: 'TECHNICAL',
    targetJobId: 9,
    status: 'COMPLETED',
    reportStatus: 'GENERATED'
  },
  {
    interviewId: 2,
    interviewName: 'B',
    interviewMode: 'TECHNICAL',
    targetJobId: 9,
    status: 'COMPLETED',
    reportStatus: 'GENERATED'
  },
  {
    interviewId: 3,
    interviewName: 'C',
    interviewMode: 'TECHNICAL',
    targetJobId: 9,
    status: 'COMPLETED',
    reportStatus: 'GENERATED'
  }
]

const comparisonResult: InterviewComparisonVO = {
  id: 900,
  comparable: true,
  reportIds: [101, 102],
  unavailableReasons: [],
  warnings: [],
  rounds: [],
  dimensions: [],
  requirementImprovements: [],
  idempotentReplay: false
}

const reportMetadata = (
  interviewId: number,
  reportId: number
): InterviewReportAdvancedMeta => ({
  interviewId,
  reportId,
  targetJobId: 9,
  fallback: false,
  remediationAvailable: false,
  strongRemediationAvailable: false,
  comparisonAvailable: true,
  sourceRequirementIds: [],
  remediationCreated: false
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

const mountHistory = async () => {
  const wrapper = mount(InterviewHistoryView, {
    global: {
      directives: {
        loading: {}
      },
      stubs: componentStubs
    }
  })
  await flushPromises()
  return wrapper
}

const selectFirstTwoCandidates = async (
  wrapper: Awaited<ReturnType<typeof mountHistory>>
) => {
  const checkboxes = wrapper.findAllComponents(CheckboxStub)
  await checkboxes[0].trigger('click')
  await checkboxes[1].trigger('click')
  await nextTick()
}

const clickCreateComparison = async (
  wrapper: Awaited<ReturnType<typeof mountHistory>>
) => {
  const buttons = wrapper.find('.comparison-toolbar__actions').findAll('button')
  await buttons[buttons.length - 1].trigger('click')
  await nextTick()
}

describe('interview workspace visual source guard', () => {
  const sourceFiles = [
    'InterviewCreateView.vue',
    'InterviewHistoryView.vue',
    'InterviewDetailView.vue',
    'InterviewReportView.vue',
    'InterviewComparisonView.vue',
    'components/InterviewScenarioSelector.vue',
    'components/InterviewVoiceDeviceCheck.vue',
    'components/InterviewVoiceDeliveryMetrics.vue'
  ]

  it.each(sourceFiles.map((file) => [file]))('%s uses user theme tokens without decorative color sources', (file) => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/views/interview', file),
      'utf8'
    )
    const styleSource = source.match(/<style[\s\S]*?>([\s\S]*?)<\/style>/)?.[1] || ''

    expect(styleSource).toContain('var(--user-')
    expect(styleSource).not.toMatch(/(?:linear|radial|conic)-gradient\s*\(/i)
    expect(styleSource).not.toMatch(/#[\da-f]{3,8}\b|rgba?\s*\(/i)
    expect(styleSource).not.toMatch(/var\(--(?:app|cc)-/i)
  })
})

describe('InterviewHistoryView comparison creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerPush.mockResolvedValue(undefined)
    vi.mocked(getInterviewsApi).mockResolvedValue({
      records: interviewRows,
      total: interviewRows.length,
      pageNo: 1,
      pageSize: 6
    })
    vi.mocked(createInterviewComparisonApi).mockResolvedValue(comparisonResult)
  })

  it('freezes [A, B] and disables selection while comparison metadata is loading', async () => {
    const metadataA = deferred<InterviewReportAdvancedMeta>()
    const metadataB = deferred<InterviewReportAdvancedMeta>()
    vi.mocked(getInterviewAdvancedReportApi).mockImplementation((interviewId) => {
      if (interviewId === 1) return metadataA.promise
      if (interviewId === 2) return metadataB.promise
      return Promise.reject(new Error(`unexpected interview ${interviewId}`))
    })

    const wrapper = await mountHistory()
    await selectFirstTwoCandidates(wrapper)
    await clickCreateComparison(wrapper)

    expect(getInterviewAdvancedReportApi).toHaveBeenCalledTimes(2)
    expect(getInterviewAdvancedReportApi).toHaveBeenNthCalledWith(1, 1)
    expect(getInterviewAdvancedReportApi).toHaveBeenNthCalledWith(2, 2)

    const loadingCheckboxes = wrapper.findAllComponents(CheckboxStub)
    expect(loadingCheckboxes.map((checkbox) => checkbox.props('disabled'))).toEqual([
      true,
      true,
      true
    ])

    loadingCheckboxes[0].vm.$emit('change', false)
    loadingCheckboxes[2].vm.$emit('change', true)
    await nextTick()

    expect(wrapper.findAllComponents(CheckboxStub).map((checkbox) => checkbox.props('modelValue'))).toEqual([
      true,
      true,
      false
    ])

    metadataA.resolve(reportMetadata(1, 101))
    metadataB.resolve(reportMetadata(2, 102))
    await flushPromises()

    expect(createInterviewComparisonApi).toHaveBeenCalledWith({
      reportIds: [101, 102],
      idempotencyKey: 'interview-compare-test-key'
    })
  })

  it('matches report metadata to the frozen candidates by interviewId', async () => {
    vi.mocked(getInterviewAdvancedReportApi)
      .mockResolvedValueOnce(reportMetadata(2, 102))
      .mockResolvedValueOnce(reportMetadata(1, 101))

    const wrapper = await mountHistory()
    await selectFirstTwoCandidates(wrapper)
    await clickCreateComparison(wrapper)
    await flushPromises()

    expect(createInterviewComparisonApi).toHaveBeenCalledWith({
      reportIds: [101, 102],
      idempotencyKey: 'interview-compare-test-key'
    })
  })

  it('keeps the comparison idempotency key when navigation fails', async () => {
    vi.mocked(getInterviewAdvancedReportApi).mockImplementation((interviewId) =>
      Promise.resolve(reportMetadata(interviewId, interviewId + 100))
    )
    routerPush
      .mockRejectedValueOnce(new Error('navigation failed'))
      .mockResolvedValueOnce(undefined)

    const wrapper = await mountHistory()
    await selectFirstTwoCandidates(wrapper)

    await clickCreateComparison(wrapper)
    await flushPromises()
    await clickCreateComparison(wrapper)
    await flushPromises()

    expect(createInterviewComparisonApi).toHaveBeenCalledTimes(2)
    expect(createInterviewComparisonApi).toHaveBeenNthCalledWith(1, {
      reportIds: [101, 102],
      idempotencyKey: 'interview-compare-test-key'
    })
    expect(createInterviewComparisonApi).toHaveBeenNthCalledWith(2, {
      reportIds: [101, 102],
      idempotencyKey: 'interview-compare-test-key'
    })
    expect(createOperationIdempotencyKey).toHaveBeenCalledTimes(1)
  })
})

describe('InterviewHistoryView comparability badge', () => {
  const badgeRows: InterviewListVO[] = [
    {
      interviewId: 21,
      interviewName: '可比场',
      interviewMode: 'TECHNICAL',
      targetJobId: 9,
      status: 'COMPLETED',
      reportStatus: 'GENERATED',
      comparisonAvailable: true
    },
    {
      interviewId: 22,
      interviewName: '不可比场',
      interviewMode: 'TECHNICAL',
      targetJobId: 9,
      status: 'COMPLETED',
      reportStatus: 'GENERATED',
      comparisonAvailable: false,
      comparisonUnavailableReason: 'RUBRIC_VERSION_MISMATCH'
    },
    {
      interviewId: 23,
      interviewName: '旧数据场',
      interviewMode: 'TECHNICAL',
      targetJobId: 9,
      status: 'COMPLETED',
      reportStatus: 'GENERATED'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    routerPush.mockResolvedValue(undefined)
    vi.mocked(getInterviewsApi).mockResolvedValue({
      records: badgeRows,
      total: badgeRows.length,
      pageNo: 1,
      pageSize: 6
    })
  })

  it('renders comparable and non-comparable badges from list metadata only', async () => {
    const wrapper = await mountHistory()

    expect(wrapper.findAll('status-tag-stub[status="COMPARABLE"]')).toHaveLength(1)
    expect(wrapper.findAll('status-tag-stub[status="NOT_COMPARABLE"]')).toHaveLength(1)
  })

  it('disables the comparison checkbox for non-comparable rows before submit', async () => {
    const wrapper = await mountHistory()

    const checkboxes = wrapper.findAllComponents(CheckboxStub)
    expect(checkboxes.map((checkbox) => checkbox.props('disabled'))).toEqual([
      false,
      true,
      false
    ])
  })
})
