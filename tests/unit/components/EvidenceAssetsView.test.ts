import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getOverview: vi.fn(),
  getUsages: vi.fn(),
  getUsageDetail: vi.fn(),
  getResults: vi.fn(),
  getCandidates: vi.fn(),
  getCandidateDetail: vi.fn(),
  decideCandidate: vi.fn(),
  confirmResult: vi.fn(),
  correctResult: vi.fn(),
  createResult: vi.fn()
}))

const router = vi.hoisted(() => ({
  push: vi.fn()
}))

const route = vi.hoisted(() => ({
  query: { tab: 'candidates', campaignId: '3' } as Record<string, string>
}))

const ui = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  confirm: vi.fn()
}))

vi.mock('@/api/evidenceAsset', () => ({
  getEvidenceAssetsOverviewApi: api.getOverview,
  getEvidenceAssetUsagesApi: api.getUsages,
  getEvidenceUsageDetailApi: api.getUsageDetail,
  getEvidenceAssetResultsApi: api.getResults,
  confirmEvidenceUsageResultApi: api.confirmResult,
  correctEvidenceUsageResultApi: api.correctResult,
  createEvidenceUsageResultApi: api.createResult
}))

vi.mock('@/api/evidenceLearning', () => ({
  getEvidenceLearningCandidatesApi: api.getCandidates,
  getEvidenceLearningCandidateApi: api.getCandidateDetail,
  decideEvidenceLearningCandidateApi: api.decideCandidate
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: ui.success,
    warning: ui.warning,
    error: ui.error
  },
  ElMessageBox: {
    confirm: ui.confirm
  }
}))

import EvidenceAssetsView from '@/views/evidence-assets/EvidenceAssetsView.vue'

const candidate = {
  id: 19,
  candidateId: 19,
  title: '继续观察项目证据复用',
  content: '在相同岗位方向继续收集可比较样本。',
  status: 'PENDING_CONFIRMATION',
  confidenceLevel: 'LOW',
  fallback: true,
  stale: undefined,
  confirmed: false,
  requiresUserConfirmation: true,
  evidenceCount: undefined,
  sampleCount: undefined,
  limits: ['当前样本不能比较版本优劣。'],
  unknowns: ['招聘方是否看到项目证据未知。'],
  sources: [{ sourceType: 'EVIDENCE_USAGE', sourceId: 7 }],
  availableDecisions: ['KEEP', 'EDIT', 'CONTINUE', 'REJECT']
}

const stubs = {
  AppState: {
    props: ['title', 'description'],
    template: '<div class="app-state-stub"><strong>{{ title }}</strong><span>{{ description }}</span><slot /></div>'
  },
  'el-alert': {
    props: ['title'],
    template: '<div class="el-alert-stub"><strong>{{ title }}</strong><slot /></div>'
  },
  'el-button': {
    props: ['loading'],
    template: '<button class="el-button-stub" @click="$emit(\'click\', $event)"><slot /></button>'
  },
  'el-dialog': {
    props: ['modelValue', 'title'],
    emits: ['update:modelValue'],
    template: '<div v-if="modelValue" class="el-dialog-stub"><strong>{{ title }}</strong><slot /><slot name="footer" /></div>'
  },
  'el-input': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  'el-option': true,
  'el-select': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<select :value="modelValue"><slot /></select>'
  },
  'el-tag': {
    template: '<span class="el-tag-stub"><slot /></span>'
  }
}

const mountView = async () => {
  const wrapper = mount(EvidenceAssetsView, {
    global: {
      stubs,
      directives: {
        loading: () => undefined
      }
    }
  })
  await flushPromises()
  return wrapper
}

