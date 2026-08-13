import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeQuery = vi.hoisted(() => ({
  value: { profileId: '7', matchReportId: '9', targetJobId: '3' } as Record<string, string>
}))
const reportResult = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery.value }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}))

vi.mock('@/api/resumeJobMatch', () => ({
  getResumeJobMatchReportDetailApi: vi.fn(async () => reportResult.value)
}))

vi.mock('@/api/skillProfile', () => ({
  generateSkillProfileApi: vi.fn(),
  refreshSkillProfileApi: vi.fn(),
  getSkillProfileByIdApi: vi.fn(async () => ({
    profileId: 7,
    matchReportId: 9,
    targetJobId: 3,
    status: 'SUCCESS',
    overallScore: 88,
    gapItems: [{
      id: 1,
      profileId: 7,
      skillName: 'Java',
      currentLevel: null,
      targetLevel: null
    }]
  })),
  getSkillProfileByJobTargetApi: vi.fn(),
  getSkillProfileOverviewApi: vi.fn(async () => ({
    profileId: 7,
    targetJobId: 3,
    status: 'SUCCESS',
    overallScore: 88,
    radarData: [{
      skillName: 'Java',
      currentLevel: null,
      targetLevel: null
    }]
  }))
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}))

import SkillProfileView from '@/views/v3/SkillProfileView.vue'

const mountView = () => mount(SkillProfileView, {
  global: {
    stubs: {
      AppState: true,
      'el-alert': {
        props: ['title', 'description'],
        template: '<div>{{ title }} {{ description }}</div>'
      },
      'el-button': {
        props: ['disabled', 'loading'],
        template: '<button :disabled="disabled"><slot /></button>'
      },
      'el-progress': true,
      'el-tag': { template: '<span><slot /></span>' }
    }
  }
})

describe('SkillProfileView trusted source semantics', () => {
  beforeEach(() => {
    reportResult.value = {
      reportId: 9,
      status: 'SUCCESS',
      trustStatus: 'TRUSTED',
      fallback: false,
      schemaWarningCount: 0
    }
  })

  it('rejects the legacy TRUSTED enum and keeps profile scores and training locked', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('匹配报告暂不能作为画像证据')
    expect(wrapper.text()).toContain('评分待量化')
    expect(wrapper.text()).not.toContain('88')

    const actionButtons = wrapper.findAll('.action-panel button')
    expect(actionButtons).toHaveLength(2)
    expect(actionButtons.every((button) => button.attributes('disabled') !== undefined)).toBe(true)

    wrapper.unmount()
  })

  it('does not count unquantified nodes as quantified skill gaps', async () => {
    reportResult.value = {
      reportId: 9,
      status: 'SUCCESS',
      trustStatus: 'VERIFIED',
      fallback: false,
      schemaWarningCount: 0
    }
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toMatch(/已量化短板\s*0/)
    wrapper.unmount()
  })
})
