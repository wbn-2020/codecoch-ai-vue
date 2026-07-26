import { nextTick, type Component } from 'vue'
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const routerHarness = vi.hoisted(() => ({
  route: null as unknown as {
    params: Record<string, string | undefined>
    query: Record<string, string | undefined>
  },
  push: vi.fn(),
  replace: vi.fn(),
  beforeRouteLeave: undefined as undefined | (() => boolean),
  beforeRouteUpdate: undefined as undefined | (() => boolean)
}))

const ui = vi.hoisted(() => ({
  alert: vi.fn(),
  confirm: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn()
}))

const api = vi.hoisted(() => ({
  addJobExperimentRelationApi: vi.fn(),
  applyResumeOptimizeResultApi: vi.fn(),
  assignCareerApplicationApi: vi.fn(),
  createCareerHypothesisApi: vi.fn(),
  createJobExperimentApi: vi.fn(),
  createProjectEvidenceApi: vi.fn(),
  createResumeApi: vi.fn(),
  createResumeProjectApi: vi.fn(),
  createResumeVersionApi: vi.fn(),
  deleteJobExperimentApi: vi.fn(),
  deleteJobExperimentRelationApi: vi.fn(),
  deleteResumeProjectApi: vi.fn(),
  generateJobExperimentReviewApi: vi.fn(),
  getApplicationsApi: vi.fn(),
  getCareerHypothesisApi: vi.fn(),
  getCareerHypothesisByLegacyExperimentApi: vi.fn(),
  getJobExperimentDetailApi: vi.fn(),
  getJobTargetsApi: vi.fn(),
  getProjectEvidenceDetailApi: vi.fn(),
  getResumeDetailApi: vi.fn(),
  getResumeOptimizeRecordsApi: vi.fn(),
  getResumeOptimizeResultApi: vi.fn(),
  getResumesApi: vi.fn(),
  getResumeVersionsApi: vi.fn(),
  importProjectEvidenceFromResumeProjectApi: vi.fn(),
  optimizeResumeApi: vi.fn(),
  setDefaultResumeApi: vi.fn(),
  updateJobExperimentApi: vi.fn(),
  updateProjectEvidenceApi: vi.fn(),
  updateResumeApi: vi.fn(),
  updateResumeProjectApi: vi.fn()
}))

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  routerHarness.route = reactive({
    params: {},
    query: {}
  })
  return {
    onBeforeRouteLeave: (guard: () => boolean) => {
      routerHarness.beforeRouteLeave = guard
    },
    onBeforeRouteUpdate: (guard: () => boolean) => {
      routerHarness.beforeRouteUpdate = guard
    },
    useRoute: () => routerHarness.route,
    useRouter: () => ({
      push: routerHarness.push,
      replace: routerHarness.replace
    })
  }
})

vi.mock('element-plus', () => ({
  ElMessage: {
    error: ui.error,
    info: ui.info,
    success: ui.success,
    warning: ui.warning
  },
  ElMessageBox: {
    alert: ui.alert,
    confirm: ui.confirm
  }
}))

vi.mock('@/api/projectEvidence', () => ({
  createProjectEvidenceApi: api.createProjectEvidenceApi,
  getProjectEvidenceDetailApi: api.getProjectEvidenceDetailApi,
  importProjectEvidenceFromResumeProjectApi: api.importProjectEvidenceFromResumeProjectApi,
  updateProjectEvidenceApi: api.updateProjectEvidenceApi
}))

vi.mock('@/api/jobExperiment', () => ({
  addJobExperimentRelationApi: api.addJobExperimentRelationApi,
  createJobExperimentApi: api.createJobExperimentApi,
  deleteJobExperimentApi: api.deleteJobExperimentApi,
  deleteJobExperimentRelationApi: api.deleteJobExperimentRelationApi,
  generateJobExperimentReviewApi: api.generateJobExperimentReviewApi,
  getJobExperimentDetailApi: api.getJobExperimentDetailApi,
  updateJobExperimentApi: api.updateJobExperimentApi
}))

