import { describe, expect, it, vi } from 'vitest'

import {
  buildWeeklyPlanPreviewPayload,
  buildWeeklyReportCoverageGroups,
  buildWeeklyReportIdempotencyKey,
  clampWeeklyReportWeekStart,
  createWeeklyReportRequestGate,
  formatWeeklyReportDisplayValue,
  getWeeklyPlanUnavailableReason,
  getWeeklyReportActionTypeLabel,
  getWeeklyReportDirectionLabel,
  getCurrentWeeklyReportWeekStart,
  getWeeklyReportDisplayPolicy,
  getWeeklyReportFixedVariableLabels,
  getWeeklyReportHypothesisStatusLabel,
  getWeeklyReportMetricLabel,
  getWeeklyReportPriorityLabel,
  getWeeklyReportSignalTypeLabel,
  getWeeklyReportSourceLabel,
  getWeeklyReportUserText,
  getWeeklyReportVariableLabel,
  getWeeklyReportWeekEnd,
  isFutureWeeklyReportWeek,
  normalizeAgentWeeklyReport,
  toWeeklyReportWeekStart
} from '@/features/agent-weekly-report'

describe('agent weekly report feature', () => {
  it('normalizes Monday and Sunday into the same natural week', () => {
    expect(toWeeklyReportWeekStart('2026-07-13', 'Asia/Shanghai')).toBe('2026-07-13')
    expect(toWeeklyReportWeekStart('2026-07-19', 'Asia/Shanghai')).toBe('2026-07-13')
    expect(getWeeklyReportWeekEnd('2026-07-13')).toBe('2026-07-19')
    expect(
      getCurrentWeeklyReportWeekStart(
        'Asia/Shanghai',
        new Date('2026-07-18T04:00:00.000Z')
      )
    ).toBe('2026-07-13')
  })

  it('clamps future weeks to the current user-timezone week', () => {
    const now = new Date('2026-07-20T04:00:00.000Z')

    expect(clampWeeklyReportWeekStart('2026-07-27', 'Asia/Shanghai', now))
      .toBe('2026-07-20')
    expect(clampWeeklyReportWeekStart('2026-07-13', 'Asia/Shanghai', now))
      .toBe('2026-07-13')
    expect(isFutureWeeklyReportWeek('2026-07-27', 'Asia/Shanghai', now)).toBe(true)
    expect(isFutureWeeklyReportWeek('2026-07-20', 'Asia/Shanghai', now)).toBe(false)
  })

  it('keeps FACT_ONLY, fallback, partial coverage and source gaps explicit', () => {
    const report = normalizeAgentWeeklyReport({
      id: 12,
      snapshotId: 34,
      confidenceLevel: 'FACT_ONLY',
      fallback: true,
      resultSource: 'FALLBACK',
      coverage: {
        consistencyLevel: 'PARTIAL',
        includedCounts: { JOB_APPLICATION: 4 },
        unavailableCounts: { INTERVIEW_REPORT: 1 },
        sources: [
          {
            sourceType: 'INTERVIEW_REPORT',
            inclusionStatus: 'UNAVAILABLE',
            excludeReason: 'INTERVIEW_SERVICE_TIMEOUT'
          }
        ]
      },
      facts: [{ factId: 'application.activity.count', label: '本周投递活动数', value: 4 }],
      signals: [{ signalId: 'unsafe-signal', title: '不应展示的强信号' }],
      hypotheses: [{ hypothesisId: 'unsafe-hypothesis', statement: '不应展示的假设' }],
      experimentSuggestions: [{ suggestionId: 'unsafe-experiment', title: '不应展示的实验' }],
      planDraft: {
        available: true,
        items: [{ semanticKey: 'sample', title: '补齐投递样本' }]
      }
    })

    expect(report).not.toBeNull()
    expect(report?.confidenceLevel).toBe('FACT_ONLY')
    expect(report?.fallback).toBe(true)
    expect(report?.coverage.consistencyLevel).toBe('PARTIAL')
    expect(getWeeklyReportDisplayPolicy(report)).toEqual({
      factOnly: true,
      showSignals: false,
      showHypotheses: false,
      showExperiments: false,
      showPlanDraft: true,
      sourceLimited: true
    })
    expect(buildWeeklyReportCoverageGroups(report?.coverage)).toContainEqual(
      expect.objectContaining({
        sourceType: 'INTERVIEW_REPORT',
        label: '模拟面试报告',
        unavailableCount: 1,
        status: 'UNAVAILABLE',
        reasons: ['INTERVIEW_SERVICE_TIMEOUT']
      })
    )
  })

  it('builds stable operation keys and deduplicates concurrent clicks', async () => {
    const input = {
      weekStartDate: '2026-07-18',
      targetJobId: 9701301,
      timezone: 'Asia/Shanghai',
      reportId: 11,
      snapshotVersion: 2
    }
    const firstKey = buildWeeklyReportIdempotencyKey('refresh', input)
    const secondKey = buildWeeklyReportIdempotencyKey('refresh', input)
    const nextVersionKey = buildWeeklyReportIdempotencyKey('refresh', {
      ...input,
      snapshotVersion: 3
    })

    expect(firstKey).toBe(secondKey)
    expect(firstKey).toContain('2026-07-13')
    expect(nextVersionKey).not.toBe(firstKey)

    const gate = createWeeklyReportRequestGate()
    const task = vi.fn(async () => 'snapshot')
    const [first, second] = await Promise.all([
      gate.run(firstKey, task),
      gate.run(firstKey, task)
    ])

    expect(first).toBe('snapshot')
    expect(second).toBe('snapshot')
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('maps visible enums to Chinese and gives unknown codes safe fallbacks', () => {
    expect(getWeeklyReportActionTypeLabel('COLLECT_APPLICATION_SAMPLE')).toBe('补充投递样本')
    expect(getWeeklyReportActionTypeLabel('UNRECOGNIZED_ACTION')).toBe('其他手动行动')
    expect(getWeeklyReportVariableLabel('CHANNEL')).toBe('投递渠道')
    expect(getWeeklyReportVariableLabel('UNRECOGNIZED_VARIABLE')).toBe('待明确变量')
    expect(getWeeklyReportFixedVariableLabels(['TARGET_JOB', 'RESUME_VERSION'])).toEqual([
      '目标岗位',
      '简历版本'
    ])
    expect(getWeeklyReportMetricLabel('VERIFIED_RESPONSE_RATE')).toBe('已记录反馈率')
    expect(getWeeklyReportMetricLabel('UNRECOGNIZED_METRIC')).toBe('可比较结果')
    expect(getWeeklyReportHypothesisStatusLabel('TO_VALIDATE')).toBe('待验证')
    expect(getWeeklyReportHypothesisStatusLabel('UNRECOGNIZED_STATUS')).toBe('状态待确认')
    expect(getWeeklyReportPriorityLabel('MEDIUM')).toBe('中优先级')
    expect(getWeeklyReportPriorityLabel('UNRECOGNIZED_PRIORITY')).toBe('优先级待确认')
    expect(getWeeklyReportSignalTypeLabel('CHANNEL_RESPONSE_DIRECTION')).toBe('渠道反馈变化')
    expect(getWeeklyReportSignalTypeLabel('UNRECOGNIZED_SIGNAL')).toBe('其他变化')
    expect(getWeeklyReportDirectionLabel('UP')).toBe('上升')
    expect(getWeeklyReportDirectionLabel('UNRECOGNIZED_DIRECTION')).toBe('待观察')
    expect(getWeeklyReportSourceLabel('INTERVIEW_REPORT')).toBe('模拟面试报告')
    expect(getWeeklyReportSourceLabel('UNRECOGNIZED_SOURCE')).toBe('其他来源')
    expect(formatWeeklyReportDisplayValue('UNRECOGNIZED_VALUE')).toBe('待确认')
  })

  it('replaces development copy and technical references with user-facing boundaries', () => {
    const fallback = '当前仅支持查看行动建议，暂不能生成下一周计划预览。'

    expect(getWeeklyPlanUnavailableReason('阶段五当前契约不兼容周报草案')).toBe(fallback)
    expect(getWeeklyReportUserText('GET /agent/weekly-reports 不会写入数据库', fallback)).toBe(fallback)
    expect(getWeeklyReportUserText('来自周报假设 weekly:81:hypothesis:sample', fallback)).toBe(fallback)
    expect(getWeeklyReportUserText('继续补充同岗位投递记录。', fallback)).toBe('继续补充同岗位投递记录。')
  })

  it('keeps the stage-five payload as a data-only integration helper', () => {
    const report = normalizeAgentWeeklyReport({
      id: 81,
      snapshotId: 91,
      snapshotVersion: 2,
      targetJobId: 9701301,
      weekStartDate: '2026-07-13',
      timezone: 'Asia/Shanghai',
      confidenceLevel: 'LOW',
      coverage: {},
      planDraft: {
        available: false,
        targetWeekStart: '2026-07-20',
        unavailableReason: '阶段五契约暂不兼容周报草案',
        items: [
          {
            semanticKey: 'weekly:81:sample',
            targetDate: '2026-07-21',
            actionType: 'COLLECT_APPLICATION_SAMPLE',
            title: '补齐同岗位投递样本',
            sourceHypothesisId: 'weekly:81:hypothesis:sample'
          }
        ]
      }
    })

    expect(report).not.toBeNull()
    const payload = buildWeeklyPlanPreviewPayload(report!)
    expect(payload).toMatchObject({
      sourceType: 'AGENT_WEEKLY_REPORT',
      sourceId: 81,
      sourceSnapshotId: 91,
      sourceSnapshotVersion: 2,
      targetWeekStart: '2026-07-20',
      targetJobId: 9701301,
      items: [
        expect.objectContaining({
          plannedDate: '2026-07-21',
          requiresUserConfirmation: true
        })
      ]
    })
    expect(report?.planDraft.available).toBe(false)
    expect(report?.planDraft.stageFivePreviewRoute).toBeUndefined()
  })
})
