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

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  registerLeaveGuard: vi.fn()
}))

const elementPlusMocks = vi.hoisted(() => ({
  alert: vi.fn(),
  confirm: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: '2' },
    query: {}
  }),
  useRouter: () => ({
    push: routerMocks.push,
    replace: routerMocks.replace
  }),
  onBeforeRouteLeave: routerMocks.registerLeaveGuard
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
  ElMessageBox: elementPlusMocks
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
    elementPlusMocks.confirm.mockResolvedValue(true)
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

  it('creates a new stable version after a draft save followed by complete save', async () => {
    const detail = {
      id: 2,
      resumeName: 'Java 后端简历',
      realName: '测试用户',
      targetPosition: 'Java 工程师',
      skills: 'Java, Spring Boot',
      summary: '初始摘要',
      workSummary: '',
      education: '',
      isDefault: 0,
      draft: false,
      projects: []
    }
    resumeApiMocks.getResumeDetailApi.mockResolvedValue(detail)
    resumeApiMocks.updateResumeApi.mockResolvedValue(detail)
    resumeVersionApiMocks.getResumeVersionsApi.mockResolvedValue([{ id: 1, resumeId: 2 }])

    const wrapper = mount(ResumeEditView, {
      global: {
        directives: { loading: () => undefined },
        stubs
      }
    })

    await flushPromises()
    await wrapper.findAll('.resume-workbench-topbar__action')
      .find((button) => button.text().includes('保存草稿'))!
      .trigger('click')
    await flushPromises()
    await wrapper.find('.resume-workbench-topbar__action--primary').trigger('click')
    await flushPromises()

    expect(resumeApiMocks.updateResumeApi).toHaveBeenCalledTimes(2)
    expect(resumeVersionApiMocks.getResumeVersionsApi).toHaveBeenCalledWith(2)
    expect(resumeVersionApiMocks.createResumeVersionApi).toHaveBeenCalledWith(2, {
      sourceType: 'MANUAL_SAVE'
    })
  })

  it('persists inline edits to existing projects during complete resume save', async () => {
    const project = {
      projectId: 7,
      projectName: '招聘平台',
      projectTime: '2025.01 - 2025.06',
      projectBackground: '招聘业务',
      technicalChallenges: '服务拆分',
      optimizationResult: '稳定性提升'
    }
    const detail = {
      id: 2,
      resumeName: 'Java 后端简历',
      realName: '测试用户',
      targetPosition: 'Java 工程师',
      skills: 'Java, Spring Boot',
      summary: '初始摘要',
      workSummary: '',
      education: '',
      isDefault: 0,
      draft: false,
      projects: [project]
    }
    resumeApiMocks.getResumeDetailApi.mockResolvedValue(detail)
    resumeApiMocks.updateResumeApi.mockResolvedValue(detail)
    resumeApiMocks.updateResumeProjectApi.mockResolvedValue(project)
    resumeVersionApiMocks.getResumeVersionsApi.mockResolvedValue([])

    const wrapper = mount(ResumeEditView, {
      global: {
        directives: { loading: () => undefined },
        stubs
      }
    })

    await flushPromises()
    const vm = wrapper.vm as unknown as {
      projects: Array<{ projectId: number; projectName: string }>
    }
    vm.projects[0].projectName = '招聘平台重构'

    await wrapper.find('.resume-workbench-topbar__action--primary').trigger('click')
    await flushPromises()

    expect(resumeApiMocks.updateResumeProjectApi).toHaveBeenCalledWith(
      2,
      7,
      expect.objectContaining({ projectName: '招聘平台重构' })
    )
    expect(resumeVersionApiMocks.createResumeVersionApi).toHaveBeenCalledWith(2, {
      sourceType: 'MANUAL_SAVE'
    })
  })

  it('keeps failed project drafts dirty and blocks stable version creation', async () => {
    const detail = {
      id: 2,
      resumeName: 'Java 后端简历',
      realName: '测试用户',
      targetPosition: 'Java 工程师',
      skills: 'Java, Spring Boot',
      summary: '初始摘要',
      workSummary: '',
      education: '',
      isDefault: 0,
      draft: false,
      projects: []
    }
    resumeApiMocks.getResumeDetailApi.mockResolvedValue(detail)
    resumeApiMocks.updateResumeApi.mockResolvedValue(detail)
    resumeApiMocks.createResumeProjectApi.mockRejectedValue(new Error('项目保存失败'))

    const wrapper = mount(ResumeEditView, {
      global: {
        directives: { loading: () => undefined },
        stubs
      }
    })

    await flushPromises()
    const vm = wrapper.vm as unknown as {
      projects: Array<Record<string, unknown>>
      hasUnsavedResumeChanges: boolean
      saveError: string
    }
    vm.projects.push({
      projectId: -101,
      projectName: '失败项目草稿',
      projectTime: '',
      projectBackground: '',
      technicalChallenges: '',
      optimizationResult: ''
    })

    await wrapper.find('.resume-workbench-topbar__action--primary').trigger('click')
    await flushPromises()

    expect(vm.hasUnsavedResumeChanges).toBe(true)
    expect(vm.saveError).toContain('项目未保存成功')
    expect(resumeVersionApiMocks.createResumeVersionApi).not.toHaveBeenCalled()
  })

  it('does not reload over edits made while a save request is pending', async () => {
    const detail = {
      id: 2,
      resumeName: 'Java 后端简历',
      realName: '测试用户',
      targetPosition: 'Java 工程师',
      skills: 'Java, Spring Boot',
      summary: '初始摘要',
      workSummary: '',
      education: '',
      isDefault: 0,
      draft: false,
      projects: []
    }
    let resolveUpdate!: (value: typeof detail) => void
    resumeApiMocks.getResumeDetailApi.mockResolvedValue(detail)
    resumeApiMocks.updateResumeApi.mockReturnValue(new Promise((resolve) => {
      resolveUpdate = resolve
    }))
    resumeVersionApiMocks.getResumeVersionsApi.mockResolvedValue([])

    const wrapper = mount(ResumeEditView, {
      global: {
        directives: { loading: () => undefined },
        stubs
      }
    })

    await flushPromises()
    const vm = wrapper.vm as unknown as {
      form: { summary: string }
      hasUnsavedResumeChanges: boolean
    }
    const initialDetailCalls = resumeApiMocks.getResumeDetailApi.mock.calls.length
    const savePromise = wrapper.find('.resume-workbench-topbar__action--primary').trigger('click')
    await flushPromises()
    vm.form.summary = '保存期间的新摘要'
    resolveUpdate(detail)
    await savePromise
    await flushPromises()

    expect(resumeApiMocks.getResumeDetailApi).toHaveBeenCalledTimes(initialDetailCalls)
    expect(vm.form.summary).toBe('保存期间的新摘要')
    expect(vm.hasUnsavedResumeChanges).toBe(true)
  })

  it('asks for confirmation before leaving with unsaved changes', async () => {
    const detail = {
      id: 2,
      resumeName: 'Java 后端简历',
      realName: '测试用户',
      targetPosition: 'Java 工程师',
      skills: 'Java, Spring Boot',
      summary: '初始摘要',
      workSummary: '',
      education: '',
      isDefault: 0,
      draft: false,
      projects: []
    }
    resumeApiMocks.getResumeDetailApi.mockResolvedValue(detail)

    const wrapper = mount(ResumeEditView, {
      global: {
        directives: { loading: () => undefined },
        stubs
      }
    })

    await flushPromises()
    const vm = wrapper.vm as unknown as { form: { summary: string } }
    vm.form.summary = '未保存的新摘要'
    await wrapper.vm.$nextTick()
    const leaveGuard = routerMocks.registerLeaveGuard.mock.calls.at(-1)?.[0] as
      (() => Promise<boolean>) | undefined
    expect(leaveGuard).toBeDefined()

    elementPlusMocks.confirm.mockRejectedValueOnce(new Error('cancel'))
    await expect(leaveGuard!()).resolves.toBe(false)
    expect(elementPlusMocks.confirm).toHaveBeenCalled()

    elementPlusMocks.confirm.mockResolvedValueOnce(true)
    await expect(leaveGuard!()).resolves.toBe(true)
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
    const editSource = readFileSync(
      resolve(process.cwd(), 'src/views/resume/ResumeEditView.vue'),
      'utf8'
    )
    const shellSource = readFileSync(
      resolve(process.cwd(), 'src/views/resume/components/ResumeWorkbenchShell.vue'),
      'utf8'
    )

    expect(editSource).toContain('<ResumeWorkbenchShell')
    expect(editSource).toContain('class="resume-workbench-pane--preview content-card mobile-pane-preview"')
    expect(editSource).toContain('class="editor-column resume-workbench-pane--editor mobile-pane-editor"')
    expect(editSource).toContain('class="editor-column resume-workbench-pane--inspector mobile-pane-inspector"')
    expect(editSource).toContain('id="resume-tab-review"')
    expect(editSource).toContain('id="resume-tab-ai"')
    expect(editSource).toContain('id="resume-panel-inspector"')
    expect(shellSource).toContain('minmax(0, var(--workbench-editor-width))')
    expect(shellSource).toMatch(
      /\.resume-workbench-layout > :deep\(\.resume-workbench-pane--preview\)\s*\{[\s\S]*?grid-column:\s*2;/
    )
    expect(shellSource).toMatch(
      /\.resume-workbench-layout > :deep\(\.resume-workbench-pane--editor\),\s*[\s\S]*?\.resume-workbench-layout > :deep\(\.resume-workbench-pane--inspector\)\s*\{[\s\S]*?grid-column:\s*3;/
    )
  })

  it('switches the resume workspace to stable mobile panes at the tablet breakpoint', () => {
    const editSource = readFileSync(
      resolve(process.cwd(), 'src/views/resume/ResumeEditView.vue'),
      'utf8'
    )
    const shellSource = readFileSync(
      resolve(process.cwd(), 'src/views/resume/components/ResumeWorkbenchShell.vue'),
      'utf8'
    )
    const workbenchStyles = editSource.slice(editSource.lastIndexOf('// Resume workbench v2'))

    expect(workbenchStyles).toMatch(/\.resume-paper-wrap\s*\{[\s\S]*?flex:\s*1\s+1\s+auto;[\s\S]*?overflow:\s*auto;[\s\S]*?scrollbar-gutter:\s*stable both-edges;/)
    expect(workbenchStyles).toMatch(/@media \(max-width: 1260px\)[\s\S]*?\.workspace-tabs\s*\{[\s\S]*?display:\s*flex;/)
    expect(shellSource).toMatch(/@media \(max-width: 1260px\)[\s\S]*?\.resume-workbench-layout\s*\{[\s\S]*?display:\s*block;/)
    expect(shellSource).toMatch(/@media \(max-width: 1260px\)[\s\S]*?\.resume-workbench-layout > :deep\(\.mobile-pane-editor\),\s*[\s\S]*?\.resume-workbench-layout > :deep\(\.mobile-pane-inspector\),\s*[\s\S]*?\.resume-workbench-layout > :deep\(\.mobile-pane-preview\)\s*\{[\s\S]*?display:\s*none;/)
    expect(shellSource).toMatch(/\.resume-workbench-layout\.is-mobile-edit > :deep\(\.mobile-pane-editor\)\s*\{[\s\S]*?display:\s*flex;/)
    expect(shellSource).toContain('.resume-workbench-layout.is-mobile-review > :deep(.mobile-pane-inspector)')
    expect(shellSource).toContain('.resume-workbench-layout.is-mobile-ai > :deep(.mobile-pane-inspector)')
    expect(shellSource).toMatch(/\.resume-workbench-layout\.is-mobile-preview > :deep\(\.mobile-pane-preview\)\s*\{[\s\S]*?display:\s*flex;/)
    expect(shellSource).toContain('visibility: visible;')
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
    // The skills field is a group editor now, so validation clears when the groups are applied
    // instead of on a textarea model update.
    expect(source).toContain("clearResolvedValidation('skills', form.skills)")
  })
})
