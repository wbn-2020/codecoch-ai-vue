import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { defineComponent, h, onMounted, onUnmounted, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const route = vi.hoisted(() => ({
  path: '/admin/question-reviews',
  fullPath: '/admin/question-reviews',
  query: {} as Record<string, unknown>
}))
const router = vi.hoisted(() => ({ push: vi.fn() }))
const emptyPage = () => Promise.resolve({ records: [], total: 0 })
const questionApi = vi.hoisted(() => ({
  approveQuestionReviewApi: vi.fn(),
  batchApproveQuestionReviewsApi: vi.fn(),
  batchIgnoreQuestionDuplicateReviewApi: vi.fn(),
  batchMergeQuestionDuplicateReviewApi: vi.fn(),
  batchRejectQuestionReviewsApi: vi.fn(),
  cancelQuestionReviewApi: vi.fn(),
  checkQuestionDuplicateApi: vi.fn(),
  createAdminQuestionApi: vi.fn(),
  deleteAdminQuestionApi: vi.fn(),
  deleteQuestionDuplicateEvalCaseApi: vi.fn(),
  downloadQuestionImportTemplate: vi.fn(),
  evaluateQuestionDuplicateApi: vi.fn(),
  exportAdminQuestionsApi: vi.fn(),
  generateAiQuestionsApi: vi.fn(),
  getAdminQuestionDetailApi: vi.fn(),
  getAdminQuestionsApi: vi.fn(),
  getQuestionEmbeddingStatsApi: vi.fn(),
  getQuestionDuplicateEvalCasesApi: vi.fn(),
  getQuestionDuplicateEvalRunApi: vi.fn(),
  getQuestionDuplicateEvalRunsApi: vi.fn(),
  getQuestionDuplicateReviewsApi: vi.fn(),
  getQuestionDuplicateReviewDetailApi: vi.fn(),
  getQuestionDuplicateFeedbackStatsApi: vi.fn(),
  getQuestionReviewDetailApi: vi.fn(),
  getQuestionReviewsApi: vi.fn(),
  ignoreQuestionDuplicateReviewApi: vi.fn(),
  importAdminQuestionsApi: vi.fn(),
  mergeQuestionDuplicateReviewApi: vi.fn(),
  rebuildQuestionEmbeddingApi: vi.fn(),
  rejectQuestionReviewApi: vi.fn(),
  retryFailedQuestionEmbeddingApi: vi.fn(),
  runQuestionDuplicateEvalApi: vi.fn(),
  saveQuestionDuplicateEvalCaseApi: vi.fn(),
  streamAiQuestionGenerateApi: vi.fn(),
  submitAiQuestionGenerateApi: vi.fn(),
  sweepQuestionDuplicateThresholdApi: vi.fn(),
  updateAdminQuestionApi: vi.fn(),
  updateAdminQuestionStatusApi: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router
}))
vi.mock('@/api/question', () => questionApi)
vi.mock('@/api/analytics', () => ({
  getQuestionDuplicateConfigApi: vi.fn().mockResolvedValue({})
}))
vi.mock('@/api/questionCategory', () => ({
  getQuestionCategoriesApi: vi.fn().mockResolvedValue([])
}))
vi.mock('@/api/questionGroup', () => ({
  getQuestionGroupsApi: vi.fn().mockResolvedValue([])
}))
vi.mock('@/api/questionTag', () => ({
  getQuestionTagsApi: vi.fn().mockResolvedValue([])
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ hasPermission: () => true })
}))

import QuestionManageView from '@/views/admin/QuestionManageView.vue'
import QuestionDuplicateReviewView from '@/views/admin/QuestionDuplicateReviewView.vue'

const lifecycleEvents: string[] = []
let paneInstance = 0

const SlotBoundary = defineComponent({
  setup(_, { slots }) {
    return () => h('div', { 'data-test': 'governance-boundary' }, slots.default?.())
  }
})

const TabsStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', { 'data-test': 'tabs' }, slots.default?.())
  }
})

const PaneStub = defineComponent({
  props: {
    name: {
      type: String,
      required: true
    }
  },
  setup(props, { slots }) {
    const instance = ++paneInstance
    onMounted(() => lifecycleEvents.push(`mounted:${props.name}:${instance}`))
    onUnmounted(() => lifecycleEvents.push(`unmounted:${props.name}:${instance}`))
    return () => h(
      'section',
      {
        'data-test': 'governance-pane',
        'data-name': props.name,
        'data-instance': instance
      },
      slots.default?.()
    )
  }
})

const AppStateStub = defineComponent({
  props: {
    title: String,
    description: String
  },
  setup(props, { slots }) {
    return () => h('section', [
      h('h2', props.title),
      h('p', props.description),
      slots.default?.()
    ])
  }
})

const mountGovernance = (
  initialGovernanceTab: 'reviews' | 'duplicates',
  paneStub = PaneStub,
  useActualBoundary = false
) => shallowMount(QuestionManageView, {
  props: {
    governanceOnly: true,
    initialGovernanceTab
  },
  global: {
    config: {
      warnHandler: () => undefined
    },
    directives: {
      loading: () => undefined,
      permission: () => undefined
    },
    stubs: {
      RouteErrorBoundary: useActualBoundary ? false : SlotBoundary,
      AppState: AppStateStub,
      'el-tabs': TabsStub,
      'el-tab-pane': paneStub,
      'el-table-column': true
    }
  }
})

