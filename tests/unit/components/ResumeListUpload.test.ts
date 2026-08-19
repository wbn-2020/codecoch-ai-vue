import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  applyResumeOptimizeResultApi: vi.fn(),
  confirmResumeParseResultApi: vi.fn(),
  deleteResumeApi: vi.fn(),
  getResumeOptimizeRecordsApi: vi.fn(),
  getResumeOptimizeResultApi: vi.fn(),
  getResumeParseResultApi: vi.fn(),
  getResumeParseTaskApi: vi.fn(),
  getResumesApi: vi.fn(),
  optimizeResumeApi: vi.fn(),
  reparseResumeApi: vi.fn(),
  setDefaultResumeApi: vi.fn(),
  uploadResumeFileApi: vi.fn()
}))

const router = vi.hoisted(() => ({
  push: vi.fn()
}))

const ui = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn()
}))

vi.mock('@/api/resume', () => api)
vi.mock('vue-router', () => ({
  useRouter: () => router,
  useRoute: () => ({ query: {} })
}))
vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    ElMessage: ui,
    ElMessageBox: {
      confirm: vi.fn()
    }
  }
})

import ResumeListView from '@/views/resume/ResumeListView.vue'
import { saveResumeUploadReceipt } from '@/features/resume-upload-session'

const emptyPage = {
  records: [],
  total: 0,
  pageNo: 1,
  pageSize: 10,
  pages: 1
}

const createFile = (name: string) =>
  new File(['identical resume content'], name, { type: 'application/pdf' })

const mountView = async () => {
  const passthrough = { template: '<div><slot /><slot name="footer" /></div>' }
  const wrapper = shallowMount(ResumeListView, {
    global: {
      stubs: {
        'el-dialog': passthrough,
        'el-drawer': true,
        'el-upload': true,
        'el-collapse-transition': passthrough,
        'el-button': { template: '<button><slot /></button>' },
        'el-progress': true,
        'el-alert': true,
        'el-input': true,
        'el-form-item': passthrough,
        'el-form': passthrough,
        'el-tag': passthrough,
        'el-dropdown-item': passthrough,
        'el-dropdown-menu': passthrough,
        'el-dropdown': passthrough,
        'el-pagination': true,
        'el-tooltip': passthrough,
        'el-checkbox': passthrough
      },
      directives: { loading: () => undefined }
    }
  })
  await flushPromises()
  return wrapper
}

const setupState = (wrapper: VueWrapper) =>
  (wrapper.vm as unknown as {
    $: { setupState: Record<string, any> }
  }).$.setupState

