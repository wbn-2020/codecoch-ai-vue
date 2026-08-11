import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getPersonalAgentOverviewApi,
  getPersonalSkillDistributionApi,
  getPersonalTaskTrendApi
} from '@/api/analytics'
import PersonalAnalyticsView from '@/views/analytics/PersonalAnalyticsView.vue'

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/api/analytics', () => ({
  getPersonalAgentOverviewApi: vi.fn(),
  getPersonalTaskTrendApi: vi.fn(),
  getPersonalSkillDistributionApi: vi.fn()
}))

const stubs = {
  AppState: {
    props: ['type', 'title', 'description'],
    template: '<section :data-state="type"><h3>{{ title }}</h3><p>{{ description }}</p><slot /></section>'
  },
  'el-alert': true,
  'el-button': { template: '<button><slot /></button>' },
  'el-segmented': true
}

const overview = (overrides = {}) => ({
  todayTaskCount: 0,
  todayDoneCount: 0,
  todaySkippedCount: 0,
  todayEstimatedMinutes: 0,
  last7DaysTaskCount: 0,
  last7DaysDoneCount: 0,
  last7DaysCompletionRate: 0,
  totalAgentPlanCount: 0,
  agentGeneratedTaskCount: 0,
  taskCompletionRate: 0,
  agentSuccessRate: 0,
  avgAgentDurationMs: 0,
  ...overrides
})

const mountView = async () => {
  const wrapper = mount(PersonalAnalyticsView, {
    global: {
      stubs
    }
  })
  await flushPromises()
  return wrapper
}

describe('PersonalAnalyticsView data-state boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPersonalAgentOverviewApi).mockResolvedValue(overview())
    vi.mocked(getPersonalTaskTrendApi).mockResolvedValue([])
    vi.mocked(getPersonalSkillDistributionApi).mockResolvedValue([])
  })

  it('does not present missing samples as 0% or 0/0', async () => {
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('待生成')
    expect(wrapper.text()).toContain('尚无可分析的训练样本')
    expect(wrapper.text()).not.toContain('0%')
    expect(wrapper.text()).not.toContain('0/0')
  })

  it('keeps an actual zero completion rate when a task sample exists', async () => {
    vi.mocked(getPersonalAgentOverviewApi).mockResolvedValue(overview({
      last7DaysTaskCount: 4,
      last7DaysDoneCount: 0,
      last7DaysCompletionRate: 0,
      totalAgentPlanCount: 1,
      agentSuccessRate: 0
    }))

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('0%')
    expect(wrapper.text()).toContain('0/4 个任务')
  })

  it('renders a query error instead of treating a failed trend request as an empty result', async () => {
    vi.mocked(getPersonalTaskTrendApi).mockRejectedValue(new Error('trend unavailable'))

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('任务趋势暂时不可用')
    expect(wrapper.text()).toContain('分析数据暂时加载失败，请稍后重试。')
  })
})
