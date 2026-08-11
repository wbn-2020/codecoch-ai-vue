import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/views/v4/JobApplicationView.vue'), 'utf8')

describe('JobApplicationView information hierarchy', () => {
  it('keeps initial loading separate from the no-records empty state', () => {
    expect(source).toContain('const isInitialLoading = computed(() => loading.value && !hasLoadedApplications.value)')
    expect(source).toContain('title="正在加载投递记录"')
    expect(source).toContain('title="还没有投递记录"')
  })

  it('puts stage, resume version and next action ahead of secondary record metadata', () => {
    expect(source).toContain('class="record-priority-summary"')
    expect(source).toContain('<dt>当前阶段</dt>')
    expect(source).toContain('<dt>使用简历</dt>')
    expect(source).toContain('<dt>下一步</dt>')
    expect(source).toContain('class="record-next-step"')
  })

  it('keeps one primary action in each list empty-state branch', () => {
    expect(source).toContain('v-if="hasListFilter" type="primary" @click="clearStatusFilter"')
    expect(source).toContain('v-else type="primary" :icon="Plus" @click="openCreate"')
  })
})
