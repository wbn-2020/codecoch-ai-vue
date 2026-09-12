import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/api/interview', () => ({
  getInterviewsApi: vi.fn().mockResolvedValue({
    records: [], total: 0, pageNo: 1, pageSize: 10, pages: 0
  })
}))
vi.mock('@/api/interviewAdvanced', () => ({
  createInterviewComparisonApi: vi.fn(),
  getInterviewAdvancedReportApi: vi.fn()
}))
vi.mock('@/utils/idempotency', () => ({
  createOperationIdempotencyKey: vi.fn(() => 'k')
}))

import InterviewHistoryView from '@/views/interview/InterviewHistoryView.vue'

describe('InterviewHistoryView view tabs', () => {
  it('switches to history panel when the history tab is clicked', async () => {
    const wrapper = mount(InterviewHistoryView, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          RouterView: { template: '<div />' }
        }
      }
    })
    await flushPromises()
    const historyTab = wrapper
      .findAll('button.view-tab')
      .find(b => b.text().includes('历史记录与报告'))
    expect(historyTab).toBeTruthy()
    await historyTab!.trigger('click')
    await flushPromises()
    // continue 面板应消失（v-if="activeView === 'continue'"）
    const continuePanel = wrapper.find('section.continue-view')
    expect(continuePanel.exists()).toBe(false)
  })
})
