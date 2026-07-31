import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getInterviewComparisonDetailApi } from '@/api/interviewAdvanced'
import InterviewComparisonView from '@/views/interview/InterviewComparisonView.vue'

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: '900' },
    query: {}
  }),
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/api/interviewAdvanced', () => ({
  getInterviewComparisonDetailApi: vi.fn()
}))

const stubs = {
  AppState: {
    props: ['title', 'description'],
    template: '<div class="app-state-stub">{{ title }} {{ description }}<slot /></div>'
  },
  'el-alert': {
    template: '<div class="el-alert-stub"></div>'
  },
  'el-button': {
    template: '<button><slot /></button>'
  },
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

describe('InterviewComparisonView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerPush.mockResolvedValue(undefined)
  })

  it('loads the persisted comparison by route id', async () => {
    vi.mocked(getInterviewComparisonDetailApi).mockResolvedValue({
      id: 900,
      comparable: true,
      reportIds: [11, 12],
      firstTotalScore: 70,
      latestTotalScore: 82,
      totalScoreDelta: 12,
      unavailableReasons: [],
      warnings: [],
      rounds: [
        { reportId: 11, totalScore: 70, sampleInsufficient: false, rubricScores: {} },
        { reportId: 12, totalScore: 82, sampleInsufficient: false, rubricScores: {} }
      ],
      dimensions: [],
      requirementImprovements: [],
      idempotentReplay: false
    })

    const wrapper = mount(InterviewComparisonView, {
      global: { stubs, directives: { loading: () => undefined } }
    })
    await flushPromises()

    expect(getInterviewComparisonDetailApi).toHaveBeenCalledWith(900)
    expect(wrapper.text()).toContain('82')
    expect(wrapper.text()).not.toContain('没有可恢复的比较结果')
  })

  it('shows a recoverable error when the persisted comparison cannot be loaded', async () => {
    vi.mocked(getInterviewComparisonDetailApi).mockRejectedValue(new Error('not found'))

    const wrapper = mount(InterviewComparisonView, {
      global: { stubs, directives: { loading: () => undefined } }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('比较结果不可用')
    expect(wrapper.text()).toContain('返回面试历史')
  })
})
