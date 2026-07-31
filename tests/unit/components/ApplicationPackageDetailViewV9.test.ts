import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

enableAutoUnmount(afterEach)

const api = vi.hoisted(() => ({
  createPackage: vi.fn(),
  executeAction: vi.fn(),
  getPackage: vi.fn(),
  previewPackage: vi.fn(),
  refreshPackage: vi.fn(),
  createEvidenceUsage: vi.fn()
}))

const routerState = vi.hoisted(() => ({
  route: null as any,
  push: vi.fn(),
  replace: vi.fn()
}))

const ui = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
}))

vi.mock('@/api/applicationPackage', () => ({
  createApplicationPackageApi: api.createPackage,
  executeApplicationPackageActionApi: api.executeAction,
  getApplicationPackageApi: api.getPackage,
  previewApplicationPackageApi: api.previewPackage,
  refreshApplicationPackageApi: api.refreshPackage
}))

vi.mock('@/api/evidenceAsset', () => ({
  createEvidenceUsageApi: api.createEvidenceUsage
}))

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  routerState.route = reactive({
    params: { id: 'package-9' },
    query: {}
  })
  return {
    useRoute: () => routerState.route,
    useRouter: () => ({
      push: routerState.push,
      replace: routerState.replace
    })
  }
})

vi.mock('element-plus', () => ({
  ElMessage: {
    success: ui.success,
    error: ui.error,
    warning: ui.warning,
    info: ui.info
  }
}))

import { appConfig } from '@/config'
import ApplicationPackageDetailView from '@/views/application-package/ApplicationPackageDetailView.vue'

const stubs = {
  AppState: {
    props: ['title', 'description'],
    template: '<section><strong>{{ title }}</strong><span>{{ description }}</span><slot /></section>'
  },
  ResumeArtifactDeliveryPanel: true,
  'el-alert': {
    props: ['title', 'description'],
    template: '<div><strong>{{ title }}</strong><span>{{ description }}</span><slot /></div>'
  },
  'el-button': {
    props: ['loading'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>'
  },
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

describe('ApplicationPackageDetailView V9 evidence usage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.route.params.id = 'package-9'
    routerState.route.query = {}
    appConfig.enableV9EvidenceLearning = true
    api.getPackage.mockResolvedValue({
      id: 'package-9',
      jobApplicationId: 42,
      currentSnapshotId: 91,
      snapshotVersion: 3,
      projectEvidenceIds: [],
      checklist: [],
      actions: [],
      evidenceCoverage: [],
      riskSignals: [],
      suggestions: []
    })
    api.createEvidenceUsage.mockResolvedValue({
      id: 501,
      applicationId: 42,
      assetType: 'APPLICATION_PACKAGE_SNAPSHOT',
      assetId: 91,
      assetVersion: '3'
    })
  })

  afterEach(() => {
    appConfig.enableV9EvidenceLearning = false
  })

  it('records the current package snapshot and reuses a stable idempotency key for replay', async () => {
    const wrapper = mount(ApplicationPackageDetailView, {
      global: {
        stubs,
        directives: {
          loading: () => undefined
        }
      }
    })
    await flushPromises()

    const recordButton = wrapper.get('[data-testid="record-application-package-usage"]')
    await recordButton.trigger('click')
    await flushPromises()
    await recordButton.trigger('click')
    await flushPromises()

    expect(api.createEvidenceUsage).toHaveBeenCalledTimes(2)
    const firstPayload = api.createEvidenceUsage.mock.calls[0][1]
    const replayPayload = api.createEvidenceUsage.mock.calls[1][1]
    expect(api.createEvidenceUsage).toHaveBeenNthCalledWith(1, 42, expect.objectContaining({
      assetType: 'APPLICATION_PACKAGE_SNAPSHOT',
      assetId: 91,
      assetVersion: '3',
      packageSnapshotId: 91,
      usageScene: 'APPLICATION_SUBMISSION'
    }))
    expect(firstPayload.idempotencyKey).toBe(replayPayload.idempotencyKey)

    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState
    setupState.currentPackage.snapshotVersion = 4
    await setupState.recordCurrentPackageUsage()

    const changedPayload = api.createEvidenceUsage.mock.calls[2][1]
    expect(changedPayload.assetVersion).toBe('4')
    expect(changedPayload.idempotencyKey).not.toBe(firstPayload.idempotencyKey)
  })
})