vi.mock('@/api/careerGrowth', () => ({
  assignCareerApplicationApi: api.assignCareerApplicationApi,
  createCareerHypothesisApi: api.createCareerHypothesisApi,
  getCareerHypothesisApi: api.getCareerHypothesisApi,
  getCareerHypothesisByLegacyExperimentApi: api.getCareerHypothesisByLegacyExperimentApi
}))

vi.mock('@/api/jobTarget', () => ({
  getJobTargetsApi: api.getJobTargetsApi
}))

vi.mock('@/api/resume', () => ({
  applyResumeOptimizeResultApi: api.applyResumeOptimizeResultApi,
  createResumeApi: api.createResumeApi,
  createResumeProjectApi: api.createResumeProjectApi,
  deleteResumeProjectApi: api.deleteResumeProjectApi,
  getResumeDetailApi: api.getResumeDetailApi,
  getResumeOptimizeRecordsApi: api.getResumeOptimizeRecordsApi,
  getResumeOptimizeResultApi: api.getResumeOptimizeResultApi,
  getResumesApi: api.getResumesApi,
  optimizeResumeApi: api.optimizeResumeApi,
  setDefaultResumeApi: api.setDefaultResumeApi,
  updateResumeApi: api.updateResumeApi,
  updateResumeProjectApi: api.updateResumeProjectApi
}))

vi.mock('@/api/v4', () => ({
  createResumeVersionApi: api.createResumeVersionApi,
  getApplicationsApi: api.getApplicationsApi,
  getResumeVersionsApi: api.getResumeVersionsApi
}))

import JobExperimentCreateView from '@/views/job-experiment/JobExperimentCreateView.vue'
import JobExperimentDetailView from '@/views/job-experiment/JobExperimentDetailView.vue'
import JobExperimentReviewView from '@/views/job-experiment/JobExperimentReviewView.vue'
import ProjectEvidenceDetailView from '@/views/project-evidence/ProjectEvidenceDetailView.vue'
import ProjectEvidenceEditView from '@/views/project-evidence/ProjectEvidenceEditView.vue'
import ResumeEditView from '@/views/resume/ResumeEditView.vue'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const projectDetail = (id: number, title: string) => ({
  id,
  title,
  role: '',
  techStack: '',
  completenessScore: 0,
  completenessStatus: 'INCOMPLETE',
  missingFields: [],
  skillEvidences: []
})

const jobDetail = (id: number, title: string) => ({
  id,
  title,
  status: 'RUNNING',
  relations: [],
  reviews: [],
  metrics: {
    applicationCount: 0,
    feedbackCount: 0,
    interviewInviteCount: 0,
    interviewCompletedCount: 0,
    offerCount: 0,
    rejectedCount: 0,
    resumeVersionCount: 0,
    targetJobCount: 0,
    projectEvidenceCount: 0,
    agentTaskCount: 0,
    sampleCount: 0,
    confidenceLevel: 'LOW',
    sampleInsufficient: true,
    facts: []
  }
})

const hypothesis = (id: number, legacyExperimentId: number, statement: string) => ({
  id,
  legacyExperimentId,
  name: `Hypothesis ${id}`,
  statement,
  primaryMetric: 'INTERVIEW',
  attributionWindowDays: 14,
  minSamplePerVariant: 10,
  variants: [{
    id: id * 10,
    variantCode: 'CONTROL',
    name: 'Control',
    allocationWeight: 1,
    control: true
  }],
  cohorts: []
})

const resumeDetail = (id: number, resumeName: string) => ({
  id,
  resumeName,
  realName: '',
  email: '',
  phone: '',
  targetPosition: '',
  summary: '',
  skills: 'Java',
  workSummary: '',
  education: '',
  isDefault: 0,
  projects: [{
    id: id * 10,
    projectId: id * 10,
    projectName: `${resumeName} project`
  }]
})

