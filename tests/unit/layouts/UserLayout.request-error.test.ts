import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import UserLayout from '@/layouts/UserLayout.vue'
import { REQUEST_ERROR_EVENT, type RequestErrorDiagnostic } from '@/utils/errorEvents'

const routePath = ref('/dashboard')
const routeMeta = ref<Record<string, unknown>>({})
const userMessageApi = vi.hoisted(() => ({
  closeTransientErrors: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    get fullPath() {
      return routePath.value
    },
    get meta() {
      return routeMeta.value
    }
  }),
  useRouter: () => ({
    go: vi.fn(),
    push: vi.fn()
  })
}))

vi.mock('@/config', () => ({
  appConfig: {
    demoReadOnly: false
  }
}))

vi.mock('@/features/game-profile', () => ({
  useGameProfileStore: () => ({
    resetSession: vi.fn()
  })
}))

vi.mock('@/router/adminAccess', () => ({
  resolveAdminEntryPath: () => null
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    logout: vi.fn(),
    userInfo: null,
    verifyAdminSession: vi.fn()
  })
}))

vi.mock('@/stores/tagsView', () => ({
  useTagsViewStore: () => ({
    clearVisitedViews: vi.fn()
  })
}))

vi.mock('@/utils/userMessage', () => ({
  showUserMessage: {
    closeTransientErrors: userMessageApi.closeTransientErrors
  }
}))

const mountLayout = () => mount(UserLayout, {
  global: {
    stubs: {
      UserAppShell: {
        template: '<div class="user-app-shell-stub"><slot /></div>'
      },
      CommandPalette: true,
      RouteErrorBoundary: {
        template: '<div><slot /></div>'
      },
      RouterView: {
        template: '<div><slot :Component="undefined" /></div>'
      },
      XpGainToast: true
    }
  }
})

const dispatchDiagnostic = (routePathValue: string, message: string) => {
  const detail: RequestErrorDiagnostic = {
    id: `test-${routePathValue}`,
    message,
    category: 'server',
    categoryLabel: '服务异常',
    retryable: true,
    nextAction: '稍后重试并保留错误编号。',
    routePath: routePathValue,
    occurredAt: '2026-08-16T00:00:00.000Z'
  }
  window.dispatchEvent(new CustomEvent<RequestErrorDiagnostic>(REQUEST_ERROR_EVENT, { detail }))
}

describe('UserLayout request error ownership', () => {
  afterEach(() => {
    routePath.value = '/dashboard'
    routeMeta.value = {}
    userMessageApi.closeTransientErrors.mockReset()
    document.body.classList.remove('is-user-layout-active', 'user-overlay-theme')
  })

  it('clears the error panel on navigation and ignores late errors owned by the previous route', async () => {
    const wrapper = mountLayout()

    dispatchDiagnostic('/dashboard', '准备度加载失败，请稍后重试。')
    await nextTick()
    expect(wrapper.get('.user-request-error').text()).toContain('准备度加载失败')
    expect(wrapper.get('.user-request-error').text()).toContain('服务异常')
    expect(wrapper.get('.user-request-error').text()).toContain('稍后重试并保留错误编号')
    expect(wrapper.get('.user-request-error__actions').text()).toContain('重试当前页')

    routePath.value = '/questions/recommendations'
    await nextTick()
    expect(wrapper.find('.user-request-error').exists()).toBe(false)
    expect(userMessageApi.closeTransientErrors).toHaveBeenCalledTimes(1)

    dispatchDiagnostic('/dashboard', '旧请求失败')
    await nextTick()
    expect(wrapper.find('.user-request-error').exists()).toBe(false)

    dispatchDiagnostic('/questions/recommendations', '推荐题加载失败')
    await nextTick()
    expect(wrapper.get('.user-request-error').text()).toContain('推荐题加载失败')

    wrapper.unmount()
  })

  it('does not offer blind retry for a non-retryable validation failure', async () => {
    const wrapper = mountLayout()
    const detail: RequestErrorDiagnostic = {
      id: 'validation-error',
      message: '模型名称不能为空',
      category: 'validation',
      categoryLabel: '输入校验',
      retryable: false,
      nextAction: '检查必填项后重新提交。',
      routePath: '/dashboard',
      occurredAt: '2026-08-16T00:00:00.000Z'
    }

    window.dispatchEvent(new CustomEvent<RequestErrorDiagnostic>(REQUEST_ERROR_EVENT, { detail }))
    await nextTick()

    expect(wrapper.get('.user-request-error').text()).toContain('检查必填项后重新提交')
    expect(wrapper.get('.user-request-error__actions').text()).not.toContain('重试当前页')
    wrapper.unmount()
  })
})
