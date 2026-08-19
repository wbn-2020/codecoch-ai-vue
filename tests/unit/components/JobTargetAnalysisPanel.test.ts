import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import JobTargetAnalysisPanel from '@/views/v3/components/JobTargetAnalysisPanel.vue'
import panelSource from '@/views/v3/components/JobTargetAnalysisPanel.vue?raw'

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

    expect(wrapper.findAll('.item-list > p')).toHaveLength(3)
    expect(wrapper.findAll('.interview-focus-item')).toHaveLength(4)
    expect(wrapper.findAll('.tag-list > span')).toHaveLength(12)
    expect(wrapper.findAll('.analysis-more')).toHaveLength(7)
    expect(wrapper.findAll('.analysis-more[open]')).toHaveLength(0)
    expect(wrapper.text()).toContain('展开其余 2 项')
  })

  it('renders structured interview focus as topic, reason, evidence, and suggestion sections', () => {
    const wrapper = mount(JobTargetAnalysisPanel, {
      global: { stubs },
      props: {
        analysis: {
          targetJobId: 3,
          interviewFocusPoints: [
            {
              topic: '分布式事务',
              reason: '岗位职责重点',
              evidence: 'JD 明确要求保障交易一致性',
              suggestion: '准备最终一致性方案与故障恢复案例'
            }
          ],
          parseStatus: 'PARSED'
        }
      }
    })

    const sections = wrapper.findAll('.interview-focus-section')
    expect(sections).toHaveLength(4)
    expect(sections.map((section) => section.find('dt').text())).toEqual(['主题', '原因', '证据', '建议'])
    expect(sections.map((section) => section.find('dd').text())).toEqual([
      '分布式事务',
      '岗位职责重点',
      'JD 明确要求保障交易一致性',
      '准备最终一致性方案与故障恢复案例'
    ])
    expect(wrapper.text()).not.toContain('topic')
    expect(wrapper.text()).not.toContain('reason')
    expect(wrapper.text()).not.toContain('evidence')
    expect(wrapper.text()).not.toContain('suggestion')
  })

  it('keeps legacy string focus points readable inside the structured presentation', () => {
    const wrapper = mount(JobTargetAnalysisPanel, {
      global: { stubs },
      props: {
        analysis: {
          targetJobId: 3,
          interviewFocusPoints: '高并发系统设计；缓存一致性\n线上故障复盘',
          parseStatus: 'PARSED'
        }
      }
    })

    const items = wrapper.findAll('.interview-focus-item')
    expect(items).toHaveLength(3)
    expect(items.map((item) => item.find('.interview-focus-value').text())).toEqual([
      '高并发系统设计',
      '缓存一致性',
      '线上故障复盘'
    ])
    expect(items[0].findAll('.interview-focus-section')).toHaveLength(4)
    expect(items[0].findAll('.interview-focus-value.is-empty')).toHaveLength(3)
  })

  it('ignores unknown structured fields without leaking schema keys or internal values', () => {
    const wrapper = mount(JobTargetAnalysisPanel, {
      global: { stubs },
      props: {
        analysis: {
          targetJobId: 3,
          interviewFocusPoints: [
            {
              focusPoint: '容量规划',
              focusReason: '业务峰值波动明显',
              jobEvidence: 'JD 提到大促流量保障',
              preparationAdvice: '准备压测指标和扩容决策过程',
              internal_code: 'must-not-leak',
              debugPayload: { trace_key: 'also-must-not-leak' }
            }
          ],
          parseStatus: 'PARSED'
        }
      }
    })

    expect(wrapper.text()).toContain('容量规划')
    expect(wrapper.text()).toContain('业务峰值波动明显')
    expect(wrapper.text()).toContain('JD 提到大促流量保障')
    expect(wrapper.text()).toContain('准备压测指标和扩容决策过程')
    expect(wrapper.text()).not.toContain('focusPoint')
    expect(wrapper.text()).not.toContain('focusReason')
    expect(wrapper.text()).not.toContain('jobEvidence')
    expect(wrapper.text()).not.toContain('preparationAdvice')
    expect(wrapper.text()).not.toContain('internal_code')
    expect(wrapper.text()).not.toContain('must-not-leak')
    expect(wrapper.text()).not.toContain('debugPayload')
    expect(wrapper.text()).not.toContain('trace_key')
    expect(wrapper.text()).not.toContain('also-must-not-leak')
  })

  it('preserves long interview content and exposes stable wrapping hooks', () => {
    const longTopic = `跨区域交易一致性${'与故障恢复边界'.repeat(30)}`
    const multilineSuggestion = '先说明约束与目标\n再给出取舍、监控指标和回滚路径'
    const wrapper = mount(JobTargetAnalysisPanel, {
      global: { stubs },
      props: {
        analysis: {
          targetJobId: 3,
          interviewFocusPoints: [
            {
              topic: longTopic,
              suggestion: multilineSuggestion
            }
          ],
          parseStatus: 'PARSED'
        }
      }
    })

    const values = wrapper.findAll('.interview-focus-value')
    expect(values[0].text()).toBe(longTopic)
    expect(values[3].text()).toBe(multilineSuggestion)
    expect(values[0].classes()).toContain('interview-focus-value')
    expect(panelSource).toMatch(/\.interview-focus-value\s*\{[\s\S]*?white-space:\s*pre-wrap;/)
    expect(panelSource).toMatch(/\.interview-focus-value\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/)
    expect(panelSource).toMatch(/\.interview-focus-value\s*\{[\s\S]*?word-break:\s*break-word;/)
  })
})