const commonStubs = {
  'el-alert': true,
  'el-avatar': true,
  'el-checkbox': true,
  'el-checkbox-group': true,
  'el-date-picker': true,
  'el-dialog': true,
  'el-form': {
    template: '<form><slot /></form>',
    methods: {
      clearValidate: () => undefined,
      validate: () => Promise.resolve(true)
    }
  },
  'el-form-item': true,
  'el-input': true,
  'el-input-number': true,
  'el-option': true,
  'el-progress': true,
  'el-radio': true,
  'el-select': true,
  'el-switch': true,
  'el-table': true,
  'el-table-column': true,
  'el-tag': true,
  'el-tooltip': true
}

const mountView = (component: Component) => shallowMount(component, {
  global: {
    directives: {
      loading: {}
    },
    stubs: commonStubs
  }
})

const setupState = <T>(wrapper: VueWrapper) =>
  (wrapper.vm as unknown as { $: { setupState: T } }).$.setupState

const setRoute = async (
  id?: number,
  query: Record<string, string | undefined> = {}
) => {
  if (id) {
    routerHarness.route.params.id = String(id)
  } else {
    delete routerHarness.route.params.id
  }
  for (const key of Object.keys(routerHarness.route.query)) {
    delete routerHarness.route.query[key]
  }
  Object.assign(routerHarness.route.query, query)
  await nextTick()
}

let wrapper: VueWrapper | undefined

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  routerHarness.route.params = { id: '1' }
  routerHarness.route.query = {}
  routerHarness.beforeRouteLeave = undefined
  routerHarness.beforeRouteUpdate = undefined
  routerHarness.push.mockResolvedValue(undefined)
  routerHarness.replace.mockResolvedValue(undefined)
  ui.alert.mockResolvedValue(undefined)
  ui.confirm.mockResolvedValue(undefined)
  api.assignCareerApplicationApi.mockResolvedValue(undefined)
  api.createCareerHypothesisApi.mockResolvedValue(hypothesis(9, 1, 'Saved hypothesis'))
  api.createResumeProjectApi.mockResolvedValue(undefined)
  api.createResumeVersionApi.mockResolvedValue({ id: 1 })
  api.getApplicationsApi.mockResolvedValue([])
  api.getCareerHypothesisApi.mockResolvedValue(undefined)
  api.getCareerHypothesisByLegacyExperimentApi.mockResolvedValue(undefined)
  api.getJobTargetsApi.mockResolvedValue([])
  api.getResumesApi.mockResolvedValue({ records: [] })
  api.getResumeOptimizeRecordsApi.mockResolvedValue([])
  api.getResumeVersionsApi.mockResolvedValue([])
  api.setDefaultResumeApi.mockResolvedValue(undefined)
  api.updateResumeProjectApi.mockResolvedValue(undefined)
})

afterEach(() => {
  if (wrapper?.vm) {
    wrapper.unmount()
  }
  wrapper = undefined
})

