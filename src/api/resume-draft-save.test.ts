import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post, put } = vi.hoisted(() => ({
  post: vi.fn(),
  put: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: { post, put }
}))

import { createResumeApi, updateResumeApi } from '@/api/resume'

describe('resume draft save api contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    post.mockResolvedValue({
      id: 91,
      title: 'Java 后端简历',
      draft: true,
      completionPercent: 14,
      missingSections: ['核心技术栈']
    })
    put.mockResolvedValue({
      id: 91,
      title: 'Java 后端简历',
      draft: true,
      completionPercent: 14,
      missingSections: ['核心技术栈']
    })
  })

  it('allows a title-only draft and forwards the explicit draft intent', async () => {
    await createResumeApi({
      resumeName: 'Java 后端简历',
      saveAsDraft: true
    })

    expect(post).toHaveBeenCalledWith('/resumes', expect.objectContaining({
      resumeName: 'Java 后端简历',
      title: 'Java 后端简历',
      saveAsDraft: true,
      skillStack: undefined
    }))
  })

  it('keeps the same draft contract for updates', async () => {
    await updateResumeApi(91, {
      resumeName: 'Java 后端简历',
      saveAsDraft: true
    })

    expect(put).toHaveBeenCalledWith('/resumes/91', expect.objectContaining({
      resumeName: 'Java 后端简历',
      saveAsDraft: true
    }))
  })
})
