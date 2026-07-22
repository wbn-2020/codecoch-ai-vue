import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  activate: vi.fn(),
  attach: vi.fn(),
  archive: vi.fn(),
  complete: vi.fn(),
  confirmMemory: vi.fn(),
  create: vi.fn(),
  detach: vi.fn(),
  generateReview: vi.fn(),
  getApplications: vi.fn(),
  getReview: vi.fn(),
  getCampaigns: vi.fn()
}))

const keyFactory = vi.hoisted(() => ({ create: vi.fn() }))
const router = vi.hoisted(() => ({ push: vi.fn() }))
const ui = vi.hoisted(() => ({
  confirm: vi.fn(),
  warning: vi.fn(),
  success: vi.fn(),
  error: vi.fn()
}))

vi.mock('@/api/v7Career', () => ({
  activateCareerCampaignV7Api: api.activate,
  attachApplicationToCampaignV7Api: api.attach,
  archiveCareerCampaignV7Api: api.archive,
  completeCareerCampaignV7Api: api.complete,
  confirmCareerMemoryCandidateV7Api: api.confirmMemory,
  createCareerCampaignV7Api: api.create,
  detachApplicationFromCampaignV7Api: api.detach,
  generateCareerCampaignReviewV7Api: api.generateReview,
  getCareerCampaignApplicationsV7Api: api.getApplications,
  getCareerCampaignReviewV7Api: api.getReview,
  getCareerCampaignsV7Api: api.getCampaigns
}))

vi.mock('@/utils/idempotency', () => ({
  createOperationIdempotencyKey: keyFactory.create
}))

vi.mock('vue-router', () => ({
  useRouter: () => router
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    warning: ui.warning,
    success: ui.success,
    error: ui.error
  },
  ElMessageBox: {
    confirm: ui.confirm
  }
}))

import { appConfig } from '@/config'
import CareerCampaignPanel from '@/views/application/components/CareerCampaignPanel.vue'

const stubs = {
  AppState: true,
  'el-alert': true,
  'el-button': { template: '<button><slot /></button>' },
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
  'el-input': true,
  'el-option': true,
  'el-select': true,
  'el-skeleton': true,
  'el-tag': { template: '<span><slot /></span>' }
}

describe('CareerCampaignPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appConfig.enableV7CampaignWorkspace = true
    appConfig.enableV7CampaignReview = false
    appConfig.enableV8CampaignCockpit = false
    ui.confirm.mockResolvedValue(undefined)
  })

  it('uses a fresh idempotency key after detach and reattach', async () => {
    const campaign = {
      id: 1,
      name: '秋招周期',
      status: 'ACTIVE',
      lockVersion: 3,
      allowedTransitions: ['COMPLETED']
    }
    let application = {
      id: 7,
      companyName: '示例科技',
      jobTitle: '后端工程师',
      campaignId: undefined as number | undefined
    }
    api.getCampaigns.mockImplementation(async () => [{ ...campaign }])
    api.getApplications.mockImplementation(async () => [{ ...application }])
    api.attach.mockImplementation(async () => {
      application = { ...application, campaignId: campaign.id }
      return campaign
    })
    api.detach.mockImplementation(async () => {
      application = { ...application, campaignId: undefined }
    })
    keyFactory.create
      .mockImplementationOnce((prefix: string) => `${prefix}:attach-1`)
      .mockImplementationOnce((prefix: string) => `${prefix}:detach-1`)
      .mockImplementationOnce((prefix: string) => `${prefix}:attach-2`)

    const wrapper = mount(CareerCampaignPanel, {
      global: {
        stubs,
        directives: { loading: () => undefined }
      }
    })
    await flushPromises()

    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState
    setupState.selectedApplicationId = application.id

    await setupState.attachApplication(campaign)
    await setupState.detachApplication(campaign)
    await setupState.attachApplication(campaign)

    expect(api.attach).toHaveBeenCalledTimes(2)
    expect(api.detach).toHaveBeenCalledTimes(1)
    expect(api.attach.mock.calls[0][2]).toBe('campaign:attach:1:7:attach-1')
    expect(api.detach.mock.calls[0][2]).toBe('campaign:detach:1:7:detach-1')
    expect(api.attach.mock.calls[1][2]).toBe('campaign:attach:1:7:attach-2')
    expect(api.attach.mock.calls[0][2]).not.toBe(api.attach.mock.calls[1][2])
  })

  it('shows the V8 cockpit entry only when enabled and opens the selected campaign', async () => {
    appConfig.enableV8CampaignCockpit = true
    api.getCampaigns.mockResolvedValue([{
      id: 9,
      name: '春招周期',
      status: 'ACTIVE',
      lockVersion: 1,
      applicationCount: 2,
      allowedTransitions: ['COMPLETED']
    }])
    api.getApplications.mockResolvedValue([])

    const wrapper = mount(CareerCampaignPanel, {
      global: {
        stubs,
        directives: { loading: () => undefined }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('驾驶舱')
    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState
    setupState.goCockpit(9)

    expect(router.push).toHaveBeenCalledWith({
      name: 'CampaignCockpit',
      params: { id: 9 }
    })
  })
})