describe('dynamic entity detail routes', () => {
  it('clears project A and ignores project B when its response arrives after project C', async () => {
    const projectB = deferred<ReturnType<typeof projectDetail>>()
    api.getProjectEvidenceDetailApi.mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve(projectDetail(1, 'Project A'))
      if (id === 2) return projectB.promise
      return Promise.resolve(projectDetail(3, 'Project C'))
    })

    wrapper = mountView(ProjectEvidenceDetailView)
    await flushPromises()
    const state = setupState<{ detail: ReturnType<typeof projectDetail> | null }>(wrapper)
    expect(state.detail?.title).toBe('Project A')

    await setRoute(2)
    expect(state.detail).toBeNull()

    await setRoute(3)
    await flushPromises()
    expect(state.detail?.title).toBe('Project C')

    projectB.resolve(projectDetail(2, 'Project B'))
    await flushPromises()
    expect(state.detail?.title).toBe('Project C')
  })

  it('keeps job detail C when job detail B resolves late', async () => {
    const jobB = deferred<ReturnType<typeof jobDetail>>()
    api.getJobExperimentDetailApi.mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve(jobDetail(1, 'Job A'))
      if (id === 2) return jobB.promise
      return Promise.resolve(jobDetail(3, 'Job C'))
    })

    wrapper = mountView(JobExperimentDetailView)
    await flushPromises()
    const state = setupState<{ detail?: ReturnType<typeof jobDetail> }>(wrapper)
    expect(state.detail?.title).toBe('Job A')

    await setRoute(2)
    expect(state.detail).toBeUndefined()

    await setRoute(3)
    await flushPromises()
    expect(state.detail?.title).toBe('Job C')

    jobB.resolve(jobDetail(2, 'Job B'))
    await flushPromises()
    expect(state.detail?.title).toBe('Job C')
  })

  it('keeps job review C when job review B resolves late', async () => {
    const jobB = deferred<ReturnType<typeof jobDetail>>()
    api.getJobExperimentDetailApi.mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve(jobDetail(1, 'Review A'))
      if (id === 2) return jobB.promise
      return Promise.resolve(jobDetail(3, 'Review C'))
    })

    wrapper = mountView(JobExperimentReviewView)
    await flushPromises()
    const state = setupState<{ detail?: ReturnType<typeof jobDetail> }>(wrapper)
    expect(state.detail?.title).toBe('Review A')

    await setRoute(2)
    expect(state.detail).toBeUndefined()

    await setRoute(3)
    await flushPromises()
    expect(state.detail?.title).toBe('Review C')

    jobB.resolve(jobDetail(2, 'Review B'))
    await flushPromises()
    expect(state.detail?.title).toBe('Review C')
  })
})

