import { defineComponent, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  archiveApplication: vi.fn(),
  createApplication: vi.fn(),
  createApplicationEvent: vi.fn(),
  deleteApplication: vi.fn(),
  deleteAttachment: vi.fn(),
  downloadAttachment: vi.fn(),
  generateEventReview: vi.fn(),
  getApplicationAttachments: vi.fn(),
  getApplicationEvents: vi.fn(),
  getApplications: vi.fn(),
  getApplicationStats: vi.fn(),
  getResumes: vi.fn(),
  getResumeVersions: vi.fn(),
  replaceAttachment: vi.fn(),
  restoreApplication: vi.fn(),
  updateApplication: vi.fn(),
  uploadAttachment: vi.fn()
}))

const message = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn()
}))

const confirmDangerActionPreview = vi.hoisted(() => vi.fn())
const messageBoxConfirm = vi.hoisted(() => vi.fn())
const routerReplace = vi.hoisted(() => vi.fn())

vi.mock('@/api/v4', () => ({
  archiveApplicationApi: api.archiveApplication,
  createApplicationApi: api.createApplication,
  createApplicationEventApi: api.createApplicationEvent,
  deleteApplicationApi: api.deleteApplication,
  deleteApplicationAttachmentApi: api.deleteAttachment,
  downloadApplicationAttachmentApi: api.downloadAttachment,
  getApplicationAttachmentsApi: api.getApplicationAttachments,
  getApplicationEventsApi: api.getApplicationEvents,
  getApplicationsApi: api.getApplications,
  getApplicationStatsApi: api.getApplicationStats,
  getResumeVersionsApi: api.getResumeVersions,
  replaceApplicationAttachmentApi: api.replaceAttachment,
  restoreApplicationApi: api.restoreApplication,
  updateApplicationApi: api.updateApplication,
  uploadApplicationAttachmentApi: api.uploadAttachment
}))

vi.mock('@/api/careerGrowth', () => ({
  generateApplicationEventAiReviewApi: api.generateEventReview
}))

vi.mock('@/api/resume', () => ({
  getResumesApi: api.getResumes
}))

vi.mock('@/utils/dangerAction', () => ({
  confirmDangerActionPreview
}))

vi.mock('element-plus', () => ({
  ElMessage: message,
  ElMessageBox: {
    confirm: messageBoxConfirm
  }
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({
    push: vi.fn(),
    replace: routerReplace
  })
}))

import JobApplicationView from '@/views/v4/JobApplicationView.vue'

const ButtonStub = defineComponent({
  name: 'ElButton',
  inheritAttrs: false,
  emits: ['click'],
  template: '<button v-bind="$attrs" type="button" @click="$emit(\'click\')"><slot /></button>'
})

const DialogStub = defineComponent({
  name: 'ElDialog',
  props: {
    modelValue: Boolean
  },
  emits: ['update:modelValue', 'closed'],
  template: `
    <div v-if="modelValue" data-testid="dialog">
      <slot />
      <slot name="footer" />
    </div>
  `
})

const FormStub = defineComponent({
  name: 'ElForm',
  setup(_props, { expose }) {
    expose({
      validate: async () => true,
      clearValidate: () => undefined
    })
  },
  template: '<form><slot /></form>'
})

const InputStub = defineComponent({
  name: 'ElInput',
  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    }
  },
  emits: ['update:modelValue'],
  template: `
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  `
})

const SelectStub = defineComponent({
  name: 'ElSelect',
  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    }
  },
  emits: ['update:modelValue', 'change'],
  template: '<div><slot /></div>'
})

const slotStub = (name: string) => defineComponent({
  name,
  template: '<div><slot /></div>'
})

const globalOptions = {
  directives: {
    loading: {}
  },
  stubs: {
    AppState: slotStub('AppState'),
    ApplicationEventReviewDialog: true,
    ApplicationEventReviewFields: true,
    ApplicationEventReviewPanel: true,
    CareerCampaignPanel: true,
    'el-alert': slotStub('ElAlert'),
    'el-button': ButtonStub,
    'el-checkbox': slotStub('ElCheckbox'),
    'el-date-picker': slotStub('ElDatePicker'),
    'el-dialog': DialogStub,
    'el-drawer': slotStub('ElDrawer'),
    'el-dropdown': slotStub('ElDropdown'),
    'el-dropdown-item': slotStub('ElDropdownItem'),
    'el-dropdown-menu': slotStub('ElDropdownMenu'),
    'el-form': FormStub,
    'el-form-item': slotStub('ElFormItem'),
    'el-input': InputStub,
    'el-option': true,
    'el-select': SelectStub,
    'el-tag': slotStub('ElTag')
  }
}

