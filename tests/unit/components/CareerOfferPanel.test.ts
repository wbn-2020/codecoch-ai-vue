import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  createOffer: vi.fn(),
  createVersion: vi.fn(),
  transition: vi.fn(),
  preview: vi.fn(),
  confirm: vi.fn()
}))

const keyFactory = vi.hoisted(() => ({
  create: vi.fn(() => 'random-key'),
  stable: vi.fn(() => 'stable-key')
}))

const ui = vi.hoisted(() => ({
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn()
}))

vi.mock('@/api/v7Career', () => ({
  createOfferV7Api: api.createOffer,
  createOfferVersionV7Api: api.createVersion,
  transitionOfferV7Api: api.transition,
  previewOfferDecisionV7Api: api.preview,
  confirmOfferDecisionV7Api: api.confirm
}))

vi.mock('@/utils/idempotency', () => ({
  createOperationIdempotencyKey: keyFactory.create,
  createStableOperationIdempotencyKey: keyFactory.stable
}))

vi.mock('@/utils/error', () => ({
  getErrorMessage: (_error: unknown, fallback: string) => fallback
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: ui.success,
    error: ui.error
  },
  ElMessageBox: {
    confirm: ui.confirm
  }
}))

import CareerOfferPanel from '@/components/v7/career-offer/CareerOfferPanel.vue'
import type { CareerOfferVO } from '@/types/v7/career'

const stubs = {
  'el-alert': true,
  'el-button': { template: '<button :disabled="disabled"><slot /></button>', props: ['disabled', 'loading', 'type', 'link'] },
  'el-dialog': {
    template: '<div v-if="modelValue" class="stub-dialog"><slot /><slot name="footer" /></div>',
    props: ['modelValue', 'title', 'width']
  },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>', props: ['label'] },
  'el-input': { template: '<input />', props: ['modelValue'] },
  'el-input-number': { template: '<input type="number" />', props: ['modelValue'] },
  'el-select': { template: '<select><slot /></select>', props: ['modelValue'] },
  'el-option': { template: '<option><slot /></option>', props: ['label', 'value'] },
  'el-date-picker': { template: '<input type="date" />', props: ['modelValue'] }
}

const sampleOffers: CareerOfferVO[] = [
  {
    id: 5,
    title: 'Acme 后端 Offer',
    status: 'RECEIVED',
    currentVersion: { id: 51, versionNo: 1, currency: 'CNY', baseSalary: 500000 }
  }
]

const mountPanel = (props: Record<string, unknown> = {}) =>
  mount(CareerOfferPanel, {
    props: {
      applicationId: 7,
      campaignId: 9,
      offers: sampleOffers,
      ...props
    },
    global: { stubs }
  })

const clickButtonByText = async (wrapper: ReturnType<typeof mount>, label: string) => {
  const trigger = wrapper.findAll('button').find((button) => button.text().includes(label))
  if (!trigger) throw new Error(`Button not found: ${label}`)
  await trigger.trigger('click')
  await flushPromises()
  return trigger
}

describe('CareerOfferPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.createOffer.mockResolvedValue({ id: 6, status: 'RECEIVED' })
    api.createVersion.mockResolvedValue({ id: 5, status: 'RECEIVED' })
    api.transition.mockResolvedValue({ id: 5, status: 'ACCEPTED' })
    api.preview.mockResolvedValue({ id: 42, status: 'PREVIEWED', lockVersion: 1, items: [] })
    api.confirm.mockResolvedValue({ id: 42, status: 'ACCEPTED' })
    ui.confirm.mockResolvedValue('confirm')
  })

  it('creates an offer and emits refresh, sending the idempotency key by header', async () => {
    const wrapper = mountPanel()
    await clickButtonByText(wrapper, '录入 Offer')
    await clickButtonByText(wrapper, '保存 Offer')

    expect(api.createOffer).toHaveBeenCalledTimes(1)
    const [applicationId, body, key] = api.createOffer.mock.calls[0]
    expect(applicationId).toBe(7)
    expect(body).toMatchObject({ applicationId: 7 })
    expect(key).toBe('random-key')
    expect(ui.success).toHaveBeenCalled()
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('adds a version for an existing offer and emits refresh', async () => {
    const wrapper = mountPanel()
    await clickButtonByText(wrapper, '新增版本')
    await clickButtonByText(wrapper, '保存版本')

    expect(api.createVersion).toHaveBeenCalledTimes(1)
    expect(api.createVersion.mock.calls[0][0]).toBe(5)
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('requires explicit confirmation for a final-status transition', async () => {
    const wrapper = mountPanel()
    await clickButtonByText(wrapper, '状态变更')
    // Default target for RECEIVED is NEGOTIATING (non-final); switch to a final state.
    ;(wrapper.vm as unknown as { transitionForm: { targetStatus: string } }).transitionForm.targetStatus = 'ACCEPTED'
    await flushPromises()
    await clickButtonByText(wrapper, '确认变更')

    expect(ui.confirm).toHaveBeenCalled()
    expect(api.transition).toHaveBeenCalledTimes(1)
    const [offerId, body, key] = api.transition.mock.calls[0]
    expect(offerId).toBe(5)
    expect(body).toMatchObject({ targetStatus: 'ACCEPTED', userConfirmed: true })
    expect(key).toBe('random-key')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('runs decision preview then confirm with a stable idempotency key', async () => {
    const wrapper = mountPanel()
    await clickButtonByText(wrapper, 'Offer 决策比较')
    await clickButtonByText(wrapper, '生成比较')

    expect(api.preview).toHaveBeenCalledTimes(1)
    expect(api.preview.mock.calls[0][0]).toBe(9)

    ;(wrapper.vm as unknown as { decisionForm: { selectedOfferId: number | null } }).decisionForm.selectedOfferId = 5
    await flushPromises()
    await clickButtonByText(wrapper, '确认所选 Offer')

    expect(ui.confirm).toHaveBeenCalled()
    expect(api.confirm).toHaveBeenCalledTimes(1)
    const [campaignId, decisionId, body, key] = api.confirm.mock.calls[0]
    expect(campaignId).toBe(9)
    expect(decisionId).toBe(42)
    expect(body).toMatchObject({ selectedOfferId: 5, userConfirmed: true })
    expect(key).toBe('stable-key')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })
})
