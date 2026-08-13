import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import QuestionPracticeSessionView from '@/views/question/QuestionPracticeSessionView.vue'

const routeState = vi.hoisted(() => ({
  query: { mode: 'random' } as Record<string, string>
}))
const questionApi = vi.hoisted(() => ({
  getQuestions: vi.fn(),
  submitReview: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeState.query, params: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}))

vi.mock('@/api/question', () => ({
  getFavoriteQuestionsApi: vi.fn(),
  getQuestionDetailApi: vi.fn(),
  getQuestionsApi: questionApi.getQuestions,
  getWrongQuestionsApi: vi.fn(),
  submitQuestionAnswerReviewApi: questionApi.submitReview,
  updateQuestionMasteryApi: vi.fn()
}))

vi.mock('@/utils/dangerAction', () => ({
  confirmDangerActionPreview: vi.fn()
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn()
  }
}))

const stubs = {
  AppState: true,
  MarkdownPreview: true,
  'el-alert': true,
  'el-button': {
    props: ['disabled', 'loading'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-button-group': {
    template: '<div><slot /></div>'
  },
  'el-form': {
    template: '<form><slot /></form>'
  },
  'el-form-item': {
    template: '<div><slot /></div>'
  },
  'el-input': {
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue'],
    template: '<textarea :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  'el-input-number': true,
  'el-option': true,
  'el-progress': true,
  'el-select': true,
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

const QUESTION = {
  id: 101,
  title: 'Redis 缓存穿透如何处理？',
  content: '请说明缓存穿透的处理方案。',
  difficulty: 'MEDIUM',
  favorite: false
}

const mountSession = () => mount(QuestionPracticeSessionView, {
  global: { stubs }
})

const startSession = async (wrapper: ReturnType<typeof mountSession>) => {
  await flushPromises()
}

const submitCurrentAnswer = async (wrapper: ReturnType<typeof mountSession>) => {
  await wrapper.find('textarea').setValue('先说明缓存穿透的边界，再使用布隆过滤器和空值缓存处理。')
  await wrapper.findAll('button').find((button) => button.text().includes('提交 AI 点评'))!.trigger('click')
  await flushPromises()
}

describe('QuestionPracticeSessionView answer review flow', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    routeState.query = { mode: 'random' }
    questionApi.getQuestions.mockResolvedValue({ records: [QUESTION] })
  })

  it('submits the answer-review contract and renders the returned score and feedback', async () => {
    routeState.query = {
      mode: 'random',
      sourceType: 'SKILL_PROFILE',
      targetJobId: '42'
    }
    questionApi.submitReview.mockResolvedValue({
      id: 9001,
      questionId: QUESTION.id,
      reviewStatus: 'SUCCESS',
      score: 86,
      level: '良好',
      summary: '结论清晰，但项目指标还可以更具体。',
      strengths: ['说明了布隆过滤器'],
      weaknesses: ['缺少误判率边界'],
      improvementSuggestions: ['补充空值缓存过期策略'],
      suggestedFollowUps: ['布隆过滤器误判如何处理？'],
      knowledgePoints: ['缓存穿透', '布隆过滤器']
    })

    const wrapper = mountSession()
    await startSession(wrapper)
    await submitCurrentAnswer(wrapper)

    expect(questionApi.submitReview).toHaveBeenCalledWith(QUESTION.id, {
      answerContent: '先说明缓存穿透的边界，再使用布隆过滤器和空值缓存处理。',
      answerDurationSeconds: expect.any(Number),
      source: 'SKILL_PROFILE',
      targetJobId: 42
    })
    expect(wrapper.text()).toContain('本次真实评分')
    expect(wrapper.text()).toContain('86')
    expect(wrapper.text()).toContain('说明了布隆过滤器')
    expect(wrapper.text()).toContain('缺少误判率边界')
    expect(wrapper.text()).toContain('补充空值缓存过期策略')
    expect(wrapper.text()).toContain('布隆过滤器误判如何处理？')
    expect(wrapper.text()).not.toContain('答对 +18 XP')
    expect(wrapper.text()).not.toContain('回答通过')

    await wrapper.find('input[type="checkbox"]').setValue(true)
    expect(wrapper.text()).toContain('缓存穿透')
    expect(wrapper.text()).toContain('布隆过滤器')
  })

  it('keeps an isolated draft after failure and clears it after a successful review', async () => {
    routeState.query = { mode: 'random', targetJobId: '42' }
    questionApi.submitReview.mockRejectedValueOnce(new Error('submit failed'))

    const wrapper = mountSession()
    await startSession(wrapper)
    await submitCurrentAnswer(wrapper)

    const draftKey = 'question-practice-draft:101:random:42'
    expect(localStorage.getItem(draftKey)).toContain('布隆过滤器')
    expect(wrapper.find('textarea').element.value).toContain('布隆过滤器')

    questionApi.submitReview.mockResolvedValueOnce({
      id: 9002,
      questionId: QUESTION.id,
      reviewStatus: 'SUCCESS',
      score: 72
    })
    await wrapper.findAll('button').find((button) => button.text().includes('提交 AI 点评'))!.trigger('click')
    await flushPromises()

    expect(localStorage.getItem(draftKey)).toBeNull()
    expect(localStorage.getItem('question-practice-draft:101:random:all')).toBeNull()
  })

  it('keeps the draft when the API returns a failed PracticeRecordVO', async () => {
    questionApi.submitReview.mockResolvedValue({
      id: 9003,
      questionId: QUESTION.id,
      reviewStatus: 'FAILED',
      errorMessage: 'review failed'
    })

    const wrapper = mountSession()
    await startSession(wrapper)
    await submitCurrentAnswer(wrapper)

    expect(localStorage.getItem('question-practice-draft:101:random:all')).toContain('布隆过滤器')
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('本次真实评分')
  })

  it('shows suggested answer length and the real scoring-point toggle', async () => {
    const wrapper = mountSession()
    await startSession(wrapper)

    expect(wrapper.findAll('.practice-question-card')).toHaveLength(1)
    expect(wrapper.findAll('.practice-support-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('建议 180-300 字')
    expect(wrapper.text()).toContain('显示真实评分点')
    expect(wrapper.text()).toContain('可引用项目证据')
  })
})
