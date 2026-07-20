import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCurrentAgentWeekPlanApi } from '@/api/agent'
import { getAgentPlanChangeSetsApi } from '@/api/agentPlanChange'
import { getCurrentJobTargetApi, getJobTargetsApi } from '@/api/jobTarget'
import { getAgentReviewsApi } from '@/api/v4'
import { fetchCachedLatestDailyPlan, fetchCachedTodayAgentTasks } from '@/composables/useUserHomeDataCache'
import AgentTodayView from '@/views/agent/AgentTodayView.vue'

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => ({
    path: '/agent/today',
    query: { date: '2026-07-05', prompt: 'must-not-leak' }
  }),
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/api/agent', () => ({
  completeAgentTaskApi: vi.fn(),
  deferAgentTaskApi: vi.fn(),
  generateDailyPlanApi: vi.fn(),
  getCurrentAgentWeekPlanApi: vi.fn().mockResolvedValue(null),
  recordAgentMetricEventApi: vi.fn(),
  restoreAgentTaskApi: vi.fn(),
  skipAgentTaskApi: vi.fn(),
  startAgentTaskApi: vi.fn()
}))

vi.mock('@/api/aiFeedback', () => ({
  submitAiResultFeedbackApi: vi.fn()
}))

vi.mock('@/api/agentPlanChange', () => ({
  getAgentPlanChangeSetsApi: vi.fn()
}))

vi.mock('@/api/jobTarget', () => ({
  getCurrentJobTargetApi: vi.fn().mockResolvedValue({
    id: 7,
    jobTitle: 'Frontend Engineer',
    companyName: 'Demo Company',
    currentFlag: 1
  }),
  getJobTargetsApi: vi.fn().mockResolvedValue([{
    id: 7,
    jobTitle: 'Frontend Engineer',
    companyName: 'Demo Company',
    currentFlag: 1
  }])
}))

vi.mock('@/api/v4', () => ({
  getAgentReviewsApi: vi.fn()
}))

vi.mock('@/composables/useUserHomeDataCache', () => ({
  fetchCachedLatestDailyPlan: vi.fn(),
  fetchCachedTodayAgentTasks: vi.fn(),
  invalidateUserHomeTrainingCaches: vi.fn()
}))

vi.mock('@/composables/useAgentCoachAction', () => ({
  useAgentCoachAction: () => ({
    coachDialogVisible: { value: false },
    coachDialogLoading: { value: false },
    coachDialogError: { value: '' },
    coachDialogCanceled: { value: false },
    coachDialogTask: { value: null },
    coachActionResult: { value: null },
    coachNextActionPath: { value: '/agent/today' },
    openCoachAction: vi.fn(),
    cancelCoachAction: vi.fn(),
    trackCoachNextAction: vi.fn()
  })
}))

