import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import JobTargetAnalysisPanel from '@/views/v3/components/JobTargetAnalysisPanel.vue'

const stubs = {
  JobTargetStatusTag: true,
  'el-tag': {
    template: '<span><slot /></span>'
  }
}

describe('JobTargetAnalysisPanel', () => {
  it('summarizes long lists and keeps the remaining items behind collapsed details', () => {
    const wrapper = mount(JobTargetAnalysisPanel, {
      global: { stubs },
      props: {
        analysis: {
          targetJobId: 3,
          responsibilities: ['职责一', '职责二', '职责三', '职责四', '职责五'],
          requiredSkills: ['Java', 'Spring', 'Redis', 'MySQL', 'Kafka'],
          bonusSkills: ['DDD', '云原生', '性能优化', '英文文档'],
          interviewFocusPoints: ['重点一', '重点二', '重点三', '重点四'],
          techStackKeywords: ['Java', 'Spring Boot', 'Redis', 'MySQL'],
          businessKeywords: ['交易', '风控', '履约', '供应链'],
          skillWeights: { Java: 40, Redis: 30, MySQL: 20, Kafka: 10 },
          parseStatus: 'PARSED'
        }
      }
    })

    expect(wrapper.findAll('.item-list > p')).toHaveLength(6)
    expect(wrapper.findAll('.tag-list > span')).toHaveLength(12)
    expect(wrapper.findAll('.analysis-more')).toHaveLength(7)
    expect(wrapper.findAll('.analysis-more[open]')).toHaveLength(0)
    expect(wrapper.text()).toContain('展开其余 2 项')
  })
})
