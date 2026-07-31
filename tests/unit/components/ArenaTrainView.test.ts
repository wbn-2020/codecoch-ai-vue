import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import ArenaTrainView from '@/views/question/ArenaTrainView.vue'

const skillOverview = vi.hoisted(() => ({ value: { profileId: 5 } as Record<string, unknown> }))
const gapItems = vi.hoisted(() => ({ value: [] as unknown[] }))
const studyPlans = vi.hoisted(() => ({ value: { records: [] as unknown[] } }))
const matchReports = vi.hoisted(() => ({ value: { records: [] as unknown[] } }))

vi.mock('@/api/questionRecommendation', () => ({
  getQuestionRecommendationBatchDetailApi: vi.fn(),
  getQuestionRecommendationBatchItemsApi: vi.fn(),
  getQuestionRecommendationItemsFromGapBatchApi: vi.fn(async () => gapItems.value),
  getQuestionRecommendationItemsFromMatchReportBatchApi: vi.fn(async () => []),
  getQuestionRecommendationItemsFromStudyPlanBatchApi: vi.fn(async () => []),
  submitQuestionRecommendationsFromGapApi: vi.fn(),
  submitQuestionRecommendationsFromMatchReportApi: vi.fn(),
  submitQuestionRecommendationsFromStudyPlanApi: vi.fn()
}))
vi.mock('@/api/resumeJobMatch', () => ({
  getResumeJobMatchReportDetailApi: vi.fn(),
  getResumeJobMatchReportsApi: vi.fn(async () => matchReports.value)
}))
vi.mock('@/api/skillProfile', () => ({
  getSkillProfileOverviewApi: vi.fn(async () => skillOverview.value)
}))
vi.mock('@/api/studyPlan', () => ({
  getStudyPlansApi: vi.fn(async () => studyPlans.value)
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/questions/recommendations', fullPath: '/questions/recommendations', query: {}, meta: {} })
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
  })

  it('renders level cards from real recommendation items with rank, stars and xp tag', async () => {
    gapItems.value = LEVEL_ITEMS
    const wrapper = mountTrain()
    await flush()

    expect(wrapper.text()).toContain('今日主关')
    expect(wrapper.text()).toContain('HashMap 扩容机制讲清楚')
    expect(wrapper.text()).toContain('★★☆ 中等')
    expect(wrapper.text()).toContain('★★★ 困难')
    expect(wrapper.text()).toContain('高风险')
    expect(wrapper.text()).toContain('关键短板')
    expect(wrapper.text()).toContain('可直接练')
    expect(wrapper.text()).toContain('+18 XP/答对')
    expect(wrapper.text()).toContain('开始推荐题组')
    // 今日重点汇总技能
    expect(wrapper.text()).toContain('Java 集合')
    expect(wrapper.text()).toContain('消息队列')
    // 复活点入口
    expect(wrapper.text()).toContain('复活点 · 错题复盘')
  })

  it('shows the hero plan name from the first actionable item', async () => {
    gapItems.value = LEVEL_ITEMS
    const wrapper = mountTrain()
    await flush()

    expect(wrapper.text()).toContain('今天先练：Java 集合')
    expect(wrapper.text()).toContain('2 道可练')
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

  it('renders trust and reason evidence per level card', async () => {
    gapItems.value = LEVEL_ITEMS
    const wrapper = mountTrain()
    await flush()

    expect(wrapper.text()).toContain('为什么练这题')
    expect(wrapper.text()).toContain('岗位 JD 明确要求集合源码能力')
    expect(wrapper.text()).toContain('证据已记录')
    expect(wrapper.text()).toContain('部分证据')
  })
})
