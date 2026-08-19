import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import ArenaTrainView from '@/views/question/ArenaTrainView.vue'

const skillOverview = vi.hoisted(() => ({ value: { profileId: 5 } as Record<string, unknown> }))
const gapItems = vi.hoisted(() => ({ value: [] as unknown[] }))
const studyPlans = vi.hoisted(() => ({ value: { records: [] as unknown[] } }))
const matchReports = vi.hoisted(() => ({ value: { records: [] as unknown[] } }))
const routeQuery = vi.hoisted(() => ({ value: {} as Record<string, string> }))
const routerPush = vi.hoisted(() => vi.fn())
const matchReportDetail = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }))
const recommendationBatches = vi.hoisted(() => ({ value: { records: [] as unknown[] } }))
const recommendationApi = vi.hoisted(() => ({
  getQuestionRecommendationBatchesApi: vi.fn(async () => recommendationBatches.value),
  submitQuestionRecommendationsFromMatchReportApi: vi.fn(),
  getQuestionRecommendationBatchItemsApi: vi.fn()
}))
const skillProfileApi = vi.hoisted(() => ({
  generateSkillProfileApi: vi.fn()
}))

vi.mock('@/api/questionRecommendation', () => ({
  getQuestionRecommendationBatchDetailApi: vi.fn(),
  getQuestionRecommendationBatchItemsApi: recommendationApi.getQuestionRecommendationBatchItemsApi,
  getQuestionRecommendationBatchesApi: recommendationApi.getQuestionRecommendationBatchesApi,
  getQuestionRecommendationItemsFromGapBatchApi: vi.fn(async () => gapItems.value),
  getQuestionRecommendationItemsFromMatchReportBatchApi: vi.fn(async () => []),
  getQuestionRecommendationItemsFromStudyPlanBatchApi: vi.fn(async () => []),
  submitQuestionRecommendationsFromGapApi: vi.fn(),
  submitQuestionRecommendationsFromMatchReportApi: recommendationApi.submitQuestionRecommendationsFromMatchReportApi,
  submitQuestionRecommendationsFromStudyPlanApi: vi.fn()
}))
vi.mock('@/api/resumeJobMatch', () => ({
  getResumeJobMatchReportDetailApi: vi.fn(async () => matchReportDetail.value),
  getResumeJobMatchReportsApi: vi.fn(async () => matchReports.value)
}))
vi.mock('@/api/skillProfile', () => ({
  getSkillProfileOverviewApi: vi.fn(async () => skillOverview.value),
  generateSkillProfileApi: skillProfileApi.generateSkillProfileApi
}))
vi.mock('@/api/studyPlan', () => ({
  getStudyPlansApi: vi.fn(async () => studyPlans.value)
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
  useRoute: () => ({ path: '/questions/recommendations', fullPath: '/questions/recommendations', query: routeQuery.value, meta: {} })
}))

