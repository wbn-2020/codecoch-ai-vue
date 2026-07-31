import { describe, expect, it } from 'vitest'

import {
  auditEvidenceMeta,
  findAnchorOccurrences,
  isLowRiskBatchCandidate,
  normalizeResumeArtifact,
  normalizeResumeAudit,
  normalizeResumeSuggestion
} from '@/features/resume-delivery'

describe('resume delivery normalization', () => {
  it('blocks accepting a suggestion based on a stale resume version', () => {
    const suggestion = normalizeResumeSuggestion({
      id: 9,
      sourceResumeVersionId: 12,
      sectionKey: 'summary',
      anchorStart: 0,
      anchorEnd: 4,
      originalText: '负责系统',
      suggestedText: '主导核心系统',
      status: 'PENDING'
    }, 13)

    expect(suggestion.stale).toBe(true)
    expect(suggestion.canAccept).toBe(false)
    expect(suggestion.canReject).toBe(true)
  })

  it('keeps unsupported findings conservative', () => {
    const audit = normalizeResumeAudit({
      id: 1,
      resumeVersionId: 7,
      status: 'SUCCESS',
      findings: [{
        evidenceStatus: 'UNSUPPORTED',
        claimText: '性能提升 80%'
      }]
    })

    expect(audit.findings[0]?.evidenceStatus).toBe('UNSUPPORTED')
    expect(auditEvidenceMeta('UNSUPPORTED').conclusion).toContain('不等于事实为假')
  })

  it('preserves backend quantitative-risk findings instead of downgrading them to unknown', () => {
    const audit = normalizeResumeAudit({
      id: 2,
      resumeVersionId: 7,
      findings: [{
        evidenceStatus: 'RISK',
        claimText: '订单峰值吞吐提升 80%'
      }]
    })

    expect(audit.findings[0]?.evidenceStatus).toBe('RISK')
    expect(auditEvidenceMeta('RISK')).toMatchObject({
      label: '量化风险',
      type: 'danger'
    })
    expect(auditEvidenceMeta('RISK').conclusion).toContain('不代表经历为假')
  })

  it('preserves the exact edited text that was accepted', () => {
    const suggestion = normalizeResumeSuggestion({
      id: 10,
      sourceResumeVersionId: 12,
      sectionKey: 'summary',
      anchorStart: 0,
      anchorEnd: 4,
      originalText: '负责系统',
      suggestedText: '主导核心系统',
      acceptedText: '主导核心系统，并将故障恢复时间缩短到 10 分钟',
      status: 'ACCEPTED',
      appliedResumeVersionId: 13
    }, 13)

    expect(suggestion.acceptedText).toContain('10 分钟')
    expect(suggestion.canUndo).toBe(true)
  })

  it('preserves suggestion anchors, evidence references, and risk level', () => {
    const suggestion = normalizeResumeSuggestion({
      id: 11,
      sourceResumeVersionId: 12,
      sectionKey: 'projects[0].description',
      sectionId: 'project-42',
      fieldPath: 'projects[0].description',
      anchorStart: 0,
      anchorEnd: 4,
      originalText: '负责系统',
      suggestedText: '主导核心系统',
      evidenceReferences: [{ sourceType: 'PROJECT', sourceId: 42 }],
      riskLevel: 'low',
      status: 'PENDING'
    }, 12)

    expect(suggestion.sectionId).toBe('project-42')
    expect(suggestion.fieldPath).toBe('projects[0].description')
    expect(suggestion.evidenceReferences).toEqual([{ sourceType: 'PROJECT', sourceId: 42 }])
    expect(suggestion.riskLevel).toBe('LOW')
    expect(isLowRiskBatchCandidate(suggestion)).toBe(true)
  })

  it('does not batch high-risk, edited, or stale suggestions', () => {
    const suggestion = normalizeResumeSuggestion({
      id: 12,
      sourceResumeVersionId: 12,
      sectionKey: 'summary',
      anchorStart: 0,
      anchorEnd: 4,
      originalText: '负责系统',
      suggestedText: '主导核心系统',
      riskLevel: 'HIGH',
      status: 'PENDING'
    }, 12)

    expect(isLowRiskBatchCandidate(suggestion)).toBe(false)
    expect(isLowRiskBatchCandidate({ ...suggestion, riskLevel: 'LOW' }, '人工编辑文本')).toBe(false)
    expect(isLowRiskBatchCandidate({ ...suggestion, riskLevel: 'LOW' }, '')).toBe(false)
    expect(isLowRiskBatchCandidate({ ...suggestion, riskLevel: 'LOW', stale: true })).toBe(false)
  })

  it('normalizes unknown artifact states without making them downloadable', () => {
    expect(normalizeResumeArtifact({
      id: 4,
      status: 'QUEUED',
      fileName: 'resume.pdf'
    }).status).toBe('UNKNOWN')
  })

  it('finds repeated anchors deterministically', () => {
    expect(findAnchorOccurrences('Java / Redis / Java', 'Java')).toEqual([0, 15])
  })
})
