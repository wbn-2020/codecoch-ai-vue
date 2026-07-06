import { describe, expect, it } from 'vitest'

import type { AgentTaskVO } from '@/types/agent'
import type { JobSearchExperimentStrategyVO } from '@/types/jobExperiment'
import {
  fromAgentMemories,
  fromAgentMemory,
  fromAgentTask,
  fromJobExperimentStrategy,
  fromKnowledgeAskReferences,
  fromKnowledgeSearchResult,
  isAgentMemoryActive,
  isEvidenceSourceActive,
  isStrongEvidenceSource,
  knowledgeTrustStatus,
  memoryTrustStatus,
  normalizeConfidenceLevel,
  normalizeEvidenceSources
} from '@/utils/suggestionAdapter'

describe('suggestionAdapter', () => {
  it('maps an agent task into an explainable suggestion', () => {
    const task: AgentTaskVO & { aiCallLogId: number; promptVersionId: number } = {
      id: 42,
      agentRunId: 7001,
      traceId: 'trace-agent-42',
      aiCallLogId: 9001,
      promptVersionId: 31,
      taskType: 'APPLICATION_FOLLOW_UP',
      title: 'Follow up with recruiter',
      description: 'Send a concise follow-up message.',
      reason: 'The application has been quiet for 5 days.',
      actionUrl: '/agent/tasks/42',
      sourceType: 'JOB_APPLICATION',
      sourceId: 88,
      evidenceSummary: 'Application submitted 5 days ago.',
      fallback: false
    }

    const suggestion = fromAgentTask(task)

    expect(suggestion).toMatchObject({
      id: 'agent-task:42',
      scene: 'AGENT_TASK_RECOMMENDATION',
      bizType: 'AGENT_TASK',
      bizId: 42,
      title: 'Follow up with recruiter',
      content: 'Send a concise follow-up message.',
      reason: 'The application has been quiet for 5 days.',
      resultSource: 'LLM',
      confidenceLevel: 'MEDIUM',
      nextAction: {
        actionUrl: '/agent/tasks/42'
      },
      trace: {
        agentRunId: 7001,
        traceId: 'trace-agent-42',
        aiCallLogId: 9001,
        promptVersionId: 31
      }
    })
    expect(suggestion.evidenceSources).toEqual([
      {
        sourceType: 'JOB_APPLICATION',
        sourceId: 88,
        evidenceSummary: 'Application submitted 5 days ago.',
        sourceSummary: 'Application submitted 5 days ago.',
        summary: 'Application submitted 5 days ago.'
      }
    ])
  })

  it('maps job experiment strategy evidence sources and trace context', () => {
    const strategy: JobSearchExperimentStrategyVO = {
      title: 'Keep collecting comparable applications',
      content: 'Use the same role direction before comparing resume versions.',
      confidenceLevel: 'HIGH',
      actionUrl: '/job-experiments/9/review',
      evidenceSources: [
        {
          sourceType: 'RESUME_VERSION',
          sourceId: 101,
          sourceSummary: 'Resume A has project evidence.'
        },
        {
          sourceType: 'JOB_APPLICATION',
          sourceId: 202,
          sourceSummary: 'Application B received feedback.'
        }
      ]
    }

    const suggestion = fromJobExperimentStrategy(strategy, {
      experimentId: 9,
      traceId: 'trace-job-9',
      aiCallLogId: 9002,
      promptVersionId: 32,
      resultSource: 'llm'
    })

    expect(suggestion).toMatchObject({
      id: 'job-experiment:9:strategy',
      scene: 'JOB_EXPERIMENT_STRATEGY',
      bizType: 'JOB_EXPERIMENT',
      bizId: 9,
      title: 'Keep collecting comparable applications',
      content: 'Use the same role direction before comparing resume versions.',
      confidenceLevel: 'HIGH',
      resultSource: 'LLM',
      nextAction: {
        actionUrl: '/job-experiments/9/review'
      },
      trace: {
        traceId: 'trace-job-9',
        aiCallLogId: 9002,
        promptVersionId: 32
      }
    })
    expect(suggestion.evidenceSources).toEqual([
      {
        sourceType: 'RESUME_VERSION',
        sourceId: 101,
        evidenceSummary: 'Resume A has project evidence.',
        sourceSummary: 'Resume A has project evidence.',
        summary: 'Resume A has project evidence.'
      },
      {
        sourceType: 'JOB_APPLICATION',
        sourceId: 202,
        evidenceSummary: 'Application B received feedback.',
        sourceSummary: 'Application B received feedback.',
        summary: 'Application B received feedback.'
      }
    ])
  })

  it('downgrades fallback suggestions to FALLBACK result source and LOW confidence', () => {
    const suggestion = fromAgentTask({
      id: 7,
      title: 'Review a general checklist',
      fallback: true,
      trustStatus: 'FALLBACK',
      sourceType: 'AGENT_RULE',
      evidenceSummary: 'Generated from fallback rule.'
    })

    expect(suggestion.fallback).toBe(true)
    expect(suggestion.resultSource).toBe('FALLBACK')
    expect(suggestion.confidenceLevel).toBe('LOW')
  })

  it('normalizes empty or invalid evidence sources without throwing', () => {
    expect(normalizeEvidenceSources()).toEqual([])
    expect(normalizeEvidenceSources(null)).toEqual([])
    expect(normalizeEvidenceSources([null, {}, { sourceType: ' ', sourceSummary: '  ' }])).toEqual([])
  })

  it('preserves sample-insufficient warnings from job experiment strategies', () => {
    const suggestion = fromJobExperimentStrategy({
      title: 'Collect more samples',
      content: 'Continue the experiment before drawing conclusions.',
      confidenceLevel: 'LOW',
      sampleInsufficient: true,
      sampleWarning: 'Only 4 applications and 0 completed interviews are available.',
      evidenceSources: []
    }, {
      experimentId: 12
    })

    expect(suggestion.sampleInsufficient).toBe(true)
    expect(suggestion.sampleWarning).toBe('Only 4 applications and 0 completed interviews are available.')
    expect(normalizeConfidenceLevel('low')).toBe('LOW')
  })

  it('maps a knowledge search result into a KNOWLEDGE_CHUNK evidence source', () => {
    const source = fromKnowledgeSearchResult({
      documentId: 12,
      chunkId: 34,
      chunkIndex: 2,
      title: 'Redis interview notes',
      documentType: 'INTERVIEW_REVIEW',
      snippet: 'Redis consistency answer needs more business boundary context.',
      highlightedSnippet: '<mark>Redis</mark> consistency',
      sourceRef: 'notes.md#redis',
      score: 0.87,
      matchType: 'semantic',
      indexedAt: '2026-07-05T10:00:00'
    }, 0, {
      citationValid: true,
      answerGrounded: true,
      insufficientReferences: false
    })

    expect(source).toMatchObject({
      id: 'knowledge-chunk:12:34',
      sourceType: 'KNOWLEDGE_CHUNK',
      sourceId: 34,
      title: 'Redis interview notes',
      sourceTitle: 'Redis interview notes',
      sourceLabel: 'notes.md#redis',
      evidenceSummary: 'Redis consistency answer needs more business boundary context.',
      sourceUpdatedAt: '2026-07-05T10:00:00',
      trustStatus: 'VERIFIED',
      metadata: {
        documentId: 12,
        chunkId: 34,
        chunkIndex: 2,
        documentType: 'INTERVIEW_REVIEW',
        sourceRef: 'notes.md#redis',
        score: 0.87,
        matchType: 'SEMANTIC',
        citationValid: true,
        answerGrounded: true,
        insufficientReferences: false
      }
    })
  })

  it('maps knowledge ask references and downgrades insufficient citations', () => {
    const sources = fromKnowledgeAskReferences({
      insufficientReferences: true,
      citationValid: false,
      answerGrounded: false,
      references: [
        {
          documentId: 8,
          chunkId: 9,
          title: 'Project notes',
          snippet: 'Only a weak keyword match.',
          sourceRef: 'project.md#1',
          score: 0.31
        }
      ]
    })

    expect(sources).toHaveLength(1)
    expect(sources[0]).toMatchObject({
      sourceType: 'KNOWLEDGE_CHUNK',
      sourceId: 9,
      trustStatus: 'FALLBACK',
      metadata: {
        documentId: 8,
        chunkId: 9,
        sourceRef: 'project.md#1',
        score: 0.31,
        citationValid: false,
        answerGrounded: false,
        insufficientReferences: true
      }
    })
    expect(knowledgeTrustStatus({ citationValid: false, answerGrounded: true })).toBe('FALLBACK')
  })

  it('keeps low-confidence knowledge citations out of strong evidence', () => {
    const source = fromKnowledgeSearchResult({
      documentId: 12,
      chunkId: 35,
      title: 'Low score notes',
      snippet: 'A weakly related Redis note.',
      sourceRef: 'notes.md#weak',
      score: 0.24
    }, 0, {
      citationValid: true,
      answerGrounded: true,
      minScore: 0.45
    })

    expect(source).toMatchObject({
      trustStatus: 'FALLBACK',
      metadata: {
        score: 0.24,
        minScore: 0.45,
        lowConfidence: true,
        citationValid: true,
        answerGrounded: true
      }
    })
    expect(isEvidenceSourceActive(source)).toBe(true)
    expect(isStrongEvidenceSource(source)).toBe(false)
  })

  it('propagates ask citation warnings and minimum score to references', () => {
    const sources = fromKnowledgeAskReferences({
      insufficientReferences: false,
      citationValid: true,
      answerGrounded: true,
      citationWarning: '引用数量不足以支撑强结论',
      minReferenceScore: 0.6,
      references: [
        {
          documentId: 18,
          chunkId: 19,
          title: 'Offer review',
          snippet: 'Only one marginal reference.',
          sourceRef: 'offer.md#1',
          score: 0.5
        }
      ]
    })

    expect(sources[0]).toMatchObject({
      trustStatus: 'FALLBACK',
      metadata: {
        citationWarning: '引用数量不足以支撑强结论',
        minScore: 0.6,
        lowConfidence: true
      }
    })
    expect(isStrongEvidenceSource(sources[0])).toBe(false)
  })

  it('keeps rich evidence metadata when normalizing existing evidence sources', () => {
    expect(normalizeEvidenceSources({
      sourceType: 'knowledge_chunk',
      sourceId: '34',
      sourceTitle: 'Knowledge chunk',
      sourceSummary: 'Chunk summary',
      trustStatus: 'verified',
      documentId: 12,
      chunkId: 34,
      sourceRef: 'notes.md#redis',
      score: 0.87,
      citationValid: true,
      answerGrounded: true,
      insufficientReferences: false
    })).toEqual([
      {
        sourceType: 'KNOWLEDGE_CHUNK',
        sourceId: 34,
        sourceTitle: 'Knowledge chunk',
        title: 'Knowledge chunk',
        evidenceSummary: 'Chunk summary',
        sourceSummary: 'Chunk summary',
        summary: 'Chunk summary',
        trustStatus: 'VERIFIED',
        metadata: {
          documentId: 12,
          chunkId: 34,
          sourceRef: 'notes.md#redis',
          score: 0.87,
          citationValid: true,
          answerGrounded: true,
          insufficientReferences: false
        }
      }
    ])
  })

  it('maps active long-term memory into an AGENT_MEMORY evidence source', () => {
    const source = fromAgentMemory({
      id: 77,
      memoryType: 'WEAKNESS',
      content: 'System design answers need clearer business boundaries.',
      sourceType: 'INTERVIEW_REPORT',
      sourceId: 501,
      confidence: 0.82,
      enabled: 1,
      confirmedAt: '2026-07-05T08:30:00',
      createdAt: '2026-07-01T08:00:00',
      updatedAt: '2026-07-05T08:00:00'
    })

    expect(source).toMatchObject({
      id: 'agent-memory:77',
      sourceType: 'AGENT_MEMORY',
      sourceId: 77,
      sourceTitle: 'WEAKNESS',
      evidenceSummary: 'System design answers need clearer business boundaries.',
      sourceUpdatedAt: '2026-07-05T08:00:00',
      trustStatus: 'VERIFIED',
      metadata: {
        memoryType: 'WEAKNESS',
        confidence: 0.82,
        enabled: true,
        active: true,
        memorySourceType: 'INTERVIEW_REPORT',
        memorySourceId: 501,
        deleted: false,
        stale: false
      }
    })
    expect(isEvidenceSourceActive(source)).toBe(true)
  })

  it('does not treat disabled or deleted long-term memory as active evidence', () => {
    const disabled = {
      id: 78,
      memoryType: 'PREFERENCE',
      content: 'Avoid long study sessions.',
      confidence: 0.9,
      enabled: 0
    }
    const deleted = {
      id: 79,
      memoryType: 'JOB_STRATEGY',
      content: 'Old strategy.',
      confidence: 82,
      enabled: 1,
      status: 'DELETED'
    }

    const disabledSource = fromAgentMemory(disabled)

    expect(isAgentMemoryActive(disabled)).toBe(false)
    expect(isAgentMemoryActive(deleted)).toBe(false)
    expect(disabledSource.trustStatus).toBe('DISABLED')
    expect(isEvidenceSourceActive(disabledSource)).toBe(false)
    expect(fromAgentMemories([disabled, deleted], { activeOnly: true })).toEqual([])
    expect(memoryTrustStatus({ id: 80, enabled: 1, confidence: 0.4 })).toBe('FALLBACK')
    expect(memoryTrustStatus({ id: 81, enabled: 1 })).toBe('PARTIAL')
  })

  it('keeps unconfirmed non-manual memories out of active evidence', () => {
    const candidate = {
      id: 82,
      memoryType: 'SKILL_GAP',
      content: 'Review-generated memory waiting for user confirmation.',
      sourceType: 'AGENT_REVIEW',
      sourceId: 12,
      confidence: 0.91,
      enabled: 1
    }

    const source = fromAgentMemory(candidate)

    expect(isAgentMemoryActive(candidate)).toBe(false)
    expect(source).toMatchObject({
      sourceType: 'AGENT_MEMORY',
      trustStatus: 'PARTIAL',
      metadata: {
        memoryStatus: 'CANDIDATE',
        confirmed: false,
        active: false,
        memorySourceType: 'AGENT_REVIEW'
      }
    })
    expect(isEvidenceSourceActive(source)).toBe(false)
    expect(fromAgentMemories([candidate], { activeOnly: true })).toEqual([])
  })

  it('keeps stale or expired memories out of active evidence', () => {
    const expired = {
      id: 85,
      memoryType: 'JOB_STRATEGY',
      content: 'Old strategy that should be reviewed.',
      sourceType: 'MANUAL',
      confidence: 0.92,
      enabled: 1,
      expiresAt: '2000-01-01T00:00:00'
    }
    const stale = {
      id: 86,
      memoryType: 'SKILL_GAP',
      content: 'Marked stale by backend.',
      sourceType: 'MANUAL',
      confidence: 0.91,
      enabled: 1,
      memoryStatus: 'STALE',
      stale: true
    }

    expect(isAgentMemoryActive(expired)).toBe(false)
    expect(memoryTrustStatus(expired)).toBe('STALE')
    expect(fromAgentMemory(expired)).toMatchObject({
      trustStatus: 'STALE',
      metadata: {
        active: false,
        expiresAt: '2000-01-01T00:00:00'
      }
    })
    expect(isEvidenceSourceActive(fromAgentMemory(stale))).toBe(false)
  })

  it('allows manual and explicitly confirmed non-manual memories as active evidence', () => {
    const manual = {
      id: 83,
      memoryType: 'USER_NOTE',
      content: 'Prefers short focused practice blocks.',
      sourceType: 'MANUAL',
      confidence: 0.86,
      enabled: 1
    }
    const confirmedReviewMemory = {
      id: 84,
      memoryType: 'SKILL_GAP',
      content: 'Needs clearer trade-off explanation.',
      sourceType: 'AGENT_REVIEW',
      sourceId: 15,
      confidence: 0.84,
      enabled: 1,
      memoryStatus: 'CONFIRMED',
      confirmedAt: '2026-07-06T09:30:00'
    }

    expect(isAgentMemoryActive(manual)).toBe(true)
    expect(isAgentMemoryActive(confirmedReviewMemory)).toBe(true)
    expect(fromAgentMemory(manual).trustStatus).toBe('VERIFIED')
    expect(fromAgentMemory(confirmedReviewMemory)).toMatchObject({
      trustStatus: 'VERIFIED',
      metadata: {
        memoryStatus: 'CONFIRMED',
        confirmed: true,
        confirmedAt: '2026-07-06T09:30:00'
      }
    })
  })
})
