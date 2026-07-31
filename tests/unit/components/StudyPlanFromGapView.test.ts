import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'

import { getCurrentJobTargetApi } from '@/api/jobTarget'
import {
  getSkillProfileByIdApi,
  getSkillProfileByJobTargetApi,
  getSkillProfileOverviewApi
} from '@/api/skillProfile'
import { generateStudyPlanFromGapApi } from '@/api/studyPlan'
import type { SkillGapItemVO } from '@/types/skillProfile'
import StudyPlanFromGapView from '@/views/v3/StudyPlanFromGapView.vue'

const routerPush = vi.hoisted(() => vi.fn())
const routeState = vi.hoisted(() => ({ current: null as any }))
const messageMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
  useRoute: () => routeState.current
}))

vi.mock('@/api/skillProfile', () => ({
  getSkillProfileByIdApi: vi.fn(),
  getSkillProfileByJobTargetApi: vi.fn(),
  getSkillProfileOverviewApi: vi.fn()
}))

vi.mock('@/api/jobTarget', () => ({
  getCurrentJobTargetApi: vi.fn()
}))

vi.mock('@/api/studyPlan', () => ({
  generateStudyPlanFromGapApi: vi.fn()
}))

vi.mock('element-plus', () => ({
  ElMessage: messageMocks
}))

const componentStubs = {
  'el-alert': { template: '<div class="el-alert-stub"></div>' },
  'el-button': { template: '<button class="el-button-stub" v-bind="$attrs"><slot /></button>' },
  'el-checkbox-group': { template: '<div class="el-checkbox-group-stub"><slot /></div>' },
  'el-checkbox': { template: '<input type="checkbox" class="el-checkbox-stub" />' },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-input': { template: '<input class="el-input-stub" />' },
  'el-input-number': { template: '<input class="el-input-number-stub" />' },
  'el-date-picker': { template: '<input class="el-date-picker-stub" />' },
  'el-tag': { template: '<span class="el-tag-stub"><slot /></span>' },
  AppState: { template: '<div class="app-state-stub"></div>' }
}

const gap = (id: number, sourceType: string, skillName: string, profileId = 5): SkillGapItemVO => ({
  id,
  profileId,
  skillName,
  category: 'BACKEND',
  severity: 'HIGH',
  gapLevel: 2,
  currentLevel: 2,
  targetLevel: 4,
  gapDescription: `${skillName} needs work`,
  sourceType
})

const mountView = () =>
  mount(StudyPlanFromGapView, {
    global: {
      stubs: componentStubs
    }
  })

const findGenerateButton = (wrapper: ReturnType<typeof mountView>) =>
  wrapper
    .findAll('.el-button-stub')
    .find((button) => button.text().includes('生成学习计划'))

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

