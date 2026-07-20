import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import {
  getAgentWeeklyReportsApi,
  getCurrentAgentWeeklyReportApi
} from '@/api/agentWeeklyReport'
import { getJobTargetsApi } from '@/api/jobTarget'
import AgentWeeklyReportView from '@/views/v4/AgentWeeklyReportView.vue'

vi.mock('@/api/agentWeeklyReport', () => ({
  generateAgentWeeklyReportApi: vi.fn(),
  getAgentWeeklyReportDetailApi: vi.fn(),
  getAgentWeeklyReportsApi: vi.fn(),
  getCurrentAgentWeeklyReportApi: vi.fn(),
  refreshAgentWeeklyReportApi: vi.fn()
}))

vi.mock('@/api/jobTarget', () => ({
  getJobTargetsApi: vi.fn()
}))

const componentStubs = {
  AppState: {
    template: '<section><slot /></section>'
  },
  WeeklyExperimentPanel: true,
  WeeklyPlanDraftPanel: true,
  WeeklyReportCoveragePanel: true,
  WeeklyReportFactsPanel: true,
  WeeklyReportSignalsPanel: true,
  'el-alert': true,
  'el-button': {
    template: '<button><slot /></button>'
  },
  'el-date-picker': {
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
      template: `
      <button
        class="week-picker"
        @click="$emit('update:modelValue', '2026-07-06'); $emit('change', '2026-07-06')"
      >
        {{ modelValue }}
      </button>
    `
  },
  'el-select': {
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template: `
      <button
        class="target-select"
        @click="$emit('update:modelValue', 'ALL'); $emit('change', 'ALL')"
      >
        {{ modelValue }}<slot />
      </button>
    `
  },
  'el-option': true,
  'el-tag': true,
  'el-drawer': true
}

describe('weekly report deep link', () => {
  beforeEach(() => {
    vi.mocked(getJobTargetsApi).mockResolvedValue([
      {
        id: 9701301,
        jobTitle: '高级后端工程师',
        companyName: '示例科技'
      }
    ])
    vi.mocked(getAgentWeeklyReportsApi).mockResolvedValue([])
    vi.mocked(getCurrentAgentWeeklyReportApi).mockResolvedValue(null)
  })

  it('applies validated query filters and keeps later filter changes in the URL', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/agent/weekly-reports',
          component: AgentWeeklyReportView
        }
      ]
    })
    await router.push(
      '/agent/weekly-reports?weekStartDate=2026-07-19&targetJobId=9701301&source=notification'
    )
    await router.isReady()

    const wrapper = mount(AgentWeeklyReportView, {
      global: {
        plugins: [router],
        stubs: componentStubs,
        directives: {
          loading: () => undefined
        }
      }
    })
    await flushPromises()

    expect(getCurrentAgentWeeklyReportApi).toHaveBeenCalledWith(
      expect.objectContaining({
        weekStartDate: '2026-07-13',
        targetJobId: 9701301
      }),
      { silentError: true }
    )
    expect(router.currentRoute.value.query).toEqual({
      weekStartDate: '2026-07-13',
      targetJobId: '9701301',
      source: 'notification'
    })

    await wrapper.get('.target-select').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({
      weekStartDate: '2026-07-13',
      source: 'notification'
    })
    expect(getCurrentAgentWeeklyReportApi).toHaveBeenLastCalledWith(
      expect.objectContaining({
        weekStartDate: '2026-07-13',
        targetJobId: undefined
      }),
      { silentError: true }
    )

    await wrapper.get('.week-picker').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({
      weekStartDate: '2026-07-06',
      source: 'notification'
    })
    expect(getCurrentAgentWeeklyReportApi).toHaveBeenLastCalledWith(
      expect.objectContaining({
        weekStartDate: '2026-07-06',
        targetJobId: undefined
      }),
      { silentError: true }
    )
  })
})
