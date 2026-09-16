import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import QuestionMeta from '@/components/question/QuestionMeta.vue'
import { questionExperienceLevelOptions, questionTypeOptions } from '@/constants/enums'
import { getOptionLabel } from '@/utils/format'

const elTagStub = {
  template: '<span class="el-tag-stub"><slot /></span>'
}

const mountMeta = (props: Record<string, unknown>) =>
  mount(QuestionMeta, {
    props,
    global: {
      stubs: { 'el-tag': elTagStub }
    }
  })

describe('QuestionMeta 题型标签映射', () => {
  it('CASE_ANALYSIS 渲染中文"案例分析"，不再落入"题型待确认"', () => {
    const wrapper = mountMeta({ questionType: 'CASE_ANALYSIS', difficulty: 'MEDIUM' })
    expect(wrapper.text()).toContain('案例分析')
    expect(wrapper.text()).not.toContain('题型待确认')
  })

  it('标准题型均映射为中文', () => {
    expect(mountMeta({ questionType: 'SHORT_ANSWER' }).text()).toContain('表达题')
    expect(mountMeta({ questionType: 'SCENARIO' }).text()).toContain('场景拆解')
    expect(mountMeta({ questionType: 'CODING' }).text()).toContain('代码思路')
  })

  it('未知题型保留"题型待确认"兜底，空题型不渲染标签', () => {
    expect(mountMeta({ questionType: 'AI_GENERATED' }).text()).toContain('题型待确认')
    expect(mountMeta({ questionType: '' }).text()).not.toContain('题型待确认')
    expect(mountMeta({}).text()).not.toContain('题型待确认')
  })

  it('难度标签始终输出中文（简单/中等/困难）', () => {
    expect(mountMeta({ difficulty: 'EASY' }).text()).toContain('简单')
    expect(mountMeta({ difficulty: 'MEDIUM' }).text()).toContain('中等')
    expect(mountMeta({ difficulty: 'HARD' }).text()).toContain('困难')
  })
})

describe('题库职级/题型枚举映射（enums.ts）', () => {
  it('职级英文枚举映射为中文：JUNIOR→初级、MID→中级、SENIOR→高级', () => {
    expect(getOptionLabel(questionExperienceLevelOptions, 'JUNIOR')).toBe('初级')
    expect(getOptionLabel(questionExperienceLevelOptions, 'MID')).toBe('中级')
    expect(getOptionLabel(questionExperienceLevelOptions, 'SENIOR')).toBe('高级')
  })

  it('未知职级值不被误映射（回退原值，展示层保留原样）', () => {
    expect(getOptionLabel(questionExperienceLevelOptions, 'EXPERT')).toBe('EXPERT')
  })

  it('questionTypeOptions 覆盖种子数据值域（含 CASE_ANALYSIS）', () => {
    const values = questionTypeOptions.map((option) => option.value)
    expect(values).toEqual(expect.arrayContaining(['SHORT_ANSWER', 'SCENARIO', 'CODING', 'CASE_ANALYSIS']))
    expect(getOptionLabel(questionTypeOptions, 'CASE_ANALYSIS')).toBe('案例分析')
  })
})
