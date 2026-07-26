import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSkillProfileByIdApi } from '@/api/skillProfile'
import type { SkillGapItemVO } from '@/types/skillProfile'
import StudyPlanFromGapView from '@/views/v3/StudyPlanFromGapView.vue'

const routerPush = vi.hoisted(() => vi.fn())
const routeQuery = vi.hoisted(() => ({ value: {} as Record<string, string> }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
  useRoute: () => ({ query: routeQuery.value })
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

const gap = (id: number, sourceType: string, skillName: string): SkillGapItemVO => ({
  id,
  profileId: 5,
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

describe('StudyPlanFromGapView evidence-feedback badge', () => {
  beforeEach(() => {
    routerPush.mockReset()
    routeQuery.value = { profileId: '5' }
    vi.mocked(getSkillProfileByIdApi).mockReset()
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
})