describe('EvidenceAssetsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = { tab: 'candidates', campaignId: '3' }
    api.getOverview.mockResolvedValue({
      items: [{ label: '项目证据', assetType: undefined }],
      total: undefined,
      confidenceLevel: 'LOW',
      fallback: true,
      warnings: ['当前只有少量可比较样本。'],
      unknowns: ['招聘方最终决策原因未知。'],
      limits: ['当前样本不能比较版本优劣。'],
      coverage: { missing: ['结果事件来源'] },
      sources: [],
      overview: {
        readiness: [{ label: '项目证据', assetType: undefined }]
      }
    })
    api.getUsages.mockResolvedValue({
      items: [{
        id: 11,
        assetType: 'PROJECT_EVIDENCE',
        assetId: 7,
        stale: undefined,
        resultCount: undefined,
        sources: []
      }],
      confidenceLevel: 'LOW',
      fallback: false,
      warnings: [],
      unknowns: [],
      limits: [],
      sources: []
    })
    api.getResults.mockResolvedValue({
      items: [],
      confidenceLevel: 'LOW',
      fallback: false,
      warnings: [],
      unknowns: [],
      limits: [],
      sources: []
    })
    api.getCandidates.mockResolvedValue({
      items: [candidate],
      total: 1,
      confidenceLevel: 'LOW',
      fallback: true,
      warnings: [],
      unknowns: candidate.unknowns,
      limits: candidate.limits,
      sources: candidate.sources
    })
    api.decideCandidate.mockImplementation(async (_id: number, data: Record<string, unknown>) => ({
      ...candidate,
      decisionCode: data.decisionCode,
      editPath: data.decisionCode === 'EDIT' ? '/project-evidence/7/edit' : undefined
    }))
    api.confirmResult.mockResolvedValue({})
    api.correctResult.mockResolvedValue({})
    api.createResult.mockResolvedValue({})
  })

  it('shows Chinese trust boundaries without inventing zero values or fresh source state', async () => {
    const wrapper = await mountView()
    const text = wrapper.text()

    expect(text).not.toContain('READINESS')
    expect(text).not.toContain('USAGES')
    expect(text).not.toContain('RESULTS')
    expect(text).not.toContain('CANDIDATES')
    expect(text).toContain('低置信度')
    expect(text).toContain('规则降级')
    expect(text).toContain('用户未确认')
    expect(text).toContain('有未知项')
    expect(text).toContain('有样本限制')
    expect(text).toContain('来源状态待确认')
    expect(text).toContain('暂无数据')
    expect(text).toContain('覆盖范围')
    expect(text).toContain('结果事件来源')
  })

  it('supports cancel plus all four candidate decisions and follows EDIT deep links safely', async () => {
    const wrapper = await mountView()
    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState

    setupState.openCandidateDecision(candidate, 'KEEP')
    setupState.closeCandidateDialog()
    expect(api.decideCandidate).not.toHaveBeenCalled()

    for (const decision of ['KEEP', 'EDIT', 'CONTINUE', 'REJECT'] as const) {
      setupState.openCandidateDecision(candidate, decision)
      if (decision === 'EDIT') setupState.candidateNote = '补充可验证的量化结果。'
      await setupState.submitCandidateDecision()
    }

    expect(api.decideCandidate).toHaveBeenCalledTimes(4)
    expect(api.decideCandidate.mock.calls.map((call: unknown[]) => call[1].decisionCode)).toEqual([
      'KEEP',
      'EDIT',
      'CONTINUE',
      'REJECT'
    ])
    expect(router.push).toHaveBeenCalledWith('/project-evidence/7/edit')
    expect(setupState.candidateDialogVisible).toBe(false)
  })

  it('uses the root lockVersion for result confirm and correct actions', async () => {
    const result = {
      id: 21,
      usageId: 11,
      eventType: 'APPLICATION_EVENT',
      eventId: 5,
      outcomeCode: 'REPLIED',
      status: 'RECORDED',
      snapshotVersion: 99,
      lockVersion: 7,
      knownFacts: ['收到回复'],
      unknowns: [],
      limits: []
    }
    api.getResults.mockResolvedValue({
      items: [result],
      confidenceLevel: 'LOW',
      fallback: false,
      warnings: [],
      unknowns: [],
      limits: [],
      sources: []
    })
    ui.confirm.mockResolvedValue(undefined)

    const wrapper = await mountView()
    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState

    await setupState.confirmResult(result)
    expect(api.confirmResult).toHaveBeenCalledWith(
      21,
      expect.objectContaining({ expectedLockVersion: 7 })
    )

    setupState.openCorrectionDialog(result)
    await setupState.submitResult()
    expect(api.correctResult).toHaveBeenCalledWith(
      21,
      expect.objectContaining({ expectedLockVersion: 7 })
    )
    expect(api.correctResult.mock.calls[0][1]).not.toHaveProperty('snapshotVersion')
  })

  it('sends explicit correction fields and keeps idempotency keys stable per payload', async () => {
    const result = {
      id: 21,
      usageId: 11,
      eventType: 'APPLICATION_EVENT',
      eventId: 5,
      outcomeCode: 'REPLIED',
      status: 'RECORDED',
      lockVersion: 7,
      knownFacts: ['旧事实'],
      externalFeedbackText: '旧反馈',
      userInterpretationText: '旧解释',
      unknowns: ['旧未知项'],
      limits: ['旧限制']
    }
    api.getResults.mockResolvedValue({
      items: [result],
      confidenceLevel: 'LOW',
      fallback: false,
      warnings: [],
      unknowns: [],
      limits: [],
      sources: []
    })

    const wrapper = await mountView()
    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState

    const submitCorrection = async (outcomeCode: string) => {
      setupState.openCorrectionDialog(result)
      setupState.resultForm.outcomeCode = outcomeCode
      setupState.resultForm.knownFacts = ''
      setupState.resultForm.externalFeedbackText = ''
      setupState.resultForm.userInterpretationText = ''
      setupState.resultForm.unknowns = ''
      setupState.resultForm.limits = ''
      await setupState.submitResult()
      await flushPromises()
    }

    await submitCorrection('REPLIED')
    await submitCorrection('REPLIED')
    await submitCorrection('UNKNOWN')

    const firstPayload = api.correctResult.mock.calls[0][1]
    const replayPayload = api.correctResult.mock.calls[1][1]
    const changedPayload = api.correctResult.mock.calls[2][1]
    expect(firstPayload).toEqual(expect.objectContaining({
      expectedLockVersion: 7,
      outcomeCode: 'REPLIED',
      knownFacts: [],
      externalFeedbackText: '',
      userInterpretationText: '',
      unknowns: [],
      limits: []
    }))
    expect(firstPayload.idempotencyKey).toBe(replayPayload.idempotencyKey)
    expect(changedPayload.outcomeCode).toBe('UNKNOWN')
    expect(changedPayload.idempotencyKey).not.toBe(firstPayload.idempotencyKey)
    expect(setupState.resultDialogVisible).toBe(false)
  })

  it('opens result recording automatically for mode=record-result', async () => {
    route.query = {
      mode: 'record-result',
      applicationId: '5'
    }
    api.getUsages.mockResolvedValue({
      items: [{
        id: 11,
        applicationId: 5,
        assetType: 'PROJECT_EVIDENCE',
        assetId: 7
      }],
      confidenceLevel: 'UNKNOWN',
      fallback: false,
      warnings: [],
      unknowns: [],
      limits: [],
      sources: []
    })

    const wrapper = await mountView()
    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState

    expect(setupState.activeSection).toBe('usages')
    expect(setupState.resultDialogVisible).toBe(true)
    expect(setupState.resultTarget).toMatchObject({ id: 11, applicationId: 5 })
    expect(wrapper.text()).toContain('记录结果反馈')
  })

  it('reopens record-result mode when its application scope changes or mode is re-entered', async () => {
    route.query = {
      mode: 'record-result',
      applicationId: '5'
    }
    api.getUsages
      .mockResolvedValueOnce({
        items: [{ id: 11, applicationId: 5, assetType: 'PROJECT_EVIDENCE', assetId: 7 }],
        warnings: [],
        unknowns: [],
        limits: [],
        sources: []
      })
      .mockResolvedValueOnce({
        items: [{ id: 12, applicationId: 6, assetType: 'PROJECT_EVIDENCE', assetId: 8 }],
        warnings: [],
        unknowns: [],
        limits: [],
        sources: []
      })

    const wrapper = await mountView()
    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState

    setupState.closeResultDialog()
    route.query = { mode: 'record-result', applicationId: '6' }
    await setupState.load()
    expect(setupState.resultTarget).toMatchObject({ id: 12, applicationId: 6 })

    setupState.closeResultDialog()
    route.query = { applicationId: '6' }
    await setupState.handleRouteMode()
    route.query = { mode: 'record-result', applicationId: '6' }
    await setupState.handleRouteMode()
    expect(setupState.resultDialogVisible).toBe(true)
    expect(setupState.resultTarget).toMatchObject({ id: 12, applicationId: 6 })
  })

  it('does not render missing confidence or stale state as LOW or verified', async () => {
    route.query = { tab: 'results' }
    api.getOverview.mockResolvedValue({
      items: [],
      warnings: [],
      unknowns: [],
      limits: [],
      sources: [],
      overview: { readiness: [] }
    })
    api.getUsages.mockResolvedValue({
      items: [{
        id: 11,
        assetType: 'PROJECT_EVIDENCE',
        assetId: 7,
        stale: undefined
      }],
      warnings: [],
      unknowns: [],
      limits: [],
      sources: []
    })
    api.getResults.mockResolvedValue({
      items: [{
        id: 21,
        usageId: 11,
        outcomeCode: 'UNKNOWN',
        status: 'RECORDED',
        confidenceLevel: undefined,
        stale: undefined
      }],
      warnings: [],
      unknowns: [],
      limits: [],
      sources: []
    })
    api.getCandidates.mockResolvedValue({
      items: [],
      warnings: [],
      unknowns: [],
      limits: [],
      sources: []
    })

    const wrapper = await mountView()
    const text = wrapper.text()

    expect(text).toContain('置信度待确认')
    expect(text).toContain('来源状态待确认')
    expect(text).not.toContain('低置信度')
    expect(text).not.toContain('来源已核验')
  })

  it('stops loading dependent APIs when overview returns 403', async () => {
    api.getOverview.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { message: 'feature disabled' }
      }
    })

    const wrapper = await mountView()

    expect(api.getOverview).toHaveBeenCalledTimes(1)
    expect(api.getUsages).not.toHaveBeenCalled()
    expect(api.getResults).not.toHaveBeenCalled()
    expect(api.getCandidates).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('证据资产功能当前未开放')
  })

  it.each([403, 41003])(
    'treats business forbidden code %s as unavailable, clears old data and closes dialogs',
    async (businessCode) => {
    const wrapper = await mountView()
    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState

    setupState.openResultDialog(setupState.usageItems[0])
    setupState.openCandidateDecision(candidate, 'KEEP')
    expect(setupState.resultDialogVisible).toBe(true)
    expect(setupState.candidateDialogVisible).toBe(true)

    api.getOverview.mockRejectedValueOnce({
      code: businessCode,
      message: 'feature disabled'
    })
    await setupState.load()
    await flushPromises()

    expect(api.getUsages).toHaveBeenCalledTimes(1)
    expect(api.getResults).toHaveBeenCalledTimes(1)
    expect(api.getCandidates).toHaveBeenCalledTimes(1)
    expect(setupState.accessUnavailable).toBe(true)
    expect(setupState.overview).toBeUndefined()
    expect(setupState.usagesEnvelope).toBeUndefined()
    expect(setupState.resultsEnvelope).toBeUndefined()
    expect(setupState.candidatesEnvelope).toBeUndefined()
    expect(setupState.resultDialogVisible).toBe(false)
    expect(setupState.candidateDialogVisible).toBe(false)
    expect(wrapper.find('[data-testid="evidence-readiness"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('证据资产功能当前未开放')
    }
  )

  it('uses endpoint-specific query contracts and includes candidate usageId only where supported', async () => {
    route.query = {
      campaignId: '3',
      applicationId: '5',
      targetJobId: '7',
      experimentId: '9',
      hypothesisId: '10',
      assetType: 'PROJECT_EVIDENCE',
      assetId: '11',
      packageSnapshotId: '12',
      resultId: '13',
      status: 'RECORDED',
      outcomeCode: 'UNKNOWN'
    }

    const wrapper = await mountView()
    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState

    expect(api.getOverview).toHaveBeenCalledWith({
      campaignId: 3,
      applicationId: 5
    })
    expect(api.getUsages).toHaveBeenCalledWith({
      campaignId: 3,
      applicationId: 5,
      targetJobId: 7,
      experimentId: 9,
      hypothesisId: 10,
      assetType: 'PROJECT_EVIDENCE',
      assetId: 11,
      packageSnapshotId: 12,
      usageId: undefined,
      status: 'RECORDED'
    })
    expect(api.getResults).toHaveBeenCalledWith({
      campaignId: 3,
      applicationId: 5,
      targetJobId: 7,
      experimentId: 9,
      hypothesisId: 10,
      usageId: undefined,
      resultId: 13,
      assetType: 'PROJECT_EVIDENCE',
      assetId: 11,
      packageSnapshotId: 12,
      status: 'RECORDED',
      outcomeCode: 'UNKNOWN'
    })
    expect(api.getCandidates).toHaveBeenCalledWith({
      campaignId: 3,
      applicationId: 5,
      usageId: undefined,
      status: 'RECORDED'
    })

    route.query = { campaignId: '3', applicationId: '5', usageId: '17' }
    expect(setupState.candidatesQuery()).toEqual({
      campaignId: 3,
      applicationId: 5,
      usageId: 17,
      status: undefined
    })
  })

  it('keeps candidate actions and result commands fail-closed for unknown capabilities or statuses', async () => {
    api.getCandidates.mockResolvedValueOnce({
      items: [{
        ...candidate,
        confirmed: undefined,
        availableDecisions: []
      }],
      warnings: [],
      unknowns: [],
      limits: [],
      sources: []
    })

    const wrapper = await mountView()
    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState
    const unknownResult = { id: 31, status: 'FUTURE_STATUS' }

    expect(wrapper.text()).toContain('操作能力待确认')
    expect(wrapper.text()).not.toContain('用户未确认')
    expect(wrapper.find('[data-testid="candidate-19-keep"]').exists()).toBe(false)
    expect(setupState.canConfirmResult(unknownResult)).toBe(false)
    expect(setupState.canCorrectResult(unknownResult)).toBe(false)
    expect(setupState.canConfirmResult({ id: 32, status: 'RECORDED' })).toBe(true)
    expect(setupState.canConfirmResult({ id: 33, status: 'CORRECTED' })).toBe(true)
    expect(setupState.canCorrectResult({ id: 34, status: 'RECORDED' })).toBe(true)
    expect(setupState.canCorrectResult({ id: 35, status: 'CONFIRMED' })).toBe(true)
    expect(setupState.canCorrectResult({ id: 36, status: 'CORRECTED' })).toBe(true)
    expect(setupState.candidateCanDecide({
      id: 37,
      status: 'WEAK_OBSERVATION',
      requiresUserConfirmation: true,
      confirmed: false,
      availableDecisions: ['CONTINUE']
    })).toBe(true)
    setupState.openCorrectionDialog(unknownResult)
    await setupState.submitResult()
    expect(api.correctResult).not.toHaveBeenCalled()
  })

  it('does not submit missing event ids or missing result lock versions as zero', async () => {
    const usage = { id: 11, assetType: 'PROJECT_EVIDENCE', assetId: 7 }
    api.getUsages.mockResolvedValue({
      items: [usage],
      confidenceLevel: 'LOW',
      fallback: false,
      warnings: [],
      unknowns: [],
      limits: [],
      sources: []
    })

    const wrapper = await mountView()
    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState

    setupState.openResultDialog(usage)
    await setupState.submitResult()
    expect(api.createResult).not.toHaveBeenCalled()
    expect(ui.warning).toHaveBeenCalledWith('请输入有效的来源事件 ID。')

    const missingLockVersion = {
      id: 22,
      status: 'RECORDED',
      snapshotVersion: 100,
      lockVersion: undefined
    }
    setupState.openCorrectionDialog(missingLockVersion)
    await setupState.submitResult()
    expect(api.correctResult).not.toHaveBeenCalled()
    expect(ui.warning).toHaveBeenCalledWith('结果锁版本待返回，暂不能提交更正。')
  })
})
