import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SuggestionEvidencePanel from '@/components/suggestion/SuggestionEvidencePanel.vue'

const componentStubs = {
  AiResultFeedback: {
    name: 'AiResultFeedback',
    props: ['scene', 'bizType', 'bizId', 'aiCallLogId', 'pagePath', 'compact'],
    emits: ['submitted'],
    template: '<button class="feedback-stub" @click="$emit(\'submitted\')">feedback</button>'
  },
  'el-alert': {
    props: ['title', 'type'],
    template: '<div class="el-alert-stub" :data-type="type">{{ title }}<slot /></div>'
  },
  'el-button': {
    template: '<button class="el-button-stub" v-bind="$attrs"><slot /></button>'
  },
  'el-tag': {
    props: ['type'],
    template: '<span class="el-tag-stub" :data-type="type"><slot /></span>'
  }
}

const baseSuggestion = {
  title: 'Improve project story',
  content: 'Add metrics and decision trade-offs before the next interview.',
  scene: 'INTERVIEW_REPORT_ADVICE',
  bizType: 'INTERVIEW_REPORT',
  bizId: 42,
  pagePath: '/interviews/42/report',
  trace: {
    aiCallLogId: 9001
  }
}

const mountPanel = (suggestion: Record<string, unknown>, props: Record<string, unknown> = {}) => mount(SuggestionEvidencePanel, {
  props: {
    suggestion,
    defaultOpen: true,
    showTrace: true,
    ...props
  },
  global: {
    stubs: componentStubs
  }
})

describe('SuggestionEvidencePanel', () => {
  it('shows an empty evidence state without exposing raw evidence text', () => {
    const wrapper = mountPanel({
      ...baseSuggestion,
      evidenceSources: []
    })

    expect(wrapper.text()).toContain('Improve project story')
    expect(wrapper.text()).toContain('暂无可展示的证据来源')
  })

  it('keeps sample-insufficient advice visibly weak', () => {
    const wrapper = mountPanel({
      ...baseSuggestion,
      confidence: 'LOW',
      sampleInsufficient: true,
      sampleWarning: '样本不足，不能作为强结论'
    })

    expect(wrapper.text()).toContain('低置信度')
    expect(wrapper.text()).toContain('样本不足，不能作为强结论')
  })

  it('renders degraded, mock, and fallback states', () => {
    const wrapper = mountPanel({
      ...baseSuggestion,
      degraded: true,
      degradedReason: '模型超时，已使用摘要策略',
      mock: true,
      fallback: true
    })

    expect(wrapper.text()).toContain('已降级')
    expect(wrapper.text()).toContain('Mock')
    expect(wrapper.text()).toContain('Fallback')
    expect(wrapper.text()).toContain('模型超时，已使用摘要策略')
  })

  it('passes feedback params from suggestion and emits display-only actions', async () => {
    const wrapper = mountPanel({
      ...baseSuggestion,
      why: ['Matched weak answer structure'],
      evidenceSources: [
        {
          id: 'answer-1',
          title: 'Answer summary',
          sourceLabel: 'Mock interview answer',
          summary: 'Only summary is shown'
        }
      ],
      nextActions: [
        {
          key: 'practice',
          label: 'Practice again',
          path: '/questions/practice'
        }
      ]
    })

    const feedback = wrapper.findComponent({ name: 'AiResultFeedback' })
    expect(feedback.props()).toMatchObject({
      scene: 'INTERVIEW_REPORT_ADVICE',
      bizType: 'INTERVIEW_REPORT',
      bizId: 42,
      aiCallLogId: 9001,
      pagePath: '/interviews/42/report'
    })

    await wrapper.find('.suggestion-evidence-panel__evidence-button').trigger('click')
    expect(wrapper.emitted('open-evidence')?.[0]).toEqual([
      expect.objectContaining({ id: 'answer-1' })
    ])

    await wrapper.find('.suggestion-evidence-panel__action-button').trigger('click')
    expect(wrapper.emitted('open-action')?.[0]).toEqual([
      expect.objectContaining({ key: 'practice', path: '/questions/practice' })
    ])

    await wrapper.find('.feedback-stub').trigger('click')
    expect(wrapper.emitted('feedback-submitted')).toHaveLength(1)
  })
})
