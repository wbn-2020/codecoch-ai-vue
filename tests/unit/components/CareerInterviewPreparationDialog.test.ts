import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ElMessage, ElMessageBox } from 'element-plus'

const { getPreparation, generatePreparation } = vi.hoisted(() => ({
  getPreparation: vi.fn(),
  generatePreparation: vi.fn()
}))

vi.mock('@/api/careerGrowth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/careerGrowth')>()
  return {
    ...actual,
    getCareerInterviewPreparationApi: getPreparation,
    generateCareerInterviewPreparationApi: generatePreparation
  }
})

import CareerInterviewPreparationDialog from '@/views/v4/career-calendar/components/CareerInterviewPreparationDialog.vue'

const event = {
  id: 9,
  title: '技术面试',
  eventType: 'TECHNICAL_INTERVIEW',
  startsAt: '2026-07-20T10:00:00',
  endsAt: '2026-07-20T11:00:00',
  timezone: 'Asia/Shanghai',
  location: '线上'
}

const preparation = {
  calendarEventId: 9,
  timeBudgetMinutes: 60 as const,
  summary: '聚焦岗位要求和项目证据。',
  facts: ['面试时间已确认。'],
  limits: ['缺少完整岗位要求。'],
  focusAreas: ['项目取舍'],
  projectStories: ['缓存治理项目'],
  practiceQuestions: ['建议练习缓存失效后的补偿方向。'],
  checklist: ['检查网络。'],
  schedule: ['0-15 分钟：核对岗位信息。'],
  nextActions: ['完成准备安排。'],
  evidenceSources: [
    'CAREER_CALENDAR_EVENT:9',
    'JOB_APPLICATION:7',
    'CALENDAR_EVENT:10',
    'APPLICATION:8',
    'RESUME_VERSION:3',
    'UNRECOGNIZED_SOURCE:99'
  ],
  confidenceLevel: 'LOW',
  fallback: true,
  sourceHash: '1234567890abcdef',
  status: 'FALLBACK',
  generatedAt: '2026-07-18T18:00:00'
}

const stubs = {
  'el-dialog': {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
  },
  'el-alert': true,
  'el-button': {
    props: ['disabled', 'loading'],
    emits: ['click'],
    template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-segmented': {
    name: 'ElSegmented',
    props: ['modelValue', 'options'],
    emits: ['change'],
    template: `
      <div>
        <button
          v-for="option in options"
          :key="option.value"
          :data-budget="option.value"
          @click="$emit('change', option.value)"
        >{{ option.label }}</button>
      </div>
    `
  },
  'el-skeleton': true,
  'el-tag': {
    template: '<span v-bind="$attrs"><slot /></span>'
  },
  'el-tooltip': {
    props: ['content'],
    template: '<span :data-tooltip="content"><slot /></span>'
  }
}

describe('CareerInterviewPreparationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPreparation.mockResolvedValue(preparation)
    generatePreparation.mockResolvedValue(preparation)
    vi.spyOn(ElMessage, 'success').mockImplementation(() => undefined as never)
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm')
  })

  it('shows fallback, LOW confidence, limits, and evidence sources independently', async () => {
    const wrapper = mount(CareerInterviewPreparationDialog, {
      props: { visible: true, event },
      global: { stubs }
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="interview-preparation-fallback"]').text()).toBe('规则降级')
    expect(wrapper.get('[data-testid="interview-preparation-confidence"]').text()).toBe('低置信度')
    expect(wrapper.text()).toContain('缺少完整岗位要求')
    const sources = wrapper.get('[data-testid="interview-preparation-sources"]').text()
    expect(sources).toContain('日历事件 #9')
    expect(sources).toContain('关联投递 #7')
    expect(sources).toContain('日历事件 #10')
    expect(sources).toContain('关联投递 #8')
    expect(sources).toContain('简历版本 #3')
    expect(sources).toContain('其他证据来源 #99')
    expect(sources).not.toContain('UNRECOGNIZED_SOURCE')
  })

  it('uses force for same-budget regeneration and a new source hash request for a changed budget', async () => {
    const wrapper = mount(CareerInterviewPreparationDialog, {
      props: { visible: true, event },
      global: { stubs }
    })
    await flushPromises()

    expect(wrapper.findAll('[data-budget]').map((item) => item.attributes('data-budget')))
      .toEqual(['30', '60', '120'])
    await wrapper.get('[data-testid="generate-interview-preparation"]').trigger('click')
    await flushPromises()
    expect(generatePreparation).toHaveBeenNthCalledWith(
      1,
      9,
      { timeBudgetMinutes: 60, force: true }
    )

    const setupState = (wrapper.vm as unknown as {
      $: { setupState: { selectTimeBudget: (value: number) => void } }
    }).$.setupState
    setupState.selectTimeBudget(120)
    await flushPromises()
    expect((setupState as unknown as { timeBudgetMinutes: number }).timeBudgetMinutes).toBe(120)
    await wrapper.get('[data-testid="generate-interview-preparation"]').trigger('click')
    await flushPromises()
    expect(generatePreparation).toHaveBeenNthCalledWith(
      2,
      9,
      { timeBudgetMinutes: 120, force: false }
    )
  })

  it('shows an explicitly unavailable plan entry without calling any mutation', async () => {
    const wrapper = mount(CareerInterviewPreparationDialog, {
      props: { visible: true, event },
      global: { stubs }
    })
    await flushPromises()

    const planButton = wrapper.get('[data-testid="add-interview-preparation-to-plan"]')
    expect(planButton.attributes('disabled')).toBeDefined()
    expect(planButton.attributes('title')).toBe('当前版本暂不支持加入计划')
    expect(wrapper.get('[data-tooltip="当前版本暂不支持加入计划"]').exists()).toBe(true)

    await planButton.trigger('click')
    expect(generatePreparation).not.toHaveBeenCalled()
  })
})
