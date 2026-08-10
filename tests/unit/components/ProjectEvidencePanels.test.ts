import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import ProjectCompletenessPanel from '@/components/project-evidence/ProjectCompletenessPanel.vue'
import ProjectEvidenceForm from '@/components/project-evidence/ProjectEvidenceForm.vue'
import ProjectJdCoveragePanel from '@/components/project-evidence/ProjectJdCoveragePanel.vue'

const routeState = {
  query: { targetJobId: '42' }
}
const coverageApi = vi.hoisted(() => ({
  analyze: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState
}))

vi.mock('@/api/projectEvidence', () => ({
  analyzeProjectJdCoverageApi: coverageApi.analyze
}))

const stubs = {
  'el-form': {
    template: '<form><slot /></form>'
  },
  'el-form-item': {
    template: '<label><span><slot /></span></label>'
  },
  'el-input': {
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<textarea :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  'el-input-number': {
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<input type="number" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', Number($event.target.value) || undefined)" />'
  },
  'el-progress': true,
  'el-tag': {
    template: '<span class="el-tag"><slot /></span>'
  },
  'el-button': {
    props: ['loading'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>'
  }
}

describe('project evidence panels', () => {
  it('groups project evidence by fact, process, and result and keeps numeric IDs advanced', () => {
    const wrapper = mount(ProjectEvidenceForm, {
      global: { stubs },
      props: { modelValue: { title: '订单中台', targetJobId: 7 } }
    })

    expect(wrapper.text()).toContain('事实')
    expect(wrapper.text()).toContain('过程')
    expect(wrapper.text()).toContain('结果')
    expect(wrapper.findAll('details')).toHaveLength(1)
    expect(wrapper.find('input[type="number"]').element.value).toBe('7')
  })

  it('highlights the first missing field as the priority gap', () => {
    const wrapper = mount(ProjectCompletenessPanel, {
      global: { stubs },
      props: {
        score: 58,
        status: 'NEEDS_IMPROVEMENT',
        missingFields: ['result', 'responsibility', 'reflection']
      }
    })

    expect(wrapper.find('[data-testid="first-priority-gap"]').text()).toContain('量化结果')
    expect(wrapper.text()).toContain('其他待补')
    expect(wrapper.text()).toContain('个人贡献')
  })

  it('uses the associated target job by default and sends it when analyzing', async () => {
    coverageApi.analyze.mockResolvedValue({
      projectEvidenceId: 9,
      targetJobId: 42,
      coverageScore: 80,
      coveredSkills: ['Redis']
    })

    const wrapper = mount(ProjectJdCoveragePanel, {
      global: { stubs },
      props: { projectId: 9, defaultTargetJobId: 42 }
    })

    expect(wrapper.find('.linked-job').text()).toContain('默认使用已关联岗位')
    await wrapper.findAll('button').find((button) => button.text().includes('开始分析'))!.trigger('click')
    await flushPromises()

    expect(coverageApi.analyze).toHaveBeenCalledWith(9, {
      targetJobId: 42,
      jdText: undefined
    })
    expect(wrapper.text()).toContain('Redis')
  })
})
