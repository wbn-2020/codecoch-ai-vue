import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useGameProfileStore } from '@/features/game-profile'
import ResumeMatchDetailView from '@/views/v3/ResumeMatchDetailView.vue'

const reportResult = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }))
const reportApi = vi.hoisted(() => ({
  getDetail: vi.fn(async () => reportResult.value),
  regenerate: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '91' }, query: {} }),
  useRouter: () => ({ push: vi.fn() })
}))

vi.mock('@/api/resumeJobMatch', () => ({
  getResumeJobMatchReportDetailApi: reportApi.getDetail,
  regenerateResumeJobMatchReportApi: reportApi.regenerate
}))

vi.mock('@/api/skillProfile', () => ({
  generateSkillProfileApi: vi.fn()
}))

vi.mock('@/api/v4', () => ({
  createApplicationApi: vi.fn(),
  createResumeVersionApi: vi.fn(),
  getApplicationsApi: vi.fn()
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}))

const stubs = {
  AppState: true,
  AiResultFeedback: true,
  DataBlock: true,
  'el-alert': true,
  'el-button': {
    props: ['disabled', 'loading'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

const mountView = () => mount(ResumeMatchDetailView, {
  global: { stubs }
})

const trustedSuccessReport = (reportId = 91) => ({
  reportId,
  resumeId: 7,
  targetJobId: 3,
  status: 'SUCCESS',
  trustStatus: 'VERIFIED',
  fallback: false,
  schemaWarnings: [],
  overallScore: 82,
  details: []
})

describe('ResumeMatchDetailView XP rewards', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    reportResult.value = trustedSuccessReport()
  })

  it('awards jd_cover_boost once for a trusted successful report, including repeated loads', async () => {
    const firstWrapper = mountView()
    await flushPromises()

    const profile = useGameProfileStore()
    expect(profile.xp).toBe(120)
    expect(profile.xpRewards).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event: 'jd_cover_boost',
        rewardKey: 'resume-match-report:91:jd-cover-boost'
      })
    ]))

    firstWrapper.unmount()
    const repeatedWrapper = mountView()
    await flushPromises()

    expect(useGameProfileStore().xp).toBe(120)
    expect(reportApi.getDetail).toHaveBeenCalledTimes(2)
    repeatedWrapper.unmount()
  })

  it.each([
    { status: 'FAILED', trustStatus: 'VERIFIED', fallback: false, schemaWarnings: [] },
    { status: 'PENDING', trustStatus: 'VERIFIED', fallback: false, schemaWarnings: [] },
    { status: 'RUNNING', trustStatus: 'VERIFIED', fallback: false, schemaWarnings: [] },
    { status: 'SUCCESS', trustStatus: 'PARTIAL', fallback: false, schemaWarnings: [] },
    { status: 'SUCCESS', trustStatus: 'VERIFIED', fallback: true, schemaWarnings: [] },
    { status: 'SUCCESS', trustStatus: 'VERIFIED', fallback: false, schemaWarnings: [{ field: 'summary' }] }
  ])('does not award XP for reports that are not trusted training results: %#', async (state) => {
    reportResult.value = {
      ...trustedSuccessReport(),
      ...state
    }

    const wrapper = mountView()
    await flushPromises()

    expect(useGameProfileStore().xp).toBe(0)
    wrapper.unmount()
  })
})
