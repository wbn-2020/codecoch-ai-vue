import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CareerCalendarGrid from '@/views/v4/career-calendar/components/CareerCalendarGrid.vue'

const events = [
  {
    id: 1,
    title: '技术面试',
    eventType: 'TECHNICAL_INTERVIEW',
    startsAt: '2026-07-20T10:00:00',
    endsAt: '2026-07-20T11:00:00',
    timezone: 'Asia/Shanghai',
    preparationStatus: 'READY'
  },
  {
    id: 2,
    title: '投递跟进',
    eventType: 'FOLLOW_UP',
    startsAt: '2026-07-21T10:00:00',
    endsAt: '2026-07-21T10:30:00',
    timezone: 'Asia/Shanghai'
  }
]

describe('CareerCalendarGrid interview preparation entry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T09:00:00+08:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('only exposes preparation for supported interview events', async () => {
    const wrapper = mount(CareerCalendarGrid, {
      props: {
        events,
        loading: false,
        errorMessage: '',
        timezone: 'Asia/Shanghai'
      },
      global: {
        directives: { loading: {} },
        stubs: {
          'el-alert': true,
          'el-button': {
            template: '<button @click="$emit(\'click\')"><slot /></button>'
          },
          'el-dropdown': true,
          'el-dropdown-menu': true,
          'el-dropdown-item': true
        }
      }
    })

    const buttons = wrapper.findAll('[data-testid="prepare-interview-event"]')
    expect(buttons).toHaveLength(1)
    await buttons[0].trigger('click')
    expect(wrapper.emitted('prepare')?.[0]?.[0]).toEqual(expect.objectContaining({
      id: 1,
      eventType: 'TECHNICAL_INTERVIEW'
    }))
  })

  it('marks stale preparation as expired and offers regeneration instead of treating it as ready', async () => {
    const wrapper = mount(CareerCalendarGrid, {
      props: {
        events: [{
          ...events[0],
          preparationStale: true
        }],
        loading: false,
        errorMessage: '',
        timezone: 'Asia/Shanghai'
      },
      global: {
        directives: { loading: {} },
        stubs: {
          'el-alert': true,
          'el-button': {
            template: '<button @click="$emit(\'click\')"><slot /></button>'
          },
          'el-dropdown': true,
          'el-dropdown-menu': true,
          'el-dropdown-item': true
        }
      }
    })

    const button = wrapper.get('[data-testid="prepare-interview-event"]')
    expect(button.classes()).toContain('is-stale')
    expect(button.classes()).not.toContain('has-preparation')
    expect(button.text()).toContain('已过期，重新生成')
    expect(button.attributes('title')).toContain('准备包已过期')
    expect(button.attributes('title')).toContain('重新生成')

    await button.trigger('click')
    expect(wrapper.emitted('prepare')?.[0]?.[0]).toEqual(expect.objectContaining({
      id: 1,
      preparationStale: true
    }))
  })
})
