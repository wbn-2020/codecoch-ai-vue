import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getResumesApi = vi.hoisted(() => vi.fn())
const replace = vi.hoisted(() => vi.fn())

vi.mock('@/api/resume', () => ({ getResumesApi }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace })
}))

import ResumeWorkbenchEntryView from '@/views/resume/ResumeWorkbenchEntryView.vue'

describe('ResumeWorkbenchEntryView', () => {
  beforeEach(() => {
    getResumesApi.mockReset()
    replace.mockReset()
  })

  it('opens the default resume in the editable workbench', async () => {
    getResumesApi.mockResolvedValue({
      records: [
        { id: 3, isDefault: 0 },
        { id: 7, isDefault: 1 }
      ]
    })

    mount(ResumeWorkbenchEntryView)
    await flushPromises()

    expect(getResumesApi).toHaveBeenCalledWith({ pageNo: 1, pageSize: 100 })
    expect(replace).toHaveBeenCalledWith('/resumes/7/edit')
  })

  it('opens the create editor when the user has no resume', async () => {
    getResumesApi.mockResolvedValue({ records: [] })

    mount(ResumeWorkbenchEntryView)
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/resumes/create')
  })

  it('opens the first resume when no default resume exists', async () => {
    getResumesApi.mockResolvedValue({
      records: [
        { id: 11, isDefault: 0 },
        { id: 12, isDefault: 0 }
      ]
    })

    mount(ResumeWorkbenchEntryView)
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/resumes/11/edit')
  })

  it('shows a retry action when loading resumes fails and retries the selection', async () => {
    getResumesApi
      .mockRejectedValueOnce(new Error('简历列表暂时不可用'))
      .mockResolvedValueOnce({ records: [{ id: 15, isDefault: 0 }] })

    const wrapper = mount(ResumeWorkbenchEntryView)
    await flushPromises()

    expect(wrapper.text()).toContain('简历列表暂时不可用')
    const retryButton = wrapper.findAll('button').find((button) => button.text() === '重试')
    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')
    await flushPromises()

    expect(getResumesApi).toHaveBeenCalledTimes(2)
    expect(replace).toHaveBeenCalledWith('/resumes/15/edit')
  })
})
