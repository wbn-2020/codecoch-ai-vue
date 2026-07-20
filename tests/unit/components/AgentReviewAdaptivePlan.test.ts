import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const appConfig = vi.hoisted(() => ({
  enableV4AdaptivePlan: false
}))

const agentPlanChangeApi = vi.hoisted(() => ({
  confirmAgentPlanChangeSetApi: vi.fn(),
  createAgentPlanChangePreviewApi: vi.fn(),
  decideAgentReviewPlanSuggestionsApi: vi.fn(),
  getAgentPlanChangeSetApi: vi.fn(),
  getAgentReviewPlanSuggestionsApi: vi.fn()
}))

const v4Api = vi.hoisted(() => ({
  generateAgentReviewApi: vi.fn(),
  getAgentReviewsApi: vi.fn()
}))

const elMessage = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn()
}))

vi.mock('@/config', () => ({ appConfig }))
vi.mock('@/api/agentPlanChange', () => agentPlanChangeApi)
vi.mock('@/api/v4', () => v4Api)
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))
vi.mock('@/utils/dangerAction', () => ({
  confirmDangerActionPreview: vi.fn()
}))
vi.mock('element-plus', () => ({
  ElMessage: elMessage
}))

import AgentReviewView from '@/views/v4/AgentReviewView.vue'

const stubs = {
  AppState: {
    props: ['title', 'description'],
    template: '<div>{{ title }} {{ description }}<slot /></div>'
  },
  'el-button': {
    template: '<button type="button"><slot /></button>'
  },
  'el-alert': {
    props: ['title', 'description'],
    template: '<div>{{ title }} {{ description }}</div>'
  },
  'el-checkbox': {
    template: '<button type="button"><slot /></button>'
  },
  'el-date-picker': true,
  'el-input-number': true,
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

describe('AgentReviewView adaptive plan feature gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appConfig.enableV4AdaptivePlan = false
    v4Api.getAgentReviewsApi.mockResolvedValue([{
      id: 88,
      reviewType: 'DAILY',
      reviewVersion: 2,
      sourceSnapshotHash: 'review-hash',
      reviewDate: '2026-07-18',
      summary: '今日完成了核心训练',
      facts: ['已完成一项高优先级任务'],
      limits: ['样本仍有限'],
      driftReasons: [],
      adjustments: ['明日减少一项低优先级练习'],
      nextActions: ['先完成最小可验证动作'],
      planSuggestions: [{
        id: 301,
        reviewId: 88,
        reviewVersion: 2,
        title: '减少明日任务量',
        decisionStatus: 'PENDING',
        decisionVersion: 1,
        actionable: true
      }]
    }])
  })

  it('keeps the review readable while hiding decision, preview, and confirm entry points', async () => {
    const wrapper = mount(AgentReviewView, {
      global: {
        directives: { loading: {} },
        stubs
      }
    })
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('今日完成了核心训练')
    expect(wrapper.text()).toContain('已完成一项高优先级任务')
    expect(wrapper.text()).toContain('明日减少一项低优先级练习')
    expect(wrapper.find('.review-plan-panel').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('预览计划变化')
    expect(wrapper.text()).not.toContain('确认写入计划')
    expect(agentPlanChangeApi.getAgentReviewPlanSuggestionsApi).not.toHaveBeenCalled()
    expect(agentPlanChangeApi.decideAgentReviewPlanSuggestionsApi).not.toHaveBeenCalled()
    expect(agentPlanChangeApi.createAgentPlanChangePreviewApi).not.toHaveBeenCalled()
    expect(agentPlanChangeApi.confirmAgentPlanChangeSetApi).not.toHaveBeenCalled()
  })

  it('refreshes the suggestion contract after a 409 decision conflict when the independent gate is enabled', async () => {
    appConfig.enableV4AdaptivePlan = true
    agentPlanChangeApi.decideAgentReviewPlanSuggestionsApi.mockRejectedValue({
      response: {
        status: 409,
        data: {
          message: 'PLAN_CHANGE_ALREADY_DECIDED：建议状态已变化。'
        }
      }
    })
    agentPlanChangeApi.getAgentReviewPlanSuggestionsApi.mockResolvedValue({
      reviewId: 88,
      reviewVersion: 3,
      reviewDate: '2026-07-18',
      suggestions: [{
        id: 301,
        reviewId: 88,
        reviewVersion: 3,
        title: '减少明日任务量',
        decisionStatus: 'PENDING',
        decisionVersion: 2,
        actionable: true
      }]
    })

    const wrapper = mount(AgentReviewView, {
      global: {
        directives: { loading: {} },
        stubs
      }
    })
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('.review-plan-panel').exists()).toBe(true)
    const acceptButton = wrapper.findAll('button').find((button) => button.text() === '采纳')
    expect(acceptButton).toBeTruthy()
    await acceptButton!.trigger('click')
    await flushPromises()

    expect(agentPlanChangeApi.decideAgentReviewPlanSuggestionsApi).toHaveBeenCalledWith(
      88,
      expect.objectContaining({
        expectedReviewVersion: 2,
        decisions: [expect.objectContaining({
          suggestionId: 301,
          decision: 'ACCEPTED',
          expectedDecisionVersion: 1
        })]
      }),
      { silentError: true }
    )
    expect(agentPlanChangeApi.getAgentReviewPlanSuggestionsApi).toHaveBeenCalledWith(
      88,
      { silentError: true }
    )
    expect(elMessage.warning).toHaveBeenCalled()
  })
})
