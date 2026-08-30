import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'

import MetricCard from './MetricCard.vue'
import ModuleTabs, { type ModuleTabItem } from './ModuleTabs.vue'

const routePath = ref('/job-targets')
const routeName = ref<string | undefined>(undefined)

const mountModuleTabs = (items: ModuleTabItem[]) =>
  mount(ModuleTabs, {
    props: { items },
    global: {
      components: {
        RouterLink: {
          props: ['to'],
          template: '<a :data-to="to"><slot /></a>'
        }
      },
      mocks: {
        $route: {
          get path() {
            return routePath.value
          },
          get fullPath() {
            return routePath.value
          },
          get name() {
            return routeName.value
          }
        }
      }
    }
  })

describe('user UI components', () => {
  beforeEach(() => {
    routePath.value = '/job-targets'
    routeName.value = undefined
  })

  it('marks the matching module tab active without activating sibling routes', () => {
    const wrapper = mountModuleTabs([
      { label: '岗位目标', to: '/job-targets', exact: true },
      { label: 'JD 匹配', to: '/resume-match' }
    ])

    expect(wrapper.get('[data-to="/job-targets"]').classes()).toContain('is-active')
    expect(wrapper.get('[data-to="/resume-match"]').classes()).not.toContain('is-active')
  })

  it('prevents navigation for disabled module tabs', async () => {
    const wrapper = mountModuleTabs([{ label: '暂不可用', to: '/future', disabled: true }])

    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    wrapper.get('[data-to="/job-targets"]').element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.get('[data-to="/job-targets"]').attributes('aria-disabled')).toBe('true')
  })

  it('uses the most specific configured path match for nested routes', () => {
    routePath.value = '/questions/wrong-records'

    const wrapper = mountModuleTabs([
      { label: '题库浏览', to: '/questions', prefixes: ['/questions'] },
      { label: '错题复盘', to: '/questions/wrong-records', exactPaths: ['/questions/wrong-records'] }
    ])

    expect(wrapper.get('[data-to="/questions"]').classes()).not.toContain('is-active')
    expect(wrapper.get('[data-to="/questions/wrong-records"]').classes()).toContain('is-active')
  })

  it('renders metric values and their stable test selector', () => {
    const wrapper = mount(MetricCard, {
      props: {
        label: '岗位准备度',
        value: '--',
        detail: '证据不足',
        testId: 'readiness'
      }
    })

    expect(wrapper.get('[data-testid="readiness"]').text()).toBe('--')
    expect(wrapper.text()).toContain('证据不足')
  })
})
