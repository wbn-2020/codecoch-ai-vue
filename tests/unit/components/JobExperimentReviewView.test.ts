import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { generateJobExperimentReviewApi, getJobExperimentDetailApi } from '@/api/jobExperiment'
import JobExperimentReviewView from '@/views/job-experiment/JobExperimentReviewView.vue'

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: '9' },
    query: { demoFlag: 'true' }
  }),
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/api/jobExperiment', () => ({
  generateJobExperimentReviewApi: vi.fn(),
  getJobExperimentDetailApi: vi.fn()
}))

const componentStubs = {
  AiResultFeedback: {
    props: ['scene', 'bizType', 'bizId'],
    template: '<div class="ai-feedback-stub" :data-scene="scene" :data-biz-type="bizType" :data-biz-id="bizId">feedback</div>'
  },
  SuggestionEvidencePanel: {
    props: ['suggestion'],
    emits: ['open-action'],
    template: `
      <section class="suggestion-evidence-panel-stub">
        <strong class="suggestion-title">{{ suggestion?.title }}</strong>
        <p class="suggestion-confidence">{{ suggestion?.confidenceLevel }}</p>
        <p v-if="suggestion?.sampleInsufficient" class="suggestion-sample-warning">{{ suggestion?.sampleWarning }}</p>
        <button class="suggestion-action" type="button" @click="$emit('open-action', suggestion?.nextAction)">action</button>
        <span
          v-for="source in suggestion?.evidenceSources || []"
          :key="source.sourceType + source.sourceId"
          class="suggestion-source"
        >
          {{ source.sourceType }} #{{ source.sourceId }} {{ source.evidenceSummary || source.sourceSummary }}
        </span>
        <span class="suggestion-feedback-context">
          {{ suggestion?.scene }} {{ suggestion?.bizType }} {{ suggestion?.bizId }}
        </span>
        <AiResultFeedback :scene="suggestion?.scene" :biz-type="suggestion?.bizType" :biz-id="suggestion?.bizId" />
      </section>
    `
  },
  'el-alert': {
    props: ['title', 'description'],
    template: '<div class="el-alert-stub"><strong>{{ title }}</strong><span>{{ description }}</span><slot /></div>'
  },
  'el-button': {
    template: '<button class="el-button-stub" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>'
  },
  'el-tag': {
    template: '<span class="el-tag-stub"><slot /></span>'
  }
}

const reviewDetail = (overrides: Record<string, unknown> = {}) => ({
  id: 9,
  title: '简历 A/B 投递实验',
  goal: '验证项目证据对面试邀约的影响',
  status: 'RUNNING',
  demoFlag: 1,
  relations: [],
  reviews: [],
  latestReview: {
    id: 301,
    experimentId: 9,
    factSummary: '已投递 4 个岗位，收到 1 次反馈。',
    insightSummary: '候选现象：带项目证据的版本更容易获得回复，但样本太少。',
    unsupportedConclusion: '不能得出项目证据版本显著优于其他版本的结论。',
    sampleWarning: '当前只有 4 次投递和 0 次完成面试，样本不足。',
    nextAction: '继续投递 6 个同方向岗位，并补齐项目证据。',
    confidenceLevel: 'LOW',
    strategy: {
      title: '继续收集同方向样本',
      content: '先保持岗位方向一致，再比较不同简历版本的回复率。',
      confidenceLevel: 'LOW',
      sampleInsufficient: true,
      sampleWarning: '当前只有 4 次投递和 0 次完成面试，样本不足。',
      actionUrl: '/agent/today?source=jobExperiment',
      evidenceSources: [
        {
          sourceType: 'PROJECT_EVIDENCE',
          sourceId: 77,
          sourceSummary: '项目证据只展示脱敏摘要'
        }
      ]
    }
  },
  metrics: {
    applicationCount: 4,
    feedbackCount: 1,
    interviewInviteCount: 0,
    interviewCompletedCount: 0,
    offerCount: 0,
    rejectedCount: 1,
    resumeVersionCount: 2,
    targetJobCount: 1,
    projectEvidenceCount: 1,
    agentTaskCount: 2,
    sampleCount: 4,
    confidenceLevel: 'LOW',
    sampleInsufficient: true,
    sampleWarning: '当前只有 4 次投递和 0 次完成面试，样本不足。',
    facts: ['投递样本 4 个', '完成面试 0 次']
  },
  ...overrides
})

const mountReview = async () => {
  const wrapper = mount(JobExperimentReviewView, {
    global: {
      directives: {
        loading: {}
      },
      stubs: componentStubs
    }
  })
  await flushPromises()
  return wrapper
}

