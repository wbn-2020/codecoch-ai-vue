import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PortfolioDemoView from '@/views/portfolio-demo/PortfolioDemoView.vue'
import type { PortfolioDemoStorylineVO } from '@/types/jobExperiment'

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush })
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('@/api/jobExperiment', () => ({
  getPortfolioDemoStorylineApi: vi.fn(),
  loadPortfolioDemoApi: vi.fn(),
  resetPortfolioDemoApi: vi.fn()
}))

const {
  getPortfolioDemoStorylineApi,
  loadPortfolioDemoApi,
  resetPortfolioDemoApi
} = await import('@/api/jobExperiment')
const { ElMessage } = await import('element-plus')

const story = (): PortfolioDemoStorylineVO => ({
  status: {
    loaded: true,
    datasetKey: 'portfolio-3b-v1',
    datasetName: 'CodeCoachAI 作品集演示',
    status: 'LOADED',
    version: 'v1',
    demoData: true,
    readOnly: true,
    loadedAt: '2026-07-05T10:00:00',
    resetAt: '2026-07-05T09:00:00',
    message: '演示数据带有隔离标记，不会触发真实通知、投递或外部调用。'
  },
  steps: [
    {
      key: 'target-job',
      title: '目标岗位',
      route: '/job-targets?demoFlag=true',
      entityType: 'TARGET_JOB',
      evidenceSummary: '基于脱敏岗位描述摘要提取岗位能力要求。',
      demoData: true
    },
    {
      key: 'jd-match',
      title: 'JD 匹配报告',
      route: '/resume-match?demoFlag=true',
      entityType: 'RESUME_MATCH',
      evidenceSummary: '绑定简历版本快照与目标 JD。',
      demoData: true
    },
    {
      key: 'project-evidence',
      title: '项目证据',
      route: '/project-evidence?demoFlag=true',
      entityType: 'PROJECT_EVIDENCE',
      evidenceSummary: '项目证据以摘要、能力标签和 JD 覆盖关系呈现。',
      demoData: true
    },
    {
      key: 'interview-training',
      title: '面试训练室',
      route: '/interviews/create?demoFlag=true',
      entityType: 'INTERVIEW_TRAINING',
      evidenceSummary: '根据 JD 与项目证据生成追问方向。',
      demoData: true
    },
    {
      key: 'interview-report',
      title: '面试报告',
      route: '/interviews/history?demoFlag=true',
      entityType: 'INTERVIEW_REPORT',
      evidenceSummary: 'Rubric 评分基于问答样本、岗位描述摘要和项目证据。',
      demoData: true
    },
    {
      key: 'ability-map',
      title: '能力图谱',
      route: '/ability-map?demoFlag=true',
      entityType: 'ABILITY_PROFILE',
      evidenceSummary: '能力状态来自匹配报告、面试报告和训练记录。',
      demoData: true
    },
    {
      key: 'job-experiment-review',
      title: '求职实验复盘',
      route: '/job-experiments/9/review?demoFlag=true',
      entityType: 'JOB_EXPERIMENT',
      evidenceSummary: '样本数不足时只给弱建议和下一轮策略。',
      demoData: true
    },
    {
      key: 'agent-today',
      title: 'Agent 今日任务',
      route: '/agent/today?demoFlag=true',
      entityType: 'AGENT_TASK',
      evidenceSummary: '任务承接来自实验复盘、匹配缺口和面试反馈。',
      demoData: true
    }
  ],
  opsSteps: [
    {
      key: 'agent-runs',
      title: 'Agent 运行记录',
      route: '/admin/agent/runs?demoFlag=true',
      entityType: 'AGENT_RUN',
      evidenceSummary: '展示任务生成的运行状态、traceId、失败原因和降级结果。',
      demoData: true
    },
    {
      key: 'prompt-template',
      title: 'Prompt 模板',
      route: '/admin/ai/prompts?demoFlag=true',
      entityType: 'PROMPT_TEMPLATE',
      evidenceSummary: '展示关键 Prompt 的版本、适用场景和摘要化上下文策略。',
      demoData: true
    },
    {
      key: 'prompt-regression',
      title: 'Prompt 回归',
      route: '/admin/ai/prompt-regression?demoFlag=true',
      entityType: 'PROMPT_REGRESSION',
      evidenceSummary: '通过固定样例验证 Prompt 变更。',
      demoData: true
    },
    {
      key: 'ai-call-logs',
      title: 'AI 服务记录',
      route: '/admin/ai/logs?demoFlag=true',
      entityType: 'AI_CALL_LOG',
      evidenceSummary: '日志仅保留摘要、traceId、Prompt 版本、模型、状态和错误原因。',
      demoData: true
    },
    {
      key: 'async-tasks',
      title: '异步任务中心',
      route: '/admin/async-tasks?demoFlag=true',
      entityType: 'ASYNC_TASK',
      evidenceSummary: '展示任务排队、执行、失败重试和 traceId 闭环。',
      demoData: true
    },
    {
      key: 'metrics-dictionary',
      title: '指标字典',
      route: '/admin/analytics/metrics?demoFlag=true',
      entityType: 'METRIC_DICTIONARY',
      evidenceSummary: '说明成功率、耗时、反馈采纳等指标口径。',
      demoData: true
    },
    {
      key: 'ai-ops-dashboard',
      title: 'AI 运营看板',
      route: '/admin/analytics/ai?demoFlag=true',
      entityType: 'AI_OPS',
      evidenceSummary: '聚合 AI 调用成功率、耗时、Token 成本、失败原因和用户反馈。',
      demoData: true
    }
  ]
})

