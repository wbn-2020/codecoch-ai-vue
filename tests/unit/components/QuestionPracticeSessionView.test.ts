import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useGameProfileStore } from '@/features/game-profile'
import QuestionPracticeSessionView from '@/views/question/QuestionPracticeSessionView.vue'

const questionApi = vi.hoisted(() => ({
  getQuestions: vi.fn(),
  submitAnswer: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, params: {} }),
  useRouter: () => ({ push: vi.fn() })
}))

vi.mock('@/api/question', () => ({
  getFavoriteQuestionsApi: vi.fn(),
  getQuestionDetailApi: vi.fn(),
  getQuestionsApi: questionApi.getQuestions,
  getWrongQuestionsApi: vi.fn(),
  submitQuestionAnswerApi: questionApi.submitAnswer,
  updateQuestionMasteryApi: vi.fn()
}))

vi.mock('@/utils/dangerAction', () => ({
  confirmDangerActionPreview: vi.fn()
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    warning: vi.fn()
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
  await wrapper.findAll('button').find((button) => button.text().includes('开始本轮训练'))!.trigger('click')
  await flushPromises()
}

const submitCurrentAnswer = async (wrapper: ReturnType<typeof mountSession>) => {
  await wrapper.find('textarea').setValue('先说明缓存穿透的边界，再使用布隆过滤器和空值缓存处理。')
  await wrapper.findAll('button').find((button) => button.text().includes('提交答案'))!.trigger('click')
  await flushPromises()
}

describe('QuestionPracticeSessionView XP rewards', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    questionApi.getQuestions.mockResolvedValue({ records: [QUESTION] })
  })

  it('awards practice_correct once after a correct answer result is applied', async () => {
    questionApi.submitAnswer.mockResolvedValue({
      recordId: 9001,
      questionId: QUESTION.id,
      answerResult: 'CORRECT',
      answeredAt: '2026-07-31T08:00:00Z'
    })

    const wrapper = mountSession()
    await startSession(wrapper)
    await submitCurrentAnswer(wrapper)

    const profile = useGameProfileStore()
    expect(profile.xp).toBe(18)
    expect(profile.xpRewards).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event: 'practice_correct',
        rewardKey: 'practice:answer:9001'
      })
    ]))

    wrapper.unmount()
    const repeatedWrapper = mountSession()
    await startSession(repeatedWrapper)
    await submitCurrentAnswer(repeatedWrapper)

    expect(useGameProfileStore().xp).toBe(18)
    expect(questionApi.submitAnswer).toHaveBeenCalledTimes(2)
  })

  it('does not award XP for wrong answers, failed submission, or question loading failure', async () => {
    questionApi.submitAnswer.mockResolvedValue({
      recordId: 9002,
      questionId: QUESTION.id,
      answerResult: 'WRONG',
      answeredAt: '2026-07-31T08:00:00Z'
    })

    const wrongWrapper = mountSession()
    await startSession(wrongWrapper)
    await submitCurrentAnswer(wrongWrapper)

    expect(useGameProfileStore().xp).toBe(0)
    wrongWrapper.unmount()

    questionApi.getQuestions.mockRejectedValueOnce(new Error('load failed'))
    const loadFailureWrapper = mountSession()
    await startSession(loadFailureWrapper)

    expect(useGameProfileStore().xp).toBe(0)
    loadFailureWrapper.unmount()

    questionApi.submitAnswer.mockRejectedValueOnce(new Error('submit failed'))
    const failedSubmitWrapper = mountSession()
    await startSession(failedSubmitWrapper)
    await submitCurrentAnswer(failedSubmitWrapper)

    expect(useGameProfileStore().xp).toBe(0)
  })

  it('uses the direction D single-task answer surface after training starts', async () => {
    const wrapper = mountSession()
    await startSession(wrapper)

    expect(wrapper.findAll('.practice-question-card')).toHaveLength(1)
    expect(wrapper.findAll('.practice-support-card')).toHaveLength(2)
    expect(wrapper.find('.active-grid').exists()).toBe(false)
    expect(wrapper.find('.side-stack').exists()).toBe(false)
    expect(wrapper.text()).toContain('评分点提示（可关）')
    expect(wrapper.text()).toContain('可引用项目证据')
  })
})