describe('JobExperimentReviewView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerPush.mockResolvedValue(undefined)
    vi.mocked(generateJobExperimentReviewApi).mockResolvedValue({
      id: 301,
      experimentId: 9
    })
  })

  it('separates review facts, sample limits, unsupported conclusions, strategy, and next actions for low sample data', async () => {
    vi.mocked(getJobExperimentDetailApi).mockResolvedValue({
      id: 9,
      title: '简历 A/B 投递实验',
      goal: '验证项目证据对面试邀约的影响',
      status: 'RUNNING',
      relations: [],
      reviews: [],
      latestReview: {
        id: 301,
        experimentId: 9,
        factSummary: '已投递 4 个岗位，收到 1 次反馈。',
        insightSummary: '候选现象：带项目证据的版本更容易获得回复，但样本太少。',
        unsupportedConclusion: '不能得出项目证据版本显著优于其他版本的结论。',
        sampleWarning: '当前只有 4 次投递和 0 次完成面试，样本不足。',
        nextAction: '继续投递 6 个同方向岗位，并补齐项目证据。',
        confidenceLevel: 'LOW',
        strategy: {
          title: '继续收集同方向样本',
          content: '先保持岗位方向一致，再比较不同简历版本的回复率。'
        }
      },
      metrics: {
        applicationCount: 4,
        feedbackCount: 1,
        interviewInviteCount: 0,
        interviewCompletedCount: 0,
        offerCount: 0,
        rejectedCount: 1,
        resumeVersionCount: 2,
        targetJobCount: 1,
        projectEvidenceCount: 1,
        agentTaskCount: 2,
        sampleCount: 4,
        confidenceLevel: 'LOW',
        sampleInsufficient: true,
        sampleWarning: '当前只有 4 次投递和 0 次完成面试，样本不足。',
        facts: ['投递样本 4 个', '完成面试 0 次'],
        unsupportedConclusions: ['不能得出项目证据版本显著优于其他版本的结论。']
      }
    })

    const wrapper = await mountReview()

    expect(wrapper.text()).toContain('事实摘要')
    expect(wrapper.text()).toContain('样本限制')
    expect(wrapper.text()).toContain('不支持结论')
    expect(wrapper.text()).toContain('策略建议')
    expect(wrapper.text()).toContain('下一步行动')
    expect(wrapper.text()).toContain('低置信度')
    expect(wrapper.text()).toContain('当前只有 4 次投递和 0 次完成面试，样本不足。')
    expect(wrapper.text()).toContain('不能得出项目证据版本显著优于其他版本的结论。')
    expect(wrapper.text()).toContain('先保持岗位方向一致，再比较不同简历版本的回复率。')
    expect(wrapper.text()).toContain('Agent 今日任务')
    expect(wrapper.text()).toContain('简历')
    expect(wrapper.text()).toContain('项目证据')
    expect(wrapper.text()).toContain('继续投递/目标岗位')
    expect(wrapper.text()).toContain('模拟面试')
  })

  it('keeps the demo flag when navigating from the portfolio demo route', async () => {
    vi.mocked(getJobExperimentDetailApi).mockResolvedValue({
      id: 9,
      title: '演示投递实验',
      status: 'RUNNING',
      demoFlag: 1,
      relations: [],
      reviews: [],
      metrics: {
        applicationCount: 3,
        feedbackCount: 1,
        interviewInviteCount: 0,
        interviewCompletedCount: 0,
        offerCount: 0,
        rejectedCount: 1,
        resumeVersionCount: 1,
        targetJobCount: 1,
        projectEvidenceCount: 1,
        agentTaskCount: 1,
        sampleCount: 3,
        confidenceLevel: 'LOW',
        sampleInsufficient: true
      }
    })

    const wrapper = await mountReview()
    await wrapper.findAll('.el-button-stub')[0].trigger('click')
    await wrapper.findAll('.el-button-stub').find((button) => button.text() === 'Agent 今日任务')?.trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/job-experiments/9?demoFlag=true')
    expect(routerPush).toHaveBeenCalledWith('/agent/today?demoFlag=true')
  })

  it('uses current metrics for page-level confidence when the latest review is stale', async () => {
    vi.mocked(getJobExperimentDetailApi).mockResolvedValue(reviewDetail({
      latestReview: {
        id: 301,
        experimentId: 9,
        factSummary: '旧复盘：投递 4 条。',
        insightSummary: '旧复盘只支持弱建议。',
        unsupportedConclusion: '旧复盘不能判断策略有效性。',
        sampleWarning: '旧复盘：投递少于 5 条。',
        nextAction: '旧复盘建议补样本。',
        confidenceLevel: 'LOW',
        strategy: {
          title: '旧复盘策略',
          content: '旧复盘内容。',
          confidenceLevel: 'LOW',
          sampleInsufficient: true,
          sampleWarning: '旧复盘：投递少于 5 条。',
          unsupportedConclusions: ['旧复盘不能判断策略有效性。'],
          evidenceSources: []
        }
      },
      metrics: {
        applicationCount: 12,
        feedbackCount: 4,
        interviewInviteCount: 3,
        interviewCompletedCount: 3,
        offerCount: 1,
        rejectedCount: 2,
        resumeVersionCount: 2,
        targetJobCount: 1,
        projectEvidenceCount: 2,
        agentTaskCount: 2,
        sampleCount: 12,
        confidenceLevel: 'HIGH',
        sampleInsufficient: false,
        sampleWarning: '样本可用于高置信复盘，但仍需说明岗位、渠道、时间窗口等影响因素。',
        facts: ['投递数：12', '完成面试数：3'],
        unsupportedConclusions: ['不能完全归因到单一因素，需结合岗位、渠道、简历和面试样本人工复核。']
      }
    }))

    const wrapper = await mountReview()

    expect(wrapper.text()).toContain('可作为候选判断')
    expect(wrapper.text()).toContain('高置信度')
    expect(wrapper.text()).toContain('样本可用于高置信复盘')
    expect(wrapper.text()).toContain('不能完全归因到单一因素')
    expect(wrapper.text()).not.toContain('低样本弱建议')
  })

  it('does not fall back to stale review warnings when current metrics have no warning', async () => {
    vi.mocked(getJobExperimentDetailApi).mockResolvedValue(reviewDetail({
      latestReview: {
        id: 301,
        experimentId: 9,
        factSummary: 'OLD_FACT',
        insightSummary: 'OLD_INSIGHT',
        unsupportedConclusion: 'OLD_UNSUPPORTED_CONCLUSION',
        sampleWarning: 'OLD_SAMPLE_WARNING',
        nextAction: 'OLD_NEXT_ACTION',
        confidenceLevel: 'LOW',
        strategy: {
          title: 'OLD_STRATEGY',
          content: 'OLD_STRATEGY_CONTENT',
          confidenceLevel: 'LOW',
          sampleInsufficient: true,
          sampleWarning: 'OLD_STRATEGY_WARNING',
          unsupportedConclusions: ['OLD_STRATEGY_UNSUPPORTED'],
          evidenceSources: []
        }
      },
      strategy: {
        title: 'SERVER_STRATEGY',
        content: 'SERVER_STRATEGY_CONTENT',
        confidenceLevel: 'HIGH',
        sampleInsufficient: false,
        sampleWarning: '',
        unsupportedConclusions: []
      },
      metrics: {
        applicationCount: 12,
        feedbackCount: 4,
        interviewInviteCount: 3,
        interviewCompletedCount: 3,
        offerCount: 1,
        rejectedCount: 2,
        resumeVersionCount: 2,
        targetJobCount: 1,
        projectEvidenceCount: 2,
        agentTaskCount: 2,
        sampleCount: 12,
        confidenceLevel: 'HIGH',
        sampleInsufficient: false,
        sampleWarning: '',
        facts: ['SERVER_FACT_CURRENT'],
        unsupportedConclusions: []
      }
    }))

    const wrapper = await mountReview()

    expect(wrapper.text()).toContain('SERVER_FACT_CURRENT')
    expect(wrapper.text()).toContain('SERVER_STRATEGY_CONTENT')
    expect(wrapper.text()).not.toContain('OLD_SAMPLE_WARNING')
    expect(wrapper.text()).not.toContain('OLD_STRATEGY_WARNING')
    expect(wrapper.text()).not.toContain('OLD_UNSUPPORTED_CONCLUSION')
    expect(wrapper.text()).not.toContain('OLD_STRATEGY_UNSUPPORTED')
  })

  it('uses the current weak strategy instead of stale strong review text for low sample metrics', async () => {
    vi.mocked(getJobExperimentDetailApi).mockResolvedValue(reviewDetail({
      latestReview: {
        id: 301,
        experimentId: 9,
        factSummary: 'OLD_FACT',
        insightSummary: 'OLD_STRONG_INSIGHT',
        unsupportedConclusion: 'OLD_UNSUPPORTED',
        sampleWarning: 'OLD_WARNING',
        nextAction: 'OLD_STRONG_NEXT_ACTION',
        confidenceLevel: 'HIGH',
        strategy: {
          title: 'OLD_STRONG_TITLE',
          content: 'OLD_STRONG_STRATEGY_CONTENT',
          confidenceLevel: 'HIGH',
          sampleInsufficient: false,
          sampleWarning: '',
          unsupportedConclusions: [],
          evidenceSources: []
        }
      },
      strategy: {
        title: 'SERVER_WEAK_TITLE',
        content: 'SERVER_WEAK_STRATEGY_CONTENT',
        confidenceLevel: 'LOW',
        sampleInsufficient: true,
        sampleWarning: 'SERVER_LOW_SAMPLE_WARNING',
        unsupportedConclusions: ['SERVER_UNSUPPORTED_CONCLUSION']
      },
      metrics: {
        applicationCount: 3,
        feedbackCount: 1,
        interviewInviteCount: 0,
        interviewCompletedCount: 0,
        offerCount: 0,
        rejectedCount: 1,
        resumeVersionCount: 1,
        targetJobCount: 1,
        projectEvidenceCount: 1,
        agentTaskCount: 1,
        sampleCount: 3,
        confidenceLevel: 'LOW',
        sampleInsufficient: true,
        sampleWarning: 'SERVER_LOW_SAMPLE_WARNING',
        facts: ['SERVER_LOW_FACT'],
        unsupportedConclusions: ['SERVER_UNSUPPORTED_CONCLUSION']
      }
    }))

    const wrapper = await mountReview()

    expect(wrapper.text()).toContain('SERVER_WEAK_STRATEGY_CONTENT')
    expect(wrapper.text()).toContain('SERVER_LOW_SAMPLE_WARNING')
    expect(wrapper.text()).toContain('SERVER_UNSUPPORTED_CONCLUSION')
    expect(wrapper.text()).not.toContain('OLD_STRONG_INSIGHT')
    expect(wrapper.text()).not.toContain('OLD_STRONG_NEXT_ACTION')
    expect(wrapper.text()).not.toContain('OLD_STRONG_STRATEGY_CONTENT')
  })

  it('maps the review strategy to an explainable suggestion with sample insufficiency and evidence sources', async () => {
    vi.mocked(getJobExperimentDetailApi).mockResolvedValue(reviewDetail())

    const wrapper = await mountReview()

    expect(wrapper.find('.suggestion-evidence-panel-stub').exists()).toBe(true)
    expect(wrapper.find('.suggestion-title').text()).toContain('继续收集同方向样本')
    expect(wrapper.find('.suggestion-confidence').text()).toContain('LOW')
    expect(wrapper.find('.suggestion-sample-warning').text()).toContain('样本不足')
    expect(wrapper.text()).toContain('PROJECT_EVIDENCE #77 项目证据只展示脱敏摘要')
  })

  it('passes job experiment strategy feedback context with the review id first', async () => {
    vi.mocked(getJobExperimentDetailApi).mockResolvedValue(reviewDetail())

    const wrapper = await mountReview()
    const feedbackContext = wrapper.find('.suggestion-feedback-context')

    expect(feedbackContext.text()).toContain('JOB_EXPERIMENT_STRATEGY')
    expect(feedbackContext.text()).toContain('JOB_EXPERIMENT_REVIEW')
    expect(feedbackContext.text()).toContain('301')
    expect(wrapper.text()).toContain('JOB_EXPERIMENT_STRATEGY JOB_EXPERIMENT_REVIEW 301')
  })

  it('falls back to a safe route instead of navigating directly to an external strategy actionUrl', async () => {
    vi.mocked(getJobExperimentDetailApi).mockResolvedValue(reviewDetail({
      latestReview: {
        id: 301,
        experimentId: 9,
        confidenceLevel: 'LOW',
        strategy: {
          title: '外部链接需要拦截',
          content: '不要直接跳转外部地址。',
          confidenceLevel: 'LOW',
          sampleInsufficient: true,
          sampleWarning: '样本不足。',
          actionUrl: 'https://evil.example/phish',
          evidenceSources: []
        }
      }
    }))

    const wrapper = await mountReview()
    await wrapper.find('.suggestion-action').trigger('click')

    expect(routerPush).not.toHaveBeenCalledWith('https://evil.example/phish')
    expect(routerPush).toHaveBeenCalledWith('/agent/today?demoFlag=true')
  })
})
