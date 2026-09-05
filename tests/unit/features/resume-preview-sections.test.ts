import { describe, expect, it } from 'vitest'

import {
  buildResumeProjectPreviewBullets,
  buildResumeProjectPreviewSections
} from '@/features/resume-project-preview'
import {
  describeResumeParserSchemaField,
  isKnownResumeParserSchemaKey,
  resumeParserSchemaLabel
} from '@/features/resume-parser-schema'

describe('resume project preview sections', () => {
  it('maps alias fields into one ordered preview section and renders duplicate values once', () => {
    const project = {
      projectBackground: '支撑多渠道订单接入',
      description: '支撑多渠道订单接入',
      coreFeatures: '建设订单编排流程',
      highlights: '建设订单编排流程',
      technicalChallenges: '解决热点数据竞争',
      technicalDifficulties: '解决热点数据竞争',
      optimizationResult: '峰值吞吐提升 40%',
      optimizationResults: '峰值吞吐提升 40%'
    }

    expect(buildResumeProjectPreviewSections(project)).toEqual([
      { key: 'background', title: '项目背景', values: ['支撑多渠道订单接入'] },
      { key: 'core', title: '核心功能', values: ['建设订单编排流程'] },
      { key: 'technical', title: '技术难点', values: ['解决热点数据竞争'] },
      { key: 'outcome', title: '结果指标', values: ['峰值吞吐提升 40%'] }
    ])
    expect(buildResumeProjectPreviewBullets(project)).toEqual([
      '项目背景：支撑多渠道订单接入',
      '核心功能：建设订单编排流程',
      '技术难点：解决热点数据竞争',
      '结果指标：峰值吞吐提升 40%'
    ])
  })

  it('omits empty preview sections and keeps raw parser keys out of user labels', () => {
    expect(buildResumeProjectPreviewSections({ coreFeatures: '建设订单流程' }))
      .toEqual([{ key: 'core', title: '核心功能', values: ['建设订单流程'] }])
    expect(resumeParserSchemaLabel('projectExperiences')).toBe('项目经历')
    expect(resumeParserSchemaLabel('unexpected_raw_key')).toBe('未识别字段')
    expect(isKnownResumeParserSchemaKey('unexpected_raw_key')).toBe(false)
    expect(describeResumeParserSchemaField('unexpected_raw_key')).toEqual({
      label: '未识别字段',
      known: false,
      rawKey: 'unexpected_raw_key'
    })
  })
})
