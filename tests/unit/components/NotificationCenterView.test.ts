import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import NotificationCenterView from '@/views/user/NotificationCenterView.vue'

const routerPush = vi.hoisted(() => vi.fn())
const requestPost = vi.hoisted(() => vi.fn())
const confirmDangerActionPreview = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/api/notification', () => ({
  getNotificationsApi: vi.fn(),
  getUnreadCountApi: vi.fn(),
  markAllNotificationsReadApi: vi.fn(),
  markNotificationReadApi: vi.fn()
}))

vi.mock('@/utils/dangerAction', () => ({
  confirmDangerActionPreview
}))

vi.mock('@/utils/notificationEvents', () => ({
  notifyUnreadChanged: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: {
    post: requestPost
  }
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  }
}))

const {
  getNotificationsApi,
  getUnreadCountApi,
  markNotificationReadApi
} = await import('@/api/notification')

const componentStubs = {
  AppState: {
    template: '<div class="app-state-stub"><slot /></div>'
  },
  Bell: true,
  BellOff: true,
  CheckCheck: true,
  ExternalLink: true,
  LayoutDashboard: true,
  RefreshCw: true,
  'el-alert': {
    props: ['title', 'description'],
    template: '<div class="el-alert-stub" :data-title="title" :data-description="description"></div>'
  },
  'el-button': {
    template: '<button class="el-button-stub" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-dialog': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<div class="el-dialog-stub"><slot /><slot name="footer" /></div>'
  },
  'el-option': {
    template: '<option class="el-option-stub"><slot /></option>'
  },
  'el-pagination': {
    template: '<div class="el-pagination-stub"></div>'
  },
  'el-radio-button': {
    props: ['value'],
    template: '<button class="el-radio-button-stub"><slot /></button>'
  },
  'el-radio-group': {
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template: '<div class="el-radio-group-stub"><slot /></div>'
  },
  'el-select': {
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template: '<div class="el-select-stub"><slot /></div>'
  },
  'el-tag': {
    template: '<span class="el-tag-stub"><slot /></span>'
  }
}

const mountView = async () => {
  const wrapper = mount(NotificationCenterView, {
    global: {
      stubs: componentStubs,
      directives: {
        loading: () => undefined
      }
    }
  })
  await flushPromises()
  return wrapper
}

