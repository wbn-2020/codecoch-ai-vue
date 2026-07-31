import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import StatusTag from '@/components/common/StatusTag.vue'

const mountStatusTag = (status: string) => mount(StatusTag, {
  props: { status },
  global: {
    stubs: {
      'el-tag': {
        props: ['type'],
        template: '<span class="el-tag-stub" :data-type="type"><slot /></span>'
      }
    }
  }
})

describe('StatusTag', () => {
  it.each([
    ['TODO', 'primary'],
    ['DOING', 'warning'],
    ['DONE', 'success'],
    ['SKIPPED', 'info'],
    ['EXPIRED', 'danger']
  ])('maps %s to its semantic tone', (status, tone) => {
    expect(mountStatusTag(status).find('.el-tag-stub').attributes('data-type')).toBe(tone)
  })

  it('keeps task status labels aligned with the built-in tone mapping', () => {
    expect(mountStatusTag('TODO').text()).not.toBe('TODO')
    expect(mountStatusTag('EXPIRED').text()).not.toBe('EXPIRED')
  })
})
