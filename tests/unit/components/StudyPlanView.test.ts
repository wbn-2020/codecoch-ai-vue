import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getUserDashboardOverviewApi } from '@/api/dashboard'
import {
  generateStudyPlanApi,
  getStudyPlanDailyViewApi,
  getStudyPlanDetailApi,
  getStudyPlansApi,
  streamStudyPlanGenerateApi
} from '@/api/studyPlan'
import StudyPlanView from '@/views/study/StudyPlanView.vue'

const routerReplace = vi.hoisted(() => vi.fn())
const routerPush = vi.hoisted(() => vi.fn())
const routeQuery = vi.hoisted(() => ({
  current: { planId: '1', reportId: '101' } as Record<string, string>
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: routeQuery.current
  }),
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace
  })
}))

vi.mock('@/api/dashboard', () => ({
  getUserDashboardOverviewApi: vi.fn()
}))

vi.mock('@/api/studyPlan', () => ({
  generateStudyPlanApi: vi.fn(),
  getStudyPlanDailyViewApi: vi.fn(),
  getStudyPlanDetailApi: vi.fn(),
  getStudyPlansApi: vi.fn(),
  streamStudyPlanGenerateApi: vi.fn(),
  updateStudyTaskStatusApi: vi.fn()
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  }
}))

const task = {
  id: 11,
  planId: 1,
  stageNo: 1,
  plannedDate: '2026-08-12',
  taskTitle: 'Review concurrency',
  taskStatus: 'TODO',
  estimatedMinutes: 90,
  estimatedHours: 2
}

const componentStubs = {
  AppState: {
    template: '<div class="app-state-stub"><slot /></div>'
  },
  'el-button': {
    template: '<button v-bind="$attrs"><slot /></button>'
  },
  'el-date-picker': {
    template: '<input />'
  },
  'el-form': {
    template: '<form><slot /></form>'
  },
  'el-form-item': {
    template: '<div><slot /></div>'
  },
  'el-input': {
    template: '<input />'
  },
  'el-input-number': {
    template: '<input />'
  },
  'el-pagination': true,
  'el-progress': true,
  'el-select': {
    template: '<select><slot /></select>'
  },
  'el-option': true,
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

describe('StudyPlanView task duration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeQuery.current = { planId: '1', reportId: '101' }
    vi.mocked(getUserDashboardOverviewApi).mockResolvedValue({
      businessDate: '2026-08-12'
    } as never)
    vi.mocked(getStudyPlansApi).mockResolvedValue({
      records: [{
        id: 1,
        reportId: 101,
        sourceId: 101,
        sourceType: 'INTERVIEW_REPORT',
        planStatus: 'ACTIVE',
        planTitle: 'Interview repair plan'
      }],
      total: 1,
      pageNo: 1,
      pageSize: 8
    })
    vi.mocked(getStudyPlanDetailApi).mockResolvedValue({
      id: 1,
      reportId: 101,
      sourceId: 101,
      sourceType: 'INTERVIEW_REPORT',
      planStatus: 'ACTIVE',
      planTitle: 'Interview repair plan',
      durationDays: 14,
      dailyMinutes: 60,
      tasks: [task]
    })
    vi.mocked(getStudyPlanDailyViewApi).mockResolvedValue({
      planId: 1,
      date: '2026-08-12',
      dayIndex: 1,
      totalTaskCount: 1,
      pendingTaskCount: 1,
      completedTaskCount: 0,
      skippedTaskCount: 0,
      completionRate: 0,
      tasks: [task]
    })
  })

  it('renders exact estimated minutes instead of rounded estimated hours', async () => {
    const wrapper = mount(StudyPlanView, {
      global: {
        stubs: componentStubs
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('90分钟')
    expect(wrapper.text()).not.toContain('2h')
    expect(wrapper.text()).toContain('计划周期')
    expect(wrapper.text()).toContain('14天')
    expect(wrapper.text()).toContain('每日投入')
    expect(wrapper.text()).toContain('60分钟')
  })

  it('shows pending confirmation when persisted plan configuration is absent', async () => {
    vi.mocked(getStudyPlanDetailApi).mockResolvedValue({
      id: 1,
      reportId: 101,
      planStatus: 'ACTIVE',
      planTitle: 'Interview repair plan',
      tasks: [task]
    })

    const wrapper = mount(StudyPlanView, {
      global: {
        stubs: componentStubs
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('待确认')
  })

  it('submits default bounded duration and daily minutes when generating from the plan page', async () => {
    vi.mocked(streamStudyPlanGenerateApi).mockRejectedValue(new Error('stream unavailable'))
    vi.mocked(generateStudyPlanApi).mockResolvedValue({
      planId: 2,
      planStatus: 'ACTIVE'
    })

    const wrapper = mount(StudyPlanView, {
      global: {
        stubs: componentStubs
      }
    })
    await flushPromises()

    const generateButton = wrapper.findAll('button').find((button) => button.text().includes('生成训练路线'))
    await generateButton!.trigger('click')
    await flushPromises()

    expect(generateStudyPlanApi).toHaveBeenCalledWith(expect.objectContaining({
      reportId: 101,
      expectedDurationDays: 14,
      dailyMinutes: 60
    }))
    expect(streamStudyPlanGenerateApi).toHaveBeenCalledWith(expect.objectContaining({
      reportId: 101,
      expectedDurationDays: 14,
      dailyMinutes: 60
    }), expect.any(Object), expect.any(AbortSignal))
  })
})
