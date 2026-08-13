import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(__dirname, '../../..')
const source = fs.readFileSync(
  path.resolve(projectRoot, 'src/views/admin/AdminOpsOverviewView.vue'),
  'utf8'
)

describe('admin operations write protection', () => {
  it('computes guards from health, freshness, collection, and failure-detail state', () => {
    expect(source).toContain("type VectorMaintenanceScope = 'question' | 'knowledge' | 'deleteOutbox'")
    expect(source).toContain('const createVectorActionGuard = (')
    expect(source).toContain('const vectorHealthBlockReason = (scope: VectorMaintenanceScope)')
    expect(source).toContain('const vectorFailureDetailsBlockReason = (scope: VectorMaintenanceScope')
    expect(source).toContain("healthState === 'unknown'")
    expect(source).toContain("healthState === 'stale'")
    expect(source).toContain('health.checks?.collectionsPresent === false')
    expect(source).toContain('health.checks?.dimensionMatched === false')
    expect(source).toContain('if (!item.exists)')
    expect(source).toContain('if (!Number.isFinite(outbox.retryable))')
  })

  it('uses the computed guards for button state, explanations, and handler-side checks', () => {
    expect(source).toContain(':disabled="!questionRebuildGuard.allowed"')
    expect(source).toContain(':disabled="!questionRetryGuard.allowed"')
    expect(source).toContain(':disabled="!knowledgeRebuildGuard.allowed"')
    expect(source).toContain(':disabled="!knowledgeRetryGuard.allowed"')
    expect(source).toContain(':disabled="!deleteRetryGuard.allowed"')
    expect(source).toContain(':content="questionRebuildGuard.reason"')
    expect(source).toContain('{{ questionActionGuardSummary }}')
    expect(source).toContain('{{ knowledgeActionGuardSummary }}')

    expect(source).toContain('if (!guardVectorMaintenance(questionRebuildGuard.value)) return')
    expect(source).toContain('if (!guardVectorMaintenance(questionRetryGuard.value)) return')
    expect(source).toContain('if (!guardVectorMaintenance(knowledgeRebuildGuard.value)) return')
    expect(source).toContain('if (!guardVectorMaintenance(knowledgeRetryGuard.value)) return')
    expect(source).toContain('if (!guardVectorMaintenance(deleteRetryGuard.value)) return')
    expect(source.match(/ElMessage\.error\(getErrorMessage\(error\)\)/g)?.length)
      .toBeGreaterThanOrEqual(5)
    expect(source.match(/Promise\.allSettled\(\[loadVectorJobs\(\), loadPage\(\)\]\)/g)?.length)
      .toBeGreaterThanOrEqual(5)
  })

  it('keeps initial loading stable and retains successful snapshots after refresh failure', () => {
    expect(source).toContain('v-else-if="initialLoading"')
    expect(source).toContain('class="ops-initial-skeleton"')
    expect(source).toContain('const loading = ref(true)')
    expect(source).toContain('const hasSuccessfulSnapshot = computed')
    expect(source).toContain('const showFatalError = computed')
    expect(source).toContain('const freshnessTimestamp = snapshot?.dataAt || snapshot?.receivedAt')
    expect(source).toContain('freshnessTimer = setInterval')
    expect(source).toContain('clearInterval(freshnessTimer)')
    expect(source).toMatch(
      /if \(failed\.length === sourceResults\.length\) \{[\s\S]*?if \(!hasSuccessfulSnapshot\.value\)[\s\S]*?return/
    )
    expect(source).toContain('v-loading="loading || vectorFailureLoading"')
  })
})
