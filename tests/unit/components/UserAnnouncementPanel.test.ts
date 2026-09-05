import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth'
import UserAnnouncementPanel from '@/views/user/components/UserAnnouncementPanel.vue'

vi.mock('@/api/announcement', () => ({
  getPublishedAnnouncementsApi: vi.fn()
}))

const { getPublishedAnnouncementsApi } = await import('@/api/announcement')

const announcements = [
  {
    id: '2082011113656750082',
    title: '服务升级通知',
    content: '本周六将进行服务升级。',
    type: 'MAINTENANCE',
    status: 1,
    targetUsers: 'ALL',
    publishedAt: '2026-08-15 09:00:00'
  },
  {
    id: '2082011113656750083',
    title: '安全提醒',
    content: '请定期检查账号安全设置。',
    type: 'SECURITY',
    status: 0,
    targetUsers: 'INTERNAL_SEGMENT',
    publishedAt: '2026-08-16 10:00:00'
  }
]

const componentStubs = {
  AppState: {
    template: '<div class="app-state-stub"><slot /></div>'
  },
  'el-button': {
    template: '<button class="el-button-stub" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-dialog': {
    props: ['modelValue', 'title'],
    template: '<div class="el-dialog-stub" :data-open="modelValue" :data-title="title"><slot /><slot name="footer" /></div>'
  },
  'el-tag': {
    template: '<span class="el-tag-stub"><slot /></span>'
  }
}

const mountPanel = async () => {
  const wrapper = mount(UserAnnouncementPanel, {
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

describe('UserAnnouncementPanel', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
    useAuthStore().setUserInfo({
      id: 42,
      username: 'alice',
      roles: []
    })
    vi.mocked(getPublishedAnnouncementsApi).mockReset()
    vi.mocked(getPublishedAnnouncementsApi).mockResolvedValue(announcements)
  })

  it('renders every announcement returned by the user endpoint without inferring visibility', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.findAll('.announcement-item')).toHaveLength(2)
    expect(wrapper.text()).toContain('服务升级通知')
    expect(wrapper.text()).toContain('安全提醒')
    expect(wrapper.text()).not.toContain('INTERNAL_SEGMENT')
  })

  it('records reading state for the current account and exposes announcement details', async () => {
    const wrapper = await mountPanel()
    const firstAnnouncement = wrapper.get(`[data-announcement-id="${announcements[0].id}"]`)

    expect(firstAnnouncement.text()).toContain('未读')
    await firstAnnouncement.trigger('click')

    expect(firstAnnouncement.text()).toContain('本机已读')
    expect(wrapper.get('.el-dialog-stub').attributes('data-title')).toBe('服务升级通知')
    expect(wrapper.get('.announcement-detail').text()).toContain('本周六将进行服务升级。')

    const storageKey = 'codecoachai:user-announcements:read:v1:42'
    expect(JSON.parse(window.localStorage.getItem(storageKey) || '[]')).toContain(announcements[0].id)

    wrapper.unmount()
    const restoredWrapper = await mountPanel()
    expect(restoredWrapper.get(`[data-announcement-id="${announcements[0].id}"]`).text()).toContain('本机已读')

    restoredWrapper.unmount()
    useAuthStore().setUserInfo({
      id: 43,
      username: 'bob',
      roles: []
    })
    const otherAccountWrapper = await mountPanel()
    expect(otherAccountWrapper.get(`[data-announcement-id="${announcements[0].id}"]`).text()).toContain('未读')
  })
})