describe('dynamic entity edit routes', () => {
  it('resets project edit/create state and cancels source import before POST when the route changes', async () => {
    const projectB = deferred<ReturnType<typeof projectDetail>>()
    const sourceConfirmation = deferred<void>()
    api.getProjectEvidenceDetailApi.mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve(projectDetail(1, 'Project A'))
      if (id === 2) return projectB.promise
      return Promise.resolve(projectDetail(3, 'Project C'))
    })
    ui.confirm.mockReturnValue(sourceConfirmation.promise)

    wrapper = mountView(ProjectEvidenceEditView)
    await flushPromises()
    const state = setupState<{
      detail: ReturnType<typeof projectDetail> | null
      formModel: { sourceResumeId?: number; sourceResumeProjectId?: number }
      isEdit: boolean
      handleImportFromSource: () => Promise<void>
    }>(wrapper)
    expect(state.detail?.title).toBe('Project A')

    await setRoute(2)
    expect(state.detail).toBeNull()

    await setRoute(undefined, {
      sourceResumeId: '11',
      sourceResumeProjectId: '22'
    })
    expect(state.isEdit).toBe(false)
    expect(state.detail).toBeNull()
    expect(state.formModel).toEqual({
      sourceResumeId: 11,
      sourceResumeProjectId: 22
    })
    expect(api.importProjectEvidenceFromResumeProjectApi).not.toHaveBeenCalled()

    const importPromise = state.handleImportFromSource()
    await flushPromises()
    expect(ui.confirm).toHaveBeenCalledTimes(1)
    expect(api.importProjectEvidenceFromResumeProjectApi).not.toHaveBeenCalled()

    await setRoute(3)
    sourceConfirmation.resolve()
    await importPromise
    await flushPromises()
    expect(state.detail?.title).toBe('Project C')

    projectB.resolve(projectDetail(2, 'Project B'))
    await flushPromises()
    expect(state.detail?.title).toBe('Project C')
    expect(api.importProjectEvidenceFromResumeProjectApi).not.toHaveBeenCalled()
    expect(routerHarness.replace).not.toHaveBeenCalled()
  })

  it('deduplicates an explicit source import and blocks navigation while its POST is in flight', async () => {
    const sourceImport = deferred<{ id: number }>()
    api.importProjectEvidenceFromResumeProjectApi.mockReturnValue(sourceImport.promise)
    await setRoute(undefined, {
      sourceResumeId: '11',
      sourceResumeProjectId: '22'
    })

    wrapper = mountView(ProjectEvidenceEditView)
    await flushPromises()
    const state = setupState<{
      handleImportFromSource: () => Promise<void>
      importing: boolean
      importSubmitting: boolean
    }>(wrapper)

    const firstImport = state.handleImportFromSource()
    await flushPromises()
    void state.handleImportFromSource()

    expect(api.importProjectEvidenceFromResumeProjectApi).toHaveBeenCalledTimes(1)
    expect(api.importProjectEvidenceFromResumeProjectApi).toHaveBeenCalledWith({
      sourceResumeId: 11,
      sourceResumeProjectId: 22
    })
    expect(state.importing).toBe(true)
    expect(state.importSubmitting).toBe(true)
    expect(routerHarness.beforeRouteLeave?.()).toBe(false)
    expect(routerHarness.beforeRouteUpdate?.()).toBe(false)

    sourceImport.resolve({ id: 99 })
    await firstImport
    await flushPromises()

    expect(state.importing).toBe(false)
    expect(state.importSubmitting).toBe(false)
    expect(routerHarness.replace).toHaveBeenCalledWith('/project-evidence/99/edit')
  })

  it('resets experiment form, selections and hypothesis when switching through create mode', async () => {
    const jobB = deferred<ReturnType<typeof jobDetail>>()
    api.getJobExperimentDetailApi.mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve(jobDetail(1, 'Experiment A'))
      if (id === 2) return jobB.promise
      return Promise.resolve(jobDetail(3, 'Experiment C'))
    })
    api.getCareerHypothesisByLegacyExperimentApi.mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve(hypothesis(1, 1, 'Hypothesis A'))
      return Promise.resolve(hypothesis(3, 3, 'Hypothesis C'))
    })

    wrapper = mountView(JobExperimentCreateView)
    await flushPromises()
    const state = setupState<{
      form: { title: string }
      linkedHypothesis?: ReturnType<typeof hypothesis>
      selectedTargetJobIds: number[]
      selectedResumeIds: number[]
      selectedApplicationIds: number[]
      variants: Array<{ variantCode: string }>
    }>(wrapper)
    expect(state.form.title).toBe('Experiment A')
    expect(state.linkedHypothesis?.statement).toBe('Hypothesis A')
    state.selectedTargetJobIds = [10]
    state.selectedResumeIds = [20]
    state.selectedApplicationIds = [30]

    await setRoute()
    expect(state.form.title).toBe('')
    expect(state.linkedHypothesis).toBeUndefined()
    expect(state.selectedTargetJobIds).toEqual([])
    expect(state.selectedResumeIds).toEqual([])
    expect(state.selectedApplicationIds).toEqual([])
    expect(state.variants.map((item) => item.variantCode)).toEqual(['CONTROL', 'TREATMENT_A'])

    await setRoute(2)
    await setRoute(3)
    await flushPromises()
    expect(state.form.title).toBe('Experiment C')
    expect(state.linkedHypothesis?.statement).toBe('Hypothesis C')

    jobB.resolve(jobDetail(2, 'Experiment B'))
    await flushPromises()
    expect(state.form.title).toBe('Experiment C')
    expect(state.linkedHypothesis?.statement).toBe('Hypothesis C')
  })

  it('clears resume projects and optimization state before loading the next resume', async () => {
    const resumeB = deferred<ReturnType<typeof resumeDetail>>()
    api.getResumeDetailApi.mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve(resumeDetail(1, 'Resume A'))
      if (id === 2) return resumeB.promise
      return Promise.resolve(resumeDetail(3, 'Resume C'))
    })
    api.getResumeOptimizeRecordsApi.mockImplementation((id: number) => {
      if (id !== 1) return Promise.resolve([])
      return Promise.resolve([{
        optimizeRecordId: 101,
        resumeId: 1,
        optimizeStatus: 'SUCCESS'
      }])
    })
    api.getResumeOptimizeResultApi.mockResolvedValue({
      optimizeRecordId: 101,
      optimizeStatus: 'SUCCESS',
      rewriteSuggestions: []
    })

    wrapper = mountView(ResumeEditView)
    await flushPromises()
    const state = setupState<{
      form: { resumeName: string }
      projects: Array<{ projectName: string }>
      optimizeRecords: Array<{ optimizeRecordId: number }>
      optimizeDetail: { optimizeRecordId: number } | null
    }>(wrapper)
    expect(state.form.resumeName).toBe('Resume A')
    expect(state.projects[0]?.projectName).toBe('Resume A project')
    expect(state.optimizeRecords[0]?.optimizeRecordId).toBe(101)
    expect(state.optimizeDetail?.optimizeRecordId).toBe(101)

    await setRoute(2)
    expect(state.form.resumeName).toBe('')
    expect(state.projects).toEqual([])
    expect(state.optimizeRecords).toEqual([])
    expect(state.optimizeDetail).toBeNull()

    await setRoute(3)
    await flushPromises()
    expect(state.form.resumeName).toBe('Resume C')
    expect(state.projects[0]?.projectName).toBe('Resume C project')

    resumeB.resolve(resumeDetail(2, 'Resume B'))
    await flushPromises()
    expect(state.form.resumeName).toBe('Resume C')
    expect(state.projects[0]?.projectName).toBe('Resume C project')

    await setRoute()
    expect(state.form.resumeName).toBe('')
    expect(state.projects).toEqual([])
  })
})