const stubs = {
  'el-alert': {
    props: ['title', 'description'],
    template: '<div class="el-alert-stub" :data-title="title" :data-description="description">{{ title }}{{ description }}<slot /></div>'
  },
  'el-button': {
    props: ['loading', 'disabled'],
    template: '<button class="el-button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-tag': {
    template: '<span class="el-tag-stub"><slot /></span>'
  }
}

const mountView = async () => {
  const wrapper = mount(PortfolioDemoView, {
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

describe('PortfolioDemoView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerPush.mockResolvedValue(undefined)
    vi.mocked(getPortfolioDemoStorylineApi).mockResolvedValue(story())
    vi.mocked(loadPortfolioDemoApi).mockResolvedValue(story().status)
    vi.mocked(resetPortfolioDemoApi).mockResolvedValue({ ...story().status, status: 'RESET' })
  })

  it('renders demo dataset status, coverage and both phase-one routes', async () => {
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('作品集演示控制台')
    expect(wrapper.text()).toContain('演示数据')
    expect(wrapper.text()).toContain('CodeCoachAI 作品集演示')
    expect(wrapper.text()).toContain('已覆盖 15/15')
    expect(wrapper.text()).toContain('最近加载：2026-07-05T10:00:00')
    expect(wrapper.text()).toContain('目标岗位')
    expect(wrapper.text()).toContain('Agent 运行记录')
  })

  it('shows an error state and can retry storyline loading without a dev server', async () => {
    vi.mocked(getPortfolioDemoStorylineApi)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(story())

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('演示主线加载失败')
    await wrapper.find('.retry-storyline').trigger('click')
    await flushPromises()

    expect(vi.mocked(getPortfolioDemoStorylineApi).mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(wrapper.text()).toContain('已覆盖 15/15')
  })

  it('warns and falls back when a node route is not in the portfolio demo allowlist', async () => {
    const unsafeStory = story()
    unsafeStory.steps[0] = {
      ...unsafeStory.steps[0],
      route: 'https://evil.example/phish'
    }
    vi.mocked(getPortfolioDemoStorylineApi).mockResolvedValue(unsafeStory)

    const wrapper = await mountView()
    await wrapper.findAll('.story-step')[0].trigger('click')
    await flushPromises()

    expect(routerPush).toHaveBeenCalledWith('/portfolio-demo')
    expect(ElMessage.warning).toHaveBeenCalledWith('目标不是安全的站内路径，已回落到可用入口。')
  })

  it('explains which route node is missing backend demo data', async () => {
    const incompleteStory = story()
    incompleteStory.steps[6] = {
      ...incompleteStory.steps[6],
      status: 'MISSING',
      route: '/job-experiments?demoFlag=true'
    }
    vi.mocked(getPortfolioDemoStorylineApi).mockResolvedValue(incompleteStory)

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('演示主线仍有缺口')
    expect(wrapper.text()).toContain('状态不可用：job-experiment-review')
  })
})
