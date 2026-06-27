import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import ts from 'typescript'

const frontendRoot = process.cwd()
const require = createRequire(import.meta.url)

const loadCommonJsModule = async (relativePath) => {
  const filename = path.join(frontendRoot, relativePath)
  const source = await readFile(filename, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: filename
  }).outputText
  const module = { exports: {} }
  new Function('exports', 'require', 'module', compiled)(module.exports, require, module)
  return module.exports
}

const { normalizePageResult } = await loadCommonJsModule('src/utils/page.ts')

const failures = []
const expectThrows = (callback, pattern, message) => {
  try {
    callback()
    failures.push(`${message} (did not throw)`)
  } catch (error) {
    const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    if (!pattern.test(text)) failures.push(`${message} (unexpected error: ${text})`)
  }
}

const expectDeepEqual = (actualOrFactory, expected, message) => {
  try {
    const actual = typeof actualOrFactory === 'function' ? actualOrFactory() : actualOrFactory
    assert.deepStrictEqual(actual, expected)
  } catch (error) {
    failures.push(`${message}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const records = [{ id: 1, title: 'Alpha' }, { id: 2, title: 'Beta' }]

expectThrows(
  () => normalizePageResult(records, { pageNo: 2, pageSize: 20 }),
  /allowArrayFallback|paginated/i,
  'Strict PageResult normalization should reject raw arrays by default'
)

expectDeepEqual(
  () => normalizePageResult(records, { pageNo: 2, pageSize: 20 }, { allowArrayFallback: true }),
  {
    records,
    total: 2,
    pageNo: 2,
    pageNum: 2,
    pageSize: 20,
    pages: 1
  },
  'Explicit array fallback should continue normalizing raw array responses'
)

expectThrows(
  () => normalizePageResult({ data: records }, { pageNo: 1, pageSize: 10 }),
  /page|paginated/i,
  'Wrapper objects without page metadata should not silently normalize'
)

expectDeepEqual(
  () => normalizePageResult({
    records,
    total: 6,
    pageNo: 2,
    pageSize: 5,
    pages: 2
  }),
  {
    records,
    total: 6,
    pageNo: 2,
    pageNum: 2,
    pageSize: 5,
    pages: 2
  },
  'Canonical paginated payloads should still normalize'
)

expectDeepEqual(
  () => normalizePageResult({
    total: 2,
    pageNo: 1,
    pageSize: 10,
    data: records
  }),
  {
    records,
    total: 2,
    pageNo: 1,
    pageNum: 1,
    pageSize: 10,
    pages: 1
  },
  'Metadata-backed data arrays should still normalize as pages'
)

expectDeepEqual(
  () => normalizePageResult({
    payload: {
      list: records,
      total: 2,
      current: 3,
      size: 20,
      totalPages: 4
    }
  }),
  {
    records,
    total: 2,
    pageNo: 3,
    pageNum: 3,
    pageSize: 20,
    pages: 4
  },
  'Nested wrapped page payloads should still normalize when the nested object is page-shaped'
)

if (failures.length) {
  console.error(`Page normalizer contract checks failed: ${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Page normalizer contract checks passed.')
process.exit(0)
