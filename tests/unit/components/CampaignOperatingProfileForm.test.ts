import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import CampaignOperatingProfileForm from '@/components/v8/campaign-cockpit/CampaignOperatingProfileForm.vue'

describe('CampaignOperatingProfileForm', () => {
  it('emits normalized operating profile values', async () => {
    const wrapper = mount(CampaignOperatingProfileForm, {
      props: {
        modelValue: {
          campaignId: 6,
          configured: true,
          weeklyApplicationTarget: 6,
          weeklyTimeBudgetMinutes: 240,
          maxActiveOpportunities: 7,
          staleAfterDays: 8,
          defaultFollowUpDays: 4,
          focusRoles: ['Java'],
          focusLocations: ['上海'],
          focusChannels: ['官网'],
          timezone: 'Asia/Shanghai',
          lockVersion: 2
        }
      },
      global: {
        stubs: {
          'el-alert': true,
          'el-button': { template: '<button><slot /></button>' },
          'el-input': true,
          'el-input-number': true,
          'el-tag': { template: '<span><slot /></span>' }
        }
      }
    })

    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState
    setupState.focusRolesText = 'Java, 平台工程, Java'
    setupState.focusLocationsText = '上海，远程'
    setupState.focusChannelsText = '官网, 内推'
    setupState.submit()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      weeklyApplicationTarget: 6,
      weeklyTimeBudgetMinutes: 240,
      maxActiveOpportunities: 7,
      focusRoles: ['Java', '平台工程'],
      focusLocations: ['上海', '远程'],
      focusChannels: ['官网', '内推'],
      timezone: 'Asia/Shanghai',
      expectedLockVersion: 2
    })
  })
})
