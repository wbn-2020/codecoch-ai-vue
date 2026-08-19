import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useGameProfileStore } from '@/features/game-profile'
import ResumeEditView from '@/views/resume/ResumeEditView.vue'

const resumeApiMocks = vi.hoisted(() => ({
  applyResumeOptimizeResultApi: vi.fn(),
  createResumeApi: vi.fn(),
  createResumeProjectApi: vi.fn(),
  deleteResumeProjectApi: vi.fn(),
  getResumeOptimizeRecordsApi: vi.fn(),
  getResumeOptimizeResultApi: vi.fn(),
  getResumeDetailApi: vi.fn(),
  optimizeResumeApi: vi.fn(),
  clearDefaultResumeApi: vi.fn(),
  setDefaultResumeApi: vi.fn(),
  updateResumeApi: vi.fn(),
  updateResumeProjectApi: vi.fn()
}))

const resumeVersionApiMocks = vi.hoisted(() => ({
  createResumeVersionApi: vi.fn(),
  getResumeVersionsApi: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: '2' },
    query: {}
  }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  })
}))

vi.mock('@/api/resume', () => resumeApiMocks)
vi.mock('@/api/v4', () => resumeVersionApiMocks)
vi.mock('@/utils/dangerAction', () => ({
  confirmDangerActionPreview: vi.fn().mockResolvedValue(true)
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  },
  ElMessageBox: {
    alert: vi.fn(),
    confirm: vi.fn()
  }
}))

