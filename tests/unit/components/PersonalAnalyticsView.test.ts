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
  'el-segmented': {
    name: 'ElSegmented',
    props: ['modelValue', 'options'],
    emits: ['update:modelValue', 'change'],
    template: '<div class="segmented-stub"></div>'
  }
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
    vi.mocked(getPersonalTaskTrendApi).mockResolvedValue([{
      date: '2026-08-12',
      generatedCount: 4,
      completedCount: 0,
      skippedCount: 4,
      estimatedMinutes: 40,
      completedMinutes: 0
    }])

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('0%')
    expect(wrapper.text()).toContain('0/4 个已结算任务')
  })

  it('renders a query error instead of treating a failed trend request as an empty result', async () => {
    vi.mocked(getPersonalTaskTrendApi).mockRejectedValue(new Error('trend unavailable'))

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('任务趋势暂时不可用')
    expect(wrapper.text()).toContain('分析数据暂时加载失败，请稍后重试。')
  })

  it('labels completed estimated minutes without presenting them as actual duration', async () => {
    vi.mocked(getPersonalTaskTrendApi).mockResolvedValue([{
      date: '2026-08-12',
      generatedCount: 2,
      completedCount: 1,
      skippedCount: 1,
      estimatedMinutes: 50,
      completedMinutes: 30
    }])

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('已完成任务预计分钟')
    expect(wrapper.text()).toContain('预计用时合计为 30 分钟')
    expect(wrapper.text()).toContain('不代表实际训练耗时')
    expect(wrapper.text()).not.toContain('完成耗时')
  })

  it('explains that skill distribution requires completed tasks with explicit skills', async () => {
    vi.mocked(getPersonalSkillDistributionApi).mockResolvedValue([
      { name: 'Java', value: 2 }
    ])

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('仅统计已完成且带有明确技能标签的任务')
    expect(wrapper.text()).toContain('Java')
    expect(wrapper.text()).not.toContain('Unclassified')
  })

  it('uses selected-period trend facts instead of relabeling the fixed seven-day overview', async () => {
    vi.mocked(getPersonalAgentOverviewApi).mockResolvedValue(overview({
      last7DaysTaskCount: 9,
      last7DaysDoneCount: 9,
      last7DaysCompletionRate: 100
    }))
    vi.mocked(getPersonalTaskTrendApi).mockResolvedValue([
      {
        date: '2026-08-12',
        generatedCount: 4,
        completedCount: 3,
        skippedCount: 1,
        estimatedMinutes: 40,
        completedMinutes: 30
      }
    ])

    const wrapper = await mountView()
    expect(wrapper.text()).toContain('近 7 天已结算完成率')
    expect(wrapper.text()).toContain('3/4 个已结算任务')
    expect(wrapper.text()).not.toContain('9/9 个任务')

    const segmented = wrapper.findComponent({ name: 'ElSegmented' })
    segmented.vm.$emit('update:modelValue', 30)
    segmented.vm.$emit('change', 30)
    await flushPromises()

    expect(getPersonalTaskTrendApi).toHaveBeenLastCalledWith({ days: 30 })
    expect(getPersonalSkillDistributionApi).toHaveBeenLastCalledWith({ days: 30 })
    expect(wrapper.text()).toContain('近 30 天已结算完成率')
  })
})
