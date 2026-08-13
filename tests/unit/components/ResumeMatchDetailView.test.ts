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
  schemaWarningCount: 0,
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

  it('keeps the Direction D reconciliation card and compact right-side action hierarchy for successful reports', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.arena-match-settlement__reconciliation').exists()).toBe(true)
    expect(wrapper.find('.arena-match-settlement__right-rail').exists()).toBe(true)
    expect(wrapper.find('.arena-match-settlement__right-rail .arena-match-settlement__action').exists()).toBe(true)
    expect(wrapper.find('.arena-match-settlement__right-rail .arena-match-settlement__secondary').text()).toContain('还可以')
    expect(wrapper.find('.arena-match-settlement__right-rail .arena-match-settlement__evidence').exists()).toBe(true)

    wrapper.unmount()
  })

  it('uses professional result-overview copy for the trusted report summary', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.arena-match-settlement__kicker').text()).toBe('岗位匹配 · 结果概览')
    expect(wrapper.find('.arena-match-settlement__kicker').text()).not.toContain('第 3 关')
    expect(wrapper.find('.arena-match-settlement__kicker').text()).not.toContain('结算')

    wrapper.unmount()
  })

  it('labels overallScore as comprehensive match and does not infer covered dimensions from empty details', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.arena-match-settlement__ring').text()).toContain('综合匹配度')
    expect(wrapper.find('.arena-match-settlement__ring').text()).not.toContain('JD 覆盖率')
    expect(wrapper.find('.arena-match-settlement__keywords').text()).toContain('暂无可确认的高覆盖维度')
    expect(wrapper.find('.arena-match-settlement__reconciliation-head').text()).toContain('暂无维度明细，不能推断覆盖情况')
    expect(wrapper.findAll('.arena-match-settlement__keywords section:first-child > div > span')).toHaveLength(0)

    wrapper.unmount()
  })

  it.each([
    { status: 'FAILED', trustStatus: 'VERIFIED', fallback: false, schemaWarnings: [] },
    { status: 'PENDING', trustStatus: 'VERIFIED', fallback: false, schemaWarnings: [] },
    { status: 'RUNNING', trustStatus: 'VERIFIED', fallback: false, schemaWarnings: [] },
    { status: 'SUCCESS', trustStatus: 'PARTIAL', fallback: false, schemaWarnings: [] },
    { status: 'SUCCESS', trustStatus: 'VERIFIED', fallback: true, schemaWarnings: [] },
    { status: 'SUCCESS', trustStatus: 'VERIFIED', fallback: false, schemaWarningCount: 1, schemaWarnings: [{ field: 'summary' }] },
    { status: 'SUCCESS', trustStatus: 'VERIFIED', fallback: false, schemaWarningCount: undefined, schemaWarnings: [] }
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

  it('does not present an untrusted numeric score as the primary conclusion', async () => {
    reportResult.value = {
      ...trustedSuccessReport(),
      trustStatus: 'PARTIAL',
      overallScore: 96,
      details: [{ id: 1, skillName: 'Java', score: 95 }]
    }

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.arena-match-settlement__ring').text()).toContain('待复核')
    expect(wrapper.find('.arena-match-settlement__ring').text()).not.toContain('96')
    expect(wrapper.find('.arena-match-settlement__keywords').text()).toContain('暂无可确认的高覆盖维度')
    expect(wrapper.text()).toContain('数字评分不作为结论')
    expect(wrapper.find('.score-grid').exists()).toBe(false)

    wrapper.unmount()
  })
})