const stubs = {
  AppState: {
    props: ['title', 'description'],
    template: '<section class="app-state"><h3>{{ title }}</h3><p>{{ description }}</p><slot /></section>'
  },
  ResumeDeliveryWorkbench: true,
  ResumeProjectForm: true,
  'el-avatar': true,
  'el-button': {
    template: '<button v-bind="$attrs"><slot /></button>'
  },
  'el-checkbox': true,
  'el-checkbox-group': true,
  'el-dialog': true,
  'el-form': {
    template: '<form><slot /></form>',
    methods: {
      validate: () => Promise.resolve(true)
    }
  },
  'el-form-item': {
    template: '<div><slot /></div>'
  },
  'el-input': true,
  'el-input-number': true,
  'el-progress': true,
  'el-alert': true,
  'el-tooltip': {
    template: '<span><slot /></span>'
  },
  'el-switch': true,
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

describe('ResumeEditView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    resumeApiMocks.getResumeOptimizeRecordsApi.mockResolvedValue([])
    resumeApiMocks.updateResumeApi.mockResolvedValue({
      id: 2,
      resumeName: 'Java 后端简历',
      realName: '测试用户',
      targetPosition: 'Java 工程师',
      skills: 'Java, Spring Boot',
      summary: '',
      workSummary: '',
      education: '',
      isDefault: 0,
      draft: false,
      projects: []
    })
    resumeApiMocks.clearDefaultResumeApi.mockResolvedValue(undefined)
    resumeApiMocks.setDefaultResumeApi.mockResolvedValue(undefined)
    resumeVersionApiMocks.getResumeVersionsApi.mockResolvedValue([])
    resumeVersionApiMocks.createResumeVersionApi.mockResolvedValue({
      id: 9,
      resumeId: 2,
      versionNo: 1,
      currentFlag: 1
    })
  })

  it('hides the editor when the requested resume is unavailable', async () => {
    resumeApiMocks.getResumeDetailApi.mockRejectedValueOnce(new Error('简历不存在或已不可用'))

    const wrapper = mount(ResumeEditView, {
      global: {
        directives: {
          loading: () => undefined
        },
        stubs
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('简历不可用')
    expect(wrapper.text()).toContain('简历不存在或已不可用')
    expect(wrapper.find('.editor-hero').exists(), wrapper.html()).toBe(false)
    expect(wrapper.text()).not.toContain('保存简历')
  })

  it('creates an initial stable version when saving a resume without version history', async () => {
    resumeApiMocks.getResumeDetailApi.mockResolvedValue({
      id: 2,
      resumeName: 'Java 后端简历',
      realName: '测试用户',
      targetPosition: 'Java 工程师',
      skills: 'Java, Spring Boot',
      summary: '',
      workSummary: '',
      education: '',
      isDefault: 0,
      projects: []
    })

    const wrapper = mount(ResumeEditView, {
      global: {
        directives: {
          loading: () => undefined
        },
        stubs
      }
    })

    await flushPromises()
    const saveButton = wrapper.find('.resume-workbench-topbar__action--primary')
    expect(saveButton, wrapper.html()).toBeDefined()
    await saveButton.trigger('click')
    await flushPromises()

    expect(resumeApiMocks.updateResumeApi).toHaveBeenCalledWith(2, expect.objectContaining({
      resumeName: 'Java 后端简历',
      skills: 'Java, Spring Boot'
    }))
    expect(resumeVersionApiMocks.getResumeVersionsApi).toHaveBeenCalledWith(2)
    expect(resumeVersionApiMocks.createResumeVersionApi).toHaveBeenCalledWith(2, {
      sourceType: 'MANUAL_SAVE'
    })
  })

  it('keeps the draft visible and allows retry after a save failure', async () => {
    resumeApiMocks.getResumeDetailApi.mockResolvedValue({
      id: 2,
      resumeName: 'Java 后端简历',
      realName: '测试用户',
      targetPosition: 'Java 工程师',
      skills: 'Java, Spring Boot',
      summary: '',
      workSummary: '',
      education: '',
      isDefault: 0,
      projects: []
    })
    resumeApiMocks.updateResumeApi
      .mockRejectedValueOnce(new Error('保存服务暂时不可用'))
      .mockResolvedValueOnce({
        id: 2,
        resumeName: 'Java 后端简历',
        realName: '测试用户',
        targetPosition: 'Java 工程师',
        skills: 'Java, Spring Boot',
        summary: '',
        workSummary: '',
        education: '',
        isDefault: 0,
        draft: false,
        projects: []
      })

    const wrapper = mount(ResumeEditView, {
      global: {
        directives: {
          loading: () => undefined
        },
        stubs
      }
    })

    await flushPromises()
    await wrapper.find('.resume-workbench-topbar__action--primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('简历尚未保存')
    expect(wrapper.text()).toContain('保存服务暂时不可用')
    expect(wrapper.text()).toContain('Java 后端简历')

    await wrapper.findAll('button').find((button) => button.text().includes('重试保存'))!.trigger('click')
    await flushPromises()

    expect(resumeApiMocks.updateResumeApi).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).not.toContain('简历尚未保存')
  })

  it('clears default status and reads the saved detail back after refresh', async () => {
    const initialDetail = {
      id: 2,
      resumeName: 'Java 后端简历',
      realName: '测试用户',
      targetPosition: 'Java 工程师',
      skills: 'Java, Spring Boot',
      summary: '初始摘要',
      workSummary: '',
      education: '',
      isDefault: 1,
      projects: []
    }
    const refreshedDetail = {
      ...initialDetail,
      summary: '保存后的摘要',
      isDefault: 0
    }
    resumeApiMocks.getResumeDetailApi
      .mockResolvedValueOnce(initialDetail)
      .mockResolvedValueOnce(refreshedDetail)
    resumeApiMocks.updateResumeApi.mockResolvedValue({
      ...initialDetail,
      summary: '保存后的摘要',
      isDefault: 1,
      draft: false
    })

    const wrapper = mount(ResumeEditView, {
      global: {
        directives: {
          loading: () => undefined
        },
        stubs
      }
    })

    await flushPromises()
    const vm = wrapper.vm as unknown as { form: { isDefault: number } }
    vm.form.isDefault = 0
    await wrapper.find('.resume-workbench-topbar__action--primary').trigger('click')
    await flushPromises()

    expect(resumeApiMocks.updateResumeApi).toHaveBeenCalledWith(2, expect.objectContaining({
      isDefault: 0,
      summary: '初始摘要'
    }))
    expect(resumeApiMocks.clearDefaultResumeApi).toHaveBeenCalledWith(2)
    expect(resumeApiMocks.getResumeDetailApi).toHaveBeenCalledTimes(2)
    expect(vm.form.isDefault).toBe(0)
    expect((wrapper.vm as unknown as { form: { summary: string } }).form.summary).toBe('保存后的摘要')
  })

  it('grants resume_section XP once only after a successful AI suggestion application', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    resumeApiMocks.getResumeDetailApi.mockResolvedValue({
      id: 2,
      resumeName: 'Java 后端简历',
      realName: '测试用户',
      targetPosition: 'Java 工程师',
      skills: 'Java, Spring Boot',
      summary: '负责服务治理',
      workSummary: '',
      education: '',
      isDefault: 0,
      projects: []
    })
    resumeApiMocks.getResumeOptimizeRecordsApi.mockResolvedValue([{
      optimizeRecordId: 88,
      resumeId: 2,
      optimizeStatus: 'SUCCESS',
      createdAt: '2026-07-31T00:00:00Z'
    }])
    resumeApiMocks.getResumeOptimizeResultApi.mockResolvedValue({
      optimizeRecordId: 88,
      resumeId: 2,
      optimizeStatus: 'SUCCESS',
      overallComment: '建议可应用',
      rewriteSuggestions: [{
        fieldKey: 'summary',
        fieldName: '个人摘要',
        before: '负责服务治理',
        after: '负责服务治理并提升系统稳定性'
      }]
    })
    resumeApiMocks.applyResumeOptimizeResultApi.mockResolvedValue({
      sourceResumeId: 2,
      sourceOptimizeRecordId: 88,
      newResumeId: 9,
      applyMode: 'CREATE_DRAFT',
      message: '建议草稿已创建'
    })

    const wrapper = mount(ResumeEditView, {
      global: {
        plugins: [pinia],
        directives: {
          loading: () => undefined
        },
        stubs
      }
    })

    await flushPromises()
    const aiModeButton = wrapper.findAll('button').find((button) => button.text().includes('AI 优化'))
    expect(aiModeButton, wrapper.html()).toBeDefined()
    await aiModeButton!.trigger('click')
    await flushPromises()
    const selectAllButton = wrapper.findAll('button').find((button) => button.text().includes('全选'))
    expect(selectAllButton, wrapper.html()).toBeDefined()
    await selectAllButton!.trigger('click')
    await flushPromises()
    const applyButton = wrapper.findAll('button').find((button) => button.text().includes('应用建议'))
    expect(applyButton, wrapper.html()).toBeDefined()
    await applyButton!.trigger('click')
    await flushPromises()

    const gameProfile = useGameProfileStore()
    expect(resumeApiMocks.applyResumeOptimizeResultApi).toHaveBeenCalledTimes(1)
    expect(gameProfile.xp).toBe(40)
    expect(gameProfile.rewardCountForPrefix('resume:optimize-apply:88')).toBe(1)

    await applyButton!.trigger('click')
    await flushPromises()

    expect(resumeApiMocks.applyResumeOptimizeResultApi).toHaveBeenCalledTimes(2)
    expect(gameProfile.xp).toBe(40)
    expect(gameProfile.rewardCountForPrefix('resume:optimize-apply:88')).toBe(1)
  })

  it('keeps the canvas central and both inspector modes in the right workbench column', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/views/resume/ResumeEditView.vue'),
      'utf8'
    )
    const workbenchStyles = source.slice(source.lastIndexOf('// Resume workbench v2'))

    expect(workbenchStyles).toContain('grid-template-columns: 220px minmax(640px, 1fr) 370px')
    expect(workbenchStyles).toMatch(/\.preview-column\s*\{[\s\S]*?grid-column:\s*2;/)
    expect(workbenchStyles).toMatch(/\.editor-main,\s*[\s\S]*?\.editor-aside\s*\{[\s\S]*?grid-column:\s*3;/)
    expect(workbenchStyles).toMatch(
      /\.preview-column,\s*[\s\S]*?\.editor-aside\s*\{[\s\S]*?position:\s*static;[\s\S]*?align-self:\s*stretch;[\s\S]*?height:\s*100%;/
    )
    expect(workbenchStyles).toMatch(
      /\.editor-aside > \.side-panel:not\(\.section-nav-card\)\s*\{[\s\S]*?display:\s*block;/
    )
    expect(workbenchStyles).toMatch(/@media \(max-width: 1260px\)[\s\S]*?\.editor-workspace\s*\{[\s\S]*?display:\s*block;/)
  })

  it('switches the resume workspace to stable mobile panes at the tablet breakpoint', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/views/resume/ResumeEditView.vue'),
      'utf8'
    )
    const workbenchStyles = source.slice(source.lastIndexOf('// Resume workbench v2'))

    expect(workbenchStyles).toMatch(/\.preview-column\s*\{[\s\S]*?overflow:\s*hidden;/)
    expect(workbenchStyles).toMatch(/\.resume-paper-wrap\s*\{[\s\S]*?flex:\s*1\s+1\s+auto;[\s\S]*?overflow:\s*auto;[\s\S]*?scrollbar-gutter:\s*stable both-edges;/)
    expect(workbenchStyles).toMatch(/@media \(max-width: 1260px\)[\s\S]*?\.workspace-tabs\s*\{[\s\S]*?display:\s*flex;/)
    expect(workbenchStyles).toMatch(/@media \(max-width: 1260px\)[\s\S]*?\.editor-workspace\s*\{[\s\S]*?display:\s*block;/)
    expect(workbenchStyles).toMatch(/@media \(max-width: 1260px\)[\s\S]*?\.mobile-pane-edit,\s*[\s\S]*?\.mobile-pane-preview\s*\{[\s\S]*?display:\s*none;/)
    expect(workbenchStyles).toMatch(/@media \(max-width: 1260px\)[\s\S]*?\.is-mobile-edit \.mobile-pane-edit\s*\{[\s\S]*?display:\s*flex;/)
    expect(workbenchStyles).toMatch(/@media \(max-width: 1260px\)[\s\S]*?\.is-mobile-preview \.mobile-pane-preview\s*\{[\s\S]*?display:\s*flex;/)
  })

  it('keeps mobile preview inside its pane and keeps the save action sticky', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/views/resume/ResumeEditView.vue'),
      'utf8'
    )
    const workbenchStyles = source.slice(source.lastIndexOf('// Resume workbench v2'))

    expect(source).toContain(":style=\"{ '--resume-preview-zoom': previewZoom }\"")
    expect(workbenchStyles).toMatch(
      /\.resume-paper-stage\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;[\s\S]*?zoom:\s*var\(--resume-preview-zoom\);/
    )
    expect(workbenchStyles).not.toMatch(/\.resume-paper-stage\s*\{[\s\S]*?width:\s*max-content;/)
    expect(workbenchStyles).toMatch(
      /@media \(max-width: 1260px\)[\s\S]*?\.resume-paper-wrap\s*\{[\s\S]*?overflow-x:\s*hidden;/
    )
    expect(workbenchStyles).toMatch(
      /@media \(max-width: 1260px\)[\s\S]*?\.resume-paper-stage\s*\{[\s\S]*?zoom:\s*1;/
    )
    expect(workbenchStyles).toMatch(
      /\.form-actions\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?bottom:\s*0;/
    )
  })

  it('maps validation failures to sections, returns to editing, and focuses the first invalid field', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/views/resume/ResumeEditView.vue'),
      'utf8'
    )

    expect(source).toContain("skills: 'resume-skills'")
    expect(source).toContain('const handleFormValidationFailure = async (failure: unknown) =>')
    expect(source).toContain('invalidSectionIds.value = sections')
    expect(source).toContain('if (section) focusSection(section)')
    expect(source).toContain('formRef.value?.scrollToField?.(firstField)')
    expect(source).toContain('focusFirstInvalidField(firstField)')
    expect(source).toMatch(
      /await formRef\.value\.validate\(\)[\s\S]*?catch \(failure\) \{[\s\S]*?await handleFormValidationFailure\(failure\)/
    )
    expect(source).toContain("@update:model-value=\"clearResolvedValidation('skills', $event)\"")
  })
})
