import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post, put, remove } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  remove: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: {
    get,
    post,
    put,
    delete: remove
  }
}))

import {
  deleteAdminAnnouncementApi,
  offlineAdminAnnouncementApi,
  publishAdminAnnouncementApi,
  updateAdminAnnouncementApi
} from '@/api/announcement'

describe('announcement api', () => {
  const announcementId = '2082011113656750082'
  const confirmation = {
    confirm: true,
    dryRun: false,
    reason: 'acceptance',
    idempotencyKey: 'announcement-acceptance-001'
  }

  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    put.mockReset()
    remove.mockReset()
  })

  it('preserves a snowflake ID as a string in every mutation URL', () => {
    publishAdminAnnouncementApi(announcementId, confirmation)
    offlineAdminAnnouncementApi(announcementId, confirmation)
    updateAdminAnnouncementApi(announcementId, {
      title: '验收公告',
      content: '用于验证公告长整型 ID 的精确传递。',
      ...confirmation
    })
    deleteAdminAnnouncementApi(announcementId, confirmation)

    expect(post).toHaveBeenNthCalledWith(1, `/admin/announcements/${announcementId}/publish`, confirmation)
    expect(post).toHaveBeenNthCalledWith(2, `/admin/announcements/${announcementId}/offline`, confirmation)
    expect(put).toHaveBeenCalledWith(`/admin/announcements/${announcementId}`, expect.any(Object))
    expect(remove).toHaveBeenCalledWith(`/admin/announcements/${announcementId}`, { data: confirmation })
  })
})