const findButton = (wrapper: ReturnType<typeof mount>, text: string) => {
  const button = wrapper.findAll('button').find((item) => item.text().trim() === text)
  if (!button) throw new Error(`Button not found: ${text}`)
  return button
}

const selectFile = async (wrapper: ReturnType<typeof mount>, file: File) => {
  const input = wrapper.get('input[type="file"][multiple]')
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [file]
  })
  await input.trigger('change')
  await nextTick()
}

describe('JobApplicationView attachment workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getApplications.mockResolvedValue([])
    api.getApplicationStats.mockResolvedValue({})
    api.getApplicationAttachments.mockResolvedValue([])
    api.getApplicationEvents.mockResolvedValue([])
    api.getResumes.mockResolvedValue([])
    api.getResumeVersions.mockResolvedValue([])
    api.createApplication.mockResolvedValue({
      id: 41,
      companyName: '示例科技',
      jobTitle: 'Java 工程师',
      source: 'CUSTOM',
      status: 'SAVED',
      lockVersion: 1
    })
    confirmDangerActionPreview.mockResolvedValue(true)
    messageBoxConfirm.mockResolvedValue(undefined)
  })

  it('keeps a failed post-create upload visible and allows retry without recreating the application', async () => {
    const uploadedAttachment = {
      id: 12,
      applicationId: 41,
      fileId: 88,
      attachmentType: 'RESUME',
      displayName: 'resume.pdf',
      originalFilename: 'resume.pdf',
      mimeType: 'application/pdf',
      fileSize: 7,
      sortOrder: 0
    }
    api.uploadAttachment
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce(uploadedAttachment)

    const wrapper = mount(JobApplicationView, { global: globalOptions })
    await flushPromises()

    await findButton(wrapper, '新增投递').trigger('click')
    await selectFile(
      wrapper,
      new File(['resume'], 'resume.pdf', { type: 'application/pdf' })
    )
    expect(wrapper.text()).toContain('等待投递保存后上传')

    await findButton(wrapper, '保存并上传附件').trigger('click')
    await flushPromises()

    expect(api.createApplication).toHaveBeenCalledTimes(1)
    expect(api.uploadAttachment).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('上传失败')
    expect(wrapper.text()).toContain('接口请求失败，请稍后重试。')

    await findButton(wrapper, '重试').trigger('click')
    await flushPromises()

    expect(api.createApplication).toHaveBeenCalledTimes(1)
    expect(api.uploadAttachment).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).not.toContain('接口请求失败，请稍后重试。')
    expect(wrapper.get('[data-testid="application-attachment-list"]').text())
      .toContain('resume.pdf')
  })

  it('rejects an attachment download with an unexpected MIME type and accepts a valid file', async () => {
    api.uploadAttachment
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce({
        id: 12,
        applicationId: 41,
        fileId: 88,
        attachmentType: 'RESUME',
        displayName: 'resume.pdf',
        originalFilename: 'resume.pdf',
        mimeType: 'application/pdf',
        fileSize: 7,
        sortOrder: 0
      })
    api.downloadAttachment
      .mockResolvedValueOnce(new Blob(['<html>error</html>'], { type: 'text/html' }))
      .mockResolvedValueOnce(new Blob(['resume'], { type: 'application/pdf' }))
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:resume')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    const wrapper = mount(JobApplicationView, { global: globalOptions })
    await flushPromises()
    await findButton(wrapper, '新增投递').trigger('click')
    await selectFile(
      wrapper,
      new File(['resume'], 'resume.pdf', { type: 'application/pdf' })
    )
    await findButton(wrapper, '保存并上传附件').trigger('click')
    await flushPromises()
    await findButton(wrapper, '重试').trigger('click')
    await flushPromises()

    await findButton(wrapper, '下载').trigger('click')
    await flushPromises()
    expect(message.error).toHaveBeenCalledWith(
      expect.stringContaining('下载文件类型异常')
    )
    expect(anchorClick).not.toHaveBeenCalled()

    await findButton(wrapper, '下载').trigger('click')
    await flushPromises()
    expect(createObjectUrl).toHaveBeenCalledTimes(1)
    expect(anchorClick).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:resume')
    expect(message.success).toHaveBeenCalledWith('附件下载已开始')

    createObjectUrl.mockRestore()
    revokeObjectUrl.mockRestore()
    anchorClick.mockRestore()
  })
})
