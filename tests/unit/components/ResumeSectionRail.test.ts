import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ResumeSectionRail from '@/views/resume/components/ResumeSectionRail.vue'

describe('ResumeSectionRail', () => {
  it('marks invalid sections accessibly and emits their selection', async () => {
    const wrapper = mount(ResumeSectionRail, {
      props: {
        items: [
          { id: 'resume-basic', label: '基本信息', done: true },
          { id: 'resume-skills', label: '技能栈', done: false, invalid: true }
        ],
        activeId: 'resume-basic',
        completion: 50,
        hasStarted: true,
        exportReadyCount: 1,
        exportTotal: 2
      }
    })

    const invalidButton = wrapper.findAll('.wb-sec-list .wb-sec-item')[1]
    expect(invalidButton.classes()).toContain('wb-sec-item--invalid')
    expect(invalidButton.attributes('aria-invalid')).toBe('true')
    expect(invalidButton.text()).toContain('技能栈')
    expect(invalidButton.find('svg[aria-label="需修正"]').exists()).toBe(true)

    await invalidButton.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['resume-skills']])
  })
})