describe('resume list upload decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    api.getResumesApi.mockResolvedValue(emptyPage)
    api.uploadResumeFileApi.mockResolvedValue({
      fileId: 11,
      analysisRecordId: 22,
      parseStatus: 'PENDING',
      duplicate: false,
      operationStatus: 'SUBMITTED'
    })
  })

  it('uses the server decisionRequired response even after local state is cleared and the filename changes', async () => {
    const wrapper = await mountView()
    const state = setupState(wrapper)
    const file = createFile('renamed-resume.pdf')
    api.uploadResumeFileApi.mockResolvedValueOnce({
      fileId: 71,
      analysisRecordId: 81,
      parseStatus: 'WAIT_CONFIRM',
      originalFilename: 'original-resume.pdf',
      duplicate: true,
      decisionRequired: true,
      recommendedDecision: 'REUSE',
      allowedDecisions: ['REUSE', 'REPARSE', 'CANCEL'],
      message: '检测到内容相同的简历，请明确选择复用、重新解析或取消'
    })

    await state.uploadResumeFile(file)
    await flushPromises()

    expect(api.uploadResumeFileApi).toHaveBeenCalledTimes(1)
    expect(api.uploadResumeFileApi.mock.calls[0][1]).toEqual(expect.objectContaining({
      signal: expect.any(AbortSignal)
    }))
    expect(state.duplicateDecisionVisible).toBe(true)
    expect(state.pendingDuplicateDecision.response.originalFilename).toBe('original-resume.pdf')
    expect(wrapper.text()).toContain('复用已有结果')
    expect(wrapper.text()).toContain('重新解析')
    expect(wrapper.text()).toContain('取消本次上传')

    wrapper.unmount()
  })

  it.each([
    ['REUSE', '复用已有结果', '已复用内容相同的简历文件及其最新解析操作'],
    ['REPARSE', '重新解析', '已复用原文件并创建新的解析操作'],
    ['CANCEL', '取消本次上传', '已取消本次简历上传，不会创建文件或解析记录']
  ] as const)('submits the explicit %s duplicate decision', async (decision, _label, message) => {
    const wrapper = await mountView()
    const state = setupState(wrapper)
    const file = createFile(`${decision.toLowerCase()}-choice.pdf`)
    api.uploadResumeFileApi.mockResolvedValueOnce({
      fileId: 71,
      analysisRecordId: 81,
      parseStatus: 'WAIT_CONFIRM',
      originalFilename: 'server-known.pdf',
      duplicate: true,
      decisionRequired: true,
      recommendedDecision: 'REUSE',
      allowedDecisions: ['REUSE', 'REPARSE', 'CANCEL']
    })
    api.uploadResumeFileApi.mockResolvedValueOnce(decision === 'CANCEL'
      ? {
          duplicate: true,
          decisionRequired: false,
          requestedDecision: 'CANCEL',
          appliedDecision: 'CANCEL',
          operationStatus: 'CANCELLED',
          message
        }
      : {
          fileId: 71,
          analysisRecordId: decision === 'REUSE' ? 81 : 91,
          parseStatus: 'WAIT_CONFIRM',
          duplicate: true,
          decisionRequired: false,
          requestedDecision: decision,
          appliedDecision: decision,
          operationStatus: 'WAIT_CONFIRM',
          message
        })

    await state.uploadResumeFile(file)
    await state.handleDuplicateDecision(decision)
    await flushPromises()

    expect(api.uploadResumeFileApi).toHaveBeenNthCalledWith(
      2,
      file,
      expect.objectContaining({ duplicateDecision: decision })
    )
    if (decision === 'CANCEL') {
      expect(state.duplicateDecisionVisible).toBe(false)
      expect(state.selectedUploadFile).toBeNull()
    } else {
      expect(state.parseTask.analysisRecordId).toBe(decision === 'REUSE' ? 81 : 91)
    }

    wrapper.unmount()
  })

  it('keeps the selected file available after transfer cancellation and retries through the server', async () => {
    const wrapper = await mountView()
    const state = setupState(wrapper)
    const file = createFile('cancel-and-retry.pdf')
    api.uploadResumeFileApi
      .mockImplementationOnce((_file, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
      }))
      .mockResolvedValueOnce({
        fileId: 31,
        analysisRecordId: 41,
        parseStatus: 'WAIT_CONFIRM',
        duplicate: false,
        decisionRequired: false,
        operationStatus: 'WAIT_CONFIRM'
      })

    const initialUpload = state.uploadResumeFile(file)
    await vi.waitFor(() => expect(api.uploadResumeFileApi).toHaveBeenCalledTimes(1))
    state.cancelResumeUpload()
    await initialUpload

    expect(state.uploadError).toContain('上传已取消')
    expect(state.selectedUploadFile).toEqual(file)

    await state.retryResumeUpload()

    expect(api.uploadResumeFileApi).toHaveBeenCalledTimes(2)
    expect(state.parseTask.analysisRecordId).toBe(41)
    expect(state.selectedUploadFile).toBeNull()

    wrapper.unmount()
  })

  it('ends a timed-out transfer with an actionable retry state and keeps the selected file', async () => {
    const wrapper = await mountView()
    const state = setupState(wrapper)
    const file = createFile('slow-network.pdf')
    const timeoutError = Object.assign(new Error('timeout of 300000ms exceeded'), {
      code: 'ECONNABORTED'
    })
    api.uploadResumeFileApi.mockRejectedValueOnce(timeoutError)

    await state.uploadResumeFile(file)

    expect(state.uploading).toBe(false)
    expect(state.uploadError).toContain('上传已超时')
    expect(state.uploadError).toContain('直接重试')
    expect(state.selectedUploadFile).toEqual(file)

    wrapper.unmount()
  })

  it('restores the latest parse task after refresh without treating local storage as duplicate authority', async () => {
    saveResumeUploadReceipt({
      name: 'saved-resume.pdf',
      size: 1024,
      type: 'application/pdf',
      fingerprint: 'server-content-sha256',
      startedAt: '2026-08-17T10:00:00.000Z'
    }, {
      analysisRecordId: 501,
      fileId: 401,
      parseStatus: 'WAIT_CONFIRM',
      message: '等待确认'
    })

    const wrapper = await mountView()
    const state = setupState(wrapper)

    expect(state.parseTask).toEqual(expect.objectContaining({
      analysisRecordId: 501,
      parseStatus: 'WAIT_CONFIRM'
    }))
    expect(api.uploadResumeFileApi).not.toHaveBeenCalled()

    wrapper.unmount()
  })
})
