import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')

const read = (relativePath) => readFile(path.join(frontendRoot, relativePath), 'utf8')

const apiSource = await read('src/api/v4.ts')
const knowledgeView = await read('src/views/v4/KnowledgeBaseView.vue')

const failures = []

const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

expect(
  /export const restoreKnowledgeDocumentVersionApi = \(id: number, versionId: number, params\?: KnowledgeMutationConfirmationParams\) =>[\s\S]*?request\.post<KnowledgeDocumentVO, KnowledgeDocumentVO>\(`\/agent\/knowledge\/documents\/\$\{id\}\/versions\/\$\{versionId\}\/restore`,\s*undefined,\s*{\s*params: compactQueryParams\(params\)\s*}\s*\)/s.test(
    apiSource
  ),
  'restoreKnowledgeDocumentVersionApi must forward KnowledgeMutationConfirmationParams as query params'
)

expect(
  /export const deleteKnowledgeEvalCaseApi = \(id: number, params\?: KnowledgeMutationConfirmationParams\) =>[\s\S]*?request\.delete<null, null>\(`\/agent\/knowledge\/eval\/cases\/\$\{id\}`,\s*{\s*params: compactQueryParams\(params\)\s*}\s*\)/s.test(
    apiSource
  ),
  'deleteKnowledgeEvalCaseApi must forward KnowledgeMutationConfirmationParams as query params'
)

expect(
  /await deleteKnowledgeEvalCaseApi\(id,\s*{\s*confirm: true,\s*dryRun: false,\s*reason: 'user knowledge delete eval case',\s*idempotencyKey: createOperationIdempotencyKey\('knowledge-delete-eval-case'\)\s*}\s*\)/s.test(
    knowledgeView
  ),
  'KnowledgeBaseView deleteKnowledgeEvalCase must send explicit confirmation metadata'
)

expect(
  /await restoreKnowledgeDocumentVersionApi\(versionDocument\.value\.id,\s*version\.id,\s*{\s*confirm: true,\s*dryRun: false,\s*reason: 'user knowledge restore document version',\s*idempotencyKey: createOperationIdempotencyKey\('knowledge-restore-version'\)\s*}\s*\)/s.test(
    knowledgeView
  ),
  'KnowledgeBaseView handleRestoreVersion must send explicit confirmation metadata'
)

if (failures.length) {
  console.error(`Wave 1.1-R knowledge dangerous confirm contract checks failed: ${failures.length}`)
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Wave 1.1-R knowledge dangerous confirm contract checks passed.')