describe('NotificationCenterView deep link contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerPush.mockResolvedValue(undefined)
    requestPost.mockReturnValue(Promise.resolve({}))
    confirmDangerActionPreview.mockResolvedValue(true)
    vi.mocked(getUnreadCountApi).mockResolvedValue({ total: 1, unreadCount: 1 })
    vi.mocked(markNotificationReadApi).mockResolvedValue(null)
  })

  it('prefers backend reminder deep link and emits a stable target key on click', async () => {
    vi.mocked(getNotificationsApi).mockResolvedValue({
      records: [{
        id: 11,
        title: '继续该训练',
        content: '打开任务中心继续执行',
        type: 'AGENT_REMINDER',
        isRead: 0,
        createdAt: '2026-06-27 09:00:00',
        bizType: 'AGENT_TASK',
        bizId: 'run-42',
        relatedType: 'AGENT_TASK',
        relatedId: 'run-42',
        actionUrl: '/agent/custom-route?bizId=run-42',
        fallbackPath: '/agent/today',
        fallbackLabel: '今日计划'
      }],
      total: 1,
      current: 1,
      size: 20
    })

    const wrapper = await mountView()
    await wrapper.find('.notification-item').trigger('click')
    await flushPromises()

    const actionButtons = wrapper.findAll('.el-button-stub')
    await actionButtons[actionButtons.length - 1].trigger('click')
    await flushPromises()

    expect(routerPush).toHaveBeenCalledWith('/agent/custom-route?bizId=run-42')
    expect(requestPost).toHaveBeenCalledWith('/agent/metrics/events', expect.objectContaining({
      eventCode: 'reminder_clicked',
      targetPath: '/agent/custom-route?bizId=run-42',
      metadata: expect.objectContaining({
        targetKey: 'notification:11:/agent/custom-route?bizId=run-42',
        targetPath: '/agent/custom-route?bizId=run-42',
        fallbackPath: '/agent/today'
      })
    }), { silentError: true })
  })

  it('falls back when backend deep link is unsafe and records the same target key on invalid events', async () => {
    vi.mocked(getNotificationsApi).mockResolvedValue({
      records: [{
        id: 12,
        title: '继续该训练',
        content: '打开任务中心继续执行',
        type: 'AGENT_REMINDER',
        isRead: 0,
        createdAt: '2026-06-27 09:00:00',
        bizType: 'AGENT_TASK',
        bizId: 'run-99',
        relatedType: 'AGENT_TASK',
        relatedId: 'run-99',
        actionUrl: 'https://evil.example/phish',
        fallbackPath: '/agent/today',
        fallbackLabel: '今日计划'
      }],
      total: 1,
      current: 1,
      size: 20
    })

    const wrapper = await mountView()
    await wrapper.find('.notification-item').trigger('click')
    await flushPromises()

    const actionButtons = wrapper.findAll('.el-button-stub')
    await actionButtons[actionButtons.length - 1].trigger('click')
    await flushPromises()

    expect(routerPush).toHaveBeenCalledWith('/agent/today')
    expect(requestPost).toHaveBeenCalledWith('/agent/metrics/events', expect.objectContaining({
      eventCode: 'reminder_target_invalid',
      metadata: expect.objectContaining({
        reason: 'unsafe_target_path',
        targetKey: 'notification:12:https://evil.example/phish',
        targetPath: 'https://evil.example/phish',
        fallbackPath: '/agent/today'
      })
    }), { silentError: true })
  })

  it('routes generated question batches to task center without treating batchId as questionId', async () => {
    vi.mocked(getNotificationsApi).mockResolvedValue({
      records: [{
        id: 21,
        title: '题目生成完成',
        content: '已生成 3 道题目，请前往审核',
        type: 'TASK_DONE',
        isRead: 0,
        createdAt: '2026-06-27 10:00:00',
        bizType: 'QUESTION_GENERATE',
        bizId: 'batch-20260627',
        relatedType: 'QUESTION_GENERATE',
        relatedId: 'batch-20260627'
      }],
      total: 1,
      current: 1,
      size: 20
    })

    const wrapper = await mountView()
    await wrapper.find('.notification-item').trigger('click')
    await flushPromises()

    const actionButtons = wrapper.findAll('.el-button-stub')
    await actionButtons[actionButtons.length - 1].trigger('click')
    await flushPromises()

    expect(routerPush).toHaveBeenCalledWith('/agent/tasks?bizType=question.generate&bizId=batch-20260627&batchId=batch-20260627')
    expect(routerPush).not.toHaveBeenCalledWith('/admin/ai/questions/generate?batchId=batch-20260627&reviewStatus=PENDING')
    expect(routerPush).not.toHaveBeenCalledWith('/questions/batch-20260627')
  })

  it('routes recommendation generation batches to recommendation results with batchId query', async () => {
    vi.mocked(getNotificationsApi).mockResolvedValue({
      records: [{
        id: 22,
        title: '题目推荐已生成',
        content: '已根据差距报告生成推荐题目',
        type: 'TASK_DONE',
        isRead: 0,
        createdAt: '2026-06-27 10:05:00',
        bizType: 'QUESTION_RECOMMENDATION_GENERATE',
        bizId: '8801',
        relatedType: 'QUESTION_RECOMMENDATION_GENERATE',
        relatedId: '8801'
      }],
      total: 1,
      current: 1,
      size: 20
    })

    const wrapper = await mountView()
    await wrapper.find('.notification-item').trigger('click')
    await flushPromises()

    const actionButtons = wrapper.findAll('.el-button-stub')
    await actionButtons[actionButtons.length - 1].trigger('click')
    await flushPromises()

    expect(routerPush).toHaveBeenCalledWith('/questions/recommendations?batchId=8801')
    expect(routerPush).not.toHaveBeenCalledWith('/questions/8801')
  })
})
