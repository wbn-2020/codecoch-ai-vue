import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  createArchive: vi.fn(),
  createPlanPreview: vi.fn(),
  downloadArchive: vi.fn(),
  generatePulse: vi.fn(),
  getActions: vi.fn(),
  getExports: vi.fn(),
  getCockpit: vi.fn(),
  getProfile: vi.fn(),
  getPulseHistory: vi.fn(),
  getPulse: vi.fn(),
  previewScenario: vi.fn(),
  saveDecision: vi.fn(),
  updateProfile: vi.fn()
}))
const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('@/api/v8Campaign', () => ({
  createCampaignArchiveExportV8Api: api.createArchive,
  createCampaignPulsePlanPreviewV8Api: api.createPlanPreview,
  downloadCampaignArchiveExportV8Api: api.downloadArchive,
  generateCampaignPulseV8Api: api.generatePulse,
  getCampaignActionDecisionsV8Api: api.getActions,
  getCampaignArchiveExportsV8Api: api.getExports,
  getCampaignCockpitV8Api: api.getCockpit,
  getCampaignOperatingProfileV8Api: api.getProfile,
  getCampaignPulseHistoryV8Api: api.getPulseHistory,
  getCampaignPulseV8Api: api.getPulse,
  previewCampaignScenarioV8Api: api.previewScenario,
  saveCampaignActionDecisionV8Api: api.saveDecision,
  updateCampaignOperatingProfileV8Api: api.updateProfile
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '3' } }),
  useRouter: () => router
}))

import { appConfig } from '@/config'
import CampaignCockpitView from '@/views/v8/campaign-cockpit/CampaignCockpitView.vue'

const stubs = {
  AppState: {
    props: ['title', 'description'],
    template: '<section><h3>{{ title }}</h3><p>{{ description }}</p><slot /></section>'
  },
  CampaignActionQueue: { template: '<div data-testid="action-queue">行动队列</div>' },
  CampaignArchiveExport: { template: '<div data-testid="archive-export">档案导出</div>' },
  CampaignCockpitSummary: { template: '<div data-testid="cockpit-summary">驾驶舱摘要</div>' },
  CampaignOperatingProfileForm: { template: '<div data-testid="profile-form">经营配置</div>' },
  CampaignPulseSection: { template: '<div data-testid="pulse-section">周期脉搏</div>' },
  CampaignScenarioPreview: { template: '<div data-testid="scenario-preview">机会组合</div>' },
  ExternalPlanPreviewEntry: true,
  'el-alert': true,
  'el-button': { template: '<button><slot /></button>' },
  'el-skeleton': true,
  'el-tab-pane': {
    props: ['label', 'name'],
    template: '<section :data-tab="name"><span>{{ label }}</span><slot /></section>'
  },
  'el-tabs': { template: '<div><slot /></div>' },
  'el-tag': { template: '<span><slot /></span>' }
}

describe('CampaignCockpitView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appConfig.enableV8CampaignPulse = true
    appConfig.enableV8CampaignPlan = false
    appConfig.enableV8CampaignPortfolio = true
    appConfig.enableV8CampaignExport = true
    api.getCockpit.mockResolvedValue({
      campaign: { id: 3, name: '秋招作战', status: 'ACTIVE' },
      applications: [],
      actionQueue: [],
      coverage: { included: ['APPLICATION'] },
      warnings: []
    })
    api.getProfile.mockResolvedValue({
      campaignId: 3,
      configured: false,
      weeklyApplicationTarget: 5,
      weeklyTimeBudgetMinutes: 300,
      maxActiveOpportunities: 8,
      staleAfterDays: 7,
      defaultFollowUpDays: 5,
      focusRoles: [],
      focusLocations: [],
      focusChannels: [],
      timezone: 'Asia/Shanghai'
    })
  })

  it('loads the cockpit and renders enabled workspace sections', async () => {
    const wrapper = mount(CampaignCockpitView, {
      global: {
        stubs,
        directives: { loading: () => undefined }
      }
    })
    await flushPromises()

    expect(api.getCockpit).toHaveBeenCalledWith(3)
    expect(api.getProfile).toHaveBeenCalledWith(3)
    expect(wrapper.text()).toContain('秋招作战')
    expect(wrapper.find('[data-testid="cockpit-summary"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="profile-form"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('行动队列')
    expect(wrapper.text()).toContain('周期脉搏')
    expect(wrapper.text()).toContain('机会组合')
    expect(wrapper.text()).toContain('档案导出')
  })

  it('keeps the route-level failure separate from optional blocks', async () => {
    api.getCockpit.mockRejectedValueOnce(new Error('cockpit unavailable'))

    const wrapper = mount(CampaignCockpitView, {
      global: {
        stubs,
        directives: { loading: () => undefined }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('周期驾驶舱加载失败')
    expect(wrapper.find('[data-testid="profile-form"]').exists()).toBe(false)
  })
})
