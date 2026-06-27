import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getGrowthOverviewApi,
  getGrowthReadinessTrendApi,
  getGrowthSkillsTrendApi
} from '@/api/v4'
import GrowthProfileView from '@/views/v4/GrowthProfileView.vue'

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/api/v4', () => ({
  getGrowthOverviewApi: vi.fn(),
  getGrowthReadinessTrendApi: vi.fn(),
  getGrowthSkillsTrendApi: vi.fn()
}))

const componentStubs = {
  AppState: {
    template: '<div class="app-state-stub"><slot /></div>'
  },
  'el-alert': {
    template: '<div class="el-alert-stub"></div>'
  },
  'el-button': {
    template: '<button class="el-button-stub" v-bind="$attrs"><slot /></button>'
  },
  'el-progress': {
    props: ['percentage'],
    template: '<div class="progress-stub">{{ percentage }}</div>'
  },
  'el-segmented': {
    template: '<div class="el-segmented-stub"></div>'
  },
  'el-tag': {
    template: '<span class="el-tag-stub"><slot /></span>'
  }
}

describe('GrowthProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getGrowthOverviewApi).mockResolvedValue({
      readinessScore: 82,
      taskCompletionRate: 76,
      agentSuccessRate: 80,
      confidenceLevel: 'HIGH',
      evidenceCount: 3,
      timeWindow: '最近30天',
      dataSourceLabels: [
        '当前纳入：任务完成记录',
        '当前未纳入：AI 教练运行记录、复盘记录、成长记忆、反馈信号、提醒信号'
      ],
      displayPolicy: {
        showStrongScore: true,
        showReadinessTrend: true,
        showTopSkillTrend: true
      }
    })
  })

  it('renders unified evidence-source labels and hides LOW confidence trend rows', async () => {
    vi.mocked(getGrowthSkillsTrendApi).mockResolvedValue([
      {
        id: 1,
        snapshotDate: '2026-06-01',
        skillName: 'Low Skill',
        score: 86,
        confidenceLevel: 'LOW',
        evidenceCount: 1
      },
      {
        id: 2,
        snapshotDate: '2026-06-02',
        skillName: 'Trusted Skill',
        score: 74,
        confidenceLevel: 'HIGH',
        evidenceCount: 3,
        dataSourceLabels: ['当前纳入：任务完成记录']
      }
    ])
    vi.mocked(getGrowthReadinessTrendApi).mockResolvedValue([
      {
        id: 10,
        scoreDate: '2026-06-01',
        score: 91,
        confidenceLevel: 'LOW',
        evidenceCount: 1
      },
      {
        id: 11,
        scoreDate: '2026-06-03',
        score: 79,
        confidenceLevel: 'HIGH',
        evidenceCount: 3,
        dataSourceLabels: ['当前纳入：任务完成记录']
      }
    ])

    const wrapper = mount(GrowthProfileView, {
      global: {
        stubs: componentStubs
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('当前纳入：任务完成记录')
    expect(wrapper.text()).toContain('当前未纳入：AI 教练运行记录、复盘记录、成长记忆、反馈信号、提醒信号')
    expect(wrapper.text()).toContain('Trusted Skill')
    expect(wrapper.text()).not.toContain('Low Skill')
    expect(wrapper.text()).toContain('2026-06-03')
    expect(wrapper.text()).not.toContain('2026-06-01')
    expect(wrapper.findAll('.progress-stub').map((item) => item.text())).toEqual(['74', '79'])
  })

  it('shows unified cold-start guidance when strong score is hidden', async () => {
    vi.mocked(getGrowthOverviewApi).mockResolvedValue({
      confidenceLevel: 'LOW',
      evidenceCount: 1,
      timeWindow: '最近30天',
      dataSourceLabels: [
        '当前纳入：任务完成记录',
        '当前未纳入：AI 教练运行记录、复盘记录、成长记忆、反馈信号、提醒信号'
      ],
      coldStartReason: 'Growth 仅在至少 3 条任务记录且 2 条已完成任务时展示强结论。',
      nextEvidenceActions: ['至少补齐到 3 条任务记录', '至少完成 2 条任务记录'],
      displayPolicy: {
        showStrongScore: false,
        showReadinessTrend: false,
        showTopSkillTrend: false
      }
    })
    vi.mocked(getGrowthSkillsTrendApi).mockResolvedValue([])
    vi.mocked(getGrowthReadinessTrendApi).mockResolvedValue([])

    const wrapper = mount(GrowthProfileView, {
      global: {
        stubs: componentStubs
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('待补证据')
    expect(wrapper.text()).toContain('至少补齐到 3 条任务记录')
    expect(wrapper.text()).toContain('至少完成 2 条任务记录')
    expect(wrapper.text()).toContain('当前未纳入：AI 教练运行记录、复盘记录、成长记忆、反馈信号、提醒信号')
  })
})