vi.mock('@/components/agent/AgentCoachActionDialog.vue', () => ({
  default: {
    name: 'AgentCoachActionDialog',
    template: '<div class="agent-coach-dialog-stub"></div>'
  }
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('@/components/job-readiness/AgentTaskEvidence.vue', () => ({
  default: defineComponent({
    name: 'AgentTaskEvidence',
    props: ['suggestion'],
    emits: ['open'],
    template: `
      <button class="agent-task-evidence-stub" type="button" @click="$emit('open', suggestion.nextActions[0]?.path)">
        {{ suggestion.evidenceSources[0]?.sourceType }}|{{ suggestion.evidenceSources[0]?.sourceId }}|{{ suggestion.trustStatus }}|{{ suggestion.evidenceSources[0]?.summary }}|{{ suggestion.fallback }}|{{ suggestion.trace?.agentRunId }}|{{ suggestion.trace?.traceId }}|{{ suggestion.nextActions[0]?.path }}|{{ suggestion.scene }}|{{ suggestion.bizType }}|{{ suggestion.bizId }}|{{ suggestion.trace?.aiCallLogId }}|{{ suggestion.pagePath }}
      </button>
    `
  })
}))

const stubs = {
  AgentCoachActionDialog: true,
  AppState: {
    props: ['title', 'description'],
    template: '<div class="app-state-stub">{{ title }} {{ description }}<slot /></div>'
  },
  StatusTag: true,
  'el-alert': true,
  'el-button': {
    template: '<button class="el-button-stub" v-bind="$attrs"><slot /></button>'
  },
  'el-checkbox': true,
  'el-date-picker': true,
  'el-dialog': {
    template: '<div><slot /><slot name="footer" /></div>'
  },
  'el-dropdown': {
    template: '<div><slot /><slot name="dropdown" /></div>'
  },
  'el-dropdown-item': {
    template: '<button type="button" class="el-dropdown-item-stub" v-bind="$attrs"><slot /></button>'
  },
  'el-dropdown-menu': {
    template: '<div><slot /></div>'
  },
  'el-form': {
    template: '<form><slot /></form>'
  },
  'el-form-item': {
    template: '<label><slot /></label>'
  },
  'el-input': true,
  'el-input-number': true,
  'el-option': true,
  'el-select': true,
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

describe('AgentTodayView agent task evidence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerPush.mockResolvedValue(undefined)
    vi.mocked(fetchCachedLatestDailyPlan).mockResolvedValue({
      runId: 777,
      date: '2026-07-05',
      planDate: '2026-07-05',
      status: 'SUCCESS',
      summary: '今日训练'
    })
    vi.mocked(fetchCachedTodayAgentTasks).mockResolvedValue({
      total: 1,
      doneCount: 0,
      todoCount: 1,
      tasks: [
        {
          id: 42,
          title: '错题复盘',
          description: '完成错题复盘',
          taskType: 'WRONG_QUESTION_REVIEW',
          status: 'TODO',
          sourceType: 'WRONG_QUESTION_REVIEW',
          sourceId: 88,
          trustStatus: 'FALLBACK',
          evidenceSummary: '错题记录不足，已降级生成训练任务',
          fallback: true,
          agentRunId: 777,
          traceId: 'trace-agent-1',
          aiCallLogId: 9001,
          actionUrl: 'https://evil.example/phish?prompt=secret'
        }
      ]
    })
    vi.mocked(getAgentReviewsApi).mockResolvedValue([])
    vi.mocked(getAgentPlanChangeSetsApi).mockResolvedValue([])
    vi.mocked(getCurrentAgentWeekPlanApi).mockResolvedValue(null)
    vi.mocked(getCurrentJobTargetApi).mockResolvedValue({
      id: 7,
      jobTitle: 'Frontend Engineer',
      companyName: 'Demo Company',
      currentFlag: 1
    })
    vi.mocked(getJobTargetsApi).mockResolvedValue([{
      id: 7,
      jobTitle: 'Frontend Engineer',
      companyName: 'Demo Company',
      currentFlag: 1
    }])
  })

  it('maps AgentTaskVO to unified evidence and lets the page own safe navigation', async () => {
    const wrapper = mount(AgentTodayView, {
      global: {
        directives: {
          loading: {}
        },
        stubs
      }
    })
    await flushPromises()
    await flushPromises()

    const evidence = wrapper.find('.agent-task-evidence-stub')
    expect(evidence.exists()).toBe(true)
    expect(evidence.text()).toContain('WRONG_QUESTION_REVIEW|88|FALLBACK|错题记录不足，已降级生成训练任务|true|777|trace-agent-1')
    expect(evidence.text()).toContain('AGENT_TASK_RECOMMENDATION|AGENT_TASK|42|9001|/agent/today?date=2026-07-05')
    expect(evidence.text()).not.toContain('prompt')
    expect(evidence.text()).not.toContain('evil.example')

    await evidence.trigger('click')

    expect(routerPush).not.toHaveBeenCalledWith(expect.stringContaining('evil.example'))
    expect(routerPush).toHaveBeenCalledWith(expect.stringContaining('/questions/practice'))
  })

  it('feeds the latest DAILY review into the loop overview', async () => {
    vi.mocked(getAgentReviewsApi).mockResolvedValue([{
      id: 81,
      reviewDate: '2026-07-18',
      adjustments: ['下一轮先完成最小可验证动作。'],
      confidenceLevel: 'HIGH',
      fallback: true
    }])

    const wrapper = mount(AgentTodayView, {
      global: {
        directives: {
          loading: {}
        },
        stubs
      }
    })
    await flushPromises()
    await flushPromises()

    expect(getAgentReviewsApi).toHaveBeenCalledWith({ targetJobId: 7 })
    expect(wrapper.get('.agent-loop-snapshot').text()).toContain('下一轮先完成最小可验证动作')
    expect(wrapper.get('[data-latest-review]').text()).toContain('2026-07-18')
    expect(wrapper.get('.agent-loop-snapshot__facts').text()).toContain('高置信度')
    expect(wrapper.get('.agent-loop-snapshot__facts').text()).toContain('规则兜底')
  })

  it('waits for the current target before requesting scoped reviews', async () => {
    let resolveCurrentTarget!: (value: { id: number; jobTitle: string; companyName: string; currentFlag: number }) => void
    vi.mocked(getCurrentJobTargetApi).mockImplementationOnce(() => new Promise((resolve) => {
      resolveCurrentTarget = resolve
    }))

    mount(AgentTodayView, {
      global: {
        directives: {
          loading: {}
        },
        stubs
      }
    })
    await flushPromises()

    expect(getAgentReviewsApi).not.toHaveBeenCalled()

    resolveCurrentTarget({
      id: 7,
      jobTitle: 'Frontend Engineer',
      companyName: 'Demo Company',
      currentFlag: 1
    })
    await flushPromises()
    await flushPromises()

    expect(getAgentReviewsApi).toHaveBeenCalledWith({ targetJobId: 7 })
  })

  it('does not request unscoped reviews when target resolution fails', async () => {
    vi.mocked(getCurrentJobTargetApi).mockRejectedValueOnce(new Error('当前岗位接口失败'))
    vi.mocked(getJobTargetsApi).mockRejectedValueOnce(new Error('岗位列表接口失败'))

    mount(AgentTodayView, {
      global: {
        directives: {
          loading: {}
        },
        stubs
      }
    })
    await flushPromises()
    await flushPromises()

    expect(getAgentReviewsApi).not.toHaveBeenCalled()
  })

  it('keeps task data and uses rule fallback when DAILY review loading fails', async () => {
    vi.mocked(getAgentReviewsApi).mockRejectedValue(new Error('复盘接口失败'))

    const wrapper = mount(AgentTodayView, {
      global: {
        directives: {
          loading: {}
        },
        stubs
      }
    })
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('.agent-task-evidence-stub').exists()).toBe(true)
    expect(wrapper.get('.agent-loop-snapshot').text()).toContain('先完成或暂缓至少一项任务')
    expect(wrapper.find('[data-latest-review]').exists()).toBe(false)
  })

  it('keeps the full-page error when both core sources and DAILY reviews fail', async () => {
    vi.mocked(fetchCachedLatestDailyPlan).mockRejectedValue(new Error('计划接口失败'))
    vi.mocked(fetchCachedTodayAgentTasks).mockRejectedValue(new Error('任务接口失败'))
    vi.mocked(getAgentReviewsApi).mockRejectedValue(new Error('复盘接口失败'))

    const wrapper = mount(AgentTodayView, {
      global: {
        directives: {
          loading: {}
        },
        stubs
      }
    })
    await flushPromises()
    await flushPromises()

    expect(wrapper.get('.app-state-stub').text()).toContain('今日计划加载失败')
    expect(wrapper.find('.agent-diagnostic-state').exists()).toBe(false)
  })

  it('renders review-confirmed week-plan origin with a safe Chinese fallback for unknown change types', async () => {
    vi.mocked(getAgentReviewsApi).mockResolvedValue([{
      id: 81,
      reviewDate: '2026-07-18',
      adjustments: []
    }])
    vi.mocked(getCurrentAgentWeekPlanApi).mockResolvedValue({
      id: 3001,
      planDate: '2026-07-18',
      weekStartDate: '2026-07-13',
      weekEndDate: '2026-07-19',
      snapshotVersion: 4,
      items: [{
        id: 901,
        agentTaskId: 42,
        layer: 'TODAY',
        title: '错题复盘',
        itemStatus: 'TODO',
        plannedDate: '2026-07-18',
        confidenceLevel: 'MEDIUM',
        reviewConfirmed: true,
        sourceReviewId: 81,
        reviewChangeType: 'UNKNOWN_FUTURE_TYPE'
      }]
    } as never)

    const wrapper = mount(AgentTodayView, {
      global: {
        directives: {
          loading: {}
        },
        stubs
      }
    })
    await flushPromises()
    await flushPromises()

    const origins = wrapper.findAll('.agent-week-plan__review-origin')
    expect(origins.length).toBeGreaterThan(0)
    expect(origins.map((item) => item.text()).join(' ')).toContain('来自 2026-07-18 每日复盘')
    expect(origins.map((item) => item.text()).join(' ')).toContain('用户已确认')
    expect(origins.map((item) => item.text()).join(' ')).toContain('变更类型：计划变更')
  })
})
