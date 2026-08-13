import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(__dirname, '../../..')
const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(projectRoot, relativePath), 'utf8')

const managedViews = [
  'src/views/admin/RoleManageView.vue',
  'src/views/admin/QuestionCategoryManageView.vue',
  'src/views/admin/QuestionTagManageView.vue',
  'src/views/admin/QuestionGroupManageView.vue',
  'src/views/admin/IndustryTemplateManageView.vue',
  'src/views/admin/PromptTemplateView.vue',
  'src/views/admin/QuestionRelationManageView.vue'
]

describe('admin form error isolation contracts', () => {
  it.each(managedViews)('%s contains rejected validation inside the page', (relativePath) => {
    const source = readSource(relativePath)

    expect(source).not.toMatch(/await\s+\w*[Ff]ormRef\.value\.validate\(\)(?!\.catch)/)
    expect(source).toMatch(/\w*[Ff]ormRef\.value\.validate\(\)\.catch\(\(\)\s*=>\s*false\)/)
  })

  it.each([
    ['src/views/admin/RoleManageView.vue', '角色保存失败', '角色失败'],
    ['src/views/admin/QuestionCategoryManageView.vue', '题目分类保存失败', '题目分类删除失败'],
    ['src/views/admin/QuestionTagManageView.vue', '题目标签保存失败', '题目标签删除失败'],
    ['src/views/admin/QuestionGroupManageView.vue', '问题组保存失败', '问题组删除失败'],
    ['src/views/admin/IndustryTemplateManageView.vue', '行业模板保存失败', '行业模板删除失败'],
    ['src/views/admin/PromptTemplateView.vue', '提示词模板保存失败', '提示词版本创建失败'],
    ['src/views/admin/QuestionRelationManageView.vue', '题目关系新增失败', '题目关系删除失败']
  ])('%s keeps write failures local to the current view', (relativePath, ...messages) => {
    const source = readSource(relativePath)

    messages.forEach((message) => expect(source).toContain(message))
    expect(source).toContain('catch (error)')
    expect(source).toContain('getErrorMessage(error')
  })
})
