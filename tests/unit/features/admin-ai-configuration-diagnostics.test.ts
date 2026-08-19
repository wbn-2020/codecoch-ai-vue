import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(__dirname, '../../..')
const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(projectRoot, relativePath), 'utf8')

const modelSource = readSource('src/views/admin/AiModelConfigView.vue')
const promptSource = readSource('src/views/admin/PromptTemplateView.vue')
const promptApiSource = readSource('src/api/aiAdmin.ts')
const promptTypeSource = readSource('src/types/ai.ts')

describe('admin AI configuration diagnostics contracts', () => {
  it('keeps model mutation diagnostics on the form with fields, next step and trace id', () => {
    expect(modelSource).toContain(':error="modelFieldErrors.provider"')
    expect(modelSource).toContain(':error="modelFieldErrors.modelName"')
    expect(modelSource).toContain(':error="modelFieldErrors.apiBaseUrl"')
    expect(modelSource).toContain(':error="modelFieldErrors.apiKey"')
    expect(modelSource).toContain('payload.fieldErrors')
    expect(modelSource).toContain('payload.nextStep')
    expect(modelSource).toContain("value.response?.headers?.get?.('X-Trace-Id')")
    expect(modelSource).not.toContain('${form.apiKey}')
  })

  it('allows an incomplete disabled draft but requires credentials before enabling it', () => {
    expect(modelSource).toContain("const enabledDraftNeedsKey = !editingId.value && form.enabled === 1")
    expect(modelSource).toContain("'停用草稿可稍后配置'")
    expect(modelSource).toContain('真实业务路由必须且只能有一个已启用的全局默认模型')
    expect(modelSource).toContain('不支持直接取消默认')
  })

  it('submits prompt variable declarations for templates and versions', () => {
    expect(promptTypeSource).toContain('variables?: string')
    expect(promptApiSource).toContain('{ variables: data.variables }')
    expect(promptSource).toContain('v-model="form.variables"')
    expect(promptSource).toContain('v-model="versionForm.variablesJson"')
    expect(promptSource).toContain('variablesJson: versionForm.variablesJson || undefined')
    expect(promptSource).toContain('必须与正文中的 {{input}}、{{userName}} 完全一致')
  })

  it('keeps prompt conflicts and validation diagnostics on the affected form', () => {
    expect(promptSource).toContain(':error="promptFieldErrors.scene"')
    expect(promptSource).toContain(':error="promptFieldErrors.variables"')
    expect(promptSource).toContain(':error="versionFieldErrors.versionCode"')
    expect(promptSource).toContain(':error="versionFieldErrors.variables"')
    expect(promptSource).toContain("field === 'variablesJson' ? 'variables' : field")
    expect(promptSource).toContain('下一步：${nextStep}')
    expect(promptSource).toContain('追踪号：${String(traceId).trim()}')
  })

  it('does not offer a misleading create-time publish switch', () => {
    expect(promptSource).toContain('新增模板不会直接生效')
    expect(promptSource).toContain('请创建版本、完成测试，再激活目标版本')
    expect(promptSource).not.toContain('<el-form-item v-if="!editingId" label="状态">')
  })

  it('only reports prompt activation success after an authoritative persistence refresh', () => {
    expect(promptSource).toContain('const refreshAndVerifyPromptActivation')
    expect(promptSource).toContain('await fetchPrompts({ throwOnError: true })')
    expect(promptSource).toContain('persisted.status !== 1')
    expect(promptSource).toContain('Number(persisted.activeVersionId) !== versionId')
    expect(promptSource).toContain('await refreshAndVerifyPromptActivation(row, versionId)')
    expect(promptSource).toContain('提示词模板已启用并完成持久化校验')
  })
})