describe('StudyPlanFromGapView evidence-feedback badge', () => {
  beforeEach(() => {
    routeState.current = reactive({
      query: { profileId: '5' } as Record<string, string>
    })
    routerPush.mockReset()
    routerPush.mockResolvedValue(undefined)
    Object.values(messageMocks).forEach((mock) => mock.mockReset())
    vi.mocked(getCurrentJobTargetApi).mockReset()
    vi.mocked(getSkillProfileByIdApi).mockReset()
    vi.mocked(getSkillProfileByJobTargetApi).mockReset()
    vi.mocked(getSkillProfileOverviewApi).mockReset()
    vi.mocked(generateStudyPlanFromGapApi).mockReset()
  })

  it('marks evidence-usage gaps with the evidence-feedback badge and leaves others unmarked', async () => {
    vi.mocked(getSkillProfileByIdApi).mockResolvedValue({
      profileId: 5,
      gapItems: [
        gap(1, 'EVIDENCE_USAGE_RESULT', 'Redis'),
        gap(2, 'EVIDENCE_USAGE_PATTERN_PROJECT_EVIDENCE', 'MySQL'),
        gap(3, 'INTERVIEW_REPORT', 'JVM'),
        gap(4, 'RESUME_JOB_MATCH', 'Kafka')
      ]
    } as never)

    const wrapper = mountView()
    await flushPromises()

    const badges = wrapper.findAll('.el-tag-stub')
    expect(badges).toHaveLength(2)
    expect(badges.every((badge) => badge.text() === '证据反馈')).toBe(true)
  })

  it('renders no badge when the profile has no evidence-usage gaps', async () => {
    vi.mocked(getSkillProfileByIdApi).mockResolvedValue({
      profileId: 5,
      gapItems: [gap(1, 'INTERVIEW_REPORT', 'JVM'), gap(2, 'RESUME_JOB_MATCH', 'Kafka')]
    } as never)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.findAll('.el-tag-stub')).toHaveLength(0)
  })

  it('keeps the study-plan duration within the backend 60-day contract', async () => {
    vi.mocked(getSkillProfileByIdApi).mockResolvedValue({
      profileId: 5,
      gapItems: [gap(1, 'INTERVIEW_REPORT', 'JVM')]
    } as never)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.findAll('.el-input-number-stub')[0]?.attributes('max')).toBe('60')
  })

  it('reloads on profile route changes and ignores the older response', async () => {
    const profile5 = deferred<any>()
    const profile6 = deferred<any>()
    vi.mocked(getSkillProfileByIdApi).mockImplementation((id) => {
      return (id === 5 ? profile5.promise : profile6.promise) as never
    })

    const wrapper = mountView()
    await flushPromises()
    routeState.current.query.profileId = '6'
    await nextTick()

    expect(vi.mocked(getSkillProfileByIdApi).mock.calls.map(([id]) => id)).toEqual([5, 6])
    profile6.resolve({
      profileId: 6,
      gapItems: [gap(6, 'INTERVIEW_REPORT', '新画像短板', 6)]
    })
    await flushPromises()
    profile5.resolve({
      profileId: 5,
      gapItems: [gap(5, 'INTERVIEW_REPORT', '旧画像短板', 5)]
    })
    await flushPromises()

    expect(wrapper.text()).toContain('新画像短板')
    expect(wrapper.text()).not.toContain('旧画像短板')
  })

  it('does not fall back to the previously loaded profile after profileId is removed', async () => {
    vi.mocked(getSkillProfileByIdApi).mockResolvedValue({
      profileId: 5,
      gapItems: [gap(5, 'INTERVIEW_REPORT', '旧画像短板')]
    } as never)
    vi.mocked(getCurrentJobTargetApi).mockResolvedValue({ id: 9 } as never)
    vi.mocked(getSkillProfileOverviewApi).mockResolvedValue({
      profileId: 9,
      targetJobId: 9,
      topGaps: [gap(9, 'INTERVIEW_REPORT', '目标岗位短板', 9)]
    } as never)
    vi.mocked(getSkillProfileByJobTargetApi).mockResolvedValue({
      profileId: 9,
      targetJobId: 9,
      gapItems: [gap(9, 'INTERVIEW_REPORT', '目标岗位短板', 9)]
    } as never)

    const wrapper = mountView()
    await flushPromises()
    delete routeState.current.query.profileId
    await nextTick()
    await flushPromises()

    expect(getCurrentJobTargetApi).toHaveBeenCalledTimes(1)
    expect(getSkillProfileOverviewApi).toHaveBeenCalledWith(9)
    expect(wrapper.text()).toContain('目标岗位短板')
    expect(wrapper.text()).not.toContain('旧画像短板')
  })

  it('submits an immutable form snapshot and navigates with the captured context', async () => {
    routeState.current.query.resumeId = '7'
    vi.mocked(getSkillProfileByIdApi).mockResolvedValue({
      profileId: 5,
      targetJobId: 10,
      matchReportId: 20,
      gapItems: [
        gap(1, 'INTERVIEW_REPORT', 'Redis'),
        gap(2, 'RESUME_JOB_MATCH', 'Kafka')
      ]
    } as never)
    const generation = deferred<any>()
    vi.mocked(generateStudyPlanFromGapApi).mockReturnValue(generation.promise as never)

    const wrapper = mountView()
    await flushPromises()
    const button = findGenerateButton(wrapper)!
    await button.trigger('click')

    const exposed = wrapper.vm as any
    exposed.form.gapItemIds.push(99)
    exposed.form.days = 40
    generation.resolve({ planId: 123, planStatus: 'GENERATED' })
    await flushPromises()

    expect(generateStudyPlanFromGapApi).toHaveBeenCalledWith({
      profileId: 5,
      gapItemIds: [1, 2],
      days: 21,
      dailyMinutes: 90,
      startDate: undefined,
      planTitle: undefined
    })
    expect(routerPush).toHaveBeenCalledWith({
      path: '/study-plans',
      query: {
        planId: '123',
        skillProfileId: '5',
        targetJobId: '10',
        matchReportId: '20',
        resumeId: '7'
      }
    })
  })

  it('drops a completed submission after the route context changes', async () => {
    vi.mocked(getSkillProfileByIdApi).mockImplementation((id) => Promise.resolve({
      profileId: id,
      gapItems: [gap(id, 'INTERVIEW_REPORT', `画像 ${id}`, id)]
    }) as never)
    const generation = deferred<any>()
    vi.mocked(generateStudyPlanFromGapApi).mockReturnValue(generation.promise as never)

    const wrapper = mountView()
    await flushPromises()
    await findGenerateButton(wrapper)!.trigger('click')
    routeState.current.query.profileId = '6'
    await nextTick()
    await flushPromises()

    generation.resolve({ planId: 123, planStatus: 'GENERATED' })
    await flushPromises()

    expect(routerPush).not.toHaveBeenCalled()
    expect(messageMocks.success).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('画像 6')
  })

  it('keeps the submission locked while the current profile is manually refreshed', async () => {
    vi.mocked(getSkillProfileByIdApi).mockResolvedValue({
      profileId: 5,
      gapItems: [gap(1, 'INTERVIEW_REPORT', 'Redis')]
    } as never)
    const generation = deferred<any>()
    vi.mocked(generateStudyPlanFromGapApi).mockReturnValue(generation.promise as never)

    const wrapper = mountView()
    await flushPromises()
    await findGenerateButton(wrapper)!.trigger('click')

    const refreshButton = wrapper
      .findAll('.el-button-stub')
      .find((button) => button.text().includes('刷新'))
    await refreshButton!.trigger('click')
    await flushPromises()
    await findGenerateButton(wrapper)!.trigger('click')

    expect(generateStudyPlanFromGapApi).toHaveBeenCalledTimes(1)

    generation.resolve({ planId: 123, planStatus: 'GENERATED' })
    await flushPromises()
    expect(routerPush).toHaveBeenCalledTimes(1)
  })
})
