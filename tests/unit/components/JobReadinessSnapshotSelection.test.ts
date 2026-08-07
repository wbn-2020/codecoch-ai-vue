import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import JobTargetAnalysisView from '@/views/v3/JobTargetAnalysisView.vue'
import JobRequirementEvidenceMatrix from '@/views/v3/components/JobRequirementEvidenceMatrix.vue'

const mocks = vi.hoisted(() => ({
  route: {
    params: { id: '15' },
    query: {}
  },
  routerPush: vi.fn(),
  messageError: vi.fn(),
  getJobDescriptionAnalysis: vi.fn(),
  getJobTargetDetail: vi.fn(),
  parseJobDescription: vi.fn(),
  submitJobDescriptionParseTask: vi.fn(),
  streamJobDescriptionParse: vi.fn(),
  getJobRequirementMatrix: vi.fn(),
  getJobReadinessHistory: vi.fn(),
  getJobReadinessSnapshot: vi.fn(),
  getLatestJobReadiness: vi.fn(),
  materializeJobRequirements: vi.fn(),
  recalculateJobReadiness: vi.fn(),
  refreshJobRequirementMatrix: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({
    push: mocks.routerPush
  })
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: mocks.messageError,
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('@/api/jobTarget', () => ({
  getJobDescriptionAnalysisApi: mocks.getJobDescriptionAnalysis,
  getJobTargetDetailApi: mocks.getJobTargetDetail,
  parseJobDescriptionApi: mocks.parseJobDescription,
  submitJobDescriptionParseTaskApi: mocks.submitJobDescriptionParseTask,
  streamJobDescriptionParseApi: mocks.streamJobDescriptionParse
}))

vi.mock('@/api/jobRequirement', () => ({
  getJobRequirementMatrixApi: mocks.getJobRequirementMatrix,
  getJobReadinessHistoryApi: mocks.getJobReadinessHistory,
  getJobReadinessSnapshotApi: mocks.getJobReadinessSnapshot,
  getLatestJobReadinessApi: mocks.getLatestJobReadiness,
  materializeJobRequirementsApi: mocks.materializeJobRequirements,
  recalculateJobReadinessApi: mocks.recalculateJobReadiness,
  refreshJobRequirementMatrixApi: mocks.refreshJobRequirementMatrix
}))

const matrix = {
  targetJobId: 15,
  summary: {
    total: 0,
    covered: 0,
    weak: 0,
    missing: 0,
    unverified: 0
  },
  groups: [],
  warnings: []
}

const snapshot = (id: number, readinessScore: number) => ({
  id,
  targetJobId: 15,
  snapshotHash: `snapshot-${id}`,
  readinessScore,
  confidenceLevel: 'MEDIUM',
  dimensions: [],
  warnings: [],
  generatedAt: `2026-07-${id === 42 ? '01' : '02'}T10:00:00Z`
})

describe('readiness snapshot selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getJobTargetDetail.mockResolvedValue({
      id: 15,
      jobTitle: 'Backend Engineer',
      jdText: 'Build services',
      parseStatus: 'PARSED'
    })
    mocks.getJobDescriptionAnalysis.mockResolvedValue({
      id: 9,
      targetJobId: 15,
      parseStatus: 'PARSED'
    })
    mocks.getJobRequirementMatrix.mockResolvedValue(matrix)
    mocks.getLatestJobReadiness.mockResolvedValue(snapshot(43, 82))
    mocks.getJobReadinessHistory.mockResolvedValue([
      snapshot(43, 82),
      snapshot(42, 74)
    ])
    mocks.getJobReadinessSnapshot.mockResolvedValue(snapshot(42, 74))
  })

  it('emits a snapshot ID from an interactive trend point', async () => {
    const wrapper = mount(JobRequirementEvidenceMatrix, {
      props: {
        targetJobId: 15,
        matrix,
        readiness: snapshot(43, 82),
        readinessHistory: [snapshot(43, 82), snapshot(42, 74)],
        selectedSnapshotId: 43
      },
      global: {
        stubs: {
          AppState: true,
          'el-alert': true,
          'el-button': true
        }
      }
    })

    const points = wrapper.findAll('button.trend-point')
    expect(points).toHaveLength(2)
    expect(points[1].attributes('aria-pressed')).toBe('true')

    await points[0].trigger('click')

    expect(wrapper.emitted('selectSnapshot')).toEqual([[42]])
  })

  it('loads the selected snapshot detail in the existing job analysis page', async () => {
    const MatrixStub = defineComponent({
      name: 'JobRequirementEvidenceMatrix',
      props: {
        readiness: Object,
        selectedSnapshotId: Number,
        snapshotLoadingId: Number
      },
      emits: ['selectSnapshot'],
      template: '<button data-test="select-snapshot" @click="$emit(\'selectSnapshot\', 42)">select</button>'
    })

    const wrapper = shallowMount(JobTargetAnalysisView, {
      global: {
        stubs: {
          AppState: true,
          JobRequirementEvidenceMatrix: MatrixStub,
          JobTargetAnalysisPanel: true,
          JobTargetStatusTag: true
        }
      }
    })
    await flushPromises()
    ;(wrapper.vm as typeof wrapper.vm & { activeSection: string }).activeSection = 'evidence'
    await flushPromises()

    let matrixWrapper = wrapper.findComponent(MatrixStub)
    expect(matrixWrapper.props('readiness')).toMatchObject({ id: 43 })

    await matrixWrapper.find('[data-test="select-snapshot"]').trigger('click')
    await flushPromises()

    expect(mocks.getJobReadinessSnapshot).toHaveBeenCalledWith(15, 42)
    matrixWrapper = wrapper.findComponent(MatrixStub)
    expect(matrixWrapper.props('readiness')).toMatchObject({
      id: 42,
      snapshotHash: 'snapshot-42'
    })
    expect(matrixWrapper.props('selectedSnapshotId')).toBe(42)
  })
})
