import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { submitAiResultFeedbackApi } from '@/api/aiFeedback'
import AgentTaskEvidence from '@/components/job-readiness/AgentTaskEvidence.vue'

vi.mock('@/api/aiFeedback', () => ({
  submitAiResultFeedbackApi: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    path: '/agent/today',
    query: { date: '2026-07-05', prompt: 'hidden' }
  })
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn()
  }
}))

const stubs = {
  'el-alert': {
    props: ['title'],
    template: '<div class="el-alert-stub">{{ title }}</div>'
  },
  'el-button': {
    template: '<button class="el-button-stub" v-bind="$attrs"><slot /></button>'
  },
  'el-dialog': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<div v-if="modelValue" class="el-dialog-stub"><slot /><slot name="footer" /></div>'
  },
  'el-form': {
    template: '<form><slot /></form>'
  },
  'el-form-item': {
    template: '<label><slot /></label>'
  },
  'el-input': {
    template: '<textarea />'
  },
  'el-rate': {
    template: '<div class="el-rate-stub"></div>'
  },
  'el-tag': {
    template: '<span class="el-tag-stub"><slot /></span>'
  },
  'el-radio-button': {
    template: '<button type="button"><slot /></button>'
  },
  'el-radio-group': {
    template: '<div><slot /></div>'
  }
}

describe('AgentTaskEvidence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(submitAiResultFeedbackApi).mockResolvedValue({ id: 1, scene: 'AGENT_TASK_RECOMMENDATION', feedbackType: 'HELPFUL' })
  })

  it('renders unified suggestion evidence with fallback and submits AI feedback context', async () => {
    const wrapper = mount(AgentTaskEvidence, {
      props: {
        open: true,
        suggestion: {
          id: 'agent-task-42',
          scene: 'AGENT_TASK_RECOMMENDATION',
          bizType: 'AGENT_TASK',
          bizId: 42,
          title: '复盘错题',
          content: '完成一组错题复盘',
          reason: '最近错题集中在并发控制',
          confidenceLevel: 'LOW',
          resultSource: 'FALLBACK',
          trustStatus: 'FALLBACK',
          fallback: true,
          evidenceSources: [
            {
              id: 'WRONG_QUESTION_REVIEW:88',
              title: '错题复习',
              sourceLabel: '错题复习',
              sourceType: 'WRONG_QUESTION_REVIEW',
              sourceId: 88,
              summary: '错题记录不足，已降级生成训练任务'
            }
          ],
          trace: {
            agentRunId: 777,
            traceId: 'trace-agent-1',
            aiCallLogId: 9001,
          },
          nextAction: {
            actionUrl: '/questions/review?questionId=88'
          },
          pagePath: '/agent/today?date=2026-07-05'
        }
      },
      global: { stubs }
    })

    expect(wrapper.text()).toContain('错题记录不足，已降级生成训练任务')
    expect(wrapper.text()).toContain('推荐依据不足')
    expect(wrapper.text()).toContain('trace-agent-1')

    await wrapper.findAll('button').find((button) => button.text().includes('反馈'))?.trigger('click')
    await wrapper.findAll('button').find((button) => button.text().includes('提交'))?.trigger('click')
    await flushPromises()

    expect(submitAiResultFeedbackApi).toHaveBeenCalledWith(expect.objectContaining({
      scene: 'AGENT_TASK_RECOMMENDATION',
      bizType: 'AGENT_TASK',
      bizId: 42,
      aiCallLogId: 9001,
      feedbackType: 'INACCURATE',
      pagePath: '/agent/today?date=2026-07-05'
    }))
  })

  it('keeps the legacy evidence prop entry and only emits navigation events', async () => {
    const wrapper = mount(AgentTaskEvidence, {
      props: {
        open: true,
        evidence: {
          sourceLabel: '匹配报告',
          skillLabel: 'Vue',
          bizLabel: '目标岗位',
          reason: '旧版入口仍可展示',
          safePath: '/resume-match/1',
          actionLabel: '查看报告'
        }
      },
      global: { stubs }
    })

    expect(wrapper.text()).toContain('匹配报告')
    expect(wrapper.text()).toContain('旧版入口仍可展示')

    await wrapper.findAll('button').find((button) => button.text().includes('查看报告'))?.trigger('click')

    expect(wrapper.emitted('open')).toEqual([[ '/resume-match/1' ]])
  })
})