describe('dynamic entity write operations', () => {
  it('uses one job experiment snapshot for hypothesis and application assignments', async () => {
    const baseSave = deferred<ReturnType<typeof jobDetail>>()
    api.getJobExperimentDetailApi.mockResolvedValue(jobDetail(1, 'Experiment A'))
    api.updateJobExperimentApi.mockReturnValue(baseSave.promise)

    wrapper = mountView(JobExperimentCreateView)
    await flushPromises()
    const state = setupState<{
      form: { title: string; goal?: string }
      hypothesisForm: { statement: string }
      controlVariablesText: string
      selectedTargetJobIds: number[]
      selectedResumeIds: number[]
      selectedApplicationIds: number[]
      applications: Array<{ id: number; jobTitle?: string; source?: string }>
      save: () => Promise<void>
    }>(wrapper)
    state.form.title = 'Snapshot A'
    state.form.goal = 'Goal A'
    state.hypothesisForm.statement = 'Statement A'
    state.controlVariablesText = 'Channel A\nWindow A'
    state.selectedTargetJobIds = [11]
    state.selectedResumeIds = [22]
    state.selectedApplicationIds = [33]
    state.applications = [{ id: 33, jobTitle: 'Role A', source: 'Source A' }]

    const savePromise = state.save()
    await flushPromises()
    state.form.title = 'State B'
    state.form.goal = 'Goal B'
    state.hypothesisForm.statement = 'Statement B'
    state.controlVariablesText = 'Channel B'
    state.selectedTargetJobIds = [111]
    state.selectedResumeIds = [222]
    state.selectedApplicationIds = [333]
    state.applications = [{ id: 333, jobTitle: 'Role B', source: 'Source B' }]

    baseSave.resolve(jobDetail(1, 'Saved experiment'))
    await savePromise
    await flushPromises()

    expect(api.updateJobExperimentApi).toHaveBeenCalledWith(1, expect.objectContaining({
      title: 'Snapshot A',
      goal: 'Goal A'
    }))
    expect(api.createCareerHypothesisApi).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Snapshot A',
      statement: 'Statement A',
      variants: expect.arrayContaining([
        expect.objectContaining({
          treatment: expect.objectContaining({
            controlVariables: ['Channel A', 'Window A'],
            targetJobIds: [11],
            resumeIds: [22]
          })
        })
      ])
    }))
    expect(api.assignCareerApplicationApi).toHaveBeenCalledWith(9, {
      applicationId: 33,
      assignmentKey: 'application:33',
      jobFamily: 'Role A',
      channel: 'Source A'
    })
    expect(routerHarness.push).toHaveBeenCalledWith({
      path: '/job-experiments/1',
      query: { hypothesisId: '9' }
    })
  })

  it('stops an old job experiment save after the route changes', async () => {
    const baseSave = deferred<ReturnType<typeof jobDetail>>()
    api.getJobExperimentDetailApi.mockImplementation((id: number) =>
      Promise.resolve(jobDetail(id, `Experiment ${id}`))
    )
    api.updateJobExperimentApi.mockReturnValue(baseSave.promise)

    wrapper = mountView(JobExperimentCreateView)
    await flushPromises()
    const state = setupState<{
      form: { title: string }
      hypothesisForm: { statement: string }
      save: () => Promise<void>
    }>(wrapper)
    state.form.title = 'Experiment A snapshot'
    state.hypothesisForm.statement = 'Statement A'

    const savePromise = state.save()
    await flushPromises()
    await setRoute(2)
    await flushPromises()

    baseSave.resolve(jobDetail(1, 'Saved A'))
    await savePromise
    await flushPromises()

    expect(api.updateJobExperimentApi).toHaveBeenCalledWith(1, expect.objectContaining({
      title: 'Experiment A snapshot'
    }))
    expect(api.createCareerHypothesisApi).not.toHaveBeenCalled()
    expect(api.assignCareerApplicationApi).not.toHaveBeenCalled()
    expect(routerHarness.push).not.toHaveBeenCalled()
  })

  it('keeps resume saving locked across a route switch and stops later create steps', async () => {
    const createResume = deferred<{ id: number }>()
    api.createResumeApi.mockReturnValue(createResume.promise)
    api.getResumeDetailApi.mockImplementation((id: number) =>
      Promise.resolve(resumeDetail(id, `Resume ${id}`))
    )
    await setRoute()

    wrapper = mountView(ResumeEditView)
    await flushPromises()
    const state = setupState<{
      form: { resumeName: string; skills: string; isDefault: number }
      projects: Array<{ id: number; projectId: number; projectName: string }>
      saving: boolean
      handleSave: () => Promise<void>
    }>(wrapper)
    state.form.resumeName = 'Resume A snapshot'
    state.form.skills = 'Java'
    state.form.isDefault = 1
    state.projects = [{ id: -1, projectId: -1, projectName: 'Draft A' }]

    const savePromise = state.handleSave()
    await flushPromises()
    expect(state.saving).toBe(true)

    await setRoute(2)
    await flushPromises()
    expect(state.saving).toBe(true)

    createResume.resolve({ id: 77 })
    await savePromise
    await flushPromises()

    expect(state.saving).toBe(false)
    expect(api.createResumeApi).toHaveBeenCalledWith(expect.objectContaining({
      resumeName: 'Resume A snapshot',
      isDefault: 1
    }))
    expect(api.createResumeProjectApi).not.toHaveBeenCalled()
    expect(api.setDefaultResumeApi).not.toHaveBeenCalled()
    expect(api.createResumeVersionApi).not.toHaveBeenCalled()
    expect(routerHarness.replace).not.toHaveBeenCalled()
  })

  it('uses resume form and draft project snapshots through the complete create workflow', async () => {
    const createResume = deferred<{ id: number }>()
    api.createResumeApi.mockReturnValue(createResume.promise)
    await setRoute()

    wrapper = mountView(ResumeEditView)
    await flushPromises()
    const state = setupState<{
      form: { resumeName: string; skills: string; isDefault: number }
      projects: Array<{ id: number; projectId: number; projectName: string }>
      handleSave: () => Promise<void>
    }>(wrapper)
    state.form.resumeName = 'Resume A snapshot'
    state.form.skills = 'Java'
    state.form.isDefault = 1
    state.projects = [{ id: -1, projectId: -1, projectName: 'Draft A' }]

    const savePromise = state.handleSave()
    await flushPromises()
    state.form.resumeName = 'Resume B state'
    state.form.isDefault = 0
    state.projects = [{ id: -2, projectId: -2, projectName: 'Draft B' }]

    createResume.resolve({ id: 77 })
    await savePromise
    await flushPromises()

    expect(api.createResumeApi).toHaveBeenCalledWith(expect.objectContaining({
      resumeName: 'Resume A snapshot',
      isDefault: 1
    }))
    expect(api.createResumeProjectApi).toHaveBeenCalledWith(77, expect.objectContaining({
      projectId: -1,
      projectName: 'Draft A'
    }))
    expect(api.setDefaultResumeApi).toHaveBeenCalledWith(77)
    expect(api.createResumeVersionApi).toHaveBeenCalledWith(77, {
      sourceType: 'MANUAL_SAVE'
    })
    expect(routerHarness.replace).toHaveBeenCalledWith('/resumes/77/edit')
  })

  it('does not apply a late resume project write to the next resume route', async () => {
    const projectSave = deferred<void>()
    api.getResumeDetailApi.mockImplementation((id: number) =>
      Promise.resolve(resumeDetail(id, `Resume ${id}`))
    )
    api.updateResumeProjectApi.mockReturnValue(projectSave.promise)

    wrapper = mountView(ResumeEditView)
    await flushPromises()
    const state = setupState<{
      projectFormRef: { validate: () => Promise<Record<string, unknown>> }
      editingProjectId: number | null
      projectSaving: boolean
      handleSaveProject: () => Promise<void>
    }>(wrapper)
    state.projectFormRef = {
      validate: () => Promise.resolve({ projectName: 'Project A snapshot' })
    }
    state.editingProjectId = 10

    const savePromise = state.handleSaveProject()
    await flushPromises()
    expect(state.projectSaving).toBe(true)

    await setRoute(2)
    await flushPromises()
    expect(state.projectSaving).toBe(true)

    projectSave.resolve()
    await savePromise
    await flushPromises()

    expect(state.projectSaving).toBe(false)
    expect(api.updateResumeProjectApi).toHaveBeenCalledWith(1, 10, {
      projectName: 'Project A snapshot'
    })
    expect(ui.success).not.toHaveBeenCalledWith('项目经历已保存')
  })

  it('does not navigate when an old project evidence save resolves on a new route', async () => {
    const projectSave = deferred<ReturnType<typeof projectDetail>>()
    api.getProjectEvidenceDetailApi.mockImplementation((id: number) =>
      Promise.resolve(projectDetail(id, `Project ${id}`))
    )
    api.updateProjectEvidenceApi.mockReturnValue(projectSave.promise)

    wrapper = mountView(ProjectEvidenceEditView)
    await flushPromises()
    const state = setupState<{
      formRef: { validate: () => Promise<Record<string, unknown>> }
      saving: boolean
      handleSave: () => Promise<void>
    }>(wrapper)
    state.formRef = {
      validate: () => Promise.resolve({ title: 'Project A snapshot' })
    }

    const savePromise = state.handleSave()
    await flushPromises()
    expect(state.saving).toBe(true)

    await setRoute(2)
    await flushPromises()
    expect(state.saving).toBe(true)

    projectSave.resolve(projectDetail(1, 'Saved A'))
    await savePromise
    await flushPromises()

    expect(state.saving).toBe(false)
    expect(api.updateProjectEvidenceApi).toHaveBeenCalledWith(1, {
      title: 'Project A snapshot'
    })
    expect(routerHarness.replace).not.toHaveBeenCalled()
    expect(ui.success).not.toHaveBeenCalledWith('项目证据已保存。')
  })
})
