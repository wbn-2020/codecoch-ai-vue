import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(__dirname, '../../..')
const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(projectRoot, relativePath), 'utf8')

const adminGovernanceApi = readSource('src/api/adminGovernance.ts')
const adminLayout = readSource('src/layouts/AdminLayout.vue')
const loginLog = readSource('src/views/admin/LoginLogView.vue')
const questionManage = readSource('src/views/admin/QuestionManageView.vue')
const aiModelConfig = readSource('src/views/admin/AiModelConfigView.vue')

describe('admin governance follow-up contracts', () => {
  it('keeps the full trace id canonical while short values remain display-only', () => {
    expect(adminGovernanceApi).toContain(
      "traceId: pick(item, 'traceId', 'trace_id', 'traceIdShort', 'shortTraceId')"
    )
    expect(loginLog).toContain(':title="row.traceId || displayLoginTraceId(row)"')
    expect(adminLayout).toContain("query: { traceId: value, source: 'request-error' }")
    expect(adminLayout).toContain('const displayTraceId = (traceId?: string)')
  })

  it('shows governance-specific question totals without reusing filtered or current-page counts', () => {
    expect(questionManage).toContain('<span>正式题总数</span>')
    expect(questionManage).toContain('<span>可训练题数</span>')
    expect(questionManage).toContain('<span>停用题数</span>')
    expect(questionManage).toContain('<span>待审核数</span>')
    expect(questionManage).toContain("getAdminQuestionsApi({ status: 1, pageNo: 1, pageSize: 1 })")
    expect(questionManage).toContain("getAdminQuestionsApi({ status: 0, pageNo: 1, pageSize: 1 })")
    expect(questionManage).toContain("getQuestionReviewsApi({ reviewStatus: 'PENDING', pageNo: 1, pageSize: 1 })")
    expect(questionManage).toContain("const displayQuestionStat = (value: number | null) => value ?? '未知'")
    expect(questionManage).not.toContain('<span>题目总数</span>')
  })

  it('separates model configuration state from backend-reported invocation health', () => {
    expect(aiModelConfig).toContain('label="配置状态"')
    expect(aiModelConfig).toContain('label="调用健康"')
    expect(aiModelConfig).toContain('label="最近成功 / 失败摘要"')
    expect(aiModelConfig).toContain("return { label: '未知', type: 'info' as const }")
    expect(aiModelConfig).toContain("if (!at && !summary) return '未提供'")
    expect(adminGovernanceApi).toContain('callHealthStatus: pick(item')
    expect(adminGovernanceApi).toContain('lastCallSuccessSummary: pick(item')
    expect(adminGovernanceApi).toContain('lastCallFailureSummary: pick(item')
  })

  it('keeps model form and mutation failures inside the current page', () => {
    expect(aiModelConfig).toContain("validate().catch(() => false)")
    expect(aiModelConfig).toContain('const mutatingId = ref<number>()')
    expect(aiModelConfig).toContain('try {')
    expect(aiModelConfig).toContain('当前页面状态未改变')
    expect(aiModelConfig).toContain('finally {')
    expect(aiModelConfig).toContain('await refreshModelWorkspace()')
  })

  it('shows backend runtime routing state and makes the default-model scope explicit', () => {
    expect(adminGovernanceApi).toContain("'/admin/ai/runtime-status'")
    expect(aiModelConfig).toContain("runtimeStatus?.effectiveModeLabel || '运行态待确认'")
    expect(aiModelConfig).toContain('默认作用域：{{ defaultModelScopeLabel }}')
    expect(aiModelConfig).toContain("defaultModelScopeLabel || '全局唯一默认模型'")
    expect(aiModelConfig).toContain('实际主路由：{{ runtimeStatus.effectivePrimaryProvider }}')
    expect(aiModelConfig).toContain("? '全局默认'")
  })

  it('allows an administrator to customize a live probe and inspect the actual response', () => {
    expect(aiModelConfig).toContain('title="配置模型测活"')
    expect(aiModelConfig).toContain('v-model="probePrompt"')
    expect(aiModelConfig).toContain('maxlength="500"')
    expect(aiModelConfig).toContain('@click="confirmProbe"')
    expect(aiModelConfig).toContain('requestPromptPreview')
    expect(aiModelConfig).toContain('模型返回')
    expect(aiModelConfig).toContain('prompt')
    expect(adminGovernanceApi).toContain('data: AiModelProbeDTO')
  })

  it('keeps a long-running probe isolated to its own row and explains the waiting stages', () => {
    expect(aiModelConfig).toContain(':loading="probingId === row.id"')
    expect(aiModelConfig).toContain(':disabled="isAdminMobileReadonly || probingId === row.id"')
    expect(aiModelConfig).toContain("if (probeElapsedSeconds.value >= 30)")
    expect(aiModelConfig).toContain("if (probeElapsedSeconds.value >= 8)")
    expect(aiModelConfig).toContain("if (probeElapsedSeconds.value >= 2)")
    expect(aiModelConfig).toContain('仅当前模型行处于等待状态')
    expect(aiModelConfig).toContain('onBeforeUnmount(stopProbeProgress)')
  })

  it('collapses the layout health strip only after a verified healthy state', () => {
    expect(adminLayout).toContain('v-if="healthStripExpanded"')
    expect(adminLayout).toContain("return !['HEALTHY', 'SUPPORTED'].includes")
    expect(adminLayout).toContain("healthStripExpanded ? '32px' : '0px'")
    expect(adminLayout).toContain('dashboardHealthError.value || latestError.value')
  })

  it.each([
    'src/views/admin/LoginLogView.vue',
    'src/views/admin/OperationLogView.vue',
    'src/views/admin/QuestionManageView.vue',
    'src/views/admin/UserManageView.vue',
    'src/views/admin/RoleManageView.vue',
    'src/views/admin/AiModelConfigView.vue'
  ])('%s uses the shared table view settings control', (relativePath) => {
    const source = readSource(relativePath)
    expect(source).toContain('AdminTableViewSettings')
    expect(source).not.toContain('<el-segmented')
    expect(source).not.toContain('>列配置</el-button>')
  })
})
