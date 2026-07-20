import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ApplicationEventReviewPanel from '@/views/application/components/ApplicationEventReviewPanel.vue'
import type { ApplicationEventStructuredReview } from '@/features/applications'

const review: ApplicationEventStructuredReview = {
  scenario: 'REJECTION',
  eventScope: 'REAL_JOB',
  userInput: {
    owner: 'USER',
    observedFacts: [{ id: 'U1', content: '收到拒信', owner: 'USER' }],
    selfReflection: '我需要复核项目证据。'
  },
  systemFacts: [{ id: 'S1', content: '系统记录事件类型为拒信', owner: 'SYSTEM' }],
  analysis: {
    owner: 'RULE',
    summary: '只能做有限复盘。',
    limits: ['没有招聘方明确原因。'],
    signals: [{
      content: '项目证据可作为下一轮实验变量。',
      factRefs: ['U1'],
      confidenceLevel: 'LOW',
      owner: 'RULE'
    }],
    adjustments: ['只调整一个变量。'],
    nextActions: ['复核一条项目证据。']
  },
  generation: {
    owner: 'SYSTEM',
    status: 'FALLBACK',
    fallback: true,
    confidenceLevel: 'LOW',
    confidenceBasis: ['缺少明确外部反馈。']
  }
}

const stubs = {
  'el-tag': {
    template: '<span v-bind="$attrs"><slot /></span>'
  }
}

describe('ApplicationEventReviewPanel', () => {
  it('separates facts, signals, fallback, confidence, and fact references', () => {
    const wrapper = mount(ApplicationEventReviewPanel, {
      props: { review },
      global: { stubs }
    })

    expect(wrapper.text()).toContain('原始事实')
    expect(wrapper.text()).toContain('弱信号')
    expect(wrapper.text()).toContain('U1 · 收到拒信')
    expect(wrapper.get('[data-testid="application-review-fallback"]').text()).toBe('规则降级')
    expect(wrapper.get('[data-testid="application-review-confidence"]').text()).toBe('低置信度')
    expect(wrapper.text()).toContain('用户记录')
    expect(wrapper.text()).toContain('系统事实')
  })

  it('renders legacy review without labeling assumptions as facts', () => {
    const wrapper = mount(ApplicationEventReviewPanel, {
      props: { legacyText: '假设：可能是表达问题' },
      global: { stubs }
    })

    expect(wrapper.get('[data-testid="application-event-legacy-review"]').text()).toContain('历史复盘')
    expect(wrapper.text()).toContain('假设：可能是表达问题')
    expect(wrapper.text()).not.toContain('原始事实')
  })
})
