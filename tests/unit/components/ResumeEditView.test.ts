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
    resumeApiMocks.updateResumeApi.mockResolvedValue(undefined)
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
    const saveButton = wrapper
      .findAll('.resume-workshop-hero__completion button')
      .find((button) => button.text().includes('保存 · 去匹配'))
    expect(saveButton, wrapper.html()).toBeDefined()
    await saveButton!.trigger('click')
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

  it('keeps the advice grid inside the editor column on desktop so it cannot sit below the sticky preview', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/views/resume/ResumeEditView.vue'),
      'utf8'
    )
    const adviceRule = source.match(/\.editor-aside\s*\{[\s\S]*?\n\}/)?.[0] || ''

    expect(adviceRule).toMatch(/grid-column:\s*1;/)
    expect(adviceRule).toMatch(/grid-row:\s*2;/)
    expect(adviceRule).not.toMatch(/grid-column:\s*1\s*\/\s*-1;/)
    expect(source).toMatch(/@media \(max-width: 1020px\)[\s\S]*?\.editor-aside\s*\{[\s\S]*?grid-column:\s*auto;/)
  })

  it('keeps editing and the A4 preview visible side by side at the tablet breakpoint while only the paper canvas scrolls', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/views/resume/ResumeEditView.vue'),
      'utf8'
    )
    const previewRule = source.match(/\.preview-column\s*\{[\s\S]*?\n\}/)?.[0] || ''
    const paperRule = source.match(/\.resume-paper-wrap\s*\{[\s\S]*?\n\}/)?.[0] || ''

    expect(previewRule).toMatch(/height:\s*var\(--resume-preview-viewport-height\);/)
    expect(previewRule).toMatch(/max-height:\s*var\(--resume-preview-viewport-height\);/)
    expect(previewRule).toMatch(/overflow:\s*visible;/)
    expect(previewRule).not.toMatch(/overflow:\s*hidden;/)
    expect(paperRule).toMatch(/flex:\s*1\s+1\s+auto;/)
    expect(paperRule).toMatch(/overflow:\s*auto;/)
    expect(paperRule).toMatch(/scrollbar-gutter:\s*stable both-edges;/)
    expect(source).toMatch(/@media \(max-width: 1020px\)[\s\S]*?\.workspace-tabs\s*\{[\s\S]*?display:\s*none;/)
    expect(source).toMatch(/@media \(max-width: 1020px\)[\s\S]*?\.editor-workspace\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.2fr\)\s+minmax\(150px,\s*0\.8fr\);/)
    expect(source).toMatch(/@media \(max-width: 1020px\)[\s\S]*?\.mobile-pane-edit\s*\{[\s\S]*?display:\s*grid;/)
    expect(source).toMatch(/@media \(max-width: 1020px\)[\s\S]*?\.preview-column,\s*[\s\S]*?\.mobile-pane-preview\s*\{[\s\S]*?grid-column:\s*2;[\s\S]*?display:\s*flex;/)
  })
})