describe('question governance lifecycle isolation', () => {
  beforeEach(() => {
    lifecycleEvents.length = 0
    paneInstance = 0
    route.path = '/admin/question-reviews'
    route.fullPath = '/admin/question-reviews'
    route.query = {}
    router.push.mockReset()
    questionApi.getAdminQuestionsApi.mockImplementation(emptyPage)
    questionApi.getQuestionReviewsApi.mockImplementation(emptyPage)
    questionApi.getQuestionDuplicateReviewsApi.mockImplementation(emptyPage)
    questionApi.getQuestionDuplicateEvalCasesApi.mockImplementation(emptyPage)
    questionApi.getQuestionDuplicateEvalRunsApi.mockImplementation(emptyPage)
    questionApi.getQuestionDuplicateFeedbackStatsApi.mockResolvedValue({})
  })

  it('replaces same-type tab panes during reviews and duplicates round trips', async () => {
    const wrapper = mountGovernance('reviews')
    await flushPromises()

    const firstInstance = wrapper.get('[data-test="governance-pane"]').attributes('data-instance')
    expect(wrapper.get('[data-test="governance-pane"]').attributes('data-name')).toBe('reviews')

    await wrapper.setProps({ initialGovernanceTab: 'duplicates' })
    await flushPromises()
    const duplicateInstance = wrapper.get('[data-test="governance-pane"]').attributes('data-instance')

    expect(wrapper.get('[data-test="governance-pane"]').attributes('data-name')).toBe('duplicates')
    expect(duplicateInstance).not.toBe(firstInstance)
    expect(lifecycleEvents).toContain(`unmounted:reviews:${firstInstance}`)

    await wrapper.setProps({ initialGovernanceTab: 'reviews' })
    await flushPromises()
    const returnedInstance = wrapper.get('[data-test="governance-pane"]').attributes('data-instance')

    expect(wrapper.get('[data-test="governance-pane"]').attributes('data-name')).toBe('reviews')
    expect(returnedInstance).not.toBe(duplicateInstance)
    expect(lifecycleEvents).toContain(`unmounted:duplicates:${duplicateInstance}`)
  })

  it('keeps the real review and duplicate route components isolated during back-and-forth navigation', async () => {
    const page = ref<'reviews' | 'duplicates'>('reviews')
    const RouteHost = defineComponent({
      setup() {
        return () => page.value === 'reviews'
          ? h(QuestionManageView, { governanceOnly: true, initialGovernanceTab: 'reviews' })
          : h(QuestionDuplicateReviewView)
      }
    })
    const wrapper = mount(RouteHost, {
      global: {
        config: {
          warnHandler: () => undefined
        },
        directives: {
          loading: () => undefined,
          permission: () => undefined
        },
        stubs: {
          RouteErrorBoundary: SlotBoundary,
          AppState: AppStateStub,
          'el-tabs': TabsStub,
          'el-tab-pane': PaneStub,
          'el-table-column': true
        }
      }
    })
    await flushPromises()
    expect(wrapper.get('[data-test="governance-pane"]').attributes('data-name')).toBe('reviews')

    page.value = 'duplicates'
    await flushPromises()
    expect(wrapper.find('.question-duplicate-review-view').exists()).toBe(true)
    expect(wrapper.get('[data-test="governance-pane"]').attributes('data-name')).toBe('duplicates')

    page.value = 'reviews'
    await flushPromises()
    expect(wrapper.find('.question-duplicate-review-view').exists()).toBe(false)
    expect(wrapper.get('[data-test="governance-pane"]').attributes('data-name')).toBe('reviews')
  })

  it('survives a full unmount and fresh mount without retaining pane anchors', async () => {
    const first = mountGovernance('duplicates')
    await flushPromises()
    const firstInstance = first.get('[data-test="governance-pane"]').attributes('data-instance')
    first.unmount()

    const refreshed = mountGovernance('duplicates')
    await flushPromises()
    const refreshedInstance = refreshed.get('[data-test="governance-pane"]').attributes('data-instance')

    expect(refreshedInstance).not.toBe(firstInstance)
    expect(lifecycleEvents).toContain(`unmounted:duplicates:${firstInstance}`)
    expect(refreshed.get('[data-test="governance-pane"]').attributes('data-name')).toBe('duplicates')
  })

  it('isolates a governance subtree render failure behind the local retry boundary', async () => {
    const ThrowingPane = defineComponent({
      props: { name: String },
      setup(props) {
        return () => {
          throw new Error(`${props.name} pane render failed`)
        }
      }
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const wrapper = mountGovernance('duplicates', ThrowingPane, true)
    await flushPromises()

    expect(wrapper.text()).toContain('当前页面暂时不可用')
    expect(wrapper.text()).toContain('当前页面暂时没有加载成功')
    expect(wrapper.find('.route-error-boundary').exists()).toBe(true)
    consoleError.mockRestore()
  })
})
