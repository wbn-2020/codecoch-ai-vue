import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    template: '<div class="app-state-stub"><slot /></div>'
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
})
