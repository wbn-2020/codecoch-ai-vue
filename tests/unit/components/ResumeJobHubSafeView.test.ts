import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import ResumeJobHubSafeView from '@/views/resume/ResumeJobHubSafeView.vue'

const asyncModuleState = vi.hoisted(() => ({
  definitionCount: 0,
  loadAttempts: 0
}))

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()

  return {
    ...actual,
    defineAsyncComponent(options: Parameters<typeof actual.defineAsyncComponent>[0]) {
      asyncModuleState.definitionCount += 1
      const definitionNumber = asyncModuleState.definitionCount

      return actual.defineAsyncComponent({
        ...options,
        loader: async () => {
          asyncModuleState.loadAttempts += 1
          if (definitionNumber === 1) {
            throw new Error('resume hub chunk unavailable')
          }

          return {
            template: '<div data-testid="resume-job-hub">Resume job hub recovered</div>'
          }
        }
      })
    }
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() })
}))

vi.mock('@/utils/error', () => ({
  getErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback
}))

const stubs = {
  'el-button': {
    props: ['loading'],
    emits: ['click'],
    template: '<button :disabled="loading" @click="$emit(\'click\')"><slot /></button>'
  },
  AppState: {
    props: ['description'],
    template: '<div class="app-state-stub">{{ description }}<slot /></div>'
  }
}

const settleAsyncComponent = async () => {
  await flushPromises()
  await flushPromises()
}

describe('ResumeJobHubSafeView', () => {
  it('starts a fresh async component load cycle when retrying a failed hub chunk', async () => {
    const wrapper = mount(ResumeJobHubSafeView, {
      global: {
        stubs
      }
    })

    await settleAsyncComponent()

    expect(asyncModuleState.definitionCount).toBe(1)
    expect(asyncModuleState.loadAttempts).toBe(2)
    expect(wrapper.find('.resume-entry-safe').exists()).toBe(true)
    expect(wrapper.find('[data-testid="resume-job-hub"]').exists()).toBe(false)

    await wrapper.find('.safe-hero button').trigger('click')
    await settleAsyncComponent()

    expect(asyncModuleState.definitionCount).toBe(2)
    expect(asyncModuleState.loadAttempts).toBe(3)
    expect(
      wrapper.find('[data-testid="resume-job-hub"]').exists(),
      wrapper.html()
    ).toBe(true)
    expect(wrapper.find('[data-testid="resume-job-hub"]').text()).toBe('Resume job hub recovered')
    expect(wrapper.find('.resume-entry-safe').exists()).toBe(false)
  })
})
