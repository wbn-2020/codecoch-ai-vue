import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  downloadErrors: vi.fn(),
  importCsv: vi.fn(),
  importIcs: vi.fn(),
  previewCsv: vi.fn(),
  previewIcs: vi.fn()
}))

const elMessage = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn()
}))

vi.mock('@/api/careerGrowth', () => ({
  downloadCareerImportErrorsApi: api.downloadErrors,
  importCareerCsvApi: api.importCsv,
  importCareerIcsApi: api.importIcs,
  previewCareerCsvImportApi: api.previewCsv,
  previewCareerIcsImportApi: api.previewIcs
}))

vi.mock('element-plus', () => ({
  ElMessage: elMessage
}))

import CareerImportPanel from '@/views/v4/career-calendar/components/CareerImportPanel.vue'
import { hashCareerImportFile } from '@/features/career-import-content'

const ElButtonStub = defineComponent({
  name: 'ElButton',
  inheritAttrs: false,
  props: {
    disabled: Boolean,
    loading: Boolean
  },
  emits: ['click'],
  template: `
    <button
      v-bind="$attrs"
      :disabled="disabled"
      :data-loading="String(loading)"
      @click="$emit('click')"
    >
      <slot />
    </button>
  `
})

const preview = {
  format: 'CSV',
  timezone: 'Asia/Shanghai',
  headers: ['公司', '岗位'],
  suggestedMapping: {
    company_name: '公司',
    job_title: '岗位'
  },
  supportedFields: ['company_name', 'job_title'],
  totalCount: 1,
  validCount: 1,
  errorCount: 0,
  duplicateCount: 0,
  rows: []
}

const resultWithErrors = {
  batchId: 77,
  format: 'CSV',
  status: 'PARTIAL_SUCCESS',
  totalCount: 2,
  successCount: 1,
  errorCount: 1,
  duplicateCount: 0,
  rows: []
}

const globalOptions = {
  stubs: {
    'el-segmented': true,
    'el-select': {
      template: '<div><slot /></div>'
    },
    'el-option': true,
    'el-button': ElButtonStub,
    'el-alert': true,
    'el-table': {
      template: '<div><slot /></div>'
    },
    'el-table-column': true
  }
}

const chooseFile = async (wrapper: ReturnType<typeof mount>) => {
  const file = new File(['公司,岗位\n示例公司,Java 工程师'], 'applications.csv', {
    type: 'text/csv'
  })
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [file]
  })
  await input.trigger('change')
  await flushPromises()
  return file
}

describe('CareerImportPanel local operation errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the selected file and previous preview when preview refresh is rejected', async () => {
    api.previewCsv
      .mockResolvedValueOnce(preview)
      .mockRejectedValueOnce(new Error('AxiosError'))
    const wrapper = mount(CareerImportPanel, {
      props: { timezone: 'Asia/Shanghai' },
      global: globalOptions
    })

    await chooseFile(wrapper)
    await wrapper.get('[data-testid="preview-career-import"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('总计 1')

    await wrapper.get('[data-testid="preview-career-import"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('applications.csv')
    expect(wrapper.text()).toContain('总计 1')
    expect(elMessage.error).toHaveBeenCalledWith('导入预览失败，请检查文件后重试。')
  })

  it('keeps the preview and does not emit completion when import is rejected', async () => {
    api.previewCsv.mockResolvedValue(preview)
    api.importCsv.mockRejectedValue(new Error('AxiosError'))
    const wrapper = mount(CareerImportPanel, {
      props: { timezone: 'Asia/Shanghai' },
      global: globalOptions
    })

    await chooseFile(wrapper)
    await wrapper.get('[data-testid="preview-career-import"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="commit-career-import"]').trigger('click')
    await flushPromises()

    expect(api.importCsv).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'applications.csv',
        type: 'text/csv'
      }),
      'Asia/Shanghai',
      'SKIP',
      expect.objectContaining({
        company_name: '公司',
        job_title: '岗位'
      }),
      expect.stringMatching(/^[0-9a-f]{64}$/),
      expect.stringMatching(/^[0-9a-f]{64}$/)
    )
    expect(wrapper.text()).toContain('总计 1')
    expect(wrapper.emitted('imported')).toBeUndefined()
    expect(elMessage.error).toHaveBeenCalledWith('导入失败，请检查预览结果后重试。')
  })

  it('keeps the import result when the error receipt download is rejected', async () => {
    api.previewCsv.mockResolvedValue(preview)
    api.importCsv.mockResolvedValue(resultWithErrors)
    api.downloadErrors.mockRejectedValue(new Error('AxiosError'))
    const wrapper = mount(CareerImportPanel, {
      props: { timezone: 'Asia/Shanghai' },
      global: globalOptions
    })

    await chooseFile(wrapper)
    await wrapper.get('[data-testid="preview-career-import"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="commit-career-import"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('成功 1')
    expect(wrapper.text()).toContain('错误 1')

    await wrapper.get('[data-testid="download-career-import-errors"]').trigger('click')
    await flushPromises()

    expect(api.downloadErrors).toHaveBeenCalledWith(77)
    expect(wrapper.text()).toContain('成功 1')
    expect(wrapper.text()).toContain('错误 1')
    expect(elMessage.error).toHaveBeenCalledWith('错误行下载失败，请稍后重试。')
  })

  it('uses fresh bytes when a same-name CSV is corrected and uploaded again', async () => {
    const firstFile = new File(['公司,岗位\n旧公司,旧岗位'], 'applications.csv', { type: 'text/csv' })
    const secondFile = new File(['公司,岗位\n新公司,新岗位'], 'applications.csv', { type: 'text/csv' })
    const firstHash = await hashCareerImportFile(firstFile)
    const secondHash = await hashCareerImportFile(secondFile)
    api.previewCsv
      .mockResolvedValueOnce({
        ...preview,
        contentHash: firstHash,
        rows: [{ rowNumber: 2, raw: { 公司: '旧公司', 岗位: '旧岗位' }, duplicateCandidates: [] }]
      })
      .mockResolvedValueOnce({
        ...preview,
        contentHash: secondHash,
        rows: [{ rowNumber: 2, raw: { 公司: '新公司', 岗位: '新岗位' }, duplicateCandidates: [] }]
      })
    api.importCsv.mockResolvedValue({
      ...resultWithErrors,
      contentHash: secondHash,
      errorCount: 0,
      successCount: 1
    })
    const wrapper = mount(CareerImportPanel, {
      props: { timezone: 'Asia/Shanghai' },
      global: globalOptions
    })
    const input = () => wrapper.get('input[type="file"]')

    Object.defineProperty(input().element, 'files', { configurable: true, value: [firstFile] })
    await input().trigger('change')
    await flushPromises()
    await wrapper.get('[data-testid="preview-career-import"]').trigger('click')
    await flushPromises()
    expect(api.previewCsv).toHaveBeenNthCalledWith(1, firstFile, 'Asia/Shanghai', {}, firstHash)

    Object.defineProperty(input().element, 'files', { configurable: true, value: [secondFile] })
    await input().trigger('change')
    await flushPromises()
    await wrapper.get('[data-testid="preview-career-import"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="commit-career-import"]').trigger('click')
    await flushPromises()

    expect(api.previewCsv).toHaveBeenNthCalledWith(
      2,
      secondFile,
      'Asia/Shanghai',
      {},
      secondHash
    )
    expect(api.importCsv).toHaveBeenCalledWith(
      secondFile,
      'Asia/Shanghai',
      'SKIP',
      expect.any(Object),
      secondHash,
      secondHash
    )
    expect(firstHash).not.toBe(secondHash)
  })
})