const flush = async () => {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

const mountTrain = () => mount(ArenaTrainView)

const LEVEL_ITEMS = [
  {
    id: 101,
    questionTitle: 'HashMap 扩容机制讲清楚',
    skillName: 'Java 集合',
    difficulty: 'MEDIUM',
    questionType: 'SHORT_ANSWER',
    gapSeverity: 'HIGH',
    practiceQuestionId: 501,
    recommendReason: '岗位 JD 明确要求集合源码能力',
    answerHint: '先讲负载因子，再讲树化阈值',
    evaluatePoints: '源码细节与权衡',
    trustStatus: 'VERIFIED'
  },
  {
    id: 102,
    questionTitle: 'RocketMQ 顺序消息如何落地',
    skillName: '消息队列',
    difficulty: 'HARD',
    questionType: 'SCENARIO',
    gapSeverity: 'CRITICAL',
    practiceQuestionId: 502,
    recommendReason: '匹配报告指出消息中间件缺口',
    trustStatus: 'PARTIAL'
  }
]

describe('ArenaTrainView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    skillOverview.value = { profileId: 5 }
    gapItems.value = []
    studyPlans.value = { records: [] }
    matchReports.value = { records: [] }
    routeQuery.value = {}
    matchReportDetail.value = null
    recommendationBatches.value = { records: [] }
    recommendationApi.getQuestionRecommendationBatchesApi.mockReset()
    recommendationApi.getQuestionRecommendationBatchesApi.mockResolvedValue(recommendationBatches.value)
    recommendationApi.getQuestionRecommendationBatchItemsApi.mockReset()
    recommendationApi.submitQuestionRecommendationsFromMatchReportApi.mockReset()
    skillProfileApi.generateSkillProfileApi.mockReset()
    routerPush.mockReset()
  })

  it('renders the compact direction D preview rows from real recommendation items', async () => {
    gapItems.value = LEVEL_ITEMS
    const wrapper = mountTrain()
    await flush()

    expect(wrapper.text()).toContain('面试训练计划')
    expect(wrapper.text()).toContain('HashMap 扩容机制讲清楚')
    expect(wrapper.text()).toContain('★★☆ 中等')
    expect(wrapper.text()).toContain('★★★ 困难')
    expect(wrapper.text()).toContain('答后复盘')
    expect(wrapper.text()).toContain('开始推荐题组')
    // 今日重点汇总技能
    expect(wrapper.text()).toContain('Java 集合')
    expect(wrapper.text()).toContain('消息队列')
    // 错题复盘入口
    expect(wrapper.text()).toContain('错题复盘')
  })

  it('shows the hero plan name from the first actionable item', async () => {
    gapItems.value = LEVEL_ITEMS
    const wrapper = mountTrain()
    await flush()

    expect(wrapper.text()).toContain('今天先练：Java 集合')
    expect(wrapper.text()).toContain('2 道可练')
  })

  it('routes a private recommendation draft into the practice session instead of disabling it as an unmatched public question', async () => {
    gapItems.value = [{
      id: 301,
      batchId: 401,
      questionTitle: '高并发订单扣减如何保证一致性',
      skillName: '分布式事务',
      difficulty: 'HARD',
      questionType: 'SCENARIO',
      answerHint: '说明锁、消息幂等和补偿机制',
      evaluatePoints: '并发控制、幂等、失败补偿',
      canPractice: true,
      practiceKind: 'PRIVATE_RECOMMENDATION',
      trustStatus: 'VERIFIED',
      sourceType: 'RESUME_JOB_MATCH',
      sourceId: 88
    }]
    const wrapper = mountTrain()
    await flush()

    const questionButton = wrapper.find('.arena-train__question-row')
    expect(questionButton.attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('1 道可练')

    await questionButton.trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      path: '/questions/practice',
      query: expect.objectContaining({
        mode: 'recommended',
        recommendationItemIds: '301',
        sourceType: 'RESUME_JOB_MATCH',
        sourceId: '88',
        autoStart: 'true'
      })
    })
  })

  it('falls back to honest generic training when no trusted source exists', async () => {
    skillOverview.value = { profileId: undefined }
    const wrapper = mountTrain()
    await flush()

    expect(wrapper.text()).toContain('暂无可信专项来源，先做通用训练')
    expect(wrapper.text()).toContain('还没有可用能力画像')
    expect(wrapper.text()).toContain('先练一组通用题')
    expect(wrapper.text()).toContain('来源不足，通用训练')
    expect(wrapper.text()).toContain('先做一组通用训练')
  })

  it('shows the empty state with regenerate entry when a source resolves but returns no items', async () => {
    gapItems.value = []
    const wrapper = mountTrain()
    await flush()

    expect(wrapper.text()).toContain('暂时没有推荐题')
    expect(wrapper.text()).toContain('重新生成')
  })

  it('submits a JD-specific batch when a trusted match report has no prior recommendation batch', async () => {
    routeQuery.value = { source: 'matchReport', matchReportId: '9', targetJobId: '88' }
    matchReportDetail.value = {
      reportId: 9,
      status: 'SUCCESS',
      trustStatus: 'VERIFIED',
      fallback: false,
      schemaWarningCount: 0,
      schemaWarnings: []
    }
    skillProfileApi.generateSkillProfileApi.mockResolvedValue({ profileId: 5, status: 'SUCCESS' })
    recommendationApi.submitQuestionRecommendationsFromMatchReportApi.mockResolvedValue({
      batchId: 17,
      status: 'GENERATING',
      questionCount: 10,
      aiCallLogId: 19,
      sourceType: 'RESUME_JOB_MATCH',
      sourceId: 9,
      trustStatus: 'PARTIAL',
      asyncMessageId: 'message-17'
    })
    const wrapper = mountTrain()
    await flush()

    expect(skillProfileApi.generateSkillProfileApi).toHaveBeenCalledWith({ matchReportId: 9 })
    expect(recommendationApi.submitQuestionRecommendationsFromMatchReportApi)
      .toHaveBeenCalledWith({ matchReportId: 9, questionCount: 10 })
    expect(wrapper.text()).toContain('题组正在准备')
  })

  it('switches source tabs and keeps arena tab styling hooks', async () => {
    gapItems.value = LEVEL_ITEMS
    const wrapper = mountTrain()
    await flush()

    const tabs = wrapper.findAll('.arena-train__tabs button')
    expect(tabs.length).toBe(3)
    expect(tabs[0].text()).toContain('能力短板')
    expect(tabs[1].text()).toContain('简历匹配')
    expect(tabs[2].text()).toContain('学习计划')
    expect(tabs[0].classes()).toContain('is-active')
  })

  it('keeps recommendation evidence in the secondary controls rather than each preview row', async () => {
    gapItems.value = LEVEL_ITEMS
    const wrapper = mountTrain()
    await flush()

    expect(wrapper.findAll('.arena-train__question-detail')).toHaveLength(0)
    expect(wrapper.find('.arena-train__controls').text()).toContain('能力短板')
    expect(wrapper.find('.arena-train__controls').text()).toContain('训练设置与推荐依据')
  })

  it('keeps the rest of a recommendation batch reachable after the compact three-question preview', async () => {
    gapItems.value = [
      ...LEVEL_ITEMS,
      {
        id: 103,
        questionTitle: 'Redis 缓存穿透如何处理',
        skillName: 'Redis',
        difficulty: 'MEDIUM',
        questionType: 'SCENARIO',
        practiceQuestionId: 503,
        trustStatus: 'VERIFIED'
      },
      {
        id: 104,
        questionTitle: '线程池参数如何估算',
        skillName: '并发编程',
        difficulty: 'HARD',
        questionType: 'SHORT_ANSWER',
        practiceQuestionId: 504,
        trustStatus: 'VERIFIED'
      }
    ]
    const wrapper = mountTrain()
    await flush()

    expect(wrapper.findAll('.arena-train__level')).toHaveLength(3)
    expect(wrapper.find('.arena-train__remaining').text()).toContain('还有 1 题')
    expect(wrapper.find('.arena-train__remaining').text()).toContain('开始题组查看全部')
  })

  it('keeps one preview card with compact rows instead of a stack of full question workbenches', async () => {
    gapItems.value = LEVEL_ITEMS
    const wrapper = mountTrain()
    await flush()

    expect(wrapper.findAll('.arena-train__preview-card')).toHaveLength(1)
    expect(wrapper.findAll('.arena-train__question-row')).toHaveLength(2)
    expect(wrapper.findAll('.arena-train__question-detail')).toHaveLength(0)
    expect(wrapper.findAll('.arena-train__side > .arena-train__panel')).toHaveLength(3)
    expect(wrapper.findAll('.arena-train__week .is-done')).toHaveLength(0)
  })
})
