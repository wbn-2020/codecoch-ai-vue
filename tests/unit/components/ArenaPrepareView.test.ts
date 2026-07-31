import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import ArenaPrepareView from '@/views/resume/ArenaPrepareView.vue'

const resumesResult = vi.hoisted(() => ({ value: { records: [] as unknown[] } }))
const targetsResult = vi.hoisted(() => ({ value: [] as unknown[] }))
const currentTargetResult = vi.hoisted(() => ({ value: null as unknown }))
const resumeDetailResult = vi.hoisted(() => ({ value: null as unknown }))
const matchResult = vi.hoisted(() => ({ value: null as unknown }))
const skillOverviewResult = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('@/api/resume', () => ({
  getResumesApi: vi.fn(async () => resumesResult.value),
  getResumeDetailApi: vi.fn(async () => resumeDetailResult.value)
}))
vi.mock('@/api/jobTarget', () => ({
  getJobTargetsApi: vi.fn(async () => targetsResult.value),
  getCurrentJobTargetApi: vi.fn(async () => currentTargetResult.value)
}))
vi.mock('@/api/resumeJobMatch', () => ({
  getLatestResumeJobMatchReportApi: vi.fn(async () => matchResult.value)
}))
vi.mock('@/api/skillProfile', () => ({
  getSkillProfileOverviewApi: vi.fn(async () => skillOverviewResult.value)
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/resumes', fullPath: '/resumes', meta: {} })
}))

/** 证据数据延迟 160ms 加载，flush 需要覆盖该窗口 */
const flush = async () => {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 240))
  await nextTick()
}

const mountPrepare = () => mount(ArenaPrepareView, {
  global: {
    stubs: {
      ResumeDocumentPreview: true
    }
  }
})

const FULL_RESUME = {
  id: 7,
  resumeName: '李明远-高级Java',
  targetPosition: '高级 Java 工程师',
  projectCount: 2,
  isDefault: 1,
  updatedAt: '2026-07-30 10:00:00'
}

const FULL_TARGET = {
  id: 3,
  jobTitle: '高级 Java 工程师',
  companyName: '华辰数智',
  jobLevel: '3-5年',
  parseStatus: 'PARSED',
  analysisSummary: '侧重高并发与 JVM 调优'
}

const SUCCESS_MATCH = {
  reportId: 9,
  resumeId: 7,
  targetJobId: 3,
  status: 'SUCCESS',
  overallScore: 72,
  summary: '整体匹配良好',
  strengths: ['基础扎实'],
  gaps: ['缺少高并发经验'],
  details: [
    { skillName: 'JVM', score: 85, matchLevel: '已覆盖', evidence: '简历中有 JVM 调优项目' },
    { skillName: '高并发', score: 40, matchLevel: '缺失', evidence: '缺少高并发项目证据' }
  ]
}

describe('ArenaPrepareView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    resumesResult.value = { records: [] }
    targetsResult.value = []
    currentTargetResult.value = null
    resumeDetailResult.value = null
    matchResult.value = null
    skillOverviewResult.value = null
  })

  it('renders the three-step quest map with only the first node unlocked when empty', async () => {
    const wrapper = mountPrepare()
    await flush()

    expect(wrapper.text()).toContain('闯过三关，解锁精准匹配')
    expect(wrapper.text()).toContain('第 1 关 · 做出能匹配的简历')
    expect(wrapper.text()).toContain('第 2 关 · 锁定目标岗位')
    expect(wrapper.text()).toContain('第 3 关 · 生成 JD 匹配报告')
    expect(wrapper.text()).toContain('已完成 0/3')
    // 第 1 关为当前关，其余未解锁
    expect(wrapper.findAll('.arena-chip--amber').length).toBe(1)
    expect(wrapper.text()).toContain('未解锁')
    // 下一步行动
    expect(wrapper.text()).toContain('先补简历')
    expect(wrapper.text()).toContain('0/6')
  })

  it('marks all main nodes done and renders keyword unlock panel from a successful match', async () => {
    resumesResult.value = { records: [FULL_RESUME] }
    currentTargetResult.value = FULL_TARGET
    resumeDetailResult.value = { id: 7, projects: [{ projectId: 1, projectName: '交易系统', techStack: ['Java', 'RocketMQ'] }] }
    matchResult.value = SUCCESS_MATCH
    skillOverviewResult.value = { topGaps: [{ skillName: '高并发' }] }

    const wrapper = mountPrepare()
    await flush()

    expect(wrapper.text()).toContain('已完成 3/3')
    expect(wrapper.text()).toContain('匹配分 72')
    expect(wrapper.text()).toContain('JVM')
    expect(wrapper.text()).toContain('高并发')
    expect(wrapper.text()).toContain('已覆盖')
    expect(wrapper.text()).toContain('缺失')
    // 支线：项目证据已完成
    expect(wrapper.text()).toContain('1 个项目可复习')
    expect(wrapper.text()).toContain('交易系统')
    // 全部就绪后下一步指向模拟面试
    expect(wrapper.text()).toContain('进入模拟面试')
  })

  it('shows the failed state on the match node and points next step at regeneration', async () => {
    resumesResult.value = { records: [FULL_RESUME] }
    currentTargetResult.value = FULL_TARGET
    resumeDetailResult.value = { id: 7, projects: [] }
    matchResult.value = { reportId: 10, status: 'FAILED', errorMessage: 'JSON schema parse exception' }

    const wrapper = mountPrepare()
    await flush()

    expect(wrapper.text()).toContain('挑战失败')
    expect(wrapper.text()).toContain('重新挑战')
    expect(wrapper.text()).toContain('重新生成 JD 匹配报告')
  })

  it('shows the running state while the match report is generating', async () => {
    resumesResult.value = { records: [FULL_RESUME] }
    currentTargetResult.value = FULL_TARGET
    resumeDetailResult.value = { id: 7, projects: [] }
    matchResult.value = { reportId: 11, status: 'RUNNING' }

    const wrapper = mountPrepare()
    await flush()

    expect(wrapper.text()).toContain('生成中')
    expect(wrapper.text()).toContain('报告生成中，稍等片刻')
  })

  it('unlocks the match node only when both resume and target exist', async () => {
    resumesResult.value = { records: [FULL_RESUME] }
    currentTargetResult.value = null

    const wrapper = mountPrepare()
    await flush()

    // 简历已通关，第 2 关为当前关，第 3 关仍未解锁
    expect(wrapper.text()).toContain('已完成 1/3')
    expect(wrapper.text()).toContain('补目标岗位')
    const matchNode = wrapper.findAll('.arena-prepare__node').at(2)
    expect(matchNode?.classes()).toContain('is-locked')
  })

  it('falls back to target keywords for the coverage panel before any match exists', async () => {
    resumesResult.value = { records: [FULL_RESUME] }
    currentTargetResult.value = {
      ...FULL_TARGET,
      requiredSkills: ['JVM 调优', '分布式事务'],
      interviewFocusPoints: ['高并发设计']
    }
    resumeDetailResult.value = { id: 7, projects: [] }

    const wrapper = mountPrepare()
    await flush()

    expect(wrapper.text()).toContain('JVM 调优')
    expect(wrapper.text()).toContain('高并发设计')
    expect(wrapper.text()).toContain('待匹配')
  })
})
