import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(__dirname, '../../..')
const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(projectRoot, relativePath), 'utf8')

const aiCallLogSource = readSource('src/views/admin/AiCallLogView.vue')
const asyncTaskSource = readSource('src/views/admin/AsyncTaskView.vue')
const promptTemplateSource = readSource('src/views/admin/PromptTemplateView.vue')
const adminAgentTaskSource = readSource('src/views/admin/AdminAgentTaskView.vue')

describe('admin operational diagnostics presentation', () => {
  it('maps current AI scenes and keeps unknown scene codes traceable', () => {
    expect(aiCallLogSource).toContain("RESUME_STRUCTURED_PARSE")
    expect(aiCallLogSource).toContain("RESUME_JOB_MATCH")
    expect(aiCallLogSource).toContain("JOB_COACH_DAILY_PLAN")
    expect(aiCallLogSource).toContain("WEEKLY_CAREER_REPORT_GENERATE")
    expect(aiCallLogSource).toContain("return registeredSceneLabel(raw) || '未登记场景'")
    expect(aiCallLogSource).toContain('`未登记场景，原始代码：${raw}`')
    expect(aiCallLogSource).toContain('label="原始场景代码"')
  })

  it('maps operational task types and keeps unknown task codes traceable', () => {
    expect(asyncTaskSource).toContain("'resume.parse': '简历解析'")
    expect(asyncTaskSource).toContain("'resume-job-match.analyze': '简历匹配'")
    expect(asyncTaskSource).toContain("'question.ai-generate': 'AI 题目生成'")
    expect(asyncTaskSource).toContain("'search.sync': '检索索引同步'")
    expect(asyncTaskSource).toContain("return registeredTaskTypeLabel(raw) || '未登记任务类型'")
    expect(asyncTaskSource).toContain('`未登记任务类型，原始代码：${raw}`')
    expect(asyncTaskSource).toContain('label="原始任务代码"')
  })

  it.each([
    ['AI 生成记录', aiCallLogSource],
    ['异步任务', asyncTaskSource]
  ])('%s translates common technical failures into actionable Chinese diagnostics', (_label, source) => {
    expect(source).toContain('rate limit')
    expect(source).toContain('read timed out')
    expect(source).toContain('connection refused')
    expect(source).toContain('invalid api key')
    expect(source).toContain('not configured')
    expect(source).toContain('request failed')
    expect(source).toContain('建议动作')
    expect(source).toContain('建议责任方')
    expect(source).toContain('诊断追踪号')
    expect(source).toContain('原始技术错误')
    expect(source).toContain('extractTraceId')
  })

  it('keeps list diagnostics concise while preserving raw errors in details and titles', () => {
    expect(aiCallLogSource).toContain('class="failure-diagnosis"')
    expect(aiCallLogSource).toContain(':title="`原始技术错误：${rawAiFailure(row)}`"')
    expect(aiCallLogSource).toContain('<pre class="technical-error">{{ rawAiFailure(detail) }}</pre>')

    expect(asyncTaskSource).toContain('class="task-error-preview"')
    expect(asyncTaskSource).toContain(':title="`原始技术错误：${rawTaskFailure(row)}`"')
    expect(asyncTaskSource).toContain('<pre class="detail-preview technical-error">{{ rawTaskFailure(detail) }}</pre>')
  })

  it('does not replace unknown prompt and agent task codes with opaque placeholders', () => {
    expect(promptTemplateSource).toContain('`未登记场景：${raw}`')
    expect(promptTemplateSource).not.toContain("'场景待确认'")
    expect(adminAgentTaskSource).toContain('`未登记任务类型：${raw}`')
    expect(adminAgentTaskSource).toContain('`未登记任务类型，原始代码：${raw}`')
    expect(adminAgentTaskSource).not.toContain("'任务类型待确认'")
  })
})
